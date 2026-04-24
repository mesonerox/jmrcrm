# Range CRM

**An AI-native revenue intelligence system built specifically for Range's BD motion.**

![Built for Range](https://img.shields.io/badge/Built%20for-Range-6366f1?style=flat-square)
![Powered by Claude](https://img.shields.io/badge/Powered%20by-Claude%20Sonnet%204.6-orange?style=flat-square)
![n8n Automated](https://img.shields.io/badge/n8n-5%20Workflows%20Active-ef5533?style=flat-square)
![Live & Functional](https://img.shields.io/badge/Status-Live%20%26%20Functional-22c55e?style=flat-square)
![Open Source Stack](https://img.shields.io/badge/Stack-100%25%20Open%20Source-3b82f6?style=flat-square)

This is a purpose-built revenue intelligence system for Range's go-to-market team — not a CRM configuration, but a full-stack AI system designed around Range's actual product surface, ICP, and operational reality. This statement maps directly to three concrete engineering problems: an inbound qualification bottleneck that lets leads go cold, a structurally absent outbound motion with no personalization infrastructure, and a BD operations layer that doesn't yet have AI as a force multiplier.

![BD Intelligence Dashboard](https://github.com/user-attachments/assets/ab342743-28fe-4ccc-b589-888726cf30ca)

---

## The Problem

| Problem | Current State | What This Solves |
|---------|--------------|-----------------|
| **Inbound overload** | Manual qualification, leads fall through cracks | AI scorer qualifies every lead in <60s, auto-routes by tier |
| **Zero outbound motion** | No systematic prospecting, no personalization at scale | Automated sequence engine with ICP-targeted, Claude-written emails |
| **Ops bottleneck** | BD lead has no right-hand for tooling or reporting | Autonomous agent layer handles tier-1 ops via natural language |

Off-the-shelf CRMs — HubSpot, Salesforce — solve the wrong problem. They're built for generic B2B sales motions: contacts, deals, pipelines. They have no concept of a `WalletDeployment`, a `Chain`, or an `Integration`. They can't model the difference between a fintech on stablecoin rails and a gaming company experimenting with NFTs. You end up shoe-horning Range's product surface into "Custom Field 1" and calling it a day. The data model breaks. The reporting is meaningless. And you've spent $500/month on a system that doesn't actually know what Range sells.

The deeper issue is AI integration. HubSpot's "AI features" are bolt-ons — summary generators, email subject line suggestions — that have no access to your actual business logic, ICP scoring rubric, or historical deal data. They can't qualify a lead against Range's specific criteria (stablecoin rails? payroll? cross-border remittance?) because they don't know what those criteria are. This system encodes Range's ICP as a first-class scoring model, puts Claude at the center of every workflow, and builds the data model around Range's actual product — wallets, chains, integrations, health scores. The result is a CRM that understands the business, not one that has to be taught to approximate it.

---

## Why This Stack vs HubSpot / Salesforce

| Dimension | This Stack | HubSpot / Salesforce |
|-----------|-----------|----------------------|
| **Data model** | Fully custom — `WalletDeployment`, `Chain`, `Integration` objects match Range's actual product surface | Generic contact/deal model, no crypto-native objects |
| **AI integration** | Native MCP tools + Anthropic SDK, Claude in every workflow | Bolt-on AI features, no custom scoring logic |
| **Cost at 10 users** | ~$25–40/mo (infra only) | HubSpot Sales Pro: ~$500/mo |
| **Extensibility** | Open-source, full code ownership, no vendor lock-in | Vendor lock-in, limited API access |
| **Signal to Range** | Shows GTM engineering depth | Shows Salesforce admin skills |

---

## Current State vs Vision

### ✅ Live & Functional Today

- **Twenty CRM** self-hosted via Docker on `localhost:3000` — system of record with custom schema
- **Custom objects** created programmatically via Twenty's GraphQL metadata API: `InboundLead`, `Chain`, `WalletDeployment`
- **Custom fields** on `Company` for account health: `healthScore`, `churnRisk`, `monthlyApiCalls`, `activeWalletCount`, `estimatedARR`, `segment`, `expansionPotential`, `icpNotes`
- **20 mock accounts** seeded — RemitFlow, NeoVault, MoneyGram, PixelVault, StackBank, and 15 others representing Range's actual ICP distribution
- **BD Intelligence Dashboard** (Next.js, `localhost:3001`) embedded natively inside Twenty's UI via script injection — collapsible nav group with Dashboard, Leads, Pipeline, Accounts sub-pages, no second sidebar, seamless iframe integration with matching dark theme
- **MCP Server** with 4 tools (`qualify_lead`, `get_account_health`, `prep_meeting_brief`, `draft_outreach`) registered with Claude Desktop — fully operational, testable via natural language today
- **5 n8n workflows** imported and active at `localhost:5678` — inbound qualification, outbound sequences, account health monitoring, deal stage automation, weekly digest
- **Slack bot** (`services/slack-bot`) scaffolded with command structure documented — slash commands and channel notifications planned as next milestone

### 🔭 The Full Vision (6-Month Roadmap)

The system as it stands is a working foundation. The full vision is a completely autonomous revenue ops layer.

Every inbound lead — regardless of source, volume, or time of day — is qualified by Claude within 60 seconds of form submission. The lead is scored 0–100 against Range's ICP, tier-classified, routed to the right AE, and a first-touch email is drafted and queued, all before anyone opens their laptop. The Slack notification in `#crm-inbound` includes the score, the rationale, and an [Assign to AE] button. The BD team's job is to review and approve, not to process.

The BD Intelligence Dashboard becomes the single pane of glass for the entire revenue motion: live funnel health, account health signals with churn risk flags, today's action queue ranked by AI-assessed urgency, hot accounts with intent signals, channel performance, and SQL quality by source. Account health monitoring runs continuously in the background — a health score drop below 60 combined with 14+ days of inactivity triggers an automated alert and schedules a check-in task. An API call spike of +200% triggers an expansion signal and queues an upsell draft. Meeting briefs are auto-generated 30 minutes before every calendar event, pulling the full account context from Twenty and surfacing the three most important talking points. The MCP server gives every operator — from the BD lead to the CEO — natural language access to the CRM: ask it anything about any account and get a structured, accurate answer in seconds. The Slack bot delivers weekly pipeline digests, deal close notifications, lead scoring alerts, and account health warnings directly in-channel, meeting the team where they already work.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     RANGE CRM STACK                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    INTERFACE LAYER                        │    │
│  │                                                           │    │
│  │  ┌──────────────────┐    ┌──────────────────────────┐   │    │
│  │  │   Twenty CRM     │    │   BD Intelligence        │   │    │
│  │  │   :3000          │◄───│   Dashboard (Next.js)    │   │    │
│  │  │   (System of     │    │   :3001 — embedded in    │   │    │
│  │  │    Record)       │    │   Twenty via injection   │   │    │
│  │  └────────┬─────────┘    └──────────────────────────┘   │    │
│  │           │                                               │    │
│  │  ┌────────▼─────────────────────────────────────────┐   │    │
│  │  │           Slack Bot (Bolt)           [planned]    │   │    │
│  │  │   /crm qualify · /crm brief · /crm draft         │   │    │
│  │  │   #crm-inbound · #crm-signals · #crm-digest      │   │    │
│  │  └──────────────────────────────────────────────────┘   │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                  AUTOMATION LAYER                         │    │
│  │                                                           │    │
│  │  ┌──────────────────┐    ┌──────────────────────────┐   │    │
│  │  │   n8n Workflows  │    │   MCP Server             │   │    │
│  │  │   :5678          │    │   (stdio transport)      │   │    │
│  │  │   5 workflows    │    │   4 AI tools             │   │    │
│  │  └────────┬─────────┘    └────────────┬─────────────┘   │    │
│  │           │                           │                   │    │
│  │           └──────────┬────────────────┘                  │    │
│  │                      ▼                                    │    │
│  │           ┌─────────────────────┐                        │    │
│  │           │   Claude API        │                        │    │
│  │           │   (claude-sonnet-   │                        │    │
│  │           │    4-6)             │                        │    │
│  │           └─────────────────────┘                        │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │               INFRASTRUCTURE LAYER                        │    │
│  │                                                           │    │
│  │   Docker Compose · PostgreSQL · Redis · Railway           │    │
│  │   Twenty REST API · GraphQL Metadata API                  │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

**Interface Layer:** Twenty CRM is the system of record — all account data, leads, and opportunities live here. The BD Intelligence Dashboard is a Next.js app embedded directly inside Twenty's UI via a script injected into the container's `index.html`, rendering as a native nav section with a collapsible submenu and matching dark theme. No tab switching, no context loss.

**Automation Layer:** n8n orchestrates multi-step workflows that connect external data sources (Apollo.io, Hunter.io, Gmail) to Twenty and Claude. The MCP server exposes four AI tools over stdio transport, giving Claude Desktop direct access to CRM operations via natural language. Claude is the reasoning engine for both layers — scoring, writing, summarizing, and recommending.

**Infrastructure Layer:** Everything runs in Docker Compose locally, with Railway as the deployment target. Twenty's API surface (REST + GraphQL metadata) is the data interface for all services. PostgreSQL and Redis are managed by the Docker Compose stack.

---

## Data Model

All custom objects and fields are created programmatically via Twenty's GraphQL metadata API — see `schema/twenty-setup.ts`. No manual clicking in the UI.

### Standard Objects (used as-is)

`Company` · `Person` · `Opportunity` · `Activity` · `Note` · `Task`

### Custom Objects

#### InboundLead

| Field | Type | Description |
|-------|------|-------------|
| `name` | Text | Lead full name |
| `email` | Email | Contact email |
| `company` | Text | Company name |
| `title` | Text | Job title |
| `country` | Text | Country (optional) |
| `useCase` | LongText | Self-described use case |
| `source` | Select | Form source (website, referral, event, etc.) |
| `icpScore` | Number | AI-generated score 0–100 |
| `icpTier` | Select | A / B / C / Disqualified |
| `scoringRationale` | LongText | Claude's reasoning |
| `nextAction` | Select | Book Demo / Nurture / Disqualify |
| `expansionFlags` | MultiSelect | Agentic Payments / Payroll / Remittance / etc. |
| `personalizationAngle` | LongText | Claude-generated opening angle |
| `assignedAe` | Relation | → Person |
| `status` | Select | New / Contacted / Qualified / Disqualified |
| `qualifiedAt` | DateTime | Timestamp of AI qualification |

#### WalletDeployment

| Field | Type | Description |
|-------|------|-------------|
| `name` | Text | Deployment name |
| `company` | Relation | → Company |
| `walletType` | Select | Custodial / MPC / Smart Contract |
| `chain` | Relation | → Chain |
| `monthlyVolume` | Number | USD volume/month |
| `activeWallets` | Number | Active wallet count |
| `goLiveDate` | Date | Production launch date |
| `status` | Select | Active / Inactive / Churned |

#### Chain

| Field | Type | Description |
|-------|------|-------------|
| `name` | Text | Chain name (Ethereum, Solana, etc.) |
| `symbol` | Text | Ticker symbol |
| `category` | Select | EVM / SVM / Other |
| `isMainnet` | Boolean | Mainnet flag |
| `explorerUrl` | URL | Block explorer |

### Custom Fields on Company (Account Health)

Added to the standard `Company` object via metadata API:

| Field | Type | Description |
|-------|------|-------------|
| `healthScore` | Number | 0–100 composite health score |
| `churnRisk` | Select | Low / Medium / High / Critical |
| `lastProductActivity` | DateTime | Last API call or product event |
| `monthlyApiCalls` | Number | API calls in trailing 30 days |
| `activeWalletCount` | Number | Currently active wallets |
| `activeChainCount` | Number | Chains in production use |
| `activeModules` | MultiSelect | Wallets / NFT / Payments / etc. |
| `estimatedARR` | Number | Estimated annual recurring revenue |
| `segment` | Select | Enterprise / Mid-Market / Startup / Developer |
| `expansionPotential` | Select | High / Medium / Low |
| `lastTouchpointDays` | Number | Days since last BD touchpoint |
| `assignedAe` | Relation | → Person |
| `icpNotes` | LongText | BD notes on ICP fit and expansion thesis |

---

## The AI Layer

### ICP Scoring Model

Range's ICP encoded as a first-class scoring rubric — not a tag, not a custom field, but a prompt-level specification that Claude applies to every lead:

| Tier | Score | Profile |
|------|-------|---------|
| **A** | 80–100 | Fintech on stablecoin rails (remittance, payroll, neobank, cross-border). Enterprise blockchain unit. AI agent platforms needing payment infra. |
| **B** | 50–79 | Gaming/NFT with wallet or payment needs. Mid-market fintech exploring crypto rails. Developer platforms needing tokenization. |
| **C** | 20–49 | Early-stage developer, unclear use case, no financial component. |
| **Disqualified** | 0–19 | Consumer app, no blockchain need, competitor. |

### MCP Server — 4 Tools

The MCP server runs over stdio transport and is registered with Claude Desktop. Every tool calls the Twenty API to read/write data and calls Claude for reasoning. Inputs are validated with Zod before any API call.

---

#### `qualify_lead`

Scores an inbound lead against Range's ICP and writes the result to Twenty.

**Input schema:**
```typescript
{
  companyName: string,
  industry: string,
  useCase: string,
  country?: string
}
```

**What Claude does:** Applies Range's ICP scoring rubric, assigns a 0–100 score and tier, generates a rationale and expansion flag analysis, and writes a personalized opening angle for the first outreach touch.

**Example output:**
```json
{
  "score": 92,
  "tier": "A",
  "rationale": "Remittance fintech on USD→BRL corridor — direct fit for Range's stablecoin payment rails. Financial services regulatory context signals enterprise-grade requirements.",
  "nextAction": "Book Demo",
  "expansionFlags": ["Agentic Payments fit", "Payroll expansion path"],
  "personalization": "Lead with the Ruvo case study — same corridor, same regulatory environment, live on Range rails."
}
```

**Demo:** `qualify this lead: Ana Lima, Head of Payments at Ruvo, building USD→BRL remittance in Brazil`

---

#### `get_account_health`

Fetches a structured health report for any account in Twenty.

**Input schema:**
```typescript
{ companyName: string }
```

**What Claude does:** Retrieves the Company record from Twenty, reads health metrics, and returns a structured summary with recommended action.

**Example output:** Health score 78, churn risk Low, ARR $240K, 1.2M API calls/month, 3 active wallets, expansion potential High — recommended action: schedule QBR and introduce payroll module.

**Demo:** `what is the health of the MoneyGram account`

---

#### `prep_meeting_brief`

Generates a five-section meeting brief by pulling the full account context from Twenty.

**Input schema:**
```typescript
{ companyName: string }
```

**What Claude does:** Pulls Company record, contacts, open opportunities, and recent activities from Twenty's REST API. Generates a structured brief across five sections.

**Sections:** Company Overview · Product Usage · Key Contacts · Talking Points · Risks & Opportunities

**Demo:** `prep me for the Wirex call at 3pm`

---

#### `draft_outreach`

Writes a personalized first-touch email, automatically selecting the most relevant Range case study by company segment.

**Input schema:**
```typescript
{
  companyName: string,
  angle?: string
}
```

**What Claude does:** Fetches company profile from Twenty (or infers from name), selects the case study with the highest narrative fit, and writes a cold email with a specific hook, value prop, and call to action.

**Case study routing:**

| Segment | Case Study |
|---------|-----------|
| Enterprise | MoneyGram — stablecoin orchestration at scale |
| Payroll | Toku — $1B+ payroll on stablecoin rails |
| Remittance | Ruvo — USD→BRL on Range |
| Neobank | Wirex — smart wallet infrastructure |
| Default | Cacao Finance — YC-backed fintech on Range rails |

**Demo:** `draft outreach to Western Union, angle: stablecoin orchestration at scale`

---

## The 3-Minute Demo

Three commands. Three pain points from the Head of BD, addressed directly.

**1. Inbound qualification bottleneck → `qualify_lead`**

```
qualify this lead: Ana Lima, Head of Payments at Ruvo, building USD→BRL remittance in Brazil
```

Expected: Score 90+, Tier A, rationale citing remittance corridor fit and Range's stablecoin rails, next action "Book Demo", personalization angle referencing the Ruvo case study. `InboundLead` record created in Twenty automatically. Total time: ~8 seconds.

**2. Zero outbound motion → `draft_outreach`**

```
draft outreach to Western Union, angle: stablecoin orchestration at scale
```

Expected: A cold email with a specific hook (MoneyGram case study as proof point), a value prop tailored to Western Union's scale and cross-border remittance infrastructure, and a low-friction CTA. Not a template — a specific email written for this company.

**3. Ops bottleneck → `get_account_health` + `prep_meeting_brief`**

```
what is the health of the MoneyGram account
prep me for the MoneyGram QBR
```

Expected: Structured health report with score, churn risk, ARR, API volume, and recommended action — then a full five-section meeting brief pulling live data from Twenty. Both in under 15 seconds combined.

---

## Automation Layer — n8n Workflows

Five workflows, all imported and active at `localhost:5678`. Workflows are in `n8n-workflows/` as importable JSON.

### Workflow 1: Inbound Qualification Pipeline

**Trigger:** Webhook POST (form submission)

**Flow:** Receive lead payload → normalize fields → Claude ICP scoring prompt → parse structured response → create `InboundLead` record in Twenty via REST API → post Slack notification to `#crm-inbound` with tier badge, score, rationale, company summary, and [Assign to AE] button.

**Claude involvement:** Full ICP scoring with structured JSON output.

**SLA:** Lead qualified within 90 seconds of form submission.

**Output:** Twenty record + Slack card with actionable routing.

![Workflow 1 — Inbound Qualification](https://github.com/user-attachments/assets/77d614ba-36e0-4f31-ae34-9ba815dc90e1)

---

### Workflow 2: Outbound Sequence Engine

**Trigger:** Cron, 8AM Monday–Friday

**Flow:** Apollo.io prospect search by ICP criteria → deduplicate against existing Twenty records → Hunter.io email verification → Claude personalized email generation → create `Company` + `Person` records in Twenty → Gmail API draft → Slack preview to `#crm-outbound` with [Send] / [Edit] / [Skip] actions.

**Claude involvement:** Email personalization using company profile, segment, and relevant case study.

**Output:** Gmail drafts queued for review + Slack preview thread.

![Workflow 2 — Outbound Sequence](https://github.com/user-attachments/assets/00722953-896d-4b58-a2e3-4e2581fe85a0)

---

### Workflow 3: Account Health Monitor

**Trigger:** Cron, every 6 hours

**Flow:** Read all `Company` records with health metrics from Twenty GraphQL → compute delta vs previous snapshot → update `healthScore`, `churnRisk`, `lastTouchpointDays` → evaluate thresholds:
- Health < 60 + no touchpoint in 14d → post to `#crm-health`, create follow-up task
- API calls +200% MoM → expansion signal, post to `#crm-signals`, queue upsell draft

**Claude involvement:** Threshold evaluation and action recommendation framing.

**Output:** Updated Twenty records + conditional Slack alerts.

![Workflow 3 — Account Health Monitor](https://github.com/user-attachments/assets/6996588a-b304-46d3-a7c0-a452383f1d50)

---

### Workflow 4: Deal Stage Automation

**Trigger:** Twenty webhook (`opportunity.stageUpdated`)

**Flow:**
- **Closed Won →** create Project record, post to `#crm-wins` with AE, ARR, product mix, update company segment
- **Closed Lost →** tag loss reason, create 90-day re-engagement task, log to Twenty
- **Demo Booked →** create meeting prep task assigned to AE, trigger meeting brief generation, set 24h reminder

**Claude involvement:** Loss reason categorization and follow-up message drafting.

**Output:** Automated downstream actions, zero manual data entry.

![Workflow 4 — Deal Stage Automation](https://github.com/user-attachments/assets/31042881-9f3a-4489-ba11-3330e120e2a9)

---

### Workflow 5: Weekly Revenue Digest

**Trigger:** Cron, Friday 5PM

**Flow:** Fetch open opportunities + closed deals (WTD) + new inbound leads + churn risk flags from Twenty GraphQL → pass full dataset to Claude → Claude generates executive narrative summary → post to `#crm-digest`.

**Claude involvement:** Executive summary generation — not a data dump, a narrative with signal vs noise framing.

**Output:** `#crm-digest` post with pipeline health, top risks, this week's wins, and Monday's priority actions.

![Workflow 5 — Weekly Digest](https://github.com/user-attachments/assets/cd96be6c-0fbc-4350-b834-a7fa00e3673b)

---

## Slack Integration

### Channels *(planned — next milestone)*

| Channel | Trigger | Content |
|---------|---------|---------|
| `#crm-inbound` | New `InboundLead` scored | Tier badge, score, company, rationale, [Assign] button |
| `#crm-signals` | ICP score > 80 OR health spike | Account, signal type, recommended action |
| `#crm-health` | Inactive 14d + health < 60 | Company, last touchpoint, health score, [Draft check-in] button |
| `#crm-wins` | Deal → Closed Won | AE, company, ARR, product mix |
| `#crm-digest` | Friday 5PM | AI-generated weekly pipeline + risk summary |

### Slash Commands *(planned — next milestone)*

| Command | What it does |
|---------|-------------|
| `/crm qualify [text]` | ICP scoring via MCP tool, score card posted in thread |
| `/crm brief [company]` | Meeting prep brief via MCP tool |
| `/crm pipeline` | Current pipeline snapshot from Twenty GraphQL |
| `/crm draft [company]` | Personalized outreach draft via MCP tool |
| `/crm health [company]` | Account health summary |
| `/crm who today` | Agent-ranked list of accounts to contact today |

---

## Tech Stack

| Tool | Version / Tier | Purpose |
|------|---------------|---------|
| **Railway** | Hobby | Cloud deployment target |
| **Docker Compose** | v2 | Local orchestration |
| **Twenty CRM** | v1.16 | Open-source CRM — system of record |
| **PostgreSQL** | 15 | Twenty + n8n database |
| **Redis** | 7 | Twenty queue / cache |
| **Next.js** | 16.x | BD Intelligence Dashboard frontend |
| **Tailwind CSS** | 4 | Dashboard styling |
| **n8n** | latest | Workflow automation engine |
| **Anthropic SDK** | ^0.37.0 | Claude API client (MCP server + n8n) |
| **MCP SDK** | ^1.8.0 | Model Context Protocol server |
| **Zod** | ^3.23.8 | Input validation for MCP tools |
| **Slack Bolt** | ^3.x | Slack bot framework *(planned)* |
| **Apollo.io** | API v1 | Prospect search and enrichment |
| **Hunter.io** | API v2 | Email verification |
| **Gmail API** | v1 | Outbound email drafts |

---

## Repository Structure

```
range-crm/
├── docker-compose.yml              # Full stack: Twenty, n8n, Postgres, Redis
├── init-db.sh                      # Postgres initialization
├── railway.toml                    # Railway deployment config
├── twenty-index.html               # Patched Twenty index (injects BD script)
├── twenty-inject.js                # BD Intelligence injection entrypoint
├── twenty-bd-intelligence.user.js  # Nav injection + iframe overlay logic
│
├── frontend/                       # BD Intelligence Dashboard (Next.js)
│   ├── app/
│   │   ├── layout.tsx              # Root layout (no sidebar — embedded in Twenty)
│   │   ├── page.tsx                # Revenue Dashboard
│   │   ├── leads/page.tsx          # Inbound Leads view
│   │   ├── pipeline/page.tsx       # Pipeline view
│   │   └── accounts/page.tsx       # Accounts view
│   ├── components/
│   │   └── Sidebar.tsx             # Sidebar component (removed from layout — Twenty handles nav)
│   └── lib/
│       └── twenty-api.ts           # Twenty REST + GraphQL client
│
├── schema/
│   ├── twenty-setup.ts             # GraphQL metadata API — creates all custom objects/fields
│   └── seed-mock-data.ts           # Seeds 20 mock accounts into Twenty
│
├── n8n-workflows/
│   ├── 01-inbound-qualification.json
│   ├── 02-outbound-sequence.json
│   ├── 03-account-health-monitor.json
│   ├── 04-deal-stage-automation.json
│   └── 05-weekly-digest.json
│
└── services/
    ├── mcp-server/
    │   └── src/index.ts            # 4 MCP tools: qualify, health, brief, draft
    └── slack-bot/
        └── package.json            # Planned — command structure documented
```

---

## Environment Variables

```bash
# ── Twenty CRM ────────────────────────────────────────────────────────────────
TWENTY_API_URL=http://localhost:3000
TWENTY_API_KEY=your_twenty_api_key
TWENTY_WORKSPACE_ID=your_workspace_id

# ── Anthropic ─────────────────────────────────────────────────────────────────
ANTHROPIC_API_KEY=your_anthropic_api_key
ANTHROPIC_MODEL=claude-sonnet-4-6

# ── Slack ─────────────────────────────────────────────────────────────────────
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_SIGNING_SECRET=your_signing_secret
SLACK_APP_TOKEN=xapp-your-app-token
SLACK_CHANNEL_INBOUND=#crm-inbound
SLACK_CHANNEL_SIGNALS=#crm-signals
SLACK_CHANNEL_HEALTH=#crm-health
SLACK_CHANNEL_WINS=#crm-wins
SLACK_CHANNEL_DIGEST=#crm-digest

# ── Enrichment ────────────────────────────────────────────────────────────────
APOLLO_API_KEY=your_apollo_api_key
HUNTER_API_KEY=your_hunter_api_key

# ── Gmail OAuth ───────────────────────────────────────────────────────────────
GMAIL_CLIENT_ID=your_gmail_client_id
GMAIL_CLIENT_SECRET=your_gmail_client_secret
GMAIL_REFRESH_TOKEN=your_gmail_refresh_token
```

---

## Setup & Deployment

### Local Development

```bash
# 1. Start infrastructure
docker compose up -d

# 2. Wait 60s for Twenty to initialize, then create schema
cd schema && npx ts-node twenty-setup.ts

# 3. Seed mock accounts
npx ts-node seed-mock-data.ts

# 4. Import n8n workflows
# Open localhost:5678 → Settings → Import workflow → select each JSON from /n8n-workflows/

# 5. Start BD Intelligence Dashboard
cd frontend && npm install && npm run dev

# 6. Build and register MCP server
cd services/mcp-server && npm install && npm run build
```

### MCP Server Registration

Add to `~/.claude/mcp_servers.json` (or register via Claude Desktop → Settings → MCP):

```json
{
  "mcpServers": {
    "range-crm": {
      "command": "node",
      "args": ["/path/to/range-crm/services/mcp-server/dist/index.js"],
      "env": {
        "TWENTY_API_URL": "http://localhost:3000",
        "TWENTY_API_KEY": "your_key",
        "ANTHROPIC_API_KEY": "your_key"
      }
    }
  }
}
```

### BD Intelligence Embed

The dashboard is embedded in Twenty's UI via `twenty-bd-intelligence.user.js`, injected into Twenty's Docker container at startup. After any container restart:

```bash
docker cp ~/range-crm/twenty-bd-intelligence.user.js range-crm-twenty-server-1:/app/bd-intelligence.js
```

The script injects a collapsible "BD Intelligence" nav group into Twenty's sidebar, renders the Next.js app in a fixed iframe overlay that matches Twenty's dark theme, and handles navigation between sub-pages without any visible context switch.

---

## About This Project

This was built as a portfolio asset to demonstrate GTM engineering depth and AI tooling proficiency directly to Range's BD team — not as a spec document, but as a working system. The goal was to build the exact tool Range needs, then show it during the application process itself. The three-minute demo above is designed to address the three specific pain points articulated by the Head of BD, using live data and live AI responses.

All Range account data in the system is mock data derived from publicly available information — Range's blog posts, press releases, partner announcements, and case studies (MoneyGram, Toku, Wirex, Cacao Finance, Ruvo). No proprietary data was used. The CRM backend is built on [Twenty](https://github.com/twentyhq/twenty) — a modern open-source CRM with a strong GraphQL metadata API, a clean data model, and active development — extended with Range-specific objects, AI tooling, and a purpose-built intelligence dashboard.

The architecture is deliberately over-engineered relative to immediate needs. The point isn't that Range should run this exact stack on day one — it's that the person building it understands the full surface of the problem: data modeling, AI integration, workflow automation, CRM extensibility, and operator experience. The SDR Manager role is a GTM leadership position. This is what GTM leadership looks like when it ships code.
