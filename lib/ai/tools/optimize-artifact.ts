import { tool, type UIMessageStreamWriter } from 'ai';
import { z } from 'zod';
import type { Session } from 'next-auth';
import { getDocumentById } from '@/lib/db/queries';
import { createAgenticDocumentHandler } from '@/lib/ai/agents/agentic-handler';
import type { ChatMessage } from '@/lib/types';
import type { ArtifactKind } from '@/components/artifact';

interface OptimizeArtifactProps {
  session: Session;
  dataStream: UIMessageStreamWriter<ChatMessage>;
}

export const optimizeArtifact = ({ session, dataStream }: OptimizeArtifactProps) =>
  tool({
    description:
      'Optimize an existing artifact for performance, quality, and best practices using agentic AI. Automatically identifies and implements improvements.',
    inputSchema: z.object({
      id: z.string().describe('The ID of the artifact to optimize'),
      focus: z.array(z.enum(['performance', 'accessibility', 'security', 'maintainability', 'user-experience'])).optional().describe('Specific optimization areas to focus on'),
      aggressiveness: z.enum(['conservative', 'moderate', 'aggressive']).optional().describe('How aggressively to optimize (default: moderate)'),
    }),
    execute: async ({ id, focus, aggressiveness = 'moderate' }) => {
      try {
        const document = await getDocumentById({ id });

        if (!document) {
          return {
            error: 'Artifact not found',
          };
        }

        dataStream.write({
          type: 'data-textDelta',
          data: `Optimizing ${document.kind} artifact: "${document.title}"...`,
          transient: true,
        });

        // Build optimization description based on focus areas
        const focusAreas = focus || ['performance', 'maintainability', 'user-experience'];
        const optimizationDescription = `Optimize this artifact with ${aggressiveness} approach, focusing on: ${focusAreas.join(', ')}. 

Optimization Goals:
${focusAreas.includes('performance') ? '- Improve performance and efficiency' : ''}
${focusAreas.includes('accessibility') ? '- Enhance accessibility and WCAG compliance' : ''}
${focusAreas.includes('security') ? '- Strengthen security and vulnerability protection' : ''}
${focusAreas.includes('maintainability') ? '- Improve code maintainability and documentation' : ''}
${focusAreas.includes('user-experience') ? '- Enhance user experience and usability' : ''}

Approach: ${aggressiveness === 'conservative' ? 'Make minimal, safe improvements' : 
          aggressiveness === 'moderate' ? 'Balance improvements with stability' : 
          'Implement comprehensive optimizations for maximum benefit'}`;

        // Create agentic document handler for optimization
        const agenticHandler = createAgenticDocumentHandler(document.kind as ArtifactKind);

        // Execute agentic optimization
        await agenticHandler.onUpdateDocument({
          document,
          description: optimizationDescription,
          dataStream,
          session,
          context: {
            userRequirements: optimizationDescription,
          },
        });

        dataStream.write({
          type: 'data-textDelta',
          data: 'Optimization completed successfully.',
          transient: true,
        });

        return {
          id,
          title: document.title,
          kind: document.kind,
          optimizationAreas: focusAreas,
          aggressiveness,
          content: 'The artifact has been optimized using advanced agentic AI with multi-step improvement and quality validation.',
        };
      } catch (error) {
        console.error('Artifact optimization error:', error);
        
        dataStream.write({
          type: 'data-textDelta',
          data: `Optimization failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          transient: true,
        });

        return {
          error: error instanceof Error ? error.message : 'Unknown error occurred during optimization',
        };
      }
    },
  });
