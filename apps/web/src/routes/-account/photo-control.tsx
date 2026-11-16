import { type ReactNode, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../components/atoms/button/button";
import { FormError } from "../../components/molecules/form-error/form-error";
import { usePhoto } from "./use-photo";

/**
 * The photo in place of the initial: `addLabel` while there is none, then
 * Change and Remove, with why an upload failed and Retry when trying again
 * can help. `children`, the person's picture, sits before the buttons.
 */
export function PhotoControl({
  hasPhoto,
  addLabel,
  children,
}: {
  hasPhoto: boolean;
  addLabel: string;
  children?: ReactNode;
}) {
  const { t } = useTranslation();
  const input = useRef<HTMLInputElement>(null);
  const photo = usePhoto();

  return (
    <div className="flex flex-col gap-s">
      <div className="flex items-center gap-m">
        {children}
        <div className="flex flex-wrap items-center gap-s">
          <Button
            type="button"
            loading={photo.uploading}
            loadingLabel={t("photoControl.uploading")}
            disabled={photo.busy}
            onClick={() => input.current?.click()}
          >
            {hasPhoto ? t("photoControl.change") : addLabel}
          </Button>
          {hasPhoto ? (
            <Button
              type="button"
              intent="ghost"
              loading={photo.removing}
              disabled={photo.busy}
              onClick={photo.remove}
            >
              {t("photoControl.remove")}
            </Button>
          ) : null}
        </div>
      </div>
      <input
        ref={input}
        type="file"
        accept="image/*"
        hidden
        onChange={photo.choose}
      />
      <FormError>{photo.error}</FormError>
      {photo.retry ? (
        <Button
          type="button"
          size="s"
          className="self-start"
          onClick={photo.retry}
        >
          {t("photoControl.retry")}
        </Button>
      ) : null}
    </div>
  );
}
