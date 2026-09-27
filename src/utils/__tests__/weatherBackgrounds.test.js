import {WeatherCode} from '../../types/weather';
import {
  getWeatherBackgroundKey,
  getWeatherBackgroundSource,
  isWeatherBackgroundDark,
  WEATHER_BACKGROUNDS,
} from '../weatherBackgrounds';

describe('weather backgrounds', () => {
  it('maps clear and partly cloudy codes to day/night backdrops', () => {
    expect(getWeatherBackgroundKey(WeatherCode.CLEAR, true)).toBe('clear-day');
    expect(getWeatherBackgroundKey(WeatherCode.CLEAR, false)).toBe('clear-night');
    expect(getWeatherBackgroundKey(WeatherCode.PARTLY_CLOUDY, true)).toBe(
      'partly-cloudy-day',
    );
    expect(getWeatherBackgroundKey(WeatherCode.PARTLY_CLOUDY, false)).toBe(
      'partly-cloudy-night',
    );
  });

  it('groups precipitation codes onto rain, snow and storm backdrops', () => {
    expect(getWeatherBackgroundKey(WeatherCode.RAIN_LIGHT)).toBe('rain');
    expect(getWeatherBackgroundKey(WeatherCode.RAIN)).toBe('rain');
    expect(getWeatherBackgroundKey(WeatherCode.RAIN_HEAVY)).toBe('rain');
    expect(getWeatherBackgroundKey(WeatherCode.SNOW)).toBe('snow');
    expect(getWeatherBackgroundKey(WeatherCode.SLEET)).toBe('snow');
    expect(getWeatherBackgroundKey(WeatherCode.HAIL)).toBe('thunderstorm');
    expect(getWeatherBackgroundKey(WeatherCode.THUNDERSTORM)).toBe(
      'thunderstorm',
    );
  });

  it('falls back to overcast for cloudy, wind and unknown codes', () => {
    expect(getWeatherBackgroundKey(WeatherCode.CLOUDY)).toBe('overcast');
    expect(getWeatherBackgroundKey(WeatherCode.WIND)).toBe('overcast');
    expect(getWeatherBackgroundKey(undefined)).toBe('overcast');
  });

  it('drives the dark material for storms, rain, cloud and any night sky', () => {
    expect(isWeatherBackgroundDark('clear-day', true)).toBe(false);
    expect(isWeatherBackgroundDark('partly-cloudy-day', true)).toBe(false);
    expect(isWeatherBackgroundDark('snow', true)).toBe(false);
    expect(isWeatherBackgroundDark('fog', true)).toBe(false);

    expect(isWeatherBackgroundDark('overcast')).toBe(true);
    expect(isWeatherBackgroundDark('rain')).toBe(true);
    expect(isWeatherBackgroundDark('thunderstorm')).toBe(true);
    expect(isWeatherBackgroundDark('clear-day', false)).toBe(true);
    expect(isWeatherBackgroundDark('snow', false)).toBe(true);
  });

  it('bundles a backdrop asset for every key', () => {
    for (const key of Object.keys(WEATHER_BACKGROUNDS)) {
      expect(getWeatherBackgroundSource(key)).toBeTruthy();
    }
  });
});
