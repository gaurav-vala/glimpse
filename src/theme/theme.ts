export const Palette = {
  // Pure Pitch Dark / OLED
  black: '#000000',
  charcoal: '#0c0d11',
  surfaceDark: '#12141a',
  surfaceElevatedDark: '#1a1d28',
  borderDark: 'rgba(255, 255, 255, 0.08)',
  borderStrongDark: 'rgba(255, 255, 255, 0.16)',

  // Pure Clean Light
  white: '#FFFFFF',
  surfaceLight: '#F5F5F7',
  surfaceElevatedLight: '#FFFFFF',
  borderLight: 'rgba(0, 0, 0, 0.08)',
  borderStrongLight: 'rgba(0, 0, 0, 0.16)',

  // Accents
  accentBlue: '#2563EB',
  accentBlueSoft: 'rgba(37, 99, 235, 0.12)',
  accentBlueGlow: 'rgba(37, 99, 235, 0.25)',

  destructive: '#EF4444',
  destructiveSoft: 'rgba(239, 68, 68, 0.12)',

  success: '#10B981',
  warning: '#F59E0B',
} as const;

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceElevated: string;
  border: string;
  borderStrong: string;
  text: string;
  textSecondary: string;
  textDim: string;
  textInverse: string;
  tilePlaceholder: string;
  accent: string;
  accentSoft: string;
  destructive: string;
  destructiveSoft: string;
  card: string;
  overlay: string;
}

export const LightTheme = {
  dark: false,
  colors: {
    background: Palette.white,
    surface: Palette.surfaceLight,
    surfaceElevated: Palette.surfaceElevatedLight,
    border: Palette.borderLight,
    borderStrong: Palette.borderStrongLight,
    text: '#111827',
    textSecondary: '#6B7280',
    textDim: '#9CA3AF',
    textInverse: '#FFFFFF',
    tilePlaceholder: '#E5E7EB',
    accent: Palette.accentBlue,
    accentSoft: Palette.accentBlueSoft,
    destructive: Palette.destructive,
    destructiveSoft: Palette.destructiveSoft,
    card: Palette.surfaceLight,
    overlay: 'rgba(0, 0, 0, 0.45)',
  } as ThemeColors,
} as const;

export const DarkTheme = {
  dark: true,
  colors: {
    background: Palette.black,
    surface: Palette.surfaceDark,
    surfaceElevated: Palette.surfaceElevatedDark,
    border: Palette.borderDark,
    borderStrong: Palette.borderStrongDark,
    text: '#F3F4F6',
    textSecondary: '#9AA0B4',
    textDim: '#6B7280',
    textInverse: '#000000',
    tilePlaceholder: '#14161F',
    accent: '#3B82F6',
    accentSoft: 'rgba(59, 130, 246, 0.15)',
    destructive: Palette.destructive,
    destructiveSoft: Palette.destructiveSoft,
    card: Palette.surfaceDark,
    overlay: 'rgba(0, 0, 0, 0.7)',
  } as ThemeColors,
} as const;

export const Radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  round: 999,
} as const;

export const Spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const Typography = {
  largeTitle: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700' as const,
    letterSpacing: -0.6,
  },
  screenTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '600' as const,
    letterSpacing: -0.4,
  },
  sectionHeader: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600' as const,
    letterSpacing: -0.2,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400' as const,
  },
  label: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500' as const,
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400' as const,
  },
  badge: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600' as const,
    letterSpacing: 0.1,
  },
} as const;
