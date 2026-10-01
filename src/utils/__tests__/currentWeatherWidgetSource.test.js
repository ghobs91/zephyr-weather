const fs = require('fs');
const path = require('path');

describe('CurrentWeatherWidget source', () => {
  const widgetPath = path.join(
    process.cwd(),
    'ios',
    'ZephyrWeatherWidgets',
    'CurrentWeatherWidget.swift',
  );

  it('keeps the small widget focused on the next 4 forecast days after today', () => {
    const source = fs.readFileSync(widgetPath, 'utf8');

    expect(source).toContain('Array(todayAndFutureDays.dropFirst().prefix(4))');
    expect(source).toContain('SmallForecastRow');
    expect(source).toContain('todayAndFutureDays.first');
    expect(source).toContain('let compactRowHeight: CGFloat = 17');
    expect(source).toContain('VStack(alignment: .leading, spacing: 0)');
    expect(source).not.toContain('forecastTopPadding');
    expect(source).toContain('showsDivider: index < upcomingDailyForecast.count - 1');
  });

  it('shows the location name, day names, and high-temp degree symbol in the small widget', () => {
    const source = fs.readFileSync(widgetPath, 'utf8');

    expect(source).toContain('displayLocationName');
    expect(source).toContain('formatter.dateFormat = "EEE"');
    expect(source).toContain('func formatHighTemp(_ temp: Double?) -> String');
    expect(source).toContain('return "\\(Int(round(temp)))°"');
  });

  it('shows the next 5 days (not today) in the large widget', () => {
    const source = fs.readFileSync(widgetPath, 'utf8');

    expect(source).toContain(
      'Array(todayAndFutureDays.dropFirst().prefix(5).enumerated())',
    );
    expect(source).not.toContain('todayAndFutureDays.prefix(3)');
  });

  it('supports the large widget family for the current weather widget', () => {
    const source = fs.readFileSync(widgetPath, 'utf8');

    expect(source).toContain('[.systemSmall, .systemMedium, .systemLarge]');
    expect(source).toContain('families.append(.systemExtraLarge)');
    expect(source).toContain('family == .systemLarge || family == .systemExtraLarge');
  });

  it('refreshes widget data from the widget process itself', () => {
    const widgetsDir = path.join(process.cwd(), 'ios', 'ZephyrWeatherWidgets');
    const fetcher = fs.readFileSync(
      path.join(widgetsDir, 'ZephyrWeatherFetcher.swift'),
      'utf8',
    );

    for (const file of ['CurrentWeatherWidget.swift', 'DailyForecastWidget.swift']) {
      const source = fs.readFileSync(path.join(widgetsDir, file), 'utf8');
      expect(source).toContain('await ZephyrWeatherFetcher.refreshWeather(');
    }

    expect(fetcher).toContain('api.open-meteo.com');
    expect(fetcher).toContain('saveWeatherData');
  });
});