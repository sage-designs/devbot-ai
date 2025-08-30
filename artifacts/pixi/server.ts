import { z } from 'zod';
import { streamObject } from 'ai';
import { myProvider } from '@/lib/ai/providers';
import { createDocumentHandler } from '@/lib/artifacts/server';
import { createAgenticDocumentHandler } from '@/lib/ai/agents/agentic-handler';

const pixiPrompt = `You are an expert PixiJS v8 developer. Generate interactive, engaging PixiJS experiences using modern JavaScript/TypeScript.

IMPORTANT GUIDELINES:
- Use PixiJS v8 syntax: import from 'pixi.js' (single package)
- Create a PixiJS Application instance and add it to the provided canvas
- Always handle async operations properly
- Include proper cleanup and error handling
- Make experiences interactive with mouse/touch events when appropriate
- Use modern JavaScript features (async/await, destructuring, etc.)
- Focus on performance and smooth animations
- Include comments explaining key concepts

AVAILABLE PIXI OBJECTS:
- Application, Sprite, Graphics, Text, Container, Texture
- All standard PixiJS v8 classes and utilities

CANVAS SETUP:
The canvas element is provided as 'canvas' parameter. Create your app like:
const app = new Application();
await app.init({ canvas, width: 800, height: 600 });

EXAMPLE STRUCTURE:
\`\`\`javascript
// Create PixiJS application
const app = new Application();
await app.init({
  canvas,
  width: 800,
  height: 600,
  backgroundColor: 0x1099bb,
});

// Create interactive elements
const sprite = new Sprite();
// Add interactivity
sprite.eventMode = 'static';
sprite.cursor = 'pointer';

// Add to stage
app.stage.addChild(sprite);

// Animation loop if needed
app.ticker.add((delta) => {
  // Animation code
});
\`\`\`

Generate complete, runnable PixiJS code that creates engaging interactive experiences.`;

const updatePixiPrompt = (currentCode: string) => `You are an expert PixiJS v8 developer. Update the existing PixiJS code based on the user's request.

CURRENT CODE:
\`\`\`javascript
${currentCode}
\`\`\`

GUIDELINES:
- Maintain the existing PixiJS Application structure
- Use PixiJS v8 syntax with single package imports
- Preserve working functionality while adding requested features
- Ensure smooth performance and proper cleanup
- Add meaningful interactions and animations
- Include clear comments for new features

Generate the complete updated PixiJS code.`;

// Enhanced agentic PixiJS document handler
export const pixiDocumentHandler = createAgenticDocumentHandler('pixi');

// Legacy handler for backward compatibility
export const legacyPixiDocumentHandler = createDocumentHandler<'pixi'>({
  kind: 'pixi',
  onCreateDocument: async ({ title, dataStream }) => {
    let draftContent = '';

    const { fullStream } = streamObject({
      model: myProvider.languageModel('artifact-model'),
      system: pixiPrompt,
      prompt: title,
      schema: z.object({
        code: z.string(),
      }),
    });

    for await (const delta of fullStream) {
      const { type } = delta;

      if (type === 'object') {
        const { object } = delta;
        const { code } = object;

        if (code) {
          dataStream.write({
            type: 'data-pixiDelta',
            data: code ?? '',
            transient: true,
          });

          draftContent = code;
        }
      }
    }

    return draftContent;
  },
  onUpdateDocument: async ({ document, description, dataStream }) => {
    let draftContent = '';

    const { fullStream } = streamObject({
      model: myProvider.languageModel('artifact-model'),
      system: updatePixiPrompt(document?.content ?? ''),
      prompt: description,
      schema: z.object({
        code: z.string(),
      }),
    });

    for await (const delta of fullStream) {
      const { type } = delta;

      if (type === 'object') {
        const { object } = delta;
        const { code } = object;

        if (code) {
          dataStream.write({
            type: 'data-pixiDelta',
            data: code ?? '',
            transient: true,
          });

          draftContent = code;
        }
      }
    }

    return draftContent;
  },
});
