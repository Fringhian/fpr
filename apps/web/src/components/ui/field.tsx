import { Button as BaseButton } from "@base-ui/react/button";
import { Field as BaseField } from "@base-ui/react/field";
import { createContext, use, useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "../../lib/cn";
import { Input, type InputProps } from "./input";

/** Whether the field around a control is disabled, so the Show button follows it. */
const FieldDisabled = createContext(false);

export type RootProps = Omit<BaseField.Root.Props, "className" | "render"> & {
  /** Classes for the field's column, such as its width. */
  className?: string | undefined;
};

/**
 * The field: a column holding the label, the control, then the help or the
 * error. Base UI's `Field.Root`: `invalid` marks it wrong from outside (an
 * answer from the API), `validate` checks the value itself, and `disabled`
 * turns off its control.
 */
export function Root({ className, disabled = false, ...props }: RootProps) {
  return (
    <FieldDisabled value={disabled}>
      <BaseField.Root
        {...props}
        disabled={disabled}
        className={cn("flex w-full flex-col", className)}
      />
    </FieldDisabled>
  );
}

export type LabelProps = Omit<BaseField.Label.Props, "className" | "render"> & {
  className?: string | undefined;
};

/** The label, always visible above the control, which it names. Sentence case, no colon. */
export function Label({ className, ...props }: LabelProps) {
  return (
    <BaseField.Label
      {...props}
      className={cn("mb-[0.375rem] text-s font-medium text-primary", className)}
    />
  );
}

/** The control: the Input atom, which is Base UI's field control. */
export { Input as Control, type InputProps as ControlProps };

export type DescriptionProps = Omit<
  BaseField.Description.Props,
  "className" | "render"
> & {
  className?: string | undefined;
};

/**
 * The help under the control, read with it through `aria-describedby`. It
 * gives way to the error while the field is invalid.
 */
export function Description({ className, ...props }: DescriptionProps) {
  return (
    <BaseField.Validity>
      {({ validity }) =>
        validity.valid === false ? null : (
          <BaseField.Description
            {...props}
            className={cn("mt-[0.375rem] text-xs text-secondary", className)}
          />
        )
      }
    </BaseField.Validity>
  );
}

export type ErrorProps = Omit<BaseField.Error.Props, "className" | "render"> & {
  className?: string | undefined;
};

/**
 * The error, in place of the help while the field is invalid, read with the
 * control through `aria-describedby`. It sits in a polite live region, so it
 * is announced as it appears or changes. Without children, it shows the
 * message `validate` returned.
 */
function FieldError({ className, match, children, ...props }: ErrorProps) {
  return (
    <div aria-live="polite">
      <BaseField.Validity>
        {({ validity }) => (
          <BaseField.Error
            {...props}
            // An undefined `children` would hide the message `validate` returned.
            {...(children == null ? {} : { children })}
            match={match ?? (validity.valid === false ? true : undefined)}
            className={cn("mt-[0.375rem] text-xs text-error", className)}
          />
        )}
      </BaseField.Validity>
    </div>
  );
}

export { FieldError as Error };

export type PasswordProps = Omit<
  InputProps,
  "type" | "end" | "icon" | "decimal"
>;

/**
 * A password control with Show at its end, which reveals the password and
 * turns into Hide. Pass `autoComplete`: `current-password` to sign in,
 * `new-password` to choose one. Paste is never blocked.
 */
export function Password(props: PasswordProps) {
  const { t } = useTranslation();
  const fieldDisabled = use(FieldDisabled);
  const [shown, setShown] = useState(false);
  return (
    <Input
      autoCapitalize="none"
      autoCorrect="off"
      spellCheck={false}
      {...props}
      type={shown ? "text" : "password"}
      end={
        <BaseButton
          aria-label={shown ? t("field.hidePassword") : t("field.showPassword")}
          disabled={props.disabled ?? fieldDisabled}
          onClick={() => setShown((value) => !value)}
          className={cn(
            "-mr-xs flex min-h-[1.75rem] cursor-pointer items-center rounded-full px-xs text-secondary",
            "",
            "",
            "",
            "not-disabled:hover:text-primary",
            "focus-visible:focus-ring",
            "disabled:cursor-not-allowed disabled:text-secondary/55",
          )}
        >
          {shown ? t("field.hide") : t("field.show")}
        </BaseButton>
      }
    />
  );
}
