import type { AdminPerson, Role } from "@fpr/contracts";
import { roles } from "@fpr/contracts/values";
import { PlusIcon } from "@phosphor-icons/react/Plus";
import { useId, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../../components/atoms/button/button";
import * as PersonRow from "../../../../components/organisms/person-row/person-row";
import { cn } from "../../../../lib/cn";
import { memberColor } from "../../../../lib/member-color";
import { GroupHeading } from "../-shared/group-heading";
import { byRole, isLastAdmin, type PeopleActions } from "./people-model";
import { PersonMenu } from "./person-menu";

// The badge and end date columns have one width in every group, so they line up down the page.
const columns = cn(
  "",
  "",
  "tablet:grid-cols-[auto_minmax(0,1fr)_9.5rem_8.5rem_auto]",
  "desktop:grid-cols-[auto_minmax(0,1fr)_minmax(0,13.75rem)_9.5rem_8.5rem_auto]",
);

/** Everyone in one role, each row with its ⋯ menu for the admin, under a heading with the role's add button. */
function Group({
  role,
  people,
  everyone,
  actions,
}: {
  role: Role;
  people: readonly AdminPerson[];
  everyone: readonly AdminPerson[];
  actions: PeopleActions | undefined;
}) {
  const { t } = useTranslation();
  const headingId = useId();

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-s">
      <GroupHeading
        id={headingId}
        title={t(`adminPeople.groups.${role}`)}
        count={people.length}
        end={
          actions === undefined ? null : (
            <Button
              size="s"
              icon={PlusIcon}
              onClick={() => actions.show({ kind: "add", role })}
            >
              {t(`adminPeople.add.${role}`)}
            </Button>
          )
        }
      />
      {people.length === 0 ? (
        <p className="text-s text-secondary">{t("adminPeople.empty")}</p>
      ) : (
        <PersonRow.List className={columns}>
          {people.map((person) => (
            <PersonRow.Basic
              key={person.id}
              name={person.displayName}
              color={memberColor(person.color)}
              photo={person.avatarUrl}
              email={person.email}
              status={person.accessStatus}
              accessUntil={person.accessUntil}
              actions={
                actions === undefined ? undefined : (
                  <PersonMenu
                    person={person}
                    lastAdmin={isLastAdmin(person, everyone)}
                    actions={actions}
                  />
                )
              }
            />
          ))}
        </PersonRow.List>
      )}
    </section>
  );
}

/**
 * Everyone, grouped by role: admins, members, guests, then anonymous
 * viewers. Without `actions`, as an anonymous viewer reads it, there is no
 * add button and no ⋯.
 */
export function PeopleGroups({
  people,
  actions,
}: {
  people: readonly AdminPerson[];
  actions: PeopleActions | undefined;
}) {
  const groups = useMemo(() => byRole(people), [people]);

  return (
    <div className="flex flex-col gap-l pb-l">
      {roles.map((role) => (
        <Group
          key={role}
          role={role}
          people={groups[role]}
          everyone={people}
          actions={actions}
        />
      ))}
    </div>
  );
}
