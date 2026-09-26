//
//  ZephyrWeatherFetcher.swift
//  ZephyrWeatherWidgets
//
//  Lets the widget extension (and the app's background refresh task) fetch
//  fresh weather from Open-Meteo without waiting for the app to be opened.
//  This file is compiled into both targets, so it must not import WidgetKit.
//

import Foundation
import os.log

enum ZephyrWeatherFetcher {
    /// Skip a network request when the cached record was written this recently.
    /// Open-Meteo refreshes roughly every 15 minutes; 10 avoids duplicate
    /// fetches when both widgets refresh close together.
    static let freshnessInterval: TimeInterval = 10 * 60

    /// Short-timeout session so a slow network never stalls the timeline.
    private static let session: URLSession = {
        let configuration = URLSessionConfiguration.default
        configuration.timeoutIntervalForRequest = 10
        configuration.timeoutIntervalForResource = 15
        return URLSession(configuration: configuration)
    }()

    /// Fetch (or return cached) weather for a configured widget location.
    /// Returns nil only when there is no location to fetch and no cache.
    static func refreshWeather(for locationId: String?) async -> WeatherData? {
        let locations = WeatherDataManager.shared.loadLocations()
        let location: SharedLocation?
        if let locationId {
            location = locations.first { $0.id == locationId }
        } else {
            location = locations.first
        }

        let cached = WeatherDataManager.shared.loadWeatherData(for: locationId)

        guard let location, let latitude = location.latitude, let longitude = location.longitude else {
            return cached
        }

        if let cached, let updated = cached.lastUpdated,
           Date().timeIntervalSince(updated) < freshnessInterval {
            return cached
        }

        let unit = WeatherDataManager.shared.loadTemperatureUnit()
            ?? cached?.temperatureUnit
            ?? "fahrenheit"

        do {
            let fresh = try await fetchOpenMeteo(
                latitude: latitude,
                longitude: longitude,
                timezone: location.timezone,
                unit: unit,
                locationName: location.name
            )
            WeatherDataManager.shared.saveWeatherData(fresh, for: location.id)
            return fresh
        } catch {
            os_log(
                "[ZephyrWeatherFetcher] refresh failed: %{public}@",
                type: .error,
                String(describing: error)
            )
            return cached
        }
    }

    /// Refresh every shared location that has coordinates. Used by the app's
    /// BGAppRefreshTask so all pinned widgets have current data in the morning.
    @discardableResult
    static func refreshAllLocations() async -> Bool {
        let locations = WeatherDataManager.shared.loadLocations()
        guard !locations.isEmpty else { return false }

        var refreshedAny = false
        for location in locations where location.latitude != nil && location.longitude != nil {
            if await refreshWeather(for: location.id) != nil {
                refreshedAny = true
            }
        }
        return refreshedAny
    }

    // MARK: - Open-Meteo

    private enum FetchError: Error, CustomStringConvertible {
        case invalidURL
        case badStatus(Int)

        var description: String {
            switch self {
            case .invalidURL:
                return "invalid Open-Meteo URL"
            case .badStatus(let status):
                return "Open-Meteo responded with status \(status)"
            }
        }
    }

    private static func fetchOpenMeteo(
        latitude: Double,
        longitude: Double,
        timezone: String?,
        unit: String,
        locationName: String
    ) async throws -> WeatherData {
        var components = URLComponents(string: "https://api.open-meteo.com/v1/forecast")!
        components.queryItems = [
            URLQueryItem(name: "latitude", value: String(latitude)),
            URLQueryItem(name: "longitude", value: String(longitude)),
            URLQueryItem(name: "timezone", value: timezone ?? "auto"),
            URLQueryItem(name: "current", value: "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m"),
            URLQueryItem(name: "hourly", value: "temperature_2m,weather_code,precipitation_probability,is_day"),
            URLQueryItem(name: "daily", value: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max"),
            URLQueryItem(name: "forecast_days", value: "10"),
        ]

        guard let url = components.url else { throw FetchError.invalidURL }

        let (data, response) = try await session.data(from: url)
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            throw FetchError.badStatus((response as? HTTPURLResponse)?.statusCode ?? -1)
        }

        let decoded = try JSONDecoder().decode(OpenMeteoResponse.self, from: data)
        // Open-Meteo returns location-local wall-clock times (no offset). The
        // widgets render labels and filter hours in the device timezone, so
        // parse them as device-local to keep the displayed hours/days correct.
        return buildWeatherData(decoded, unit: unit, timeZone: .current, locationName: locationName)
    }

    private static func buildWeatherData(
        _ response: OpenMeteoResponse,
        unit: String,
        timeZone: TimeZone,
        locationName: String
    ) -> WeatherData {
        let current: WeatherData.CurrentWeather? = response.current.map { current in
            let code = mapWeatherCode(current.weather_code)
            return WeatherData.CurrentWeather(
                temperature: toUnit(current.temperature_2m, unit: unit),
                feelsLike: toUnit(current.apparent_temperature, unit: unit),
                weatherCode: code.rawValue,
                weatherText: description(for: code),
                humidity: current.relative_humidity_2m,
                windSpeed: current.wind_speed_10m,
                isDaylight: current.is_day == 1
            )
        }

        let daily: [WeatherData.DailyForecast] = {
            guard let daily = response.daily else { return [] }
            return daily.time.enumerated().prefix(10).map { index, time in
                let date = parse(time, timeZone: timeZone, format: "yyyy-MM-dd") ?? Date()
                let code = mapWeatherCode(value(daily.weather_code, at: index))
                return WeatherData.DailyForecast(
                    date: date,
                    dayTemp: toUnit(value(daily.temperature_2m_max, at: index), unit: unit),
                    nightTemp: toUnit(value(daily.temperature_2m_min, at: index), unit: unit),
                    dayWeatherCode: code.rawValue,
                    nightWeatherCode: nil,
                    dayWeatherText: description(for: code),
                    precipProbability: value(daily.precipitation_probability_max, at: index)
                )
            }
        }()

        let hourly: [WeatherData.HourlyForecast] = {
            guard let hourly = response.hourly else { return [] }
            let parsed: [WeatherData.HourlyForecast] = hourly.time.enumerated().compactMap { index, time in
                guard let date = parse(time, timeZone: timeZone, format: "yyyy-MM-dd'T'HH:mm") else {
                    return nil
                }
                return WeatherData.HourlyForecast(
                    date: date,
                    temperature: toUnit(value(hourly.temperature_2m, at: index), unit: unit),
                    weatherCode: mapWeatherCode(value(hourly.weather_code, at: index)).rawValue,
                    precipProbability: value(hourly.precipitation_probability, at: index),
                    isDaylight: value(hourly.is_day, at: index) == 1
                )
            }

            let now = Date()
            let startOfHour = Calendar.current.date(
                bySettingHour: Calendar.current.component(.hour, from: now),
                minute: 0,
                second: 0,
                of: now
            ) ?? now
            return Array(parsed.filter { $0.date >= startOfHour }.prefix(48))
        }()

        return WeatherData(
            current: current,
            daily: daily,
            hourly: hourly,
            locationName: locationName,
            temperatureUnit: unit,
            lastUpdated: Date()
        )
    }

    // MARK: - Helpers

    private static func parse(_ string: String, timeZone: TimeZone, format: String) -> Date? {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = timeZone
        formatter.dateFormat = format
        return formatter.date(from: string)
    }

    private static func value<T>(_ array: [T?]?, at index: Int) -> T? {
        guard let array, array.indices.contains(index) else { return nil }
        return array[index]
    }

    private static func toUnit(_ celsius: Double?, unit: String) -> Double? {
        guard let celsius else { return nil }
        return unit == "celsius"
            ? celsius.rounded()
            : (celsius * 9 / 5 + 32).rounded()
    }

    /// WMO interpretation codes → Zephyr WeatherCode (mirrors openMeteoService.ts).
    private static func mapWeatherCode(_ code: Int?) -> WeatherCode {
        guard let code else { return .clear }
        switch code {
        case 0:
            return .clear
        case 1, 2:
            return .partlyCloudy
        case 3:
            return .cloudy
        case 45, 48:
            return .fog
        case 51, 53, 56:
            return .rainLight
        case 55, 57, 61, 63, 66:
            return .rain
        case 65, 67:
            return .rainHeavy
        case 71, 73, 77:
            return .snowLight
        case 75:
            return .snow
        case 85, 86:
            return .snowHeavy
        case 80, 81, 82:
            return .rain
        case 95, 96, 99:
            return .thunderstorm
        default:
            return .clear
        }
    }

    private static func description(for code: WeatherCode) -> String {
        switch code {
        case .clear:
            return "Clear sky"
        case .partlyCloudy:
            return "Partly cloudy"
        case .cloudy:
            return "Cloudy"
        case .rainLight:
            return "Light rain"
        case .rain:
            return "Rain"
        case .rainHeavy:
            return "Heavy rain"
        case .snowLight:
            return "Light snow"
        case .snow:
            return "Snow"
        case .snowHeavy:
            return "Heavy snow"
        case .sleet:
            return "Sleet"
        case .hail:
            return "Hail"
        case .thunderstorm:
            return "Thunderstorm"
        case .fog:
            return "Fog"
        case .haze:
            return "Haze"
        case .wind:
            return "Windy"
        }
    }
}

// MARK: - Open-Meteo response

private struct OpenMeteoResponse: Decodable {
    let current: Current?
    let hourly: Hourly?
    let daily: Daily?

    struct Current: Decodable {
        let time: String
        let temperature_2m: Double?
        let relative_humidity_2m: Double?
        let apparent_temperature: Double?
        let is_day: Int?
        let weather_code: Int?
        let wind_speed_10m: Double?
    }

    struct Hourly: Decodable {
        let time: [String]
        let temperature_2m: [Double?]?
        let weather_code: [Int?]?
        let precipitation_probability: [Double?]?
        let is_day: [Int?]?
    }

    struct Daily: Decodable {
        let time: [String]
        let weather_code: [Int?]?
        let temperature_2m_max: [Double?]?
        let temperature_2m_min: [Double?]?
        let precipitation_probability_max: [Double?]?
    }
}
