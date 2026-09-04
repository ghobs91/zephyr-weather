import Foundation

// ActivityKit ships in the macOS SDK but its types are explicitly
// unavailable there, so gate on platform — canImport() is NOT enough.
#if os(iOS) && !targetEnvironment(macCatalyst)
import ActivityKit

/// Must stay structurally identical to the copy in the widget extension
/// (ZephyrLiveActivity.swift). Display strings arrive preformatted.
///
/// The app target still deploys iOS 15.0, so everything touching
/// ActivityKit (16.2+ for the request/update shapes used here) is gated:
/// the struct and helper carry @available, and each entry point checks
/// availability at runtime (returning false below 16.2 — the TS side
/// treats that as "unsupported" and the Settings toggle is hidden there).
@available(iOS 16.2, *)
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

private struct LivePayload {
    var locationId: String
    var temperature: String
    var weatherText: String
    var highTemp: String
    var lowTemp: String
    var locationName: String
    var sfSymbol: String
}

private func parsePayload(_ json: String) -> LivePayload? {
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
    return LivePayload(
        locationId: locationId,
        temperature: temperature,
        weatherText: weatherText,
        highTemp: highTemp,
        lowTemp: lowTemp,
        locationName: locationName,
        sfSymbol: sfSymbol
    )
}

@available(iOS 16.2, *)
private func makeContentState(_ payload: LivePayload) -> ZephyrLiveAttributes.ContentState {
    ZephyrLiveAttributes.ContentState(
        temperature: payload.temperature,
        weatherText: payload.weatherText,
        highTemp: payload.highTemp,
        lowTemp: payload.lowTemp,
        locationName: payload.locationName,
        sfSymbol: payload.sfSymbol
    )
}

@available(iOS 16.2, *)
private func currentLiveActivity() -> Activity<ZephyrLiveAttributes>? {
    Activity<ZephyrLiveAttributes>.activities.first
}

/// Exported with C linkage so ZephyrWidgetBridge.m can call without the
/// generated Swift header (same pattern as ZephyrReloadAllWidgets).
@_cdecl("ZephyrLiveActivityStart")
func ZephyrLiveActivityStart(_ jsonPtr: UnsafePointer<CChar>?) -> Bool {
    guard #available(iOS 16.2, *) else {
        NSLog("[ZephyrLiveActivity] start: requires iOS 16.2+")
        return false
    }
    guard let jsonPtr, let json = String(validatingUTF8: jsonPtr),
          let payload = parsePayload(json) else {
        NSLog("[ZephyrLiveActivity] start: invalid payload")
        return false
    }
    if currentLiveActivity() != nil {
        return ZephyrLiveActivityUpdate(jsonPtr)
    }
    let state = makeContentState(payload)
    var ok = false
    let sem = DispatchSemaphore(value: 0)
    Task {
        do {
            _ = try await Activity.request(
                attributes: ZephyrLiveAttributes(locationId: payload.locationId),
                content: .init(
                    state: state,
                    staleDate: Date().addingTimeInterval(liveStaleInterval)
                ),
                pushType: nil
            )
            ok = true
        } catch {
            NSLog("[ZephyrLiveActivity] start failed: %@", "\(error)")
        }
        sem.signal()
    }
    _ = sem.wait(timeout: .now() + 5)
    return ok
}

@_cdecl("ZephyrLiveActivityUpdate")
func ZephyrLiveActivityUpdate(_ jsonPtr: UnsafePointer<CChar>?) -> Bool {
    guard #available(iOS 16.2, *) else { return false }
    guard let jsonPtr, let json = String(validatingUTF8: jsonPtr),
          let payload = parsePayload(json) else {
        NSLog("[ZephyrLiveActivity] update: invalid payload")
        return false
    }
    guard let activity = currentLiveActivity() else { return false }
    let state = makeContentState(payload)
    var ok = false
    let sem = DispatchSemaphore(value: 0)
    Task {
        await activity.update(.init(
            state: state,
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
    guard #available(iOS 16.2, *) else { return
    }
    guard let activity = currentLiveActivity() else { return }
    Task {
        await activity.end(nil, dismissalPolicy: .default)
    }
}

@_cdecl("ZephyrLiveActivityIsActive")
func ZephyrLiveActivityIsActive() -> Bool {
    guard #available(iOS 16.2, *) else { return false }
    return currentLiveActivity() != nil
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
