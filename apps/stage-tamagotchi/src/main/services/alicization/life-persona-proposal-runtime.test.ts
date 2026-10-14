import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { setupAlicizationDb } from './db'
import { createLifePersonaProposalRuntime } from './life-persona-proposal-runtime'
import { createLifeSoulActivationRuntime } from './life-soul-activation-runtime'
import { writeAlicizationAtomicContent } from './runtime-atomic-write'

describe('dream proposals preserve the adopted identity', () => {
  it('withdraws a proposal and its target material when a supporting consolidation is forgotten', async () => {
    const root = await mkdtemp(join(tmpdir(), 'life-persona-source-withdrawal-'))
    const db = await setupAlicizationDb(root, { cardId: 'alice' })
    const soulPath = join(root, 'SOUL.md')
    try {
      const soul = createLifeSoulActivationRuntime({ cardId: 'alice', rootDir: root, soulPath, validate: () => {}, writeAtomic: (path, content) => writeAlicizationAtomicContent({ path, content, category: 'life-persona-test' }), read: db.readLifeState, commit: db.commitLifeState })
      await soul.write('adopted identity')
      await db.upsertMemoryConsolidations([{ id: 'clean-source', kind: 'daily', periodKey: '2026-10-04', periodStartedAt: 100, periodEndedAt: 200, summary: '一个清洁的共同经历', lesson: '尊重边界', cues: ['边界'], confidence: 0.9, dominantProvenance: 'remembered', derivedEventIds: [], updatedAt: 200 }])
      const proposal = createLifePersonaProposalRuntime({ read: db.readLifeState, commit: db.commitLifeState, listConsolidations: db.listMemoryConsolidations })
      await proposal.stage({ cardId: 'alice', turnId: 'dream-source', baseContent: 'adopted identity', targetContent: 'private proposed identity', sourceIds: ['clean-source'] })
      const original = (await db.readLifeState()).effects[0]
      expect(original.payload.sources).toEqual([expect.objectContaining({ id: 'clean-source' })])
      await db.tombstoneLongTermMemorySources({ cardId: 'alice', source: 'memory_consolidations', sourceIds: ['clean-source'] })
      const withdrawn = await db.getLifeEffect(original.id)
      expect(withdrawn).toMatchObject({ status: 'cancelled', payload: { sourceWithdrawn: true } })
      expect(JSON.stringify(withdrawn)).not.toContain('private proposed identity')
      expect(await readFile(soulPath, 'utf8')).toBe('adopted identity')
    }
    finally { await db.close(); await rm(root, { recursive: true, force: true }) }
  })

  it('stages an idempotent proposal without changing SOUL and holds it across restart or a human edit', async () => {
    const root = await mkdtemp(join(tmpdir(), 'life-persona-proposal-'))
    let db = await setupAlicizationDb(root, { cardId: 'alice' })
    const soulPath = join(root, 'SOUL.md')
    try {
      const soul = createLifeSoulActivationRuntime({ cardId: 'alice', rootDir: root, soulPath, validate: () => {}, writeAtomic: (path, content) => writeAlicizationAtomicContent({ path, content, category: 'life-persona-test' }), read: db.readLifeState, commit: db.commitLifeState })
      await soul.write('adopted identity')
      const proposal = createLifePersonaProposalRuntime({ read: db.readLifeState, commit: db.commitLifeState, listConsolidations: db.listMemoryConsolidations })
      const input = { cardId: 'alice', turnId: 'dream', baseContent: 'adopted identity', targetContent: 'proposed revision', sourceIds: [] }
      await proposal.stage(input)
      const revision = (await db.readLifeState()).revision
      expect((await proposal.stage(input)).status).toBe('duplicate')
      expect((await db.readLifeState()).revision).toBe(revision)
      expect(await readFile(soulPath, 'utf8')).toBe('adopted identity')
      expect((await db.readLifeState()).effects[0]).toMatchObject({ status: 'prepared', payload: { adopted: false, evaluationStatus: 'requires-clean-source' } })
      await soul.write('human revised identity')
      await expect(proposal.stage({ ...input, turnId: 'stale-dream' })).rejects.toThrow('Persona changed')
      await db.close()
      db = await setupAlicizationDb(root, { cardId: 'alice' })
      expect(await readFile(soulPath, 'utf8')).toBe('human revised identity')
      expect((await db.readLifeState()).effects[0].status).toBe('prepared')
    }
    finally { await db.close(); await rm(root, { recursive: true, force: true }) }
  })
})
