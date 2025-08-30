import { createHash } from 'crypto';
import type { ArtifactVersion } from '@/lib/db/schema-artifacts';

export interface DiffResult {
  additions: string[];
  deletions: string[];
  modifications: Array<{
    line: number;
    old: string;
    new: string;
  }>;
  stats: {
    addedLines: number;
    deletedLines: number;
    modifiedLines: number;
  };
}

export interface MergeConflict {
  line: number;
  current: string;
  incoming: string;
  base?: string;
}

export interface MergeResult {
  success: boolean;
  content?: string;
  conflicts?: MergeConflict[];
}

/**
 * Generate a diff between two content versions
 */
export function generateDiff(oldContent: string, newContent: string): DiffResult {
  const oldLines = oldContent.split('\n');
  const newLines = newContent.split('\n');
  
  const additions: string[] = [];
  const deletions: string[] = [];
  const modifications: Array<{ line: number; old: string; new: string }> = [];
  
  // Simple line-by-line diff algorithm
  const maxLines = Math.max(oldLines.length, newLines.length);
  
  for (let i = 0; i < maxLines; i++) {
    const oldLine = oldLines[i];
    const newLine = newLines[i];
    
    if (oldLine === undefined && newLine !== undefined) {
      additions.push(newLine);
    } else if (oldLine !== undefined && newLine === undefined) {
      deletions.push(oldLine);
    } else if (oldLine !== newLine) {
      modifications.push({
        line: i + 1,
        old: oldLine,
        new: newLine,
      });
    }
  }
  
  return {
    additions,
    deletions,
    modifications,
    stats: {
      addedLines: additions.length,
      deletedLines: deletions.length,
      modifiedLines: modifications.length,
    },
  };
}

/**
 * Generate a unified diff format string
 */
export function generateUnifiedDiff(
  oldContent: string,
  newContent: string,
  oldLabel = 'a/file',
  newLabel = 'b/file'
): string {
  const diff = generateDiff(oldContent, newContent);
  const lines: string[] = [];
  
  lines.push(`--- ${oldLabel}`);
  lines.push(`+++ ${newLabel}`);
  
  const oldLines = oldContent.split('\n');
  const newLines = newContent.split('\n');
  
  // Generate hunks
  let oldLineNum = 1;
  let newLineNum = 1;
  
  for (const mod of diff.modifications) {
    lines.push(`@@ -${oldLineNum},1 +${newLineNum},1 @@`);
    lines.push(`-${oldLines[mod.line - 1]}`);
    lines.push(`+${newLines[mod.line - 1]}`);
    oldLineNum++;
    newLineNum++;
  }
  
  for (const addition of diff.additions) {
    lines.push(`@@ -0,0 +${newLineNum},1 @@`);
    lines.push(`+${addition}`);
    newLineNum++;
  }
  
  for (const deletion of diff.deletions) {
    lines.push(`@@ -${oldLineNum},1 +0,0 @@`);
    lines.push(`-${deletion}`);
    oldLineNum++;
  }
  
  return lines.join('\n');
}

/**
 * Attempt to merge two content versions with a common base
 */
export function mergeContent(
  baseContent: string,
  currentContent: string,
  incomingContent: string
): MergeResult {
  const baseLines = baseContent.split('\n');
  const currentLines = currentContent.split('\n');
  const incomingLines = incomingContent.split('\n');
  
  const conflicts: MergeConflict[] = [];
  const mergedLines: string[] = [];
  
  const maxLines = Math.max(baseLines.length, currentLines.length, incomingLines.length);
  
  for (let i = 0; i < maxLines; i++) {
    const baseLine = baseLines[i];
    const currentLine = currentLines[i];
    const incomingLine = incomingLines[i];
    
    // No conflict if lines are the same
    if (currentLine === incomingLine) {
      mergedLines.push(currentLine || '');
      continue;
    }
    
    // No conflict if only one side changed from base
    if (currentLine === baseLine && incomingLine !== baseLine) {
      mergedLines.push(incomingLine || '');
      continue;
    }
    
    if (incomingLine === baseLine && currentLine !== baseLine) {
      mergedLines.push(currentLine || '');
      continue;
    }
    
    // Conflict: both sides changed differently
    conflicts.push({
      line: i + 1,
      current: currentLine || '',
      incoming: incomingLine || '',
      base: baseLine,
    });
    
    // Add conflict markers
    mergedLines.push('<<<<<<< current');
    mergedLines.push(currentLine || '');
    mergedLines.push('=======');
    mergedLines.push(incomingLine || '');
    mergedLines.push('>>>>>>> incoming');
  }
  
  return {
    success: conflicts.length === 0,
    content: mergedLines.join('\n'),
    conflicts: conflicts.length > 0 ? conflicts : undefined,
  };
}

/**
 * Create a patch that can be applied to transform one content to another
 */
export function createPatch(oldContent: string, newContent: string): string {
  return generateUnifiedDiff(oldContent, newContent);
}

/**
 * Apply a patch to content
 */
export function applyPatch(content: string, patch: string): string {
  // Simple patch application - in production, use a proper patch library
  const lines = content.split('\n');
  const patchLines = patch.split('\n');
  
  let currentLine = 0;
  
  for (const patchLine of patchLines) {
    if (patchLine.startsWith('-')) {
      // Remove line
      const lineToRemove = patchLine.substring(1);
      const index = lines.indexOf(lineToRemove, currentLine);
      if (index !== -1) {
        lines.splice(index, 1);
      }
    } else if (patchLine.startsWith('+')) {
      // Add line
      const lineToAdd = patchLine.substring(1);
      lines.splice(currentLine, 0, lineToAdd);
      currentLine++;
    } else if (!patchLine.startsWith('@') && !patchLine.startsWith('---') && !patchLine.startsWith('+++')) {
      // Context line
      currentLine++;
    }
  }
  
  return lines.join('\n');
}

/**
 * Calculate similarity between two content versions (0-1 scale)
 */
export function calculateSimilarity(content1: string, content2: string): number {
  const lines1 = content1.split('\n');
  const lines2 = content2.split('\n');
  
  const totalLines = Math.max(lines1.length, lines2.length);
  if (totalLines === 0) return 1;
  
  let matchingLines = 0;
  const minLines = Math.min(lines1.length, lines2.length);
  
  for (let i = 0; i < minLines; i++) {
    if (lines1[i] === lines2[i]) {
      matchingLines++;
    }
  }
  
  return matchingLines / totalLines;
}

/**
 * Generate a content signature for deduplication
 */
export function generateContentSignature(content: string): string {
  // Normalize content by removing extra whitespace and empty lines
  const normalized = content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join('\n');
  
  return createHash('sha256').update(normalized).digest('hex');
}

/**
 * Check if content has significant changes (not just whitespace/formatting)
 */
export function hasSignificantChanges(oldContent: string, newContent: string): boolean {
  const oldSignature = generateContentSignature(oldContent);
  const newSignature = generateContentSignature(newContent);
  return oldSignature !== newSignature;
}

/**
 * Extract metadata from content (for different artifact types)
 */
export function extractContentMetadata(content: string, kind: string): Record<string, any> {
  const metadata: Record<string, any> = {
    lineCount: content.split('\n').length,
    charCount: content.length,
    wordCount: content.split(/\s+/).filter(word => word.length > 0).length,
  };
  
  switch (kind) {
    case 'code':
      // Extract programming language, imports, functions, etc.
      metadata.language = detectLanguage(content);
      metadata.functions = extractFunctions(content);
      metadata.imports = extractImports(content);
      break;
      
    case 'text':
      // Extract headings, links, etc.
      metadata.headings = extractMarkdownHeadings(content);
      metadata.links = extractLinks(content);
      break;
      
    case 'image':
      // Extract image metadata if it's base64 or URL
      metadata.format = detectImageFormat(content);
      break;
  }
  
  return metadata;
}

function detectLanguage(code: string): string {
  // Simple language detection based on common patterns
  if (code.includes('import React') || code.includes('export default')) return 'javascript';
  if (code.includes('def ') && code.includes(':')) return 'python';
  if (code.includes('function') && code.includes('{')) return 'javascript';
  if (code.includes('class') && code.includes('public')) return 'java';
  return 'unknown';
}

function extractFunctions(code: string): string[] {
  const functions: string[] = [];
  const lines = code.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('function ') || trimmed.startsWith('def ') || 
        trimmed.includes(') => ') || trimmed.includes('): ')) {
      functions.push(trimmed);
    }
  }
  
  return functions;
}

function extractImports(code: string): string[] {
  const imports: string[] = [];
  const lines = code.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('import ') || trimmed.startsWith('from ') || 
        trimmed.startsWith('#include') || trimmed.startsWith('using ')) {
      imports.push(trimmed);
    }
  }
  
  return imports;
}

function extractMarkdownHeadings(text: string): string[] {
  const headings: string[] = [];
  const lines = text.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#')) {
      headings.push(trimmed);
    }
  }
  
  return headings;
}

function extractLinks(text: string): string[] {
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const links: string[] = [];
  let match;
  
  while ((match = linkRegex.exec(text)) !== null) {
    links.push(match[0]);
  }
  
  return links;
}

function detectImageFormat(content: string): string {
  if (content.startsWith('data:image/')) {
    const format = content.split(';')[0].split('/')[1];
    return format;
  }
  if (content.startsWith('http')) {
    const ext = content.split('.').pop()?.toLowerCase();
    return ext || 'unknown';
  }
  return 'unknown';
}
