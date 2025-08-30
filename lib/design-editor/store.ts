import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { nanoid } from 'nanoid';
import type { EditorStore, SceneObject, Transform, Appearance, HistoryEntry } from './types';

const DEFAULT_TRANSFORM: Transform = {
  x: 0,
  y: 0,
  scaleX: 1,
  scaleY: 1,
  rotation: 0,
  anchorX: 0.5,
  anchorY: 0.5,
};

const DEFAULT_APPEARANCE: Appearance = {
  alpha: 1,
  tint: 0xffffff,
  blendMode: 'normal',
  visible: true,
};

export const useEditorStore = create<EditorStore>()(
  immer((set, get) => ({
    // Initial state
    mode: 'visual',
    objects: {},
    rootObjects: [],
    selectedIds: [],
    hoveredId: null,
    history: [],
    historyIndex: -1,
    assets: [],
    canvasSize: { width: 800, height: 600 },
    zoom: 1,
    panX: 0,
    panY: 0,
    showGrid: false,
    snapToGrid: false,
    gridSize: 20,

    // Mode management
    setMode: (mode) => set((state) => {
      state.mode = mode;
    }),

    // Object management
    addObject: (objectData) => {
      const id = nanoid();
      const object: SceneObject = {
        id,
        name: objectData.name || `${objectData.type}_${id.slice(0, 6)}`,
        type: objectData.type,
        parentId: objectData.parentId || null,
        children: [],
        transform: { ...DEFAULT_TRANSFORM, ...objectData.transform },
        appearance: { ...DEFAULT_APPEARANCE, ...objectData.appearance },
        textProperties: objectData.textProperties,
        graphicsProperties: objectData.graphicsProperties,
        spriteProperties: objectData.spriteProperties,
        locked: false,
        collapsed: false,
      };

      set((state) => {
        state.objects[id] = object;
        
        if (object.parentId) {
          const parent = state.objects[object.parentId];
          if (parent) {
            parent.children.push(id);
          }
        } else {
          state.rootObjects.push(id);
        }
        
        // Auto-select new object
        state.selectedIds = [id];
      });

      return id;
    },

    updateObject: (id, updates) => set((state) => {
      const object = state.objects[id];
      if (object) {
        Object.assign(object, updates);
      }
    }),

    deleteObject: (id) => set((state) => {
      const object = state.objects[id];
      if (!object) return;

      // Remove from parent's children or root objects
      if (object.parentId) {
        const parent = state.objects[object.parentId];
        if (parent) {
          parent.children = parent.children.filter(childId => childId !== id);
        }
      } else {
        state.rootObjects = state.rootObjects.filter(objId => objId !== id);
      }

      // Recursively delete children
      const deleteRecursive = (objId: string) => {
        const obj = state.objects[objId];
        if (obj) {
          obj.children.forEach(deleteRecursive);
          delete state.objects[objId];
        }
      };
      deleteRecursive(id);

      // Remove from selection
      state.selectedIds = state.selectedIds.filter(selectedId => selectedId !== id);
    }),

    duplicateObject: (id) => {
      const state = get();
      const object = state.objects[id];
      if (!object) return '';

      const newId = nanoid();
      const duplicatedObject: SceneObject = {
        ...object,
        id: newId,
        name: `${object.name}_copy`,
        children: [],
        transform: {
          ...object.transform,
          x: object.transform.x + 20,
          y: object.transform.y + 20,
        },
      };

      set((draft) => {
        draft.objects[newId] = duplicatedObject;
        
        if (duplicatedObject.parentId) {
          const parent = draft.objects[duplicatedObject.parentId];
          if (parent) {
            parent.children.push(newId);
          }
        } else {
          draft.rootObjects.push(newId);
        }
        
        draft.selectedIds = [newId];
      });

      return newId;
    },

    // Selection management
    selectObject: (id, multi = false) => set((state) => {
      if (multi) {
        if (state.selectedIds.includes(id)) {
          state.selectedIds = state.selectedIds.filter(selectedId => selectedId !== id);
        } else {
          state.selectedIds.push(id);
        }
      } else {
        state.selectedIds = [id];
      }
    }),

    selectObjects: (ids) => set((state) => {
      state.selectedIds = ids;
    }),

    clearSelection: () => set((state) => {
      state.selectedIds = [];
    }),

    setHoveredObject: (id) => set((state) => {
      state.hoveredId = id;
    }),

    // Hierarchy management
    moveObject: (id, newParentId, index) => set((state) => {
      const object = state.objects[id];
      if (!object) return;

      // Remove from current parent
      if (object.parentId) {
        const currentParent = state.objects[object.parentId];
        if (currentParent) {
          currentParent.children = currentParent.children.filter(childId => childId !== id);
        }
      } else {
        state.rootObjects = state.rootObjects.filter(objId => objId !== id);
      }

      // Add to new parent
      object.parentId = newParentId;
      if (newParentId) {
        const newParent = state.objects[newParentId];
        if (newParent) {
          if (typeof index === 'number') {
            newParent.children.splice(index, 0, id);
          } else {
            newParent.children.push(id);
          }
        }
      } else {
        if (typeof index === 'number') {
          state.rootObjects.splice(index, 0, id);
        } else {
          state.rootObjects.push(id);
        }
      }
    }),

    setObjectParent: (id, parentId) => set((state) => {
      const object = state.objects[id];
      if (object) {
        object.parentId = parentId;
      }
    }),

    // Transform operations
    updateTransform: (id, transform) => set((state) => {
      const object = state.objects[id];
      if (object) {
        Object.assign(object.transform, transform);
      }
    }),

    updateAppearance: (id, appearance) => set((state) => {
      const object = state.objects[id];
      if (object) {
        Object.assign(object.appearance, appearance);
      }
    }),

    // History management
    pushHistory: (action, data, undoData) => set((state) => {
      const entry: HistoryEntry = {
        id: nanoid(),
        timestamp: Date.now(),
        action,
        data,
        undoData,
      };

      // Remove any history after current index
      state.history = state.history.slice(0, state.historyIndex + 1);
      state.history.push(entry);
      state.historyIndex = state.history.length - 1;

      // Limit history size
      if (state.history.length > 50) {
        state.history = state.history.slice(-50);
        state.historyIndex = state.history.length - 1;
      }
    }),

    undo: () => {
      const state = get();
      if (!state.canUndo()) return;

      const entry = state.history[state.historyIndex];
      // Apply undo data (implementation depends on action type)
      
      set((draft) => {
        draft.historyIndex--;
      });
    },

    redo: () => {
      const state = get();
      if (!state.canRedo()) return;

      const entry = state.history[state.historyIndex + 1];
      // Apply redo data (implementation depends on action type)
      
      set((draft) => {
        draft.historyIndex++;
      });
    },

    canUndo: () => {
      const state = get();
      return state.historyIndex >= 0;
    },

    canRedo: () => {
      const state = get();
      return state.historyIndex < state.history.length - 1;
    },

    // Canvas management
    setCanvasSize: (width, height) => set((state) => {
      state.canvasSize = { width, height };
    }),

    setZoom: (zoom) => set((state) => {
      state.zoom = Math.max(0.1, Math.min(5, zoom));
    }),

    setPan: (x, y) => set((state) => {
      state.panX = x;
      state.panY = y;
    }),

    resetView: () => set((state) => {
      state.zoom = 1;
      state.panX = 0;
      state.panY = 0;
    }),

    // Grid and snapping
    toggleGrid: () => set((state) => {
      state.showGrid = !state.showGrid;
    }),

    toggleSnapToGrid: () => set((state) => {
      state.snapToGrid = !state.snapToGrid;
    }),

    setGridSize: (size) => set((state) => {
      state.gridSize = Math.max(5, Math.min(100, size));
    }),

    // Asset management
    addAsset: (asset) => set((state) => {
      state.assets.push(asset);
    }),

    removeAsset: (id) => set((state) => {
      state.assets = state.assets.filter(asset => asset.id !== id);
    }),

    // Utility functions
    getObject: (id) => {
      const state = get();
      return state.objects[id];
    },

    getSelectedObjects: () => {
      const state = get();
      return state.selectedIds.map(id => state.objects[id]).filter(Boolean);
    },

    getObjectChildren: (id) => {
      const state = get();
      const object = state.objects[id];
      if (!object) return [];
      return object.children.map(childId => state.objects[childId]).filter(Boolean);
    },

    generateCode: () => {
      const state = get();
      // Generate PixiJS code from current scene
      // This will be implemented based on the object structure
      return '// Generated PixiJS code will go here';
    },

    importFromCode: (code) => {
      // Parse PixiJS code and create scene objects
      // This will be implemented to sync with code mode
      set((state) => {
        // Implementation will parse code and populate objects
      });
    },
  }))
);
