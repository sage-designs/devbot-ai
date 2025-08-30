import { generateUUID } from '@/lib/utils';
import { tool, type UIMessageStreamWriter } from 'ai';
import { z } from 'zod';
import type { Session } from 'next-auth';
import { createAgenticDocumentHandler } from '@/lib/ai/agents/agentic-handler';
import { artifactKinds } from '@/lib/artifacts/server';
import type { ChatMessage } from '@/lib/types';

interface CreateAgenticDocumentProps {
  session: Session;
  dataStream: UIMessageStreamWriter<ChatMessage>;
}

export const createAgenticDocument = ({ session, dataStream }: CreateAgenticDocumentProps) =>
  tool({
    description:
      'Create a document using advanced agentic AI with multi-step generation, quality evaluation, and iterative improvement. This tool provides superior quality artifacts through autonomous agent collaboration.',
    inputSchema: z.object({
      title: z.string().describe('The title/description of the artifact to create'),
      kind: z.enum(artifactKinds).describe('The type of artifact to create'),
      requirements: z.string().optional().describe('Specific requirements or constraints for the artifact'),
      qualityThreshold: z.number().min(1).max(10).optional().describe('Minimum quality threshold (1-10, default: varies by type)'),
    }),
    execute: async ({ title, kind, requirements, qualityThreshold }) => {
      const id = generateUUID();

      // Stream metadata
      dataStream.write({
        type: 'data-kind',
        data: kind,
        transient: true,
      });

      dataStream.write({
        type: 'data-id',
        data: id,
        transient: true,
      });

      dataStream.write({
        type: 'data-title',
        data: title,
        transient: true,
      });

      dataStream.write({
        type: 'data-clear',
        data: null,
        transient: true,
      });

      // Stream agentic process status
      dataStream.write({
        type: 'data-textDelta',
        data: 'Initializing agentic creation process...',
        transient: true,
      });

      try {
        // Create agentic document handler for the specific kind
        const agenticHandler = createAgenticDocumentHandler(kind);

        // Execute agentic creation
        await agenticHandler.onCreateDocument({
          id,
          title,
          dataStream,
          session,
          context: {
            userRequirements: requirements || title,
            qualityThreshold: qualityThreshold,
          },
        });

        dataStream.write({ 
          type: 'data-finish', 
          data: null, 
          transient: true 
        });

        return {
          id,
          title,
          kind,
          content: `A high-quality ${kind} artifact has been created using advanced agentic AI with multi-step generation and quality evaluation.`,
          agenticProcess: true,
        };
      } catch (error) {
        console.error('Agentic document creation error:', error);
        
        dataStream.write({
          type: 'data-textDelta',
          data: `Agentic creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          transient: true,
        });

        throw error;
      }
    },
  });
