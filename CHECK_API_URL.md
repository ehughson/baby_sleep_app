# 🔍 How to Check What URL Your Frontend is Using

## Method 1: Check Browser Console (After Page Loads)

The app now automatically logs the API URL when it loads. 

1. Open your live site
2. Open DevTools (Command + Option + I)
3. Go to **Console** tab
4. Look for: `API Base URL: https://...`
5. This shows what URL is being used

## Method 2: Check Network Tab (Most Reliable)

1. Open DevTools (Command + Option + I)
2. Go to **Network** tab
3. Try sending a message in your app
4. Look for the request to `/api/chat` or `/chat`
5. Click on it
6. Check:
   - **Request URL** - This is the full URL being called
   - **Status** - The error code
   - **Response** - Any error message

**What to look for:**
- If URL shows `localhost:5001` → Environment variable not set
- If URL shows `undefined` → Environment variable is undefined
- If URL shows wrong Railway URL → Environment variable has wrong value
- If URL is correct but still fails → Backend issue

## Method 3: Check the Failed Request

1. Network tab
2. Find the failed request (usually red)
3. Click on it
4. Look at:
   - **General** section → Request URL
   - **Headers** section → See full request
   - **Response** section → Error message

## What You Should See

**If configured correctly:**
```
Request URL: https://your-railway-url.up.railway.app/api/chat
```

**If NOT configured:**
```
Request URL: http://localhost:5001/api/chat
```
or
```
Request URL: undefined/api/chat
```

## Quick Fix

If you see `localhost` or `undefined`:

1. Go to Vercel/Netlify
2. Settings → Environment Variables
3. Add: `VITE_API_BASE_URL=https://your-railway-url.up.railway.app/api`
4. Redeploy
5. Hard refresh: `Command + Shift + R`

---

**The Network tab is the best way to see what's actually happening!** 📊

