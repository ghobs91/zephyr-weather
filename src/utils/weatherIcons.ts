import {WeatherCode} from '../types/weather';

// Weather icon mapping - using 100px PNG files for crisp rendering
export const weatherIcons = {
  clear: require('../assets/weather/icons8-sun-100.png'),
  night: require('../assets/weather/icons8-winter-100.png'),
  partlyCloudy: require('../assets/weather/icons8-partly-cloudy-day-100.png'),
  cloudy: require('../assets/weather/icons8-cloud-100.png'),
  rain: require('../assets/weather/icons8-rain-100.png'),
  storm: require('../assets/weather/icons8-storm-100.png'),
  snow: require('../assets/weather/icons8-snow-100.png'),
  wind: require('../assets/weather/icons8-windy-weather-100.png'),
  lightning: require('../assets/weather/icons8-storm-100.png'),
};

export const getWeatherIconSource = (
  code?: WeatherCode,
  isDay: boolean = true
): any => {
  switch (code) {
    case WeatherCode.CLEAR:
      return isDay ? weatherIcons.clear : weatherIcons.night;
    case WeatherCode.PARTLY_CLOUDY:
      return isDay ? weatherIcons.partlyCloudy : weatherIcons.night;
    case WeatherCode.CLOUDY:
      return weatherIcons.cloudy;
    case WeatherCode.RAIN_LIGHT:
    case WeatherCode.RAIN:
      return weatherIcons.rain;
    case WeatherCode.RAIN_HEAVY:
      return weatherIcons.storm;
    case WeatherCode.SNOW_LIGHT:
    case WeatherCode.SNOW:
    case WeatherCode.SNOW_HEAVY:
    case WeatherCode.SLEET:
    case WeatherCode.HAIL:
      return weatherIcons.snow;
    case WeatherCode.THUNDERSTORM:
      return weatherIcons.lightning;
    case WeatherCode.FOG:
    case WeatherCode.HAZE:
      return weatherIcons.cloudy;
    case WeatherCode.WIND:
      return weatherIcons.wind;
    default:
      return isDay ? weatherIcons.clear : weatherIcons.night;
  }
};
