# 🚀 Deployment Guide - Baby Sleep Helper

This comprehensive guide will help you deploy your Baby Sleep Helper app to production.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Deployment Options](#deployment-options)
3. [Step-by-Step Deployment](#step-by-step-deployment)
4. [Environment Variables](#environment-variables)
5. [Post-Deployment](#post-deployment)
6. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before deploying, make sure you have:

- ✅ Google Gemini API key ([Get one here](https://makersuite.google.com/app/apikey))
- ✅ Git repository (GitHub, GitLab, or Bitbucket)
- ✅ Accounts on your chosen hosting platforms

---

## Deployment Options

### Option 1: Railway (Recommended - Easiest) 🚂

**Best for**: Quick deployment, automatic HTTPS, easy environment variables

**Pros:**
- Free tier available
- Automatic deployments from GitHub
- Built-in database options
- Easy environment variable management

### Option 2: Render 🎨

**Best for**: Free tier with persistence

**Pros:**
- Free tier with PostgreSQL
- Automatic HTTPS
- Easy setup

### Option 3: Heroku 🟣

**Best for**: Established platform with many add-ons

**Cons:**
- No free tier (paid plans only)
- Requires credit card

### Option 4: Vercel + Railway (Recommended Split) ⚡

**Best for**: Optimal performance

- **Frontend**: Vercel (free, fast CDN)
- **Backend**: Railway (easy Python deployment)

---

## Step-by-Step Deployment

### 🎯 Option 1: Railway (Full Stack - Recommended)

#### Backend Deployment

1. **Create Railway Account**
   - Go to [railway.app](https://railway.app)
   - Sign up with GitHub

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository

3. **Configure Backend**
   - Railway will auto-detect Python
   - Set Root Directory to `backend`
   - Railway will automatically install dependencies from `requirements.txt`

4. **Set Environment Variables**
   - Go to your project → Variables
   - Add:
     ```
     GEMINI_API_KEY=your_api_key_here
     FLASK_ENV=production
     PORT=5000
     ```
   - Railway will automatically set `PORT`, but you can override it

5. **Deploy**
   - Railway will automatically deploy when you push to GitHub
   - Your backend URL will be: `https://your-app-name.up.railway.app`

#### Frontend Deployment

1. **Build Locally** (to get the backend URL first)
   ```bash
   cd frontend
   npm install
   ```

2. **Create `.env` file in frontend**
   ```bash
   cd frontend
   echo "VITE_API_BASE_URL=https://your-backend-url.up.railway.app/api" > .env
   ```

3. **Deploy to Vercel (Recommended) or Netlify**

   **Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Set Root Directory to `frontend`
   - Add Environment Variable:
     ```
     VITE_API_BASE_URL=https://your-backend-url.up.railway.app/api
     ```
   - Deploy!

   **Netlify:**
   - Go to [netlify.com](https://netlify.com)
   - Import your GitHub repository
   - Set Base directory to `frontend`
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Add Environment Variable:
     ```
     VITE_API_BASE_URL=https://your-backend-url.up.railway.app/api
     ```

---

### 🎯 Option 2: Render (Full Stack)

#### Backend Deployment

1. **Create Render Account**
   - Go to [render.com](https://render.com)
   - Sign up with GitHub

2. **Create New Web Service**
   - Click "New" → "Web Service"
   - Connect your GitHub repository
   - Configure:
     - **Name**: `baby-sleep-helper-backend`
     - **Environment**: Python 3
     - **Root Directory**: `backend`
     - **Build Command**: `pip install -r requirements.txt`
     - **Start Command**: `gunicorn app:app --bind 0.0.0.0:$PORT`

3. **Set Environment Variables**
   ```
   GEMINI_API_KEY=your_api_key_here
   FLASK_ENV=production
   ```

4. **Deploy**
   - Render will deploy automatically
   - Your backend URL: `https://baby-sleep-helper-backend.onrender.com`

#### Frontend Deployment

1. **Create Static Site**
   - Click "New" → "Static Site"
   - Connect your GitHub repository
   - Configure:
     - **Root Directory**: `frontend`
     - **Build Command**: `npm install && npm run build`
     - **Publish Directory**: `dist`

2. **Set Environment Variable**
   ```
   VITE_API_BASE_URL=https://baby-sleep-helper-backend.onrender.com/api
   ```

---

### 🎯 Option 3: Heroku (Backend Only)

#### Backend Deployment

1. **Install Heroku CLI**
   ```bash
   # macOS
   brew tap heroku/brew && brew install heroku
   
   # Or download from heroku.com
   ```

2. **Login to Heroku**
   ```bash
   heroku login
   ```

3. **Create Heroku App**
   ```bash
   cd backend
   heroku create your-app-name
   ```

4. **Set Environment Variables**
   ```bash
   heroku config:set GEMINI_API_KEY=your_api_key_here
   heroku config:set FLASK_ENV=production
   ```

5. **Deploy**
   ```bash
   git push heroku main
   ```

---

## Environment Variables

### Backend Variables

Set these in your hosting platform:

| Variable | Description | Example |
|----------|-------------|---------|
| `GEMINI_API_KEY` | Your Google Gemini API key | `AIza...` |
| `FLASK_ENV` | Flask environment | `production` |
| `PORT` | Server port (auto-set by most platforms) | `5000` |

### Frontend Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_BASE_URL` | Your backend API URL | `https://your-backend.railway.app/api` |

**Important**: 
- Frontend variables must start with `VITE_` to be accessible in Vite
- Update `.env` file in `frontend/` directory before building
- Or set in your hosting platform's environment variables

---

## Post-Deployment Checklist

After deployment, verify:

- [ ] Backend health check works: `https://your-backend-url/api/health`
- [ ] Frontend loads without errors
- [ ] Chat functionality works (test sending a message)
- [ ] Forum loads and you can see channels
- [ ] Can create posts in forum
- [ ] Authentication works (signup/login)
- [ ] CORS is configured (if you see CORS errors, check backend `CORS(app)` settings)

### Testing Your Deployment

1. **Test Backend**
   ```bash
   curl https://your-backend-url/api/health
   ```
   Should return JSON with `api_key_configured: true`

2. **Test Frontend**
   - Open your frontend URL
   - Try sending a chat message
   - Try creating a forum post
   - Try logging in/creating account

---

## Troubleshooting

### Common Issues

#### 1. CORS Errors
**Error**: `Access to XMLHttpRequest blocked by CORS policy`

**Solution**: 
- Verify `CORS(app)` is in `backend/app.py`
- Check that your frontend URL is allowed (most platforms allow all origins by default)

#### 2. API Key Not Working
**Error**: `Gemini API key not configured`

**Solution**:
- Verify environment variable is set: `GEMINI_API_KEY`
- Check for typos in variable name
- Restart your backend after setting variables

#### 3. Database Issues
**Error**: Database errors or data not persisting

**Solution**:
- SQLite works on most platforms for small apps
- For production, consider PostgreSQL (Railway/Render offer free tiers)
- Database file is in `backend/chatbot.db` - ensure it's writable

#### 4. Frontend Can't Connect to Backend
**Error**: `Failed to fetch` or network errors

**Solution**:
- Verify `VITE_API_BASE_URL` is set correctly
- Check backend URL is accessible (test in browser)
- Ensure backend is running
- Check for typos in the URL (trailing slashes, etc.)

#### 5. Build Failures

**Backend**:
- Ensure `requirements.txt` has all dependencies
- Check Python version (3.10+ recommended)

**Frontend**:
- Run `npm install` locally to check for issues
- Ensure Node.js version is compatible (16+)

#### 6. Environment Variables Not Working

**Frontend**:
- Variables must start with `VITE_`
- Rebuild after setting variables
- Check `.env` file is in `frontend/` directory

**Backend**:
- Restart after setting variables
- Check variable names match exactly

---

## Quick Reference

### Local Development

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

### Production Build

**Frontend:**
```bash
cd frontend
npm run build
# Deploy the `dist` folder
```

---

## Support

If you encounter issues:

1. Check the [Troubleshooting](#troubleshooting) section
2. Review your hosting platform's logs
3. Test locally first to isolate issues
4. Open an issue on GitHub with:
   - Error messages
   - Platform you're using
   - Steps to reproduce

---

## Next Steps

After successful deployment:

1. **Custom Domain** (Optional): Add your own domain in platform settings
2. **Monitoring**: Set up error tracking (Sentry, etc.)
3. **Analytics**: Add analytics to track usage
4. **Backup**: Set up database backups if using PostgreSQL

---

**Happy Deploying! 🎉**

Your app helps tired parents everywhere - make it accessible to them!
