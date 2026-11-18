import type { ComponentProps } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "../../../lib/cn";
import { Item } from "./navigation-item";
import { destinationsFor } from "./navigation-model";
import { useNavigation } from "./navigation-root";

export type TabBarProps = ComponentProps<"nav">;

/**
 * The phone's floating tab bar: a frosted capsule 16px above the bottom edge
 * and the safe area. The page scrolls under it and leaves `--tab-bar-room`
 * for it at its end. Nothing floats beside it. Hidden from tablet up. It
 * has its own view transition name, so it holds still while a page slides.
 */
export function TabBar({ className, ...props }: TabBarProps) {
  const { t } = useTranslation();
  const { userRole } = useNavigation();

  const { main } = destinationsFor(userRole);

  return (
    <nav
      aria-label={t("navigation.label")}
      {...props}
      className={cn(
        "fixed inset-x-m bottom-[calc(var(--spacing-m)+env(safe-area-inset-bottom))] z-40 font-sans [view-transition-name:tab-bar]",
        "block",
        "tablet:hidden",
        "desktop:hidden",
        className,
      )}
    >
      <ul
        className={cn(
          "frosted flex rounded-full p-[0.375rem] shadow-float",
          "",
          "",
          "",
          "tab-sliding:bg-surface",
        )}
      >
        {main.map((destination) => (
          <Item key={destination} destination={destination} place="tab" />
        ))}
      </ul>
    </nav>
  );
}
