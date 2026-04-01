/**
 * ThemeContext – global dark/light theme with AsyncStorage persistence
 */

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  darkColors, lightColors,
  DIFFICULTY_META, DIFFICULTY_META_LIGHT,
} from '../theme';

const THEME_KEY = '@dive_v2_theme';

const ThemeContext = createContext({
  colors:         darkColors,
  difficultyMeta: DIFFICULTY_META,
  isDark:         true,
  toggleTheme:    () => {},
});

export const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY)
      .then(val => { if (val === 'light') setIsDark(false); })
      .catch(() => {});
  }, []);

  const toggleTheme = () => {
    setIsDark(prev => {
      const next = !prev;
      AsyncStorage.setItem(THEME_KEY, next ? 'dark' : 'light').catch(() => {});
      return next;
    });
  };

  const value = useMemo(() => ({
    colors:         isDark ? darkColors : lightColors,
    difficultyMeta: isDark ? DIFFICULTY_META : DIFFICULTY_META_LIGHT,
    isDark,
    toggleTheme,
  }), [isDark]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
