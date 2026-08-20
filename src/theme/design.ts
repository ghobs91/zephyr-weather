import {ViewStyle} from 'react-native';
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

// ── Liquid Glass Design Tokens ──────────────────────────────────────

const GLASS_RADIUS = 32;        // softer, more organic than the old 28
const PILL_RADIUS = 28;         // floating pill radius
const INSET_RADIUS = 24;        // nested inset panels

/**
 * Primary card style — deep liquid glass.
 * Rely on translucency + soft shadows for depth rather than borders.
 */
export function getCardStyle(theme: ColorTheme): ViewStyle {
  return {
    backgroundColor: theme.glassBase,
    borderRadius: GLASS_RADIUS,
    borderWidth: 0,
    borderColor: 'transparent',
    shadowColor: theme.shadow,
    shadowOffset: {width: 0, height: 20},
    shadowOpacity: 0.16,
    shadowRadius: 36,
    elevation: 8,
  };
}

/**
 * Inset panel — nested translucent surface, usually inside a card.
 */
export function getInsetPanelStyle(theme: ColorTheme): ViewStyle {
  return {
    backgroundColor: theme.glassOverlay,
    borderRadius: INSET_RADIUS,
    borderWidth: 0,
    borderColor: 'transparent',
  };
}

/**
 * Floating pill (tab bar, picker, etc.) — deeper glass with
 * a subtle highlight to simulate front-lit glass.
 */
export function getGlassPillStyle(theme: ColorTheme): ViewStyle {
  return {
    backgroundColor: theme.glassHighlight,
    borderRadius: PILL_RADIUS,
    borderWidth: 0,
    borderColor: 'transparent',
    shadowColor: theme.shadow,
    shadowOffset: {width: 0, height: 14},
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 8,
  };
}

/** Section eyebrow colour (subtle uppercase label). */
export function getSectionEyebrowColor(theme: ColorTheme): string {
  return withAlpha(theme.textSecondary, 0.78);
}

/**
 * Floating orb colours for the atmospheric background.
 * These are soft, saturated blobs that "bleed" colour through
 * the glass surfaces stacked above them.
 */
export function getLiquidOrbColor(
  theme: ColorTheme,
  tone: 'primary' | 'secondary' | 'accent',
): string {
  switch (tone) {
    case 'secondary':
      return withAlpha(theme.secondary, 0.18);
    case 'accent':
      return withAlpha(theme.accent, 0.22);
    default:
      return withAlpha(theme.primary, 0.16);
  }
}

/**
 * Stacked glass overlay colours (used by GlassSurface / cards).
 * Returns highlight gradient, tint gradient, and a fallback solid.
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
      withAlpha('#FFFFFF', isDark ? 0.10 : 0.36),
      withAlpha('#FFFFFF', 0),
    ],
    tint: [
      withAlpha(theme.accent, isDark ? 0.08 : 0.10),
      withAlpha(theme.primary, isDark ? 0.05 : 0.06),
      withAlpha(theme.surfaceElevated, isDark ? 0.08 : 0.12),
    ],
    fallback: withAlpha(theme.surfaceElevated, isDark ? 0.18 : 0.28),
  };
}
