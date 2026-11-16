// The focus panel's parts, imported as a namespace: `import * as FocusPanel from "…/focus-panel"`.
import type { Period } from "@fpr/contracts";
import { type ComponentProps, useId } from "react";
import { useTranslation } from "react-i18next";
import type { GainInput, GainUnit } from "../../../lib/gain";
import type { Mover } from "../mover-row/mover-row";
import {
  type BackLinkProps,
  Gain,
  Header,
  type Member,
  Movers,
  PageLink,
  type PageLinkProps,
  Root,
} from "./focus-panel-parts";

export {
  type BackLinkProps,
  Gain,
  Header,
  type Member,
  Movers,
  PageLink,
  type PageLinkProps,
  Root,
} from "./focus-panel-parts";

export type BasicProps = {
  /** The member the viewer looks at. */
  member: Member;
  /** `true` when the member is the viewer: “Your month”, “What moved you”, and a link to their portfolio. */
  you: boolean;
  /** The period setting, which names the panel's span: “Their month”. */
  period: Period;
  /** The unit setting, `eur` or `percent`. The gain reads in it, with the other unit beside it when the viewer has both. */
  unit: GainUnit;
  /** The member's gain over the period: `{ eur, percent }`. An anonymous viewer has no `eur`. */
  gain: GainInput;
  /** The holdings that moved their period, biggest effect first. Empty, the panel says nothing has moved yet. */
  movers: readonly Mover[];
  /** Their page, or the viewer's portfolio when `you`: an `href` or a `render`, and optionally the `toPageIcon` that ends it. */
  pageLink: Omit<PageLinkProps, "children">;
  /** “Back to you”, which focuses the viewer again. Shown when another member is focused and the viewer has a portfolio; leave it out for a guest or an anonymous viewer. */
  backLink?: BackLinkProps | null | undefined;
} & Omit<
  ComponentProps<"section">,
  | "member"
  | "you"
  | "period"
  | "unit"
  | "gain"
  | "movers"
  | "pageLink"
  | "backLink"
  | "children"
>;

/**
 * The member the viewer looks at on Home, the viewer by default: their
 * picture and name, their gain over the period, the holdings that moved it,
 * and a link to their page. A card that fills the width it is given: a
 * narrow column beside the race on desktop, the full width under it on tablet
 * and phone. Its card rests on an outline; `className="shadow-rest"` lifts it
 * as the first card under the sky.
 */
export function Basic({
  member,
  you,
  period,
  unit,
  gain,
  movers,
  pageLink,
  backLink,
  ...props
}: BasicProps) {
  const { t } = useTranslation();
  const titleId = useId();

  return (
    <Root aria-labelledby={titleId} {...props}>
      <Header
        titleId={titleId}
        member={member}
        you={you}
        period={period}
        backLink={you ? null : backLink}
      />
      <Gain gain={gain} unit={unit} />
      <Movers you={you} movers={movers} unit={unit} />
      <PageLink {...pageLink}>
        {you
          ? t("focusPanel.open.you")
          : t("focusPanel.open.them", { name: member.name })}
      </PageLink>
    </Root>
  );
}
