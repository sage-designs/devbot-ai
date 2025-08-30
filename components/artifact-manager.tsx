'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  FileText,
  Code,
  Image,
  Table,
  Gamepad2,
  History,
  GitBranch,
  Tag,
  Users,
  MoreVertical,
  Plus,
  Download,
  Share,
  Clock,
  User,
  MessageSquare,
  Folder,
  FolderPlus,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { ArtifactKind } from '@/components/artifact';

interface ArtifactWithVersion {
  artifact: {
    id: string;
    title: string;
    kind: ArtifactKind;
    content: string;
    createdAt: Date;
    userId: string;
  };
  currentVersion?: {
    id: string;
    version: number;
    commitHash: string;
    commitMessage?: string;
    authorId: string;
    createdAt: Date;
  };
  author?: {
    id: string;
    email: string;
  };
  chatCount?: number;
}

interface ChatArtifact {
  artifact: ArtifactWithVersion['artifact'];
  chatArtifact: {
    chatId: string;
    artifactId: string;
    messageId?: string;
    createdAt: Date;
    order: number;
  };
  currentVersion?: ArtifactWithVersion['currentVersion'];
}

interface ArtifactManagerProps {
  chatId?: string;
  userId?: string;
  mode?: 'chat' | 'user' | 'all';
}

const artifactIcons = {
  text: FileText,
  code: Code,
  image: Image,
  sheet: Table,
  pixi: Gamepad2,
};

export function ArtifactManager({ chatId, userId, mode = 'chat' }: ArtifactManagerProps) {
  const [artifacts, setArtifacts] = useState<(ArtifactWithVersion | ChatArtifact)[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedArtifact, setSelectedArtifact] = useState<string | null>(null);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [folderName, setFolderName] = useState('');

  useEffect(() => {
    loadArtifacts();
  }, [chatId, userId, mode]);

  const loadArtifacts = async () => {
    try {
      setLoading(true);
      let url = '/api/artifacts';
      
      if (mode === 'chat' && chatId) {
        url += `?action=by-chat&chatId=${chatId}`;
      } else if (mode === 'user' && userId) {
        url += `?action=user-artifacts&userId=${userId}`;
      }

      const response = await fetch(url);
      const data = await response.json();
      setArtifacts(data);
    } catch (error) {
      console.error('Failed to load artifacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const createFolder = async () => {
    if (!folderName.trim() || !chatId) return;

    try {
      const response = await fetch('/api/artifacts/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: folderName,
          chatId,
        }),
      });

      if (response.ok) {
        setFolderName('');
        setShowCreateFolder(false);
        // Reload artifacts or update state
      }
    } catch (error) {
      console.error('Failed to create folder:', error);
    }
  };

  const getArtifactIcon = (kind: ArtifactKind) => {
    const Icon = artifactIcons[kind];
    return <Icon className="h-4 w-4" />;
  };

  const getArtifactData = (item: ArtifactWithVersion | ChatArtifact) => {
    if ('chatArtifact' in item) {
      return {
        artifact: item.artifact,
        version: item.currentVersion,
        isInChat: true,
      };
    }
    return {
      artifact: item.artifact,
      version: item.currentVersion,
      isInChat: false,
    };
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {mode === 'chat' ? 'Chat Artifacts' : 'My Artifacts'}
          </CardTitle>
          <div className="flex items-center gap-2">
            {mode === 'chat' && (
              <Dialog open={showCreateFolder} onOpenChange={setShowCreateFolder}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <FolderPlus className="h-4 w-4 mr-2" />
                    New Folder
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Folder</DialogTitle>
                    <DialogDescription>
                      Organize your artifacts by creating folders.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="folder-name">Folder Name</Label>
                      <Input
                        id="folder-name"
                        value={folderName}
                        onChange={(e) => setFolderName(e.target.value)}
                        placeholder="Enter folder name..."
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setShowCreateFolder(false)}>
                        Cancel
                      </Button>
                      <Button onClick={createFolder}>Create Folder</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
            <Button variant="outline" size="sm" onClick={loadArtifacts}>
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="list" className="w-full">
          <TabsList>
            <TabsTrigger value="list">List View</TabsTrigger>
            <TabsTrigger value="grid">Grid View</TabsTrigger>
            {mode === 'chat' && <TabsTrigger value="folders">Folders</TabsTrigger>}
          </TabsList>
          
          <TabsContent value="list" className="space-y-4">
            <ScrollArea className="h-[400px]">
              {artifacts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No artifacts found
                </div>
              ) : (
                <div className="space-y-2">
                  {artifacts.map((item) => {
                    const { artifact, version, isInChat } = getArtifactData(item);
                    return (
                      <Card
                        key={artifact.id}
                        className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                          selectedArtifact === artifact.id ? 'ring-2 ring-primary' : ''
                        }`}
                        onClick={() => setSelectedArtifact(artifact.id)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {getArtifactIcon(artifact.kind)}
                              <div>
                                <h4 className="font-medium">{artifact.title}</h4>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Clock className="h-3 w-3" />
                                  {formatDistanceToNow(new Date(artifact.createdAt), {
                                    addSuffix: true,
                                  })}
                                  {version && (
                                    <>
                                      <Separator orientation="vertical" className="h-3" />
                                      <span>v{version.version}</span>
                                    </>
                                  )}
                                  {isInChat && (
                                    <>
                                      <Separator orientation="vertical" className="h-3" />
                                      <MessageSquare className="h-3 w-3" />
                                      <span>In Chat</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary">{artifact.kind}</Badge>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem>
                                    <History className="h-4 w-4 mr-2" />
                                    View History
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <GitBranch className="h-4 w-4 mr-2" />
                                    Create Branch
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <Tag className="h-4 w-4 mr-2" />
                                    Add Tag
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <Users className="h-4 w-4 mr-2" />
                                    Share
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <Download className="h-4 w-4 mr-2" />
                                    Export
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                          {version?.commitMessage && (
                            <p className="text-sm text-muted-foreground mt-2">
                              {version.commitMessage}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="grid" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {artifacts.map((item) => {
                const { artifact, version } = getArtifactData(item);
                return (
                  <Card
                    key={artifact.id}
                    className="cursor-pointer transition-colors hover:bg-muted/50"
                    onClick={() => setSelectedArtifact(artifact.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        {getArtifactIcon(artifact.kind)}
                        <Badge variant="secondary">{artifact.kind}</Badge>
                      </div>
                      <h4 className="font-medium mb-2 truncate">{artifact.title}</h4>
                      <div className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(artifact.createdAt), {
                          addSuffix: true,
                        })}
                        {version && <span className="ml-2">v{version.version}</span>}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
          
          {mode === 'chat' && (
            <TabsContent value="folders">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Folder className="h-4 w-4" />
                  <span className="text-sm text-muted-foreground">
                    Organize artifacts into folders for better management
                  </span>
                </div>
                {/* Folder structure would be implemented here */}
                <div className="text-center py-8 text-muted-foreground">
                  Folder view coming soon...
                </div>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
}
