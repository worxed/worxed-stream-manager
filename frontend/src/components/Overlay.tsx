import { useState, useEffect } from 'react';
import { socketService } from '../services/socket';
import { getActiveScene, getScene } from '../services/api';
import type { Scene } from '../types';
import ElementRenderer from './overlay/ElementRenderer';

export default function Overlay() {
  const [scene, setScene] = useState<Scene | null>(null);
  const [viewport, setViewport] = useState({ w: window.innerWidth, h: window.innerHeight });

  const params = new URLSearchParams(window.location.search);
  const sceneIdParam = params.get('scene');
  const isPreview = params.get('preview') === '1';

  // Track viewport size for scaling
  useEffect(() => {
    const update = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  useEffect(() => {
    document.body.style.background = 'transparent';
    document.body.style.margin = '0';
    document.body.style.overflow = 'hidden';
    document.documentElement.style.background = 'transparent';

    socketService.connect();

    async function loadScene() {
      if (sceneIdParam) {
        const result = await getScene(parseInt(sceneIdParam, 10));
        if (result.data) setScene(result.data);
      } else {
        const result = await getActiveScene();
        if (result.data) setScene(result.data);
      }
    }
    loadScene();

    const unsubUpdated = socketService.onSceneUpdated((updatedScene) => {
      setScene(prev => {
        if (!prev) return prev;
        if (updatedScene.id === prev.id) return updatedScene;
        return prev;
      });
    });

    const unsubActivated = socketService.onSceneActivated((activatedScene) => {
      if (!sceneIdParam) setScene(activatedScene);
    });

    return () => {
      unsubUpdated();
      unsubActivated();
    };
  }, [sceneIdParam]);

  if (!scene) return null;

  // Scale scene to fit the viewport while preserving aspect ratio.
  // In OBS: viewport === scene dimensions → scale = 1 (pixel-perfect).
  // In browser/preview: scale < 1 → letterboxed, shows exactly what OBS composites.
  const scale = Math.min(viewport.w / scene.width, viewport.h / scene.height);
  const offsetX = Math.round((viewport.w - scene.width * scale) / 2);
  const offsetY = Math.round((viewport.h - scene.height * scale) / 2);

  const sortedElements = [...scene.elements]
    .filter(el => el.visible)
    .sort((a, b) => a.zIndex - b.zIndex);

  const checkerBackground = isPreview ? `
    linear-gradient(45deg, #383838 25%, transparent 25%),
    linear-gradient(-45deg, #383838 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #383838 75%),
    linear-gradient(-45deg, transparent 75%, #383838 75%)
  ` : 'transparent';

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        // Letterbox areas: solid dark so they read as "out of frame"
        backgroundColor: isPreview ? '#0e0e0e' : 'transparent',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: offsetY,
          left: offsetX,
          width: scene.width,
          height: scene.height,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          // Scene area: checker shows transparent regions inside the canvas
          background: isPreview ? checkerBackground : 'transparent',
          backgroundColor: isPreview ? '#2a2a2a' : 'transparent',
          backgroundSize: isPreview ? '16px 16px' : undefined,
          backgroundPosition: isPreview ? '0 0, 0 8px, 8px -8px, -8px 0px' : undefined,
          fontFamily: 'Inter, system-ui, sans-serif',
        }}
      >
        {sortedElements.map((element) => (
          <ElementRenderer key={element.id} element={element} />
        ))}
      </div>
    </div>
  );
}
