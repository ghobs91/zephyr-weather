//
//  WeatherData.swift
//  ZephyrWeatherWidgets
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
    let temperatureUnit: String?
    
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
    
    private let appGroupIdentifier = "group.com.zephyrweather.shared"
    private let weatherDataKey = "weatherData"
    
    /// ISO8601 formatter that handles fractional seconds (.000Z) from JavaScript's toISOString()
    private static let iso8601WithFractionalSeconds: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss.SSSZ"
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = TimeZone(secondsFromGMT: 0)
        return formatter
    }()
    
    private static let iso8601Plain: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ssZ"
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = TimeZone(secondsFromGMT: 0)
        return formatter
    }()
    
    func loadWeatherData(for locationId: String? = nil) -> WeatherData? {
        guard let userDefaults = UserDefaults(suiteName: appGroupIdentifier) else {
            return nil
        }
        
        guard let jsonString = userDefaults.string(forKey: weatherDataKey) else {
            return nil
        }
        
        guard let data = jsonString.data(using: .utf8) else {
            return nil
        }
        
        do {
            let decoder = JSONDecoder()
            decoder.dateDecodingStrategy = .custom { decoder in
                let container = try decoder.singleValueContainer()
                let dateString = try container.decode(String.self)
                if let date = WeatherDataManager.iso8601WithFractionalSeconds.date(from: dateString) {
                    return date
                }
                if let date = WeatherDataManager.iso8601Plain.date(from: dateString) {
                    return date
                }
                throw DecodingError.dataCorruptedError(in: container, debugDescription: "Cannot decode date: \(dateString)")
            }
            
            // If a location ID is provided, try to load from the map
            if let locationId = locationId {
                // Try to decode as a map of location IDs to weather data
                if let weatherDataMap = try? decoder.decode([String: WeatherData].self, from: data) {
                    return weatherDataMap[locationId]
                }
            } else {
                // No location specified — try to decode as map and return first entry
                if let weatherDataMap = try? decoder.decode([String: WeatherData].self, from: data),
                   let firstEntry = weatherDataMap.values.first {
                    return firstEntry
                }
            }
            
            // Fallback: try to decode as a single WeatherData object (backward compatibility)
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
                dayTemp: Double.random(in: 13...24),  // Celsius (55-75°F)
                nightTemp: Double.random(in: 4...13),  // Celsius (40-55°F)
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
                temperature: Double.random(in: 7...21),  // Celsius (45-70°F)
                weatherCode: "clear",
                precipProbability: Double.random(in: 0...30),
                isDaylight: isDaylight
            )
        }
        
        return WeatherData(
            current: WeatherData.CurrentWeather(
                temperature: 18,  // Celsius (65°F)
                feelsLike: 17,  // Celsius (63°F)
                weatherCode: "partly_cloudy",
                weatherText: "Partly Cloudy",
                humidity: 55,
                windSpeed: 8,
                isDaylight: true
            ),
            daily: daily,
            hourly: hourly,
            locationName: "San Francisco",
            temperatureUnit: "fahrenheit"
        )
    }
}
