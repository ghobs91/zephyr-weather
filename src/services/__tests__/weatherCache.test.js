const React = require('react');
const renderer = require('react-test-renderer');
const {
  cacheWeatherData,
  getCachedWeatherData,
  clearWeatherCache,
} = require('../weatherCache');
const {useTodayForecast} = require('../../hooks/useTodayForecast');

const LAT = 40.71;
const LON = -74.01;

function sampleWeather() {
  return {
    base: {refreshTime: new Date('2026-09-27T10:00:00.000Z')},
    current: {weatherCode: 'RAIN', isDaylight: true},
    dailyForecast: [
      {
        date: new Date('2030-01-01T00:00:00.000Z'),
        day: {temperature: {temperature: 20}},
      },
    ],
    hourlyForecast: [
      {
        date: new Date('2030-01-01T12:00:00.000Z'),
        temperature: {temperature: 20},
      },
    ],
    minutelyForecast: [
      {
        date: new Date('2030-01-01T12:15:00.000Z'),
        minuteInterval: 15,
        precipitationIntensity: 0.2,
      },
    ],
    alerts: [
      {
        id: 'alert-1',
        severity: 'MINOR',
        startDate: new Date('2030-01-01T09:00:00.000Z'),
        endDate: new Date('2030-01-01T15:00:00.000Z'),
      },
    ],
  };
}

function TodayProbe({dailyForecast}) {
  const today = useTodayForecast(dailyForecast);
  return React.createElement('TodayProbe', {resolvedDate: today?.date ?? null});
}

describe('weatherCache date revival', () => {
  afterEach(async () => {
    await clearWeatherCache();
  });

  it('returns Date instances after a cache round-trip', async () => {
    await cacheWeatherData(LAT, LON, sampleWeather());

    const cached = await getCachedWeatherData(LAT, LON);

    expect(cached).not.toBeNull();
    expect(cached.dailyForecast[0].date).toBeInstanceOf(Date);
    expect(cached.hourlyForecast[0].date).toBeInstanceOf(Date);
    expect(cached.minutelyForecast[0].date).toBeInstanceOf(Date);
    expect(cached.base.refreshTime).toBeInstanceOf(Date);
    expect(cached.alerts[0].startDate).toBeInstanceOf(Date);
    expect(cached.alerts[0].endDate).toBeInstanceOf(Date);
  });

  it('lets useTodayForecast consume cached data without throwing', async () => {
    await cacheWeatherData(LAT, LON, sampleWeather());
    const cached = await getCachedWeatherData(LAT, LON);

    let tree;
    expect(() => {
      renderer.act(() => {
        tree = renderer.create(
          React.createElement(TodayProbe, {
            dailyForecast: cached.dailyForecast,
          }),
        );
      });
    }).not.toThrow();

    const probe = tree.root.findByType('TodayProbe');
    expect(probe.props.resolvedDate).toBeInstanceOf(Date);
  });
});
