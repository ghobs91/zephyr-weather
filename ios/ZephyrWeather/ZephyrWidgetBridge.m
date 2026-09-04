#import "ZephyrWidgetBridge.h"
#import <React/RCTLog.h>

// Defined in ZephyrWidgetReloader.swift via @_cdecl — avoids the
// ObjC/Swift class-interop header generation chicken-and-egg problem.
extern void ZephyrReloadAllWidgets(void);

// Defined in ZephyrLiveActivityManager.swift via @_cdecl (same pattern).
// Single-activity model: the app manages at most one Live Activity.
extern BOOL ZephyrLiveActivityStart(const char *json);
extern BOOL ZephyrLiveActivityUpdate(const char *json);
extern void ZephyrLiveActivityEnd(void);
extern BOOL ZephyrLiveActivityIsActive(void);

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
  NSLog(@"[ZephyrWidgetBridge] setItem called - key: %@, appGroup: %@, valueLen: %lu", key, appGroup, (unsigned long)value.length);
  NSUserDefaults *defaults = [[NSUserDefaults alloc] initWithSuiteName:appGroup];
  if (!defaults) {
    NSLog(@"[ZephyrWidgetBridge] ERROR: Could not create UserDefaults for app group: %@", appGroup);
    reject(@"ERR_NO_DEFAULTS", @"Could not create UserDefaults for app group", nil);
    return;
  }

  [defaults setObject:value forKey:key];
  BOOL synced = [defaults synchronize];
  NSLog(@"[ZephyrWidgetBridge] setItem succeeded - key: %@, synced: %d", key, synced);

  resolve(nil);
}

RCT_EXPORT_METHOD(reloadWidgets:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  dispatch_async(dispatch_get_main_queue(), ^{
    ZephyrReloadAllWidgets();
    RCTLogInfo(@"WidgetKit: reloaded all timelines");
    resolve(nil);
  });
}

RCT_EXPORT_METHOD(startLiveActivity:(NSString *)json
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  BOOL ok = ZephyrLiveActivityStart([json UTF8String]);
  if (ok) {
    resolve(nil);
  } else {
    reject(@"ERR_LIVE_ACTIVITY", @"Could not start Live Activity (unsupported device or invalid payload)", nil);
  }
}

RCT_EXPORT_METHOD(updateLiveActivity:(NSString *)json
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  BOOL ok = ZephyrLiveActivityUpdate([json UTF8String]);
  if (ok) {
    resolve(nil);
  } else {
    reject(@"ERR_LIVE_ACTIVITY", @"Could not update Live Activity (none active or invalid payload)", nil);
  }
}

RCT_EXPORT_METHOD(endLiveActivity:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  ZephyrLiveActivityEnd();
  resolve(nil);
}

RCT_EXPORT_METHOD(isLiveActivityActive:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  resolve(@(ZephyrLiveActivityIsActive()));
}

@end
