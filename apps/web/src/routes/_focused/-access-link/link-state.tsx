import { ArrowsClockwiseIcon } from "@phosphor-icons/react/ArrowsClockwise";
import { CheckCircleIcon } from "@phosphor-icons/react/CheckCircle";
import { ClockCountdownIcon } from "@phosphor-icons/react/ClockCountdown";
import { LinkBreakIcon } from "@phosphor-icons/react/LinkBreak";
import { LinkSimpleIcon } from "@phosphor-icons/react/LinkSimple";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { AccessEnded } from "../-access/access-ended";
import { AccessState } from "../-access/access-state";
import type { LinkState } from "./open-link";

const icons = {
  claimed: CheckCircleIcon,
  expired: ClockCountdownIcon,
  replaced: ArrowsClockwiseIcon,
  unknown: LinkBreakIcon,
  missing: LinkSimpleIcon,
};

/**
 * Where an access link stops, each state with its own message: expired,
 * replaced, unknown, or gone from memory, with nothing to do but ask the
 * admin or open it again; already used, which leads to sign-in. A revoked
 * link and one past the access end date say that access has ended.
 */
export function LinkStatePage({ state }: { state: LinkState }) {
  const { t } = useTranslation();

  if (state === "revoked" || state === "ended") {
    return <AccessEnded />;
  }
  return (
    <AccessState
      icon={icons[state]}
      title={t(`accessLink.${state}.title`)}
      description={t(`accessLink.${state}.description`)}
      action={
        state === "claimed"
          ? {
              nativeButton: false,
              render: <Link to="/sign-in" />,
              children: t("accessLink.claimed.action"),
            }
          : undefined
      }
    />
  );
}
