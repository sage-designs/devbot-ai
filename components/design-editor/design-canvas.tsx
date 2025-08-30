import { useRef, useEffect, useState, useCallback } from 'react';
import { useEditorStore } from '@/lib/design-editor/store';
import { Button } from '@/components/ui/button';
import { PlusIcon, MinusIcon, MoreIcon, ZoomIn, ZoomOut } from '@/components/icons';
import type * as PIXI from 'pixi.js';

interface DesignCanvasProps {
  code: string;
  onCodeChange: (code: string) => void;
}

export function DesignCanvas({ code, onCodeChange }: DesignCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    mode,
    objects,
    selectedIds,
    hoveredId,
    zoom,
    panX,
    panY,
    showGrid,
    canvasSize,
    selectObject,
    setHoveredObject,
    updateTransform,
    setZoom,
    setPan,
    resetView,
  } = useEditorStore();

  // Initialize PixiJS application
  const initializePixi = useCallback(async () => {
    if (!canvasRef.current) return;

    try {
      setIsLoading(true);
      setError(null);

      // Clean up previous instance
      if (appRef.current) {
        appRef.current.destroy(true);
        appRef.current = null;
      }

      // Load PixiJS dynamically
      const PIXI = await import('pixi.js');
      
      // Create new application
      const app = new PIXI.Application();
      await app.init({
        canvas: canvasRef.current,
        width: canvasSize.width,
        height: canvasSize.height,
        backgroundColor: 0xf8f9fa,
        antialias: true,
      });

      appRef.current = app;

      // Add grid if enabled
      if (showGrid) {
        drawGrid(app);
      }

      // Set up interaction
      app.stage.eventMode = 'static';
      app.stage.hitArea = new PIXI.Rectangle(0, 0, canvasSize.width, canvasSize.height);

      // Canvas click handler (for deselection)
      app.stage.on('pointerdown', (event) => {
        if (event.target === app.stage) {
          selectObject('', false); // Clear selection
        }
      });

      // Apply zoom and pan
      app.stage.scale.set(zoom);
      app.stage.position.set(panX, panY);

    } catch (err: any) {
      setError(err.message || 'Failed to initialize PixiJS');
    } finally {
      setIsLoading(false);
    }
  }, [canvasSize, showGrid, zoom, panX, panY, selectObject]);

  // Draw grid helper
  const drawGrid = (app: PIXI.Application) => {
    const PIXI = require('pixi.js');
    const grid = new PIXI.Graphics();
    const gridSize = 20;
    
    grid.lineStyle(1, 0xe0e0e0, 0.5);
    
    for (let x = 0; x <= canvasSize.width; x += gridSize) {
      grid.moveTo(x, 0);
      grid.lineTo(x, canvasSize.height);
    }
    
    for (let y = 0; y <= canvasSize.height; y += gridSize) {
      grid.moveTo(0, y);
      grid.lineTo(canvasSize.width, y);
    }
    
    app.stage.addChild(grid);
  };

  // Render scene objects
  const renderObjects = useCallback(async () => {
    if (!appRef.current || mode !== 'visual') return;

    const PIXI = await import('pixi.js');
    const app = appRef.current;

    // Clear existing objects (except grid)
    app.stage.children.forEach(child => {
      if (child.name !== 'grid') {
        app.stage.removeChild(child);
      }
    });

    // Render each object
    Object.values(objects).forEach(obj => {
      if (!obj.parentId) { // Only render root objects, children will be handled recursively
        const pixiObject = createPixiObject(obj, PIXI);
        if (pixiObject) {
          app.stage.addChild(pixiObject);
          setupObjectInteraction(pixiObject, obj.id);
        }
      }
    });
  }, [objects, mode]);

  // Create PixiJS object from scene object
  const createPixiObject = (obj: any, PIXI: any): PIXI.Container | null => {
    let pixiObj: PIXI.Container | null = null;

    switch (obj.type) {
      case 'graphics':
        pixiObj = new PIXI.Graphics();
        if (obj.graphicsProperties) {
          const graphics = pixiObj as any;
          graphics.rect(0, 0, 100, 100);
          graphics.fill(obj.graphicsProperties.fillColor || 0xff0000);
        }
        break;

      case 'text':
        pixiObj = new PIXI.Text({
          text: obj.textProperties?.text || 'Text',
          style: {
            fontFamily: obj.textProperties?.fontFamily || 'Arial',
            fontSize: obj.textProperties?.fontSize || 24,
            fill: obj.textProperties?.fill || 0x000000,
          }
        });
        break;

      case 'container':
        pixiObj = new PIXI.Container();
        break;

      case 'sprite':
        // For now, create a colored rectangle as placeholder
        pixiObj = new PIXI.Graphics();
        (pixiObj as any).rect(0, 0, 100, 100);
        (pixiObj as any).fill(0x4CAF50);
        break;
    }

    if (pixiObj) {
      // Apply transform
      pixiObj.x = obj.transform.x;
      pixiObj.y = obj.transform.y;
      pixiObj.scale.set(obj.transform.scaleX, obj.transform.scaleY);
      pixiObj.rotation = obj.transform.rotation;
      
      // Apply appearance
      pixiObj.alpha = obj.appearance.alpha;
      pixiObj.visible = obj.appearance.visible;
      if ('tint' in pixiObj) {
        (pixiObj as any).tint = obj.appearance.tint;
      }

      // Set name for identification
      pixiObj.name = obj.id;

      // Add selection visual feedback
      if (selectedIds.includes(obj.id)) {
        addSelectionOutline(pixiObj, PIXI);
      }
    }

    return pixiObj;
  };

  // Add selection outline
  const addSelectionOutline = (pixiObj: PIXI.Container, PIXI: any) => {
    const bounds = pixiObj.getBounds();
    const outline = new PIXI.Graphics();
    outline.rect(bounds.x - pixiObj.x, bounds.y - pixiObj.y, bounds.width, bounds.height);
    outline.stroke({ width: 2, color: 0x007acc });
    outline.name = 'selection-outline';
    pixiObj.addChild(outline);
  };

  // Setup object interaction
  const setupObjectInteraction = (pixiObj: PIXI.Container, objectId: string) => {
    pixiObj.eventMode = 'static';
    pixiObj.cursor = 'pointer';

    pixiObj.on('pointerdown', (event) => {
      event.stopPropagation();
      const multi = event.shiftKey || event.ctrlKey || event.metaKey;
      selectObject(objectId, multi);
    });

    pixiObj.on('pointerover', () => {
      setHoveredObject(objectId);
    });

    pixiObj.on('pointerout', () => {
      setHoveredObject(null);
    });
  };

  // Zoom controls
  const handleZoomIn = () => setZoom(zoom * 1.2);
  const handleZoomOut = () => setZoom(zoom / 1.2);

  // Initialize PixiJS on mount and when dependencies change
  useEffect(() => {
    initializePixi();
  }, [initializePixi]);

  // Re-render objects when they change
  useEffect(() => {
    renderObjects();
  }, [renderObjects]);

  // Handle canvas resize
  useEffect(() => {
    if (appRef.current) {
      appRef.current.renderer.resize(canvasSize.width, canvasSize.height);
    }
  }, [canvasSize]);

  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* Canvas Controls */}
      <div className="absolute top-4 left-4 z-10 flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleZoomIn}
          className="bg-background/80 backdrop-blur-sm"
        >
          <ZoomIn size={16} />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleZoomOut}
          className="bg-background/80 backdrop-blur-sm"
        >
          <ZoomOut size={16} />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={resetView}
          className="bg-background/80 backdrop-blur-sm"
        >
          <MoreIcon size={16} />
        </Button>
        <div className="px-2 py-1 bg-background/80 backdrop-blur-sm rounded text-sm">
          {Math.round(zoom * 100)}%
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
          <div className="text-sm">Loading PixiJS...</div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="absolute top-4 right-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm max-w-sm">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        className="block max-w-full max-h-full"
        style={{
          imageRendering: 'pixelated',
        }}
      />
    </div>
  );
}
