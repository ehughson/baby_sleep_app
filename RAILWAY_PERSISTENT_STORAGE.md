# Railway Persistent Storage Setup

## Problem
By default, Railway uses ephemeral storage. Every time your app redeploys, the filesystem is wiped, which means:
- ❌ All user accounts are lost
- ❌ All database data is lost
- ❌ All uploaded files are lost

## Solution: Use Railway Volumes

Railway provides persistent storage through **Volumes**. Here's how to set it up:

### Step 1: Create a Volume in Railway

1. Go to your Railway project dashboard
2. Click on your backend service
3. Go to the **"Volumes"** tab (or **"Storage"** tab)
4. Click **"Create Volume"** or **"Add Volume"**
5. Configure the volume:
   - **Mount Path**: `/data`
   - **Name**: `persistent-storage` (or any name you prefer)
   - **Size**: Start with 1GB (you can increase later)

### Step 2: Verify the Setup

After creating the volume, Railway will automatically mount it at `/data` in your container.

The code has been updated to automatically:
- Use `/data/chatbot.db` for the database (if `/data` exists)
- Fall back to `chatbot.db` in the current directory for local development

### Step 3: Restart Your Service

1. Go to your service settings
2. Click **"Restart"** or **"Redeploy"**
3. Wait for the deployment to complete

### Step 4: Verify It's Working

After restarting, check your Railway logs. You should see the database being initialized. Your data will now persist across deployments!

## Important Notes

- **First Deployment**: The database will be empty after the first deployment with the volume. You'll need to create accounts again.
- **Backups**: Consider setting up regular backups of your database file
- **Size Limits**: Monitor your volume size - Railway has limits based on your plan

## Troubleshooting

### Database still resets after deployment

1. Check that the volume is mounted:
   - Go to your service → Volumes tab
   - Verify the volume shows as "Mounted" or "Active"

2. Check the logs:
   - Look for any errors about `/data` directory
   - Verify the database path in logs

3. Verify the mount path:
   - The code expects `/data` to exist
   - If Railway mounts it elsewhere, update `database.py` accordingly

### Can't create volume

- Make sure you're on a Railway plan that supports volumes
- Free tier may have limitations
- Check Railway's documentation for current volume support

## Alternative: Use PostgreSQL

If volumes don't work for you, consider switching to Railway's PostgreSQL service:
- More reliable for production
- Automatic backups
- Better performance
- Requires code changes to use PostgreSQL instead of SQLite

