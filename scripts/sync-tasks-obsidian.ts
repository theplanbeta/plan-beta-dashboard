/**
 * Sync dashboard tasks to Obsidian vault as markdown files.
 *
 * Run: npx tsx scripts/sync-tasks-obsidian.ts
 *
 * Creates/updates:
 *   ~/Documents/Claude-Knowledge/projects/plan-beta-dashboard/tasks.md
 *
 * Safe to re-run — always overwrites with current state.
 */

import { PrismaClient } from "@prisma/client"
import fs from "fs"
import path from "path"

const prisma = new PrismaClient()

const VAULT_PATH = path.join(
  process.env.HOME || "/Users/deepak",
  "Documents/Claude-Knowledge/projects/plan-beta-dashboard"
)

const PRIORITY_ICONS: Record<string, string> = {
  URGENT: "🔴",
  HIGH: "🟠",
  MEDIUM: "🔵",
  LOW: "⚪",
}

const STATUS_ICONS: Record<string, string> = {
  TODO: "⬜",
  IN_PROGRESS: "🔄",
  DONE: "✅",
}

function formatDate(d: Date | null): string {
  if (!d) return ""
  return d.toISOString().slice(0, 10)
}

async function main() {
  console.log("=== Syncing Tasks to Obsidian ===\n")

  const items = await prisma.actionItem.findMany({
    orderBy: [{ status: "asc" }, { priority: "desc" }, { createdAt: "desc" }],
    include: {
      createdBy: { select: { name: true } },
      assignedTo: { select: { name: true } },
    },
  })

  const todo = items.filter(i => i.status === "TODO")
  const inProgress = items.filter(i => i.status === "IN_PROGRESS")
  const done = items.filter(i => i.status === "DONE")

  // Group by category
  const byCategory: Record<string, typeof items> = {}
  for (const item of items.filter(i => i.status !== "DONE")) {
    const cat = item.category || "General"
    if (!byCategory[cat]) byCategory[cat] = []
    byCategory[cat].push(item)
  }

  const lines: string[] = []

  lines.push("---")
  lines.push("title: Plan Beta — Tasks")
  lines.push(`updated: ${new Date().toISOString().slice(0, 16)}`)
  lines.push(`total: ${items.length} (${todo.length} todo, ${inProgress.length} in progress, ${done.length} done)`)
  lines.push("---")
  lines.push("")
  lines.push("# Tasks")
  lines.push("")
  lines.push(`> Auto-synced from [Dashboard](https://planbeta.app/dashboard/action-items) on ${formatDate(new Date())}`)
  lines.push("")

  // In Progress section
  if (inProgress.length > 0) {
    lines.push("## 🔄 In Progress")
    lines.push("")
    for (const item of inProgress) {
      lines.push(renderTask(item))
    }
    lines.push("")
  }

  // To Do by category
  if (todo.length > 0) {
    lines.push("## ⬜ To Do")
    lines.push("")

    for (const [category, catItems] of Object.entries(byCategory)) {
      const catTodo = catItems.filter(i => i.status === "TODO")
      if (catTodo.length === 0) continue
      lines.push(`### ${category}`)
      lines.push("")
      for (const item of catTodo) {
        lines.push(renderTask(item))
      }
      lines.push("")
    }
  }

  // Done (last 10)
  if (done.length > 0) {
    lines.push("## ✅ Completed")
    lines.push("")
    for (const item of done.slice(0, 10)) {
      lines.push(renderTask(item))
    }
    if (done.length > 10) {
      lines.push(`- ... and ${done.length - 10} more completed tasks`)
    }
    lines.push("")
  }

  const content = lines.join("\n")

  // Ensure directory exists
  if (!fs.existsSync(VAULT_PATH)) {
    fs.mkdirSync(VAULT_PATH, { recursive: true })
  }

  const filePath = path.join(VAULT_PATH, "tasks.md")
  fs.writeFileSync(filePath, content, "utf-8")

  console.log(`Written ${items.length} tasks to:`)
  console.log(`  ${filePath}`)
  console.log(`\n  ${todo.length} todo, ${inProgress.length} in progress, ${done.length} done`)
}

function renderTask(item: {
  title: string
  priority: string
  status: string
  category: string
  source: string
  dueDate: Date | null
  completedAt: Date | null
  description: string | null
  assignedTo: { name: string } | null
}): string {
  const check = item.status === "DONE" ? "x" : " "
  const priority = PRIORITY_ICONS[item.priority] || "⚪"
  const parts = [`- [${check}] ${priority} **${item.title}**`]

  const meta: string[] = []
  if (item.source !== "Manual") meta.push(`via ${item.source}`)
  if (item.assignedTo) meta.push(`→ ${item.assignedTo.name}`)
  if (item.dueDate) meta.push(`due ${formatDate(item.dueDate)}`)
  if (item.completedAt) meta.push(`done ${formatDate(item.completedAt)}`)

  if (meta.length > 0) {
    parts.push(` _(${meta.join(" · ")})_`)
  }

  let result = parts.join("")

  // Add description as indented sub-text (first 150 chars)
  if (item.description && item.status !== "DONE") {
    const desc = item.description.split("\n")[0].slice(0, 150)
    result += `\n  ${desc}`
  }

  return result
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
