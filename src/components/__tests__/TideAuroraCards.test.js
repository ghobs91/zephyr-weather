jest.mock('react-native-linear-gradient', () => 'LinearGradient');
jest.mock('@react-native-community/blur', () => ({BlurView: 'BlurView'}));
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon');

const React = require('react');
const renderer = require('react-test-renderer');
const {TideCard} = require('../TideCard');
const {AuroraCard} = require('../AuroraCard');

/** React 19 flushes renders inside act(); toJSON() is null otherwise. */
function render(element) {
  let testRenderer;
  renderer.act(() => {
    testRenderer = renderer.create(element);
  });
  const tree = testRenderer.toJSON();
  renderer.act(() => {
    testRenderer.unmount();
  });
  return tree;
}

describe('TideCard', () => {
  it('renders upcoming tide events with the station name', () => {
    const tides = {
      units: 'ft',
      stationName: 'Sandy Hook, NJ',
      predictions: [
        {
          time: new Date(Date.now() + 60 * 60 * 1000),
          height: 5.48,
          type: 'high',
        },
        {
          time: new Date(Date.now() + 7 * 60 * 60 * 1000),
          height: 0.81,
          type: 'low',
        },
      ],
    };
    const json = JSON.stringify(
      render(
        React.createElement(TideCard, {
          tides,
          isDark: false,
          timeFormat: '12h',
        }),
      ),
    );
    expect(json).toContain('Sandy Hook');
    expect(json).toContain('High');
    expect(json).toContain('5.5');
  });

  it('renders nothing without tide data', () => {
    const tree = render(
      React.createElement(TideCard, {
        tides: undefined,
        isDark: false,
        timeFormat: 'auto',
      }),
    );
    expect(tree).toBeNull();
  });
});

describe('AuroraCard', () => {
  it('renders the Kp index and activity level', () => {
    const spaceWeather = {
      kpIndex: 5.67,
      auroraLatitude: 55,
      solarWindSpeed: 420,
      kpForecast: [],
    };
    const json = JSON.stringify(
      render(React.createElement(AuroraCard, {spaceWeather, isDark: true})),
    );
    expect(json).toContain('5.7');
    expect(json).toContain('Geomagnetic storm');
  });

  it('renders nothing without space weather', () => {
    const tree = render(
      React.createElement(AuroraCard, {spaceWeather: undefined, isDark: false}),
    );
    expect(tree).toBeNull();
  });
});
