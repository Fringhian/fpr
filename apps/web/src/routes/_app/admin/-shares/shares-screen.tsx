import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { livePrices } from "../../../../lib/api/query-client";
import { useApi } from "../../../../lib/api/use-api";
import { useDialogState } from "../../../../lib/dialog-state";
import { useSession } from "../../../../lib/session/use-session";
import { Screen } from "../../../-shell/screen";
import { Loaded } from "../-shared/loaded";
import { DeleteShareDialog } from "./delete-share-dialog";
import { MakeManualDialog } from "./make-manual-dialog";
import { RefreshBar } from "./refresh-bar";
import { ShareGroups } from "./share-groups";
import type { ShareDialog } from "./shares-model";

/**
 * Tracked shares: every share FPR knows, grouped by what the price service
 * does with it, each with its latest price and holders. The admin refreshes
 * prices now, makes a stuck share manual, and deletes one nobody has held;
 * an anonymous viewer reads the same page without those controls.
 */
export function SharesScreen() {
  const { t } = useTranslation();
  const api = useApi();
  const { readOnly } = useSession();
  const shares = useQuery({
    ...api.admin.shares.queryOptions(),
    ...livePrices,
  });
  const dialog = useDialogState<ShareDialog>();

  const subject = dialog.subject;
  return (
    <Screen title={t("pages.trackedShares")}>
      <RefreshBar readOnly={readOnly} />
      <Loaded query={shares} loading={t("adminShares.loading")}>
        {(groups) => (
          <ShareGroups
            groups={groups}
            onAct={readOnly ? undefined : dialog.show}
          />
        )}
      </Loaded>
      {subject?.kind === "makeManual" ? (
        <MakeManualDialog share={subject.share} root={dialog.root} />
      ) : null}
      {subject?.kind === "delete" ? (
        <DeleteShareDialog share={subject.share} root={dialog.root} />
      ) : null}
    </Screen>
  );
}
