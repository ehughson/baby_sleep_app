# REM-i Mobile App (React Native/Expo)

This is the React Native version of the REM-i baby sleep app, built with Expo.

## Getting Started

### Prerequisites
- Node.js (v18 or later)
- npm or yarn
- Expo CLI (installed globally or via npx)
- iOS Simulator (for Mac) or Android Studio (for Android)

### Installation

1. Install dependencies:
```bash
npm install
# or
yarn install
```

2. Configure your backend API URL:
   - Edit `src/constants/api.ts` or
   - Set `EXPO_PUBLIC_API_BASE_URL` environment variable
   - Or add to `app.json` under `extra.apiBaseUrl`

3. Start the development server:
```bash
npm start
# or
yarn start
```

4. Run on your platform:
   - Press `i` for iOS simulator
   - Press `a` for Android emulator
   - Scan QR code with Expo Go app on your phone

## Project Structure

```
baby-sleep-native/
├── app/                    # Expo Router screens
│   ├── (auth)/            # Authentication stack
│   ├── (tabs)/            # Main app tabs
│   └── _layout.tsx        # Root layout
├── src/
│   ├── services/          # API services
│   ├── hooks/             # Custom hooks
│   ├── components/        # Reusable components
│   ├── utils/             # Utilities (storage, etc.)
│   └── constants/         # App constants
└── assets/                # Images, fonts, etc.
```

## Key Features

- ✅ Authentication (login/signup)
- ✅ Secure token storage
- ✅ API service layer
- 🔄 Chat interface (in progress)
- 🔄 Forum (in progress)
- 🔄 Friends (in progress)
- 🔄 Profile management (in progress)

## Development Notes

### Storage
- Uses `AsyncStorage` for general data
- Uses `SecureStore` for sensitive tokens (session_token)

### API Services
- All services are in `src/services/`
- Services use the same backend API as the web app
- Token is automatically included in requests via `sessionStorage.getToken()`

### Navigation
- Uses Expo Router (file-based routing)
- Auth screens in `app/(auth)/`
- Main app in `app/(tabs)/`

## Next Steps

1. Complete authentication screens (login/signup UI)
2. Port chat service and create chat screens
3. Port forum service and create forum screens
4. Port friends service and create friends screens
5. Add profile management screens
6. Test on both iOS and Android
7. Handle edge cases and error states

## Troubleshooting

### Backend Connection Issues
- Ensure your Flask backend is running
- Check that `API_BASE_URL` in `src/constants/api.ts` is correct
- For iOS simulator, use `http://localhost:5001/api`
- For Android emulator, use `http://10.0.2.2:5001/api`
- For physical devices, use your computer's IP address

### Storage Issues
- If tokens aren't persisting, check SecureStore permissions
- Clear app data and re-login if needed

## Resources

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/)
- [Expo Router Documentation](https://docs.expo.dev/router/introduction/)

