import { useEffect } from "react";
import { cssVariable } from "../../../lib/css-variable";

let bands = 0;

function paint() {
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute(
      "content",
      cssVariable(bands > 0 ? "--color-sky" : "--color-page"),
    );
}

/**
 * The page's `theme-color` follows its top: the sky while a band shows, the
 * page ground otherwise, as `index.html` starts. A browser or an installed
 * app that tints its bar above the page with it matches the top bar; an app
 * installed on iOS keeps its default status bar.
 */
export function useSkyThemeColor() {
  useEffect(() => {
    bands += 1;
    paint();
    return () => {
      bands -= 1;
      paint();
    };
  }, []);
}
