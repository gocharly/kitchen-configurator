import { useEffect, useRef, useState } from 'react';
import type { ModuleSpec } from '../domain/catalog';
import { peekModulePreview, requestModulePreview } from '../scene/modulePreview';

const PREFETCH_MARGIN = '240px';

interface ModulePreviewProps {
  spec: ModuleSpec;
  facadeColorId: string;
  bodyColorId: string;
}

function useIsNearViewport(holder: React.RefObject<HTMLElement | null>): boolean {
  const [isNear, setIsNear] = useState(false);
  useEffect(() => {
    const element = holder.current;
    if (isNear || !element) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) setIsNear(true);
    }, { rootMargin: PREFETCH_MARGIN });
    observer.observe(element);
    return () => observer.disconnect();
  }, [holder, isNear]);
  return isNear;
}

export function ModulePreview({ spec, facadeColorId, bodyColorId }: ModulePreviewProps) {
  const holder = useRef<HTMLSpanElement>(null);
  const isNear = useIsNearViewport(holder);
  const colors = { facadeColorId, bodyColorId };
  const [url, setUrl] = useState<string | null>(() => peekModulePreview(spec, colors));

  useEffect(() => {
    if (!isNear) return;
    let isCurrent = true;
    requestModulePreview(spec, { facadeColorId, bodyColorId }).then((ready) => {
      if (isCurrent) setUrl(ready);
    });
    return () => {
      isCurrent = false;
    };
  }, [isNear, spec, facadeColorId, bodyColorId]);

  if (!url) return <span ref={holder} className="module-preview" />;
  return <img className="module-preview" src={url} alt="" draggable={false} />;
}
