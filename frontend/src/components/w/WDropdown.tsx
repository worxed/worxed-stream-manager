import { Dropdown, type DropdownProps } from 'primereact/dropdown';
import { cx } from './utils';

export function WDropdown(props: DropdownProps) {
  return <Dropdown {...props} className={cx('text-xs', props.className)} />;
}
