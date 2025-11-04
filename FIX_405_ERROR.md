# 🔧 Fixing 405 Method Not Allowed Error

## What is a 405 Error?

A **405 Method Not Allowed** error means:
- The route exists
- But the HTTP method (GET, POST, etc.) isn't allowed
- Or there's a CORS preflight issue

## Common Causes

### 1. CORS Preflight Failure (Most Likely)

Browsers send an **OPTIONS** request before POST requests to check CORS permissions. If this fails, you get a 405.

**Fix**: CORS configuration should allow OPTIONS method ✅ (Already fixed in code)

### 2. Route Path Mismatch

The frontend might be calling the wrong path.

**Check**:
- Frontend calls: `/api/chat`
- Backend route: `/api/chat` ✅

### 3. Railway/Gunicorn Configuration

Sometimes the server doesn't handle CORS properly.

## Solutions

### Solution 1: Verify CORS Configuration

The backend should have:
```python
CORS(app, resources={r"/api/*": {
    "origins": "*", 
    "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    "allow_headers": ["Content-Type", "Authorization"]
}})
```

✅ This is already in the code!

### Solution 2: Check Railway Logs

1. Go to Railway dashboard
2. Your service → Deployments → Latest → Logs
3. Look for:
   - 405 errors
   - CORS errors
   - Route not found errors

### Solution 3: Test Directly

Test the endpoint with curl:

```bash
curl -X POST https://your-railway-url.up.railway.app/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "test"}'
```

**If this works**: Problem is CORS/frontend
**If this fails**: Problem is backend

### Solution 4: Check Frontend URL

In browser console (F12), check:
```javascript
console.log(import.meta.env.VITE_API_BASE_URL)
```

Should show: `https://your-railway-url.up.railway.app/api`

### Solution 5: Verify Route is Registered

Add a test route to verify routing works:

```python
@app.route('/api/test', methods=['GET', 'POST'])
def test():
    return jsonify({'status': 'ok', 'method': request.method})
```

Test: `https://your-railway-url.up.railway.app/api/test`

## Quick Debug Steps

1. **Check browser Network tab (F12)**:
   - Look for the `/api/chat` request
   - Check if it's making OPTIONS request first
   - See the exact error response

2. **Check Railway logs**:
   - See what requests are coming in
   - Check if route is being hit

3. **Test health endpoint**:
   ```
   https://your-railway-url.up.railway.app/api/health
   ```
   - If this works, routing is fine
   - If this fails, backend isn't running correctly

4. **Check CORS headers in response**:
   - In Network tab, click on the failed request
   - Check Response Headers
   - Should see `Access-Control-Allow-*` headers

## Most Likely Fix

The CORS configuration has been updated to explicitly allow OPTIONS method. 

**Action needed**:
1. Push the updated code to GitHub
2. Railway will auto-deploy
3. Test again

Or manually redeploy in Railway.

## Still Getting 405?

1. **Check Railway logs** - Look for the actual error
2. **Test with curl** - See if it's a CORS issue or route issue
3. **Verify environment variables** - Make sure backend is running
4. **Check Network tab** - See the exact request/response

---

**The updated CORS config should fix this! Redeploy your backend.** 🚀

