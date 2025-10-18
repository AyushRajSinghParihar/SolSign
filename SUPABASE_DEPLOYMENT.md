# Deploying Supabase Edge Functions

## 🚀 Quick Deploy

### Prerequisites
1. **Supabase CLI installed**
```bash
# Check if installed
supabase --version

# If not installed:
npm install -g supabase
```

2. **Login to Supabase**
```bash
supabase login
```
This will open a browser window to authenticate.

---

## 📦 Deploying Functions

### Option 1: Deploy All Functions (Recommended)
```bash
cd /home/tenxcoder/Desktop/SolSign-MVP/solsign-mvp

# Deploy all functions at once
supabase functions deploy
```

### Option 2: Deploy Individual Functions
```bash
cd /home/tenxcoder/Desktop/SolSign-MVP/solsign-mvp

# Deploy helius-webhook-receiver (the one we fixed)
supabase functions deploy helius-webhook-receiver

# Deploy process-document
supabase functions deploy process-document

# Deploy send-mint-email
supabase functions deploy send-mint-email
```

---

## 🔧 First-Time Setup

If this is your first time deploying, you need to link your local project to your Supabase project:

### 1. Link Your Project
```bash
cd /home/tenxcoder/Desktop/SolSign-MVP/solsign-mvp

# Link to your Supabase project
supabase link --project-ref YOUR_PROJECT_REF
```

**Finding Your Project Reference:**
- Go to https://supabase.com/dashboard
- Select your project
- Project reference is in the URL: `https://supabase.com/dashboard/project/YOUR_PROJECT_REF`
- Or find it in Project Settings → General → Reference ID

### 2. Set Environment Variables (Secrets)

Your Edge Functions need these secrets:

```bash
# Set Gemini API Key
supabase secrets set GEMINI_API_KEY=your_gemini_api_key_here

# Set Helius API Key
supabase secrets set HELIUS_API_KEY=your_helius_api_key_here

# Set Helius Webhook Secret
supabase secrets set HELIUS_WEBHOOK_SECRET=your_webhook_secret_here

# Set Resend API Key (for sending emails)
supabase secrets set RESEND_API_KEY=your_resend_api_key_here
```

**View current secrets:**
```bash
supabase secrets list
```

**Note**: You don't need to set `SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` - these are automatically available in Edge Functions.

---

## ✅ Verification

### 1. Check Deployment Status
```bash
# List all deployed functions
supabase functions list
```

### 2. Check Function Logs
```bash
# Real-time logs for a specific function
supabase functions logs helius-webhook-receiver --tail

# View recent logs
supabase functions logs helius-webhook-receiver
```

### 3. Test Functions

**Test helius-webhook-receiver:**
```bash
# Get your function URL from dashboard, then:
curl -X POST \
  'https://YOUR_PROJECT_REF.supabase.co/functions/v1/helius-webhook-receiver?secret=YOUR_WEBHOOK_SECRET' \
  -H 'Content-Type: application/json' \
  -d '[{"signature": "test", "instructions": [{"accounts": ["test"]}]}]'
```

**Test process-document:**
This is automatically triggered when files are uploaded to the `documents` bucket.

**Test send-mint-email:**
```bash
curl -X POST \
  'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-mint-email' \
  -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "ownerWalletAddress": "test_wallet",
    "signature": "test_sig",
    "arweaveTx": "test_tx"
  }'
```

---

## 🔄 Update Workflow

When you make changes to functions:

```bash
# 1. Make your code changes
# 2. Test locally (optional)
supabase functions serve helius-webhook-receiver

# 3. Deploy the updated function
supabase functions deploy helius-webhook-receiver

# 4. Check logs to verify
supabase functions logs helius-webhook-receiver --tail
```

---

## 🐛 Troubleshooting

### Error: "Not logged in"
```bash
supabase login
```

### Error: "Project not linked"
```bash
supabase link --project-ref YOUR_PROJECT_REF
```

### Error: "Missing environment variables"
Check that secrets are set:
```bash
supabase secrets list
```

### Function crashes immediately
Check logs:
```bash
supabase functions logs FUNCTION_NAME
```

Common issues:
- Missing secrets (GEMINI_API_KEY, HELIUS_API_KEY, etc.)
- Import errors in Deno
- Syntax errors

### Import errors (Deno-specific)
Edge Functions use Deno, not Node.js. Make sure imports use full URLs:

✅ Good:
```typescript
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
```

❌ Bad:
```typescript
import { serve } from 'http' // Node.js style won't work
```

---

## 📁 Project Structure

Your Supabase functions are organized like this:

```
supabase/
├── config.toml                    # Function configuration
└── functions/
    ├── helius-webhook-receiver/
    │   ├── index.ts              # Main function code (FIXED ✅)
    │   └── deno.json             # Import map
    ├── process-document/
    │   ├── index.ts              # AI document analysis
    │   └── deno.json
    └── send-mint-email/
        ├── index.ts              # Email notifications
        └── deno.json
```

---

## 🔐 Security Best Practices

1. **Never commit secrets** to git
   - Use `supabase secrets set` instead
   - Secrets are stored encrypted in Supabase

2. **Verify webhook secrets**
   - helius-webhook-receiver checks `HELIUS_WEBHOOK_SECRET`
   - Always validate incoming webhooks

3. **Use service role key carefully**
   - Only use in Edge Functions (server-side)
   - Never expose to frontend

---

## 📊 Monitoring

### View Function Stats
Go to: https://supabase.com/dashboard/project/YOUR_PROJECT_REF/functions

You can see:
- Invocation count
- Error rate
- Average response time
- Logs

### Set Up Alerts
In Supabase Dashboard → Functions → Select Function → Alerts

Configure alerts for:
- High error rate
- Slow response times
- Failed invocations

---

## 🚀 Complete Deployment Checklist

- [ ] Supabase CLI installed
- [ ] Logged in: `supabase login`
- [ ] Project linked: `supabase link --project-ref YOUR_REF`
- [ ] Secrets configured:
  - [ ] `GEMINI_API_KEY`
  - [ ] `HELIUS_API_KEY`
  - [ ] `HELIUS_WEBHOOK_SECRET`
  - [ ] `RESEND_API_KEY`
- [ ] Functions deployed: `supabase functions deploy`
- [ ] Functions tested (check logs)
- [ ] Webhooks configured:
  - [ ] Helius webhook URL set
  - [ ] Storage webhook for process-document

---

## 🔗 Useful Commands Reference

```bash
# Login
supabase login

# Link project
supabase link --project-ref YOUR_REF

# Deploy all functions
supabase functions deploy

# Deploy one function
supabase functions deploy FUNCTION_NAME

# List functions
supabase functions list

# View logs
supabase functions logs FUNCTION_NAME

# Follow logs in real-time
supabase functions logs FUNCTION_NAME --tail

# Set secret
supabase secrets set KEY=value

# List secrets
supabase secrets list

# Delete a function
supabase functions delete FUNCTION_NAME

# Serve function locally (for testing)
supabase functions serve FUNCTION_NAME
```

---

## 📞 Need Help?

- **Supabase Docs**: https://supabase.com/docs/guides/functions
- **Supabase Discord**: https://discord.supabase.com
- **Check logs first**: `supabase functions logs FUNCTION_NAME`

---

**Last Updated**: After fixing helius-webhook-receiver bug  
**Status**: ✅ Ready for deployment  
**Breaking Changes**: ❌ None

