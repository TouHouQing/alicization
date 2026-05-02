import { describe, expect, it, vi } from 'vitest'

import { createAlicizationRuntimeCardScopeState } from './runtime-card-scope-state'

describe('runtime card scope state', () => {
  it('restores or auto-creates active session ids without keeping the logic in runtime.ts', async () => {
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
    expect(first).toBe('session:auto:card-a:10000')
    expect(activeSessionIdByCard.get('card-a')).toBe(first)
    expect(appendAuditLog).toHaveBeenCalled()

    meta.set('active_session_id_v1', 'session-from-meta')
    const second = await runtime.restoreActiveSessionId('card-b')
    expect(second).toBe('session-from-meta')
    expect(activeSessionIdByCard.get('card-b')).toBe('session-from-meta')
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
