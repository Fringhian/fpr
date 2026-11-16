import { type ComponentProps, useId } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "../../../lib/cn";
import { SideAccountMenu } from "./navigation-account";
import { Item } from "./navigation-item";
import { type Destination, destinationsFor } from "./navigation-model";
import { useNavigation } from "./navigation-root";

/** The admin area's items, named “Admin” on desktop, after a line on tablet. */
function AdminGroup({
  destinations,
}: {
  destinations: readonly Destination[];
}) {
  const { t } = useTranslation();
  const labelId = useId();

  return (
    <>
      <p
        id={labelId}
        className={cn(
          "text-xs font-semibold text-secondary",
          "sr-only",
          "tablet:sr-only",
          "desktop:not-sr-only desktop:px-[0.75rem] desktop:pt-[0.875rem] desktop:pb-xs",
        )}
      >
        {t("navigation.admin")}
      </p>
      <ul
        aria-labelledby={labelId}
        className={cn(
          "flex flex-col border-divider",
          "mt-s gap-xs border-t-[1.5px] pt-s",
          "tablet:mt-s tablet:gap-xs tablet:border-t-[1.5px] tablet:pt-s",
          "desktop:mt-0 desktop:gap-[0.125rem] desktop:border-t-0 desktop:pt-0",
        )}
      >
        {destinations.map((destination) => (
          <Item key={destination} destination={destination} place="side" />
        ))}
      </ul>
    </>
  );
}

function Brand() {
  const { t } = useTranslation();

  return (
    <p
      className={cn(
        "text-m font-semibold tracking-[0.08em]",
        "pb-[0.75rem] text-center",
        "tablet:px-0 tablet:pb-[0.75rem] tablet:text-center",
        "desktop:px-[0.625rem] desktop:pb-[0.875rem] desktop:text-start",
      )}
    >
      {t("navigation.brand")}
    </p>
  );
}

export type SideProps = ComponentProps<"nav">;

/**
 * The navigation beside the page: a rail on tablet, each icon above its name,
 * and a sidebar on desktop, each icon before its name. The account menu sits at
 * its bottom. Hidden on phone, where the tab bar and the page bar take its place.
 */
export function Side({ className, ...props }: SideProps) {
  const { t } = useTranslation();
  const { userRole } = useNavigation();

  const { main, admin } = destinationsFor(userRole);

  return (
    <nav
      aria-label={t("navigation.label")}
      {...props}
      className={cn(
        "sticky top-0 h-dvh shrink-0 flex-col overflow-y-auto border-e-[1.5px] border-divider bg-page pb-[calc(var(--spacing-m)+env(safe-area-inset-bottom))] font-sans text-primary",
        "hidden",
        "tablet:flex tablet:w-[5.25rem] tablet:gap-xs tablet:px-s tablet:pt-[calc(var(--spacing-m)+var(--safe-top))]",
        "desktop:flex desktop:w-[12.5rem] desktop:gap-[0.125rem] desktop:px-[0.75rem] desktop:pt-[calc(1.125rem+var(--safe-top))]",
        className,
      )}
    >
      <Brand />
      <ul
        className={cn(
          "flex flex-col",
          "gap-xs",
          "tablet:gap-xs",
          "desktop:gap-[0.125rem]",
        )}
      >
        {main.map((destination) => (
          <Item key={destination} destination={destination} place="side" />
        ))}
      </ul>
      {admin.length > 0 ? <AdminGroup destinations={admin} /> : null}
      <div
        className={cn(
          "mt-auto flex flex-col border-divider",
          "pt-s",
          "tablet:border-t-0 tablet:pt-s",
          "desktop:border-t-[1.5px] desktop:pt-s",
        )}
      >
        <SideAccountMenu />
      </div>
    </nav>
  );
}
