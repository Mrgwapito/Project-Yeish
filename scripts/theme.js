const THEME_KEY = "yeshie_theme_v2";
const THEMES = {
  DARK: "dark",
  LIGHT: "light",
};

export function initTheme(dom) {
  const body = dom?.body || document.body;
  const toggle = dom?.themeToggle || document.getElementById("theme-toggle");
  if (!body) return;

  const storedTheme = readStoredTheme();
  const initialTheme = storedTheme || body.dataset.theme || THEMES.LIGHT;
  applyTheme(body, toggle, initialTheme, false);

  toggle?.addEventListener("click", () => {
    const nextTheme = body.dataset.theme === THEMES.LIGHT ? THEMES.DARK : THEMES.LIGHT;
    applyTheme(body, toggle, nextTheme, true);
  });

  bindThemeHoverPreview(toggle);
}

function applyTheme(body, toggle, theme, persist) {
  body.dataset.theme = theme;
  updateToggleLabel(toggle, theme);
  if (persist) {
    storeTheme(theme);
  }
}

function updateToggleLabel(toggle, theme) {
  if (!toggle) return;
  const lightModeActive = theme === THEMES.LIGHT;
  toggle.dataset.activeTheme = lightModeActive ? THEMES.LIGHT : THEMES.DARK;
  toggle.setAttribute("aria-label", lightModeActive ? "Switch to dark mode" : "Switch to light mode");
  toggle.setAttribute("aria-pressed", String(lightModeActive));
}

function readStoredTheme() {
  try {
    const theme = window.localStorage.getItem(THEME_KEY);
    if (theme === THEMES.DARK || theme === THEMES.LIGHT) return theme;
  } catch {
    // no-op
  }

  return "";
}

function storeTheme(theme) {
  try {
    window.localStorage.setItem(THEME_KEY, theme);
  } catch {
    // no-op
  }
}

function bindThemeHoverPreview(toggle) {
  if (!toggle) return;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hasGSAP = typeof window.gsap !== "undefined";
  if (!hasGSAP || reduceMotion) return;

  gsap.set(toggle, { "--theme-preview": 0 });

  const setPreview = (value) => {
    gsap.to(toggle, {
      "--theme-preview": value,
      duration: 0.28,
      ease: "power2.out",
      overwrite: true,
    });
  };

  toggle.addEventListener("pointerenter", () => setPreview(1));
  toggle.addEventListener("pointerleave", () => setPreview(0));
  toggle.addEventListener("focus", () => setPreview(1));
  toggle.addEventListener("blur", () => setPreview(0));
}
