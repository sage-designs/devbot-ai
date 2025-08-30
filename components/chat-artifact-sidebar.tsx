'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  FileText,
  Code,
  Image,
  Table,
  Gamepad2,
  ChevronDown,
  ChevronRight,
  History,
  GitBranch,
  Eye,
  Download,
  Share2,
  MoreHorizontal,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { ArtifactKind } from '@/components/artifact';
import { ArtifactVersionHistory } from './artifact-version-history';
import { ArtifactDiffViewer } from './artifact-diff-viewer';

interface ChatArtifactSidebarProps {
  chatId: string;
  isOpen: boolean;
  onToggle: () => void;
}

interface ChatArtifact {
  artifact: {
    id: string;
    title: string;
    kind: ArtifactKind;
    content: string;
    createdAt: Date;
  };
  chatArtifact: {
    order: number;
    messageId?: string;
    createdAt: Date;
  };
  currentVersion?: {
    id: string;
    version: number;
    commitMessage?: string;
    createdAt: Date;
  };
}

const artifactIcons = {
  text: FileText,
  code: Code,
  image: Image,
  sheet: Table,
  pixi: Gamepad2,
};

export function ChatArtifactSidebar({ chatId, isOpen, onToggle }: ChatArtifactSidebarProps) {
  const [artifacts, setArtifacts] = useState<ChatArtifact[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedArtifacts, setExpandedArtifacts] = useState<Set<string>>(new Set());
  const [selectedView, setSelectedView] = useState<{
    type: 'history' | 'diff';
    artifactId: string;
  } | null>(null);

  useEffect(() => {
    if (isOpen && chatId) {
      loadChatArtifacts();
    }
  }, [isOpen, chatId]);

  const loadChatArtifacts = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/artifacts?action=by-chat&chatId=${chatId}`);
      const data = await response.json();
      setArtifacts(data);
    } catch (error) {
      console.error('Failed to load chat artifacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleArtifactExpansion = (artifactId: string) => {
    setExpandedArtifacts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(artifactId)) {
        newSet.delete(artifactId);
      } else {
        newSet.add(artifactId);
      }
      return newSet;
    });
  };

  const getArtifactIcon = (kind: ArtifactKind) => {
    const Icon = artifactIcons[kind];
    return <Icon className="h-4 w-4" />;
  };

  if (!isOpen) return null;

  if (selectedView) {
    return (
      <div className="w-96 border-l bg-background">
        {selectedView.type === 'history' ? (
          <ArtifactVersionHistory
            artifactId={selectedView.artifactId}
            onVersionRestore={() => {
              loadChatArtifacts();
            }}
          />
        ) : (
          <ArtifactDiffViewer
            artifactId={selectedView.artifactId}
            onClose={() => setSelectedView(null)}
          />
        )}
        <div className="p-4 border-t">
          <Button
            variant="outline"
            onClick={() => setSelectedView(null)}
            className="w-full"
          >
            Back to Artifacts
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 border-l bg-background flex flex-col">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Chat Artifacts</h3>
          <Button variant="ghost" size="sm" onClick={onToggle}>
            ×
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {artifacts.length} artifact{artifacts.length !== 1 ? 's' : ''} in this conversation
        </p>
      </div>

      <ScrollArea className="flex-1">
        {loading ? (
          <div className="p-4 space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded mb-2" />
                <div className="h-3 bg-gray-100 rounded" />
              </div>
            ))}
          </div>
        ) : artifacts.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            No artifacts in this chat yet
          </div>
        ) : (
          <div className="p-4 space-y-2">
            {artifacts.map((item) => {
              const { artifact, currentVersion } = item;
              const isExpanded = expandedArtifacts.has(artifact.id);
              
              return (
                <Card key={artifact.id} className="overflow-hidden">
                  <Collapsible
                    open={isExpanded}
                    onOpenChange={() => toggleArtifactExpansion(artifact.id)}
                  >
                    <CollapsibleTrigger asChild>
                      <div className="p-3 cursor-pointer hover:bg-muted/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {getArtifactIcon(artifact.kind)}
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-sm truncate">
                                {artifact.title}
                              </h4>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Badge variant="secondary" className="text-xs px-1 py-0">
                                  {artifact.kind}
                                </Badge>
                                {currentVersion && (
                                  <span>v{currentVersion.version}</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </div>
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent>
                      <div className="px-3 pb-3 space-y-2">
                        <Separator />
                        
                        {currentVersion?.commitMessage && (
                          <p className="text-xs text-muted-foreground">
                            {currentVersion.commitMessage}
                          </p>
                        )}
                        
                        <div className="text-xs text-muted-foreground">
                          Created {formatDistanceToNow(new Date(artifact.createdAt), {
                            addSuffix: true,
                          })}
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => setSelectedView({
                              type: 'history',
                              artifactId: artifact.id,
                            })}
                          >
                            <History className="h-3 w-3 mr-1" />
                            History
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => setSelectedView({
                              type: 'diff',
                              artifactId: artifact.id,
                            })}
                          >
                            <GitBranch className="h-3 w-3 mr-1" />
                            Compare
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs"
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            View
                          </Button>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>
              );
            })}
          </div>
        )}
      </ScrollArea>
      
      <div className="p-4 border-t">
        <Button
          variant="outline"
          size="sm"
          onClick={loadChatArtifacts}
          className="w-full"
        >
          Refresh Artifacts
        </Button>
      </div>
    </div>
  );
}
