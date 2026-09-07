#import "SceneDelegate.h"
#import "AppDelegate.h"

@implementation SceneDelegate

- (void)scene:(UIScene *)scene
    willConnectToSession:(UISceneSession *)session
                 options:(UISceneConnectionOptions *)connectionOptions
{
  UIWindowScene *windowScene = (UIWindowScene *)scene;
  AppDelegate *appDelegate = (AppDelegate *)UIApplication.sharedApplication.delegate;

  // RCTAppDelegate builds the rootViewController in didFinishLaunching but
  // attaches it to a sceneless window. The iOS 27 SDK requires the window to
  // be owned by the scene, so re-host the same rootViewController here.
  UIWindow *window = [[UIWindow alloc] initWithWindowScene:windowScene];
  window.rootViewController = appDelegate.window.rootViewController;
  [window makeKeyAndVisible];

  self.window = window;
  // Keep AppDelegate.window in sync so existing code (e.g. the Mac Catalyst
  // window configuration) keeps operating on the visible window.
  appDelegate.window = window;
}

@end
