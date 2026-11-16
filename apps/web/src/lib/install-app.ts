import { useSyncExternalStore } from "react";

type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

declare global {
  interface WindowEventMap {
    beforeinstallprompt: InstallPrompt;
  }
  interface Navigator {
    /** iOS Safari's own flag, `true` in an app opened from the home screen. */
    standalone?: boolean;
  }
}

/**
 * How this browser installs FPR: its own prompt (Chrome, Edge), the steps of
 * the Share menu on iPhone and iPad, the steps of Safari's File menu on a
 * Mac, or `null` when FPR runs installed or the browser can't install it.
 */
export type InstallWay = "prompt" | "ios" | "mac" | null;

let deferred: InstallPrompt | null = null;
let installed = false;
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function runsInstalled() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    navigator.standalone === true
  );
}

/** The install steps of a browser with no prompt, read from its user agent. */
function menuWay({ userAgent, maxTouchPoints }: Navigator): InstallWay {
  const mac = userAgent.includes("Macintosh");
  // iPadOS asks for the desktop site: a Mac with a touch screen is an iPad.
  if (/iPhone|iPad|iPod/.test(userAgent) || (mac && maxTouchPoints > 1)) {
    return "ios";
  }
  const safari = /Version\/(\d+)[\d.]* Safari\//.exec(userAgent);
  // Add to Dock arrived with Safari 17. Chrome, Edge and Firefox on a Mac
  // carry no `Version/`.
  return mac && safari !== null && Number(safari[1]) >= 17 ? "mac" : null;
}

function installWay(): InstallWay {
  if (installed || runsInstalled()) return null;
  if (deferred !== null) return "prompt";
  return menuWay(navigator);
}

/**
 * Keeps the browser's install prompt for Settings. It runs at app start: the
 * browser fires `beforeinstallprompt` once, whatever screen is open.
 */
export function watchInstall() {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferred = event;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    installed = true;
    notify();
  });
}

/**
 * Opens the browser's install prompt. A prompt shows once: dismissed, the way
 * is gone until the browser offers a new one.
 */
export async function install() {
  const event = deferred;
  if (event === null) return;
  deferred = null;
  notify();
  await event.prompt();
  const { outcome } = await event.userChoice;
  if (outcome === "accepted") {
    installed = true;
    notify();
  }
}

export function useInstallWay() {
  return useSyncExternalStore(subscribe, installWay);
}
