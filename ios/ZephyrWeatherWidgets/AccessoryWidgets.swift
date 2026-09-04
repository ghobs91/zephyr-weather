//
//  AccessoryWidgets.swift
//  ZephyrWeatherWidgets
//
//  Lock Screen widgets (.accessoryInline / .accessoryCircular /
//  .accessoryRectangular, iOS 16+). Accessory views use SF Symbols and
//  system-provided backgrounds — no custom gradients.
//
//  Temperature contract: shared-container values arrive pre-converted to
//  the user's display unit (see widgetManager.createWidgetWeatherData),
//  so these views format only and never convert.
//

import SwiftUI
import WidgetKit

private func accessoryTemp(_ temp: Double?) -> String {
    guard let temp else { return "--°" }
    return "\(Int(round(temp)))°"
}

private func accessorySymbol(_ code: String?) -> String {
    guard let code, let weatherCode = WeatherCode(rawValue: code) else {
        return "cloud.fill"
    }
    return weatherCode.sfSymbol
}

private func accessoryDayName(_ date: Date) -> String {
    let formatter = DateFormatter()
    formatter.dateFormat = "EEE"
    return formatter.string(from: date)
}

// MARK: - Current weather accessory

struct CurrentWeatherAccessoryView: View {
    var data: WeatherData
    var locationName: String?
    @Environment(\.widgetFamily) var family

    private var temp: String { accessoryTemp(data.current?.temperature) }

    private var highLow: String {
        guard let today = data.daily.first else { return "" }
        return "H:\(accessoryTemp(today.dayTemp)) L:\(accessoryTemp(today.nightTemp))"
    }

    var body: some View {
        switch family {
        case .accessoryInline:
            Text("\(temp) \(data.current?.weatherText ?? "")")
        case .accessoryCircular:
            ZStack {
                AccessoryWidgetBackground()
                VStack(spacing: 0) {
                    Image(systemName: accessorySymbol(data.current?.weatherCode))
                        .font(.system(size: 16))
                    Text(temp)
                        .font(.system(size: 18, weight: .semibold))
                        .widgetAccentable()
                }
            }
        default:
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    if let locationName {
                        Text(locationName)
                            .font(.system(size: 12))
                    }
                    Text(temp)
                        .font(.system(size: 28, weight: .semibold))
                    Text(highLow)
                        .font(.system(size: 12))
                }
                Spacer()
                Image(systemName: accessorySymbol(data.current?.weatherCode))
                    .font(.system(size: 32))
            }
        }
    }
}

// MARK: - Daily forecast accessory

struct DailyForecastAccessoryView: View {
    var data: WeatherData
    @Environment(\.widgetFamily) var family

    private var upcomingDays: [WeatherData.DailyForecast] {
        let startOfToday = Calendar.current.startOfDay(for: Date())
        return Array(data.daily.filter {
            Calendar.current.startOfDay(for: $0.date) >= startOfToday
        }.prefix(3))
    }

    var body: some View {
        switch family {
        case .accessoryInline:
            if let today = upcomingDays.first {
                Text("H:\(accessoryTemp(today.dayTemp)) L:\(accessoryTemp(today.nightTemp))")
            } else {
                Text("No forecast")
            }
        default:
            HStack(spacing: 0) {
                ForEach(Array(upcomingDays.enumerated()), id: \.offset) { _, day in
                    VStack(spacing: 2) {
                        Text(accessoryDayName(day.date))
                            .font(.system(size: 10, weight: .medium))
                        Image(systemName: accessorySymbol(day.dayWeatherCode))
                            .font(.system(size: 16))
                        Text(accessoryTemp(day.dayTemp))
                            .font(.system(size: 12, weight: .semibold))
                    }
                    .frame(maxWidth: .infinity)
                }
            }
        }
    }
}
