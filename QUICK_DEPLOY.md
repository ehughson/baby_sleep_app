# 🚀 Quick Deployment Guide

## Fastest Way to Deploy (Railway + Vercel)

### Step 1: Deploy Backend (Railway) - 5 minutes

1. Go to [railway.app](https://railway.app) and sign up with GitHub
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository
4. In project settings:
   - Set **Root Directory** to `backend`
   - Go to **Variables** tab
   - Add: `GEMINI_API_KEY=your_api_key_here`
5. Railway will auto-deploy! Your backend URL will be shown (e.g., `https://your-app.up.railway.app`)
6. Copy your backend URL - you'll need it for the frontend

### Step 2: Deploy Frontend (Vercel) - 3 minutes

1. Go to [vercel.com](https://vercel.com) and sign up with GitHub
2. Click "Add New Project" → Import your repository
3. Configure:
   - **Root Directory**: `frontend`
   - **Framework Preset**: Vite (auto-detected)
4. In **Environment Variables**, add:
   ```
   VITE_API_BASE_URL=https://your-backend-url.up.railway.app/api
   ```
   (Replace with your actual Railway backend URL)
5. Click "Deploy"
6. Done! Your app is live! 🎉

### Step 3: Test

1. Visit your Vercel URL
2. Test the chat
3. Test the forum
4. Test login/signup

## Alternative: Deploy Both on Railway

1. Deploy backend as above
2. In Railway, create a **New Service** from the same repo
3. Configure:
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npx serve -s dist -l $PORT`
   - **Environment Variable**: `VITE_API_BASE_URL=https://your-backend-url.up.railway.app/api`
4. Deploy!

## Need Help?

Check the full [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions and troubleshooting.

