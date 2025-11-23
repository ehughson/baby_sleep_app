# React Native/Expo Migration Guide

## Overview
This guide outlines the step-by-step process to convert the web React app to React Native using Expo.

## Project Structure

```
baby-sleep-native/
├── app/                    # Expo Router app directory
│   ├── (auth)/            # Auth stack
│   │   ├── login.tsx
│   │   └── signup.tsx
│   ├── (tabs)/            # Main app tabs
│   │   ├── chat.tsx
│   │   ├── forum.tsx
│   │   └── friends.tsx
│   ├── profile.tsx
│   ├── baby-profile.tsx
│   ├── sleep-goals.tsx
│   └── _layout.tsx
├── src/
│   ├── services/          # API services (reusable from web)
│   │   ├── authService.ts
│   │   ├── chatService.ts
│   │   └── forumService.ts
│   ├── hooks/             # Custom React hooks
│   │   ├── useAuth.ts
│   │   └── useConversations.ts
│   ├── components/        # Reusable components
│   │   ├── ChatMessage.tsx
│   │   ├── ChatInput.tsx
│   │   └── ...
│   ├── utils/             # Utility functions
│   │   ├── storage.ts     # AsyncStorage wrapper
│   │   └── validation.ts
│   └── constants/         # App constants
│       └── api.ts
├── app.json
├── package.json
└── tsconfig.json
```

## Key Differences from Web

### 1. Storage
- **Web:** `localStorage`
- **React Native:** `@react-native-async-storage/async-storage` or `expo-secure-store` for tokens

### 2. Navigation
- **Web:** React Router or hash-based routing
- **React Native:** Expo Router (file-based) or React Navigation

### 3. UI Components
- **Web:** HTML elements (`<div>`, `<input>`, etc.)
- **React Native:** Native components (`<View>`, `<TextInput>`, `<ScrollView>`, etc.)

### 4. Styling
- **Web:** CSS classes or styled-components
- **React Native:** StyleSheet API or styled-components (React Native version)

### 5. Environment Variables
- **Web:** `import.meta.env.VITE_API_BASE_URL`
- **React Native:** `expo-constants` or `.env` with `react-native-dotenv`

## Migration Steps

### Phase 1: Setup (2-3 hours)
1. Initialize Expo project
2. Install dependencies
3. Configure environment variables
4. Set up TypeScript (optional but recommended)

### Phase 2: Core Services (3-4 hours)
1. Port API services (mostly copy-paste, replace localStorage)
2. Create storage utility wrapper
3. Set up Axios with proper base URL

### Phase 3: Authentication (4-6 hours)
1. Create login/signup screens
2. Implement auth state management
3. Add session persistence
4. Handle token refresh

### Phase 4: Main Features (20-30 hours)
1. Chat interface (messages, conversations)
2. Forum (channels, posts, DMs)
3. Friends (search, requests, list)
4. Profile screens (user, baby, sleep goals)

### Phase 5: Polish & Testing (10-15 hours)
1. Handle safe areas (notches, status bars)
2. Add loading states and error handling
3. Test on iOS and Android simulators
4. Fix platform-specific issues

## Dependencies Needed

```json
{
  "dependencies": {
    "expo": "~51.0.0",
    "expo-router": "~3.5.0",
    "react": "18.2.0",
    "react-native": "0.74.0",
    "axios": "^1.6.0",
    "@react-native-async-storage/async-storage": "^1.21.0",
    "expo-secure-store": "~13.0.0",
    "react-native-safe-area-context": "^4.8.0",
    "react-native-screens": "~3.31.0"
  }
}
```

## API Service Changes

### Before (Web):
```javascript
const token = localStorage.getItem('session_token');
```

### After (React Native):
```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
const token = await AsyncStorage.getItem('session_token');
```

## Next Steps
1. Run `npx create-expo-app@latest baby-sleep-native`
2. Install dependencies
3. Set up project structure
4. Port services one by one
5. Build screens incrementally

