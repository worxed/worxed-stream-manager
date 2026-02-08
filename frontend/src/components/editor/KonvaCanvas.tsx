import { useRef, useEffect, useState, useCallback } from 'react';
import { Stage, Layer, Rect } from 'react-konva';
import { Transformer } from 'react-konva';
import type Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import { useEditorStore, useCurrentScene } from '../../stores/editorStore';
import KonvaElement from './KonvaElement';

const PADDING = 40;

interface KonvaCanvasProps {
  canvasWidth?: number;
  canvasHeight?: number;
}

export default function KonvaCanvas({ canvasWidth = 1920, canvasHeight = 1080 }: KonvaCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);

  const [containerSize, setContainerSize] = useState({ w: 800, h: 600 });

  const scene = useCurrentScene();
  const selectedIds = useEditorStore(s => s.selectedIds);
  const select = useEditorStore(s => s.select);
  const clearSelection = useEditorStore(s => s.clearSelection);
  const selectAll = useEditorStore(s => s.selectAll);
  const updateElement = useEditorStore(s => s.updateElement);
  const updateElements = useEditorStore(s => s.updateElements);
  const deleteSelectedElements = useEditorStore(s => s.deleteSelectedElements);
  const pushHistory = useEditorStore(s => s.pushHistory);
  const undo = useEditorStore(s => s.undo);
  const redo = useEditorStore(s => s.redo);
  const copy = useEditorStore(s => s.copy);
  const paste = useEditorStore(s => s.paste);
  const duplicate = useEditorStore(s => s.duplicate);

  // Compute zoom/offset to fit canvas in container
  const zoom = Math.min(
    (containerSize.w - PADDING) / canvasWidth,
    (containerSize.h - PADDING) / canvasHeight,
    1
  );
  const offsetX = (containerSize.w - canvasWidth * zoom) / 2;
  const offsetY = (containerSize.h - canvasHeight * zoom) / 2;

  // ResizeObserver
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const measure = () => {
      const rect = el.getBoundingClientRect();
      setContainerSize({ w: rect.width, h: rect.height });
    };
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Update Transformer nodes when selection changes
  useEffect(() => {
    const tr = transformerRef.current;
    const stage = stageRef.current;
    if (!tr || !stage) return;

    const nodes: Konva.Node[] = [];
    selectedIds.forEach(id => {
      const node = stage.findOne(`#${id}`);
      if (node) nodes.push(node);
    });
    tr.nodes(nodes);
    tr.getLayer()?.batchDraw();
  }, [selectedIds, scene?.elements]);

  // Click on background → clear selection
  const handleStageClick = useCallback((e: KonvaEventObject<MouseEvent>) => {
    // If the click target is the stage itself or the background rect, clear selection
    const target = e.target;
    if (target === stageRef.current || target.name() === 'background') {
      clearSelection();
    }
  }, [clearSelection]);

  // Element selection
  const handleElementSelect = useCallback((id: string, e: KonvaEventObject<MouseEvent>) => {
    const isShift = e.evt.shiftKey;
    select(id, isShift);
  }, [select]);

  // Drag start → push history once
  const handleDragStart = useCallback(() => {
    pushHistory();
  }, [pushHistory]);

  // Drag end → update element position
  const handleDragEnd = useCallback((id: string, x: number, y: number) => {
    // If multi-selecting, batch update all dragged nodes
    if (selectedIds.size > 1 && selectedIds.has(id)) {
      const stage = stageRef.current;
      if (!stage) return;
      const updates = new Map<string, Partial<{ x: number; y: number }>>();
      selectedIds.forEach(selId => {
        const node = stage.findOne(`#${selId}`);
        if (node) {
          updates.set(selId, { x: Math.round(node.x()), y: Math.round(node.y()) });
        }
      });
      updateElements(updates);
    } else {
      updateElement(id, { x, y });
    }
  }, [selectedIds, updateElement, updateElements]);

  // Transform end → update size/position/rotation
  const handleTransformEnd = useCallback((id: string, attrs: { x: number; y: number; width: number; height: number; rotation: number }) => {
    // If multi-selecting, batch update all transformed nodes
    if (selectedIds.size > 1 && selectedIds.has(id)) {
      const stage = stageRef.current;
      if (!stage) return;
      const updates = new Map<string, Partial<{ x: number; y: number; width: number; height: number; rotation: number }>>();
      selectedIds.forEach(selId => {
        const node = stage.findOne(`#${selId}`);
        if (node) {
          const scaleX = node.scaleX();
          const scaleY = node.scaleY();
          const scene = useEditorStore.getState().scenes.find(s => s.id === useEditorStore.getState().currentSceneId);
          const el = scene?.elements.find(e => e.id === selId);
          if (el) {
            node.scaleX(1);
            node.scaleY(1);
            updates.set(selId, {
              x: Math.round(node.x()),
              y: Math.round(node.y()),
              width: Math.round(Math.max(40, el.width * scaleX)),
              height: Math.round(Math.max(40, el.height * scaleY)),
              rotation: Math.round(node.rotation()),
            });
          }
        }
      });
      updateElements(updates);
    } else {
      updateElement(id, attrs);
    }
  }, [selectedIds, updateElement, updateElements]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      const ctrl = e.ctrlKey || e.metaKey;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        deleteSelectedElements();
      } else if (ctrl && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (ctrl && (e.key === 'Z' || (e.key === 'z' && e.shiftKey)) || (ctrl && e.key === 'y')) {
        e.preventDefault();
        redo();
      } else if (ctrl && e.key === 'a') {
        e.preventDefault();
        selectAll();
      } else if (ctrl && e.key === 'c') {
        e.preventDefault();
        copy();
      } else if (ctrl && e.key === 'v') {
        e.preventDefault();
        paste();
      } else if (ctrl && e.key === 'd') {
        e.preventDefault();
        duplicate();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [deleteSelectedElements, undo, redo, selectAll, copy, paste, duplicate]);

  if (!scene) return null;

  const sortedElements = [...scene.elements].sort((a, b) => a.zIndex - b.zIndex);

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-hidden"
      style={{
        background: `
          linear-gradient(45deg, rgba(113, 113, 122, 0.08) 25%, transparent 25%),
          linear-gradient(-45deg, rgba(113, 113, 122, 0.08) 25%, transparent 25%),
          linear-gradient(45deg, transparent 75%, rgba(113, 113, 122, 0.08) 75%),
          linear-gradient(-45deg, transparent 75%, rgba(113, 113, 122, 0.08) 75%)
        `,
        backgroundSize: '20px 20px',
        backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
      }}
    >
      <Stage
        ref={stageRef}
        width={containerSize.w}
        height={containerSize.h}
        scaleX={zoom}
        scaleY={zoom}
        x={offsetX}
        y={offsetY}
        onClick={handleStageClick}
        onTap={handleStageClick}
      >
        <Layer>
          {/* Background rect (click target for deselect) */}
          <Rect
            name="background"
            x={0}
            y={0}
            width={canvasWidth}
            height={canvasHeight}
            fill="rgba(0,0,0,0.02)"
            stroke="var(--color-border, #333)"
            strokeWidth={1}
            listening={true}
          />

          {/* Elements */}
          {sortedElements.map(element => (
            <KonvaElement
              key={element.id}
              element={element}
              isSelected={selectedIds.has(element.id)}
              onSelect={handleElementSelect}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onTransformEnd={handleTransformEnd}
            />
          ))}

          {/* Transformer (selection handles) */}
          <Transformer
            ref={transformerRef}
            rotateEnabled={true}
            rotationSnaps={[0, 45, 90, 135, 180, 225, 270, 315]}
            boundBoxFunc={(_oldBox, newBox) => {
              if (newBox.width < 40 || newBox.height < 40) return _oldBox;
              return newBox;
            }}
            borderStroke="#3b82f6"
            borderStrokeWidth={1.5}
            borderDash={[4, 4]}
            anchorFill="#3b82f6"
            anchorStroke="#ffffff"
            anchorSize={8}
            anchorCornerRadius={2}
          />
        </Layer>
      </Stage>
    </div>
  );
}
