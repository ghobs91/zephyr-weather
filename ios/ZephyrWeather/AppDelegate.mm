#import "AppDelegate.h"

#import <React/RCTBundleURLProvider.h>

@implementation AppDelegate

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  self.moduleName = @"ZephyrWeather";
  self.initialProps = @{};

  BOOL result = [super application:application didFinishLaunchingWithOptions:launchOptions];

#if TARGET_OS_MACCATALYST
  // Configure macOS window
  if (self.window != nil) {
    [self configureMacWindow];
  }
#endif

  return result;
}

#if TARGET_OS_MACCATALYST
- (void)configureMacWindow
{
  // Set minimum window size for macOS
  if (@available(macCatalyst 13.0, *)) {
    UIWindowScene *windowScene = (UIWindowScene *)self.window.windowScene;
    if (windowScene != nil) {
      windowScene.sizeRestrictions.minimumSize = CGSizeMake(400, 600);
      windowScene.sizeRestrictions.maximumSize = CGSizeMake(1200, 900);
      // Set a good default title
      windowScene.title = @"Zephyr Weather";
    }
  }
}
#endif

- (NSURL *)sourceURLForBridge:(RCTBridge *)bridge
{
  return [self getBundleURL];
}

- (NSURL *)getBundleURL
{
#if DEBUG
  return [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"index"];
#else
  return [[NSBundle mainBundle] URLForResource:@"main" withExtension:@"jsbundle"];
#endif
}

@end
