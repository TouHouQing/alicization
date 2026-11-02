import type { LifeObligationHistoryCursor } from '../../../shared/life-history-contracts'

import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it, vi } from 'vitest'

import sqlite from './sqlite3-runtime'

import { setupAlicizationDb } from './db'
import { readLifeObligationHistoryPage } from './life-history-query'

describe('durable obligation history pagination', () => {
  it('reads every older record once at tied timestamps, preserves core ownership, and keeps the index across reopen', async () => {
    const root = await mkdtemp(join(tmpdir(), 'life-history-pages-'))
    let db = await setupAlicizationDb(root, { cardId: 'alice' })
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(1_800_000_000_000)
    try {
      for (let index = 0; index < 53; index++)
        await db.upsertTaskThread({ id: `past-${String(index).padStart(3, '0')}`, goal: `Past commitment ${index}`, kind: 'mixed', status: 'cancelled' })
      await db.upsertTaskThread({ id: 'still-active', goal: 'Keep this accepted responsibility available', kind: 'mixed', status: 'planned' })
      const before = await db.readLifeState()
      const first = await db.readLifeObligationHistory({ cardId: 'alice' })
      expect(first.items).toHaveLength(20)
      expect(first.nextCursor?.cardId).toBe('alice')
      const seen = [...first.items]
      let cursor = first.nextCursor
      const counts = [first.items.length]
      while (cursor) {
        const page = await db.readLifeObligationHistory({ cardId: 'alice', cursor })
        counts.push(page.items.length)
        seen.push(...page.items)
        cursor = page.nextCursor
      }
      expect(counts).toEqual([20, 20, 13])
      expect(new Set(seen.map(item => item.id)).size).toBe(53)
      expect(seen.every(item => item.status === 'cancelled')).toBe(true)
      expect(new Set(seen.map(item => item.updatedAt)).size).toBe(1)
      const after = await db.readLifeState()
      expect(after).toEqual(before)
      expect(after.obligations.some(item => item.threadId === 'still-active' && item.status === 'accepted')).toBe(true)
      await db.close()
      db = await setupAlicizationDb(root, { cardId: 'alice' })
      expect(await db.readLifeObligationHistory({ cardId: 'alice', cursor: first.nextCursor! })).toMatchObject({ items: seen.slice(20, 40) })
      const reader = await new Promise<InstanceType<typeof sqlite.Database>>((resolve, reject) => {
        const handle = new sqlite.Database(join(root, 'alicizations', 'cards', 'alice', 'alicization.db'), sqlite.OPEN_READONLY, (error) => {
          if (error)
            reject(error)
          else
            resolve(handle)
        })
      })
      try {
        const plans: string[] = []
        await readLifeObligationHistoryPage({ cardId: 'alice', all: async <T>(sql: string, parameters?: unknown[]) => {
          const query = await new Promise<Array<{ detail: string }>>((resolve, reject) => reader.all(`EXPLAIN QUERY PLAN ${sql}`, parameters ?? [], (error, rows: Array<{ detail: string }>) => error ? reject(error) : resolve(rows)))
          plans.push(...query.map(item => item.detail))
          return new Promise<T[]>((resolve, reject) => reader.all(sql, parameters ?? [], (error, rows: T[]) => error ? reject(error) : resolve(rows)))
        } }, { cardId: 'alice', cursor: first.nextCursor! })
        expect(plans.some(item => item.includes('idx_life_obligations_history'))).toBe(true)
        expect(plans.some(item => item.includes('TEMP B-TREE'))).toBe(false)
      }
      finally { await new Promise<void>((resolve, reject) => reader.close(error => error ? reject(error) : resolve())) }
    }
    finally {
      vi.useRealTimers()
      await db.close()
      await rm(root, { recursive: true, force: true })
    }
  })

  it('keeps earlier pages stable when a new terminal commitment arrives', async () => {
    const root = await mkdtemp(join(tmpdir(), 'life-history-concurrent-'))
    const db = await setupAlicizationDb(root, { cardId: 'alice' })
    try {
      for (let index = 0; index < 5; index++)
        await db.upsertTaskThread({ id: `past-${index}`, goal: `Past ${index}`, kind: 'mixed', status: 'cancelled' })
      const first = await db.readLifeObligationHistory({ cardId: 'alice', limit: 2 })
      await db.upsertTaskThread({ id: 'new-completion', goal: 'A new terminal responsibility', kind: 'mixed', status: 'cancelled' })
      const rest = []
      let cursor = first.nextCursor
      while (cursor) {
        const page = await db.readLifeObligationHistory({ cardId: 'alice', cursor, limit: 2 })
        rest.push(...page.items)
        cursor = page.nextCursor
      }
      const ids = [...first.items, ...rest].map(item => item.id)
      expect(new Set(ids).size).toBe(5)
      expect(ids).not.toContain('task:new-completion')
      expect((await db.readLifeObligationHistory({ cardId: 'alice', limit: 2 })).items[0].id).toBe('task:new-completion')
    }
    finally {
      await db.close()
      await rm(root, { recursive: true, force: true })
    }
  })

  it('rejects foreign cursors and unbounded requests without poisoning later reads', async () => {
    const root = await mkdtemp(join(tmpdir(), 'life-history-scope-'))
    const db = await setupAlicizationDb(root, { cardId: 'alice' })
    try {
      await expect(db.readLifeObligationHistory({ cardId: 'bob' })).rejects.toThrow('card')
      const foreign: LifeObligationHistoryCursor = { cardId: 'bob', id: 'task:foreign', updatedAt: Date.now() }
      await expect(db.readLifeObligationHistory({ cardId: 'alice', cursor: foreign })).rejects.toThrow('card')
      for (const limit of [0, -1, 51, 1.5, Number.NaN])
        await expect(db.readLifeObligationHistory({ cardId: 'alice', limit })).rejects.toThrow()
      expect(await db.readLifeObligationHistory({ cardId: 'alice' })).toEqual({ cardId: 'alice', items: [], nextCursor: null })
    }
    finally {
      await db.close()
      await rm(root, { recursive: true, force: true })
    }
  })
})
