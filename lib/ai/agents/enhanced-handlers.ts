import { createAgenticDocumentHandler } from './agentic-handler';
import type { DocumentHandler } from '@/lib/artifacts/server';

// Create enhanced agentic handlers for all artifact types
export const enhancedCodeHandler = createAgenticDocumentHandler('code');
export const enhancedTextHandler = createAgenticDocumentHandler('text');
export const enhancedImageHandler = createAgenticDocumentHandler('image');
export const enhancedSheetHandler = createAgenticDocumentHandler('sheet');
export const enhancedPixiHandler = createAgenticDocumentHandler('pixi');

// Export all enhanced handlers
export const enhancedDocumentHandlers: Record<string, DocumentHandler> = {
  code: enhancedCodeHandler,
  text: enhancedTextHandler,
  image: enhancedImageHandler,
  sheet: enhancedSheetHandler,
  pixi: enhancedPixiHandler,
};

// Helper function to get enhanced handler by kind
export function getEnhancedHandler(kind: string): DocumentHandler | undefined {
  return enhancedDocumentHandlers[kind];
}
