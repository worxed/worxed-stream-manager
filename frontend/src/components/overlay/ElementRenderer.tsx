import type { SceneElement } from '../../types';
import AlertBoxRenderer from './AlertBoxRenderer';
import ChatRenderer from './ChatRenderer';
import TextRenderer from './TextRenderer';
import ImageRenderer from './ImageRenderer';
import CustomEventRenderer from './CustomEventRenderer';

interface Props {
  element: SceneElement;
  isEditor?: boolean;
}

export default function ElementRenderer({ element, isEditor }: Props) {
  const positionStyle: React.CSSProperties = {
    position: 'absolute',
    left: element.x,
    top: element.y,
    width: element.width,
    height: element.height,
    transform: element.rotation ? `rotate(${element.rotation}deg)` : undefined,
    zIndex: element.zIndex,
    opacity: element.style.opacity ?? 1,
    backgroundColor: element.style.backgroundColor,
    borderRadius: element.style.borderRadius,
    border: element.style.border,
    boxShadow: element.style.boxShadow,
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
