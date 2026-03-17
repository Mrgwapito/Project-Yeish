import { normalizePassword } from "./utils.js";

export function bindLock({ dom, env, sitePassword, unlockSessionKey, onUnlock }) {
  const { lockForm, passwordInput, lockMessage } = dom;
  const normalizedSitePassword = normalizePassword(sitePassword || "");
  const defaultHint = "Hint: one of your cat names.";
  let failedAttempts = 0;

  if (hasUnlockSession(unlockSessionKey)) {
    unlockExperience(dom, env, onUnlock, { instant: true });
    return;
  }

  if (!lockForm || !passwordInput || !lockMessage) {
    onUnlock();
    return;
  }

  lockMessage.textContent = defaultHint;
  lockMessage.classList.remove("is-error");

  passwordInput.addEventListener("input", () => {
    lockMessage.classList.remove("is-error");
  });

  lockForm.addEventListener("submit", (event) => {
    event.preventDefault();

    if (normalizePassword(passwordInput.value) !== normalizedSitePassword) {
      failedAttempts += 1;
      lockMessage.textContent = getFailedHint(failedAttempts);
      lockMessage.classList.add("is-error");

      if (env.hasGSAP && !env.reducedMotion) {
        gsap.fromTo(
          ".lock-card",
          { x: -6 },
          { x: 6, duration: 0.08, repeat: 3, yoyo: true, ease: "power1.inOut", clearProps: "x" }
        );
      }

      passwordInput.select();
      return;
    }

    failedAttempts = 0;
    storeUnlockSession(unlockSessionKey);
    lockMessage.classList.remove("is-error");
    lockMessage.textContent = "Unlocked.";
    unlockExperience(dom, env, onUnlock);
  });
}

function getFailedHint(attempts) {
  if (attempts === 1) return "Maybe the other one.";
  if (attempts === 2) return "Try the other one.";
  return "Hint: your playlist name.";
}

function unlockExperience(dom, env, onUnlock, options = {}) {
  if (!dom.lockScreen) {
    onUnlock();
    return;
  }

  dom.body.classList.remove("is-locked");
  onUnlock();

  if (options.instant) {
    dom.lockScreen.classList.add("is-hidden");
    dom.lockScreen.style.display = "none";
    dom.beginButton?.focus();
    return;
  }

  if (env.hasGSAP && !env.reducedMotion) {
    gsap.to(dom.lockScreen, {
      opacity: 0,
      duration: 0.8,
      ease: "power2.out",
      onComplete: () => {
        dom.lockScreen.classList.add("is-hidden");
        dom.lockScreen.style.display = "none";
        dom.beginButton?.focus();
      },
    });
    return;
  }

  dom.lockScreen.classList.add("is-hidden");
  dom.lockScreen.style.display = "none";
  dom.beginButton?.focus();
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

function hasUnlockSession(key) {
  const storage = getStorage();
  if (!storage) return false;
  return storage.getItem(key) === "1";
}

function storeUnlockSession(key) {
  const storage = getStorage();
  if (!storage) return;
  storage.setItem(key, "1");
}
