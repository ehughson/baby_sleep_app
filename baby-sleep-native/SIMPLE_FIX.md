# Simple Fix - Direct Require

## What I Did

1. ✅ Created `index.js` with a direct `require()` to the entry file
2. ✅ Updated `package.json` to use `index.js` as main
3. ✅ Simplified `metro.config.js` back to default (no custom resolver)

## Why This Should Work

- Using `require()` with a relative path that Metro can see and index
- No custom resolver bypassing Metro's file system
- Metro can compute SHA-1 for files it can see in the project

## Next Steps

1. **Stop Expo** (Ctrl+C)

2. **Clear cache:**
   ```bash
   cd baby-sleep-native
   rm -rf .expo .metro node_modules/.cache
   npm start
   ```
   Press `c` to clear cache

3. **Press `i` for iOS simulator**

This should work because Metro can now properly index the entry file through the relative require path.

