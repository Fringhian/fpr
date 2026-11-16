import { AlertDialog } from "@base-ui/react/alert-dialog";
import type { DialogRoot } from "@base-ui/react/dialog";
import {
  type ComponentProps,
  createContext,
  type ReactElement,
  type ReactNode,
  type RefObject,
  use,
  useRef,
  useState,
} from "react";
import { Button, type ButtonProps } from "../../atoms/button/button";
import * as Dialog from "../dialog/dialog";

export {
  Cancel,
  Close,
  Description,
  Footer,
  Header,
  Popup,
  Title,
} from "../dialog/dialog";

const ActionsContext = createContext<RefObject<DialogRoot.Actions | null>>({
  current: null,
});

/** Every prop of Base UI's `AlertDialog.Root`, its children as plain content. */
export type RootProps = { children?: ReactNode } & Omit<
  ComponentProps<typeof AlertDialog.Root>,
  "children"
>;

/**
 * Holds the confirmation's state, open or closed: Base UI's
 * `AlertDialog.Root`, which a press on the dimmed page leaves open, so only
 * Cancel, Escape, the close button or the confirming button close it. `open`
 * and `onOpenChange` to control it.
 */
export function Root({ actionsRef, children, ...props }: RootProps) {
  const own = useRef<DialogRoot.Actions>(null);
  const actions = actionsRef ?? own;

  return (
    <AlertDialog.Root {...props} actionsRef={actions}>
      <ActionsContext value={actions}>{children}</ActionsContext>
    </AlertDialog.Root>
  );
}

/** Opens the confirmation. `render={<Button />}` makes it a button; focus returns here when it closes. */
export const Trigger = AlertDialog.Trigger;

/**
 * The confirm button's own props, then every prop of `Button` but `onClick`
 * and `loading`, which it sets itself. Destructive by default: `danger`.
 */
export type ConfirmProps = {
  /**
   * The action. A promise keeps the dialog open, the button loading, until it
   * settles: fulfilled, the dialog closes; rejected, it stays open, and the
   * action reports its own failure.
   */
  onConfirm: () => unknown;
} & Omit<ButtonProps, "onClick" | "loading">;

/** The footer's main button, last: it acts, then closes the dialog. */
export function Confirm({
  onConfirm,
  intent = "danger",
  ...props
}: ConfirmProps) {
  const actions = use(ActionsContext);
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    setBusy(true);
    try {
      await onConfirm();
      actions.current?.close();
    } catch {
      // The action has reported its failure; the dialog stays open to retry.
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      {...props}
      intent={intent}
      loading={busy}
      onClick={() => void confirm()}
    />
  );
}

export type BasicProps = {
  /** The question: “Delete Max?”. */
  title: ReactNode;
  /** What happens next, in one or two sentences. */
  description?: ReactNode;
  /** Names the action: “Delete Max”. */
  confirmLabel: ReactNode;
  /** The cancel button’s label. Defaults to “Cancel”. */
  cancelLabel?: ReactNode;
  /** `danger` by default; `primary` for a confirmation that destroys nothing. */
  intent?: ConfirmProps["intent"];
  /** Opens the confirmation from this element, such as `<Button />`, which takes the focus back when it closes. */
  trigger?: ReactElement;
} & Pick<ConfirmProps, "onConfirm" | "loadingLabel"> &
  Omit<ComponentProps<typeof Root>, "children">;

/**
 * A confirmation from props: the question and the close button, what happens
 * next, Cancel, then the action. It opens with the focus on Cancel, so a
 * stray Enter never confirms.
 */
export function Basic({
  title,
  description,
  confirmLabel,
  cancelLabel,
  intent = "danger",
  trigger,
  onConfirm,
  loadingLabel,
  ...props
}: BasicProps) {
  const cancel = useRef<HTMLButtonElement>(null);

  return (
    <Root {...props}>
      {trigger === undefined ? null : <Trigger render={trigger} />}
      <Dialog.Popup initialFocus={cancel}>
        <Dialog.Header>
          <Dialog.Title>{title}</Dialog.Title>
          <Dialog.Close />
        </Dialog.Header>
        {description === undefined ? null : (
          <Dialog.Description>{description}</Dialog.Description>
        )}
        <Dialog.Footer>
          <Dialog.Cancel ref={cancel}>{cancelLabel}</Dialog.Cancel>
          <Confirm
            intent={intent}
            onConfirm={onConfirm}
            loadingLabel={loadingLabel}
          >
            {confirmLabel}
          </Confirm>
        </Dialog.Footer>
      </Dialog.Popup>
    </Root>
  );
}
