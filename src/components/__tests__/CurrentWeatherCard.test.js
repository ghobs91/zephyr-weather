jest.mock('react-native-linear-gradient', () => 'LinearGradient');
jest.mock('@react-native-community/blur', () => ({
  BlurView: 'BlurView',
}));
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon');
jest.mock('react-native-wagmi-charts', () => {
  const React = require('react');
  const {View} = require('react-native');
  const passthrough = ({children}) =>
    React.createElement(View, null, children);
  const empty = () => null;
  return {
    LineChart: Object.assign(passthrough, {
      Provider: passthrough,
      Path: passthrough,
      Gradient: empty,
    }),
  };
});
jest.mock('../WeatherIcon', () => ({
  WeatherIcon: 'WeatherIcon',
}));

const React = require('react');
const renderer = require('react-test-renderer');
const {CurrentWeatherCard} = require('../CurrentWeatherCard');

describe('CurrentWeatherCard', () => {
  it('renders the redesigned hero layout with metrics and confidence details', () => {
    const current = {
      temperature: {temperature: 22, apparent: 20},
      weatherCode: 'CLEAR',
      weatherText: 'Mostly Cloudy',
      wind: {speed: 11},
      relativeHumidity: 68,
    };
    const today = {
      day: {
        temperature: {temperature: 24},
        precipitationProbability: {total: 35},
      },
      night: {
        temperature: {temperature: 17},
      },
    };
    const confidence = {
      overall: 0.78,
      sourceCount: 2,
      sourceNames: ['NOAA', 'Open-Meteo'],
    };

    let testRenderer;

    renderer.act(() => {
      testRenderer = renderer.create(
        React.createElement(CurrentWeatherCard, {
          current,
          today,
          formatTemp: value => `${Math.round(value ?? 0)}°`,
          formatSpeed: value => `${Math.round(value ?? 0)} km/h`,
          isDaylight: true,
          isDark: true,
          confidence,
        }),
      );
    });

    const tree = testRenderer.toJSON();

    expect(tree).toMatchSnapshot();

    renderer.act(() => {
      testRenderer.unmount();
    });
  });

  it('renders the compact desktop hero without the duplicate wind/rain/humidity tiles', () => {
    const current = {
      temperature: {temperature: 22, apparent: 20},
      weatherCode: 'CLEAR',
      weatherText: 'Mostly Cloudy',
      wind: {speed: 11},
      relativeHumidity: 68,
    };
    const today = {
      day: {temperature: {temperature: 24}, precipitationProbability: {total: 35}},
      night: {temperature: {temperature: 17}},
    };

    let testRenderer;

    renderer.act(() => {
      testRenderer = renderer.create(
        React.createElement(CurrentWeatherCard, {
          current,
          today,
          formatTemp: value => `${Math.round(value ?? 0)}°`,
          formatSpeed: value => `${Math.round(value ?? 0)} km/h`,
          isDaylight: true,
          isDark: true,
          compact: true,
        }),
      );
    });

    const serialized = JSON.stringify(testRenderer.toJSON());

    // The hero stays, but the wind/rain/humidity tiles move to the
    // left-column detail squares on desktop.
    expect(serialized).toContain('Current conditions');
    expect(serialized).not.toContain('Rain chance');

    renderer.act(() => {
      testRenderer.unmount();
    });
  });
});