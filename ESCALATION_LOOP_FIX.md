# Escalation Loop Bug Fix - Summary

## Problem Description
The AI negotiation agent was stuck in an infinite loop where:
1. Counterparty sends email → Agent escalates to owner ✓ (Correct)
2. Owner replies with instructions → Agent escalates AGAIN to owner ✗ (Bug)
3. Loop continues indefinitely

## Root Cause Analysis

### Primary Issue: Hardcoded Role Assignment
In `apps/agent-backend/src/routes/webhooks.ts` (Section 5: APPEND HISTORY), every incoming email was being labeled as `role: 'counterparty'` regardless of who sent it:

```typescript
const newHistoryEntry = {
  role: 'counterparty', // ❌ BUG: Always set to counterparty
  content: emailText,
  timestamp: new Date().toISOString(),
};
```

When the owner (`vpnxapp@gmail.com`) replied to an escalation email, their message was incorrectly treated as a counterparty message. This caused Gemini to think a new counterparty message arrived and decide to escalate again.

### Secondary Issue: No Loop Prevention
Even with role identification, there was no safeguard to prevent the AI from deciding to escalate when the message was from the owner.

## Solution Implemented

### 1. **Sender Role Identification** (Lines 158-174)
```typescript
// Extract owner email and normalize comparison
const ownerEmail = (negotiation as any)?.owner?.email;
const isOwnerEmail = ownerEmail && fromEmail.toLowerCase().includes(ownerEmail.toLowerCase());
const senderRole = isOwnerEmail ? 'owner' : 'counterparty';

const newHistoryEntry = {
  role: senderRole, // ✅ Correctly identifies sender
  content: emailText,
  timestamp: new Date().toISOString(),
};

log.info({
  fromEmail,
  ownerEmail,
  isOwnerEmail,
  senderRole,
}, 'Identified email sender');
```

**Key Points:**
- Normalizes email comparison using `.toLowerCase().includes()` to handle format variations like `"VPN X vpnxapp@gmail.com"`
- Correctly assigns `role: 'owner'` or `role: 'counterparty'`
- Logs identification for debugging

### 2. **Enhanced Gemini Prompt** (Lines 215-226)
```typescript
${senderRole === 'owner'
  ? `IMPORTANT: This is an instruction from the owner (your user). Follow their guidance and respond to the counterparty accordingly. DO NOT ESCALATE back to the owner - they have already given you instructions.`
  : `This is a message from the counterparty.`
}

ESCALATE: Use ONLY if the counterparty is hostile, unwilling to meet the user's requirements, or if you're unsure how to proceed. ${senderRole === 'owner' ? 'NEVER use ESCALATE when the message is from the owner.' : ''}
```

**Key Points:**
- Explicitly instructs Gemini not to escalate when the message is from the owner
- Treats owner messages as instructions, not escalation triggers

### 3. **Escalation Loop Prevention** (Lines 275-290)
```typescript
// CRITICAL FIX: If the message is from the owner, never escalate back to them
if (senderRole === 'owner' && action === 'ESCALATE') {
  log.warn({
    action,
    senderRole,
    fromEmail,
    ownerEmail
  }, 'Prevented escalation loop: Owner sent message but AI tried to escalate. Forcing COUNTER-PROPOSE instead.');
  
  // Override the action to COUNTER-PROPOSE when owner sends instructions
  aiResponse.action = 'COUNTER-PROPOSE';
  // If responseText doesn't make sense for counter-propose, generate a default
  if (!aiResponse.responseText || aiResponse.responseText.includes('escalat')) {
    aiResponse.responseText = 'Thank you for your guidance. I will proceed with the negotiation based on your instructions.';
  }
}

const finalAction = aiResponse.action;
```

**Key Points:**
- **Fail-safe mechanism**: Even if Gemini incorrectly decides to escalate, the code overrides it
- Converts `ESCALATE` → `COUNTER-PROPOSE` when sender is the owner
- Generates a sensible default response if needed
- Uses `finalAction` throughout the rest of the code

### 4. **Correct Email Routing** (Lines 148, 298-344)
When the owner replies, emails must go to the counterparty, not back to the owner:

```typescript
// Fetch counterparty email
const counterpartyEmail = negotiation.counterparty_email;

// In COUNTER-PROPOSE action:
// If sender is owner, send to counterparty. If sender is counterparty, send to counterparty (reply).
const recipientEmail = senderRole === 'owner' ? counterpartyEmail : fromEmail;

await sendEmail({
  to: recipientEmail,  // ✅ Correct recipient
  from: VERIFIED_FROM_FULL,
  subject: `Re: ${subjectText}`,
  html: finalResponseText,
  replyTo: uniqueReplyToAddress
});
```

**Key Points:**
- Owner replies → Email sent to **counterparty**
- Counterparty replies → Email sent to **counterparty** (normal reply)
- ACCEPT action always sends to counterparty
- Owner only notified on acceptance if they didn't trigger it

### 5. **Consistent Action Usage** (Lines 296-365)
All email sending logic now uses `finalAction` instead of `action`:
```typescript
if (finalAction === 'ACCEPT') { ... }
else if (finalAction === 'COUNTER-PROPOSE') { ... }
else if (finalAction === 'ESCALATE') { ... }
```

## Expected Behavior After Fix

### Scenario 1: Counterparty Messages
1. Email from counterparty arrives
2. Identified as `role: 'counterparty'`
3. Gemini decides: ACCEPT, COUNTER-PROPOSE, or ESCALATE
4. Action executed normally

### Scenario 2: Owner Messages (Fixed Flow)
1. Email from owner arrives (e.g., reply to escalation)
2. Identified as `role: 'owner'` ✅
3. Gemini is instructed NOT to escalate ✅
4. If Gemini mistakenly chooses ESCALATE, it's overridden to COUNTER-PROPOSE ✅
5. Email is sent to **counterparty** (not back to owner) ✅
6. Agent continues negotiation with counterparty based on owner's instructions ✅
7. **No loop** ✅

**Example Flow:**
- Counterparty: "I want 50% discount"
- Agent: *Escalates to owner*
- Owner: "Offer them 20% discount maximum"
- Agent: *Sends to counterparty* "We can offer you a 20% discount"
- ✅ Owner is not emailed again

## Testing Recommendations

1. **Test Owner Reply**: Have owner reply to an escalation email and verify:
   - Log shows `"senderRole": "owner"`
   - Agent does NOT escalate back to owner
   - Log shows `"recipientEmail": "<counterparty email>"`
   - Log shows `"sentToCounterparty": true`
   - Agent sends appropriate response to counterparty
   - Counterparty receives the message (not the owner)

2. **Test Edge Cases**:
   - Owner email with different display name formats
   - Multiple escalations from different issues
   - Owner sending "escalate" in their message text

3. **Monitor Logs**: Look for this new warning log:
   ```
   "Prevented escalation loop: Owner sent message but AI tried to escalate."
   ```

## Log Indicators of Success

**Before Fix:**
```json
{
  "fromEmail": "VPN X vpnxapp@gmail.com",
  "action": "ESCALATE",
  "ownerEmail": "vpnxapp@gmail.com",
  "msg": "Sending escalation email to owner"  // ❌ Loop
}
```

**After Fix:**
```json
{
  "fromEmail": "VPN X vpnxapp@gmail.com",
  "ownerEmail": "vpnxapp@gmail.com",
  "senderRole": "owner",  // ✅ Identified
  "isOwnerEmail": true,
  "action": "ESCALATE",
  "finalAction": "COUNTER-PROPOSE",  // ✅ Overridden
  "msg": "Prevented escalation loop"  // ✅ Loop prevented
}
// ... and later in the flow:
{
  "senderRole": "owner",
  "recipientEmail": "counterparty@example.com",  // ✅ Sent to counterparty
  "sentToCounterparty": true,
  "msg": "Counter-proposal email sent"
}
```

## Files Modified
- `apps/agent-backend/src/routes/webhooks.ts`

## Deployment Notes
- No breaking changes
- No database migrations required
- Backward compatible with existing negotiations
- Safe to deploy immediately

---

**Fix Author**: AI Assistant  
**Date**: October 13, 2025  
**Negotiation ID Affected**: c49eaca4-cfd5-4de4-9647-26936aa2ce9c (and all future negotiations)

