import axios from 'axios';
import {
  Weather,
  Current,
  Daily,
  Hourly,
  WeatherCode,
  MoonPhase,
  HalfDay,
} from '../types/weather';
import {getSunTimes, getDaylightDuration} from '../utils/sunCalc';

// BrightSky is a free, open API for DWD (German Weather Service) ICON model data
// It covers globally via ICON-Global (though higher resolution in Europe via ICON-EU)
const BRIGHTSKY_API_BASE = 'https://api.brightsky.dev';

interface BrightSkyWeatherRecord {
  timestamp: string; // ISO 8601
  source_id: number;
  cloud_cover?: number; // %
  condition?: string; // e.g. "dry", "rain", "snow", "sleet", "fog", "thunderstorm"
  dew_point?: number; // °C
  icon?: string; // e.g. "clear-day", "rain", "cloudy"
  precipitation?: number; // mm in the last hour
  precipitation_probability?: number; // % (only in forecasts)
  pressure_msl?: number; // hPa
  relative_humidity?: number; // %
  sunshine?: number; // minutes in the last hour
  temperature?: number; // °C
  visibility?: number; // meters
  wind_direction?: number; // degrees
  wind_speed?: number; // km/h
  wind_gust_direction?: number; // degrees
  wind_gust_speed?: number; // km/h
}

interface BrightSkyWeatherResponse {
  weather: BrightSkyWeatherRecord[];
  sources: Array<{
    id: number;
    station_name?: string;
    observation_type?: string;
    dwd_station_id?: string;
    wmo_station_id?: string;
    lat: number;
    lon: number;
    height: number;
    distance?: number;
  }>;
}

function mapConditionToWeatherCode(condition?: string, icon?: string): WeatherCode {
  // BrightSky condition values: dry, fog, rain, sleet, snow, hail, thunderstorm, null
  // BrightSky icon values: clear-day, clear-night, partly-cloudy-day, partly-cloudy-night,
  // cloudy, fog, wind, rain, sleet, snow, hail, thunderstorm
  const c = condition?.toLowerCase() ?? '';
  const i = icon?.toLowerCase() ?? '';

  if (c === 'thunderstorm' || i === 'thunderstorm') return WeatherCode.THUNDERSTORM;
  if (c === 'hail' || i === 'hail') return WeatherCode.HAIL;
  if (c === 'snow' || i === 'snow') return WeatherCode.SNOW;
  if (c === 'sleet' || i === 'sleet') return WeatherCode.SLEET;
  if (c === 'rain' || i === 'rain') return WeatherCode.RAIN;
  if (c === 'fog' || i === 'fog') return WeatherCode.FOG;
  if (i === 'wind') return WeatherCode.WIND;
  if (i === 'cloudy') return WeatherCode.CLOUDY;
  if (i.includes('partly-cloudy')) return WeatherCode.PARTLY_CLOUDY;
  if (i.includes('clear')) return WeatherCode.CLEAR;
  if (c === 'dry') return WeatherCode.CLEAR;

  return WeatherCode.CLEAR;
}

function getWeatherText(code: WeatherCode): string {
  const descriptions: Record<WeatherCode, string> = {
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
  return descriptions[code] ?? 'Unknown';
}

function calculateMoonPhase(date: Date): MoonPhase {
  const lunarCycle = 29.53059;
  const known = new Date(2000, 0, 6, 18, 14, 0).getTime();
  const phase =
    ((date.getTime() - known) / (lunarCycle * 24 * 60 * 60 * 1000)) % 1;

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

function localDateKey(date: Date, timeZone: string): string {
  return date.toLocaleDateString('en-CA', {timeZone});
}

export async function fetchBrightSkyWeather(
  latitude: number,
  longitude: number,
  timezone: string = 'UTC',
): Promise<Weather> {
  // BrightSky expects date in YYYY-MM-DD format
  const now = new Date();
  const startDate = now.toISOString().split('T')[0];
  // Fetch up to 10 days of forecast (BrightSky limit)
  const endDate = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  const response = await axios.get<BrightSkyWeatherResponse>(
    `${BRIGHTSKY_API_BASE}/weather`, {
      params: {
        lat: latitude.toFixed(4),
        lon: longitude.toFixed(4),
        date: startDate,
        last_date: endDate,
      },
      headers: {
        'User-Agent': 'ZephyrWeather/1.0 (zephyrweather.app)',
      },
    },
  );

  const records = response.data.weather;

  // Build hourly forecast
  const hourlyForecast: Hourly[] = records.map(r => {
    const date = new Date(r.timestamp);
    const weatherCode = mapConditionToWeatherCode(r.condition, r.icon);
    const sunTimes = getSunTimes(date, latitude, longitude);
    const isDay =
      sunTimes.sunrise && sunTimes.sunset
        ? date >= sunTimes.sunrise && date <= sunTimes.sunset
        : true;

    return {
      date,
      isDaylight: isDay,
      weatherCode,
      weatherText: getWeatherText(weatherCode),
      temperature: {
        temperature: r.temperature,
      },
      wind: {
        speed: r.wind_speed, // already km/h
        direction: r.wind_direction,
        gusts: r.wind_gust_speed,
      },
      relativeHumidity: r.relative_humidity,
      dewPoint: r.dew_point,
      pressure: r.pressure_msl,
      cloudCover: r.cloud_cover,
      visibility: r.visibility,
      precipitation: r.precipitation !== undefined
        ? {total: r.precipitation}
        : undefined,
      precipitationProbability: r.precipitation_probability !== undefined
        ? {total: r.precipitation_probability}
        : undefined,
    };
  });

  // Build current from first record
  const firstRecord = records[0];
  const current: Current | undefined = firstRecord
    ? (() => {
        const weatherCode = mapConditionToWeatherCode(firstRecord.condition, firstRecord.icon);
        const date = new Date(firstRecord.timestamp);
        const sunTimes = getSunTimes(date, latitude, longitude);
        const isDay =
          sunTimes.sunrise && sunTimes.sunset
            ? date >= sunTimes.sunrise && date <= sunTimes.sunset
            : true;
        return {
          weatherCode,
          weatherText: getWeatherText(weatherCode),
          isDaylight: isDay,
          temperature: {
            temperature: firstRecord.temperature,
          },
          wind: {
            speed: firstRecord.wind_speed,
            direction: firstRecord.wind_direction,
            gusts: firstRecord.wind_gust_speed,
          },
          relativeHumidity: firstRecord.relative_humidity,
          dewPoint: firstRecord.dew_point,
          pressure: firstRecord.pressure_msl,
          cloudCover: firstRecord.cloud_cover,
          visibility: firstRecord.visibility,
        };
      })()
    : undefined;

  // Aggregate hourly into daily
  const dailyBuckets = new Map<string, {
    temps: number[];
    codes: WeatherCode[];
    precipTotal: number;
    windSpeeds: number[];
    windDirs: number[];
    windGusts: number[];
    precipProbs: number[];
    date: Date;
  }>();

  for (const h of hourlyForecast) {
    const key = localDateKey(h.date, timezone);
    if (!dailyBuckets.has(key)) {
      dailyBuckets.set(key, {
        temps: [],
        codes: [],
        precipTotal: 0,
        windSpeeds: [],
        windDirs: [],
        windGusts: [],
        precipProbs: [],
        date: new Date(key),
      });
    }
    const b = dailyBuckets.get(key)!;
    if (h.temperature?.temperature !== undefined) b.temps.push(h.temperature.temperature);
    if (h.weatherCode) b.codes.push(h.weatherCode);
    if (h.precipitation?.total) b.precipTotal += h.precipitation.total;
    if (h.wind?.speed !== undefined) b.windSpeeds.push(h.wind.speed);
    if (h.wind?.direction !== undefined) b.windDirs.push(h.wind.direction);
    if (h.wind?.gusts !== undefined) b.windGusts.push(h.wind.gusts);
    if (h.precipitationProbability?.total !== undefined) b.precipProbs.push(h.precipitationProbability.total);
  }

  const dailyForecast: Daily[] = [];
  dailyBuckets.forEach((b) => {
    const maxTemp = b.temps.length ? Math.max(...b.temps) : undefined;
    const minTemp = b.temps.length ? Math.min(...b.temps) : undefined;
    const dayCode = pickDominantWeatherCode(b.codes);
    const sunTimes = getSunTimes(b.date, latitude, longitude);

    const day: HalfDay = {
      weatherCode: dayCode,
      weatherText: getWeatherText(dayCode),
      temperature: {temperature: maxTemp},
      precipitation: {total: b.precipTotal > 0 ? b.precipTotal : undefined},
      precipitationProbability: b.precipProbs.length
        ? {total: Math.max(...b.precipProbs)}
        : undefined,
      wind: {
        speed: b.windSpeeds.length ? Math.max(...b.windSpeeds) : undefined,
        direction: b.windDirs.length ? averageAngle(b.windDirs) : undefined,
        gusts: b.windGusts.length ? Math.max(...b.windGusts) : undefined,
      },
    };

    const night: HalfDay = {
      temperature: {temperature: minTemp},
    };

    dailyForecast.push({
      date: b.date,
      day,
      night,
      sun: {
        riseTime: sunTimes.sunrise,
        setTime: sunTimes.sunset,
      },
      moon: {
        phase: calculateMoonPhase(b.date),
      },
      hoursOfSun: getDaylightDuration(b.date, latitude, longitude),
    });
  });

  dailyForecast.sort((a, b) => a.date.getTime() - b.date.getTime());

  return {
    base: {
      refreshTime: new Date(),
      mainUpdateTime: new Date(),
    },
    current,
    dailyForecast,
    hourlyForecast,
  };
}

function pickDominantWeatherCode(codes: WeatherCode[]): WeatherCode {
  if (!codes.length) return WeatherCode.CLEAR;
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
  return codes.reduce((acc, c) => (severity[c] > severity[acc] ? c : acc), codes[0]);
}

function averageAngle(angles: number[]): number {
  let sinSum = 0;
  let cosSum = 0;
  for (const a of angles) {
    const rad = (a * Math.PI) / 180;
    sinSum += Math.sin(rad);
    cosSum += Math.cos(rad);
  }
  let avg = (Math.atan2(sinSum / angles.length, cosSum / angles.length) * 180) / Math.PI;
  if (avg < 0) avg += 360;
  return avg;
}
