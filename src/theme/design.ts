import {StyleSheet, TextStyle, ViewStyle} from 'react-native';
import {ColorTheme, colors} from './colors';

export function getThemeColors(isDark: boolean): ColorTheme {
  return isDark ? colors.dark : colors.light;
}

/** Alpha-encode any hex or rgb(a) color string. */
export function withAlpha(color: string, alpha: number): string {
  if (color.startsWith('rgba(')) {
    const parts = color.replace('rgba(', '').replace(')', '').split(',').map(p => p.trim());
    return `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, ${alpha})`;
  }
  if (color.startsWith('rgb(')) {
    const parts = color.replace('rgb(', '').replace(')', '').split(',').map(p => p.trim());
    return `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, ${alpha})`;
  }
  const norm = color.replace('#', '');
  const hex = norm.length === 3
    ? norm.split('').map(c => `${c}${c}`).join('')
    : norm;
  if (hex.length !== 6) return color;
  return `rgba(${parseInt(hex.slice(0, 2), 16)}, ${parseInt(hex.slice(2, 4), 16)}, ${parseInt(hex.slice(4, 6), 16)}, ${alpha})`;
}

/** Sky-gradient colours (top → mid → bottom). */
export function getScreenGradient(theme: ColorTheme): string[] {
  return [theme.heroSkyTop, theme.heroSkyMid, theme.heroSkyBottom];
}

// ── Design scales ───────────────────────────────────────────────────

/** Corner radii. Apple favours large, continuous (squircle) curves. */
export const radius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  xxl: 30,
  card: 28,
  pill: 999,
} as const;

/** Spacing scale (4pt grid). */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

/** Typographic scale — SF-style weights and tight tracking. */
export const type = {
  display: {fontSize: 64, fontWeight: '200', letterSpacing: -1.5},
  title: {fontSize: 28, fontWeight: '700', letterSpacing: -0.4},
  headline: {fontSize: 17, fontWeight: '600', letterSpacing: -0.2},
  body: {fontSize: 15, fontWeight: '400'},
  callout: {fontSize: 14, fontWeight: '400'},
  subhead: {fontSize: 13, fontWeight: '500'},
  caption: {fontSize: 12, fontWeight: '500'},
  eyebrow: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
} satisfies Record<string, TextStyle>;

export type ShadowLevel = 'sm' | 'md' | 'lg' | 'float';

/** Layered, low-opacity shadows — depth without heaviness. */
export function getShadow(
  theme: ColorTheme,
  level: ShadowLevel = 'md',
): ViewStyle {
  const isDark = theme === colors.dark;
  const presets: Record<
    ShadowLevel,
    {opacity: number; radius: number; height: number; elevation: number}
  > = {
    sm: {opacity: isDark ? 0.30 : 0.06, radius: 8, height: 2, elevation: 2},
    md: {opacity: isDark ? 0.40 : 0.10, radius: 20, height: 8, elevation: 5},
    lg: {opacity: isDark ? 0.48 : 0.14, radius: 30, height: 14, elevation: 9},
    float: {opacity: isDark ? 0.50 : 0.16, radius: 26, height: 12, elevation: 10},
  };
  const p = presets[level];
  return {
    shadowColor: theme.shadow,
    shadowOffset: {width: 0, height: p.height},
    shadowOpacity: p.opacity,
    shadowRadius: p.radius,
    elevation: p.elevation,
  };
}

// ── Liquid Glass materials ──────────────────────────────────────────

export type GlassMaterial = 'ultraThin' | 'thin' | 'regular' | 'thick';

export interface MaterialSpec {
  fill: string;
  border: string;
  blurType: 'light' | 'dark' | 'xlight' | 'prominent';
  blurAmount: number;
  radius: number;
  shadow: ShadowLevel;
}

/**
 * Apple-style material thicknesses. Thin materials sit on top of vivid
 * content (chrome, controls); thicker materials carry primary content
 * (cards, sheets).
 */
export function getGlassMaterial(
  theme: ColorTheme,
  isDark: boolean,
  variant: GlassMaterial = 'regular',
): MaterialSpec {
  const blurType: MaterialSpec['blurType'] = isDark ? 'dark' : 'light';
  const table: Record<
    GlassMaterial,
    {fill: string; blurAmount: number; blurType: MaterialSpec['blurType']; radius: number; shadow: ShadowLevel}
  > = {
    ultraThin: {
      fill: theme.glassOverlay,
      blurAmount: 14,
      blurType: isDark ? 'dark' : 'xlight',
      radius: radius.lg,
      shadow: 'sm',
    },
    thin: {
      fill: theme.glassOverlay,
      blurAmount: 16,
      blurType,
      radius: radius.xl,
      shadow: 'sm',
    },
    regular: {
      fill: theme.glassBase,
      blurAmount: 20,
      blurType,
      radius: radius.card,
      shadow: 'md',
    },
    thick: {
      fill: theme.glassHighlight,
      blurAmount: 26,
      blurType: isDark ? 'prominent' : 'light',
      radius: radius.card,
      shadow: 'lg',
    },
  };
  const spec = table[variant];
  return {...spec, border: theme.materialBorder};
}

/**
 * Primary content surface — regular glass card with a hairline specular
 * rim and a soft, layered shadow.
 */
export function getCardStyle(theme: ColorTheme): ViewStyle {
  return {
    backgroundColor: theme.glassBase,
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.materialBorder,
    borderCurve: 'continuous',
    ...getShadow(theme, 'md'),
  };
}

/**
 * Inset panel — nested neutral fill, usually inside a card.
 */
export function getInsetPanelStyle(theme: ColorTheme): ViewStyle {
  return {
    backgroundColor: theme.fillSecondary,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.separator,
    borderCurve: 'continuous',
  };
}

/**
 * Floating chrome (tab bar, picker) — thin, bright glass with a
 * pronounced specular rim and a floating shadow.
 */
export function getGlassPillStyle(theme: ColorTheme): ViewStyle {
  return {
    backgroundColor: theme.glassHighlight,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.materialBorder,
    borderCurve: 'continuous',
    ...getShadow(theme, 'float'),
  };
}

/** Section eyebrow colour (subtle uppercase label). */
export function getSectionEyebrowColor(theme: ColorTheme): string {
  return withAlpha(theme.textSecondary, 0.78);
}

/**
 * Soft atmospheric orb colours. Kept deliberately faint so the glass
 * above them stays clean rather than tinted.
 */
export function getLiquidOrbColor(
  theme: ColorTheme,
  tone: 'primary' | 'secondary' | 'accent',
): string {
  switch (tone) {
    case 'secondary':
      return withAlpha(theme.secondary, 0.08);
    case 'accent':
      return withAlpha(theme.accent, 0.12);
    default:
      return withAlpha(theme.primary, 0.10);
  }
}

/**
 * Stacked glass overlay colours (used by GlassSurface / cards).
 * Returns highlight gradient, tint gradient, and a fallback solid.
 * Tints are neutral — colour comes from the background bleeding through.
 */
export function getGlassOverlayColors(
  theme: ColorTheme,
  isDark: boolean,
): {
  highlight: string[];
  tint: string[];
  fallback: string;
} {
  return {
    highlight: [
      withAlpha('#FFFFFF', isDark ? 0.10 : 0.34),
      withAlpha('#FFFFFF', 0),
    ],
    tint: [
      withAlpha(theme.accent, isDark ? 0.05 : 0.06),
      withAlpha(theme.primary, isDark ? 0.03 : 0.04),
      withAlpha(theme.surfaceElevated, isDark ? 0.06 : 0.08),
    ],
    fallback: withAlpha(theme.surfaceElevated, isDark ? 0.16 : 0.24),
  };
}
