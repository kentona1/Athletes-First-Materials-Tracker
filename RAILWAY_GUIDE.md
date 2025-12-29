# Railway Deployment Guide - GitHub Integration

## Overview
Railway + GitHub is the **best deployment workflow** for this project. Every `git push` automatically deploys updates!

---

## Step 1: GitHub Setup (5 minutes)

### Create Repository
```bash
cd athletes-first-tracker

# Initialize git
git init

# Add all files
git add .

# First commit
git commit -m "Initial commit - Athletes First Recruiting Tracker"

# Create main branch
git branch -M main
```

### Push to GitHub
```bash
# On GitHub.com:
# 1. Click "+" → New Repository
# 2. Name: athletes-first-tracker
# 3. Make it **Private** (recommended for business data)
# 4. Don't initialize with README (we have one)
# 5. Click "Create Repository"

# Connect and push:
git remote add origin https://github.com/YOUR-USERNAME/athletes-first-tracker.git
git push -u origin main
```

**Done!** Your code is now on GitHub.

---

## Step 2: Railway Deployment (10 minutes)

### Create Railway Account
1. Go to https://railway.app
2. Click "Login with GitHub"
3. Authorize Railway access

### Deploy Backend

1. **New Project:**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose `athletes-first-tracker`

2. **Configure Backend:**
   - Railway auto-detects Node.js
   - Click on the service
   - Settings → Root Directory: `backend`
   - Settings → Build Command: `npm install`
   - Settings → Start Command: `npm start`

3. **Add Environment Variables:**
   ```
   JWT_SECRET = [generate random 64-char string]
   NODE_ENV = production
   PORT = 3001
   ```

   **Generate JWT Secret:**
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```

4. **Generate Domain:**
   - Settings → Networking → Generate Domain
   - You get: `https://your-backend-abc123.up.railway.app`
   - Copy this URL!

### Deploy Frontend

1. **Add Service:**
   - Same project → "New Service"
   - Deploy from GitHub (same repo)

2. **Configure Frontend:**
   - Settings → Root Directory: `frontend`
   - Settings → Build Command: `npm install && npm run build`
   - Settings → Start Command: `npx serve -s build -l $PORT`

3. **Add Environment Variable:**
   ```
   REACT_APP_API_URL = [your backend Railway URL from above]
   ```

4. **Update API Calls** (one-time code change):
   
   In `frontend/src/pages/` files, replace:
   ```javascript
   axios.get('/api/players')
   ```
   
   With:
   ```javascript
   axios.get(`${process.env.REACT_APP_API_URL}/api/players`)
   ```

   Or better yet, create `frontend/src/config.js`:
   ```javascript
   export const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
   ```

   Then import and use:
   ```javascript
   import { API_URL } from '../config';
   axios.get(`${API_URL}/api/players`);
   ```

5. **Generate Domain:**
   - Settings → Networking → Generate Domain
   - You get: `https://your-frontend-xyz789.up.railway.app`

---

## Step 3: Update Backend CORS

Your backend needs to accept requests from the Railway frontend URL:

**File:** `backend/server.js`

```javascript
app.use(cors({
  origin: [
    'http://localhost:3000', // Local development
    'https://your-frontend-xyz789.up.railway.app' // Railway frontend
  ],
  credentials: true
}));
```

**Commit and push:**
```bash
git add .
git commit -m "Configure CORS for Railway deployment"
git push
```

Railway automatically redeploys! 🎉

---

## Step 4: Create Default Admin

SSH into your Railway backend or use their console:

```bash
# Railway Dashboard → Backend Service → Settings → Terminal
npm run create-admin
```

Or it should run automatically on first deployment if the database is new.

---

## Step 5: Test It!

1. Open your frontend URL: `https://your-frontend-xyz789.up.railway.app`
2. Login with `admin` / `admin123`
3. Change password immediately!
4. Add a test player
5. Check the heat map

---

## Automatic Deployments

Now whenever you make changes:

```bash
# Make your changes
git add .
git commit -m "Added feature X"
git push
```

Railway automatically:
1. Detects the push
2. Rebuilds both services
3. Deploys in ~2 minutes
4. Your app is updated!

---

## Sharing with Claude for Updates

**Perfect workflow:**

1. Give me your GitHub repo link
2. Tell me what you need
3. I can:
   - View your current code
   - Understand the context
   - Provide exact file changes
   - Give you commands to run

**Example conversation:**
```
You: "Here's my repo: github.com/yourname/athletes-first-tracker
      I need to add a feature that emails agents when new materials are logged"

Me: [views repo structure]
    "I can add that! Here's what we'll do:
     1. Add nodemailer to backend/package.json
     2. Create email service in backend/services/emailService.js
     3. Update materialsController.js to trigger emails
     
     Here's the exact code..."

You: [copies code, commits, pushes]
     Railway auto-deploys ✅
```

---

## Railway Features You'll Love

### 1. Automatic Database Backups
- Railway backs up your SQLite database
- Or upgrade to PostgreSQL for more features

### 2. View Logs in Real-Time
- Dashboard → Service → Logs
- See every request
- Debug issues instantly

### 3. Environment Variables
- Change without redeploying
- Different values for prod vs staging
- Secure credential storage

### 4. Metrics & Monitoring
- CPU usage
- Memory usage
- Request counts
- Response times

### 5. Custom Domains (Optional)
Instead of `abc123.up.railway.app`:
- Settings → Custom Domains
- Add `tracker.athletesfirst.com`
- Railway provides SSL automatically

---

## Costs

### Free Tier
- $5 credit per month
- Enough for light usage
- Perfect for testing

### Paid Usage
- $0.000463/GB-hour (memory)
- $0.000231/vCPU-hour
- **Typical cost: $5-15/month for your use case**

### Monitor Usage
- Dashboard shows current month spend
- Set spending limits
- Get alerts

---

## Database Management

### PostgreSQL Upgrade (Recommended)
```bash
# Railway Dashboard
1. New → Database → Add PostgreSQL
2. Copy connection string
3. Backend → Variables → DATABASE_URL = [connection string]
4. Update backend/database/db.js to use PostgreSQL
   (I can help with this migration)
```

**Benefits:**
- Better performance at scale
- Proper backups & replication
- Support for 1000+ concurrent users

### SQLite (Current)
- Fine for getting started
- Works well up to ~50 users
- Easy to upgrade later

---

## Security Checklist

Before going live:

- [ ] Changed admin password
- [ ] Set strong JWT_SECRET
- [ ] Railway URLs only accessible via HTTPS
- [ ] Environment variables set (not in code)
- [ ] CORS configured with frontend URL
- [ ] Database backups enabled
- [ ] Team members have appropriate roles

---

## Troubleshooting

### "Cannot connect to backend"
1. Check backend logs in Railway
2. Verify CORS configuration
3. Confirm frontend has correct API_URL

### "502 Bad Gateway"
- Backend crashed
- Check logs for errors
- Verify start command

### "Database locked"
- Multiple deploys at once
- Wait 30 seconds and try again
- Consider upgrading to PostgreSQL

### Need to rollback?
- Railway → Deployments → Pick previous version → Redeploy

---

## Alternative: Deploy Both as One Service

If you want simpler setup (single Railway service):

1. Create `server.js` in root that serves both:
```javascript
const express = require('express');
const path = require('path');
const app = express();

// API routes
app.use('/api', require('./backend/routes'));

// Serve frontend
app.use(express.static(path.join(__dirname, 'frontend/build')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/build/index.html'));
});
```

2. Single Railway service
3. One domain
4. Simpler but less flexible

I can help set this up if you prefer!

---

## Next Steps

1. ✅ Push code to GitHub (5 min)
2. ✅ Deploy to Railway (10 min)
3. ✅ Update CORS and API URLs
4. ✅ Test with admin login
5. ✅ Share URL with team
6. ✅ Share GitHub repo with me for future updates

Need help with any step? Just share your GitHub repo link and I'll guide you through!

---

## Quick Reference

**Local Development:**
```bash
./start.sh  # or start.bat
```

**Push Updates:**
```bash
git add .
git commit -m "Description of changes"
git push
# Railway auto-deploys!
```

**View Logs:**
Railway Dashboard → Service → Logs

**Rollback:**
Railway Dashboard → Deployments → Redeploy previous

**Share with Claude:**
"Here's my repo: github.com/username/athletes-first-tracker"
