import { formatTime } from "./utils.js";
import { CONTENT } from "./content.js";

const SEEK_STEP_SECONDS = 10;

export function createAudioController({ dom, state }) {
  const {
    loveSong,
    audioStatus,
    playerToggle,
    playerBackward,
    playerForward,
    shuffleToggle,
    loopToggle,
    musicState,
    seekBar,
    currentTimeLabel,
    durationTimeLabel,
  } = dom;

  if (!loveSong || !audioStatus || !playerToggle || !seekBar || !currentTimeLabel || !durationTimeLabel) {
    return { startSong: async () => false };
  }

  let lastSeekPaintAt = 0;
  let shuffleMode = false;
  let playbackBlocked = false;

  loveSong.addEventListener("canplay", () => {
    state.songReady = true;
    state.songMissing = false;
    audioStatus.textContent = "Ready when you are.";
    if (musicState) musicState.textContent = "Ready";
    updateDuration();
  });

  loveSong.addEventListener("loadedmetadata", () => {
    state.songReady = true;
    updateDuration();
    updateSeek(true);
  });

  loveSong.addEventListener("playing", () => {
    playbackBlocked = false;
    syncPlayButton(true);
    dom.musicPlayer?.classList.remove("is-needs-tap");
    audioStatus.textContent = "Now playing.";
    if (musicState) musicState.textContent = "Playing";
  });

  loveSong.addEventListener("pause", () => {
    if (loveSong.ended) return;
    syncPlayButton(false);
    if (!state.songMissing) {
      audioStatus.textContent = "Paused.";
    }
    if (musicState) musicState.textContent = "Paused";
  });

  loveSong.addEventListener("timeupdate", () => updateSeek(false));

  loveSong.addEventListener("ended", () => {
    syncPlayButton(false);
    updateSeek(true);
    audioStatus.textContent = "Finished. Tap play to replay.";
    if (musicState) musicState.textContent = "Replay";
  });

  loveSong.addEventListener("error", () => {
    state.songMissing = true;
    state.songReady = false;
    syncPlayButton(false);
    playerToggle.disabled = true;
    if (playerBackward) playerBackward.disabled = true;
    if (playerForward) playerForward.disabled = true;
    if (shuffleToggle) shuffleToggle.disabled = true;
    if (loopToggle) loopToggle.disabled = true;
    audioStatus.textContent = "I could not load the local song from the music folder yet.";
    if (musicState) musicState.textContent = "Song unavailable";
    dom.musicPlayer?.classList.remove("is-needs-tap");
  });

  playerToggle.addEventListener("click", async () => {
    await toggleSong(true);
  });

  playerBackward?.addEventListener("click", () => {
    seekBy(-SEEK_STEP_SECONDS);
  });

  playerForward?.addEventListener("click", () => {
    seekBy(SEEK_STEP_SECONDS);
  });

  shuffleToggle?.addEventListener("click", () => {
    shuffleMode = !shuffleMode;
    syncShuffleButton();
  });

  loopToggle?.addEventListener("click", () => {
    loveSong.loop = !loveSong.loop;
    syncLoopButton();
    audioStatus.textContent = loveSong.loop ? "Loop enabled." : "Loop disabled.";
  });

  seekBar.addEventListener("input", () => {
    seekBar.style.setProperty("--seek-fill", `${seekBar.value}%`);
  });

  seekBar.addEventListener("change", () => {
    if (!Number.isFinite(loveSong.duration) || loveSong.duration <= 0) return;
    loveSong.currentTime = (Number(seekBar.value) / 100) * loveSong.duration;
    updateSeek(true);
  });

  syncShuffleButton();
  syncLoopButton();
  syncPlayButton(false);
  updateSeek(true);

  return { startSong };

  async function startSong(fromManualTap = false) {
    if (!state.requestedSongLoad) {
      state.requestedSongLoad = true;
      loveSong.load();
    }

    try {
      await loveSong.play();
      playbackBlocked = false;
      dom.musicPlayer?.classList.remove("is-needs-tap");
      return true;
    } catch {
      playbackBlocked = true;
      dom.musicPlayer?.classList.add("is-needs-tap");
      if (!state.songMissing) {
        audioStatus.textContent = fromManualTap
          ? CONTENT.player.statusRetryTap
          : CONTENT.player.statusAutoplayBlocked;
      }
      syncPlayButton(false);
      if (musicState) musicState.textContent = playbackBlocked ? "Tap again" : "Tap play if needed";
      return false;
    }
  }

  async function toggleSong(fromManualTap = false) {
    if (loveSong.paused) {
      return startSong(fromManualTap);
    }

    loveSong.pause();
    return true;
  }

  function syncPlayButton(isPlaying) {
    playerToggle.disabled = state.songMissing;
    setButtonIcon(
      playerToggle,
      state.songMissing ? "fa-solid fa-xmark" : isPlaying ? "fa-solid fa-pause" : "fa-solid fa-play"
    );
    playerToggle.setAttribute("aria-label", isPlaying ? "Pause song" : "Play song");
    playerToggle.setAttribute("aria-pressed", String(isPlaying));
    playerToggle.dataset.state = isPlaying ? "playing" : "paused";
  }

  function syncShuffleButton() {
    if (!shuffleToggle) return;
    shuffleToggle.classList.toggle("is-active", shuffleMode);
    shuffleToggle.setAttribute("aria-pressed", String(shuffleMode));
  }

  function syncLoopButton() {
    if (!loopToggle) return;
    loopToggle.classList.toggle("is-active", loveSong.loop);
    loopToggle.setAttribute("aria-pressed", String(loveSong.loop));
  }

  function seekBy(seconds) {
    if (!Number.isFinite(loveSong.duration) || loveSong.duration <= 0) return;
    const nextTime = Math.max(0, Math.min(loveSong.duration, loveSong.currentTime + seconds));
    loveSong.currentTime = nextTime;
    updateSeek(true);
  }

  function updateDuration() {
    const duration = Number.isFinite(loveSong.duration) ? loveSong.duration : 0;
    durationTimeLabel.textContent = formatTime(duration);
    seekBar.disabled = duration <= 0;
  }

  function updateSeek(force = false) {
    const now = performance.now();
    if (!force && now - lastSeekPaintAt < 120) return;
    lastSeekPaintAt = now;

    const current = Number.isFinite(loveSong.currentTime) ? loveSong.currentTime : 0;
    const duration = Number.isFinite(loveSong.duration) ? loveSong.duration : 0;
    const value = duration > 0 ? (current / duration) * 100 : 0;

    currentTimeLabel.textContent = formatTime(current);
    durationTimeLabel.textContent = formatTime(duration);
    seekBar.value = String(value);
    seekBar.style.setProperty("--seek-fill", `${value}%`);
  }
}

function setButtonIcon(button, iconClass) {
  if (!button) return;
  let icon = button.querySelector("i");
  if (!icon) {
    icon = document.createElement("i");
    icon.setAttribute("aria-hidden", "true");
    button.textContent = "";
    button.appendChild(icon);
  }
  icon.className = iconClass;
}
