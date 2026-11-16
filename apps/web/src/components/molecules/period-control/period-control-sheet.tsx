import { useTranslation } from "react-i18next";
import { cn } from "../../../lib/cn";
import * as Segment from "../../atoms/segment/segment";
import { Icon, type IconProps } from "../../foundations/icon/icon";
import * as Dialog from "../dialog/dialog";
import {
  Segments,
  type SegmentsProps,
  UNIT_KEYS,
} from "./period-control-segments";

/** Hovered or open, the capsule's fill goes opaque; at rest it is `Segment.backdropFill`. */
const CAPSULE_ACTIVE = {
  sky: ["hover:bg-surface", "popup-open:bg-surface"],
  snow: ["hover:bg-divider", "popup-open:bg-divider"],
} as const satisfies Record<Segment.Backdrop, readonly string[]>;

const capsule = cn(
  // The ::after box widens the 36px capsule's touch target to 44px.
  "relative cursor-pointer items-center gap-xs whitespace-nowrap rounded-full py-s pr-[0.625rem] pl-[0.75rem] text-s font-semibold text-primary after:absolute after:inset-x-0 after:top-1/2 after:h-[2.75rem] after:-translate-y-1/2",
  "inline-flex",
  "tablet:hidden",
  "desktop:hidden",
  "focus-visible:focus-ring",
);

/** The phone's one capsule, “This month · %”, and the sheet it opens holding both rows. */
export function PhoneSheet({
  setting,
  anonymous,
  backdrop,
  icon,
  onChange,
}: Omit<SegmentsProps, "className"> & {
  icon: IconProps["icon"] | undefined;
}) {
  const { t } = useTranslation();

  const period = t(`periodControl.period.${setting.period}`);
  const summary = anonymous
    ? period
    : t("periodControl.summary", {
        period,
        unit: t(`controls.unit.${UNIT_KEYS[setting.unit]}`),
      });

  return (
    <Dialog.Root>
      <Dialog.Trigger
        className={cn(
          capsule,
          Segment.backdropFill[backdrop],
          CAPSULE_ACTIVE[backdrop],
        )}
      >
        {summary}
        {icon ? <Icon icon={icon} size="s" /> : null}
      </Dialog.Trigger>
      <Dialog.Popup>
        <Dialog.Header>
          <Dialog.Title>{t("periodControl.title")}</Dialog.Title>
          <Dialog.Close />
        </Dialog.Header>
        <Segments
          setting={setting}
          anonymous={anonymous}
          backdrop="snow"
          onChange={onChange}
          className="self-start"
        />
      </Dialog.Popup>
    </Dialog.Root>
  );
}
