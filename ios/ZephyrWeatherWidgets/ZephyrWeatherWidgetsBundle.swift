//
//  ZephyrWeatherWidgetsBundle.swift
//  ZephyrWeatherWidgets
//
//  Created by Andrew Ghobrial on 2/4/26.
//

import WidgetKit
import SwiftUI

@main
struct ZephyrWeatherWidgetsBundle: WidgetBundle {
    var body: some Widget {
        CurrentWeatherWidget()
        DailyForecastWidget()
    }
}
