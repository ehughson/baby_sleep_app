# Restart Instructions

Watchman is now installed! This should fix the "too many open files" error.

## Steps:

1. **Stop the current Expo process** (if it's still running):
   - Press `Ctrl+C` in the terminal where Expo is running

2. **Clear Metro bundler cache** (optional but recommended):
   ```bash
   cd baby-sleep-native
   npx expo start --clear
   ```

3. **Or just restart normally**:
   ```bash
   npm start
   ```

Watchman will now handle file watching more efficiently, and you shouldn't see the EMFILE error anymore.

## If you still see the error:

1. Make sure you're running from inside the `baby-sleep-native` directory
2. Try clearing the cache: `npx expo start --clear`
3. Restart your terminal
4. Check that watchman is running: `watchman version`

