import { useRef, useEffect, useState, useCallback } from 'react';
import { Stage, Layer, Rect, Line, Text } from 'react-konva';
import { Transformer } from 'react-konva';
import type Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import { useEditorStore, useCurrentScene } from '../../stores/editorStore';
import KonvaElement from './KonvaElement';

const PADDING = 40;
const OOB = 5000; // out-of-bounds extension for dim overlay
const DIM_FILL = 'rgba(0,0,0,0.3)';
const SNAP_THRESHOLD = 10; // scene pixels

interface SnapResult {
  x: number;
  y: number;
  lines: number[][]; // flat point arrays for Konva Line [x1,y1,x2,y2]
}

function computeSnap(
  dragged: { x: number; y: number; width: number; height: number },
  others: Array<{ x: number; y: number; width: number; height: number }>,
  canvasW: number,
  canvasH: number,
): SnapResult {
  const xTargets = [
    0, canvasW / 2, canvasW,
    ...others.flatMap(el => [el.x, el.x + el.width / 2, el.x + el.width]),
  ];
  const yTargets = [
    0, canvasH / 2, canvasH,
    ...others.flatMap(el => [el.y, el.y + el.height / 2, el.y + el.height]),
  ];

  // [edge value, x offset to get back to element.x]
  const xEdges: [number, number][] = [
    [dragged.x, 0],
    [dragged.x + dragged.width / 2, -dragged.width / 2],
    [dragged.x + dragged.width, -dragged.width],
  ];
  const yEdges: [number, number][] = [
    [dragged.y, 0],
    [dragged.y + dragged.height / 2, -dragged.height / 2],
    [dragged.y + dragged.height, -dragged.height],
  ];

  let snapX = dragged.x, snapY = dragged.y;
  let bestX = SNAP_THRESHOLD, bestY = SNAP_THRESHOLD;
  let lineX: number | null = null, lineY: number | null = null;

  for (const tx of xTargets) {
    for (const [edge, offset] of xEdges) {
      const d = Math.abs(edge - tx);
      if (d < bestX) { bestX = d; snapX = tx + offset; lineX = tx; }
    }
  }
  for (const ty of yTargets) {
    for (const [edge, offset] of yEdges) {
      const d = Math.abs(edge - ty);
      if (d < bestY) { bestY = d; snapY = ty + offset; lineY = ty; }
    }
  }

  const lines: number[][] = [];
  if (lineX !== null) lines.push([lineX, 0, lineX, canvasH]);
  if (lineY !== null) lines.push([0, lineY, canvasW, lineY]);

  return { x: snapX, y: snapY, lines };
}

interface KonvaCanvasProps {
  canvasWidth?: number;
  canvasHeight?: number;
}

export default function KonvaCanvas({ canvasWidth = 1920, canvasHeight = 1080 }: KonvaCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);

  const [containerSize, setContainerSize] = useState({ w: 800, h: 600 });
  const [snapLines, setSnapLines] = useState<number[][]>([]);

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
  const handleStageClick = useCallback((e: KonvaEventObject<MouseEvent | TouchEvent>) => {
    // If the click target is the stage itself or the background rect, clear selection
    const target = e.target;
    if (target === stageRef.current || target.name() === 'background') {
      clearSelection();
    }
  }, [clearSelection]);

  // Element selection
  const handleElementSelect = useCallback((id: string, e: KonvaEventObject<MouseEvent | TouchEvent>) => {
    const isShift = e.evt.shiftKey;
    select(id, isShift);
  }, [select]);

  // Drag start → push history once
  const handleDragStart = useCallback(() => {
    pushHistory();
  }, [pushHistory]);

  // Drag move → snap to edges/centers of scene and other elements
  const handleDragMove = useCallback((id: string, node: Konva.Group) => {
    if (selectedIds.size > 1) return; // multi-select: skip snapping
    if (!scene) return;
    const el = scene.elements.find(e => e.id === id);
    if (!el) return;
    const others = scene.elements
      .filter(e => e.id !== id && e.visible)
      .map(e => ({ x: e.x, y: e.y, width: e.width, height: e.height }));
    const { x, y, lines } = computeSnap(
      { x: node.x(), y: node.y(), width: el.width, height: el.height },
      others,
      canvasWidth,
      canvasHeight,
    );
    node.x(x);
    node.y(y);
    setSnapLines(lines);
  }, [scene, selectedIds, canvasWidth, canvasHeight]);

  // Drag end → update element position
  const handleDragEnd = useCallback((id: string, x: number, y: number) => {
    setSnapLines([]);
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
          {/* Dim overlay outside canvas bounds (letterbox) */}
          <Rect x={-OOB} y={-OOB} width={canvasWidth + OOB * 2} height={OOB} fill={DIM_FILL} listening={false} />
          <Rect x={-OOB} y={canvasHeight} width={canvasWidth + OOB * 2} height={OOB} fill={DIM_FILL} listening={false} />
          <Rect x={-OOB} y={0} width={OOB} height={canvasHeight} fill={DIM_FILL} listening={false} />
          <Rect x={canvasWidth} y={0} width={OOB} height={canvasHeight} fill={DIM_FILL} listening={false} />

          {/* Canvas area (click target for deselect) */}
          <Rect
            name="background"
            x={0}
            y={0}
            width={canvasWidth}
            height={canvasHeight}
            fill="rgba(0,0,0,0.02)"
            stroke="rgba(255,255,255,0.15)"
            strokeWidth={1}
            listening={true}
          />

          {/* Center crosshair guides */}
          <Line
            points={[canvasWidth / 2, 0, canvasWidth / 2, canvasHeight]}
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={1}
            dash={[8, 8]}
            listening={false}
          />
          <Line
            points={[0, canvasHeight / 2, canvasWidth, canvasHeight / 2]}
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={1}
            dash={[8, 8]}
            listening={false}
          />

          {/* Resolution label below canvas */}
          <Text
            text={`${canvasWidth} \u00d7 ${canvasHeight}`}
            x={canvasWidth - 200}
            y={canvasHeight + 12}
            width={200}
            fontSize={20}
            fill="rgba(255,255,255,0.3)"
            align="right"
            fontFamily="Inter, system-ui, sans-serif"
            listening={false}
          />

          {/* Elements */}
          {sortedElements.map(element => (
            <KonvaElement
              key={element.id}
              element={element}
              isSelected={selectedIds.has(element.id)}
              onSelect={handleElementSelect}
              onDragStart={handleDragStart}
              onDragMove={handleDragMove}
              onDragEnd={handleDragEnd}
              onTransformEnd={handleTransformEnd}
            />
          ))}

          {/* Snap guide lines */}
          {snapLines.map((pts, i) => (
            <Line
              key={i}
              points={pts}
              stroke="#00d9ff"
              strokeWidth={1 / zoom}
              dash={[6 / zoom, 4 / zoom]}
              listening={false}
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
