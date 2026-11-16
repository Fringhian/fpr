import type { Language, Role } from "@fpr/contracts";
import { useRef, useState } from "react";
import { useLanguage } from "../../../lib/i18n";
import type { PeriodSetting } from "../../molecules/period-control/period-control";
import * as Sentence from "../../molecules/sentence/sentence";
import * as Navigation from "../../organisms/navigation/navigation";
import * as PageBar from "../../organisms/page-bar/page-bar";
import * as AppLayout from "./app-layout";
import {
  ACCOUNTS,
  StoryBarControls,
  StoryBarStart,
  StoryCards,
  type StoryPage,
  showsPeriod,
  usePageName,
} from "./app-layout-story";

/** What the controls change: Basic's role and page, and a boolean per optional part. */
export interface LayoutArgs {
  userRole: Role;
  current: StoryPage;
  header: boolean;
  compactBar: boolean;
}

/** The placeholder page's texts, in the toolbar's language. */
const TEXTS = {
  en: {
    headline: "The header sentence, on the sky",
    story: "The page’s main card starts on the ridge below it.",
    main: {
      title: "The page’s main card",
      body: "Every everyday page sits in this frame: the navigation, the page bar, then the page’s regions, up to 1120px wide on desktop.",
    },
    more: {
      title: "A region of the page",
      body: "On phone, the page’s end clears the floating tab bar by 92px.",
    },
  },
  fr: {
    headline: "La phrase d’en-tête, sur le ciel",
    story: "La carte principale de la page commence sur la crête, dessous.",
    main: {
      title: "La carte principale de la page",
      body: "Chaque page du quotidien tient dans ce cadre : la navigation, la barre de page, puis les zones de la page, jusqu’à 1 120 px de large sur ordinateur.",
    },
    more: {
      title: "Une zone de la page",
      body: "Sur téléphone, la fin de la page laisse 92 px au-dessus de la barre d’onglets flottante.",
    },
  },
} as const satisfies Record<Language, unknown>;

/** A placeholder page from `AppLayout.Basic`, with both bars bound to one period setting. */
export function BasicPage({
  userRole,
  current,
  header,
  compactBar,
}: LayoutArgs) {
  const text = TEXTS[useLanguage()];
  const name = usePageName(current);
  const [setting, setSetting] = useState<PeriodSetting>({
    period: "1M",
    unit: "percent",
  });

  const controls = (backdrop: "sky" | "snow") => (
    <StoryBarControls
      period={showsPeriod(current)}
      setting={setting}
      onChange={setSetting}
      backdrop={backdrop}
      anonymous={userRole === "anonymous"}
    />
  );

  return (
    <AppLayout.Basic
      userRole={userRole}
      account={ACCOUNTS[userRole]}
      current={current === "none" ? undefined : current}
      bar={
        <>
          <StoryBarStart page={current} heading={!header} />
          {controls(header ? "sky" : "snow")}
        </>
      }
      compactBar={
        compactBar ? (
          <>
            <PageBar.Title>{name}</PageBar.Title>
            {controls("snow")}
          </>
        ) : undefined
      }
      header={
        header ? (
          <Sentence.Root>
            <Sentence.Headline>{text.headline}</Sentence.Headline>
            <Sentence.Story>{text.story}</Sentence.Story>
          </Sentence.Root>
        ) : undefined
      }
    >
      <StoryCards main={text.main} more={text.more} />
    </AppLayout.Basic>
  );
}

/**
 * The admin's People page, composed from the parts: no period and no header
 * sentence, so the bar holds the title, its heading, and the account menu.
 */
export function PartsPage() {
  const text = TEXTS[useLanguage()];
  const name = usePageName("people");
  const anchor = useRef<HTMLDivElement>(null);

  return (
    <Navigation.Root userRole="admin" account={ACCOUNTS.admin} current="people">
      <AppLayout.Root>
        <Navigation.Side />
        <AppLayout.Main>
          <AppLayout.CompactBar anchor={anchor}>
            <PageBar.Title>{name}</PageBar.Title>
            <PageBar.Controls>
              <Navigation.AccountMenu />
            </PageBar.Controls>
          </AppLayout.CompactBar>
          <AppLayout.Content>
            <PageBar.Root ref={anchor}>
              <StoryBarStart page="people" heading />
              <PageBar.Controls>
                <Navigation.AccountMenu />
              </PageBar.Controls>
            </PageBar.Root>
            <StoryCards main={text.main} more={text.more} />
          </AppLayout.Content>
        </AppLayout.Main>
        <Navigation.TabBar />
      </AppLayout.Root>
    </Navigation.Root>
  );
}
