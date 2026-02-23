import { Panel, type PanelProps } from 'primereact/panel';
import { cx } from './utils';

type PanelVariant = 'elevated' | 'inset' | 'accent' | 'ghost' | 'stat';

const variantClassMap: Record<PanelVariant, string> = {
  elevated: 'card-elevated',
  inset: 'card-inset',
  accent: 'card-accent',
  ghost: 'card-ghost',
  stat: 'card-stat',
};

interface WPanelProps extends PanelProps {
  variant?: PanelVariant;
}

export function WPanel({ variant, ...props }: WPanelProps) {
  return (
    <Panel
      {...props}
      className={cx(variant && variantClassMap[variant], props.className)}
    />
  );
}
