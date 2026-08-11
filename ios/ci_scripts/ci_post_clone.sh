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

  # Copy the Expo configure script to a path without spaces.
  # Xcode build phases cannot handle spaces in shell script paths.
  EXPO_SCRIPT=$(find "$PODS_SUPPORT_DIR" -name "expo-configure-project.sh" -type f | head -1)
  if [ -n "$EXPO_SCRIPT" ] && [ -f "$EXPO_SCRIPT" ]; then
    cp "$EXPO_SCRIPT" "$CI_PRIMARY_REPOSITORY_PATH/ios/Pods/expo-configure.sh"
    chmod +x "$CI_PRIMARY_REPOSITORY_PATH/ios/Pods/expo-configure.sh"
    echo "Copied expo-configure script to path without spaces."
  fi

  find "$PODS_SUPPORT_DIR" -type f \
    -exec sed -i '' "s|/Users/andrewg/Projects/zephyr-weather|$CI_PRIMARY_REPOSITORY_PATH|g" {} \; || true
  echo "Paths updated in Pods support files."
else
  echo "WARNING: Pods support directory not found, skipping path fix."
fi

echo "=== ci_post_clone.sh: Complete ==="
