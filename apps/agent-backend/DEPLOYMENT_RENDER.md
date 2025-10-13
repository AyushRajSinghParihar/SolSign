# Deploying Agent Backend to Render

Complete step-by-step guide for deploying the SolSign AI Agent Backend to Render.

## 📋 Prerequisites

Before starting, ensure you have:
- [ ] GitHub repository with the code
- [ ] Render account (sign up at https://render.com)
- [ ] Supabase project set up
- [ ] SendGrid account with verified sender
- [ ] Google Gemini API key
- [ ] All environment variable values ready

## 🚀 Step 1: Create Web Service

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Select the repository containing your code

## ⚙️ Step 2: Configure Build Settings

On the configuration page, set:

| Setting | Value |
|---------|-------|
| **Name** | `solsign-agent-backend` (or your choice) |
| **Root Directory** | `apps/agent-backend` |
| **Environment** | `Node` |
| **Region** | Choose closest to your users |
| **Branch** | `main` (or your deployment branch) |
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `npm start` |
| **Instance Type** | Free or Starter (minimum) |

## 🔑 Step 3: Add Environment Variables

Click **"Advanced"** → **"Add Environment Variable"** and add each:

### Server Configuration
```bash
PORT=3002
HOST=0.0.0.0
NODE_ENV=production
LOG_LEVEL=info
```

### Supabase Configuration
```bash
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_WEBHOOK_SECRET=your-random-secret-string
```

**How to get these:**
- Supabase Dashboard → Settings → API
- Service Key = `anon` public key
- Service Role Key = `service_role` key (⚠️ **Keep this secret!**)
- Webhook Secret = Generate random string (e.g., `openssl rand -hex 32`)

### SendGrid Configuration
```bash
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxx
VERIFIED_FROM_EMAIL=no-reply@negotiate.solsignai.com
VERIFIED_FROM_NAME=SolSignAI Agent
```

**How to get these:**
- SendGrid Dashboard → Settings → API Keys → Create API Key
- Give it **Full Access** to Mail Send
- Verified Email must be added in SendGrid → Settings → Sender Authentication

### Webhook Configuration
```bash
INBOUND_PARSE_SECRET=another-random-secret-string
```

**Generate this:**
```bash
openssl rand -hex 32
```

### Google Gemini AI Configuration
```bash
GEMINI_API_KEY=AIzaSyxxxxxxxxxxxxxxxxxxxxxxxxx
```

**How to get this:**
- Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
- Create API key

## 🚢 Step 4: Deploy

1. Click **"Create Web Service"**
2. Wait for deployment (usually 2-5 minutes)
3. Once deployed, note your service URL: `https://solsign-agent-backend.onrender.com`

## ✅ Step 5: Verify Deployment

### Test Health Endpoint
```bash
curl https://your-service.onrender.com/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-10-13T10:30:00.000Z",
  "uptime": 123.45
}
```

### Check Logs
- Render Dashboard → Your Service → Logs
- Look for: `"Environment validated successfully"`
- Verify no errors about missing env variables

## 📧 Step 6: Configure SendGrid Inbound Parse

This allows the agent to receive email replies.

### 6.1 Set Up Domain/Subdomain

**Option A: Use a subdomain (recommended)**
1. Choose subdomain: `negotiate.solsignai.com`
2. Add MX record to your DNS:
   ```
   Type: MX
   Host: negotiate
   Value: mx.sendgrid.net
   Priority: 10
   ```

**Option B: Use main domain**
1. Add MX record:
   ```
   Type: MX
   Host: @
   Value: mx.sendgrid.net
   Priority: 10
   ```

### 6.2 Configure SendGrid Webhook
1. Go to SendGrid Dashboard → Settings → Inbound Parse
2. Click **"Add Host & URL"**
3. Configure:
   - **Domain**: `negotiate.solsignai.com`
   - **URL**: `https://your-service.onrender.com/webhooks/email-inbound?secret=YOUR_INBOUND_PARSE_SECRET`
   - ✅ Check **"POST the raw, full MIME message"**
4. Click **"Add"**

### 6.3 Verify DNS
```bash
dig negotiate.solsignai.com MX
```

Should show:
```
negotiate.solsignai.com. 300 IN MX 10 mx.sendgrid.net.
```

⚠️ **DNS propagation can take 24-48 hours**

## 🔗 Step 7: Configure Supabase Webhook

The agent needs to be notified when a new negotiation starts.

### 7.1 Create Database Webhook
1. Go to Supabase Dashboard → Database → Webhooks
2. Click **"Create a new hook"**
3. Configure:
   - **Name**: `start-negotiation`
   - **Table**: `negotiations`
   - **Events**: ✅ Insert
   - **HTTP Request**:
     - **Method**: POST
     - **URL**: `https://your-service.onrender.com/jobs/start-negotiation`
     - **Headers**:
       ```
       Authorization: Bearer YOUR_SUPABASE_WEBHOOK_SECRET
       Content-Type: application/json
       ```
4. Click **"Create webhook"**

### 7.2 Test the Webhook
In Supabase SQL Editor:
```sql
INSERT INTO negotiations (
  document_id,
  user_id,
  counterparty_email,
  parameters,
  status,
  history
) VALUES (
  'some-document-uuid',
  'some-user-uuid',
  'test@example.com',
  '{"instructions": "Test negotiation - minimum price $1000"}'::jsonb,
  'pending',
  '[]'::jsonb
);
```

Check Render logs - should see:
```
Received start-negotiation job.
```

## 🧪 Step 8: End-to-End Testing

### Test Complete Negotiation Flow

1. **Create a test negotiation** in your app
2. **Verify initial email sent**
   - Check Render logs for "Successfully sent email"
   - Check recipient inbox
3. **Reply to the email**
   - Send a test reply
   - Should arrive at `neg-{id}@negotiate.solsignai.com`
4. **Verify AI response**
   - Check Render logs for "Gemini decision computed"
   - Check recipient receives AI response
5. **Test escalation**
   - Send a hostile/unclear message
   - Verify owner receives escalation email
6. **Test acceptance**
   - Send a message accepting all terms
   - Verify status changes to "agreed"

### Expected Log Flow
```
✓ Webhook request received
✓ Auth successful
✓ Parsed inbound multipart fields
✓ Routed to negotiation
✓ Negotiation fetched
✓ History updated
✓ Gemini decision computed
✓ Emails sent and action executed
✓ Webhook completed successfully
```

## 🔧 Step 9: Monitoring & Maintenance

### Set Up Alerts
1. Render Dashboard → Your Service → Settings
2. Configure:
   - **Health Check Path**: `/health`
   - **Health Check Interval**: 60 seconds
3. Add email for notifications

### Monitor Logs
- Check logs regularly for errors
- Look for rate limit warnings
- Monitor SendGrid deliverability

### Common Issues

#### Emails Not Sending
- Check SendGrid API key is valid
- Verify sender email is verified
- Check SendGrid Activity Feed

#### Inbound Emails Not Working  
- Verify MX records (DNS propagation)
- Check SendGrid Inbound Parse settings
- Verify webhook secret matches

#### Service Crashes
- Check environment variables
- Review error logs in Render
- Verify all required packages installed

## 📊 Performance Optimization

### Scale Up (if needed)
- Upgrade Render instance type
- Consider adding Redis for rate limiting
- Use dedicated IP for SendGrid

### Cost Optimization
- Free tier supports ~50 negotiations/day
- Starter ($7/mo) supports hundreds
- Scale based on usage

## 🔒 Security Best Practices

1. ✅ **Rotate secrets regularly**
   - Webhook secrets every 90 days
   - API keys annually

2. ✅ **Monitor for abuse**
   - Check rate limiter logs
   - Review failed auth attempts

3. ✅ **Keep dependencies updated**
   ```bash
   npm audit
   npm update
   ```

4. ✅ **Use HTTPS only**
   - Render provides this automatically

## 📝 Post-Deployment Checklist

- [ ] Service is running (`/health` returns 200)
- [ ] Environment variables all set
- [ ] SendGrid sender verified
- [ ] Inbound Parse configured
- [ ] MX records propagated
- [ ] Supabase webhook configured
- [ ] Test negotiation completes successfully
- [ ] Logs show no errors
- [ ] Email escalation works
- [ ] Agreement detection works
- [ ] Owner can intervene via email

## 🆘 Getting Help

If you encounter issues:

1. **Check Render Logs** first (most errors show here)
2. **Verify Environment Variables** (restart service after changes)
3. **Test Each Component**:
   - Health endpoint
   - Email sending
   - Email receiving
   - AI responses
4. **Check External Services**:
   - SendGrid Activity Feed
   - Supabase Logs
   - DNS records

## 🎉 Success!

Your agent backend is now deployed and ready to autonomously negotiate contracts via email! 🚀

For questions or issues, refer to the main [README.md](./README.md).

