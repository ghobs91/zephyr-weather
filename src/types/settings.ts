export type ThemeMode = 'light' | 'dark' | 'system';
export type TemperatureUnit = 'celsius' | 'fahrenheit';
export type SpeedUnit = 'kmh' | 'mph' | 'ms' | 'kn';
export type PressureUnit = 'hpa' | 'mb' | 'inhg' | 'mmhg';
export type PrecipitationUnit = 'mm' | 'inch';
export type DistanceUnit = 'km' | 'mi';
export type TimeFormat = 'auto' | '12h' | '24h';

/** Reorderable home-screen cards (Alerts and attribution are fixed). */
export type HomeCardId =
  | 'current'
  | 'rain'
  | 'hourly'
  | 'daily'
  | 'details'
  | 'sunmoon'
  | 'pollen';

export const defaultHomeCardOrder: HomeCardId[] = [
  'current',
  'rain',
  'hourly',
  'daily',
  'details',
  'sunmoon',
  'pollen',
];

/**
 * Returns a complete, de-duplicated card order. Persisted settings from
 * before card ordering existed (or after a card is added) are padded with
 * any missing cards in their default position, so the UI never drops one.
 */
export function normalizeHomeCardOrder(
  order?: readonly string[],
): HomeCardId[] {
  const valid = new Set<string>(defaultHomeCardOrder);
  const seen = new Set<string>();
  const result: HomeCardId[] = [];
  for (const id of order ?? []) {
    if (valid.has(id) && !seen.has(id)) {
      seen.add(id);
      result.push(id as HomeCardId);
    }
  }
  for (const id of defaultHomeCardOrder) {
    if (!seen.has(id)) result.push(id);
  }
  return result;
}

export interface AppSettings {
  theme: ThemeMode;
  temperatureUnit: TemperatureUnit;
  speedUnit: SpeedUnit;
  pressureUnit: PressureUnit;
  precipitationUnit: PrecipitationUnit;
  distanceUnit: DistanceUnit;
  timeFormat: TimeFormat;
  defaultForecastSource: string;
  refreshInterval: number; // in minutes
  liveActivityEnabled: boolean;
  cardOrder: HomeCardId[];
}

export const defaultSettings: AppSettings = {
  theme: 'system',
  temperatureUnit: 'fahrenheit',
  speedUnit: 'mph',
  pressureUnit: 'inhg',
  precipitationUnit: 'inch',
  distanceUnit: 'mi',
  timeFormat: 'auto',
  defaultForecastSource: 'nws',
  refreshInterval: 60,
  liveActivityEnabled: true,
  cardOrder: defaultHomeCardOrder,
};
