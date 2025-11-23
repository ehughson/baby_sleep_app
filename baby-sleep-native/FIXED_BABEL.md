# ✅ Fixed Babel Config

## What Changed

Removed the deprecated `expo-router/babel` plugin from `babel.config.js`.

In Expo SDK 50+, `babel-preset-expo` already includes everything needed for expo-router, so the separate plugin is no longer required (and causes errors if included).

## Next Steps

1. **Stop Expo** (Ctrl+C if still running)

2. **Restart with cleared cache:**
   ```bash
   cd baby-sleep-native
   npm start
   ```
   Then press `c` to clear cache

3. **Press `i` for iOS simulator**

The app should now load without the Babel deprecation error!

