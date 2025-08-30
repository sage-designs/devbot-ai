import { z } from 'zod';
import { tool } from 'ai';
import type { Session } from '@/lib/types';
import type { DataStreamWriter } from 'ai';
import { getDocument, saveDocument } from '@/lib/db/queries';
import { agenticExecutionEngine } from '@/lib/ai/agents/execution-engine';
import { getAgentConfigs } from '@/lib/ai/agents/configs';

const aiImageEditSchema = z.object({
  artifactId: z.string().describe('ID of the image artifact to edit'),
  toolId: z.string().describe('AI editing tool to use (inpaint, outpaint, object-removal, etc.)'),
  prompt: z.string().describe('Description of the desired edit or generation'),
  negativePrompt: z.string().optional().describe('What to avoid in the generation'),
  strength: z.number().min(0.1).max(1.0).default(0.8).describe('Strength of the AI edit (0.1-1.0)'),
  steps: z.number().min(10).max(50).default(20).describe('Number of diffusion steps'),
  guidance: z.number().min(1).max(20).default(7.5).describe('Guidance scale for generation'),
  maskData: z.string().optional().describe('Base64 encoded mask data for inpainting'),
  selectedRegion: z.object({
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number(),
  }).optional().describe('Selected region for editing'),
});

export function createAiImageEditTool({
  session,
  dataStream,
}: {
  session: Session;
  dataStream: DataStreamWriter;
}) {
  return tool({
    description: 'Apply advanced AI editing to image artifacts including inpainting, outpainting, object removal, style transfer, and enhancement',
    parameters: aiImageEditSchema,
    execute: async ({
      artifactId,
      toolId,
      prompt,
      negativePrompt,
      strength,
      steps,
      guidance,
      maskData,
      selectedRegion,
    }) => {
      try {
        // Get the existing document
        const document = await getDocument({ id: artifactId, userId: session.user?.id! });
        if (!document) {
          throw new Error('Image artifact not found');
        }

        // Stream status update
        dataStream.write({
          type: 'data-textDelta',
          data: `🎨 Starting ${toolId} edit on image artifact...\n`,
          transient: true,
        });

        // Get agent configurations for image editing
        const agentConfigs = getAgentConfigs('image');

        // Create enhanced prompt based on editing tool
        const enhancedPrompt = createToolSpecificPrompt(toolId, prompt, negativePrompt);

        // Create execution context for AI image editing
        const executionContext = {
          kind: 'image' as const,
          title: document.title,
          requirements: enhancedPrompt,
          existingContent: document.content,
          editingTool: toolId,
          editingParams: {
            strength,
            steps,
            guidance,
            maskData,
            selectedRegion,
          },
          qualityThreshold: 7.5,
          maxIterations: 3,
        };

        // Execute agentic image editing
        const result = await agenticExecutionEngine.execute(
          executionContext,
          agentConfigs,
          {
            onProgress: (step, progress) => {
              dataStream.write({
                type: 'data-textDelta',
                data: `${getProgressEmoji(step)} ${progress.message}\n`,
                transient: true,
              });
            },
            onQualityUpdate: (metrics) => {
              dataStream.write({
                type: 'data-qualityMetrics',
                data: metrics,
                transient: true,
              });
            },
          }
        );

        // Stream the edited image
        dataStream.write({
          type: 'data-imageDelta',
          data: result.content,
          transient: true,
        });

        // Save the updated document
        await saveDocument({
          id: artifactId,
          title: document.title,
          content: result.content,
          userId: session.user?.id!,
        });

        dataStream.write({
          type: 'data-textDelta',
          data: `✅ ${toolId} edit completed successfully!\n\n**Quality Score:** ${result.qualityScore}/10\n**Improvements:** ${result.improvements.join(', ')}\n`,
          transient: true,
        });

        return {
          success: true,
          message: `Successfully applied ${toolId} edit to image`,
          qualityScore: result.qualityScore,
          improvements: result.improvements,
          editingTool: toolId,
        };

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        
        dataStream.write({
          type: 'data-textDelta',
          data: `❌ Error applying ${toolId} edit: ${errorMessage}\n`,
          transient: true,
        });

        return {
          success: false,
          error: errorMessage,
          editingTool: toolId,
        };
      }
    },
  });
}

function createToolSpecificPrompt(toolId: string, prompt: string, negativePrompt?: string): string {
  const toolPrompts = {
    inpaint: `Perform high-quality inpainting to ${prompt}. Ensure seamless blending with existing content, maintain consistent lighting and perspective, and preserve image quality.`,
    outpaint: `Extend the image boundaries by ${prompt}. Generate content that naturally continues the existing scene with consistent style, lighting, and perspective.`,
    'object-removal': `Remove unwanted objects while ${prompt}. Fill the removed areas with contextually appropriate content that matches the surrounding environment.`,
    'background-replace': `Replace the background with ${prompt}. Maintain proper subject isolation, consistent lighting, and realistic depth of field.`,
    'style-transfer': `Apply artistic style transfer to ${prompt}. Preserve important structural details while transforming the artistic appearance.`,
    'super-resolution': `Enhance image resolution and quality while ${prompt}. Improve sharpness, detail, and clarity without introducing artifacts.`,
    'face-restore': `Restore and enhance facial features while ${prompt}. Improve skin texture, eye clarity, and overall facial detail quality.`,
    'color-correction': `Perform color and lighting correction to ${prompt}. Enhance color balance, contrast, and overall visual appeal.`,
  };

  let enhancedPrompt = toolPrompts[toolId as keyof typeof toolPrompts] || prompt;
  
  if (negativePrompt) {
    enhancedPrompt += ` Avoid: ${negativePrompt}.`;
  }

  enhancedPrompt += ' Generate high-quality, professional results with attention to detail and visual coherence.';

  return enhancedPrompt;
}

function getProgressEmoji(step: string): string {
  const emojiMap: Record<string, string> = {
    generation: '🎨',
    evaluation: '📊',
    improvement: '🔄',
    validation: '✅',
    completion: '🎉',
  };
  return emojiMap[step] || '⚙️';
}
