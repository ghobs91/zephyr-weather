//
//  ZephyrBackgroundRefresh.swift
//  ZephyrWeather
//
//  Registers a BGAppRefreshTask that refreshes every shared location while the
//  app is backgrounded, so pinned widgets stay current even when the user has
//  not opened the app. Complements the widget extension's own timeline fetches.
//

import Foundation

#if os(iOS) && !targetEnvironment(macCatalyst)
import BackgroundTasks

private let backgroundRefreshIdentifier = "com.zephyr.weather.refresh"

@_cdecl("ZephyrRegisterBackgroundRefresh")
func ZephyrRegisterBackgroundRefresh() {
    BGTaskScheduler.shared.register(
        forTaskWithIdentifier: backgroundRefreshIdentifier,
        using: nil
    ) { task in
        guard let refreshTask = task as? BGAppRefreshTask else {
            task.setTaskCompleted(success: false)
            return
        }
        handleBackgroundRefresh(refreshTask)
    }
}

@_cdecl("ZephyrScheduleBackgroundRefresh")
func ZephyrScheduleBackgroundRefresh() {
    let request = BGAppRefreshTaskRequest(identifier: backgroundRefreshIdentifier)
    request.earliestBeginDate = Date(timeIntervalSinceNow: 15 * 60)
    do {
        try BGTaskScheduler.shared.submit(request)
    } catch {
        print("[ZephyrBackgroundRefresh] Failed to schedule refresh: \(error)")
    }
}

private func handleBackgroundRefresh(_ task: BGAppRefreshTask) {
    // Queue the next refresh before running; only one request is kept pending.
    ZephyrScheduleBackgroundRefresh()

    let work = Task {
        let refreshed = await ZephyrWeatherFetcher.refreshAllLocations()
        if refreshed {
            ZephyrReloadAllWidgets()
        }
        task.setTaskCompleted(success: refreshed)
    }

    task.expirationHandler = {
        work.cancel()
    }
}
#else
@_cdecl("ZephyrRegisterBackgroundRefresh")
func ZephyrRegisterBackgroundRefresh() {}

@_cdecl("ZephyrScheduleBackgroundRefresh")
func ZephyrScheduleBackgroundRefresh() {}
#endif
