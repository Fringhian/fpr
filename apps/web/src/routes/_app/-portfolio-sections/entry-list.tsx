import type { Id } from "@fpr/contracts";
import type { ComponentProps } from "react";
import { useTranslation } from "react-i18next";
import * as Menu from "../../../components/molecules/menu/menu";
import * as TimelineRow from "../../../components/molecules/timeline-row/timeline-row";
import { describe } from "../../../components/molecules/timeline-row/timeline-row-entry";
import { formatDate } from "../../../lib/format/date";
import { useLanguage } from "../../../lib/i18n";
import { inThisYear, raceTimeZone } from "../../../lib/race-day";
import type { LogRow } from "./log-rows";
import { type RecordLink, useRecord } from "./record-link";
import { useDeleteEntry } from "./use-delete-entry";

/** Its ⋯ items: Edit opens Record a change on the entry; Delete deletes it at once, with Undo after. */
function EntryActions({
  edit,
  onDelete,
}: {
  edit: ReturnType<RecordLink>;
  onDelete: () => void;
}) {
  const { t } = useTranslation();

  return (
    <>
      <Menu.LinkItem render={edit}>{t("entryActions.edit")}</Menu.LinkItem>
      <Menu.Separator />
      <Menu.Item intent="danger" onClick={onDelete}>
        {t("entryActions.delete")}
      </Menu.Item>
    </>
  );
}

/** One entry's row, its year written when it isn't this year's. */
function EntryRow({
  logRow: { entry, row },
  recordLink,
  onDelete,
}: {
  logRow: LogRow;
  recordLink: RecordLink;
  onDelete: (subject: string) => void;
}) {
  const { t } = useTranslation();
  const language = useLanguage();

  const date = entry.effectiveAt;
  const year = !inThisYear(date);
  const subject = t("timelineRow.subject", {
    title: describe(row, t, language).title,
    date: formatDate(date, language, { timeZone: raceTimeZone(), year }),
  });

  return (
    <TimelineRow.Basic
      {...row}
      date={date}
      timeZone={raceTimeZone()}
      year={year}
      actions={
        <EntryActions
          edit={recordLink({ entry: entry.id })}
          onDelete={() => onDelete(subject)}
        />
      }
    />
  );
}

/**
 * Entries of `userId`'s log, newest first, each with ⋯ to edit it in Record a
 * change or delete it: Portfolio's latest changes, and History.
 */
export function EntryList({
  userId,
  rows,
  ...props
}: { userId: Id; rows: readonly LogRow[] } & ComponentProps<"ol">) {
  const { link: recordLink } = useRecord(userId);
  const deleteEntry = useDeleteEntry(userId);

  return (
    <TimelineRow.List {...props}>
      {rows.map((logRow) => (
        <EntryRow
          key={logRow.entry.id}
          logRow={logRow}
          recordLink={recordLink}
          onDelete={(subject) => void deleteEntry(logRow.entry, subject)}
        />
      ))}
    </TimelineRow.List>
  );
}
