// Weather condition codes matching Breezy Weather's WeatherCode enum
export enum WeatherCode {
  CLEAR = 'CLEAR',
  PARTLY_CLOUDY = 'PARTLY_CLOUDY',
  CLOUDY = 'CLOUDY',
  RAIN_LIGHT = 'RAIN_LIGHT',
  RAIN = 'RAIN',
  RAIN_HEAVY = 'RAIN_HEAVY',
  SNOW_LIGHT = 'SNOW_LIGHT',
  SNOW = 'SNOW',
  SNOW_HEAVY = 'SNOW_HEAVY',
  SLEET = 'SLEET',
  HAIL = 'HAIL',
  THUNDERSTORM = 'THUNDERSTORM',
  FOG = 'FOG',
  HAZE = 'HAZE',
  WIND = 'WIND',
}

export interface Temperature {
  temperature?: number;
  realFeel?: number;
  realFeelShade?: number;
  apparent?: number;
  windChill?: number;
  wetBulb?: number;
}

export interface Wind {
  direction?: number;
  degree?: number;
  speed?: number;
  gusts?: number;
}

export interface UV {
  index?: number;
}

export interface AirQuality {
  pm25?: number;
  pm10?: number;
  so2?: number;
  no2?: number;
  o3?: number;
  co?: number;
  aqi?: number;
}

export interface PollenIndex {
  index?: number;
}

export interface Pollen {
  grass?: PollenIndex;
  mold?: PollenIndex;
  ragweed?: PollenIndex;
  tree?: PollenIndex;
}

export interface Precipitation {
  total?: number;
  rain?: number;
  snow?: number;
}

export interface PrecipitationProbability {
  total?: number;
  thunderstorm?: number;
  rain?: number;
  snow?: number;
  ice?: number;
}

export interface Sun {
  riseTime?: Date;
  setTime?: Date;
}

export interface Moon {
  riseTime?: Date;
  setTime?: Date;
  phase?: MoonPhase;
}

export enum MoonPhase {
  NEW_MOON = 'NEW_MOON',
  WAXING_CRESCENT = 'WAXING_CRESCENT',
  FIRST_QUARTER = 'FIRST_QUARTER',
  WAXING_GIBBOUS = 'WAXING_GIBBOUS',
  FULL_MOON = 'FULL_MOON',
  WANING_GIBBOUS = 'WANING_GIBBOUS',
  THIRD_QUARTER = 'THIRD_QUARTER',
  WANING_CRESCENT = 'WANING_CRESCENT',
}

export interface HalfDay {
  weatherCode?: WeatherCode;
  weatherText?: string;
  temperature?: Temperature;
  precipitation?: Precipitation;
  precipitationProbability?: PrecipitationProbability;
  wind?: Wind;
  cloudCover?: number;
}

export interface Daily {
  date: Date;
  day?: HalfDay;
  night?: HalfDay;
  sun?: Sun;
  moon?: Moon;
  uv?: UV;
  airQuality?: AirQuality;
  pollen?: Pollen;
  hoursOfSun?: number;
  degreeDays?: {
    heating?: number;
    cooling?: number;
  };
}

export interface Hourly {
  date: Date;
  isDaylight?: boolean;
  weatherCode?: WeatherCode;
  weatherText?: string;
  temperature?: Temperature;
  precipitation?: Precipitation;
  precipitationProbability?: PrecipitationProbability;
  wind?: Wind;
  uv?: UV;
  airQuality?: AirQuality;
  pollen?: Pollen;
  relativeHumidity?: number;
  dewPoint?: number;
  pressure?: number;
  cloudCover?: number;
  visibility?: number;
}

export interface Minutely {
  date: Date;
  minuteInterval: number;
  precipitationIntensity?: number;
}

export interface Alert {
  id: string;
  startDate?: Date;
  endDate?: Date;
  headline?: string;
  description?: string;
  instruction?: string;
  source?: string;
  severity: AlertSeverity;
  color?: string;
}

export enum AlertSeverity {
  EXTREME = 'EXTREME',
  SEVERE = 'SEVERE',
  MODERATE = 'MODERATE',
  MINOR = 'MINOR',
  UNKNOWN = 'UNKNOWN',
}

export interface Normals {
  month: number;
  daytimeTemperature?: number;
  nighttimeTemperature?: number;
}

export interface Current {
  weatherCode?: WeatherCode;
  weatherText?: string;
  isDaylight?: boolean;
  temperature?: Temperature;
  wind?: Wind;
  uv?: UV;
  airQuality?: AirQuality;
  relativeHumidity?: number;
  dewPoint?: number;
  pressure?: number;
  cloudCover?: number;
  visibility?: number;
  ceiling?: number;
  dailyForecast?: string;
}

export interface Weather {
  base?: {
    refreshTime?: Date;
    mainUpdateTime?: Date;
    airQualityUpdateTime?: Date;
    pollenUpdateTime?: Date;
    minutelyUpdateTime?: Date;
    alertsUpdateTime?: Date;
    normalsUpdateTime?: Date;
  };
  current?: Current;
  dailyForecast: Daily[];
  hourlyForecast: Hourly[];
  minutelyForecast?: Minutely[];
  alerts?: Alert[];
  normals?: Normals[];
}

export interface Location {
  id: string;
  latitude: number;
  longitude: number;
  timezone: string;
  country?: string;
  countryCode?: string;
  province?: string;
  city?: string;
  district?: string;
  isCurrentPosition: boolean;
  weather?: Weather;
  forecastSource: string;
  currentSource?: string;
  airQualitySource?: string;
  pollenSource?: string;
  minutelySource?: string;
  alertSource?: string;
  normalsSource?: string;
}

export interface WeatherSource {
  id: string;
  name: string;
  color?: string;
  weatherAttribution?: string;
  locationSearchAttribution?: string;
  supportedFeatures: SourceFeature[];
  requiresApiKey: boolean;
  privacyPolicyUrl?: string;
}

export enum SourceFeature {
  FORECAST = 'FORECAST',
  CURRENT = 'CURRENT',
  AIR_QUALITY = 'AIR_QUALITY',
  POLLEN = 'POLLEN',
  MINUTELY = 'MINUTELY',
  ALERT = 'ALERT',
  NORMALS = 'NORMALS',
  LOCATION_SEARCH = 'LOCATION_SEARCH',
  REVERSE_GEOCODING = 'REVERSE_GEOCODING',
}
