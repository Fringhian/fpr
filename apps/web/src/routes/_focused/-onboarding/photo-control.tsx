import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../components/atoms/button/button";
import { Picture } from "../../../components/atoms/picture/picture";
import { FormError } from "../../../components/molecules/form-error/form-error";
import { cn } from "../../../lib/cn";
import type { Look } from "../../../lib/look";
import { usePhoto } from "./use-photo";

/**
 * The photo in place of the initial: “Use a photo instead”, then Change and
 * Remove once there is one, with why an upload failed and Retry when trying
 * again can help. The picture shows beside the buttons on phone and tablet;
 * the desktop shows it on the sky.
 */
export function PhotoControl({ look }: { look: Look }) {
  const { t } = useTranslation();
  const input = useRef<HTMLInputElement>(null);
  const photo = usePhoto();

  const hasPhoto = look.photo !== null;

  return (
    <div className="flex flex-col gap-s">
      <div className="flex items-center gap-m">
        <Picture
          name={look.name}
          color={look.color}
          photo={look.photo}
          size="l"
          aria-hidden
          className={cn("", "flex", "tablet:flex", "desktop:hidden")}
        />
        <div className="flex flex-wrap items-center gap-s">
          <Button
            type="button"
            loading={photo.uploading}
            loadingLabel={t("onboarding.look.uploading")}
            disabled={photo.busy}
            onClick={() => input.current?.click()}
          >
            {hasPhoto
              ? t("onboarding.look.changePhoto")
              : t("onboarding.look.usePhoto")}
          </Button>
          {hasPhoto ? (
            <Button
              type="button"
              intent="ghost"
              loading={photo.removing}
              disabled={photo.busy}
              onClick={photo.remove}
            >
              {t("onboarding.look.removePhoto")}
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
          {t("onboarding.retry")}
        </Button>
      ) : null}
    </div>
  );
}
