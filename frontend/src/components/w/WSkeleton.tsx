import { Skeleton, type SkeletonProps } from 'primereact/skeleton';

interface WSkeletonProps extends SkeletonProps {
  pill?: boolean;
}

export function WSkeleton({ pill, ...props }: WSkeletonProps) {
  return (
    <Skeleton
      {...props}
      borderRadius={pill ? '9999px' : props.borderRadius}
    />
  );
}
