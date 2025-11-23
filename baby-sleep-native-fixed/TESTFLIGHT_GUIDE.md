# 🚀 TestFlight Guide - How It Works

TestFlight is Apple's official beta testing platform that lets you distribute your iOS app to testers before it goes live on the App Store.

## 🎯 What is TestFlight?

TestFlight is a free service (with Apple Developer account) that allows you to:
- Distribute beta versions of your app to testers
- Get feedback before App Store release
- Test on real devices
- Update testers without App Store review (for most updates)

## 📋 How TestFlight Works

### The Process Flow:

```
1. Build Your App
   ↓
2. Upload to App Store Connect
   ↓
3. Process & Distribute via TestFlight
   ↓
4. Invite Testers
   ↓
5. Testers Install via TestFlight App
   ↓
6. You Get Feedback & Can Push Updates
```

## 🔧 Step-by-Step: Using TestFlight

### Step 1: Prerequisites

- ✅ Apple Developer Account ($99/year)
- ✅ App Store Connect access (comes with Developer account)
- ✅ EAS CLI installed (`npm install -g eas-cli`)

### Step 2: Build Your App

```bash
cd baby-sleep-native-fixed

# Build for TestFlight
eas build --platform ios --profile preview
```

This creates an `.ipa` file that's ready for TestFlight.

### Step 3: Submit to TestFlight

**Option A: Automatic (Easiest)**
```bash
eas submit --platform ios
```

EAS will:
- Upload your build to App Store Connect
- Handle all the submission process
- You'll need App Store Connect API key or credentials

**Option B: Manual**
1. Download the `.ipa` from EAS dashboard
2. Go to [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
3. Select your app (or create new)
4. Go to TestFlight tab
5. Click "+" to add build
6. Upload the `.ipa` file

### Step 4: Wait for Processing

- Apple processes your build (usually 10-30 minutes)
- You'll get an email when it's ready
- Status shows in App Store Connect

### Step 5: Add Testers

**Internal Testers (Up to 100):**
- Team members in your Apple Developer account
- Can test immediately after processing
- No review required

**External Testers (Up to 10,000):**
- Anyone with an email address
- Requires App Store review (usually 24-48 hours)
- Can test for up to 90 days per build

**How to Add Testers:**

1. Go to App Store Connect
2. Select your app
3. Go to TestFlight tab
4. Click "Internal Testing" or "External Testing"
5. Click "+" to add testers
6. Enter email addresses
7. Testers receive invitation emails

### Step 6: Testers Install Your App

**What Testers Do:**

1. **Install TestFlight App:**
   - Download "TestFlight" from App Store (free)
   - Sign in with their Apple ID

2. **Accept Invitation:**
   - Open invitation email on their iPhone
   - Tap "View in TestFlight" or "Start Testing"
   - Or open TestFlight app and invitation appears

3. **Install Your App:**
   - Tap "Install" in TestFlight
   - App installs like a normal app
   - Appears on home screen with orange dot (TestFlight indicator)

4. **Use Your App:**
   - Works exactly like App Store app
   - Can provide feedback through TestFlight

## 🔄 Updating Your App

### For JavaScript Changes (Fast Updates):

```bash
# Publish update (no rebuild needed)
eas update --branch preview --message "Bug fixes"
```

- Updates appear in TestFlight within minutes
- Testers get notification to update
- No App Store review needed

### For Native Changes (Requires New Build):

```bash
# Rebuild app
eas build --platform ios --profile preview

# Submit new build
eas submit --platform ios
```

- New build goes through processing again
- Testers get notification of new version
- External testers may need review again

## 📊 TestFlight Features

### For You (Developer):

1. **Analytics:**
   - See how many testers installed
   - Track crashes and issues
   - View tester feedback

2. **Version Management:**
   - Multiple builds available
   - Can expire old builds
   - Testers can choose which version

3. **Feedback Collection:**
   - Testers can submit feedback
   - Screenshots and notes
   - Crash reports automatically collected

### For Testers:

1. **Easy Installation:**
   - Install via TestFlight app
   - No complicated setup
   - Works on any iPhone/iPad

2. **Feedback Tools:**
   - Built-in feedback button
   - Can attach screenshots
   - Submit issues directly

3. **Update Notifications:**
   - Get notified of new versions
   - One-tap updates
   - See what changed

## ⏱️ Timeline

**First Build:**
- Build: 15-20 minutes
- Processing: 10-30 minutes
- **Total: ~30-50 minutes**

**Updates:**
- JavaScript updates: 2-5 minutes (via `eas update`)
- Native updates: 30-50 minutes (new build)

**External Testing Review:**
- First time: 24-48 hours
- Updates: Usually faster (hours)

## 💰 Cost

- **TestFlight:** FREE (with Apple Developer account)
- **Apple Developer:** $99/year (required)
- **EAS Build:** Free tier available, then pay-per-build

## 🎯 TestFlight vs Other Options

| Feature | TestFlight | Development Build | App Store |
|---------|-----------|-------------------|-----------|
| **Cost** | Free (with Dev account) | Free (with Dev account) | Free (with Dev account) |
| **Max Testers** | 10,000 external | Unlimited | Unlimited |
| **Review Required** | External only | No | Yes |
| **Update Speed** | Fast (JS) / Slow (Native) | Fast (JS) / Slow (Native) | Slow (always reviewed) |
| **Ease of Use** | Very Easy | Easy | Easy |
| **Best For** | Beta testing | Development | Production |

## 📝 Complete Workflow Example

```bash
# 1. Build your app
eas build --platform ios --profile preview

# 2. Submit to TestFlight
eas submit --platform ios

# 3. Wait for processing (check email or App Store Connect)

# 4. Add testers in App Store Connect
#    - Go to TestFlight tab
#    - Add email addresses
#    - Testers get invitation emails

# 5. Testers install via TestFlight app

# 6. Make JavaScript changes and update quickly:
eas update --branch preview --message "Fixed login bug"

# 7. Testers get update notification automatically
```

## 🔐 Security & Privacy

- **Secure:** All builds are signed and verified by Apple
- **Private:** Only invited testers can access
- **Controlled:** You decide who gets access
- **Expires:** Builds expire after 90 days (external) or 60 days (internal)

## 🐛 Troubleshooting

### "Build processing failed"
- Check App Store Connect for error details
- Usually certificate or provisioning profile issues
- EAS usually handles these automatically

### "Testers not receiving invitations"
- Check spam folder
- Verify email addresses are correct
- Make sure build finished processing

### "Can't install app"
- Make sure TestFlight app is installed
- Check invitation was accepted
- Verify device is compatible

### "Update not appearing"
- Wait a few minutes for propagation
- Check branch name matches (`preview`)
- Restart TestFlight app

## 📚 Resources

- [TestFlight Documentation](https://developer.apple.com/testflight/)
- [App Store Connect](https://appstoreconnect.apple.com)
- [EAS Submit Docs](https://docs.expo.dev/submit/introduction/)

## ✅ Quick Checklist

Before using TestFlight:

- [ ] Apple Developer account ($99/year)
- [ ] App Store Connect access
- [ ] EAS CLI installed
- [ ] App configured in `app.json`
- [ ] Bundle identifier set
- [ ] Backend deployed (if testing away from home)

## 🎯 Best Practices

1. **Start with Internal Testing:**
   - Test with your team first
   - No review required
   - Faster iteration

2. **Use External Testing for Wider Beta:**
   - After internal testing is stable
   - Get real user feedback
   - Prepare for App Store

3. **Version Your Builds:**
   - Use meaningful version numbers
   - Add release notes
   - Track what changed

4. **Collect Feedback:**
   - Encourage testers to use feedback tools
   - Respond to issues quickly
   - Iterate based on feedback

## 💡 Pro Tips

- **Fast Iteration:** Use `eas update` for JavaScript changes (no rebuild needed)
- **Multiple Builds:** Keep previous builds available for rollback
- **Release Notes:** Always add notes so testers know what changed
- **Test Groups:** Create different groups for different testing phases
- **Expiration:** External builds expire after 90 days, plan accordingly

