import { Tag, type TagProps } from 'primereact/tag';
import { cx } from './utils';

type BadgePreset = 'follow' | 'donation' | 'live' | 'offline';

const badgeClassMap: Record<BadgePreset, string> = {
  follow: 'worxed-badge-follow',
  donation: 'worxed-badge-donation',
  live: 'worxed-badge-live',
  offline: 'worxed-badge-offline',
};

interface WTagProps extends TagProps {
  badge?: BadgePreset;
}

export function WTag({ badge, ...props }: WTagProps) {
  return (
    <Tag
      {...props}
      className={cx('text-xs', badge && badgeClassMap[badge], props.className)}
    />
  );
}
