//
//  DailyForecastWidget.swift
//  TempestWeatherWidgets
//

import WidgetKit
import SwiftUI

struct DailyForecastProvider: TimelineProvider {
    func placeholder(in context: Context) -> DailyForecastEntry {
        DailyForecastEntry(
            date: Date(),
            weatherData: WeatherDataManager.shared.getMockWeatherData()
        )
    }
    
    func getSnapshot(in context: Context, completion: @escaping (DailyForecastEntry) -> Void) {
        let data = WeatherDataManager.shared.loadWeatherData() ?? WeatherDataManager.shared.getMockWeatherData()
        let entry = DailyForecastEntry(date: Date(), weatherData: data)
        completion(entry)
    }
    
    func getTimeline(in context: Context, completion: @escaping (Timeline<DailyForecastEntry>) -> Void) {
        let data = WeatherDataManager.shared.loadWeatherData() ?? WeatherDataManager.shared.getMockWeatherData()
        let entry = DailyForecastEntry(date: Date(), weatherData: data)
        
        // Update every 30 minutes
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 30, to: Date())!
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        completion(timeline)
    }
}

struct DailyForecastEntry: TimelineEntry {
    let date: Date
    let weatherData: WeatherData
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
            VStack(spacing: 3) {
                ForEach(Array(entry.weatherData.daily.prefix(5).enumerated()), id: \.offset) { index, day in
                    DayRow(day: day, minTemp: minTemp, maxTemp: maxTemp)
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
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
            HStack(spacing: 4) {
                ForEach(Array(entry.weatherData.daily.prefix(7).enumerated()), id: \.offset) { index, day in
                    DayColumn(day: day, minTemp: minTemp, maxTemp: maxTemp)
                }
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 16)
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
    
    var body: some View {
        HStack(spacing: 8) {
            // Day name
            Text(dayName(day.date))
                .font(.system(size: 13, weight: .medium))
                .foregroundColor(.white)
                .frame(width: 36, alignment: .leading)
            
            // Weather icon
            Image(weatherIconAsset(day.dayWeatherCode))
                .resizable()
                .aspectRatio(contentMode: .fit)
                .frame(width: 28, height: 28)
            
            // Low temp (grayed out)
            Text("\(formatTempNumber(day.nightTemp))")
                .font(.system(size: 13, weight: .regular))
                .foregroundColor(.white.opacity(0.5))
                .frame(width: 24, alignment: .trailing)
            
            // Temperature bar
            HorizontalTemperatureBar(
                highTemp: day.dayTemp ?? 0,
                lowTemp: day.nightTemp ?? 0,
                minTemp: minTemp,
                maxTemp: maxTemp
            )
            
            // High temp
            Text("\(formatTempNumber(day.dayTemp))")
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(.white)
                .frame(width: 24, alignment: .trailing)
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
        return "\(Int(round(temp)))"
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
                RoundedRectangle(cornerRadius: 2)
                    .fill(Color.white.opacity(0.15))
                    .frame(height: 4)
                
                // Filled portion with gradient
                RoundedRectangle(cornerRadius: 2)
                    .fill(
                        LinearGradient(
                            gradient: Gradient(colors: [temperatureColor(lowTemp), temperatureColor(highTemp)]),
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
                    .frame(
                        width: geometry.size.width * (highPercent - lowPercent),
                        height: 4
                    )
                    .offset(x: geometry.size.width * lowPercent)
            }
        }
        .frame(height: 4)
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
    
    var body: some View {
        VStack(spacing: 4) {
            // Day name
            Text(dayName(day.date))
                .font(.system(size: 12, weight: .semibold))
                .foregroundColor(.white)
            
            // Weather icon
            Image(weatherIconAsset(day.dayWeatherCode))
                .resizable()
                .aspectRatio(contentMode: .fit)
                .frame(width: 36, height: 36)
                .padding(.vertical, 4)
            
            // High temp
            Text(formatTemp(day.dayTemp))
                .font(.system(size: 14, weight: .semibold))
                .foregroundColor(.white)
            
            // Temperature bar
            TemperatureBar(
                highTemp: day.dayTemp ?? 0,
                lowTemp: day.nightTemp ?? 0,
                minTemp: minTemp,
                maxTemp: maxTemp
            )
            .frame(height: 40)
            
            // Low temp
            Text(formatTemp(day.nightTemp))
                .font(.system(size: 12))
                .foregroundColor(.white.opacity(0.7))
            
            // Precipitation
            if let precip = day.precipProbability, precip > 0 {
                HStack(spacing: 2) {
                    Image(systemName: "drop.fill")
                        .font(.system(size: 9))
                        .foregroundColor(.blue.opacity(0.8))
                    Text("\(Int(precip))%")
                        .font(.system(size: 10))
                        .foregroundColor(.blue.opacity(0.8))
                }
            } else {
                Text(" ")
                    .font(.system(size: 10))
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
        return "\(Int(round(temp)))°"
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
                RoundedRectangle(cornerRadius: 3)
                    .fill(Color.white.opacity(0.2))
                    .frame(width: 6)
                
                // Filled portion with gradient
                RoundedRectangle(cornerRadius: 3)
                    .fill(
                        LinearGradient(
                            gradient: Gradient(colors: [temperatureColor(lowTemp), temperatureColor(highTemp)]),
                            startPoint: .bottom,
                            endPoint: .top
                        )
                    )
                    .frame(
                        width: 6,
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
        StaticConfiguration(kind: kind, provider: DailyForecastProvider()) { entry in
            DailyForecastWidgetView(entry: entry)
        }
        .configurationDisplayName("Daily Forecast")
        .description("Shows 5-7 day weather forecast")
        .supportedFamilies([.systemMedium, .systemLarge])
    }
}
