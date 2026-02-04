//
//  TempestWeatherWidgetsBundle.swift
//  TempestWeatherWidgets
//
//  Created by Andrew Ghobrial on 2/4/26.
//

import WidgetKit
import SwiftUI

@main
struct TempestWeatherWidgetsBundle: WidgetBundle {
    var body: some Widget {
        CurrentWeatherWidget()
        DailyForecastWidget()
    }
}
