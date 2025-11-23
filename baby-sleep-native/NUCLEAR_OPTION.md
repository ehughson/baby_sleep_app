# Nuclear Option - Recreate Project Properly

## The Problem

Metro bundler's module resolution is fundamentally broken. Even though:
- ✅ All packages are installed correctly
- ✅ Node.js can resolve the modules
- ✅ Files exist in node_modules

Metro still can't find them. This suggests the project wasn't initialized correctly with Expo.

## Solution: Recreate with create-expo-app

Since we manually created the project structure, Metro might not be configured correctly. The best solution is to:

1. **Create a new Expo project properly:**
   ```bash
   cd /Users/emma/baby_sleep_app
   npx create-expo-app@latest baby-sleep-native-new --template
   ```

2. **Copy over your code:**
   - Copy `src/` directory (services, components, etc.)
   - Copy `app/` directory (screens, navigation)
   - Copy configuration files (babel.config.js, etc.)

3. **Install dependencies:**
   ```bash
   cd baby-sleep-native-new
   npm install axios @react-native-async-storage/async-storage expo-secure-store
   ```

This will ensure Metro is properly configured from the start.

## Alternative: Try One More Fix

Before recreating, try:
```bash
cd baby-sleep-native
rm -rf node_modules package-lock.json
npm install
npx expo start --clear
```

This might fix any corrupted node_modules.

