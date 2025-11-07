# Netlify Deployment Guide for Bloom Energy Contract System

## Overview

This application consists of:
- **Frontend**: React + Vite (can deploy to Netlify)
- **Backend**: Node.js + Express (needs separate hosting like Railway, Render, or Heroku)

## Prerequisites

1. Netlify account (free tier works for frontend)
2. Backend hosting platform account (Railway, Render, or Heroku recommended)
3. PostgreSQL database (can use Railway, Supabase, or Neon)

## Step 1: Deploy Backend First

The frontend needs the backend API URL, so deploy the backend first.

### Option A: Deploy to Railway (Recommended)

1. Go to [railway.app](https://railway.app) and sign up
2. Click "New Project" → "Deploy from GitHub repo"
3. Connect your GitHub account and select this repository
4. Railway will auto-detect Node.js and create a service
5. Add environment variables in Railway dashboard:
   - Copy all variables from `.env.production`
   - Update `DATABASE_URL` with Railway's PostgreSQL connection string
   - Update `ANTHROPIC_API_KEY` with your API key
   - Set `PORT` to `4003`
6. Railway will provide a URL like: `https://your-app.up.railway.app`
7. Note this URL for frontend configuration

### Option B: Deploy to Render

1. Go to [render.com](https://render.com) and sign up
2. Click "New +" → "Web Service"
3. Connect GitHub and select this repository
4. Configure:
   - **Name**: bloom-energy-backend
   - **Root Directory**: (leave empty)
   - **Environment**: Node
   - **Build Command**: `npm install && npm run db:generate`
   - **Start Command**: `npm run server:start`
5. Add environment variables from `.env.production`
6. Click "Create Web Service"
7. Note the URL: `https://your-app.onrender.com`

## Step 2: Deploy Frontend to Netlify

### Option A: Deploy via Netlify UI (Easiest)

1. Go to [netlify.com](https://netlify.com) and sign up
2. Click "Add new site" → "Import an existing project"
3. Connect to GitHub and select this repository
4. Configure build settings:
   - **Base directory**: (leave empty)
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
5. Click "Show advanced" → "New variable" and add:
   - `VITE_API_URL` = Your backend URL from Step 1 (e.g., `https://your-app.up.railway.app`)
   - `VITE_WS_URL` = Your backend WebSocket URL (e.g., `wss://your-app.up.railway.app`)
6. Click "Deploy site"
7. Netlify will build and deploy your site

### Option B: Deploy via Netlify CLI

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Initialize Netlify site
netlify init

# Set environment variables
netlify env:set VITE_API_URL "https://your-backend-url.up.railway.app"
netlify env:set VITE_WS_URL "wss://your-backend-url.up.railway.app"

# Build the frontend
npm run build

# Deploy to Netlify
netlify deploy --prod
```

## Step 3: Configure Backend CORS

Update the backend's `.env.production` CORS_ORIGIN to include your Netlify URL:

```env
CORS_ORIGIN="https://your-site.netlify.app,https://www.your-custom-domain.com"
```

Redeploy the backend with this change.

## Step 4: Set Up Custom Domain (Optional)

### In Netlify:
1. Go to Site Settings → Domain management
2. Click "Add custom domain"
3. Follow instructions to configure DNS

### Update Backend CORS:
Add your custom domain to `CORS_ORIGIN` in backend environment variables.

## Environment Variables Reference

### Frontend (Netlify)

Configure in Netlify UI under Site Settings → Environment Variables:

```env
VITE_API_URL=https://your-backend-url.up.railway.app
VITE_WS_URL=wss://your-backend-url.up.railway.app
VITE_APP_NAME=Bloom Energy Contract System
VITE_APP_VERSION=1.0.0
VITE_ENVIRONMENT=production
```

### Backend (Railway/Render)

Configure in your backend hosting platform:

```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/bloom_contracts

# Server
NODE_ENV=production
PORT=4003

# JWT
JWT_SECRET=your-super-secure-jwt-secret-key
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# AI
ANTHROPIC_API_KEY=sk-ant-...
DEFAULT_AI_PROVIDER=anthropic
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022

# Security
CORS_ORIGIN=https://your-site.netlify.app
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## Testing the Deployment

1. Visit your Netlify URL: `https://your-site.netlify.app`
2. Open browser console to check for errors
3. Try to login/register
4. Upload a document and test AI analysis
5. Check backend logs in Railway/Render dashboard

## Troubleshooting

### Frontend can't connect to backend
- Verify `VITE_API_URL` is set correctly in Netlify
- Check backend CORS includes Netlify URL
- Open browser console to see exact error

### Build fails on Netlify
- Check build logs in Netlify dashboard
- Verify `package.json` build script works locally: `npm run build`
- Make sure all dependencies are in `package.json`

### Backend crashes on startup
- Check environment variables are set correctly
- Verify database connection string is valid
- Check logs in Railway/Render dashboard

### WebSocket not connecting
- Verify `VITE_WS_URL` uses `wss://` (not `ws://`)
- Check backend WebSocket endpoint is accessible
- Verify CORS is configured for WebSocket connections

## Cost Estimates

- **Netlify (Frontend)**: Free tier (100GB bandwidth, 300 build minutes/month)
- **Railway (Backend + Database)**: ~$5-10/month for starter tier
- **Render (Backend)**: Free tier available (sleeps after 15min inactivity)
- **Database**:
  - Railway PostgreSQL: Included with service
  - Supabase: Free tier with 500MB storage
  - Neon: Free tier with 3GB storage

## Monitoring

### Netlify
- View build logs: Site → Deploys → Build log
- View analytics: Site → Analytics
- View functions: Site → Functions (if using)

### Railway/Render
- View logs: Service → Logs
- View metrics: Service → Metrics
- View deployments: Service → Deployments

## Continuous Deployment

Both Netlify and Railway/Render support automatic deployments:

1. Push to `main` branch triggers automatic build and deploy
2. Pull requests create preview deployments
3. Can configure deploy hooks for manual triggers

## Next Steps

After successful deployment:

1. Set up custom domain
2. Configure SSL certificate (automatic on Netlify)
3. Set up monitoring and alerts
4. Configure backup strategy for database
5. Set up CI/CD pipeline for automated testing
6. Configure analytics and error tracking (Sentry, LogRocket)

## Support

- Netlify Docs: https://docs.netlify.com/
- Railway Docs: https://docs.railway.app/
- Render Docs: https://render.com/docs
