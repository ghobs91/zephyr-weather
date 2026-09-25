#import "SceneDelegate.h"
#import "AppDelegate.h"

@implementation SceneDelegate

- (void)scene:(UIScene *)scene
    willConnectToSession:(UISceneSession *)session
                 options:(UISceneConnectionOptions *)connectionOptions
{
  UIWindowScene *windowScene = (UIWindowScene *)scene;
  AppDelegate *appDelegate = (AppDelegate *)UIApplication.sharedApplication.delegate;

#if TARGET_OS_MACCATALYST
  if (@available(macCatalyst 16.0, *)) {
    // Capable of a full desktop layout; no maximum so the window resizes
    // freely like a native Mac app.
    windowScene.sizeRestrictions.minimumSize = CGSizeMake(760, 520);

    // Open at a desktop-sized window the first time. The system remembers the
    // user's own size on subsequent launches, so only apply this once.
    NSUserDefaults *defaults = NSUserDefaults.standardUserDefaults;
    if (![defaults boolForKey:@"ZephyrHasSetInitialWindowSize"]) {
      CGRect screen = UIScreen.mainScreen.bounds;
      CGSize size = CGSizeMake(MIN(1100.0, screen.size.width - 80.0),
                               MIN(760.0, screen.size.height - 80.0));
      CGRect frame = CGRectMake((screen.size.width - size.width) / 2.0,
                                (screen.size.height - size.height) / 2.0,
                                size.width,
                                size.height);
      UIWindowSceneGeometryPreferencesMac *preferences =
          [[UIWindowSceneGeometryPreferencesMac alloc] initWithSystemFrame:frame];
      [windowScene requestGeometryUpdateWithPreferences:preferences
                                           errorHandler:nil];
      [defaults setBool:YES forKey:@"ZephyrHasSetInitialWindowSize"];
    }
  } else if (@available(macCatalyst 13.0, *)) {
    windowScene.sizeRestrictions.minimumSize = CGSizeMake(400, 600);
    windowScene.sizeRestrictions.maximumSize = CGSizeMake(1200, 900);
  }
  windowScene.title = @"Zephyr Weather";
#endif

  // With the scene lifecycle the window must be owned by the scene, so the
  // app disables RCTAppDelegate's automatic window and starts React Native
  // into the scene window here instead.
  UIWindow *window = [[UIWindow alloc] initWithWindowScene:windowScene];

  self.window = window;
  appDelegate.window = window;

  [appDelegate.reactNativeFactory startReactNativeWithModuleName:appDelegate.moduleName
                                                        inWindow:window
                                                   launchOptions:nil];
}

@end
