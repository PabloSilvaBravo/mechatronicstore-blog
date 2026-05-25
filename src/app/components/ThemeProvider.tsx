"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

/**
 * Theme provider del blog — espejo de /Users/pablosilvabravo/Projects/newsletter
 * con localStorage key propio para evitar conflicto si el usuario visita
 * ambos portales (noticias.mechatronicstore.cl y www.../blog).
 */
export type Theme = "dark" | "light";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const STORAGE_KEY = "mechastore-blog-theme";

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Pablo 25-may-2026: default LIGHT (era "dark"). Blog tutoriales se ve
  // mejor en claro para mostrar codigo, materiales y diagramas con buen
  // contraste. El user puede cambiar a dark con el ThemeToggle si quiere.
  const [theme, setThemeState] = useState<Theme>("light");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    const initial: Theme =
      stored === "light" || stored === "dark" ? stored : "light";
    setThemeState(initial);
    document.documentElement.setAttribute("data-theme", initial);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const setTheme = (t: Theme) => setThemeState(t);
  const toggleTheme = () =>
    setThemeState((prev) => (prev === "light" ? "dark" : "light"));

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
