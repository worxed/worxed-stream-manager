import { InputText, type InputTextProps } from 'primereact/inputtext';
import { cx } from './utils';

interface WInputProps extends InputTextProps {
  unstyled?: boolean;
}

export function WInput({ unstyled, ...props }: WInputProps) {
  return (
    <InputText
      {...props}
      className={cx(!unstyled && 'text-xs', props.className)}
    />
  );
}
