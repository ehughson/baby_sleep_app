# 🔍 How to Find Your Railway App URL

## Quick Steps

1. **Go to Railway Dashboard**
   - Visit [railway.app](https://railway.app)
   - Sign in to your account

2. **Open Your Project**
   - Click on your project name (the one you created for the backend)

3. **Find the URL**
   - Look at the top of your service/application card
   - You'll see a section labeled **"Domains"** or **"Settings"**
   - Click on **"Settings"** tab
   - Scroll to **"Domains"** section
   - Your URL will look like: `https://your-app-name.up.railway.app`

## Alternative: In the Service Card

1. In your Railway project dashboard
2. Look at your backend service card
3. There's usually a **"Generate Domain"** button or a domain already shown
4. Click on it or copy the URL shown

## If You Don't See a Domain

1. Go to your service in Railway
2. Click on **"Settings"** tab
3. Scroll to **"Domains"** section
4. Click **"Generate Domain"** button
5. Railway will create a domain for you (e.g., `https://your-app.up.railway.app`)

## What the URL Looks Like

- Format: `https://[random-name].up.railway.app`
- Example: `https://baby-sleep-helper-production.up.railway.app`
- Or: `https://web-production-abc123.up.railway.app`

## For Your Frontend Configuration

Once you have your Railway URL, use it like this:

**In Vercel/Netlify Environment Variables:**
```
VITE_API_BASE_URL=https://your-railway-url.up.railway.app/api
```

**Important:** 
- Don't forget the `/api` at the end!
- Use `https://` (not `http://`)
- Copy the full URL including `.up.railway.app`

## Visual Guide

```
Railway Dashboard
├── Your Project
    ├── Your Service (backend)
        ├── Settings Tab
            ├── Domains Section
                └── https://your-app.up.railway.app ← HERE!
```

## Still Can't Find It?

1. Check if your deployment is still building (wait for it to finish)
2. Make sure you're looking at the correct service/project
3. Try refreshing the page
4. Check the Railway logs - the URL might be shown there

## Custom Domain (Optional)

You can also add a custom domain:
1. Go to Settings → Domains
2. Click "Custom Domain"
3. Add your domain (e.g., `api.yourdomain.com`)
4. Follow DNS setup instructions

---

**Quick Tip:** Bookmark your Railway URL - you'll need it for the frontend configuration!

