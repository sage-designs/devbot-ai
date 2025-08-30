import { codeDocumentHandler } from '@/artifacts/code/server';
import { imageDocumentHandler } from '@/artifacts/image/server';
import { sheetDocumentHandler } from '@/artifacts/sheet/server';
import { textDocumentHandler } from '@/artifacts/text/server';
import { pixiDocumentHandler } from '@/artifacts/pixi/server';
import { createAgenticDocumentHandler } from '@/lib/ai/agents/agentic-handler';
import type { ArtifactKind } from '@/components/artifact';
import type { Document } from '../db/schema';
import { saveDocument } from '../db/queries';
import {
  linkArtifactToChat,
  createArtifactVersion,
  logArtifactChange,
} from '../db/queries-artifacts';
import type { Session } from 'next-auth';
import type { UIMessageStreamWriter } from 'ai';
import type { ChatMessage } from '../types';

export interface EnhancedSaveDocumentProps {
  id: string;
  title: string;
  kind: ArtifactKind;
  content: string;
  userId: string;
  chatId?: string;
  messageId?: string;
  commitMessage?: string;
}

export interface EnhancedCreateDocumentCallbackProps {
  id: string;
  title: string;
  dataStream: UIMessageStreamWriter<ChatMessage>;
  session: Session;
  chatId?: string;
  messageId?: string;
}

export interface EnhancedUpdateDocumentCallbackProps {
  document: Document;
  description: string;
  dataStream: UIMessageStreamWriter<ChatMessage>;
  session: Session;
  chatId?: string;
  commitMessage?: string;
}

export interface EnhancedDocumentHandler<T = ArtifactKind> {
  kind: T;
  onCreateDocument: (args: EnhancedCreateDocumentCallbackProps) => Promise<void>;
  onUpdateDocument: (args: EnhancedUpdateDocumentCallbackProps) => Promise<void>;
}

export function createEnhancedDocumentHandler<T extends ArtifactKind>(config: {
  kind: T;
  onCreateDocument: (params: EnhancedCreateDocumentCallbackProps) => Promise<string>;
  onUpdateDocument: (params: EnhancedUpdateDocumentCallbackProps) => Promise<string>;
}): EnhancedDocumentHandler<T> {
  return {
    kind: config.kind,
    onCreateDocument: async (args: EnhancedCreateDocumentCallbackProps) => {
      const draftContent = await config.onCreateDocument({
        id: args.id,
        title: args.title,
        dataStream: args.dataStream,
        session: args.session,
        chatId: args.chatId,
        messageId: args.messageId,
      });

      if (args.session?.user?.id) {
        // Save the main document
        await saveDocument({
          id: args.id,
          title: args.title,
          content: draftContent,
          kind: config.kind,
          userId: args.session.user.id,
        });

        // Create initial version
        await createArtifactVersion({
          artifactId: args.id,
          title: args.title,
          content: draftContent,
          commitMessage: 'Initial version',
          authorId: args.session.user.id,
        });

        // Link to chat if provided
        if (args.chatId) {
          await linkArtifactToChat({
            chatId: args.chatId,
            artifactId: args.id,
            messageId: args.messageId,
          });
        }

        // Log creation
        await logArtifactChange({
          artifactId: args.id,
          action: 'create',
          userId: args.session.user.id,
          details: {
            chatId: args.chatId,
            messageId: args.messageId,
            initialTitle: args.title,
          },
        });
      }

      return;
    },
    onUpdateDocument: async (args: EnhancedUpdateDocumentCallbackProps) => {
      const draftContent = await config.onUpdateDocument({
        document: args.document,
        description: args.description,
        dataStream: args.dataStream,
        session: args.session,
        chatId: args.chatId,
        commitMessage: args.commitMessage,
      });

      if (args.session?.user?.id) {
        // Save the main document
        await saveDocument({
          id: args.document.id,
          title: args.document.title,
          content: draftContent,
          kind: config.kind,
          userId: args.session.user.id,
        });

        // Create new version
        await createArtifactVersion({
          artifactId: args.document.id,
          title: args.document.title,
          content: draftContent,
          commitMessage: args.commitMessage || args.description,
          authorId: args.session.user.id,
        });

        // Link to chat if provided and not already linked
        if (args.chatId) {
          try {
            await linkArtifactToChat({
              chatId: args.chatId,
              artifactId: args.document.id,
            });
          } catch (error) {
            // Might already be linked, ignore error
          }
        }
      }

      return;
    },
  };
}

// Enhanced document handlers with version control
export const enhancedDocumentHandlersByArtifactKind: Array<EnhancedDocumentHandler> = [
  // Wrap existing handlers with enhanced functionality
  createEnhancedDocumentHandler({
    kind: 'text',
    onCreateDocument: async (args) => {
      // Use the original text handler's create logic to get actual content
      const textHandler = textDocumentHandler as any;
      if (textHandler.onCreateDocument) {
        return await textHandler.onCreateDocument({
          id: args.id,
          title: args.title,
          dataStream: args.dataStream,
          session: args.session,
        });
      }
      return args.title; // Fallback
    },
    onUpdateDocument: async (args) => {
      // Use the original text handler's update logic to get actual content
      const textHandler = textDocumentHandler as any;
      if (textHandler.onUpdateDocument) {
        return await textHandler.onUpdateDocument({
          document: args.document,
          description: args.description,
          dataStream: args.dataStream,
          session: args.session,
        });
      }
      return args.document.content || args.document.title; // Fallback
    },
  }),
  
  createEnhancedDocumentHandler({
    kind: 'code',
    onCreateDocument: async (args) => {
      // Use the original code handler's create logic to get actual content
      const codeHandler = codeDocumentHandler as any;
      if (codeHandler.onCreateDocument) {
        return await codeHandler.onCreateDocument({
          id: args.id,
          title: args.title,
          dataStream: args.dataStream,
          session: args.session,
        });
      }
      return args.title; // Fallback
    },
    onUpdateDocument: async (args) => {
      // Use the original code handler's update logic to get actual content
      const codeHandler = codeDocumentHandler as any;
      if (codeHandler.onUpdateDocument) {
        return await codeHandler.onUpdateDocument({
          document: args.document,
          description: args.description,
          dataStream: args.dataStream,
          session: args.session,
        });
      }
      return args.document.content || args.document.title; // Fallback
    },
  }),
  
  createEnhancedDocumentHandler({
    kind: 'image',
    onCreateDocument: async (args) => {
      // Use the original image handler's create logic to get actual content
      const imageHandler = imageDocumentHandler as any;
      if (imageHandler.onCreateDocument) {
        return await imageHandler.onCreateDocument({
          id: args.id,
          title: args.title,
          dataStream: args.dataStream,
          session: args.session,
        });
      }
      return args.title; // Fallback
    },
    onUpdateDocument: async (args) => {
      // Use the original image handler's update logic to get actual content
      const imageHandler = imageDocumentHandler as any;
      if (imageHandler.onUpdateDocument) {
        return await imageHandler.onUpdateDocument({
          document: args.document,
          description: args.description,
          dataStream: args.dataStream,
          session: args.session,
        });
      }
      return args.document.content || args.document.title; // Fallback
    },
  }),
  
  createEnhancedDocumentHandler({
    kind: 'sheet',
    onCreateDocument: async (args) => {
      // Use the original sheet handler's create logic to get actual content
      const sheetHandler = sheetDocumentHandler as any;
      if (sheetHandler.onCreateDocument) {
        return await sheetHandler.onCreateDocument({
          id: args.id,
          title: args.title,
          dataStream: args.dataStream,
          session: args.session,
        });
      }
      return args.title; // Fallback
    },
    onUpdateDocument: async (args) => {
      // Use the original sheet handler's update logic to get actual content
      const sheetHandler = sheetDocumentHandler as any;
      if (sheetHandler.onUpdateDocument) {
        return await sheetHandler.onUpdateDocument({
          document: args.document,
          description: args.description,
          dataStream: args.dataStream,
          session: args.session,
        });
      }
      return args.document.content || args.document.title; // Fallback
    },
  }),
  
  createEnhancedDocumentHandler({
    kind: 'pixi',
    onCreateDocument: async (args) => {
      // Use the original pixi handler's create logic to get actual content
      const pixiHandler = pixiDocumentHandler as any;
      if (pixiHandler.onCreateDocument) {
        return await pixiHandler.onCreateDocument({
          id: args.id,
          title: args.title,
          dataStream: args.dataStream,
          session: args.session,
        });
      }
      return args.title; // Fallback
    },
    onUpdateDocument: async (args) => {
      // Use the original pixi handler's update logic to get actual content
      const pixiHandler = pixiDocumentHandler as any;
      if (pixiHandler.onUpdateDocument) {
        return await pixiHandler.onUpdateDocument({
          document: args.document,
          description: args.description,
          dataStream: args.dataStream,
          session: args.session,
        });
      }
      return args.document.content || args.document.title; // Fallback
    },
  }),
];

// Enhanced agentic document handlers with version control
export const enhancedAgenticDocumentHandlers = {
  text: createEnhancedAgenticDocumentHandler('text'),
  code: createEnhancedAgenticDocumentHandler('code'),
  image: createEnhancedAgenticDocumentHandler('image'),
  sheet: createEnhancedAgenticDocumentHandler('sheet'),
  pixi: createEnhancedAgenticDocumentHandler('pixi'),
};

function createEnhancedAgenticDocumentHandler(kind: ArtifactKind) {
  const baseHandler = createAgenticDocumentHandler(kind);
  
  return createEnhancedDocumentHandler({
    kind,
    onCreateDocument: async (args) => {
      // Use the agentic handler's create logic to get actual content
      const agenticHandler = baseHandler as any;
      if (agenticHandler.onCreateDocument) {
        return await agenticHandler.onCreateDocument({
          id: args.id,
          title: args.title,
          dataStream: args.dataStream,
          session: args.session,
        });
      }
      return args.title; // Fallback
    },
    onUpdateDocument: async (args) => {
      // Use the agentic handler's update logic to get actual content
      const agenticHandler = baseHandler as any;
      if (agenticHandler.onUpdateDocument) {
        return await agenticHandler.onUpdateDocument({
          document: args.document,
          description: args.description,
          dataStream: args.dataStream,
          session: args.session,
        });
      }
      return args.document.content || args.document.title; // Fallback
    },
  });
}

export const artifactKinds = ['text', 'code', 'image', 'sheet', 'pixi'] as const;
