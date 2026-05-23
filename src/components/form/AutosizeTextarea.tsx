import { ChangeEvent, TextareaHTMLAttributes, useLayoutEffect, useRef } from "react";

interface AutosizeTextareaProps
  extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "onChange" | "value"> {
  value: string;
  onChange: (value: string) => void;
}

export const AutosizeTextarea = ({
  value,
  onChange,
  className,
  ...props
}: AutosizeTextareaProps): JSX.Element => {
  const ref = useRef<HTMLTextAreaElement | null>(null);

  const resize = (): void => {
    if (!ref.current) {
      return;
    }
    ref.current.style.height = "0px";
    ref.current.style.height = `${ref.current.scrollHeight}px`;
  };

  useLayoutEffect(() => {
    resize();
  }, [value]);

  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>): void => {
    onChange(event.target.value);
  };

  return (
    <textarea
      {...props}
      ref={ref}
      value={value}
      onChange={handleChange}
      className={`sheet-textarea ${className ?? ""}`}
    />
  );
};
