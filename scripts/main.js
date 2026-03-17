import { DEFAULT_RESPONSE_ECHO, SITE_PASSWORD, UNLOCK_SESSION_KEY, getEnv } from "./config.js";
import { getDom } from "./dom.js";
import { createAudioController } from "./audio.js";
import {
  setupAmbientMotion,
  setActiveLilyScene,
  animateWelcomeEntrance,
  buildDust,
  buildFallingLilies,
  buildLilies,
  enableLilyDrag,
  prepareTypeNodes,
} from "./flora.js";
import { bindLock } from "./lock.js";
import { createSceneController } from "./scenes.js";

export function bootApp() {
  const env = getEnv();
  const dom = getDom();
  const compactMode = env.compactMotion || env.lowPerfDevice;

  if (env.hasGSAP) {
    gsap.config({ autoSleep: 60, force3D: true, nullTargetWarn: false });
    gsap.ticker.lagSmoothing(1000, 16);
  }

  dom.body.classList.toggle("is-compact-motion", compactMode);

  const state = {
    currentScene: "welcome",
    autoTimer: null,
    sceneToken: 0,
    songReady: false,
    songMissing: false,
    requestedSongLoad: false,
    experienceUnlocked: false,
    defaultResponseEcho: DEFAULT_RESPONSE_ECHO,
  };

  prepareTypeNodes(dom.typeNodes);
  buildDust(dom.dustField, env);
  buildFallingLilies(dom.petalFall, env);
  buildLilies(env);
  enableLilyDrag(env);

  const audio = createAudioController({ dom, state });

  const sceneMap = new Map(dom.scenes.map((scene) => [scene.dataset.scene, scene]));
  const scenes = createSceneController({
    dom,
    state,
    sceneMap,
    audio,
    env,
    onSceneChange: (sceneName) => {
      setActiveLilyScene(sceneName);
    },
  });

  if (dom.beginButton) {
    dom.beginButton.disabled = false;
    dom.beginButton.hidden = false;
    dom.beginButton.style.opacity = "1";
    dom.beginButton.style.visibility = "visible";
    dom.beginButton.style.pointerEvents = "auto";
  }
  dom.body.dataset.scene = state.currentScene;

  bindLock({
    dom,
    env,
    sitePassword: SITE_PASSWORD,
    unlockSessionKey: UNLOCK_SESSION_KEY,
    onUnlock: () => {
      state.experienceUnlocked = true;
    },
  });

  if (env.hasGSAP && !env.reducedMotion) {
    setupAmbientMotion(env);
    setActiveLilyScene(state.currentScene);
    animateWelcomeEntrance(env);
  } else {
    scenes.showWelcomeFallback();
  }

  if (!state.experienceUnlocked) {
    dom.passwordInput?.focus();
  }
}
