import { useEffect, useState, type RefObject } from 'react';
import type { ViewportHandle } from '../scene/KitchenViewport';
import { downloadBlob } from './downloadFile';
import type { ViewMode } from './ViewBar';

const FRAMES_BEFORE_CAPTURE = 2;

function waitFrames(count: number): Promise<void> {
  return new Promise((resolve) => {
    const step = (remaining: number) => (remaining === 0 ? resolve() : window.requestAnimationFrame(() => step(remaining - 1)));
    step(count);
  });
}

export function useViewControls(viewportRef: RefObject<ViewportHandle | null>, beforeSnapshot?: () => void) {
  const [view, setView] = useState<ViewMode>('perspective');
  const [isEvening, setIsEvening] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = isEvening ? 'night' : 'day';
  }, [isEvening]);

  const changeView = (next: ViewMode) => {
    setView(next);
    if (next === 'top') viewportRef.current?.showTop();
    else if (next === 'eye') viewportRef.current?.showEye();
    else viewportRef.current?.showPerspective();
  };

  const saveSnapshot = async () => {
    beforeSnapshot?.();
    await waitFrames(FRAMES_BEFORE_CAPTURE);
    const image = await viewportRef.current?.captureImage();
    if (image) downloadBlob(image, `kuhnya-${new Date().toISOString().slice(0, 10)}.png`);
  };

  return { view, isEvening, changeView, saveSnapshot, toggleEvening: () => setIsEvening((current) => !current), zoomBy: (factor: number) => viewportRef.current?.zoomBy(factor) };
}
