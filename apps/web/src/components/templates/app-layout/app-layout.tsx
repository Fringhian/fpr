// The app layout's parts, imported as a namespace: `import * as AppLayout from "…/app-layout"`.
import { type ReactNode, useRef } from "react";
import * as Sky from "../../foundations/sky/sky";
import * as Navigation from "../../organisms/navigation/navigation";
import * as PageBar from "../../organisms/page-bar/page-bar";
import { CompactBar, Content, Main, Root } from "./app-layout-frame";

export {
  CONTENT_ID,
  CompactBar,
  Content,
  Main,
  Root,
} from "./app-layout-frame";

export type PageProps = {
  /** The page bar's content: `PageBar.Title` or `PageBar.Back`, then `PageBar.Controls`. */
  bar: ReactNode;
  /** The compact bar's content once the page bar has scrolled past: `PageBar.Title`, then the same `PageBar.Controls`. None leaves the compact bar out. */
  compactBar?: ReactNode;
  /** The header sentence, on the sky above the ridge. None starts the page on snow, and the bar's title is then the page's heading. */
  header?: ReactNode;
  /** The page's regions, under the bar or, with a header sentence, starting on the ridge. */
  children?: ReactNode;
};

/**
 * One page inside `Main`: the compact bar, the sky and its header sentence
 * when there is one, then `Content` with the page bar and the page's regions.
 * The app shell keeps the frame around it from page to page.
 */
export function Page({ bar, compactBar, header, children }: PageProps) {
  const anchor = useRef<HTMLDivElement>(null);

  const pageBar = <PageBar.Root ref={anchor}>{bar}</PageBar.Root>;

  return (
    <>
      {compactBar ? (
        <CompactBar anchor={anchor}>{compactBar}</CompactBar>
      ) : null}
      {header ? <Sky.Band /> : null}
      <Content>
        {header ? (
          <Sky.Header>
            {pageBar}
            {header}
          </Sky.Header>
        ) : (
          pageBar
        )}
        {children}
      </Content>
    </>
  );
}

export type FrameProps = Omit<Navigation.RootProps, "children"> & {
  /** What `Main` holds: a `Page`. */
  children?: ReactNode;
  /** The toasts' region, `Toast.Region`, over the frame. It needs a `Toast.Provider` above it. */
  toasts?: ReactNode;
};

/**
 * The frame every everyday page shares, from one place for the app shell and
 * `Basic`: the navigation for `userRole`, then `Root` with the side
 * navigation, `Main` holding the page, and the tab bar, then the toasts.
 */
export function Frame({ children, toasts, ...props }: FrameProps) {
  return (
    <Navigation.Root {...props}>
      <Root>
        <Navigation.Side />
        <Main>{children}</Main>
        <Navigation.TabBar />
      </Root>
      {toasts}
    </Navigation.Root>
  );
}

export type BasicProps = PageProps & Omit<FrameProps, "children">;

/**
 * An everyday page, ready-made: `Frame`, then `Page` with the page bar and
 * the compact bar, the sky and its header sentence when there is one, and the
 * page's regions. A page with a special need composes the parts.
 */
export function Basic({
  bar,
  compactBar,
  header,
  children,
  ...props
}: BasicProps) {
  return (
    <Frame {...props}>
      <Page bar={bar} compactBar={compactBar} header={header}>
        {children}
      </Page>
    </Frame>
  );
}
