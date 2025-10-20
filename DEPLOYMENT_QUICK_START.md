# SolSign Deployment Quick Start

Fast-track deployment guide with all the essential information in one place.

## 🚨 Critical Security Fix Required

**Before deploying**, fix this security vulnerability in your `.env`:

```bash
# ❌ WRONG (current) - service_role key exposed in frontend!
VITE_SUPABASE_ANON_KEY="eyJ...service_role..."

# ✅ CORRECT - use anon/public key
VITE_SUPABASE_ANON_KEY="eyJ...anon_key..."
```

Get the correct key: [Supabase Dashboard → API](https://app.supabase.com/project/rjtnaamhomcxqrwrovvw/settings/api)

---

## 📋 Deployment Order

Deploy in this sequence:

1. ✅ **Supabase** - Already deployed
2. ✅ **Solana Program** - Already on devnet
3. ✅ **Agent Backend** - Already on Render (needs env var update)
4. 🔄 **Backend (tRPC)** - Deploy to Render (new service)
5. 🔄 **Frontend** - Deploy to Vercel

---

## 1️⃣ Prepare Solana Keypair

Your backend needs the Solana keypair as an environment variable:

```bash
# On your local machine
cat /home/tenxcoder/.config/solana/solsign-payer.json
```

Copy the entire output: `[1,2,3,...,64]`

⚠️ Keep this secret! Only paste it into Render env vars, never commit to git.

---

## 2️⃣ Deploy Backend to Render

### Create Service
- Platform: [Render Dashboard](https://dashboard.render.com)
- Type: Web Service
- Root Directory: `apps/backend`
- Build: `npm install && npm run build`
- Start: `npm start`

### Environment Variables

```bash
PORT=3001
NODE_ENV=production

SUPABASE_URL=https://rjtnaamhomcxqrwrovvw.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJqdG5hYW1ob21jeHFyd3JvdnZ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzEyODkyMCwiZXhwIjoyMDY4NzA0OTIwfQ.NAloHw6Y22pIowBujZbnQ7t9bevqWOtsL4r2XtQAltY
SUPABASE_ANON_KEY=<GET_CORRECT_ANON_KEY>
SUPABASE_JWT_SECRET=Ba/CKo/SGsWYQvI3QB2MEC5HAhnt6s06oicE9b7c0zqqD1pVZUM3SdHvXq/rFLk8kD5xg89e3n1uTOhXgvqG3Q==

PAYER_KEYPAIR_JSON=[paste array from step 1]
SOLANA_RPC_ENDPOINT=https://devnet.helius-rpc.com/?api-key=ef9eec16-5e0c-441a-a05e-194cb1d65c77
SOLSIGN_PROGRAM_ID=2LQ91xbS59NBWa6VbPxwzjNCPYVGqudcJ1cffBqmYmp2

GEMINI_API_KEY=AIzaSyB82qjAKuFnUPp68Lauacewy9MyNtRSOU4
RESEND_API_KEY=re_CKZBQV9C_G2kwjH6kuJbC2ARbk6S2ARzt
```

**Deploy** and note your URL: `https://solsign-backend.onrender.com`

📖 **Detailed guide**: `apps/backend/DEPLOYMENT_RENDER.md`

---

## 3️⃣ Deploy Frontend to Vercel

### Create Project
- Platform: [Vercel Dashboard](https://vercel.com/dashboard)
- Import from GitHub
- Framework: Vite
- Root Directory: `apps/frontend`

### Environment Variables

```bash
VITE_SUPABASE_URL=https://rjtnaamhomcxqrwrovvw.supabase.co
VITE_SUPABASE_ANON_KEY=<GET_CORRECT_ANON_KEY>
VITE_API_URL=https://solsign-backend.onrender.com/trpc
```

**Deploy** and note your URL: `https://solsign-mvp.vercel.app`

📖 **Detailed guide**: `VERCEL_DEPLOYMENT_GUIDE.md`

---

## 4️⃣ Update Agent Backend

Your agent backend is already deployed. Just update environment variables:

### Remove
```bash
SUPABASE_SERVICE_KEY  # ❌ Remove duplicate
```

### Ensure These Exist
```bash
SUPABASE_URL=https://rjtnaamhomcxqrwrovvw.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJqdG5hYW1ob21jeHFyd3JvdnZ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzEyODkyMCwiZXhwIjoyMDY4NzA0OTIwfQ.NAloHw6Y22pIowBujZbnQ7t9bevqWOtsL4r2XtQAltY
SUPABASE_WEBHOOK_SECRET=2f2c9bd5-863b-4ab8-b457-263c206f00f9
SENDGRID_API_KEY=<YOUR_KEY>
VERIFIED_FROM_EMAIL=no-reply@negotiate.solsignai.com
VERIFIED_FROM_NAME=SolSignAI Agent
INBOUND_PARSE_SECRET=24af6c63-8c16-4b13-9e20-c72f55253354
GEMINI_API_KEY=AIzaSyB82qjAKuFnUPp68Lauacewy9MyNtRSOU4
```

**Redeploy** the service after updating env vars.

📖 **Detailed guide**: `apps/agent-backend/DEPLOYMENT_RENDER.md`

---

## 5️⃣ Update Backend CORS

After frontend is deployed, lock down CORS:

Edit `apps/backend/src/index.ts`:

```typescript
await server.register(cors, {
  origin: "https://solsign-mvp.vercel.app", // Your Vercel URL
});
```

Commit and push to trigger Render auto-deploy.

---

## ✅ Testing Checklist

### Backend Health Check
```bash
curl https://solsign-backend.onrender.com/trpc
# Should return tRPC metadata (not an error)
```

### Agent Backend Health Check
```bash
curl https://solsign.onrender.com/health
# Should return: {"status":"ok","timestamp":"...","uptime":...}
```

### Frontend
1. Open `https://solsign-mvp.vercel.app`
2. Connect Solana wallet
3. Sign authentication message
4. Create a document
5. Sign the document
6. Verify NFT is minted

### Full Negotiation Flow (Optional)
1. Create document
2. Start negotiation
3. Counterparty receives email
4. Reply to email
5. AI agent responds
6. Verify in database

---

## 🔑 Environment Variables Reference

| Variable | Frontend | Backend | Agent | Value |
|----------|----------|---------|-------|-------|
| `VITE_SUPABASE_URL` | ✅ | ❌ | ❌ | https://rjtnaamhomcxqrwrovvw.supabase.co |
| `VITE_SUPABASE_ANON_KEY` | ✅ | ❌ | ❌ | Get from Supabase (anon key!) |
| `VITE_API_URL` | ✅ | ❌ | ❌ | https://solsign-backend.onrender.com/trpc |
| `SUPABASE_URL` | ❌ | ✅ | ✅ | https://rjtnaamhomcxqrwrovvw.supabase.co |
| `SUPABASE_SERVICE_KEY` | ❌ | ✅ | ❌ | Service role key |
| `SUPABASE_SERVICE_ROLE_KEY` | ❌ | ❌ | ✅ | Service role key |
| `SUPABASE_ANON_KEY` | ❌ | ✅ | ❌ | Get from Supabase (anon key!) |
| `SUPABASE_JWT_SECRET` | ❌ | ✅ | ❌ | From Supabase JWT settings |
| `PAYER_KEYPAIR_JSON` | ❌ | ✅ | ❌ | [1,2,3,...,64] from keypair file |
| `SOLANA_RPC_ENDPOINT` | ❌ | ✅ | ❌ | Helius devnet URL |
| `SOLSIGN_PROGRAM_ID` | ❌ | ✅ | ❌ | 2LQ91xbS59NBWa6VbPxwzjNCPYVGqudcJ1cffBqmYmp2 |
| `GEMINI_API_KEY` | ❌ | ✅ | ✅ | AIzaSy... |
| `RESEND_API_KEY` | ❌ | ✅ | ❌ | re_... |
| `SENDGRID_API_KEY` | ❌ | ❌ | ✅ | Your SendGrid key |
| `INBOUND_PARSE_SECRET` | ❌ | ❌ | ✅ | 24af6c63... |
| `SUPABASE_WEBHOOK_SECRET` | ❌ | ❌ | ✅ | 2f2c9bd5... |

---

## 📚 Detailed Documentation

- **Complete Guide**: `DEPLOYMENT_COMPLETE_GUIDE.md`
- **Backend on Render**: `apps/backend/DEPLOYMENT_RENDER.md`
- **Frontend on Vercel**: `VERCEL_DEPLOYMENT_GUIDE.md`
- **Agent Backend**: `apps/agent-backend/DEPLOYMENT_RENDER.md`

---

## 🐛 Common Issues

### "Keypair not found" Error
- Check `PAYER_KEYPAIR_JSON` is set correctly in Render
- Verify it's a valid JSON array: `[1,2,3,...,64]`

### CORS Errors
- Backend must allow your Vercel domain
- Update CORS in `apps/backend/src/index.ts`

### "Insufficient funds" Error
- Solana wallet needs devnet SOL
- Airdrop: `solana airdrop 2 <PUBLIC_KEY> --url devnet`

### Frontend Can't Connect to Backend
- Verify `VITE_API_URL` is correct in Vercel
- Check backend is running (test with curl)
- Verify CORS allows your frontend domain

---

## 🎯 Quick Links

| Service | URL | Documentation |
|---------|-----|---------------|
| Frontend | https://solsign-mvp.vercel.app | [Vercel Guide](VERCEL_DEPLOYMENT_GUIDE.md) |
| Backend | https://solsign-backend.onrender.com | [Backend Guide](apps/backend/DEPLOYMENT_RENDER.md) |
| Agent Backend | https://solsign.onrender.com | [Agent Guide](apps/agent-backend/DEPLOYMENT_RENDER.md) |
| Supabase | https://app.supabase.com/project/rjtnaamhomcxqrwrovvw | [Supabase Docs](https://supabase.com/docs) |
| Solana Explorer | https://explorer.solana.com/?cluster=devnet | [Solana Docs](https://docs.solana.com/) |

---

## ⏱️ Estimated Time

- Backend deployment: **10 minutes**
- Frontend deployment: **5 minutes**
- Agent backend update: **2 minutes**
- Testing: **15 minutes**

**Total: ~30 minutes**

---

**Status**: 🔄 Ready to Deploy  
**Last Updated**: 2025-10-20

