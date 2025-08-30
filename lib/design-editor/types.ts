import type * as PIXI from 'pixi.js';

export type EditorMode = 'code' | 'visual';

export type PixiObjectType = 
  | 'sprite' 
  | 'graphics' 
  | 'text' 
  | 'container'
  | 'animatedSprite'
  | 'tilingSprite';

export interface Transform {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  anchorX: number;
  anchorY: number;
}

export interface Appearance {
  alpha: number;
  tint: number;
  blendMode: string;
  visible: boolean;
}

export interface TextProperties {
  text: string;
  fontFamily: string;
  fontSize: number;
  fill: number;
  align: 'left' | 'center' | 'right';
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
}

export interface GraphicsProperties {
  fillColor: number;
  fillAlpha: number;
  strokeColor: number;
  strokeWidth: number;
  strokeAlpha: number;
}

export interface SpriteProperties {
  texture: string;
  width?: number;
  height?: number;
}

export interface SceneObject {
  id: string;
  name: string;
  type: PixiObjectType;
  parentId: string | null;
  children: string[];
  transform: Transform;
  appearance: Appearance;
  textProperties?: TextProperties;
  graphicsProperties?: GraphicsProperties;
  spriteProperties?: SpriteProperties;
  locked: boolean;
  collapsed: boolean;
}

// Extended version with pixiRef for runtime use
export interface SceneObjectWithPixi extends SceneObject {
  pixiRef?: PIXI.Container;
}

export interface HistoryEntry {
  id: string;
  timestamp: number;
  action: string;
  data: any;
  undoData: any;
}

export interface AssetItem {
  id: string;
  name: string;
  type: 'texture' | 'sprite' | 'sound';
  url: string;
  thumbnail?: string;
  metadata?: Record<string, any>;
}

export interface EditorState {
  mode: EditorMode;
  objects: Record<string, SceneObject>;
  rootObjects: string[];
  selectedIds: string[];
  hoveredId: string | null;
  history: HistoryEntry[];
  historyIndex: number;
  assets: AssetItem[];
  canvasSize: { width: number; height: number };
  zoom: number;
  panX: number;
  panY: number;
  showGrid: boolean;
  snapToGrid: boolean;
  gridSize: number;
}

export interface EditorActions {
  // Mode management
  setMode: (mode: EditorMode) => void;
  
  // Object management
  addObject: (object: Omit<SceneObject, 'id'>) => string;
  updateObject: (id: string, updates: Partial<SceneObject>) => void;
  deleteObject: (id: string) => void;
  duplicateObject: (id: string) => string;
  
  // Selection management
  selectObject: (id: string, multi?: boolean) => void;
  selectObjects: (ids: string[]) => void;
  clearSelection: () => void;
  setHoveredObject: (id: string | null) => void;
  
  // Hierarchy management
  moveObject: (id: string, newParentId: string | null, index?: number) => void;
  setObjectParent: (id: string, parentId: string | null) => void;
  
  // Transform operations
  updateTransform: (id: string, transform: Partial<Transform>) => void;
  updateAppearance: (id: string, appearance: Partial<Appearance>) => void;
  
  // History management
  pushHistory: (action: string, data: any, undoData: any) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  
  // Canvas management
  setCanvasSize: (width: number, height: number) => void;
  setZoom: (zoom: number) => void;
  setPan: (x: number, y: number) => void;
  resetView: () => void;
  
  // Grid and snapping
  toggleGrid: () => void;
  toggleSnapToGrid: () => void;
  setGridSize: (size: number) => void;
  
  // Asset management
  addAsset: (asset: AssetItem) => void;
  removeAsset: (id: string) => void;
  
  // Utility
  getObject: (id: string) => SceneObject | undefined;
  getSelectedObjects: () => SceneObject[];
  getObjectChildren: (id: string) => SceneObject[];
  generateCode: () => string;
  importFromCode: (code: string) => void;
}

export type EditorStore = EditorState & EditorActions;
