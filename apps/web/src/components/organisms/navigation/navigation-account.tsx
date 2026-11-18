import { useTranslation } from "react-i18next";
import { cn } from "../../../lib/cn";
import { Picture } from "../../atoms/picture/picture";
import { Icon } from "../../foundations/icon/icon";
import * as Menu from "../../molecules/menu/menu";
import { linkElement, useNavigation } from "./navigation-root";

/** The account menu's items: Settings, How FPR works, Sign out. */
function AccountPopup({ fromSide }: { fromSide: boolean }) {
  const { t } = useTranslation();
  const { renderLink, onSettings, onSignOut } = useNavigation();

  return (
    <Menu.Popup
      side={fromSide ? "top" : "bottom"}
      align={fromSide ? "start" : "end"}
    >
      <Menu.Item onClick={onSettings}>{t("navigation.settings")}</Menu.Item>
      <Menu.LinkItem render={linkElement(renderLink, "help", "menu")}>
        {t("navigation.help")}
      </Menu.LinkItem>
      <Menu.Separator />
      <Menu.Item intent="danger" onClick={onSignOut}>
        {t("navigation.signOut")}
      </Menu.Item>
    </Menu.Popup>
  );
}

function AccountPicture() {
  const { account } = useNavigation();

  return (
    <Picture
      aria-hidden
      name={account.name}
      color={account.color}
      photo={account.photo ?? null}
      size="s"
    />
  );
}

/**
 * Your picture at the end of the page bar's controls, which opens the account
 * menu. Phone only: from tablet up, the side navigation holds the menu.
 */
export function AccountMenu({ className }: { className?: string }) {
  const { t } = useTranslation();
  const { account } = useNavigation();

  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label={t("navigation.account", { name: account.name })}
        className={cn(
          // The ::after box widens the 40px button's touch target to 44px.
          "relative size-xl shrink-0 cursor-pointer place-items-center rounded-full bg-transparent after:absolute after:-inset-[0.125rem]",
          "inline-grid",
          "tablet:hidden",
          "desktop:hidden",
          "hover:bg-highlight",
          "focus-visible:focus-ring",
          "popup-open:bg-highlight",
          className,
        )}
      >
        <AccountPicture />
      </Menu.Trigger>
      <AccountPopup fromSide={false} />
    </Menu.Root>
  );
}

/** Your picture at the bottom of the rail, and your name with it on the desktop sidebar. */
export function SideAccountMenu() {
  const { t } = useTranslation();
  const { account, moreIcon } = useNavigation();

  return (
    <Menu.Root>
      <Menu.Trigger
        className={cn(
          "flex cursor-pointer items-center rounded-full bg-transparent text-s font-medium text-primary",
          "size-xl justify-center gap-s self-center p-0",
          "tablet:size-xl tablet:justify-center tablet:gap-s tablet:self-center tablet:p-0",
          "desktop:h-auto desktop:w-full desktop:justify-start desktop:gap-s desktop:self-stretch desktop:px-[0.625rem] desktop:py-s",
          "hover:bg-highlight",
          "focus-visible:focus-ring",
          "popup-open:bg-highlight",
        )}
      >
        <AccountPicture />
        {/* Named by its content, so the name shown on desktop starts the name a screen reader hears. */}
        <span className="sr-only">
          {t("navigation.account", { name: account.name })}
        </span>
        <span
          aria-hidden
          className={cn(
            "min-w-0 flex-1 truncate text-start",
            "hidden",
            "tablet:hidden",
            "desktop:inline",
          )}
        >
          {account.name}
        </span>
        <Icon
          icon={moreIcon}
          size="m"
          className={cn(
            "text-secondary",
            "hidden",
            "tablet:hidden",
            "desktop:inline",
          )}
        />
      </Menu.Trigger>
      <AccountPopup fromSide />
    </Menu.Root>
  );
}
