import type { Language } from "@fpr/contracts";
import { ArrowLeftIcon } from "@phosphor-icons/react/ArrowLeft";
import { CaretLeftIcon } from "@phosphor-icons/react/CaretLeft";
import { HouseIcon } from "@phosphor-icons/react/House";
import { useState } from "react";
import { useLanguage } from "../../../lib/i18n";
import type { PeriodSetting } from "../../molecules/period-control/period-control";
import * as Sentence from "../../molecules/sentence/sentence";
import * as AppLayout from "../../templates/app-layout/app-layout";
import {
  StoryBarControls,
  StoryCards,
} from "../../templates/app-layout/app-layout-story";
import type * as Navigation from "../navigation/navigation";
import * as PageBar from "./page-bar";

/** The icons the back link can lead with, by name. */
export const ICONS = {
  "caret-left": CaretLeftIcon,
  "arrow-left": ArrowLeftIcon,
  house: HouseIcon,
} as const;

/** Which parts the page renders, and the back link's icon by name. */
export interface PageArgs {
  back: boolean;
  controls: boolean;
  sky: boolean;
  compact: boolean;
  icon: keyof typeof ICONS;
}

/** The demo pages' names and cards, in the toolbar's language. They are the stories' content, not the page bar's. */
const LABELS = {
  en: {
    home: "Home",
    members: "Members",
    portfolio: "Portfolio",
    history: "History",
    card: "The page’s main card",
    onRidge:
      "Under the header sentence, it starts on the ridge: 240px from the top on phone, 236px from tablet up.",
    onSnow:
      "Without a header sentence, the page starts on snow, under the page bar.",
    memberStory: "Sam is up +6.1%, 1.9 points ahead of you.",
    more: "A card further down",
    scroll:
      "Past the page bar, the compact bar keeps the page’s name and the period at the top.",
  },
  fr: {
    home: "Accueil",
    members: "Membres",
    portfolio: "Portefeuille",
    history: "Historique",
    card: "La carte principale de la page",
    onRidge:
      "Sous la phrase d’en-tête, elle commence sur la crête : à 240 px du haut sur téléphone, 236 px dès la tablette.",
    onSnow:
      "Sans phrase d’en-tête, la page commence sur la neige, sous la barre de page.",
    memberStory: "Sam est en hausse de +6,1 %, 1,9 point devant toi.",
    more: "Une carte plus bas",
    scroll:
      "Passé la barre de page, la barre compacte garde le nom de la page et la période en haut.",
  },
} as const satisfies Record<Language, Record<string, string>>;

type Labels = (typeof LABELS)[Language];

const alex = { name: "Alex", color: "cobalt" } as const;

const sam = {
  name: "Sam",
  color: "vermilion",
  gain: { eur: "640", percent: "6.1" },
} as const;

/** The navigation's current item for each page, by `back` and `sky`. */
const CURRENT = {
  "false-true": "home",
  "false-false": "members",
  "true-true": "members",
  "true-false": "portfolio",
} as const satisfies Record<`${boolean}-${boolean}`, Navigation.Destination>;

/** The page's name: Home, Members, a member under Members, or History under Portfolio. */
function pageName(
  labels: Labels,
  { back, sky }: { back: boolean; sky: boolean },
) {
  if (back) return sky ? sam.name : labels.history;
  return sky ? labels.home : labels.members;
}

/** The bar's left end: the back link and the page's name, or the title, which is the heading on snow. */
function BarStart({
  back,
  sky,
  icon,
}: Pick<PageArgs, "back" | "sky" | "icon">) {
  const labels = LABELS[useLanguage()];

  const name = pageName(labels, { back, sky });

  return back ? (
    <>
      <PageBar.Back href="#members" icon={ICONS[icon]}>
        {sky ? labels.members : labels.portfolio}
      </PageBar.Back>
      <PageBar.Current>{name}</PageBar.Current>
    </>
  ) : (
    <PageBar.Title render={sky ? undefined : (props) => <h1 {...props} />}>
      {name}
    </PageBar.Title>
  );
}

/** The header sentence: a member's, under a back link, or Home's race. */
function PageSentence({
  back,
  setting,
}: {
  back: boolean;
  setting: PeriodSetting;
}) {
  const labels = LABELS[useLanguage()];

  return back ? (
    <Sentence.Root>
      <Sentence.Headline>{sam.name}</Sentence.Headline>
      <Sentence.Story>{labels.memberStory}</Sentence.Story>
    </Sentence.Root>
  ) : (
    <Sentence.Race
      name={alex.name}
      color={alex.color}
      timeOfDay="evening"
      period={setting.period}
      unit={setting.unit}
      standing="theyLead"
      gain={{ eur: "512", percent: "4.2" }}
      leader={sam}
      starShare={{ name: "Swiss Pharma AG", gain: "12.4" }}
    />
  );
}

/**
 * A page in the app layout, made of the parts the controls switch on: the
 * page bar, the compact bar, then the sky header and the cards. It keeps the
 * period setting the way the app shell will, so both bars and the sentence
 * follow it.
 */
export function Page({ back, controls, sky, compact, icon }: PageArgs) {
  const labels = LABELS[useLanguage()];
  const [setting, setSetting] = useState<PeriodSetting>({
    period: "1M",
    unit: "percent",
  });

  const barControls = (backdrop: "sky" | "snow") => (
    <StoryBarControls
      period={controls}
      setting={setting}
      onChange={setSetting}
      backdrop={backdrop}
    />
  );

  return (
    <AppLayout.Basic
      userRole="member"
      account={alex}
      current={CURRENT[`${back}-${sky}`]}
      bar={
        <>
          <BarStart back={back} sky={sky} icon={icon} />
          {barControls(sky ? "sky" : "snow")}
        </>
      }
      compactBar={
        compact ? (
          <>
            <PageBar.Title>{pageName(labels, { back, sky })}</PageBar.Title>
            {barControls("snow")}
          </>
        ) : undefined
      }
      header={sky ? <PageSentence back={back} setting={setting} /> : undefined}
    >
      <StoryCards
        main={{
          title: labels.card,
          body: sky ? labels.onRidge : labels.onSnow,
        }}
        more={{ title: labels.more, body: labels.scroll }}
      />
    </AppLayout.Basic>
  );
}
