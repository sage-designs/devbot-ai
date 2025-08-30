import { tool, type UIMessageStreamWriter } from 'ai';
import { z } from 'zod';
import type { Session } from 'next-auth';
import { getDocumentById } from '@/lib/db/queries';
import { agenticExecutionEngine } from '@/lib/ai/agents/execution-engine';
import { getAgentConfigs } from '@/lib/ai/agents/configs';
import { QualitySchemaMap } from '@/lib/ai/agents/types';
import type { ChatMessage } from '@/lib/types';
import type { ArtifactKind } from '@/components/artifact';

interface EvaluateArtifactProps {
  session: Session;
  dataStream: UIMessageStreamWriter<ChatMessage>;
}

export const evaluateArtifact = ({ session, dataStream }: EvaluateArtifactProps) =>
  tool({
    description:
      'Evaluate an existing artifact for quality using specialized AI agents. Provides detailed quality metrics, identifies issues, and suggests improvements.',
    inputSchema: z.object({
      id: z.string().describe('The ID of the artifact to evaluate'),
      criteria: z.array(z.string()).optional().describe('Specific evaluation criteria to focus on'),
    }),
    execute: async ({ id, criteria }) => {
      try {
        const document = await getDocumentById({ id });

        if (!document) {
          return {
            error: 'Artifact not found',
          };
        }

        dataStream.write({
          type: 'data-textDelta',
          data: `Evaluating ${document.kind} artifact: "${document.title}"...`,
          transient: true,
        });

        // Get agent configs for the artifact type
        const agentConfigs = getAgentConfigs(document.kind as ArtifactKind);
        
        // Create execution context for evaluation
        const executionId = await agenticExecutionEngine.createExecution(
          document.kind as ArtifactKind,
          document.title,
          criteria?.join(', ') || 'General quality evaluation',
          {
            initialContent: document.content || '',
            qualityThreshold: 0, // No threshold for evaluation
            maxIterations: 1,
          }
        );

        // Execute evaluation step
        const evaluationResult = await agenticExecutionEngine.executeStep(
          executionId,
          agentConfigs.evaluator,
          'evaluate',
          {
            content: document.content || '',
            criteria: QualitySchemaMap[document.kind as ArtifactKind],
          }
        );

        // Stream evaluation results
        if (evaluationResult.qualityMetrics) {
          dataStream.write({
            type: 'data-textDelta',
            data: `Quality Score: ${evaluationResult.qualityMetrics.overall}/10`,
            transient: true,
          });
        }

        dataStream.write({
          type: 'data-textDelta',
          data: 'Evaluation completed successfully.',
          transient: true,
        });

        return {
          id,
          title: document.title,
          kind: document.kind,
          qualityMetrics: evaluationResult.qualityMetrics,
          suggestions: evaluationResult.suggestions || [],
          success: evaluationResult.success,
        };
      } catch (error) {
        console.error('Artifact evaluation error:', error);
        
        dataStream.write({
          type: 'data-textDelta',
          data: `Evaluation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          transient: true,
        });

        return {
          error: error instanceof Error ? error.message : 'Unknown error occurred during evaluation',
        };
      }
    },
  });
