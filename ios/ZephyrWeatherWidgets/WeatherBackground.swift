//
//  WeatherBackground.swift
//  ZephyrWeatherWidgets
//

import SwiftUI

/// Clean, neutral widget backdrop.
///
/// The condition photo backdrops (`WeatherBg*`) are reserved for the in-app
/// sky; widgets use a simple surface so they read like standard system
/// widgets. The subtle vertical gradient keeps the white widget text legible
/// in both light and dark appearances.
struct WeatherBackgroundView: View {
    var body: some View {
        LinearGradient(
            gradient: Gradient(colors: [
                Color(red: 0.17, green: 0.18, blue: 0.22),
                Color(red: 0.09, green: 0.10, blue: 0.13)
            ]),
            startPoint: .top,
            endPoint: .bottom
        )
    }
}
