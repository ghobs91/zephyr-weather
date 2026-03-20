import React from 'react';
import {SvgProps} from 'react-native-svg';
import {WeatherCode} from '../types/weather';

import ClearDay from '../assets/weather/meteocons/clear-day.svg';
import ClearNight from '../assets/weather/meteocons/clear-night.svg';
import PartlyCloudyDay from '../assets/weather/meteocons/partly-cloudy-day.svg';
import PartlyCloudyNight from '../assets/weather/meteocons/partly-cloudy-night.svg';
import Overcast from '../assets/weather/meteocons/overcast.svg';
import Drizzle from '../assets/weather/meteocons/drizzle.svg';
import Rain from '../assets/weather/meteocons/rain.svg';
import ThunderstormsRain from '../assets/weather/meteocons/thunderstorms-rain.svg';
import Thunderstorms from '../assets/weather/meteocons/thunderstorms.svg';
import Snow from '../assets/weather/meteocons/snow.svg';
import Sleet from '../assets/weather/meteocons/sleet.svg';
import Hail from '../assets/weather/meteocons/hail.svg';
import Fog from '../assets/weather/meteocons/fog.svg';
import Wind from '../assets/weather/meteocons/wind.svg';

export const getWeatherIconComponent = (
  code?: WeatherCode,
  isDay: boolean = true,
): React.FC<SvgProps> => {
  switch (code) {
    case WeatherCode.CLEAR:
      return isDay ? ClearDay : ClearNight;
    case WeatherCode.PARTLY_CLOUDY:
      return isDay ? PartlyCloudyDay : PartlyCloudyNight;
    case WeatherCode.CLOUDY:
      return Overcast;
    case WeatherCode.RAIN_LIGHT:
      return Drizzle;
    case WeatherCode.RAIN:
      return Rain;
    case WeatherCode.RAIN_HEAVY:
      return ThunderstormsRain;
    case WeatherCode.SNOW_LIGHT:
    case WeatherCode.SNOW:
    case WeatherCode.SNOW_HEAVY:
      return Snow;
    case WeatherCode.SLEET:
      return Sleet;
    case WeatherCode.HAIL:
      return Hail;
    case WeatherCode.THUNDERSTORM:
      return Thunderstorms;
    case WeatherCode.FOG:
    case WeatherCode.HAZE:
      return Fog;
    case WeatherCode.WIND:
      return Wind;
    default:
      return isDay ? ClearDay : ClearNight;
  }
};

