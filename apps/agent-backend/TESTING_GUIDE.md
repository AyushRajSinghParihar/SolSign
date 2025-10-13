# Testing Guide for Agent Backend

Comprehensive testing procedures for the SolSign AI Agent Backend.

## 🧪 Testing Levels

### 1. Unit Testing (Component Level)
### 2. Integration Testing (Service Level)  
### 3. End-to-End Testing (Full Flow)

---

## 📋 Prerequisites

Before testing, ensure:
- [ ] Agent backend is deployed and running
- [ ] All environment variables are set
- [ ] SendGrid account is configured
- [ ] Inbound Parse is set up (MX records propagated)
- [ ] You have access to test email accounts
- [ ] Supabase database has test data

---

## 🔍 Level 1: Component Testing

### Test 1: Health Check
**Purpose**: Verify service is running

```bash
curl https://your-agent-backend.onrender.com/health
```

**Expected Response**:
```json
{
  "status": "ok",
  "timestamp": "2025-10-13T10:30:00.000Z",
  "uptime": 123.45
}
```

**Pass Criteria**: 
- ✅ Status code 200
- ✅ Returns valid JSON
- ✅ Contains all fields

---

### Test 2: Environment Variables
**Purpose**: Verify all required env vars are set

**Check Logs** (Render Dashboard):
```
Environment validated successfully
```

**Pass Criteria**:
- ✅ No "Missing required environment variables" errors
- ✅ Service doesn't crash on startup

---

### Test 3: Database Connection
**Purpose**: Verify Supabase connection works

Create a test query in your app:
```typescript
const { data, error } = await supabase
  .from('negotiations')
  .select('*')
  .limit(1);
```

**Pass Criteria**:
- ✅ No connection errors
- ✅ Can read from database

---

## 🔗 Level 2: Integration Testing

### Test 4: Email Sending (Outbound)
**Purpose**: Verify SendGrid integration works

**Method A: Using Postman/curl**
```bash
curl -X POST https://your-agent-backend.onrender.com/jobs/start-negotiation \
  -H "Authorization: Bearer YOUR_SUPABASE_WEBHOOK_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "record": {
      "id": "test-negotiation-id",
      "document_id": "test-doc-id",
      "counterparty_email": "your-test-email@example.com",
      "parameters": {
        "instructions": "Test negotiation: minimum price $1000, payment within 30 days"
      },
      "history": [],
      "status": "pending"
    }
  }'
```

**Check**:
1. Render logs show: "Successfully sent email"
2. Test email account receives email
3. Email contains negotiation parameters
4. Reply-To address is: `neg-test-negotiation-id@negotiate.solsignai.com`

**Pass Criteria**:
- ✅ Email received within 1 minute
- ✅ Professional HTML formatting
- ✅ Correct parameters displayed
- ✅ Reply-To address is correct

---

### Test 5: Email Receiving (Inbound)
**Purpose**: Verify SendGrid Inbound Parse works

**Steps**:
1. Send an email to: `neg-test-negotiation-id@negotiate.solsignai.com`
2. Email content: "I'm interested, but I need more details."

**Check Render Logs**:
```
Webhook request received
Auth successful
Parsed inbound multipart fields
Routed to negotiation: test-negotiation-id
```

**Pass Criteria**:
- ✅ Webhook receives email within 30 seconds
- ✅ Email content is parsed correctly
- ✅ Negotiation ID is extracted
- ✅ No errors in logs

---

### Test 6: AI Decision Making
**Purpose**: Verify Gemini AI integration

**Prerequisites**: Complete Test 5 first

**Check Render Logs**:
```
Gemini decision computed
action: "COUNTER-PROPOSE"
responseTextLen: [positive number]
```

**Pass Criteria**:
- ✅ AI returns valid decision (ACCEPT/COUNTER-PROPOSE/ESCALATE)
- ✅ AI generates response text
- ✅ No JSON parsing errors
- ✅ Response is contextually appropriate

---

### Test 7: Rate Limiting
**Purpose**: Verify email rate limiting works

**Steps**:
1. Send 15 emails rapidly to same recipient
2. Check logs for rate limit warnings

**Expected in Logs**:
```
Rate limit exceeded for email recipient
```

**Pass Criteria**:
- ✅ Emails 1-10 succeed
- ✅ Emails 11+ are rate limited
- ✅ Error message is logged

---

### Test 8: Retry Logic
**Purpose**: Verify retry mechanism works

**Simulate**: Temporarily invalidate SendGrid API key

**Check Logs**:
```
Retrying after error
attempt: 1, delay: 1000
attempt: 2, delay: 2000
Failed to send email after retries
```

**Pass Criteria**:
- ✅ System attempts 3 retries
- ✅ Delays increase exponentially
- ✅ Error is logged after all retries fail

**Restore**: Fix SendGrid API key after test

---

## 🎯 Level 3: End-to-End Testing

### Test 9: Full Negotiation Flow - Happy Path
**Purpose**: Test complete autonomous negotiation

#### Step 1: Create Negotiation
In your app, create a negotiation with:
- Counterparty: Your test email
- Parameters: "Minimum price $5,000, payment within 15 days"

#### Step 2: Verify Initial Email
**Wait**: ~30 seconds

**Check**: Test email inbox
- Subject: "Action Required: Document Negotiation for..."
- Contains parameters
- Professional formatting
- Reply-To: `neg-{id}@negotiate.solsignai.com`

**Pass Criteria**: ✅ Email received and correct

#### Step 3: Send Counter-Offer
**Reply to email** with:
```
I can agree to $5,000, but I need 20 days for payment. Is that acceptable?
```

**Wait**: ~60 seconds

#### Step 4: Verify AI Response
**Check**: Test email inbox for AI reply

**Expected AI Response** (example):
```
Thank you for your response. I understand you're requesting 
20 days for payment. However, our client has specified a 
maximum of 15 days for payment terms. Would you be able to 
meet the 15-day requirement? We may be able to offer other 
flexible terms to accommodate your needs.
```

**Pass Criteria**:
- ✅ AI responds within 2 minutes
- ✅ AI maintains $5,000 price (per parameters)
- ✅ AI pushes back on 20 days (violates 15-day rule)
- ✅ AI remains professional

#### Step 5: Accept Terms
**Reply to email** with:
```
I agree to $5,000 with payment within 15 days. Let's proceed.
```

**Wait**: ~60 seconds

#### Step 6: Verify Agreement
**Check**: 
1. Test email inbox - should have acceptance confirmation
2. Supabase database - negotiation status should be "agreed"
3. Owner email - should receive notification

**Pass Criteria**:
- ✅ Status changed to "agreed"
- ✅ All parties notified
- ✅ History is complete

---

### Test 10: Escalation Flow
**Purpose**: Test agent escalation to owner

#### Step 1: Create Negotiation
Same as Test 9

#### Step 2: Send Hostile Message
**Reply to initial email** with:
```
This is ridiculous! I refuse to negotiate under these terms. 
Take it or leave it - $3,000 final offer.
```

**Wait**: ~60 seconds

#### Step 3: Verify Escalation
**Check Owner Email**:
- Subject: "Action Required: Negotiation Escalated"
- Contains summary from AI
- Reply-To allows owner to respond

**Check Supabase**:
- Status: "escalated"
- History contains escalation entry

**Pass Criteria**:
- ✅ AI detects hostile/unreasonable request
- ✅ Escalates to owner
- ✅ Owner receives detailed summary
- ✅ No response sent to counterparty

#### Step 4: Owner Intervention
**Owner replies to escalation email** with:
```
Tell them we can accept $4,500 with 15-day payment terms.
```

**Wait**: ~60 seconds

#### Step 5: Verify Owner Instruction Handling
**Check**:
1. Counterparty receives email with $4,500 offer
2. AI does NOT escalate back to owner (anti-loop protection)
3. Logs show "Prevented escalation loop" or similar

**Pass Criteria**:
- ✅ AI follows owner's instruction
- ✅ Sends counter-offer to counterparty
- ✅ No escalation loop occurs

---

### Test 11: Conversation Context
**Purpose**: Test AI maintains conversation history

#### Steps:
1. Create negotiation
2. Send 5 back-and-forth emails
3. Reference something from message #2 in message #5

#### Example Exchange:
```
Message 1: "We need delivery by December"
Message 2: (AI responds)
Message 3: "Can we adjust price?"
Message 4: (AI responds)
Message 5: "Going back to my December delivery requirement..."
```

**Expected**: AI should remember and reference December requirement

**Pass Criteria**:
- ✅ AI references previous messages
- ✅ History is maintained in database
- ✅ Responses are contextually aware

---

### Test 12: Multiple Concurrent Negotiations
**Purpose**: Test system handles parallel negotiations

#### Steps:
1. Create 3 negotiations simultaneously
   - Different counterparties
   - Different parameters
2. Reply to all 3 as counterparties
3. Verify AI keeps them separate

**Pass Criteria**:
- ✅ Each negotiation maintains independent context
- ✅ No cross-contamination of parameters
- ✅ All emails route correctly

---

## 🔧 Debugging Tests

### Test 13: Invalid Negotiation ID
**Send email to**: `neg-invalid-id@negotiate.solsignai.com`

**Expected**: 
- Logs: "Negotiation invalid-id not found"
- Email is ignored (no crash)

**Pass Criteria**: ✅ System handles gracefully

---

### Test 14: Malformed Email
**Send email with**:
- No text content
- Only HTML
- Attachments

**Pass Criteria**:
- ✅ System extracts text from HTML
- ✅ Handles empty content gracefully
- ✅ No crashes

---

### Test 15: Database Failure Simulation
**Temporarily break Supabase connection** (change URL)

**Send negotiation request**

**Expected**:
- Error logged
- 500 response
- Service remains running

**Pass Criteria**:
- ✅ Error is logged
- ✅ Service doesn't crash
- ✅ Can recover when connection is restored

---

## 📊 Performance Testing

### Test 16: Response Time
**Measure**: Time from email received to AI response sent

**Acceptable**:
- ⚡ < 10 seconds: Excellent
- ✅ 10-30 seconds: Good
- ⚠️ 30-60 seconds: Acceptable
- ❌ > 60 seconds: Investigate

**Check**:
```
Logs: totalDurMs field in "Webhook completed successfully"
```

---

### Test 17: Load Testing
**Send**: 20 negotiation emails in 1 minute

**Pass Criteria**:
- ✅ All emails processed
- ✅ No crashes
- ✅ Response times remain acceptable
- ✅ Rate limiting works correctly

---

## ✅ Test Results Template

Use this checklist when testing:

```
## Test Session: [DATE]
Environment: [Production/Staging]
Tester: [Name]

### Component Tests
- [ ] Test 1: Health Check
- [ ] Test 2: Environment Variables
- [ ] Test 3: Database Connection

### Integration Tests
- [ ] Test 4: Email Sending (Outbound)
- [ ] Test 5: Email Receiving (Inbound)
- [ ] Test 6: AI Decision Making
- [ ] Test 7: Rate Limiting
- [ ] Test 8: Retry Logic

### End-to-End Tests
- [ ] Test 9: Full Negotiation - Happy Path
- [ ] Test 10: Escalation Flow
- [ ] Test 11: Conversation Context
- [ ] Test 12: Multiple Concurrent Negotiations

### Debugging Tests
- [ ] Test 13: Invalid Negotiation ID
- [ ] Test 14: Malformed Email
- [ ] Test 15: Database Failure

### Performance Tests
- [ ] Test 16: Response Time
- [ ] Test 17: Load Testing

### Issues Found:
1. 
2. 
3. 

### Notes:
-
```

---

## 🆘 Troubleshooting Common Test Failures

### "Email not received"
1. Check SendGrid Activity Feed
2. Verify sender is verified
3. Check spam folder
4. Review logs for errors

### "AI not responding"
1. Check Gemini API key is valid
2. Review conversation history in database
3. Check if parameters are valid JSON
4. Review AI prompt in code

### "Escalation loop"
1. Verify owner email detection logic
2. Check "Prevented escalation loop" in logs
3. Ensure owner's email matches database

### "Rate limit not working"
1. Check if rate limiter is initialized
2. Verify time windows are correct
3. Review logs for rate limit messages

---

## 📝 After Testing

1. **Document Results**: Fill in the test results template
2. **Fix Issues**: Address any failures
3. **Retest**: Confirm fixes work
4. **Deploy**: Push to production if all tests pass

---

## 🎉 Success Criteria

All tests should pass with:
- ✅ No critical errors
- ✅ Response times < 30 seconds
- ✅ All emails delivered
- ✅ AI makes appropriate decisions
- ✅ Escalation works correctly
- ✅ No data corruption

**Ready for Production!** 🚀

