import { describe, expect, it, vi } from 'vitest'

import { createAlicizationRuntimeCardScopeState } from './runtime-card-scope-state'

describe('runtime card scope state', () => {
  it('canonicalizes active session ids instead of restoring a legacy production session', async () => {
    const meta = new Map<string, string>()
    const activeSessionIdByCard = new Map<string, string>()
    const appendAuditLog = vi.fn(async () => {})
    const runtime = createAlicizationRuntimeCardScopeState({
      now: () => 10_000,
      userDataPath: '/tmp/runtime-card-scope',
      activeCardIdRef: () => 'default',
      normalizeCardId: raw => String(raw ?? '').trim() || 'default',
      getMetaValue: async key => meta.get(key),
      setMetaValue: async (key, value) => {
        meta.set(key, value)
      },
      getLatestConversationSessionId: async () => undefined,
      appendAuditLog,
      getAlicizationKillSwitchSnapshot: () => ({ state: 'ACTIVE', reason: 'global', updatedAt: 1 }),
      getAlicizationCardKillSwitchSnapshot: () => ({ state: 'ACTIVE', reason: 'card', updatedAt: 2 }),
      setAlicizationCardKillSwitchState: (_cardId, state, reason) => ({ state, reason, updatedAt: 3 }),
      activeSessionIdByCard,
      subconsciousStateByCard: new Map(),
      proactiveLoopStateByCard: new Map(),
      visualPresenceStateByCard: new Map(),
      readdir: async () => [],
      activeSessionMetaKey: 'active_session_id_v1',
      scopedKillSwitchMetaKey: 'kill_switch_state_v1',
    })

    const first = await runtime.ensureActiveOrLatestSessionId('card-a')
    expect(first).toBe('session:primary:card-a')
    expect(activeSessionIdByCard.get('card-a')).toBe(first)
    expect(appendAuditLog).toHaveBeenCalled()

    meta.set('active_session_id_v1', 'session-from-meta')
    const second = await runtime.restoreActiveSessionId('card-b')
    expect(second).toBe('session:primary:card-b')
    expect(activeSessionIdByCard.get('card-b')).toBe('session:primary:card-b')
    expect(meta.get('active_session_id_v1')).toBe('session:primary:card-b')
  })

  it('stops canonical session persistence when the preparation signal aborts', async () => {
    const parentController = new AbortController()
    let resolveMetaWrite!: () => void
    const setMetaValue = vi.fn(async () => {
      await new Promise<void>((resolve) => {
        resolveMetaWrite = resolve
      })
    })
    const runtime = createAlicizationRuntimeCardScopeState({
      now: () => 10_000,
      userDataPath: '/tmp/runtime-card-scope',
      activeCardIdRef: () => 'default',
      normalizeCardId: raw => String(raw ?? '').trim() || 'default',
      getMetaValue: async () => undefined,
      setMetaValue,
      getLatestConversationSessionId: async () => undefined,
      appendAuditLog: vi.fn(async () => {}),
      getAlicizationKillSwitchSnapshot: () => ({ state: 'ACTIVE', reason: 'global', updatedAt: 1 }),
      getAlicizationCardKillSwitchSnapshot: () => ({ state: 'ACTIVE', reason: 'card', updatedAt: 2 }),
      setAlicizationCardKillSwitchState: (_cardId, state, reason) => ({ state, reason, updatedAt: 3 }),
      activeSessionIdByCard: new Map(),
      subconsciousStateByCard: new Map(),
      proactiveLoopStateByCard: new Map(),
      visualPresenceStateByCard: new Map(),
      readdir: async () => [],
      activeSessionMetaKey: 'active_session_id_v1',
      scopedKillSwitchMetaKey: 'kill_switch_state_v1',
    })
    const opening = runtime.ensureActiveOrLatestSessionId('card-a', {
      signal: parentController.signal,
    })
    const timeoutReason = new DOMException('chat-preparation-timeout', 'AbortError')

    parentController.abort(timeoutReason)
    resolveMetaWrite?.()

    await expect(opening).rejects.toBe(timeoutReason)
    expect(setMetaValue).toHaveBeenCalledWith(
      'active_session_id_v1',
      'session:primary:card-a',
      { signal: parentController.signal },
    )
  })

  it('does not publish a canonical session in memory when persistence fails', async () => {
    const activeSessionIdByCard = new Map<string, string>()
    const persistenceFailure = new Error('sqlite session meta write failed')
    const runtime = createAlicizationRuntimeCardScopeState({
      now: () => 10_000,
      userDataPath: '/tmp/runtime-card-scope',
      activeCardIdRef: () => 'default',
      normalizeCardId: raw => String(raw ?? '').trim() || 'default',
      getMetaValue: async () => undefined,
      setMetaValue: async () => {
        throw persistenceFailure
      },
      getLatestConversationSessionId: async () => undefined,
      appendAuditLog: vi.fn(async () => {}),
      getAlicizationKillSwitchSnapshot: () => ({ state: 'ACTIVE', reason: 'global', updatedAt: 1 }),
      getAlicizationCardKillSwitchSnapshot: () => ({ state: 'ACTIVE', reason: 'card', updatedAt: 2 }),
      setAlicizationCardKillSwitchState: (_cardId, state, reason) => ({ state, reason, updatedAt: 3 }),
      activeSessionIdByCard,
      subconsciousStateByCard: new Map(),
      proactiveLoopStateByCard: new Map(),
      visualPresenceStateByCard: new Map(),
      readdir: async () => [],
      activeSessionMetaKey: 'active_session_id_v1',
      scopedKillSwitchMetaKey: 'kill_switch_state_v1',
    })

    await expect(runtime.ensureActiveOrLatestSessionId('card-a')).rejects.toBe(persistenceFailure)
    expect(activeSessionIdByCard.has('card-a')).toBe(false)
  })

  it('does not let session canonicalization audit block successful preparation', async () => {
    const appendAuditLog = vi.fn(async () => {
      await new Promise<void>(() => {})
    })
    const runtime = createAlicizationRuntimeCardScopeState({
      now: () => 10_000,
      userDataPath: '/tmp/runtime-card-scope',
      activeCardIdRef: () => 'default',
      normalizeCardId: raw => String(raw ?? '').trim() || 'default',
      getMetaValue: async () => undefined,
      setMetaValue: async () => {},
      getLatestConversationSessionId: async () => undefined,
      appendAuditLog,
      getAlicizationKillSwitchSnapshot: () => ({ state: 'ACTIVE', reason: 'global', updatedAt: 1 }),
      getAlicizationCardKillSwitchSnapshot: () => ({ state: 'ACTIVE', reason: 'card', updatedAt: 2 }),
      setAlicizationCardKillSwitchState: (_cardId, state, reason) => ({ state, reason, updatedAt: 3 }),
      activeSessionIdByCard: new Map(),
      subconsciousStateByCard: new Map(),
      proactiveLoopStateByCard: new Map(),
      visualPresenceStateByCard: new Map(),
      readdir: async () => [],
      activeSessionMetaKey: 'active_session_id_v1',
      scopedKillSwitchMetaKey: 'kill_switch_state_v1',
    })

    await expect(Promise.race([
      runtime.ensureActiveOrLatestSessionId('card-a'),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('session canonicalization waited for audit')), 100)
      }),
    ])).resolves.toBe('session:primary:card-a')
    expect(appendAuditLog).toHaveBeenCalledOnce()
  })

  it('does not let session canonicalization audit block an aborted preparation', async () => {
    const parentController = new AbortController()
    let resolveAuditStarted!: () => void
    const auditStarted = new Promise<void>((resolve) => {
      resolveAuditStarted = resolve
    })
    const appendAuditLog = vi.fn(async (
      _input: unknown,
      _cardId?: string,
      auditOptions?: { signal?: AbortSignal },
    ) => {
      resolveAuditStarted()
      await new Promise<void>((_resolve, reject) => {
        const signal = auditOptions?.signal
        if (!signal)
          return
        if (signal.aborted) {
          reject(signal.reason)
          return
        }
        signal.addEventListener('abort', () => reject(signal.reason), { once: true })
      })
    })
    const runtime = createAlicizationRuntimeCardScopeState({
      now: () => 10_000,
      userDataPath: '/tmp/runtime-card-scope',
      activeCardIdRef: () => 'default',
      normalizeCardId: raw => String(raw ?? '').trim() || 'default',
      getMetaValue: async () => undefined,
      setMetaValue: async () => {},
      getLatestConversationSessionId: async () => undefined,
      appendAuditLog,
      getAlicizationKillSwitchSnapshot: () => ({ state: 'ACTIVE', reason: 'global', updatedAt: 1 }),
      getAlicizationCardKillSwitchSnapshot: () => ({ state: 'ACTIVE', reason: 'card', updatedAt: 2 }),
      setAlicizationCardKillSwitchState: (_cardId, state, reason) => ({ state, reason, updatedAt: 3 }),
      activeSessionIdByCard: new Map(),
      subconsciousStateByCard: new Map(),
      proactiveLoopStateByCard: new Map(),
      visualPresenceStateByCard: new Map(),
      readdir: async () => [],
      activeSessionMetaKey: 'active_session_id_v1',
      scopedKillSwitchMetaKey: 'kill_switch_state_v1',
    })
    const opening = runtime.ensureActiveOrLatestSessionId('card-a', {
      signal: parentController.signal,
    })
    const timeoutReason = new DOMException('chat-preparation-timeout', 'AbortError')

    await expect(opening).resolves.toBe('session:primary:card-a')
    await auditStarted
    parentController.abort(timeoutReason)

    await new Promise(resolve => setTimeout(resolve, 0))
    expect(appendAuditLog).toHaveBeenCalledWith(
      expect.any(Object),
      'card-a',
      { signal: parentController.signal },
    )
  })

  it('migrates legacy session data before restoring the canonical session pointer', async () => {
    const meta = new Map<string, string>()
    const migrateLegacyConversationSessionsToPrimary = vi.fn(async ({ cardId }: { cardId: string }) => ({
      cardId,
      primarySessionId: `session:primary:${cardId}`,
      dryRun: false,
      sourceSessionIds: ['legacy-session'],
      changed: true,
      migratedRows: {
        conversation_turns: 2,
      },
      conflictRows: {},
    }))
    const getLatestConversationSessionId = vi.fn(async () => 'session:primary:card-a')
    const runtime = createAlicizationRuntimeCardScopeState({
      now: () => 10_000,
      userDataPath: '/tmp/runtime-card-scope',
      activeCardIdRef: () => 'default',
      normalizeCardId: raw => String(raw ?? '').trim() || 'default',
      getMetaValue: async key => meta.get(key),
      setMetaValue: async (key, value) => {
        meta.set(key, value)
      },
      getLatestConversationSessionId,
      migrateLegacyConversationSessionsToPrimary,
      appendAuditLog: async () => {},
      getAlicizationKillSwitchSnapshot: () => ({ state: 'ACTIVE', reason: 'global', updatedAt: 1 }),
      getAlicizationCardKillSwitchSnapshot: () => ({ state: 'ACTIVE', reason: 'card', updatedAt: 2 }),
      setAlicizationCardKillSwitchState: (_cardId, state, reason) => ({ state, reason, updatedAt: 3 }),
      activeSessionIdByCard: new Map(),
      subconsciousStateByCard: new Map(),
      proactiveLoopStateByCard: new Map(),
      visualPresenceStateByCard: new Map(),
      readdir: async () => [],
      activeSessionMetaKey: 'active_session_id_v1',
      scopedKillSwitchMetaKey: 'kill_switch_state_v1',
    })

    await expect(runtime.restoreActiveSessionId('card-a')).resolves.toBe('session:primary:card-a')

    expect(migrateLegacyConversationSessionsToPrimary)
      .toHaveBeenCalledWith({ cardId: 'card-a', dryRun: false })
    expect(getLatestConversationSessionId).toHaveBeenCalled()
    expect(meta.get('active_session_id_v1')).toBe('session:primary:card-a')
  })

  it('merges global and card kill switch state and restores scoped snapshot from meta', async () => {
    const meta = new Map<string, string>([
      ['kill_switch_state_v1', JSON.stringify({
        state: 'SUSPENDED',
        reason: 'manual',
        updatedAt: 9,
      })],
    ])
    const setCardKill = vi.fn((_cardId: string, state: 'ACTIVE' | 'SUSPENDED', reason?: string) => ({
      state,
      reason,
      updatedAt: 4,
    }))
    const runtime = createAlicizationRuntimeCardScopeState({
      now: () => 20_000,
      userDataPath: '/tmp/runtime-card-scope',
      activeCardIdRef: () => 'default',
      normalizeCardId: raw => String(raw ?? '').trim() || 'default',
      getMetaValue: async key => meta.get(key),
      setMetaValue: async (key, value) => {
        meta.set(key, value)
      },
      getLatestConversationSessionId: async () => undefined,
      appendAuditLog: async () => {},
      getAlicizationKillSwitchSnapshot: () => ({ state: 'SUSPENDED', reason: 'global', updatedAt: 10 }),
      getAlicizationCardKillSwitchSnapshot: () => ({ state: 'ACTIVE', reason: 'card', updatedAt: 3 }),
      setAlicizationCardKillSwitchState: setCardKill,
      activeSessionIdByCard: new Map(),
      subconsciousStateByCard: new Map(),
      proactiveLoopStateByCard: new Map(),
      visualPresenceStateByCard: new Map(),
      readdir: async () => [],
      activeSessionMetaKey: 'active_session_id_v1',
      scopedKillSwitchMetaKey: 'kill_switch_state_v1',
    })

    expect(runtime.getScopedKillSwitchSnapshot('default')).toEqual({
      state: 'SUSPENDED',
      reason: 'global',
      updatedAt: 10,
    })

    await runtime.restoreScopedKillSwitch('default')
    expect(setCardKill).toHaveBeenCalledWith('default', 'SUSPENDED', 'manual')
  })

  it('lists known card ids from memory and filesystem without drifting card-scope discovery', async () => {
    const runtime = createAlicizationRuntimeCardScopeState({
      now: () => 30_000,
      userDataPath: '/tmp/runtime-card-scope',
      activeCardIdRef: () => 'default',
      normalizeCardId: raw => String(raw ?? '').trim() || 'default',
      getMetaValue: async () => undefined,
      setMetaValue: async () => {},
      getLatestConversationSessionId: async () => undefined,
      appendAuditLog: async () => {},
      getAlicizationKillSwitchSnapshot: () => ({ state: 'ACTIVE', reason: 'global', updatedAt: 1 }),
      getAlicizationCardKillSwitchSnapshot: () => ({ state: 'ACTIVE', reason: 'card', updatedAt: 2 }),
      setAlicizationCardKillSwitchState: (_cardId, state, reason) => ({ state, reason, updatedAt: 3 }),
      activeSessionIdByCard: new Map([['card-a', 'session-a']]),
      subconsciousStateByCard: new Map([['card-b', {}]]),
      proactiveLoopStateByCard: new Map([['card-c', {}]]),
      visualPresenceStateByCard: new Map([['card-d', {}]]),
      readdir: async () => [
        { isDirectory: () => true, name: 'card-e' },
        { isDirectory: () => false, name: 'ignore.txt' },
      ] as any,
      activeSessionMetaKey: 'active_session_id_v1',
      scopedKillSwitchMetaKey: 'kill_switch_state_v1',
    })

    const cardIds = await runtime.listKnownCardIds()
    expect(cardIds).toEqual(expect.arrayContaining(['default', 'card-a', 'card-b', 'card-c', 'card-d', 'card-e']))
  })
})
