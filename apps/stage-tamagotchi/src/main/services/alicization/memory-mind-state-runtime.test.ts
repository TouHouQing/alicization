import type sqlite3 from 'sqlite3'

import { describe, expect, it } from 'vitest'

import { createAlicizationMemoryMindStateRuntime } from './memory-mind-state-runtime'

function normalizeSql(sql: string) {
  return sql.replace(/\s+/g, ' ').trim()
}

describe('memory mind state runtime', () => {
  it('stores and reads mind heads without keeping meta serialization in db.ts', async () => {
    const meta = new Map<string, string>()
    const runtime = createAlicizationMemoryMindStateRuntime({
      database: {} as sqlite3.Database,
      now: () => 100,
      randomUUID: () => 'unused',
      getMetaValue: async key => meta.get(key),
      upsertMeta: async (key, value) => {
        meta.set(key, value)
      },
      run: async () => {},
      all: async () => [],
      runInTransaction: async (_database, task) => await task(),
      enqueueWrite: async (task) => await task(),
      assertWriteNotAborted: () => {},
      parseMindTurnEventPayload: () => null,
      resolveMindTurnEventActiveThreadId: () => null,
    })

    await runtime.upsertMindHead('card-1', 'person-state-update-surface', {
      summary: 'Keep the answer inside the focused-work distance.',
    })

    expect(await runtime.readMindHead<{ summary: string }>('card-1', 'person-state-update-surface')).toEqual({
      summary: 'Keep the answer inside the focused-work distance.',
    })
  })

  it('stores and filters replayable mind-turn events by active thread id', async () => {
    const rows: any[] = []
    const runtime = createAlicizationMemoryMindStateRuntime({
      database: {} as sqlite3.Database,
      now: () => 100,
      randomUUID: (() => {
        let counter = 0
        return () => `evt-${++counter}`
      })(),
      getMetaValue: async () => undefined,
      upsertMeta: async () => {},
      run: async (_database, sql, params = []) => {
        if (normalizeSql(sql).includes('INSERT INTO mind_turn_events')) {
          const [id, decisionTraceId, turnId, sessionId, origin, kind, payloadJson, createdAt] = params as [
            string,
            string,
            string | null,
            string | null,
            'user-turn' | 'subconscious-proactive' | 'system',
            string,
            string | null,
            number,
          ]
          rows.push({
            id,
            decision_trace_id: decisionTraceId,
            turn_id: turnId,
            session_id: sessionId,
            origin,
            kind,
            payload_json: payloadJson,
            created_at: createdAt,
          })
        }
      },
      all: async <T>(_database: sqlite3.Database, sql: string, params?: unknown[]) => {
        const normalizedSql = normalizeSql(sql)
        if (!normalizedSql.includes('FROM mind_turn_events'))
          return [] as T[]
        const resolvedParams = params ?? []
        const resolved = [...rows].sort((left, right) => right.created_at - left.created_at)
        if (normalizedSql.includes('WHERE decision_trace_id = ? AND turn_id = ?')) {
          const [decisionTraceId, turnId, limit] = resolvedParams as [string, string, number]
          return resolved.filter(row => row.decision_trace_id === decisionTraceId && row.turn_id === turnId).slice(0, limit) as T[]
        }
        if (normalizedSql.includes('WHERE decision_trace_id = ?')) {
          const [decisionTraceId, limit] = resolvedParams as [string, number]
          return resolved.filter(row => row.decision_trace_id === decisionTraceId).slice(0, limit) as T[]
        }
        const [turnId, limit] = resolvedParams as [string, number]
        return resolved.filter(row => row.turn_id === turnId).slice(0, limit) as T[]
      },
      runInTransaction: async (_database, task) => await task(),
      enqueueWrite: async (task) => await task(),
      assertWriteNotAborted: () => {},
      parseMindTurnEventPayload: (raw) => raw ? JSON.parse(raw) as Record<string, unknown> : null,
      resolveMindTurnEventActiveThreadId: (payload) => {
        const digitalLifeSpine = payload?.digitalLifeSpine
        return digitalLifeSpine && typeof digitalLifeSpine === 'object'
          && (digitalLifeSpine as Record<string, any>).runtime
          && typeof (digitalLifeSpine as Record<string, any>).runtime === 'object'
          ? ((digitalLifeSpine as Record<string, any>).runtime as Record<string, any>).activeThreadId ?? null
          : null
      },
    })

    await runtime.appendMindTurnEvents([
      {
        decisionTraceId: 'mind:l9f3lq:feedfacecafe',
        turnId: 'turn-1',
        sessionId: 'session-1',
        origin: 'user-turn',
        kind: 'governance-normalized',
        payload: {
          digitalLifeSpine: {
            runtime: {
              activeThreadId: 'thread-alpha',
            },
          },
        },
        createdAt: 100,
      },
      {
        decisionTraceId: 'mind:l9f3lq:feedfacecafe',
        turnId: 'turn-1',
        sessionId: 'session-1',
        origin: 'user-turn',
        kind: 'persistence-written',
        payload: {
          digitalLifeSpine: {
            runtime: {
              activeThreadId: 'thread-beta',
            },
          },
        },
        createdAt: 120,
      },
    ])

    const rowsByThread = await runtime.listMindTurnEvents({
      decisionTraceId: 'mind:l9f3lq:feedfacecafe',
      activeThreadId: 'thread-beta',
      limit: 10,
    })

    expect(rowsByThread).toHaveLength(1)
    expect(rowsByThread[0]).toEqual(expect.objectContaining({
      kind: 'persistence-written',
      payload: expect.objectContaining({
        digitalLifeSpine: expect.objectContaining({
          runtime: expect.objectContaining({
            activeThreadId: 'thread-beta',
          }),
        }),
      }),
    }))
  })
})
