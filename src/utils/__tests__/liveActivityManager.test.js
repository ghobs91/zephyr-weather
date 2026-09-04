const mockStart = jest.fn();
const mockUpdate = jest.fn();
const mockEnd = jest.fn();
const mockIsActive = jest.fn();

jest.mock('react-native', () => ({
  Platform: {OS: 'ios'},
  NativeModules: {
    ZephyrWidgetBridge: {
      startLiveActivity: (...args) => mockStart(...args),
      updateLiveActivity: (...args) => mockUpdate(...args),
      endLiveActivity: (...args) => mockEnd(...args),
      isLiveActivityActive: (...args) => mockIsActive(...args),
    },
  },
}));

const {WeatherCode} = require('../../types/weather');
const {useWeatherStore} = require('../../store/weatherStore');
const {
  buildLiveActivityPayload,
  weatherCodeToSFSymbol,
  syncLiveActivity,
  endLiveActivity,
} = require('../liveActivityManager');

function createLocation() {
  return {
    id: 'sf',
    latitude: 37.7749,
    longitude: -122.4194,
    timezone: 'America/Los_Angeles',
    city: 'San Francisco',
    isCurrentPosition: false,
    forecastSource: 'nws',
    weather: {
      current: {
        temperature: {temperature: 18},
        weatherCode: WeatherCode.PARTLY_CLOUDY,
        weatherText: 'Partly cloudy',
        isDaylight: true,
      },
      dailyForecast: [
        {
          date: new Date('2026-04-18T12:00:00.000Z'),
          day: {temperature: {temperature: 20}},
          night: {temperature: {temperature: 12}},
        },
      ],
      hourlyForecast: [],
    },
  };
}

describe('weatherCodeToSFSymbol', () => {
  test('maps known codes and falls back for unknown/missing', () => {
    expect(weatherCodeToSFSymbol(WeatherCode.CLEAR)).toBe('sun.max.fill');
    expect(weatherCodeToSFSymbol(WeatherCode.THUNDERSTORM)).toBe('cloud.bolt.rain.fill');
    expect(weatherCodeToSFSymbol(undefined)).toBe('cloud.fill');
    expect(weatherCodeToSFSymbol('NOPE')).toBe('cloud.fill');
  });
});

describe('buildLiveActivityPayload', () => {
  test('formats display strings in the user unit (18°C → 64°F)', () => {
    const payload = buildLiveActivityPayload(createLocation(), 'fahrenheit');
    expect(payload).toMatchObject({
      locationId: 'sf',
      temperature: '64°F',
      weatherText: 'Partly cloudy',
      highTemp: '68°F',
      lowTemp: '54°F',
      locationName: 'San Francisco',
      sfSymbol: 'cloud.sun.fill',
    });
  });

  test('returns null without current conditions', () => {
    expect(buildLiveActivityPayload({id: 'x'}, 'fahrenheit')).toBeNull();
  });
});

describe('syncLiveActivity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsActive.mockResolvedValue(false);
    mockStart.mockResolvedValue(undefined);
    mockUpdate.mockResolvedValue(undefined);
    mockEnd.mockResolvedValue(undefined);
    useWeatherStore.setState({
      locations: [createLocation()],
      currentLocationIndex: 0,
      settings: {...useWeatherStore.getState().settings, liveActivityEnabled: true},
    });
  });

  test('starts when none is active', async () => {
    await syncLiveActivity();
    expect(mockStart).toHaveBeenCalledTimes(1);
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(JSON.parse(mockStart.mock.calls[0][0])).toMatchObject({locationId: 'sf'});
  });

  test('updates when one is active', async () => {
    mockIsActive.mockResolvedValue(true);
    await syncLiveActivity();
    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(mockStart).not.toHaveBeenCalled();
  });

  test('ends when disabled in settings', async () => {
    useWeatherStore.setState({
      settings: {...useWeatherStore.getState().settings, liveActivityEnabled: false},
    });
    await syncLiveActivity();
    expect(mockEnd).toHaveBeenCalledTimes(1);
    expect(mockStart).not.toHaveBeenCalled();
  });

  test('endLiveActivity resolves without a bridge', async () => {
    await endLiveActivity();
    expect(mockEnd).toHaveBeenCalledTimes(1);
  });
});
