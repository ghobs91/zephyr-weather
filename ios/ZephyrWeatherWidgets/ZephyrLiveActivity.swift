//
//  ZephyrLiveActivity.swift
//  ZephyrWeatherWidgets
//
//  Live Activity for current conditions (Lock Screen banner +
//  Dynamic Island). Started/updated/ended from the app via
//  ZephyrLiveActivityManager (ActivityKit, local only — no push).
//
//  IMPORTANT: ZephyrLiveAttributes must stay structurally identical to
//  the copy in the app target (ZephyrLiveActivityManager.swift).
//  All display strings arrive preformatted from TypeScript.
//

import ActivityKit
import WidgetKit
import SwiftUI

struct ZephyrLiveAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        var temperature: String
        var weatherText: String
        var highTemp: String
        var lowTemp: String
        var locationName: String
        var sfSymbol: String
    }

    var locationId: String
}

struct ZephyrLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: ZephyrLiveAttributes.self) { context in
            // Lock Screen banner
            HStack(spacing: 12) {
                Image(systemName: context.state.sfSymbol)
                    .font(.system(size: 40))
                VStack(alignment: .leading, spacing: 2) {
                    Text(context.state.locationName)
                        .font(.system(size: 13, weight: .semibold))
                    HStack(alignment: .firstTextBaseline, spacing: 6) {
                        Text(context.state.temperature)
                            .font(.system(size: 34, weight: .semibold))
                        Text(context.state.weatherText)
                            .font(.system(size: 14))
                    }
                    Text("H:\(context.state.highTemp)  L:\(context.state.lowTemp)")
                        .font(.system(size: 12))
                        .foregroundStyle(.secondary)
                }
                Spacer()
            }
            .padding()
            .activityBackgroundTint(Color(red: 0.1, green: 0.15, blue: 0.25))
            .activitySystemActionForegroundColor(.white)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    HStack(spacing: 8) {
                        Image(systemName: context.state.sfSymbol)
                            .font(.system(size: 28))
                        Text(context.state.temperature)
                            .font(.system(size: 28, weight: .semibold))
                    }
                }
                DynamicIslandExpandedRegion(.trailing) {
                    VStack(alignment: .trailing, spacing: 2) {
                        Text(context.state.weatherText)
                            .font(.system(size: 13, weight: .medium))
                        Text("H:\(context.state.highTemp) L:\(context.state.lowTemp)")
                            .font(.system(size: 12))
                            .foregroundStyle(.secondary)
                    }
                }
                DynamicIslandExpandedRegion(.bottom) {
                    Text(context.state.locationName)
                        .font(.system(size: 12))
                        .foregroundStyle(.secondary)
                }
            } compactLeading: {
                HStack(spacing: 4) {
                    Image(systemName: context.state.sfSymbol)
                    Text(context.state.temperature)
                        .font(.system(size: 14, weight: .semibold))
                }
            } compactTrailing: {
                Text("H:\(context.state.highTemp)")
                    .font(.system(size: 13, weight: .medium))
            } minimal: {
                Image(systemName: context.state.sfSymbol)
            }
            .keylineTint(.white)
        }
    }
}
