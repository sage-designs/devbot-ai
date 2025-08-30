import { Artifact } from '@/components/create-artifact';
import { CodeEditor } from '@/components/code-editor';
import {
  CopyIcon,
  PlayIcon,
  RedoIcon,
  UndoIcon,
  MessageIcon,
  LogsIcon,
  ClockRewind,
} from '@/components/icons';
import { toast } from 'sonner';
import { generateUUID } from '@/lib/utils';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { VisualEditor } from '@/components/design-editor/visual-editor';
import { AgenticArtifactToolbar } from '@/components/agentic-artifact-toolbar';

interface PixiMetadata {
  isRunning: boolean;
  error: string | null;
  canvasId: string;
}

interface PixiCanvasProps {
  code: string;
  metadata: PixiMetadata;
  setMetadata: (metadata: PixiMetadata) => void;
}

function PixiCanvas({ code, metadata, setMetadata }: PixiCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const appRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const executePixiCode = async () => {
    if (!canvasRef.current) return;

    setIsLoading(true);
    setMetadata({ ...metadata, error: null, isRunning: true });

    try {
      // Clean up previous instance
      if (appRef.current) {
        appRef.current.destroy(true);
        appRef.current = null;
      }

      // Clear canvas
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }

      // Load PixiJS dynamically
      const PIXI = await import('pixi.js');
      
      // Create a safe execution environment
      const executeCode = new Function('PIXI', 'canvas', 'Application', 'Sprite', 'Graphics', 'Text', 'Container', 'Texture', `
        ${code}
      `);

      // Execute the code with PixiJS context
      await executeCode(
        PIXI,
        canvas,
        PIXI.Application,
        PIXI.Sprite,
        PIXI.Graphics,
        PIXI.Text,
        PIXI.Container,
        PIXI.Texture
      );

      setMetadata({ ...metadata, isRunning: true, error: null });
    } catch (error: any) {
      console.error('PixiJS execution error:', error);
      setMetadata({ 
        ...metadata, 
        isRunning: false, 
        error: error.message || 'Unknown error occurred' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const stopExecution = () => {
    if (appRef.current) {
      appRef.current.destroy(true);
      appRef.current = null;
    }
    setMetadata({ ...metadata, isRunning: false });
  };

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (appRef.current) {
        appRef.current.destroy(true);
      }
    };
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button
          onClick={executePixiCode}
          disabled={isLoading}
          size="sm"
          className="flex items-center gap-2"
        >
          <PlayIcon size={16} />
          {isLoading ? 'Loading...' : 'Run PixiJS'}
        </Button>
        
        {metadata.isRunning && (
          <Button
            onClick={stopExecution}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <ClockRewind size={16} />
            Stop
          </Button>
        )}
      </div>

      <div className="border rounded-lg overflow-hidden">
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          className="w-full max-w-full h-auto bg-black"
          style={{ maxHeight: '600px' }}
        />
      </div>

      {metadata.error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 text-sm font-medium">Error:</p>
          <p className="text-red-700 text-sm mt-1">{metadata.error}</p>
        </div>
      )}
    </div>
  );
}

export const pixiArtifact = new Artifact<'pixi', PixiMetadata>({
  kind: 'pixi',
  description: 'Interactive PixiJS experiences with real-time graphics, animations, and user interactions',
  
  initialize: async ({ setMetadata }) => {
    setMetadata({
      isRunning: false,
      error: null,
      canvasId: generateUUID(),
    });
  },

  onStreamPart: ({ streamPart, setArtifact }) => {
    if (streamPart.type === 'data-pixiDelta') {
      setArtifact((draftArtifact) => ({
        ...draftArtifact,
        content: streamPart.data,
        isVisible:
          draftArtifact.status === 'streaming' &&
          draftArtifact.content.length > 200 &&
          draftArtifact.content.length < 220
            ? true
            : draftArtifact.isVisible,
        status: 'streaming',
      }));
    }
  },

  content: ({ metadata, setMetadata, ...props }) => {
    const [showCode, setShowCode] = useState(true);

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b pb-2">
          <Button
            onClick={() => setShowCode(!showCode)}
            variant="outline"
            size="sm"
          >
            {showCode ? 'Hide Code' : 'Show Code'}
          </Button>
        </div>

        {/* Agentic AI Toolbar */}
        <AgenticArtifactToolbar
          artifactId={props.title} // Using title as ID for now
          artifactKind="pixi"
          artifactTitle={props.title}
          sendMessage={async (message) => {
            // This will be properly connected when integrated with the artifact component
            console.log('Agentic action requested:', message);
            return Promise.resolve();
          }}
          isCurrentVersion={props.isCurrentVersion}
        />

        {showCode && (
          <div className="px-1">
            <CodeEditor {...props} />
          </div>
        )}

        <PixiCanvas
          code={props.content}
          metadata={metadata}
          setMetadata={setMetadata}
        />
      </div>
    );
  },

  actions: [
    {
      icon: <PlayIcon size={18} />,
      label: 'Run',
      description: 'Execute PixiJS code',
      onClick: async ({ content, metadata, setMetadata }) => {
        // This will be handled by the PixiCanvas component
      },
    },
    {
      icon: <UndoIcon size={18} />,
      description: 'View Previous version',
      onClick: ({ handleVersionChange }) => {
        handleVersionChange('prev');
      },
      isDisabled: ({ currentVersionIndex }) => {
        return currentVersionIndex === 0;
      },
    },
    {
      icon: <RedoIcon size={18} />,
      description: 'View Next version',
      onClick: ({ handleVersionChange }) => {
        handleVersionChange('next');
      },
      isDisabled: ({ isCurrentVersion }) => {
        return isCurrentVersion;
      },
    },
    {
      icon: <CopyIcon size={18} />,
      description: 'Copy code to clipboard',
      onClick: ({ content }) => {
        navigator.clipboard.writeText(content);
        toast.success('Copied to clipboard!');
      },
    },
  ],

  toolbar: [
    {
      icon: <MessageIcon />,
      description: 'Add interactivity',
      onClick: ({ sendMessage }) => {
        sendMessage({
          role: 'user',
          parts: [
            {
              type: 'text',
              text: 'Add interactive features like mouse events, animations, or user controls to this PixiJS experience',
            },
          ],
        });
      },
    },
    {
      icon: <LogsIcon />,
      description: 'Optimize performance',
      onClick: ({ sendMessage }) => {
        sendMessage({
          role: 'user',
          parts: [
            {
              type: 'text',
              text: 'Optimize this PixiJS code for better performance and add debugging information',
            },
          ],
        });
      },
    },
  ],
});
