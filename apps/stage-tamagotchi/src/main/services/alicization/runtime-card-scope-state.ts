import type { AlicizationKillSwitchSnapshot } from '../../../shared/eventa'

interface CreateAlicizationRuntimeCardScopeStateOptions {
  now: () => number
  userDataPath: string
  activeCardIdRef: () => string
  normalizeCardId: (raw: unknown) => string
  getMetaValue: (key: string) => Promise<string | undefined>
  setMetaValue: (key: string, value: string) => Promise<void>
  getLatestConversationSessionId: () => Promise<string | undefined>
  appendAuditLog: (input: {
    level: 'notice'
    category: string
    action: string
    message: string
    payload: Record<string, unknown>
  }, cardId?: string) => Promise<void>
  getAlicizationKillSwitchSnapshot: () => AlicizationKillSwitchSnapshot
  getAlicizationCardKillSwitchSnapshot: (cardId: string) => AlicizationKillSwitchSnapshot
  setAlicizationCardKillSwitchState: (cardId: string, state: 'ACTIVE' | 'SUSPENDED', reason?: string) => AlicizationKillSwitchSnapshot
  activeSessionIdByCard: Map<string, string>
  subconsciousStateByCard: Map<string, unknown>
  proactiveLoopStateByCard: Map<string, unknown>
  visualPresenceStateByCard: Map<string, unknown>
  readdir: typeof import('node:fs/promises').readdir
  activeSessionMetaKey: string
  scopedKillSwitchMetaKey: string
}

export function createAlicizationRuntimeCardScopeState(options: CreateAlicizationRuntimeCardScopeStateOptions) {
  function normalizeSessionId(raw: unknown) {
    if (typeof raw !== 'string')
      return ''
    return raw.trim()
  }

  function getScopedKillSwitchSnapshot(cardId = options.activeCardIdRef()) {
    const globalSnapshot = options.getAlicizationKillSwitchSnapshot()
    const cardSnapshot = options.getAlicizationCardKillSwitchSnapshot(cardId)
    if (globalSnapshot.state === 'SUSPENDED') {
      return {
        state: 'SUSPENDED' as const,
        reason: globalSnapshot.reason ?? cardSnapshot.reason ?? 'global',
        updatedAt: Math.max(globalSnapshot.updatedAt, cardSnapshot.updatedAt),
      }
    }
    return cardSnapshot
  }

  async function persistScopedKillSwitch(cardId: string, state: 'ACTIVE' | 'SUSPENDED', reason?: string) {
    const snapshot = options.setAlicizationCardKillSwitchState(cardId, state, reason)
    await options.setMetaValue(options.scopedKillSwitchMetaKey, JSON.stringify(snapshot)).catch(() => {})
    return snapshot
  }

  async function persistActiveSessionId(cardId: string, sessionId: string) {
    const normalizedCardId = options.normalizeCardId(cardId)
    const normalizedSessionId = normalizeSessionId(sessionId)
    if (!normalizedSessionId)
      return

    options.activeSessionIdByCard.set(normalizedCardId, normalizedSessionId)
    await options.setMetaValue(options.activeSessionMetaKey, normalizedSessionId).catch(() => {})
  }

  async function restoreActiveSessionId(cardId: string) {
    const normalizedCardId = options.normalizeCardId(cardId)
    const rawFromMeta = await options.getMetaValue(options.activeSessionMetaKey).catch(() => undefined)
    const fromMeta = normalizeSessionId(rawFromMeta)
    if (fromMeta) {
      options.activeSessionIdByCard.set(normalizedCardId, fromMeta)
      return fromMeta
    }

    const latestFromTurns = normalizeSessionId(await options.getLatestConversationSessionId().catch(() => undefined))
    if (latestFromTurns) {
      options.activeSessionIdByCard.set(normalizedCardId, latestFromTurns)
      await options.setMetaValue(options.activeSessionMetaKey, latestFromTurns).catch(() => {})
      return latestFromTurns
    }

    return ''
  }

  async function ensureActiveOrLatestSessionId(cardId: string) {
    const normalizedCardId = options.normalizeCardId(cardId)
    const fromMemory = normalizeSessionId(options.activeSessionIdByCard.get(normalizedCardId))
    if (fromMemory)
      return fromMemory

    const restored = normalizeSessionId(await restoreActiveSessionId(normalizedCardId))
    if (restored)
      return restored

    const fallback = `session:auto:${normalizedCardId}:${options.now()}`
    await persistActiveSessionId(normalizedCardId, fallback)
    await options.appendAuditLog({
      level: 'notice',
      category: 'alicization.session',
      action: 'auto-created',
      message: 'Auto-created fallback conversation session for card scope.',
      payload: {
        sessionId: fallback,
      },
    }, normalizedCardId)
    return fallback
  }

  async function listKnownCardIds() {
    const cardsRoot = `${options.userDataPath}/alicizations/cards`
    const ids = new Set<string>([
      ...options.subconsciousStateByCard.keys(),
      ...options.activeSessionIdByCard.keys(),
      ...options.proactiveLoopStateByCard.keys(),
      ...options.visualPresenceStateByCard.keys(),
      options.normalizeCardId(options.activeCardIdRef()),
    ])
    try {
      const entries = await options.readdir(cardsRoot, { withFileTypes: true })
      for (const entry of entries) {
        if (entry.isDirectory())
          ids.add(options.normalizeCardId(entry.name))
      }
    }
    catch {
      // ignore
    }
    return [...ids]
  }

  async function restoreScopedKillSwitch(cardId: string) {
    const raw = await options.getMetaValue(options.scopedKillSwitchMetaKey).catch(() => undefined)
    if (!raw) {
      options.setAlicizationCardKillSwitchState(cardId, 'ACTIVE', 'bootstrap')
      return
    }

    try {
      const parsed = JSON.parse(raw) as { state?: unknown, reason?: unknown, updatedAt?: unknown }
      const state = parsed.state === 'SUSPENDED' ? 'SUSPENDED' : 'ACTIVE'
      const reason = typeof parsed.reason === 'string' ? parsed.reason : undefined
      const snapshot = options.setAlicizationCardKillSwitchState(cardId, state, reason)
      if (typeof parsed.updatedAt === 'number' && Number.isFinite(parsed.updatedAt))
        snapshot.updatedAt = parsed.updatedAt
    }
    catch {
      options.setAlicizationCardKillSwitchState(cardId, 'ACTIVE', 'bootstrap')
    }
  }

  return {
    normalizeSessionId,
    getScopedKillSwitchSnapshot,
    persistScopedKillSwitch,
    persistActiveSessionId,
    restoreActiveSessionId,
    ensureActiveOrLatestSessionId,
    listKnownCardIds,
    restoreScopedKillSwitch,
  }
}

export type AlicizationRuntimeCardScopeState = ReturnType<typeof createAlicizationRuntimeCardScopeState>
