'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { LoaderIcon } from './icons';
import type { UseChatHelpers } from '@ai-sdk/react';
import type { ChatMessage } from '@/lib/types';

interface AiImageEditingPanelProps {
  artifactId: string;
  sendMessage: UseChatHelpers<ChatMessage>['sendMessage'];
}

interface EditingTool {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'generation' | 'editing' | 'enhancement';
  prompt: string;
}

const EDITING_TOOLS: EditingTool[] = [
  {
    id: 'inpaint',
    name: 'AI Inpainting',
    description: 'Remove or replace objects with AI-generated content',
    icon: '🎨',
    category: 'editing',
    prompt: 'Use AI inpainting to intelligently fill selected areas with contextually appropriate content'
  },
  {
    id: 'outpaint',
    name: 'AI Outpainting',
    description: 'Extend image boundaries with AI-generated content',
    icon: '🖼️',
    category: 'generation',
    prompt: 'Extend the image boundaries using AI outpainting to create a larger, cohesive scene'
  },
  {
    id: 'object-removal',
    name: 'Object Removal',
    description: 'Intelligently remove unwanted objects',
    icon: '🗑️',
    category: 'editing',
    prompt: 'Remove unwanted objects from the image using advanced AI object removal techniques'
  },
  {
    id: 'background-replace',
    name: 'Background Replace',
    description: 'Replace background with AI-generated scenes',
    icon: '🌅',
    category: 'editing',
    prompt: 'Replace the background with a new AI-generated scene while preserving the main subject'
  },
  {
    id: 'style-transfer',
    name: 'Style Transfer',
    description: 'Apply artistic styles to your image',
    icon: '🎭',
    category: 'enhancement',
    prompt: 'Apply artistic style transfer to transform the image with a specific artistic style'
  },
  {
    id: 'super-resolution',
    name: 'Super Resolution',
    description: 'AI upscaling for higher quality images',
    icon: '📈',
    category: 'enhancement',
    prompt: 'Enhance image resolution and quality using AI super-resolution techniques'
  },
  {
    id: 'face-restore',
    name: 'Face Restoration',
    description: 'Enhance and restore facial features',
    icon: '👤',
    category: 'enhancement',
    prompt: 'Restore and enhance facial features using AI face restoration technology'
  },
  {
    id: 'color-correction',
    name: 'Color Correction',
    description: 'AI-powered color and lighting adjustments',
    icon: '🌈',
    category: 'enhancement',
    prompt: 'Perform AI-powered color correction and lighting adjustments to enhance the image'
  }
];

export function AiImageEditingPanel({ artifactId, sendMessage }: AiImageEditingPanelProps) {
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleToolSelect = useCallback((toolId: string) => {
    const tool = EDITING_TOOLS.find(t => t.id === toolId);
    setSelectedTool(selectedTool === toolId ? null : toolId);
    if (tool && selectedTool !== toolId) {
      setCustomPrompt(tool.prompt);
    }
  }, [selectedTool]);

  const handleApplyEdit = useCallback(async () => {
    if (!selectedTool || !customPrompt) return;

    setIsProcessing(true);
    try {
      const tool = EDITING_TOOLS.find(t => t.id === selectedTool);
      const prompt = `${customPrompt}${negativePrompt ? ` (Avoid: ${negativePrompt})` : ''}`;

      await sendMessage({
        role: 'user',
        parts: [
          {
            type: 'text',
            text: `Apply ${tool?.name} to image with prompt: ${prompt}`,
          }
        ]
      });
    } catch (error) {
      console.error('Failed to apply edit:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [selectedTool, customPrompt, negativePrompt, artifactId, sendMessage]);

  const selectedToolData = EDITING_TOOLS.find(tool => tool.id === selectedTool);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <span>🎨</span>
          <span>AI Image Editing</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="generation" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="generation">Generate</TabsTrigger>
            <TabsTrigger value="editing">Edit</TabsTrigger>
            <TabsTrigger value="enhancement">Enhance</TabsTrigger>
          </TabsList>

          {['generation', 'editing', 'enhancement'].map(category => (
            <TabsContent key={category} value={category} className="space-y-2 mt-4">
              {EDITING_TOOLS.filter(tool => tool.category === category).map(tool => (
                <Button
                  key={tool.id}
                  variant={selectedTool === tool.id ? "default" : "outline"}
                  className="w-full justify-start text-left h-auto p-3"
                  onClick={() => handleToolSelect(tool.id)}
                  disabled={isProcessing}
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

        {selectedToolData && (
          <div className="mt-6 space-y-4">
            <div className="flex items-center space-x-2">
              <Badge variant="secondary">
                {selectedToolData.icon} {selectedToolData.name}
              </Badge>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-prompt">Edit Instructions</Label>
                <Textarea
                  id="edit-prompt"
                  placeholder="Describe what you want to achieve..."
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  rows={3}
                  disabled={isProcessing}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="negative-prompt">Avoid (Optional)</Label>
                <Input
                  id="negative-prompt"
                  placeholder="What to avoid in the result..."
                  value={negativePrompt}
                  onChange={(e) => setNegativePrompt(e.target.value)}
                  disabled={isProcessing}
                />
              </div>

              <Button
                onClick={handleApplyEdit}
                disabled={isProcessing || !customPrompt.trim()}
                className="w-full"
              >
                {isProcessing ? (
                  <>
                    <LoaderIcon className="mr-2 h-4 w-4 animate-spin" />
                    Applying {selectedToolData.name}...
                  </>
                ) : (
                  `Apply ${selectedToolData.name}`
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
