import * as React from 'react';
import { cn } from '@/lib/utils';

interface SliderProps {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange?: (value: number) => void;
  onChangeEnd?: (value: number) => void;
  className?: string;
}

const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  ({ value, min = 0, max = 100, step = 1, onChange, onChangeEnd, className }, ref) => {
    const percentage = ((value - min) / (max - min)) * 100;

    return (
      <div className={cn('relative w-full', className)}>
        <input
          ref={ref}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange?.(Number(e.target.value))}
          onMouseUp={(e) => onChangeEnd?.(Number((e.target as HTMLInputElement).value))}
          onTouchEnd={(e) => onChangeEnd?.(Number((e.target as HTMLInputElement).value))}
          className={cn(
            'w-full h-2.5 appearance-none cursor-pointer rounded-full',
            'bg-border',
            '[&::-webkit-slider-thumb]:appearance-none',
            '[&::-webkit-slider-thumb]:w-5',
            '[&::-webkit-slider-thumb]:h-5',
            '[&::-webkit-slider-thumb]:rounded-full',
            '[&::-webkit-slider-thumb]:bg-primary',
            '[&::-webkit-slider-thumb]:shadow-md',
            '[&::-webkit-slider-thumb]:cursor-pointer',
            '[&::-webkit-slider-thumb]:transition-transform',
            '[&::-webkit-slider-thumb]:duration-150',
            '[&::-webkit-slider-thumb]:hover:scale-110',
            '[&::-moz-range-thumb]:w-5',
            '[&::-moz-range-thumb]:h-5',
            '[&::-moz-range-thumb]:rounded-full',
            '[&::-moz-range-thumb]:bg-primary',
            '[&::-moz-range-thumb]:shadow-md',
            '[&::-moz-range-thumb]:border-0',
            '[&::-moz-range-thumb]:cursor-pointer'
          )}
          style={{
            background: `linear-gradient(to right, var(--color-primary) 0%, var(--color-primary) ${percentage}%, var(--color-border) ${percentage}%, var(--color-border) 100%)`,
          }}
        />
      </div>
    );
  }
);
Slider.displayName = 'Slider';

export { Slider };
