'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AgenticArtifactToolbar } from './agentic-artifact-toolbar';
import { QualityMetricsDisplay } from './quality-metrics-display';
import { LoaderIcon } from './icons';
import type { UseChatHelpers } from '@ai-sdk/react';
import type { ChatMessage } from '@/lib/types';
import cn from 'classnames';

interface AdvancedImageEditorProps {
  title: string;
  content: string;
  isCurrentVersion: boolean;
  currentVersionIndex: number;
  status: string;
  isInline: boolean;
  documentId?: string;
  sendMessage?: UseChatHelpers<ChatMessage>['sendMessage'];
}

interface EditingTool {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'generation' | 'editing' | 'enhancement';
}

interface EditingState {
  selectedTool: string | null;
  brushSize: number;
  prompt: string;
  negativePrompt: string;
  strength: number;
  steps: number;
  guidance: number;
  isProcessing: boolean;
  maskData: string | null;
  selectedRegion: { x: number; y: number; width: number; height: number } | null;
}

const EDITING_TOOLS: EditingTool[] = [
  {
    id: 'inpaint',
    name: 'AI Inpainting',
    description: 'Remove or replace objects with AI-generated content',
    icon: '🎨',
    category: 'editing'
  },
  {
    id: 'outpaint',
    name: 'AI Outpainting',
    description: 'Extend image boundaries with AI-generated content',
    icon: '🖼️',
    category: 'generation'
  },
  {
    id: 'object-removal',
    name: 'Object Removal',
    description: 'Intelligently remove unwanted objects',
    icon: '🗑️',
    category: 'editing'
  },
  {
    id: 'background-replace',
    name: 'Background Replace',
    description: 'Replace background with AI-generated scenes',
    icon: '🌅',
    category: 'editing'
  },
  {
    id: 'style-transfer',
    name: 'Style Transfer',
    description: 'Apply artistic styles to your image',
    icon: '🎭',
    category: 'enhancement'
  },
  {
    id: 'super-resolution',
    name: 'Super Resolution',
    description: 'AI upscaling for higher quality images',
    icon: '📈',
    category: 'enhancement'
  },
  {
    id: 'face-restore',
    name: 'Face Restoration',
    description: 'Enhance and restore facial features',
    icon: '👤',
    category: 'enhancement'
  },
  {
    id: 'color-correction',
    name: 'Color Correction',
    description: 'AI-powered color and lighting adjustments',
    icon: '🌈',
    category: 'enhancement'
  }
];

export function AdvancedImageEditor({
  title,
  content,
  status,
  isInline,
  documentId,
  sendMessage,
}: AdvancedImageEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [editingState, setEditingState] = useState<EditingState>({
    selectedTool: null,
    brushSize: 20,
    prompt: '',
    negativePrompt: '',
    strength: 0.8,
    steps: 20,
    guidance: 7.5,
    isProcessing: false,
    maskData: null,
    selectedRegion: null,
  });

  const [isDrawing, setIsDrawing] = useState(false);
  const [qualityMetrics, setQualityMetrics] = useState(null);

  // Initialize canvas for mask drawing
  useEffect(() => {
    if (canvasRef.current && imageRef.current && content) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const img = imageRef.current;

      img.onload = () => {
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        ctx?.clearRect(0, 0, canvas.width, canvas.height);
      };
    }
  }, [content]);

  const handleToolSelect = useCallback((toolId: string) => {
    setEditingState(prev => ({
      ...prev,
      selectedTool: prev.selectedTool === toolId ? null : toolId,
      maskData: null,
      selectedRegion: null,
    }));
  }, []);

  const handleCanvasMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!editingState.selectedTool) return;
    
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.arc(x, y, editingState.brushSize / 2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
      ctx.fill();
    }
  }, [editingState.selectedTool, editingState.brushSize]);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !editingState.selectedTool) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.arc(x, y, editingState.brushSize / 2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
      ctx.fill();
    }
  }, [isDrawing, editingState.selectedTool, editingState.brushSize]);

  const handleCanvasMouseUp = useCallback(() => {
    setIsDrawing(false);
  }, []);

  const handleApplyEdit = useCallback(async () => {
    if (!editingState.selectedTool || !sendMessage || !documentId) return;

    setEditingState(prev => ({ ...prev, isProcessing: true }));

    try {
      const canvas = canvasRef.current;
      const maskData = canvas?.toDataURL();

      const editRequest = {
        type: 'ai-image-edit',
        toolId: editingState.selectedTool,
        artifactId: documentId,
        prompt: editingState.prompt,
        negativePrompt: editingState.negativePrompt,
        strength: editingState.strength,
        steps: editingState.steps,
        guidance: editingState.guidance,
        maskData,
        selectedRegion: editingState.selectedRegion,
      };

      await sendMessage({
        role: 'user',
        parts: [
          {
            type: 'text',
            text: `Apply ${editingState.selectedTool} edit to image artifact ${documentId}`,
          }
        ]
      });
    } catch (error) {
      console.error('Failed to apply edit:', error);
    } finally {
      setEditingState(prev => ({ ...prev, isProcessing: false }));
    }
  }, [editingState, sendMessage, documentId]);

  const handleClearMask = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
    setEditingState(prev => ({ ...prev, maskData: null, selectedRegion: null }));
  }, []);

  const selectedTool = EDITING_TOOLS.find(tool => tool.id === editingState.selectedTool);

  if (status === 'streaming') {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="animate-spin">
          <LoaderIcon size={32} />
        </div>
        <div className="text-lg font-medium">Generating Enhanced Image...</div>
        <div className="text-sm text-muted-foreground">AI is processing your request</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full space-y-6">
      {/* Agentic Toolbar */}
      {documentId && sendMessage && !isInline && (
        <AgenticArtifactToolbar
          artifactId={documentId}
          artifactKind="image"
          artifactTitle={title || "Advanced Image Editor"}
          sendMessage={sendMessage}
          isCurrentVersion={true}
        />
      )}

      {/* Quality Metrics */}
      {qualityMetrics && (
        <QualityMetricsDisplay metrics={qualityMetrics} />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Image Canvas */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{title}</span>
                {selectedTool && (
                  <Badge variant="secondary">
                    {selectedTool.icon} {selectedTool.name}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <img
                  ref={imageRef}
                  src={`data:image/png;base64,${content}`}
                  alt={title}
                  className="w-full h-auto rounded-lg shadow-lg"
                />
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 w-full h-full cursor-crosshair"
                  style={{ 
                    display: selectedTool ? 'block' : 'none',
                    pointerEvents: selectedTool ? 'auto' : 'none'
                  }}
                  onMouseDown={handleCanvasMouseDown}
                  onMouseMove={handleCanvasMouseMove}
                  onMouseUp={handleCanvasMouseUp}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Editing Tools Panel */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>AI Editing Tools</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="generation" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="generation">Generate</TabsTrigger>
                  <TabsTrigger value="editing">Edit</TabsTrigger>
                  <TabsTrigger value="enhancement">Enhance</TabsTrigger>
                </TabsList>

                {['generation', 'editing', 'enhancement'].map(category => (
                  <TabsContent key={category} value={category} className="space-y-2">
                    {EDITING_TOOLS.filter(tool => tool.category === category).map(tool => (
                      <Button
                        key={tool.id}
                        variant={editingState.selectedTool === tool.id ? "default" : "outline"}
                        className="w-full justify-start text-left h-auto p-3"
                        onClick={() => handleToolSelect(tool.id)}
                      >
                        <div className="flex items-start space-x-3">
                          <span className="text-lg">{tool.icon}</span>
                          <div>
                            <div className="font-medium">{tool.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {tool.description}
                            </div>
                          </div>
                        </div>
                      </Button>
                    ))}
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>

          {/* Tool Settings */}
          {selectedTool && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <span>{selectedTool.icon}</span>
                  <span>{selectedTool.name} Settings</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Prompt Input */}
                <div className="space-y-2">
                  <Label htmlFor="prompt">Prompt</Label>
                  <Textarea
                    id="prompt"
                    placeholder="Describe what you want to generate or edit..."
                    value={editingState.prompt}
                    onChange={(e) => setEditingState(prev => ({ ...prev, prompt: e.target.value }))}
                    rows={3}
                  />
                </div>

                {/* Negative Prompt */}
                <div className="space-y-2">
                  <Label htmlFor="negative-prompt">Negative Prompt</Label>
                  <Input
                    id="negative-prompt"
                    placeholder="What to avoid..."
                    value={editingState.negativePrompt}
                    onChange={(e) => setEditingState(prev => ({ ...prev, negativePrompt: e.target.value }))}
                  />
                </div>

                <Separator />

                {/* Advanced Settings */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Brush Size: {editingState.brushSize}px</Label>
                    <Slider
                      value={[editingState.brushSize]}
                      onValueChange={([value]) => setEditingState(prev => ({ ...prev, brushSize: value }))}
                      min={5}
                      max={100}
                      step={5}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Strength: {editingState.strength}</Label>
                    <Slider
                      value={[editingState.strength]}
                      onValueChange={([value]) => setEditingState(prev => ({ ...prev, strength: value }))}
                      min={0.1}
                      max={1.0}
                      step={0.1}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Steps: {editingState.steps}</Label>
                    <Slider
                      value={[editingState.steps]}
                      onValueChange={([value]) => setEditingState(prev => ({ ...prev, steps: value }))}
                      min={10}
                      max={50}
                      step={5}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Guidance: {editingState.guidance}</Label>
                    <Slider
                      value={[editingState.guidance]}
                      onValueChange={([value]) => setEditingState(prev => ({ ...prev, guidance: value }))}
                      min={1}
                      max={20}
                      step={0.5}
                    />
                  </div>
                </div>

                <Separator />

                {/* Action Buttons */}
                <div className="flex space-x-2">
                  <Button
                    onClick={handleApplyEdit}
                    disabled={editingState.isProcessing || !editingState.prompt}
                    className="flex-1"
                  >
                    {editingState.isProcessing ? (
                      <>
                        <LoaderIcon className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      `Apply ${selectedTool.name}`
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleClearMask}
                    disabled={editingState.isProcessing}
                  >
                    Clear
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
