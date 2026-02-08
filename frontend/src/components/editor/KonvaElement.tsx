import { useEffect, useRef, useState } from 'react';
import { Group, Rect, Text, Image as KonvaImage } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import type Konva from 'konva';
import type { SceneElement, TextConfig, ImageConfig, CustomEventConfig } from '../../types';

interface Props {
  element: SceneElement;
  isSelected: boolean;
  onSelect: (id: string, e: KonvaEventObject<MouseEvent | TouchEvent>) => void;
  onDragStart: () => void;
  onDragEnd: (id: string, x: number, y: number) => void;
  onTransformEnd: (id: string, attrs: { x: number; y: number; width: number; height: number; rotation: number }) => void;
}

// Simple useImage hook (avoids react-konva-utils peer dep issues)
function useImage(src: string): [HTMLImageElement | undefined, 'loading' | 'loaded' | 'failed'] {
  const [image, setImage] = useState<HTMLImageElement>();
  const [status, setStatus] = useState<'loading' | 'loaded' | 'failed'>('loading');

  useEffect(() => {
    if (!src) {
      setImage(undefined);
      setStatus('failed');
      return;
    }
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => { setImage(img); setStatus('loaded'); };
    img.onerror = () => { setImage(undefined); setStatus('failed'); };
    img.src = src;
    setStatus('loading');
    return () => { img.onload = null; img.onerror = null; };
  }, [src]);

  return [image, status];
}

// Parse rgba/hex to get opacity-safe fill
function parseColor(color: string | undefined, fallback: string): string {
  return color || fallback;
}

export default function KonvaElement({ element, onSelect, onDragStart, onDragEnd, onTransformEnd }: Props) {
  const groupRef = useRef<Konva.Group>(null);
  const { id, x, y, width, height, rotation, visible, locked, style, config, type, name } = element;

  const handleClick = (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
    e.cancelBubble = true;
    onSelect(id, e);
  };

  const handleDragStart = () => {
    onDragStart();
  };

  const handleDragEnd = (e: KonvaEventObject<DragEvent>) => {
    onDragEnd(id, Math.round(e.target.x()), Math.round(e.target.y()));
  };

  const handleTransformEnd = () => {
    const node = groupRef.current;
    if (!node) return;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    // Reset scale, apply to width/height
    node.scaleX(1);
    node.scaleY(1);
    onTransformEnd(id, {
      x: Math.round(node.x()),
      y: Math.round(node.y()),
      width: Math.round(Math.max(40, width * scaleX)),
      height: Math.round(Math.max(40, height * scaleY)),
      rotation: Math.round(node.rotation()),
    });
  };

  const opacity = visible ? (style.opacity ?? 1) : 0.3;
  const bgFill = parseColor(style.backgroundColor, 'transparent');
  const textColor = parseColor(style.color, '#ffffff');
  const fontSize = style.fontSize || 16;
  const fontFamily = style.fontFamily || 'Inter, system-ui, sans-serif';
  const borderRadius = style.borderRadius || 0;
  const padding = style.padding || 0;

  const renderContent = () => {
    switch (type) {
      case 'text': {
        const textConfig = config as TextConfig;
        return (
          <>
            <Rect
              width={width}
              height={height}
              fill={bgFill}
              cornerRadius={borderRadius}
              listening={false}
            />
            <Text
              text={textConfig.content || 'Text'}
              width={width - padding * 2}
              height={height - padding * 2}
              x={padding}
              y={padding}
              fontSize={fontSize}
              fontFamily={fontFamily}
              fontStyle={textConfig.fontWeight === 'bold' || textConfig.fontWeight === '700' ? 'bold' : 'normal'}
              fill={textColor}
              align={(style.textAlign as 'left' | 'center' | 'right') || 'left'}
              verticalAlign="middle"
              wrap="word"
              ellipsis
              listening={false}
            />
          </>
        );
      }

      case 'image': {
        const imageConfig = config as ImageConfig;
        return <ImageElement src={imageConfig.src} width={width} height={height} bgFill={bgFill} borderRadius={borderRadius} name={name} />;
      }

      case 'alert-box': {
        const alertBorder = style.border;
        const borderColor = alertBorder ? alertBorder.split(' ').pop() || '#FF3B30' : '#FF3B30';
        return (
          <>
            <Rect
              width={width}
              height={height}
              fill={bgFill}
              cornerRadius={borderRadius}
              stroke={borderColor}
              strokeWidth={2}
              listening={false}
            />
            <Text
              text="NEW FOLLOWER!"
              width={width}
              y={height * 0.25}
              fontSize={Math.min(fontSize, 22)}
              fontFamily={fontFamily}
              fontStyle="bold"
              fill={borderColor}
              align="center"
              listening={false}
            />
            <Text
              text="TestUser"
              width={width}
              y={height * 0.25 + Math.min(fontSize, 22) + 8}
              fontSize={Math.min(fontSize * 0.85, 18)}
              fontFamily={fontFamily}
              fill={textColor}
              align="center"
              listening={false}
            />
            <Text
              text={name}
              width={width}
              y={height - 22}
              fontSize={10}
              fontFamily={fontFamily}
              fill="rgba(255,255,255,0.35)"
              align="center"
              listening={false}
            />
          </>
        );
      }

      case 'chat': {
        const chatLines = [
          { user: 'Viewer1', color: '#8cffbe', msg: 'Hello!' },
          { user: 'Viewer2', color: '#ff7eb3', msg: 'Nice stream!' },
          { user: 'Viewer3', color: '#7eb3ff', msg: 'GG' },
        ];
        const lineH = Math.min(fontSize, 16) + 6;
        return (
          <>
            <Rect
              width={width}
              height={height}
              fill={bgFill}
              cornerRadius={borderRadius}
              listening={false}
            />
            {chatLines.map((line, i) => (
              <Text
                key={i}
                text={`${line.user}: ${line.msg}`}
                x={padding}
                y={padding + i * lineH}
                width={width - padding * 2}
                fontSize={Math.min(fontSize, 16)}
                fontFamily={fontFamily}
                fill={line.color}
                listening={false}
              />
            ))}
            <Text
              text={name}
              width={width}
              y={height - 18}
              fontSize={10}
              fontFamily={fontFamily}
              fill="rgba(255,255,255,0.35)"
              align="center"
              listening={false}
            />
          </>
        );
      }

      case 'custom-event': {
        const ceConfig = config as CustomEventConfig;
        const subtitle = ceConfig.eventName ? `[${ceConfig.eventName}]` : '[no event]';
        return (
          <>
            <Rect
              width={width}
              height={height}
              fill={bgFill}
              cornerRadius={borderRadius}
              listening={false}
            />
            <Text
              text={name}
              width={width}
              y={height / 2 - fontSize * 0.7}
              fontSize={Math.min(fontSize, 20)}
              fontFamily={fontFamily}
              fill={textColor}
              align="center"
              listening={false}
            />
            <Text
              text={subtitle}
              width={width}
              y={height / 2 + 4}
              fontSize={Math.min(fontSize * 0.6, 14)}
              fontFamily={fontFamily}
              fill="#8B5CF6"
              align="center"
              listening={false}
            />
          </>
        );
      }

      default:
        return (
          <Rect
            width={width}
            height={height}
            fill={bgFill}
            cornerRadius={borderRadius}
            listening={false}
          />
        );
    }
  };

  return (
    <Group
      ref={groupRef}
      id={id}
      x={x}
      y={y}
      width={width}
      height={height}
      rotation={rotation}
      opacity={opacity}
      draggable={!locked}
      onClick={handleClick}
      onTap={handleClick}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onTransformEnd={handleTransformEnd}
    >
      {/* Invisible hit area for precise click detection */}
      <Rect width={width} height={height} fill="transparent" listening={true} />
      {renderContent()}
      {/* Selection outline rendered by Transformer, not here */}
    </Group>
  );
}

// Separate component for image to use the hook
function ImageElement({ src, width, height, bgFill, borderRadius, name }: {
  src: string;
  width: number;
  height: number;
  bgFill: string;
  borderRadius: number;
  name: string;
}) {
  const [image, status] = useImage(src);

  return (
    <>
      <Rect
        width={width}
        height={height}
        fill={bgFill}
        cornerRadius={borderRadius}
        listening={false}
      />
      {status === 'loaded' && image ? (
        <KonvaImage
          image={image}
          width={width}
          height={height}
          listening={false}
        />
      ) : (
        <Text
          text={status === 'loading' ? 'Loading...' : (src ? 'Image not found' : name)}
          width={width}
          height={height}
          fontSize={14}
          fill="#999"
          align="center"
          verticalAlign="middle"
          listening={false}
        />
      )}
    </>
  );
}
