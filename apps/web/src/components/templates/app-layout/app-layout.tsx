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

export type BasicProps = {
  /** The page bar's content: `PageBar.Title` or `PageBar.Back`, then `PageBar.Controls`. */
  bar: ReactNode;
  /** The compact bar's content once the page bar has scrolled past: `PageBar.Title`, then the same `PageBar.Controls`. None leaves the compact bar out. */
  compactBar?: ReactNode;
  /** The header sentence, on the sky above the ridge. None starts the page on snow, and the bar's title is then the page's heading. */
  header?: ReactNode;
  /** The page's regions, under the bar or, with a header sentence, starting on the ridge. */
  children?: ReactNode;
} & Omit<Navigation.RootProps, "children">;

/**
 * An everyday page, ready-made: the navigation for `userRole`, the page bar
 * and the compact bar, the sky and its header sentence when there is one,
 * then the page's regions. A page with a special need composes the parts.
 */
export function Basic({
  bar,
  compactBar,
  header,
  children,
  ...props
}: BasicProps) {
  const anchor = useRef<HTMLDivElement>(null);

  const pageBar = <PageBar.Root ref={anchor}>{bar}</PageBar.Root>;

  return (
    <Navigation.Root {...props}>
      <Root>
        <Navigation.Side />
        <Main>
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
        </Main>
        <Navigation.TabBar />
      </Root>
    </Navigation.Root>
  );
}
