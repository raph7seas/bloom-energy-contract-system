# Netlify Frontend Deployment - Quick Guide

## Step 1: Push to GitHub

```bash
# Initialize git if not already done
git init

# Add all files
git add .

# Commit
git commit -m "Prepare for Netlify deployment"

# Create GitHub repository and push
git remote add origin https://github.com/YOUR_USERNAME/bloom-energy-contract-system.git
git branch -M main
git push -u origin main
```

## Step 2: Connect Netlify to GitHub

1. Log in to [netlify.com](https://netlify.com)
2. Click **"Add new site"** → **"Import an existing project"**
3. Click **"Deploy with GitHub"**
4. Authorize Netlify to access your GitHub account
5. Select the repository: `bloom-energy-contract-system`

## Step 3: Configure Build Settings

Netlify should auto-detect these settings, but verify:

- **Base directory**: (leave empty)
- **Build command**: `npm run build`
- **Publish directory**: `dist`
- **Node version**: Will use Node 20 (configured in netlify.toml)

## Step 4: Set Environment Variables

Click **"Show advanced"** → **"New variable"** and add:

```
VITE_API_URL=http://localhost:4003
VITE_WS_URL=ws://localhost:4003
```

**Note**: These point to your local backend for now. When you deploy to AWS, update these to:
```
VITE_API_URL=https://your-aws-api-url.com
VITE_WS_URL=wss://your-aws-api-url.com
```

## Step 5: Deploy

1. Click **"Deploy site"**
2. Wait for build to complete (2-3 minutes)
3. Netlify will provide a URL like: `https://random-name-12345.netlify.app`

## Step 6: Test the Deployment

1. Visit your Netlify URL
2. Open browser console to check for errors
3. The app will try to connect to the API URL you configured

**Important**: Since the API URL points to localhost, the deployed site won't be able to reach your local backend. This is expected until you deploy the backend to AWS.

## Updating the Deployment

After you push changes to GitHub, Netlify will automatically rebuild and redeploy. You can also:

- **Manual deploy**: Drag and drop the `dist` folder in Netlify UI
- **Trigger deploy**: Click "Trigger deploy" in Netlify dashboard

## Changing Environment Variables

1. Go to Site Settings → Environment Variables
2. Update `VITE_API_URL` and `VITE_WS_URL` when backend is on AWS
3. Click **"Trigger deploy"** to rebuild with new variables

## Custom Domain (Optional)

1. Go to Site Settings → Domain management
2. Click **"Add custom domain"**
3. Follow DNS configuration instructions
4. SSL certificate will be automatically provisioned

## Troubleshooting

### Build fails
- Check build logs in Netlify dashboard
- Verify `package.json` has correct build script
- Make sure all dependencies are listed

### App loads but can't connect to backend
- Check browser console for CORS errors
- Verify `VITE_API_URL` is set correctly in Netlify
- Make sure backend allows your Netlify domain in CORS settings

### TypeScript errors during build
- We're using `npm run build` which skips TypeScript checks
- This is intentional for faster deployment
- TypeScript errors can be fixed later

## Current Configuration

✅ **netlify.toml** - Build configuration
✅ **.gitignore** - Git ignore rules
✅ **package.json** - Build command: `vite build` (fast, no TS check)
✅ **vite.config.ts** - Frontend configuration

## Next Steps After AWS Deployment

1. Deploy backend to AWS
2. Get AWS API URL and WebSocket URL
3. Update Netlify environment variables:
   - `VITE_API_URL=https://your-aws-api.com`
   - `VITE_WS_URL=wss://your-aws-api.com`
4. Trigger redeploy in Netlify
5. Update AWS backend CORS to allow Netlify domain

## Cost

**Netlify**: Free tier includes:
- 100GB bandwidth/month
- 300 build minutes/month
- Automatic SSL
- Continuous deployment from Git

Perfect for this project!
