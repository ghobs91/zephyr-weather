//
//  CurrentWeatherWidget.swift
//  TempestWeatherWidgets
//

import WidgetKit
import SwiftUI

struct CurrentWeatherProvider: TimelineProvider {
    func placeholder(in context: Context) -> CurrentWeatherEntry {
        CurrentWeatherEntry(
            date: Date(),
            weatherData: WeatherDataManager.shared.getMockWeatherData()
        )
    }
    
    func getSnapshot(in context: Context, completion: @escaping (CurrentWeatherEntry) -> Void) {
        let data = WeatherDataManager.shared.loadWeatherData() ?? WeatherDataManager.shared.getMockWeatherData()
        let entry = CurrentWeatherEntry(date: Date(), weatherData: data)
        completion(entry)
    }
    
    func getTimeline(in context: Context, completion: @escaping (Timeline<CurrentWeatherEntry>) -> Void) {
        let data = WeatherDataManager.shared.loadWeatherData() ?? WeatherDataManager.shared.getMockWeatherData()
        let entry = CurrentWeatherEntry(date: Date(), weatherData: data)
        
        // Update every 15 minutes
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 15, to: Date())!
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        completion(timeline)
    }
}

struct CurrentWeatherEntry: TimelineEntry {
    let date: Date
    let weatherData: WeatherData
}

struct CurrentWeatherWidgetView: View {
    var entry: CurrentWeatherProvider.Entry
    @Environment(\.widgetFamily) var family
    
    var body: some View {
        ZStack {
            LinearGradient(
                gradient: Gradient(colors: [
                    Color(red: 0.15, green: 0.2, blue: 0.3),
                    Color(red: 0.1, green: 0.15, blue: 0.25)
                ]),
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            
            VStack(spacing: 0) {
                HStack(alignment: .top, spacing: 0) {
                    // Temperature
                    VStack(alignment: .leading, spacing: 0) {
                        Text(formatTemp(entry.weatherData.current?.temperature))
                            .font(.system(size: family == .systemMedium ? 56 : 72, weight: .thin))
                            .foregroundColor(temperatureColor(entry.weatherData.current?.temperature))
                            .minimumScaleFactor(0.5)
                    }
                    
                    Spacer()
                    
                    // Weather Icon and Condition
                    VStack(alignment: .trailing, spacing: 4) {
                        Image(weatherIconAsset(entry.weatherData.current?.weatherCode))
                            .resizable()
                            .aspectRatio(contentMode: .fit)
                            .frame(width: family == .systemMedium ? 60 : 80, height: family == .systemMedium ? 60 : 80)
                        
                        Text(entry.weatherData.current?.weatherText ?? "Unknown")
                            .font(.system(size: family == .systemMedium ? 13 : 16, weight: .regular))
                            .foregroundColor(.white.opacity(0.9))
                            .lineLimit(2)
                            .multilineTextAlignment(.trailing)
                    }
                }
                .padding(.horizontal, family == .systemMedium ? 12 : 16)
                .padding(.top, family == .systemMedium ? 12 : 16)
                
                Spacer()
                
                // Day/Night temps
                if let today = entry.weatherData.daily.first {
                    HStack(spacing: 4) {
                        Text("Day: \(formatTemp(today.dayTemp)) • Night: \(formatTemp(today.nightTemp))")
                            .font(.system(size: family == .systemMedium ? 12 : 14, weight: .regular))
                            .foregroundColor(.white.opacity(0.7))
                    }
                    .padding(.horizontal, family == .systemMedium ? 12 : 16)
                    .padding(.bottom, family == .systemMedium ? 12 : 16)
                }
            }
        }
        .containerBackground(for: .widget) {
            Color.clear
        }
    }
    
    func formatTemp(_ temp: Double?) -> String {
        guard let temp = temp else { return "--°" }
        return "\(Int(round(temp)))°F"
    }
    
    func temperatureColor(_ temp: Double?) -> Color {
        guard let temp = temp else { return .white }
        
        if temp >= 90 {
            return Color(red: 1.0, green: 0.3, blue: 0.3)
        } else if temp >= 80 {
            return Color(red: 1.0, green: 0.6, blue: 0.2)
        } else if temp >= 70 {
            return Color(red: 1.0, green: 0.8, blue: 0.3)
        } else if temp >= 60 {
            return Color(red: 0.5, green: 0.8, blue: 0.5)
        } else if temp >= 50 {
            return Color(red: 0.4, green: 0.7, blue: 1.0)
        } else if temp >= 40 {
            return Color(red: 0.5, green: 0.7, blue: 1.0)
        } else if temp >= 32 {
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
        StaticConfiguration(kind: kind, provider: CurrentWeatherProvider()) { entry in
            CurrentWeatherWidgetView(entry: entry)
        }
        .configurationDisplayName("Current Weather")
        .description("Shows current temperature and conditions")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
