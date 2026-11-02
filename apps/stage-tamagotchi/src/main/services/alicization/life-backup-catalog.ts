import type { LifeBackupIssue, LifeBackupSummary } from '../../../shared/life-backup-contracts'

import { Buffer } from 'node:buffer'
import { createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto'

export interface LifeBackupPageRequest { cursor?: string, limit?: number, refresh?: boolean }
export interface LifeBackupInspection { cardId: string, backups: LifeBackupSummary[], issues: LifeBackupIssue[] }
export interface LifeBackupPage extends LifeBackupInspection { total: number, issuesTotal: number, nextCursor: string | null }

const changed = () => new Error('Backup list changed; refresh it before continuing')

/**
 * A display index owns no restore or deletion authority. Every visible row is
 * checked against its real manifest, and restore still verifies database bytes.
 */
export function createLifeBackupCatalog(options: {
  cardId: () => string
  stamp: () => Promise<string>
  inspect: (signal: AbortSignal) => Promise<LifeBackupInspection>
  read: (id: string) => Promise<LifeBackupSummary>
}) {
  type Index = LifeBackupInspection & { epoch: string, stamp: string }
  const secret = randomBytes(32)
  let index: Index | undefined
  let building: Promise<Index> | undefined
  let generation = 0
  const invalidate = () => {
    generation++
    index = undefined
  }
  const sign = (text: string) => createHmac('sha256', secret).update(text).digest()

  function decode(cursor: string) {
    if (cursor.length > 512 || !/^[\w-]+\.[\w-]+$/u.test(cursor))
      throw changed()
    const [body, signature] = cursor.split('.')
    const actual = Buffer.from(signature, 'base64url')
    const expected = sign(body)
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
      throw changed()
    const parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
    if (!parsed || Object.keys(parsed).sort().join(',') !== 'cardId,epoch,limit,offset' || typeof parsed.epoch !== 'string' || !Number.isSafeInteger(parsed.offset) || parsed.offset <= 0)
      throw changed()
    return parsed as { cardId: string, epoch: string, limit: number, offset: number }
  }

  async function load(refresh: boolean): Promise<Index> {
    const cardId = options.cardId()
    const stamp = await options.stamp()
    if (refresh || (index && (index.cardId !== cardId || index.stamp !== stamp)))
      invalidate()
    if (index)
      return index
    if (building)
      return building
    const revision = generation
    const task = (async () => {
      const snapshot = await options.inspect(AbortSignal.timeout(10000))
      if (snapshot.backups.length + snapshot.issues.length > 20000)
        throw new Error('Backup catalog exceeded its bounded index capacity')
      if (revision !== generation || options.cardId() !== cardId || snapshot.cardId !== cardId || await options.stamp() !== stamp)
        throw changed()
      const current = { ...snapshot, backups: [...snapshot.backups].sort((a, b) => b.createdAt - a.createdAt || b.id.localeCompare(a.id)), epoch: randomUUID(), stamp }
      index = current
      return current
    })()
    building = task
    try {
      return await task
    }
    finally {
      if (building === task)
        building = undefined
    }
  }

  async function page(request: LifeBackupPageRequest = {}): Promise<LifeBackupPage> {
    const limit = request.limit ?? 20
    if (!Number.isInteger(limit) || limit < 1 || limit > 100 || (request.refresh !== undefined && typeof request.refresh !== 'boolean') || (request.cursor !== undefined && typeof request.cursor !== 'string'))
      throw new Error('Invalid bounded backup page request')
    const cursor = request.cursor === undefined ? undefined : decode(request.cursor)
    const current = await load(request.refresh === true)
    if (cursor && (cursor.cardId !== current.cardId || cursor.epoch !== current.epoch || cursor.limit !== limit || cursor.offset >= current.backups.length))
      throw changed()
    const offset = cursor?.offset ?? 0
    const backups = current.backups.slice(offset, offset + limit)
    try {
      for (const backup of backups) {
        const actual = await options.read(backup.id)
        if (actual.cardId !== current.cardId || actual.id !== backup.id || actual.manifestHash !== backup.manifestHash)
          throw changed()
      }
      if (index !== current || options.cardId() !== current.cardId || await options.stamp() !== current.stamp)
        throw changed()
    }
    catch (error) {
      invalidate()
      throw error
    }
    const nextOffset = offset + backups.length
    const body = Buffer.from(JSON.stringify({ cardId: current.cardId, epoch: current.epoch, limit, offset: nextOffset })).toString('base64url')
    return { cardId: current.cardId, backups: backups.map(backup => ({ ...backup })), issues: current.issues.slice(0, 100).map(issue => ({ ...issue })), total: current.backups.length, issuesTotal: current.issues.length, nextCursor: nextOffset < current.backups.length ? `${body}.${sign(body).toString('base64url')}` : null }
  }
  return { page, invalidate }
}
