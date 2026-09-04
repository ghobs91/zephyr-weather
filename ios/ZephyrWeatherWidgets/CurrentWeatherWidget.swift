//
//  CurrentWeatherWidget.swift
//  ZephyrWeatherWidgets
//

import WidgetKit
import SwiftUI

struct CurrentWeatherProvider: AppIntentTimelineProvider {
    func placeholder(in context: Context) -> CurrentWeatherEntry {
        CurrentWeatherEntry(
            date: Date(),
            weatherData: WeatherDataManager.shared.getMockWeatherData(),
            configuration: ConfigurationAppIntent()
        )
    }
    
    func snapshot(for configuration: ConfigurationAppIntent, in context: Context) async -> CurrentWeatherEntry {
        let data = WeatherDataManager.shared.loadWeatherData(
            for: configuration.location?.id
        ) ?? WeatherDataManager.shared.getMockWeatherData()
        return CurrentWeatherEntry(date: Date(), weatherData: data, configuration: configuration)
    }
    
    func timeline(for configuration: ConfigurationAppIntent, in context: Context) async -> Timeline<CurrentWeatherEntry> {
        let data = WeatherDataManager.shared.loadWeatherData(
            for: configuration.location?.id
        ) ?? WeatherDataManager.shared.getMockWeatherData()
        let now = Date()
        let entry = CurrentWeatherEntry(date: now, weatherData: data, configuration: configuration)
        
        let calendar = Calendar.current
        // Refresh every 15 minutes, or exactly at midnight — whichever comes first.
        // The midnight refresh ensures hourly forecasts and day labels stay current
        // when the date changes without waiting for the next 15-min poll.
        let fifteenMinutes = calendar.date(byAdding: .minute, value: 15, to: now)!
        let nextMidnight = calendar.nextDate(
            after: now,
            matching: DateComponents(hour: 0, minute: 0, second: 0),
            matchingPolicy: .nextTime
        ) ?? fifteenMinutes
        let nextUpdate = min(fifteenMinutes, nextMidnight)
        return Timeline(entries: [entry], policy: .after(nextUpdate))
    }
}

struct CurrentWeatherEntry: TimelineEntry {
    let date: Date
    let weatherData: WeatherData
    let configuration: ConfigurationAppIntent
}

struct CurrentWeatherWidgetView: View {
    var entry: CurrentWeatherProvider.Entry
    @Environment(\.widgetFamily) var family

    private var displayLocationName: String? {
        entry.configuration.location?.name ?? entry.weatherData.locationName
    }

    private var todayAndFutureDays: [WeatherData.DailyForecast] {
        let startOfToday = Calendar.current.startOfDay(for: Date())
        return entry.weatherData.daily.filter {
            Calendar.current.startOfDay(for: $0.date) >= startOfToday
        }
    }

    private var upcomingDailyForecast: [WeatherData.DailyForecast] {
        Array(todayAndFutureDays.dropFirst().prefix(4))
    }
    
    var body: some View {
        if family == .accessoryInline || family == .accessoryCircular || family == .accessoryRectangular {
            CurrentWeatherAccessoryView(data: entry.weatherData, locationName: displayLocationName)
        } else if family == .systemSmall {
            smallWidgetView
        } else if family == .systemLarge || family == .systemExtraLarge {
            largeWidgetView
        } else {
            mediumWidgetView
        }
    }
    
    var smallWidgetView: some View {
        let compactRowHeight: CGFloat = 20
        let forecastTopPadding: CGFloat = 70

        return ZStack(alignment: .topLeading) {
            // Top-left: Current temperature
            Text(formatLargeTempValue(entry.weatherData.current?.temperature))
                .font(.system(size: 52, weight: .thin))
                .foregroundColor(.white)
                .lineLimit(1)
                .minimumScaleFactor(0.5)

            // Top-right: Current conditions icon + today's high/low
            VStack(alignment: .trailing, spacing: 6) {
                Image(weatherIconAsset(entry.weatherData.current?.weatherCode, isDay: entry.weatherData.current?.isDaylight))
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .frame(width: 26, height: 26)

                if let today = todayAndFutureDays.first {
                    VStack(alignment: .trailing, spacing: 2) {
                        HStack(spacing: 2) {
                            Image(systemName: "arrow.up")
                                .font(.system(size: 9, weight: .semibold))
                            Text(formatTempValue(today.dayTemp))
                                .font(.system(size: 14, weight: .semibold))
                                .monospacedDigit()
                        }
                        .foregroundColor(.white)

                        HStack(spacing: 2) {
                            Image(systemName: "arrow.down")
                                .font(.system(size: 9, weight: .semibold))
                            Text(formatTempValue(today.nightTemp))
                                .font(.system(size: 14, weight: .semibold))
                                .monospacedDigit()
                        }
                        .foregroundColor(.white.opacity(0.68))
                    }
                }
            }
            .frame(maxWidth: .infinity, alignment: .topTrailing)
            .padding(.top, 10)

            // Bottom ~70%: Next 4 days forecast — icon only + highs/lows
            VStack(spacing: 0) {
                ForEach(Array(upcomingDailyForecast.enumerated()), id: \.offset) { index, day in
                    SmallForecastRow(
                        day: day,
                        temperatureUnit: entry.weatherData.temperatureUnit ?? "fahrenheit",
                        rowHeight: compactRowHeight,
                        showsDivider: index < upcomingDailyForecast.count - 1
                    )
                }
            }
            .padding(.top, forecastTopPadding)
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        }
        .padding(.horizontal, 14)
        .padding(.top, 8)
        .padding(.bottom, 8)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .containerBackground(for: .widget) {
            LinearGradient(
                gradient: Gradient(colors: [
                    Color(red: 0.15, green: 0.2, blue: 0.3),
                    Color(red: 0.1, green: 0.15, blue: 0.25)
                ]),
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        }
    }
    
    var mediumWidgetView: some View {
        HStack(spacing: 16) {
            // Left side - Temperature
            VStack(alignment: .leading, spacing: 4) {
                Text(formatTemp(entry.weatherData.current?.temperature))
                    .font(.system(size: 56, weight: .thin))
                    .foregroundColor(temperatureColor(entry.weatherData.current?.temperature))
                    .minimumScaleFactor(0.6)
                    .lineLimit(1)
                
                if let today = entry.weatherData.daily.first {
                    Text("\(formatTemp(today.dayTemp)) • \(formatTemp(today.nightTemp))")
                        .font(.system(size: 13, weight: .regular))
                        .foregroundColor(.white.opacity(0.7))
                        .minimumScaleFactor(0.8)
                        .lineLimit(1)
                }
            }
            
            Spacer(minLength: 8)
            
            // Right side - Icon and Condition
            VStack(alignment: .trailing, spacing: 6) {
                Image(weatherIconAsset(entry.weatherData.current?.weatherCode, isDay: entry.weatherData.current?.isDaylight))
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .frame(width: 70, height: 70)
                
                Text(entry.weatherData.current?.weatherText ?? "Unknown")
                    .font(.system(size: 15, weight: .medium))
                    .foregroundColor(.white.opacity(0.9))
                    .lineLimit(2)
                    .minimumScaleFactor(0.8)
                    .multilineTextAlignment(.trailing)
            }
        }
        .padding(14)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .containerBackground(for: .widget) {
            LinearGradient(
                gradient: Gradient(colors: [
                    Color(red: 0.15, green: 0.2, blue: 0.3),
                    Color(red: 0.1, green: 0.15, blue: 0.25)
                ]),
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        }
    }
    
    var largeWidgetView: some View {
        let allTemps = todayAndFutureDays.flatMap { [$0.dayTemp, $0.nightTemp].compactMap { $0 } }
        let minTemp = allTemps.min() ?? 0
        let maxTemp = allTemps.max() ?? 100
        let now = Date()
        let upcomingHours = entry.weatherData.hourly.filter { $0.date > now }

        return VStack(spacing: 0) {
            // Location name
            if let displayLocationName = displayLocationName {
                Text(displayLocationName)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.bottom, 2)
            }

            // Current conditions
            HStack(alignment: .top, spacing: 8) {
                VStack(alignment: .leading, spacing: 1) {
                    Text(formatTemp(entry.weatherData.current?.temperature))
                        .font(.system(size: 64, weight: .thin))
                        .foregroundColor(temperatureColor(entry.weatherData.current?.temperature))
                        .minimumScaleFactor(0.6)
                        .lineLimit(1)

                    Text(entry.weatherData.current?.weatherText ?? "Unknown")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(.white.opacity(0.85))
                        .lineLimit(1)

                    if let today = todayAndFutureDays.first {
                        Text("H:\(formatTemp(today.dayTemp))  L:\(formatTemp(today.nightTemp))")
                            .font(.system(size: 12, weight: .regular))
                            .foregroundColor(.white.opacity(0.65))
                    }
                }

                Spacer()

                Image(weatherIconAsset(entry.weatherData.current?.weatherCode, isDay: entry.weatherData.current?.isDaylight))
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .frame(width: 68, height: 68)
            }
            .padding(.bottom, 6)

            Divider()
                .background(Color.white.opacity(0.25))
                .padding(.bottom, 5)

            // Hourly forecast row
            if !upcomingHours.isEmpty {
                HStack(spacing: 0) {
                    ForEach(Array(upcomingHours.prefix(6).enumerated()), id: \.offset) { _, hour in
                        VStack(spacing: 2) {
                            Text(hourLabel(hour.date))
                                .font(.system(size: 10, weight: .medium))
                                .foregroundColor(.white.opacity(0.65))

                            Image(weatherIconAsset(hour.weatherCode, isDay: hour.isDaylight))
                                .resizable()
                                .aspectRatio(contentMode: .fit)
                                .frame(width: 20, height: 20)

                            Text(formatTemp(hour.temperature))
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundColor(.white)
                        }
                        .frame(maxWidth: .infinity)
                    }
                }
                .padding(.bottom, 5)
            }

            Divider()
                .background(Color.white.opacity(0.25))
                .padding(.bottom, 3)

            // Daily forecast rows
            VStack(spacing: 0) {
                ForEach(Array(todayAndFutureDays.prefix(3).enumerated()), id: \.offset) { _, day in
                    DayRow(
                        day: day,
                        minTemp: minTemp,
                        maxTemp: maxTemp,
                        temperatureUnit: entry.weatherData.temperatureUnit ?? "fahrenheit"
                    )
                }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .containerBackground(for: .widget) {
            LinearGradient(
                gradient: Gradient(colors: [
                    Color(red: 0.15, green: 0.2, blue: 0.3),
                    Color(red: 0.1, green: 0.15, blue: 0.25)
                ]),
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        }
    }
    
    func hourLabel(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "ha"
        return formatter.string(from: date)
    }
    
    func formatTemp(_ temp: Double?) -> String {
        guard let temp = temp else { return "--°" }
        
        let isFahrenheit = entry.weatherData.temperatureUnit == "fahrenheit"
        // Shared-container temps arrive pre-converted to the user's unit
        // (see widgetManager.createWidgetWeatherData) — format only.
        let displayTemp = temp
        let unit = isFahrenheit ? "°F" : "°C"
        
        return "\(Int(round(displayTemp)))\(unit)"
    }

    func formatTempValue(_ temp: Double?) -> String {
        guard let temp = temp else { return "--°" }

        return "\(Int(round(temp)))°"
    }

    func formatLargeTempValue(_ temp: Double?) -> String {
        guard let temp = temp else { return "--°" }

        return "\(Int(round(temp)))°"
    }
    
    func temperatureColor(_ temp: Double?) -> Color {
        guard let temp = temp else { return .white }
        
        // Thresholds are Fahrenheit-scale: convert only when the stored
        // (display-unit) value is Celsius.
        let isFahrenheit = entry.weatherData.temperatureUnit == "fahrenheit"
        let tempF = isFahrenheit ? temp : temp * 9 / 5 + 32
        
        if tempF >= 90 {
            return Color(red: 1.0, green: 0.3, blue: 0.3)
        } else if tempF >= 80 {
            return Color(red: 1.0, green: 0.6, blue: 0.2)
        } else if tempF >= 70 {
            return Color(red: 1.0, green: 0.8, blue: 0.3)
        } else if tempF >= 60 {
            return Color(red: 0.5, green: 0.8, blue: 0.5)
        } else if tempF >= 50 {
            return Color(red: 0.4, green: 0.7, blue: 1.0)
        } else if tempF >= 40 {
            return Color(red: 0.5, green: 0.7, blue: 1.0)
        } else if tempF >= 32 {
            return Color(red: 0.6, green: 0.8, blue: 1.0)
        } else {
            return Color(red: 0.7, green: 0.85, blue: 1.0)
        }
    }
    
    func weatherIconAsset(_ code: String?, isDay: Bool? = nil) -> String {
        let day = isDay ?? true
        guard let code = code, let weatherCode = WeatherCode(rawValue: code) else {
            return day ? "overcast-day" : "overcast-night"
        }
        
        switch weatherCode {
        case .clear:
            return day ? "clear" : "clear-night"
        case .partlyCloudy:
            return day ? "partly-cloudy" : "partly-cloudy-night"
        case .cloudy:
            return day ? "overcast-day" : "overcast-night"
        case .fog:
            return day ? "fog-day" : "fog-night"
        case .haze:
            return day ? "fog-day" : "fog-night"
        case .rainLight:
            return "drizzle"
        case .rain:
            return "rain"
        case .rainHeavy:
            return "storm"
        case .snowLight, .snow, .snowHeavy:
            return "snow"
        case .sleet:
            return "sleet"
        case .hail:
            return "hail"
        case .thunderstorm:
            return "lightning"
        case .wind:
            return "wind"
        }
    }
}

struct SmallForecastRow: View {
    let day: WeatherData.DailyForecast
    let temperatureUnit: String
    let rowHeight: CGFloat
    let showsDivider: Bool

    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 8) {
                // Weather icon only — no day name
                Image(weatherIconAsset(day.dayWeatherCode))
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .frame(width: 22, height: 22)

                Spacer(minLength: 4)

                // Low temp (dimmed)
                Text(formatTemp(day.nightTemp))
                    .font(.system(size: 13, weight: .medium))
                    .monospacedDigit()
                    .foregroundColor(.white.opacity(0.55))
                    .frame(width: 28, alignment: .trailing)

                // High temp
                Text(formatTemp(day.dayTemp))
                    .font(.system(size: 13, weight: .semibold))
                    .monospacedDigit()
                    .foregroundColor(.white)
                    .frame(width: 28, alignment: .trailing)
            }
            .frame(height: rowHeight, alignment: .center)

            if showsDivider {
                Divider()
                    .overlay(Color.white.opacity(0.12))
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    func formatTemp(_ temp: Double?) -> String {
        guard let temp = temp else { return "--" }
        return "\(Int(round(temp)))"
    }

    func weatherIconAsset(_ code: String?) -> String {
        guard let code = code, let weatherCode = WeatherCode(rawValue: code) else {
            return "overcast-day"
        }

        switch weatherCode {
        case .clear:
            return "clear"
        case .partlyCloudy:
            return "partly-cloudy"
        case .cloudy, .fog, .haze:
            return "overcast-day"
        case .rainLight:
            return "drizzle"
        case .rain:
            return "rain"
        case .rainHeavy:
            return "storm"
        case .snowLight, .snow, .snowHeavy:
            return "snow"
        case .sleet:
            return "sleet"
        case .hail:
            return "hail"
        case .thunderstorm:
            return "lightning"
        case .wind:
            return "wind"
        }
    }
}

struct CurrentWeatherWidget: Widget {
    let kind: String = "CurrentWeatherWidget"
    
    var body: some WidgetConfiguration {
        AppIntentConfiguration(kind: kind, intent: ConfigurationAppIntent.self, provider: CurrentWeatherProvider()) { entry in
            CurrentWeatherWidgetView(entry: entry)
        }
        .configurationDisplayName("Current Weather")
        .description("Shows current temperature and conditions for a selected location")
        .supportedFamilies(supportedFamilies)
    }
    
    private var supportedFamilies: [WidgetFamily] {
        var families: [WidgetFamily] = [.systemSmall, .systemMedium, .systemLarge]
        if #available(iOS 15.0, macOS 12.0, *) {
            families.append(.systemExtraLarge)
        }
        if #available(iOS 16.0, *) {
            // Lock Screen families (also what StandBy offers on iPhone).
            families.append(.accessoryInline)
            families.append(.accessoryCircular)
            families.append(.accessoryRectangular)
        }
        return families
    }
}
