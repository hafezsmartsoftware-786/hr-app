# WhatsApp Business Cloud API — Full Integration Plan
> Using Meta (Facebook) Cloud API — Graph API v20+
> Informed by: ChatNexGen AI — WhatsApp Automation CRM V2 Architecture

---

## 1. What We Are Building

We are building a **self-hosted WhatsApp CRM and automation engine** that connects directly to the official **Meta WhatsApp Business Cloud API**. This is not a third-party gateway — it talks directly to Meta's Graph API, which means:

- No middleman service fees
- Full control over webhook events
- Compliance with Meta's Terms (no risk of number bans)
- Access to all official features: templates, interactive messages, media, broadcasts

The system has several interconnected layers:

1. **Messaging Layer** — Sending and receiving WhatsApp messages via Meta's API
2. **Shared Inbox** — Multiple agents collaborating on one WhatsApp number
3. **CRM Pipeline** — Kanban-style deal tracking linked to conversations
4. **Broadcast Campaigns** — Bulk messaging with Meta-approved templates
5. **No-Code Automation Engine** — Visual flow builder for automated replies
6. **AI Assistant** — Smart auto-responder with human handover logic

---

## 2. Core Concepts — How Meta's API Works

### 2.1 Two Directions of Messages

| Direction | Type | Rule |
|---|---|---|
| **Business → User** (outbound) | Must use a **pre-approved Message Template** | Always required when starting a conversation |
| **User → Business** (inbound) | Free-form replies allowed within **24 hours** of last user message | The 24-hour window resets with every incoming message |

This means:
- If a user messages us first → we can reply freely for 24 hours
- If we initiate contact → we must use a Meta-approved template
- After 24 hours of silence from the user → we must go back to using a template

### 2.2 Webhook is the Heart

Everything inbound flows through **one HTTPS webhook endpoint** on our server. Meta pushes events to us in real time:
- Incoming messages from users
- Delivery receipts (sent → delivered → read)
- Template approval/rejection status changes
- Button click replies from users

We must respond to webhook events with HTTP 200 **immediately** (within 20 seconds), then process the logic asynchronously. If we don't, Meta retries with exponential backoff, which can cause duplicate processing.

### 2.3 Signature Verification is Mandatory

Every webhook POST from Meta includes an `X-Hub-Signature-256` header — an HMAC SHA-256 hash of the payload signed with our **App Secret**. We must verify this before processing any event, otherwise we're vulnerable to spoofed requests.

---

## 3. Account & Credential Setup

### 3.1 Meta Developer Portal Steps
1. Create a Meta App → Use case: **"Business"**
2. Add **WhatsApp** product to the app
3. Link to a **WhatsApp Business Account (WABA)**
4. Register and verify a phone number
5. Create a **System User** in Business Manager and generate a **Permanent Access Token**

### 3.2 Required Credentials

| Credential | Purpose |
|---|---|
| `PHONE_NUMBER_ID` | Identifies which number sends/receives |
| `WABA_ID` | WhatsApp Business Account ID — used for template management |
| `META_ACCESS_TOKEN` | Permanent System User token — authenticates all API calls |
| `META_APP_SECRET` | Used to verify webhook HMAC signatures |
| `WEBHOOK_VERIFY_TOKEN` | A secret we define — used during webhook registration handshake |
| `ENCRYPTION_KEY` | 64-hex character key to encrypt stored credentials in DB (security layer) |

> [!IMPORTANT]
> Never use the temporary dashboard token. Always create a **System User** in Business Manager and generate a **permanent, non-expiring token**. Store all keys encrypted — never in plain text in the database.

---

## 4. System Architecture

### 4.1 High-Level Flow

```
User sends WhatsApp message
        ↓
Meta Cloud API
        ↓  (POST webhook event)
Our Webhook Endpoint
        ↓
  ┌─────────────────────────────────┐
  │  Webhook Router / Dispatcher    │
  └────────┬──────────┬────────────┘
           ↓          ↓
    Automation     Shared Inbox
    Engine         (Agent UI)
           ↓          ↓
         AI Layer  (if no agent online)
           ↓
    Response built
        ↓
Meta Cloud API /messages endpoint
        ↓
WhatsApp User receives reply
```

### 4.2 Technology Stack (Reference: ChatNexGen AI V2)

| Layer | Technology | Why |
|---|---|---|
| Frontend | Next.js (App Router) + React + TypeScript | Full-stack, server-side rendering, API routes |
| Styling | Tailwind CSS + Framer Motion | Fast UI, smooth animations |
| Database | Supabase (PostgreSQL + Realtime + RLS) | Real-time inbox sync, row-level security per agent |
| WhatsApp | Meta WhatsApp Cloud API (official) | Compliance, no bans, full feature access |
| AI Primary | Google Gemini 1.5 / 2.0 Flash | Fast, cost-effective responses |
| AI Fallback | OpenAI GPT-4o-Mini (via OpenRouter) | Circuit-breaker failover if Gemini fails |
| Appointments | Google Sheets via Apps Script webhook | Simple external sync for bookings |

> [!NOTE]
> The dual AI engine pattern (Gemini primary → OpenAI fallback) uses a **circuit breaker** — if the primary AI fails or times out, it automatically falls back to the secondary. This ensures the assistant never goes silent.

---

## 5. Feature Modules

### 5.1 Shared Inbox — Multi-Agent Collaboration

The most important real-time feature. Multiple agents share one WhatsApp Business number.

**Key behaviors:**
- Each conversation is a **thread** tied to a contact's phone number
- Threads can be **assigned** to a specific agent
- Thread status: `open` → `in_progress` → `resolved`
- **Internal notes** visible only to agents (not sent to customer)
- If a thread is assigned to Agent A, Agent B should see it as locked or tagged to prevent overlap
- Real-time updates via **Supabase Realtime listeners** — agents see new messages without refreshing
- Supports all media types: text, images, documents, audio, interactive buttons

**Database tables needed:**
- `contacts` — phone number, name, custom fields, tags
- `conversations` — linked to a contact, status, assigned agent
- `messages` — all inbound and outbound messages per conversation
- `agents` — team members with roles
- `internal_notes` — agent-only comments per conversation

### 5.2 Kanban Pipeline — Deal Tracking

A visual drag-and-drop pipeline where deals are linked directly to WhatsApp conversations.

**Key behaviors:**
- Pipelines have named stages (e.g., New Lead → Qualified → Proposal → Closed)
- Each deal has a monetary value — pipeline shows total value per stage
- Deals are linked to a contact and their WhatsApp conversation
- Moving a deal between stages can trigger automations (e.g., send a template message)
- Quick-actions directly from the card: send template, update status, assign agent

**Database tables needed:**
- `pipelines` — pipeline definitions with stages
- `deals` — linked to contacts, assigned to pipeline stage, has value
- `pipeline_stages` — ordered stages within a pipeline

### 5.3 Broadcast Campaigns — Bulk Messaging

Used to send template messages to a contact list in bulk.

**Key behaviors:**
- Only Meta-approved templates can be used for broadcasts
- Contact lists can be filtered by tags or custom fields
- Messages are personalized using **dynamic variable substitution** (e.g., `{{name}}`, `{{appointment_date}}`)
- Campaigns can be **scheduled** (send at a specific time) or **instant**
- After sending, track per-message status: delivered, read, failed
- Analytics: delivery rate, read rate, button click rate

**Important constraint:** Meta has rate limits on broadcast sending — we must queue messages and respect the 80 msg/sec per phone number limit.

**Database tables needed:**
- `broadcast_campaigns` — name, template used, status, schedule time
- `broadcast_recipients` — per-contact send status within a campaign
- `broadcast_analytics` — aggregated stats

### 5.4 No-Code Automation Builder

A visual flow builder for creating automated conversation flows without writing code.

**Trigger types:**
- Incoming keyword match (e.g., user sends "HELP" → trigger support flow)
- Contact registers / first message received
- Scheduled time event (e.g., 24h before appointment)
- Deal stage change

**Node types (actions):**
- Send a message (template or free-form if in window)
- Wait X minutes/hours before next step
- Assign conversation to an agent or team
- Add/remove a tag on the contact
- Set a custom field value
- Check a condition (branch logic: if tag = "VIP" → go to path A, else path B)
- Check business hours (branch: if within hours → agent, else → AI)
- Trigger an external webhook (call another system's API)

**Key design decision:** Automations are non-blocking. They don't interrupt a conversation that already has an active agent. If a human takes over, the automation flow pauses.

**Database tables needed:**
- `automation_flows` — flow definition (nodes + edges as JSON)
- `automation_triggers` — what starts the flow
- `automation_executions` — log of which contact is at which step

### 5.5 AI Healthcare Assistant (Autonomous Mode)

An AI-powered assistant that handles conversations autonomously, with a strict scope.

**The 4-step appointment booking flow:**
1. **Collect patient details** — name, age, reason for visit
2. **Doctor selection** — show available doctors, let patient choose
3. **Slot calculation** — dynamically check real-time doctor schedule, clinic timings, and existing bookings to offer available slots
4. **Confirmation** — confirm the booking, log to Google Sheets

**Key guardrails (what the AI must never do):**
- Never give medical diagnoses or recommend specific treatments
- Never include HTML in responses
- Trigger immediate human handover if: patient uses emergency keywords, requests to speak to a doctor directly, or expresses urgency
- Stay strictly on topic — reject off-topic questions

**Human handover logic:**
- If conversation idle for X minutes → reset AI session
- If agent is online and conversation is assigned → AI steps back, human takes over
- If escalation keyword detected → flag conversation, notify available agent

**Clinic context caching:**
- To avoid hitting the database on every message, clinic-specific data (AI settings, doctor schedules, clinic timings, services, FAQs) is cached in memory
- Cache is refreshed periodically or on config change

**AI Engine strategy:**
- Primary: Google Gemini (fast, cheap)
- Fallback: OpenAI / OpenRouter (circuit breaker kicks in if Gemini fails)
- Circuit breaker tracks failure rate — if primary fails 3+ times in a row, switch to fallback automatically

---

## 6. Database Schema Overview

The database is managed through **Supabase migrations** (SQL files applied in order). Key schema areas:

| Schema Area | Purpose |
|---|---|
| Core CRM | contacts, conversations, messages, agents, internal notes |
| Pipelines | pipelines, stages, deals |
| Broadcasts | campaigns, recipients, analytics |
| Automations | flows, triggers, executions, logs |
| AI Healthcare | clinic settings, doctor schedules, appointment bookings, AI session state |
| Security | Row-Level Security (RLS) policies — agents only see their assigned/permitted data |

> [!IMPORTANT]
> All WhatsApp API credentials (tokens, app secrets) stored in the database must be **encrypted** using AES-256 (32-byte key). Never store raw tokens. Decrypt only at runtime in the server layer.

---

## 7. Message Templates

### 7.1 Template Categories

| Category | Use Case | Notes |
|---|---|---|
| `UTILITY` | Confirmations, reminders, updates | Lower cost |
| `AUTHENTICATION` | OTP codes | Very low cost |
| `MARKETING` | Promotions, campaign messages | Higher cost, Meta reviews closely |

### 7.2 Template Lifecycle

```
Draft → Submitted for Review → PENDING → APPROVED ✅
                                       → REJECTED ❌ (edit and resubmit)
                                       → PAUSED ⚠️ (quality issue — user feedback triggered)
                                       → DISABLED ❌❌ (repeated quality violations)
```

We must listen to the `message_template_status_update` webhook field to track approval status changes automatically.

### 7.3 Dynamic Variables

Templates support placeholders like `{{1}}`, `{{2}}` filled at send time from contact custom fields. This is how broadcast personalization works — the template body stays fixed (Meta-approved), but variable values differ per recipient.

---

## 8. Handling the 24-Hour Conversation Window

This is the most important business rule in the WhatsApp API:

| Scenario | What We Can Do |
|---|---|
| User messaged us in the last 24 hours | Send any free-form message, media, interactive buttons |
| More than 24 hours since last user message | Must use a Meta-approved template to re-engage |
| We want to start a conversation proactively | Must use a Meta-approved template |

**Implication for our system:**
- Every `messages` record should store a `last_user_message_at` timestamp
- Before sending a free-form reply, always check if we're within the 24h window
- If outside the window, the system should automatically select and send an appropriate template

---

## 9. Security Layers

| Layer | How |
|---|---|
| Webhook signature verification | HMAC SHA-256 with App Secret on every incoming request |
| Credential encryption | AES-256 for all stored API keys |
| Row-Level Security | Supabase RLS ensures agents only see allowed data |
| HTTPS only | Webhook endpoint must use a valid SSL certificate |
| Cron route protection | Automation cron jobs protected by a secret token |
| System User token | Permanent, scoped access — never use personal Facebook tokens |

---

## 10. Environment Configuration (Key Variables)

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public Supabase key (browser-safe) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only key for webhook and cron triggers |
| `ENCRYPTION_KEY` | 64-hex chars (32 bytes) for encrypting stored API credentials |
| `META_APP_SECRET` | For HMAC verification of incoming webhook events |
| `GEMINI_API_KEY` | Primary AI engine |
| `OPENAI_API_KEY` | Fallback AI engine |
| `GOOGLE_SHEETS_WEBHOOK_URL` | Apps Script URL for appointment sync |
| `AUTOMATION_CRON_SECRET` | Secures scheduled automation trigger routes |

---

## 11. Key Integration Points with INT-HR App

Since we're integrating this into the INT-HR platform, the WhatsApp layer will connect to:

| INT-HR Feature | WhatsApp Action |
|---|---|
| Leave request submitted | Template sent to manager with Approve/Reject buttons |
| Leave approved/rejected | Template sent to employee with decision |
| Contract expiring soon | Template sent to HR as reminder |
| New employee added | Template sent to employee with onboarding info |
| Manager taps Approve button | Webhook inbound → button reply → auto-update leave record |
| Attendance alerts | Free-form message (if within 24h window) |

The manager approval flow via WhatsApp button replies is the highest-value feature — it removes the need for managers to log into the HR app just to approve a leave request.

---

## 12. Implementation Phases

### Phase 1 — Foundation
- Meta app setup, credentials, webhook endpoint
- Receive and verify incoming messages
- Basic outbound template sending
- Core database schema (contacts, conversations, messages)

### Phase 2 — Shared Inbox
- Agent UI with real-time message sync
- Thread assignment and status management
- Internal notes
- Media message support

### Phase 3 — Templates & Broadcasts
- Template creation and management UI
- Template approval status tracking
- Broadcast campaign builder with contact list targeting
- Delivery and read analytics

### Phase 4 — Automation Engine
- Visual flow builder
- Keyword triggers
- Conditional branching
- Wait steps and scheduled actions
- External webhook actions

### Phase 5 — AI Assistant
- Gemini integration with fallback to OpenAI
- Healthcare/appointment booking flow
- Human handover detection
- Clinic context caching
- Google Sheets sync

---

## 13. References

| Resource | URL |
|---|---|
| WhatsApp Cloud API Docs | https://developers.facebook.com/docs/whatsapp/cloud-api |
| Graph API Explorer | https://developers.facebook.com/tools/explorer |
| Template Management API | https://developers.facebook.com/docs/whatsapp/business-management-api/message-templates |
| Webhook Reference | https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks |
| Meta Business Manager | https://business.facebook.com |
| Pricing Calculator | https://developers.facebook.com/docs/whatsapp/pricing |
| Reference Project (ChatNexGen AI) | https://github.com/sapatil2212/WhatsApp-Automation-CRM-V2 |
| Supabase Realtime Docs | https://supabase.com/docs/guides/realtime |
| Google Gemini API | https://ai.google.dev/gemini-api/docs |
| OpenRouter (AI Fallback) | https://openrouter.ai/docs |
