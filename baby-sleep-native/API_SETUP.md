# API Configuration Guide

## The Problem
The iOS simulator can't connect to `localhost:5001` if your backend isn't configured correctly or if there are network issues.

## Solutions

### Option 1: Use Your Computer's IP Address (Recommended for Physical Devices)

1. **Find your computer's IP address:**
   ```bash
   # On Mac/Linux:
   ifconfig | grep "inet " | grep -v 127.0.0.1
   
   # Or:
   ipconfig getifaddr en0
   ```

2. **Update the API URL:**
   - Edit `src/constants/api.ts`
   - Replace `localhost` with your IP (e.g., `http://192.168.1.100:5001/api`)
   - Or set environment variable: `EXPO_PUBLIC_API_BASE_URL=http://192.168.1.100:5001/api`

3. **Make sure your backend accepts connections:**
   - In `backend/app.py`, make sure Flask is running on `0.0.0.0` not just `127.0.0.1`
   - Should be: `app.run(host='0.0.0.0', port=5001)`

### Option 2: Use localhost (Works for iOS Simulator)

For iOS Simulator, `localhost` should work. If it doesn't:

1. **Make sure your backend is running:**
   ```bash
   cd backend
   python app.py
   ```

2. **Check Flask is listening on all interfaces:**
   - Look for: `Running on http://0.0.0.0:5001`
   - Not: `Running on http://127.0.0.1:5001`

3. **Try restarting Expo:**
   ```bash
   npx expo start --clear
   ```

### Option 3: Use Expo Tunnel (For Testing on Physical Device)

1. **Start Expo with tunnel:**
   ```bash
   npx expo start --tunnel
   ```

2. **This will create a public URL** that works from anywhere

### Option 4: Use ngrok (For Testing on Physical Device)

1. **Install ngrok:**
   ```bash
   brew install ngrok
   ```

2. **Start ngrok tunnel:**
   ```bash
   ngrok http 5001
   ```

3. **Copy the forwarding URL** (e.g., `https://abc123.ngrok.io`)
4. **Update API_BASE_URL** to use the ngrok URL

## Quick Test

To test if your backend is accessible:

```bash
# From your computer:
curl http://localhost:5001/api/health

# Should return: {"status": "ok"}
```

## Current Configuration

The app is currently configured to use:
- **iOS Simulator**: `http://localhost:5001/api`
- **Android Emulator**: `http://10.0.2.2:5001/api`
- **Web**: `http://localhost:5001/api`

## Troubleshooting

1. **"Connection refused"**: Backend isn't running
2. **"Timeout"**: Backend is running but not accessible from simulator
3. **"Network request failed"**: Check firewall settings

## For Production

When deploying, you'll use your production backend URL (e.g., Railway, Render, etc.)

