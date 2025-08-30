'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
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
  History,
  GitCommit,
  User,
  Clock,
  RotateCcw,
  GitBranch,
  Tag,
  Eye,
  Download,
  Copy,
  CheckCircle,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

interface ArtifactVersion {
  id: string;
  version: number;
  commitHash: string;
  commitMessage?: string;
  authorId: string;
  createdAt: Date;
  isActive: boolean;
}

interface VersionWithAuthor {
  version: ArtifactVersion;
  author: {
    id: string;
    email: string;
  };
}

interface ArtifactVersionHistoryProps {
  artifactId: string;
  currentVersion?: number;
  onVersionRestore?: (versionId: string) => void;
}

export function ArtifactVersionHistory({
  artifactId,
  currentVersion,
  onVersionRestore,
}: ArtifactVersionHistoryProps) {
  const [versions, setVersions] = useState<VersionWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVersions, setSelectedVersions] = useState<string[]>([]);
  const [showCreateTag, setShowCreateTag] = useState<string | null>(null);
  const [tagName, setTagName] = useState('');
  const [tagDescription, setTagDescription] = useState('');

  useEffect(() => {
    loadVersionHistory();
  }, [artifactId]);

  const loadVersionHistory = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/artifacts?action=version-history&artifactId=${artifactId}`
      );
      const data = await response.json();
      setVersions(data);
    } catch (error) {
      console.error('Failed to load version history:', error);
      toast.error('Failed to load version history');
    } finally {
      setLoading(false);
    }
  };

  const restoreVersion = async (versionId: string) => {
    try {
      const response = await fetch('/api/artifacts?action=restore-version', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          artifactId,
          versionId,
        }),
      });

      if (response.ok) {
        toast.success('Version restored successfully');
        onVersionRestore?.(versionId);
        loadVersionHistory();
      } else {
        toast.error('Failed to restore version');
      }
    } catch (error) {
      console.error('Failed to restore version:', error);
      toast.error('Failed to restore version');
    }
  };

  const createTag = async (versionId: string) => {
    if (!tagName.trim()) return;

    try {
      const response = await fetch(`/api/artifacts/${artifactId}?action=create-tag`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          versionId,
          name: tagName,
          description: tagDescription,
        }),
      });

      if (response.ok) {
        toast.success('Tag created successfully');
        setShowCreateTag(null);
        setTagName('');
        setTagDescription('');
        loadVersionHistory();
      } else {
        toast.error('Failed to create tag');
      }
    } catch (error) {
      console.error('Failed to create tag:', error);
      toast.error('Failed to create tag');
    }
  };

  const copyCommitHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    toast.success('Commit hash copied to clipboard');
  };

  const toggleVersionSelection = (versionId: string) => {
    setSelectedVersions(prev => 
      prev.includes(versionId)
        ? prev.filter(id => id !== versionId)
        : [...prev, versionId].slice(-2) // Keep only last 2 selections for diff
    );
  };

  const generateDiff = async () => {
    if (selectedVersions.length !== 2) {
      toast.error('Please select exactly 2 versions to compare');
      return;
    }

    try {
      const response = await fetch(`/api/artifacts/${artifactId}?action=diff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromVersionId: selectedVersions[1], // Older version
          toVersionId: selectedVersions[0],   // Newer version
        }),
      });

      const diffData = await response.json();
      // Open diff viewer (would be implemented separately)
      console.log('Diff data:', diffData);
      toast.success('Diff generated successfully');
    } catch (error) {
      console.error('Failed to generate diff:', error);
      toast.error('Failed to generate diff');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
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
            <History className="h-5 w-5" />
            Version History
          </CardTitle>
          <div className="flex items-center gap-2">
            {selectedVersions.length === 2 && (
              <Button variant="outline" size="sm" onClick={generateDiff}>
                Compare Versions
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={loadVersionHistory}>
              Refresh
            </Button>
          </div>
        </div>
        {selectedVersions.length > 0 && (
          <div className="text-sm text-muted-foreground">
            {selectedVersions.length} version{selectedVersions.length > 1 ? 's' : ''} selected
            {selectedVersions.length === 2 && ' for comparison'}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px]">
          {versions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No version history found
            </div>
          ) : (
            <div className="space-y-4">
              {versions.map((item, index) => {
                const { version, author } = item;
                const isSelected = selectedVersions.includes(version.id);
                const isCurrent = version.isActive;
                
                return (
                  <Card
                    key={version.id}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? 'ring-2 ring-primary' : 'hover:bg-muted/50'
                    } ${isCurrent ? 'border-green-500' : ''}`}
                    onClick={() => toggleVersionSelection(version.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="mt-1">
                            <GitCommit className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium">v{version.version}</span>
                              {isCurrent && (
                                <Badge variant="default" className="text-xs">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Current
                                </Badge>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyCommitHash(version.commitHash);
                                }}
                              >
                                <Copy className="h-3 w-3 mr-1" />
                                {version.commitHash.substring(0, 8)}
                              </Button>
                            </div>
                            
                            {version.commitMessage && (
                              <p className="text-sm mb-2">{version.commitMessage}</p>
                            )}
                            
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {author.email}
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatDistanceToNow(new Date(version.createdAt), {
                                  addSuffix: true,
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1 ml-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              // Open version viewer
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          
                          <Dialog
                            open={showCreateTag === version.id}
                            onOpenChange={(open) => setShowCreateTag(open ? version.id : null)}
                          >
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Tag className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Create Tag</DialogTitle>
                                <DialogDescription>
                                  Create a tag for version {version.version}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <Label htmlFor="tag-name">Tag Name</Label>
                                  <Input
                                    id="tag-name"
                                    value={tagName}
                                    onChange={(e) => setTagName(e.target.value)}
                                    placeholder="v1.0, release, stable..."
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="tag-description">Description (optional)</Label>
                                  <Textarea
                                    id="tag-description"
                                    value={tagDescription}
                                    onChange={(e) => setTagDescription(e.target.value)}
                                    placeholder="Describe this version..."
                                  />
                                </div>
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="outline"
                                    onClick={() => setShowCreateTag(null)}
                                  >
                                    Cancel
                                  </Button>
                                  <Button onClick={() => createTag(version.id)}>
                                    Create Tag
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                          
                          {!isCurrent && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                restoreVersion(version.id);
                              }}
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
