import { useState, useEffect } from 'react';
import { socketService } from '../services/socket';
import { getActiveScene, getScene } from '../services/api';
import type { Scene } from '../types';
import ElementRenderer from './overlay/ElementRenderer';

export default function Overlay() {
  const [scene, setScene] = useState<Scene | null>(null);

  // Allow ?scene=<id> URL param to override active scene
  const params = new URLSearchParams(window.location.search);
  const sceneIdParam = params.get('scene');

  useEffect(() => {
    // Transparent background for OBS compositing
    document.body.style.background = 'transparent';
    document.body.style.margin = '0';
    document.body.style.overflow = 'hidden';
    document.documentElement.style.background = 'transparent';

    socketService.connect();

    // Load scene
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

    // Live updates from editor
    const unsubUpdated = socketService.onSceneUpdated((updatedScene) => {
      setScene(prev => {
        if (!prev) return prev;
        if (updatedScene.id === prev.id) return updatedScene;
        return prev;
      });
    });

    // Scene activation — reload if we're showing the active scene (no ?scene= param)
    const unsubActivated = socketService.onSceneActivated((activatedScene) => {
      if (!sceneIdParam) {
        setScene(activatedScene);
      }
    });

    return () => {
      unsubUpdated();
      unsubActivated();
    };
  }, [sceneIdParam]);

  if (!scene) return null;

  // Sort elements by zIndex
  const sortedElements = [...scene.elements]
    .filter(el => el.visible)
    .sort((a, b) => a.zIndex - b.zIndex);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: scene.width,
        height: scene.height,
        background: 'transparent',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      {sortedElements.map((element) => (
        <ElementRenderer key={element.id} element={element} />
      ))}
    </div>
  );
}
