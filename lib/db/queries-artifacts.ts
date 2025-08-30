import 'server-only';

import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  gte,
  inArray,
  lt,
  type SQL,
  isNull,
  or,
} from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { createHash } from 'crypto';

import {
  artifactCollection,
  chatArtifact,
  artifactVersion,
  artifactBranch,
  artifactTag,
  artifactCollaborator,
  artifactChangeLog,
  artifactFolder,
  artifactFolderItem,
  type ArtifactCollection,
  type ChatArtifact,
  type ArtifactVersion,
  type ArtifactBranch,
  type ArtifactTag,
  type ArtifactCollaborator,
  type ArtifactChangeLog,
  type ArtifactFolder,
} from './schema-artifacts';
import { document, chat, user } from './schema';
import type { ArtifactKind } from '@/components/artifact';
import { generateUUID } from '../utils';
import { ChatSDKError } from '../errors';

// biome-ignore lint: Forbidden non-null assertion.
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

// Utility functions
function generateContentHash(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

function generateCommitHash(artifactId: string, version: number, content: string): string {
  const data = `${artifactId}:${version}:${content}:${Date.now()}`;
  return createHash('sha256').update(data).digest('hex');
}

// Chat-Artifact Relationship Management
export async function linkArtifactToChat({
  chatId,
  artifactId,
  messageId,
  order = 0,
}: {
  chatId: string;
  artifactId: string;
  messageId?: string;
  order?: number;
}) {
  try {
    return await db.insert(chatArtifact).values({
      chatId,
      artifactId,
      messageId,
      order,
    });
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to link artifact to chat',
    );
  }
}

export async function getArtifactsByChat({ chatId }: { chatId: string }) {
  try {
    return await db
      .select({
        artifact: document,
        chatArtifact: chatArtifact,
        currentVersion: artifactVersion,
      })
      .from(chatArtifact)
      .innerJoin(document, eq(chatArtifact.artifactId, document.id))
      .leftJoin(
        artifactVersion,
        and(
          eq(artifactVersion.artifactId, document.id),
          eq(artifactVersion.isActive, true),
        ),
      )
      .where(eq(chatArtifact.chatId, chatId))
      .orderBy(asc(chatArtifact.order), desc(chatArtifact.createdAt));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get artifacts by chat',
    );
  }
}

export async function getChatsByArtifact({ artifactId }: { artifactId: string }) {
  try {
    return await db
      .select({
        chat: chat,
        chatArtifact: chatArtifact,
      })
      .from(chatArtifact)
      .innerJoin(chat, eq(chatArtifact.chatId, chat.id))
      .where(eq(chatArtifact.artifactId, artifactId))
      .orderBy(desc(chatArtifact.createdAt));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get chats by artifact',
    );
  }
}

// Version Control Operations
export async function createArtifactVersion({
  artifactId,
  title,
  content,
  commitMessage,
  authorId,
  parentVersionId,
}: {
  artifactId: string;
  title: string;
  content: string;
  commitMessage?: string;
  authorId: string;
  parentVersionId?: string;
}) {
  try {
    // Get next version number
    const [latestVersion] = await db
      .select({ version: artifactVersion.version })
      .from(artifactVersion)
      .where(eq(artifactVersion.artifactId, artifactId))
      .orderBy(desc(artifactVersion.version))
      .limit(1);

    const nextVersion = (latestVersion?.version || 0) + 1;
    const contentHash = generateContentHash(content);
    const commitHash = generateCommitHash(artifactId, nextVersion, content);

    // Deactivate current active version
    await db
      .update(artifactVersion)
      .set({ isActive: false })
      .where(
        and(
          eq(artifactVersion.artifactId, artifactId),
          eq(artifactVersion.isActive, true),
        ),
      );

    // Create new version
    const [newVersion] = await db
      .insert(artifactVersion)
      .values({
        artifactId,
        version: nextVersion,
        commitHash,
        parentVersionId,
        title,
        content,
        contentHash,
        commitMessage,
        authorId,
        isActive: true,
      })
      .returning();

    // Update main document
    await db
      .update(document)
      .set({ title, content })
      .where(eq(document.id, artifactId));

    // Log the change
    await logArtifactChange({
      artifactId,
      versionId: newVersion.id,
      action: 'update',
      userId: authorId,
      details: { commitMessage, version: nextVersion },
    });

    return newVersion;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to create artifact version',
    );
  }
}

export async function getArtifactVersionHistory({ artifactId }: { artifactId: string }) {
  try {
    return await db
      .select({
        version: artifactVersion,
        author: {
          id: user.id,
          email: user.email,
        },
      })
      .from(artifactVersion)
      .innerJoin(user, eq(artifactVersion.authorId, user.id))
      .where(eq(artifactVersion.artifactId, artifactId))
      .orderBy(desc(artifactVersion.version));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get artifact version history',
    );
  }
}

export async function getArtifactVersionById({ versionId }: { versionId: string }) {
  try {
    const result = await db
      .select()
      .from(artifactVersion)
      .where(eq(artifactVersion.id, versionId))
      .limit(1);
    
    return result[0] || null;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get artifact version by ID',
    );
  }
}

export async function restoreArtifactVersion({
  artifactId,
  versionId,
  userId,
}: {
  artifactId: string;
  versionId: string;
  userId: string;
}) {
  try {
    // Get the version to restore
    const [versionToRestore] = await db
      .select()
      .from(artifactVersion)
      .where(
        and(
          eq(artifactVersion.id, versionId),
          eq(artifactVersion.artifactId, artifactId),
        ),
      );

    if (!versionToRestore) {
      throw new ChatSDKError('not_found:database', 'Version not found');
    }

    // Create new version based on the restored content
    return await createArtifactVersion({
      artifactId,
      title: versionToRestore.title,
      content: versionToRestore.content,
      commitMessage: `Restored from version ${versionToRestore.version}`,
      authorId: userId,
    });
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to restore artifact version',
    );
  }
}

// Branch Management
export async function createArtifactBranch({
  artifactId,
  name,
  fromVersionId,
}: {
  artifactId: string;
  name: string;
  fromVersionId: string;
}) {
  try {
    return await db.insert(artifactBranch).values({
      artifactId,
      name,
      headVersionId: fromVersionId,
    });
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to create artifact branch',
    );
  }
}

export async function getArtifactBranches({ artifactId }: { artifactId: string }) {
  try {
    return await db
      .select({
        branch: artifactBranch,
        headVersion: artifactVersion,
      })
      .from(artifactBranch)
      .innerJoin(artifactVersion, eq(artifactBranch.headVersionId, artifactVersion.id))
      .where(eq(artifactBranch.artifactId, artifactId))
      .orderBy(desc(artifactBranch.updatedAt));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get artifact branches',
    );
  }
}

// Tag Management
export async function createArtifactTag({
  artifactId,
  versionId,
  name,
  description,
}: {
  artifactId: string;
  versionId: string;
  name: string;
  description?: string;
}) {
  try {
    return await db.insert(artifactTag).values({
      artifactId,
      versionId,
      name,
      description,
    });
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to create artifact tag',
    );
  }
}

export async function getArtifactTags({ artifactId }: { artifactId: string }) {
  try {
    return await db
      .select({
        tag: artifactTag,
        version: artifactVersion,
      })
      .from(artifactTag)
      .innerJoin(artifactVersion, eq(artifactTag.versionId, artifactVersion.id))
      .where(eq(artifactTag.artifactId, artifactId))
      .orderBy(desc(artifactTag.createdAt));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get artifact tags',
    );
  }
}

// Collaboration Management
export async function addArtifactCollaborator({
  artifactId,
  userId,
  permission,
  invitedBy,
}: {
  artifactId: string;
  userId: string;
  permission: 'read' | 'write' | 'admin';
  invitedBy: string;
}) {
  try {
    return await db.insert(artifactCollaborator).values({
      artifactId,
      userId,
      permission,
      invitedBy,
    });
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to add artifact collaborator',
    );
  }
}

export async function getArtifactCollaborators({ artifactId }: { artifactId: string }) {
  try {
    return await db
      .select({
        collaborator: artifactCollaborator,
        user: {
          id: user.id,
          email: user.email,
        },
        inviter: {
          id: user.id,
          email: user.email,
        },
      })
      .from(artifactCollaborator)
      .innerJoin(user, eq(artifactCollaborator.userId, user.id))
      .innerJoin(user, eq(artifactCollaborator.invitedBy, user.id))
      .where(eq(artifactCollaborator.artifactId, artifactId));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get artifact collaborators',
    );
  }
}

// Change Log
export async function logArtifactChange({
  artifactId,
  versionId,
  action,
  userId,
  details,
}: {
  artifactId: string;
  versionId?: string;
  action: 'create' | 'update' | 'delete' | 'restore' | 'branch' | 'merge' | 'tag';
  userId: string;
  details?: any;
}) {
  try {
    return await db.insert(artifactChangeLog).values({
      artifactId,
      versionId,
      action,
      userId,
      details,
    });
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to log artifact change',
    );
  }
}

export async function getArtifactChangeLog({ artifactId }: { artifactId: string }) {
  try {
    return await db
      .select({
        log: artifactChangeLog,
        user: {
          id: user.id,
          email: user.email,
        },
        version: artifactVersion,
      })
      .from(artifactChangeLog)
      .innerJoin(user, eq(artifactChangeLog.userId, user.id))
      .leftJoin(artifactVersion, eq(artifactChangeLog.versionId, artifactVersion.id))
      .where(eq(artifactChangeLog.artifactId, artifactId))
      .orderBy(desc(artifactChangeLog.timestamp));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get artifact change log',
    );
  }
}

// Folder Management
export async function createArtifactFolder({
  name,
  chatId,
  userId,
  parentFolderId,
}: {
  name: string;
  chatId: string;
  userId: string;
  parentFolderId?: string;
}) {
  try {
    return await db.insert(artifactFolder).values({
      name,
      chatId,
      userId,
      parentFolderId,
    });
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to create artifact folder',
    );
  }
}

export async function getFoldersByChat({ chatId }: { chatId: string }) {
  try {
    return await db
      .select()
      .from(artifactFolder)
      .where(eq(artifactFolder.chatId, chatId))
      .orderBy(asc(artifactFolder.name));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get folders by chat',
    );
  }
}

export async function addArtifactToFolder({
  folderId,
  artifactId,
}: {
  folderId: string;
  artifactId: string;
}) {
  try {
    return await db.insert(artifactFolderItem).values({
      folderId,
      artifactId,
    });
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to add artifact to folder',
    );
  }
}

// Enhanced artifact queries with version control
export async function getArtifactWithCurrentVersion({ artifactId }: { artifactId: string }) {
  try {
    const [result] = await db
      .select({
        artifact: document,
        currentVersion: artifactVersion,
        author: {
          id: user.id,
          email: user.email,
        },
      })
      .from(document)
      .leftJoin(
        artifactVersion,
        and(
          eq(artifactVersion.artifactId, document.id),
          eq(artifactVersion.isActive, true),
        ),
      )
      .leftJoin(user, eq(artifactVersion.authorId, user.id))
      .where(eq(document.id, artifactId));

    return result;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get artifact with current version',
    );
  }
}

export async function getUserArtifacts({
  userId,
  limit = 50,
  offset = 0,
}: {
  userId: string;
  limit?: number;
  offset?: number;
}) {
  try {
    return await db
      .select({
        artifact: document,
        currentVersion: artifactVersion,
        chatCount: count(chatArtifact.chatId),
      })
      .from(document)
      .leftJoin(
        artifactVersion,
        and(
          eq(artifactVersion.artifactId, document.id),
          eq(artifactVersion.isActive, true),
        ),
      )
      .leftJoin(chatArtifact, eq(chatArtifact.artifactId, document.id))
      .where(eq(document.userId, userId))
      .groupBy(document.id, artifactVersion.id)
      .orderBy(desc(document.createdAt))
      .limit(limit)
      .offset(offset);
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get user artifacts',
    );
  }
}
