# Railway Persistent Storage Setup

## Problem
By default, Railway uses ephemeral storage. Every time your app redeploys, the filesystem is wiped, which means:
- ❌ All user accounts are lost
- ❌ All database data is lost
- ❌ All uploaded files are lost

## Solution: Use Railway Volumes

Railway provides persistent storage through **Volumes**. Here's how to set it up:

### Step 1: Attach a Volume to Your Service

1. Go to your Railway project dashboard
2. Click on your **backend service** (the Python/Flask service) - it should be visible in your project
3. Look for one of these options:
   - A **"Volumes"** tab at the top (next to Deployments, Metrics, etc.)
   - A **"Storage"** section in the sidebar
   - An **"Add Volume"** or **"Attach Volume"** button somewhere on the service page
   - Or go to the service → Look for **"Settings"** → Then look for **"Volumes"** or **"Storage"**

4. Once you find the Volumes section, click **"New Volume"** or **"Attach Volume"** or **"Add"**
5. Configure the volume:
   - **Mount Path**: `/data` (this is what the code expects - must be exactly `/data`)
   - **Name**: `persistent-storage` (or any name you prefer)
   - **Size**: Start with 1GB (you can increase later if needed)
6. Click **"Create"** or **"Attach"** or **"Add"**

**Important**: The mount path must be exactly `/data` - this is what the code is configured to use.

**If you can't find Volumes:**
- Try clicking on the service name/icon to see all available tabs
- Look in the right sidebar or bottom panel
- Check if there's a "More" or "..." menu with additional options
- Railway's UI may vary - volumes might be under "Resources" or "Add-ons"

### Step 2: Verify the Setup

After creating the volume, Railway will automatically mount it at `/data` in your container.

The code has been updated to automatically:
- Use `/data/chatbot.db` for the database (if `/data` exists)
- Fall back to `chatbot.db` in the current directory for local development

### Step 3: Verify and Restart

1. After attaching the volume, verify it shows as attached/mounted in the Volumes tab
2. The service should automatically redeploy, but if not:
   - Go to your service settings
   - Click **"Restart"** or **"Redeploy"**
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

