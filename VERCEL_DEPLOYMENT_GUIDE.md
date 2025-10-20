# Deploying Frontend to Vercel

Complete guide for deploying the SolSign React frontend to Vercel.

## 📋 Prerequisites

- [ ] Vercel account ([sign up free](https://vercel.com))
- [ ] GitHub repository access
- [ ] Backend deployed to Render (see `apps/backend/DEPLOYMENT_RENDER.md`)
- [ ] Correct Supabase anon key (NOT service_role key!)

## 🚨 Critical: Fix Security Issue First

Your current `.env` file has the **service_role key** in `VITE_SUPABASE_ANON_KEY`. This is a **critical security vulnerability** as it exposes admin privileges in the frontend.

### Get the Correct Key

1. Go to [Supabase Dashboard → API](https://app.supabase.com/project/rjtnaamhomcxqrwrovvw/settings/api)
2. Look for **"Project API keys"**
3. Copy the **`anon` `public`** key (NOT the `service_role` key!)
4. It should start with `eyJ...` but be different from your service_role key

**Keep this value ready** - you'll need it in the next steps.

## 🚀 Step 1: Connect Repository to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New..."** → **"Project"**
3. Import your GitHub repository:
   - If not connected, click **"Connect GitHub Account"**
   - Find and select your `solsign-mvp` repository
   - Click **"Import"**

## ⚙️ Step 2: Configure Build Settings

On the project configuration page:

### Framework Preset
Select: **Vite**

### Root Directory
Click **"Edit"** and set to: `apps/frontend`

### Build & Development Settings
- **Build Command**: Leave as default (`npm run build`)
- **Output Directory**: Leave as default (`dist`)
- **Install Command**: Leave as default (`npm install`)

**Note**: Vercel will automatically detect the frontend is in `apps/frontend` directory.

## 🔑 Step 3: Add Environment Variables

Click **"Environment Variables"** section.

Add these three variables:

### Variable 1: VITE_SUPABASE_URL

**Name**:
```
VITE_SUPABASE_URL
```

**Value**:
```
https://rjtnaamhomcxqrwrovvw.supabase.co
```

**Apply to**: ✅ Production, ✅ Preview, ✅ Development

---

### Variable 2: VITE_SUPABASE_ANON_KEY

**Name**:
```
VITE_SUPABASE_ANON_KEY
```

**Value**:
```
<PASTE_THE_CORRECT_ANON_KEY_YOU_GOT_FROM_SUPABASE>
```

⚠️ **CRITICAL**: This MUST be the **anon/public key**, NOT the service_role key!

**Apply to**: ✅ Production, ✅ Preview, ✅ Development

---

### Variable 3: VITE_API_URL

**Name**:
```
VITE_API_URL
```

**Value** (if backend is deployed):
```
https://solsign-backend.onrender.com/trpc
```

**Value** (if backend is still local):
```
http://localhost:3001/trpc
```

**Apply to**: ✅ Production, ✅ Preview, ✅ Development

**Note**: You'll update this later once your backend is deployed to Render.

---

## 🚢 Step 4: Deploy

1. Click **"Deploy"** at the bottom
2. Vercel will:
   - Clone your repository
   - Install dependencies
   - Build the frontend
   - Deploy to global CDN
3. Wait 2-3 minutes for deployment to complete

### Successful Deployment

You'll see:
```
✓ Build completed
✓ Deployment ready
```

## 🌐 Step 5: Get Your Deployment URL

After deployment completes, you'll see:

```
🎉 Congratulations! Your project has been deployed.

https://solsign-mvp-xxx.vercel.app
```

**Save this URL** - this is your production frontend!

## ✅ Step 6: Verify Deployment

### Test the Frontend

1. Open your Vercel URL in a browser
2. You should see the SolSign landing page
3. Try connecting your Solana wallet
4. Verify authentication works

### Check Browser Console

1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for any errors:

**❌ Bad:**
```
CORS error: Access denied
```
→ Your backend needs to allow your Vercel domain

**❌ Bad:**
```
Failed to fetch from http://localhost:3001/trpc
```
→ You need to update `VITE_API_URL` to your Render backend URL

**✅ Good:**
```
🚀 Creating new tRPC client
✅ Connected to Supabase
```

## 🔄 Step 7: Update Backend URL (After Backend Deployment)

Once you've deployed your backend to Render:

1. Go to Vercel Dashboard → Your Project
2. Click **"Settings"** → **"Environment Variables"**
3. Find `VITE_API_URL`
4. Click **"Edit"**
5. Change value to: `https://solsign-backend.onrender.com/trpc`
6. Click **"Save"**
7. Go to **"Deployments"** tab
8. Click **"Redeploy"** on the latest deployment

This will rebuild your frontend with the correct backend URL.

## 🔒 Step 8: Configure Backend CORS

Your backend needs to allow requests from your Vercel domain.

### In Your Backend Code

Edit `apps/backend/src/index.ts`:

```typescript
await server.register(cors, {
  origin: "https://solsign-mvp-xxx.vercel.app", // Your Vercel URL
});
```

### Or Allow All Vercel Domains

```typescript
await server.register(cors, {
  origin: /\.vercel\.app$/, // All Vercel preview + production
});
```

### Commit and Push

```bash
git add apps/backend/src/index.ts
git commit -m "Configure CORS for Vercel frontend"
git push
```

Render will auto-deploy your backend with the new CORS settings.

## 🧪 Step 9: Test Complete Flow

### Test Authentication

1. Open your Vercel frontend
2. Click **"Connect Wallet"**
3. Approve connection in Phantom/Solflare
4. Sign authentication message
5. Verify you're logged in

### Test Document Creation

1. Click **"New Document"**
2. Select a template
3. Fill in variables
4. Preview the document
5. Verify it generates correctly

### Test Document Signing

1. Create a document
2. Click **"Sign Now"**
3. Wait for blockchain transaction
4. Verify you see the transaction signature
5. Check document is marked as signed

## 📊 Monitoring & Analytics

### View Deployment Logs

1. Vercel Dashboard → Your Project
2. Click **"Deployments"** tab
3. Click on a deployment
4. View build logs and runtime logs

### Vercel Analytics (Optional)

Vercel provides free analytics:

1. Go to **"Analytics"** tab in your project
2. Enable Vercel Analytics
3. See page views, performance metrics, etc.

## 🔄 Automatic Deployments

Vercel automatically deploys when you push to GitHub:

### Production Branch

- Pushes to `main` (or your default branch) → Production deployment
- URL: `https://solsign-mvp.vercel.app`

### Preview Deployments

- Pushes to other branches → Preview deployments
- URL: `https://solsign-mvp-git-branch-name.vercel.app`
- Each PR gets a unique preview URL

### Manual Deployments

To manually trigger a deployment:

1. Go to **"Deployments"** tab
2. Click **"Redeploy"** on any deployment
3. Or use Vercel CLI:

```bash
npm install -g vercel
vercel --prod
```

## 🐛 Troubleshooting

### Build Fails

**Error: "Command failed: npm run build"**

**Fix**: Build works locally? Check:
1. All dependencies in `package.json`
2. Environment variables are set in Vercel
3. Build logs for specific error

Test locally:
```bash
cd apps/frontend
npm install
npm run build
```

### "Cannot find module" Errors

**Error: "Cannot find module '@/components/...'"**

**Fix**: Path alias issue. Verify `tsconfig.json` and `vite.config.ts` are in the frontend directory.

### CORS Errors in Browser

**Error: "CORS policy: No 'Access-Control-Allow-Origin'"**

**Fix**: Backend needs to allow your Vercel domain (see Step 8).

### "Failed to fetch" Errors

**Error: "Failed to fetch from https://..."**

**Fix**: 
1. Check `VITE_API_URL` is correct
2. Verify backend is running (test with `curl`)
3. Check backend logs for errors

### Authentication Not Working

**Error**: Can connect wallet but can't sign in

**Fix**:
1. Check `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are correct
2. Verify you're using **anon key**, not service_role key
3. Check browser console for Supabase errors
4. Test backend `/trpc/auth.verify` endpoint

### Environment Variables Not Applied

**Issue**: Changed env vars but still see old values

**Fix**:
1. After changing env vars, you MUST redeploy
2. Vercel Dashboard → Deployments → Redeploy
3. Or push a new commit to trigger rebuild

## 🎨 Custom Domain (Optional)

Want to use your own domain instead of `.vercel.app`?

1. Go to **"Settings"** → **"Domains"**
2. Click **"Add"**
3. Enter your domain (e.g., `app.solsign.ai`)
4. Follow DNS configuration instructions
5. Vercel provides free SSL automatically

## 💰 Cost

**Vercel Pricing:**

- **Hobby (Free)**: 
  - 100 GB bandwidth/month
  - Unlimited deployments
  - Perfect for development/testing

- **Pro ($20/month per user)**:
  - 1 TB bandwidth/month
  - Team collaboration
  - Advanced analytics

**For this project**: Free tier is sufficient for testing phase.

## 🔐 Security Checklist

- [ ] Using correct Supabase **anon key** (not service_role!)
- [ ] Backend CORS configured for your Vercel domain
- [ ] Environment variables set in Vercel (not hardcoded)
- [ ] No secrets committed to git
- [ ] HTTPS enabled (automatic with Vercel)

## 🔄 Updating the Frontend

### Automatic Updates

Just push to GitHub:

```bash
git add .
git commit -m "Update frontend"
git push
```

Vercel automatically deploys in ~2 minutes.

### Manual Rollback

If a deployment breaks something:

1. Go to **"Deployments"** tab
2. Find the last working deployment
3. Click **"..."** → **"Promote to Production"**

## 📝 Post-Deployment Checklist

- [ ] Frontend deployed successfully
- [ ] Correct Supabase anon key set
- [ ] Backend URL configured correctly
- [ ] Wallet connection works
- [ ] Authentication works
- [ ] Document creation works
- [ ] Document signing works
- [ ] No CORS errors in browser console
- [ ] Custom domain configured (if needed)

## 🎉 Success!

Your frontend is now live on Vercel! 

**Next steps:**
1. Test all features thoroughly
2. Share the URL with testers
3. Monitor Vercel analytics
4. Set up custom domain (optional)

---

**Production URL**: `https://solsign-mvp.vercel.app`  
**Backend API**: `https://solsign-backend.onrender.com/trpc`  
**Last Updated**: 2025-10-20  
**Status**: ✅ Ready for Production Testing

