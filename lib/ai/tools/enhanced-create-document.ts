import { generateUUID } from '@/lib/utils';
import { tool, type UIMessageStreamWriter } from 'ai';
import { z } from 'zod';
import type { Session } from 'next-auth';
import {
  artifactKinds,
  enhancedDocumentHandlersByArtifactKind,
} from '@/lib/artifacts/enhanced-server';
import type { ChatMessage } from '@/lib/types';

interface EnhancedCreateDocumentProps {
  session: Session;
  dataStream: UIMessageStreamWriter<ChatMessage>;
  chatId?: string;
  messageId?: string;
}

export const createEnhancedDocument = ({
  session,
  dataStream,
  chatId,
  messageId,
}: EnhancedCreateDocumentProps) =>
  tool({
    description:
      'Create a document with enhanced version control and chat linking capabilities. This tool automatically creates version history, links to conversations, and provides full artifact management.',
    inputSchema: z.object({
      title: z.string().describe('The title of the document'),
      kind: z.enum(artifactKinds).describe('The type of artifact to create'),
      commitMessage: z
        .string()
        .optional()
        .describe('Optional commit message for the initial version'),
    }),
    execute: async ({ title, kind, commitMessage }) => {
      const id = generateUUID();

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

      const documentHandler = enhancedDocumentHandlersByArtifactKind.find(
        (handler) => handler.kind === kind,
      );

      if (!documentHandler) {
        throw new Error(`No enhanced document handler found for kind: ${kind}`);
      }

      await documentHandler.onCreateDocument({
        id,
        title,
        dataStream,
        session,
        chatId,
        messageId,
      });

      dataStream.write({ type: 'data-finish', data: null, transient: true });

      return {
        id,
        title,
        kind,
        content: 'A document was created with version control and chat linking enabled.',
        features: {
          versionControl: true,
          chatLinked: !!chatId,
          messageLinked: !!messageId,
          commitMessage: commitMessage || 'Initial version',
        },
      };
    },
  });
