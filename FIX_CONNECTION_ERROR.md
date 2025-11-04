# 🔌 Fixing "An error occurred trying to load the resource"

## What This Error Means

This is a **network/connection error** - the frontend can't reach the backend at all. This could be:

1. **Wrong URL** - Frontend is calling the wrong backend URL
2. **Backend not running** - Railway service is down or crashed
3. **URL format issue** - Missing `/api` or wrong protocol
4. **CORS blocking** - Though this usually shows a different error

## Step-by-Step Debugging

### Step 1: Check What URL is Being Called

In the Network tab (F12 → Network):
1. Look for the `/api/chat` request
2. Click on it
3. Check the **Request URL** - What does it show?

**Common issues:**
- Shows `http://localhost:5001/api/chat` ❌ (environment variable not set)
- Shows `undefined/api/chat` ❌ (environment variable is undefined)
- Shows wrong Railway URL ❌ (typo or wrong URL)

### Step 2: Verify Environment Variable

In browser console (F12 → Console), type:
```javascript
console.log(import.meta.env.VITE_API_BASE_URL)
```

**What you should see:**
```
https://your-railway-url.up.railway.app/api
```

**If you see:**
- `undefined` → Environment variable not set in Vercel/Netlify
- `http://localhost:5001/api` → Environment variable not set (using default)
- Wrong URL → Environment variable has wrong value

### Step 3: Test Backend Directly

Open a new browser tab and go to:
```
https://your-railway-url.up.railway.app/api/health
```

**If this works:**
- Backend is running ✅
- Problem is frontend configuration ❌

**If this fails:**
- Backend is not running ❌
- Check Railway logs
- Check Railway deployment status

### Step 4: Check Railway Status

1. Go to Railway dashboard
2. Your project → Service
3. Check:
   - Is it "Running" or "Deployed"?
   - Any red error indicators?
   - Check "Logs" tab for errors

## Common Fixes

### Fix 1: Environment Variable Not Set

**Problem**: Frontend doesn't know your backend URL

**Solution**:
1. Go to Vercel/Netlify dashboard
2. Your project → Settings → Environment Variables
3. Add/Update:
   ```
   VITE_API_BASE_URL=https://your-railway-url.up.railway.app/api
   ```
4. **Important**: Must end with `/api`
5. **Important**: Must use `https://` (not `http://`)
6. Redeploy frontend

### Fix 2: Wrong URL Format

**Wrong:**
```
VITE_API_BASE_URL=https://your-url.up.railway.app  ❌ Missing /api
VITE_API_BASE_URL=http://your-url.up.railway.app/api  ❌ Wrong protocol
VITE_API_BASE_URL=your-url.up.railway.app/api  ❌ Missing protocol
```

**Correct:**
```
VITE_API_BASE_URL=https://your-url.up.railway.app/api  ✅
```

### Fix 3: Backend Not Running

**Check Railway**:
1. Dashboard → Your service
2. Is it deployed?
3. Check logs for errors
4. Restart/redeploy if needed

### Fix 4: CORS Still Blocking

Even though we fixed CORS, sometimes you need to:
1. Clear browser cache
2. Hard refresh: `Command + Shift + R`
3. Try incognito/private window

## Quick Diagnostic Checklist

1. **Browser Console** - What URL is it trying?
   ```javascript
   console.log(import.meta.env.VITE_API_BASE_URL)
   ```

2. **Network Tab** - What's the failed request URL?

3. **Backend Health** - Does this work?
   ```
   https://your-railway-url.up.railway.app/api/health
   ```

4. **Railway Status** - Is backend running?

5. **Environment Variable** - Is `VITE_API_BASE_URL` set correctly?

## Most Likely Fix

**Environment variable not set or wrong URL**

1. Check what URL the frontend is using (console/network tab)
2. Verify `VITE_API_BASE_URL` is set in Vercel/Netlify
3. Make sure it's exactly: `https://your-railway-url.up.railway.app/api`
4. Redeploy frontend
5. Hard refresh browser: `Command + Shift + R`

---

**Share what you see in the Network tab and browser console!** 🔍

