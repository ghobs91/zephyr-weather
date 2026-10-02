import {startOfHour} from 'date-fns';
import {Hourly, Minutely} from '../types/weather';

/**
 * Precipitation formatting engine.
 *
 * Providers store precipitation depth in millimetres (canonical internal
 * unit) and probability as a 0–100 percentage. This module works in inches
 * per hour and 0–1 probabilities because the intensity scale is defined in
 * in/hr:
 *
 *   none        < 0.005
 *   drizzle      0.005 – 0.10
 *   moderate     0.10  – 0.30
 *   heavy        0.30  – 0.50
 *   torrential  >= 0.50
 */
export type RainIntensity =
  | 'none'
  | 'drizzle'
  | 'moderate'
  | 'heavy'
  | 'torrential';

export const MM_PER_INCH = 25.4;
const HOUR_MS = 60 * 60 * 1000;
const FORECAST_WINDOW_HOURS = 24;
const DEFAULT_SLOT_MINUTES = 60;

/** Lower bounds for each intensity class, in inches per hour. */
export const RAIN_INTENSITY_THRESHOLDS = {
  drizzle: 0.005,
  moderate: 0.1,
  heavy: 0.3,
  torrential: 0.5,
} as const;

/** Waking hours are 07:00–22:00; overnight is 22:00–07:00. */
export const WAKING_START_HOUR = 7;
export const WAKING_END_HOUR = 22;

/** The inline sparkbar spans 12 waking hours (08:00–20:00). */
export const SPARKLINE_START_HOUR = 8;
export const SPARKLINE_HOURS = 12;

/** A slot counts as rain only when probability AND volume clear both bars. */
export const RAIN_WINDOW_MIN_POP = 0.3; // 30%
export const RAIN_WINDOW_MIN_RATE = 0.05; // in/hr

/** Chance-heavy but volume-free hours are reported as trace. */
export const TRACE_MAX_RATE = 0.01; // in/hr
export const BRIEF_MAX_DURATION_MINUTES = 45;

/** Below this many usable slots the forecast is treated as stale/missing. */
export const MIN_FORECAST_SLOTS = 6;

/** Horizon for the "next hour" rain-start estimate, in minutes. */
export const RAIN_START_HORIZON_MINUTES = 60;

/** Log scale saturates at this rate (100% bar height). */
export const SPARKLINE_MAX_RATE = 0.5; // in/hr
export const MIN_SPARKLINE_BAR_HEIGHT = 2; // px

export interface HourlyPrecipitationSlot {
  time: Date;
  /** Probability of precipitation, 0–1. */
  pop: number;
  rainRateInchesPerHr: number;
  /** Sub-hour precipitation coverage; defaults to 60. */
  durationMinutes?: number;
}

export interface RainWindow {
  start: Date;
  end: Date;
  durationMinutes: number;
  averageRateInchesPerHr: number;
  peakRateInchesPerHr: number;
  maxPop: number;
  intensity: RainIntensity;
}

export interface PrecipitationSummary {
  /** False when the forecast is missing or stale; `text` is then the fallback. */
  available: boolean;
  text: string;
  intensity: RainIntensity;
  hasRain: boolean;
  overnightOnly: boolean;
  brief: boolean;
  trace: boolean;
  /** Peak probability of precipitation across the day, 0–1. */
  dayPop: number;
  peak?: RainWindow;
  windows: RainWindow[];
}

export interface PrecipitationSummaryOptions {
  now?: Date;
  /** Daily probability of precipitation (0–100) used for the fallback text. */
  fallbackPop?: number;
}

/** Classify a rain rate on the in/hr intensity scale. */
export function classifyRainIntensity(
  rateInchesPerHr?: number | null,
): RainIntensity {
  if (
    rateInchesPerHr === undefined ||
    rateInchesPerHr === null ||
    !Number.isFinite(rateInchesPerHr)
  ) {
    return 'none';
  }
  if (rateInchesPerHr < RAIN_INTENSITY_THRESHOLDS.drizzle) return 'none';
  if (rateInchesPerHr < RAIN_INTENSITY_THRESHOLDS.moderate) return 'drizzle';
  if (rateInchesPerHr < RAIN_INTENSITY_THRESHOLDS.heavy) return 'moderate';
  if (rateInchesPerHr < RAIN_INTENSITY_THRESHOLDS.torrential) return 'heavy';
  return 'torrential';
}

export function mmPerHourToInchesPerHour(mm?: number | null): number {
  if (mm === undefined || mm === null || !Number.isFinite(mm) || mm < 0) {
    return 0;
  }
  return mm / MM_PER_INCH;
}

/** Rain rate for a provider hour; falls back to total precipitation. */
export function hourlyRainRateInchesPerHr(hour: Hourly): number {
  const mm = hour.precipitation?.rain ?? hour.precipitation?.total;
  return mmPerHourToInchesPerHour(mm);
}

/**
 * Extract the 24-hour forecast starting at the current local hour and
 * normalize it into slots. Past hours and invalid dates are dropped.
 */
export function hourlyPrecipitationSlots(
  hourly: Hourly[] | undefined,
  now: Date = new Date(),
): HourlyPrecipitationSlot[] {
  if (!hourly?.length) return [];
  return normalizeSlots(
    hourly.map((hour) => ({
      time: hour.date,
      pop: (hour.precipitationProbability?.total ?? 0) / 100,
      rainRateInchesPerHr: hourlyRainRateInchesPerHr(hour),
      durationMinutes: DEFAULT_SLOT_MINUTES,
    })),
    now,
  );
}

/** Select up to 12 waking-hour (08:00–20:00) forecasts for the sparkbar. */
export function selectSparklineHours(
  hourly: Hourly[] | undefined,
  now: Date = new Date(),
): Hourly[] {
  if (!hourly?.length) return [];
  const windowStart = startOfHour(now).getTime();
  const windowEnd = windowStart + FORECAST_WINDOW_HOURS * HOUR_MS;
  return hourly
    .filter((hour) => isValidDate(hour?.date))
    .filter((hour) => {
      const time = hour.date.getTime();
      return time >= windowStart && time < windowEnd;
    })
    .filter((hour) => {
      const hourOfDay = hour.date.getHours();
      return (
        hourOfDay >= SPARKLINE_START_HOUR &&
        hourOfDay < SPARKLINE_START_HOUR + SPARKLINE_HOURS
      );
    })
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, SPARKLINE_HOURS);
}

/**
 * Minutes until rain begins within the next `horizonMinutes` (default 60),
 * derived from the 15-minute minutely forecast. Returns:
 *
 *   - `null` when no rain starts within the horizon,
 *   - `0` when rain is already falling,
 *   - otherwise the number of minutes until the first rainy slot.
 *
 * Slots that have already passed and slots beyond the horizon are ignored,
 * so a rainy slot far in the future never inflates the "next hour" reading.
 */
export function estimateRainStart(
  minutely: Minutely[] | undefined,
  now: Date = new Date(),
  horizonMinutes: number = RAIN_START_HORIZON_MINUTES,
): number | null {
  if (!minutely?.length) return null;
  const nowMs = now.getTime();
  const horizonMs = nowMs + horizonMinutes * 60000;

  for (const minute of minutely) {
    const start = minute?.date?.getTime?.();
    if (!Number.isFinite(start)) continue;
    const intervalMs =
      (minute.minuteInterval > 0 ? minute.minuteInterval : 15) * 60000;
    if (start + intervalMs <= nowMs) continue; // slot already passed
    if (start >= horizonMs) break; // beyond the next hour
    if ((minute.precipitationIntensity ?? 0) > 0) {
      return Math.max(0, Math.round((start - nowMs) / 60000));
    }
  }
  return null;
}

/** Text for the "next hour" gauge: `Rain now` / `Starts in X min` / `No rain`. */
export function formatRainStart(minutesUntil: number | null): string {
  if (minutesUntil === null) return 'No rain';
  if (minutesUntil <= 0) return 'Rain now';
  return `Starts in ${minutesUntil} min`;
}

/**
 * Probability (0–100) that rain disrupts the user's waking day.
 *
 * Correlated hours are grouped into distinct rain events — contiguous runs of
 * waking hours with a non-zero chance — and those events are combined as
 * independent chances using each event's peak probability:
 *
 *   P = 1 − Π (1 − peakPop_event)
 *
 * This avoids the over-counting of multiplying every correlated hour (a single
 * six-hour shower is one event, not six trials) while still letting a genuinely
 * separate second system raise the number. Hours that have already passed are
 * ignored, `0` is returned once the waking day is over, and `null` means no
 * hourly data.
 */
export function rainDisruptionProbability(
  hourly: Hourly[] | undefined,
  now: Date = new Date(),
): number | null {
  if (!hourly?.length) return null;

  const dayStartMs = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  const dayEndMs = dayStartMs + 24 * HOUR_MS;
  const currentHourMs = startOfHour(now).getTime();

  const wakingHours = hourly
    .filter((hour) => {
      const time = hour?.date?.getTime?.();
      if (!Number.isFinite(time)) return false;
      const hourOfDay = hour.date.getHours();
      if (hourOfDay < WAKING_START_HOUR || hourOfDay >= WAKING_END_HOUR) {
        return false;
      }
      return time >= Math.max(dayStartMs, currentHourMs) && time < dayEndMs;
    })
    .map((hour) => ({
      time: hour.date.getTime(),
      pop: clampFraction((hour.precipitationProbability?.total ?? 0) / 100),
    }))
    .sort((a, b) => a.time - b.time);

  if (!wakingHours.length) return 0;

  // Split contiguous rainy hours into events; each event contributes its peak.
  const eventPeaks: number[] = [];
  let currentPeak = 0;
  let previousRainyTime: number | null = null;

  for (const hour of wakingHours) {
    if (hour.pop <= 0) {
      previousRainyTime = null; // a dry hour ends the current event
      continue;
    }
    const isContiguous =
      previousRainyTime !== null && hour.time - previousRainyTime <= HOUR_MS;
    if (!isContiguous) {
      if (currentPeak > 0) eventPeaks.push(currentPeak);
      currentPeak = 0;
    }
    currentPeak = Math.max(currentPeak, hour.pop);
    previousRainyTime = hour.time;
  }
  if (currentPeak > 0) eventPeaks.push(currentPeak);

  if (!eventPeaks.length) return 0;

  const chanceOfDry = eventPeaks.reduce((acc, peak) => acc * (1 - peak), 1);
  return Math.min(100, Math.round((1 - chanceOfDry) * 100));
}

/**
 * Group contiguous hours where pop >= 30% and rate >= 0.05 in/hr. Windows
 * may cross the waking/overnight boundary; a time gap splits them.
 */
export function detectRainWindows(
  slots: HourlyPrecipitationSlot[],
): RainWindow[] {
  const qualifying = slots
    .filter(
      (slot) =>
        slot.pop >= RAIN_WINDOW_MIN_POP &&
        slot.rainRateInchesPerHr >= RAIN_WINDOW_MIN_RATE,
    )
    .sort((a, b) => a.time.getTime() - b.time.getTime());

  const windows: RainWindow[] = [];
  let run: HourlyPrecipitationSlot[] = [];

  const flush = () => {
    if (!run.length) return;
    const durationMinutes = run.reduce(
      (sum, slot) => sum + (slot.durationMinutes ?? DEFAULT_SLOT_MINUTES),
      0,
    );
    const weightedRate = run.reduce(
      (sum, slot) =>
        sum +
        slot.rainRateInchesPerHr *
          (slot.durationMinutes ?? DEFAULT_SLOT_MINUTES),
      0,
    );
    const peakRateInchesPerHr = Math.max(
      ...run.map((slot) => slot.rainRateInchesPerHr),
    );
    const last = run[run.length - 1];
    windows.push({
      start: run[0].time,
      end: new Date(
        last.time.getTime() +
          (last.durationMinutes ?? DEFAULT_SLOT_MINUTES) * 60000,
      ),
      durationMinutes,
      averageRateInchesPerHr: weightedRate / durationMinutes,
      peakRateInchesPerHr,
      maxPop: Math.max(...run.map((slot) => slot.pop)),
      intensity: classifyRainIntensity(peakRateInchesPerHr),
    });
    run = [];
  };

  for (const slot of qualifying) {
    if (run.length) {
      const previous = run[run.length - 1];
      const previousEnd =
        previous.time.getTime() +
        (previous.durationMinutes ?? DEFAULT_SLOT_MINUTES) * 60000;
      if (slot.time.getTime() > previousEnd) flush();
    }
    run.push(slot);
  }
  flush();

  return windows;
}

/**
 * Format the smart summary string for a 24-hour slot window.
 *
 * Branch order: no windows → dry / isolated severe / trace / chance;
 * windows → overnight-only / brief / standard peak-window string. The
 * leading percentage is the day's peak probability.
 */
export function formatPrecipitationSummary(
  slots: HourlyPrecipitationSlot[] | undefined,
  options: PrecipitationSummaryOptions = {},
): PrecipitationSummary {
  const now = options.now ?? new Date();
  const unavailable: PrecipitationSummary = {
    available: false,
    text: formatPrecipitationFallback(options.fallbackPop),
    intensity: 'none',
    hasRain: false,
    overnightOnly: false,
    brief: false,
    trace: false,
    dayPop: 0,
    windows: [],
  };

  const valid = normalizeSlots(slots, now);
  if (valid.length < MIN_FORECAST_SLOTS) return unavailable;

  const dayPop = Math.max(...valid.map((slot) => slot.pop));
  const dayPopPercent = Math.round(dayPop * 100);
  const maxRate = Math.max(...valid.map((slot) => slot.rainRateInchesPerHr));
  const windows = detectRainWindows(valid);
  const peak = pickPeakWindow(windows);
  const overnightOnly = windows.length > 0 && windows.every(isOvernightWindow);
  const totalDurationMinutes = windows.reduce(
    (sum, window) => sum + window.durationMinutes,
    0,
  );
  const brief =
    windows.length > 0 && totalDurationMinutes < BRIEF_MAX_DURATION_MINUTES;

  if (peak) {
    const intensity = peak.intensity;
    let text: string;
    if (overnightOnly) {
      text = `${dayPopPercent}% Overnight ${labelForIntensity(intensity)} (${formatWindowRange(peak)})`;
    } else if (brief) {
      text = `${dayPopPercent}% Brief ${formatPeriod(peak)} ${labelForIntensity(intensity)} (${formatDuration(totalDurationMinutes)})`;
    } else {
      text = `${dayPopPercent}% ${labelForIntensity(intensity)} (${formatWindowRange(peak)})`;
    }
    return {
      ...unavailable,
      available: true,
      text,
      intensity,
      hasRain: true,
      overnightOnly,
      brief,
      dayPop,
      peak,
      windows,
    };
  }

  if (maxRate < RAIN_INTENSITY_THRESHOLDS.drizzle && dayPop < 0.2) {
    return {
      ...unavailable,
      available: true,
      text: 'Dry Today',
      dayPop,
      windows,
    };
  }

  if (
    maxRate >= RAIN_INTENSITY_THRESHOLDS.heavy &&
    dayPop < RAIN_WINDOW_MIN_POP
  ) {
    return {
      ...unavailable,
      available: true,
      text: `${dayPopPercent}% Risk of Heavy Downpours`,
      intensity: classifyRainIntensity(maxRate),
      hasRain: true,
      dayPop,
      windows,
    };
  }

  const intensity = classifyRainIntensity(maxRate);
  if (maxRate < TRACE_MAX_RATE) {
    return {
      ...unavailable,
      available: true,
      text: `${dayPopPercent}% Chance of Trace Drizzle`,
      intensity: 'drizzle',
      hasRain: true,
      trace: true,
      dayPop,
      windows,
    };
  }

  return {
    ...unavailable,
    available: true,
    text: `${dayPopPercent}% Chance of ${labelForIntensity(intensity)}`,
    intensity,
    hasRain: maxRate > 0,
    dayPop,
    windows,
  };
}

/** Standard daily PoP text used when hourly data is missing or stale. */
export function formatPrecipitationFallback(popPercent?: number): string {
  if (
    popPercent === undefined ||
    popPercent === null ||
    !Number.isFinite(popPercent)
  ) {
    return 'Rain data unavailable';
  }
  return `${Math.round(popPercent)}% Rain`;
}

/**
 * Logarithmic height ratio for a bar: 0 at no rain, 1 at 0.5+ in/hr.
 * The log curve keeps drizzle visible next to heavy rain.
 */
export function sparklineHeightRatio(rateInchesPerHr: number): number {
  if (!Number.isFinite(rateInchesPerHr) || rateInchesPerHr <= 0) return 0;
  const ratio =
    Math.log10(1 + rateInchesPerHr / RAIN_INTENSITY_THRESHOLDS.drizzle) /
    Math.log10(1 + SPARKLINE_MAX_RATE / RAIN_INTENSITY_THRESHOLDS.drizzle);
  return Math.min(Math.max(ratio, 0), 1);
}

/**
 * Pixel height for a bar. Rain always renders at least 2px so drizzle stays
 * visible; dry hours keep a faint 2px rail to preserve the timeline.
 */
export function sparklineBarHeight(
  rateInchesPerHr: number,
  height: number,
): number {
  const ratio = sparklineHeightRatio(rateInchesPerHr);
  if (ratio <= 0) return MIN_SPARKLINE_BAR_HEIGHT;
  return Math.max(ratio * height, MIN_SPARKLINE_BAR_HEIGHT);
}

/** "3p" / "2a" / "12p" style hour label. */
export function formatHourLabel(date: Date): string {
  const hour = date.getHours();
  const suffix = hour < 12 ? 'a' : 'p';
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${display}${suffix}`;
}

function normalizeSlots(
  slots: HourlyPrecipitationSlot[] | undefined,
  now: Date,
): HourlyPrecipitationSlot[] {
  if (!slots?.length) return [];
  const windowStart = startOfHour(now).getTime();
  const windowEnd = windowStart + FORECAST_WINDOW_HOURS * HOUR_MS;
  return slots
    .filter((slot) => slot && isValidDate(slot.time))
    .map((slot) => ({
      time: slot.time,
      pop: clampFraction(slot.pop),
      rainRateInchesPerHr:
        Number.isFinite(slot.rainRateInchesPerHr) &&
        slot.rainRateInchesPerHr > 0
          ? slot.rainRateInchesPerHr
          : 0,
      durationMinutes:
        slot.durationMinutes !== undefined &&
        Number.isFinite(slot.durationMinutes) &&
        slot.durationMinutes > 0
          ? slot.durationMinutes
          : DEFAULT_SLOT_MINUTES,
    }))
    .filter((slot) => {
      const time = slot.time.getTime();
      return time >= windowStart && time < windowEnd;
    })
    .sort((a, b) => a.time.getTime() - b.time.getTime())
    .slice(0, FORECAST_WINDOW_HOURS);
}

function pickPeakWindow(windows: RainWindow[]): RainWindow | undefined {
  return windows.reduce<RainWindow | undefined>((best, window) => {
    if (!best) return window;
    if (window.averageRateInchesPerHr > best.averageRateInchesPerHr) {
      return window;
    }
    if (
      window.averageRateInchesPerHr === best.averageRateInchesPerHr &&
      window.peakRateInchesPerHr > best.peakRateInchesPerHr
    ) {
      return window;
    }
    return best;
  }, undefined);
}

function isOvernightWindow(window: RainWindow): boolean {
  const lastInstant = window.end.getTime() - 1;
  return (
    isOvernightHour(window.start.getHours()) &&
    isOvernightHour(new Date(lastInstant).getHours())
  );
}

function isOvernightHour(hour: number): boolean {
  return hour >= WAKING_END_HOUR || hour < WAKING_START_HOUR;
}

function labelForIntensity(intensity: RainIntensity): string {
  switch (intensity) {
    case 'drizzle':
      return 'Drizzle';
    case 'heavy':
      return 'Heavy Rain';
    case 'torrential':
      return 'Torrential Rain';
    default:
      return 'Rain';
  }
}

function formatPeriod(window: RainWindow): 'AM' | 'PM' {
  return window.start.getHours() < 12 ? 'AM' : 'PM';
}

function formatWindowRange(window: RainWindow): string {
  return `${formatHourLabel(window.start)}–${formatHourLabel(window.end)}`;
}

function formatDuration(totalMinutes: number): string {
  const rounded = Math.max(5, Math.round(totalMinutes / 5) * 5);
  return `<${rounded}m`;
}

function clampFraction(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(Math.max(value, 0), 1);
}

function isValidDate(date: Date | undefined): date is Date {
  return date instanceof Date && Number.isFinite(date.getTime());
}
