/**
 * Environment and Climate Change Canada (ECCC) — national forecast for Canada.
 *
 * Uses the MSC GeoMet "City Page Weather" OGC API collection: official,
 * bilingual, keyless forecasts for ~800 Canadian locations, including current
 * station observations, 24 h hourly forecast and multi-day day/night periods.
 * https://eccc-msc.github.io/open-data/msc-geomet/readme_en/
 */
import axios from 'axios';
import {
  Weather,
  Current,
  Daily,
  HalfDay,
  Alert,
  AlertSeverity,
} from '../types/weather';
import {
  hourlyFromSeries,
  mapConditionText,
  weatherTextFor,
  moonPhaseFor,
  HourlySeriesInput,
} from './weatherMapping';
import {getSunTimes, getDaylightDuration} from '../utils/sunCalc';

const ECCC_BASE =
  'https://api.weather.gc.ca/collections/citypageweather-realtime/items';
const USER_AGENT =
  'ZephyrWeather/1.0 (zephyrweather.app, support@zephyrweather.app)';

interface Bilingual<T> {
  en: T;
  fr: T;
}
interface UnitValue {
  value?: Bilingual<number>;
}
interface TextValue {
  value?: Bilingual<string>;
}

interface EcccCurrent {
  condition?: TextValue;
  temperature?: UnitValue;
  dewpoint?: UnitValue;
  relativeHumidity?: UnitValue;
  pressure?: UnitValue; // kPa
  windChill?: UnitValue;
  wind?: {
    speed?: UnitValue;
    gust?: UnitValue;
    bearing?: UnitValue;
  };
  station?: TextValue;
}

interface EcccHourly {
  timestamp: string;
  condition?: TextValue;
  temperature?: UnitValue;
  dewpoint?: UnitValue;
  relativeHumidity?: UnitValue;
  pressure?: UnitValue;
  wind?: {
    speed?: UnitValue;
    gust?: UnitValue;
    bearing?: UnitValue;
  };
  lop?: UnitValue; // probability of precipitation
  uv?: {index?: UnitValue};
}

interface EcccForecastPeriod {
  period?: {textForecastName?: Bilingual<string>};
  temperatures?: {
    temperature?: Array<{class?: Bilingual<string>; value?: Bilingual<number>}>;
  };
  winds?: {
    periods?: Array<{speed?: UnitValue; bearing?: UnitValue}>;
  };
  abbreviatedForecast?: {
    icon?: {value?: number};
    textSummary?: Bilingual<string>;
  };
  textSummary?: Bilingual<string>;
}

interface EcccWarning {
  eventName?: Bilingual<string>;
  type?: Bilingual<string>;
  description?: Bilingual<string>;
}

interface EcccFeature {
  geometry?: {coordinates?: [number, number]};
  properties?: {
    identifier?: string;
    name?: Bilingual<string>;
    lastUpdated?: string;
    currentConditions?: EcccCurrent;
    hourlyForecastGroup?: {hourlyForecasts?: EcccHourly[]};
    forecastGroup?: {forecasts?: EcccForecastPeriod[]};
    warnings?: EcccWarning[];
  };
}

const COMPASS: Record<string, number> = {
  N: 0,
  NNE: 22.5,
  NE: 45,
  ENE: 67.5,
  E: 90,
  ESE: 112.5,
  SE: 135,
  SSE: 157.5,
  S: 180,
  SSW: 202.5,
  SW: 225,
  WSW: 247.5,
  W: 270,
  WNW: 292.5,
  NW: 315,
  NNW: 337.5,
};

function compassToDegrees(dir?: string): number | undefined {
  if (!dir) return undefined;
  return COMPASS[dir.trim().toUpperCase()];
}

function startOfLocalDay(timezone: string): Date {
  const ymd = new Date().toLocaleDateString('en-CA', {timeZone: timezone});
  return new Date(`${ymd}T00:00:00Z`);
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

async function findNearestStation(
  latitude: number,
  longitude: number,
): Promise<EcccFeature | null> {
  for (const span of [0.75, 2, 5]) {
    const bbox = [
      (longitude - span).toFixed(4),
      (latitude - span).toFixed(4),
      (longitude + span).toFixed(4),
      (latitude + span).toFixed(4),
    ].join(',');
    const response = await axios.get<{features?: EcccFeature[]}>(
      `${ECCC_BASE}?f=json&limit=40&bbox=${bbox}`,
      {headers: {'User-Agent': USER_AGENT}},
    );
    const features = response.data.features ?? [];
    if (features.length) {
      return features.reduce(
        (best, f) => {
          const c = f.geometry?.coordinates;
          if (!c) return best;
          const dist = (c[1] - latitude) ** 2 + (c[0] - longitude) ** 2;
          if (!best)
            return {...f, _dist: dist} as EcccFeature & {_dist: number};
          const bestDist =
            (best as EcccFeature & {_dist?: number})._dist ?? Infinity;
          return dist < bestDist
            ? ({...f, _dist: dist} as EcccFeature & {_dist: number})
            : best;
        },
        null as EcccFeature | null,
      );
    }
  }
  return null;
}

function buildDaily(
  periods: EcccForecastPeriod[],
  latitude: number,
  longitude: number,
  timezone: string,
): Daily[] {
  const start = startOfLocalDay(timezone);
  const buckets = new Map<
    number,
    {date: Date; day?: HalfDay; night?: HalfDay}
  >();

  periods.forEach((period, index) => {
    const name = period.period?.textForecastName?.en ?? '';
    const isNight = /night|tonight|evening|overnight/i.test(name);
    const dayIndex = Math.floor(index / 2);
    let bucket = buckets.get(dayIndex);
    if (!bucket) {
      const date = addDays(start, dayIndex);
      bucket = {date};
      buckets.set(dayIndex, bucket);
    }

    const code = mapConditionText(
      period.abbreviatedForecast?.textSummary?.en ?? period.textSummary?.en,
    );
    const temps = period.temperatures?.temperature ?? [];
    const high = temps.find((t) => t.class?.en === 'high')?.value?.en;
    const low = temps.find((t) => t.class?.en === 'low')?.value?.en;
    const wind = period.winds?.periods?.[0];

    const half: HalfDay = {
      weatherCode: code,
      weatherText: weatherTextFor(code),
      temperature: {temperature: isNight ? low : high},
      wind: {
        speed: wind?.speed?.value?.en,
        direction: wind?.bearing?.value?.en,
      },
    };
    if (isNight) bucket.night = half;
    else bucket.day = half;
  });

  return Array.from(buckets.values())
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map((bucket) => {
      const sun = getSunTimes(bucket.date, latitude, longitude);
      return {
        date: bucket.date,
        day: bucket.day,
        night: bucket.night,
        sun: {riseTime: sun.sunrise, setTime: sun.sunset},
        moon: {phase: moonPhaseFor(bucket.date)},
        hoursOfSun: getDaylightDuration(bucket.date, latitude, longitude),
      } as Daily;
    });
}

function mapWarnings(feature: EcccFeature): Alert[] {
  const warnings = feature.properties?.warnings ?? [];
  const identifier = feature.properties?.identifier ?? 'eccc';
  const alerts: Alert[] = [];
  warnings.forEach((warning, index) => {
    const headline =
      warning.eventName?.en ?? warning.type?.en ?? warning.description?.en;
    if (!headline) return;
    alerts.push({
      id: `${identifier}-warning-${index}`,
      headline,
      description: warning.description?.en,
      severity: AlertSeverity.MODERATE,
      source: 'ECCC',
    });
  });
  return alerts;
}

export async function fetchEcccWeather(
  latitude: number,
  longitude: number,
  timezone: string = 'America/Toronto',
): Promise<Weather> {
  const feature = await findNearestStation(latitude, longitude);
  if (!feature?.properties) {
    throw new Error('ECCC: no forecast station near this location');
  }
  const props = feature.properties;

  const hourlyRows: HourlySeriesInput[] = (
    props.hourlyForecastGroup?.hourlyForecasts ?? []
  ).map((h) => ({
    date: new Date(h.timestamp),
    weatherCode: mapConditionText(h.condition?.value?.en),
    temperature: h.temperature?.value?.en,
    windSpeed: h.wind?.speed?.value?.en,
    windDirection:
      h.wind?.bearing?.value?.en ??
      compassToDegrees(
        (h.wind as {direction?: TextValue})?.direction?.value?.en,
      ),
    windGusts: h.wind?.gust?.value?.en,
    relativeHumidity: h.relativeHumidity?.value?.en,
    dewPoint: h.dewpoint?.value?.en,
    pressure:
      h.pressure?.value?.en !== undefined
        ? h.pressure.value.en * 10
        : undefined,
    precipitationProbability: h.lop?.value?.en,
    uvIndex: h.uv?.index?.value?.en,
  }));

  const hourly = hourlyFromSeries(hourlyRows, latitude, longitude);
  const dailyForecast = buildDaily(
    props.forecastGroup?.forecasts ?? [],
    latitude,
    longitude,
    timezone,
  );

  const cc = props.currentConditions;
  const current: Current | undefined = cc
    ? {
        weatherCode: mapConditionText(cc.condition?.value?.en),
        weatherText: cc.condition?.value?.en,
        isDaylight: true,
        temperature: {
          temperature: cc.temperature?.value?.en,
          windChill: cc.windChill?.value?.en,
        },
        wind: {
          speed: cc.wind?.speed?.value?.en,
          direction: cc.wind?.bearing?.value?.en,
          gusts: cc.wind?.gust?.value?.en,
        },
        relativeHumidity: cc.relativeHumidity?.value?.en,
        dewPoint: cc.dewpoint?.value?.en,
        pressure:
          cc.pressure?.value?.en !== undefined
            ? cc.pressure.value.en * 10
            : undefined,
      }
    : undefined;

  const alerts = mapWarnings(feature);
  const updatedAt = props.lastUpdated
    ? new Date(props.lastUpdated)
    : new Date();

  return {
    base: {
      refreshTime: new Date(),
      mainUpdateTime: updatedAt,
      alertsUpdateTime: alerts.length ? updatedAt : undefined,
    },
    current,
    hourlyForecast: hourly,
    dailyForecast,
    alerts: alerts.length ? alerts : undefined,
  };
}
