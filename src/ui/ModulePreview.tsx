import { useMemo } from 'react';
import type { ModuleSpec } from '../domain/catalog';
import { renderModulePreview } from '../scene/modulePreview';

interface ModulePreviewProps {
  spec: ModuleSpec;
  facadeColorId: string;
  bodyColorId: string;
}

export function ModulePreview({ spec, facadeColorId, bodyColorId }: ModulePreviewProps) {
  const url = useMemo(() => renderModulePreview(spec, { facadeColorId, bodyColorId }), [spec, facadeColorId, bodyColorId]);
  return <img className="module-preview" src={url} alt="" draggable={false} />;
}
