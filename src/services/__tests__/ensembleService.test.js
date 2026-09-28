const {combineEnsemble} = require('../ensembleService');

function member(code, temp, date) {
  return {
    current: {weatherCode: code, weatherText: code},
    hourlyForecast: [
      {date, weatherCode: code, temperature: {temperature: temp}},
    ],
    dailyForecast: [
      {
        date,
        day: {
          weatherCode: code,
          weatherText: code,
          temperature: {temperature: temp},
        },
        night: {weatherCode: code, weatherText: code},
      },
    ],
  };
}

const DATE = new Date('2026-09-29T12:00:00.000Z');

describe('combineEnsemble weather-code weighting', () => {
  it('lets a doubly-weighted source win a 2-2 tie', () => {
    const result = combineEnsemble([
      {name: 'Open-Meteo', weather: member('CLOUDY', 20, DATE)},
      {name: 'Met.no', weather: member('CLOUDY', 22, DATE)},
      {name: 'NWS', weather: member('CLEAR', 24, DATE), weight: 2},
    ]);

    expect(result.current.weatherCode).toBe('CLEAR');
    expect(result.dailyForecast[0].day.weatherCode).toBe('CLEAR');
    expect(result.dailyForecast[0].night.weatherCode).toBe('CLEAR');
    expect(result.hourlyForecast[0].weatherCode).toBe('CLEAR');
  });

  it('still lets a strict majority of lighter sources win', () => {
    const result = combineEnsemble([
      {name: 'A', weather: member('CLOUDY', 20, DATE)},
      {name: 'B', weather: member('CLOUDY', 20, DATE)},
      {name: 'C', weather: member('CLEAR', 20, DATE)},
    ]);

    expect(result.dailyForecast[0].day.weatherCode).toBe('CLOUDY');
  });

  it('averages numeric fields regardless of weight', () => {
    const result = combineEnsemble([
      {name: 'Open-Meteo', weather: member('CLOUDY', 20, DATE)},
      {name: 'Met.no', weather: member('CLOUDY', 22, DATE)},
      {name: 'NWS', weather: member('CLEAR', 24, DATE), weight: 2},
    ]);

    expect(result.hourlyForecast[0].temperature.temperature).toBeCloseTo(22);
  });
});
