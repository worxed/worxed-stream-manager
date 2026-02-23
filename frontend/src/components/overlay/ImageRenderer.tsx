import { useState, useEffect } from 'react';
import type { SceneElement, ImageConfig } from '../../types';
import { useDataBinding } from '../../hooks/useDataBinding';

interface Props {
  element: SceneElement;
}

export default function ImageRenderer({ element }: Props) {
  const [error, setError] = useState(false);
  const config = element.config as ImageConfig;
  const { boundValue } = useDataBinding(config.dataBinding, 'image');
  const src = boundValue ?? config.src ?? '';

  // Reset error state when src changes (e.g. from data binding)
  useEffect(() => {
    setError(false);
  }, [src]);
  const objectFit = config.objectFit || 'contain';

  if (!src || error) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#666',
          fontSize: 14,
          fontFamily: 'Inter, system-ui, sans-serif',
        }}
      >
        {error ? 'Failed to load image' : 'No image URL set'}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={element.name}
      onError={() => setError(true)}
      style={{
        width: '100%',
        height: '100%',
        objectFit,
        display: 'block',
      }}
    />
  );
}
