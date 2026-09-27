const {
  classifyRainIntensity,
  detectRainWindows,
  formatPrecipitationFallback,
  formatPrecipitationSummary,
  hourlyPrecipitationSlots,
  hourlyRainRateInchesPerHr,
  mmPerHourToInchesPerHour,
  selectSparklineHours,
  sparklineBarHeight,
  sparklineHeightRatio,
} = require('../precipitationFormatter');

const HOUR_MS = 60 * 60 * 1000;
const NOW = new Date(2026, 3, 14, 0, 0, 0);

/** 24 slots from local midnight, so slot index === local hour. */
function daySlots({pop = 0, rate = 0} = {}) {
  return Array.from({length: 24}, (_, hour) => ({
    time: new Date(2026, 3, 14, hour, 0, 0),
    pop,
    rainRateInchesPerHr: rate,
  }));
}

function summary(slots, fallbackPop) {
  return formatPrecipitationSummary(slots, {now: NOW, fallbackPop});
}

describe('classifyRainIntensity', () => {
  it('classifies rates on the in/hr intensity scale', () => {
    expect(classifyRainIntensity(undefined)).toBe('none');
    expect(classifyRainIntensity(null)).toBe('none');
    expect(classifyRainIntensity(Number.NaN)).toBe('none');
    expect(classifyRainIntensity(0)).toBe('none');
    expect(classifyRainIntensity(0.004)).toBe('none');
    expect(classifyRainIntensity(0.005)).toBe('drizzle');
    expect(classifyRainIntensity(0.099)).toBe('drizzle');
    expect(classifyRainIntensity(0.1)).toBe('moderate');
    expect(classifyRainIntensity(0.299)).toBe('moderate');
    expect(classifyRainIntensity(0.3)).toBe('heavy');
    expect(classifyRainIntensity(0.499)).toBe('heavy');
    expect(classifyRainIntensity(0.5)).toBe('torrential');
    expect(classifyRainIntensity(2)).toBe('torrential');
  });
});

describe('provider units', () => {
  it('converts millimetres per hour into inches per hour', () => {
    expect(mmPerHourToInchesPerHour(25.4)).toBeCloseTo(1);
    expect(mmPerHourToInchesPerHour(undefined)).toBe(0);
    expect(mmPerHourToInchesPerHour(-1)).toBe(0);
    expect(
      hourlyRainRateInchesPerHr({precipitation: {rain: 2.54, total: 9}}),
    ).toBeCloseTo(0.1);
    expect(
      hourlyRainRateInchesPerHr({precipitation: {total: 2.54}}),
    ).toBeCloseTo(0.1);
  });

  it('extracts the next 24 hours and normalizes probability to 0–1', () => {
    const dayStart = new Date(2026, 3, 14, 0, 0, 0).getTime();
    const forecast = Array.from({length: 36}, (_, index) => ({
      date: new Date(dayStart + index * HOUR_MS),
      precipitation: {total: index === 10 ? 25.4 : 0},
      precipitationProbability: {total: index === 10 ? 80 : 0},
    }));

    const slots = hourlyPrecipitationSlots(
      forecast,
      new Date(2026, 3, 14, 8, 30, 0),
    );

    expect(slots).toHaveLength(24);
    expect(slots[0].time.getHours()).toBe(8);
    const rainy = slots.find((slot) => slot.rainRateInchesPerHr > 0);
    expect(rainy.pop).toBeCloseTo(0.8);
    expect(rainy.rainRateInchesPerHr).toBeCloseTo(1);
  });
});

describe('formatPrecipitationSummary — smart strings', () => {
  it('returns "Dry Today" when chance stays under 20% all day', () => {
    const result = summary(daySlots({pop: 0.1}));

    expect(result.available).toBe(true);
    expect(result.text).toBe('Dry Today');
    expect(result.hasRain).toBe(false);
  });

  it('handles high chance with zero volume as a trace', () => {
    const result = summary(daySlots({pop: 0.8, rate: 0.002}));

    expect(result.text).toBe('80% Chance of Trace Drizzle');
    expect(result.trace).toBe(true);
    expect(result.intensity).toBe('drizzle');
  });

  it('handles low chance with severe volume as a downpour risk', () => {
    const slots = daySlots({pop: 0.1});
    slots[14].pop = 0.25;
    slots[14].rainRateInchesPerHr = 0.75;

    const result = summary(slots);

    expect(result.text).toBe('25% Risk of Heavy Downpours');
    expect(result.windows).toHaveLength(0);
  });

  it('formats standard waking rain with the peak intensity and window', () => {
    const slots = daySlots({pop: 0.2});
    [15, 16, 17].forEach((hour) => {
      slots[hour].pop = 0.6;
      slots[hour].rainRateInchesPerHr = 0.35;
    });

    const result = summary(slots);

    expect(result.text).toBe('60% Heavy Rain (3p–6p)');
    expect(result.peak.start.getHours()).toBe(15);
    expect(result.peak.end.getHours()).toBe(18);
    expect(result.peak.durationMinutes).toBe(180);
    expect(result.peak.intensity).toBe('heavy');
  });

  it('prefixes overnight when rain occurs exclusively in overnight hours', () => {
    const slots = daySlots();
    [2, 3, 4].forEach((hour) => {
      slots[hour].pop = 0.6;
      slots[hour].rainRateInchesPerHr = 0.15;
    });

    const result = summary(slots);

    expect(result.text).toBe('60% Overnight Rain (2a–5a)');
    expect(result.overnightOnly).toBe(true);
  });

  it('treats a window touching waking hours as daytime rain', () => {
    const slots = daySlots();
    [21, 22].forEach((hour) => {
      slots[hour].pop = 0.5;
      slots[hour].rainRateInchesPerHr = 0.2;
    });

    const result = summary(slots);

    expect(result.text).toBe('50% Rain (9p–11p)');
    expect(result.overnightOnly).toBe(false);
  });

  it('appends a duration modifier for brief sub-hour rain', () => {
    const slots = daySlots();
    slots[9].pop = 0.4;
    slots[9].rainRateInchesPerHr = 0.07;
    slots[9].durationMinutes = 25;

    const result = summary(slots);

    expect(result.text).toBe('40% Brief AM Drizzle (<25m)');
    expect(result.brief).toBe(true);
  });

  it('picks the higher-intensity window when rain is split', () => {
    const slots = daySlots({pop: 0.1});
    slots[8].pop = 0.5;
    slots[8].rainRateInchesPerHr = 0.08;
    [17, 18].forEach((hour) => {
      slots[hour].pop = 0.7;
      slots[hour].rainRateInchesPerHr = 0.35;
    });

    const result = summary(slots);

    expect(result.windows).toHaveLength(2);
    expect(result.text).toBe('70% Heavy Rain (5p–7p)');
    expect(result.peak.start.getHours()).toBe(17);
  });

  it('falls back to the daily PoP text when the forecast is missing', () => {
    const result = summary([], 60);

    expect(result.available).toBe(false);
    expect(result.text).toBe('60% Rain');
    expect(result.hasRain).toBe(false);
  });

  it('detects stale forecast data and falls back safely', () => {
    const stale = daySlots({pop: 0.8, rate: 0.3}).map((slot) => ({
      ...slot,
      time: new Date(2026, 3, 13, slot.time.getHours(), 0, 0),
    }));

    const result = summary(stale, 45);

    expect(result.available).toBe(false);
    expect(result.text).toBe('45% Rain');
  });

  it('reports sub-window chance without inventing a rain window', () => {
    const slots = daySlots({pop: 0.15});
    slots[12].rainRateInchesPerHr = 0.2;

    expect(summary(slots).text).toBe('15% Chance of Rain');
  });
});

describe('formatPrecipitationFallback', () => {
  it('formats the standard daily PoP text', () => {
    expect(formatPrecipitationFallback(60)).toBe('60% Rain');
    expect(formatPrecipitationFallback(0)).toBe('0% Rain');
    expect(formatPrecipitationFallback(undefined)).toBe(
      'Rain data unavailable',
    );
  });
});

describe('detectRainWindows', () => {
  it('groups contiguous qualifying slots and splits on gaps', () => {
    const slots = daySlots({pop: 0.5, rate: 0.1});
    delete slots[9];
    delete slots[10];

    const windows = detectRainWindows(slots);

    expect(windows).toHaveLength(2);
    expect(windows[0].start.getHours()).toBe(0);
    expect(windows[0].end.getHours()).toBe(9);
    expect(windows[1].start.getHours()).toBe(11);
  });

  it('ignores hours that fail either threshold', () => {
    const slots = daySlots({pop: 0.29, rate: 0.4});
    slots[5].pop = 0.9;
    slots[5].rainRateInchesPerHr = 0.049;

    expect(detectRainWindows(slots)).toHaveLength(0);
  });
});

describe('sparkline scaling', () => {
  it('maps rates logarithmically from 0 to 0.5+ in/hr', () => {
    expect(sparklineHeightRatio(0)).toBe(0);
    expect(sparklineHeightRatio(-1)).toBe(0);
    expect(sparklineHeightRatio(Number.NaN)).toBe(0);
    expect(sparklineHeightRatio(0.005)).toBeGreaterThan(0);
    expect(sparklineHeightRatio(0.05)).toBeGreaterThan(
      sparklineHeightRatio(0.005),
    );
    expect(sparklineHeightRatio(0.5)).toBeCloseTo(1);
    expect(sparklineHeightRatio(2)).toBe(1);
  });

  it('keeps drizzle visible and dry hours as a faint rail', () => {
    expect(sparklineBarHeight(0, 16)).toBe(2);
    expect(sparklineBarHeight(0.005, 16)).toBeGreaterThanOrEqual(2);
    expect(sparklineBarHeight(0.005, 16)).toBeLessThan(4);
    expect(sparklineBarHeight(0.5, 16)).toBe(16);
  });
});

describe('selectSparklineHours', () => {
  const dayStart = new Date(2026, 3, 14, 0, 0, 0).getTime();
  const forecast = Array.from({length: 48}, (_, index) => ({
    date: new Date(dayStart + index * HOUR_MS),
    precipitation: {total: 0},
    precipitationProbability: {total: 0},
  }));

  it('selects the next 12 waking hours', () => {
    const hours = selectSparklineHours(
      forecast,
      new Date(2026, 3, 14, 8, 0, 0),
    );

    expect(hours).toHaveLength(12);
    expect(hours[0].date.getHours()).toBe(8);
    expect(hours[11].date.getHours()).toBe(19);
  });

  it('skips hours already past when the day is underway', () => {
    const hours = selectSparklineHours(
      forecast,
      new Date(2026, 3, 14, 15, 0, 0),
    );

    expect(hours).toHaveLength(12);
    expect(hours[0].date.getHours()).toBe(15);
    expect(hours[5].date.getDate()).toBe(15);
    expect(hours[5].date.getHours()).toBe(8);
  });

  it('returns nothing for stale or empty data', () => {
    expect(selectSparklineHours([], NOW)).toEqual([]);
    expect(selectSparklineHours(undefined, NOW)).toEqual([]);
  });
});
