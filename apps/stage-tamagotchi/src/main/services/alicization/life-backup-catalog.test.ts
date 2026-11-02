import type { LifeBackupIssue, LifeBackupSummary } from '../../../shared/life-backup-contracts'

import { expect, it, vi } from 'vitest'

import { createLifeBackupCatalog } from './life-backup-catalog'

function fixture(count = 51) {
  let cardId = 'alice'
  let stamp = '1'
  const rows: LifeBackupSummary[] = Array.from({ length: count }, (_, n) => ({ id: `backup-${String(n).padStart(5, '0')}`, cardId: 'alice', createdAt: Math.floor(n / 2), revision: n, schemaVersion: 1, databaseHash: 'a'.repeat(64), soulHash: null, manifestHash: String(n).padStart(64, '0') }))
  const issues: LifeBackupIssue[] = []
  const inspect = vi.fn(async () => ({ cardId, backups: rows.filter(row => row.cardId === cardId).map(row => ({ ...row })), issues: [...issues] }))
  const read = vi.fn(async (id: string) => ({ ...rows.find(row => row.id === id)! }))
  const catalog = createLifeBackupCatalog({ cardId: () => cardId, stamp: async () => stamp, inspect, read })
  return { catalog, rows, issues, inspect, read, card: (value: string) => cardId = value, stamp: (value: string) => stamp = value }
}

it('pages all1001 rows exactly once with one bounded index and validates every visible manifest', async () => {
  const f = fixture(1001)
  const found: string[] = []
  let cursor: string | undefined
  do {
    const page = await f.catalog.page({ limit: 100, cursor })
    expect(page.backups.length).toBeLessThanOrEqual(100)
    expect(page.total).toBe(1001)
    found.push(...page.backups.map(row => row.id))
    cursor = page.nextCursor ?? undefined
    if (cursor)
      expect(cursor.length).toBeLessThan(512)
  } while (cursor)
  expect(found).toEqual([...f.rows].sort((a, b) => b.createdAt - a.createdAt || b.id.localeCompare(a.id)).map(row => row.id))
  expect(new Set(found).size).toBe(1001)
  expect(f.inspect).toHaveBeenCalledOnce()
  expect(f.read).toHaveBeenCalledTimes(1001)
})

it.each([0, 101, 1.5, Number.NaN])('rejects an invalid page size %s without reading the catalog', async (limit) => {
  const f = fixture()
  await expect(f.catalog.page({ limit })).rejects.toThrow('page request')
  expect(f.inspect).not.toHaveBeenCalled()
})

it('rejects tampered, oversized and differently sized cursors without accepting an offset', async () => {
  const f = fixture()
  const first = await f.catalog.page()
  for (const cursor of ['x'.repeat(513), 'not-a-cursor', `${first.nextCursor!.slice(0, -3)}xyz`])
    await expect(f.catalog.page({ cursor })).rejects.toThrow('refresh')
  await expect(f.catalog.page({ cursor: first.nextCursor!, limit: 10 })).rejects.toThrow('refresh')
  expect(f.read).toHaveBeenCalledTimes(20)
})

it('rejects a cursor from another catalog instance or life', async () => {
  const f = fixture()
  const first = await f.catalog.page()
  await expect(fixture().catalog.page({ cursor: first.nextCursor! })).rejects.toThrow('refresh')
  f.card('bob')
  await expect(f.catalog.page({ cursor: first.nextCursor! })).rejects.toThrow('refresh')
  expect((await f.catalog.page()).backups).toEqual([])
})

it('invalidates an old cursor after an external directory addition or explicit refresh', async () => {
  const f = fixture()
  const first = await f.catalog.page()
  f.stamp('2')
  await expect(f.catalog.page({ cursor: first.nextCursor! })).rejects.toThrow('refresh')
  const current = await f.catalog.page()
  await f.catalog.page({ refresh: true })
  await expect(f.catalog.page({ cursor: current.nextCursor! })).rejects.toThrow('refresh')
})

it('detects a changed visible manifest even when the parent directory stamp stays the same', async () => {
  const f = fixture()
  const first = await f.catalog.page()
  const next = [...f.rows].sort((a, b) => b.createdAt - a.createdAt || b.id.localeCompare(a.id))[20]
  next.manifestHash = 'b'.repeat(64)
  await expect(f.catalog.page({ cursor: first.nextCursor! })).rejects.toThrow('refresh')
  expect(f.inspect).toHaveBeenCalledOnce()
  await f.catalog.page()
  expect(f.inspect).toHaveBeenCalledTimes(2)
})

it('returns no partial page when the directory changes while visible rows are being checked', async () => {
  const f = fixture()
  const read = f.read.getMockImplementation()!
  f.read.mockImplementationOnce(async (id) => {
    f.stamp('2')
    return read(id)
  })
  await expect(f.catalog.page()).rejects.toThrow('refresh')
  await f.catalog.page()
  expect(f.inspect).toHaveBeenCalledTimes(2)
})

it('coalesces concurrent index builds and rejects a life switch before publication', async () => {
  const f = fixture()
  const entered = Promise.withResolvers<void>()
  const release = Promise.withResolvers<void>()
  f.inspect.mockImplementationOnce(async () => {
    entered.resolve()
    await release.promise
    return { cardId: 'alice', backups: f.rows, issues: [] }
  })
  const first = f.catalog.page()
  const second = f.catalog.page()
  const rejected = Promise.all([expect(first).rejects.toThrow('refresh'), expect(second).rejects.toThrow('refresh')])
  await entered.promise
  f.card('bob')
  release.resolve()
  await rejected
  expect(f.inspect).toHaveBeenCalledOnce()
  expect((await f.catalog.page()).cardId).toBe('bob')
})

it('bounds issue payloads while preserving their full count and refuses an oversized index', async () => {
  const f = fixture()
  f.issues.push(...Array.from({ length: 150 }, (_, n) => ({ backupId: `damaged-${n}`, ownership: 'unidentified' as const, code: 'unreadable-manifest' as const })))
  const page = await f.catalog.page()
  expect(page.issues).toHaveLength(100)
  expect(page.issuesTotal).toBe(150)
  expect(f.issues).toHaveLength(150)
  const large = fixture(20001)
  await expect(large.catalog.page()).rejects.toThrow('capacity')
  expect(large.read).not.toHaveBeenCalled()
})
