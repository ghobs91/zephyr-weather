#ifdef __OBJC__
#import <UIKit/UIKit.h>
#else
#ifndef FOUNDATION_EXPORT
#if defined(__cplusplus)
#define FOUNDATION_EXPORT extern "C"
#else
#define FOUNDATION_EXPORT extern
#endif
#endif
#endif

#import "EXJavaScriptSerializable.h"
#import "EXWorkletsProvider.h"
#import "SerializableExtractor.h"
#import "WorkletRuntimeHandle.h"
#import "WorkletRuntimeResolver.h"

FOUNDATION_EXPORT double ExpoModulesWorkletsVersionNumber;
FOUNDATION_EXPORT const unsigned char ExpoModulesWorkletsVersionString[];

