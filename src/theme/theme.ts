export const Palette = {
  // Pure Pitch Dark / OLED (From Reference AAA Pass Dark Ramp)
  black: '#000000', // Base
  dark50: '#0A0A0A',
  dark100: '#171717',
  dark200: '#262626',
  dark300: '#373737',
  dark400: '#525252',
  dark500: '#8A8A8A',
  dark600: '#A3A3A3',
  dark700: '#D4D4D4',
  dark800: '#E5E5E5',
  dark900: '#F5F5F5',
  dark950: '#FAFAFA',

  // Surfaces & Borders
  surfaceDark: '#0A0A0A',
  surfaceCard: '#141416',
  surfaceElevated: '#1C1C20',
  surfacePill: 'rgba(23, 23, 26, 0.90)',
  borderDark: 'rgba(255, 255, 255, 0.08)',
  borderStrongDark: 'rgba(255, 255, 255, 0.14)',
  pillBorder: 'rgba(255, 255, 255, 0.12)',

  // Pure Clean Light (From Reference AAA Pass Light Ramp)
  white: '#FFFFFF',
  light50: '#FAFAFA',
  light100: '#F5F5F5',
  light200: '#E5E5E5',
  light300: '#D4D4D4',
  light400: '#A3A3A3',
  light500: '#737373',
  light600: '#525252',
  light700: '#404040',
  light800: '#262626',
  light900: '#171717',
  light950: '#0A0A0A',

  // Accents
  accentBlue: '#2563EB',
  accentBlueSoft: 'rgba(37, 99, 235, 0.16)',
  accentGlow: 'rgba(37, 99, 235, 0.28)',

  destructive: '#EF4444',
  destructiveSoft: 'rgba(239, 68, 68, 0.14)',

  success: '#10B981',
  warning: '#F59E0B',
} as const;

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceCard: string;
  surfaceElevated: string;
  surfacePill: string;
  border: string;
  borderStrong: string;
  pillBorder: string;
  text: string;
  textSecondary: string;
  textMuted: string;
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
    surface: Palette.light100,
    surfaceCard: Palette.white,
    surfaceElevated: Palette.light50,
    surfacePill: 'rgba(255, 255, 255, 0.92)',
    border: Palette.light200,
    borderStrong: Palette.light300,
    pillBorder: 'rgba(0, 0, 0, 0.08)',
    text: Palette.light950,
    textSecondary: Palette.light700,
    textMuted: Palette.light500,
    textDim: Palette.light400,
    textInverse: Palette.white,
    tilePlaceholder: Palette.light200,
    accent: Palette.accentBlue,
    accentSoft: Palette.accentBlueSoft,
    destructive: Palette.destructive,
    destructiveSoft: Palette.destructiveSoft,
    card: Palette.white,
    overlay: 'rgba(0, 0, 0, 0.45)',
  } as ThemeColors,
} as const;

export const DarkTheme = {
  dark: true,
  colors: {
    background: Palette.black, // Pure pitch black OLED
    surface: Palette.surfaceDark,
    surfaceCard: Palette.surfaceCard,
    surfaceElevated: Palette.surfaceElevated,
    surfacePill: Palette.surfacePill,
    border: Palette.borderDark,
    borderStrong: Palette.borderStrongDark,
    pillBorder: Palette.pillBorder,
    text: Palette.dark950, // #FAFAFA
    textSecondary: Palette.dark700, // #D4D4D4
    textMuted: Palette.dark500, // #8A8A8A
    textDim: Palette.dark400, // #525252
    textInverse: Palette.black,
    tilePlaceholder: '#121214',
    accent: '#3B82F6', // Electric Vibrant Blue
    accentSoft: 'rgba(59, 130, 246, 0.16)',
    destructive: Palette.destructive,
    destructiveSoft: Palette.destructiveSoft,
    card: Palette.surfaceCard,
    overlay: 'rgba(0, 0, 0, 0.72)',
  } as ThemeColors,
} as const;

export const Radius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 22,
  pill: 999,
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

export const Fonts = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semiBold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extraBold: 'PlusJakartaSans_800ExtraBold',
} as const;

export const Typography = {
  largeTitle: {
    fontFamily: Fonts.bold,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.6,
  },
  screenTitle: {
    fontFamily: Fonts.bold,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.4,
  },
  sectionHeader: {
    fontFamily: Fonts.semiBold,
    fontSize: 14,
    lineHeight: 18,
    letterSpacing: -0.2,
  },
  body: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  label: {
    fontFamily: Fonts.medium,
    fontSize: 13,
    lineHeight: 18,
  },
  caption: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    lineHeight: 16,
  },
  badge: {
    fontFamily: Fonts.bold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.1,
  },
} as const;
