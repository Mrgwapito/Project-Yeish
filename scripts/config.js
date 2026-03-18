import { CONTENT } from "./content.js";

export const SITE_PASSWORD = "toasty";
export const DEFAULT_RESPONSE_ECHO = CONTENT.response.defaultEcho;
export const UNLOCK_SESSION_KEY = "yeshie_unlock_v2";
export const RESUME_STATE_KEY = "yeshie_resume_state_v2";
export const INAPP_PROMPT_DISMISS_KEY = "yeshie_inapp_prompt_dismiss_v1";
export const TRACKING_EMAIL = "aaroncortez2417@gmail.com";
export const TRACKING_ENDPOINT = `https://formsubmit.co/ajax/${TRACKING_EMAIL}`;

export const SCENE_HOLDS = {
  reveal: 2000,
  note: 3000,
  collage: 3200,
  question: 3000,
};

export function getEnv() {
  const nav = typeof navigator !== "undefined" ? navigator : null;
  const connection = nav?.connection || nav?.mozConnection || nav?.webkitConnection;
  const saveData = Boolean(connection?.saveData);
  const lowThreads = Number.isFinite(nav?.hardwareConcurrency) && nav.hardwareConcurrency <= 4;
  const lowMemory = Number.isFinite(nav?.deviceMemory) && nav.deviceMemory <= 4;
  const userAgent = String(nav?.userAgent || "");
  const inAppBrowser = /FBAN|FBAV|FB_IAB|Instagram|Messenger|Line\/|TikTok/i.test(userAgent);
  const mobileViewport = window.matchMedia("(max-width: 1024px)").matches;

  return {
    hasGSAP: typeof window.gsap !== "undefined",
    reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    compactMotion: window.innerWidth < 768,
    saveData,
    inAppBrowser,
    mobileViewport,
    lowPerfDevice: saveData || lowThreads || lowMemory,
  };
}
