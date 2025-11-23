# Troubleshooting: expo-router/entry not found

## Steps to Fix

### 1. Stop Expo Completely
Press `Ctrl+C` in the terminal where Expo is running.

### 2. Clear ALL Caches
```bash
cd baby-sleep-native
rm -rf node_modules/.cache
rm -rf .expo
rm -rf .metro
rm -rf ios/build  # if exists
rm -rf android/build  # if exists
```

### 3. Verify Files Exist
```bash
# Check entry file exists
ls -la node_modules/expo-router/entry.js

# Check babel config exists
ls -la babel.config.js

# Check package.json main field
cat package.json | grep '"main"'
# Should show: "main": "expo-router/entry"
```

### 4. Reinstall Dependencies (if needed)
```bash
npm install
```

### 5. Start Fresh
```bash
npx expo start --clear
```

## If Still Not Working

### Option A: Try without cache
```bash
npx expo start --clear --no-dev --minify
```

### Option B: Check Expo SDK version
```bash
npx expo --version
# Should match your package.json expo version
```

### Option C: Reinstall expo-router specifically
```bash
npm uninstall expo-router
npx expo install expo-router
```

### Option D: Check for conflicting files
Make sure you don't have:
- `index.js` in root (should use expo-router/entry)
- `App.js` or `App.tsx` in root (expo-router uses app/ directory)

## Verification

After restarting, check the console:
- Should NOT see "unable to resolve module" error
- Should see "Metro waiting on exp://..."
- App should load in simulator

## Common Causes

1. **Stale Metro cache** - Fixed by `--clear` flag
2. **Missing babel.config.js** - Already created ✅
3. **Wrong package.json main** - Should be "expo-router/entry" ✅
4. **Version mismatch** - Use `npx expo install` to fix
5. **Conflicting entry files** - Should only use expo-router/entry

