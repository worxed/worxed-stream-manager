import { Card, type CardProps } from 'primereact/card';
import { cx } from './utils';

type CardVariant = 'elevated' | 'inset' | 'accent' | 'ghost' | 'stat';

const variantClassMap: Record<CardVariant, string> = {
  elevated: 'card-elevated',
  inset: 'card-inset',
  accent: 'card-accent',
  ghost: 'card-ghost',
  stat: 'card-stat',
};

interface WCardProps extends CardProps {
  variant?: CardVariant;
}

export function WCard({ variant, ...props }: WCardProps) {
  return (
    <Card
      {...props}
      className={cx(variant && variantClassMap[variant], props.className)}
    />
  );
}
