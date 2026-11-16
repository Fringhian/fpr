import type { ReactNode } from "react";
import { cssVariable } from "../lib/css-variable";

const ROOT_FONT_SIZE = 16;

/** A token's value, with its pixel size when it is in rem. */
export function TokenValue({ variable }: { variable: `--${string}` }) {
  const value = cssVariable(variable);
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
    <main className="bg-page p-l font-sans text-primary">
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="mt-xs mb-l max-w-[70ch] text-m text-secondary">{lead}</p>
      {children}
    </main>
  );
}
