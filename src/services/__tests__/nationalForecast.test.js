jest.mock('axios');

const axios = require('axios');

/** Route mocked axios.get by a URL substring. */
function routeGet(routes) {
  axios.get.mockImplementation((url) => {
    for (const [fragment, data] of Object.entries(routes)) {
      if (url.includes(fragment)) return Promise.resolve({data});
    }
    return Promise.reject(new Error(`unexpected url: ${url}`));
  });
}

describe('sgService', () => {
  const {fetchSgWeather} = require('../sgService');

  beforeEach(() => jest.clearAllMocks());

  it('maps the 4-day forecast and nearest-area current conditions', async () => {
    routeGet({
      '4-day-weather-forecast': {
        items: [
          {
            forecasts: [
              {
                date: '2026-10-04',
                forecast: 'Fair and warm',
                temperature: {high: 35, low: 26},
              },
            ],
          },
        ],
      },
      '2-hour-weather-forecast': {
        items: [{forecasts: [{area: 'Ang Mo Kio', forecast: 'Fair (Day)'}]}],
        area_metadata: [
          {
            name: 'Ang Mo Kio',
            label_location: {latitude: 1.375, longitude: 103.839},
          },
        ],
      },
      'air-temperature': {
        metadata: {
          stations: [
            {id: 'S109', location: {latitude: 1.3793, longitude: 103.85}},
          ],
        },
        items: [{readings: [{station_id: 'S109', value: 27.8}]}],
      },
      'relative-humidity': {
        metadata: {
          stations: [
            {id: 'S109', location: {latitude: 1.3793, longitude: 103.85}},
          ],
        },
        items: [{readings: [{station_id: 'S109', value: 80}]}],
      },
    });

    const weather = await fetchSgWeather(1.375, 103.839);
    expect(weather.dailyForecast[0].day.temperature.temperature).toBe(35);
    expect(weather.dailyForecast[0].day.weatherCode).toBe('CLEAR');
    expect(weather.current.temperature.temperature).toBe(27.8);
    expect(weather.current.relativeHumidity).toBe(80);
  });
});

describe('hkoService', () => {
  const {fetchHkoWeather} = require('../hkoService');

  beforeEach(() => jest.clearAllMocks());

  it('maps the 9-day forecast, readings and warnings', async () => {
    routeGet({
      'dataType=fnd': {
        weatherForecast: [
          {
            forecastDate: '20261003',
            forecastWeather: 'Mainly cloudy with showers.',
            forecastMaxtemp: {value: 30},
            forecastMintemp: {value: 25},
          },
        ],
        updateTime: '2026-10-03T07:00:00+08:00',
      },
      'dataType=rhrread': {
        temperature: {data: [{place: 'Hong Kong Observatory', value: 26}]},
        humidity: {value: 93},
        uvindex: {data: [{place: "King's Park", value: 0.2}]},
      },
      'dataType=warnsum': {
        WTS: {
          name: 'Thunderstorm Warning',
          code: 'WTS',
          actionCode: 'EXTEND',
          issueTime: '2026-10-02T15:55:00+08:00',
          expireTime: '2026-10-03T09:00:00+08:00',
        },
      },
    });

    const weather = await fetchHkoWeather(22.3, 114.17);
    expect(weather.dailyForecast[0].day.temperature.temperature).toBe(30);
    expect(weather.dailyForecast[0].day.weatherCode).toBe('RAIN');
    expect(weather.current.temperature.temperature).toBe(26);
    expect(weather.alerts).toHaveLength(1);
    expect(weather.alerts[0].headline).toBe('Thunderstorm Warning');
  });
});

describe('myService', () => {
  const {fetchMyWeather} = require('../myService');

  beforeEach(() => jest.clearAllMocks());

  it('maps the district forecast by location name', async () => {
    routeGet({
      'api.data.gov.my/weather/forecast': [
        {
          location: {location_id: 'Ds001', location_name: 'Langkawi'},
          date: '2026-10-09',
          summary_forecast: 'Tiada Hujan',
          min_temp: 24,
          max_temp: 33,
        },
      ],
    });

    const weather = await fetchMyWeather(
      6.35,
      99.8,
      'Asia/Kuala_Lumpur',
      'Langkawi',
    );
    expect(weather.dailyForecast[0].day.temperature.temperature).toBe(33);
    expect(weather.dailyForecast[0].day.weatherCode).toBe('CLEAR');
  });

  it('returns null when no location name is available', async () => {
    const weather = await fetchMyWeather(6.35, 99.8);
    expect(weather).toBeNull();
    expect(axios.get).not.toHaveBeenCalled();
  });
});
