# Quick Start Guide

## Step 1: Initialize the Expo Project

If you haven't already, you'll need to run the Expo CLI to set up the project properly:

```bash
cd baby-sleep-native
npx expo install expo-router react-native-safe-area-context react-native-screens
```

## Step 2: Install Dependencies

```bash
npm install
```

## Step 3: Set Up Environment

Create a `.env` file in the root (optional):
```
EXPO_PUBLIC_API_BASE_URL=http://localhost:5001/api
```

Or edit `src/constants/api.ts` directly with your backend URL.

## Step 4: Create Basic App Structure

You'll need to create the `app` directory with Expo Router:

```bash
mkdir -p app/(auth) app/(tabs)
```

## Step 5: Start Development

```bash
npm start
```

Then:
- Press `i` for iOS simulator
- Press `a` for Android emulator
- Scan QR code with Expo Go app

## What's Already Done

✅ Project structure created
✅ Storage utilities (AsyncStorage/SecureStore)
✅ API configuration
✅ Auth service ported (TypeScript)
✅ Package.json with all dependencies

## What You Need to Do Next

1. **Create app entry point** (`app/_layout.tsx`)
2. **Create login screen** (`app/(auth)/login.tsx`)
3. **Create signup screen** (`app/(auth)/signup.tsx`)
4. **Create main tabs** (`app/(tabs)/_layout.tsx`, `chat.tsx`, `forum.tsx`, `friends.tsx`)
5. **Port remaining services** (chatService, forumService)
6. **Build UI components** (ChatMessage, ChatInput, etc.)

## Tips

- Start with authentication screens first - they're the foundation
- Test each screen as you build it
- Use TypeScript for better type safety
- The auth service is already set up - you just need to call it from your screens

## Common Issues

**"Module not found" errors:**
- Run `npm install` again
- Make sure you're in the `baby-sleep-native` directory

**Backend connection issues:**
- iOS Simulator: Use `http://localhost:5001/api`
- Android Emulator: Use `http://10.0.2.2:5001/api`
- Physical device: Use your computer's IP (e.g., `http://192.168.1.100:5001/api`)

**Expo Go app issues:**
- Make sure your phone and computer are on the same WiFi network
- Try restarting the Expo dev server

