import { InputTextarea, type InputTextareaProps } from 'primereact/inputtextarea';
import { cx } from './utils';

export function WTextarea(props: InputTextareaProps) {
  return (
    <InputTextarea
      {...props}
      autoResize
      className={cx('text-xs', props.className)}
    />
  );
}
