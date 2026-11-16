import {
  PageMessage,
  type PageMessageProps,
} from "../../components/templates/page-message/page-message";

/** A page that is only a message, on its own: the page's `<main>`, on snow. */
export function MessagePage(props: PageMessageProps) {
  return (
    <main className="min-h-dvh bg-page px-m font-sans text-primary">
      <PageMessage {...props} />
    </main>
  );
}
