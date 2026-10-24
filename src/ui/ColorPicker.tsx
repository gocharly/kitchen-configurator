import type { ColorOption } from '../domain/catalog';

interface ColorPickerProps {
  label: string;
  options: ColorOption[];
  selectedId: string;
  onSelect: (id: string) => void;
}

export function ColorPicker({ label, options, selectedId, onSelect }: ColorPickerProps) {
  const selected = options.find((option) => option.id === selectedId);
  return (
    <div className="color-picker">
      <div className="color-picker-head">
        <span className="stepper-label">{label}</span>
        <span className="color-picker-name">{selected?.title}</span>
      </div>
      <div className="color-picker-options" role="radiogroup" aria-label={label}>
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={option.id === selectedId}
            aria-label={option.title}
            className="swatch"
            style={{ backgroundColor: option.hex }}
            onClick={() => onSelect(option.id)}
          />
        ))}
      </div>
    </div>
  );
}
