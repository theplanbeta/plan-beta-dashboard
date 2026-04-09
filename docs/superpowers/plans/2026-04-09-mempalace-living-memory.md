# MemPalace Living Memory System — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Install MemPalace as a persistent AI memory system for the Plan Beta project, mine all existing conversations, set up auto-save hooks, persist CFO chat conversations, and sync DB data into the palace daily.

**Architecture:** MemPalace runs locally as an MCP server connected to Claude Code, storing memories in ChromaDB (vector embeddings) + SQLite (knowledge graph) at `.mempalace/palace/`. Auto-save hooks capture context on Stop and PreCompact events. A daily cron syncs WhatsApp messages, action items, content ideas, lead notes, audit logs, and CFO conversations from Postgres into the palace.

**Tech Stack:** Python 3.11+ (MemPalace), ChromaDB, SQLite, Claude Code MCP, TypeScript (sync script), Prisma (CFO persistence)

**Spec:** `docs/superpowers/specs/2026-04-09-mempalace-living-memory-design.md`

---

## File Map

### New Files
| File | Responsibility |
|------|---------------|
| `~/.mempalace/identity.txt` | L0 identity context loaded every session |
| `.claude/hooks/mempal_save_hook.sh` | Stop hook — saves memories every 15 messages |
| `.claude/hooks/mempal_precompact_hook.sh` | PreCompact hook — saves all context before compression |
| `scripts/sync-to-mempalace.ts` | Daily cron: syncs Prisma models into MemPalace drawers |
| `app/api/cfo/conversations/route.ts` | GET: list CFO conversations for current user |
| `app/api/cfo/conversations/[id]/route.ts` | GET: load specific CFO conversation |

### Modified Files
| File | Change |
|------|--------|
| `.claude/settings.local.json` | Add hooks config alongside existing permissions |
| `.gitignore` | Add `.mempalace/` |
| `prisma/schema.prisma` | Add `CfoConversation` model, add relation to `User` |
| `app/api/cfo/chat/route.ts` | Add conversation persistence (create/update on each message) |
| `app/dashboard/cfo/page.tsx` | Add conversation sidebar, load/save, auto-persist |

---

## Task 1: Install MemPalace and Register MCP Server

**Files:**
- Create: `~/.mempalace/identity.txt`

- [ ] **Step 1: Check Python version**

Run: `python3 --version`
Expected: `Python 3.11.x` or higher. If lower, install Python 3.11+ via `brew install python@3.12`.

- [ ] **Step 2: Install MemPalace**

Run: `pip install mempalace`
Expected: Successful install with ChromaDB and dependencies.

- [ ] **Step 3: Initialize MemPalace**

Run: `mempalace init /Users/deepak/plan-beta-dashboard/.mempalace --yes`
Expected: Creates `.mempalace/` directory with palace subdirectory.

- [ ] **Step 4: Create identity file**

Write `~/.mempalace/identity.txt`:
```
Project: Plan Beta Dashboard
Owner: Deepak
Role: Founder of Plan Beta, a German language school for Indian students
Tech: Next.js 15, PostgreSQL (Neon), Prisma, Tailwind, Vercel
Domain: theplanbeta.com (marketing), planbeta.app (dashboard)
Key rule: Always use prisma db push (NOT migrate dev — migration history is out of sync)
Key rule: Currency must store eurEquivalent for non-EUR payments
Key rule: Instagram Graph API token has never been generated — root blocker for IG data
Key rule: enrolledCount on Batch is stale — always recalculate from relations
Key rule: Contact form must use /api/leads/public not /api/leads (latter requires auth)
Key rule: Student email empty string must be converted to null before insert
Key rule: useSearchParams() must be wrapped in Suspense for prerendered pages
```

- [ ] **Step 5: Register MCP server with Claude Code**

Run:
```bash
claude mcp add mempalace -- python3 -m mempalace.mcp_server \
  --palace /Users/deepak/plan-beta-dashboard/.mempalace/palace
```
Expected: MCP server registered. Verify with `claude mcp list` — should show `mempalace`.

- [ ] **Step 6: Verify MCP server works**

Start a new Claude Code session and run `mempalace_status`. Expected: returns L0 identity text and empty L1 (no drawers yet).

- [ ] **Step 7: Commit identity file**

```bash
git add -f ~/.mempalace/identity.txt  # force-add since .mempalace may be gitignored globally
```

Note: identity.txt lives in home dir, not in repo — no git commit needed for this file. Just verify it exists.

---

## Task 2: Set Up Auto-Save Hooks

**Files:**
- Create: `.claude/hooks/mempal_save_hook.sh`
- Create: `.claude/hooks/mempal_precompact_hook.sh`
- Modify: `.claude/settings.local.json`

- [ ] **Step 1: Create hooks directory**

Run: `mkdir -p /Users/deepak/plan-beta-dashboard/.claude/hooks`

- [ ] **Step 2: Copy Stop hook from MemPalace repo**

Run:
```bash
# Clone repo temporarily if not already present
gh repo clone milla-jovovich/mempalace /tmp/mempalace 2>/dev/null || true

# Copy hooks
cp /tmp/mempalace/hooks/mempal_save_hook.sh /Users/deepak/plan-beta-dashboard/.claude/hooks/
cp /tmp/mempalace/hooks/mempal_precompact_hook.sh /Users/deepak/plan-beta-dashboard/.claude/hooks/
```

- [ ] **Step 3: Make hooks executable**

Run:
```bash
chmod +x /Users/deepak/plan-beta-dashboard/.claude/hooks/mempal_save_hook.sh
chmod +x /Users/deepak/plan-beta-dashboard/.claude/hooks/mempal_precompact_hook.sh
```

- [ ] **Step 4: Configure MEMPAL_DIR in save hook**

Edit `.claude/hooks/mempal_save_hook.sh` — find the `MEMPAL_DIR=""` line near the top and set it:
```bash
MEMPAL_DIR="/Users/deepak/plan-beta-dashboard/.mempalace"
```

This makes the hook automatically run `mempalace mine` on the project directory after saving.

- [ ] **Step 5: Register hooks in settings.local.json**

Read the current `.claude/settings.local.json`, then add a `hooks` key alongside the existing `permissions` key:

```json
{
  "permissions": {
    ... existing permissions unchanged ...
  },
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

- [ ] **Step 6: Add .mempalace/ to .gitignore**

Append to `/Users/deepak/plan-beta-dashboard/.gitignore`:
```
# MemPalace local memory (contains conversation history)
.mempalace/
```

- [ ] **Step 7: Commit hooks and gitignore**

```bash
git add .claude/hooks/mempal_save_hook.sh .claude/hooks/mempal_precompact_hook.sh .gitignore
git commit -m "Add MemPalace auto-save hooks and gitignore entry"
```

---

## Task 3: Backfill Existing Conversations

**Files:** None (operational task)

- [ ] **Step 1: Mine all Claude Code session transcripts**

Run:
```bash
mempalace mine ~/.claude/projects/-Users-deepak-plan-beta-dashboard/ \
  --mode convos \
  --wing wing_engineering \
  --extract general
```

Expected: Processes 6 JSONL files (~25MB) and 15 session directories. Outputs count of drawers created.

- [ ] **Step 2: Verify backfill**

Run:
```bash
mempalace search "instagram graph api token" --results 3
```

Expected: Returns relevant exchanges from past conversations about Instagram API attempts.

- [ ] **Step 3: Verify wing structure**

Run:
```bash
mempalace status
```

Expected: Shows palace with drawers populated, L1 summary generated from top-scored memories.

- [ ] **Step 4: Test wake-up payload**

Run:
```bash
mempalace wake-up
```

Expected: Returns L0 (identity) + L1 (auto-generated essential story from mined conversations). Should be ~600-900 tokens. Verify it mentions key project facts.

- [ ] **Step 5: Seed knowledge graph with known facts**

Run these commands to establish temporal facts:
```bash
# Via MCP or a small Python script that calls the KG API
python3 -c "
from mempalace.mcp_server import palace  # or use CLI
# These will be added via MCP tools in a Claude Code session
"
```

In a Claude Code session with MemPalace MCP connected, call:
```
mempalace_kg_add(subject="Instagram Graph API", predicate="status", object="NOT_WORKING — token auth flow never completed", valid_from="2026-01-01")
mempalace_kg_add(subject="Kimi Claw Instagram Scraping", predicate="outcome", object="FAILED — pushed fabricated data", valid_from="2026-02-15")
mempalace_kg_add(subject="WhatsApp Business API", predicate="number_type", object="TEST — needs production migration", valid_from="2026-03-01")
mempalace_kg_add(subject="TRIBE v2", predicate="evaluation_status", object="EXPLORING — CC-BY-NC license blocks commercial use", valid_from="2026-04-09")
mempalace_kg_add(subject="Prisma Migrations", predicate="status", object="OUT_OF_SYNC — always use db push not migrate dev", valid_from="2025-01-01")
mempalace_kg_add(subject="MemPalace", predicate="status", object="INSTALLED — Phase A active", valid_from="2026-04-09")
```

- [ ] **Step 6: Verify knowledge graph**

Call `mempalace_kg_timeline()` — should return chronological list of all seeded facts.

---

## Task 4: Add CfoConversation Model to Prisma

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add CfoConversation model to schema**

Add at the end of `prisma/schema.prisma`:

```prisma
model CfoConversation {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  title     String?
  messages  Json     // [{role: "user"|"assistant", content: string, timestamp: string}]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([userId])
}
```

- [ ] **Step 2: Add relation to User model**

Find the User model in `prisma/schema.prisma` and add after the last relation field (after `assignedActionItems`):

```prisma
  cfoConversations CfoConversation[]
```

- [ ] **Step 3: Push schema changes**

Run: `npx prisma db push`
Expected: Schema updated successfully. No data loss warnings (this is a new model).

- [ ] **Step 4: Verify with Prisma Studio**

Run: `npx prisma studio`
Expected: `CfoConversation` table appears in the UI with zero rows.

- [ ] **Step 5: Commit schema change**

```bash
git add prisma/schema.prisma
git commit -m "Add CfoConversation model for persisting CFO chat history"
```

---

## Task 5: Add Conversation Persistence to CFO Chat API

**Files:**
- Modify: `app/api/cfo/chat/route.ts`

- [ ] **Step 1: Read current CFO chat route**

Read `app/api/cfo/chat/route.ts` to understand the current implementation. Key facts:
- Accepts `POST { messages: ChatMessage[] }`
- Calls `getCfoContext()` which queries 10 Prisma tables
- Injects live data into last user message
- Returns `{ reply, usage }`
- Auth: `checkPermission("insights", "read")`

- [ ] **Step 2: Add conversation persistence to POST handler**

Modify the POST handler in `app/api/cfo/chat/route.ts`. After the existing auth check, add `conversationId` parsing from the request body. After getting the reply from Claude, upsert the conversation:

Add to the request body type:
```typescript
const { messages, conversationId } = await request.json() as {
  messages: { role: "user" | "assistant"; content: string }[]
  conversationId?: string
}
```

After the Claude response is received and `reply` is extracted, add persistence logic before the return:

```typescript
// Persist conversation
const allMessages = [
  ...messages,
  { role: "assistant" as const, content: reply, timestamp: new Date().toISOString() }
]

// Add timestamps to existing messages if missing
const timestampedMessages = allMessages.map((m, i) => ({
  ...m,
  timestamp: (m as any).timestamp || new Date(Date.now() - (allMessages.length - i) * 1000).toISOString()
}))

let savedConversationId = conversationId

if (conversationId) {
  // Update existing conversation
  await prisma.cfoConversation.update({
    where: { id: conversationId },
    data: {
      messages: timestampedMessages as any,
      updatedAt: new Date()
    }
  })
} else {
  // Create new conversation
  const firstUserMessage = messages.find(m => m.role === "user")
  const title = firstUserMessage
    ? firstUserMessage.content.slice(0, 100) + (firstUserMessage.content.length > 100 ? "..." : "")
    : "CFO Chat"

  const conversation = await prisma.cfoConversation.create({
    data: {
      userId: check.session.user.id,
      title,
      messages: timestampedMessages as any,
    }
  })
  savedConversationId = conversation.id
}
```

Update the return to include `conversationId`:
```typescript
return NextResponse.json({ reply, usage: { inputTokens, outputTokens }, conversationId: savedConversationId })
```

- [ ] **Step 3: Test conversation creation**

Run the dev server and test with curl:
```bash
curl -s -X POST http://localhost:3000/api/cfo/chat \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=<YOUR_TOKEN>" \
  -d '{"messages": [{"role": "user", "content": "What is our current revenue?"}]}'
```

Expected: Response includes `conversationId` field. Check Prisma Studio — new row in `CfoConversation`.

- [ ] **Step 4: Test conversation continuation**

Use the `conversationId` from Step 3:
```bash
curl -s -X POST http://localhost:3000/api/cfo/chat \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=<YOUR_TOKEN>" \
  -d '{"messages": [{"role": "user", "content": "What is our current revenue?"}, {"role": "assistant", "content": "..."}, {"role": "user", "content": "Break it down by batch"}], "conversationId": "<ID_FROM_STEP_3>"}'
```

Expected: Same `conversationId` returned. Prisma Studio shows updated messages array.

- [ ] **Step 5: Commit**

```bash
git add app/api/cfo/chat/route.ts
git commit -m "Persist CFO chat conversations to database"
```

---

## Task 6: Add Conversation List/Load API Routes

**Files:**
- Create: `app/api/cfo/conversations/route.ts`
- Create: `app/api/cfo/conversations/[id]/route.ts`

- [ ] **Step 1: Create conversation list endpoint**

Write `app/api/cfo/conversations/route.ts`:

```typescript
import { NextResponse } from "next/server"
import { checkPermission } from "@/lib/api-permissions"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const check = await checkPermission("insights", "read")
  if (!check.authorized) return check.response

  const conversations = await prisma.cfoConversation.findMany({
    where: { userId: check.session.user.id },
    select: {
      id: true,
      title: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: "desc" },
    take: 50,
  })

  return NextResponse.json(conversations)
}
```

- [ ] **Step 2: Create conversation load endpoint**

Write `app/api/cfo/conversations/[id]/route.ts`:

```typescript
import { NextResponse } from "next/server"
import { checkPermission } from "@/lib/api-permissions"
import { prisma } from "@/lib/prisma"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const check = await checkPermission("insights", "read")
  if (!check.authorized) return check.response

  const { id } = await params

  const conversation = await prisma.cfoConversation.findFirst({
    where: { id, userId: check.session.user.id },
  })

  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 })
  }

  return NextResponse.json(conversation)
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const check = await checkPermission("insights", "read")
  if (!check.authorized) return check.response

  const { id } = await params

  await prisma.cfoConversation.deleteMany({
    where: { id, userId: check.session.user.id },
  })

  return NextResponse.json({ success: true })
}
```

- [ ] **Step 3: Test list endpoint**

```bash
curl -s http://localhost:3000/api/cfo/conversations \
  -H "Cookie: next-auth.session-token=<YOUR_TOKEN>"
```

Expected: JSON array of conversations with id, title, createdAt, updatedAt.

- [ ] **Step 4: Test load endpoint**

```bash
curl -s http://localhost:3000/api/cfo/conversations/<CONVERSATION_ID> \
  -H "Cookie: next-auth.session-token=<YOUR_TOKEN>"
```

Expected: Full conversation object including messages array.

- [ ] **Step 5: Commit**

```bash
git add app/api/cfo/conversations/route.ts app/api/cfo/conversations/\[id\]/route.ts
git commit -m "Add CFO conversation list and load API routes"
```

---

## Task 7: Update CFO Dashboard with Conversation Sidebar

**Files:**
- Modify: `app/dashboard/cfo/page.tsx`

- [ ] **Step 1: Read current CFO page**

Read `app/dashboard/cfo/page.tsx` fully. Key facts:
- Messages in React state: `useState<Message[]>([])`
- `clearChat` sets messages to `[]`
- Full message array sent to API on each send
- Has "Save as action item" feature per assistant message

- [ ] **Step 2: Add conversation state and sidebar**

Add these state variables alongside existing ones:

```typescript
const [conversationId, setConversationId] = useState<string | null>(null)
const [conversations, setConversations] = useState<Array<{
  id: string
  title: string | null
  createdAt: string
  updatedAt: string
}>>([])
const [sidebarOpen, setSidebarOpen] = useState(true)
```

Add a `useEffect` to load conversation list on mount:

```typescript
useEffect(() => {
  fetch("/api/cfo/conversations")
    .then(res => res.json())
    .then(data => {
      if (Array.isArray(data)) setConversations(data)
    })
    .catch(() => {})
}, [])
```

- [ ] **Step 3: Update sendMessage to include conversationId**

Find the fetch call to `/api/cfo/chat` in the existing `sendMessage` function. Modify the request body to include `conversationId`:

```typescript
const res = await fetch("/api/cfo/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ messages: updatedMessages, conversationId }),
})
```

After parsing the response, extract and save the conversationId:

```typescript
const data = await res.json()
if (data.conversationId && !conversationId) {
  setConversationId(data.conversationId)
  // Refresh conversation list
  fetch("/api/cfo/conversations")
    .then(r => r.json())
    .then(d => { if (Array.isArray(d)) setConversations(d) })
}
```

- [ ] **Step 4: Add loadConversation and newConversation functions**

```typescript
const loadConversation = async (id: string) => {
  const res = await fetch(`/api/cfo/conversations/${id}`)
  if (!res.ok) return
  const data = await res.json()
  setMessages(data.messages || [])
  setConversationId(id)
}

const newConversation = () => {
  setMessages([])
  setConversationId(null)
}

const deleteConversation = async (id: string) => {
  await fetch(`/api/cfo/conversations/${id}`, { method: "DELETE" })
  setConversations(prev => prev.filter(c => c.id !== id))
  if (conversationId === id) newConversation()
}
```

- [ ] **Step 5: Add sidebar UI**

Add a sidebar panel to the left of the existing chat area. Wrap the existing chat UI in a flex container:

```tsx
<div className="flex h-full">
  {/* Sidebar */}
  <div className={`${sidebarOpen ? 'w-64' : 'w-0'} flex-shrink-0 border-r border-gray-200 dark:border-gray-700 overflow-hidden transition-all`}>
    <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Conversations</h3>
      <button
        onClick={newConversation}
        className="text-xs px-2 py-1 bg-purple-600 text-white rounded hover:bg-purple-700"
      >
        + New
      </button>
    </div>
    <div className="overflow-y-auto h-full pb-20">
      {conversations.map(conv => (
        <div
          key={conv.id}
          onClick={() => loadConversation(conv.id)}
          className={`p-3 cursor-pointer border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-800 ${
            conversationId === conv.id ? 'bg-purple-50 dark:bg-purple-900/20' : ''
          }`}
        >
          <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
            {conv.title || "Untitled"}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {new Date(conv.updatedAt).toLocaleDateString()}
          </div>
        </div>
      ))}
      {conversations.length === 0 && (
        <p className="text-xs text-gray-400 dark:text-gray-500 p-3">No conversations yet</p>
      )}
    </div>
  </div>

  {/* Existing chat area — move all existing chat JSX here */}
  <div className="flex-1 flex flex-col">
    {/* Toggle sidebar button */}
    <button
      onClick={() => setSidebarOpen(!sidebarOpen)}
      className="absolute top-4 left-4 z-10 p-1 text-gray-400 hover:text-gray-600"
      title={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
    >
      {sidebarOpen ? "«" : "»"}
    </button>
    
    {/* ... existing chat messages and input ... */}
  </div>
</div>
```

- [ ] **Step 6: Update clearChat to use newConversation**

Replace the existing `clearChat` function call with `newConversation`. Find the clear/reset button in the UI and wire it to `newConversation` instead.

- [ ] **Step 7: Test in browser**

Run: `npm run dev`
Open: `http://localhost:3000/dashboard/cfo`

Verify:
1. Sidebar shows on the left with past conversations
2. "New" button starts a fresh conversation
3. Sending a message creates a conversation (appears in sidebar)
4. Clicking a past conversation loads its messages
5. Refreshing the page preserves the conversation list
6. Clicking a conversation and continuing it updates the same record

- [ ] **Step 8: Commit**

```bash
git add app/dashboard/cfo/page.tsx
git commit -m "Add conversation sidebar and persistence to CFO chat"
```

---

## Task 8: Create DB-to-Palace Sync Script

**Files:**
- Create: `scripts/sync-to-mempalace.ts`

- [ ] **Step 1: Create the sync script**

Write `scripts/sync-to-mempalace.ts`:

```typescript
import { prisma } from "../lib/prisma"
import { execSync } from "child_process"
import { readFileSync, writeFileSync, existsSync } from "fs"

const PALACE_PATH = "/Users/deepak/plan-beta-dashboard/.mempalace/palace"
const STATE_FILE = "/Users/deepak/plan-beta-dashboard/.mempalace/sync-state.json"

// Load last sync timestamp
function getLastSync(): Date {
  if (!existsSync(STATE_FILE)) return new Date(0)
  const state = JSON.parse(readFileSync(STATE_FILE, "utf-8"))
  return new Date(state.lastSyncedAt || 0)
}

function saveLastSync() {
  writeFileSync(STATE_FILE, JSON.stringify({ lastSyncedAt: new Date().toISOString() }))
}

// Add a drawer via MemPalace Python API
function addDrawer(wing: string, room: string, content: string) {
  // Write content to a temp file to avoid shell escaping issues
  const tmpFile = `/tmp/mempalace-sync-${Date.now()}.txt`
  writeFileSync(tmpFile, content)
  try {
    execSync(
      `python3 -c "
import json, sys
from pathlib import Path
from mempalace.layers import MemoryStack
stack = MemoryStack('${PALACE_PATH}')
content = Path('${tmpFile}').read_text()
stack.palace.add_drawer('${wing}', '${room}', content)
"`,
      { timeout: 10000, stdio: "pipe" }
    )
  } catch (e) {
    console.error(`Failed to add drawer to ${wing}/${room}:`, (e as Error).message)
  } finally {
    try { require("fs").unlinkSync(tmpFile) } catch {}
  }
}

async function syncWhatsAppMessages(since: Date) {
  const messages = await prisma.whatsAppMessage.findMany({
    where: { createdAt: { gt: since } },
    orderBy: { createdAt: "asc" },
    take: 200,
  })
  console.log(`WhatsApp messages to sync: ${messages.length}`)

  for (const msg of messages) {
    const direction = msg.direction === "INBOUND" ? "FROM" : "TO"
    const content = [
      `[WhatsApp ${direction} ${msg.phoneNumber}] ${new Date(msg.createdAt).toISOString()}`,
      msg.templateName ? `Template: ${msg.templateName}` : "",
      `Status: ${msg.status}`,
      msg.messageText || "(no text)",
    ].filter(Boolean).join("\n")

    addDrawer("wing_team", "whatsapp-comms", content)
  }
}

async function syncActionItems(since: Date) {
  const items = await prisma.actionItem.findMany({
    where: { updatedAt: { gt: since } },
    orderBy: { updatedAt: "asc" },
    take: 100,
  })
  console.log(`Action items to sync: ${items.length}`)

  for (const item of items) {
    const content = [
      `[Action Item] ${item.title}`,
      `Status: ${item.status} | Priority: ${item.priority}`,
      `Source: ${item.source || "manual"}`,
      item.description || "",
    ].filter(Boolean).join("\n")

    addDrawer("wing_decisions", "action-items", content)
  }
}

async function syncContentIdeas(since: Date) {
  const ideas = await prisma.contentIdea.findMany({
    where: { updatedAt: { gt: since } },
    orderBy: { updatedAt: "asc" },
    take: 100,
  })
  console.log(`Content ideas to sync: ${ideas.length}`)

  for (const idea of ideas) {
    const content = [
      `[Content Idea] ${idea.topic || "Untitled"}`,
      `Status: ${idea.status}`,
      idea.hook ? `Hook: ${idea.hook}` : "",
      idea.script ? `Script: ${idea.script}` : "",
      idea.caption ? `Caption: ${idea.caption}` : "",
      idea.hashtags ? `Hashtags: ${idea.hashtags}` : "",
      idea.notes ? `Notes: ${idea.notes}` : "",
    ].filter(Boolean).join("\n")

    addDrawer("wing_marketing", "content-ideas", content)
  }
}

async function syncLeadNotes(since: Date) {
  const leads = await prisma.lead.findMany({
    where: {
      updatedAt: { gt: since },
      OR: [
        { notes: { not: null } },
        { followUpNotes: { not: null } },
      ],
    },
    select: {
      id: true,
      name: true,
      source: true,
      status: true,
      notes: true,
      followUpNotes: true,
    },
    take: 100,
  })
  console.log(`Lead notes to sync: ${leads.length}`)

  for (const lead of leads) {
    if (!lead.notes && !lead.followUpNotes) continue
    const content = [
      `[Lead] ${lead.name} (${lead.source} / ${lead.status})`,
      lead.notes ? `Notes: ${lead.notes}` : "",
      lead.followUpNotes ? `Follow-up: ${lead.followUpNotes}` : "",
    ].filter(Boolean).join("\n")

    addDrawer("wing_marketing", "leads", content)
  }
}

async function syncAuditLogs(since: Date) {
  const logs = await prisma.auditLog.findMany({
    where: {
      createdAt: { gt: since },
      severity: "HIGH",
    },
    orderBy: { createdAt: "asc" },
    take: 50,
  })
  console.log(`High-severity audit logs to sync: ${logs.length}`)

  for (const log of logs) {
    const content = [
      `[Audit ${log.severity}] ${log.action} — ${new Date(log.createdAt).toISOString()}`,
      `User: ${log.userEmail || "system"}`,
      log.description || "",
      log.errorMessage ? `Error: ${log.errorMessage}` : "",
    ].filter(Boolean).join("\n")

    addDrawer("wing_debugging", "error-patterns", content)
  }
}

async function syncCfoConversations(since: Date) {
  const convos = await prisma.cfoConversation.findMany({
    where: { updatedAt: { gt: since } },
    orderBy: { updatedAt: "asc" },
    take: 20,
  })
  console.log(`CFO conversations to sync: ${convos.length}`)

  for (const convo of convos) {
    const messages = convo.messages as Array<{ role: string; content: string }>
    const summary = messages
      .map(m => `${m.role === "user" ? "Q" : "A"}: ${m.content.slice(0, 200)}`)
      .join("\n")

    const content = [
      `[CFO Chat] ${convo.title || "Untitled"} — ${new Date(convo.updatedAt).toISOString()}`,
      summary,
    ].join("\n")

    addDrawer("wing_decisions", "cfo-insights", content)
  }
}

async function main() {
  const since = getLastSync()
  console.log(`Syncing records since: ${since.toISOString()}`)

  await syncWhatsAppMessages(since)
  await syncActionItems(since)
  await syncContentIdeas(since)
  await syncLeadNotes(since)
  await syncAuditLogs(since)
  await syncCfoConversations(since)

  saveLastSync()
  console.log("Sync complete.")
  await prisma.$disconnect()
}

main().catch(e => {
  console.error("Sync failed:", e)
  prisma.$disconnect()
  process.exit(1)
})
```

- [ ] **Step 2: Test the sync script**

Run: `npx tsx scripts/sync-to-mempalace.ts`

Expected: Outputs counts per model (e.g., "WhatsApp messages to sync: 47"). No errors. Creates `.mempalace/sync-state.json` with current timestamp.

- [ ] **Step 3: Verify synced data in palace**

Run: `mempalace search "whatsapp" --wing wing_team --results 3`

Expected: Returns WhatsApp message drawers from the sync.

- [ ] **Step 4: Run sync again to verify idempotency**

Run: `npx tsx scripts/sync-to-mempalace.ts`

Expected: All counts should be 0 (nothing new since last sync).

- [ ] **Step 5: Commit**

```bash
git add scripts/sync-to-mempalace.ts
git commit -m "Add DB-to-MemPalace sync script for daily palace ingestion"
```

---

## Task 9: Set Up Local Cron for Daily Sync

**Files:** None (system configuration)

- [ ] **Step 1: Add crontab entry**

Run: `crontab -e`

Add this line:
```
0 0 * * * cd /Users/deepak/plan-beta-dashboard && /usr/local/bin/npx tsx scripts/sync-to-mempalace.ts >> .mempalace/sync.log 2>&1
```

This runs the sync daily at midnight, logging output to `.mempalace/sync.log`.

- [ ] **Step 2: Verify crontab**

Run: `crontab -l`

Expected: Shows the sync entry alongside any existing cron jobs.

- [ ] **Step 3: Test manually one more time**

Run: `npx tsx scripts/sync-to-mempalace.ts`

Expected: Clean run, zero or few new records synced.

---

## Task 10: End-to-End Verification

**Files:** None (verification task)

- [ ] **Step 1: Start a new Claude Code session**

Close current session and start a new one in the plan-beta-dashboard directory.

Expected: MemPalace MCP tools available. `mempalace_status` returns L0+L1 payload with project identity and auto-generated essential story.

- [ ] **Step 2: Test semantic search**

Ask Claude: "What happened when we tried to set up the Instagram Graph API?"

Expected: Claude calls `mempalace_search("instagram graph api")` and returns specific past conversation context — no circular exploration needed.

- [ ] **Step 3: Test knowledge graph**

Ask Claude: "What's the current status of all our external integrations?"

Expected: Claude calls `mempalace_kg_timeline()` and returns temporal facts about Instagram API, WhatsApp, TRIBE v2, etc.

- [ ] **Step 4: Test auto-save hook**

Have a conversation of 15+ messages. After the 15th message, the Stop hook should trigger and prompt Claude to save important topics to the palace.

Expected: Hook blocks, Claude saves drawers, conversation continues.

- [ ] **Step 5: Test CFO conversation persistence**

Open `http://localhost:3000/dashboard/cfo`:
1. Start a new conversation, send a message
2. Verify it appears in the sidebar
3. Refresh the page — conversation should persist
4. Click the conversation — messages should reload
5. Continue the conversation — same conversation ID

- [ ] **Step 6: Verify full pipeline**

Run the sync script: `npx tsx scripts/sync-to-mempalace.ts`
Then search for the CFO conversation: `mempalace search "revenue" --wing wing_decisions`

Expected: The CFO conversation you just had appears in the search results.

- [ ] **Step 7: Final commit — update CLAUDE.md**

Add a note to `CLAUDE.md` under a new section:

```markdown
### MemPalace Integration
- MemPalace MCP server provides persistent project memory across sessions
- Auto-save hooks capture context on Stop (every 15 messages) and PreCompact events
- Daily cron syncs WhatsApp, action items, content ideas, leads, audit logs, CFO chats
- Search past decisions: `mempalace_search("query")` via MCP
- Knowledge graph: `mempalace_kg_query("entity")` for temporal facts
- Palace storage: `.mempalace/palace/` (gitignored, local only)
```

```bash
git add CLAUDE.md
git commit -m "Document MemPalace integration in CLAUDE.md"
```

---

## Summary

| Task | What | Files | Effort |
|------|------|-------|--------|
| 1 | Install MemPalace + MCP server | identity.txt | 10 min |
| 2 | Auto-save hooks | 2 shell scripts + settings.json | 10 min |
| 3 | Backfill conversations + seed KG | operational | 15 min |
| 4 | CfoConversation Prisma model | schema.prisma | 5 min |
| 5 | CFO chat persistence API | cfo/chat/route.ts | 20 min |
| 6 | Conversation list/load routes | 2 new route files | 15 min |
| 7 | CFO dashboard sidebar | cfo/page.tsx | 30 min |
| 8 | DB-to-palace sync script | sync-to-mempalace.ts | 25 min |
| 9 | Local cron setup | crontab | 5 min |
| 10 | End-to-end verification | CLAUDE.md | 15 min |

**Total estimated effort: ~2.5 hours**
