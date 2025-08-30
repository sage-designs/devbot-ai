import { z } from 'zod';
import type { LanguageModel } from 'ai';
import type { ToolSet } from 'ai';
import type { UIMessageStreamWriter } from 'ai';
import type { ChatMessage } from '@/lib/types';
import type { Session } from 'next-auth';
import type { Document } from '@/lib/db/schema';
import type { ArtifactKind } from '@/components/artifact';

// Core agent configuration
export interface AgentConfig {
  role: 'orchestrator' | 'worker' | 'evaluator';
  specialization: string;
  model: LanguageModel;
  tools?: ToolSet;
  systemPrompt: string;
  maxSteps?: number;
}

// Quality metrics for different artifact types
export const QualityMetricsSchema = z.object({
  overall: z.number().min(0).max(10).describe('Overall quality score'),
  specific: z.record(z.number().min(0).max(10)).describe('Domain-specific metrics'),
  issues: z.array(z.string()).describe('Identified issues'),
  suggestions: z.array(z.string()).describe('Improvement suggestions'),
  needsImprovement: z.boolean().describe('Whether artifact needs improvement'),
});

export type QualityMetrics = z.infer<typeof QualityMetricsSchema>;

// Execution context for multi-step operations
export interface ExecutionContext {
  artifactKind: ArtifactKind;
  title: string;
  currentContent: string;
  previousVersions: string[];
  userRequirements: string;
  qualityThreshold: number;
  maxIterations: number;
  currentIteration: number;
}

// Step in the execution process
export interface ExecutionStep {
  id: string;
  type: 'generate' | 'evaluate' | 'improve' | 'validate';
  agent: string;
  input: any;
  output: any;
  timestamp: Date;
  success: boolean;
  error?: string;
}

// Agentic execution state
export interface AgenticExecution {
  id: string;
  steps: ExecutionStep[];
  currentStep: number;
  context: ExecutionContext;
  qualityMetrics?: QualityMetrics;
  isComplete: boolean;
  finalContent: string;
}

// Enhanced document handler interface
export interface AgenticDocumentHandlerConfig<T extends ArtifactKind> {
  kind: T;
  orchestrator: AgentConfig;
  workers: AgentConfig[];
  evaluators: AgentConfig[];
  qualityThreshold: number;
  maxIterations: number;
}

export interface AgenticCreateParams {
  id: string;
  title: string;
  dataStream: UIMessageStreamWriter<ChatMessage>;
  session: Session;
  context?: Partial<ExecutionContext>;
}

export interface AgenticUpdateParams {
  document: Document;
  description: string;
  dataStream: UIMessageStreamWriter<ChatMessage>;
  session: Session;
  context?: Partial<ExecutionContext>;
}

// Domain-specific quality criteria
export const CodeQualitySchema = z.object({
  syntax: z.number().min(0).max(10).describe('Syntax correctness'),
  performance: z.number().min(0).max(10).describe('Performance optimization'),
  security: z.number().min(0).max(10).describe('Security best practices'),
  maintainability: z.number().min(0).max(10).describe('Code maintainability'),
  testability: z.number().min(0).max(10).describe('Testability and coverage'),
});

export const PixiQualitySchema = z.object({
  performance: z.number().min(0).max(10).describe('Rendering performance'),
  interactivity: z.number().min(0).max(10).describe('User interaction quality'),
  visual: z.number().min(0).max(10).describe('Visual appeal and design'),
  responsiveness: z.number().min(0).max(10).describe('Responsive behavior'),
  errorHandling: z.number().min(0).max(10).describe('Error handling robustness'),
});

export const DesignQualitySchema = z.object({
  accessibility: z.number().min(0).max(10).describe('WCAG compliance'),
  usability: z.number().min(0).max(10).describe('User experience quality'),
  consistency: z.number().min(0).max(10).describe('Design consistency'),
  responsiveness: z.number().min(0).max(10).describe('Responsive design'),
  aesthetics: z.number().min(0).max(10).describe('Visual aesthetics'),
});

export const ContentQualitySchema = z.object({
  clarity: z.number().min(0).max(10).describe('Content clarity'),
  grammar: z.number().min(0).max(10).describe('Grammar and spelling'),
  structure: z.number().min(0).max(10).describe('Content structure'),
  engagement: z.number().min(0).max(10).describe('Reader engagement'),
  accuracy: z.number().min(0).max(10).describe('Factual accuracy'),
});

// Quality schema mapping
export const QualitySchemaMap = {
  code: CodeQualitySchema,
  pixi: PixiQualitySchema,
  image: DesignQualitySchema,
  sheet: DesignQualitySchema,
  text: ContentQualitySchema,
} as const;

// Agent response schemas
export const AgentResponseSchema = z.object({
  success: z.boolean(),
  content: z.string().optional(),
  qualityMetrics: QualityMetricsSchema.optional(),
  suggestions: z.array(z.string()).optional(),
  error: z.string().optional(),
  nextAction: z.enum(['continue', 'improve', 'complete', 'retry']).optional(),
});

export type AgentResponse = z.infer<typeof AgentResponseSchema>;

// Stop conditions for multi-step execution
export interface StopCondition {
  type: 'quality_threshold' | 'max_iterations' | 'user_satisfaction' | 'no_improvements';
  value?: number;
  check: (execution: AgenticExecution) => boolean;
}
