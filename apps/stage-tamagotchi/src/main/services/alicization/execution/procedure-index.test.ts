import { Buffer } from 'node:buffer'

import { describe, expect, it } from 'vitest'

import { executionDigest } from './acceptance-compiler'
import { planProcedureIndex, readProcedureIndex } from './procedure-index'

const entries = (count: number) => Array.from({ length: count }, (_, index) => ({ candidateId: `procedure:${index.toString(16).padStart(64, '0')}`, evaluationId: index % 2 ? `evaluation-${index}` : null }))

describe('durable paged procedure index', () => {
  it('migrates an existing full v1 index on mutation without losing any old version or evaluation', async () => {
    const previous = { version: 1, items: entries(32) }
    const snapshot = await readProcedureIndex(previous, async () => {
      throw new Error('legacy has no page')
    })
    const update = planProcedureIndex(snapshot, entries(33))
    const disk = new Map(update.writes.map(write => [write.id, JSON.stringify(write.page)]))
    const restored = await readProcedureIndex(JSON.parse(JSON.stringify(update.root)), async id => JSON.parse(disk.get(id)!))
    expect(restored.items).toEqual(entries(33))
    expect(restored.items.slice(0, 32)).toEqual(previous.items)
    expect(previous).toEqual({ version: 1, items: entries(32) })
  })

  it('restores 1000 candidates and rewrites one small page when one evaluation changes', async () => {
    const initial = planProcedureIndex(await readProcedureIndex(undefined, async () => null), entries(1000))
    const disk = new Map(initial.writes.map(write => [write.id, JSON.stringify(write.page)]))
    const snapshot = await readProcedureIndex(initial.root, async id => JSON.parse(disk.get(id)!))
    const revised = snapshot.items.map((item, index) => index === 500 ? { ...item, evaluationId: 'a-new-independent-evaluation' } : item)
    const update = planProcedureIndex(snapshot, revised)
    expect(update.writes).toHaveLength(1)
    const writtenBytes = Buffer.byteLength(JSON.stringify(update))
    expect(writtenBytes).toBeLessThan(Buffer.byteLength(JSON.stringify(revised)) / 4)
    for (const write of update.writes)
      disk.set(write.id, JSON.stringify(write.page))
    expect((await readProcedureIndex(update.root, async id => JSON.parse(disk.get(id)!))).items).toEqual(revised)
    expect((await readProcedureIndex(initial.root, async id => JSON.parse(disk.get(id)!))).items).toEqual(entries(1000))
    expect(() => planProcedureIndex(snapshot, entries(1001))).toThrow()
  })

  it('does not write any page for an unchanged index', async () => {
    const initial = planProcedureIndex(await readProcedureIndex(undefined, async () => null), entries(40))
    const disk = new Map(initial.writes.map(write => [write.id, write.page]))
    const snapshot = await readProcedureIndex(initial.root, async id => disk.get(id))
    expect(planProcedureIndex(snapshot, snapshot.items)).toEqual({ root: initial.root, writes: [] })
  })

  it('refuses missing, corrupted, duplicated or mismatched pages', async () => {
    const initial = planProcedureIndex(await readProcedureIndex(undefined, async () => null), entries(40))
    const disk = new Map(initial.writes.map(write => [write.id, write.page]))
    await expect(readProcedureIndex(initial.root, async () => null)).rejects.toThrow()
    await expect(readProcedureIndex(initial.root, async id => ({ ...disk.get(id), items: entries(3) }))).rejects.toThrow()
    await expect(readProcedureIndex({ ...initial.root, count: 41 }, async id => disk.get(id))).rejects.toThrow('count')
    await expect(readProcedureIndex({ ...initial.root, count: 64, pages: [initial.root.pages[0], initial.root.pages[0]] }, async id => disk.get(id))).rejects.toThrow('duplicate pages')
    const duplicated = { version: 1, items: [{ ...entries(1)[0]!, evaluationId: 'different' }] }
    const hash = executionDigest(duplicated)
    const id = `procedure-index-page:${hash}`
    await expect(readProcedureIndex({ version: 2, count: 33, pages: [initial.root.pages[0], { id, hash, count: 1 }] }, async pageId => pageId === id ? duplicated : disk.get(pageId))).rejects.toThrow('duplicate identities')
  })
})
