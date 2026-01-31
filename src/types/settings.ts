export type ThemeMode = 'light' | 'dark' | 'system';
export type TemperatureUnit = 'celsius' | 'fahrenheit';
export type SpeedUnit = 'kmh' | 'mph' | 'ms' | 'kn';
export type PressureUnit = 'hpa' | 'mb' | 'inhg' | 'mmhg';
export type PrecipitationUnit = 'mm' | 'inch';
export type DistanceUnit = 'km' | 'mi';

export interface AppSettings {
  theme: ThemeMode;
  temperatureUnit: TemperatureUnit;
  speedUnit: SpeedUnit;
  pressureUnit: PressureUnit;
  precipitationUnit: PrecipitationUnit;
  distanceUnit: DistanceUnit;
  defaultForecastSource: string;
  refreshInterval: number; // in minutes
  showNotifications: boolean;
  alertNotifications: boolean;
  precipitationNotifications: boolean;
  todayForecastNotifications: boolean;
  tomorrowForecastNotifications: boolean;
}

export const defaultSettings: AppSettings = {
  theme: 'system',
  temperatureUnit: 'fahrenheit',
  speedUnit: 'mph',
  pressureUnit: 'inhg',
  precipitationUnit: 'inch',
  distanceUnit: 'mi',
  defaultForecastSource: 'nws',
  refreshInterval: 60,
  showNotifications: true,
  alertNotifications: true,
  precipitationNotifications: false,
  todayForecastNotifications: false,
  tomorrowForecastNotifications: false,
};
