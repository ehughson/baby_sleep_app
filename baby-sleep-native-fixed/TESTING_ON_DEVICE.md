# 📱 Testing on Your Phone (Without App Store)

Here are several ways to test your app on a real device without submitting to app stores.

## 🎯 Option 1: Development Build (Recommended)

This creates a custom build that works like Expo Go but includes your native code.

### For Android (Easiest - No Account Needed)

1. **Install EAS CLI:**
   ```bash
   npm install -g eas-cli
   eas login
   ```

2. **Configure EAS:**
   ```bash
   cd baby-sleep-native-fixed
   eas build:configure
   ```

3. **Build development version:**
   ```bash
   eas build --platform android --profile development
   ```

4. **Install on your phone:**
   - EAS will provide a download link
   - Download the APK on your Android phone
   - Enable "Install from unknown sources" in settings
   - Tap the APK to install

### For iOS (Requires Apple Developer Account - $99/year)

1. **Build development version:**
   ```bash
   eas build --platform ios --profile development
   ```

2. **Install via TestFlight or direct install:**
   - EAS will provide instructions
   - You'll need to trust the developer certificate on your iPhone

## 🚀 Option 2: Preview Build (Internal Distribution)

Creates a standalone app you can share with testers.

### Android APK (Easiest)

1. **Build preview version:**
   ```bash
   eas build --platform android --profile preview
   ```

2. **Download and install:**
   - Download the APK from EAS dashboard
   - Transfer to your phone (email, cloud storage, etc.)
   - Enable "Install from unknown sources"
   - Install the APK

### iOS (Requires Apple Developer Account)

1. **Build preview version:**
   ```bash
   eas build --platform ios --profile preview
   ```

2. **Install via TestFlight or Ad Hoc:**
   - Requires Apple Developer account
   - Can install on up to 100 devices

## 📦 Option 3: Local Build (Advanced)

Build directly on your computer (requires Android Studio/Xcode).

### Android APK

1. **Install Android Studio** and set up Android SDK

2. **Build locally:**
   ```bash
   cd baby-sleep-native-fixed
   npx expo run:android --variant release
   ```

3. **Find the APK:**
   - Located in `android/app/build/outputs/apk/release/`
   - Transfer to your phone and install

### iOS (Requires Mac + Xcode)

1. **Install Xcode** from App Store

2. **Build locally:**
   ```bash
   cd baby-sleep-native-fixed
   npx expo run:ios --configuration Release
   ```

3. **Install via Xcode:**
   - Connect iPhone via USB
   - Select your device in Xcode
   - Click "Run" to install

## 🔧 Quick Setup: EAS Build Configuration

Create `eas.json` in your project root:

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      },
      "ios": {
        "simulator": false
      }
    },
    "production": {}
  }
}
```

## 📋 Step-by-Step: Android APK (Easiest Method)

1. **Install EAS CLI:**
   ```bash
   npm install -g eas-cli
   ```

2. **Login to Expo:**
   ```bash
   eas login
   ```
   (Create free account at expo.dev if needed)

3. **Navigate to project:**
   ```bash
   cd baby-sleep-native-fixed
   ```

4. **Configure EAS:**
   ```bash
   eas build:configure
   ```
   - Choose "All features" when prompted
   - This creates `eas.json`

5. **Build APK:**
   ```bash
   eas build --platform android --profile preview
   ```
   - First build takes ~10-15 minutes
   - You'll get a QR code and download link

6. **Install on Android:**
   - Download APK on your phone
   - Go to Settings > Security > Enable "Install from unknown sources"
   - Open the downloaded APK file
   - Tap "Install"

## 📋 Step-by-Step: iOS (Requires Apple Developer)

1. **Get Apple Developer Account:**
   - Sign up at [developer.apple.com](https://developer.apple.com) ($99/year)

2. **Build for iOS:**
   ```bash
   eas build --platform ios --profile preview
   ```

3. **Install via TestFlight:**
   - EAS can automatically submit to TestFlight
   - Or download IPA and install manually

## ⚙️ Update Backend URL for Testing

Make sure your phone can reach your backend:

1. **For local testing** (phone on same Wi-Fi):
   - Already configured in `src/constants/api.ts`
   - Uses your computer's IP address

2. **For testing away from home:**
   - Deploy backend to Railway/Render/etc.
   - Update `app.json`:
   ```json
   "extra": {
     "apiBaseUrl": "https://your-backend-url.com/api"
   }
   ```

## 🔄 Updating the App

After making changes:

1. **For JavaScript changes:**
   ```bash
   eas update --branch preview
   ```
   - Updates app without rebuilding
   - Works if you used development build

2. **For native changes:**
   - Rebuild: `eas build --platform android --profile preview`

## 💡 Tips

- **Android is easier** - No account needed, just build APK
- **Free EAS builds** - Limited free builds per month, then pay-per-build
- **Development builds** - Can use Expo Dev Tools for debugging
- **Preview builds** - Standalone apps, no Expo Go needed

## 🐛 Troubleshooting

**"Build failed"**
- Check `eas.json` configuration
- Make sure all dependencies are in `package.json`

**"Can't install APK"**
- Enable "Install from unknown sources" in Android settings
- Check file isn't corrupted (re-download)

**"Backend connection failed"**
- Make sure backend is running
- Check firewall allows connections
- Verify IP address in `api.ts` is correct

**"iOS build requires credentials"**
- Need Apple Developer account
- EAS can help set up certificates automatically

## 📚 Resources

- [EAS Build Docs](https://docs.expo.dev/build/introduction/)
- [Development Builds](https://docs.expo.dev/development/introduction/)
- [Internal Distribution](https://docs.expo.dev/build/internal-distribution/)

