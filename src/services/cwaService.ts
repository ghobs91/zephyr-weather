/**
 * Taiwan Central Weather Administration (CWA) — national forecast for Taiwan.
 *
 * UNVERIFIED: uses the open-data "F-C0032-001" (36-hour forecast by county)
 * dataset with a nearest-county lookup. Confirm element names/values against a
 * live response once CWA_API_KEY is set; unknown data degrades to null.
 * https://opendata.cwa.gov.tw/
 */
import axios from 'axios';
import {Weather, WeatherCode, Daily, HalfDay, Current} from '../types/weather';
import {apiKeys, hasApiKey} from '../config/apiKeys';
import {weatherTextFor, moonPhaseFor} from './weatherMapping';
import {getSunTimes, getDaylightDuration} from '../utils/sunCalc';

const CWA_URL = 'https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-C0032-001';

/** CWA forecast locations (counties/cities) with representative coordinates. */
const CWA_LOCATIONS: Array<{name: string; lat: number; lon: number}> = [
  {name: '臺北市', lat: 25.03, lon: 121.57},
  {name: '新北市', lat: 25.01, lon: 121.46},
  {name: '桃園市', lat: 24.99, lon: 121.3},
  {name: '臺中市', lat: 24.15, lon: 120.68},
  {name: '臺南市', lat: 22.99, lon: 120.2},
  {name: '高雄市', lat: 22.63, lon: 120.3},
  {name: '基隆市', lat: 25.13, lon: 121.74},
  {name: '新竹市', lat: 24.8, lon: 120.97},
  {name: '新竹縣', lat: 24.83, lon: 121.01},
  {name: '苗栗縣', lat: 24.56, lon: 120.82},
  {name: '彰化縣', lat: 24.08, lon: 120.54},
  {name: '南投縣', lat: 23.91, lon: 120.69},
  {name: '雲林縣', lat: 23.71, lon: 120.43},
  {name: '嘉義市', lat: 23.48, lon: 120.45},
  {name: '嘉義縣', lat: 23.46, lon: 120.33},
  {name: '屏東縣', lat: 22.67, lon: 120.49},
  {name: '宜蘭縣', lat: 24.75, lon: 121.75},
  {name: '花蓮縣', lat: 23.98, lon: 121.6},
  {name: '臺東縣', lat: 22.76, lon: 121.14},
  {name: '澎湖縣', lat: 23.57, lon: 119.58},
  {name: '金門縣', lat: 24.44, lon: 118.32},
  {name: '連江縣', lat: 26.16, lon: 119.95},
];

function nearestLocation(lat: number, lon: number): string {
  let best = CWA_LOCATIONS[0];
  let bestDist = Infinity;
  for (const loc of CWA_LOCATIONS) {
    const dLat = loc.lat - lat;
    const dLon = (loc.lon - lon) * Math.cos(((loc.lat + lat) * Math.PI) / 360);
    const dist = dLat * dLat + dLon * dLon;
    if (dist < bestDist) {
      bestDist = dist;
      best = loc;
    }
  }
  return best.name;
}

function mapCwaText(text: string | undefined): WeatherCode {
  if (!text) return WeatherCode.CLEAR;
  if (text.includes('雷')) return WeatherCode.THUNDERSTORM;
  if (text.includes('雪')) return WeatherCode.SNOW;
  if (text.includes('雨')) {
    if (/大|豪|強/.test(text)) return WeatherCode.RAIN_HEAVY;
    if (/小|短暫/.test(text)) return WeatherCode.RAIN_LIGHT;
    return WeatherCode.RAIN;
  }
  if (text.includes('霧')) return WeatherCode.FOG;
  if (text.includes('陰') || text.includes('多雲')) return WeatherCode.CLOUDY;
  if (text.includes('晴')) return WeatherCode.CLEAR;
  return WeatherCode.CLEAR;
}

interface CwaTime {
  startTime: string;
  endTime: string;
  parameter: {parameterName: string; parameterValue?: string};
}
interface CwaElement {
  elementName: string;
  time: CwaTime[];
}

function localDateKey(date: Date, timeZone: string): string {
  return date.toLocaleDateString('en-CA', {timeZone});
}

export async function fetchCwaWeather(
  latitude: number,
  longitude: number,
  timezone: string = 'Asia/Taipei',
): Promise<Weather | null> {
  if (!hasApiKey('cwa')) return null;

  const locationName = nearestLocation(latitude, longitude);
  const response = await axios.get<{
    records?: {location?: Array<{weatherElement?: CwaElement[]}>};
  }>(CWA_URL, {
    params: {Authorization: `CWA-${apiKeys.cwa}`, locationName},
  });

  const elements = response.data?.records?.location?.[0]?.weatherElement ?? [];
  if (!elements.length) return null;

  const byName = new Map(elements.map((el) => [el.elementName, el]));
  const wx = byName.get('Wx')?.time ?? [];
  const minT = byName.get('MinT')?.time ?? [];
  const maxT = byName.get('MaxT')?.time ?? [];
  const pop = byName.get('PoP')?.time ?? [];

  const buckets = new Map<
    string,
    {date: Date; code?: WeatherCode; min?: number; max?: number; pop?: number}
  >();

  wx.forEach((slot, index) => {
    const date = new Date(slot.startTime);
    const key = localDateKey(date, timezone);
    const entry = buckets.get(key) ?? {date};
    entry.code = mapCwaText(slot.parameter?.parameterValue);
    entry.min = Number(minT[index]?.parameter?.parameterValue);
    entry.max = Number(maxT[index]?.parameter?.parameterValue);
    entry.pop = Number(pop[index]?.parameter?.parameterValue);
    buckets.set(key, entry);
  });

  const dailyForecast: Daily[] = Array.from(buckets.values())
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map((entry) => {
      const code = entry.code ?? WeatherCode.CLEAR;
      const sun = getSunTimes(entry.date, latitude, longitude);
      const day: HalfDay = {
        weatherCode: code,
        weatherText: weatherTextFor(code),
        temperature: {
          temperature: Number.isNaN(entry.max) ? undefined : entry.max,
        },
        precipitationProbability: Number.isNaN(entry.pop)
          ? undefined
          : {total: entry.pop},
      };
      const night: HalfDay = {
        temperature: {
          temperature: Number.isNaN(entry.min) ? undefined : entry.min,
        },
      };
      return {
        date: entry.date,
        day,
        night,
        sun: {riseTime: sun.sunrise, setTime: sun.sunset},
        moon: {phase: moonPhaseFor(entry.date)},
        hoursOfSun: getDaylightDuration(entry.date, latitude, longitude),
      };
    });

  if (!dailyForecast.length) return null;

  const firstDay = dailyForecast[0].day;
  const current: Current | undefined = firstDay
    ? {
        weatherCode: firstDay.weatherCode,
        weatherText: firstDay.weatherText,
        temperature: firstDay.temperature,
      }
    : undefined;

  return {
    base: {refreshTime: new Date(), mainUpdateTime: new Date()},
    current,
    hourlyForecast: [],
    dailyForecast,
  };
}
