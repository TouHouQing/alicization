import type { AlicizationSelfRevisionEvent } from './self-evolution/self-revision-ledger'

import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { setupAlicizationDb } from './db'
import { createLifeTurnRuntime } from './life-turn-runtime'
import { createAlicizationRuntimeSelfEvolutionComposition } from './runtime-self-evolution-composition'
import { buildAlicizationSelfRevisionStatePatch } from './self-evolution/state-revision-bus'
import { seedPolicyEvaluationFixture } from './test-support/policy-development-fixture'

function event(factId: string): AlicizationSelfRevisionEvent {
  return { version: 'self-revision-event-v1', id: 'learning-1', sourceTurnId: 'experience-1', decisionTraceId: 'trace-1', domain: 'self-model', taskAction: 'revise', resultStatus: 'completed', evidence: { supportCount: 1, contradictionCount: 0, verificationBasis: ['cleaned-memory'], supportingFactIds: [factId] }, proposedRevision: { summary: 'Use grounded preferences with explicit uncertainty', lifecycleState: 'verifying', nextLifecycleState: 'settled' }, verifier: { status: 'validated', mayInternalize: true, mayValidateOnly: false }, appliedTargets: [factId], rollbackPlan: ['restore-previous-policy'] }
}

describe('grounded growth production loop', () => {
  it('deduplicates proposals, gates activation, records actual provider adoption and rolls back on correction across restart', async () => {
    const root = await mkdtemp(join(tmpdir(), 'alicization-growth-loop-'))
    const db = await setupAlicizationDb(root, { cardId: 'alice' })
    const key = 'growth-test'
    try {
      await db.upsertMemoryFacts([{ subject: 'user', predicate: 'preferred_drink', object: 'tea', confidence: 0.95 }], 'rule')
      const fact = (await db.readLifeFactVersions({ cardId: 'alice' }))[0]
      const { selfEvolutionRuntime: growth } = createAlicizationRuntimeSelfEvolutionComposition({ now: Date.now, snapshotMetaKey: key, alicizationDb: db })
      const source = event(fact.factId)
      const patch = buildAlicizationSelfRevisionStatePatch({ event: source })
      const [first, duplicate] = await Promise.all([growth.proposeVersion({ event: source, patch }), growth.proposeVersion({ event: source, patch })])
      expect(first.id).toBe(duplicate.id)
      expect((await growth.getSnapshot()).candidates).toHaveLength(1)
      expect(await growth.getActivePatch()).toBeNull()
      await expect(growth.validateVersion({ candidateId: first.id, replayPassed: true, finalReplayGatePassed: true, productionGoldSampleCount: 4, productionGoldCoverage: 1 })).rejects.toThrow('actual paired evaluation')
      const fixture = await seedPolicyEvaluationFixture(db)
      const owner = (await db.readLifeState()).owners.find(owner => owner.owner === 'growth')!
      const command = { cardId: 'alice', candidateId: first.id, expectedOwnerHash: owner.contentHash, action: 'evaluate' as const, operationId: 'evaluate' }
      await fixture.create().command(command)
      expect(fixture.generate).toHaveBeenCalledTimes(9)
      const evaluation = (await db.readLifeState()).effects.find(effect => effect.payload.format === 'policy-paired-evaluation-v1')!
      await fixture.create().command({ ...command, operationId: 'adopt', action: 'adopt', expectedEvaluationHash: evaluation.id.slice('policy-evaluation:'.length) })
      expect((await growth.getActiveCandidate())?.sourceEvidence).toEqual([{ cardId: 'alice', kind: 'memory_facts', id: fact.factId, version: String(fact.version) }])
      const life = createLifeTurnRuntime({ getIngress: db.getLifeIngress, getEffect: db.getLifeEffect, read: db.readLifeState, commit: db.commitLifeState, now: Date.now })
      const context = await life.context('alice')
      await life.recordContextUse({ cardId: 'alice', turnId: 'production-1', requestHash: 'actual-provider-request', evidenceIds: [fact.factId], owners: context.owners, growthCandidateId: context.growthCandidateId }, new AbortController().signal)
      expect((await db.readLifeState()).ingress.some(item => item.source === 'growth-consumer' && item.payload.candidateId === first.id)).toBe(true)
      await db.applyMemoryFactCorrections([{ targetFactId: fact.factId, nextValidationStatus: 'superseded', sourceLabel: 'explicit-correction' }])
      expect(await growth.getActivePatch()).toBeNull()
      expect((await growth.getSnapshot()).candidates[0].status).toBe('rolled-back')
    }
    finally {
      await db.close()
    }
    const restarted = await setupAlicizationDb(root, { cardId: 'alice' })
    try {
      const { selfEvolutionRuntime: growth } = createAlicizationRuntimeSelfEvolutionComposition({ now: Date.now, snapshotMetaKey: key, alicizationDb: restarted })
      expect(await growth.getActivePatch()).toBeNull()
      expect((await growth.getSnapshot()).candidates).toHaveLength(1)
      const broken = createAlicizationRuntimeSelfEvolutionComposition({ now: Date.now, snapshotMetaKey: key, alicizationDb: { ...restarted, getMetaValue: async () => '{invalid' } })
      await expect(broken.selfEvolutionRuntime.getSnapshot()).rejects.toThrow()
    }
    finally {
      await restarted.close()
      await rm(root, { recursive: true, force: true })
    }
  })
})
