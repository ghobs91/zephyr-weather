# macOS Catalyst Setup Guide

Zephyr Weather now supports macOS via Mac Catalyst, including macOS-native widget functionality in Notification Center.

## What's New

- ✅ Full macOS Catalyst support
- ✅ macOS widgets in Notification Center
- ✅ Native macOS window sizing and behavior
- ✅ App Sandbox for Mac App Store distribution
- ✅ Shared App Group data between app and widgets on macOS
- ✅ Native macOS two-column layout with sidebar and detail view
- ✅ Location search accessible from sidebar
- ✅ Settings accessible from sidebar
- ✅ Optimized for mouse/trackpad navigation

## Prerequisites

- macOS 13.0 or later (for development)
- Xcode 14.0 or later
- Mac with Apple Silicon or Intel processor
- CocoaPods installed (`sudo gem install cocoapods`)
- Node.js 18+ and npm/yarn

## Building for macOS

### 1. Install Dependencies

```bash
# Install npm dependencies
npm install

# Install iOS/macOS Pods
cd ios
pod install
cd ..
```

### 2. Build and Run on macOS

**Option A: Using Xcode**

1. Open the workspace:
   ```bash
   open ios/ZephyrWeather.xcworkspace
   ```

2. In Xcode's toolbar, select:
   - Scheme: `ZephyrWeather`
   - Destination: `My Mac (Designed for iPad)`

3. Click Run (⌘R) or Product → Run

**Option B: Using React Native CLI**

```bash
# Run on macOS Catalyst
npx react-native run-ios --scheme ZephyrWeather --destination "platform=macOS,variant=Mac Catalyst"
```

## Widget Setup on macOS

### Adding Widgets to Notification Center

1. Run the Zephyr Weather app on macOS
2. Add and configure your weather locations in the app
3. Right-click on the desktop and select "Edit Widgets"
4. Search for "Zephyr Weather"
5. Drag the desired widget to Notification Center:
   - **Current Weather**: Small, Medium, or Large sizes
   - **Daily Forecast**: Medium, Large, or Extra Large sizes

### Widget Features

- **Current Weather Widget**
  - Small: Temperature, condition icon, high/low temps
  - Medium: Expanded current conditions
  - Large: Full details with humidity, wind, feels-like, and hourly forecast

- **Daily Forecast Widget**
  - Medium: 4-day horizontal forecast
  - Large: 7-day vertical forecast with temperature bars
  - Extra Large (macOS only): Full 7-day forecast with enhanced spacing

### Widget Configuration

Widgets can be configured to show different locations:
1. Right-click on a widget in Notification Center
2. Select "Edit Widget"
3. Choose from your saved locations

## macOS-Specific Features

### Two-Column Layout

The macOS version features a native desktop layout inspired by macOS Weather:

**Left Sidebar (200px)**:
- Search bar at the top for quick location search
- List of all saved locations with:
  - Location name
  - "Home" badge for current location
  - Current time
  - Large temperature display
  - Current weather condition
  - High/Low temperatures
- Settings button at the bottom

**Main Detail View**:
- Full weather information for the selected location
- Location name displayed in the top-right corner with "HOME" badge
- Current conditions, hourly forecast, daily forecast
- All Open Settings (via sidebar button)
- Click location in sidebar to switch
- ⌘F: Search locations (when search is focuslity, wind, humidity, etc.)
- Seamless navigation without tab bar

This layout provides a more natural desktop experience optimized for larger screens and pointer devices.

### Window Management

The app window is configured with sensible size constraints:
- Minimum size: 400×600 pixels
- Maximum size: 1200×900 pixels
- Resizable and movable

### App Sandbox

The macOS version runs in the App Sandbox with the following entitlements:
- Network client access (for weather data)
- Location services (for current location)
- App Groups (for widget data sharing)

### Keyboard Navigation

Standard macOS keyboard shortcuts work:
- ⌘Q: Quit
- ⌘W: Close window
- ⌘,: Settings (when implemented)

## Development Notes

### Project Structure

Key files modified for Catalyst support:
- `ios/Podfile`: Mac Catalyst enabled
- `ios/ZephyrWeather.xcodeproj/project.pbxproj`: Catalyst build settings
- `ios/ZephyrWeather/Info.plist`: macOS compatibility keys
- `ios/ZephyrWeather/AppDelegate.mm`: macOS window configuration
- `src/screens/MacOSHomeScreen.tsx`: macOS two-column layout
- `src/components/LocationSidebar.tsx`: Sidebar component for macOS
- `src/utils/platformDetect.ts`: Platform detection utility
- `src/navigation/RootNavigator.tsx`: Conditional navigation for macOS
- `ios/ZephyrWeather/ZephyrWeather.entitlements`: App Sandbox entitlements
- `ios/ZephyrWeatherWidgets/*.swift`: macOS widget family support

### Build Settings

Key build settings for Mac Catalyst:
- `SUPPORTS_MACCATALYST = YES`
- `DERIVE_MACCATALYST_PRODUCT_BUNDLE_IDENTIFIER = YES`
- `TARGETED_DEVICE_FAMILY = "1,2,6"` (iPhone, iPad, Mac)
- iOS Deployment Target: 13.4+

### Debugging

To debug the macOS version:
1. Open Xcode
2. Select "My Mac (Designed for iPad)" as destination
3. Set breakpoints in Swift/Objective-C code
4. For JavaScript debugging, use Chrome DevTools or React Native Debugger

### Widget Debugging

To debug widgets on macOS:
1. Select the `ZephyrWeatherWidgetsExtension` scheme in Xcode
2. Run on "My Mac (Designed for iPad)"
3. When prompted, choose "Zephyr Weather" as the host app
4. The widget will launch in a preview window

## Troubleshooting

### Pods Installation Issues

If you encounter pod installation errors:
```bash
cd ios
rm -rf Pods Podfile.lock
pod cache clean --all
pod install
cd ..
```

### Widget Not Updating

If widgets don't show updated data:
1. Force quit the Zephyr Weather app
2. Remove and re-add the widget
3. Refresh weather data in the main app
4. Check that App Group entitlements match in both targets

### Build Errors

Common build issues and solutions:

**Error: "Building for Mac Catalyst, but the linked library '...' was built for iOS"**
- Solution: Run `pod install` again with the updated Podfile

**Error: "Code signing entitlements are not compatible"**
- Solution: Ensure entitlements files include App Sandbox keys

**Error: "Library not loaded"**
- Solution: Clean build folder (⌘⇧K) and rebuild

## Distribution

### Mac App Store

To distribute on the Mac App Store:
1. Configure signing in Xcode with Mac App Store distribution profile
2. Ensure all entitlements are properly configured
3. Archive the app (Product → Archive)
4. Submit via App Store Connect

### Direct Distribution

For direct distribution outside the Mac App Store:
1. Sign with Developer ID certificate
2. Notarize the app with Apple
3. Staple the notarization ticket
4. Distribute as DMG or PKG

## Platform-Specific Code

The app uses `TARGET_OS_MACCATALYST` macro to detect macOS at runtime:

```objc
#if TARGET_OS_MACCATALYST
    // macOS-specific code
#else
    // iOS-specific code
#endif
```

In Swift:
```swift
#if targetEnvironment(macCatalyst)
    // macOS-specific code
#endif
```

In React Native JavaScript, `Platform.OS` returns `'ios'` for Mac Catalyst, which is correct since the app uses UIKit.

## Known Limitations

- Some iOS-specific gestures may not work exactly as on touchscreen devices
- The app is optimized for mouse/trackpad instead of touch
- Some third-party React Native libraries may not be fully compatible with Catalyst
- Location services require explicit user permission on macOS

## Resources

- [Apple's Mac Catalyst Documentation](https://developer.apple.com/mac-catalyst/)
- [React Native macOS Guide](https://microsoft.github.io/react-native-windows/docs/next/macOS-getting-started)
- [WidgetKit Documentation](https://developer.apple.com/documentation/widgetkit)

## Support

For issues specific to the macOS version, please include:
- macOS version
- Xcode version
- Build logs
- Steps to reproduce the issue
