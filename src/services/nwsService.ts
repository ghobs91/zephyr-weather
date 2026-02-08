import axios from 'axios';
import {
  Weather,
  Current,
  Daily,
  Hourly,
  WeatherCode,
  MoonPhase,
  Alert,
  AlertSeverity,
} from '../types/weather';
import {getSunTimes, getDaylightDuration} from '../utils/sunCalc';

const NWS_API_BASE_URL = 'https://api.weather.gov';
const USER_AGENT = 'ZephyrWeather/1.0 (zephyrweather.app, support@zephyrweather.app)';

interface NWSPointResponse {
  properties: {
    gridId: string;
    gridX: number;
    gridY: number;
    forecast: string;
    forecastHourly: string;
    forecastGridData: string;
    observationStations: string;
    timeZone: string;
    relativeLocation: {
      properties: {
        city: string;
        state: string;
      };
    };
  };
}

interface NWSForecastPeriod {
  number: number;
  name: string;
  startTime: string;
  endTime: string;
  isDaytime: boolean;
  temperature: number;
  temperatureUnit: string;
  windSpeed: string;
  windDirection: string;
  icon: string;
  shortForecast: string;
  detailedForecast: string;
  probabilityOfPrecipitation?: {
    value: number;
  };
}

interface NWSForecastResponse {
  properties: {
    units: string;
    periods: NWSForecastPeriod[];
    elevation: {
      value: number;
    };
  };
}

interface NWSGridDataValue {
  validTime: string;
  value: number;
}

interface NWSGridDataResponse {
  properties: {
    temperature?: {
      values: NWSGridDataValue[];
    };
    dewpoint?: {
      values: NWSGridDataValue[];
    };
    relativeHumidity?: {
      values: NWSGridDataValue[];
    };
    apparentTemperature?: {
      values: NWSGridDataValue[];
    };
    windSpeed?: {
      values: NWSGridDataValue[];
    };
    windDirection?: {
      values: NWSGridDataValue[];
    };
    windGust?: {
      values: NWSGridDataValue[];
    };
    skyCover?: {
      values: NWSGridDataValue[];
    };
    weather?: {
      values: Array<{
        validTime: string;
        value: Array<{
          weather: string;
          intensity: string;
          coverage: string;
        }>;
      }>;
    };
    quantitativePrecipitation?: {
      values: NWSGridDataValue[];
    };
    snowfallAmount?: {
      values: NWSGridDataValue[];
    };
    probabilityOfPrecipitation?: {
      values: NWSGridDataValue[];
    };
    maxTemperature?: {
      values: NWSGridDataValue[];
    };
    minTemperature?: {
      values: NWSGridDataValue[];
    };
  };
}

interface NWSAlertsResponse {
  features: Array<{
    id: string;
    properties: {
      event: string;
      headline: string;
      description: string;
      instruction: string;
      severity: string;
      certainty: string;
      urgency: string;
      onset: string;
      expires: string;
      senderName: string;
    };
  }>;
}

function mapNWSWeatherToCode(
  shortForecast: string,
  icon: string,
  isDaytime: boolean
): WeatherCode {
  const forecast = shortForecast.toLowerCase();
  const iconUrl = icon.toLowerCase();

  // Check for thunderstorms
  if (forecast.includes('thunder') || forecast.includes('tstorm')) {
    return WeatherCode.THUNDERSTORM;
  }

  // Check for snow
  if (forecast.includes('snow')) {
    if (forecast.includes('heavy')) return WeatherCode.SNOW_HEAVY;
    if (forecast.includes('light')) return WeatherCode.SNOW_LIGHT;
    return WeatherCode.SNOW;
  }

  // Check for sleet/freezing rain
  if (
    forecast.includes('sleet') ||
    forecast.includes('freezing rain') ||
    forecast.includes('ice')
  ) {
    return WeatherCode.SLEET;
  }

  // Check for rain
  if (
    forecast.includes('rain') ||
    forecast.includes('shower') ||
    forecast.includes('drizzle')
  ) {
    if (forecast.includes('heavy')) return WeatherCode.RAIN_HEAVY;
    if (forecast.includes('light')) return WeatherCode.RAIN_LIGHT;
    return WeatherCode.RAIN;
  }

  // Check for fog
  if (forecast.includes('fog')) {
    return WeatherCode.FOG;
  }

  // Check for haze
  if (forecast.includes('haze')) {
    return WeatherCode.HAZE;
  }

  // Check cloud coverage
  if (
    forecast.includes('clear') ||
    forecast.includes('sunny') ||
    iconUrl.includes('skc') ||
    iconUrl.includes('few')
  ) {
    return WeatherCode.CLEAR;
  }

  if (
    forecast.includes('partly') ||
    forecast.includes('scattered') ||
    iconUrl.includes('sct')
  ) {
    return WeatherCode.PARTLY_CLOUDY;
  }

  if (
    forecast.includes('mostly cloudy') ||
    forecast.includes('cloudy') ||
    forecast.includes('overcast') ||
    iconUrl.includes('bkn') ||
    iconUrl.includes('ovc')
  ) {
    return WeatherCode.CLOUDY;
  }

  // Default
  return WeatherCode.CLEAR;
}

function parseWindSpeed(windSpeed: string): number {
  // Wind speed format: "13 mph" or "7 to 15 mph"
  const match = windSpeed.match(/(\d+)(\s+to\s+(\d+))?\s*mph/i);
  if (match) {
    const min = parseInt(match[1], 10);
    const max = match[3] ? parseInt(match[3], 10) : min;
    return (min + max) / 2;
  }
  return 0;
}

function parseWindDirection(direction: string): number {
  // Convert cardinal directions to degrees
  const directions: {[key: string]: number} = {
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
  return directions[direction.toUpperCase()] ?? 0;
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

function fahrenheitToCelsius(fahrenheit: number): number {
  return ((fahrenheit - 32) * 5) / 9;
}

function mphToKmh(mph: number): number {
  return mph * 1.60934;
}

function mapNWSAlertSeverity(severity: string): AlertSeverity {
  switch (severity.toLowerCase()) {
    case 'extreme':
      return AlertSeverity.EXTREME;
    case 'severe':
      return AlertSeverity.SEVERE;
    case 'moderate':
      return AlertSeverity.MODERATE;
    case 'minor':
      return AlertSeverity.MINOR;
    default:
      return AlertSeverity.UNKNOWN;
  }
}

export async function fetchNWSWeather(
  latitude: number,
  longitude: number
): Promise<Weather> {
  try {
    const headers = {
      'User-Agent': USER_AGENT,
      Accept: 'application/geo+json',
    };

    // Step 1: Get grid point
    const pointResponse = await axios.get<NWSPointResponse>(
      `${NWS_API_BASE_URL}/points/${latitude.toFixed(4)},${longitude.toFixed(4)}`,
      {headers}
    );

    const {gridId, gridX, gridY, forecast, forecastHourly, forecastGridData, timeZone} =
      pointResponse.data.properties;

    // Step 2: Fetch forecast data in parallel
    const [forecastResponse, hourlyResponse, gridDataResponse, alertsResponse] =
      await Promise.all([
        axios.get<NWSForecastResponse>(forecast, {headers}),
        axios.get<NWSForecastResponse>(forecastHourly, {headers}),
        axios.get<NWSGridDataResponse>(forecastGridData, {headers}).catch(() => null),
        axios.get<NWSAlertsResponse>(
          `${NWS_API_BASE_URL}/alerts/active?point=${latitude},${longitude}`,
          {headers}
        ).catch(() => ({data: {features: []}})), // Alerts may not always be available
      ]);

    const periods = forecastResponse.data.properties.periods;
    const hourlyPeriods = hourlyResponse.data.properties.periods;

    // Get current humidity from grid data
    let currentHumidity: number | undefined;
    if (gridDataResponse?.data?.properties?.relativeHumidity?.values?.[0]) {
      currentHumidity = gridDataResponse.data.properties.relativeHumidity.values[0].value;
    }

    // Build current weather from the first period
    const currentPeriod = hourlyPeriods[0];
    const current: Current | undefined = currentPeriod
      ? {
          weatherCode: mapNWSWeatherToCode(
            currentPeriod.shortForecast,
            currentPeriod.icon,
            currentPeriod.isDaytime
          ),
          weatherText: currentPeriod.shortForecast,
          temperature: {
            temperature:
              currentPeriod.temperatureUnit === 'F'
                ? fahrenheitToCelsius(currentPeriod.temperature)
                : currentPeriod.temperature,
          },
          wind: {
            speed: mphToKmh(parseWindSpeed(currentPeriod.windSpeed)),
            direction: parseWindDirection(currentPeriod.windDirection),
          },
          relativeHumidity: currentHumidity,
        }
      : undefined;

    // Build daily forecast
    // NWS provides day/night periods, so we need to group them
    const dailyForecast: Daily[] = [];
    const dailyMap = new Map<string, Partial<Daily>>();

    for (const period of periods) {
      const date = new Date(period.startTime);
      const dateKey = date.toISOString().split('T')[0];

      if (!dailyMap.has(dateKey)) {
        const dateObj = new Date(dateKey);
        const sunTimes = getSunTimes(dateObj, latitude, longitude);
        
        dailyMap.set(dateKey, {
          date: dateObj,
          moon: {
            phase: calculateMoonPhase(dateObj),
          },
          sun: {
            riseTime: sunTimes.sunrise,
            setTime: sunTimes.sunset,
          },
          hoursOfSun: getDaylightDuration(dateObj, latitude, longitude),
        });
      }

      const daily = dailyMap.get(dateKey)!;
      const tempC =
        period.temperatureUnit === 'F'
          ? fahrenheitToCelsius(period.temperature)
          : period.temperature;

      if (period.isDaytime) {
        daily.day = {
          weatherCode: mapNWSWeatherToCode(
            period.shortForecast,
            period.icon,
            true
          ),
          weatherText: period.shortForecast,
          temperature: {
            temperature: tempC,
          },
          wind: {
            speed: mphToKmh(parseWindSpeed(period.windSpeed)),
            direction: parseWindDirection(period.windDirection),
          },
          precipitationProbability: {
            total: period.probabilityOfPrecipitation?.value,
          },
        };
      } else {
        daily.night = {
          weatherCode: mapNWSWeatherToCode(
            period.shortForecast,
            period.icon,
            false
          ),
          weatherText: period.shortForecast,
          temperature: {
            temperature: tempC,
          },
          wind: {
            speed: mphToKmh(parseWindSpeed(period.windSpeed)),
            direction: parseWindDirection(period.windDirection),
          },
          precipitationProbability: {
            total: period.probabilityOfPrecipitation?.value,
          },
        };
      }
    }

    dailyMap.forEach((daily, key) => {
      dailyForecast.push(daily as Daily);
    });

    // Build hourly forecast
    const hourlyForecast: Hourly[] = hourlyPeriods.map((period) => {
      const date = new Date(period.startTime);
      const tempC =
        period.temperatureUnit === 'F'
          ? fahrenheitToCelsius(period.temperature)
          : period.temperature;

      return {
        date,
        isDaylight: period.isDaytime,
        weatherCode: mapNWSWeatherToCode(
          period.shortForecast,
          period.icon,
          period.isDaytime
        ),
        weatherText: period.shortForecast,
        temperature: {
          temperature: tempC,
        },
        wind: {
          speed: mphToKmh(parseWindSpeed(period.windSpeed)),
          direction: parseWindDirection(period.windDirection),
        },
        precipitationProbability: {
          total: period.probabilityOfPrecipitation?.value,
        },
      };
    });

    // Build alerts
    const alerts: Alert[] = alertsResponse.data.features.map((feature) => {
      const props = feature.properties;
      return {
        id: feature.id,
        startDate: props.onset ? new Date(props.onset) : undefined,
        endDate: props.expires ? new Date(props.expires) : undefined,
        headline: props.headline,
        description: props.description,
        instruction: props.instruction,
        source: props.senderName,
        severity: mapNWSAlertSeverity(props.severity),
      };
    });

    return {
      base: {
        refreshTime: new Date(),
        mainUpdateTime: new Date(),
      },
      current,
      dailyForecast,
      hourlyForecast,
      alerts,
    };
  } catch (error) {
    console.error('Error fetching NWS weather:', error);
    throw error;
  }
}

export async function isUSLocation(
  latitude: number,
  longitude: number
): Promise<boolean> {
  try {
    const headers = {
      'User-Agent': USER_AGENT,
      Accept: 'application/geo+json',
    };

    // Try to get a point - if it succeeds, it's a US location
    const response = await axios.get<NWSPointResponse>(
      `${NWS_API_BASE_URL}/points/${latitude.toFixed(4)},${longitude.toFixed(4)}`,
      {headers}
    );

    return response.status === 200;
  } catch (error) {
    // If the point is not found, it's not in the US
    return false;
  }
}
