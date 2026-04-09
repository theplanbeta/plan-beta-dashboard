# MemPalace Living Memory System — Design Spec

**Date:** 2026-04-09
**Status:** Approved
**Scope:** Phase A (Claude Code integration) → Phase B (Dashboard team memory)

## Problem

Every new Claude Code session starts with amnesia. MEMORY.md captures manually curated highlights, but misses:

- Why specific approaches failed (Instagram Graph API, Kimi Claw scraping)
- Debugging sessions and their root causes
- Dead ends explored so they're not repeated
- Marketing team's WhatsApp conversations, content ideas, and action items
- Strategic discussions from the CFO chat agent (currently lost on page reload)

The result: circular problem-solving, repeated exploration, lost institutional knowledge.

## Solution

Install MemPalace (milla-jovovich/mempalace) as a local-first AI memory system integrated with Claude Code via MCP server. Mine all existing conversation history and sync ongoing data from the Postgres database. Every future session starts warm with auto-curated context and can search the full project history on demand.

## Phase A — Claude Code Integration

### Architecture

```
Claude Code Session
  │
  ├── MCP Server: mempalace (19 tools)
  │     ├── mempalace_status (wake-up: L0+L1 payload)
  │     ├── mempalace_search (semantic retrieval)
  │     ├── mempalace_add_drawer (store new memories)
  │     ├── mempalace_kg_query/add/invalidate (knowledge graph)
  │     └── ... (14 more tools)
  │
  ├── Auto-Save Hooks
  │     ├── Stop hook (every 15 messages → save topics/decisions)
  │     └── PreCompact hook (before compression → save everything)
  │
  └── Palace Storage: /Users/deepak/plan-beta-dashboard/.mempalace/palace/
        ├── ChromaDB (vector embeddings)
        └── knowledge_graph.sqlite3 (temporal triples)
```

### Prerequisites

- Python 3.11+
- `pip install mempalace`

### Installation Steps

1. Install MemPalace: `pip install mempalace`

2. Register MCP server with Claude Code:
   ```bash
   claude mcp add mempalace -- python -m mempalace.mcp_server \
     --palace /Users/deepak/plan-beta-dashboard/.mempalace/palace
   ```

3. Create identity file at `~/.mempalace/identity.txt`:
   ```
   Project: Plan Beta Dashboard
   Owner: Deepak
   Role: Founder of Plan Beta, a German language school for Indian students
   Tech: Next.js 15, PostgreSQL (Neon), Prisma, Tailwind, Vercel
   Key rule: Always use prisma db push (NOT migrate dev)
   Key rule: Currency must store eurEquivalent for non-EUR payments
   Key rule: Instagram Graph API token has never been generated — this is the root blocker
   Key rule: enrolledCount on Batch is stale — always recalculate from relations
   Key rule: Contact form must use /api/leads/public not /api/leads
   ```

4. Copy MemPalace hooks to project:
   ```
   .claude/hooks/mempal_save_hook.sh      (Stop hook)
   .claude/hooks/mempal_precompact_hook.sh (PreCompact hook)
   ```

5. Add hooks to existing `.claude/settings.local.json` (merge with existing `permissions` config):
   ```json
   {
     "permissions": { ... existing permissions ... },
     "hooks": {
       "Stop": [{
         "command": "bash /Users/deepak/plan-beta-dashboard/.claude/hooks/mempal_save_hook.sh"
       }],
       "PreCompact": [{
         "command": "bash /Users/deepak/plan-beta-dashboard/.claude/hooks/mempal_precompact_hook.sh"
       }]
     }
   }
   ```

6. Add `.mempalace/` to `.gitignore`

### Wing/Room Structure

```
wing_engineering
  ├── auth              (NextAuth, roles, permissions, tokens)
  ├── payments          (Razorpay, Stripe, currency handling)
  ├── instagram-api     (Graph API attempts, token issues, Kimi Claw)
  ├── whatsapp          (Business API, templates, webhooks)
  ├── jobs-portal       (scraper, subscriptions, alerts)
  ├── cron              (scheduled tasks, timeouts, failures)
  ├── prisma            (schema changes, migration pitfalls)
  ├── security          (CSP, SSRF, audit findings)
  └── deployment        (Vercel, domains, env vars)

wing_marketing
  ├── leads             (lead notes, follow-ups, conversion context)
  ├── content-ideas     (hooks, scripts, captions from Content Lab)
  ├── instagram         (post ideas, engagement patterns)
  ├── meta-ads          (campaign context, ad spend notes)
  ├── utm-tracking      (link performance, attribution)
  └── referrals         (referral program decisions)

wing_decisions
  ├── architecture      (tech choices, pattern decisions)
  ├── pricing           (course pricing, currency, discounts)
  ├── tooling           (vendor/library choices: Resend, Neon, etc.)
  ├── what-failed       (approaches tried and abandoned, with reasons)
  └── cfo-insights      (strategic discussions from CFO agent)

wing_debugging
  ├── failures          (production incidents, error patterns)
  ├── workarounds       (temporary fixes, known issues)
  ├── dead-ends         (approaches that didn't work, why)
  └── error-patterns    (recurring issues, common mistakes)

wing_team
  ├── whatsapp-comms    (student/lead conversations)
  ├── action-items      (captured tasks, decisions)
  └── meeting-notes     (if manually added)
```

### Initial Backfill

Mine all existing Claude Code conversation history:

```bash
mempalace mine ~/.claude/projects/-Users-deepak-plan-beta-dashboard/ --mode convos
```

This processes:
- 6 JSONL transcript files (~25MB total)
- 15 session directories
- 4,190 lines of prompt history

MemPalace's convo_miner natively reads Claude Code JSONL format. It chunks conversations into exchange pairs, auto-classifies by topic, and stores as drawers with wing/room metadata.

### Conversation Flow

**Session start:**
Claude Code calls `mempalace_status` → returns L0 (identity, ~100 tokens) + L1 (auto-generated essential story from top-scored drawers, ~700 tokens). This replaces cold starts with warm context.

**During conversation (on-demand retrieval):**

| Pattern | Tool Call | Example |
|---------|-----------|---------|
| "We've done this before" | `mempalace_search(query)` | "instagram graph api token" → returns past debug sessions |
| "What did we decide?" | `mempalace_kg_query(entity)` | "Instagram Graph API" → temporal status facts |
| "Find similar problems" | `mempalace_search(query)` | "token expired refresh" → analogous solved issues |
| "Feature history" | `mempalace_kg_timeline(entity)` | "jobs portal" → chronological evolution |
| "Cross-domain connections" | `mempalace_find_tunnels(room)` | "instagram" → eng blocked + marketing waiting |

**Auto-save (Stop hook, every 15 messages):**
Claude identifies important new information and calls `mempalace_add_drawer` for:
- Decisions made (approach chosen, rationale)
- Bugs found (root cause, fix)
- New patterns discovered
- Dead ends explored (so they're not repeated)

**Before context compression (PreCompact hook):**
Forces a full save of all important context about to be evicted. Amnesia prevention.

### Coexistence with Current Memory System

MemPalace does NOT replace MEMORY.md and existing memory files:

| System | Role | Scope |
|--------|------|-------|
| MEMORY.md + memory files | Manually curated highlights, committed to repo, loaded every session via system prompt | Essentials only |
| MemPalace | Comprehensive auto-curated archive, local-only, searchable on demand | Everything |

MEMORY.md remains the "highlights reel." MemPalace is the "full footage."

## DB-to-Palace Sync

### Script: `scripts/sync-to-mempalace.ts`

A TypeScript script that queries Prisma models and pushes new/updated records to MemPalace as drawers. Communicates with MemPalace via its CLI (`mempalace add-drawer --wing X --room Y --content "..."`) spawned as a child process, since the palace runs locally on the same machine.

**Data sources synced:**

| Prisma Model | Wing | Room | What Gets Stored |
|---|---|---|---|
| `WhatsAppMessage` (inbound) | wing_team | whatsapp-comms | Student/lead messages with phone, template, status |
| `WhatsAppMessage` (outbound) | wing_team | whatsapp-comms | Sent messages, delivery status |
| `ActionItem` | wing_decisions | action-items | Title, description, source, priority, status |
| `ContentIdea` | wing_marketing | content-ideas | Hook, script, caption, hashtags, topic, notes |
| `Lead` (notes fields) | wing_marketing | leads | Name + notes + followUpNotes + source + status |
| `AuditLog` (HIGH severity) | wing_debugging | error-patterns | Failed actions, error details, metadata |
| `CfoConversation` (new) | wing_decisions | cfo-insights | Full CFO chat transcripts |

**Dedup:** Each drawer gets a deterministic ID: `{model}:{recordId}:{updatedAt}`. Uses `mempalace_check_duplicate` before inserting. Tracks `lastSyncedAt` in `.mempalace/sync-state.json`.

**Schedule:** Local crontab, daily at midnight:
```bash
0 0 * * * cd /Users/deepak/plan-beta-dashboard && npx tsx scripts/sync-to-mempalace.ts
```

### Knowledge Graph Entries

The sync script also writes temporal triples for key facts:

```
(Instagram Graph API, status, NOT_WORKING, valid_from: 2026-01-01)
(Kimi Claw Instagram, outcome, PUSHED_FAKE_DATA, valid_from: 2026-02-15)
(WhatsApp API, number_type, TEST, valid_from: 2026-03-01)
(TRIBE v2, evaluation_status, EXPLORING, valid_from: 2026-04-09)
```

When facts change, call `mempalace_kg_invalidate` to set `valid_to` date — preserving history while marking current state.

## CFO Chat Persistence Fix

### Problem
CFO agent conversations (`/dashboard/cfo`) exist only in React state. They vanish on page reload — losing strategic discussions about pricing, growth, IPO planning.

### Schema Addition

```prisma
model CfoConversation {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  title     String?
  messages  Json     // [{role, content, timestamp}]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([userId])
}
```

### API Changes

- `POST /api/cfo/chat` — accept optional `conversationId` param. If provided, append to existing conversation. If not, create new one. Auto-generate title from first user message.
- `GET /api/cfo/conversations` — list past conversations for current user, ordered by updatedAt desc
- `GET /api/cfo/conversations/[id]` — load specific conversation

### Dashboard Changes

- Left sidebar in CFO page listing past conversations
- "New conversation" button
- Auto-save on every assistant response (no manual action needed)
- Conversations synced to MemPalace daily via the DB sync script

## Phase B — Dashboard Team Memory (Future)

> Not designed in detail yet. High-level direction only.

After Phase A is stable and the palace has accumulated sufficient data:

- New dashboard page: `/dashboard/team-memory`
- Accessible to FOUNDER and MARKETING roles
- Search interface: natural language queries across the palace
- Knowledge graph visualization: timeline of how features/campaigns evolved
- Decision log: searchable history of why things were done a certain way
- Powered by MemPalace's MCP tools called from a Next.js API route

Phase B design will be a separate spec once Phase A is validated.

## Future: Content Evaluation System (Separate Spec)

The original conversation explored using MemPalace + TRIBE v2 + Claude for marketing content evaluation. That system depends on:

1. Instagram Graph API working (Phase 0 blocker)
2. MemPalace populated with content performance data (Phase A prerequisite)
3. TRIBE v2 correlation validation (R&D experiment)

A separate design spec will be created for the content evaluation system once Phase A of this spec is complete and the Instagram API blocker is resolved.

## Files Created/Modified

### New Files
- `.claude/hooks/mempal_save_hook.sh` — Stop hook for auto-saving
- `.claude/hooks/mempal_precompact_hook.sh` — PreCompact hook for compression safety
- `scripts/sync-to-mempalace.ts` — DB-to-palace sync script
- `~/.mempalace/identity.txt` — L0 identity context
- `app/api/cfo/conversations/route.ts` — List CFO conversations
- `app/api/cfo/conversations/[id]/route.ts` — Get specific CFO conversation

### Modified Files
- `.claude/settings.local.json` — Add hook registrations
- `.gitignore` — Add `.mempalace/`
- `prisma/schema.prisma` — Add `CfoConversation` model
- `app/api/cfo/chat/route.ts` — Add conversation persistence
- `app/dashboard/cfo/page.tsx` — Add conversation sidebar, auto-save

### No New Infrastructure
- MemPalace runs locally (ChromaDB + SQLite, no server needed)
- MCP server is a local Python process started by Claude Code
- DB sync runs via local crontab
- No cloud services, no API keys, no subscriptions

## Success Criteria

### Phase A
- [ ] Every new Claude Code session starts with L0+L1 context automatically
- [ ] `mempalace_search("instagram graph api")` returns relevant past conversations
- [ ] Stop hook triggers save every 15 messages without disrupting workflow
- [ ] PreCompact hook saves context before compression
- [ ] DB sync runs daily without errors
- [ ] CFO conversations persist across page reloads
- [ ] No circular problem-solving on previously explored topics

### Phase B (future)
- [ ] Marketing team can search past decisions from dashboard
- [ ] Knowledge graph timeline renders in browser
- [ ] Team memory page loads in <2 seconds
