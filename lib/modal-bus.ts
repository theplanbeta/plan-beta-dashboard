// Cross-component coordination so site-wide modals don't fight each other.
// One modal at a time. Priorities are coarse — cookie consent always wins,
// because legally it has to render before tracking.

export type ModalOwner =
  | "cookie-consent"
  | "push-prompt"
  | "exit-intent"
  | "chatbot"

const PRIORITY: Record<ModalOwner, number> = {
  "cookie-consent": 100,
  "chatbot": 50, // user-initiated, treat as high priority once open
  "push-prompt": 20,
  "exit-intent": 10,
}

let currentOwner: ModalOwner | null = null
const listeners = new Set<(o: ModalOwner | null) => void>()

export function acquireModal(owner: ModalOwner): boolean {
  if (currentOwner === null) {
    currentOwner = owner
    emit()
    return true
  }
  // Higher priority owner can preempt
  if (PRIORITY[owner] > PRIORITY[currentOwner]) {
    currentOwner = owner
    emit()
    return true
  }
  return false
}

export function releaseModal(owner: ModalOwner) {
  if (currentOwner === owner) {
    currentOwner = null
    emit()
  }
}

export function getCurrentOwner(): ModalOwner | null {
  return currentOwner
}

export function subscribe(fn: (o: ModalOwner | null) => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

function emit() {
  for (const fn of listeners) {
    try {
      fn(currentOwner)
    } catch {
      /* listener errors must never break other listeners */
    }
  }
}
