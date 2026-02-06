# App Icon Setup Guide

Your beautiful 4-season icon needs to be added in multiple sizes for both iOS and Android.

## Quick Setup Steps

### Option 1: Use an Icon Generator (Recommended)

1. **Save your icon** as a single 1024x1024px PNG file
2. **Use one of these free tools:**
   - [appicon.co](https://www.appicon.co/) - Upload and download all sizes
   - [makeappicon.com](https://makeappicon.com/)
   - [easyappicon.com](https://easyappicon.com/)

3. **Download the generated icons** and follow the placement instructions below

### Option 2: Use React Native Asset Tool

```bash
# Install the tool
npm install -g @bam.tech/react-native-make

# Generate icons from a 1024x1024px source image
npx react-native set-icon --path ./app-icon.png
```

## Manual Icon Placement

### iOS Icons
Place these files in: `ios/TempestWeather/Images.xcassets/AppIcon.appiconset/`

| Filename | Size |
|----------|------|
| Icon-App-20x20@1x.png | 20x20 |
| Icon-App-20x20@2x.png | 40x40 |
| Icon-App-20x20@3x.png | 60x60 |
| Icon-App-29x29@1x.png | 29x29 |
| Icon-App-29x29@2x.png | 58x58 |
| Icon-App-29x29@3x.png | 87x87 |
| Icon-App-40x40@2x.png | 80x80 |
| Icon-App-40x40@3x.png | 120x120 |
| Icon-App-60x60@2x.png | 120x120 |
| Icon-App-60x60@3x.png | 180x180 |
| Icon-App-1024x1024@1x.png | 1024x1024 |

### Android Icons
You need to create these directories first:

```bash
mkdir -p android/app/src/main/res/mipmap-mdpi
mkdir -p android/app/src/main/res/mipmap-hdpi
mkdir -p android/app/src/main/res/mipmap-xhdpi
mkdir -p android/app/src/main/res/mipmap-xxhdpi
mkdir -p android/app/src/main/res/mipmap-xxxhdpi
```

Then place these files:

| Directory | Filename | Size |
|-----------|----------|------|
| mipmap-mdpi | ic_launcher.png | 48x48 |
| mipmap-mdpi | ic_launcher_round.png | 48x48 |
| mipmap-hdpi | ic_launcher.png | 72x72 |
| mipmap-hdpi | ic_launcher_round.png | 72x72 |
| mipmap-xhdpi | ic_launcher.png | 96x96 |
| mipmap-xhdpi | ic_launcher_round.png | 96x96 |
| mipmap-xxhdpi | ic_launcher.png | 144x144 |
| mipmap-xxhdpi | ic_launcher_round.png | 144x144 |
| mipmap-xxxhdpi | ic_launcher.png | 192x192 |
| mipmap-xxxhdpi | ic_launcher_round.png | 192x192 |

## Icon Requirements

- **Format:** PNG with transparency
- **Background:** Your icon has a white background which is perfect
- **Design:** Make sure the icon looks good at small sizes
- **Safe Area:** Keep important content within the center 80% of the icon

## After Adding Icons

1. **For iOS:**
   ```bash
   cd ios
   pod install
   cd ..
   npm run ios
   ```

2. **For Android:**
   ```bash
   npm run android
   ```

3. **Clean Build (if icons don't update):**
   ```bash
   # iOS
   cd ios
   xcodebuild clean
   cd ..
   
   # Android
   cd android
   ./gradlew clean
   cd ..
   ```

## Configuration Already Complete

✅ iOS AppIcon.appiconset/Contents.json has been updated
✅ You just need to add the actual PNG files in the required sizes

---

**Note:** Your 4-season icon (spring/summer/fall/winter) is perfect for a weather app! The design will look great on both light and dark backgrounds.
