import { useId } from 'react';

interface TextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'tel';
  multiline?: boolean;
  maxLength?: number;
}

export function TextField({ label, value, onChange, type = 'text', multiline = false, maxLength }: TextFieldProps) {
  const id = useId();
  return (
    <div className="text-field">
      <label className="stepper-label" htmlFor={id}>
        {label}
      </label>
      {multiline ? (
        <textarea
          id={id}
          className="field-input"
          value={value}
          rows={3}
          maxLength={maxLength}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <input
          id={id}
          className="field-input"
          type={type}
          value={value}
          maxLength={maxLength}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </div>
  );
}
