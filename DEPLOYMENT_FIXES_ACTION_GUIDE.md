# 🚀 Quick Action Guide: Apply CORS & Vercel Fixes

## What Was Fixed

✅ Backend CORS now uses environment variable and supports multiple origins  
✅ Frontend has `vercel.json` for proper SPA routing (fixes 404s)  
✅ Enhanced debugging logs in both frontend and backend  
✅ Updated deployment documentation

## 🔧 Actions Required

### 1. Update Backend on Render (5 minutes)

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Select your backend service: **solsign-1**
3. Click **"Environment"** tab
4. Add this new environment variable:

   **Key**: `FRONTEND_URL`  
   **Value**: `https://www.solsignai.com,https://solsignai.com`

5. Click **"Save Changes"**
6. Render will automatically redeploy (takes ~2-3 minutes)

**What this does**: Allows CORS requests from both www and non-www versions of your domain.

---

### 2. Redeploy Frontend on Vercel (2 minutes)

#### Option A: Push to Git (Recommended)
```bash
git add .
git commit -m "Fix CORS and add vercel.json for SPA routing"
git push
```
Vercel will automatically deploy in ~2 minutes.

#### Option B: Manual Redeploy
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **"Deployments"** tab
4. Click **"Redeploy"** on the latest deployment

**What this does**: 
- Deploys the new `vercel.json` file (fixes 404 errors on direct navigation)
- Adds enhanced error logging to help debug issues
- Shows configuration on app startup

---

### 3. Verify Environment Variables on Vercel

Make sure these are set correctly:

1. Go to Vercel Dashboard → Your Project → **"Settings"** → **"Environment Variables"**

2. Verify these three variables exist:

   ✅ `VITE_API_URL` = `https://solsign-1.onrender.com/trpc`  
   ✅ `VITE_SUPABASE_URL` = `https://rjtnaamhomcxqrwrovvw.supabase.co`  
   ✅ `VITE_SUPABASE_ANON_KEY` = (your Supabase anon key)

3. If `VITE_API_URL` is incorrect or missing, add/update it, then redeploy

---

## 🧪 Testing After Deployment

### 1. Check Backend Logs (Render)
1. Go to Render Dashboard → Your Backend Service
2. Click **"Logs"** tab
3. Look for startup message:
   ```
   🔒 CORS configured for origins: https://www.solsignai.com, https://solsignai.com
   ```

### 2. Check Frontend Console (Browser)
1. Open https://www.solsignai.com
2. Open browser DevTools (F12) → Console tab
3. Look for startup logs:
   ```
   🚀 SolSign Frontend Initializing...
   📍 Environment Configuration: { apiUrl: "https://solsign-1.onrender.com/trpc", ... }
   ```

### 3. Test Authentication
1. Try to sign in with your wallet
2. Watch the console for detailed logs:
   - `📡 tRPC request to: ...`
   - `🌐 CORS request from origin: ...`
3. If CORS fails, you'll see helpful error messages

---

## 🐛 Troubleshooting

### CORS Still Blocked?

**Check Backend Logs on Render:**
- Look for: `🌐 CORS request from origin: https://www.solsignai.com`
- If you see: `❌ CORS blocked for origin: ...`
- Then: The origin in logs doesn't match `FRONTEND_URL` environment variable

**Fix**: Update `FRONTEND_URL` to include the exact origin from logs.

### 404 Errors on Routes?

**Check if vercel.json is deployed:**
1. Go to Vercel Deployment logs
2. Look for: `Using vercel.json configuration`
3. If not present: Push a new commit to trigger rebuild

### Frontend Can't Connect to Backend?

**Check Console Logs:**
- Look for: `⚠️ VITE_API_URL is not configured!`
- Fix: Add/update `VITE_API_URL` in Vercel environment variables

---

## 📊 What You'll See in Logs

### Backend Logs (Render)
```
🔒 CORS configured for origins: https://www.solsignai.com, https://solsignai.com
Server listening on port 3001
🌐 CORS request from origin: https://www.solsignai.com
✅ CORS allowed for origin: https://www.solsignai.com
```

### Frontend Logs (Browser Console)
```
🚀 SolSign Frontend Initializing...
📍 Environment Configuration: {
  apiUrl: "https://solsign-1.onrender.com/trpc",
  supabaseUrl: "https://rjtnaamhomcxqrwrovvw.supabase.co",
  supabaseAnonKey: "✅ Set",
  origin: "https://www.solsignai.com"
}
🚀 Creating new tRPC client with config: { ... }
📡 tRPC request to: https://solsign-1.onrender.com/trpc/auth.getNonce...
```

---

## ✅ Success Checklist

After deploying changes:

- [ ] Backend shows CORS configuration in logs
- [ ] Frontend shows environment configuration in console
- [ ] No CORS errors in browser console
- [ ] Can navigate directly to `/landing`, `/login` (no 404)
- [ ] Wallet connection works
- [ ] Authentication works
- [ ] No "Failed to fetch" errors

---

## 🎉 Expected Outcome

✅ Both `www.solsignai.com` and `solsignai.com` work  
✅ Direct navigation to any route works (no 404s)  
✅ CORS errors are gone  
✅ Helpful debug logs when things go wrong  
✅ Easy to add more allowed origins in the future

---

## 📝 Code Changes Summary

### Backend (`apps/backend/src/index.ts`)
- Replaced hardcoded CORS origin with `FRONTEND_URL` environment variable
- Added support for multiple comma-separated origins
- Added detailed CORS logging with emojis for easy debugging

### Frontend (`apps/frontend/`)
- **New file**: `vercel.json` - Handles SPA routing and security headers
- `src/main.tsx` - Added startup configuration logging
- `src/providers/TRPCProvider.tsx` - Added detailed fetch error logging

### Documentation
- `apps/backend/DEPLOYMENT_RENDER.md` - Added `FRONTEND_URL` documentation
- `VERCEL_DEPLOYMENT_GUIDE.md` - Added `vercel.json` explanation and CORS troubleshooting

---

**Need help?** Check the logs first - they're now very detailed and will guide you to the problem!

