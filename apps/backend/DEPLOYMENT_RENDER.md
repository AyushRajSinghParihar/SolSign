# Deploying Backend to Render

Step-by-step guide for deploying the SolSign tRPC backend to Render.

## 📋 Prerequisites

- [ ] Render account ([sign up](https://render.com))
- [ ] GitHub repository access
- [ ] Solana devnet wallet keypair file
- [ ] All environment variable values ready

## 🚀 Step 1: Prepare Solana Keypair

The backend needs your Solana keypair to mint NFTs. Since cloud services can't access local files, we'll use an environment variable.

### Get Your Keypair JSON

On your local machine, run:

```bash
cat /home/tenxcoder/.config/solana/solsign-payer.json
```

You'll see output like:
```json
[123,45,67,89,12,34,56,78,90,12,34,56,78,90,12,34,56,78,90,12,34,56,78,90,12,34,56,78,90,12,34,56,78,90,12,34,56,78,90,12,34,56,78,90,12,34,56,78,90,12,34,56,78,90,12,34,56,78,90,12,34,56]
```

**Copy this entire array** (including brackets). You'll paste it into Render in the next steps.

⚠️ **Security Warning**: This is your private key. Never commit it to git or share it publicly!

## 🔧 Step 2: Create Web Service on Render

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub account (if not already connected)
4. Select your SolSign repository
5. Click **"Connect"**

## ⚙️ Step 3: Configure Build Settings

On the configuration page, set:

| Setting | Value |
|---------|-------|
| **Name** | `solsign-backend` |
| **Region** | Choose closest to your users (e.g., Oregon, Ohio) |
| **Branch** | `main` (or your deployment branch) |
| **Root Directory** | `apps/backend` |
| **Environment** | `Node` |
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `npm start` |
| **Instance Type** | Starter ($7/mo) or higher |

### Why Starter Instance?

- Free tier has cold starts (slow initial requests)
- Starter tier keeps service always running
- Better for production use

## 🔑 Step 4: Add Environment Variables

Click **"Advanced"** → Scroll to **"Environment Variables"**

Add each of these variables:

### Server Configuration

```bash
PORT=3001
NODE_ENV=production
```

### Supabase Configuration

```bash
SUPABASE_URL=https://rjtnaamhomcxqrwrovvw.supabase.co
```

```bash
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJqdG5hYW1ob21jeHFyd3JvdnZ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzEyODkyMCwiZXhwIjoyMDY4NzA0OTIwfQ.NAloHw6Y22pIowBujZbnQ7t9bevqWOtsL4r2XtQAltY
```

⚠️ **IMPORTANT - Get Correct Anon Key**: 
Go to [Supabase Dashboard → API Settings](https://app.supabase.com/project/rjtnaamhomcxqrwrovvw/settings/api) and copy the **anon** `public` key (NOT the service_role key!)

```bash
SUPABASE_ANON_KEY=<PASTE_CORRECT_ANON_KEY_HERE>
```

```bash
SUPABASE_JWT_SECRET=Ba/CKo/SGsWYQvI3QB2MEC5HAhnt6s06oicE9b7c0zqqD1pVZUM3SdHvXq/rFLk8kD5xg89e3n1uTOhXgvqG3Q==
```

### Solana Configuration

**This is the keypair you copied in Step 1:**

```bash
PAYER_KEYPAIR_JSON=[paste the entire array here including brackets]
```

Example (your values will be different):
```
PAYER_KEYPAIR_JSON=[123,45,67,89,12,34,56,78,90,12,34,56,78,90,12,34,56,78,90,12,34,56,78,90,12,34,56,78,90,12,34,56,78,90,12,34,56,78,90,12,34,56,78,90,12,34,56,78,90,12,34,56,78,90,12,34,56,78,90,12,34,56]
```

```bash
SOLANA_RPC_ENDPOINT=https://devnet.helius-rpc.com/?api-key=ef9eec16-5e0c-441a-a05e-194cb1d65c77
```

```bash
SOLSIGN_PROGRAM_ID=2LQ91xbS59NBWa6VbPxwzjNCPYVGqudcJ1cffBqmYmp2
```

### AI Configuration

```bash
GEMINI_API_KEY=AIzaSyB82qjAKuFnUPp68Lauacewy9MyNtRSOU4
```

### Email Configuration

```bash
RESEND_API_KEY=re_CKZBQV9C_G2kwjH6kuJbC2ARbk6S2ARzt
```

## 🚢 Step 5: Deploy

1. Click **"Create Web Service"** at the bottom
2. Render will start building your service
3. Wait 3-5 minutes for the build to complete
4. Watch the logs for any errors

### Successful Deployment Logs Should Show:

```
==> Building application...
==> Installing dependencies...
==> Building TypeScript...
==> Build successful!
==> Starting service...
{"level":30,"time":...,"msg":"Server listening at http://0.0.0.0:3001"}
```

## ✅ Step 6: Verify Deployment

### Get Your Service URL

After deployment completes, you'll see your service URL at the top:
```
https://solsign-backend.onrender.com
```

### Test the Service

Open a terminal and run:

```bash
curl https://solsign-backend.onrender.com/trpc/health
```

Expected response (should return some tRPC metadata - this is normal).

### Test Health Check (Indirect)

Since this is a tRPC server, it doesn't have a direct `/health` endpoint. You can verify it's running by:

1. Checking Render logs show "Server listening..."
2. Checking the service status is "Live" in Render dashboard
3. Testing from your frontend once it's deployed

## 🔄 Step 7: Update Frontend Configuration

Now that your backend is deployed, update your frontend environment variables:

### In Vercel (or your frontend deployment):

```bash
VITE_API_URL=https://solsign-backend.onrender.com/trpc
```

## 🔧 Step 8: Configure CORS (Security)

For production, lock down CORS to only allow your frontend domain.

1. Go to your repository
2. Edit `apps/backend/src/index.ts`
3. Find the CORS configuration:

```typescript
await server.register(cors, {
  origin: "*", // Change this!
});
```

4. Change to:

```typescript
await server.register(cors, {
  origin: "https://your-frontend-domain.vercel.app", // Your Vercel URL
});
```

5. Commit and push - Render will auto-deploy

## 🧪 Step 9: Test Complete Flow

### Test Authentication

1. Open your frontend
2. Connect Solana wallet
3. Check browser network tab for tRPC calls to Render URL
4. Verify authentication works

### Test Document Minting

1. Create a new document
2. Fill in variables
3. Click "Sign Now"
4. Verify the document mints to Solana
5. Check Render logs for:
   ```
   Solana: Successfully loaded keypair. Public key: <your_key>
   Irys: File uploaded successfully with tx ID: <tx_id>
   Solana: Successfully minted DocNFT. Transaction: <signature>
   ```

## 📊 Monitoring

### View Logs

In Render dashboard:
- Click your service
- Go to **"Logs"** tab
- Watch real-time logs

### Common Log Messages

**✅ Good:**
```
Solana: Successfully loaded keypair
Irys: File uploaded successfully
Successfully minted DocNFT
```

**❌ Problems:**
```
Error: PAYER_KEYPAIR_JSON is not set
Error: Insufficient funds for transaction
Error: Invalid signature
```

## 🐛 Troubleshooting

### Build Fails

**Error: "Cannot find module..."**

**Fix**: Make sure all dependencies are in `package.json`. Run locally:
```bash
cd apps/backend
npm install
npm run build
```

### Service Crashes on Startup

**Error: "Keypair not found"**

**Fix**: Check `PAYER_KEYPAIR_JSON` environment variable:
1. Go to Render → Environment
2. Verify `PAYER_KEYPAIR_JSON` is set
3. Verify it's a valid JSON array `[1,2,3,...]`
4. Click **"Manual Deploy"** → **"Deploy latest commit"**

### CORS Errors from Frontend

**Error: "CORS policy: No 'Access-Control-Allow-Origin' header"**

**Fix**: 
1. Verify CORS is set to `"*"` or your frontend domain
2. Check backend service is actually running (Render logs)
3. Verify frontend is using correct backend URL

### Insufficient Funds Error

**Error: "Insufficient funds for transaction"**

**Fix**: Your Solana wallet needs more devnet SOL:

```bash
# Get the public key from Render logs
# Then airdrop SOL to it
solana airdrop 2 <YOUR_PUBLIC_KEY> --url devnet
```

Or use [Solana Faucet](https://faucet.solana.com/) with devnet selected.

## 🔐 Security Best Practices

- [ ] Never commit `PAYER_KEYPAIR_JSON` to git
- [ ] Use Render's environment variable encryption (automatic)
- [ ] Lock CORS to your frontend domain only
- [ ] Rotate secrets every 90 days
- [ ] Use HTTPS only (Render provides this automatically)
- [ ] Monitor logs for suspicious activity

## 🔄 Updating the Backend

### Manual Update

1. Push code changes to GitHub
2. Render auto-deploys on push (if auto-deploy is enabled)
3. Or click **"Manual Deploy"** in Render dashboard

### Rolling Back

If something breaks:

1. Go to Render dashboard
2. Click **"Rollback"** under latest deploy
3. Select previous working deployment
4. Confirm rollback

## 💰 Cost Estimate

| Plan | Cost | Features |
|------|------|----------|
| **Free** | $0/mo | Cold starts, 750 hours/mo |
| **Starter** | $7/mo | Always on, better performance |
| **Standard** | $25/mo | More resources, faster |

**Recommendation**: Start with Starter ($7/mo) for production testing.

## 📝 Post-Deployment Checklist

- [ ] Service deployed successfully
- [ ] Logs show no errors
- [ ] Keypair loaded correctly (check logs for public key)
- [ ] Frontend can connect to backend
- [ ] Authentication works
- [ ] Document minting works
- [ ] Solana wallet has sufficient devnet SOL
- [ ] CORS configured for production
- [ ] Environment variables all set correctly

## 🎉 Success!

Your backend is now deployed and ready! 

**Next steps:**
1. Deploy frontend to Vercel (if not already)
2. Update frontend `VITE_API_URL` to point to your Render backend
3. Test complete end-to-end flow
4. Monitor logs for any issues

---

**Service URL**: `https://solsign-backend.onrender.com`  
**Last Updated**: 2025-10-20  
**Status**: ✅ Ready for Production Testing

