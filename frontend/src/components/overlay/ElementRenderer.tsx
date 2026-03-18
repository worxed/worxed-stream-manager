import type { SceneElement } from '../../types';
import AlertBoxRenderer from './AlertBoxRenderer';
import ChatRenderer from './ChatRenderer';
import TextRenderer from './TextRenderer';
import ImageRenderer from './ImageRenderer';
import CustomEventRenderer from './CustomEventRenderer';
import GoalRenderer from './GoalRenderer';
import StatRenderer from './StatRenderer';
import RecentEventsRenderer from './RecentEventsRenderer';

interface Props {
  element: SceneElement;
  isEditor?: boolean;
}

// alert-box and custom-event manage their own visual container — they must be
// invisible when no content is active, so we don't apply style props here.
const TRANSPARENT_TYPES = new Set(['alert-box', 'custom-event']);

export default function ElementRenderer({ element, isEditor }: Props) {
  const isTransparent = TRANSPARENT_TYPES.has(element.type);

  const positionStyle: React.CSSProperties = {
    position: 'absolute',
    left: element.x,
    top: element.y,
    width: element.width,
    height: element.height,
    transform: element.rotation ? `rotate(${element.rotation}deg)` : undefined,
    zIndex: element.zIndex,
    opacity: element.style.opacity ?? 1,
    // Visual styles only for persistent elements
    ...(isTransparent ? {} : {
      backgroundColor: element.style.backgroundColor,
      borderRadius: element.style.borderRadius,
      border: element.style.border,
      boxShadow: element.style.boxShadow,
    }),
    overflow: 'hidden',
    pointerEvents: isEditor ? 'none' : undefined,
  };

  if (!element.visible && !isEditor) return null;

  const renderContent = () => {
    switch (element.type) {
      case 'alert-box':
        return <AlertBoxRenderer element={element} />;
      case 'chat':
        return <ChatRenderer element={element} />;
      case 'text':
        return <TextRenderer element={element} />;
      case 'image':
        return <ImageRenderer element={element} />;
      case 'custom-event':
        return <CustomEventRenderer element={element} />;
      case 'goal':
        return <GoalRenderer element={element} />;
      case 'stat':
        return <StatRenderer element={element} />;
      case 'recent-events':
        return <RecentEventsRenderer element={element} />;
      default:
        return <div style={{ color: '#666', padding: 8 }}>Unknown element type: {element.type}</div>;
    }
  };

  return (
    <div style={positionStyle}>
      {renderContent()}
    </div>
  );
}
