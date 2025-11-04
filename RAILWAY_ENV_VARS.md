# 🔑 Railway Environment Variables - Required Setup

## ⚠️ CRITICAL: These Must Be Set in Railway

Go to your Railway project → **Variables** tab and add these:

### 1. GEMINI_API_KEY (REQUIRED)
```
GEMINI_API_KEY=your_actual_api_key_here
```
- **This is the most important one!**
- Without this, your backend will fail
- Get your key from: https://makersuite.google.com/app/apikey

### 2. FLASK_ENV (Recommended)
```
FLASK_ENV=production
```
- Tells Flask it's running in production
- Disables debug mode
- Improves performance

### 3. PORT (Usually Auto-Set)
```
PORT=5000
```
- Railway usually sets this automatically
- But you can set it explicitly if needed
- Your code already uses `os.getenv('PORT')` ✅

## How to Add Variables in Railway

1. Go to [railway.app](https://railway.app)
2. Click on your project
3. Click on your backend service
4. Go to **"Variables"** tab
5. Click **"New Variable"**
6. Add each variable:
   - **Name**: `GEMINI_API_KEY`
   - **Value**: Your actual API key
7. Click **"Add"**
8. Repeat for `FLASK_ENV` (set to `production`)
9. **Important**: After adding variables, Railway will auto-redeploy

## Verify Variables Are Set

1. In Railway Variables tab
2. You should see:
   - `GEMINI_API_KEY` (with a value)
   - `FLASK_ENV=production` (optional)
   - `PORT` (usually auto-set by Railway)

## Test After Adding Variables

1. Wait for Railway to redeploy (usually automatic)
2. Test health endpoint:
   ```
   https://your-railway-url.up.railway.app/api/health
   ```
3. Should return:
   ```json
   {
     "status": "healthy",
     "api_key_configured": true,
     ...
   }
   ```
4. If `api_key_configured: false`, the variable isn't set correctly

## Common Mistakes

❌ **Wrong variable name:**
- `GEMINI_API_KEY` (correct)
- `gemini_api_key` (wrong - case sensitive)
- `GEMINI-API-KEY` (wrong - use underscores)

❌ **Not redeploying:**
- After adding variables, Railway auto-redeploys
- But if it doesn't, manually trigger a redeploy

❌ **Value has extra spaces:**
- `GEMINI_API_KEY= AIza...` ❌ (has space before value)
- `GEMINI_API_KEY=AIza...` ✅ (no spaces)

## Still Not Working?

1. **Check Railway logs** - Look for "API key not configured" errors
2. **Verify variable name** - Must be exactly `GEMINI_API_KEY`
3. **Check variable value** - Copy/paste your API key carefully
4. **Redeploy** - Trigger a new deployment after adding variables
5. **Test health endpoint** - See if `api_key_configured: true`

---

**The FLASK_ENV variable is optional but recommended. The GEMINI_API_KEY is REQUIRED!** 🔑

