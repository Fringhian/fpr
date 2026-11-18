import { cssVariable } from "./css-variable";

/** Whether the person asked the system for reduced motion: then nothing scripted moves. */
export function reducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** A scripted animation's timing, from the tokens of `theme.css`: one of the three durations, on the soft easing. */
export function motionTiming(
  duration: "s" | "m" | "l",
): KeyframeAnimationOptions {
  return {
    duration:
      Number.parseFloat(cssVariable(`--transition-duration-${duration}`)) || 0,
    easing: cssVariable("--ease-soft") || "linear",
  };
}
