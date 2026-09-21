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
  if (@available(macCatalyst 13.0, *)) {
    windowScene.sizeRestrictions.minimumSize = CGSizeMake(400, 600);
    windowScene.sizeRestrictions.maximumSize = CGSizeMake(1200, 900);
    windowScene.title = @"Zephyr Weather";
  }
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
