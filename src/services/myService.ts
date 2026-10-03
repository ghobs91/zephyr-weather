/**
 * Malaysia — Malaysian Meteorological Department (MetMalaysia) via data.gov.my.
 *
 * Official, keyless. The forecast dataset is a 7-day district forecast with no
 * coordinates, so the location name is matched against `location_name` and the
 * request is filtered server-side. Malay condition words are mapped locally.
 * https://developer.data.gov.my/
 */
import axios from 'axios';
import {Weather, Daily, HalfDay, Current, WeatherCode} from '../types/weather';
import {weatherTextFor, moonPhaseFor} from './weatherMapping';
import {getSunTimes, getDaylightDuration} from '../utils/sunCalc';

const MY_FORECAST = 'https://api.data.gov.my/weather/forecast';

interface MyForecastRow {
  location?: {location_id?: string; location_name?: string};
  date?: string;
  summary_forecast?: string;
  summary_when?: string;
  morning_forecast?: string;
  afternoon_forecast?: string;
  night_forecast?: string;
  min_temp?: number;
  max_temp?: number;
}

/** Malay condition words used by MetMalaysia. */
function mapMalayCondition(text: string | undefined): WeatherCode {
  if (!text) return WeatherCode.CLEAR;
  const t = text.toLowerCase();
  if (t.includes('ribut petir')) return WeatherCode.THUNDERSTORM;
  if (t.includes('tiada hujan')) return WeatherCode.CLEAR;
  if (t.includes('hujan lebat')) return WeatherCode.RAIN_HEAVY;
  if (t.includes('hujan')) return WeatherCode.RAIN;
  if (t.includes('gerimis')) return WeatherCode.RAIN_LIGHT;
  if (t.includes('mendung')) return WeatherCode.CLOUDY;
  if (t.includes('berawan')) return WeatherCode.PARTLY_CLOUDY;
  if (t.includes('cerah')) return WeatherCode.CLEAR;
  return WeatherCode.CLEAR;
}

export async function fetchMyWeather(
  latitude: number,
  longitude: number,
  _timezone: string = 'Asia/Kuala_Lumpur',
  locationName?: string,
): Promise<Weather | null> {
  // No coordinates in the dataset — without a name we cannot resolve a district.
  if (!locationName) return null;

  const response = await axios.get<MyForecastRow[]>(MY_FORECAST, {
    params: {location_name: locationName, limit: 100},
  });

  const rows = (response.data ?? [])
    .filter((row) => row.date && row.location?.location_name)
    .sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''));
  if (!rows.length) return null;

  const dailyForecast: Daily[] = rows.map((row) => {
    const date = new Date(`${row.date}T12:00:00+08:00`);
    const code = mapMalayCondition(row.summary_forecast);
    const sun = getSunTimes(date, latitude, longitude);
    const dayPart: HalfDay = {
      weatherCode: code,
      weatherText: weatherTextFor(code),
      temperature: {temperature: row.max_temp},
    };
    const nightPart: HalfDay = {
      temperature: {temperature: row.min_temp},
    };
    return {
      date,
      day: dayPart,
      night: nightPart,
      sun: {riseTime: sun.sunrise, setTime: sun.sunset},
      moon: {phase: moonPhaseFor(date)},
      hoursOfSun: getDaylightDuration(date, latitude, longitude),
    };
  });

  const today = dailyForecast[0]?.day;
  const current: Current | undefined = today
    ? {
        weatherCode: today.weatherCode,
        weatherText: today.weatherText,
        temperature: today.temperature,
      }
    : undefined;

  return {
    base: {refreshTime: new Date(), mainUpdateTime: new Date()},
    current,
    hourlyForecast: [],
    dailyForecast,
  };
}
