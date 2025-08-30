import { useState } from 'react';
import { useEditorStore } from '@/lib/design-editor/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { 
  PlusIcon, 
  ImageIcon, 
  TypeIcon, 
  ShapesIcon, 
  BoxIcon,
  PlayIcon,
  GridIcon
} from '@/components/icons';
import { cn } from '@/lib/utils';

export function AssetLibrary() {
  const { addObject } = useEditorStore();
  const [searchTerm, setSearchTerm] = useState('');

  const createObject = (type: string, properties: any = {}) => {
    const baseObject = {
      type,
      name: `New ${type}`,
      parentId: null,
      children: [],
      transform: {
        x: 100,
        y: 100,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        anchorX: 0.5,
        anchorY: 0.5,
      },
      appearance: {
        alpha: 1,
        tint: 0xffffff,
        blendMode: 'normal',
        visible: true,
      },
      locked: false,
      collapsed: false,
      ...properties,
    };

    addObject(baseObject);
  };

  const basicObjects = [
    {
      type: 'graphics',
      name: 'Rectangle',
      icon: <ShapesIcon size={16} />,
      description: 'Basic rectangle shape',
      properties: {
        graphicsProperties: {
          fillColor: 0x4CAF50,
          fillAlpha: 1,
          strokeColor: 0x2E7D32,
          strokeWidth: 2,
          strokeAlpha: 1,
        }
      }
    },
    {
      type: 'graphics',
      name: 'Circle',
      icon: <div className="w-4 h-4 rounded-full bg-blue-500" />,
      description: 'Basic circle shape',
      properties: {
        name: 'Circle',
        graphicsProperties: {
          fillColor: 0x2196F3,
          fillAlpha: 1,
          strokeColor: 0x1565C0,
          strokeWidth: 2,
          strokeAlpha: 1,
        }
      }
    },
    {
      type: 'text',
      name: 'Text',
      icon: <TypeIcon size={16} />,
      description: 'Text element',
      properties: {
        textProperties: {
          text: 'Hello World',
          fontFamily: 'Arial',
          fontSize: 24,
          fill: 0x000000,
          align: 'left',
          fontWeight: 'normal',
          fontStyle: 'normal',
        }
      }
    },
    {
      type: 'container',
      name: 'Container',
      icon: <BoxIcon size={16} />,
      description: 'Empty container for grouping',
      properties: {}
    },
    {
      type: 'sprite',
      name: 'Sprite',
      icon: <ImageIcon size={16} />,
      description: 'Image sprite',
      properties: {
        spriteProperties: {
          texture: 'placeholder',
          width: 100,
          height: 100,
        }
      }
    },
  ];

  const filteredObjects = basicObjects.filter(obj =>
    obj.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    obj.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b space-y-2">
        <h3 className="font-medium text-sm">Assets</h3>
        <Input
          placeholder="Search assets..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="h-8 text-xs"
        />
      </div>

      <Tabs defaultValue="basic" className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-2 m-2">
          <TabsTrigger value="basic" className="text-xs">Basic</TabsTrigger>
          <TabsTrigger value="custom" className="text-xs">Custom</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="flex-1 m-0">
          <ScrollArea className="h-full">
            <div className="p-2 space-y-2">
              {filteredObjects.map((obj, index) => (
                <AssetCard
                  key={`${obj.type}-${index}`}
                  name={obj.name}
                  description={obj.description}
                  icon={obj.icon}
                  onClick={() => createObject(obj.type, obj.properties)}
                />
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="custom" className="flex-1 m-0">
          <div className="p-4 text-center text-muted-foreground">
            <div className="space-y-2">
              <ImageIcon size={32} className="mx-auto opacity-50" />
              <div className="text-sm">No custom assets</div>
              <div className="text-xs">Upload images and textures</div>
              <Button size="sm" variant="outline" className="mt-2">
                <PlusIcon size={14} className="mr-1" />
                Upload Asset
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AssetCard({ 
  name, 
  description, 
  icon, 
  onClick 
}: {
  name: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <Card 
      className="cursor-pointer hover:bg-accent/50 transition-colors"
      onClick={onClick}
    >
      <CardContent className="p-3">
        <div className="flex items-center gap-2">
          <div className="flex-shrink-0 w-8 h-8 bg-muted rounded flex items-center justify-center">
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{name}</div>
            <div className="text-xs text-muted-foreground truncate">{description}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
