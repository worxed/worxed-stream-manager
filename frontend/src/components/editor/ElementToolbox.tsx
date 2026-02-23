import { Bell, MessageSquare, Type, ImageIcon, Zap, Eye, EyeOff, Lock, Unlock, GripVertical } from 'lucide-react';
import { useEditorStore, useCurrentScene } from '../../stores/editorStore';
import type { ElementType } from '../../types';

const ELEMENT_ICONS: Record<ElementType, React.ReactNode> = {
  'alert-box': <Bell size={14} />,
  'chat': <MessageSquare size={14} />,
  'text': <Type size={14} />,
  'image': <ImageIcon size={14} />,
  'custom-event': <Zap size={14} />,
};

const ADD_ITEMS: { type: ElementType; label: string; icon: React.ReactNode }[] = [
  { type: 'alert-box', label: 'Alert Box', icon: <Bell size={16} /> },
  { type: 'chat', label: 'Chat', icon: <MessageSquare size={16} /> },
  { type: 'text', label: 'Text', icon: <Type size={16} /> },
  { type: 'image', label: 'Image', icon: <ImageIcon size={16} /> },
  { type: 'custom-event', label: 'Custom Event', icon: <Zap size={16} /> },
];

export default function ElementToolbox() {
  const scene = useCurrentScene();
  const selectedIds = useEditorStore(s => s.selectedIds);
  const addElement = useEditorStore(s => s.addElement);
  const select = useEditorStore(s => s.select);
  const toggleVisibility = useEditorStore(s => s.toggleVisibility);
  const toggleLock = useEditorStore(s => s.toggleLock);
  const reorder = useEditorStore(s => s.reorder);

  const elements = scene?.elements || [];
  // Sort by zIndex descending for layer display (top layer first)
  const sortedElements = [...elements].sort((a, b) => b.zIndex - a.zIndex);

  return (
    <div className="flex flex-col h-full">
      {/* Add Element Section */}
      <div className="p-3 border-b border-border">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Add Element</h3>
        <div className="grid grid-cols-2 gap-1.5">
          {ADD_ITEMS.map((item) => (
            <button
              key={item.type}
              onClick={() => addElement(item.type)}
              className="flex items-center gap-1.5 px-2 py-1.5 text-xs rounded-lg border border-border bg-background hover:bg-accent hover:border-primary/30 transition-colors text-foreground"
            >
              <span className="text-muted-foreground">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Layers Section */}
      <div className="flex-1 overflow-y-auto p-3">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Layers</h3>
        {sortedElements.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No elements yet</p>
        ) : (
          <div className="flex flex-col gap-0.5">
            {sortedElements.map((el) => (
              <div
                key={el.id}
                onClick={(e) => select(el.id, e.shiftKey)}
                className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg cursor-pointer transition-colors group text-xs ${
                  selectedIds.has(el.id)
                    ? 'bg-primary/10 border border-primary/30'
                    : 'hover:bg-accent border border-transparent'
                }`}
              >
                <GripVertical size={12} className="text-muted-foreground opacity-0 group-hover:opacity-100 shrink-0 cursor-grab" />
                <span className="text-muted-foreground shrink-0">{ELEMENT_ICONS[el.type]}</span>
                <span className={`flex-1 truncate ${!el.visible ? 'opacity-40' : ''}`}>
                  {el.name}
                </span>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100">
                  <button
                    onClick={(e) => { e.stopPropagation(); reorder(el.id, 'up'); }}
                    className="p-0.5 hover:bg-accent rounded text-muted-foreground"
                    title="Move up (higher z-index)"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 15l-6-6-6 6"/></svg>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); reorder(el.id, 'down'); }}
                    className="p-0.5 hover:bg-accent rounded text-muted-foreground"
                    title="Move down (lower z-index)"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
                  </button>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); toggleVisibility(el.id); }}
                  className="p-0.5 hover:bg-accent rounded text-muted-foreground"
                >
                  {el.visible ? <Eye size={12} /> : <EyeOff size={12} />}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); toggleLock(el.id); }}
                  className="p-0.5 hover:bg-accent rounded text-muted-foreground"
                >
                  {el.locked ? <Lock size={12} /> : <Unlock size={12} />}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
