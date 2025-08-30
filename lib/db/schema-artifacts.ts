import type { InferSelectModel } from 'drizzle-orm';
import {
  pgTable,
  varchar,
  timestamp,
  json,
  uuid,
  text,
  primaryKey,
  foreignKey,
  boolean,
  integer,
} from 'drizzle-orm/pg-core';
import { chat, user, document } from './schema';

// Enhanced artifact management with chat relationships and version control

export const artifactCollection = pgTable('ArtifactCollection', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  chatId: uuid('chatId')
    .notNull()
    .references(() => chat.id),
  userId: uuid('userId')
    .notNull()
    .references(() => user.id),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
});

export type ArtifactCollection = InferSelectModel<typeof artifactCollection>;

// Chat-Artifact relationship table
export const chatArtifact = pgTable(
  'ChatArtifact',
  {
    chatId: uuid('chatId')
      .notNull()
      .references(() => chat.id),
    artifactId: uuid('artifactId')
      .notNull()
      .references(() => document.id),
    messageId: uuid('messageId'), // Optional: link to specific message that created artifact
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    order: integer('order').notNull().default(0), // For ordering artifacts in chat
  },
  (table) => ({
    pk: primaryKey({ columns: [table.chatId, table.artifactId] }),
  }),
);

export type ChatArtifact = InferSelectModel<typeof chatArtifact>;

// Artifact version control - Git-like versioning
export const artifactVersion = pgTable('ArtifactVersion', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  artifactId: uuid('artifactId')
    .notNull()
    .references(() => document.id),
  version: integer('version').notNull(), // Incremental version number
  commitHash: varchar('commitHash', { length: 64 }).notNull().unique(), // SHA-256 hash
  parentVersionId: uuid('parentVersionId').references(() => artifactVersion.id), // For branching
  title: text('title').notNull(),
  content: text('content').notNull(),
  contentHash: varchar('contentHash', { length: 64 }).notNull(), // Content SHA-256
  commitMessage: text('commitMessage'),
  authorId: uuid('authorId')
    .notNull()
    .references(() => user.id),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  isActive: boolean('isActive').notNull().default(true), // Current active version
  metadata: json('metadata'), // Additional version metadata
});

export type ArtifactVersion = InferSelectModel<typeof artifactVersion>;

// Artifact branches for parallel development
export const artifactBranch = pgTable('ArtifactBranch', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  artifactId: uuid('artifactId')
    .notNull()
    .references(() => document.id),
  name: varchar('name', { length: 100 }).notNull(), // main, feature/xyz, etc.
  headVersionId: uuid('headVersionId')
    .notNull()
    .references(() => artifactVersion.id),
  isDefault: boolean('isDefault').notNull().default(false),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
});

export type ArtifactBranch = InferSelectModel<typeof artifactBranch>;

// Artifact tags for marking specific versions
export const artifactTag = pgTable('ArtifactTag', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  artifactId: uuid('artifactId')
    .notNull()
    .references(() => document.id),
  versionId: uuid('versionId')
    .notNull()
    .references(() => artifactVersion.id),
  name: varchar('name', { length: 100 }).notNull(), // v1.0, release, stable, etc.
  description: text('description'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
});

export type ArtifactTag = InferSelectModel<typeof artifactTag>;

// Artifact collaboration and sharing
export const artifactCollaborator = pgTable(
  'ArtifactCollaborator',
  {
    artifactId: uuid('artifactId')
      .notNull()
      .references(() => document.id),
    userId: uuid('userId')
      .notNull()
      .references(() => user.id),
    permission: varchar('permission', { 
      enum: ['read', 'write', 'admin'] 
    }).notNull().default('read'),
    invitedBy: uuid('invitedBy')
      .notNull()
      .references(() => user.id),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.artifactId, table.userId] }),
  }),
);

export type ArtifactCollaborator = InferSelectModel<typeof artifactCollaborator>;

// Artifact change log for audit trail
export const artifactChangeLog = pgTable('ArtifactChangeLog', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  artifactId: uuid('artifactId')
    .notNull()
    .references(() => document.id),
  versionId: uuid('versionId')
    .references(() => artifactVersion.id),
  action: varchar('action', { 
    enum: ['create', 'update', 'delete', 'restore', 'branch', 'merge', 'tag'] 
  }).notNull(),
  userId: uuid('userId')
    .notNull()
    .references(() => user.id),
  details: json('details'), // Action-specific details
  timestamp: timestamp('timestamp').notNull().defaultNow(),
});

export type ArtifactChangeLog = InferSelectModel<typeof artifactChangeLog>;

// Artifact folder structure for organization
export const artifactFolder = pgTable('ArtifactFolder', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  name: text('name').notNull(),
  parentFolderId: uuid('parentFolderId').references(() => artifactFolder.id),
  chatId: uuid('chatId')
    .notNull()
    .references(() => chat.id),
  userId: uuid('userId')
    .notNull()
    .references(() => user.id),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
});

export type ArtifactFolder = InferSelectModel<typeof artifactFolder>;

// Link artifacts to folders
export const artifactFolderItem = pgTable(
  'ArtifactFolderItem',
  {
    folderId: uuid('folderId')
      .notNull()
      .references(() => artifactFolder.id),
    artifactId: uuid('artifactId')
      .notNull()
      .references(() => document.id),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.folderId, table.artifactId] }),
  }),
);

export type ArtifactFolderItem = InferSelectModel<typeof artifactFolderItem>;
