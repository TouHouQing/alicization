import type { LifeMutation } from '../../../../shared/life-contracts'

import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { expect, it } from 'vitest'

import { setupAlicizationDb } from '../db'
import { createCanonicalToolRegistry } from '../turn-os/tool-registry'
import { createProcedureCandidateRepository } from './procedure-candidate-repository'
import { planProcedureIndex, readProcedureIndex } from './procedure-index'

it('commits all index pages atomically in SQLite, survives restart and isolates other life owners', async () => {
  const root = await mkdtemp(join(tmpdir(), 'alicization-procedure-index-'))
  let db = await setupAlicizationDb(root, { cardId: 'alice' })
  const other = await setupAlicizationDb(root, { cardId: 'bob' })
  const items = Array.from({ length: 1000 }, (_, i) => ({ candidateId: `procedure:${i.toString(16).padStart(64, '0')}`, evaluationId: null }))
  const initial = planProcedureIndex({ items: [], pageHashes: new Set() }, items.slice(0, 992))
  const planned = planProcedureIndex({ items: items.slice(0, 992), pageHashes: new Set(initial.root.pages.map(page => page.hash)) }, items)
  const mutations: LifeMutation[] = planned.writes.flatMap(({ id, page }) => [
    { type: 'ingress-accept', ingress: { id, kind: 'system', source: 'execution-procedure-index-page', sourceKey: id, occurredAt: Date.now(), payload: { page } } },
    { type: 'ingress-settle', id, status: 'settled' },
  ])
  const head: LifeMutation = { type: 'ingress-accept', ingress: { id: 'index-v2', kind: 'system', source: 'execution-procedure-index', sourceKey: 'index-v2', occurredAt: Date.now(), payload: { index: planned.root } } }
  try {
    // Seed the prior immutable pages within the existing 64-mutation writer
    // budget; the actual append changes one page plus the root transaction.
    await db.commitLifeState({ cardId: 'alice', operationKey: 'prior-pages', changes: [], mutations: initial.writes.flatMap(({ id, page }): LifeMutation[] => [
      { type: 'ingress-accept', ingress: { id, kind: 'system', source: 'execution-procedure-index-page', sourceKey: id, occurredAt: Date.now(), payload: { page } } },
      { type: 'ingress-settle', id, status: 'settled' },
    ]) })
    await expect(db.commitLifeState({ cardId: 'alice', operationKey: 'failed-pages', changes: [], mutations: [...mutations, head, { type: 'effect-transition', id: 'missing-effect', expected: 'prepared', status: 'claimed' }] })).rejects.toThrow()
    expect(await db.getLifeIngress(planned.writes[0]!.id)).toBeNull()
    expect(await db.getLifeIngress('index-v2')).toBeNull()
    await db.commitLifeState({ cardId: 'alice', operationKey: 'complete-pages', changes: [], mutations: [...mutations, head, { type: 'ingress-settle', id: 'index-v2', status: 'settled' }] })
    expect(await other.getLifeIngress(planned.writes[0]!.id)).toBeNull()
    await db.close()
    db = await setupAlicizationDb(root, { cardId: 'alice' })
    const read = async (id: string) => (await db.getLifeIngress(id))?.payload.page
    const stored = (await db.getLifeIngress('index-v2'))!.payload.index
    expect((await readProcedureIndex(stored, read)).items).toEqual(items)
    const changed = structuredClone(planned.root)
    changed.pages[0]!.hash = '0'.repeat(64)
    await expect(readProcedureIndex(changed, read)).rejects.toThrow('content changed')
    // An index is not approval: no candidate or evaluation was fabricated here.
    expect(await db.getLifeIngress(items[0]!.candidateId)).toBeNull()
    await db.commitLifeState({ cardId: 'alice', operationKey: 'malformed-head', changes: [], mutations: [
      { type: 'ingress-accept', ingress: { id: 'malformed-head', kind: 'system', source: 'execution-procedure-index', sourceKey: 'malformed-head', occurredAt: Date.now(), payload: {} } },
      { type: 'ingress-settle', id: 'malformed-head', status: 'settled' },
    ] })
    await expect(createProcedureCandidateRepository(db, 'alice', createCanonicalToolRegistry()).list()).rejects.toThrow('head is missing')
  }
  finally {
    await db.close()
    await other.close()
    await rm(root, { recursive: true, force: true })
  }
})
