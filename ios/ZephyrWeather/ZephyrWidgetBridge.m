#import "ZephyrWidgetBridge.h"
#import <React/RCTLog.h>
#import <objc/runtime.h>

@implementation ZephyrWidgetBridge

RCT_EXPORT_MODULE();

+ (BOOL)requiresMainQueueSetup {
  return NO;
}

RCT_EXPORT_METHOD(setItem:(NSString *)key
                  value:(NSString *)value
                  appGroup:(NSString *)appGroup
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  NSUserDefaults *defaults = [[NSUserDefaults alloc] initWithSuiteName:appGroup];
  if (!defaults) {
    reject(@"ERR_NO_DEFAULTS", @"Could not create UserDefaults for app group", nil);
    return;
  }

  [defaults setObject:value forKey:key];
  [defaults synchronize];

  resolve(nil);
}

RCT_EXPORT_METHOD(reloadWidgets:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  // Use runtime lookup to avoid hard WidgetKit link dependency
  Class widgetCenterClass = NSClassFromString(@"WGWidgetCenter");
  if (!widgetCenterClass) {
    widgetCenterClass = NSClassFromString(@"WidgetCenter");
  }
  if (widgetCenterClass) {
    SEL sharedSel = NSSelectorFromString(@"shared");
    SEL reloadSel = NSSelectorFromString(@"reloadAllTimelines");
    if ([widgetCenterClass respondsToSelector:sharedSel]) {
      dispatch_async(dispatch_get_main_queue(), ^{
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Warc-performSelector-leaks"
        id center = [widgetCenterClass performSelector:sharedSel];
        if ([center respondsToSelector:reloadSel]) {
          [center performSelector:reloadSel];
        }
#pragma clang diagnostic pop
        resolve(nil);
      });
      return;
    }
  }
  resolve(nil);
}

@end
