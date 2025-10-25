# 🚀 Deployment Guide

This guide covers how to deploy the Baby Sleep Helper application to various platforms.

## 📋 Prerequisites

- Google Gemini API key
- Git repository access
- Basic knowledge of web deployment

## 🌐 Deployment Options

### Option 1: Railway (Recommended)

**Backend:**
1. Connect your GitHub repository to Railway
2. Add environment variable: `GEMINI_API_KEY`
3. Railway will automatically detect Python and install dependencies
4. Your backend will be available at `https://your-app.railway.app`

**Frontend:**
1. Build the frontend: `npm run build`
2. Deploy the `dist` folder to Railway or Netlify
3. Update API URL in `frontend/src/api/chatService.js`

### Option 2: Heroku

**Backend:**
1. Create a `Procfile` in the backend directory:
   ```
   web: python app.py
   ```
2. Deploy to Heroku
3. Set environment variable: `GEMINI_API_KEY`

**Frontend:**
1. Build: `npm run build`
2. Deploy to Netlify or Vercel

### Option 3: Vercel (Full Stack)

1. Connect your GitHub repository to Vercel
2. Configure build settings:
   - Backend: Python, `backend/` directory
   - Frontend: Node.js, `frontend/` directory
3. Add environment variables in Vercel dashboard

## 🔧 Environment Variables

Set these in your deployment platform:

```env
GEMINI_API_KEY=your_actual_api_key_here
```

## 📝 Post-Deployment Checklist

- [ ] Backend API is accessible
- [ ] Frontend can connect to backend
- [ ] Environment variables are set
- [ ] Database is working (SQLite for development)
- [ ] CORS is properly configured
- [ ] SSL/HTTPS is enabled

## 🐛 Troubleshooting

**Common Issues:**

1. **CORS Errors**: Ensure backend allows your frontend domain
2. **API Key Issues**: Verify environment variables are set correctly
3. **Database Issues**: Check if SQLite file is writable
4. **Build Errors**: Ensure all dependencies are installed

## 📞 Support

If you encounter issues during deployment, please open an issue on GitHub.
