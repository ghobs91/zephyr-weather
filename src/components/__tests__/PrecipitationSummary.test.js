const React = require('react');
const renderer = require('react-test-renderer');
const {PrecipitationSummary} = require('../PrecipitationSummary');
const {
  PrecipitationSparkbar,
  rainBarColor,
} = require('../PrecipitationSparkbar');
const {colors} = require('../../theme/colors');
const {withAlpha} = require('../../theme/design');

const HOUR_MS = 60 * 60 * 1000;
const NOW = new Date(2026, 3, 14, 8, 0, 0);

function forecast({pop = 0, rateMmPerHr = 0} = {}) {
  const dayStart = new Date(2026, 3, 14, 0, 0, 0).getTime();
  return Array.from({length: 24}, (_, index) => ({
    date: new Date(dayStart + index * HOUR_MS),
    precipitation: {total: rateMmPerHr},
    precipitationProbability: {total: pop},
  }));
}

function render(element) {
  let testRenderer;
  renderer.act(() => {
    testRenderer = renderer.create(element);
  });
  return testRenderer;
}

function texts(json) {
  if (json == null || typeof json === 'boolean') return [];
  if (typeof json === 'string') return [json];
  return (json.children ?? []).flatMap(texts);
}

function findByTestID(root, testID) {
  return root.findAll(
    (node) => typeof node.type === 'string' && node.props?.testID === testID,
  );
}

function flatStyle(node) {
  const style = node.props.style;
  if (!Array.isArray(style)) return style ?? {};
  return Object.assign({}, ...style.filter(Boolean));
}

describe('PrecipitationSparkbar', () => {
  it('returns null for an empty forecast instead of a broken bar', () => {
    const tree = render(
      React.createElement(PrecipitationSparkbar, {
        hourlyData: [],
        isDark: false,
      }),
    );

    expect(tree.toJSON()).toBeNull();
  });

  it('scales bars logarithmically and keeps dry hours as rails', () => {
    const hours = forecast();
    hours[0].precipitation.total = 12.7; // 0.5 in/hr
    hours[1].precipitation.total = 1.27; // 0.05 in/hr

    const tree = render(
      React.createElement(PrecipitationSparkbar, {
        hourlyData: hours.slice(0, 3),
        height: 16,
        isDark: false,
      }),
    );

    const bars = findByTestID(tree.root, 'precipitation-sparkbar-bar');
    expect(bars).toHaveLength(3);
    expect(flatStyle(bars[0]).height).toBe(16);
    expect(flatStyle(bars[1]).height).toBeGreaterThan(2);
    expect(flatStyle(bars[1]).height).toBeLessThan(16);
    expect(flatStyle(bars[2]).height).toBe(2);
    expect(flatStyle(bars[0]).width).toBe(3);
  });

  it('maps intensities onto the colour spectrum', () => {
    const theme = colors.light;

    expect(rainBarColor('none', theme)).toBe(withAlpha(theme.cloudy, 0.15));
    expect(rainBarColor('drizzle', theme)).toBe(theme.rain);
    expect(rainBarColor('moderate', theme)).toBe(theme.rain);
    expect(rainBarColor('heavy', theme)).toBe(theme.warning);
    expect(rainBarColor('torrential', theme)).toBe(theme.error);
  });
});

describe('PrecipitationSummary', () => {
  it('renders the smart string without a sparkbar in minimal tier', () => {
    const tree = render(
      React.createElement(PrecipitationSummary, {
        hourlyForecast: forecast({pop: 80, rateMmPerHr: 0.0508}),
        tier: 'minimal',
        now: NOW,
        isDark: false,
      }),
    );

    expect(texts(tree.toJSON())).toContain('80% Chance of Trace Drizzle');
    expect(findByTestID(tree.root, 'precipitation-sparkbar')).toHaveLength(0);
  });

  it('renders text plus 12 sparkbar segments in medium tier', () => {
    const hours = forecast();
    [15, 16, 17].forEach((hour) => {
      hours[hour].precipitation.total = 8.89;
      hours[hour].precipitationProbability.total = 60;
    });

    const tree = render(
      React.createElement(PrecipitationSummary, {
        hourlyForecast: hours,
        tier: 'medium',
        now: NOW,
        isDark: false,
      }),
    );

    expect(texts(tree.toJSON())).toContain('60% Heavy Rain (3p–6p)');
    const bars = findByTestID(tree.root, 'precipitation-sparkbar-bar');
    expect(bars).toHaveLength(12);
  });

  it('scales the sparkbar up in header tier', () => {
    const tree = render(
      React.createElement(PrecipitationSummary, {
        hourlyForecast: forecast({pop: 60, rateMmPerHr: 2.54}),
        tier: 'header',
        now: NOW,
        isDark: true,
      }),
    );

    const sparkbar = findByTestID(tree.root, 'precipitation-sparkbar')[0];
    expect(flatStyle(sparkbar).height).toBe(24);
    expect(findByTestID(tree.root, 'precipitation-sparkbar-bar')).toHaveLength(
      12,
    );
  });

  it('falls back to daily PoP text without a sparkbar when data is stale', () => {
    const tree = render(
      React.createElement(PrecipitationSummary, {
        hourlyForecast: [],
        dailyPop: 60,
        tier: 'medium',
        now: NOW,
        isDark: false,
      }),
    );

    expect(texts(tree.toJSON())).toContain('60% Rain');
    expect(findByTestID(tree.root, 'precipitation-sparkbar')).toHaveLength(0);
  });
});
