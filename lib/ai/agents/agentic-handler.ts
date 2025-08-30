import { z } from 'zod';
import { streamObject } from 'ai';
import { agenticExecutionEngine } from './execution-engine';
import { getAgentConfigs, qualityThresholds, maxIterations } from './configs';
import { QualitySchemaMap } from './types';
import type {
  AgenticDocumentHandlerConfig,
  AgenticCreateParams,
  AgenticUpdateParams,
  ExecutionContext,
  StopCondition,
} from './types';
import type { ArtifactKind } from '@/components/artifact';
import type { DocumentHandler } from '@/lib/artifacts/server';
import { saveDocument } from '@/lib/db/queries';

export function createAgenticDocumentHandler<T extends ArtifactKind>(
  kind: T
): DocumentHandler<T> {
  const agentConfigs = getAgentConfigs(kind);
  const qualityThreshold = qualityThresholds[kind];
  const maxIter = maxIterations[kind];

  return {
    kind,
    onCreateDocument: async (args: AgenticCreateParams) => {
      const { id, title, dataStream, session } = args;

      // Initialize agentic execution
      const executionId = await agenticExecutionEngine.createExecution(
        kind,
        title,
        title, // Use title as initial user requirements
        {
          qualityThreshold,
          maxIterations: maxIter,
        }
      );

      // Define stop conditions
      const stopConditions: StopCondition[] = [
        {
          type: 'quality_threshold',
          value: qualityThreshold,
          check: (execution) => {
            return (
              execution.qualityMetrics?.overall !== undefined &&
              execution.qualityMetrics.overall >= qualityThreshold
            );
          },
        },
        {
          type: 'max_iterations',
          value: maxIter,
          check: (execution) => {
            return execution.context.currentIteration >= maxIter;
          },
        },
      ];

      let finalContent = '';

      try {
        // Stream the agentic creation process
        const { fullStream } = streamObject({
          model: agentConfigs.worker.model,
          system: agentConfigs.worker.systemPrompt,
          prompt: `Create a ${kind} artifact with the title: "${title}"

Requirements:
- Generate production-ready, error-free content
- Follow best practices and industry standards
- Ensure high quality and user engagement
- Include proper documentation and comments where applicable

Title: ${title}`,
          schema: z.object({
            content: z.string().describe('The generated artifact content'),
            reasoning: z.string().describe('Explanation of design decisions'),
            features: z.array(z.string()).describe('Key features implemented'),
          }),
        });

        // Stream initial generation
        for await (const delta of fullStream) {
          const { type } = delta;

          if (type === 'object') {
            const { object } = delta;
            const { content } = object;

            if (content) {
              dataStream.write({
                type: `data-${kind}Delta` as any,
                data: content,
                transient: true,
              });

              finalContent = content;
            }
          }
        }

        // Execute agentic improvement process
        const execution = await agenticExecutionEngine.executeMultiStep(
          executionId,
          {
            orchestrator: agentConfigs.orchestrator,
            workers: [agentConfigs.worker],
            evaluators: [agentConfigs.evaluator],
          },
          stopConditions
        );

        // Use improved content if available
        if (execution.finalContent && execution.finalContent !== finalContent) {
          finalContent = execution.finalContent;
          
          // Stream the final improved content
          dataStream.write({
            type: `data-${kind}Delta` as any,
            data: finalContent,
            transient: true,
          });
        }

        // Stream quality metrics if available
        if (execution.qualityMetrics) {
          dataStream.write({
            type: 'data-quality' as any,
            data: execution.qualityMetrics,
            transient: true,
          });
        }

        // Save the document
        if (session?.user?.id) {
          await saveDocument({
            id,
            title,
            content: finalContent,
            kind,
            userId: session.user.id,
          });
        }

        return finalContent;
      } catch (error) {
        console.error('Agentic creation error:', error);
        
        // Fallback to basic generation if agentic process fails
        const { object } = await streamObject({
          model: agentConfigs.worker.model,
          system: agentConfigs.worker.systemPrompt,
          prompt: `Create a ${kind} artifact with the title: "${title}"`,
          schema: z.object({
            content: z.string(),
          }),
        });

        finalContent = object.content || '';
        
        dataStream.write({
          type: `data-${kind}Delta` as any,
          data: finalContent,
          transient: true,
        });

        if (session?.user?.id) {
          await saveDocument({
            id,
            title,
            content: finalContent,
            kind,
            userId: session.user.id,
          });
        }

        return finalContent;
      }
    },

    onUpdateDocument: async (args: AgenticUpdateParams) => {
      const { document, description, dataStream, session } = args;

      // Initialize agentic execution for update
      const executionId = await agenticExecutionEngine.createExecution(
        kind,
        document.title,
        description,
        {
          qualityThreshold,
          maxIterations: maxIter,
          initialContent: document.content || '',
        }
      );

      // Define stop conditions for updates
      const stopConditions: StopCondition[] = [
        {
          type: 'quality_threshold',
          value: qualityThreshold,
          check: (execution) => {
            return (
              execution.qualityMetrics?.overall !== undefined &&
              execution.qualityMetrics.overall >= qualityThreshold
            );
          },
        },
        {
          type: 'max_iterations',
          value: Math.min(maxIter, 3), // Fewer iterations for updates
          check: (execution) => {
            return execution.context.currentIteration >= Math.min(maxIter, 3);
          },
        },
      ];

      let finalContent = document.content || '';

      try {
        // First, evaluate current content
        const evaluateResult = await agenticExecutionEngine.executeStep(
          executionId,
          agentConfigs.evaluator,
          'evaluate',
          {
            content: document.content || '',
            criteria: QualitySchemaMap[kind],
          }
        );

        // Stream improvement process
        const { fullStream } = streamObject({
          model: agentConfigs.worker.model,
          system: `${agentConfigs.worker.systemPrompt}

UPDATE TASK:
You are updating an existing ${kind} artifact based on user feedback.

CURRENT CONTENT:
\`\`\`
${document.content || ''}
\`\`\`

IMPROVEMENT AREAS:
${evaluateResult.suggestions?.map(s => `- ${s}`).join('\n') || 'General improvements'}`,
          prompt: `Update the artifact based on this request: ${description}

Requirements:
- Maintain existing functionality while adding requested changes
- Improve quality based on evaluation feedback
- Ensure all changes are production-ready
- Preserve working features and fix any issues`,
          schema: z.object({
            content: z.string().describe('The updated artifact content'),
            changes: z.array(z.string()).describe('List of changes made'),
            improvements: z.array(z.string()).describe('Quality improvements applied'),
          }),
        });

        // Stream the update process
        for await (const delta of fullStream) {
          const { type } = delta;

          if (type === 'object') {
            const { object } = delta;
            const { content } = object;

            if (content) {
              dataStream.write({
                type: `data-${kind}Delta` as any,
                data: content,
                transient: true,
              });

              finalContent = content;
            }
          }
        }

        // Execute agentic improvement if needed
        const execution = await agenticExecutionEngine.executeMultiStep(
          executionId,
          {
            orchestrator: agentConfigs.orchestrator,
            workers: [agentConfigs.worker],
            evaluators: [agentConfigs.evaluator],
          },
          stopConditions
        );

        // Use improved content if available
        if (execution.finalContent && execution.finalContent !== finalContent) {
          finalContent = execution.finalContent;
          
          dataStream.write({
            type: `data-${kind}Delta` as any,
            data: finalContent,
            transient: true,
          });
        }

        // Stream quality metrics
        if (execution.qualityMetrics) {
          dataStream.write({
            type: 'data-quality' as any,
            data: execution.qualityMetrics,
            transient: true,
          });
        }

        // Save the updated document
        if (session?.user?.id) {
          await saveDocument({
            id: document.id,
            title: document.title,
            content: finalContent,
            kind,
            userId: session.user.id,
          });
        }

        return finalContent;
      } catch (error) {
        console.error('Agentic update error:', error);
        
        // Fallback to basic update if agentic process fails
        const { object } = await streamObject({
          model: agentConfigs.worker.model,
          system: agentConfigs.worker.systemPrompt,
          prompt: `Update this ${kind} artifact based on: ${description}

Current content:
\`\`\`
${document.content || ''}
\`\`\``,
          schema: z.object({
            content: z.string(),
          }),
        });

        finalContent = object.content || document.content || '';
        
        dataStream.write({
          type: `data-${kind}Delta` as any,
          data: finalContent,
          transient: true,
        });

        if (session?.user?.id) {
          await saveDocument({
            id: document.id,
            title: document.title,
            content: finalContent,
            kind,
            userId: session.user.id,
          });
        }

        return finalContent;
      }
    },
  };
}
