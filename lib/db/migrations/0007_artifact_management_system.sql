-- Migration: Artifact Management System with Version Control
-- Creates tables for enhanced artifact management, version control, and collaboration

-- Chat-Artifact relationship table
CREATE TABLE IF NOT EXISTS "ChatArtifact" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"chatId" uuid NOT NULL,
	"documentId" uuid NOT NULL,
	"messageId" uuid,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ChatArtifact_id_pk" PRIMARY KEY("id"),
	CONSTRAINT "ChatArtifact_chatId_documentId_unique" UNIQUE("chatId","documentId")
);
--> statement-breakpoint

-- Artifact versions for version control
CREATE TABLE IF NOT EXISTS "ArtifactVersion" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"documentId" uuid NOT NULL,
	"versionNumber" integer NOT NULL,
	"content" text NOT NULL,
	"contentHash" varchar(64) NOT NULL,
	"commitMessage" text,
	"authorId" uuid NOT NULL,
	"branchName" varchar(255) DEFAULT 'main' NOT NULL,
	"parentVersionId" uuid,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ArtifactVersion_id_pk" PRIMARY KEY("id"),
	CONSTRAINT "ArtifactVersion_documentId_versionNumber_unique" UNIQUE("documentId","versionNumber")
);
--> statement-breakpoint

-- Artifact branches for parallel development
CREATE TABLE IF NOT EXISTS "ArtifactBranch" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"documentId" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"createdBy" uuid NOT NULL,
	"baseVersionId" uuid NOT NULL,
	"headVersionId" uuid,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ArtifactBranch_id_pk" PRIMARY KEY("id"),
	CONSTRAINT "ArtifactBranch_documentId_name_unique" UNIQUE("documentId","name")
);
--> statement-breakpoint

-- Artifact tags for releases and milestones
CREATE TABLE IF NOT EXISTS "ArtifactTag" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"documentId" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"versionId" uuid NOT NULL,
	"createdBy" uuid NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ArtifactTag_id_pk" PRIMARY KEY("id"),
	CONSTRAINT "ArtifactTag_documentId_name_unique" UNIQUE("documentId","name")
);
--> statement-breakpoint

-- Artifact collaboration and permissions
CREATE TABLE IF NOT EXISTS "ArtifactCollaborator" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"documentId" uuid NOT NULL,
	"userId" uuid NOT NULL,
	"permission" varchar(20) DEFAULT 'read' NOT NULL,
	"invitedBy" uuid NOT NULL,
	"invitedAt" timestamp DEFAULT now() NOT NULL,
	"acceptedAt" timestamp,
	CONSTRAINT "ArtifactCollaborator_id_pk" PRIMARY KEY("id"),
	CONSTRAINT "ArtifactCollaborator_documentId_userId_unique" UNIQUE("documentId","userId")
);
--> statement-breakpoint

-- Artifact change logs for audit trail
CREATE TABLE IF NOT EXISTS "ArtifactChangeLog" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"documentId" uuid NOT NULL,
	"versionId" uuid,
	"userId" uuid NOT NULL,
	"action" varchar(50) NOT NULL,
	"details" jsonb,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ArtifactChangeLog_id_pk" PRIMARY KEY("id")
);
--> statement-breakpoint

-- Artifact folders for organization
CREATE TABLE IF NOT EXISTS "ArtifactFolder" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"parentId" uuid,
	"ownerId" uuid NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ArtifactFolder_id_pk" PRIMARY KEY("id")
);
--> statement-breakpoint

-- Add folder reference to existing Document table
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "folderId" uuid;
--> statement-breakpoint

-- Add foreign key constraints
DO $$ BEGIN
 ALTER TABLE "ChatArtifact" ADD CONSTRAINT "ChatArtifact_chatId_Chat_id_fk" FOREIGN KEY ("chatId") REFERENCES "public"."Chat"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "ChatArtifact" ADD CONSTRAINT "ChatArtifact_documentId_Document_id_fk" FOREIGN KEY ("documentId") REFERENCES "public"."Document"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "ChatArtifact" ADD CONSTRAINT "ChatArtifact_messageId_Message_id_fk" FOREIGN KEY ("messageId") REFERENCES "public"."Message"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "ArtifactVersion" ADD CONSTRAINT "ArtifactVersion_documentId_Document_id_fk" FOREIGN KEY ("documentId") REFERENCES "public"."Document"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "ArtifactVersion" ADD CONSTRAINT "ArtifactVersion_authorId_User_id_fk" FOREIGN KEY ("authorId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "ArtifactVersion" ADD CONSTRAINT "ArtifactVersion_parentVersionId_ArtifactVersion_id_fk" FOREIGN KEY ("parentVersionId") REFERENCES "public"."ArtifactVersion"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "ArtifactBranch" ADD CONSTRAINT "ArtifactBranch_documentId_Document_id_fk" FOREIGN KEY ("documentId") REFERENCES "public"."Document"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "ArtifactBranch" ADD CONSTRAINT "ArtifactBranch_createdBy_User_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "ArtifactBranch" ADD CONSTRAINT "ArtifactBranch_baseVersionId_ArtifactVersion_id_fk" FOREIGN KEY ("baseVersionId") REFERENCES "public"."ArtifactVersion"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "ArtifactBranch" ADD CONSTRAINT "ArtifactBranch_headVersionId_ArtifactVersion_id_fk" FOREIGN KEY ("headVersionId") REFERENCES "public"."ArtifactVersion"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "ArtifactTag" ADD CONSTRAINT "ArtifactTag_documentId_Document_id_fk" FOREIGN KEY ("documentId") REFERENCES "public"."Document"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "ArtifactTag" ADD CONSTRAINT "ArtifactTag_versionId_ArtifactVersion_id_fk" FOREIGN KEY ("versionId") REFERENCES "public"."ArtifactVersion"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "ArtifactTag" ADD CONSTRAINT "ArtifactTag_createdBy_User_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "ArtifactCollaborator" ADD CONSTRAINT "ArtifactCollaborator_documentId_Document_id_fk" FOREIGN KEY ("documentId") REFERENCES "public"."Document"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "ArtifactCollaborator" ADD CONSTRAINT "ArtifactCollaborator_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "ArtifactCollaborator" ADD CONSTRAINT "ArtifactCollaborator_invitedBy_User_id_fk" FOREIGN KEY ("invitedBy") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "ArtifactChangeLog" ADD CONSTRAINT "ArtifactChangeLog_documentId_Document_id_fk" FOREIGN KEY ("documentId") REFERENCES "public"."Document"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "ArtifactChangeLog" ADD CONSTRAINT "ArtifactChangeLog_versionId_ArtifactVersion_id_fk" FOREIGN KEY ("versionId") REFERENCES "public"."ArtifactVersion"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "ArtifactChangeLog" ADD CONSTRAINT "ArtifactChangeLog_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "ArtifactFolder" ADD CONSTRAINT "ArtifactFolder_parentId_ArtifactFolder_id_fk" FOREIGN KEY ("parentId") REFERENCES "public"."ArtifactFolder"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "ArtifactFolder" ADD CONSTRAINT "ArtifactFolder_ownerId_User_id_fk" FOREIGN KEY ("ownerId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "Document" ADD CONSTRAINT "Document_folderId_ArtifactFolder_id_fk" FOREIGN KEY ("folderId") REFERENCES "public"."ArtifactFolder"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS "ChatArtifact_chatId_idx" ON "ChatArtifact" ("chatId");
CREATE INDEX IF NOT EXISTS "ChatArtifact_documentId_idx" ON "ChatArtifact" ("documentId");
CREATE INDEX IF NOT EXISTS "ArtifactVersion_documentId_idx" ON "ArtifactVersion" ("documentId");
CREATE INDEX IF NOT EXISTS "ArtifactVersion_branchName_idx" ON "ArtifactVersion" ("branchName");
CREATE INDEX IF NOT EXISTS "ArtifactVersion_contentHash_idx" ON "ArtifactVersion" ("contentHash");
CREATE INDEX IF NOT EXISTS "ArtifactBranch_documentId_idx" ON "ArtifactBranch" ("documentId");
CREATE INDEX IF NOT EXISTS "ArtifactTag_documentId_idx" ON "ArtifactTag" ("documentId");
CREATE INDEX IF NOT EXISTS "ArtifactCollaborator_documentId_idx" ON "ArtifactCollaborator" ("documentId");
CREATE INDEX IF NOT EXISTS "ArtifactCollaborator_userId_idx" ON "ArtifactCollaborator" ("userId");
CREATE INDEX IF NOT EXISTS "ArtifactChangeLog_documentId_idx" ON "ArtifactChangeLog" ("documentId");
CREATE INDEX IF NOT EXISTS "ArtifactChangeLog_timestamp_idx" ON "ArtifactChangeLog" ("timestamp");
CREATE INDEX IF NOT EXISTS "ArtifactFolder_parentId_idx" ON "ArtifactFolder" ("parentId");
CREATE INDEX IF NOT EXISTS "ArtifactFolder_ownerId_idx" ON "ArtifactFolder" ("ownerId");
CREATE INDEX IF NOT EXISTS "Document_folderId_idx" ON "Document" ("folderId");
