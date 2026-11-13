import type { ReactNode } from "react";

const ROOT_FONT_SIZE = 16;

/** A CSS variable's value as the page computes it from `theme.css`. */
export function readToken(variable: `--${string}`): string {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(variable)
    .trim();
}

/** A token's value, with its pixel size when it is in rem. */
export function TokenValue({ variable }: { variable: `--${string}` }) {
  const value = readToken(variable);
  const rem = /^(-?[\d.]+)rem$/.exec(value);
  return (
    <code className="text-xs text-secondary tabular-nums">
      {rem ? `${value} · ${Number(rem[1]) * ROOT_FONT_SIZE}px` : value}
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
    <main className="min-h-dvh bg-page p-l font-sans text-primary">
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="mt-xs mb-l max-w-[70ch] text-m text-secondary">{lead}</p>
      {children}
    </main>
  );
}
