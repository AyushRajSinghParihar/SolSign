# SolSign Agent Backend

An autonomous AI-powered contract negotiation agent that handles email-based negotiations on behalf of users.

## 🎯 What Does This Agent Do?

The agent automates contract negotiations via email using AI:

1. **Receives User Goals**: User provides counterparty email + negotiation goals (e.g., "Minimum price $5,000, payment terms ≤ 15 days")
2. **Initiates Contact**: Sends professional negotiation email to counterparty
3. **Autonomous Negotiation**: 
   - Receives replies via email
   - Analyzes them against user's goals using Google Gemini AI
   - Generates and sends counter-proposals automatically
4. **Smart Escalation**: Escalates to user when:
   - Counterparty is hostile or unwilling
   - Request falls outside defined parameters
   - Agent is unsure how to proceed
5. **Agreement Detection**: Notifies all parties when terms are agreed upon

## 🏗️ Architecture

```
┌─────────────┐
│   User      │
│  (Owner)    │
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│  Supabase Webhook   │  ← Triggers negotiation
│  /jobs/start-neg    │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│   SendGrid Email    │  → To counterparty
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  Email Replies      │  ← From counterparty/owner
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ SendGrid Inbound    │
│ Parse Webhook       │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  Gemini AI          │  → Decides: ACCEPT/COUNTER/ESCALATE
│  Analysis           │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  Send Response      │  → Email to appropriate party
└─────────────────────┘
```

## 📁 Project Structure

```
agent-backend/
├── src/
│   ├── index.ts                 # Main server setup + env validation
│   ├── config/
│   │   └── logger.ts            # Pino logger configuration
│   ├── routes/
│   │   ├── health.ts            # Health check endpoint
│   │   ├── jobs.ts              # /jobs/start-negotiation
│   │   └── webhooks.ts          # /webhooks/email-inbound
│   ├── services/
│   │   ├── email-service.ts     # SendGrid email sender (with retry + rate limit)
│   │   └── sendgrid-verification.ts  # Webhook signature verification
│   └── types/
│       └── fastify.d.ts         # TypeScript type extensions
├── package.json
├── tsconfig.json
├── .env.example                 # Environment variables template
└── README.md                    # This file
```

## 🔑 Environment Variables

Copy `.env.example` to `.env` and configure:

### Required Variables:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_KEY` - Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (bypasses RLS)
- `SUPABASE_WEBHOOK_SECRET` - Secret for authenticating Supabase webhooks
- `SENDGRID_API_KEY` - SendGrid API key for sending emails
- `VERIFIED_FROM_EMAIL` - Verified sender email in SendGrid
- `VERIFIED_FROM_NAME` - Sender name for emails
- `INBOUND_PARSE_SECRET` - Secret for authenticating SendGrid inbound webhooks
- `GEMINI_API_KEY` - Google Gemini API key

### Optional Variables:
- `PORT` - Server port (default: 3002)
- `HOST` - Server host (default: 0.0.0.0)
- `NODE_ENV` - Environment (development/production)
- `LOG_LEVEL` - Logging level (debug/info/warn/error)

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env with your actual values
```

### 3. Build
```bash
npm run build
```

### 4. Run
```bash
# Development (with hot reload)
npm run dev

# Production
npm start
```

## 📡 API Endpoints

### `GET /health`
Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-10-13T10:30:00.000Z",
  "uptime": 1234.56
}
```

### `POST /jobs/start-negotiation`
Initiates a new negotiation (called by Supabase webhook).

**Headers:**
- `Authorization: Bearer <SUPABASE_WEBHOOK_SECRET>`

**Body:**
```json
{
  "record": {
    "id": "negotiation-uuid",
    "document_id": "document-uuid",
    "counterparty_email": "counterparty@example.com",
    "parameters": {
      "instructions": "Minimum price $5,000, payment terms ≤ 15 days"
    },
    "history": []
  }
}
```

**Response:**
```json
{
  "success": true
}
```

### `POST /webhooks/email-inbound?secret=<INBOUND_PARSE_SECRET>`
Receives inbound emails from SendGrid Inbound Parse.

**Content-Type:** `multipart/form-data`

**Fields:**
- `from` - Sender email
- `to` - Recipient (contains negotiation ID: `neg-{id}@negotiate.solsignai.com`)
- `subject` - Email subject
- `text` - Plain text body
- `html` - HTML body

**Response:**
```json
{
  "success": true
}
```

## 🧠 AI Decision Logic

The agent uses Google Gemini to analyze each email and decide on one of three actions:

### ACCEPT
- Used when counterparty agrees to ALL user requirements
- Sets negotiation status to `agreed`
- Notifies both parties

### COUNTER-PROPOSE
- Used to respond to questions or suggest changes
- Always maintains user's key parameters
- Sends AI-generated response to counterparty

### ESCALATE
- Used when counterparty is hostile or unwilling
- Used when agent is unsure how to proceed
- Sends summary to owner for manual intervention
- **Never used when owner sends instructions** (prevents escalation loops)

## 🔒 Security Features

1. **Webhook Authentication**: 
   - Supabase webhooks require bearer token
   - SendGrid webhooks require query parameter secret

2. **Rate Limiting**: 
   - 10 emails per recipient per 5-minute window
   - Prevents spam and abuse

3. **Service Role Key**: 
   - Used to bypass RLS policies for system operations
   - Allows agent to read/write negotiation data

4. **Input Validation**: 
   - All environment variables validated at startup
   - Server exits if required variables are missing

## 🔧 Advanced Features

### Retry Logic
Email sending includes automatic retry with exponential backoff:
- 3 retry attempts
- Initial delay: 1 second
- Delay doubles on each retry (1s → 2s → 4s)

### Escalation Loop Prevention
Critical feature that prevents infinite loops:
- Detects when owner sends instructions
- Prevents AI from escalating back to owner
- Forces COUNTER-PROPOSE action instead

### Email Threading
- Unique reply-to address per negotiation: `neg-{id}@negotiate.solsignai.com`
- Maintains conversation context
- Allows owner to intervene by replying

### Comprehensive Logging
- Structured JSON logs using Pino
- Performance metrics (duration tracking)
- Detailed error context
- Pretty-printed in development

## 📊 Database Schema (Supabase)

### `negotiations` table
```sql
{
  id: uuid (primary key),
  document_id: uuid (foreign key → documents),
  user_id: uuid (foreign key → users),
  counterparty_email: text,
  parameters: jsonb,  -- Contains user's goals/instructions
  status: text,       -- 'pending' | 'in_progress' | 'escalated' | 'agreed' | 'cancelled'
  history: jsonb[],   -- Array of conversation entries
  created_at: timestamp,
  updated_at: timestamp
}
```

### History Entry Format
```typescript
{
  role: 'agent' | 'counterparty' | 'owner',
  content: string,
  timestamp: string (ISO 8601)
}
```

## 🧪 Testing

### Manual Testing
1. Start the server: `npm run dev`
2. Use a tool like Postman to call endpoints
3. Check logs for detailed execution traces

### Testing Negotiation Flow
1. Create a negotiation in Supabase
2. Call `/jobs/start-negotiation` with negotiation data
3. Check counterparty receives initial email
4. Reply to negotiation email
5. Verify AI generates appropriate response

## 🐛 Troubleshooting

### Email Not Sending
- Check `SENDGRID_API_KEY` is valid
- Verify `VERIFIED_FROM_EMAIL` is verified in SendGrid
- Check SendGrid dashboard for errors
- Review logs for detailed error messages

### Inbound Emails Not Working
- Verify SendGrid Inbound Parse is configured
- Check MX records are set correctly
- Verify `INBOUND_PARSE_SECRET` matches webhook URL
- Check DNS propagation (can take 24-48 hours)

### AI Not Responding Correctly
- Check `GEMINI_API_KEY` is valid
- Review conversation history in database
- Check if parameters are correctly formatted
- Review AI prompt in `webhooks.ts` (line 201)

### Escalation Loops
- This should be prevented automatically
- Check logs for "Prevented escalation loop" messages
- Verify owner email detection logic (line 161 in webhooks.ts)

## 🚢 Deployment (Render)

1. **Create a Web Service** in Render
2. **Connect your repository**
3. **Configure**:
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
   - Root Directory: `apps/agent-backend`
4. **Add Environment Variables** from `.env.example`
5. **Deploy**

### Post-Deployment Checklist:
- [ ] Verify `/health` endpoint responds
- [ ] Test SendGrid integration
- [ ] Configure SendGrid Inbound Parse webhook
- [ ] Test complete negotiation flow
- [ ] Monitor logs for errors

## 📝 License

Part of the SolSign project.

## 🤝 Contributing

This is part of a monorepo. See main README for contribution guidelines.

