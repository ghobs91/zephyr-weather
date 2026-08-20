import {TemperatureUnit, SpeedUnit, PressureUnit, PrecipitationUnit} from '../types/settings';

/**
 * Format a temperature value with an optional unit suffix.
 *
 * @param temp  Temperature in Celsius (the canonical internal unit).
 * @param unit  The display unit.
 * @param options.showUnit  When true, appends °C or °F. Default: true.
 * @param options.fallback  String returned when temp is undefined. Default: '--'.
 */
export function formatTemp(
  temp: number | undefined,
  unit: TemperatureUnit,
  options?: {showUnit?: boolean; fallback?: string},
): string {
  const {showUnit = true, fallback = '--'} = options ?? {};
  if (temp === undefined) {
    return showUnit ? fallback : fallback;
  }
  const display = unit === 'fahrenheit'
    ? Math.round(temp * 9 / 5 + 32)
    : Math.round(temp);
  return showUnit ? `${display}°${unit === 'fahrenheit' ? 'F' : 'C'}` : `${display}°`;
}

/**
 * Shorthand that formats temperature without the unit suffix ("72°" vs "72°F").
 * Convenient for tight UI spaces like badges and sidebars.
 */
export function formatTempShort(
  temp: number | undefined,
  unit: TemperatureUnit,
  fallback = '--°',
): string {
  if (temp === undefined) return fallback;
  const display = unit === 'fahrenheit'
    ? Math.round(temp * 9 / 5 + 32)
    : Math.round(temp);
  return `${display}°`;
}

/**
 * Format a wind speed value.
 *
 * @param speedKmh  Speed in km/h (the canonical internal unit).
 * @param unit       The display unit.
 * @param fallback   String returned when speedKmh is undefined. Default: '--'.
 */
export function formatSpeed(
  speedKmh: number | undefined,
  unit: SpeedUnit,
  fallback = '--',
): string {
  if (speedKmh === undefined) return fallback;
  switch (unit) {
    case 'mph':
      return `${Math.round(speedKmh * 0.621371)} mph`;
    case 'ms':
      return `${Math.round(speedKmh * 0.277778)} m/s`;
    case 'kn':
      return `${Math.round(speedKmh * 0.539957)} kn`;
    default: // kmh
      return `${Math.round(speedKmh)} km/h`;
  }
}

/**
 * Format a barometric pressure value.
 *
 * @param hPa   Pressure in hPa (the canonical internal unit).
 * @param unit   The display unit.
 * @param fallback  String returned when hPa is undefined. Default: '--'.
 */
export function formatPressure(
  hPa: number | undefined,
  unit: PressureUnit,
  fallback = '--',
): string {
  if (hPa === undefined) return fallback;
  switch (unit) {
    case 'mb':
      return `${Math.round(hPa)} mb`;
    case 'inhg':
      return `${(hPa * 0.02953).toFixed(2)} inHg`;
    case 'mmhg':
      return `${Math.round(hPa * 0.750062)} mmHg`;
    default: // hpa
      return `${Math.round(hPa)} hPa`;
  }
}

/**
 * Format a precipitation depth.
 *
 * @param mm    Precipitation in mm (the canonical internal unit).
 * @param unit   The display unit.
 * @param fallback  String returned when mm is undefined. Default: '--'.
 */
export function formatPrecipitation(
  mm: number | undefined,
  unit: PrecipitationUnit,
  fallback = '--',
): string {
  if (mm === undefined) return fallback;
  if (unit === 'inch') {
    const inches = mm / 25.4;
    return inches < 0.1 ? '<0.1 in' : `${inches.toFixed(2)} in`;
  }
  return `${Math.round(mm)} mm`;
}