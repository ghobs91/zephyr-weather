# Quick Start: Add Your App Icon

You have **3 easy options** to add your 4-season weather icon:

## 🚀 Option 1: Online Tool (Easiest - 2 minutes)

1. Save one of your icon images as **1024x1024px PNG**
2. Go to **[appicon.co](https://www.appicon.co/)**
3. Upload your icon
4. Download the generated package
5. Copy files to:
   - iOS files → `ios/TempestWeather/Images.xcassets/AppIcon.appiconset/`
   - Android files → `android/app/src/main/res/mipmap-*/`

## ⚡ Option 2: Use Our Script (5 minutes)

```bash
# 1. Install ImageMagick (one-time setup)
brew install imagemagick

# 2. Save your icon as app-icon.png (1024x1024px) in the project root

# 3. Run the script
./scripts/generate-icons.sh app-icon.png

# 4. Done! All icons generated automatically
```

## 🛠 Option 3: NPM Tool (Alternative)

```bash
# 1. Save your icon as app-icon.png (1024x1024px) in the project root

# 2. Run this command
npx @bam.tech/react-native-make set-icon --path ./app-icon.png

# 3. Done!
```

---

## After Adding Icons

```bash
# Rebuild iOS
cd ios && pod install && cd ..
npm run ios

# Or rebuild Android
npm run android
```

---

## ✅ What's Already Done

- iOS configuration updated ✓
- Android directories created ✓
- Icon generator script ready ✓

## What You Need to Do

1. Save your 4-season icon as a **1024x1024px PNG file**
2. Choose one of the 3 options above
3. Rebuild your app

---

**💡 Tip:** I recommend Option 1 (appicon.co) - it's the fastest and most reliable!
