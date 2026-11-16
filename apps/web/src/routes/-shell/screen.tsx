import { Link } from "@tanstack/react-router";
import type { ReactElement, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type * as Segment from "../../components/atoms/segment/segment";
import { PeriodControl } from "../../components/molecules/period-control/period-control";
import * as Navigation from "../../components/organisms/navigation/navigation";
import * as PageBar from "../../components/organisms/page-bar/page-bar";
import * as AppLayout from "../../components/templates/app-layout/app-layout";
import { HelpInfo, HelpNote } from "../../lib/help-info";
import { useViewState } from "../../lib/view-state/use-view-state";

type Parent =
  | "members"
  | "portfolio"
  | "shares"
  | { label: string; link: ReactElement };

/**
 * The bar's controls: the shared period and unit on a page that shows them,
 * with what € and % mean, then the account menu, which shows on phone only.
 */
function Controls({
  period,
  backdrop,
}: {
  period: boolean;
  backdrop: Segment.Backdrop;
}) {
  const { t } = useTranslation();
  const { setting, setSetting, anonymous } = useViewState();

  return (
    <PageBar.Controls>
      {period ? (
        <PeriodControl
          value={setting}
          onChange={setSetting}
          backdrop={backdrop}
          anonymous={anonymous}
          unitInfo={
            <HelpInfo
              section="periods"
              title={t("helpInfo.unit.title")}
              align="end"
            >
              {t("helpInfo.unit.body")}
            </HelpInfo>
          }
          unitNote={
            <HelpNote section="periods">{t("helpInfo.unit.body")}</HelpNote>
          }
        />
      ) : null}
      <Navigation.AccountMenu />
    </PageBar.Controls>
  );
}

/**
 * The bar's left end: the page's title, its heading with `heading`, or below
 * `back`, the link back to that item, then the page's name from tablet up.
 */
function Start({
  title,
  back,
  heading,
}: {
  title: string;
  back: Parent | undefined;
  heading: boolean;
}) {
  const { t } = useTranslation();

  const to =
    typeof back === "string"
      ? {
          label: t(`navigation.items.${back}`),
          link: <Link to={Navigation.HREFS[back]} />,
        }
      : back;

  return to ? (
    <>
      <PageBar.Back render={to.link}>{to.label}</PageBar.Back>
      <PageBar.Current>{title}</PageBar.Current>
    </>
  ) : (
    <PageBar.Title render={heading ? (props) => <h1 {...props} /> : undefined}>
      {title}
    </PageBar.Title>
  );
}

export type ScreenProps = {
  /** The page's name, in the bar and the compact bar. None leaves the bar's start empty and the compact bar out, for a page that is only a message. */
  title?: string | undefined;
  /** What the page sits below, which the bar links back to in place of the title. */
  back?: Parent | undefined;
  /** Shows the shared period and unit in both bars. */
  period?: boolean | undefined;
  /** The bar's title is the page's heading. By default, on a page without a header sentence. */
  heading?: boolean | undefined;
  /** The header sentence, on the sky. None starts the page on snow. */
  header?: ReactNode;
  children?: ReactNode;
};

/**
 * One everyday page inside the app shell: the page bar with the title or the
 * back link, the period and unit, and on phone the account menu; the compact
 * bar with the same controls once it has scrolled past; then the sky and the
 * header sentence when there is one, and the page's regions.
 */
export function Screen({
  title,
  back,
  period = false,
  header,
  heading = header === undefined,
  children,
}: ScreenProps) {
  const start =
    title === undefined ? null : (
      <Start title={title} back={back} heading={heading} />
    );

  return (
    <AppLayout.Page
      bar={
        <>
          {start}
          <Controls period={period} backdrop={header ? "sky" : "snow"} />
        </>
      }
      compactBar={
        title === undefined ? undefined : (
          <>
            <PageBar.Title>{title}</PageBar.Title>
            <Controls period={period} backdrop="snow" />
          </>
        )
      }
      header={header}
    >
      {children}
    </AppLayout.Page>
  );
}
