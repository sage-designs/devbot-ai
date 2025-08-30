import { LoaderIcon } from './icons';
import { AgenticArtifactToolbar } from './agentic-artifact-toolbar';
import { AiImageEditingPanel } from './ai-image-editing-panel';
import type { UseChatHelpers } from '@ai-sdk/react';
import type { ChatMessage } from '@/lib/types';
import cn from 'classnames';

interface ImageEditorProps {
  title: string;
  content: string;
  isCurrentVersion: boolean;
  currentVersionIndex: number;
  status: string;
  isInline: boolean;
  documentId?: string;
  sendMessage?: UseChatHelpers<ChatMessage>['sendMessage'];
}

export function ImageEditor({
  title,
  content,
  status,
  isInline,
  documentId,
  sendMessage,
}: ImageEditorProps) {
  return (
    <div className="flex flex-col w-full">
      {/* Agentic Toolbar */}
      {documentId && sendMessage && !isInline && (
        <div className="mb-4">
          <AgenticArtifactToolbar
            artifactId={documentId}
            artifactKind="image"
            artifactTitle={title || "Image Artifact"}
            sendMessage={sendMessage}
            isCurrentVersion={true}
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Image Display */}
        <div className="lg:col-span-2">
          <div
            className={cn('flex flex-row items-center justify-center w-full', {
              'h-[calc(100dvh-120px)]': !isInline,
              'h-[200px]': isInline,
            })}
          >
            {status === 'streaming' ? (
              <div className="flex flex-row gap-4 items-center">
                {!isInline && (
                  <div className="animate-spin">
                    <LoaderIcon />
                  </div>
                )}
                <div>Generating Image...</div>
              </div>
            ) : (
              <picture>
                <img
                  className={cn('w-full h-fit max-w-[800px] rounded-lg shadow-lg', {
                    'p-0 md:p-20': !isInline,
                  })}
                  src={`data:image/png;base64,${content}`}
                  alt={title}
                />
              </picture>
            )}
          </div>
        </div>

        {/* AI Image Editing Panel */}
        {documentId && sendMessage && !isInline && (
          <div className="space-y-4">
            <AiImageEditingPanel
              artifactId={documentId}
              sendMessage={sendMessage}
            />
          </div>
        )}
      </div>
    </div>
  );
}
