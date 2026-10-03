/**
 * Finnish Meteorological Institute (FMI) — national forecast for Finland.
 *
 * Uses the keyless FMI open-data WFS (HARMONIE surface point forecast). The
 * service returns GML/XML, which React Native has no DOMParser for, so it is
 * parsed with a targeted regex over the regular `BsWfsElement` records.
 * https://en.ilmatieteenlaitos.fi/open-data-manual-fmi-wfs-services
 */
import axios from 'axios';
import {Weather, WeatherCode} from '../types/weather';
import {
  hourlyFromSeries,
  weatherFromHourly,
  HourlySeriesInput,
} from './weatherMapping';

const FMI_WFS = 'https://opendata.fmi.fi/wfs';
const STORED_QUERY = 'fmi::forecast::harmonie::surface::point::simple';
const PARAMETERS = [
  'temperature',
  'windspeedms',
  'winddirection',
  'humidity',
  'pressure',
  'precipitation1h',
  'dewpoint',
  'weathersymbol3',
  'uvindex',
].join(',');

/** FMI `weathersymbol3` is a 1–99 code; this covers the common values. */
function mapFmiSymbol(symbol: number | undefined): WeatherCode {
  if (symbol === undefined) return WeatherCode.CLEAR;
  if (symbol === 1) return WeatherCode.CLEAR;
  if (symbol === 2) return WeatherCode.PARTLY_CLOUDY;
  if (symbol <= 4) return WeatherCode.CLOUDY;
  if (symbol <= 6) return WeatherCode.FOG;
  if (symbol <= 9) {
    if (symbol === 7) return WeatherCode.RAIN_LIGHT;
    if (symbol === 9) return WeatherCode.RAIN_HEAVY;
    return WeatherCode.RAIN;
  }
  if (symbol <= 12) return WeatherCode.SLEET;
  if (symbol <= 15) return WeatherCode.THUNDERSTORM;
  if (symbol <= 18) return WeatherCode.SLEET;
  if (symbol <= 23) {
    if (symbol === 21) return WeatherCode.RAIN_LIGHT;
    if (symbol === 23) return WeatherCode.RAIN_HEAVY;
    return WeatherCode.RAIN;
  }
  if (symbol <= 26) return WeatherCode.SLEET;
  if (symbol <= 33) {
    if (symbol === 31) return WeatherCode.SNOW_LIGHT;
    if (symbol === 33) return WeatherCode.SNOW_HEAVY;
    return WeatherCode.SNOW;
  }
  if (symbol <= 45) return WeatherCode.THUNDERSTORM;
  if (symbol <= 49) return WeatherCode.SLEET;
  if (symbol <= 65) return WeatherCode.RAIN;
  if (symbol <= 79) return WeatherCode.SNOW;
  if (symbol <= 99) return WeatherCode.THUNDERSTORM;
  return WeatherCode.CLEAR;
}

function elementText(block: string, tag: string): string | undefined {
  const match = block.match(new RegExp(`<BsWfs:${tag}>([^<]*)</BsWfs:${tag}>`));
  return match?.[1];
}

interface FmiGrouped {
  [time: string]: {[parameter: string]: number};
}

function parseFmiGml(xml: string): FmiGrouped {
  const grouped: FmiGrouped = {};
  const blocks =
    xml.match(/<BsWfs:BsWfsElement[\s\S]*?<\/BsWfs:BsWfsElement>/g) ?? [];
  for (const block of blocks) {
    const time = elementText(block, 'Time');
    const name = elementText(block, 'ParameterName');
    const raw = elementText(block, 'ParameterValue');
    if (!time || !name || raw === undefined) continue;
    const value = Number(raw);
    if (Number.isNaN(value)) continue;
    grouped[time] = grouped[time] ?? {};
    grouped[time][name] = value;
  }
  return grouped;
}

export async function fetchFmiWeather(
  latitude: number,
  longitude: number,
  timezone: string = 'Europe/Helsinki',
): Promise<Weather> {
  const url =
    `${FMI_WFS}?service=WFS&version=2.0.0&request=getFeature` +
    `&storedquery_id=${STORED_QUERY}` +
    `&latlon=${latitude.toFixed(4)},${longitude.toFixed(4)}` +
    `&parameters=${PARAMETERS}&timestep=60`;

  const response = await axios.get<string>(url, {responseType: 'text'});
  const xml = response.data;
  if (xml.includes('ExceptionReport')) {
    throw new Error('FMI: stored query rejected the request');
  }

  const grouped = parseFmiGml(xml);
  const times = Object.keys(grouped).sort();
  const rows: HourlySeriesInput[] = times.map((time) => {
    const values = grouped[time];
    return {
      date: new Date(time),
      weatherCode: mapFmiSymbol(values.weathersymbol3),
      temperature: values.temperature,
      windSpeed:
        values.windspeedms !== undefined ? values.windspeedms * 3.6 : undefined,
      windDirection: values.winddirection,
      relativeHumidity: values.humidity,
      dewPoint: values.dewpoint,
      pressure: values.pressure,
      precipitation: values.precipitation1h,
      uvIndex: values.uvindex,
    };
  });

  if (!rows.length) {
    throw new Error('FMI: empty forecast response');
  }

  const hourly = hourlyFromSeries(rows, latitude, longitude);
  return weatherFromHourly({
    hourly,
    latitude,
    longitude,
    timezone,
    updatedAt: new Date(times[0]),
  });
}
