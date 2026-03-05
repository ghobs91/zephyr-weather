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

// Met.no requires an identifying User-Agent per their TOS
const METNO_API_BASE = 'https://api.met.no/weatherapi/locationforecast/2.0';
const USER_AGENT = 'ZephyrWeather/1.0 (zephyrweather.app, support@zephyrweather.app)';

interface MetNoTimeSeries {
  time: string;
  data: {
    instant: {
      details: {
        air_temperature?: number; // °C
        air_pressure_at_sea_level?: number; // hPa
        cloud_area_fraction?: number; // %
        relative_humidity?: number; // %
        wind_from_direction?: number; // degrees
        wind_speed?: number; // m/s
        wind_speed_of_gust?: number; // m/s
        dew_point_temperature?: number; // °C
        ultraviolet_index_clear_sky?: number;
      };
    };
    next_1_hours?: MetNoPeriodSummary;
    next_6_hours?: MetNoPeriodSummary;
    next_12_hours?: MetNoPeriodSummary;
  };
}

interface MetNoPeriodSummary {
  summary: {
    symbol_code: string;
  };
  details: {
    precipitation_amount?: number; // mm
    precipitation_amount_min?: number;
    precipitation_amount_max?: number;
    probability_of_precipitation?: number; // %
    air_temperature_max?: number;
    air_temperature_min?: number;
  };
}

interface MetNoResponse {
  type: string;
  geometry: {
    type: string;
    coordinates: [number, number, number]; // [lon, lat, altitude]
  };
  properties: {
    meta: {
      updated_at: string;
      units: {[key: string]: string};
    };
    timeseries: MetNoTimeSeries[];
  };
}

function msToKmh(ms: number): number {
  return ms * 3.6;
}

function mapSymbolToWeatherCode(symbol: string): WeatherCode {
  // Met.no symbol codes: https://api.met.no/weatherapi/weathericon/2.0/documentation
  // Remove _day/_night/_polartwilight suffix
  const base = symbol.replace(/_(day|night|polartwilight)$/, '');

  switch (base) {
    case 'clearsky':
      return WeatherCode.CLEAR;
    case 'fair':
    case 'partlycloudy':
      return WeatherCode.PARTLY_CLOUDY;
    case 'cloudy':
      return WeatherCode.CLOUDY;
    case 'fog':
      return WeatherCode.FOG;
    case 'lightrain':
    case 'lightrainshowers':
    case 'lightsleetandthunder':
      return WeatherCode.RAIN_LIGHT;
    case 'rain':
    case 'rainshowers':
    case 'rainandthunder':
    case 'rainshowersandthunder':
      return WeatherCode.RAIN;
    case 'heavyrain':
    case 'heavyrainshowers':
    case 'heavyrainandthunder':
    case 'heavyrainshowersandthunder':
      return WeatherCode.RAIN_HEAVY;
    case 'lightsnow':
    case 'lightsnowshowers':
    case 'lightssnowshowersandthunder':
    case 'lightsnowandthunder':
      return WeatherCode.SNOW_LIGHT;
    case 'snow':
    case 'snowshowers':
    case 'snowandthunder':
    case 'snowshowersandthunder':
      return WeatherCode.SNOW;
    case 'heavysnow':
    case 'heavysnowshowers':
    case 'heavysnowandthunder':
    case 'heavysnowshowersandthunder':
      return WeatherCode.SNOW_HEAVY;
    case 'sleet':
    case 'sleetshowers':
    case 'lightsleet':
    case 'lightsleetshowers':
    case 'heavysleet':
    case 'heavysleetshowers':
    case 'sleetandthunder':
    case 'sleetshowersandthunder':
    case 'lightsleetshowersandthunder':
    case 'heavysleetandthunder':
    case 'heavysleetshowersandthunder':
      return WeatherCode.SLEET;
    default:
      // Any remaining thunder variants
      if (base.includes('thunder')) return WeatherCode.THUNDERSTORM;
      return WeatherCode.CLEAR;
  }
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

// Get YYYY-MM-DD key in a given timezone
function localDateKey(date: Date, timeZone: string): string {
  return date.toLocaleDateString('en-CA', {timeZone});
}

function isDaytime(date: Date, lat: number, lon: number): boolean {
  const sunTimes = getSunTimes(date, lat, lon);
  if (!sunTimes.sunrise || !sunTimes.sunset) return true;
  return date >= sunTimes.sunrise && date <= sunTimes.sunset;
}

export async function fetchMetNoWeather(
  latitude: number,
  longitude: number,
  timezone: string = 'UTC',
): Promise<Weather> {
  const headers = {
    'User-Agent': USER_AGENT,
  };

  const response = await axios.get<MetNoResponse>(
    `${METNO_API_BASE}/complete?lat=${latitude.toFixed(4)}&lon=${longitude.toFixed(4)}`,
    {headers},
  );

  const timeseries = response.data.properties.timeseries;
  const updatedAt = response.data.properties.meta.updated_at;

  // Build hourly forecast from timeseries
  const hourlyForecast: Hourly[] = [];
  for (const ts of timeseries) {
    const date = new Date(ts.time);
    const d = ts.data.instant.details;
    const period = ts.data.next_1_hours ?? ts.data.next_6_hours;
    const symbolCode = period?.summary?.symbol_code ?? '';
    const weatherCode = symbolCode ? mapSymbolToWeatherCode(symbolCode) : WeatherCode.CLEAR;

    hourlyForecast.push({
      date,
      isDaylight: isDaytime(date, latitude, longitude),
      weatherCode,
      weatherText: getWeatherText(weatherCode),
      temperature: {
        temperature: d.air_temperature,
      },
      wind: {
        speed: d.wind_speed !== undefined ? msToKmh(d.wind_speed) : undefined,
        direction: d.wind_from_direction,
        gusts: d.wind_speed_of_gust !== undefined ? msToKmh(d.wind_speed_of_gust) : undefined,
      },
      relativeHumidity: d.relative_humidity,
      dewPoint: d.dew_point_temperature,
      pressure: d.air_pressure_at_sea_level,
      cloudCover: d.cloud_area_fraction,
      precipitationProbability: period?.details?.probability_of_precipitation !== undefined
        ? {total: period.details.probability_of_precipitation}
        : undefined,
      precipitation: period?.details?.precipitation_amount !== undefined
        ? {total: period.details.precipitation_amount}
        : undefined,
      uv: d.ultraviolet_index_clear_sky !== undefined
        ? {index: d.ultraviolet_index_clear_sky}
        : undefined,
    });
  }

  // Build current from the first timeseries entry
  const first = timeseries[0];
  const firstD = first.data.instant.details;
  const firstPeriod = first.data.next_1_hours ?? first.data.next_6_hours;
  const firstSymbol = firstPeriod?.summary?.symbol_code ?? '';
  const currentCode = firstSymbol ? mapSymbolToWeatherCode(firstSymbol) : WeatherCode.CLEAR;

  const current: Current = {
    weatherCode: currentCode,
    weatherText: getWeatherText(currentCode),
    isDaylight: isDaytime(new Date(first.time), latitude, longitude),
    temperature: {
      temperature: firstD.air_temperature,
    },
    wind: {
      speed: firstD.wind_speed !== undefined ? msToKmh(firstD.wind_speed) : undefined,
      direction: firstD.wind_from_direction,
      gusts: firstD.wind_speed_of_gust !== undefined ? msToKmh(firstD.wind_speed_of_gust) : undefined,
    },
    relativeHumidity: firstD.relative_humidity,
    dewPoint: firstD.dew_point_temperature,
    pressure: firstD.air_pressure_at_sea_level,
    cloudCover: firstD.cloud_area_fraction,
  };

  // Aggregate hourly data into daily buckets
  const dailyBuckets = new Map<string, {
    temps: number[];
    codes: WeatherCode[];
    texts: string[];
    precipTotal: number;
    windSpeeds: number[];
    windDirs: number[];
    windGusts: number[];
    precipProbs: number[];
    uvMax: number;
    date: Date;
  }>();

  for (const h of hourlyForecast) {
    const key = localDateKey(h.date, timezone);
    if (!dailyBuckets.has(key)) {
      dailyBuckets.set(key, {
        temps: [],
        codes: [],
        texts: [],
        precipTotal: 0,
        windSpeeds: [],
        windDirs: [],
        windGusts: [],
        precipProbs: [],
        uvMax: 0,
        date: new Date(key),
      });
    }
    const b = dailyBuckets.get(key)!;
    if (h.temperature?.temperature !== undefined) b.temps.push(h.temperature.temperature);
    if (h.weatherCode) b.codes.push(h.weatherCode);
    if (h.weatherText) b.texts.push(h.weatherText);
    if (h.precipitation?.total) b.precipTotal += h.precipitation.total;
    if (h.wind?.speed !== undefined) b.windSpeeds.push(h.wind.speed);
    if (h.wind?.direction !== undefined) b.windDirs.push(h.wind.direction);
    if (h.wind?.gusts !== undefined) b.windGusts.push(h.wind.gusts);
    if (h.precipitationProbability?.total !== undefined) b.precipProbs.push(h.precipitationProbability.total);
    if (h.uv?.index !== undefined && h.uv.index > b.uvMax) b.uvMax = h.uv.index;
  }

  const dailyForecast: Daily[] = [];
  dailyBuckets.forEach((b, key) => {
    const maxTemp = b.temps.length ? Math.max(...b.temps) : undefined;
    const minTemp = b.temps.length ? Math.min(...b.temps) : undefined;
    // Pick the most "severe" weather code for the day summary
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
      uv: {index: b.uvMax > 0 ? b.uvMax : undefined},
      hoursOfSun: getDaylightDuration(b.date, latitude, longitude),
    });
  });

  // Sort daily by date
  dailyForecast.sort((a, b) => a.date.getTime() - b.date.getTime());

  return {
    base: {
      refreshTime: new Date(),
      mainUpdateTime: new Date(updatedAt),
    },
    current,
    dailyForecast,
    hourlyForecast,
  };
}

// Pick the most impactful weather code from a set
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

// Average angles properly (handles 350°/10° wrap)
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
