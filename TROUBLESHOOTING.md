# 🔧 Troubleshooting "Failed to send message" Error

## Quick Fixes (Try These First)

### 1. Check Environment Variable

**Problem**: Frontend can't find your backend URL

**Solution**:
1. Go to your Vercel/Netlify dashboard
2. Go to Settings → Environment Variables
3. Make sure you have:
   ```
   VITE_API_BASE_URL=https://your-railway-url.up.railway.app/api
   ```
4. **Important**: The URL must end with `/api`
5. **Important**: Must use `https://` (not `http://`)
6. Redeploy after adding/changing the variable

### 2. Verify Backend is Running

**Test your backend URL**:
1. Open a new browser tab
2. Go to: `https://your-railway-url.up.railway.app/api/health`
3. You should see JSON like: `{"api_key_configured": true, ...}`
4. If you get an error, your backend isn't running

### 3. Check API Key

**Problem**: Backend doesn't have the Gemini API key

**Solution**:
1. Go to Railway dashboard
2. Your project → Variables tab
3. Make sure `GEMINI_API_KEY` is set
4. Redeploy if you just added it

### 4. Check Browser Console

**To see detailed errors**:
1. Open your live site
2. Press `F12` (or right-click → Inspect)
3. Go to "Console" tab
4. Try sending a message
5. Look for red error messages
6. The error will tell you exactly what's wrong

## Common Issues & Solutions

### Issue: "Cannot connect to backend"

**Causes**:
- Wrong `VITE_API_BASE_URL` in frontend
- Backend not deployed/running
- Network/CORS issue

**Solutions**:
1. Verify backend URL in browser: `https://your-url.up.railway.app/api/health`
2. Check environment variable in Vercel/Netlify
3. Make sure URL ends with `/api`
4. Check Railway logs to see if backend is running

### Issue: "Server error: 404" or "Server error: 500"

**404 Error**:
- Backend route doesn't exist
- Check Railway logs for routing issues
- Verify the endpoint exists in `backend/app.py`

**500 Error**:
- Backend crashed
- Check Railway logs for error details
- Common causes:
  - Missing API key
  - Database issue
  - Python error

**Solution**:
1. Go to Railway dashboard
2. Click on your service
3. Go to "Deployments" or "Logs" tab
4. Look for error messages
5. Fix the issue based on the error

### Issue: CORS Error

**Error**: "Access to XMLHttpRequest blocked by CORS policy"

**Solution**:
- This should already be fixed in the code
- If you still see it, check `backend/app.py` has:
  ```python
  CORS(app, resources={r"/api/*": {"origins": "*"}})
  ```
- Redeploy backend after fixing

### Issue: Environment Variable Not Working

**Problem**: Changed `VITE_API_BASE_URL` but still using old URL

**Solution**:
- Environment variables are baked into the build
- **You must rebuild** after changing them:
  1. Go to Vercel/Netlify
  2. Trigger a new deployment (Redeploy)
  3. Or push a new commit to trigger auto-deploy

## Step-by-Step Debugging

### Step 1: Test Backend Directly

```bash
# In a browser or terminal:
curl https://your-railway-url.up.railway.app/api/health
```

**Expected**: JSON response with `api_key_configured: true`

**If it fails**: Backend isn't running or URL is wrong

### Step 2: Check Frontend Environment Variable

1. Open browser console (F12)
2. Type: `console.log(import.meta.env.VITE_API_BASE_URL)`
3. Should show your Railway URL + `/api`
4. If it shows `undefined` or wrong URL → fix environment variable

### Step 3: Check Network Tab

1. Open browser DevTools (F12)
2. Go to "Network" tab
3. Try sending a message
4. Look for the request to `/api/chat`
5. Click on it to see:
   - Request URL (should be your Railway URL)
   - Status code (should be 200)
   - Response (should be JSON)
   - Error message (if failed)

### Step 4: Check Railway Logs

1. Go to Railway dashboard
2. Your project → Service
3. Click "Deployments" or "Logs"
4. Look for:
   - Error messages
   - Python tracebacks
   - Missing module errors
   - API key errors

## Quick Checklist

- [ ] Backend is deployed and running (check Railway)
- [ ] Backend URL works: `https://your-url.up.railway.app/api/health`
- [ ] `GEMINI_API_KEY` is set in Railway
- [ ] `VITE_API_BASE_URL` is set in Vercel/Netlify
- [ ] `VITE_API_BASE_URL` ends with `/api`
- [ ] `VITE_API_BASE_URL` uses `https://` (not `http://`)
- [ ] Frontend was redeployed after setting environment variable
- [ ] Browser console shows correct API URL
- [ ] No CORS errors in console
- [ ] Railway logs show no errors

## Still Not Working?

### Get More Info

1. **Check browser console** - Look for detailed error messages
2. **Check Railway logs** - See backend errors
3. **Check Network tab** - See the actual HTTP request/response

### Common Mistakes

❌ **Wrong URL format**:
```
VITE_API_BASE_URL=https://your-url.up.railway.app  # Missing /api
```

✅ **Correct**:
```
VITE_API_BASE_URL=https://your-url.up.railway.app/api
```

❌ **Using http instead of https**:
```
VITE_API_BASE_URL=http://your-url.up.railway.app/api
```

✅ **Correct**:
```
VITE_API_BASE_URL=https://your-url.up.railway.app/api
```

❌ **Not redeploying after changing env var**:
- Environment variables are baked into the build
- Must redeploy after changing

## Need More Help?

1. **Check the error message** in browser console
2. **Check Railway logs** for backend errors
3. **Test backend URL** directly in browser
4. **Verify environment variables** are set correctly
5. **Redeploy** both frontend and backend

---

**Most Common Fix**: Set `VITE_API_BASE_URL` correctly and redeploy frontend! 🚀

