/**
 * Shared mapping helpers for weather providers.
 *
 * National services expose wildly different shapes but almost all provide an
 * hourly series of (time, condition, temperature, wind, …). Providers map
 * their raw payload into `HourlySeriesInput[]` and let these helpers build the
 * `Hourly[]`, `Current` and `Daily[]` structures the app expects — so each new
 * service only contains its own API translation.
 */
import {
  Weather,
  WeatherCode,
  MoonPhase,
  Daily,
  Hourly,
  Current,
  HalfDay,
  Alert,
} from '../types/weather';
import {getSunTimes, getDaylightDuration} from '../utils/sunCalc';

const WEATHER_TEXT: Record<WeatherCode, string> = {
  [WeatherCode.CLEAR]: 'Clear',
  [WeatherCode.PARTLY_CLOUDY]: 'Partly Cloudy',
  [WeatherCode.CLOUDY]: 'Cloudy',
  [WeatherCode.RAIN_LIGHT]: 'Light Rain',
  [WeatherCode.RAIN]: 'Rain',
  [WeatherCode.RAIN_HEAVY]: 'Heavy Rain',
  [WeatherCode.SNOW_LIGHT]: 'Light Snow',
  [WeatherCode.SNOW]: 'Snow',
  [WeatherCode.SNOW_HEAVY]: 'Heavy Snow',
  [WeatherCode.SLEET]: 'Sleet',
  [WeatherCode.HAIL]: 'Hail',
  [WeatherCode.THUNDERSTORM]: 'Thunderstorm',
  [WeatherCode.FOG]: 'Fog',
  [WeatherCode.HAZE]: 'Haze',
  [WeatherCode.WIND]: 'Windy',
};

export function weatherTextFor(code: WeatherCode): string {
  return WEATHER_TEXT[code] ?? 'Unknown';
}

/** Severity ranking — used to collapse a day to one summary code. */
const SEVERITY: Record<WeatherCode, number> = {
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

export function dominantWeatherCode(codes: WeatherCode[]): WeatherCode {
  if (!codes.length) return WeatherCode.CLEAR;
  return codes.reduce(
    (acc, c) => (SEVERITY[c] > SEVERITY[acc] ? c : acc),
    codes[0],
  );
}

/**
 * Best-effort mapping of a free-text condition. Works for English strings and
 * for the numeric/keyword condition words most agencies expose.
 */
export function mapConditionText(text?: string): WeatherCode {
  if (!text) return WeatherCode.CLEAR;
  const t = text.toLowerCase();
  if (t.includes('thunder') || t.includes('storm')) {
    return WeatherCode.THUNDERSTORM;
  }
  if (t.includes('hail')) return WeatherCode.HAIL;
  if (
    t.includes('sleet') ||
    t.includes('freezing rain') ||
    t.includes('ice pellet')
  ) {
    return WeatherCode.SLEET;
  }
  if (t.includes('snow') || t.includes('sleet')) {
    if (t.includes('heavy') || t.includes('large'))
      return WeatherCode.SNOW_HEAVY;
    if (t.includes('light') || t.includes('slight'))
      return WeatherCode.SNOW_LIGHT;
    return WeatherCode.SNOW;
  }
  if (
    t.includes('rain') ||
    t.includes('shower') ||
    t.includes('drizzle') ||
    t.includes('precip')
  ) {
    if (t.includes('heavy') || t.includes('violent')) {
      return WeatherCode.RAIN_HEAVY;
    }
    if (t.includes('light') || t.includes('slight') || t.includes('drizzle')) {
      return WeatherCode.RAIN_LIGHT;
    }
    return WeatherCode.RAIN;
  }
  if (t.includes('fog') || t.includes('mist')) return WeatherCode.FOG;
  if (t.includes('haze') || t.includes('smoke') || t.includes('dust')) {
    return WeatherCode.HAZE;
  }
  if (t.includes('wind') || t.includes('gale')) return WeatherCode.WIND;
  if (t.includes('cloud') || t.includes('overcast')) {
    if (t.includes('partly') || t.includes('mostly sunny')) {
      return WeatherCode.PARTLY_CLOUDY;
    }
    return WeatherCode.CLOUDY;
  }
  if (t.includes('clear') || t.includes('sunny') || t.includes('fair')) {
    return WeatherCode.CLEAR;
  }
  return WeatherCode.CLEAR;
}

export function moonPhaseFor(date: Date): MoonPhase {
  const lunarCycle = 29.53059;
  const known = new Date(2000, 0, 6, 18, 14, 0).getTime();
  const phase =
    ((((date.getTime() - known) / (lunarCycle * 24 * 60 * 60 * 1000)) % 1) +
      1) %
    1;
  if (phase < 0.0625) return MoonPhase.NEW_MOON;
  if (phase < 0.1875) return MoonPhase.WAXING_CRESCENT;
  if (phase < 0.3125) return MoonPhase.FIRST_QUARTER;
  if (phase < 0.4375) return MoonPhase.WAXING_GIBBOUS;
  if (phase < 0.5625) return MoonPhase.FULL_MOON;
  if (phase < 0.6875) return MoonPhase.WANING_GIBBOUS;
  if (phase < 0.8125) return MoonPhase.THIRD_QUARTER;
  if (phase < 0.9375) return MoonPhase.WANING_CRESCENT;
  return MoonPhase.NEW_MOON;
}

export function isDaytimeAt(date: Date, lat: number, lon: number): boolean {
  const sunTimes = getSunTimes(date, lat, lon);
  if (!sunTimes.sunrise || !sunTimes.sunset) return true;
  return date >= sunTimes.sunrise && date <= sunTimes.sunset;
}

/** Circular mean of wind directions (handles the 350°/10° wrap). */
export function averageWindDirection(angles: number[]): number | undefined {
  if (!angles.length) return undefined;
  let sinSum = 0;
  let cosSum = 0;
  for (const a of angles) {
    const rad = (a * Math.PI) / 180;
    sinSum += Math.sin(rad);
    cosSum += Math.cos(rad);
  }
  let avg =
    (Math.atan2(sinSum / angles.length, cosSum / angles.length) * 180) /
    Math.PI;
  if (avg < 0) avg += 360;
  return avg;
}

function localDateKey(date: Date, timeZone: string): string {
  return date.toLocaleDateString('en-CA', {timeZone});
}

export interface HourlySeriesInput {
  date: Date;
  weatherCode: WeatherCode;
  temperature?: number;
  windSpeed?: number; // km/h
  windDirection?: number;
  windGusts?: number;
  relativeHumidity?: number;
  dewPoint?: number;
  pressure?: number;
  cloudCover?: number;
  precipitation?: number; // mm
  precipitationProbability?: number; // %
  uvIndex?: number;
  visibility?: number;
}

export function hourlyFromSeries(
  rows: HourlySeriesInput[],
  latitude: number,
  longitude: number,
): Hourly[] {
  return rows.map((row) => ({
    date: row.date,
    isDaylight: isDaytimeAt(row.date, latitude, longitude),
    weatherCode: row.weatherCode,
    weatherText: weatherTextFor(row.weatherCode),
    temperature: {temperature: row.temperature},
    wind: {
      speed: row.windSpeed,
      direction: row.windDirection,
      gusts: row.windGusts,
    },
    relativeHumidity: row.relativeHumidity,
    dewPoint: row.dewPoint,
    pressure: row.pressure,
    cloudCover: row.cloudCover,
    precipitation:
      row.precipitation !== undefined ? {total: row.precipitation} : undefined,
    precipitationProbability:
      row.precipitationProbability !== undefined
        ? {total: row.precipitationProbability}
        : undefined,
    uv: row.uvIndex !== undefined ? {index: row.uvIndex} : undefined,
    visibility: row.visibility,
  }));
}

interface DailyBucket {
  temps: number[];
  codes: WeatherCode[];
  precipTotal: number;
  precipProbs: number[];
  windSpeeds: number[];
  windDirs: number[];
  windGusts: number[];
  uvMax: number;
}

/** Aggregate an hourly series into per-local-day `Daily[]`. */
export function buildDailyFromHourly(
  hourly: Hourly[],
  latitude: number,
  longitude: number,
  timezone: string,
): Daily[] {
  const buckets = new Map<string, DailyBucket>();

  for (const h of hourly) {
    const key = localDateKey(h.date, timezone);
    if (!buckets.has(key)) {
      buckets.set(key, {
        temps: [],
        codes: [],
        precipTotal: 0,
        precipProbs: [],
        windSpeeds: [],
        windDirs: [],
        windGusts: [],
        uvMax: 0,
      });
    }
    const b = buckets.get(key)!;
    if (h.temperature?.temperature !== undefined) {
      b.temps.push(h.temperature.temperature);
    }
    if (h.weatherCode) b.codes.push(h.weatherCode);
    if (h.precipitation?.total) b.precipTotal += h.precipitation.total;
    if (h.precipitationProbability?.total !== undefined) {
      b.precipProbs.push(h.precipitationProbability.total);
    }
    if (h.wind?.speed !== undefined) b.windSpeeds.push(h.wind.speed);
    if (h.wind?.direction !== undefined) b.windDirs.push(h.wind.direction);
    if (h.wind?.gusts !== undefined) b.windGusts.push(h.wind.gusts);
    if (h.uv?.index !== undefined && h.uv.index > b.uvMax) {
      b.uvMax = h.uv.index;
    }
  }

  const daily: Daily[] = [];
  buckets.forEach((b, key) => {
    const date = new Date(key);
    const maxTemp = b.temps.length ? Math.max(...b.temps) : undefined;
    const minTemp = b.temps.length ? Math.min(...b.temps) : undefined;
    const dayCode = dominantWeatherCode(b.codes);
    const sunTimes = getSunTimes(date, latitude, longitude);

    const day: HalfDay = {
      weatherCode: dayCode,
      weatherText: weatherTextFor(dayCode),
      temperature: {temperature: maxTemp},
      precipitation: {total: b.precipTotal > 0 ? b.precipTotal : undefined},
      precipitationProbability: b.precipProbs.length
        ? {total: Math.max(...b.precipProbs)}
        : undefined,
      wind: {
        speed: b.windSpeeds.length ? Math.max(...b.windSpeeds) : undefined,
        direction: averageWindDirection(b.windDirs),
        gusts: b.windGusts.length ? Math.max(...b.windGusts) : undefined,
      },
    };

    const night: HalfDay = {
      temperature: {temperature: minTemp},
    };

    daily.push({
      date,
      day,
      night,
      sun: {riseTime: sunTimes.sunrise, setTime: sunTimes.sunset},
      moon: {phase: moonPhaseFor(date)},
      uv: {index: b.uvMax > 0 ? b.uvMax : undefined},
      hoursOfSun: getDaylightDuration(date, latitude, longitude),
    });
  });

  daily.sort((a, b) => a.date.getTime() - b.date.getTime());
  return daily;
}

/** Build `Current` from the first entry of an hourly series. */
export function currentFromHourly(
  hourly: Hourly[],
  latitude: number,
  longitude: number,
): Current | undefined {
  const first = hourly[0];
  if (!first) return undefined;
  return {
    weatherCode: first.weatherCode,
    weatherText: first.weatherText,
    isDaylight: isDaytimeAt(first.date, latitude, longitude),
    temperature: first.temperature,
    wind: first.wind,
    relativeHumidity: first.relativeHumidity,
    dewPoint: first.dewPoint,
    pressure: first.pressure,
    cloudCover: first.cloudCover,
    uv: first.uv,
    visibility: first.visibility,
  };
}

export interface BuildWeatherParams {
  hourly: Hourly[];
  latitude: number;
  longitude: number;
  timezone: string;
  updatedAt?: Date;
  alerts?: Alert[];
}

/** Assemble a full `Weather` object from a mapped hourly series. */
export function weatherFromHourly({
  hourly,
  latitude,
  longitude,
  timezone,
  updatedAt,
  alerts,
}: BuildWeatherParams): Weather {
  const now = updatedAt ?? new Date();
  return {
    base: {
      refreshTime: new Date(),
      mainUpdateTime: now,
      alertsUpdateTime: alerts ? now : undefined,
    },
    current: currentFromHourly(hourly, latitude, longitude),
    hourlyForecast: hourly,
    dailyForecast: buildDailyFromHourly(hourly, latitude, longitude, timezone),
    alerts,
  };
}
