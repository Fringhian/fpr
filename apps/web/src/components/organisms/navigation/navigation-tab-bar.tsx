import type { ComponentProps } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "../../../lib/cn";
import { Item } from "./navigation-item";
import { destinationsFor } from "./navigation-model";
import { useNavigation } from "./navigation-root";

export type TabBarProps = ComponentProps<"nav">;

/**
 * The phone's floating tab bar: a capsule 16px above the bottom edge and the
 * safe area, 80% white over a blur, opaque where the browser can't blur. The
 * page scrolls under it and leaves room for it at its end. Nothing floats
 * beside it. Hidden from tablet up.
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
        "fixed inset-x-m bottom-[calc(var(--spacing-m)+env(safe-area-inset-bottom))] z-40 font-sans",
        "block",
        "tablet:hidden",
        "desktop:hidden",
        className,
      )}
    >
      <ul
        className={cn(
          "flex rounded-full bg-surface/80 p-[0.375rem] shadow-float backdrop-blur-[1.125rem] backdrop-saturate-[1.4]",
          "",
          "",
          "",
          "not-supports-[backdrop-filter:blur(0)]:bg-surface",
        )}
      >
        {main.map((destination) => (
          <Item key={destination} destination={destination} place="tab" />
        ))}
      </ul>
    </nav>
  );
}
