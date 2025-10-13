# Quick Deployment Guide - Escalation Loop Fix

## 🎯 Quick Deploy (Production)

```bash
# Navigate to agent-backend
cd /home/tenxcoder/Desktop/SolSign-MVP/solsign-mvp/apps/agent-backend

# Build the TypeScript code
npm run build

# Restart the service (method depends on your deployment)
# If using PM2:
pm2 restart agent-backend

# If using systemd:
sudo systemctl restart agent-backend

# If deployed on Render/similar:
# Commit and push to trigger auto-deploy
git add .
git commit -m "Fix: Prevent escalation loop when owner replies"
git push origin agentification
```

## 🧪 Testing After Deployment

### Quick Test
```bash
# Check if service is running
curl https://solsign.onrender.com/health

# Monitor logs in real-time
# (adjust command based on your deployment)
pm2 logs agent-backend --lines 100
```

### Full E2E Test
1. **Start a new negotiation** from the frontend
2. **Have counterparty send email** that requires escalation (e.g., "I want 90% discount")
3. **Verify owner receives escalation email**
4. **Owner replies** with instructions (e.g., "Offer 10% only")
5. **✅ Check counterparty receives response** (not owner)
6. **✅ Check owner does NOT receive another escalation**

### What to Look For in Logs

**Good Indicators:**
```
✅ "Identified email sender" with correct senderRole
✅ "Counter-proposal email sent" to counterparty
✅ No repeated escalations to owner
```

**Warning (but OK):**
```
⚠️  "Prevented escalation loop" - Fail-safe worked correctly
```

**Bad (Issue persists):**
```
❌ Multiple "Sending escalation email to owner" in sequence
❌ Same negotiation ID escalating repeatedly
```

## 🐛 If Issues Persist

### 1. Check Build
```bash
cd apps/agent-backend
ls -la dist/routes/webhooks.js
# Verify file was updated (check timestamp)
```

### 2. Check Logs for Errors
```bash
# Look for TypeScript compilation errors
npm run build 2>&1 | grep -i error

# Check runtime errors
grep -i "error" logs/agent-backend.log
```

### 3. Verify Environment Variables
```bash
# Check that required env vars are set
echo $SUPABASE_URL
echo $GEMINI_API_KEY
echo $SENDGRID_API_KEY
```

### 4. Database Check
```sql
-- Verify negotiation has counterparty_email
SELECT id, counterparty_email, status, owner_id 
FROM negotiations 
WHERE id = 'c49eaca4-cfd5-4de4-9647-26936aa2ce9c';
```

## 📊 Monitoring Commands

### Real-time Log Monitoring
```bash
# If using journalctl
journalctl -u agent-backend -f

# If using PM2
pm2 logs agent-backend --lines 200 --timestamp

# If using Docker
docker logs -f agent-backend-container
```

### Check Last 10 Webhook Calls
```bash
# Assuming logs are structured JSON
grep "Webhook request received" logs/latest.log | tail -10
```

### Find Escalation Loop Issues
```bash
# Check for repeated escalations
grep "Sending escalation email to owner" logs/latest.log | \
  grep -o 'negotiationId":"[^"]*"' | \
  sort | uniq -c | sort -rn
```

## 🔄 Rollback (If Needed)

If the fix causes unexpected issues:

```bash
# Checkout previous version
git checkout HEAD~1 apps/agent-backend/src/routes/webhooks.ts

# Rebuild
cd apps/agent-backend
npm run build

# Restart
pm2 restart agent-backend

# Notify team
echo "⚠️  Rolled back escalation loop fix due to issues"
```

## ✅ Success Criteria

After deployment, you should see:
- [x] Service starts without errors
- [x] Health check passes
- [x] Owner replies are identified as `senderRole: 'owner'`
- [x] Responses go to counterparty, not back to owner
- [x] No repeated escalation emails to owner
- [x] Normal negotiations continue to work

## 📝 Files Changed

**Modified:**
- `apps/agent-backend/src/routes/webhooks.ts`

**Added (documentation only):**
- `ESCALATION_LOOP_FIX.md`
- `FIX_SUMMARY.md`
- `DEPLOYMENT_GUIDE.md` (this file)

**No changes to:**
- Database schema
- Environment variables
- API contracts
- Frontend code

---

**Deploy Time**: ~2-5 minutes  
**Downtime**: None (hot reload) or <30 seconds (restart)  
**Risk Level**: 🟢 LOW - No breaking changes, backward compatible

