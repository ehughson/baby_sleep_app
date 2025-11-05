# Railway Backend Connection Issues

If you're seeing "Unable to connect to server at https://babysleepapp-production.up.railway.app/api/auth/signup", follow these steps:

## 1. Check Railway Service Status

1. Go to [Railway Dashboard](https://railway.app)
2. Select your project
3. Check if the backend service shows:
   - ✅ **Active/Deployed** (green)
   - ❌ **Crashed/Error** (red) - This means the service failed to start

## 2. Check Railway Logs

1. In Railway dashboard, click on your backend service
2. Go to **"Deployments"** tab
3. Click on the latest deployment
4. Check **"Logs"** tab for errors

### Common Issues:

**"Worker failed to boot" / "View function mapping is overwriting"**
- This was fixed by renaming duplicate function names
- **Solution**: Redeploy the backend service

**"Port already in use"**
- Check if PORT environment variable is set correctly
- Railway automatically sets PORT, make sure your code uses `$PORT`

**"Database error"**
- Check if database file permissions are correct
- Railway may need write permissions for SQLite

## 3. Redeploy the Backend

After fixing code issues:

1. In Railway dashboard → Your backend service
2. Click **"Redeploy"** or **"Deploy"**
3. Wait for deployment to complete
4. Check logs to ensure it starts successfully

## 4. Verify Backend is Running

Once deployed, test the health endpoint:

```bash
curl https://babysleepapp-production.up.railway.app/api/health
```

You should get:
```json
{
  "status": "healthy",
  "api_key_configured": true,
  "service": "Baby Sleep Helper"
}
```

## 5. Check Environment Variables

In Railway → Variables tab, ensure you have:
- `GEMINI_API_KEY` (required)
- `FLASK_ENV=production` (optional but recommended)
- `PORT` (Railway sets this automatically, don't override)

## 6. Check CORS Configuration

The backend should have CORS enabled for all origins. If you're still getting CORS errors:
- Check Railway logs for CORS-related errors
- Verify the backend is actually running and receiving requests

## Quick Fix Checklist

- [ ] Backend service is deployed and active (green status)
- [ ] Latest code changes are pushed to GitHub (if using GitHub integration)
- [ ] Railway service has been redeployed after code changes
- [ ] Health endpoint `/api/health` returns a response
- [ ] Environment variables are set correctly
- [ ] No errors in Railway logs

