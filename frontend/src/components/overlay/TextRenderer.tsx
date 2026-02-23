import type { SceneElement, TextConfig } from '../../types';
import { useDataBinding } from '../../hooks/useDataBinding';

interface Props {
  element: SceneElement;
}

export default function TextRenderer({ element }: Props) {
  const config = element.config as TextConfig;
  const { boundValue } = useDataBinding(config.dataBinding, 'text');
  const content = boundValue ?? config.content ?? '';
  const fontWeight = config.fontWeight || 'normal';
  const lineHeight = config.lineHeight || 1.5;
  const style = element.style;

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: style.textAlign === 'center' ? 'center' : style.textAlign === 'right' ? 'flex-end' : 'flex-start',
        fontFamily: style.fontFamily || 'Inter, system-ui, sans-serif',
        fontSize: style.fontSize || 24,
        fontWeight,
        lineHeight,
        color: style.color || '#ffffff',
        padding: style.padding || 8,
        textAlign: (style.textAlign as React.CSSProperties['textAlign']) || 'left',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        overflow: 'hidden',
      }}
    >
      {content}
    </div>
  );
}
