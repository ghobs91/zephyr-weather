import axios from 'axios';
import {
  Weather,
  Current,
  Daily,
  Hourly,
  WeatherCode,
  MoonPhase,
  AlertSeverity,
  Alert,
} from '../types/weather';

const OPEN_METEO_BASE_URL = 'https://api.open-meteo.com/v1';
const OPEN_METEO_AIR_QUALITY_URL = 'https://air-quality-api.open-meteo.com/v1';

interface OpenMeteoForecastResponse {
  latitude: number;
  longitude: number;
  timezone: string;
  timezone_abbreviation: string;
  elevation: number;
  current?: {
    time: string;
    interval: number;
    temperature_2m?: number;
    relative_humidity_2m?: number;
    apparent_temperature?: number;
    is_day?: number;
    precipitation?: number;
    rain?: number;
    showers?: number;
    snowfall?: number;
    weather_code?: number;
    cloud_cover?: number;
    pressure_msl?: number;
    surface_pressure?: number;
    wind_speed_10m?: number;
    wind_direction_10m?: number;
    wind_gusts_10m?: number;
  };
  hourly?: {
    time: string[];
    temperature_2m?: number[];
    relative_humidity_2m?: number[];
    dew_point_2m?: number[];
    apparent_temperature?: number[];
    precipitation_probability?: number[];
    precipitation?: number[];
    rain?: number[];
    showers?: number[];
    snowfall?: number[];
    snow_depth?: number[];
    weather_code?: number[];
    pressure_msl?: number[];
    surface_pressure?: number[];
    cloud_cover?: number[];
    visibility?: number[];
    wind_speed_10m?: number[];
    wind_direction_10m?: number[];
    wind_gusts_10m?: number[];
    uv_index?: number[];
    is_day?: number[];
  };
  daily?: {
    time: string[];
    weather_code?: number[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    apparent_temperature_max?: number[];
    apparent_temperature_min?: number[];
    sunrise?: string[];
    sunset?: string[];
    daylight_duration?: number[];
    sunshine_duration?: number[];
    uv_index_max?: number[];
    precipitation_sum?: number[];
    rain_sum?: number[];
    showers_sum?: number[];
    snowfall_sum?: number[];
    precipitation_hours?: number[];
    precipitation_probability_max?: number[];
    wind_speed_10m_max?: number[];
    wind_gusts_10m_max?: number[];
    wind_direction_10m_dominant?: number[];
  };
}

interface OpenMeteoAirQualityResponse {
  latitude: number;
  longitude: number;
  hourly?: {
    time: string[];
    pm10?: number[];
    pm2_5?: number[];
    carbon_monoxide?: number[];
    nitrogen_dioxide?: number[];
    sulphur_dioxide?: number[];
    ozone?: number[];
    european_aqi?: number[];
    us_aqi?: number[];
    grass_pollen?: number[];
    birch_pollen?: number[];
    ragweed_pollen?: number[];
    olive_pollen?: number[];
  };
  current?: {
    time: string;
    pm10?: number;
    pm2_5?: number;
    carbon_monoxide?: number;
    nitrogen_dioxide?: number;
    sulphur_dioxide?: number;
    ozone?: number;
    european_aqi?: number;
    us_aqi?: number;
  };
}

function mapWeatherCode(code: number): WeatherCode {
  // WMO Weather interpretation codes
  switch (code) {
    case 0:
      return WeatherCode.CLEAR;
    case 1:
    case 2:
      return WeatherCode.PARTLY_CLOUDY;
    case 3:
      return WeatherCode.CLOUDY;
    case 45:
    case 48:
      return WeatherCode.FOG;
    case 51:
    case 53:
    case 56:
      return WeatherCode.RAIN_LIGHT;
    case 55:
    case 57:
      return WeatherCode.RAIN;
    case 61:
    case 63:
    case 66:
      return WeatherCode.RAIN;
    case 65:
    case 67:
      return WeatherCode.RAIN_HEAVY;
    case 71:
    case 73:
    case 77:
      return WeatherCode.SNOW_LIGHT;
    case 75:
      return WeatherCode.SNOW;
    case 85:
    case 86:
      return WeatherCode.SNOW_HEAVY;
    case 80:
    case 81:
    case 82:
      return WeatherCode.RAIN;
    case 95:
    case 96:
    case 99:
      return WeatherCode.THUNDERSTORM;
    default:
      return WeatherCode.CLEAR;
  }
}

function getWeatherDescription(code: WeatherCode): string {
  switch (code) {
    case WeatherCode.CLEAR:
      return 'Clear sky';
    case WeatherCode.PARTLY_CLOUDY:
      return 'Partly cloudy';
    case WeatherCode.CLOUDY:
      return 'Cloudy';
    case WeatherCode.RAIN_LIGHT:
      return 'Light rain';
    case WeatherCode.RAIN:
      return 'Rain';
    case WeatherCode.RAIN_HEAVY:
      return 'Heavy rain';
    case WeatherCode.SNOW_LIGHT:
      return 'Light snow';
    case WeatherCode.SNOW:
      return 'Snow';
    case WeatherCode.SNOW_HEAVY:
      return 'Heavy snow';
    case WeatherCode.SLEET:
      return 'Sleet';
    case WeatherCode.HAIL:
      return 'Hail';
    case WeatherCode.THUNDERSTORM:
      return 'Thunderstorm';
    case WeatherCode.FOG:
      return 'Fog';
    case WeatherCode.HAZE:
      return 'Haze';
    case WeatherCode.WIND:
      return 'Windy';
    default:
      return 'Unknown';
  }
}

function calculateMoonPhase(date: Date): MoonPhase {
  // Simple moon phase calculation
  const lunarCycle = 29.53059;
  const known = new Date(2000, 0, 6, 18, 14, 0).getTime();
  const phase = ((date.getTime() - known) / (lunarCycle * 24 * 60 * 60 * 1000)) % 1;
  
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

export async function fetchWeather(
  latitude: number,
  longitude: number,
  timezone: string = 'auto'
): Promise<Weather> {
  try {
    // Fetch weather data
    const forecastParams = new URLSearchParams({
      latitude: latitude.toString(),
      longitude: longitude.toString(),
      timezone,
      current: [
        'temperature_2m',
        'relative_humidity_2m',
        'apparent_temperature',
        'is_day',
        'precipitation',
        'rain',
        'showers',
        'snowfall',
        'weather_code',
        'cloud_cover',
        'pressure_msl',
        'surface_pressure',
        'wind_speed_10m',
        'wind_direction_10m',
        'wind_gusts_10m',
      ].join(','),
      hourly: [
        'temperature_2m',
        'relative_humidity_2m',
        'dew_point_2m',
        'apparent_temperature',
        'precipitation_probability',
        'precipitation',
        'rain',
        'showers',
        'snowfall',
        'weather_code',
        'pressure_msl',
        'cloud_cover',
        'visibility',
        'wind_speed_10m',
        'wind_direction_10m',
        'wind_gusts_10m',
        'uv_index',
        'is_day',
      ].join(','),
      daily: [
        'weather_code',
        'temperature_2m_max',
        'temperature_2m_min',
        'apparent_temperature_max',
        'apparent_temperature_min',
        'sunrise',
        'sunset',
        'daylight_duration',
        'sunshine_duration',
        'uv_index_max',
        'precipitation_sum',
        'rain_sum',
        'showers_sum',
        'snowfall_sum',
        'precipitation_hours',
        'precipitation_probability_max',
        'wind_speed_10m_max',
        'wind_gusts_10m_max',
        'wind_direction_10m_dominant',
      ].join(','),
      forecast_days: '16',
      past_days: '1',
    });

    const [forecastResponse, airQualityResponse] = await Promise.all([
      axios.get<OpenMeteoForecastResponse>(
        `${OPEN_METEO_BASE_URL}/forecast?${forecastParams}`
      ),
      axios.get<OpenMeteoAirQualityResponse>(
        `${OPEN_METEO_AIR_QUALITY_URL}/air-quality?latitude=${latitude}&longitude=${longitude}&current=pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,european_aqi,us_aqi&hourly=pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,european_aqi,us_aqi,grass_pollen,birch_pollen,ragweed_pollen,olive_pollen&timezone=${timezone}`
      ),
    ]);

    const forecast = forecastResponse.data;
    const airQuality = airQualityResponse.data;

    // Build current weather
    const current: Current | undefined = forecast.current
      ? {
          weatherCode: forecast.current.weather_code !== undefined
            ? mapWeatherCode(forecast.current.weather_code)
            : undefined,
          weatherText: forecast.current.weather_code !== undefined
            ? getWeatherDescription(mapWeatherCode(forecast.current.weather_code))
            : undefined,
          temperature: {
            temperature: forecast.current.temperature_2m,
            apparent: forecast.current.apparent_temperature,
          },
          wind: {
            speed: forecast.current.wind_speed_10m,
            direction: forecast.current.wind_direction_10m,
            gusts: forecast.current.wind_gusts_10m,
          },
          relativeHumidity: forecast.current.relative_humidity_2m,
          pressure: forecast.current.pressure_msl,
          cloudCover: forecast.current.cloud_cover,
          airQuality: airQuality.current
            ? {
                pm25: airQuality.current.pm2_5,
                pm10: airQuality.current.pm10,
                o3: airQuality.current.ozone,
                no2: airQuality.current.nitrogen_dioxide,
                so2: airQuality.current.sulphur_dioxide,
                co: airQuality.current.carbon_monoxide,
                aqi: airQuality.current.us_aqi ?? airQuality.current.european_aqi,
              }
            : undefined,
        }
      : undefined;

    // Build daily forecast
    const dailyForecast: Daily[] = forecast.daily?.time.map((time, index) => {
      const date = new Date(time);
      const weatherCode = forecast.daily?.weather_code?.[index];
      
      return {
        date,
        day: {
          weatherCode: weatherCode !== undefined ? mapWeatherCode(weatherCode) : undefined,
          weatherText: weatherCode !== undefined
            ? getWeatherDescription(mapWeatherCode(weatherCode))
            : undefined,
          temperature: {
            temperature: forecast.daily?.temperature_2m_max?.[index],
            apparent: forecast.daily?.apparent_temperature_max?.[index],
          },
          precipitation: {
            total: forecast.daily?.precipitation_sum?.[index],
            rain: forecast.daily?.rain_sum?.[index],
            snow: forecast.daily?.snowfall_sum?.[index],
          },
          precipitationProbability: {
            total: forecast.daily?.precipitation_probability_max?.[index],
          },
          wind: {
            speed: forecast.daily?.wind_speed_10m_max?.[index],
            gusts: forecast.daily?.wind_gusts_10m_max?.[index],
            direction: forecast.daily?.wind_direction_10m_dominant?.[index],
          },
        },
        night: {
          temperature: {
            temperature: forecast.daily?.temperature_2m_min?.[index],
            apparent: forecast.daily?.apparent_temperature_min?.[index],
          },
        },
        sun: {
          riseTime: forecast.daily?.sunrise?.[index]
            ? new Date(forecast.daily.sunrise[index])
            : undefined,
          setTime: forecast.daily?.sunset?.[index]
            ? new Date(forecast.daily.sunset[index])
            : undefined,
        },
        moon: {
          phase: calculateMoonPhase(date),
        },
        uv: {
          index: forecast.daily?.uv_index_max?.[index],
        },
        hoursOfSun: forecast.daily?.sunshine_duration?.[index]
          ? forecast.daily.sunshine_duration[index] / 3600
          : undefined,
      };
    }) ?? [];

    // Build hourly forecast
    const hourlyForecast: Hourly[] = forecast.hourly?.time.map((time, index) => {
      const date = new Date(time);
      const weatherCode = forecast.hourly?.weather_code?.[index];
      
      // Find matching air quality data
      const aqIndex = airQuality.hourly?.time.findIndex(t => t === time);
      
      return {
        date,
        isDaylight: forecast.hourly?.is_day?.[index] === 1,
        weatherCode: weatherCode !== undefined ? mapWeatherCode(weatherCode) : undefined,
        weatherText: weatherCode !== undefined
          ? getWeatherDescription(mapWeatherCode(weatherCode))
          : undefined,
        temperature: {
          temperature: forecast.hourly?.temperature_2m?.[index],
          apparent: forecast.hourly?.apparent_temperature?.[index],
        },
        precipitation: {
          total: forecast.hourly?.precipitation?.[index],
          rain: forecast.hourly?.rain?.[index],
          snow: forecast.hourly?.snowfall?.[index],
        },
        precipitationProbability: {
          total: forecast.hourly?.precipitation_probability?.[index],
        },
        wind: {
          speed: forecast.hourly?.wind_speed_10m?.[index],
          gusts: forecast.hourly?.wind_gusts_10m?.[index],
          direction: forecast.hourly?.wind_direction_10m?.[index],
        },
        uv: {
          index: forecast.hourly?.uv_index?.[index],
        },
        relativeHumidity: forecast.hourly?.relative_humidity_2m?.[index],
        dewPoint: forecast.hourly?.dew_point_2m?.[index],
        pressure: forecast.hourly?.pressure_msl?.[index],
        cloudCover: forecast.hourly?.cloud_cover?.[index],
        visibility: forecast.hourly?.visibility?.[index],
        airQuality: aqIndex !== undefined && aqIndex >= 0 && airQuality.hourly
          ? {
              pm25: airQuality.hourly.pm2_5?.[aqIndex],
              pm10: airQuality.hourly.pm10?.[aqIndex],
              o3: airQuality.hourly.ozone?.[aqIndex],
              no2: airQuality.hourly.nitrogen_dioxide?.[aqIndex],
              so2: airQuality.hourly.sulphur_dioxide?.[aqIndex],
              co: airQuality.hourly.carbon_monoxide?.[aqIndex],
              aqi: airQuality.hourly.us_aqi?.[aqIndex] ?? airQuality.hourly.european_aqi?.[aqIndex],
            }
          : undefined,
        pollen: aqIndex !== undefined && aqIndex >= 0 && airQuality.hourly
          ? {
              grass: {index: airQuality.hourly.grass_pollen?.[aqIndex]},
              ragweed: {index: airQuality.hourly.ragweed_pollen?.[aqIndex]},
              tree: {index: (airQuality.hourly.birch_pollen?.[aqIndex] ?? 0) +
                    (airQuality.hourly.olive_pollen?.[aqIndex] ?? 0)},
            }
          : undefined,
      } as Hourly;
    }) ?? [];

    return {
      base: {
        refreshTime: new Date(),
        mainUpdateTime: new Date(),
        airQualityUpdateTime: new Date(),
      },
      current,
      dailyForecast,
      hourlyForecast,
      alerts: [],
    };
  } catch (error) {
    console.error('Error fetching weather:', error);
    throw error;
  }
}

// Geocoding service
interface GeocodingResult {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  elevation?: number;
  country?: string;
  country_code?: string;
  admin1?: string;
  admin2?: string;
  admin3?: string;
  admin4?: string;
  timezone: string;
}

export async function searchLocations(query: string): Promise<GeocodingResult[]> {
  try {
    const response = await axios.get<{results?: GeocodingResult[]}>(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=10&language=en&format=json`
    );
    return response.data.results ?? [];
  } catch (error) {
    console.error('Error searching locations:', error);
    throw error;
  }
}

export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<GeocodingResult | null> {
  try {
    // Open-Meteo doesn't have reverse geocoding, so we'll use a simple approximation
    // In a production app, you'd want to use Nominatim or another service
    const response = await axios.get<{results?: GeocodingResult[]}>(
      `https://geocoding-api.open-meteo.com/v1/search?name=location&count=1&language=en&format=json`
    );
    
    if (response.data.results && response.data.results.length > 0) {
      const result = response.data.results[0];
      return {
        ...result,
        latitude,
        longitude,
      };
    }
    return null;
  } catch (error) {
    console.error('Error reverse geocoding:', error);
    return null;
  }
}

export async function fetchAirQuality(
  latitude: number,
  longitude: number,
  timezone: string = 'auto'
) {
  try {
    const response = await axios.get<OpenMeteoAirQualityResponse>(
      `${OPEN_METEO_AIR_QUALITY_URL}/air-quality?latitude=${latitude}&longitude=${longitude}&current=pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,us_aqi&timezone=${timezone}`
    );

    const airQuality = response.data;
    
    if (airQuality.current) {
      return {
        pm25: airQuality.current.pm2_5,
        pm10: airQuality.current.pm10,
        so2: airQuality.current.sulphur_dioxide,
        no2: airQuality.current.nitrogen_dioxide,
        o3: airQuality.current.ozone,
        co: airQuality.current.carbon_monoxide,
        aqi: airQuality.current.us_aqi,
      };
    }
    
    return undefined;
  } catch (error) {
    console.error('Error fetching air quality:', error);
    return undefined;
  }
}
