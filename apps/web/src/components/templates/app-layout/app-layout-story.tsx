import type { Role } from "@fpr/contracts";
import { useTranslation } from "react-i18next";
import { Card } from "../../atoms/card/card";
import {
  PeriodControl,
  type PeriodSetting,
} from "../../molecules/period-control/period-control";
import * as Navigation from "../../organisms/navigation/navigation";
import * as PageBar from "../../organisms/page-bar/page-bar";

// The demo page every app-frame story shows: its bar and its cards. They are
// the stories' content, not the layout's.

/** The signed-in person each role's stories show: invented names, and a pseudonym for the anonymous viewer, who has no photo. */
export const ACCOUNTS = {
  admin: { name: "Alex", color: "cobalt" },
  member: { name: "Sam", color: "vermilion" },
  guest: { name: "Lea", color: "green" },
  anonymous: { name: "Quiet Otter", color: "lime" },
} as const satisfies Record<Role, Navigation.Account>;

/** A navigation item's page, or `none` for How FPR works, a page without an item. */
export type StoryPage = Navigation.Destination | "none";

/** Whether the page shows the period control: the four main pages do. */
export function showsPeriod(page: StoryPage): boolean {
  return (
    page === "home" ||
    page === "members" ||
    page === "portfolio" ||
    page === "shares"
  );
}

/** The page's name: its navigation item's, or How FPR works. */
export function usePageName(page: StoryPage): string {
  const { t } = useTranslation();

  return page === "none" ? t("navigation.help") : t(`navigation.items.${page}`);
}

/**
 * The bar's left end: the page's title, its heading on snow, or with `back`
 * a link back to the page's item.
 */
export function StoryBarStart({
  page,
  back = false,
  heading = false,
}: {
  page: StoryPage;
  back?: boolean;
  heading?: boolean;
}) {
  const name = usePageName(page);

  return back && page !== "none" ? (
    <PageBar.Back href={Navigation.HREFS[page]}>{name}</PageBar.Back>
  ) : (
    <PageBar.Title render={heading ? (props) => <h1 {...props} /> : undefined}>
      {name}
    </PageBar.Title>
  );
}

/** The bar's right end: the period with `period`, then the account menu, which shows on phone only. */
export function StoryBarControls({
  period,
  setting,
  onChange,
  backdrop,
  anonymous = false,
  accountMenu = true,
}: {
  period: boolean;
  setting: PeriodSetting;
  onChange: (setting: PeriodSetting) => void;
  backdrop: "sky" | "snow";
  anonymous?: boolean;
  accountMenu?: boolean;
}) {
  return (
    <PageBar.Controls>
      {period ? (
        <PeriodControl
          value={setting}
          onChange={onChange}
          backdrop={backdrop}
          anonymous={anonymous}
        />
      ) : null}
      {accountMenu ? <Navigation.AccountMenu /> : null}
    </PageBar.Controls>
  );
}

/** A card's heading and sentence. */
interface CardText {
  title: string;
  body: string;
}

/**
 * The page's regions: the main card, lifted, then `count` cards below it,
 * enough to scroll under the bars.
 */
export function StoryCards({
  main,
  more,
  count = 5,
}: {
  main: CardText;
  more: CardText;
  count?: number;
}) {
  return (
    <div className="grid gap-m">
      <Card
        elevation="rest"
        render={<section />}
        className="grid h-[16rem] content-start gap-xs p-m"
      >
        <h2 className="text-l font-semibold">{main.title}</h2>
        <p className="text-s text-secondary">{main.body}</p>
      </Card>
      {Array.from({ length: count }, (_, index) => index + 1).map((card) => (
        <Card
          key={card}
          render={<section />}
          className="grid h-[10rem] content-start gap-xs p-m"
        >
          <h2 className="text-m font-semibold">{more.title}</h2>
          <p className="text-s text-secondary">{more.body}</p>
        </Card>
      ))}
    </div>
  );
}
