export const colors = {
  light: {
    // ── Brand ──────────────────────────────────────────────────────
    primary: '#0EA5E9',        // vibrant sky blue
    primaryDark: '#0284C7',
    secondary: '#F59E0B',      // warm amber
    accent: '#38BDF8',         // lighter blue accent

    // ── Liquid Glass Surfaces ──────────────────────────────────────
    // iOS 27 liquid glass relies on deep translucency, not opaque fills.
    // These are the "base" colors that tint the glass — the actual
    // rendered effect comes from the blur + vibrancy layers stacked
    // on top of the atmospheric background.
    background: '#E8F8FF',           // cool blue-tinted white
    surface: '#EBF9FF',
    surfaceVariant: '#D6F0FB',
    surfaceElevated: '#F5FCFF',
    glassBase: 'rgba(255, 255, 255, 0.72)',   // main glass tint
    glassHighlight: 'rgba(255, 255, 255, 0.88)', // top-sheet / modal glass
    glassOverlay: 'rgba(245, 252, 255, 0.62)',  // subtle overlay glass

    // ── Text ───────────────────────────────────────────────────────
    text: '#0B1E33',
    textSecondary: '#4A607A',
    textTertiary: '#7D94AE',

    // ── Semantic ───────────────────────────────────────────────────
    border: 'rgba(11, 30, 51, 0.07)',
    error: '#EF4444',
    warning: '#F59E0B',
    success: '#10B981',

    // ── Glass surface presets (legacy compat) ──────────────────────
    cardBackground: 'rgba(255, 255, 255, 0.58)',
    cardBorder: 'rgba(255, 255, 255, 0.72)',
    pillBackground: 'rgba(245, 252, 255, 0.64)',
    pillBorder: 'rgba(255, 255, 255, 0.78)',
    overlay: 'rgba(255, 255, 255, 0.48)',
    shadow: '#1E4060',

    // ── Atmospheric Gradient (hero sky) ────────────────────────────
    heroSkyTop: '#38BDF8',       // vibrant sky top
    heroSkyMid: '#7DD3FC',       // soft transition
    heroSkyBottom: '#E0F2FE',    // misty base

    // ── Glow / Light Bleed ─────────────────────────────────────────
    glow: '#FDE68A',             // warm sun glow
    liquidGlow: '#BAE6FD',       // cool liquid accent glow

    // ── Weather-specific colors ────────────────────────────────────
    clearDay: '#60A5FA',
    clearNight: '#1E3A5F',
    cloudy: '#94A3B8',
    rain: '#3B82F6',
    snow: '#CBD5E1',
    thunderstorm: '#6366F1',
    fog: '#C4CBD4',

    // ── Temperature gradient ───────────────────────────────────────
    tempCold: '#3B82F6',
    tempCool: '#06B6D4',
    tempMild: '#10B981',
    tempWarm: '#F59E0B',
    tempHot: '#EF4444',

    // ── Air quality ────────────────────────────────────────────────
    aqiGood: '#10B981',
    aqiFair: '#F59E0B',
    aqiModerate: '#F97316',
    aqiPoor: '#EF4444',
    aqiVeryPoor: '#7C3AED',

    // ── UV Index ───────────────────────────────────────────────────
    uvLow: '#10B981',
    uvModerate: '#F59E0B',
    uvHigh: '#F97316',
    uvVeryHigh: '#EF4444',
    uvExtreme: '#7C3AED',

    // ── Alert severity ─────────────────────────────────────────────
    alertExtreme: '#DC2626',
    alertSevere: '#EA580C',
    alertModerate: '#D97706',
    alertMinor: '#65A30D',
  },
  dark: {
    // ── Brand ──────────────────────────────────────────────────────
    primary: '#38BDF8',
    primaryDark: '#0EA5E9',
    secondary: '#FBBF24',
    accent: '#7DD3FC',

    // ── Liquid Glass Surfaces ──────────────────────────────────────
    background: '#060E1A',            // deep navy-black
    surface: '#0A1525',
    surfaceVariant: '#122036',
    surfaceElevated: '#0E1A2E',
    glassBase: 'rgba(10, 21, 37, 0.78)',
    glassHighlight: 'rgba(15, 28, 48, 0.88)',
    glassOverlay: 'rgba(12, 23, 40, 0.66)',

    // ── Text ───────────────────────────────────────────────────────
    text: '#F0F6FF',
    textSecondary: '#B0C4DE',
    textTertiary: '#7088A8',

    // ── Semantic ───────────────────────────────────────────────────
    border: 'rgba(255, 255, 255, 0.06)',
    error: '#F87171',
    warning: '#FBBF24',
    success: '#34D399',

    // ── Glass surface presets (legacy compat) ──────────────────────
    cardBackground: 'rgba(12, 23, 40, 0.68)',
    cardBorder: 'rgba(255, 255, 255, 0.08)',
    pillBackground: 'rgba(10, 21, 37, 0.72)',
    pillBorder: 'rgba(255, 255, 255, 0.10)',
    overlay: 'rgba(8, 16, 28, 0.40)',
    shadow: '#02060C',

    // ── Atmospheric Gradient ───────────────────────────────────────
    heroSkyTop: '#1E40AF',       // deep indigo
    heroSkyMid: '#0F1D3D',      // dark navy
    heroSkyBottom: '#060E1A',   // near-black

    // ── Glow / Light Bleed ─────────────────────────────────────────
    glow: '#FDE68A',
    liquidGlow: '#1E3A5F',

    // ── Weather-specific colors ────────────────────────────────────
    clearDay: '#60A5FA',
    clearNight: '#1E3A5F',
    cloudy: '#64748B',
    rain: '#3B82F6',
    snow: '#94A3B8',
    thunderstorm: '#818CF8',
    fog: '#475569',

    // ── Temperature gradient ───────────────────────────────────────
    tempCold: '#60A5FA',
    tempCool: '#22D3EE',
    tempMild: '#34D399',
    tempWarm: '#FBBF24',
    tempHot: '#F87171',

    // ── Air quality ────────────────────────────────────────────────
    aqiGood: '#34D399',
    aqiFair: '#FBBF24',
    aqiModerate: '#FB923C',
    aqiPoor: '#F87171',
    aqiVeryPoor: '#A78BFA',

    // ── UV Index ───────────────────────────────────────────────────
    uvLow: '#34D399',
    uvModerate: '#FBBF24',
    uvHigh: '#FB923C',
    uvVeryHigh: '#F87171',
    uvExtreme: '#A78BFA',

    // ── Alert severity ─────────────────────────────────────────────
    alertExtreme: '#EF4444',
    alertSevere: '#F97316',
    alertModerate: '#EAB308',
    alertMinor: '#84CC16',
  },
};

export type ColorTheme = typeof colors.light;

export function getTemperatureColor(temp: number, isDark: boolean): string {
  const theme = isDark ? colors.dark : colors.light;
  if (temp < 0) return theme.tempCold;
  if (temp < 10) return theme.tempCool;
  if (temp < 20) return theme.tempMild;
  if (temp < 30) return theme.tempWarm;
  return theme.tempHot;
}

export function getAqiColor(aqi: number, isDark: boolean): string {
  const theme = isDark ? colors.dark : colors.light;
  if (aqi <= 50) return theme.aqiGood;
  if (aqi <= 100) return theme.aqiFair;
  if (aqi <= 150) return theme.aqiModerate;
  if (aqi <= 200) return theme.aqiPoor;
  return theme.aqiVeryPoor;
}

export function getUvColor(uv: number, isDark: boolean): string {
  const theme = isDark ? colors.dark : colors.light;
  if (uv <= 2) return theme.uvLow;
  if (uv <= 5) return theme.uvModerate;
  if (uv <= 7) return theme.uvHigh;
  if (uv <= 10) return theme.uvVeryHigh;
  return theme.uvExtreme;
}
