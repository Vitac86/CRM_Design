import { createContext, useCallback, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { DEFAULT_THEME_ID, THEME_STORAGE_KEY, getThemeById, isThemeId, themes } from './themes';
import type { ThemeDefinition, ThemeId } from './themeTypes';

type ThemeContextValue = {
  theme: ThemeDefinition;
  themeId: ThemeId;
  themes: ThemeDefinition[];
  setTheme: (nextThemeId: ThemeId) => void;
};

export const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const resolveInitialThemeId = (): ThemeId => {
  if (typeof window === 'undefined') {
    return DEFAULT_THEME_ID;
  }

  const storedThemeId = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (storedThemeId && isThemeId(storedThemeId)) {
    return storedThemeId;
  }

  return DEFAULT_THEME_ID;
};

const applyThemeAttributes = (theme: ThemeDefinition) => {
  document.documentElement.setAttribute('data-theme', theme.id);

  const root = document.getElementById('root');
  if (root) {
    root.setAttribute('data-theme', theme.id);
  }

  document.documentElement.style.setProperty('--color-primary', theme.primary);
  document.documentElement.style.setProperty('--color-secondary', theme.secondary);
  document.documentElement.style.setProperty('--color-background', theme.background);
  document.documentElement.style.setProperty('--color-surface', theme.surface);
  document.documentElement.style.setProperty('--color-sidebar', theme.sidebar);
  document.documentElement.style.setProperty('--color-text-primary', theme.textPrimary);
  document.documentElement.style.setProperty('--color-text-secondary', theme.textSecondary);
  document.documentElement.style.setProperty('--color-border', theme.border);
  document.documentElement.style.setProperty('--color-accent', theme.accent);
};

export const ThemeProvider = ({ children }: PropsWithChildren) => {
  const [themeId, setThemeId] = useState<ThemeId>(resolveInitialThemeId);

  const setTheme = useCallback((nextThemeId: ThemeId) => {
    setThemeId(nextThemeId);
  }, []);

  useEffect(() => {
    const nextTheme = getThemeById(themeId);
    applyThemeAttributes(nextTheme);
    window.localStorage.setItem(THEME_STORAGE_KEY, themeId);
  }, [themeId]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme: getThemeById(themeId),
      themeId,
      themes: Object.values(themes),
      setTheme,
    }),
    [themeId, setTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
