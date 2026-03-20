//
//  DailyForecastWidget.swift
//  ZephyrWeatherWidgets
//

import WidgetKit
import SwiftUI

struct DailyForecastProvider: AppIntentTimelineProvider {
    func placeholder(in context: Context) -> DailyForecastEntry {
        DailyForecastEntry(
            date: Date(),
            weatherData: WeatherDataManager.shared.getMockWeatherData(),
            configuration: ConfigurationAppIntent()
        )
    }
    
    func snapshot(for configuration: ConfigurationAppIntent, in context: Context) async -> DailyForecastEntry {
        let data = WeatherDataManager.shared.loadWeatherData(for: configuration.location?.id) ?? WeatherDataManager.shared.getMockWeatherData()
        return DailyForecastEntry(date: Date(), weatherData: data, configuration: configuration)
    }
    
    func timeline(for configuration: ConfigurationAppIntent, in context: Context) async -> Timeline<DailyForecastEntry> {
        let data = WeatherDataManager.shared.loadWeatherData(for: configuration.location?.id) ?? WeatherDataManager.shared.getMockWeatherData()
        let now = Date()
        let entry = DailyForecastEntry(date: now, weatherData: data, configuration: configuration)
        
        let calendar = Calendar.current
        // Refresh every 30 minutes, or exactly at midnight — whichever comes first.
        // The midnight refresh ensures day labels and filtered forecasts update
        // correctly when the date changes without waiting for the next 30-min poll.
        let thirtyMinutes = calendar.date(byAdding: .minute, value: 30, to: now)!
        let nextMidnight = calendar.nextDate(
            after: now,
            matching: DateComponents(hour: 0, minute: 0, second: 0),
            matchingPolicy: .nextTime
        ) ?? thirtyMinutes
        let nextUpdate = min(thirtyMinutes, nextMidnight)
        return Timeline(entries: [entry], policy: .after(nextUpdate))
    }
}

struct DailyForecastEntry: TimelineEntry {
    let date: Date
    let weatherData: WeatherData
    let configuration: ConfigurationAppIntent
}

struct DailyForecastWidgetView: View {
    var entry: DailyForecastProvider.Entry
    @Environment(\.widgetFamily) var family
    
    // Only show today and future days — past days may be present in cached data.
    var todayAndFutureDays: [WeatherData.DailyForecast] {
        let startOfToday = Calendar.current.startOfDay(for: Date())
        return entry.weatherData.daily.filter {
            Calendar.current.startOfDay(for: $0.date) >= startOfToday
        }
    }

    var allTemps: [Double] {
        todayAndFutureDays.flatMap { day in
            [day.dayTemp, day.nightTemp].compactMap { $0 }
        }
    }
    
    var minTemp: Double {
        allTemps.min() ?? 0
    }
    
    var maxTemp: Double {
        allTemps.max() ?? 100
    }
    
    var body: some View {
        if family == .systemMedium {
            // Compact horizontal layout for medium widget
            VStack(spacing: 4) {
                ForEach(Array(todayAndFutureDays.prefix(4).enumerated()), id: \.offset) { index, day in
                    DayRow(day: day, minTemp: minTemp, maxTemp: maxTemp, temperatureUnit: entry.weatherData.temperatureUnit ?? "fahrenheit")
                }
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 10)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .containerBackground(for: .widget) {
                LinearGradient(
                    gradient: Gradient(colors: [
                        Color(red: 0.2, green: 0.25, blue: 0.35),
                        Color(red: 0.15, green: 0.2, blue: 0.3)
                    ]),
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
            }
        } else if family == .systemExtraLarge {
            // Extra large layout for macOS - show full week with details
            HStack(spacing: 6) {
                ForEach(Array(todayAndFutureDays.prefix(7).enumerated()), id: \.offset) { index, day in
                    DayColumn(day: day, minTemp: minTemp, maxTemp: maxTemp, temperatureUnit: entry.weatherData.temperatureUnit ?? "fahrenheit")
                }
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 18)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .containerBackground(for: .widget) {
                LinearGradient(
                    gradient: Gradient(colors: [
                        Color(red: 0.2, green: 0.25, blue: 0.35),
                        Color(red: 0.15, green: 0.2, blue: 0.3)
                    ]),
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
            }
        } else {
            largeWidgetView
        }
    }

    var largeWidgetView: some View {
        let now = Date()
        let upcomingHours = entry.weatherData.hourly.filter { $0.date > now }

        return VStack(spacing: 0) {
            // Location name
            if let locationName = entry.weatherData.locationName {
                Text(locationName)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.bottom, 2)
            }

            // Current conditions
            HStack(alignment: .top, spacing: 8) {
                VStack(alignment: .leading, spacing: 1) {
                    Text(formatCurrentTemp(entry.weatherData.current?.temperature))
                        .font(.system(size: 64, weight: .thin))
                        .foregroundColor(currentTempColor(entry.weatherData.current?.temperature))
                        .minimumScaleFactor(0.6)
                        .lineLimit(1)

                    Text(entry.weatherData.current?.weatherText ?? "")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(.white.opacity(0.85))
                        .lineLimit(1)

                    if let today = todayAndFutureDays.first {
                        Text("H:\(formatTempValue(today.dayTemp))  L:\(formatTempValue(today.nightTemp))")
                            .font(.system(size: 12, weight: .regular))
                            .foregroundColor(.white.opacity(0.65))
                    }
                }

                Spacer()

                Image(largeIconName(entry.weatherData.current?.weatherCode, isDay: entry.weatherData.current?.isDaylight))
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

                            Image(largeIconName(hour.weatherCode, isDay: hour.isDaylight))
                                .resizable()
                                .aspectRatio(contentMode: .fit)
                                .frame(width: 20, height: 20)

                            Text(formatCurrentTemp(hour.temperature))
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

            // Daily forecast rows (vertical)
            VStack(spacing: 0) {
                ForEach(Array(todayAndFutureDays.prefix(5).enumerated()), id: \.offset) { _, day in
                    DayRow(
                        day: day,
                        minTemp: minTemp,
                        maxTemp: maxTemp,
                        temperatureUnit: entry.weatherData.temperatureUnit ?? "fahrenheit"
                    )
                }
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 8)
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

    func formatCurrentTemp(_ temp: Double?) -> String {
        guard let temp = temp else { return "--°" }
        let isFahrenheit = entry.weatherData.temperatureUnit == "fahrenheit"
        let displayTemp = isFahrenheit ? temp * 9 / 5 + 32 : temp
        let unit = isFahrenheit ? "°F" : "°C"
        return "\(Int(round(displayTemp)))\(unit)"
    }

    func formatTempValue(_ temp: Double?) -> String {
        guard let temp = temp else { return "--" }
        let isFahrenheit = entry.weatherData.temperatureUnit == "fahrenheit"
        let displayTemp = isFahrenheit ? temp * 9 / 5 + 32 : temp
        return "\(Int(round(displayTemp)))°"
    }

    func currentTempColor(_ temp: Double?) -> Color {
        guard let temp = temp else { return .white }
        let isFahrenheit = entry.weatherData.temperatureUnit == "fahrenheit"
        let tempF = isFahrenheit ? temp * 9 / 5 + 32 : temp
        if tempF >= 90 { return Color(red: 1.0, green: 0.3, blue: 0.3) }
        if tempF >= 80 { return Color(red: 1.0, green: 0.6, blue: 0.2) }
        if tempF >= 70 { return Color(red: 1.0, green: 0.8, blue: 0.3) }
        if tempF >= 60 { return Color(red: 0.5, green: 0.8, blue: 0.5) }
        if tempF >= 50 { return Color(red: 0.4, green: 0.7, blue: 1.0) }
        if tempF >= 40 { return Color(red: 0.5, green: 0.7, blue: 1.0) }
        if tempF >= 32 { return Color(red: 0.6, green: 0.8, blue: 1.0) }
        return Color(red: 0.7, green: 0.85, blue: 1.0)
    }

    func hourLabel(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "ha"
        return formatter.string(from: date)
    }

    func largeIconName(_ code: String?, isDay: Bool? = nil) -> String {
        return weatherIconAsset(code, isDay: isDay)
    }
    
    func weatherIconAsset(_ code: String?, isDay: Bool? = nil) -> String {
        let day = isDay ?? true
        guard let code = code, let weatherCode = WeatherCode(rawValue: code) else {
            return day ? "overcast-day" : "overcast-night"
        }
        switch weatherCode {
        case .clear: return day ? "clear" : "clear-night"
        case .partlyCloudy: return day ? "partly-cloudy" : "partly-cloudy-night"
        case .cloudy: return day ? "overcast-day" : "overcast-night"
        case .fog: return day ? "fog-day" : "fog-night"
        case .haze: return day ? "fog-day" : "fog-night"
        case .rainLight: return "drizzle"
        case .rain: return "rain"
        case .rainHeavy: return "storm"
        case .snowLight, .snow, .snowHeavy: return "snow"
        case .sleet: return "sleet"
        case .hail: return "hail"
        case .thunderstorm: return "lightning"
        case .wind: return "wind"
        }
    }
}

struct DayRow: View {
    let day: WeatherData.DailyForecast
    let minTemp: Double
    let maxTemp: Double
    let temperatureUnit: String
    
    var body: some View {
        HStack(spacing: 8) {
            // Day name
            Text(dayName(day.date))
                .font(.system(size: 13, weight: .semibold))
                .foregroundColor(.white)
                .frame(width: 38, alignment: .leading)
            
            // Weather icon
            Image(weatherIconAsset(day.dayWeatherCode))
                .resizable()
                .aspectRatio(contentMode: .fit)
                .frame(width: 22, height: 22)
            
            // Low temp (grayed out)
            Text("\(formatTempNumber(day.nightTemp))")
                .font(.system(size: 13, weight: .regular))
                .foregroundColor(.white.opacity(0.5))
                .frame(width: 26, alignment: .trailing)
            
            // Temperature bar
            HorizontalTemperatureBar(
                highTemp: day.dayTemp ?? 0,
                lowTemp: day.nightTemp ?? 0,
                minTemp: minTemp,
                maxTemp: maxTemp
            )
            
            // High temp
            Text("\(formatTempNumber(day.dayTemp))")
                .font(.system(size: 14, weight: .semibold))
                .foregroundColor(.white)
                .frame(width: 26, alignment: .trailing)
        }
        .padding(.vertical, 2)
    }
    
    func dayName(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "EEE"
        return formatter.string(from: date)
    }
    
    func formatTempNumber(_ temp: Double?) -> String {
        guard let temp = temp else { return "--" }
        let isFahrenheit = temperatureUnit == "fahrenheit"
        let displayTemp = isFahrenheit ? celsiusToFahrenheit(temp) : temp
        return "\(Int(round(displayTemp)))"
    }
    
    func celsiusToFahrenheit(_ celsius: Double) -> Double {
        return celsius * 9 / 5 + 32
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

struct HorizontalTemperatureBar: View {
    let highTemp: Double
    let lowTemp: Double
    let minTemp: Double
    let maxTemp: Double
    
    var body: some View {
        let range = maxTemp - minTemp
        let lowPercent = range > 0 ? (lowTemp - minTemp) / range : 0
        let highPercent = range > 0 ? (highTemp - minTemp) / range : 1
        
        GeometryReader { geometry in
            ZStack(alignment: .leading) {
                // Background bar
                RoundedRectangle(cornerRadius: 3)
                    .fill(Color.white.opacity(0.15))
                    .frame(height: 6)
                
                // Filled portion with gradient
                RoundedRectangle(cornerRadius: 3)
                    .fill(
                        LinearGradient(
                            gradient: Gradient(colors: [temperatureColor(lowTemp), temperatureColor(highTemp)]),
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
                    .frame(
                        width: geometry.size.width * (highPercent - lowPercent),
                        height: 6
                    )
                    .offset(x: geometry.size.width * lowPercent)
            }
        }
        .frame(height: 6)
    }
    
    func temperatureColor(_ temp: Double) -> Color {
        if temp >= 80 {
            return Color(red: 1.0, green: 0.5, blue: 0.2)
        } else if temp >= 70 {
            return Color(red: 1.0, green: 0.8, blue: 0.3)
        } else if temp >= 60 {
            return Color(red: 0.5, green: 0.8, blue: 0.5)
        } else if temp >= 50 {
            return Color(red: 0.4, green: 0.7, blue: 1.0)
        } else if temp >= 32 {
            return Color(red: 0.5, green: 0.7, blue: 1.0)
        } else {
            return Color(red: 0.6, green: 0.8, blue: 1.0)
        }
    }
}

struct DayColumn: View {
    let day: WeatherData.DailyForecast
    let minTemp: Double
    let maxTemp: Double
    let temperatureUnit: String
    
    var body: some View {
        VStack(spacing: 6) {
            // Day name
            Text(dayName(day.date))
                .font(.system(size: 13, weight: .bold))
                .foregroundColor(.white)
            
            // Weather icon
            Image(weatherIconAsset(day.dayWeatherCode))
                .resizable()
                .aspectRatio(contentMode: .fit)
                .frame(width: 38, height: 38)
                .padding(.vertical, 2)
            
            // High temp
            Text(formatTemp(day.dayTemp))
                .font(.system(size: 15, weight: .bold))
                .foregroundColor(.white)
            
            // Temperature bar
            TemperatureBar(
                highTemp: day.dayTemp ?? 0,
                lowTemp: day.nightTemp ?? 0,
                minTemp: minTemp,
                maxTemp: maxTemp
            )
            .frame(height: 50)
            
            // Low temp
            Text(formatTemp(day.nightTemp))
                .font(.system(size: 13, weight: .medium))
                .foregroundColor(.white.opacity(0.7))
            
            // Precipitation
            if let precip = day.precipProbability, precip > 0 {
                HStack(spacing: 2) {
                    Image(systemName: "drop.fill")
                        .font(.system(size: 8))
                        .foregroundColor(.blue.opacity(0.8))
                    Text("\(Int(precip))%")
                        .font(.system(size: 9, weight: .medium))
                        .foregroundColor(.blue.opacity(0.8))
                }
            } else {
                Text(" ")
                    .font(.system(size: 9))
            }
        }
        .frame(maxWidth: .infinity)
    }
    
    func dayName(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "EEE"
        return formatter.string(from: date)
    }
    
    func formatTemp(_ temp: Double?) -> String {
        guard let temp = temp else { return "--°" }
        let isFahrenheit = temperatureUnit == "fahrenheit"
        let displayTemp = isFahrenheit ? celsiusToFahrenheit(temp) : temp
        return "\(Int(round(displayTemp)))°"
    }
    
    func celsiusToFahrenheit(_ celsius: Double) -> Double {
        return celsius * 9 / 5 + 32
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

struct TemperatureBar: View {
    let highTemp: Double
    let lowTemp: Double
    let minTemp: Double
    let maxTemp: Double
    
    var body: some View {
        let range = maxTemp - minTemp
        let lowPercent = range > 0 ? (lowTemp - minTemp) / range : 0
        let highPercent = range > 0 ? (highTemp - minTemp) / range : 1
        
        GeometryReader { geometry in
            ZStack(alignment: .bottom) {
                // Background bar
                RoundedRectangle(cornerRadius: 4)
                    .fill(Color.white.opacity(0.2))
                    .frame(width: 8)
                
                // Filled portion with gradient
                RoundedRectangle(cornerRadius: 4)
                    .fill(
                        LinearGradient(
                            gradient: Gradient(colors: [temperatureColor(lowTemp), temperatureColor(highTemp)]),
                            startPoint: .bottom,
                            endPoint: .top
                        )
                    )
                    .frame(
                        width: 8,
                        height: geometry.size.height * (highPercent - lowPercent)
                    )
                    .offset(y: -geometry.size.height * lowPercent)
            }
            .frame(maxWidth: .infinity)
        }
    }
    
    func temperatureColor(_ temp: Double) -> Color {
        if temp >= 80 {
            return Color(red: 1.0, green: 0.5, blue: 0.2)
        } else if temp >= 70 {
            return Color(red: 1.0, green: 0.8, blue: 0.3)
        } else if temp >= 60 {
            return Color(red: 0.5, green: 0.8, blue: 0.5)
        } else if temp >= 50 {
            return Color(red: 0.4, green: 0.7, blue: 1.0)
        } else if temp >= 32 {
            return Color(red: 0.5, green: 0.7, blue: 1.0)
        } else {
            return Color(red: 0.6, green: 0.8, blue: 1.0)
        }
    }
}

struct DailyForecastWidget: Widget {
    let kind: String = "DailyForecastWidget"
    
    var body: some WidgetConfiguration {
        AppIntentConfiguration(kind: kind, intent: ConfigurationAppIntent.self, provider: DailyForecastProvider()) { entry in
            DailyForecastWidgetView(entry: entry)
        }
        .configurationDisplayName("Daily Forecast")
        .description("Shows 5-7 day weather forecast for a selected location")
        .supportedFamilies(supportedFamilies)
    }
    
    private var supportedFamilies: [WidgetFamily] {
        var families: [WidgetFamily] = [.systemMedium, .systemLarge]
        #if targetEnvironment(macCatalyst) || os(macOS)
        if #available(macCatalyst 17.0, macOS 14.0, *) {
            families.append(.systemExtraLarge)
        }
        #endif
        return families
    }
}
