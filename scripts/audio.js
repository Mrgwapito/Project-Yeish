import { formatTime } from "./utils.js";

export function createAudioController({ dom, state }) {
  const {
    loveSong,
    audioStatus,
    playerToggle,
    musicState,
    seekBar,
    currentTimeLabel,
    durationTimeLabel,
  } = dom;

  if (!loveSong || !audioStatus || !playerToggle || !seekBar || !currentTimeLabel || !durationTimeLabel) {
    return { startSong: async () => false };
  }
  let lastSeekPaintAt = 0;

  loveSong.addEventListener("canplay", () => {
    state.songReady = true;
    state.songMissing = false;
    audioStatus.textContent = "Ready.";
    if (musicState) musicState.textContent = "Ready";
    updateDuration();
  });

  loveSong.addEventListener("loadedmetadata", () => {
    state.songReady = true;
    updateDuration();
    updateSeek(true);
  });

  loveSong.addEventListener("playing", () => {
    syncPlayButton(true);
    audioStatus.textContent = "Full song playing.";
    if (musicState) musicState.textContent = "Playing";
  });

  loveSong.addEventListener("pause", () => {
    if (loveSong.ended) return;
    syncPlayButton(false);
    if (!state.songMissing) {
      audioStatus.textContent = "The song is paused. You can start it again anytime.";
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
    playerToggle.textContent = "x";
    playerToggle.disabled = true;
    audioStatus.textContent = "I could not load the local song from the music folder yet.";
    if (musicState) musicState.textContent = "Song unavailable";
  });

  playerToggle.addEventListener("click", async () => {
    await toggleSong(true);
  });

  seekBar.addEventListener("input", () => {
    seekBar.style.setProperty("--seek-fill", `${seekBar.value}%`);
  });

  seekBar.addEventListener("change", () => {
    if (!Number.isFinite(loveSong.duration) || loveSong.duration <= 0) return;
    loveSong.currentTime = (Number(seekBar.value) / 100) * loveSong.duration;
    updateSeek(true);
  });

  return { startSong };

  async function startSong(fromManualTap = false) {
    if (!state.requestedSongLoad) {
      state.requestedSongLoad = true;
      loveSong.load();
    }

    try {
      await loveSong.play();
      return true;
    } catch {
      if (!state.songMissing) {
        audioStatus.textContent = fromManualTap
          ? "Playback needs one more tap on this device."
          : "If playback does not start right away, tap play once more.";
      }
      syncPlayButton(false);
      if (musicState) musicState.textContent = "Tap play if needed";
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
    playerToggle.textContent = state.songMissing ? "x" : isPlaying ? "||" : ">";
    playerToggle.setAttribute("aria-label", isPlaying ? "Pause song" : "Play song");
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
