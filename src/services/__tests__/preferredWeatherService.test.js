jest.mock('../openMeteoService', () => ({
  fetchWeather: jest.fn(),
  fetchAirQuality: jest.fn(),
  fetchMinutelyPrecipitation: jest.fn(),
}));

jest.mock('../nwsService', () => ({
  fetchNWSWeather: jest.fn(),
  isUSLocation: jest.fn(),
}));

jest.mock('../metnoService', () => ({
  fetchMetNoWeather: jest.fn(),
}));

const {fetchPreferredWeather} = require('../preferredWeatherService');
const {
  fetchWeather,
  fetchAirQuality,
  fetchMinutelyPrecipitation,
} = require('../openMeteoService');
const {fetchNWSWeather, isUSLocation} = require('../nwsService');
const {fetchMetNoWeather} = require('../metnoService');

function createWeather() {
  return {
    current: {
      weatherText: 'Sunny',
    },
    dailyForecast: [],
    hourlyForecast: [],
  };
}

describe('fetchPreferredWeather', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fetchMinutelyPrecipitation.mockResolvedValue([]);
    fetchMetNoWeather.mockResolvedValue(null);
  });

  it('uses NWS directly for US locations and only supplements air quality', async () => {
    const nwsWeather = createWeather();
    const airQuality = {aqi: 42};

    isUSLocation.mockResolvedValue(true);
    fetchNWSWeather.mockResolvedValue(nwsWeather);
    fetchAirQuality.mockResolvedValue(airQuality);
    // Open-Meteo contributes nothing here so NWS remains the only source.
    fetchWeather.mockResolvedValue(null);

    const result = await fetchPreferredWeather(40.7128, -74.006, 'America/New_York');

    expect(isUSLocation).toHaveBeenCalledWith(40.7128, -74.006);
    expect(fetchNWSWeather).toHaveBeenCalledWith(40.7128, -74.006);
    expect(fetchAirQuality).toHaveBeenCalledWith(40.7128, -74.006, 'America/New_York');
    expect(fetchWeather).toHaveBeenCalledWith(40.7128, -74.006, 'America/New_York');
    expect(result.current.airQuality).toEqual(airQuality);
  });

  it('falls back to Open-Meteo when NWS forecast fetch fails', async () => {
    const fallbackWeather = createWeather();
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    isUSLocation.mockResolvedValue(true);
    fetchNWSWeather.mockRejectedValue(new Error('NWS unavailable'));
    fetchWeather.mockResolvedValue(fallbackWeather);

    const result = await fetchPreferredWeather(40.7128, -74.006, 'America/New_York');

    expect(fetchWeather).toHaveBeenCalledWith(40.7128, -74.006, 'America/New_York');
    expect(fetchAirQuality).not.toHaveBeenCalled();
    expect(result.current).toEqual(fallbackWeather.current);
    expect(result.confidence.sourceNames).toEqual(['Open-Meteo']);

    warnSpy.mockRestore();
  });

  it('uses Open-Meteo directly for non-US locations', async () => {
    const openMeteoWeather = createWeather();

    isUSLocation.mockResolvedValue(false);
    fetchWeather.mockResolvedValue(openMeteoWeather);

    const result = await fetchPreferredWeather(48.8566, 2.3522, 'Europe/Paris');

    expect(fetchNWSWeather).not.toHaveBeenCalled();
    expect(fetchAirQuality).not.toHaveBeenCalled();
    expect(fetchWeather).toHaveBeenCalledWith(48.8566, 2.3522, 'Europe/Paris');
    expect(result.current).toEqual(openMeteoWeather.current);
    expect(result.confidence.sourceNames).toEqual(['Open-Meteo']);
  });

  it('weights NWS as the combined weight of the global models (US)', async () => {
    const date = new Date('2026-09-29T12:00:00.000Z');
    const member = code => ({
      current: {weatherCode: code, weatherText: code},
      hourlyForecast: [{date, weatherCode: code}],
      dailyForecast: [
        {date, day: {weatherCode: code}, night: {weatherCode: code}},
      ],
    });

    isUSLocation.mockResolvedValue(true);
    fetchWeather.mockResolvedValue(member('CLOUDY'));
    fetchMetNoWeather.mockResolvedValue(member('CLOUDY'));
    fetchNWSWeather.mockResolvedValue(member('CLEAR'));
    fetchAirQuality.mockResolvedValue(null);

    const result = await fetchPreferredWeather(
      40.7251,
      -73.5143,
      'America/New_York',
    );

    // 2-2 tie between {Open-Meteo, Met.no} = CLOUDY and NWS = CLEAR;
    // NWS carries the combined weight, so weather.gov wins.
    expect(result.dailyForecast[0].day.weatherCode).toBe('CLEAR');
    expect(result.current.weatherCode).toBe('CLEAR');
  });
});