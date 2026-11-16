import { Field as BaseField } from "@base-ui/react/field";
import { type ComponentProps, createContext, use, useState } from "react";
import { useTranslation } from "react-i18next";
import { stateClassName } from "../../../lib/cn";
import { Button } from "../../atoms/button/button";
import { Input, type InputProps } from "../../atoms/input/input";

/** Whether the field around a control is disabled, so the Show button follows it. */
const FieldDisabled = createContext(false);

/**
 * The field: a column holding the label, the control, then the help or the
 * error. Base UI's `Field.Root`, with all its props: `invalid` marks it wrong
 * from outside (an answer from the API), `validate` checks the value itself,
 * and `disabled` turns off its control. `className` is a string, or a
 * function of the field's state.
 */
export function Root({
  className,
  disabled = false,
  ...props
}: ComponentProps<typeof BaseField.Root>) {
  return (
    <FieldDisabled value={disabled}>
      <BaseField.Root
        {...props}
        disabled={disabled}
        className={stateClassName("flex w-full flex-col", className)}
      />
    </FieldDisabled>
  );
}

/** The label, always visible above the control, which it names. Sentence case, no colon. */
export function Label({
  className,
  ...props
}: ComponentProps<typeof BaseField.Label>) {
  return (
    <BaseField.Label
      {...props}
      className={stateClassName(
        "mb-[0.375rem] text-s font-medium text-primary",
        className,
      )}
    />
  );
}

/** The control: the Input atom, which is Base UI's field control. */
export { Input as Control, type InputProps as ControlProps };

/**
 * The help under the control, read with it through `aria-describedby`. It
 * gives way to the error while the field is invalid.
 */
export function Description({
  className,
  ...props
}: ComponentProps<typeof BaseField.Description>) {
  return (
    <BaseField.Validity>
      {({ validity }) =>
        validity.valid === false ? null : (
          <BaseField.Description
            {...props}
            className={stateClassName(
              "mt-[0.375rem] text-xs text-secondary",
              className,
            )}
          />
        )
      }
    </BaseField.Validity>
  );
}

/**
 * The error, in place of the help while the field is invalid, read with the
 * control through `aria-describedby`. It sits in a polite live region, so it
 * is announced as it appears or changes. Without children, it shows the
 * message `validate` returned.
 */
function FieldError({
  className,
  match,
  children,
  ...props
}: ComponentProps<typeof BaseField.Error>) {
  return (
    <div aria-live="polite">
      <BaseField.Validity>
        {({ validity }) => (
          <BaseField.Error
            {...props}
            // An undefined `children` would hide the message `validate` returned.
            {...(children == null ? {} : { children })}
            match={match ?? (validity.valid === false ? true : undefined)}
            className={stateClassName(
              "mt-[0.375rem] text-xs text-error",
              className,
            )}
          />
        )}
      </BaseField.Validity>
    </div>
  );
}

export { FieldError as Error };

/** Every prop of the Input atom but `type` and `end`, which the password sets: its type follows Show, and Show holds its end. */
export type PasswordProps = Omit<InputProps, "type" | "end">;

/**
 * A password control with Show at its end, which reveals the password and
 * turns into Hide. Pass `autoComplete`: `current-password` to sign in,
 * `new-password` to choose one. Paste is never blocked.
 */
export function Password(props: PasswordProps) {
  const { t } = useTranslation();
  const fieldDisabled = use(FieldDisabled);
  const [shown, setShown] = useState(false);

  const toggleDisabled = props.disabled ?? fieldDisabled;
  const toggleName = shown ? t("field.hidePassword") : t("field.showPassword");
  const toggleText = shown ? t("field.hide") : t("field.show");

  return (
    <Input
      autoCapitalize="none"
      autoCorrect="off"
      spellCheck={false}
      {...props}
      type={shown ? "text" : "password"}
      end={
        <Button
          intent="ghost"
          size="s"
          aria-label={toggleName}
          disabled={toggleDisabled}
          onClick={() => setShown((value) => !value)}
          className="-me-xs"
        >
          {toggleText}
        </Button>
      }
    />
  );
}
