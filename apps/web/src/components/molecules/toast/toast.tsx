import { Toast as BaseToast } from "@base-ui/react/toast";
import { XIcon } from "@phosphor-icons/react/X";
import type { ComponentProps } from "react";
import { useTranslation } from "react-i18next";
import { cn, stateClassName } from "../../../lib/cn";
import { Button } from "../../atoms/button/button";
import { IconButton } from "../../atoms/icon-button/icon-button";

/** How long a toast stays, in ms, unless the pointer or the focus is on the region. */
export const TOAST_TIMEOUT = 5000;

/**
 * Holds the toasts, for every page under it: Base UI's `Toast.Provider`, at
 * most three toasts at once, each gone after 5 s. Mounted once, around every
 * layout, so a toast outlives the page that showed it.
 */
export function Provider(props: ComponentProps<typeof BaseToast.Provider>) {
  return <BaseToast.Provider timeout={TOAST_TIMEOUT} limit={3} {...props} />;
}

const viewport = cn(
  "fixed inset-x-0 z-50 mx-auto flex flex-col-reverse gap-s font-sans outline-none pointer-events-none",
  "bottom-[calc(var(--tab-bar-room)+var(--spacing-s))] w-[calc(100%-2*var(--spacing-m))]",
  "tablet:bottom-[calc(var(--spacing-l)+env(safe-area-inset-bottom,0px))] tablet:w-[24rem]",
  "desktop:bottom-[calc(var(--spacing-l)+env(safe-area-inset-bottom,0px))] desktop:w-[24rem]",
);

/**
 * The region the toasts show in, a polite live region named “Notifications”:
 * a screen reader reads each new toast once the current sentence ends. At the
 * bottom of the screen: above the tab bar on phone, centred from tablet up.
 * F6 moves the focus into it. Every prop of Base UI's `Toast.Viewport`.
 */
export function Viewport({
  className,
  ...props
}: ComponentProps<typeof BaseToast.Viewport>) {
  const { t } = useTranslation();

  return (
    <BaseToast.Portal>
      <BaseToast.Viewport
        aria-label={t("toast.region")}
        {...props}
        className={stateClassName(viewport, className)}
      />
    </BaseToast.Portal>
  );
}

const root = cn(
  "pointer-events-auto flex items-center gap-s rounded-card bg-surface py-s ps-m pe-s text-primary shadow-float translate-y-0 opacity-100 transition-[translate,opacity] duration-m ease-soft",
  "",
  "",
  "",
  "starting-style:translate-y-full starting-style:opacity-0",
  "ending-style:translate-y-full ending-style:opacity-0",
  "limited:hidden",
  "focus-visible:focus-ring",
  "motion-reduce:transition-opacity",
);

/**
 * One toast, a white card that rises into the region and sinks out of it;
 * with reduced motion, it only fades. A swipe down or sideways dismisses it.
 * Every prop of Base UI's `Toast.Root`, `toast` included.
 */
export function Root({
  className,
  ...props
}: ComponentProps<typeof BaseToast.Root>) {
  return (
    <BaseToast.Root
      swipeDirection={["down", "left", "right"]}
      {...props}
      className={stateClassName(root, className)}
    />
  );
}

/** The title and the description, one column that takes the room left. */
export function Text({ className, ...props }: ComponentProps<"div">) {
  return (
    <div {...props} className={cn("flex min-w-0 flex-1 flex-col", className)} />
  );
}

/** What happened: “Change deleted”. The toast's title, or `children`. */
export function Title({
  className,
  ...props
}: ComponentProps<typeof BaseToast.Title>) {
  return (
    <BaseToast.Title
      {...props}
      className={stateClassName("text-s font-medium", className)}
    />
  );
}

/** One more line, when the title needs one. The toast's description, or `children`. */
export function Description({
  className,
  ...props
}: ComponentProps<typeof BaseToast.Description>) {
  return (
    <BaseToast.Description
      {...props}
      className={stateClassName("text-xs text-secondary", className)}
    />
  );
}

/** The toast's action, such as Undo: a small secondary button, from the toast's `actionProps`. Renders nothing without a label. */
export function Action(
  props: Omit<ComponentProps<typeof BaseToast.Action>, "render">,
) {
  return (
    <BaseToast.Action
      {...props}
      render={<Button intent="secondary" size="s" />}
    />
  );
}

/** The cross at the end, named “Dismiss”. Always shown, so always read too. */
export function Close(
  props: Omit<ComponentProps<typeof BaseToast.Close>, "render" | "children">,
) {
  const { t } = useTranslation();

  return (
    <BaseToast.Close
      // Base UI hides it from screen readers while its stack is collapsed;
      // these toasts never stack, so it stays visible and named.
      aria-hidden={false}
      {...props}
      render={<IconButton icon={XIcon} label={t("toast.dismiss")} />}
    />
  );
}

/** A toast from its object: its title and description, its action, then Dismiss. */
export function Basic({ toast }: { toast: BaseToast.Root.ToastObject }) {
  return (
    <Root toast={toast}>
      <Text>
        <Title />
        <Description />
      </Text>
      <Action />
      <Close />
    </Root>
  );
}

/** Every toast of the provider, newest first: the region stacks them upwards, so the newest is at the bottom. */
function List() {
  const { toasts } = BaseToast.useToastManager();

  return toasts.map((toast) => <Basic key={toast.id} toast={toast} />);
}

/** The region with every toast in it, mounted once per layout. */
export function Region(props: ComponentProps<typeof Viewport>) {
  return (
    <Viewport {...props}>
      <List />
    </Viewport>
  );
}
