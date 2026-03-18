import {
  DEFAULT_RESPONSE_ECHO,
  INAPP_PROMPT_DISMISS_KEY,
  RESUME_STATE_KEY,
  SITE_PASSWORD,
  UNLOCK_SESSION_KEY,
  getEnv,
} from "./config.js";
import { getDom } from "./dom.js";
import { createAudioController } from "./audio.js";
import { CONTENT, applyContent } from "./content.js";
import { initTheme } from "./theme.js";
import {
  setLowPowerMode,
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
  const resumeState = readResumeState(RESUME_STATE_KEY);
  setupViewportSizing();
  const compactMode = env.compactMotion || env.lowPerfDevice;
  const canAnimateWelcome = env.hasGSAP && !env.reducedMotion;
  let welcomeIntroStarted = false;
  let ambientMotionReady = false;
  initTheme(dom);
  applyContent(dom);
  setupInAppPrompt(dom, env);

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
    selectedResponseIndex: Number.isInteger(resumeState.responseIndex) ? resumeState.responseIndex : -1,
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
  const persistExperienceState = () => {
    persistResumeState(RESUME_STATE_KEY, {
      scene: state.currentScene,
      responseIndex: Number.isInteger(state.selectedResponseIndex) ? state.selectedResponseIndex : -1,
      theme: dom.body.dataset.theme || "light",
    });
  };

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
    onStateChange: () => {
      persistExperienceState();
    },
  });
  const adaptiveBudget = createAdaptiveBudgetController({ dom, env });

  if (dom.beginButton) {
    dom.beginButton.disabled = false;
    dom.beginButton.hidden = false;
    dom.beginButton.style.opacity = "1";
    dom.beginButton.style.visibility = "visible";
    dom.beginButton.style.pointerEvents = "auto";
  }
  dom.body.dataset.scene = "welcome";

  function startWelcomeVisuals({ skipEntrance = false } = {}) {
    setAmbientSuspended(document.hidden);

    if (canAnimateWelcome && !ambientMotionReady) {
      setupAmbientMotion(env);
      ambientMotionReady = true;
    }

    if (canAnimateWelcome) {
      setActiveLilyScene(state.currentScene);
      if (!skipEntrance && !welcomeIntroStarted) {
        welcomeIntroStarted = true;
        animateWelcomeEntrance(env);
      }
      return;
    }

    if (!skipEntrance && !welcomeIntroStarted) {
      welcomeIntroStarted = true;
      scenes.showWelcomeFallback();
    }
  }

  bindLock({
    dom,
    env,
    sitePassword: SITE_PASSWORD,
    unlockSessionKey: UNLOCK_SESSION_KEY,
    onUnlock: async () => {
      state.experienceUnlocked = true;
      tracker.markUnlocked();
      const resumeScene = normalizeResumeScene(resumeState.scene);
      const shouldResume = Boolean(resumeScene && resumeScene !== "welcome");
      startWelcomeVisuals({ skipEntrance: shouldResume });

      if (shouldResume || state.selectedResponseIndex >= 0) {
        await scenes.hydrateFromResume({
          scene: resumeScene,
          responseIndex: state.selectedResponseIndex,
        });
      }

      adaptiveBudget.start();
      persistExperienceState();
    },
  });

  dom.themeToggle?.addEventListener("click", () => {
    window.setTimeout(persistExperienceState, 0);
  });

  window.addEventListener("pagehide", persistExperienceState);

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

function setupInAppPrompt(dom, env) {
  const prompt = dom.inAppPrompt;
  if (!prompt) return;

  const shouldShow = env.mobileViewport && env.inAppBrowser && !getDismissedInAppPrompt();
  dom.body.classList.toggle("is-inapp-browser", shouldShow);
  prompt.classList.toggle("is-hidden", !shouldShow);
  if (!shouldShow) return;

  const openButton = dom.inAppOpenButton;
  const dismissButton = dom.inAppDismissButton;

  openButton?.addEventListener("click", () => {
    const url = window.location.href;
    const opened = window.open(url, "_blank", "noopener,noreferrer");
    if (!opened && dom.inAppPromptText) {
      dom.inAppPromptText.textContent = CONTENT.inApp.fallbackMessage;
    }
  });

  dismissButton?.addEventListener("click", () => {
    setDismissedInAppPrompt();
    prompt.classList.add("is-hidden");
  });
}

function createAdaptiveBudgetController({ dom, env }) {
  let started = false;
  let lowModeApplied = false;

  return { start };

  function start() {
    if (started) return;
    started = true;

    if (env.lowPerfDevice || env.saveData) {
      applyLowMotionMode();
      return;
    }

    if (env.reducedMotion) return;

    monitorBattery();
    monitorFps();
  }

  function applyLowMotionMode() {
    if (lowModeApplied) return;
    lowModeApplied = true;
    dom.body.classList.add("is-compact-motion", "is-adaptive-low");
    setLowPowerMode(true);
  }

  function monitorBattery() {
    if (typeof navigator.getBattery !== "function") return;
    navigator.getBattery().then((battery) => {
      const evaluate = () => {
        if (!battery.charging && battery.level <= 0.28) {
          applyLowMotionMode();
        }
      };
      evaluate();
      battery.addEventListener("chargingchange", evaluate);
      battery.addEventListener("levelchange", evaluate);
    }).catch(() => {
      // no-op
    });
  }

  function monitorFps() {
    window.setTimeout(async () => {
      const fps = await sampleFps(1200);
      if (fps > 0 && fps < 46) {
        applyLowMotionMode();
      }
    }, 900);
  }
}

function sampleFps(durationMs = 1200) {
  return new Promise((resolve) => {
    const start = performance.now();
    let frames = 0;

    const tick = (time) => {
      frames += 1;
      if (time - start >= durationMs) {
        const fps = (frames * 1000) / Math.max(1, time - start);
        resolve(fps);
        return;
      }
      window.requestAnimationFrame(tick);
    };

    window.requestAnimationFrame(tick);
  });
}

function normalizeResumeScene(scene) {
  const value = String(scene || "");
  if (!value) return "";
  const allowed = new Set(["welcome", "reveal", "keepsake", "note", "collage", "question", "response", "final"]);
  return allowed.has(value) ? value : "";
}

function readResumeState(key) {
  const storage = getStorage();
  if (!storage) return {};
  try {
    const raw = storage.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed ? parsed : {};
  } catch {
    return {};
  }
}

function persistResumeState(key, nextState) {
  const storage = getStorage();
  if (!storage) return;

  try {
    const current = readResumeState(key);
    const merged = {
      ...current,
      ...nextState,
      updatedAt: new Date().toISOString(),
    };
    storage.setItem(key, JSON.stringify(merged));
  } catch {
    // no-op
  }
}

function getDismissedInAppPrompt() {
  const storage = getStorage();
  if (!storage) return false;
  return storage.getItem(INAPP_PROMPT_DISMISS_KEY) === "1";
}

function setDismissedInAppPrompt() {
  const storage = getStorage();
  if (!storage) return;
  storage.setItem(INAPP_PROMPT_DISMISS_KEY, "1");
}

function getStorage() {
  try {
    return window.localStorage;
  } catch {
    try {
      return window.sessionStorage;
    } catch {
      return null;
    }
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
