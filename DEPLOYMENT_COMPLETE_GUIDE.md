# Complete SolSign MVP Deployment Guide

This guide covers deploying all SolSign services to production environments.

## 🚨 Critical Security Issue

**⚠️ ACTION REQUIRED**: Your current `.env` file has a critical security vulnerability!

The `VITE_SUPABASE_ANON_KEY` is set to your **service_role key** instead of the **anon/public key**. This exposes admin privileges in your frontend code.

### How to Fix:

1. Go to [Supabase Dashboard](https://app.supabase.com/project/rjtnaamhomcxqrwrovvw/settings/api)
2. Copy the **anon** `public` key (NOT the service_role key)
3. Update your `.env` and Vercel environment variables

**Current (WRONG)**:
```bash
VITE_SUPABASE_ANON_KEY="eyJhbG...service_role..." # ❌ This is the service_role key!
```

**Should be (CORRECT)**:
```bash
VITE_SUPABASE_ANON_KEY="eyJhbG...anon_key..." # ✅ This should be the anon key
```

---

## 📋 Prerequisites

Before deploying, ensure you have:

- [ ] GitHub repository with your code
- [ ] Vercel account (for frontend)
- [ ] Render account (for backend services)
- [ ] Supabase project configured
- [ ] Solana devnet wallet with SOL
- [ ] SendGrid account with verified sender
- [ ] Google Gemini API key
- [ ] Resend API key

---

## 🗂️ Services Overview

| Service | Platform | Port | Purpose |
|---------|----------|------|---------|
| Frontend | Vercel | N/A | React UI for document signing |
| Backend | Render | 3001 | tRPC API for documents & auth |
| Agent Backend | Render | 3002 | AI negotiation agent (email-based) |
| Supabase | Supabase Cloud | N/A | Database & auth |
| Solana Program | Devnet | N/A | On-chain NFT minting |

---

## 1️⃣ Frontend Deployment (Vercel)

### Configuration

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New..."** → **"Project"**
3. Import your GitHub repository
4. Configure settings:

**Framework Preset**: Vite
**Root Directory**: `apps/frontend`
**Build Command**: `cd apps/frontend && npm run build`
**Output Directory**: `apps/frontend/dist`

### Environment Variables

Add these in Vercel → Project Settings → Environment Variables:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://rjtnaamhomcxqrwrovvw.supabase.co
VITE_SUPABASE_ANON_KEY=<GET_CORRECT_ANON_KEY_FROM_SUPABASE>

# Backend API URL (update after deploying backend)
VITE_API_URL=https://solsign-backend.onrender.com/trpc
```

### Deploy

1. Click **"Deploy"**
2. Wait for build to complete (~2-3 minutes)
3. Note your deployment URL (e.g., `https://solsign.vercel.app`)

---

## 2️⃣ Backend Deployment (Render)

### Create Web Service

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Configure:

| Setting | Value |
|---------|-------|
| **Name** | `solsign-backend` |
| **Root Directory** | `apps/backend` |
| **Environment** | Node |
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `npm start` |
| **Instance Type** | Starter ($7/mo minimum recommended) |

### Environment Variables

Add these in Render → Environment:

```bash
# Server Configuration
PORT=3001
NODE_ENV=production

# Supabase
SUPABASE_URL=https://rjtnaamhomcxqrwrovvw.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJqdG5hYW1ob21jeHFyd3JvdnZ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzEyODkyMCwiZXhwIjoyMDY4NzA0OTIwfQ.NAloHw6Y22pIowBujZbnQ7t9bevqWOtsL4r2XtQAltY
SUPABASE_ANON_KEY=<GET_CORRECT_ANON_KEY_FROM_SUPABASE>
SUPABASE_JWT_SECRET=Ba/CKo/SGsWYQvI3QB2MEC5HAhnt6s06oicE9b7c0zqqD1pVZUM3SdHvXq/rFLk8kD5xg89e3n1uTOhXgvqG3Q==

# CORS Configuration
FRONTEND_URL=https://www.solsignai.com,http://localhost:5173

# Solana - IMPORTANT: Use JSON format for cloud deployment
PAYER_KEYPAIR_JSON=[1,2,3,...,64]
SOLANA_RPC_ENDPOINT=https://devnet.helius-rpc.com/?api-key=ef9eec16-5e0c-441a-a05e-194cb1d65c77
SOLSIGN_PROGRAM_ID=2LQ91xbS59NBWa6VbPxwzjNCPYVGqudcJ1cffBqmYmp2

# AI & Email
GEMINI_API_KEY=AIzaSyB82qjAKuFnUPp68Lauacewy9MyNtRSOU4
RESEND_API_KEY=re_CKZBQV9C_G2kwjH6kuJbC2ARbk6S2ARzt
```

### 🔑 Getting PAYER_KEYPAIR_JSON Value

**On your local machine**, run:

```bash
cat /home/tenxcoder/.config/solana/solsign-payer.json
```

This will output something like:
```json
[123,45,67,89,12,34,56,78,90,12,34,56,78,90,12,34,56,78,90,12,34,56,78,90,12,34,56,78,90,12,34,56,78,90,12,34,56,78,90,12,34,56,78,90,12,34,56,78,90,12,34,56,78,90,12,34,56,78,90,12,34,56]
```

**Copy the entire array** (including brackets) and paste it as the `PAYER_KEYPAIR_JSON` value in Render.

⚠️ **Security Note**: Never commit this to git! Only add it in Render's environment variables.

### Deploy

1. Click **"Create Web Service"**
2. Wait for deployment (~3-5 minutes)
3. Note your service URL: `https://solsign-backend.onrender.com`
4. Go back to Vercel and update `VITE_API_URL` with this URL

### Update CORS (After Deployment)

For production security, update CORS in `apps/backend/src/index.ts`:

```typescript
await server.register(cors, {
  origin: "https://your-frontend-domain.vercel.app", // Lock to your Vercel domain
});
```

---

## 3️⃣ Agent Backend Update (Render)

Your agent-backend is already deployed. You just need to **update environment variables** to fix the inconsistency.

### Update Environment Variables

Go to your existing agent-backend service in Render → Environment:

**Remove** (if present):
```bash
SUPABASE_SERVICE_KEY  # ❌ Remove this duplicate
```

**Ensure these are set**:
```bash
# Server Configuration
PORT=3002
NODE_ENV=production
HOST=0.0.0.0

# Supabase (STANDARDIZED)
SUPABASE_URL=https://rjtnaamhomcxqrwrovvw.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJqdG5hYW1ob21jeHFyd3JvdnZ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzEyODkyMCwiZXhwIjoyMDY4NzA0OTIwfQ.NAloHw6Y22pIowBujZbnQ7t9bevqWOtsL4r2XtQAltY
SUPABASE_WEBHOOK_SECRET=2f2c9bd5-863b-4ab8-b457-263c206f00f9

# SendGrid
SENDGRID_API_KEY=<YOUR_SENDGRID_API_KEY>
VERIFIED_FROM_EMAIL=no-reply@negotiate.solsignai.com
VERIFIED_FROM_NAME=SolSignAI Agent

# Webhooks
INBOUND_PARSE_SECRET=24af6c63-8c16-4b13-9e20-c72f55253354

# AI
GEMINI_API_KEY=AIzaSyB82qjAKuFnUPp68Lauacewy9MyNtRSOU4
```

### Redeploy

After updating environment variables, trigger a manual deploy:
- Click **"Manual Deploy"** → **"Deploy latest commit"**

---

## 4️⃣ Supabase Configuration

Your Supabase project is already deployed. Ensure these webhooks are configured:

### Database Webhook (Negotiations)

1. Go to Supabase Dashboard → Database → Webhooks
2. Create webhook:
   - **Name**: `start-negotiation`
   - **Table**: `negotiations`
   - **Events**: Insert
   - **Method**: POST
   - **URL**: `https://solsign.onrender.com/jobs/start-negotiation`
   - **Headers**:
     ```
     Authorization: Bearer 2f2c9bd5-863b-4ab8-b457-263c206f00f9
     Content-Type: application/json
     ```

### Edge Functions

Your edge functions should already be deployed:
- `helius-webhook-receiver` - Listens for Solana transactions
- `send-mint-email` - Sends NFT minting notifications
- `process-document` - Processes document uploads

---

## 5️⃣ SendGrid Configuration (for Agent Backend)

### Inbound Parse Setup

1. Go to [SendGrid Dashboard](https://app.sendgrid.com/) → Settings → Inbound Parse
2. Click **"Add Host & URL"**
3. Configure:
   - **Domain**: `negotiate.solsignai.com` (or your subdomain)
   - **URL**: `https://solsign.onrender.com/webhooks/email-inbound?secret=24af6c63-8c16-4b13-9e20-c72f55253354`
   - ✅ Check **"POST the raw, full MIME message"**

### DNS Configuration

Add MX record to your DNS provider:

```
Type: MX
Host: negotiate
Value: mx.sendgrid.net
Priority: 10
TTL: 3600
```

**Verify DNS propagation**:
```bash
dig negotiate.solsignai.com MX
```

⏱️ DNS propagation can take 24-48 hours.

---

## 6️⃣ Testing Deployment

### Health Checks

Test each service is running:

```bash
# Frontend
curl https://your-frontend.vercel.app

# Backend
curl https://solsign-backend.onrender.com/health
# Expected: {"status":"ok"}

# Agent Backend
curl https://solsign.onrender.com/health
# Expected: {"status":"ok","timestamp":"...","uptime":...}
```

### End-to-End Flow

1. **Sign In**
   - Open frontend in browser
   - Connect Solana wallet
   - Sign authentication message

2. **Create Document**
   - Create new document from template
   - Fill in variables
   - Generate PDF

3. **Sign Document**
   - Select "Sign Now"
   - Verify blockchain minting works

4. **Start Negotiation** (Optional)
   - Create negotiation from document
   - Verify counterparty receives email
   - Test AI agent responses

---

## 📊 Environment Variable Reference

### Summary Table

| Variable | Frontend | Backend | Agent Backend | Description |
|----------|----------|---------|---------------|-------------|
| `VITE_SUPABASE_URL` | ✅ | ❌ | ❌ | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | ✅ | ❌ | ❌ | Public anon key (NOT service_role!) |
| `VITE_API_URL` | ✅ | ❌ | ❌ | Backend tRPC endpoint |
| `SUPABASE_URL` | ❌ | ✅ | ✅ | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | ❌ | ✅ | ❌ | Service role key for admin ops |
| `SUPABASE_SERVICE_ROLE_KEY` | ❌ | ❌ | ✅ | Service role key (agent backend) |
| `SUPABASE_ANON_KEY` | ❌ | ✅ | ❌ | Anon key for RLS |
| `SUPABASE_JWT_SECRET` | ❌ | ✅ | ❌ | JWT verification secret |
| `PAYER_KEYPAIR_PATH` | ❌ | Local only | ❌ | Local dev keypair file path |
| `PAYER_KEYPAIR_JSON` | ❌ | ✅ Cloud | ❌ | Cloud deployment keypair JSON |
| `SOLANA_RPC_ENDPOINT` | ❌ | ✅ | ❌ | Solana RPC URL |
| `SOLSIGN_PROGRAM_ID` | ❌ | ✅ | ❌ | On-chain program address |
| `GEMINI_API_KEY` | ❌ | ✅ | ✅ | Google Gemini AI key |
| `RESEND_API_KEY` | ❌ | ✅ | ❌ | Resend email service key |
| `SENDGRID_API_KEY` | ❌ | ❌ | ✅ | SendGrid email service key |
| `INBOUND_PARSE_SECRET` | ❌ | ❌ | ✅ | Webhook auth secret |
| `SUPABASE_WEBHOOK_SECRET` | ❌ | ❌ | ✅ | Supabase webhook auth |

---

## 🔒 Security Checklist

- [ ] Frontend uses anon key, NOT service_role key
- [ ] Backend CORS locked to Vercel domain (not `*`)
- [ ] Keypair JSON only in Render env vars (not in git)
- [ ] All webhook secrets are unique and random
- [ ] HTTPS enabled on all services (automatic on Vercel/Render)
- [ ] RLS policies enabled on Supabase tables
- [ ] SendGrid sender email verified
- [ ] Solana wallet funded with devnet SOL

---

## 🐛 Troubleshooting

### Frontend Can't Connect to Backend

**Symptoms**: CORS errors, network failures

**Fix**:
1. Verify `VITE_API_URL` points to correct Render URL
2. Check backend CORS settings allow your Vercel domain
3. Ensure backend service is running (check Render logs)

### Backend: "Keypair not found" Error

**Symptoms**: Backend crashes on startup or when minting

**Fix**:
1. Verify `PAYER_KEYPAIR_JSON` is set correctly in Render
2. Check the JSON array format is correct (should be `[1,2,3,...,64]`)
3. Local dev: use `PAYER_KEYPAIR_PATH` instead

### Agent Backend: Emails Not Sending

**Symptoms**: No emails received by counterparty

**Fix**:
1. Check `SENDGRID_API_KEY` is valid
2. Verify sender email is verified in SendGrid
3. Check SendGrid Activity Feed for delivery status

### Agent Backend: Inbound Emails Not Working

**Symptoms**: Replies don't trigger agent responses

**Fix**:
1. Verify MX records are configured correctly
2. Test DNS propagation: `dig negotiate.yourdomain.com MX`
3. Check SendGrid Inbound Parse webhook URL is correct
4. Verify `INBOUND_PARSE_SECRET` matches in webhook URL and env vars

### Solana Minting Fails

**Symptoms**: "Insufficient funds" or transaction errors

**Fix**:
1. Check payer wallet has devnet SOL
2. Get more SOL: `solana airdrop 2 <YOUR_WALLET_ADDRESS> --url devnet`
3. Verify `SOLANA_RPC_ENDPOINT` is correct
4. Check `SOLSIGN_PROGRAM_ID` matches deployed program

---

## 🚀 Post-Deployment Tasks

1. **Monitor Logs**
   - Check Render logs for errors
   - Monitor Vercel deployment logs
   - Review Supabase logs

2. **Test All Flows**
   - User authentication
   - Document creation
   - Document signing & minting
   - Negotiation agent

3. **Set Up Monitoring** (Optional)
   - Add Sentry for error tracking
   - Set up uptime monitoring (UptimeRobot, etc.)
   - Configure Render health checks

4. **Update Documentation**
   - Document any custom configurations
   - Update team on new URLs
   - Share access credentials securely

---

## 📝 Quick Reference URLs

| Service | URL |
|---------|-----|
| **Frontend** | `https://your-app.vercel.app` |
| **Backend API** | `https://solsign-backend.onrender.com` |
| **Agent Backend** | `https://solsign.onrender.com` |
| **Supabase Dashboard** | `https://app.supabase.com/project/rjtnaamhomcxqrwrovvw` |
| **Solana Explorer (Devnet)** | `https://explorer.solana.com/?cluster=devnet` |

---

## 💡 Need Help?

- **Render Issues**: Check [Render Docs](https://render.com/docs)
- **Vercel Issues**: Check [Vercel Docs](https://vercel.com/docs)
- **Supabase Issues**: Check [Supabase Docs](https://supabase.com/docs)
- **Solana Issues**: Check [Solana Docs](https://docs.solana.com/)

---

**Last Updated**: 2025-10-20
**Deployment Status**: ✅ Ready for Production Testing (Devnet)

