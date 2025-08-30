import { NextRequest } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { ChatSDKError } from '@/lib/errors';
import {
  getArtifactsByChat,
  getChatsByArtifact,
  linkArtifactToChat,
  createArtifactVersion,
  getArtifactVersionHistory,
  restoreArtifactVersion,
  getArtifactWithCurrentVersion,
  getUserArtifacts,
  logArtifactChange,
} from '@/lib/db/queries-artifacts';
import { z } from 'zod';

const linkArtifactSchema = z.object({
  chatId: z.string(),
  artifactId: z.string(),
  messageId: z.string().optional(),
  order: z.number().optional(),
});

const createVersionSchema = z.object({
  artifactId: z.string(),
  title: z.string(),
  content: z.string(),
  commitMessage: z.string().optional(),
});

const restoreVersionSchema = z.object({
  artifactId: z.string(),
  versionId: z.string(),
});

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return new ChatSDKError('unauthorized:api').toResponse();
  }

  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const chatId = searchParams.get('chatId');
  const artifactId = searchParams.get('artifactId');
  const userId = searchParams.get('userId');

  try {
    switch (action) {
      case 'by-chat':
        if (!chatId) {
          return new ChatSDKError('bad_request:api').toResponse();
        }
        const chatArtifacts = await getArtifactsByChat({ chatId });
        return Response.json(chatArtifacts);

      case 'by-artifact':
        if (!artifactId) {
          return new ChatSDKError('bad_request:api').toResponse();
        }
        const artifactChats = await getChatsByArtifact({ artifactId });
        return Response.json(artifactChats);

      case 'version-history':
        if (!artifactId) {
          return new ChatSDKError('bad_request:api').toResponse();
        }
        const history = await getArtifactVersionHistory({ artifactId });
        return Response.json(history);

      case 'with-version':
        if (!artifactId) {
          return new ChatSDKError('bad_request:api').toResponse();
        }
        const artifactWithVersion = await getArtifactWithCurrentVersion({ artifactId });
        return Response.json(artifactWithVersion);

      case 'user-artifacts':
        const targetUserId = userId || session.user.id;
        const limit = parseInt(searchParams.get('limit') || '50');
        const offset = parseInt(searchParams.get('offset') || '0');
        
        const userArtifacts = await getUserArtifacts({
          userId: targetUserId,
          limit,
          offset,
        });
        return Response.json(userArtifacts);

      default:
        return new ChatSDKError('bad_request:api').toResponse();
    }
  } catch (error) {
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }
    return new ChatSDKError('bad_request:api').toResponse();
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return new ChatSDKError('unauthorized:api').toResponse();
  }

  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  try {
    const body = await request.json();

    switch (action) {
      case 'link-to-chat':
        const linkData = linkArtifactSchema.parse(body);
        await linkArtifactToChat(linkData);
        
        await logArtifactChange({
          artifactId: linkData.artifactId,
          action: 'create',
          userId: session.user.id,
          details: { chatId: linkData.chatId, messageId: linkData.messageId },
        });
        
        return Response.json({ success: true });

      case 'create-version':
        const versionData = createVersionSchema.parse(body);
        const newVersion = await createArtifactVersion({
          ...versionData,
          authorId: session.user.id,
        });
        return Response.json(newVersion);

      case 'restore-version':
        const restoreData = restoreVersionSchema.parse(body);
        const restoredVersion = await restoreArtifactVersion({
          ...restoreData,
          userId: session.user.id,
        });
        return Response.json(restoredVersion);

      default:
        return new ChatSDKError('bad_request:api').toResponse();
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new ChatSDKError('bad_request:api').toResponse();
    }
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }
    return new ChatSDKError('bad_request:api').toResponse();
  }
}
