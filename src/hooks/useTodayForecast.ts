import {useMemo} from 'react';
import {Daily} from '../types/weather';

/**
 * Returns the daily forecast entry that corresponds to "today" in the user's
 * local timezone, or the first entry if none match.
 */
export function useTodayForecast(dailyForecast: Daily[] | undefined): Daily | undefined {
  return useMemo(() => {
    if (!dailyForecast?.length) return undefined;
    const todayKey = new Date().toLocaleDateString('en-CA');
    return (
      dailyForecast.find(d => d.date.toLocaleDateString('en-CA') >= todayKey) ??
      dailyForecast[0]
    );
  }, [dailyForecast]);
}
