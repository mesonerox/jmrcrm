# Range CRM — MCP Server

An [MCP (Model Context Protocol)](https://modelcontextprotocol.io) server that exposes Range CRM intelligence tools to Claude and other AI agents.

## Tools

| Tool | Description |
|---|---|
| `qualify_lead` | Score an inbound lead against Range's ICP. Returns tier, score, rationale, next action. |
| `get_account_health` | Fetch live health metrics for a company from Twenty CRM. |
| `prep_meeting_brief` | Generate a structured meeting brief with contacts, product usage, and talking points. |
| `draft_outreach` | Draft a personalized first-touch email with segment-matched case studies. |

## Setup

### 1. Install dependencies

```bash
cd services/mcp-server
npm install
```

### 2. Configure environment variables

Create a `.env` file (for local dev with `ts-node`):

```env
ANTHROPIC_API_KEY=sk-ant-...
TWENTY_API_URL=http://localhost:3000
TWENTY_API_KEY=<your Twenty API key>
```

In production (Claude Desktop or other MCP clients), set env vars in the client config instead.

### 3. Run in development

```bash
npm run dev
```

### 4. Build for production

```bash
npm run build
npm start
```

## Connecting to Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "range-crm": {
      "command": "node",
      "args": ["/absolute/path/to/services/mcp-server/dist/index.js"],
      "env": {
        "ANTHROPIC_API_KEY": "sk-ant-...",
        "TWENTY_API_URL": "http://localhost:3000",
        "TWENTY_API_KEY": "your-twenty-api-key"
      }
    }
  }
}
```

Or with `ts-node` during development:

```json
{
  "mcpServers": {
    "range-crm": {
      "command": "npx",
      "args": ["ts-node", "/absolute/path/to/services/mcp-server/src/index.ts"],
      "env": {
        "ANTHROPIC_API_KEY": "sk-ant-...",
        "TWENTY_API_URL": "http://localhost:3000",
        "TWENTY_API_KEY": "your-twenty-api-key"
      }
    }
  }
}
```

## Example prompts (after connecting)

```
Qualify this lead: Finova, a payroll fintech in Mexico building on USDC rails for contractor payments

Get account health for Toku

Prep a meeting brief for MoneyGram

Draft outreach for Western Union with angle: agentic payments
```

## Architecture

```
src/
└── index.ts        # MCP server — 4 tools, stdio transport
```

All tools read `TWENTY_API_URL`, `TWENTY_API_KEY`, and `ANTHROPIC_API_KEY` lazily at call time (no module-level validation), so the server starts without throwing even if env vars aren't set yet.
