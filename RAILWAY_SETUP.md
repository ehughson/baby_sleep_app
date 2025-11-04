# 🚂 Railway Backend Setup Guide

## Required Environment Variables

In Railway, go to your project → Variables tab and add:

### Essential Variables:

```
GEMINI_API_KEY=your_actual_api_key_here
FLASK_ENV=production
PORT=5000
```

### Optional (but recommended):

```
PYTHON_VERSION=3.10.12
```

## Railway Configuration

### Method 1: Using Root Directory (Recommended)

1. In Railway project settings:
   - **Root Directory**: `backend`
   - Railway will auto-detect Python and use `requirements.txt`
   - Railway will use the `Procfile` if present

2. **Start Command** (if Procfile doesn't work):
   ```
   gunicorn app:app --bind 0.0.0.0:$PORT --workers 2 --timeout 120
   ```

### Method 2: Using railway.json (Alternative)

Railway will automatically use `backend/railway.json` if present.

## Troubleshooting Railway Deployment

### Issue: App not starting

**Check Railway Logs:**
1. Go to Railway dashboard
2. Your service → "Deployments" tab
3. Click on latest deployment
4. Check "Logs" tab

**Common Errors:**

#### "Module not found"
- Railway might not be installing dependencies
- **Fix**: Add build command in Railway settings:
  ```
  pip install -r requirements.txt
  ```

#### "Port already in use" or "Address already in use"
- Railway sets PORT automatically
- **Fix**: Make sure your code uses `$PORT` environment variable
- Our code already does this ✅

#### "Gunicorn not found"
- Dependencies not installed
- **Fix**: Make sure `requirements.txt` includes `gunicorn==21.2.0`
- Make sure Railway is running build command

#### "Database error" or "Permission denied"
- SQLite database file might not be writable
- **Fix**: This is normal - Railway creates the database on first run
- If it persists, check Railway logs for specific error

### Issue: Health check fails

**Test in browser:**
```
https://your-railway-url.up.railway.app/api/health
```

**Should return:**
```json
{
  "status": "healthy",
  "api_key_configured": true,
  "service": "Baby Sleep Helper",
  "specialization": "Gentle sleep training and no-cry sleep solutions"
}
```

**If `api_key_configured: false`:**
- `GEMINI_API_KEY` is not set correctly
- Check Railway Variables tab
- Make sure variable name is exactly `GEMINI_API_KEY`
- Redeploy after adding

### Issue: 404 errors on all routes

**Problem**: Railway might not be detecting the app correctly

**Check:**
1. Root Directory is set to `backend`
2. Start command is correct
3. `app.py` exists in backend folder
4. Procfile exists and is correct

### Issue: Timeout errors

**Problem**: App takes too long to respond

**Fix**: Increase timeout in Procfile:
```
web: gunicorn app:app --bind 0.0.0.0:$PORT --workers 2 --timeout 300
```

## Railway Settings Checklist

- [ ] Root Directory: `backend`
- [ ] Build Command: `pip install -r requirements.txt` (or auto-detected)
- [ ] Start Command: `gunicorn app:app --bind 0.0.0.0:$PORT --workers 2 --timeout 120`
- [ ] Environment Variable: `GEMINI_API_KEY` is set
- [ ] Environment Variable: `FLASK_ENV=production` (optional but recommended)
- [ ] Python version: 3.10+ (Railway auto-detects, but you can set `PYTHON_VERSION`)

## Debugging Steps

### Step 1: Check Railway Logs

1. Go to Railway dashboard
2. Your service → Deployments
3. Click latest deployment
4. View logs
5. Look for:
   - Python errors
   - Missing modules
   - Port binding errors
   - API key errors

### Step 2: Test Backend Health

```bash
curl https://your-railway-url.up.railway.app/api/health
```

Or open in browser:
```
https://your-railway-url.up.railway.app/api/health
```

### Step 3: Verify Environment Variables

1. Railway dashboard → Your service
2. Variables tab
3. Verify:
   - `GEMINI_API_KEY` exists and has value
   - `PORT` is set (Railway auto-sets this)
   - `FLASK_ENV=production` (optional)

### Step 4: Check File Structure

Make sure Railway can see:
```
backend/
  ├── app.py
  ├── requirements.txt
  ├── Procfile
  ├── database.py
  ├── models.py
  └── railway.json (optional)
```

## Quick Fixes

### If Railway can't find Python:

Add `runtime.txt` to backend folder:
```
python-3.10.12
```

### If dependencies aren't installing:

Add explicit build command in Railway:
```
pip install --upgrade pip && pip install -r requirements.txt
```

### If app crashes on startup:

Check logs for:
- Import errors
- Database permission errors
- Missing environment variables

## Still Not Working?

1. **Check Railway logs** - Most errors show up there
2. **Test health endpoint** - See if backend is running at all
3. **Verify environment variables** - Especially `GEMINI_API_KEY`
4. **Check Root Directory** - Must be `backend`
5. **Redeploy** - Sometimes Railway needs a fresh deploy

---

**Most Common Issue**: Missing `GEMINI_API_KEY` environment variable or wrong Root Directory setting!

