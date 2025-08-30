import { generateText, generateObject, streamObject, stepCountIs } from 'ai';
import { z } from 'zod';
import { generateUUID } from '@/lib/utils';
import type {
  AgentConfig,
  ExecutionContext,
  ExecutionStep,
  AgenticExecution,
  QualityMetrics,
  AgentResponse,
  StopCondition,
  QualityMetricsSchema,
  AgentResponseSchema,
} from './types';
import type { ArtifactKind } from '@/components/artifact';
import type { ToolSet } from 'ai';

export class AgenticExecutionEngine {
  private executions = new Map<string, AgenticExecution>();

  async createExecution(
    artifactKind: ArtifactKind,
    title: string,
    userRequirements: string,
    options: {
      qualityThreshold?: number;
      maxIterations?: number;
      initialContent?: string;
    } = {}
  ): Promise<string> {
    const executionId = generateUUID();
    
    const context: ExecutionContext = {
      artifactKind,
      title,
      currentContent: options.initialContent || '',
      previousVersions: [],
      userRequirements,
      qualityThreshold: options.qualityThreshold || 7,
      maxIterations: options.maxIterations || 5,
      currentIteration: 0,
    };

    const execution: AgenticExecution = {
      id: executionId,
      steps: [],
      currentStep: 0,
      context,
      isComplete: false,
      finalContent: '',
    };

    this.executions.set(executionId, execution);
    return executionId;
  }

  async executeStep(
    executionId: string,
    agent: AgentConfig,
    stepType: ExecutionStep['type'],
    input: any
  ): Promise<AgentResponse> {
    const execution = this.executions.get(executionId);
    if (!execution) {
      throw new Error(`Execution ${executionId} not found`);
    }

    const stepId = generateUUID();
    const step: ExecutionStep = {
      id: stepId,
      type: stepType,
      agent: agent.specialization,
      input,
      output: null,
      timestamp: new Date(),
      success: false,
    };

    try {
      let result: AgentResponse;

      switch (stepType) {
        case 'generate':
          result = await this.executeGenerateStep(agent, input, execution.context);
          break;
        case 'evaluate':
          result = await this.executeEvaluateStep(agent, input, execution.context);
          break;
        case 'improve':
          result = await this.executeImproveStep(agent, input, execution.context);
          break;
        case 'validate':
          result = await this.executeValidateStep(agent, input, execution.context);
          break;
        default:
          throw new Error(`Unknown step type: ${stepType}`);
      }

      step.output = result;
      step.success = result.success;

      // Update execution context if content was generated
      if (result.content && stepType === 'generate') {
        execution.context.previousVersions.push(execution.context.currentContent);
        execution.context.currentContent = result.content;
      }

      // Update quality metrics if provided
      if (result.qualityMetrics) {
        execution.qualityMetrics = result.qualityMetrics;
      }

      execution.steps.push(step);
      execution.currentStep = execution.steps.length - 1;

      return result;
    } catch (error) {
      step.error = error instanceof Error ? error.message : 'Unknown error';
      step.success = false;
      execution.steps.push(step);
      
      return {
        success: false,
        error: step.error,
        nextAction: 'retry',
      };
    }
  }

  private async executeGenerateStep(
    agent: AgentConfig,
    input: { prompt: string; schema?: z.ZodSchema },
    context: ExecutionContext
  ): Promise<AgentResponse> {
    const enhancedPrompt = `${agent.systemPrompt}

CONTEXT:
- Artifact Type: ${context.artifactKind}
- Title: ${context.title}
- User Requirements: ${context.userRequirements}
- Current Iteration: ${context.currentIteration + 1}/${context.maxIterations}
- Quality Threshold: ${context.qualityThreshold}/10

USER REQUEST: ${input.prompt}`;

    if (input.schema) {
      const { object } = await generateObject({
        model: agent.model,
        prompt: enhancedPrompt,
        schema: input.schema,
      });

      return {
        success: true,
        content: typeof object === 'string' ? object : JSON.stringify(object),
        nextAction: 'continue',
      };
    } else {
      const { text } = await generateText({
        model: agent.model,
        prompt: enhancedPrompt,
        tools: agent.tools,
        stopWhen: stepCountIs(agent.maxSteps || 5),
      });

      return {
        success: true,
        content: text,
        nextAction: 'continue',
      };
    }
  }

  private async executeEvaluateStep(
    agent: AgentConfig,
    input: { content: string; criteria: z.ZodSchema },
    context: ExecutionContext
  ): Promise<AgentResponse> {
    const evaluationPrompt = `${agent.systemPrompt}

EVALUATION TASK:
Evaluate the following ${context.artifactKind} artifact for quality and provide detailed metrics.

ARTIFACT TITLE: ${context.title}
CONTENT TO EVALUATE:
\`\`\`
${input.content}
\`\`\`

USER REQUIREMENTS: ${context.userRequirements}
QUALITY THRESHOLD: ${context.qualityThreshold}/10

Provide detailed evaluation with specific scores and actionable suggestions for improvement.`;

    const { object: qualityMetrics } = await generateObject({
      model: agent.model,
      prompt: evaluationPrompt,
      schema: z.object({
        overall: z.number().min(0).max(10),
        specific: z.record(z.number().min(0).max(10)),
        issues: z.array(z.string()),
        suggestions: z.array(z.string()),
        needsImprovement: z.boolean(),
      }),
    });

    return {
      success: true,
      qualityMetrics,
      suggestions: qualityMetrics.suggestions,
      nextAction: qualityMetrics.needsImprovement ? 'improve' : 'complete',
    };
  }

  private async executeImproveStep(
    agent: AgentConfig,
    input: { content: string; issues: string[]; suggestions: string[] },
    context: ExecutionContext
  ): Promise<AgentResponse> {
    const improvementPrompt = `${agent.systemPrompt}

IMPROVEMENT TASK:
Improve the following ${context.artifactKind} artifact based on the identified issues and suggestions.

CURRENT CONTENT:
\`\`\`
${input.content}
\`\`\`

IDENTIFIED ISSUES:
${input.issues.map(issue => `- ${issue}`).join('\n')}

IMPROVEMENT SUGGESTIONS:
${input.suggestions.map(suggestion => `- ${suggestion}`).join('\n')}

USER REQUIREMENTS: ${context.userRequirements}
QUALITY THRESHOLD: ${context.qualityThreshold}/10

Generate the improved version addressing all issues while maintaining the core functionality.`;

    const { text: improvedContent } = await generateText({
      model: agent.model,
      prompt: improvementPrompt,
      stopWhen: stepCountIs(agent.maxSteps || 3),
    });

    return {
      success: true,
      content: improvedContent,
      nextAction: 'continue',
    };
  }

  private async executeValidateStep(
    agent: AgentConfig,
    input: { content: string },
    context: ExecutionContext
  ): Promise<AgentResponse> {
    const validationPrompt = `${agent.systemPrompt}

VALIDATION TASK:
Validate the following ${context.artifactKind} artifact for correctness and completeness.

CONTENT TO VALIDATE:
\`\`\`
${input.content}
\`\`\`

USER REQUIREMENTS: ${context.userRequirements}

Check for:
- Syntax errors (if applicable)
- Logical consistency
- Completeness
- Best practices adherence
- Security considerations

Provide a boolean validation result and list any critical issues found.`;

    const { object: validation } = await generateObject({
      model: agent.model,
      prompt: validationPrompt,
      schema: z.object({
        isValid: z.boolean(),
        criticalIssues: z.array(z.string()),
        warnings: z.array(z.string()),
        suggestions: z.array(z.string()),
      }),
    });

    return {
      success: validation.isValid,
      suggestions: validation.suggestions,
      error: validation.criticalIssues.length > 0 ? validation.criticalIssues.join('; ') : undefined,
      nextAction: validation.isValid ? 'complete' : 'improve',
    };
  }

  async executeMultiStep(
    executionId: string,
    agents: {
      orchestrator: AgentConfig;
      workers: AgentConfig[];
      evaluators: AgentConfig[];
    },
    stopConditions: StopCondition[]
  ): Promise<AgenticExecution> {
    const execution = this.executions.get(executionId);
    if (!execution) {
      throw new Error(`Execution ${executionId} not found`);
    }

    while (!execution.isComplete && execution.context.currentIteration < execution.context.maxIterations) {
      // Check stop conditions
      if (this.shouldStop(execution, stopConditions)) {
        execution.isComplete = true;
        execution.finalContent = execution.context.currentContent;
        break;
      }

      execution.context.currentIteration++;

      // Step 1: Generate/Improve content
      const worker = agents.workers[0]; // Use first worker for now, can be enhanced for routing
      const generateResult = await this.executeStep(
        executionId,
        worker,
        execution.context.currentIteration === 1 ? 'generate' : 'improve',
        {
          prompt: execution.context.userRequirements,
          content: execution.context.currentContent,
          issues: execution.qualityMetrics?.issues || [],
          suggestions: execution.qualityMetrics?.suggestions || [],
        }
      );

      if (!generateResult.success) {
        continue;
      }

      // Step 2: Evaluate quality
      const evaluator = agents.evaluators[0];
      const evaluateResult = await this.executeStep(
        executionId,
        evaluator,
        'evaluate',
        {
          content: execution.context.currentContent,
          criteria: z.object({}), // Will be enhanced with specific schemas
        }
      );

      // Step 3: Check if quality threshold is met
      if (
        execution.qualityMetrics &&
        execution.qualityMetrics.overall >= execution.context.qualityThreshold
      ) {
        execution.isComplete = true;
        execution.finalContent = execution.context.currentContent;
        break;
      }
    }

    return execution;
  }

  private shouldStop(execution: AgenticExecution, stopConditions: StopCondition[]): boolean {
    return stopConditions.some(condition => condition.check(execution));
  }

  getExecution(executionId: string): AgenticExecution | undefined {
    return this.executions.get(executionId);
  }

  getAllExecutions(): AgenticExecution[] {
    return Array.from(this.executions.values());
  }

  deleteExecution(executionId: string): boolean {
    return this.executions.delete(executionId);
  }
}

// Singleton instance
export const agenticExecutionEngine = new AgenticExecutionEngine();
