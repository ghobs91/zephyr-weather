/**
 * Japan Meteorological Agency (JMA) — national forecast for Japan.
 *
 * Uses JMA's keyless public forecast JSON (`/bosai/forecast/data/forecast/`).
 * Text is Japanese-only; condition words are mapped by keyword (晴/くもり/雨/雪/雷)
 * with the numeric weather code as fallback. Office selection is a
 * nearest-representative-city heuristic over JMA's 58 forecast offices.
 * The forecast is 3-day granularity with 6-hourly precipitation probability.
 */
import axios from 'axios';
import {
  Weather,
  WeatherCode,
  Daily,
  HalfDay,
  Current,
  Hourly,
} from '../types/weather';
import {
  weatherTextFor,
  moonPhaseFor,
  isDaytimeAt,
  HourlySeriesInput,
  hourlyFromSeries,
} from './weatherMapping';
import {getSunTimes, getDaylightDuration} from '../utils/sunCalc';

const JMA_BASE = 'https://www.jma.go.jp/bosai/forecast/data/forecast';

/**
 * JMA forecast offices (codes are authoritative, from
 * `https://www.jma.go.jp/bosai/common/const/area.json`). Coordinates are the
 * office's representative city — a nearest-city heuristic, not official.
 */
const JMA_OFFICES: Array<{code: string; lat: number; lon: number}> = [
  {code: '011000', lat: 45.42, lon: 141.67}, // Wakkanai
  {code: '012000', lat: 43.77, lon: 142.37}, // Asahikawa
  {code: '013000', lat: 44.02, lon: 144.27}, // Abashiri
  {code: '014030', lat: 42.92, lon: 143.2}, // Obihiro
  {code: '014100', lat: 42.98, lon: 144.38}, // Kushiro
  {code: '015000', lat: 42.32, lon: 140.97}, // Muroran
  {code: '016000', lat: 43.06, lon: 141.35}, // Sapporo
  {code: '017000', lat: 41.77, lon: 140.73}, // Hakodate
  {code: '020000', lat: 40.82, lon: 140.74}, // Aomori
  {code: '030000', lat: 39.7, lon: 141.15}, // Morioka
  {code: '040000', lat: 38.27, lon: 140.87}, // Sendai
  {code: '050000', lat: 39.72, lon: 140.1}, // Akita
  {code: '060000', lat: 38.26, lon: 140.34}, // Yamagata
  {code: '070000', lat: 37.75, lon: 140.47}, // Fukushima
  {code: '080000', lat: 36.37, lon: 140.47}, // Mito
  {code: '090000', lat: 36.56, lon: 139.88}, // Utsunomiya
  {code: '100000', lat: 36.39, lon: 139.06}, // Maebashi
  {code: '110000', lat: 35.86, lon: 139.65}, // Saitama
  {code: '120000', lat: 35.61, lon: 140.12}, // Chiba
  {code: '130000', lat: 35.69, lon: 139.69}, // Tokyo
  {code: '140000', lat: 35.44, lon: 139.64}, // Yokohama
  {code: '150000', lat: 37.9, lon: 139.02}, // Niigata
  {code: '160000', lat: 36.7, lon: 137.21}, // Toyama
  {code: '170000', lat: 36.56, lon: 136.66}, // Kanazawa
  {code: '180000', lat: 36.06, lon: 136.22}, // Fukui
  {code: '190000', lat: 35.66, lon: 138.57}, // Kofu
  {code: '200000', lat: 36.65, lon: 138.18}, // Nagano
  {code: '210000', lat: 35.42, lon: 136.76}, // Gifu
  {code: '220000', lat: 34.98, lon: 138.38}, // Shizuoka
  {code: '230000', lat: 35.18, lon: 136.91}, // Nagoya
  {code: '240000', lat: 34.73, lon: 136.51}, // Tsu
  {code: '250000', lat: 35.0, lon: 135.87}, // Otsu
  {code: '260000', lat: 35.01, lon: 135.77}, // Kyoto
  {code: '270000', lat: 34.69, lon: 135.5}, // Osaka
  {code: '280000', lat: 34.69, lon: 135.2}, // Kobe
  {code: '290000', lat: 34.69, lon: 135.8}, // Nara
  {code: '300000', lat: 34.23, lon: 135.17}, // Wakayama
  {code: '310000', lat: 35.5, lon: 134.24}, // Tottori
  {code: '320000', lat: 35.47, lon: 133.05}, // Matsue
  {code: '330000', lat: 34.66, lon: 133.93}, // Okayama
  {code: '340000', lat: 34.4, lon: 132.46}, // Hiroshima
  {code: '350000', lat: 34.19, lon: 131.47}, // Yamaguchi
  {code: '360000', lat: 34.07, lon: 134.55}, // Tokushima
  {code: '370000', lat: 34.34, lon: 134.05}, // Takamatsu
  {code: '380000', lat: 33.84, lon: 132.77}, // Matsuyama
  {code: '390000', lat: 33.56, lon: 133.53}, // Kochi
  {code: '400000', lat: 33.59, lon: 130.4}, // Fukuoka
  {code: '410000', lat: 33.25, lon: 130.3}, // Saga
  {code: '420000', lat: 32.75, lon: 129.88}, // Nagasaki
  {code: '430000', lat: 32.8, lon: 130.71}, // Kumamoto
  {code: '440000', lat: 33.24, lon: 131.61}, // Oita
  {code: '450000', lat: 31.91, lon: 131.42}, // Miyazaki
  {code: '460040', lat: 28.38, lon: 129.49}, // Amami
  {code: '460100', lat: 31.6, lon: 130.56}, // Kagoshima
  {code: '471000', lat: 26.21, lon: 127.68}, // Naha
  {code: '472000', lat: 25.83, lon: 131.23}, // Minamidaito
  {code: '473000', lat: 24.8, lon: 125.28}, // Miyakojima
  {code: '474000', lat: 24.34, lon: 124.16}, // Ishigaki
];

function nearestOffice(
  latitude: number,
  longitude: number,
): (typeof JMA_OFFICES)[number] {
  let best = JMA_OFFICES[0];
  let bestDist = Infinity;
  for (const office of JMA_OFFICES) {
    const dLat = office.lat - latitude;
    const dLon =
      (office.lon - longitude) *
      Math.cos(((office.lat + latitude) * Math.PI) / 360);
    const dist = dLat * dLat + dLon * dLon;
    if (dist < bestDist) {
      bestDist = dist;
      best = office;
    }
  }
  return best;
}

function isHeavy(text: string): boolean {
  return text.includes('強い') || text.includes('激');
}
function isLight(text: string): boolean {
  return text.includes('弱い') || text.includes('所により');
}

/** Map JMA condition words (Japanese) and numeric codes to a WeatherCode. */
function mapJmaWeather(
  text: string | undefined,
  code: string | undefined,
): WeatherCode {
  const t = text ?? '';
  if (t.includes('雷')) return WeatherCode.THUNDERSTORM;
  if (t.includes('みぞれ')) return WeatherCode.SLEET;
  if (t.includes('雪')) {
    if (isHeavy(t)) return WeatherCode.SNOW_HEAVY;
    if (isLight(t)) return WeatherCode.SNOW_LIGHT;
    return WeatherCode.SNOW;
  }
  if (t.includes('雨')) {
    if (isHeavy(t)) return WeatherCode.RAIN_HEAVY;
    if (isLight(t)) return WeatherCode.RAIN_LIGHT;
    return WeatherCode.RAIN;
  }
  if (t.includes('霧')) return WeatherCode.FOG;
  if (t.includes('くもり') || t.includes('曇')) return WeatherCode.CLOUDY;
  if (t.includes('晴')) return WeatherCode.CLEAR;

  const digit = code?.[0];
  if (digit === '1') return WeatherCode.CLEAR;
  if (digit === '2') return WeatherCode.CLOUDY;
  if (digit === '3') return WeatherCode.RAIN;
  if (digit === '4' || digit === '5') return WeatherCode.SNOW;
  return WeatherCode.CLEAR;
}

interface JmaArea {
  area: {name: string; code: string};
  weatherCodes?: string[];
  weathers?: string[];
  pops?: string[];
  temps?: string[];
}

interface JmaTimeSeries {
  timeDefines: string[];
  areas: JmaArea[];
}

interface JmaReport {
  publishingOffice?: string;
  reportDatetime?: string;
  timeSeries: JmaTimeSeries[];
}

function localDateKey(date: Date, timeZone: string): string {
  return date.toLocaleDateString('en-CA', {timeZone});
}

export async function fetchJmaWeather(
  latitude: number,
  longitude: number,
  timezone: string = 'Asia/Tokyo',
): Promise<Weather> {
  const office = nearestOffice(latitude, longitude);
  const response = await axios.get<JmaReport[]>(
    `${JMA_BASE}/${office.code}.json`,
  );
  const report = response.data?.[0];
  if (!report?.timeSeries?.length) {
    throw new Error('JMA: empty forecast response');
  }

  const weatherTs = report.timeSeries[0];
  const popTs = report.timeSeries[1];
  const tempTs = report.timeSeries[2];
  const weatherArea = weatherTs?.areas?.[0];
  const popArea = popTs?.areas?.[0];
  const tempArea = tempTs?.areas?.[0];

  // Precipitation probability bucketed to the local day's maximum.
  const popByDate = new Map<string, number>();
  if (popArea?.pops && popTs?.timeDefines) {
    popTs.timeDefines.forEach((time, index) => {
      const value = Number(popArea.pops?.[index]);
      if (Number.isNaN(value)) return;
      const key = localDateKey(new Date(time), timezone);
      popByDate.set(key, Math.max(popByDate.get(key) ?? 0, value));
    });
  }

  // Daily min/max: JMA publishes [minimum, maximum] for the day.
  const tempByDate = new Map<string, {min?: number; max?: number}>();
  if (tempArea?.temps && tempTs?.timeDefines?.[0]) {
    const key = localDateKey(new Date(tempTs.timeDefines[0]), timezone);
    tempByDate.set(key, {
      min: Number(tempArea.temps[0]),
      max: Number(tempArea.temps[1]),
    });
  }

  const dailyForecast: Daily[] = (weatherTs?.timeDefines ?? []).map(
    (time, index) => {
      const date = new Date(time);
      const key = localDateKey(date, timezone);
      const code = mapJmaWeather(
        weatherArea?.weathers?.[index],
        weatherArea?.weatherCodes?.[index],
      );
      const temps = tempByDate.get(key);
      const pop = popByDate.get(key);
      const sun = getSunTimes(date, latitude, longitude);

      const day: HalfDay = {
        weatherCode: code,
        weatherText: weatherTextFor(code),
        temperature: {temperature: temps?.max},
        precipitationProbability: pop !== undefined ? {total: pop} : undefined,
      };
      const night: HalfDay = {
        temperature: {temperature: temps?.min},
      };

      return {
        date,
        day,
        night,
        sun: {riseTime: sun.sunrise, setTime: sun.sunset},
        moon: {phase: moonPhaseFor(date)},
        hoursOfSun: getDaylightDuration(date, latitude, longitude),
      };
    },
  );

  // Synthesize a sparse hourly series from the 6-hourly probabilities so the
  // ensemble and hourly UI have at least one point per period.
  const codeByDate = new Map<string, WeatherCode>();
  dailyForecast.forEach((d) =>
    codeByDate.set(
      localDateKey(d.date, timezone),
      d.day?.weatherCode ?? WeatherCode.CLEAR,
    ),
  );
  const hourlyRows: HourlySeriesInput[] = (popTs?.timeDefines ?? [])
    .map((time, index): HourlySeriesInput | null => {
      const date = new Date(time);
      const pop = Number(popArea?.pops?.[index]);
      if (Number.isNaN(date.getTime())) return null;
      return {
        date,
        weatherCode:
          codeByDate.get(localDateKey(date, timezone)) ?? WeatherCode.CLEAR,
        precipitationProbability: Number.isNaN(pop) ? undefined : pop,
      };
    })
    .filter((row): row is HourlySeriesInput => row !== null);

  const hourly: Hourly[] = hourlyFromSeries(hourlyRows, latitude, longitude);

  const firstDay = dailyForecast[0]?.day;
  const current: Current | undefined = firstDay
    ? {
        weatherCode: firstDay.weatherCode,
        weatherText: firstDay.weatherText,
        isDaylight: isDaytimeAt(new Date(), latitude, longitude),
        temperature: firstDay.temperature,
      }
    : undefined;

  const updatedAt = report.reportDatetime
    ? new Date(report.reportDatetime)
    : new Date();

  return {
    base: {refreshTime: new Date(), mainUpdateTime: updatedAt},
    current,
    hourlyForecast: hourly,
    dailyForecast,
  };
}
