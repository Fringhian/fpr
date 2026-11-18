import { useRender } from "@base-ui/react/use-render";
import { cva } from "class-variance-authority";
import { useTranslation } from "react-i18next";
import { Icon } from "../../foundations/icon/icon";
import type { Destination } from "./navigation-model";
import { linkElement, useNavigation } from "./navigation-root";

const item = cva(
  [
    "flex items-center bg-transparent font-medium text-secondary no-underline outline-none",
    "",
    "",
    "",
    "hover:bg-highlight hover:text-primary",
    "focus-visible:focus-ring",
    "current:bg-primary current:font-semibold current:text-on-primary",
  ],
  {
    variants: {
      // The rail on tablet and the sidebar on desktop are one list, laid out
      // per width; the side list is hidden on phone, where the tab bar is.
      place: {
        side: [
          "",
          "min-h-[3.5rem] flex-col justify-center gap-xs rounded-l px-[0.125rem] py-s text-xs",
          "tablet:min-h-[3.5rem] tablet:flex-col tablet:justify-center tablet:gap-xs tablet:rounded-l tablet:px-[0.125rem] tablet:py-s tablet:text-xs",
          "desktop:min-h-0 desktop:rounded-full desktop:flex-row desktop:justify-start desktop:gap-[0.625rem] desktop:px-[0.75rem] desktop:py-s desktop:text-s",
        ],
        tab: "flex-1 flex-col justify-center gap-[0.125rem] rounded-full py-[0.375rem] text-xs",
      },
    },
  },
);

/** One page's link, its icon filled and `aria-current="page"` when it is the current page. */
export function Item({
  destination,
  place,
}: {
  destination: Destination;
  place: "side" | "tab";
}) {
  const { t } = useTranslation();
  const { current, renderLink, icons } = useNavigation();

  const isCurrent = current === destination;
  const link = useRender({
    render: linkElement(renderLink, destination),
    props: {
      className: item({ place }),
      "aria-current": isCurrent ? "page" : undefined,
      children: (
        <>
          <Icon
            icon={icons[destination]}
            size="m"
            weight={isCurrent ? "fill" : "regular"}
          />
          <span className="max-w-full text-center">
            {t(`navigation.items.${destination}`)}
          </span>
        </>
      ),
    },
  });

  return <li className={place === "tab" ? "flex flex-1" : "grid"}>{link}</li>;
}
