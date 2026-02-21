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
        let data = WeatherDataManager.shared.loadWeatherData(for: configuration.location?.id) ?? WeatherDataManager.shared.getMockWeatherData()
        return CurrentWeatherEntry(date: Date(), weatherData: data, configuration: configuration)
    }
    
    func timeline(for configuration: ConfigurationAppIntent, in context: Context) async -> Timeline<CurrentWeatherEntry> {
        let data = WeatherDataManager.shared.loadWeatherData(for: configuration.location?.id) ?? WeatherDataManager.shared.getMockWeatherData()
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
    
    var body: some View {
        if family == .systemSmall {
            smallWidgetView
        } else if family == .systemLarge {
            largeWidgetView
        } else {
            mediumWidgetView
        }
    }
    
    var smallWidgetView: some View {
        VStack(spacing: 8) {
            // Weather Icon
            Image(weatherIconAsset(entry.weatherData.current?.weatherCode))
                .resizable()
                .aspectRatio(contentMode: .fit)
                .frame(width: 60, height: 60)
            
            // Current Temperature
            Text(formatTemp(entry.weatherData.current?.temperature))
                .font(.system(size: 44, weight: .thin))
                .foregroundColor(temperatureColor(entry.weatherData.current?.temperature))
                .minimumScaleFactor(0.5)
                .lineLimit(1)
            
            // Weather condition
            Text(entry.weatherData.current?.weatherText ?? "Unknown")
                .font(.system(size: 12, weight: .medium))
                .foregroundColor(.white.opacity(0.9))
                .lineLimit(1)
                .minimumScaleFactor(0.8)
            
            // Day/Night temps
            if let today = entry.weatherData.daily.first {
                HStack(spacing: 4) {
                    Text(formatTemp(today.dayTemp))
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundColor(.white.opacity(0.8))
                    Text("•")
                        .font(.system(size: 11))
                        .foregroundColor(.white.opacity(0.5))
                    Text(formatTemp(today.nightTemp))
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundColor(.white.opacity(0.6))
                }
                .lineLimit(1)
                .minimumScaleFactor(0.8)
            }
        }
        .padding(12)
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
                Image(weatherIconAsset(entry.weatherData.current?.weatherCode))
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
        VStack(spacing: 12) {
            // Top section - Current conditions
            HStack(spacing: 16) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(formatTemp(entry.weatherData.current?.temperature))
                        .font(.system(size: 64, weight: .thin))
                        .foregroundColor(temperatureColor(entry.weatherData.current?.temperature))
                        .minimumScaleFactor(0.5)
                        .lineLimit(1)
                    
                    Text(entry.weatherData.current?.weatherText ?? "Unknown")
                        .font(.system(size: 18, weight: .medium))
                        .foregroundColor(.white.opacity(0.9))
                        .lineLimit(2)
                    
                    if let today = entry.weatherData.daily.first {
                        Text("H: \(formatTemp(today.dayTemp))  L: \(formatTemp(today.nightTemp))")
                            .font(.system(size: 14, weight: .regular))
                            .foregroundColor(.white.opacity(0.7))
                    }
                }
                
                Spacer()
                
                Image(weatherIconAsset(entry.weatherData.current?.weatherCode))
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .frame(width: 90, height: 90)
            }
            
            Divider()
                .background(Color.white.opacity(0.2))
            
            // Details grid
            HStack(spacing: 16) {
                if let humidity = entry.weatherData.current?.humidity {
                    VStack(spacing: 4) {
                        Image(systemName: "humidity.fill")
                            .font(.system(size: 16))
                            .foregroundColor(.blue.opacity(0.8))
                        Text("\(Int(humidity))%")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundColor(.white)
                        Text("Humidity")
                            .font(.system(size: 11))
                            .foregroundColor(.white.opacity(0.6))
                    }
                    .frame(maxWidth: .infinity)
                }
                
                if let windSpeed = entry.weatherData.current?.windSpeed {
                    VStack(spacing: 4) {
                        Image(systemName: "wind")
                            .font(.system(size: 16))
                            .foregroundColor(.cyan.opacity(0.8))
                        Text("\(Int(windSpeed)) km/h")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundColor(.white)
                        Text("Wind")
                            .font(.system(size: 11))
                            .foregroundColor(.white.opacity(0.6))
                    }
                    .frame(maxWidth: .infinity)
                }
                
                if let feelsLike = entry.weatherData.current?.feelsLike {
                    VStack(spacing: 4) {
                        Image(systemName: "thermometer.medium")
                            .font(.system(size: 16))
                            .foregroundColor(.orange.opacity(0.8))
                        Text(formatTemp(feelsLike))
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundColor(.white)
                        Text("Feels Like")
                            .font(.system(size: 11))
                            .foregroundColor(.white.opacity(0.6))
                    }
                    .frame(maxWidth: .infinity)
                }
            }
            
            Divider()
                .background(Color.white.opacity(0.2))
            
            // Upcoming hours — filter out any hours already in the past
            if !entry.weatherData.hourly.isEmpty {
                let now = Date()
                let upcomingHours = entry.weatherData.hourly.filter { $0.date > now }
                HStack(spacing: 0) {
                    ForEach(Array(upcomingHours.prefix(6).enumerated()), id: \.offset) { index, hour in
                        VStack(spacing: 4) {
                            Text(hourLabel(hour.date))
                                .font(.system(size: 11, weight: .medium))
                                .foregroundColor(.white.opacity(0.7))
                            
                            Image(weatherIconAsset(hour.weatherCode))
                                .resizable()
                                .aspectRatio(contentMode: .fit)
                                .frame(width: 24, height: 24)
                            
                            Text(formatTemp(hour.temperature))
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundColor(.white)
                        }
                        .frame(maxWidth: .infinity)
                    }
                }
            }
        }
        .padding(16)
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
    
    func hourLabel(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "ha"
        return formatter.string(from: date)
    }
    
    func formatTemp(_ temp: Double?) -> String {
        guard let temp = temp else { return "--°" }
        
        let isFahrenheit = entry.weatherData.temperatureUnit == "fahrenheit"
        let displayTemp = isFahrenheit ? celsiusToFahrenheit(temp) : temp
        let unit = isFahrenheit ? "°F" : "°C"
        
        return "\(Int(round(displayTemp)))\(unit)"
    }
    
    func celsiusToFahrenheit(_ celsius: Double) -> Double {
        return celsius * 9 / 5 + 32
    }
    
    func temperatureColor(_ temp: Double?) -> Color {
        guard let temp = temp else { return .white }
        
        // Temperature color based on Fahrenheit scale
        let isFahrenheit = entry.weatherData.temperatureUnit == "fahrenheit"
        let tempF = isFahrenheit ? celsiusToFahrenheit(temp) : temp
        
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
    
    func weatherIconAsset(_ code: String?) -> String {
        guard let code = code, let weatherCode = WeatherCode(rawValue: code) else {
            return "cloudy"
        }
        
        switch weatherCode {
        case .clear:
            return "clear"
        case .partlyCloudy:
            return "partly-cloudy"
        case .cloudy, .fog, .haze:
            return "cloudy"
        case .rainLight, .rain:
            return "rain"
        case .rainHeavy:
            return "storm"
        case .snowLight, .snow, .snowHeavy, .sleet, .hail:
            return "snow"
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
        var families: [WidgetFamily] = [.systemSmall, .systemMedium]
        #if targetEnvironment(macCatalyst) || os(macOS)
        if #available(macCatalyst 17.0, macOS 14.0, *) {
            families.append(.systemLarge)
        }
        #endif
        return families
    }
}
