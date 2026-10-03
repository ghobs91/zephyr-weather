import {useMemo} from 'react';
import {Daily} from '../types/weather';
import {selectTodayForecast} from '../utils/dailyForecast';

/**
 * Returns the daily forecast entry that corresponds to "today" in the
 * location's timezone, or the first entry if none match.
 */
export function useTodayForecast(
  dailyForecast: Daily[] | undefined,
  timezone?: string,
): Daily | undefined {
  return useMemo(
    () => selectTodayForecast(dailyForecast, timezone),
    [dailyForecast, timezone],
  );
}
