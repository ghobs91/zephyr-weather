export const colors = {
  light: {
    // ── Brand ──────────────────────────────────────────────────────
    primary: '#007AFF',        // iOS system blue
    primaryDark: '#0062CC',
    secondary: '#FF9F0A',      // iOS system orange
    accent: '#5AC8FA',         // iOS system teal

    // ── Liquid Glass Surfaces ──────────────────────────────────────
    // Apple's Liquid Glass is a neutral, adaptive material: a frosted
    // layer that picks up the colour behind it rather than washing the
    // surface in brand tint. These values are deliberately low-saturation.
    background: '#F2F2F7',           // systemGroupedBackground
    surface: '#FFFFFF',
    surfaceVariant: '#E9E9EE',
    surfaceElevated: '#FFFFFF',
    glassBase: 'rgba(255, 255, 255, 0.55)',      // regular material
    glassHighlight: 'rgba(255, 255, 255, 0.72)', // floating / chrome material
    glassOverlay: 'rgba(255, 255, 255, 0.40)',   // thin nested material

    // ── Text (vibrancy-style) ──────────────────────────────────────
    text: '#000000',
    textSecondary: 'rgba(60, 60, 67, 0.60)',
    textTertiary: 'rgba(60, 60, 67, 0.30)',

    // ── Semantic ───────────────────────────────────────────────────
    border: 'rgba(60, 60, 67, 0.16)',
    error: '#FF3B30',
    warning: '#FF9F0A',
    success: '#34C759',

    // ── Liquid Glass material tokens ───────────────────────────────
    separator: 'rgba(60, 60, 67, 0.16)',
    fill: 'rgba(120, 120, 128, 0.16)',
    fillSecondary: 'rgba(120, 120, 128, 0.10)',
    fillTertiary: 'rgba(118, 118, 128, 0.06)',
    materialBorder: 'rgba(255, 255, 255, 0.55)',  // specular rim light
    materialSpecular: 'rgba(255, 255, 255, 0.85)',
    scrim: 'rgba(0, 0, 0, 0.22)',

    // ── Glass surface presets (legacy compat) ──────────────────────
    cardBackground: 'rgba(255, 255, 255, 0.55)',
    cardBorder: 'rgba(255, 255, 255, 0.55)',
    pillBackground: 'rgba(255, 255, 255, 0.72)',
    pillBorder: 'rgba(255, 255, 255, 0.65)',
    overlay: 'rgba(255, 255, 255, 0.40)',
    shadow: '#000000',

    // ── Atmospheric Gradient (hero sky) ────────────────────────────
    heroSkyTop: '#B3D9F2',       // soft sky
    heroSkyMid: '#D8EAF7',       // airy transition
    heroSkyBottom: '#F2F2F7',    // neutral base

    // ── Glow / Light Bleed ─────────────────────────────────────────
    glow: '#FFD60A',
    liquidGlow: '#5AC8FA',

    // ── Weather-specific colors ────────────────────────────────────
    clearDay: '#5AC8FA',
    clearNight: '#1E3A5F',
    cloudy: '#8E8E93',
    rain: '#0A84FF',
    snow: '#C7C7CC',
    thunderstorm: '#5E5CE6',
    fog: '#AEAEB2',

    // ── Temperature gradient ───────────────────────────────────────
    tempCold: '#0A84FF',
    tempCool: '#32ADE6',
    tempMild: '#34C759',
    tempWarm: '#FF9F0A',
    tempHot: '#FF3B30',

    // ── Air quality ────────────────────────────────────────────────
    aqiGood: '#34C759',
    aqiFair: '#FFD60A',
    aqiModerate: '#FF9F0A',
    aqiPoor: '#FF3B30',
    aqiVeryPoor: '#AF52DE',

    // ── UV Index ───────────────────────────────────────────────────
    uvLow: '#34C759',
    uvModerate: '#FFD60A',
    uvHigh: '#FF9F0A',
    uvVeryHigh: '#FF3B30',
    uvExtreme: '#AF52DE',

    // ── Alert severity ─────────────────────────────────────────────
    alertExtreme: '#FF3B30',
    alertSevere: '#FF9500',
    alertModerate: '#FFCC00',
    alertMinor: '#34C759',
  },
  dark: {
    // ── Brand ──────────────────────────────────────────────────────
    primary: '#0A84FF',
    primaryDark: '#007AFF',
    secondary: '#FFD60A',
    accent: '#64D2FF',

    // ── Liquid Glass Surfaces ──────────────────────────────────────
    background: '#000000',
    surface: '#1C1C1E',
    surfaceVariant: '#2C2C2E',
    surfaceElevated: '#2C2C2E',
    glassBase: 'rgba(28, 28, 30, 0.52)',
    glassHighlight: 'rgba(44, 44, 46, 0.68)',
    glassOverlay: 'rgba(28, 28, 30, 0.36)',

    // ── Text (vibrancy-style) ──────────────────────────────────────
    text: '#FFFFFF',
    textSecondary: 'rgba(235, 235, 245, 0.60)',
    textTertiary: 'rgba(235, 235, 245, 0.30)',

    // ── Semantic ───────────────────────────────────────────────────
    border: 'rgba(84, 84, 88, 0.60)',
    error: '#FF453A',
    warning: '#FFD60A',
    success: '#30D158',

    // ── Liquid Glass material tokens ───────────────────────────────
    separator: 'rgba(84, 84, 88, 0.60)',
    fill: 'rgba(120, 120, 128, 0.32)',
    fillSecondary: 'rgba(120, 120, 128, 0.22)',
    fillTertiary: 'rgba(118, 118, 128, 0.12)',
    materialBorder: 'rgba(255, 255, 255, 0.14)',
    materialSpecular: 'rgba(255, 255, 255, 0.30)',
    scrim: 'rgba(0, 0, 0, 0.55)',

    // ── Glass surface presets (legacy compat) ──────────────────────
    cardBackground: 'rgba(28, 28, 30, 0.52)',
    cardBorder: 'rgba(255, 255, 255, 0.14)',
    pillBackground: 'rgba(44, 44, 46, 0.68)',
    pillBorder: 'rgba(255, 255, 255, 0.12)',
    overlay: 'rgba(28, 28, 30, 0.36)',
    shadow: '#000000',

    // ── Atmospheric Gradient ───────────────────────────────────────
    heroSkyTop: '#0B1B33',       // deep night sky
    heroSkyMid: '#050B16',
    heroSkyBottom: '#000000',

    // ── Glow / Light Bleed ─────────────────────────────────────────
    glow: '#FFD60A',
    liquidGlow: '#1C3A5E',

    // ── Weather-specific colors ────────────────────────────────────
    clearDay: '#64D2FF',
    clearNight: '#1E3A5F',
    cloudy: '#98989D',
    rain: '#0A84FF',
    snow: '#C7C7CC',
    thunderstorm: '#7D7AFF',
    fog: '#8E8E93',

    // ── Temperature gradient ───────────────────────────────────────
    tempCold: '#64D2FF',
    tempCool: '#32ADE6',
    tempMild: '#30D158',
    tempWarm: '#FFD60A',
    tempHot: '#FF453A',

    // ── Air quality ────────────────────────────────────────────────
    aqiGood: '#30D158',
    aqiFair: '#FFD60A',
    aqiModerate: '#FF9F0A',
    aqiPoor: '#FF453A',
    aqiVeryPoor: '#BF5AF2',

    // ── UV Index ───────────────────────────────────────────────────
    uvLow: '#30D158',
    uvModerate: '#FFD60A',
    uvHigh: '#FF9F0A',
    uvVeryHigh: '#FF453A',
    uvExtreme: '#BF5AF2',

    // ── Alert severity ─────────────────────────────────────────────
    alertExtreme: '#FF453A',
    alertSevere: '#FF9F0A',
    alertModerate: '#FFD60A',
    alertMinor: '#30D158',
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
