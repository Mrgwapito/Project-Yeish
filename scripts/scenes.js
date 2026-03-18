import { DEFAULT_RESPONSE_ECHO } from "./config.js";
import { CONTENT } from "./content.js";
import { getAtmosphereTargets, getSceneTargets, wait } from "./utils.js";

const SCENE_ORDER = ["welcome", "reveal", "keepsake", "note", "collage", "question", "response", "final"];
const PLAYER_COMPACT_SCENES = new Set(["question", "response"]);

export function createSceneController({ dom, state, sceneMap, audio, env, tracker, onSceneChange, onStateChange }) {
  const typedScenes = new Set();
  let keepsakeOpened = false;
  let isTransitioning = false;
  let isBeginning = false;
  let collageDriftTween = null;
  let responseAdvanceTimer = null;

  setupCollageSwipe();
  bindResponses();
  bindMainActions();
  bindNavActions();
  applyPlayerCompactState(state.currentScene);
  hydrateResponseSelection();
  if (!Number.isInteger(state.selectedResponseIndex) || state.selectedResponseIndex < 0) {
    setFinalLineText(CONTENT.final.line);
  }
  updateNavState();

  return {
    goToScene,
    hydrateFromResume,
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
    if (sceneName === "response") return hasSelectedResponse();
    return true;
  }

  function hasSelectedResponse() {
    return dom.responseCards.some((card) => card.classList.contains("is-selected"));
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

  function emitStateChange() {
    onStateChange?.({
      scene: state.currentScene,
      responseIndex: Number.isInteger(state.selectedResponseIndex) ? state.selectedResponseIndex : -1,
      responseEndingKey: state.selectedEndingKey || "",
    });
  }

  function applyPlayerCompactState(sceneName) {
    const compact = PLAYER_COMPACT_SCENES.has(sceneName);
    dom.musicPlayer?.classList.toggle("is-compact", compact);
    dom.body.classList.toggle("is-player-compact", compact);
  }

  function getFinalLineForSelection(index = state.selectedResponseIndex) {
    if (!Number.isInteger(index) || index < 0) return CONTENT.final.line;
    const option = CONTENT.response.options[index];
    const endingKey = option?.endingKey || "";
    return CONTENT.final.variants?.[endingKey] || CONTENT.final.line;
  }

  function setFinalLineText(text) {
    if (!dom.finalLine) return;
    const nextText = String(text || CONTENT.final.line);
    dom.finalLine.dataset.fullText = nextText;
    if (state.currentScene === "final") {
      dom.finalLine.textContent = nextText;
      dom.finalLine.classList.remove("is-typing");
    }
  }

  function hydrateResponseSelection() {
    if (!Number.isInteger(state.selectedResponseIndex)) {
      state.selectedResponseIndex = -1;
      state.selectedEndingKey = "";
      return;
    }

    if (state.selectedResponseIndex < 0 || state.selectedResponseIndex >= dom.responseCards.length) {
      state.selectedResponseIndex = -1;
      state.selectedEndingKey = "";
      return;
    }

    applyResponseSelection(state.selectedResponseIndex, {
      track: false,
      animate: false,
      autoAdvance: false,
      markAsHydrated: true,
    });
  }

  function applyResponseSelection(
    index,
    { track = true, animate = true, autoAdvance = true, markAsHydrated = false } = {}
  ) {
    const { responseCards, responseEcho } = dom;
    const selectedCard = responseCards[index];
    if (!selectedCard || !responseEcho) return;

    responseCards.forEach((item) => item.classList.remove("is-selected"));
    selectedCard.classList.add("is-selected");

    const followup = selectedCard.dataset.followup || DEFAULT_RESPONSE_ECHO;
    responseEcho.textContent = followup;
    state.selectedResponseIndex = index;
    state.selectedEndingKey = selectedCard.dataset.endingKey || "";
    setFinalLineText(getFinalLineForSelection(index));
    typedScenes.delete("final");

    if (track) {
      tracker?.captureResponse(selectedCard.textContent);
    }

    updateNavState();
    emitStateChange();

    if (animate && env.hasGSAP && !env.reducedMotion) {
      gsap.killTweensOf(responseEcho);
      gsap.fromTo(
        responseEcho,
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.45, ease: "power2.out", overwrite: "auto" }
      );
    }

    if (!autoAdvance || markAsHydrated) {
      return;
    }

    if (responseAdvanceTimer) {
      window.clearTimeout(responseAdvanceTimer);
    }
    responseAdvanceTimer = window.setTimeout(() => {
      responseAdvanceTimer = null;
      if (state.currentScene === "response" && !isTransitioning) {
        goToScene("final");
      }
    }, env.compactMotion || env.lowPerfDevice ? 900 : 1100);
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

    responseCards.forEach((card, index) => {
      card.addEventListener("click", () => {
        if (state.currentScene !== "response") return;

        applyResponseSelection(index, {
          track: true,
          animate: true,
          autoAdvance: true,
        });
      });
    });
  }

  async function goToScene(name) {
    if (name === state.currentScene || isTransitioning) return;
    if (responseAdvanceTimer) {
      window.clearTimeout(responseAdvanceTimer);
      responseAdvanceTimer = null;
    }

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
    applyPlayerCompactState(name);
    onSceneChange?.(name);
    emitStateChange();
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
        setFinalLineText(getFinalLineForSelection());
        await runTypedScene("final", token, 28);
        break;
      default:
        break;
    }
  }

  async function hydrateFromResume(resume = {}) {
    const sceneName = normalizeSceneName(resume.scene);
    const resumeIndex = Number.isInteger(resume.responseIndex) ? resume.responseIndex : -1;
    const hasResumeResponse = resumeIndex >= 0 && resumeIndex < dom.responseCards.length;

    if (hasResumeResponse) {
      applyResponseSelection(resumeIndex, {
        track: false,
        animate: false,
        autoAdvance: false,
        markAsHydrated: true,
      });
    }

    if (!sceneName || sceneName === "welcome") {
      updateNavState();
      return;
    }

    const targetIndex = SCENE_ORDER.indexOf(sceneName);
    if (targetIndex < 0) return;

    if (targetIndex >= SCENE_ORDER.indexOf("note")) {
      keepsakeOpened = true;
      dom.keepsakeButton?.classList.add("is-opened");
    }

    let targetScene = sceneName;
    if (targetScene === "final" && !hasSelectedResponse()) {
      targetScene = "response";
    }

    await goToScene(targetScene);
    updateNavState();
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

    if (!(env.compactMotion || env.lowPerfDevice)) {
      collageDriftTween = gsap.to(cards, {
        y: (index) => (index % 2 === 0 ? -4 : 4),
        duration: 3.8,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
        stagger: 0.14,
      });
    }
  }

  function setupCollageSwipe() {
    const collageScene = sceneMap.get("collage");
    const strip = collageScene?.querySelector(".collage");
    const nextButton = collageScene?.querySelector(".collage-next");
    const swipeHint = dom.collageSwipe;
    const swipeDots = dom.collageSwipeDots;
    const swipeText = dom.collageSwipeText;
    if (!strip) return;

    if (swipeText) {
      swipeText.textContent = "Swipe >";
    }

    const mediaQuery = window.matchMedia("(max-width: 820px)");
    let enabled = mediaQuery.matches;
    let active = false;
    let pointerId = null;
    let startX = 0;
    let startY = 0;
    let startScroll = 0;
    let startIndex = 0;
    let startTime = 0;
    let settleTimer = null;
    let buttonTimer = null;

    const onMediaChange = (event) => {
      enabled = event.matches;
      if (!enabled) {
        strip.classList.remove("is-dragging");
      }
      syncNextButtonState();
      updateSwipeCue();
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", onMediaChange);
    } else {
      mediaQuery.addListener(onMediaChange);
    }

    strip.addEventListener("pointerdown", onPointerDown, { passive: true });
    strip.addEventListener("pointerup", onPointerUp, { passive: true });
    strip.addEventListener("pointercancel", onPointerCancel, { passive: true });
    strip.addEventListener("scroll", onScroll, { passive: true });
    nextButton?.addEventListener("click", onNextTap);

    renderSwipeDots();
    syncNextButtonState();

    function onNextTap() {
      if (!enabled) return;
      const cards = getCards(strip);
      if (!cards.length) return;

      const currentIndex = findNearestCardIndex(strip);
      const targetIndex = clamp(currentIndex + 1, 0, cards.length - 1);
      scrollCardIntoView(strip, cards[targetIndex]);
      syncNextButtonState(targetIndex);
      updateSwipeCue(targetIndex);
      queueNextButtonSync(180);
    }

    function onPointerDown(event) {
      if (!enabled) return;
      if (event.pointerType === "mouse" && event.button !== 0) return;

      active = true;
      pointerId = event.pointerId;
      startX = event.clientX;
      startY = event.clientY;
      startScroll = strip.scrollLeft;
      startIndex = findNearestCardIndex(strip);
      startTime = performance.now();

      if (settleTimer) {
        window.clearTimeout(settleTimer);
        settleTimer = null;
      }

      strip.classList.add("is-dragging");
      strip.setPointerCapture(pointerId);
    }

    function onPointerUp(event) {
      if (!active || event.pointerId !== pointerId) return;
      finishSwipe(event);
    }

    function onPointerCancel(event) {
      if (!active || event.pointerId !== pointerId) return;
      finishSwipe(event);
    }

    function onScroll() {
      if (!enabled || active) return;
      if (settleTimer) {
        window.clearTimeout(settleTimer);
      }

      settleTimer = window.setTimeout(() => {
        settleTimer = null;
        const cards = getCards(strip);
        if (!cards.length) return;
        const nearest = findNearestCardIndex(strip);
        scrollCardIntoView(strip, cards[nearest]);
        syncNextButtonState(nearest);
        updateSwipeCue(nearest);
      }, 120);
    }

    function finishSwipe(event) {
      if (!active) return;
      active = false;
      strip.classList.remove("is-dragging");

      if (pointerId !== null) {
        try {
          strip.releasePointerCapture(pointerId);
        } catch {
          // no-op
        }
      }
      pointerId = null;

      const cards = getCards(strip);
      if (!cards.length) return;

      const currentX = Number.isFinite(event?.clientX) ? event.clientX : startX;
      const currentY = Number.isFinite(event?.clientY) ? event.clientY : startY;
      const deltaX = currentX - startX;
      const deltaY = currentY - startY;
      const deltaScroll = strip.scrollLeft - startScroll;
      const elapsed = Math.max(16, performance.now() - startTime);
      const velocityFromPointer = deltaX / elapsed;
      const velocityFromScroll = deltaScroll / elapsed;
      const velocityX = Math.abs(velocityFromScroll) > Math.abs(velocityFromPointer)
        ? velocityFromScroll
        : velocityFromPointer;
      const mostlyHorizontal = Math.abs(deltaX) > Math.abs(deltaY) * 1.06 || Math.abs(deltaScroll) > 8;

      const movedEnough = Math.abs(deltaScroll) > 16 || Math.abs(deltaX) > 12 || Math.abs(velocityX) > 0.05;
      let targetIndex = findNearestCardIndex(strip);

      if (mostlyHorizontal && movedEnough) {
        const direction = deltaScroll > 0 ? 1 : -1;
        targetIndex = clamp(startIndex + direction, 0, cards.length - 1);
      }

      scrollCardIntoView(strip, cards[targetIndex]);
      syncNextButtonState(targetIndex);
      updateSwipeCue(targetIndex);
      queueNextButtonSync(180);
    }

    function queueNextButtonSync(delay = 120) {
      if (buttonTimer) {
        window.clearTimeout(buttonTimer);
      }
      buttonTimer = window.setTimeout(() => {
        buttonTimer = null;
        syncNextButtonState();
        updateSwipeCue();
      }, delay);
    }

    function syncNextButtonState(indexOverride) {
      const cards = getCards(strip);
      const hasMultipleCards = enabled && cards.length > 1;
      if (nextButton) {
        nextButton.disabled = !hasMultipleCards;
      }

      if (!hasMultipleCards) {
        updateSwipeCue(0);
        return;
      }

      const currentIndex =
        typeof indexOverride === "number" ? indexOverride : findNearestCardIndex(strip);
      if (nextButton) {
        nextButton.disabled = currentIndex >= cards.length - 1;
      }
      updateSwipeCue(currentIndex);
    }

    function renderSwipeDots() {
      if (!swipeDots) return;
      swipeDots.textContent = "";
      const cards = getCards(strip);
      cards.forEach((_, index) => {
        const dot = document.createElement("span");
        dot.className = "collage-swipe__dot";
        if (index === 0) {
          dot.classList.add("is-active");
        }
        swipeDots.appendChild(dot);
      });
    }

    function updateSwipeCue(indexOverride = 0) {
      const cards = getCards(strip);
      const hasMultipleCards = enabled && cards.length > 1;
      swipeHint?.classList.toggle("is-visible", hasMultipleCards);
      if (!swipeDots) return;

      const currentIndex =
        typeof indexOverride === "number" ? indexOverride : findNearestCardIndex(strip);
      Array.from(swipeDots.children).forEach((dot, index) => {
        dot.classList.toggle("is-active", index === currentIndex);
      });

      if (swipeText) {
        swipeText.textContent = currentIndex >= cards.length - 1 ? "Last card" : "Swipe >";
      }
    }
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

function getCards(strip) {
  return Array.from(strip.querySelectorAll(".memory-card"));
}

function findNearestCardIndex(strip) {
  const cards = getCards(strip);
  if (!cards.length) return 0;

  const center = strip.scrollLeft + strip.clientWidth * 0.5;
  let nearestIndex = 0;
  let minDistance = Number.POSITIVE_INFINITY;

  cards.forEach((card, index) => {
    const cardCenter = card.offsetLeft + card.offsetWidth * 0.5;
    const distance = Math.abs(center - cardCenter);
    if (distance < minDistance) {
      minDistance = distance;
      nearestIndex = index;
    }
  });

  return nearestIndex;
}

function scrollCardIntoView(strip, card) {
  if (!card) return;
  const target = card.offsetLeft - (strip.clientWidth - card.offsetWidth) * 0.5;
  strip.scrollTo({ left: Math.max(0, target), behavior: "smooth" });
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalizeSceneName(name) {
  if (typeof name !== "string") return "";
  return SCENE_ORDER.includes(name) ? name : "";
}


