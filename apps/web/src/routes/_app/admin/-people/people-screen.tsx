import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useApi } from "../../../../lib/api/use-api";
import { useDialogState } from "../../../../lib/dialog-state";
import { useSession } from "../../../../lib/session/use-session";
import { Screen } from "../../../-shell/screen";
import { Loaded } from "../-shared/loaded";
import { PeopleDialogs } from "./people-dialogs";
import { PeopleGroups } from "./people-groups";
import type { PeopleActions, PersonDialog } from "./people-model";
import { useAccessToggle } from "./use-access-toggle";

/**
 * People: everyone, grouped by role, with their access. The admin adds
 * people and manages each one from their ⋯ menu, one dialog at a time; an
 * anonymous viewer reads the same page with pseudonyms and no controls.
 */
export function PeopleScreen() {
  const { t } = useTranslation();
  const api = useApi();
  const { readOnly } = useSession();
  const people = useQuery(api.admin.people.queryOptions());
  const dialog = useDialogState<PersonDialog>();
  const access = useAccessToggle();

  const actions: PeopleActions | undefined = readOnly
    ? undefined
    : { show: dialog.show, ...access };

  return (
    <Screen title={t("pages.people")}>
      <Loaded query={people} loading={t("adminPeople.loading")}>
        {(everyone) => <PeopleGroups people={everyone} actions={actions} />}
      </Loaded>
      {dialog.subject === null ? null : (
        <PeopleDialogs
          dialog={dialog.subject}
          root={dialog.root}
          people={people.data ?? []}
        />
      )}
    </Screen>
  );
}
