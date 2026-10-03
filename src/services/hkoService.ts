/**
 * Hong Kong — Hong Kong Observatory (HKO) open data.
 *
 * Official, keyless. Uses the 9-day forecast (`fnd`) for daily, current
 * readings (`rhrread`) for temperature/humidity/UV, and the warning summary
 * (`warnsum`) for alerts. HKO publishes no hourly point forecast, so the
 * hourly series is left empty.
 * https://data.weather.gov.hk/weatherAPI/doc/HKO_Open_Data_API_Documentation.pdf
 */
import axios from 'axios';
import {
  Weather,
  Daily,
  HalfDay,
  Current,
  Alert,
  AlertSeverity,
} from '../types/weather';
import {mapConditionText, weatherTextFor, moonPhaseFor} from './weatherMapping';
import {getSunTimes, getDaylightDuration} from '../utils/sunCalc';

const HKO_API = 'https://data.weather.gov.hk/weatherAPI/opendata/weather.php';

interface HkoForecastDay {
  forecastDate: string; // YYYYMMDD
  forecastWeather?: string;
  forecastMaxtemp?: {value?: number};
  forecastMintemp?: {value?: number};
  forecastMaxrh?: {value?: number};
  forecastMinrh?: {value?: number};
  ForecastIcon?: number;
}

interface HkoReading {
  place?: string;
  value?: number;
}

interface HkoWarningSummary {
  name?: string;
  code?: string;
  type?: string;
  actionCode?: string;
  issueTime?: string;
  expireTime?: string;
}

function mapWarningSeverity(code: string, type?: string): AlertSeverity {
  const t = `${code} ${type ?? ''}`.toLowerCase();
  if (t.includes('red') || t.includes('black') || t.includes('10')) {
    return AlertSeverity.EXTREME;
  }
  if (t.includes('amber') || t.includes('8')) return AlertSeverity.SEVERE;
  return AlertSeverity.MODERATE;
}

function buildAlerts(
  warnings: Record<string, HkoWarningSummary> | undefined,
): Alert[] {
  if (!warnings) return [];
  const alerts: Alert[] = [];
  for (const [key, warning] of Object.entries(warnings)) {
    if (warning?.actionCode === 'CANCEL') continue;
    const code = warning.code ?? key;
    const name = warning.name ?? code;
    alerts.push({
      id: `hko-${code}`,
      headline: warning.type ? `${name} (${warning.type})` : name,
      severity: mapWarningSeverity(code, warning.type),
      startDate: warning.issueTime ? new Date(warning.issueTime) : undefined,
      endDate: warning.expireTime ? new Date(warning.expireTime) : undefined,
      source: 'Hong Kong Observatory',
    });
  }
  return alerts;
}

function pickReading(
  readings: HkoReading[] | undefined,
  place: string,
): number | undefined {
  if (!readings?.length) return undefined;
  const match = readings.find((r) => r.place === place);
  return (match ?? readings[0]).value;
}

export async function fetchHkoWeather(
  latitude: number,
  longitude: number,
  _timezone: string = 'Asia/Hong_Kong',
): Promise<Weather | null> {
  const [fndRes, currentRes, warnRes] = await Promise.all([
    axios.get<{weatherForecast?: HkoForecastDay[]; updateTime?: string}>(
      `${HKO_API}?dataType=fnd&lang=en`,
    ),
    axios.get<{
      temperature?: {data?: HkoReading[]};
      humidity?: {value?: number};
      uvindex?: {data?: HkoReading[]};
    }>(`${HKO_API}?dataType=rhrread&lang=en`),
    axios
      .get<
        Record<string, HkoWarningSummary>
      >(`${HKO_API}?dataType=warnsum&lang=en`)
      .catch(() => null),
  ]);

  const days = fndRes.data.weatherForecast ?? [];
  if (!days.length) return null;

  const dailyForecast: Daily[] = days.map((day) => {
    const year = Number(day.forecastDate.slice(0, 4));
    const month = Number(day.forecastDate.slice(4, 6));
    const dayOfMonth = Number(day.forecastDate.slice(6, 8));
    const date = new Date(Date.UTC(year, month - 1, dayOfMonth, 4, 0, 0));
    const code = mapConditionText(day.forecastWeather);
    const sun = getSunTimes(date, latitude, longitude);
    const dayPart: HalfDay = {
      weatherCode: code,
      weatherText: weatherTextFor(code),
      temperature: {temperature: day.forecastMaxtemp?.value},
    };
    const nightPart: HalfDay = {
      temperature: {temperature: day.forecastMintemp?.value},
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

  const current = currentRes.data;
  const temperature = pickReading(
    current.temperature?.data,
    'Hong Kong Observatory',
  );
  const uvIndex = pickReading(current.uvindex?.data, 'Hong Kong Observatory');
  const todayCode = dailyForecast[0]?.day?.weatherCode;
  const currentConditions: Current | undefined =
    temperature !== undefined || todayCode !== undefined
      ? {
          weatherCode: todayCode,
          weatherText: dailyForecast[0]?.day?.weatherText,
          temperature: {temperature},
          relativeHumidity: current.humidity?.value,
          uv: uvIndex !== undefined ? {index: uvIndex} : undefined,
        }
      : undefined;

  const alerts = buildAlerts(warnRes?.data);

  return {
    base: {
      refreshTime: new Date(),
      mainUpdateTime: fndRes.data.updateTime
        ? new Date(fndRes.data.updateTime)
        : new Date(),
      alertsUpdateTime: alerts.length ? new Date() : undefined,
    },
    current: currentConditions,
    hourlyForecast: [],
    dailyForecast,
    alerts: alerts.length ? alerts : undefined,
  };
}
