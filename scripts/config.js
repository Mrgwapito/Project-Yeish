export const SITE_PASSWORD = "toasty";
export const DEFAULT_RESPONSE_ECHO = "Whatever you feel, I want it to be honest and easy to say.";
export const UNLOCK_SESSION_KEY = "yeshie_unlock_v2";

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

  return {
    hasGSAP: typeof window.gsap !== "undefined",
    reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    compactMotion: window.innerWidth < 768,
    lowPerfDevice: saveData || lowThreads || lowMemory,
  };
}
