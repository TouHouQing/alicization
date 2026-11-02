import type { LifeBackupCommand, LifeBackupResult, LifeBackupSummary } from '../../shared/life-backup-contracts'

import { afterEach, expect, it, vi } from 'vitest'
import { effectScope, ref } from 'vue'

import { useLifeBackupPages } from './use-life-backup-pages'

const closes: Array<() => void> = []
afterEach(() => closes.splice(0).forEach(close => close()))
function row(id: string): LifeBackupSummary {
  return { id, cardId: 'alice', createdAt: 1, revision: 1, schemaVersion: 1, manifestHash: id.repeat(64).slice(0, 64), databaseHash: 'a'.repeat(64), soulHash: null }
}
function result(id = 'first', cursor: string | null = 'page-two'): LifeBackupResult {
  return { status: 'listed', cardId: 'alice', backups: [row(id)], issues: [], page: { total: 21, issuesTotal: 0, nextCursor: cursor } }
}
function fixture() {
  const scope = effectScope()
  closes.push(() => scope.stop())
  const cardId = ref<string | undefined>('alice')
  const busy = vi.fn()
  const error = vi.fn()
  const restarting = vi.fn()
  const deferred = vi.fn()
  const invoke = vi.fn(async (_command: LifeBackupCommand) => result())
  const pages = scope.run(() => useLifeBackupPages({ cardId, busy, error, restarting, deferred, invoke }))!
  return { pages, cardId, busy, error, restarting, deferred, invoke, close: () => scope.stop() }
}

it('navigates forwards and backwards using the exact returned cursors and resets on explicit refresh', async () => {
  const f = fixture()
  await f.pages.refresh()
  f.invoke.mockResolvedValueOnce(result('second', null))
  await f.pages.next()
  expect(f.invoke.mock.calls[1][0]).toMatchObject({ action: 'list', cardId: 'alice', cursor: 'page-two', refresh: false })
  expect(f.pages.backups.value[0].id).toBe('second')
  expect(f.pages.hasPrevious.value).toBe(true)
  expect(f.pages.hasNext.value).toBe(false)
  await f.pages.previous()
  expect(f.invoke.mock.calls[2][0]).toMatchObject({ cursor: undefined, refresh: false })
  expect(f.pages.page.value).toBe(0)
  await f.pages.refresh()
  expect(f.invoke.mock.calls[3][0]).toMatchObject({ cursor: undefined, refresh: true })
})

it('keeps cancelled restore on the reviewed page and sends the exact manifest hash', async () => {
  const f = fixture()
  await f.pages.refresh()
  f.invoke.mockResolvedValueOnce(result('second', null))
  await f.pages.next()
  const selected = f.pages.backups.value[0]
  f.invoke.mockResolvedValueOnce({ ...result('second', null), status: 'cancelled' })
  await f.pages.restore(selected)
  expect(f.invoke.mock.calls[2][0]).toMatchObject({ action: 'restore', backupId: selected.id, expectedManifestHash: selected.manifestHash, cursor: 'page-two' })
  expect(f.pages.page.value).toBe(1)
  expect(f.pages.backups.value[0].id).toBe('second')
})

it('preserves the reviewed page and releases busy state when a consistent backup is deferred', async () => {
  const f = fixture()
  await f.pages.refresh()
  f.invoke.mockResolvedValueOnce(result('second', null))
  await f.pages.next()
  f.invoke.mockResolvedValueOnce({ cardId: 'alice', status: 'deferred', backups: [], issues: [] })
  await f.pages.create()
  expect(f.pages.page.value).toBe(1)
  expect(f.pages.backups.value[0].id).toBe('second')
  expect(f.deferred).toHaveBeenCalledOnce()
  expect(f.busy).toHaveBeenLastCalledWith(false)
})

it('ignores a late old-life response even after switching away and back to that life', async () => {
  const f = fixture()
  const pending = Promise.withResolvers<LifeBackupResult>()
  f.invoke.mockReturnValueOnce(pending.promise)
  const call = f.pages.refresh()
  f.cardId.value = 'bob'
  f.cardId.value = 'alice'
  pending.resolve(result())
  await call
  expect(f.pages.backups.value).toEqual([])
  expect(f.pages.hasNext.value).toBe(false)
})

it('keeps the latest request busy and ignores an older result or error', async () => {
  const f = fixture()
  const old = Promise.withResolvers<LifeBackupResult>()
  const current = Promise.withResolvers<LifeBackupResult>()
  f.invoke.mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise)
  const first = f.pages.refresh()
  const second = f.pages.refresh()
  old.reject(new Error('Old page failed'))
  await first
  expect(f.busy.mock.calls.map(([busy]) => busy)).toEqual([true, true])
  expect(f.error).not.toHaveBeenCalledWith('Old page failed')
  current.resolve(result('current'))
  await second
  expect(f.pages.backups.value[0].id).toBe('current')
  expect(f.busy).toHaveBeenLastCalledWith(false)
})

it('ignores completion after leaving the page and reports current cursor invalidation without losing reviewed rows', async () => {
  const f = fixture()
  await f.pages.refresh()
  f.invoke.mockRejectedValueOnce(new Error('Backup list changed; refresh it before continuing'))
  await f.pages.next()
  expect(f.pages.backups.value[0].id).toBe('first')
  expect(f.pages.page.value).toBe(0)
  expect(f.error).toHaveBeenLastCalledWith('Backup list changed; refresh it before continuing')
  const pending = Promise.withResolvers<LifeBackupResult>()
  f.invoke.mockReturnValueOnce(pending.promise)
  const call = f.pages.refresh()
  f.close()
  pending.resolve(result('ignored'))
  await call
  expect(f.pages.backups.value[0].id).toBe('first')
})

it('requires current pagination metadata and reports restart only for the actual current response', async () => {
  const f = fixture()
  const missing = result()
  delete missing.page
  f.invoke.mockResolvedValueOnce(missing)
  await f.pages.refresh()
  expect(f.pages.backups.value).toEqual([])
  expect(f.error).toHaveBeenLastCalledWith('Backup response is missing pagination metadata')
  f.invoke.mockResolvedValueOnce({ ...result(), status: 'restarting' })
  await f.pages.restore(row('reviewed'))
  expect(f.restarting).toHaveBeenCalledOnce()
})
