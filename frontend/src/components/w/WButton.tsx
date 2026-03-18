import { Button, type ButtonProps } from 'primereact/button';
import { cx } from './utils';

export function WButton(props: ButtonProps) {
  return <Button {...props} className={cx('gap-1.5', props.className)} />;
}
