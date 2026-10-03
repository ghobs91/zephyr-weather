/**
 * Korea Meteorological Administration (KMA) — national forecast for Korea.
 *
 * UNVERIFIED: uses the data.go.kr "단기예보" (short-range village forecast)
 * service. Confirm the response categories and base-time rounding against a
 * live response once KMA_API_KEY is set; unknown data degrades to null.
 * https://www.data.go.kr/data/15084084/openapi.do
 */
import axios from 'axios';
import {Weather, WeatherCode} from '../types/weather';
import {apiKeys, hasApiKey} from '../config/apiKeys';
import {
  hourlyFromSeries,
  weatherFromHourly,
  HourlySeriesInput,
} from './weatherMapping';

const KMA_URL =
  'https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst';

// KMA Lambert conformal cone grid (DFS) constants.
const RE = 6371.00877;
const GRID = 5.0;
const SLAT1 = 30.0;
const SLAT2 = 60.0;
const OLON = 126.0;
const OLAT = 38.0;
const XO = 43;
const YO = 136;

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180.0;
}

/** lat/lon → KMA grid (nx, ny) via the standard DFS conversion. */
function latLonToGrid(lat: number, lon: number): {nx: number; ny: number} {
  const re = RE / GRID;
  const slat1 = toRadians(SLAT1);
  const slat2 = toRadians(SLAT2);
  const olat = toRadians(OLAT);

  let sn =
    Math.tan(Math.PI * 0.25 + slat2 * 0.5) /
    Math.tan(Math.PI * 0.25 + slat1 * 0.5);
  sn = Math.log(Math.cos(slat1) / Math.cos(slat2)) / Math.log(sn);
  let sf = Math.tan(Math.PI * 0.25 + slat1 * 0.5);
  sf = (Math.pow(sf, sn) * Math.cos(slat1)) / sn;
  let ro = Math.tan(Math.PI * 0.25 + olat * 0.5);
  ro = (re * sf) / Math.pow(ro, sn);

  let ra = Math.tan(Math.PI * 0.25 + toRadians(lat) * 0.5);
  ra = (re * sf) / Math.pow(ra, sn);
  let theta = lon - OLON;
  if (theta > 180) theta -= 360;
  if (theta < -180) theta += 360;
  theta *= sn;

  return {
    nx: Math.floor(ra * Math.sin(theta) + XO + 0.5),
    ny: Math.floor(ro - ra * Math.cos(theta) + YO + 0.5),
  };
}

/** Latest published KMA base date/time (KST), accounting for ~10 min latency. */
function latestBase(now: Date = new Date()): {date: string; time: string} {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now);
  const get = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? '00';
  const minutes = Number(get('hour')) * 60 + Number(get('minute'));
  const baseTimes = [2, 5, 8, 11, 14, 17, 20, 23];
  let available = baseTimes.filter((h) => minutes >= h * 60 + 10);
  let dayOffset = 0;
  let hour: number;
  if (available.length) {
    hour = available[available.length - 1];
  } else {
    hour = 23;
    dayOffset = -1;
  }
  const date = new Date(
    `${get('year')}-${get('month')}-${get('day')}T00:00:00+09:00`,
  );
  date.setDate(date.getDate() + dayOffset);
  const ymd = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
  }).format(date);
  return {
    date: ymd.replace(/-/g, ''),
    time: `${String(hour).padStart(2, '0')}00`,
  };
}

function mapSky(pty: string, sky: string): WeatherCode {
  if (pty === '1' || pty === '4') return WeatherCode.RAIN;
  if (pty === '2') return WeatherCode.SLEET;
  if (pty === '3') return WeatherCode.SNOW;
  if (sky === '1') return WeatherCode.CLEAR;
  if (sky === '3') return WeatherCode.PARTLY_CLOUDY;
  if (sky === '4') return WeatherCode.CLOUDY;
  return WeatherCode.CLEAR;
}

interface KmaItem {
  category: string;
  fcstDate: string;
  fcstTime: string;
  fcstValue: string;
}

export async function fetchKmaWeather(
  latitude: number,
  longitude: number,
  timezone: string = 'Asia/Seoul',
): Promise<Weather | null> {
  if (!hasApiKey('kma')) return null;

  const {nx, ny} = latLonToGrid(latitude, longitude);
  const base = latestBase();

  const response = await axios.get<{
    response?: {body?: {items?: {item?: KmaItem[]}}};
  }>(KMA_URL, {
    params: {
      serviceKey: apiKeys.kma,
      pageNo: 1,
      numOfRows: 1000,
      dataType: 'JSON',
      base_date: base.date,
      base_time: base.time,
      nx,
      ny,
    },
  });

  const items = response.data?.response?.body?.items?.item ?? [];
  if (!items.length) return null;

  const buckets = new Map<string, Record<string, string>>();
  for (const item of items) {
    const key = `${item.fcstDate}${item.fcstTime}`;
    const bucket = buckets.get(key) ?? {};
    bucket[item.category] = item.fcstValue;
    buckets.set(key, bucket);
  }

  const rows: HourlySeriesInput[] = Array.from(buckets.entries())
    .map(([key, values]) => {
      const date = new Date(
        `${key.slice(0, 4)}-${key.slice(4, 6)}-${key.slice(6, 8)}T${key.slice(8, 10)}:${key.slice(10, 12)}:00+09:00`,
      );
      if (Number.isNaN(date.getTime())) return null;
      return {
        date,
        weatherCode: mapSky(values.PTY ?? '0', values.SKY ?? '1'),
        temperature: values.TMP !== undefined ? Number(values.TMP) : undefined,
        windSpeed:
          values.WSD !== undefined ? Number(values.WSD) * 3.6 : undefined,
        windDirection:
          values.VEC !== undefined ? Number(values.VEC) : undefined,
        relativeHumidity:
          values.REH !== undefined ? Number(values.REH) : undefined,
        precipitationProbability:
          values.POP !== undefined ? Number(values.POP) : undefined,
      } as HourlySeriesInput;
    })
    .filter((row): row is HourlySeriesInput => row !== null)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  if (!rows.length) return null;

  return weatherFromHourly({
    hourly: hourlyFromSeries(rows, latitude, longitude),
    latitude,
    longitude,
    timezone,
    updatedAt: new Date(rows[0].date),
  });
}
