'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  GitCompare,
  Plus,
  Minus,
  RotateCcw,
  Download,
  Eye,
  EyeOff,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DiffLine {
  type: 'add' | 'remove' | 'context' | 'modify';
  oldLineNumber?: number;
  newLineNumber?: number;
  content: string;
  oldContent?: string; // For modifications
}

interface DiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: DiffLine[];
}

interface DiffData {
  fromVersion: {
    id: string;
    version: number;
    title: string;
  };
  toVersion: {
    id: string;
    version: number;
    title: string;
  };
  hunks: DiffHunk[];
  stats: {
    additions: number;
    deletions: number;
    modifications: number;
  };
}

interface ArtifactDiffViewerProps {
  artifactId: string;
  fromVersionId?: string;
  toVersionId?: string;
  onClose?: () => void;
}

export function ArtifactDiffViewer({
  artifactId,
  fromVersionId,
  toVersionId,
  onClose,
}: ArtifactDiffViewerProps) {
  const [diffData, setDiffData] = useState<DiffData | null>(null);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'unified' | 'split'>('unified');
  const [showWhitespace, setShowWhitespace] = useState(false);
  const [contextLines, setContextLines] = useState(3);
  const [availableVersions, setAvailableVersions] = useState<any[]>([]);
  const [selectedFromVersion, setSelectedFromVersion] = useState(fromVersionId);
  const [selectedToVersion, setSelectedToVersion] = useState(toVersionId);

  useEffect(() => {
    loadAvailableVersions();
  }, [artifactId]);

  useEffect(() => {
    if (selectedFromVersion && selectedToVersion) {
      generateDiff();
    }
  }, [selectedFromVersion, selectedToVersion, contextLines]);

  const loadAvailableVersions = async () => {
    try {
      const response = await fetch(
        `/api/artifacts?action=version-history&artifactId=${artifactId}`
      );
      const versions = await response.json();
      setAvailableVersions(versions);
    } catch (error) {
      console.error('Failed to load versions:', error);
    }
  };

  const generateDiff = async () => {
    if (!selectedFromVersion || !selectedToVersion) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/artifacts/${artifactId}?action=diff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromVersionId: selectedFromVersion,
          toVersionId: selectedToVersion,
          contextLines,
        }),
      });

      const data = await response.json();
      setDiffData(data);
    } catch (error) {
      console.error('Failed to generate diff:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderUnifiedDiff = () => {
    if (!diffData) return null;

    return (
      <div className="font-mono text-sm">
        {diffData.hunks.map((hunk, hunkIndex) => (
          <div key={hunkIndex} className="mb-6">
            <div className="bg-blue-50 px-4 py-2 text-blue-800 border-l-4 border-blue-400">
              @@ -{hunk.oldStart},{hunk.oldLines} +{hunk.newStart},{hunk.newLines} @@
            </div>
            {hunk.lines.map((line, lineIndex) => (
              <div
                key={lineIndex}
                className={cn(
                  'flex items-center px-4 py-1 border-l-4',
                  {
                    'bg-green-50 border-green-400 text-green-800': line.type === 'add',
                    'bg-red-50 border-red-400 text-red-800': line.type === 'remove',
                    'bg-yellow-50 border-yellow-400 text-yellow-800': line.type === 'modify',
                    'bg-gray-50 border-gray-200': line.type === 'context',
                  }
                )}
              >
                <div className="flex items-center gap-2 w-20 text-xs text-muted-foreground">
                  <span className="w-8 text-right">
                    {line.oldLineNumber || ''}
                  </span>
                  <span className="w-8 text-right">
                    {line.newLineNumber || ''}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-1">
                  <span className="w-4 text-center">
                    {line.type === 'add' && <Plus className="h-3 w-3" />}
                    {line.type === 'remove' && <Minus className="h-3 w-3" />}
                    {line.type === 'modify' && '~'}
                  </span>
                  <pre className="whitespace-pre-wrap break-all">
                    {showWhitespace
                      ? line.content.replace(/ /g, '·').replace(/\t/g, '→')
                      : line.content}
                  </pre>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  };

  const renderSplitDiff = () => {
    if (!diffData) return null;

    return (
      <div className="grid grid-cols-2 gap-4 font-mono text-sm">
        <div className="border-r">
          <div className="bg-red-50 px-4 py-2 text-red-800 font-medium">
            Version {diffData.fromVersion.version} (Old)
          </div>
          {diffData.hunks.map((hunk, hunkIndex) => (
            <div key={hunkIndex}>
              {hunk.lines
                .filter(line => line.type !== 'add')
                .map((line, lineIndex) => (
                  <div
                    key={lineIndex}
                    className={cn(
                      'flex items-center px-4 py-1',
                      {
                        'bg-red-50 text-red-800': line.type === 'remove',
                        'bg-yellow-50 text-yellow-800': line.type === 'modify',
                        'bg-gray-50': line.type === 'context',
                      }
                    )}
                  >
                    <span className="w-8 text-right text-xs text-muted-foreground mr-2">
                      {line.oldLineNumber}
                    </span>
                    <pre className="whitespace-pre-wrap break-all">
                      {line.oldContent || line.content}
                    </pre>
                  </div>
                ))}
            </div>
          ))}
        </div>
        
        <div>
          <div className="bg-green-50 px-4 py-2 text-green-800 font-medium">
            Version {diffData.toVersion.version} (New)
          </div>
          {diffData.hunks.map((hunk, hunkIndex) => (
            <div key={hunkIndex}>
              {hunk.lines
                .filter(line => line.type !== 'remove')
                .map((line, lineIndex) => (
                  <div
                    key={lineIndex}
                    className={cn(
                      'flex items-center px-4 py-1',
                      {
                        'bg-green-50 text-green-800': line.type === 'add',
                        'bg-yellow-50 text-yellow-800': line.type === 'modify',
                        'bg-gray-50': line.type === 'context',
                      }
                    )}
                  >
                    <span className="w-8 text-right text-xs text-muted-foreground mr-2">
                      {line.newLineNumber}
                    </span>
                    <pre className="whitespace-pre-wrap break-all">
                      {line.content}
                    </pre>
                  </div>
                ))}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Card className="w-full h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <GitCompare className="h-5 w-5" />
            Artifact Diff Viewer
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>
        </div>
        
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">From:</span>
            <Select value={selectedFromVersion} onValueChange={setSelectedFromVersion}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Select version" />
              </SelectTrigger>
              <SelectContent>
                {availableVersions.map((version) => (
                  <SelectItem key={version.version.id} value={version.version.id}>
                    v{version.version.version}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">To:</span>
            <Select value={selectedToVersion} onValueChange={setSelectedToVersion}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Select version" />
              </SelectTrigger>
              <SelectContent>
                {availableVersions.map((version) => (
                  <SelectItem key={version.version.id} value={version.version.id}>
                    v{version.version.version}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {diffData && (
            <div className="flex items-center gap-4 ml-auto">
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="outline" className="text-green-600">
                  +{diffData.stats.additions}
                </Badge>
                <Badge variant="outline" className="text-red-600">
                  -{diffData.stats.deletions}
                </Badge>
                <Badge variant="outline" className="text-yellow-600">
                  ~{diffData.stats.modifications}
                </Badge>
              </div>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="mb-4 flex items-center justify-between">
          <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as any)}>
            <TabsList>
              <TabsTrigger value="unified">Unified</TabsTrigger>
              <TabsTrigger value="split">Split</TabsTrigger>
            </TabsList>
          </Tabs>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowWhitespace(!showWhitespace)}
            >
              {showWhitespace ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              Whitespace
            </Button>
            
            <Select
              value={contextLines.toString()}
              onValueChange={(value) => setContextLines(parseInt(value))}
            >
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1</SelectItem>
                <SelectItem value="3">3</SelectItem>
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="10">10</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">context lines</span>
          </div>
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : diffData ? (
          <ScrollArea className="h-[600px] border rounded">
            {viewMode === 'unified' ? renderUnifiedDiff() : renderSplitDiff()}
          </ScrollArea>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            Select versions to compare
          </div>
        )}
      </CardContent>
    </Card>
  );
}
