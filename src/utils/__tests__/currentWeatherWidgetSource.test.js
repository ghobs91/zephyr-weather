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
    expect(source).toContain('let compactRowHeight: CGFloat = 20');
    expect(source).toContain('let forecastTopPadding: CGFloat = 70');
    expect(source).toContain('ZStack(alignment: .topLeading)');
    expect(source).toContain('showsDivider: index < upcomingDailyForecast.count - 1');
  });

  it('supports the large widget family for the current weather widget', () => {
    const source = fs.readFileSync(widgetPath, 'utf8');

    expect(source).toContain('[.systemSmall, .systemMedium, .systemLarge]');
    expect(source).toContain('families.append(.systemExtraLarge)');
    expect(source).toContain('family == .systemLarge || family == .systemExtraLarge');
  });
});