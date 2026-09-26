#import "AppDelegate.h"

#import <React/RCTBundleURLProvider.h>
#import <ReactAppDependencyProvider/RCTAppDependencyProvider.h>

// Defined in ZephyrBackgroundRefresh.swift via @_cdecl.
extern void ZephyrRegisterBackgroundRefresh(void);

@implementation AppDelegate

// Register the codegen'd third-party Fabric components (safe-area-context,
// gesture-handler, screens, svg, blur, ...). Without this the delegate falls
// back to the legacy component interop, which drops native events in
// bridgeless mode (safe-area insets never arrive -> blank screen) and can
// dispatch legacy RCTEventEmitter events that crash the app at launch.
- (id<RCTDependencyProvider>)dependencyProvider
{
  return [RCTAppDependencyProvider new];
}

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  self.moduleName = @"ZephyrWeather";
  self.initialProps = @{};
  // The window is created by SceneDelegate so it is owned by the UIWindowScene
  // (required by the iOS 27 SDK scene lifecycle).
  self.automaticallyLoadReactNativeWindow = NO;

  // Must be registered before this method returns.
  ZephyrRegisterBackgroundRefresh();

  return [super application:application didFinishLaunchingWithOptions:launchOptions];
}

- (NSURL *)sourceURLForBridge:(RCTBridge *)bridge
{
  return [self bundleURL];
}

- (NSURL *)bundleURL
{
#if DEBUG
  return [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"index"];
#else
  return [[NSBundle mainBundle] URLForResource:@"main" withExtension:@"jsbundle"];
#endif
}

- (NSURL *)getBundleURL
{
  return [self bundleURL];
}

@end
