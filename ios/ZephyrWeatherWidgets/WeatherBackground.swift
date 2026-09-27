//
//  WeatherBackground.swift
//  ZephyrWeatherWidgets
//

import SwiftUI

/// Condition backdrop for the widget container. Asset names mirror the
/// `WeatherBg*.imageset` entries in the widget's asset catalog, matching the
/// React Native app's `weatherBackgrounds` mapping.
struct WeatherBackgroundView: View {
    let weatherCode: String?
    let isDaylight: Bool?

    private var assetName: String {
        let day = isDaylight ?? true
        guard let code = weatherCode, let weatherCode = WeatherCode(rawValue: code) else {
            return "WeatherBgOvercast"
        }

        switch weatherCode {
        case .clear:
            return day ? "WeatherBgClearDay" : "WeatherBgClearNight"
        case .partlyCloudy:
            return day ? "WeatherBgPartlyCloudyDay" : "WeatherBgPartlyCloudyNight"
        case .cloudy, .wind:
            return "WeatherBgOvercast"
        case .fog, .haze:
            return "WeatherBgFog"
        case .rainLight, .rain, .rainHeavy:
            return "WeatherBgRain"
        case .snowLight, .snow, .snowHeavy, .sleet:
            return "WeatherBgSnow"
        case .hail, .thunderstorm:
            return "WeatherBgThunderstorm"
        }
    }

    var body: some View {
        ZStack {
            Image(assetName)
                .resizable()
                .scaledToFill()

            // Legibility scrim so the white widget text stays readable over
            // bright skies (clear day, snow, fog).
            LinearGradient(
                gradient: Gradient(colors: [
                    Color.black.opacity(0.55),
                    Color.black.opacity(0.22),
                    Color.black.opacity(0.60)
                ]),
                startPoint: .top,
                endPoint: .bottom
            )
        }
    }
}
