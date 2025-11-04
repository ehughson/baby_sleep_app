# 🔄 Automatic Deployment Setup

## How Automatic Deployments Work

When you connect your GitHub repository to hosting platforms (Railway, Vercel, etc.), they will **automatically deploy** whenever you push code to your main branch.

## ✅ One-Time Setup (Required)

### Railway (Backend)

1. **First Time Setup:**
   - Go to [railway.app](https://railway.app)
   - Click "New Project"
   - Select **"Deploy from GitHub repo"** (not "Empty Project")
   - Choose your repository
   - Set Root Directory to `backend`
   - Add environment variables
   - Railway will deploy automatically

2. **After Setup:**
   - Every time you `git push` to your main branch
   - Railway automatically detects the change
   - Builds your backend
   - Deploys the new version
   - ⏱️ Takes 2-5 minutes per deployment

### Vercel (Frontend)

1. **First Time Setup:**
   - Go to [vercel.com](https://vercel.com)
   - Click "Add New Project"
   - Import your GitHub repository
   - Set Root Directory to `frontend`
   - Add environment variables
   - Click "Deploy"

2. **After Setup:**
   - Every time you `git push` to your main branch
   - Vercel automatically detects the change
   - Builds your frontend
   - Deploys the new version
   - ⏱️ Takes 1-3 minutes per deployment

## 🔄 Workflow

```
1. Make changes to your code locally
2. git add .
3. git commit -m "Your changes"
4. git push origin main
   ↓
5. Railway detects push → Auto-deploys backend
6. Vercel detects push → Auto-deploys frontend
   ↓
7. Your live app is updated! 🎉
```

## 📋 What Gets Deployed Automatically

- ✅ **Code changes** - Any code you push
- ✅ **New features** - Automatically goes live
- ✅ **Bug fixes** - Instantly deployed
- ✅ **Dependency updates** - If you update `package.json` or `requirements.txt`

## ⚠️ What Doesn't Auto-Deploy

- ❌ **Environment variables** - You must update these manually in the platform dashboard
- ❌ **Database changes** - SQLite database isn't versioned, so schema changes need manual migration
- ❌ **Platform settings** - Build commands, domains, etc. must be changed in dashboard

## 🎯 Branch Configuration

By default, platforms deploy from your **main** or **master** branch.

### To Deploy from a Different Branch:

**Railway:**
- Settings → Source → Select branch

**Vercel:**
- Settings → Git → Production Branch → Select branch

### Preview Deployments (Vercel)

Vercel automatically creates preview deployments for:
- Pull requests
- Other branches (not main)

This lets you test changes before merging to main!

## 🔔 Notifications

Both platforms can send you notifications:
- **Railway**: Email notifications for deployments
- **Vercel**: Email, Slack, or Discord notifications

## ✅ Verify Auto-Deploy is Working

1. Make a small change (e.g., update a comment)
2. Push to GitHub:
   ```bash
   git add .
   git commit -m "Test auto-deploy"
   git push origin main
   ```
3. Check your platform dashboard - you should see a new deployment starting
4. Wait 2-5 minutes
5. Check your live site - changes should be live!

## 🛠️ Manual Deploy (If Needed)

Sometimes you might want to manually trigger a deployment:

**Railway:**
- Click "Redeploy" button in your project

**Vercel:**
- Go to Deployments tab
- Click "Redeploy" on any deployment

## 🚨 Troubleshooting

### Auto-deploy not working?

1. **Check GitHub connection:**
   - Railway: Settings → Source → Verify repo is connected
   - Vercel: Settings → Git → Verify repo is connected

2. **Check branch:**
   - Ensure you're pushing to the branch that's configured for auto-deploy

3. **Check build logs:**
   - Railway: View logs in your project
   - Vercel: Check Deployments tab for build errors

4. **Reconnect repository:**
   - Disconnect and reconnect your GitHub repo in platform settings

## 💡 Pro Tips

1. **Use feature branches** - Create branches for features, test them, then merge to main
2. **Check deployment status** - Most platforms show deployment status in their dashboard
3. **Set up notifications** - Get notified when deployments succeed/fail
4. **Monitor logs** - Check build logs if deployments fail

---

**Bottom Line:** Once set up, just push to GitHub and your sites will automatically update! 🚀

