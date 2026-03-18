import { InputSwitch, type InputSwitchProps } from 'primereact/inputswitch';
import { cx } from './utils';

export function WSwitch(props: InputSwitchProps) {
  return <InputSwitch {...props} className={cx('!w-8 !h-4', props.className)} />;
}
