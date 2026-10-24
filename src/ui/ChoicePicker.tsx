interface ChoiceOption {
  id: string;
  title: string;
}

interface ChoicePickerProps {
  label: string;
  options: ChoiceOption[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function ChoicePicker({ label, options, selectedId, onSelect }: ChoicePickerProps) {
  return (
    <div className="color-picker">
      <div className="color-picker-head">
        <span className="stepper-label">{label}</span>
      </div>
      <div className="choice-options" role="radiogroup" aria-label={label}>
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={option.id === selectedId}
            className="choice-chip"
            onClick={() => onSelect(option.id)}
          >
            {option.title}
          </button>
        ))}
      </div>
    </div>
  );
}
