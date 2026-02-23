import { InputNumber, type InputNumberProps } from 'primereact/inputnumber';
import { cx } from './utils';

export function WInputNumber(props: InputNumberProps) {
  return (
    <InputNumber
      {...props}
      className={cx('text-xs', props.className)}
      inputClassName={cx('text-xs px-2 py-1', props.inputClassName)}
    />
  );
}
