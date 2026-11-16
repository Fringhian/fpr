import type { AdminPerson } from "@fpr/contracts";
import type { DialogRootState } from "../../../../lib/dialog-state";
import { ReplaceLinkDialog, ResetKeyDialog } from "./access-dialogs";
import { AddPersonDialog } from "./add-person-dialog";
import { DeletePersonDialog } from "./delete-person-dialog";
import { EditPersonDialog } from "./edit-person-dialog";
import { isLastAdmin, type PersonDialog } from "./people-model";

/** The dialog People shows, for the person or the role it was opened for. */
export function PeopleDialogs({
  dialog,
  root,
  people,
}: {
  dialog: PersonDialog;
  root: DialogRootState;
  people: readonly AdminPerson[];
}) {
  switch (dialog.kind) {
    case "add":
      return <AddPersonDialog role={dialog.role} root={root} />;
    case "edit":
      return (
        <EditPersonDialog
          person={dialog.person}
          lastAdmin={isLastAdmin(dialog.person, people)}
          root={root}
        />
      );
    case "replaceLink":
      return <ReplaceLinkDialog person={dialog.person} root={root} />;
    case "resetKey":
      return <ResetKeyDialog person={dialog.person} root={root} />;
    case "delete":
      return <DeletePersonDialog person={dialog.person} root={root} />;
  }
}
