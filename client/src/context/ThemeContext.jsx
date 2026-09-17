/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from "react";

const ThemeContext = createContext(null);

const palettes = {
  light: {
    "--canvas": "#f8fafc",
    "--surface": "#ffffff",
    "--surface-2": "#f1f5f9",
    "--text": "#0f172a",
    "--muted": "#64748b",
    "--border": "#e2e8f0",
  },
  dark: {
    "--canvas": "#07101f",
    "--surface": "#101b2e",
    "--surface-2": "#17243a",
    "--text": "#f8fafc",
    "--muted": "#94a3b8",
    "--border": "#293750",
  },
};

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem("afksnap-theme") || "light");

  useEffect(() => {
    localStorage.setItem("afksnap-theme", theme);
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    Object.entries(palettes[theme]).forEach(([name, value]) => document.documentElement.style.setProperty(name, value));
  }, [theme]);

  const value = useMemo(
    () => ({ theme, toggleTheme: () => setTheme((current) => (current === "light" ? "dark" : "light")) }),
    [theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme harus digunakan di dalam ThemeProvider");
  return context;
}
