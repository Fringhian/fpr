import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import * as Popover from "../components/molecules/popover/popover";

/** The sections of How FPR works, in the page's order. Each is a fragment of its address: `/help#cash`. */
export const HELP_SECTIONS = [
  "race",
  "periods",
  "today",
  "record",
  "cash",
  "search",
  "manual",
  "missing",
  "splits",
  "credits",
] as const;

export type HelpSection = (typeof HELP_SECTIONS)[number];

export type HelpInfoProps = {
  /** The section of How FPR works that explains it in full. */
  section: HelpSection;
  /** Names the idea: the popover's heading and the button's label. */
  title: string;
  /** The one or two sentences that explain it. */
  children: ReactNode;
} & Pick<Popover.PopupProps, "side" | "align">;

/** “More in How FPR works”, through the router, to `section`. */
function HelpLink({ section }: { section: HelpSection }) {
  return (
    <Popover.HelpLink
      section={section}
      render={<Link to="/help" hash={section} />}
    />
  );
}

/**
 * ⓘ beside an idea that needs a sentence. A press opens its explanation and
 * “More in How FPR works”, which leads to its section; nothing opens it by
 * itself.
 */
export function HelpInfo({
  section,
  title,
  side,
  align,
  children,
}: HelpInfoProps) {
  return (
    <Popover.Root>
      <Popover.InfoTrigger label={title} />
      <Popover.Popup side={side} align={align}>
        <Popover.Title>{title}</Popover.Title>
        <Popover.Description>{children}</Popover.Description>
        <HelpLink section={section} />
      </Popover.Popup>
    </Popover.Root>
  );
}

/**
 * The same explanation written out, where an ⓘ would open a second overlay,
 * such as inside a sheet: its sentences, then “More in How FPR works”.
 */
export function HelpNote({
  section,
  children,
}: {
  section: HelpSection;
  children: ReactNode;
}) {
  return (
    <div className="text-s text-secondary">
      <p>{children}</p>
      <HelpLink section={section} />
    </div>
  );
}
