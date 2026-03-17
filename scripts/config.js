export const SITE_PASSWORD = "aspin na monkey";
export const DEFAULT_RESPONSE_ECHO = "Whatever you feel, I want it to be honest and easy to say.";
export const UNLOCK_SESSION_KEY = "yeshie_unlock_v1";

export const SCENE_HOLDS = {
  reveal: 2000,
  note: 3000,
  collage: 3200,
  question: 3000,
};

export function getEnv() {
  return {
    hasGSAP: typeof window.gsap !== "undefined",
    reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    compactMotion: window.innerWidth < 768,
  };
}
