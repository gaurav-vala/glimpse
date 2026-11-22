import { useColorScheme } from 'react-native';
import { LightTheme, DarkTheme, ThemeColors } from './theme';

export interface UseThemeReturn {
  isDark: boolean;
  colors: ThemeColors;
}

export function useTheme(): UseThemeReturn {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  return {
    isDark,
    colors: isDark ? DarkTheme.colors : LightTheme.colors,
  };
}
