import type { AlicizationKillSwitchSnapshot } from '../../../shared/eventa'

import { alicizationPrimaryConversationSessionId } from '@proj-alicization/stage-shared'

interface CreateAlicizationRuntimeCardScopeStateOptions {
  now: () => number
  userDataPath: string
  activeCardIdRef: () => string
  normalizeCardId: (raw: unknown) => string
  getMetaValue: (key: string) => Promise<string | undefined>
  setMetaValue: (key: string, value: string) => Promise<void>
  getLatestConversationSessionId: () => Promise<string | undefined>
  migrateLegacyConversationSessionsToPrimary?: (input: {
    cardId: string
    dryRun?: boolean
  }) => Promise<{
    primarySessionId: string
    sourceSessionIds: string[]
    changed: boolean
    migratedRows: Record<string, number>
    conflictRows: Record<string, number>
    deadLetterRows?: Record<string, number>
  }>
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
    void sessionId
    const normalizedSessionId = alicizationPrimaryConversationSessionId(normalizedCardId)

    options.activeSessionIdByCard.set(normalizedCardId, normalizedSessionId)
    await options.setMetaValue(options.activeSessionMetaKey, normalizedSessionId).catch(() => {})
  }

  async function restoreActiveSessionId(cardId: string) {
    const normalizedCardId = options.normalizeCardId(cardId)
    const primarySessionId = alicizationPrimaryConversationSessionId(normalizedCardId)
    const migration = await options.migrateLegacyConversationSessionsToPrimary?.({
      cardId: normalizedCardId,
      dryRun: false,
    }).catch((error) => {
      void options.appendAuditLog({
        level: 'notice',
        category: 'alicization.session',
        action: 'migration-failed',
        message: 'Legacy conversation session migration failed before canonical restore.',
        payload: {
          cardId: normalizedCardId,
          sessionId: primarySessionId,
          error: error instanceof Error ? error.message : String(error),
        },
      }, normalizedCardId).catch(() => {})
      return null
    })
    if (migration?.changed) {
      await options.appendAuditLog({
        level: 'notice',
        category: 'alicization.session',
        action: 'migrated-to-primary',
        message: 'Migrated legacy conversation continuity into the canonical primary session.',
        payload: {
          cardId: normalizedCardId,
          sessionId: primarySessionId,
          sourceSessionIds: migration.sourceSessionIds,
          migratedRows: migration.migratedRows,
          conflictRows: migration.conflictRows,
          deadLetterRows: migration.deadLetterRows ?? {},
        },
      }, normalizedCardId).catch(() => {})
    }
    const rawFromMeta = normalizeSessionId(await options.getMetaValue(options.activeSessionMetaKey).catch(() => undefined))
    const latestFromTurns = normalizeSessionId(await options.getLatestConversationSessionId().catch(() => undefined))
    options.activeSessionIdByCard.set(normalizedCardId, primarySessionId)
    if (rawFromMeta !== primarySessionId || (latestFromTurns && latestFromTurns !== primarySessionId))
      await options.setMetaValue(options.activeSessionMetaKey, primarySessionId).catch(() => {})
    return primarySessionId
  }

  async function ensureActiveOrLatestSessionId(cardId: string) {
    const normalizedCardId = options.normalizeCardId(cardId)
    const primarySessionId = alicizationPrimaryConversationSessionId(normalizedCardId)
    const fromMemory = normalizeSessionId(options.activeSessionIdByCard.get(normalizedCardId))
    if (fromMemory !== primarySessionId) {
      await persistActiveSessionId(normalizedCardId, primarySessionId)
      await options.appendAuditLog({
        level: 'notice',
        category: 'alicization.session',
        action: 'canonicalized',
        message: 'Canonicalized the production conversation session for card scope.',
        payload: {
          previousSessionId: fromMemory || null,
          sessionId: primarySessionId,
        },
      }, normalizedCardId)
    }
    return primarySessionId
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
