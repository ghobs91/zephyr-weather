const {
  dailyDayKey,
  localTodayKey,
  selectTodayForecast,
  isTodayOrFuture,
  weekdayLabel,
  longDateLabel,
} = require('../dailyForecast');

// 2026-10-03T12:00Z is 08:00 in New York and 21:00 in Tokyo — same calendar
// day (2026-10-03) in both, which keeps the fixtures unambiguous.
const NOW = new Date('2026-10-03T12:00:00Z');

function daily(date, high) {
  return {
    date,
    day: {temperature: {temperature: high}},
    night: {temperature: {temperature: high - 8}},
  };
}

// UTC-midnight storage: what Open-Meteo, NWS, Met.no, BrightSky and ECCC emit.
const nyData = [
  daily(new Date('2026-10-02'), 80), // yesterday (from past_days=1)
  daily(new Date('2026-10-03'), 72), // today
  daily(new Date('2026-10-04'), 60), // tomorrow
];

// Local-instant storage: what JMA/CWA emit (2026-10-03 00:00 JST).
const tokyoData = [
  daily(new Date('2026-10-02T15:00:00Z'), 72),
  daily(new Date('2026-10-03T15:00:00Z'), 60),
];

describe('dailyForecast', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('resolves today for UTC-midnight dates west of UTC', () => {
    expect(localTodayKey('America/New_York')).toBe('2026-10-03');
    expect(dailyDayKey(nyData[1].date, 'America/New_York')).toBe('2026-10-03');
    expect(
      selectTodayForecast(nyData, 'America/New_York').day.temperature
        .temperature,
    ).toBe(72);
  });

  it('resolves today for UTC-midnight dates east of UTC', () => {
    expect(
      selectTodayForecast(nyData, 'Asia/Tokyo').day.temperature.temperature,
    ).toBe(72);
  });

  it('resolves today for local-instant dates (JMA/CWA)', () => {
    expect(dailyDayKey(tokyoData[0].date, 'Asia/Tokyo')).toBe('2026-10-03');
    expect(
      selectTodayForecast(tokyoData, 'Asia/Tokyo').day.temperature.temperature,
    ).toBe(72);
  });

  it('never treats yesterday as today', () => {
    expect(isTodayOrFuture(nyData[0].date, 'America/New_York')).toBe(false);
    expect(isTodayOrFuture(nyData[1].date, 'America/New_York')).toBe(true);
    expect(isTodayOrFuture(nyData[2].date, 'America/New_York')).toBe(true);
    expect(
      selectTodayForecast(nyData, 'America/New_York').date.toISOString(),
    ).toBe('2026-10-03T00:00:00.000Z');
  });

  it('falls back to the first entry when nothing matches today', () => {
    const stale = [daily(new Date('2026-09-01'), 50)];
    expect(selectTodayForecast(stale, 'America/New_York')).toBe(stale[0]);
    expect(selectTodayForecast(undefined, 'America/New_York')).toBeUndefined();
  });

  it('labels days independently of the device timezone', () => {
    expect(weekdayLabel('2026-10-03')).toBe('Sat');
    expect(longDateLabel('2026-10-03')).toBe('Saturday, October 3');
  });
});
