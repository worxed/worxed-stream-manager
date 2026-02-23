import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { getScenes, createScene as apiCreateScene, updateScene as apiUpdateScene, deleteScene as apiDeleteScene, activateScene as apiActivateScene } from '../services/api';
import { socketService } from '../services/socket';
import type { Scene, SceneElement, ElementType } from '../types';

// --- Helpers ---

function generateId() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

const DEFAULT_ELEMENTS: Record<ElementType, Omit<SceneElement, 'id' | 'zIndex'>> = {
  'alert-box': {
    type: 'alert-box',
    name: 'Alert Box',
    x: 660, y: 390, width: 600, height: 300, rotation: 0,
    visible: true, locked: false,
    style: {
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      borderRadius: 12,
      border: '2px solid #FF3B30',
      opacity: 1,
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: 24,
      color: '#ffffff',
      padding: 32,
      textAlign: 'center',
    },
    config: { alertTypes: ['follow', 'subscribe', 'donation', 'raid'], duration: 5000, animation: 'fadeInUp' },
  },
  'chat': {
    type: 'chat',
    name: 'Chat',
    x: 50, y: 600, width: 400, height: 400, rotation: 0,
    visible: true, locked: false,
    style: {
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      borderRadius: 8,
      opacity: 1,
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: 16,
      color: '#ffffff',
      padding: 8,
    },
    config: { maxMessages: 20, showBadges: true, fadeAfter: 0 },
  },
  'text': {
    type: 'text',
    name: 'Text',
    x: 760, y: 50, width: 400, height: 60, rotation: 0,
    visible: true, locked: false,
    style: {
      backgroundColor: 'transparent',
      borderRadius: 0,
      opacity: 1,
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: 32,
      color: '#ffffff',
      padding: 8,
      textAlign: 'center',
    },
    config: { content: 'Your Text Here', fontWeight: 'bold', lineHeight: 1.5 },
  },
  'image': {
    type: 'image',
    name: 'Image',
    x: 760, y: 440, width: 400, height: 200, rotation: 0,
    visible: true, locked: false,
    style: {
      backgroundColor: 'transparent',
      borderRadius: 0,
      opacity: 1,
    },
    config: { src: '', objectFit: 'contain' },
  },
  'custom-event': {
    type: 'custom-event',
    name: 'Custom Event',
    x: 660, y: 390, width: 500, height: 200, rotation: 0,
    visible: true, locked: false,
    style: {
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      borderRadius: 12,
      border: '2px solid #8B5CF6',
      opacity: 1,
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: 24,
      color: '#ffffff',
      padding: 16,
      textAlign: 'center',
    },
    config: { eventName: '', template: '{{message}}', duration: 5000, animation: 'fadeInUp', maxQueueSize: 10 },
  },
};

// --- Types ---

interface HistoryEntry {
  elements: SceneElement[];
  name: string;
  width: number;
  height: number;
}

interface EditorState {
  scenes: Scene[];
  currentSceneId: number | null;
  selectedIds: Set<string>;
  saving: boolean;
  showNewScene: boolean;
  newSceneName: string;
  past: HistoryEntry[];
  future: HistoryEntry[];
  clipboard: SceneElement[] | null;
}

interface EditorActions {
  // Scene CRUD
  loadScenes: () => Promise<void>;
  switchScene: (id: number) => void;
  createScene: (name?: string) => Promise<void>;
  deleteCurrentScene: () => Promise<void>;
  activateCurrentScene: () => Promise<void>;
  forceSave: () => Promise<void>;

  // Element CRUD
  addElement: (type: ElementType) => void;
  updateElement: (id: string, updates: Partial<SceneElement>) => void;
  updateElements: (updates: Map<string, Partial<SceneElement>>) => void;
  deleteSelectedElements: () => void;

  // Selection
  select: (id: string, additive?: boolean) => void;
  clearSelection: () => void;
  selectAll: () => void;

  // Layers
  toggleVisibility: (id: string) => void;
  toggleLock: (id: string) => void;
  reorder: (id: string, direction: 'up' | 'down') => void;

  // History
  undo: () => void;
  redo: () => void;
  pushHistory: () => void;

  // Clipboard
  copy: () => void;
  paste: () => void;
  duplicate: () => void;

  // Resolution
  updateSceneResolution: (width: number, height: number) => void;

  // UI
  setShowNewScene: (show: boolean) => void;
  setNewSceneName: (name: string) => void;

  // Remote sync
  mergeRemoteScene: (scene: Scene) => void;
  handleRemoteDelete: (id: number) => void;
}

type EditorStore = EditorState & EditorActions;

const MAX_HISTORY = 50;

// Helper to get current scene from state
function getCurrentScene(state: EditorState): Scene | undefined {
  return state.scenes.find(s => s.id === state.currentSceneId);
}

// Helper to update current scene's elements in place
function updateCurrentSceneElements(
  state: EditorState,
  updater: (elements: SceneElement[], scene: Scene) => SceneElement[]
): Partial<EditorState> {
  const scene = getCurrentScene(state);
  if (!scene) return {};
  const newElements = updater(scene.elements, scene);
  return {
    scenes: state.scenes.map(s =>
      s.id === state.currentSceneId ? { ...s, elements: newElements } : s
    ),
  };
}

export const useEditorStore = create<EditorStore>()(
  subscribeWithSelector((set, get) => ({
    // --- Initial State ---
    scenes: [],
    currentSceneId: null,
    selectedIds: new Set<string>(),
    saving: false,
    showNewScene: false,
    newSceneName: '',
    past: [],
    future: [],
    clipboard: null,

    // --- Scene CRUD ---

    loadScenes: async () => {
      const result = await getScenes();
      if (result.data) {
        const active = result.data.find(s => s.is_active) || result.data[0];
        set({
          scenes: result.data,
          currentSceneId: active?.id ?? null,
          selectedIds: new Set(),
          past: [],
          future: [],
        });
      }
    },

    switchScene: (id) => {
      set({
        currentSceneId: id,
        selectedIds: new Set(),
        past: [],
        future: [],
      });
    },

    createScene: async (name) => {
      const sceneName = (name || get().newSceneName).trim() || 'New Scene';
      const result = await apiCreateScene({ name: sceneName, elements: [] });
      if (result.data) {
        set(state => ({
          scenes: [...state.scenes, result.data!],
          currentSceneId: result.data!.id ?? null,
          showNewScene: false,
          newSceneName: '',
          selectedIds: new Set(),
          past: [],
          future: [],
        }));
      }
    },

    deleteCurrentScene: async () => {
      const { currentSceneId, scenes } = get();
      if (!currentSceneId) return;
      const result = await apiDeleteScene(currentSceneId);
      if (result.data?.success) {
        const remaining = scenes.filter(s => s.id !== currentSceneId);
        set({
          scenes: remaining,
          currentSceneId: remaining[0]?.id ?? null,
          selectedIds: new Set(),
          past: [],
          future: [],
        });
      }
    },

    activateCurrentScene: async () => {
      const { currentSceneId } = get();
      if (!currentSceneId) return;
      const result = await apiActivateScene(currentSceneId);
      if (result.data) {
        set(state => ({
          scenes: state.scenes.map(s => ({
            ...s,
            is_active: s.id === currentSceneId,
          })),
        }));
      }
    },

    forceSave: async () => {
      const scene = getCurrentScene(get());
      if (!scene?.id) return;
      // Cancel any pending auto-save
      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
        autoSaveTimer = null;
      }
      set({ saving: true });
      await apiUpdateScene(scene.id, { elements: scene.elements, name: scene.name });
      set({ saving: false });
    },

    // --- Element CRUD ---

    addElement: (type) => {
      const state = get();
      const scene = getCurrentScene(state);
      if (!scene) return;

      state.pushHistory();

      const template = DEFAULT_ELEMENTS[type];
      const maxZ = scene.elements.reduce((max, el) => Math.max(max, el.zIndex), 0);
      const count = scene.elements.filter(el => el.type === type).length;
      const newElement: SceneElement = {
        ...template,
        id: generateId(),
        zIndex: maxZ + 1,
        name: `${template.name} ${count + 1}`,
        style: { ...template.style },
        config: { ...template.config },
      };

      set(s => ({
        ...updateCurrentSceneElements(s, (elements) => [...elements, newElement]),
        selectedIds: new Set([newElement.id]),
      }));
    },

    updateElement: (id, updates) => {
      set(state => updateCurrentSceneElements(state, (elements) =>
        elements.map(el => el.id === id ? { ...el, ...updates } : el)
      ));
    },

    updateElements: (updates) => {
      set(state => updateCurrentSceneElements(state, (elements) =>
        elements.map(el => {
          const u = updates.get(el.id);
          return u ? { ...el, ...u } : el;
        })
      ));
    },

    deleteSelectedElements: () => {
      const state = get();
      if (state.selectedIds.size === 0) return;

      state.pushHistory();

      set(s => ({
        ...updateCurrentSceneElements(s, (elements) =>
          elements.filter(el => !s.selectedIds.has(el.id))
        ),
        selectedIds: new Set(),
      }));
    },

    // --- Selection ---

    select: (id, additive) => {
      set(state => {
        if (additive) {
          const next = new Set(state.selectedIds);
          if (next.has(id)) {
            next.delete(id);
          } else {
            next.add(id);
          }
          return { selectedIds: next };
        }
        return { selectedIds: new Set([id]) };
      });
    },

    clearSelection: () => set({ selectedIds: new Set() }),

    selectAll: () => {
      const scene = getCurrentScene(get());
      if (!scene) return;
      set({ selectedIds: new Set(scene.elements.map(el => el.id)) });
    },

    // --- Layers ---

    toggleVisibility: (id) => {
      get().pushHistory();
      set(state => updateCurrentSceneElements(state, (elements) =>
        elements.map(el => el.id === id ? { ...el, visible: !el.visible } : el)
      ));
    },

    toggleLock: (id) => {
      get().pushHistory();
      set(state => updateCurrentSceneElements(state, (elements) =>
        elements.map(el => el.id === id ? { ...el, locked: !el.locked } : el)
      ));
    },

    reorder: (id, direction) => {
      get().pushHistory();
      set(state => updateCurrentSceneElements(state, (elements) => {
        const sorted = [...elements].sort((a, b) => a.zIndex - b.zIndex);
        const idx = sorted.findIndex(el => el.id === id);
        if (idx === -1) return elements;

        const swapIdx = direction === 'up' ? idx + 1 : idx - 1;
        if (swapIdx < 0 || swapIdx >= sorted.length) return elements;

        const tempZ = sorted[idx].zIndex;
        sorted[idx] = { ...sorted[idx], zIndex: sorted[swapIdx].zIndex };
        sorted[swapIdx] = { ...sorted[swapIdx], zIndex: tempZ };
        return sorted;
      }));
    },

    // --- History ---

    pushHistory: () => {
      const scene = getCurrentScene(get());
      if (!scene) return;
      set(state => ({
        past: [
          ...state.past.slice(-(MAX_HISTORY - 1)),
          { elements: scene.elements.map(el => ({ ...el, style: { ...el.style }, config: { ...el.config } })), name: scene.name, width: scene.width, height: scene.height },
        ],
        future: [],
      }));
    },

    undo: () => {
      const state = get();
      if (state.past.length === 0) return;
      const scene = getCurrentScene(state);
      if (!scene) return;

      const prev = state.past[state.past.length - 1];
      set(s => ({
        past: s.past.slice(0, -1),
        future: [
          ...s.future,
          { elements: scene.elements.map(el => ({ ...el, style: { ...el.style }, config: { ...el.config } })), name: scene.name, width: scene.width, height: scene.height },
        ],
        scenes: s.scenes.map(sc =>
          sc.id === s.currentSceneId ? { ...sc, elements: prev.elements, name: prev.name, width: prev.width, height: prev.height } : sc
        ),
      }));
    },

    redo: () => {
      const state = get();
      if (state.future.length === 0) return;
      const scene = getCurrentScene(state);
      if (!scene) return;

      const next = state.future[state.future.length - 1];
      set(s => ({
        future: s.future.slice(0, -1),
        past: [
          ...s.past,
          { elements: scene.elements.map(el => ({ ...el, style: { ...el.style }, config: { ...el.config } })), name: scene.name, width: scene.width, height: scene.height },
        ],
        scenes: s.scenes.map(sc =>
          sc.id === s.currentSceneId ? { ...sc, elements: next.elements, name: next.name, width: next.width, height: next.height } : sc
        ),
      }));
    },

    // --- Clipboard ---

    copy: () => {
      const state = get();
      const scene = getCurrentScene(state);
      if (!scene || state.selectedIds.size === 0) return;
      const copied = scene.elements
        .filter(el => state.selectedIds.has(el.id))
        .map(el => ({ ...el, style: { ...el.style }, config: { ...el.config } }));
      set({ clipboard: copied });
    },

    paste: () => {
      const state = get();
      const scene = getCurrentScene(state);
      if (!scene || !state.clipboard || state.clipboard.length === 0) return;

      state.pushHistory();

      const maxZ = scene.elements.reduce((max, el) => Math.max(max, el.zIndex), 0);
      const newIds: string[] = [];
      const pasted = state.clipboard.map((el, i) => {
        const id = generateId();
        newIds.push(id);
        return {
          ...el,
          id,
          x: el.x + 20,
          y: el.y + 20,
          zIndex: maxZ + 1 + i,
          name: `${el.name} (copy)`,
          style: { ...el.style },
          config: { ...el.config },
        };
      });

      set(s => ({
        ...updateCurrentSceneElements(s, (elements) => [...elements, ...pasted]),
        selectedIds: new Set(newIds),
      }));
    },

    duplicate: () => {
      const state = get();
      const scene = getCurrentScene(state);
      if (!scene || state.selectedIds.size === 0) return;

      state.pushHistory();

      const toDuplicate = scene.elements.filter(el => state.selectedIds.has(el.id));
      const maxZ = scene.elements.reduce((max, el) => Math.max(max, el.zIndex), 0);
      const newIds: string[] = [];
      const duped = toDuplicate.map((el, i) => {
        const id = generateId();
        newIds.push(id);
        return {
          ...el,
          id,
          x: el.x + 20,
          y: el.y + 20,
          zIndex: maxZ + 1 + i,
          name: `${el.name} (copy)`,
          style: { ...el.style },
          config: { ...el.config },
        };
      });

      set(s => ({
        ...updateCurrentSceneElements(s, (elements) => [...elements, ...duped]),
        selectedIds: new Set(newIds),
      }));
    },

    // --- Resolution ---

    updateSceneResolution: (width, height) => {
      const state = get();
      const scene = getCurrentScene(state);
      if (!scene) return;

      state.pushHistory();

      set(s => ({
        scenes: s.scenes.map(sc =>
          sc.id === s.currentSceneId ? { ...sc, width, height } : sc
        ),
      }));
    },

    // --- UI ---

    setShowNewScene: (show) => set({ showNewScene: show }),
    setNewSceneName: (name) => set({ newSceneName: name }),

    // --- Remote Sync ---

    mergeRemoteScene: (scene) => {
      set(state => {
        const exists = state.scenes.some(s => s.id === scene.id);
        if (exists) {
          // Only merge if it's not the currently edited scene (avoid overwriting local edits)
          if (state.currentSceneId === scene.id) return {};
          return {
            scenes: state.scenes.map(s => s.id === scene.id ? scene : s),
          };
        }
        return { scenes: [...state.scenes, scene] };
      });
    },

    handleRemoteDelete: (id) => {
      set(state => {
        const remaining = state.scenes.filter(s => s.id !== id);
        const newCurrent = state.currentSceneId === id
          ? (remaining[0]?.id ?? null)
          : state.currentSceneId;
        return {
          scenes: remaining,
          currentSceneId: newCurrent,
          selectedIds: state.currentSceneId === id ? new Set() : state.selectedIds,
        };
      });
    },
  }))
);

// --- Auto-save via subscription ---

let autoSaveTimer: ReturnType<typeof setTimeout> | null = null;
let lastSavedSnapshot = '';

useEditorStore.subscribe(
  (state) => {
    const scene = getCurrentScene(state);
    if (!scene?.id) return null;
    return { id: scene.id, elements: scene.elements, name: scene.name, width: scene.width, height: scene.height };
  },
  (current) => {
    if (!current) return;
    const snapshot = JSON.stringify({ elements: current.elements, name: current.name, width: current.width, height: current.height });
    if (snapshot === lastSavedSnapshot) return;

    if (autoSaveTimer) clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(async () => {
      useEditorStore.setState({ saving: true });
      await apiUpdateScene(current.id, { elements: current.elements, name: current.name, width: current.width, height: current.height });
      lastSavedSnapshot = snapshot;
      useEditorStore.setState({ saving: false });
      autoSaveTimer = null;
    }, 800);
  },
  { equalityFn: (a, b) => JSON.stringify(a) === JSON.stringify(b) }
);

// --- Socket sync ---

socketService.onSceneUpdated((scene) => {
  useEditorStore.getState().mergeRemoteScene(scene);
});

socketService.onSceneDeleted(({ id }) => {
  useEditorStore.getState().handleRemoteDelete(id);
});

socketService.onSceneActivated((scene) => {
  useEditorStore.setState(state => ({
    scenes: state.scenes.map(s => ({
      ...s,
      is_active: s.id === scene.id,
    })),
  }));
});

// --- Selector helpers ---

export function useCurrentScene(): Scene | undefined {
  return useEditorStore(state => state.scenes.find(s => s.id === state.currentSceneId));
}

export function useSelectedElements(): SceneElement[] {
  return useEditorStore(state => {
    const scene = state.scenes.find(s => s.id === state.currentSceneId);
    if (!scene) return [];
    return scene.elements.filter(el => state.selectedIds.has(el.id));
  });
}

export function useFirstSelectedElement(): SceneElement | null {
  return useEditorStore(state => {
    const scene = state.scenes.find(s => s.id === state.currentSceneId);
    if (!scene || state.selectedIds.size === 0) return null;
    const firstId = state.selectedIds.values().next().value;
    return scene.elements.find(el => el.id === firstId) ?? null;
  });
}
