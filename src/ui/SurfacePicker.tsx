import type { SurfaceOption } from '../domain/catalog';
import { getSurfacePreviewUrl } from '../scene/surfaceTextures';

interface SurfacePickerProps {
  label: string;
  options: SurfaceOption[];
  selectedId: string;
  onSelect: (id: string) => void;
}

export function SurfacePicker({ label, options, selectedId, onSelect }: SurfacePickerProps) {
  const selected = options.find((option) => option.id === selectedId);
  return (
    <div className="color-picker">
      <div className="color-picker-head">
        <span className="stepper-label">{label}</span>
        <span className="color-picker-name">{selected?.title}</span>
      </div>
      <div className="surface-grid" role="radiogroup" aria-label={label}>
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={option.id === selectedId}
            aria-label={option.title}
            title={option.title}
            className="surface-tile"
            onClick={() => onSelect(option.id)}
          >
            <img src={getSurfacePreviewUrl(option)} alt="" width={96} height={96} draggable={false} />
          </button>
        ))}
      </div>
    </div>
  );
}
