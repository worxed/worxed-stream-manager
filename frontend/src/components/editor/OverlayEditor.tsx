import { useEffect, useRef, useState, useCallback } from 'react';
import { Dropdown } from 'primereact/dropdown';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { InputNumber } from 'primereact/inputnumber';
import { Plus, Play, ExternalLink, Save, Undo2, Redo2 } from 'lucide-react';
import { useEditorStore, useCurrentScene, useFirstSelectedElement } from '../../stores/editorStore';
import KonvaCanvas from './KonvaCanvas';
import ElementToolbox from './ElementToolbox';
import PropertiesPanel from './PropertiesPanel';
import TestingPanel from './TestingPanel';

const RESOLUTION_PRESETS = [
  { label: '1920×1080 (1080p)', value: '1920x1080' },
  { label: '2560×1440 (1440p)', value: '2560x1440' },
  { label: '1280×720 (720p)', value: '1280x720' },
  { label: 'Custom', value: 'custom' },
];

function resolutionKey(w: number, h: number): string {
  const key = `${w}x${h}`;
  if (RESOLUTION_PRESETS.some(p => p.value === key)) return key;
  return 'custom';
}

export default function OverlayEditor() {
  const scenes = useEditorStore(s => s.scenes);
  const currentSceneId = useEditorStore(s => s.currentSceneId);
  const saving = useEditorStore(s => s.saving);
  const showNewScene = useEditorStore(s => s.showNewScene);
  const newSceneName = useEditorStore(s => s.newSceneName);
  const pastLength = useEditorStore(s => s.past.length);
  const futureLength = useEditorStore(s => s.future.length);
  const hasSelection = useEditorStore(s => s.selectedIds.size > 0);

  const loadScenes = useEditorStore(s => s.loadScenes);
  const switchScene = useEditorStore(s => s.switchScene);
  const createScene = useEditorStore(s => s.createScene);
  const deleteCurrentScene = useEditorStore(s => s.deleteCurrentScene);
  const activateCurrentScene = useEditorStore(s => s.activateCurrentScene);
  const forceSave = useEditorStore(s => s.forceSave);
  const undo = useEditorStore(s => s.undo);
  const redo = useEditorStore(s => s.redo);
  const setShowNewScene = useEditorStore(s => s.setShowNewScene);
  const setNewSceneName = useEditorStore(s => s.setNewSceneName);
  const updateSceneResolution = useEditorStore(s => s.updateSceneResolution);

  const scene = useCurrentScene();
  const selectedElement = useFirstSelectedElement();

  // --- Pop-out preview tracking ---
  const previewWindowRef = useRef<Window | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      if (previewWindowRef.current && previewWindowRef.current.closed) {
        previewWindowRef.current = null;
        setPreviewOpen(false);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const openOverlayPreview = useCallback(() => {
    if (previewWindowRef.current && !previewWindowRef.current.closed) {
      previewWindowRef.current.focus();
      return;
    }
    const url = scene?.id
      ? `${window.location.origin}/overlay?scene=${scene.id}`
      : `${window.location.origin}/overlay`;
    previewWindowRef.current = window.open(url, '_blank', 'width=1920,height=1080');
    setPreviewOpen(true);
  }, [scene?.id]);

  // --- Resolution ---
  const currentRes = scene ? resolutionKey(scene.width, scene.height) : '1920x1080';
  const isCustomRes = currentRes === 'custom';

  const handleResolutionChange = (value: string) => {
    if (value === 'custom') return;
    const [w, h] = value.split('x').map(Number);
    if (w && h) updateSceneResolution(w, h);
  };

  useEffect(() => {
    loadScenes();
  }, [loadScenes]);

  const sceneOptions = scenes.map(s => ({
    label: `${s.name}${s.is_active ? ' (Active)' : ''}`,
    value: s.id,
  }));

  return (
    <div className="flex flex-col h-[calc(100vh-140px)]">
      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <Dropdown
          value={currentSceneId}
          options={sceneOptions}
          onChange={(e) => switchScene(e.value)}
          optionLabel="label"
          optionValue="value"
          placeholder="Select Scene"
          className="w-56 text-sm"
        />

        {showNewScene ? (
          <div className="flex items-center gap-2">
            <InputText
              value={newSceneName}
              onChange={(e) => setNewSceneName(e.target.value)}
              placeholder="Scene name"
              className="text-sm w-40"
              onKeyDown={(e) => e.key === 'Enter' && createScene()}
              autoFocus
            />
            <Button icon="pi pi-check" text size="small" onClick={() => createScene()} />
            <Button icon="pi pi-times" text size="small" onClick={() => { setShowNewScene(false); setNewSceneName(''); }} />
          </div>
        ) : (
          <Button onClick={() => setShowNewScene(true)} text size="small" className="flex items-center gap-1.5 text-sm">
            <Plus size={14} />
            <span>New Scene</span>
          </Button>
        )}

        {/* Resolution */}
        {scene && (
          <div className="flex items-center gap-1.5">
            <Dropdown
              value={currentRes}
              options={RESOLUTION_PRESETS}
              onChange={(e) => handleResolutionChange(e.value)}
              optionLabel="label"
              optionValue="value"
              className="w-48 text-xs"
            />
            {isCustomRes && (
              <>
                <InputNumber
                  value={scene.width}
                  onValueChange={(e) => updateSceneResolution(e.value ?? 1920, scene.height)}
                  min={320}
                  max={7680}
                  className="w-20 text-xs"
                  inputClassName="text-xs !py-1"
                  suffix="w"
                />
                <span className="text-xs text-muted-foreground">&times;</span>
                <InputNumber
                  value={scene.height}
                  onValueChange={(e) => updateSceneResolution(scene.width, e.value ?? 1080)}
                  min={180}
                  max={4320}
                  className="w-20 text-xs"
                  inputClassName="text-xs !py-1"
                  suffix="h"
                />
              </>
            )}
          </div>
        )}

        <div className="flex-1" />

        {/* Undo/Redo */}
        <div className="flex items-center gap-1">
          <Button
            onClick={undo}
            text
            size="small"
            disabled={pastLength === 0}
            className="!px-2"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 size={14} />
          </Button>
          <Button
            onClick={redo}
            text
            size="small"
            disabled={futureLength === 0}
            className="!px-2"
            title="Redo (Ctrl+Shift+Z)"
          >
            <Redo2 size={14} />
          </Button>
        </div>

        {saving && (
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <i className="pi pi-spin pi-spinner" style={{ fontSize: '0.75rem' }} />
            Saving...
          </span>
        )}

        <Button
          onClick={forceSave}
          text
          size="small"
          className="flex items-center gap-1.5 text-xs"
          disabled={!scene}
        >
          <Save size={14} />
          <span>Save</span>
        </Button>

        {scene && !scene.is_active && (
          <Button onClick={activateCurrentScene} text size="small" className="flex items-center gap-1.5 text-xs">
            <Play size={14} />
            <span>Set Active</span>
          </Button>
        )}

        {scene?.is_active && (
          <span className="text-xs font-medium text-green-500 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Active
          </span>
        )}

        <Button
          onClick={openOverlayPreview}
          outlined={previewOpen}
          severity={previewOpen ? 'success' : undefined}
          text={!previewOpen}
          size="small"
          className="flex items-center gap-1.5 text-xs"
        >
          <ExternalLink size={14} />
          <span>Preview</span>
          {previewOpen && (
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          )}
        </Button>

        {scene && !scene.is_active && scenes.length > 1 && (
          <Button onClick={deleteCurrentScene} severity="danger" text size="small" className="flex items-center gap-1.5 text-xs" icon="pi pi-trash" />
        )}
      </div>

      {/* Editor Body */}
      {scene ? (
        <div className="flex flex-col flex-1 border border-border rounded-lg overflow-hidden bg-card">
          <div className="flex flex-1 overflow-hidden">
            {/* Left: Toolbox */}
            <div className="w-52 border-r border-border bg-card shrink-0">
              <ElementToolbox />
            </div>

            {/* Center: Canvas */}
            <KonvaCanvas canvasWidth={scene.width} canvasHeight={scene.height} />

            {/* Right: Properties */}
            {hasSelection && selectedElement && (
              <div className="w-72 border-l border-border bg-card shrink-0">
                <PropertiesPanel />
              </div>
            )}
          </div>

          {/* Bottom: Testing Panel */}
          <TestingPanel />
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <p className="text-lg mb-2">No scenes yet</p>
            <Button onClick={() => setShowNewScene(true)} className="flex items-center gap-2">
              <Plus size={16} />
              <span>Create your first scene</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
