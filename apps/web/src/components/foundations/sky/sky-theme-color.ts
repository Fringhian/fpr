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
 * The browser's bar above the page, an installed app's status bar included,
 * takes the colour of the page's top: the sky while a band shows, the page
 * ground otherwise, as `index.html` starts.
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
