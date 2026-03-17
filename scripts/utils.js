export function normalizePassword(value) {
  return value.toLowerCase().trim().replace(/\s+/g, " ");
}

export function formatTime(time) {
  if (!Number.isFinite(time) || time <= 0) return "0:00";
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function wait(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export function random(min, max) {
  return Math.random() * (max - min) + min;
}

export function pickAnchor(depth, slotIndex = 0, slotCount = 1) {
  const frontPatterns = {
    1: [80],
    2: [16, 84],
    3: [12, 50, 86],
    4: [10, 34, 66, 90],
  };
  const softPatterns = {
    1: [50],
    2: [22, 78],
    3: [16, 50, 84],
    4: [12, 36, 64, 88],
  };
  const pool = depth === "front" ? [10, 22, 36, 50, 64, 78, 90] : [10, 20, 34, 50, 66, 80, 90];
  const patterns = depth === "front" ? frontPatterns : softPatterns;
  const anchors = patterns[slotCount] || pool;
  const jitter = depth === "front" ? 2.2 : 3;

  return anchors[slotIndex % anchors.length] + random(-jitter, jitter);
}

export function createSpan(className) {
  const element = document.createElement("span");
  element.className = className;
  return element;
}

export function getSceneTargets(scene) {
  return scene.querySelectorAll(".scene__content, .note-card, .question-card");
}

export function getAtmosphereTargets(scene) {
  return scene.querySelectorAll(".scene__glow, .flora-field");
}
