import { create } from "zustand";

interface UIState {
  sidebarWidth: number;
  sessionsWidth: number;
  inspectorOpen: boolean;
  inspectorWidth: number;
  theme: "light" | "dark" | "auto";
  paletteOpen: boolean;
  searchOpen: boolean;
  helpOpen: boolean;
  lightboxUrl: string | null;

  setSidebarWidth: (n: number) => void;
  setSessionsWidth: (n: number) => void;
  toggleInspector: () => void;
  setInspectorOpen: (v: boolean) => void;
  setInspectorWidth: (n: number) => void;
  setTheme: (t: "light" | "dark" | "auto") => void;
  setPaletteOpen: (v: boolean) => void;
  setSearchOpen: (v: boolean) => void;
  setHelpOpen: (v: boolean) => void;
  setLightbox: (url: string | null) => void;
}

const LS = {
  sidebar: "cr:sidebarWidth",
  sessions: "cr:sessionsWidth",
  inspectorOpen: "cr:inspectorOpen",
  inspectorWidth: "cr:inspectorWidth",
  theme: "cr:theme",
};

function readNumber(k: string, fallback: number) {
  try {
    const v = parseInt(localStorage.getItem(k) ?? "", 10);
    return Number.isFinite(v) && v > 0 ? v : fallback;
  } catch {
    return fallback;
  }
}
function readBool(k: string, fallback: boolean) {
  try {
    const v = localStorage.getItem(k);
    if (v === null) return fallback;
    return v === "1";
  } catch {
    return fallback;
  }
}
function readTheme(): "light" | "dark" | "auto" {
  try {
    const v = localStorage.getItem(LS.theme);
    if (v === "light" || v === "dark") return v;
    return "auto";
  } catch {
    return "auto";
  }
}

export const useUI = create<UIState>((set) => ({
  sidebarWidth: readNumber(LS.sidebar, 220),
  sessionsWidth: readNumber(LS.sessions, 320),
  inspectorOpen: readBool(LS.inspectorOpen, false),
  inspectorWidth: readNumber(LS.inspectorWidth, 300),
  theme: readTheme(),
  paletteOpen: false,
  searchOpen: false,
  helpOpen: false,
  lightboxUrl: null,

  setSidebarWidth: (n) => {
    localStorage.setItem(LS.sidebar, String(n));
    set({ sidebarWidth: n });
  },
  setSessionsWidth: (n) => {
    localStorage.setItem(LS.sessions, String(n));
    set({ sessionsWidth: n });
  },
  toggleInspector: () =>
    set((s) => {
      const next = !s.inspectorOpen;
      localStorage.setItem(LS.inspectorOpen, next ? "1" : "0");
      return { inspectorOpen: next };
    }),
  setInspectorOpen: (v) => {
    localStorage.setItem(LS.inspectorOpen, v ? "1" : "0");
    set({ inspectorOpen: v });
  },
  setInspectorWidth: (n) => {
    localStorage.setItem(LS.inspectorWidth, String(n));
    set({ inspectorWidth: n });
  },
  setTheme: (t) => {
    localStorage.setItem(LS.theme, t);
    applyTheme(t);
    set({ theme: t });
  },
  setPaletteOpen: (v) => set({ paletteOpen: v }),
  setSearchOpen: (v) => set({ searchOpen: v }),
  setHelpOpen: (v) => set({ helpOpen: v }),
  setLightbox: (url) => set({ lightboxUrl: url }),
}));

export function applyTheme(t: "light" | "dark" | "auto") {
  const html = document.documentElement;
  const prefersDark =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-color-scheme: dark)").matches;
  const dark = t === "dark" || (t === "auto" && prefersDark);
  html.classList.toggle("dark", dark);
}

if (typeof window !== "undefined") {
  applyTheme(readTheme());
  window.matchMedia?.("(prefers-color-scheme: dark)").addEventListener?.(
    "change",
    () => {
      const { theme } = useUI.getState();
      if (theme === "auto") applyTheme("auto");
    }
  );
}
