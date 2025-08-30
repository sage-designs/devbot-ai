import { useState } from 'react';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useEditorStore } from '@/lib/design-editor/store';
import { DesignCanvas } from './design-canvas';
import { PropertiesPanel } from './properties-panel';
import { HierarchyPanel } from './hierarchy-panel';
import { AssetLibrary } from './asset-library';
import { CodeIcon, EyeIcon, LayersIcon, ImageIcon } from '@/components/icons';

interface VisualEditorProps {
  code: string;
  onCodeChange: (code: string) => void;
}

export function VisualEditor({ code, onCodeChange }: VisualEditorProps) {
  const { mode, setMode } = useEditorStore();
  const [leftPanelTab, setLeftPanelTab] = useState('hierarchy');

  return (
    <div className="h-full w-full flex flex-col bg-background">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-2 border-b bg-muted/50">
        <div className="flex items-center gap-2">
          <Button
            variant={mode === 'visual' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMode('visual')}
            className="flex items-center gap-2"
          >
            <EyeIcon size={16} />
            Visual
          </Button>
          <Button
            variant={mode === 'code' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMode('code')}
            className="flex items-center gap-2"
          >
            <CodeIcon size={16} />
            Code
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            Export
          </Button>
          <Button variant="outline" size="sm">
            Preview
          </Button>
        </div>
      </div>

      {/* Main Editor Layout */}
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {/* Left Panel - Hierarchy & Assets */}
          <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
            <div className="h-full border-r bg-muted/30">
              <Tabs value={leftPanelTab} onValueChange={setLeftPanelTab} className="h-full">
                <TabsList className="grid w-full grid-cols-2 m-2">
                  <TabsTrigger value="hierarchy" className="flex items-center gap-2">
                    <LayersIcon size={14} />
                    Layers
                  </TabsTrigger>
                  <TabsTrigger value="assets" className="flex items-center gap-2">
                    <ImageIcon size={14} />
                    Assets
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="hierarchy" className="h-[calc(100%-60px)] m-0">
                  <HierarchyPanel />
                </TabsContent>
                
                <TabsContent value="assets" className="h-[calc(100%-60px)] m-0">
                  <AssetLibrary />
                </TabsContent>
              </Tabs>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Center Panel - Canvas */}
          <ResizablePanel defaultSize={60} minSize={40}>
            <div className="h-full bg-background relative">
              <DesignCanvas code={code} onCodeChange={onCodeChange} />
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Right Panel - Properties */}
          <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
            <div className="h-full border-l bg-muted/30">
              <PropertiesPanel />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
