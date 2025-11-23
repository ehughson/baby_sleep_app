# Updated Metro Resolver

## What I Changed

Enhanced the Metro resolver to handle:
- `expo-router/entry` (standard)
- `./node_modules/expo-router/entry` (relative path that Metro is trying)
- Any variation that includes `expo-router/entry`

The resolver now checks for all these cases and returns the correct file path.

## Next Steps

1. **Stop Expo** (Ctrl+C)

2. **Clear ALL caches:**
   ```bash
   cd baby-sleep-native
   rm -rf .expo .metro node_modules/.cache
   watchman watch-del-all
   npm start
   ```
   Press `c` to clear cache

3. **Press `i` for iOS simulator**

The resolver should now catch the relative path that Metro is trying to use.

