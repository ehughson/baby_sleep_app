# 📱 Building and Distributing Your App

This guide covers how to build your React Native app and distribute it to users.

## 🎯 Overview

You have several options for distributing your app:
1. **App Stores** (Apple App Store, Google Play Store) - For public distribution
2. **TestFlight** (iOS) - For beta testing
3. **Internal Distribution** - For limited users (APK/IPA files)
4. **Enterprise Distribution** - For organizations

## 📋 Prerequisites

1. **Expo Account** (free)
   - Sign up at [expo.dev](https://expo.dev)
   - Install EAS CLI: `npm install -g eas-cli`
   - Login: `eas login`

2. **For iOS App Store:**
   - Apple Developer Account ($99/year)
   - Mac computer (for building or using EAS Build)

3. **For Google Play Store:**
   - Google Play Developer Account ($25 one-time)
   - No Mac required

## 🔧 Step 1: Update App Configuration

### Update `app.json` with production details:

```json
{
  "expo": {
    "name": "REMi - Baby Sleep Assistant",
    "slug": "remi-baby-sleep",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "splash": {
      "image": "./assets/splash-icon.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.yourcompany.remi",
      "buildNumber": "1"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "package": "com.yourcompany.remi",
      "versionCode": 1
    },
    "scheme": "remi",
    "plugins": [
      "expo-router",
      "expo-secure-store"
    ],
    "extra": {
      "apiBaseUrl": "https://your-backend-url.com/api"
    }
  }
}
```

**Important:** Replace:
- `com.yourcompany.remi` with your own bundle identifier (e.g., `com.emma.remi`)
- `https://your-backend-url.com/api` with your production backend URL

## 🌐 Step 2: Configure Production Backend URL

Update `src/constants/api.ts` to use production URL:

```typescript
// Production backend URL (update this to your deployed backend)
const PRODUCTION_API_URL = 'https://your-backend-url.com/api';

export const API_BASE_URL = 
  Constants.expoConfig?.extra?.apiBaseUrl || 
  process.env.EXPO_PUBLIC_API_BASE_URL || 
  PRODUCTION_API_URL;
```

## 🏗️ Step 3: Build the App

### Option A: Using EAS Build (Recommended)

EAS Build is Expo's cloud build service - no local setup needed!

1. **Initialize EAS:**
   ```bash
   cd baby-sleep-native-fixed
   eas build:configure
   ```

2. **Build for iOS:**
   ```bash
   eas build --platform ios
   ```
   - First time: You'll need to provide Apple Developer credentials
   - Choose "App Store" for distribution or "Development" for testing

3. **Build for Android:**
   ```bash
   eas build --platform android
   ```
   - Creates an APK or AAB file
   - AAB is required for Google Play Store

4. **Build for both:**
   ```bash
   eas build --platform all
   ```

### Option B: Local Build (Advanced)

Requires Xcode (iOS) and Android Studio (Android). See [Expo docs](https://docs.expo.dev/build/introduction/).

## 📲 Step 4: Distribution Options

### A. Apple App Store (iOS)

1. **Build for App Store:**
   ```bash
   eas build --platform ios --profile production
   ```

2. **Submit to App Store:**
   ```bash
   eas submit --platform ios
   ```
   - Requires App Store Connect API key or App Store credentials
   - Or manually upload via App Store Connect

3. **App Store Connect Setup:**
   - Go to [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
   - Create app listing
   - Add screenshots, description, privacy policy
   - Submit for review

### B. Google Play Store (Android)

1. **Build for Play Store:**
   ```bash
   eas build --platform android --profile production
   ```

2. **Submit to Play Store:**
   ```bash
   eas submit --platform android
   ```
   - Or manually upload AAB file to Google Play Console

3. **Play Console Setup:**
   - Go to [play.google.com/console](https://play.google.com/console)
   - Create app listing
   - Add screenshots, description, privacy policy
   - Submit for review

### C. TestFlight (iOS Beta Testing)

1. **Build for TestFlight:**
   ```bash
   eas build --platform ios --profile preview
   ```

2. **Submit to TestFlight:**
   ```bash
   eas submit --platform ios
   ```

3. **Invite Testers:**
   - Add testers in App Store Connect
   - They'll receive email invitations

### D. Internal Distribution (APK/IPA)

1. **Build for internal testing:**
   ```bash
   # Android APK
   eas build --platform android --profile preview
   
   # iOS (requires Apple Developer account)
   eas build --platform ios --profile preview
   ```

2. **Download and distribute:**
   - Download the build from EAS dashboard
   - Share APK/IPA files directly with users
   - **Note:** iOS requires users to trust your developer certificate

## 🔐 Step 5: Environment Variables

Create `eas.json` for different build profiles:

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "env": {
        "EXPO_PUBLIC_API_BASE_URL": "https://your-staging-backend.com/api"
      }
    },
    "production": {
      "env": {
        "EXPO_PUBLIC_API_BASE_URL": "https://your-production-backend.com/api"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

## 📝 Step 6: App Store Requirements

### iOS App Store:
- ✅ App icon (1024x1024px)
- ✅ Screenshots (various device sizes)
- ✅ App description
- ✅ Privacy policy URL
- ✅ Age rating
- ✅ Support URL

### Google Play Store:
- ✅ App icon (512x512px)
- ✅ Feature graphic (1024x500px)
- ✅ Screenshots (at least 2)
- ✅ App description
- ✅ Privacy policy URL
- ✅ Content rating

## 🚀 Quick Start Commands

```bash
# 1. Install EAS CLI
npm install -g eas-cli

# 2. Login to Expo
eas login

# 3. Configure project
cd baby-sleep-native-fixed
eas build:configure

# 4. Build for production
eas build --platform all --profile production

# 5. Submit to stores
eas submit --platform ios
eas submit --platform android
```

## 💰 Costs

- **EAS Build:** Free tier includes limited builds, then pay-per-build
- **Apple Developer:** $99/year
- **Google Play:** $25 one-time
- **Backend Hosting:** Varies (Railway, Render, etc.)

## 🔄 Updates After Launch

For updates, you can use:
- **OTA Updates** (Expo Updates) - For JavaScript changes (no app store review)
- **New Builds** - For native code changes (requires app store review)

```bash
# Publish OTA update
eas update --branch production --message "Bug fixes"
```

## 📚 Resources

- [EAS Build Docs](https://docs.expo.dev/build/introduction/)
- [EAS Submit Docs](https://docs.expo.dev/submit/introduction/)
- [App Store Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Play Store Policies](https://play.google.com/about/developer-content-policy/)

## ⚠️ Important Notes

1. **Backend URL:** Make sure your production backend is deployed and accessible
2. **API Keys:** Never commit API keys - use environment variables
3. **Privacy Policy:** Required for both stores - create one before submitting
4. **Testing:** Test thoroughly on real devices before submitting
5. **Review Time:** App Store review takes 1-3 days, Play Store is usually faster

