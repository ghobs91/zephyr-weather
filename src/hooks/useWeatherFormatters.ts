import {useMemo} from 'react';
import {useWeatherStore} from '../store/weatherStore';
import {
  formatTemp,
  formatTempShort,
  formatSpeed,
  formatPressure,
  formatPrecipitation,
} from '../utils/formatting';

/**
 * Shared hook that curries all formatting functions with the user's current
 * unit preferences. Re-memoised only when settings change.
 */
export function useWeatherFormatters() {
  const settings = useWeatherStore(state => state.settings);

  return useMemo(
    () => ({
      formatTemp: (t?: number, showUnit = true) =>
        formatTemp(t, settings.temperatureUnit, {showUnit}),
      formatTempShort: (t?: number) =>
        formatTempShort(t, settings.temperatureUnit),
      formatSpeed: (s?: number) =>
        formatSpeed(s, settings.speedUnit),
      formatPressure: (p?: number) =>
        formatPressure(p, settings.pressureUnit),
      formatPrecipitation: (mm?: number) =>
        formatPrecipitation(mm, settings.precipitationUnit),
    }),
    [settings],
  );
}
