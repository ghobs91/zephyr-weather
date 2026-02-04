//
//  WeatherData.swift
//  TempestWeatherWidgets
//

import Foundation

enum WeatherCode: String, Codable {
    case clear = "clear"
    case partlyCloudy = "partly_cloudy"
    case cloudy = "cloudy"
    case fog = "fog"
    case haze = "haze"
    case rainLight = "rain_light"
    case rain = "rain"
    case rainHeavy = "rain_heavy"
    case snowLight = "snow_light"
    case snow = "snow"
    case snowHeavy = "snow_heavy"
    case sleet = "sleet"
    case hail = "hail"
    case thunderstorm = "thunderstorm"
    case wind = "wind"
    
    var sfSymbol: String {
        switch self {
        case .clear:
            return "sun.max.fill"
        case .partlyCloudy:
            return "cloud.sun.fill"
        case .cloudy:
            return "cloud.fill"
        case .fog, .haze:
            return "cloud.fog.fill"
        case .rainLight:
            return "cloud.drizzle.fill"
        case .rain:
            return "cloud.rain.fill"
        case .rainHeavy:
            return "cloud.heavyrain.fill"
        case .snowLight, .snow:
            return "cloud.snow.fill"
        case .snowHeavy:
            return "snowflake"
        case .sleet, .hail:
            return "cloud.sleet.fill"
        case .thunderstorm:
            return "cloud.bolt.rain.fill"
        case .wind:
            return "wind"
        }
    }
}

struct WeatherData: Codable {
    let current: CurrentWeather?
    let daily: [DailyForecast]
    let hourly: [HourlyForecast]
    let locationName: String?
    
    struct CurrentWeather: Codable {
        let temperature: Double?
        let feelsLike: Double?
        let weatherCode: String?
        let weatherText: String?
        let humidity: Double?
        let windSpeed: Double?
        let isDaylight: Bool?
    }
    
    struct DailyForecast: Codable {
        let date: Date
        let dayTemp: Double?
        let nightTemp: Double?
        let dayWeatherCode: String?
        let nightWeatherCode: String?
        let dayWeatherText: String?
        let precipProbability: Double?
    }
    
    struct HourlyForecast: Codable {
        let date: Date
        let temperature: Double?
        let weatherCode: String?
        let precipProbability: Double?
        let isDaylight: Bool?
    }
}

class WeatherDataManager {
    static let shared = WeatherDataManager()
    
    private let appGroupIdentifier = "group.com.tempestweather.shared"
    
    func loadWeatherData() -> WeatherData? {
        guard let containerURL = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: appGroupIdentifier) else {
            return nil
        }
        
        let fileURL = containerURL.appendingPathComponent("weatherData.json")
        
        guard FileManager.default.fileExists(atPath: fileURL.path) else {
            return nil
        }
        
        do {
            let data = try Data(contentsOf: fileURL)
            let decoder = JSONDecoder()
            decoder.dateDecodingStrategy = .iso8601
            return try decoder.decode(WeatherData.self, from: data)
        } catch {
            print("Error loading weather data: \(error)")
            return nil
        }
    }
    
    func getMockWeatherData() -> WeatherData {
        let now = Date()
        let calendar = Calendar.current
        
        let daily = (0..<7).map { dayOffset -> WeatherData.DailyForecast in
            let date = calendar.date(byAdding: .day, value: dayOffset, to: now)!
            return WeatherData.DailyForecast(
                date: date,
                dayTemp: Double.random(in: 55...75),
                nightTemp: Double.random(in: 40...55),
                dayWeatherCode: ["clear", "partly_cloudy", "cloudy", "rain"].randomElement()!,
                nightWeatherCode: "clear",
                dayWeatherText: ["Sunny", "Partly Cloudy", "Cloudy", "Rainy"].randomElement()!,
                precipProbability: Double.random(in: 0...50)
            )
        }
        
        let hourly = (0..<24).map { hourOffset -> WeatherData.HourlyForecast in
            let date = calendar.date(byAdding: .hour, value: hourOffset, to: now)!
            let hour = calendar.component(.hour, from: date)
            let isDaylight = hour >= 6 && hour < 20
            return WeatherData.HourlyForecast(
                date: date,
                temperature: Double.random(in: 45...70),
                weatherCode: "clear",
                precipProbability: Double.random(in: 0...30),
                isDaylight: isDaylight
            )
        }
        
        return WeatherData(
            current: WeatherData.CurrentWeather(
                temperature: 65,
                feelsLike: 63,
                weatherCode: "partly_cloudy",
                weatherText: "Partly Cloudy",
                humidity: 55,
                windSpeed: 8,
                isDaylight: true
            ),
            daily: daily,
            hourly: hourly,
            locationName: "San Francisco"
        )
    }
}
