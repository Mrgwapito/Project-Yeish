import { DEFAULT_RESPONSE_ECHO, SITE_PASSWORD, UNLOCK_SESSION_KEY, getEnv } from "./config.js";
import { getDom } from "./dom.js";
import { createAudioController } from "./audio.js";
import { applyContent } from "./content.js";
import { initTheme } from "./theme.js";
import {
  setupAmbientMotion,
  setActiveLilyScene,
  setAmbientSuspended,
  animateWelcomeEntrance,
  buildDust,
  buildFallingLilies,
  buildLilies,
  enableLilyDrag,
  prepareTypeNodes,
} from "./flora.js";
import { bindLock } from "./lock.js";
import { createSceneController } from "./scenes.js";
import { createTracker } from "./tracking.js";

export function bootApp() {
  const env = getEnv();
  const dom = getDom();
  setupViewportSizing();
  const compactMode = env.compactMotion || env.lowPerfDevice;
  const canAnimateWelcome = env.hasGSAP && !env.reducedMotion;
  let welcomeIntroStarted = false;
  initTheme(dom);
  applyContent(dom);

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
  const tracker = createTracker({ state });

  prepareTypeNodes(dom.typeNodes);
  buildDust(dom.dustField, env);
  buildFallingLilies(dom.petalFall, env);
  buildLilies(env);
  enableLilyDrag(env);
  setAmbientSuspended(true);

  const audio = createAudioController({ dom, state });

  const sceneMap = new Map(dom.scenes.map((scene) => [scene.dataset.scene, scene]));
  const scenes = createSceneController({
    dom,
    state,
    sceneMap,
    audio,
    env,
    tracker,
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

  function startWelcomeVisuals() {
    if (welcomeIntroStarted) return;
    welcomeIntroStarted = true;
    setAmbientSuspended(document.hidden);

    if (canAnimateWelcome) {
      setupAmbientMotion(env);
      setActiveLilyScene(state.currentScene);
      animateWelcomeEntrance(env);
      return;
    }

    scenes.showWelcomeFallback();
  }

  bindLock({
    dom,
    env,
    sitePassword: SITE_PASSWORD,
    unlockSessionKey: UNLOCK_SESSION_KEY,
    onUnlock: () => {
      state.experienceUnlocked = true;
      tracker.markUnlocked();
      startWelcomeVisuals();
    },
  });

  document.addEventListener("visibilitychange", () => {
    if (!state.experienceUnlocked) return;
    setAmbientSuspended(document.hidden);

    if (env.hasGSAP) {
      if (document.hidden) {
        gsap.ticker.sleep();
      } else {
        gsap.ticker.wake();
      }
    }
  });

  if (!state.experienceUnlocked && !env.compactMotion) {
    dom.passwordInput?.focus();
  }
}

function setupViewportSizing() {
  const root = document.documentElement;
  let frame = 0;

  const commit = () => {
    frame = 0;
    const vv = window.visualViewport;
    const height = vv?.height || window.innerHeight;
    const topOffset = vv?.offsetTop || 0;

    root.style.setProperty("--app-vh", `${Math.max(320, Math.round(height))}px`);
    root.style.setProperty("--app-vv-top", `${Math.max(0, Math.round(topOffset))}px`);
  };

  const queueCommit = () => {
    if (frame) return;
    frame = window.requestAnimationFrame(commit);
  };

  commit();
  window.addEventListener("resize", queueCommit, { passive: true });
  window.addEventListener("orientationchange", queueCommit, { passive: true });
  window.visualViewport?.addEventListener("resize", queueCommit, { passive: true });
  window.visualViewport?.addEventListener("scroll", queueCommit, { passive: true });
}
