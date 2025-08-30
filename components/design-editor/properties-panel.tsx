import { useState } from 'react';
import { useEditorStore } from '@/lib/design-editor/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { EyeIcon, EyeOffIcon } from '@/components/icons';

export function PropertiesPanel() {
  const { selectedIds, objects, updateTransform, updateAppearance, updateObject } = useEditorStore();
  
  const selectedObjects = selectedIds.map(id => objects[id]).filter(Boolean);
  const singleSelection = selectedObjects.length === 1 ? selectedObjects[0] : null;

  if (selectedObjects.length === 0) {
    return (
      <div className="p-4 h-full flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <div className="text-sm">No object selected</div>
          <div className="text-xs mt-1">Select an object to edit its properties</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-3 border-b">
        <h3 className="font-medium">
          {selectedObjects.length === 1 
            ? selectedObjects[0].name 
            : `${selectedObjects.length} objects selected`
          }
        </h3>
        <div className="text-xs text-muted-foreground mt-1">
          {singleSelection?.type}
        </div>
      </div>

      <div className="p-3 space-y-4">
        {/* Transform Properties */}
        <TransformSection 
          objects={selectedObjects}
          onTransformUpdate={updateTransform}
        />

        <Separator />

        {/* Appearance Properties */}
        <AppearanceSection 
          objects={selectedObjects}
          onAppearanceUpdate={updateAppearance}
        />

        {/* Type-specific Properties */}
        {singleSelection && (
          <>
            <Separator />
            <TypeSpecificSection 
              object={singleSelection}
              onObjectUpdate={updateObject}
            />
          </>
        )}
      </div>
    </div>
  );
}

function TransformSection({ objects, onTransformUpdate }: {
  objects: any[];
  onTransformUpdate: (id: string, transform: any) => void;
}) {
  const singleObject = objects.length === 1 ? objects[0] : null;
  const transform = singleObject?.transform;

  const handleChange = (property: string, value: number) => {
    objects.forEach(obj => {
      onTransformUpdate(obj.id, { [property]: value });
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Transform</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Position */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">X</Label>
            <Input
              type="number"
              value={transform?.x ?? ''}
              onChange={(e) => handleChange('x', parseFloat(e.target.value) || 0)}
              className="h-8 text-xs"
            />
          </div>
          <div>
            <Label className="text-xs">Y</Label>
            <Input
              type="number"
              value={transform?.y ?? ''}
              onChange={(e) => handleChange('y', parseFloat(e.target.value) || 0)}
              className="h-8 text-xs"
            />
          </div>
        </div>

        {/* Scale */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Scale X</Label>
            <Input
              type="number"
              step="0.1"
              value={transform?.scaleX ?? ''}
              onChange={(e) => handleChange('scaleX', parseFloat(e.target.value) || 1)}
              className="h-8 text-xs"
            />
          </div>
          <div>
            <Label className="text-xs">Scale Y</Label>
            <Input
              type="number"
              step="0.1"
              value={transform?.scaleY ?? ''}
              onChange={(e) => handleChange('scaleY', parseFloat(e.target.value) || 1)}
              className="h-8 text-xs"
            />
          </div>
        </div>

        {/* Rotation */}
        <div>
          <Label className="text-xs">Rotation</Label>
          <div className="flex items-center gap-2">
            <Slider
              value={[transform?.rotation ? transform.rotation * (180 / Math.PI) : 0]}
              onValueChange={([value]) => handleChange('rotation', value * (Math.PI / 180))}
              max={360}
              min={-360}
              step={1}
              className="flex-1"
            />
            <Input
              type="number"
              value={transform?.rotation ? Math.round(transform.rotation * (180 / Math.PI)) : 0}
              onChange={(e) => handleChange('rotation', (parseFloat(e.target.value) || 0) * (Math.PI / 180))}
              className="h-8 w-16 text-xs"
            />
          </div>
        </div>

        {/* Anchor */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Anchor X</Label>
            <Input
              type="number"
              step="0.1"
              min="0"
              max="1"
              value={transform?.anchorX ?? ''}
              onChange={(e) => handleChange('anchorX', parseFloat(e.target.value) || 0.5)}
              className="h-8 text-xs"
            />
          </div>
          <div>
            <Label className="text-xs">Anchor Y</Label>
            <Input
              type="number"
              step="0.1"
              min="0"
              max="1"
              value={transform?.anchorY ?? ''}
              onChange={(e) => handleChange('anchorY', parseFloat(e.target.value) || 0.5)}
              className="h-8 text-xs"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AppearanceSection({ objects, onAppearanceUpdate }: {
  objects: any[];
  onAppearanceUpdate: (id: string, appearance: any) => void;
}) {
  const singleObject = objects.length === 1 ? objects[0] : null;
  const appearance = singleObject?.appearance;

  const handleChange = (property: string, value: any) => {
    objects.forEach(obj => {
      onAppearanceUpdate(obj.id, { [property]: value });
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Appearance</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Visibility */}
        <div className="flex items-center justify-between">
          <Label className="text-xs">Visible</Label>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleChange('visible', !appearance?.visible)}
            className="h-8 w-8 p-0"
          >
            {appearance?.visible ? <EyeIcon size={14} /> : <EyeOffIcon size={14} />}
          </Button>
        </div>

        {/* Alpha */}
        <div>
          <Label className="text-xs">Opacity</Label>
          <div className="flex items-center gap-2">
            <Slider
              value={[appearance?.alpha ?? 1]}
              onValueChange={([value]) => handleChange('alpha', value)}
              max={1}
              min={0}
              step={0.01}
              className="flex-1"
            />
            <Input
              type="number"
              step="0.01"
              min="0"
              max="1"
              value={appearance?.alpha ?? 1}
              onChange={(e) => handleChange('alpha', parseFloat(e.target.value) || 1)}
              className="h-8 w-16 text-xs"
            />
          </div>
        </div>

        {/* Tint */}
        <div>
          <Label className="text-xs">Tint</Label>
          <div className="flex items-center gap-2">
            <Input
              type="color"
              value={`#${(appearance?.tint ?? 0xffffff).toString(16).padStart(6, '0')}`}
              onChange={(e) => {
                const hex = e.target.value.replace('#', '');
                handleChange('tint', parseInt(hex, 16));
              }}
              className="h-8 w-12 p-1"
            />
            <Input
              type="text"
              value={`#${(appearance?.tint ?? 0xffffff).toString(16).padStart(6, '0').toUpperCase()}`}
              onChange={(e) => {
                const hex = e.target.value.replace('#', '');
                if (/^[0-9A-Fa-f]{6}$/.test(hex)) {
                  handleChange('tint', parseInt(hex, 16));
                }
              }}
              className="h-8 flex-1 text-xs font-mono"
            />
          </div>
        </div>

        {/* Blend Mode */}
        <div>
          <Label className="text-xs">Blend Mode</Label>
          <Select
            value={appearance?.blendMode ?? 'normal'}
            onValueChange={(value) => handleChange('blendMode', value)}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="add">Add</SelectItem>
              <SelectItem value="multiply">Multiply</SelectItem>
              <SelectItem value="screen">Screen</SelectItem>
              <SelectItem value="overlay">Overlay</SelectItem>
              <SelectItem value="darken">Darken</SelectItem>
              <SelectItem value="lighten">Lighten</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}

function TypeSpecificSection({ object, onObjectUpdate }: {
  object: any;
  onObjectUpdate: (id: string, updates: any) => void;
}) {
  const handleTextChange = (property: string, value: any) => {
    onObjectUpdate(object.id, {
      textProperties: {
        ...object.textProperties,
        [property]: value
      }
    });
  };

  const handleGraphicsChange = (property: string, value: any) => {
    onObjectUpdate(object.id, {
      graphicsProperties: {
        ...object.graphicsProperties,
        [property]: value
      }
    });
  };

  if (object.type === 'text') {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Text Properties</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs">Text</Label>
            <Input
              value={object.textProperties?.text ?? ''}
              onChange={(e) => handleTextChange('text', e.target.value)}
              className="h-8 text-xs"
            />
          </div>
          
          <div>
            <Label className="text-xs">Font Family</Label>
            <Select
              value={object.textProperties?.fontFamily ?? 'Arial'}
              onValueChange={(value) => handleTextChange('fontFamily', value)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Arial">Arial</SelectItem>
                <SelectItem value="Helvetica">Helvetica</SelectItem>
                <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                <SelectItem value="Courier New">Courier New</SelectItem>
                <SelectItem value="Georgia">Georgia</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Font Size</Label>
            <Input
              type="number"
              value={object.textProperties?.fontSize ?? 24}
              onChange={(e) => handleTextChange('fontSize', parseInt(e.target.value) || 24)}
              className="h-8 text-xs"
            />
          </div>

          <div>
            <Label className="text-xs">Color</Label>
            <Input
              type="color"
              value={`#${(object.textProperties?.fill ?? 0x000000).toString(16).padStart(6, '0')}`}
              onChange={(e) => {
                const hex = e.target.value.replace('#', '');
                handleTextChange('fill', parseInt(hex, 16));
              }}
              className="h-8 w-full"
            />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (object.type === 'graphics') {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Graphics Properties</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs">Fill Color</Label>
            <Input
              type="color"
              value={`#${(object.graphicsProperties?.fillColor ?? 0xff0000).toString(16).padStart(6, '0')}`}
              onChange={(e) => {
                const hex = e.target.value.replace('#', '');
                handleGraphicsChange('fillColor', parseInt(hex, 16));
              }}
              className="h-8 w-full"
            />
          </div>

          <div>
            <Label className="text-xs">Stroke Color</Label>
            <Input
              type="color"
              value={`#${(object.graphicsProperties?.strokeColor ?? 0x000000).toString(16).padStart(6, '0')}`}
              onChange={(e) => {
                const hex = e.target.value.replace('#', '');
                handleGraphicsChange('strokeColor', parseInt(hex, 16));
              }}
              className="h-8 w-full"
            />
          </div>

          <div>
            <Label className="text-xs">Stroke Width</Label>
            <Input
              type="number"
              value={object.graphicsProperties?.strokeWidth ?? 1}
              onChange={(e) => handleGraphicsChange('strokeWidth', parseInt(e.target.value) || 1)}
              className="h-8 text-xs"
            />
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}
