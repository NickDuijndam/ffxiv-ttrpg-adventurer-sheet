import { useEffect, useRef } from "react";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  minHeight: number;
  placeholder?: string;
  className?: string;
}

export const RichTextEditor = ({
  value,
  onChange,
  minHeight,
  placeholder,
  className
}: RichTextEditorProps): JSX.Element => {
  const editorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!editorRef.current) {
      return;
    }
    if (editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  const runCommand = (command: string): void => {
    editorRef.current?.focus();
    document.execCommand(command);
    onChange(editorRef.current?.innerHTML ?? "");
  };

  return (
    <div className={`rich-text-wrap ${className ?? ""}`}>
      <div className="rte-toolbar" role="toolbar" aria-label="Text formatting">
        <button type="button" onClick={() => runCommand("bold")} aria-label="Bold">
          B
        </button>
        <button type="button" onClick={() => runCommand("italic")} aria-label="Italic">
          I
        </button>
        <button type="button" onClick={() => runCommand("underline")} aria-label="Underline">
          U
        </button>
        <button
          type="button"
          onClick={() => runCommand("insertUnorderedList")}
          aria-label="Bullet list"
        >
          List
        </button>
        <button type="button" onClick={() => runCommand("removeFormat")} aria-label="Clear format">
          Clear
        </button>
      </div>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        className="rte-editor"
        style={{ minHeight }}
        data-placeholder={placeholder ?? ""}
        onInput={() => onChange(editorRef.current?.innerHTML ?? "")}
      />
    </div>
  );
};
