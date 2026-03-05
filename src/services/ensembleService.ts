/**
 * Ensemble Weather Service
 *
 * Combines forecasts from multiple NWP-model-backed APIs:
 *   - NWS  (GFS / NAM / HRRR)  — US only
 *   - Open-Meteo (ECMWF / GFS blend) — global fallback as primary
 *   - Met.no (ECMWF + MEPS)    — global
 *   - BrightSky / DWD (ICON)   — global (ICON-Global)
 *
 * Because the models use different physics and data assimilation,
 * their errors are largely uncorrelated, so a simple ensemble mean
 * almost always beats any single source on long-run accuracy.
 */

import {
  Weather,
  Current,
  Daily,
  Hourly,
  WeatherCode,
  Wind,
  Temperature,
  Precipitation,
  PrecipitationProbability,
  EnsembleConfidence,
  HalfDay,
} from '../types/weather';

// ────────────────────────────────────────
// Utility helpers
// ────────────────────────────────────────

function avg(nums: number[]): number {
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function stdDev(nums: number[]): number {
  if (nums.length < 2) return 0;
  const m = avg(nums);
  return Math.sqrt(nums.reduce((s, n) => s + (n - m) ** 2, 0) / nums.length);
}

/** Convert std-dev to a 0-1 confidence score.
 *  Lower spread → higher confidence.
 *  Uses a simple logistic mapping where `halfLife` is the spread
 *  at which confidence = 0.5. */
function spreadToConfidence(sd: number, halfLife: number): number {
  return 1 / (1 + sd / halfLife);
}

/** Average angles properly via unit-vector decomposition */
function averageAngle(angles: number[]): number {
  if (!angles.length) return 0;
  let sinSum = 0;
  let cosSum = 0;
  for (const a of angles) {
    const rad = (a * Math.PI) / 180;
    sinSum += Math.sin(rad);
    cosSum += Math.cos(rad);
  }
  let result =
    (Math.atan2(sinSum / angles.length, cosSum / angles.length) * 180) /
    Math.PI;
  if (result < 0) result += 360;
  return result;
}

/** Vector-average wind: decompose to U/V, average, recompose */
function averageWind(winds: Wind[]): Wind {
  const valid = winds.filter(
    w => w.speed !== undefined && w.direction !== undefined,
  );
  if (!valid.length) {
    // Fall back to averaging whatever we have
    const speeds = winds.map(w => w.speed).filter((s): s is number => s !== undefined);
    const gusts = winds.map(w => w.gusts).filter((g): g is number => g !== undefined);
    return {
      speed: speeds.length ? avg(speeds) : undefined,
      gusts: gusts.length ? avg(gusts) : undefined,
    };
  }

  let uSum = 0;
  let vSum = 0;
  for (const w of valid) {
    const rad = (w.direction! * Math.PI) / 180;
    uSum += w.speed! * Math.sin(rad);
    vSum += w.speed! * Math.cos(rad);
  }
  const uAvg = uSum / valid.length;
  const vAvg = vSum / valid.length;
  const speed = Math.sqrt(uAvg * uAvg + vAvg * vAvg);
  let direction = (Math.atan2(uAvg, vAvg) * 180) / Math.PI;
  if (direction < 0) direction += 360;

  const gusts = winds
    .map(w => w.gusts)
    .filter((g): g is number => g !== undefined);

  return {
    speed,
    direction,
    gusts: gusts.length ? avg(gusts) : undefined,
  };
}

function avgOptional(vals: (number | undefined)[]): number | undefined {
  const nums = vals.filter((v): v is number => v !== undefined);
  return nums.length ? avg(nums) : undefined;
}

// ────────────────────────────────────────
// Merging individual fields
// ────────────────────────────────────────

function mergeTemperatures(temps: (Temperature | undefined)[]): Temperature | undefined {
  const valid = temps.filter((t): t is Temperature => t !== undefined);
  if (!valid.length) return undefined;
  return {
    temperature: avgOptional(valid.map(t => t.temperature)),
    realFeel: avgOptional(valid.map(t => t.realFeel)),
    apparent: avgOptional(valid.map(t => t.apparent)),
    windChill: avgOptional(valid.map(t => t.windChill)),
    wetBulb: avgOptional(valid.map(t => t.wetBulb)),
  };
}

/**
 * Precipitation: average amounts only from sources predicting > 0 mm.
 * Averaging a 0 with non-zero values drags the result down unrealistically.
 */
function mergePrecipitation(
  precips: (Precipitation | undefined)[],
): Precipitation | undefined {
  const valid = precips.filter((p): p is Precipitation => p !== undefined);
  if (!valid.length) return undefined;

  const totals = valid.map(p => p.total).filter((t): t is number => t !== undefined);
  const rains = valid.map(p => p.rain).filter((r): r is number => r !== undefined);
  const snows = valid.map(p => p.snow).filter((s): s is number => s !== undefined);

  // Only average among sources predicting > 0
  const positiveTotals = totals.filter(t => t > 0);
  const positiveRains = rains.filter(r => r > 0);
  const positiveSnows = snows.filter(s => s > 0);

  return {
    total: positiveTotals.length ? avg(positiveTotals) : (totals.length ? 0 : undefined),
    rain: positiveRains.length ? avg(positiveRains) : (rains.length ? 0 : undefined),
    snow: positiveSnows.length ? avg(positiveSnows) : (snows.length ? 0 : undefined),
  };
}

function mergePrecipProbability(
  probs: (PrecipitationProbability | undefined)[],
): PrecipitationProbability | undefined {
  const valid = probs.filter(
    (p): p is PrecipitationProbability => p !== undefined,
  );
  if (!valid.length) return undefined;
  return {
    total: avgOptional(valid.map(p => p.total)),
    thunderstorm: avgOptional(valid.map(p => p.thunderstorm)),
    rain: avgOptional(valid.map(p => p.rain)),
    snow: avgOptional(valid.map(p => p.snow)),
    ice: avgOptional(valid.map(p => p.ice)),
  };
}

function mergeWinds(winds: (Wind | undefined)[]): Wind | undefined {
  const valid = winds.filter((w): w is Wind => w !== undefined);
  if (!valid.length) return undefined;
  return averageWind(valid);
}

/** Pick the most commonly occurring weather code; ties broken by severity */
function mergeWeatherCodes(codes: (WeatherCode | undefined)[]): WeatherCode | undefined {
  const valid = codes.filter((c): c is WeatherCode => c !== undefined);
  if (!valid.length) return undefined;

  // Count occurrences
  const counts = new Map<WeatherCode, number>();
  for (const c of valid) {
    counts.set(c, (counts.get(c) ?? 0) + 1);
  }

  const severity: Record<WeatherCode, number> = {
    [WeatherCode.CLEAR]: 0,
    [WeatherCode.PARTLY_CLOUDY]: 1,
    [WeatherCode.CLOUDY]: 2,
    [WeatherCode.HAZE]: 3,
    [WeatherCode.FOG]: 4,
    [WeatherCode.WIND]: 5,
    [WeatherCode.RAIN_LIGHT]: 6,
    [WeatherCode.RAIN]: 7,
    [WeatherCode.RAIN_HEAVY]: 8,
    [WeatherCode.SLEET]: 9,
    [WeatherCode.SNOW_LIGHT]: 10,
    [WeatherCode.SNOW]: 11,
    [WeatherCode.SNOW_HEAVY]: 12,
    [WeatherCode.HAIL]: 13,
    [WeatherCode.THUNDERSTORM]: 14,
  };

  // Sort by count desc, then severity desc for tie-breaking
  return [...counts.entries()].sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1]; // higher count first
    return severity[b[0]] - severity[a[0]]; // higher severity first
  })[0][0];
}

// ────────────────────────────────────────
// Merging Current observations
// ────────────────────────────────────────

function mergeCurrent(currents: (Current | undefined)[]): Current | undefined {
  const valid = currents.filter((c): c is Current => c !== undefined);
  if (!valid.length) return undefined;

  return {
    weatherCode: mergeWeatherCodes(valid.map(c => c.weatherCode)),
    weatherText: (() => {
      const code = mergeWeatherCodes(valid.map(c => c.weatherCode));
      // Re-use text from the source that matches the merged code, else first text
      const match = valid.find(c => c.weatherCode === code);
      return match?.weatherText ?? valid[0].weatherText;
    })(),
    isDaylight: valid.find(c => c.isDaylight !== undefined)?.isDaylight,
    temperature: mergeTemperatures(valid.map(c => c.temperature)),
    wind: mergeWinds(valid.map(c => c.wind)),
    relativeHumidity: avgOptional(valid.map(c => c.relativeHumidity)),
    dewPoint: avgOptional(valid.map(c => c.dewPoint)),
    pressure: avgOptional(valid.map(c => c.pressure)),
    cloudCover: avgOptional(valid.map(c => c.cloudCover)),
    visibility: avgOptional(valid.map(c => c.visibility)),
    // Preserve fields that only one source may provide
    uv: valid.find(c => c.uv)?.uv,
    airQuality: valid.find(c => c.airQuality)?.airQuality,
    dailyForecast: valid.find(c => c.dailyForecast)?.dailyForecast,
  };
}

// ────────────────────────────────────────
// Merging Hourly forecasts
// ────────────────────────────────────────

/** Round a Date down to the nearest hour for bucket alignment */
function hourBucket(date: Date): string {
  const d = new Date(date);
  d.setMinutes(0, 0, 0);
  return d.toISOString();
}

function mergeHourlyArrays(hourlyArrays: Hourly[][]): Hourly[] {
  // Index all hourly entries by their UTC hour bucket
  const buckets = new Map<string, Hourly[]>();

  for (const arr of hourlyArrays) {
    for (const h of arr) {
      const key = hourBucket(h.date);
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key)!.push(h);
    }
  }

  const merged: Hourly[] = [];
  const sortedKeys = [...buckets.keys()].sort();

  for (const key of sortedKeys) {
    const entries = buckets.get(key)!;
    merged.push({
      date: new Date(key),
      isDaylight: entries.find(e => e.isDaylight !== undefined)?.isDaylight,
      weatherCode: mergeWeatherCodes(entries.map(e => e.weatherCode)),
      weatherText: (() => {
        const code = mergeWeatherCodes(entries.map(e => e.weatherCode));
        const match = entries.find(e => e.weatherCode === code);
        return match?.weatherText ?? entries[0].weatherText;
      })(),
      temperature: mergeTemperatures(entries.map(e => e.temperature)),
      precipitation: mergePrecipitation(entries.map(e => e.precipitation)),
      precipitationProbability: mergePrecipProbability(
        entries.map(e => e.precipitationProbability),
      ),
      wind: mergeWinds(entries.map(e => e.wind)),
      relativeHumidity: avgOptional(entries.map(e => e.relativeHumidity)),
      dewPoint: avgOptional(entries.map(e => e.dewPoint)),
      pressure: avgOptional(entries.map(e => e.pressure)),
      cloudCover: avgOptional(entries.map(e => e.cloudCover)),
      visibility: avgOptional(entries.map(e => e.visibility)),
      uv: entries.find(e => e.uv)?.uv,
      airQuality: entries.find(e => e.airQuality)?.airQuality,
      pollen: entries.find(e => e.pollen)?.pollen,
    });
  }

  return merged;
}

// ────────────────────────────────────────
// Merging Daily forecasts
// ────────────────────────────────────────

function mergeHalfDays(halves: (HalfDay | undefined)[]): HalfDay | undefined {
  const valid = halves.filter((h): h is HalfDay => h !== undefined);
  if (!valid.length) return undefined;

  return {
    weatherCode: mergeWeatherCodes(valid.map(h => h.weatherCode)),
    weatherText: (() => {
      const code = mergeWeatherCodes(valid.map(h => h.weatherCode));
      const match = valid.find(h => h.weatherCode === code);
      return match?.weatherText ?? valid[0].weatherText;
    })(),
    temperature: mergeTemperatures(valid.map(h => h.temperature)),
    precipitation: mergePrecipitation(valid.map(h => h.precipitation)),
    precipitationProbability: mergePrecipProbability(
      valid.map(h => h.precipitationProbability),
    ),
    wind: mergeWinds(valid.map(h => h.wind)),
    cloudCover: avgOptional(valid.map(h => h.cloudCover)),
  };
}

function dateKey(date: Date): string {
  return date.toISOString().split('T')[0];
}

function mergeDailyArrays(dailyArrays: Daily[][]): Daily[] {
  const buckets = new Map<string, Daily[]>();

  for (const arr of dailyArrays) {
    for (const d of arr) {
      const key = dateKey(d.date);
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key)!.push(d);
    }
  }

  const merged: Daily[] = [];
  const sortedKeys = [...buckets.keys()].sort();

  for (const key of sortedKeys) {
    const entries = buckets.get(key)!;
    // Use the first source's structural info (sun, moon, etc) as baseline
    const baseline = entries[0];

    merged.push({
      date: baseline.date,
      day: mergeHalfDays(entries.map(e => e.day)),
      night: mergeHalfDays(entries.map(e => e.night)),
      sun: baseline.sun,
      moon: baseline.moon,
      uv: entries.find(e => e.uv?.index !== undefined)?.uv,
      airQuality: entries.find(e => e.airQuality)?.airQuality,
      pollen: entries.find(e => e.pollen)?.pollen,
      hoursOfSun: baseline.hoursOfSun,
      degreeDays: entries.find(e => e.degreeDays)?.degreeDays,
    });
  }

  return merged;
}

// ────────────────────────────────────────
// Confidence / Uncertainty calculation
// ────────────────────────────────────────

function computeConfidence(
  weathers: Weather[],
  sourceNames: string[],
): EnsembleConfidence {
  // Compare temperature spread across sources for the first few hourly entries
  const tempSpreads: number[] = [];
  const precipSpreads: number[] = [];
  const windSpreads: number[] = [];

  // Look at the first 24 hourly entries from each source
  const maxHours = 24;

  for (let i = 0; i < maxHours; i++) {
    const temps: number[] = [];
    const precips: number[] = [];
    const winds: number[] = [];

    for (const w of weathers) {
      const h = w.hourlyForecast[i];
      if (!h) continue;
      if (h.temperature?.temperature !== undefined) temps.push(h.temperature.temperature);
      if (h.precipitation?.total !== undefined) precips.push(h.precipitation.total);
      if (h.wind?.speed !== undefined) winds.push(h.wind.speed);
    }

    if (temps.length >= 2) tempSpreads.push(stdDev(temps));
    if (precips.length >= 2) precipSpreads.push(stdDev(precips));
    if (winds.length >= 2) windSpreads.push(stdDev(winds));
  }

  // Convert average spreads to confidence using reasonable half-life values
  // Temperature: 2°C spread → 50% confidence
  const tempConf = tempSpreads.length
    ? spreadToConfidence(avg(tempSpreads), 2)
    : 1;
  // Precipitation: 1mm spread → 50% confidence
  const precipConf = precipSpreads.length
    ? spreadToConfidence(avg(precipSpreads), 1)
    : 1;
  // Wind: 5 km/h spread → 50% confidence
  const windConf = windSpreads.length
    ? spreadToConfidence(avg(windSpreads), 5)
    : 1;

  const overall = (tempConf + precipConf + windConf) / 3;

  return {
    temperature: tempConf,
    precipitation: precipConf,
    wind: windConf,
    overall,
    sourceCount: weathers.length,
    sourceNames,
  };
}

// ────────────────────────────────────────
// Public API
// ────────────────────────────────────────

export interface EnsembleSource {
  name: string;
  weather: Weather;
}

/**
 * Combine multiple Weather results into a single ensemble forecast.
 *
 * Strategy:
 *   - Temperature / humidity / pressure / cloud cover: arithmetic mean
 *   - Wind: vector average (U/V decomposition)
 *   - Precipitation amounts: mean of sources predicting > 0
 *   - Precipitation probability: arithmetic mean (confidence signal)
 *   - Weather code: majority vote, tie-break by severity
 *   - Alerts: union from all sources (deduplicated by id)
 *   - Air quality / pollen / UV: first available source
 *   - Confidence: derived from inter-source spread (std dev)
 */
export function combineEnsemble(sources: EnsembleSource[]): Weather {
  if (sources.length === 0) {
    return {dailyForecast: [], hourlyForecast: []};
  }
  if (sources.length === 1) {
    return {
      ...sources[0].weather,
      confidence: {
        temperature: 1,
        precipitation: 1,
        wind: 1,
        overall: 1,
        sourceCount: 1,
        sourceNames: [sources[0].name],
      },
    };
  }

  const weathers = sources.map(s => s.weather);
  const sourceNames = sources.map(s => s.name);

  // Merge current
  const current = mergeCurrent(weathers.map(w => w.current));

  // Merge hourly
  const hourlyForecast = mergeHourlyArrays(
    weathers.map(w => w.hourlyForecast),
  );

  // Merge daily
  const dailyForecast = mergeDailyArrays(weathers.map(w => w.dailyForecast));

  // Union alerts (deduplicate by headline since ids differ across sources)
  const seenAlerts = new Set<string>();
  const alerts = weathers.flatMap(w => w.alerts ?? []).filter(a => {
    const key = a.headline ?? a.id;
    if (seenAlerts.has(key)) return false;
    seenAlerts.add(key);
    return true;
  });

  // Minutely: use first source that provides it
  const minutelyForecast = weathers.find(w => w.minutelyForecast)?.minutelyForecast;

  // Confidence
  const confidence = computeConfidence(weathers, sourceNames);

  return {
    base: {
      refreshTime: new Date(),
      mainUpdateTime: new Date(),
    },
    current,
    dailyForecast,
    hourlyForecast,
    minutelyForecast,
    alerts: alerts.length ? alerts : undefined,
    confidence,
  };
}
