import type { ShareValueEvent } from "@fpr/contracts";
import { useTranslation } from "react-i18next";
import * as TimelineRow from "../../../../components/molecules/timeline-row/timeline-row";
import { describe } from "../../../../components/molecules/timeline-row/timeline-row-entry";
import { formatDate, formatTime } from "../../../../lib/format/date";
import { useLanguage } from "../../../../lib/i18n";
import { lookOf } from "../../../../lib/look";
import { inThisYear, RACE_TIME_ZONE } from "../../../../lib/race-day";

const timeZone = RACE_TIME_ZONE;

/** The event as the timeline row tells it: added, changed from a value, or deleted. */
function entryOf(event: ShareValueEvent): TimelineRow.TimelineEntry {
  switch (event.action) {
    case "added":
      return { kind: "valueAdded", price: event.priceEur };
    case "edited":
      return {
        kind: "valueEdited",
        price: event.priceEur,
        before: event.previousPriceEur,
      };
    case "deleted":
      return { kind: "valueDeleted", before: event.previousPriceEur };
  }
}

/** One edit: the day it was made, what it did, then the value's moment, its value before and who made it. */
function EventRow({ event }: { event: ShareValueEvent }) {
  const { t } = useTranslation();
  const language = useLanguage();

  const entry = entryOf(event);
  const { title, change } = describe(entry, t, language);
  const moment = t("sharePage.events.of", {
    date: formatDate(event.at, language, {
      timeZone,
      year: !inThisYear(event.at),
    }),
    time: formatTime(event.at, language, { timeZone }),
  });
  const by =
    event.madeBy &&
    t("timelineRow.madeBy", {
      name: lookOf(event.madeBy).name,
    });

  return (
    <TimelineRow.Root>
      <TimelineRow.Day
        date={event.madeAt}
        timeZone={timeZone}
        year={!inThisYear(event.madeAt)}
      />
      <TimelineRow.Marker icon={TimelineRow.TIMELINE_ICONS[entry.kind]} />
      <TimelineRow.Text>
        <TimelineRow.Title>{title}</TimelineRow.Title>
        <TimelineRow.Detail>
          {[moment, change, by].filter(Boolean).join(" · ")}
        </TimelineRow.Detail>
      </TimelineRow.Text>
      <span />
    </TimelineRow.Root>
  );
}

/** A manual share's value edits, newest first: who added, changed or deleted which value, from what to what. */
export function ValueEvents({
  events,
}: {
  events: readonly ShareValueEvent[];
}) {
  return (
    <TimelineRow.List>
      {events.map((event) => (
        <EventRow key={event.id} event={event} />
      ))}
    </TimelineRow.List>
  );
}
