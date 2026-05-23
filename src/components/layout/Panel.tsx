import { ReactNode } from "react";

interface PanelProps {
  title?: string;
  className?: string;
  children: ReactNode;
}

export const Panel = ({ title, className, children }: PanelProps): JSX.Element => (
  <section className={`sheet-panel ${className ?? ""}`}>
    {title ? <h3 className="panel-title">{title}</h3> : null}
    {children}
  </section>
);
