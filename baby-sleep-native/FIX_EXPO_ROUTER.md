# Fix: "unable to resolve module expo-router/entry"

## What I Fixed

1. ✅ Created `babel.config.js` - Required for expo-router to work
2. ✅ Verified `expo-router/entry.js` exists in node_modules
3. ✅ Verified `package.json` has correct `main` entry point

## Next Steps

1. **Stop the current Expo process** (Ctrl+C)

2. **Clear cache and restart:**
   ```bash
   cd baby-sleep-native
   npx expo start --clear
   ```

3. **If still having issues, try:**
   ```bash
   # Clear all caches
   rm -rf node_modules/.cache
   rm -rf .expo
   npx expo start --clear
   ```

## What the babel.config.js does

The babel config tells Metro bundler to:
- Use `babel-preset-expo` (standard Expo preset)
- Include the `expo-router/babel` plugin (required for file-based routing)

Without this file, expo-router can't process your `app/` directory structure.

## Verification

After restarting, you should see:
- No more "unable to resolve module" errors
- App loads successfully
- Navigation works between screens

