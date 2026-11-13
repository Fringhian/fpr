import type { ReactNode } from "react";

const ROOT_FONT_SIZE = 16;

function readToken(variable: string): string {
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(variable)
    .trim();
  const rem = /^(-?[\d.]+)rem$/.exec(value);
  return rem ? `${value} · ${Number(rem[1]) * ROOT_FONT_SIZE}px` : value;
}

/** The value of a theme variable as `theme.css` defines it, read from the page. */
export function TokenValue({ variable }: { variable: `--${string}` }) {
  return (
    <code className="text-xs text-ink-soft tabular-nums">
      {readToken(variable)}
    </code>
  );
}

/** A Foundations page: a title, what the tokens are for, and their specimens. */
export function Specimen({
  title,
  lead,
  children,
}: {
  title: string;
  lead: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-dvh bg-snow p-l font-sans text-ink">
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="mt-xs mb-l max-w-[70ch] text-m text-ink-soft">{lead}</p>
      {children}
    </main>
  );
}
