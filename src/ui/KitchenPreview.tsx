import { useMemo } from 'react';
import type { Kitchen } from '../domain/kitchen';
import { renderKitchenPreview } from '../scene/modulePreview';

interface KitchenPreviewProps {
  kitchen: Kitchen;
}

export function KitchenPreview({ kitchen }: KitchenPreviewProps) {
  const url = useMemo(() => renderKitchenPreview(kitchen), [kitchen]);
  return <img className="kitchen-preview" src={url} alt="" draggable={false} />;
}
