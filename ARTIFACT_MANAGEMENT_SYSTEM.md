# Artifact Management System with Version Control

## Overview

A comprehensive artifact management system that provides Git-like version control, chat-artifact relationships, and collaborative features for managing artifacts across conversations.

## 🏗️ System Architecture

### Core Components

1. **Chat-Artifact Relationships** - Direct linking between conversations and artifacts
2. **Version Control System** - Git-like versioning with commits, branches, and tags
3. **Artifact History Management** - Complete audit trail and rollback capabilities
4. **Collaboration Features** - Multi-user artifact sharing and permissions
5. **Folder Organization** - Hierarchical organization of artifacts

### Database Schema

#### New Tables Added

- **`ArtifactCollection`** - Groups of related artifacts
- **`ChatArtifact`** - Links artifacts to specific chats/messages
- **`ArtifactVersion`** - Version control with commit hashes and metadata
- **`ArtifactBranch`** - Git-like branching for parallel development
- **`ArtifactTag`** - Named versions (releases, milestones)
- **`ArtifactCollaborator`** - User permissions and sharing
- **`ArtifactChangeLog`** - Complete audit trail
- **`ArtifactFolder`** - Hierarchical organization
- **`ArtifactFolderItem`** - Folder contents

## 🔧 Implementation Details

### Enhanced Document Handlers

- **Enhanced Server** (`lib/artifacts/enhanced-server.ts`)
  - Wraps existing document handlers with version control
  - Automatic chat linking and version creation
  - Comprehensive change logging

### API Endpoints

- **`/api/artifacts`** - Main artifact management API
  - Get artifacts by chat/user
  - Create versions and restore functionality
  - Link artifacts to conversations

- **`/api/artifacts/[id]`** - Individual artifact operations
  - Version history and change logs
  - Branch and tag management
  - Collaboration features

### Version Control Features

- **Content Diffing** (`lib/artifact-management/version-control.ts`)
  - Line-by-line diff generation
  - Unified and split diff views
  - Merge conflict detection
  - Content similarity analysis

### UI Components

1. **`ArtifactManager`** - Main artifact browser with list/grid views
2. **`ArtifactVersionHistory`** - Complete version timeline with actions
3. **`ArtifactDiffViewer`** - Visual diff comparison tool
4. **`ChatArtifactSidebar`** - In-chat artifact management panel

## 🚀 Key Features

### Version Control
- **Automatic Versioning** - Every update creates a new version
- **Commit Messages** - Descriptive change documentation
- **Content Hashing** - SHA-256 for integrity verification
- **Rollback Support** - Restore any previous version
- **Branch Management** - Parallel development paths
- **Tag System** - Named releases and milestones

### Chat Integration
- **Auto-Linking** - Artifacts automatically linked to creating chat
- **Message Context** - Track which message created each artifact
- **Conversation History** - See all chats using an artifact
- **Sidebar Access** - Quick artifact management in chat

### Collaboration
- **Permission System** - Read/Write/Admin access levels
- **User Invitations** - Share artifacts with team members
- **Change Attribution** - Track who made what changes
- **Activity Logging** - Complete audit trail

### Organization
- **Folder Structure** - Hierarchical artifact organization
- **Search & Filter** - Find artifacts by type, date, author
- **Bulk Operations** - Manage multiple artifacts at once
- **Export Options** - Download artifacts in various formats

## 📊 Database Relationships

```
Chat ──┐
       ├── ChatArtifact ──── Document (Artifact)
       └── ArtifactFolder    │
                             ├── ArtifactVersion
                             ├── ArtifactBranch
                             ├── ArtifactTag
                             ├── ArtifactCollaborator
                             └── ArtifactChangeLog
```

## 🔄 Integration Points

### Enhanced Tools
- **`createEnhancedDocument`** - Version-controlled artifact creation
- **`updateEnhancedDocument`** - Automatic versioning on updates
- **Chat API Integration** - Seamless chat-artifact linking

### Backward Compatibility
- Existing artifacts continue to work unchanged
- Gradual migration to enhanced system
- Optional version control activation

## 🎯 Usage Examples

### Creating Versioned Artifacts
```typescript
// Automatically creates initial version and links to chat
const artifact = await createEnhancedDocument({
  title: "API Documentation",
  kind: "text",
  commitMessage: "Initial documentation draft"
});
```

### Version Management
```typescript
// Create new version with changes
await createArtifactVersion({
  artifactId: "doc-123",
  title: "Updated API Documentation", 
  content: updatedContent,
  commitMessage: "Added authentication section",
  authorId: userId
});

// Restore previous version
await restoreArtifactVersion({
  artifactId: "doc-123",
  versionId: "version-456",
  userId: userId
});
```

### Collaboration
```typescript
// Share artifact with team member
await addArtifactCollaborator({
  artifactId: "doc-123",
  userId: "user-789",
  permission: "write",
  invitedBy: currentUserId
});
```

## 🛠️ Development Status

### ✅ Completed
- Database schema design and implementation
- Version control system with Git-like features
- API endpoints for all major operations
- UI components for artifact management
- Chat integration and sidebar
- Diff viewer and version history
- Enhanced document handlers

### 🔄 Next Steps
- Database migration scripts
- Integration with existing chat API
- Comprehensive testing
- Performance optimization
- Documentation and examples

## 🔐 Security Considerations

- **Permission Validation** - All operations check user permissions
- **Content Integrity** - SHA-256 hashing prevents tampering
- **Audit Logging** - Complete change history for compliance
- **Access Control** - Granular permission system

## 📈 Performance Features

- **Incremental Versioning** - Only store changes, not full copies
- **Content Deduplication** - Identical content shares storage
- **Lazy Loading** - Load version content on demand
- **Efficient Queries** - Optimized database indexes

This system transforms the basic artifact storage into a comprehensive version-controlled, collaborative platform that maintains full compatibility with existing functionality while adding powerful new capabilities.
