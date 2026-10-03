import {Daily} from '../types/weather';

/**
 * Helpers for reasoning about daily-forecast calendar days.
 *
 * A `Daily.date` represents one calendar day in the *location's* timezone, but
 * providers express that day two different ways:
 *
 *   - UTC midnight of the local date (`new Date('2026-10-03')`), used by
 *     Open-Meteo, NWS, Met.no, BrightSky and ECCC; or
 *   - the actual local-midnight instant (`2026-10-02T15:00:00Z` for
 *     Asia/Tokyo), used by JMA and CWA.
 *
 * Because the representation is ambiguous, `dailyDayKey` derives the intended
 * calendar day from whichever of the two renderings is later. The intended day
 * is never behind either rendering, so the later key always resolves to it.
 * This keeps "which entry is today?" correct without having to normalize every
 * provider.
 */

/** The calendar day a daily entry represents, as `YYYY-MM-DD`. */
export function dailyDayKey(date: Date, timezone?: string): string {
  const utcKey = date.toISOString().slice(0, 10);
  const localKey = date.toLocaleDateString('en-CA', {timeZone: timezone});
  return utcKey > localKey ? utcKey : localKey;
}

/** `YYYY-MM-DD` for "now" in the given IANA timezone. */
export function localTodayKey(timezone?: string): string {
  return new Date().toLocaleDateString('en-CA', {timeZone: timezone});
}

/**
 * The daily entry representing "today" in the location's timezone. Daily
 * arrays are sorted ascending, so the first entry not before today is today.
 */
export function selectTodayForecast(
  dailyForecast: Daily[] | undefined,
  timezone?: string,
): Daily | undefined {
  if (!dailyForecast?.length) return undefined;
  const today = localTodayKey(timezone);
  return (
    dailyForecast.find((day) => dailyDayKey(day.date, timezone) >= today) ??
    dailyForecast[0]
  );
}

/** True when the entry falls on today or a later day in the location's tz. */
export function isTodayOrFuture(date: Date, timezone?: string): boolean {
  return dailyDayKey(date, timezone) >= localTodayKey(timezone);
}

/** Weekday abbreviation for a `YYYY-MM-DD` key, independent of device tz. */
export function weekdayLabel(dayKey: string): string {
  const [year, month, day] = dayKey.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en-US', {
    weekday: 'short',
    timeZone: 'UTC',
  });
}

/** `MM-DD` for a `YYYY-MM-DD` key. */
export function monthDayLabel(dayKey: string): string {
  return dayKey.slice(5);
}

/** Long date label (e.g. "Saturday, October 3") for a `YYYY-MM-DD` key. */
export function longDateLabel(dayKey: string): string {
  const [year, month, day] = dayKey.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}
