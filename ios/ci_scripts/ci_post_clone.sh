#!/bin/sh
set -e

echo "=== ci_post_clone.sh: Starting ==="

# ------------------------------------------------------------------
# 1. Install Node.js
#    Xcode Cloud macOS runners do not include Node.js by default.
# ------------------------------------------------------------------
echo "--- Installing Node.js ---"
if ! command -v node &> /dev/null; then
  brew install node@22 2>/dev/null || brew install node 2>/dev/null
fi

export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

if ! command -v node &> /dev/null; then
  echo "ERROR: Failed to install Node.js"
  exit 1
fi

node --version
npm --version

# ------------------------------------------------------------------
# 2. Install npm dependencies
#    97 source file references in the Pods project + 8 build phase
#    scripts point into node_modules/ — those targets can't compile
#    without it. The Podfile also loads Ruby helpers from here.
# ------------------------------------------------------------------
echo "--- Installing npm dependencies ---"
cd "$CI_PRIMARY_REPOSITORY_PATH"
npm ci

# ------------------------------------------------------------------
# 3. Fix hardcoded local machine paths in Pods support files
# ------------------------------------------------------------------
echo "--- Fixing hardcoded paths ---"
PODS_SUPPORT_DIR="$CI_PRIMARY_REPOSITORY_PATH/ios/Pods/Target Support Files"
if [ -d "$PODS_SUPPORT_DIR" ]; then
  find "$PODS_SUPPORT_DIR" -type f \
    -exec sed -i '' "s|/Users/andrewg/Projects/zephyr-weather|$CI_PRIMARY_REPOSITORY_PATH|g" {} \; || true
  echo "Paths updated in Pods support files."
fi

# Remove the Pods_ZephyrWeather.framework reference from the Xcode project.
# With use_frameworks! :linkage => :static, individual pod frameworks are
# linked via OTHER_LDFLAGS. The umbrella framework is unnecessary and
# doesn't exist when pod install hasn't run.
echo "--- Removing Pods_ZephyrWeather.framework link ---"
cd "$CI_PRIMARY_REPOSITORY_PATH/ios"
sed -i '' '/Pods_ZephyrWeather\.framework/d' ZephyrWeather.xcodeproj/project.pbxproj
echo "Removed Pods_ZephyrWeather.framework reference."

  find "$PODS_SUPPORT_DIR" -type f \
    -exec sed -i '' "s|/Users/andrewg/Projects/zephyr-weather|$CI_PRIMARY_REPOSITORY_PATH|g" {} \; || true
  echo "Paths updated in Pods support files."
else
  echo "WARNING: Pods support directory not found, skipping path fix."
fi

echo "=== ci_post_clone.sh: Complete ==="
