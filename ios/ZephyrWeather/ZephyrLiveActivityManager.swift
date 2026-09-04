import Foundation

// ActivityKit ships in the macOS SDK but its types are explicitly
// unavailable there, so gate on platform — canImport() is NOT enough.
#if os(iOS) && !targetEnvironment(macCatalyst)
import ActivityKit

/// Must stay structurally identical to the copy in the widget extension
/// (ZephyrLiveActivity.swift). Display strings arrive preformatted.
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

private let liveStaleInterval: TimeInterval = 3600

private func parsePayload(_ json: String) -> (locationId: String, state: ZephyrLiveAttributes.ContentState)? {
    guard let data = json.data(using: .utf8),
          let obj = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
          let locationId = obj["locationId"] as? String,
          let temperature = obj["temperature"] as? String,
          let weatherText = obj["weatherText"] as? String,
          let highTemp = obj["highTemp"] as? String,
          let lowTemp = obj["lowTemp"] as? String,
          let locationName = obj["locationName"] as? String,
          let sfSymbol = obj["sfSymbol"] as? String else {
        return nil
    }
    return (locationId, ZephyrLiveAttributes.ContentState(
        temperature: temperature,
        weatherText: weatherText,
        highTemp: highTemp,
        lowTemp: lowTemp,
        locationName: locationName,
        sfSymbol: sfSymbol
    ))
}

private func currentLiveActivity() -> Activity<ZephyrLiveAttributes>? {
    Activity<ZephyrLiveAttributes>.activities.first
}

/// Exported with C linkage so ZephyrWidgetBridge.m can call without the
/// generated Swift header (same pattern as ZephyrReloadAllWidgets).
@_cdecl("ZephyrLiveActivityStart")
func ZephyrLiveActivityStart(_ jsonPtr: UnsafePointer<CChar>?) -> Bool {
    guard let jsonPtr, let json = String(validatingUTF8: jsonPtr),
          let payload = parsePayload(json) else {
        NSLog("[ZephyrLiveActivity] start: invalid payload")
        return false
    }
    if currentLiveActivity() != nil {
        return ZephyrLiveActivityUpdate(jsonPtr)
    }
    do {
        _ = try Activity.request(
            attributes: ZephyrLiveAttributes(locationId: payload.locationId),
            content: .init(
                state: payload.state,
                staleDate: Date().addingTimeInterval(liveStaleInterval)
            ),
            pushType: nil
        )
        return true
    } catch {
        NSLog("[ZephyrLiveActivity] start failed: %@", "\(error)")
        return false
    }
}

@_cdecl("ZephyrLiveActivityUpdate")
func ZephyrLiveActivityUpdate(_ jsonPtr: UnsafePointer<CChar>?) -> Bool {
    guard let jsonPtr, let json = String(validatingUTF8: jsonPtr),
          let payload = parsePayload(json) else {
        NSLog("[ZephyrLiveActivity] update: invalid payload")
        return false
    }
    guard let activity = currentLiveActivity() else { return false }
    var ok = false
    let sem = DispatchSemaphore(value: 0)
    Task {
        await activity.update(.init(
            state: payload.state,
            staleDate: Date().addingTimeInterval(liveStaleInterval)
        ))
        ok = true
        sem.signal()
    }
    _ = sem.wait(timeout: .now() + 5)
    return ok
}

@_cdecl("ZephyrLiveActivityEnd")
func ZephyrLiveActivityEnd() {
    guard let activity = currentLiveActivity() else { return }
    Task {
        await activity.end(nil, dismissalPolicy: .default)
    }
}

@_cdecl("ZephyrLiveActivityIsActive")
func ZephyrLiveActivityIsActive() -> Bool {
    currentLiveActivity() != nil
}

#else

// Mac Catalyst (and any platform without ActivityKit): stubs so the
// ObjC bridge links everywhere. All no-ops.

@_cdecl("ZephyrLiveActivityStart")
func ZephyrLiveActivityStart(_ jsonPtr: UnsafePointer<CChar>?) -> Bool { false }

@_cdecl("ZephyrLiveActivityUpdate")
func ZephyrLiveActivityUpdate(_ jsonPtr: UnsafePointer<CChar>?) -> Bool { false }

@_cdecl("ZephyrLiveActivityEnd")
func ZephyrLiveActivityEnd() {}

@_cdecl("ZephyrLiveActivityIsActive")
func ZephyrLiveActivityIsActive() -> Bool { false }

#endif
