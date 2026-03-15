import type { AlicizationAuditLogInput, AlicizationKillSwitchSnapshot, AlicizationKillSwitchState } from '../../../shared/eventa'

let killSwitchSnapshot: AlicizationKillSwitchSnapshot = {
  state: 'ACTIVE',
  updatedAt: Date.now(),
}
const listeners = new Set<(snapshot: AlicizationKillSwitchSnapshot) => void>()
const cardKillSwitchSnapshots = new Map<string, AlicizationKillSwitchSnapshot>()
const cardListeners = new Set<(payload: { cardId: string, snapshot: AlicizationKillSwitchSnapshot }) => void>()
let auditLogger: ((input: AlicizationAuditLogInput) => Promise<void>) | undefined

export function getAlicizationKillSwitchSnapshot(): AlicizationKillSwitchSnapshot {
  return killSwitchSnapshot
}

export function isAlicizationKillSwitchSuspended() {
  return killSwitchSnapshot.state === 'SUSPENDED'
}

export function getAlicizationCardKillSwitchSnapshot(cardId: string): AlicizationKillSwitchSnapshot {
  const normalizedCardId = cardId.trim() || 'default'
  const known = cardKillSwitchSnapshots.get(normalizedCardId)
  if (known)
    return known

  const next: AlicizationKillSwitchSnapshot = {
    state: 'ACTIVE',
    updatedAt: Date.now(),
  }
  cardKillSwitchSnapshots.set(normalizedCardId, next)
  return next
}

export function isAlicizationCardKillSwitchSuspended(cardId: string) {
  return getAlicizationCardKillSwitchSnapshot(cardId).state === 'SUSPENDED'
}

export function setAlicizationKillSwitchState(state: AlicizationKillSwitchState, reason?: string): AlicizationKillSwitchSnapshot {
  killSwitchSnapshot = {
    state,
    reason,
    updatedAt: Date.now(),
  }
  for (const listener of listeners) {
    try {
      listener(killSwitchSnapshot)
    }
    catch {
      // NOTICE: Kill switch listeners must never break state updates.
    }
  }
  return killSwitchSnapshot
}

export function setAlicizationCardKillSwitchState(cardId: string, state: AlicizationKillSwitchState, reason?: string): AlicizationKillSwitchSnapshot {
  const normalizedCardId = cardId.trim() || 'default'
  const snapshot: AlicizationKillSwitchSnapshot = {
    state,
    reason,
    updatedAt: Date.now(),
  }
  cardKillSwitchSnapshots.set(normalizedCardId, snapshot)
  for (const listener of cardListeners) {
    try {
      listener({ cardId: normalizedCardId, snapshot })
    }
    catch {
      // NOTICE: Card-level kill switch listeners must never break state updates.
    }
  }
  return snapshot
}

export function onAlicizationKillSwitchChanged(listener: (snapshot: AlicizationKillSwitchSnapshot) => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function onAlicizationCardKillSwitchChanged(listener: (payload: { cardId: string, snapshot: AlicizationKillSwitchSnapshot }) => void) {
  cardListeners.add(listener)
  return () => {
    cardListeners.delete(listener)
  }
}

export function setAlicizationAuditLogger(logger?: (input: AlicizationAuditLogInput) => Promise<void>) {
  auditLogger = logger
}

export async function appendAlicizationRuntimeAuditLog(input: AlicizationAuditLogInput) {
  if (!auditLogger)
    return
  await auditLogger(input).catch(() => {})
}
