# 📱 Testing on iPhone (Without App Store)

Step-by-step guide to test your app on your iPhone without submitting to the App Store.

## 🎯 Option 1: Development Build (Recommended)

Creates a custom build that works like Expo Go but includes your native code.

### Prerequisites

1. **Apple Developer Account** ($99/year)
   - Sign up at [developer.apple.com](https://developer.apple.com)
   - You'll need this for any iOS testing outside of Expo Go

2. **EAS CLI** (free)
   ```bash
   npm install -g eas-cli
   ```

### Step-by-Step Instructions

1. **Login to Expo:**
   ```bash
   eas login
   ```
   (Create free account at [expo.dev](https://expo.dev) if needed)

2. **Navigate to your project:**
   ```bash
   cd baby-sleep-native-fixed
   ```

3. **Configure EAS Build:**
   ```bash
   eas build:configure
   ```
   - Choose "All features" when prompted
   - This creates `eas.json` configuration file

4. **Update `app.json` with your bundle identifier:**
   ```json
   {
     "expo": {
       "ios": {
         "supportsTablet": true,
         "bundleIdentifier": "com.yourname.remi"
       }
     }
   }
   ```
   - Replace `com.yourname.remi` with something unique (e.g., `com.emma.remi`)
   - Must be unique - use reverse domain notation

5. **Build development version:**
   ```bash
   eas build --platform ios --profile development
   ```
   - First time: EAS will ask for your Apple Developer credentials
   - It will automatically create certificates and provisioning profiles
   - Build takes ~15-20 minutes

6. **Install on your iPhone:**
   - EAS will provide a link to download the build
   - Open the link on your iPhone
   - Download the `.ipa` file
   - You may need to trust the developer certificate:
     - Settings > General > VPN & Device Management
     - Tap on your developer certificate
     - Tap "Trust"

## 🚀 Option 2: Preview Build (Standalone App)

Creates a standalone app you can install directly.

1. **Build preview version:**
   ```bash
   eas build --platform ios --profile preview
   ```

2. **Install via TestFlight (Easiest):**
   ```bash
   eas submit --platform ios
   ```
   - Automatically uploads to TestFlight
   - You'll get an email when it's ready
   - Install TestFlight app on your iPhone
   - Open the email and tap "View in TestFlight"
   - Install the app

3. **Or install directly (Ad Hoc):**
   - Download the `.ipa` from EAS dashboard
   - Install via Xcode or Apple Configurator
   - Requires your device UDID to be registered

## 📋 Detailed Setup: EAS Configuration

Create or update `eas.json` in your project root:

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "simulator": false
      }
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": false
      }
    },
    "production": {
      "ios": {
        "simulator": false
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

## 🔧 Step-by-Step: First Time Setup

### 1. Apple Developer Account Setup

1. Go to [developer.apple.com](https://developer.apple.com)
2. Sign in with your Apple ID
3. Enroll in Apple Developer Program ($99/year)
4. Wait for approval (usually instant, sometimes 24-48 hours)

### 2. EAS Build Setup

1. **Install EAS CLI:**
   ```bash
   npm install -g eas-cli
   ```

2. **Login:**
   ```bash
   eas login
   ```

3. **Configure project:**
   ```bash
   cd baby-sleep-native-fixed
   eas build:configure
   ```

### 3. Update App Configuration

Edit `app.json`:

```json
{
  "expo": {
    "name": "REMi - Baby Sleep Assistant",
    "slug": "remi-baby-sleep",
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.yourname.remi",
      "buildNumber": "1"
    }
  }
}
```

**Important:** 
- `bundleIdentifier` must be unique (use your name/company)
- Format: `com.yourname.appname` (lowercase, no spaces)

### 4. Build for Development

```bash
eas build --platform ios --profile development
```

**First time prompts:**
- Apple ID email
- Apple ID password (or app-specific password)
- Team selection (if you have multiple)
- EAS will handle certificates automatically

### 5. Install on iPhone

**Method A: Via EAS Dashboard**
1. Go to [expo.dev/accounts/your-account/projects](https://expo.dev)
2. Click on your project
3. Go to "Builds" tab
4. Click on the completed build
5. Scan QR code with your iPhone camera
6. Tap the notification to install

**Method B: Direct Download**
1. EAS provides a download link
2. Open link on iPhone
3. Download the `.ipa`
4. May need to trust developer:
   - Settings > General > VPN & Device Management
   - Find your developer certificate
   - Tap "Trust [Your Name]"

## 🔄 Updating the App

### For JavaScript Changes (Fast - No Rebuild):

1. **Start development server:**
   ```bash
   npx expo start --dev-client
   ```

2. **Publish update:**
   ```bash
   eas update --branch development --message "Your update message"
   ```

3. **Open app on iPhone:**
   - App will automatically check for updates
   - Or pull down to refresh

### For Native Changes (Requires Rebuild):

```bash
eas build --platform ios --profile development
```

## 🎯 Option 3: TestFlight Beta Testing

Best for sharing with multiple testers.

1. **Build for TestFlight:**
   ```bash
   eas build --platform ios --profile preview
   ```

2. **Submit to TestFlight:**
   ```bash
   eas submit --platform ios
   ```
   - Requires App Store Connect API key or credentials
   - EAS will guide you through setup

3. **Add Testers:**
   - Go to [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
   - Select your app
   - Go to TestFlight tab
   - Add internal or external testers
   - They'll receive email invitations

4. **Install TestFlight:**
   - Testers install TestFlight app from App Store
   - Accept invitation email
   - Install your app from TestFlight

## ⚙️ Backend Configuration

Make sure your iPhone can reach your backend:

### For Local Testing (Same Wi-Fi):

Already configured! The app uses your computer's IP address when on the same network.

### For Testing Away from Home:

1. **Deploy backend** to Railway/Render/etc.
2. **Update `app.json`:**
   ```json
   {
     "expo": {
       "extra": {
         "apiBaseUrl": "https://your-backend-url.com/api"
       }
     }
   }
   ```
3. **Rebuild:**
   ```bash
   eas build --platform ios --profile development
   ```

## 🐛 Troubleshooting

### "Apple ID authentication failed"
- Use app-specific password: [appleid.apple.com](https://appleid.apple.com)
- Account > Security > App-Specific Passwords

### "Bundle identifier already in use"
- Change `bundleIdentifier` in `app.json` to something unique
- Format: `com.yourname.remi` (use your actual name)

### "Can't install app - Untrusted Developer"
- Settings > General > VPN & Device Management
- Find your developer certificate
- Tap "Trust"

### "Build failed - Certificate issue"
- EAS usually handles this automatically
- If not, check Apple Developer account status
- Make sure you're enrolled in Developer Program

### "App crashes on launch"
- Check backend is accessible
- Verify API URL in console logs
- Check Expo Go vs Development Build (they're different!)

## 💰 Costs

- **EAS Build:** Free tier includes limited builds, then ~$10-20 per build
- **Apple Developer:** $99/year (required for any iOS testing outside Expo Go)
- **TestFlight:** Free with Apple Developer account

## 📱 Quick Start Commands

```bash
# 1. Install EAS CLI
npm install -g eas-cli

# 2. Login
eas login

# 3. Configure
cd baby-sleep-native-fixed
eas build:configure

# 4. Build development version
eas build --platform ios --profile development

# 5. Install on iPhone (via link provided by EAS)
```

## 🎯 Recommended Workflow

1. **Development:** Use development build for testing
2. **Beta Testing:** Use TestFlight for sharing with testers
3. **Production:** Submit to App Store when ready

## 📚 Resources

- [EAS Build iOS Guide](https://docs.expo.dev/build/introduction/)
- [Apple Developer Portal](https://developer.apple.com)
- [TestFlight Documentation](https://developer.apple.com/testflight/)

## ⚠️ Important Notes

1. **Apple Developer Account Required:** You cannot test on a real iPhone without this ($99/year)
2. **First Build Takes Time:** ~15-20 minutes for first build
3. **Device Registration:** EAS handles this automatically
4. **Updates:** JavaScript changes can be updated without rebuilding (using `eas update`)
5. **Backend:** Make sure backend is accessible from your iPhone's network

