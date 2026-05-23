import { ChangeEventHandler } from "react";

interface FieldProps {
  label: string;
  value: string;
  onChange: ChangeEventHandler<HTMLInputElement>;
  type?: "text" | "number";
  className?: string;
  inputClassName?: string;
  min?: number;
  max?: number;
}

export const Field = ({
  label,
  value,
  onChange,
  type = "text",
  className,
  inputClassName,
  min,
  max
}: FieldProps): JSX.Element => (
  <label className={`sheet-field ${className ?? ""}`}>
    <span className="sheet-label">{label}</span>
    <input
      type={type}
      value={value}
      onChange={onChange}
      min={min}
      max={max}
      className={`sheet-input ${inputClassName ?? ""}`}
      inputMode={type === "number" ? "numeric" : undefined}
    />
  </label>
);
