import { tool, type UIMessageStreamWriter } from 'ai';
import type { Session } from 'next-auth';
import { z } from 'zod';
import { getDocumentById } from '@/lib/db/queries';
import { enhancedDocumentHandlersByArtifactKind } from '@/lib/artifacts/enhanced-server';
import type { ChatMessage } from '@/lib/types';

interface EnhancedUpdateDocumentProps {
  session: Session;
  dataStream: UIMessageStreamWriter<ChatMessage>;
  chatId?: string;
  messageId?: string;
}

export const updateEnhancedDocument = ({
  session,
  dataStream,
  chatId,
  messageId,
}: EnhancedUpdateDocumentProps) =>
  tool({
    description: 'Update a document with enhanced version control. Creates a new version with commit message and maintains full history.',
    inputSchema: z.object({
      id: z.string().describe('The ID of the document to update'),
      description: z
        .string()
        .describe('The description of changes that need to be made'),
      commitMessage: z
        .string()
        .optional()
        .describe('Optional commit message describing the changes'),
    }),
    execute: async ({ id, description, commitMessage }) => {
      const document = await getDocumentById({ id });

      if (!document) {
        return {
          error: 'Document not found',
        };
      }

      dataStream.write({
        type: 'data-clear',
        data: null,
        transient: true,
      });

      const documentHandler = enhancedDocumentHandlersByArtifactKind.find(
        (handler) => handler.kind === document.kind,
      );

      if (!documentHandler) {
        throw new Error(`No enhanced document handler found for kind: ${document.kind}`);
      }

      await documentHandler.onUpdateDocument({
        document,
        description,
        dataStream,
        session,
        chatId,
        commitMessage,
      });

      dataStream.write({ type: 'data-finish', data: null, transient: true });

      return {
        id,
        title: document.title,
        kind: document.kind,
        content: 'The document has been updated with version control.',
        features: {
          versionControl: true,
          commitMessage: commitMessage || description,
          chatLinked: !!chatId,
        },
      };
    },
  });
