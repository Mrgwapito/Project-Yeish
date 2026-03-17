import { TRACKING_ENDPOINT } from "./config.js";

export function createTracker({ state }) {
  const sessionStartedAt = Date.now();
  const enteredAtIso = new Date(sessionStartedAt).toISOString();
  let unlockedAtIso = null;
  let selectedResponse = "";
  let responseSent = false;
  let fallbackSent = false;
  let responseClickCount = 0;

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      sendFallbackIfNeeded("session_hidden");
    }
  });

  window.addEventListener("pagehide", () => {
    sendFallbackIfNeeded("session_pagehide");
  });

  return {
    markUnlocked,
    captureResponse,
    sendFallbackIfNeeded,
  };

  function markUnlocked() {
    if (!unlockedAtIso) {
      unlockedAtIso = new Date().toISOString();
    }
  }

  async function captureResponse(choiceLabel) {
    selectedResponse = String(choiceLabel || "").trim();
    responseClickCount += 1;
    if (responseSent) return;
    responseSent = true;
    await sendEmail({
      reason: "response_selected",
      usedBeacon: false,
    });
  }

  function sendFallbackIfNeeded(reason) {
    if (responseSent || fallbackSent) return;
    fallbackSent = true;
    sendEmail({ reason, usedBeacon: true });
  }

  async function sendEmail({ reason, usedBeacon }) {
    const now = Date.now();
    const payload = {
      _subject: `Yeshie Site Update (${reason})`,
      _template: "table",
      _captcha: "false",
      reason,
      entered_at: enteredAtIso,
      unlocked_at: unlockedAtIso || "not unlocked",
      event_time: new Date(now).toISOString(),
      time_on_site_seconds: Math.max(0, Math.round((now - sessionStartedAt) / 1000)),
      selected_button: selectedResponse || "no response selected",
      response_clicks: String(responseClickCount),
      current_scene: state.currentScene || "unknown",
      user_agent: navigator.userAgent,
    };

    const body = JSON.stringify(payload);

    if (usedBeacon && navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon(TRACKING_ENDPOINT, blob);
      return;
    }

    try {
      await fetch(TRACKING_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body,
        keepalive: true,
      });
    } catch {
      // Quiet fail so the experience never breaks for her.
    }
  }
}
