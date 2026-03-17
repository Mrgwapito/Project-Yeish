import { createSpan, pickAnchor, random } from "./utils.js";

const LILY_TINTS = [
  {
    top: "rgba(245, 248, 253, 0.96)",
    mid: "rgba(194, 212, 236, 0.82)",
    base: "rgba(95, 126, 173, 0.24)",
    vein: "rgba(118, 74, 100, 0.28)",
    coreLight: "rgba(248, 241, 234, 0.96)",
    coreWine: "rgba(160, 92, 118, 0.84)",
  },
  {
    top: "rgba(242, 246, 252, 0.96)",
    mid: "rgba(174, 198, 221, 0.82)",
    base: "rgba(76, 112, 148, 0.26)",
    vein: "rgba(103, 67, 92, 0.3)",
    coreLight: "rgba(246, 239, 233, 0.94)",
    coreWine: "rgba(146, 84, 108, 0.82)",
  },
  {
    top: "rgba(245, 247, 251, 0.95)",
    mid: "rgba(182, 203, 228, 0.8)",
    base: "rgba(83, 118, 162, 0.24)",
    vein: "rgba(131, 82, 106, 0.28)",
    coreLight: "rgba(247, 240, 234, 0.95)",
    coreWine: "rgba(171, 99, 124, 0.84)",
  },
];
const lilyMotionMap = new Map();

export function prepareTypeNodes(nodes) {
  nodes.forEach((node) => {
    node.dataset.fullText = node.textContent.trim();
    node.textContent = "";
  });
}

export function buildDust(field, env) {
  if (!field) return;
  const compactMode = env.compactMotion || env.lowPerfDevice;
  const count = env.lowPerfDevice ? 6 : compactMode ? 8 : 14;
  const fragment = document.createDocumentFragment();

  for (let index = 0; index < count; index += 1) {
    const mote = document.createElement("span");
    const size = random(6, 18);

    mote.className = "dust";
    mote.style.width = `${size}px`;
    mote.style.height = `${size}px`;
    mote.style.left = `${random(0, 100)}%`;
    mote.style.top = `${random(0, 100)}%`;
    mote.style.opacity = `${random(0.1, 0.34)}`;
    fragment.appendChild(mote);

    if (env.hasGSAP && !env.reducedMotion && !env.lowPerfDevice) {
      gsap.to(mote, {
        x: random(-10, 10),
        y: random(-12, 12),
        duration: random(7, 12),
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
        delay: random(0, 2),
      });
    }
  }

  field.appendChild(fragment);
}

export function buildFallingLilies(field, env) {
  if (!field || env.reducedMotion) return;
  const compactMode = env.compactMotion || env.lowPerfDevice;
  const count = env.lowPerfDevice ? 3 : compactMode ? 5 : 9;
  const fragment = document.createDocumentFragment();

  for (let index = 0; index < count; index += 1) {
    const lily = document.createElement("span");
    lily.className = "falling-lily";
    lily.style.setProperty("--fall-left", `${random(2, 96).toFixed(2)}%`);
    lily.style.setProperty("--fall-size", `${random(10, compactMode ? 17 : 22).toFixed(1)}px`);
    lily.style.setProperty("--fall-duration", `${random(13, 22).toFixed(2)}s`);
    lily.style.setProperty("--fall-delay", `${random(-20, 0).toFixed(2)}s`);
    lily.style.setProperty("--fall-drift", `${random(-22, 22).toFixed(1)}px`);
    lily.style.setProperty("--fall-alpha", `${random(0.18, 0.42).toFixed(2)}`);
    lily.style.setProperty("--fall-blur", `${random(0, 0.9).toFixed(2)}px`);
    fragment.appendChild(lily);
  }

  field.appendChild(fragment);
}

export function buildLilies(env) {
  const compactMode = env.compactMotion || env.lowPerfDevice;
  const scaleFactor = compactMode ? 0.84 : 1;
  const countScale = env.lowPerfDevice ? 0.62 : env.compactMotion ? 0.74 : 0.88;
  const settings = {
    back: {
      size: [110 * scaleFactor, 170 * scaleFactor],
      blur: env.compactMotion ? [1.8, 3.2] : [2.5, 5],
      alpha: [0.12, 0.24],
      top: [10, 78],
    },
    mid: {
      size: [130 * scaleFactor, 200 * scaleFactor],
      blur: env.compactMotion ? [0.4, 1.4] : [0.6, 2],
      alpha: [0.2, 0.36],
      top: [18, 82],
    },
    front: {
      size: [150 * scaleFactor, 220 * scaleFactor],
      blur: env.compactMotion ? [1.6, 3.8] : [2, 5],
      alpha: [0.14, 0.28],
      top: [52, 88],
    },
  };

  document.querySelectorAll(".flora-field").forEach((field) => {
    const depth = field.dataset.depth || "mid";
    const scene = field.closest(".scene");
    const isWelcome = scene?.dataset.scene === "welcome";
    const config = settings[depth];
    const parsedCount = Number(field.dataset.count);
    const baseCount = Number.isFinite(parsedCount) ? Math.max(0, parsedCount) : 2;
    const sceneScale = isWelcome ? countScale * 0.92 : countScale;
    const count = Math.max(0, Math.round(baseCount * sceneScale));
    const anchorOffset = count > 3 ? Math.floor(random(0, 6)) : 0;
    if (count === 0) return;
    const fragment = document.createDocumentFragment();
    const outerPetalCount = compactMode ? 5 : 6;
    const innerPetalCount = compactMode ? 2 : 3;

    for (let index = 0; index < count; index += 1) {
      const lily = document.createElement("div");
      const petalOffset = random(-10, 10);
      const alpha = random(config.alpha[0], config.alpha[1]).toFixed(2);
      const tint = LILY_TINTS[Math.floor(Math.random() * LILY_TINTS.length)];

      lily.className = "lily";
      lily.dataset.depth = depth;
      if (env.lowPerfDevice && depth === "back") {
        lily.classList.add("is-static");
      }
      if (isWelcome && (depth === "front" || (depth === "mid" && index === 0))) {
        lily.classList.add("is-draggable");
        lily.dataset.draggable = "1";
      }
      lily.style.setProperty("--size", `${random(config.size[0], config.size[1])}px`);
      lily.style.setProperty("--blur", `${random(config.blur[0], config.blur[1]).toFixed(2)}px`);
      lily.style.setProperty("--alpha", alpha);
      lily.style.setProperty("--petal-top", tint.top);
      lily.style.setProperty("--petal-mid", tint.mid);
      lily.style.setProperty("--petal-base", tint.base);
      lily.style.setProperty("--petal-vein", tint.vein);
      lily.style.setProperty("--core-light", tint.coreLight);
      lily.style.setProperty("--core-wine", tint.coreWine);
      lily.style.left = `${pickAnchor(depth, index + anchorOffset, count)}%`;
      lily.style.top = `${random(config.top[0], config.top[1])}%`;

      if (env.hasGSAP) {
        gsap.set(lily, {
          xPercent: -50,
          yPercent: -50,
          rotation: random(-24, 24),
          scale: random(0.82, 1.08),
        });
      } else {
        lily.style.transform = `translate(-50%, -50%) rotate(${random(-24, 24)}deg)`;
      }

      for (let petalIndex = 0; petalIndex < outerPetalCount; petalIndex += 1) {
        const petal = document.createElement("span");
        petal.className = "petal petal--outer";
        petal.style.setProperty("--petal-rotate", `${petalIndex * (360 / outerPetalCount) + petalOffset}deg`);
        petal.style.setProperty("--petal-scale", random(0.92, 1.08).toFixed(2));
        petal.style.setProperty("--petal-tilt", `${random(-10, 10)}deg`);
        petal.style.setProperty("--petal-motion", `${random(8.6, 12.4).toFixed(2)}s`);
        lily.appendChild(petal);
      }

      for (let innerIndex = 0; innerIndex < innerPetalCount; innerIndex += 1) {
        const inner = document.createElement("span");
        inner.className = "petal petal--inner";
        inner.style.setProperty("--petal-rotate", `${innerIndex * (360 / innerPetalCount) + petalOffset + 24}deg`);
        inner.style.setProperty("--petal-scale", random(0.84, 0.94).toFixed(2));
        inner.style.setProperty("--petal-tilt", `${random(-6, 6)}deg`);
        inner.style.setProperty("--petal-motion", `${random(8.2, 11.6).toFixed(2)}s`);
        lily.appendChild(inner);
      }

      lily.appendChild(createSpan("lily__halo lily__halo--a"));
      lily.appendChild(createSpan("lily__halo lily__halo--b"));
      lily.appendChild(createSpan("lily__halo lily__halo--c"));
      lily.appendChild(createSpan("lily__core"));
      fragment.appendChild(lily);
    }

    field.appendChild(fragment);
  });
}

export function enableLilyDrag(env) {
  if (env.reducedMotion || !env.hasGSAP) return;

  const draggableLilies = Array.from(document.querySelectorAll('.lily[data-draggable="1"]'));
  if (!draggableLilies.length) return;

  draggableLilies.forEach((lily) => {
    let dragging = false;
    let startX = 0;
    let startY = 0;
    let originX = 0;
    let originY = 0;
    let pointerId = null;

    lily.addEventListener("pointerdown", (event) => {
      dragging = true;
      pointerId = event.pointerId;
      startX = event.clientX;
      startY = event.clientY;
      originX = Number(gsap.getProperty(lily, "x")) || 0;
      originY = Number(gsap.getProperty(lily, "y")) || 0;

      lily.classList.add("is-dragging");
      lily.setPointerCapture(pointerId);
      gsap.killTweensOf(lily, "x,y");
    });

    lily.addEventListener("pointermove", (event) => {
      if (!dragging || event.pointerId !== pointerId) return;

      const deltaX = Math.max(-58, Math.min(58, (event.clientX - startX) * 0.22));
      const deltaY = Math.max(-58, Math.min(58, (event.clientY - startY) * 0.22));
      gsap.set(lily, { x: originX + deltaX, y: originY + deltaY });
    });

    lily.addEventListener("pointerup", (event) => {
      if (event.pointerId !== pointerId) return;
      finishDrag();
    });

    lily.addEventListener("pointercancel", () => {
      finishDrag();
    });

    function finishDrag() {
      if (!dragging) return;
      dragging = false;
      lily.classList.remove("is-dragging");
      gsap.to(lily, {
        x: originX,
        y: originY,
        duration: 0.62,
        ease: "power2.out",
      });
    }
  });
}

export function setupAmbientMotion(env) {
  if (!env.hasGSAP || env.reducedMotion) return;

  lilyMotionMap.clear();

  gsap.utils.toArray(".lily").forEach((lily) => {
    if (lily.dataset.draggable === "1") return;
    if (lily.classList.contains("is-static")) return;

    const depth = lily.dataset.depth || "mid";
    const compactFactor = env.compactMotion || env.lowPerfDevice ? 0.58 : 1;
    const movement =
      depth === "front"
        ? { x: 16 * compactFactor, y: 20 * compactFactor, rotation: 5 * compactFactor, durationMin: 7.2, durationMax: 10.8 }
        : depth === "back"
          ? { x: 8 * compactFactor, y: 10 * compactFactor, rotation: 2.5 * compactFactor, durationMin: 9.8, durationMax: 13.4 }
          : { x: 12 * compactFactor, y: 15 * compactFactor, rotation: 4 * compactFactor, durationMin: 8.2, durationMax: 11.8 };

    const lilyTween = gsap.to(lily, {
      x: random(-movement.x, movement.x),
      y: random(-movement.y, movement.y),
      rotation: `+=${random(-movement.rotation, movement.rotation)}`,
      duration: random(movement.durationMin, movement.durationMax),
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
      delay: random(0, 1.8),
      force3D: true,
      paused: true,
    });

    const tweens = [lilyTween];
    const haloes = lily.querySelectorAll(".lily__halo");
    if (haloes.length && !env.lowPerfDevice) {
      const haloTween = gsap.to(haloes, {
        rotation: `+=${random(-10, 10)}`,
        scale: () => random(0.96, 1.04),
        duration: random(6.2, 9.2),
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
        force3D: true,
        paused: true,
      });
      tweens.push(haloTween);
    }

    lilyMotionMap.set(lily, tweens);
  });
}

export function setActiveLilyScene(sceneName) {
  if (!lilyMotionMap.size) return;

  document.querySelectorAll(".scene").forEach((scene) => {
    const isActiveScene = scene.dataset.scene === sceneName;
    scene.querySelectorAll(".lily").forEach((lily) => {
      const tweens = lilyMotionMap.get(lily);
      if (!tweens) return;

      tweens.forEach((tween) => {
        if (isActiveScene) {
          tween.play();
        } else {
          tween.pause();
        }
      });
    });
  });
}

export function animateWelcomeEntrance(env) {
  if (!env.hasGSAP || env.reducedMotion) return;

  const welcome = document.querySelector('[data-scene="welcome"]');
  if (!welcome) return;
  const titleNode = welcome.querySelector(".scene__title");
  if (titleNode) {
    titleNode.dataset.finalTitle = titleNode.textContent.trim();
    titleNode.textContent = "Hi, Isay";
  }

  gsap.timeline({ defaults: { ease: "power2.out" } })
    .from(".scene--welcome .lily", {
      opacity: 0,
      scale: 0.9,
      stagger: 0.08,
      duration: 1.1,
    })
    .from(".scene--welcome .scene__eyebrow", { opacity: 0, y: 18, duration: 0.8 }, 0.25)
    .from(".scene--welcome .scene__title", { opacity: 0, y: 24, duration: 1.1 }, 0.45)
    .add(() => {
      if (titleNode) {
        playJokeTitleReveal(titleNode);
      }
    }, 0.88)
    .from(".scene--welcome .scene__lede", { opacity: 0, y: 18, duration: 0.8 }, 0.7)
    .from(".scene--welcome .scene__button", { opacity: 0, y: 16, duration: 0.8 }, 0.95);
}

function playJokeTitleReveal(titleNode) {
  if (!titleNode || titleNode.dataset.titleJokeDone === "1") return;
  titleNode.dataset.titleJokeDone = "1";

  const finalText = titleNode.dataset.finalTitle || "Yeshie";
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const holdFrames = 8;
  const scrambleFrames = 16;
  const totalFrames = holdFrames + scrambleFrames;
  let frame = 0;

  titleNode.textContent = "Hi, Isay";

  const intervalId = window.setInterval(() => {
    frame += 1;

    if (frame <= holdFrames) return;

    const progress = Math.min(1, (frame - holdFrames) / scrambleFrames);
    const revealCount = Math.floor(progress * finalText.length);
    let nextText = "";

    for (let index = 0; index < finalText.length; index += 1) {
      if (index < revealCount) {
        nextText += finalText[index];
      } else {
        nextText += chars[Math.floor(Math.random() * chars.length)];
      }
    }

    titleNode.textContent = nextText;

    if (frame >= totalFrames) {
      window.clearInterval(intervalId);
      titleNode.textContent = finalText;
    }
  }, 42);
}
