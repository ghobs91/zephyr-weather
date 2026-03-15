import WidgetKit

/// Exported with C linkage so ZephyrWidgetBridge.m can call it directly
/// without needing to import the ZephyrWeather-Swift.h generated header.
@_cdecl("ZephyrReloadAllWidgets")
func ZephyrReloadAllWidgets() {
    if #available(iOS 14.0, *) {
        WidgetCenter.shared.reloadAllTimelines()
    }
}
