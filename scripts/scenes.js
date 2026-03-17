import { DEFAULT_RESPONSE_ECHO } from "./config.js";
import { getAtmosphereTargets, getSceneTargets, wait } from "./utils.js";

const SCENE_ORDER = ["welcome", "reveal", "keepsake", "note", "collage", "question", "response", "final"];

export function createSceneController({ dom, state, sceneMap, audio, env, onSceneChange }) {
  const typedScenes = new Set();
  let keepsakeOpened = false;
  let isTransitioning = false;
  let isBeginning = false;
  let collageDriftTween = null;

  bindResponses();
  bindMainActions();
  bindNavActions();
  updateNavState();

  return {
    goToScene,
    showWelcomeFallback,
  };

  function showWelcomeFallback() {
    const welcome = sceneMap.get("welcome");
    if (!welcome) return;
    welcome.style.opacity = "1";
    welcome.style.visibility = "visible";
    dom.body.dataset.scene = "welcome";
    onSceneChange?.("welcome");
    updateNavState();
  }

  async function beginExperience() {
    if (!state.experienceUnlocked || state.currentScene !== "welcome" || isBeginning || isTransitioning) return;
    isBeginning = true;

    if (dom.beginButton) {
      dom.beginButton.disabled = true;
    }
    updateNavState();

    await audio.startSong(false);
    await goToScene("reveal");

    if (dom.beginButton) {
      dom.beginButton.disabled = false;
    }
    isBeginning = false;
    updateNavState();
  }

  function bindMainActions() {
    dom.beginButton?.addEventListener("click", () => {
      beginExperience();
    });

    dom.keepsakeButton?.addEventListener("click", () => {
      openKeepsake();
    });
  }

  function bindNavActions() {
    dom.prevButton?.addEventListener("click", () => {
      if (isTransitioning || isBeginning) return;

      const index = SCENE_ORDER.indexOf(state.currentScene);
      if (index <= 0) return;
      goToScene(SCENE_ORDER[index - 1]);
    });

    dom.nextButton?.addEventListener("click", () => {
      if (isTransitioning || isBeginning) return;

      if (state.currentScene === "welcome") {
        beginExperience();
        return;
      }

      const index = SCENE_ORDER.indexOf(state.currentScene);
      if (index < 0 || index >= SCENE_ORDER.length - 1) return;

      if (!canAdvanceFrom(state.currentScene)) {
        nudgeKeepsake();
        return;
      }

      goToScene(SCENE_ORDER[index + 1]);
    });
  }

  function canAdvanceFrom(sceneName) {
    if (sceneName === "keepsake") return keepsakeOpened;
    return true;
  }

  function updateNavState() {
    if (!dom.prevButton || !dom.nextButton || !dom.sceneProgress) return;

    const index = SCENE_ORDER.indexOf(state.currentScene);
    const safeIndex = index < 0 ? 0 : index;
    const isFirst = safeIndex === 0;
    const isLast = safeIndex === SCENE_ORDER.length - 1;
    const nextBlocked = isLast || !canAdvanceFrom(state.currentScene) || isTransitioning || isBeginning;

    dom.prevButton.disabled = isFirst || isTransitioning || isBeginning;
    dom.nextButton.disabled = nextBlocked;
    dom.nextButton.textContent = isFirst ? "Begin" : isLast ? "Done" : "Next";
    dom.sceneProgress.textContent = `${safeIndex + 1} / ${SCENE_ORDER.length}`;
  }

  function nudgeKeepsake() {
    if (!env.hasGSAP || env.reducedMotion || !dom.keepsakeButton) return;

    gsap.fromTo(
      dom.keepsakeButton,
      { y: 0, scale: 1 },
      { y: -5, scale: 1.01, duration: 0.18, repeat: 1, yoyo: true, ease: "power1.inOut" }
    );
  }

  function bindResponses() {
    const { responseCards, responseEcho } = dom;
    if (!responseCards.length || !responseEcho) return;

    responseCards.forEach((card) => {
      card.addEventListener("click", () => {
        responseCards.forEach((item) => item.classList.remove("is-selected"));
        card.classList.add("is-selected");
        responseEcho.textContent = card.dataset.followup || DEFAULT_RESPONSE_ECHO;

        if (env.hasGSAP && !env.reducedMotion) {
          gsap.killTweensOf(responseEcho);
          gsap.fromTo(
            responseEcho,
            { opacity: 0, y: 10 },
            { opacity: 1, y: 0, duration: 0.45, ease: "power2.out", overwrite: "auto" }
          );
        }
      });
    });
  }

  async function goToScene(name) {
    if (name === state.currentScene || isTransitioning) return;

    state.sceneToken += 1;
    const token = state.sceneToken;
    const current = sceneMap.get(state.currentScene);
    const next = sceneMap.get(name);
    if (!next) return;
    if (state.currentScene === "collage" && collageDriftTween) {
      collageDriftTween.kill();
      collageDriftTween = null;
    }

    isTransitioning = true;
    updateNavState();

    try {
      if (env.hasGSAP && !env.reducedMotion) {
        await transitionScenes(current, next);
      } else {
        simpleTransition(current, next);
      }
    } finally {
      isTransitioning = false;
    }

    if (token !== state.sceneToken) return;

    state.currentScene = name;
    dom.body.dataset.scene = name;
    onSceneChange?.(name);
    await runScene(name, token);
    updateNavState();
  }

  function simpleTransition(current, next) {
    current?.classList.remove("scene--active");
    current?.setAttribute("aria-hidden", "true");
    next.classList.add("scene--active");
    next.setAttribute("aria-hidden", "false");
  }

  function transitionScenes(current, next) {
    return new Promise((resolve) => {
      const nextContent = getSceneTargets(next);
      const currentContent = current ? getSceneTargets(current) : [];
      const nextAtmosphere = getAtmosphereTargets(next);

      next.classList.add("scene--active");
      next.setAttribute("aria-hidden", "false");

      gsap.killTweensOf(next);
      gsap.killTweensOf(current);
      gsap.killTweensOf(nextContent);
      gsap.killTweensOf(currentContent);

      gsap.set(next, { autoAlpha: 0, visibility: "visible" });
      gsap.set(nextContent, { autoAlpha: 0, y: env.compactMotion ? 8 : 12, scale: 0.996 });
      gsap.set(nextAtmosphere, { autoAlpha: 1 });

      const tl = gsap.timeline({
        defaults: { ease: "power1.inOut" },
        onComplete: () => {
          if (current) {
            current.classList.remove("scene--active");
            current.setAttribute("aria-hidden", "true");
            gsap.set(current, { autoAlpha: 0, visibility: "hidden" });
            gsap.set(currentContent, { clearProps: "opacity,visibility,y,scale" });
          }

          gsap.set(next, { autoAlpha: 1, visibility: "visible" });
          gsap.set(nextContent, { clearProps: "opacity,visibility,y,scale" });
          resolve();
        },
      });

      if (current) {
        tl.to(currentContent, { autoAlpha: 0, y: -8, duration: 0.46, force3D: true }, 0)
          .to(current, { autoAlpha: 0, duration: 0.56 }, 0.04);
      }

      tl.to(next, { autoAlpha: 1, duration: 0.66 }, 0.08)
        .fromTo(nextAtmosphere, { autoAlpha: 0.88 }, { autoAlpha: 1, duration: 0.52 }, 0.08)
        .to(nextContent, {
          autoAlpha: 1,
          y: 0,
          scale: 1,
          duration: 0.58,
          stagger: 0.03,
          ease: "power2.out",
          force3D: true,
          overwrite: "auto",
        }, 0.14);
    });
  }

  async function runScene(name, token) {
    if (token !== state.sceneToken) return;

    switch (name) {
      case "reveal":
        await runTypedScene("reveal", token, 34);
        break;
      case "keepsake":
        if (keepsakeOpened) {
          dom.keepsakeButton?.classList.add("is-opened");
        }
        break;
      case "note":
        await runTypedScene("note", token, 26);
        break;
      case "collage":
        revealCollage();
        break;
      case "question":
        await runTypedScene("question", token, 24, 360);
        break;
      case "response":
        enterResponseScene(token);
        break;
      case "final":
        await runTypedScene("final", token, 28);
        break;
      default:
        break;
    }
  }

  async function runTypedScene(sceneName, token, speed, gap = 220) {
    const scene = sceneMap.get(sceneName);
    if (!scene) return;

    if (typedScenes.has(sceneName)) {
      fillTypeGroup(scene);
      return;
    }

    const finished = await typeGroup(scene, token, speed, gap);
    if (finished && token === state.sceneToken) {
      typedScenes.add(sceneName);
    }
  }

  async function typeGroup(scene, token, speed, gap = 220) {
    if (!scene) return false;
    const nodes = Array.from(scene.querySelectorAll(".type-line"));

    for (const node of nodes) {
      const complete = await typeNode(node, token, speed);
      if (!complete) return false;
      await wait(gap);
    }

    return true;
  }

  function fillTypeGroup(scene) {
    Array.from(scene.querySelectorAll(".type-line")).forEach((node) => {
      node.textContent = node.dataset.fullText || "";
      node.classList.remove("is-typing");
    });
  }

  async function typeNode(node, token, speed) {
    const fullText = node.dataset.fullText || "";
    node.textContent = "";
    node.classList.add("is-typing");

    for (const character of fullText) {
      if (token !== state.sceneToken) {
        node.classList.remove("is-typing");
        return false;
      }

      node.textContent += character;
      await wait(speed);
    }

    node.classList.remove("is-typing");
    return true;
  }

  function enterResponseScene(token) {
    if (!env.hasGSAP || env.reducedMotion) return;
    if (token !== state.sceneToken) return;

    gsap.set(dom.responseCards, { opacity: 0, y: 18 });
    gsap.set(dom.responseEcho, { opacity: 0, y: 10 });

    gsap.fromTo(
      dom.responseCards,
      { opacity: 0, y: 18 },
      {
        opacity: 1,
        y: 0,
        duration: 0.74,
        stagger: 0.08,
        ease: "power2.out",
        overwrite: "auto",
      }
    );

    gsap.fromTo(
      dom.responseEcho,
      { opacity: 0, y: 10 },
      {
        opacity: 1,
        y: 0,
        duration: 0.64,
        ease: "power2.out",
        delay: 0.22,
        overwrite: "auto",
      }
    );
  }

  function revealCollage() {
    if (!env.hasGSAP || env.reducedMotion) return;
    const collage = sceneMap.get("collage");
    if (!collage) return;
    const cards = Array.from(collage.querySelectorAll(".memory-card"));
    if (!cards.length) return;

    gsap.killTweensOf(cards);

    gsap.fromTo(
      cards,
      { opacity: 0, y: 18, rotation: -1.5 },
      {
        opacity: 1,
        y: 0,
        rotation: 0,
        duration: 0.82,
        stagger: 0.12,
        ease: "power2.out",
        overwrite: "auto",
      }
    );

    collageDriftTween = gsap.to(cards, {
      y: (index) => (index % 2 === 0 ? -4 : 4),
      duration: 3.8,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
      stagger: 0.14,
    });
  }

  function openKeepsake() {
    if (!dom.keepsakeButton) return;

    if (keepsakeOpened) {
      goToScene("note");
      return;
    }

    keepsakeOpened = true;
    dom.keepsakeButton.classList.add("is-opened");
    updateNavState();

    if (env.hasGSAP && !env.reducedMotion) {
      gsap.timeline({
        defaults: { ease: "power2.inOut" },
        onComplete: () => {
          goToScene("note");
        },
      })
        .to(".keepsake__lid", { rotateX: -168, duration: 1.1 }, 0)
        .to(".keepsake__seal", { opacity: 0, scale: 0.85, duration: 0.35 }, 0)
        .to(".keepsake__paper", { yPercent: -24, duration: 0.95 }, 0.14)
        .to(".keepsake", { y: -8, duration: 0.85 }, 0);
      return;
    }

    goToScene("note");
  }
}
