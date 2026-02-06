//
//  DailyForecastWidget.swift
//  TempestWeatherWidgets
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
        let entry = DailyForecastEntry(date: Date(), weatherData: data, configuration: configuration)
        
        // Update every 30 minutes
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 30, to: Date())!
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
    
    var allTemps: [Double] {
        entry.weatherData.daily.flatMap { day in
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
                ForEach(Array(entry.weatherData.daily.prefix(4).enumerated()), id: \.offset) { index, day in
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
        } else {
            // Vertical column layout for large widget
            HStack(spacing: 3) {
                ForEach(Array(entry.weatherData.daily.prefix(7).enumerated()), id: \.offset) { index, day in
                    DayColumn(day: day, minTemp: minTemp, maxTemp: maxTemp, temperatureUnit: entry.weatherData.temperatureUnit ?? "fahrenheit")
                }
            }
            .padding(.horizontal, 10)
            .padding(.vertical, 14)
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
                .font(.system(size: 14, weight: .semibold))
                .foregroundColor(.white)
                .frame(width: 40, alignment: .leading)
            
            // Weather icon
            Image(weatherIconAsset(day.dayWeatherCode))
                .resizable()
                .aspectRatio(contentMode: .fit)
                .frame(width: 30, height: 30)
            
            // Low temp (grayed out)
            Text("\(formatTempNumber(day.nightTemp))")
                .font(.system(size: 14, weight: .regular))
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
                .font(.system(size: 15, weight: .semibold))
                .foregroundColor(.white)
                .frame(width: 26, alignment: .trailing)
        }
        .padding(.vertical, 3)
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
        .supportedFamilies([.systemMedium, .systemLarge])
    }
}
