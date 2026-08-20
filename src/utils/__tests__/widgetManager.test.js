const mockSetItem = jest.fn();
const mockReloadWidgets = jest.fn();

jest.mock('react-native', () => ({
  Platform: {OS: 'ios'},
  NativeModules: {
    ZephyrWidgetBridge: {
      setItem: (...args) => mockSetItem(...args),
      reloadWidgets: () => mockReloadWidgets(),
    },
  },
}));

const {defaultSettings} = require('../../types/settings');
const {WeatherCode} = require('../../types/weather');
const {
  __widgetManagerTestUtils,
  updateAllLocationsWeatherData,
} = require('../widgetManager');

function createWeather(tempCelsius) {
  const now = new Date('2026-04-18T12:00:00.000Z');

  return {
    current: {
      temperature: {temperature: tempCelsius, apparent: tempCelsius - 1},
      weatherCode: WeatherCode.CLEAR,
      weatherText: 'Clear',
      isDaylight: true,
      relativeHumidity: 45,
      wind: {speed: 5},
    },
    dailyForecast: [
      {
        date: now,
        day: {
          temperature: {temperature: tempCelsius + 2},
          weatherCode: WeatherCode.CLEAR,
          weatherText: 'Sunny',
          precipitationProbability: {total: 5},
        },
        night: {
          temperature: {temperature: tempCelsius - 3},
          weatherCode: WeatherCode.CLEAR,
        },
      },
    ],
    hourlyForecast: [
      {
        date: new Date('2026-04-18T13:00:00.000Z'),
        temperature: {temperature: tempCelsius},
        weatherCode: WeatherCode.CLEAR,
        precipitationProbability: {total: 0},
        isDaylight: true,
      },
    ],
  };
}

function createLocation(tempCelsius) {
  return {
    id: 'sf',
    latitude: 37.7749,
    longitude: -122.4194,
    timezone: 'America/Los_Angeles',
    city: 'San Francisco',
    isCurrentPosition: false,
    forecastSource: 'nws',
    weather: createWeather(tempCelsius),
  };
}

describe('widgetManager reload scheduling', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-04-18T12:00:00.000Z'));
    mockSetItem.mockResolvedValue(undefined);
    mockReloadWidgets.mockResolvedValue(undefined);
    mockSetItem.mockClear();
    mockReloadWidgets.mockClear();
    __widgetManagerTestUtils.resetReloadScheduler();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('reloads widgets immediately on the first shared weather update', async () => {
    await updateAllLocationsWeatherData([createLocation(18)], defaultSettings);

    expect(mockSetItem).toHaveBeenCalledTimes(2);
    // reloadWidgets() flushes pending UserDefaults writes with a 300ms
    // delay before calling into WidgetKit.
    await jest.advanceTimersByTimeAsync(300);

    expect(mockReloadWidgets).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('coalesces rapid follow-up updates into one trailing reload with the latest data', async () => {
    await updateAllLocationsWeatherData([createLocation(18)], defaultSettings);
    await jest.advanceTimersByTimeAsync(300);
    expect(mockReloadWidgets).toHaveBeenCalledTimes(1);

    jest.setSystemTime(new Date('2026-04-18T12:00:00.500Z'));
    await updateAllLocationsWeatherData([createLocation(21)], defaultSettings);

    expect(mockReloadWidgets).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(1);
    // Widget data is written in the user's unit: 21°C → 70°F.
    expect(mockSetItem).toHaveBeenLastCalledWith(
      'weatherData',
      expect.stringContaining('"temperature":70'),
      'group.com.zephyrweather.shared',
    );

    // Coalesced reload fires at the end of the 1500ms cooldown window,
    // then waits out the 300ms flush delay before calling WidgetKit.
    await jest.advanceTimersByTimeAsync(1000);
    await jest.advanceTimersByTimeAsync(300);

    expect(mockReloadWidgets).toHaveBeenCalledTimes(2);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('excludes locations without weather data from the shared map', async () => {
    const noWeatherLocation = {
      id: 'nyc',
      latitude: 40.7128,
      longitude: -74.006,
      timezone: 'America/New_York',
      city: 'New York',
      isCurrentPosition: false,
      forecastSource: 'nws',
    };

    await updateAllLocationsWeatherData(
      [createLocation(18), noWeatherLocation],
      defaultSettings,
    );

    const weatherWriteCall = mockSetItem.mock.calls.find(
      ([key]) => key === 'weatherData',
    );
    const weatherData = JSON.parse(weatherWriteCall[1]);

    expect(weatherData.sf.locationName).toBe('San Francisco');
    expect(weatherData.nyc).toBeUndefined();
  });
});