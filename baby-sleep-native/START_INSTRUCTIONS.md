# How to Start the App

## If `npx expo` doesn't work:

Use the npm script instead:
```bash
cd baby-sleep-native
npm start
```

Then press:
- `c` to clear cache
- `i` for iOS simulator
- `a` for Android emulator

## Or use npm directly:
```bash
npm start -- --clear
```

## Alternative: Install Expo CLI globally
```bash
npm install -g @expo/cli
```

Then you can use:
```bash
npx expo start --clear
```

## Current Setup

- ✅ Entry point: `index.js` (imports from expo-router/entry)
- ✅ Babel config: `babel.config.js` (configured for expo-router)
- ✅ Metro config: `metro.config.js` (default Expo config)
- ✅ All dependencies installed

The app should now start successfully!

