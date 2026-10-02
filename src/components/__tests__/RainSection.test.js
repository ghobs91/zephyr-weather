jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon');
jest.mock('react-native-wagmi-charts', () => {
  const React = require('react');
  const {View} = require('react-native');
  const passthrough = ({children}) => React.createElement(View, null, children);
  const empty = () => null;
  return {
    LineChart: Object.assign(passthrough, {
      Provider: passthrough,
      Path: passthrough,
      Gradient: empty,
    }),
  };
});

const React = require('react');
const renderer = require('react-test-renderer');
const {RainSection} = require('../RainSection');

function collectText(node) {
  const parts = [];
  const walk = (value) => {
    if (value === null || value === undefined || value === false) return;
    if (typeof value === 'string' || typeof value === 'number') {
      parts.push(String(value));
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(walk);
      return;
    }
    if (value.children) walk(value.children);
  };
  walk(node);
  return parts.join(' ');
}

function render(hourlyForecast, minutelyForecast) {
  let testRenderer;
  renderer.act(() => {
    testRenderer = renderer.create(
      React.createElement(RainSection, {
        hourlyForecast,
        minutelyForecast,
        timeFormat: 'auto',
        isDark: true,
      }),
    );
  });
  const text = collectText(testRenderer.toJSON());
  renderer.act(() => testRenderer.unmount());
  return text;
}

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;

function hourlyWith(peak = 40) {
  const start = Date.now();
  return Array.from({length: 48}, (_, index) => ({
    date: new Date(start + index * HOUR_MS),
    precipitationProbability: {total: index === 3 ? peak : 0},
  }));
}

function minutelyWith(intensity) {
  const start = Date.now();
  return [0, 15, 30, 45].map((minutes) => ({
    date: new Date(start + minutes * MINUTE_MS),
    minuteInterval: 15,
    precipitationIntensity: minutes >= 30 ? intensity : 0,
  }));
}

describe('RainSection', () => {
  it('scopes the block to rain and shows the disruption gauge', () => {
    const text = render(hourlyWith(), minutelyWith(0));

    expect(text).toContain('RAIN');
    expect(text).toContain('RAIN DISRUPTION');
    expect(text).toContain('Chance rain affects your day');
    expect(text).not.toContain('TODAY');
    expect(text).not.toContain('Dry Today');
    expect(text).toMatch(/\d+%/);
  });

  it('reports when rain starts within the next hour', () => {
    const text = render(hourlyWith(), minutelyWith(0.4));

    expect(text).toContain('Starts in 30 min');
  });

  it('reports no rain when the next hour is dry', () => {
    const text = render(hourlyWith(), minutelyWith(0));

    expect(text).toContain('No rain');
    expect(text).not.toMatch(/Starts in \d+ min/);
  });
});
