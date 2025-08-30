import { NextRequest } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { ChatSDKError } from '@/lib/errors';
import {
  getArtifactChangeLog,
  createArtifactBranch,
  getArtifactBranches,
  createArtifactTag,
  getArtifactTags,
  addArtifactCollaborator,
  getArtifactCollaborators,
  getArtifactVersionById,
} from '@/lib/db/queries-artifacts';
import { generateDiff, generateUnifiedDiff } from '@/lib/artifact-management/version-control';
import { getDocumentById } from '@/lib/db/queries';
import { z } from 'zod';

const createBranchSchema = z.object({
  name: z.string(),
  fromVersionId: z.string(),
});

const createTagSchema = z.object({
  versionId: z.string(),
  name: z.string(),
  description: z.string().optional(),
});

const addCollaboratorSchema = z.object({
  userId: z.string(),
  permission: z.enum(['read', 'write', 'admin']),
});

const diffSchema = z.object({
  fromVersionId: z.string(),
  toVersionId: z.string(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return new ChatSDKError('unauthorized:api').toResponse();
  }

  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const artifactId = params.id;

  try {
    switch (action) {
      case 'change-log':
        const changeLog = await getArtifactChangeLog({ artifactId });
        return Response.json(changeLog);

      case 'branches':
        const branches = await getArtifactBranches({ artifactId });
        return Response.json(branches);

      case 'tags':
        const tags = await getArtifactTags({ artifactId });
        return Response.json(tags);

      case 'collaborators':
        const collaborators = await getArtifactCollaborators({ artifactId });
        return Response.json(collaborators);

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

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return new ChatSDKError('unauthorized:api').toResponse();
  }

  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const artifactId = params.id;

  try {
    const body = await request.json();

    switch (action) {
      case 'create-branch':
        const branchData = createBranchSchema.parse(body);
        const branch = await createArtifactBranch({
          artifactId,
          ...branchData,
        });
        return Response.json(branch);

      case 'create-tag':
        const tagData = createTagSchema.parse(body);
        const tag = await createArtifactTag({
          artifactId,
          ...tagData,
        });
        return Response.json(tag);

      case 'add-collaborator':
        const collaboratorData = addCollaboratorSchema.parse(body);
        const collaborator = await addArtifactCollaborator({
          artifactId,
          invitedBy: session.user.id,
          ...collaboratorData,
        });
        return Response.json(collaborator);

      case 'diff':
        const diffData = diffSchema.parse(body);
        
        // Fetch the actual version content from database
        const fromVersion = await getArtifactVersionById({ versionId: diffData.fromVersionId });
        const toVersion = await getArtifactVersionById({ versionId: diffData.toVersionId });
        
        if (!fromVersion || !toVersion) {
          return new ChatSDKError('bad_request:api').toResponse();
        }
        
        // Generate unified diff between versions
        const diff = generateUnifiedDiff(
          fromVersion.content,
          toVersion.content,
          `Version ${fromVersion.versionNumber}`,
          `Version ${toVersion.versionNumber}`
        );
        
        return Response.json({
          diff,
          fromVersionId: diffData.fromVersionId,
          toVersionId: diffData.toVersionId,
          fromVersion: fromVersion.versionNumber,
          toVersion: toVersion.versionNumber,
        });

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
