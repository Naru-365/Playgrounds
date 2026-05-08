import { ReactNode } from "react";

export default function Card({
  title,
  action,
  children,
  className = "",
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`card mx-4 my-3 p-4 ${className}`}>
      {(title || action) && (
        <header className="mb-3 flex items-center justify-between">
          {title && <h2 className="text-sm font-semibold text-[var(--ink)]">{title}</h2>}
          {action}
        </header>
      )}
      {children}
    </section>
  );
}
