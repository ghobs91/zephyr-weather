export const colors = {
  light: {
    primary: '#4A90D9',
    primaryDark: '#3B7BC2',
    secondary: '#6FCF97',
    background: '#F5F7FA',
    surface: '#FFFFFF',
    surfaceVariant: '#F0F4F8',
    text: '#1A1A2E',
    textSecondary: '#6B7280',
    textTertiary: '#9CA3AF',
    border: '#E5E7EB',
    error: '#EF4444',
    warning: '#F59E0B',
    success: '#10B981',
    cardBackground: '#FFFFFF',
    
    // Weather-specific colors
    clearDay: '#87CEEB',
    clearNight: '#1E3A5F',
    cloudy: '#9CA3AF',
    rain: '#60A5FA',
    snow: '#CBD5E1',
    thunderstorm: '#6366F1',
    fog: '#D1D5DB',
    
    // Temperature gradient
    tempCold: '#3B82F6',
    tempCool: '#06B6D4',
    tempMild: '#10B981',
    tempWarm: '#F59E0B',
    tempHot: '#EF4444',
    
    // Air quality
    aqiGood: '#10B981',
    aqiFair: '#F59E0B',
    aqiModerate: '#F97316',
    aqiPoor: '#EF4444',
    aqiVeryPoor: '#7C3AED',
    
    // UV Index
    uvLow: '#10B981',
    uvModerate: '#F59E0B',
    uvHigh: '#F97316',
    uvVeryHigh: '#EF4444',
    uvExtreme: '#7C3AED',
    
    // Alert severity
    alertExtreme: '#DC2626',
    alertSevere: '#EA580C',
    alertModerate: '#D97706',
    alertMinor: '#65A30D',
  },
  dark: {
    primary: '#60A5FA',
    primaryDark: '#3B82F6',
    secondary: '#6FCF97',
    background: '#0F172A',
    surface: '#1E293B',
    surfaceVariant: '#334155',
    text: '#F8FAFC',
    textSecondary: '#94A3B8',
    textTertiary: '#64748B',
    border: '#334155',
    error: '#F87171',
    warning: '#FBBF24',
    success: '#34D399',
    cardBackground: '#1E293B',
    
    // Weather-specific colors
    clearDay: '#60A5FA',
    clearNight: '#1E3A5F',
    cloudy: '#64748B',
    rain: '#3B82F6',
    snow: '#94A3B8',
    thunderstorm: '#818CF8',
    fog: '#475569',
    
    // Temperature gradient
    tempCold: '#60A5FA',
    tempCool: '#22D3EE',
    tempMild: '#34D399',
    tempWarm: '#FBBF24',
    tempHot: '#F87171',
    
    // Air quality
    aqiGood: '#34D399',
    aqiFair: '#FBBF24',
    aqiModerate: '#FB923C',
    aqiPoor: '#F87171',
    aqiVeryPoor: '#A78BFA',
    
    // UV Index
    uvLow: '#34D399',
    uvModerate: '#FBBF24',
    uvHigh: '#FB923C',
    uvVeryHigh: '#F87171',
    uvExtreme: '#A78BFA',
    
    // Alert severity
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
