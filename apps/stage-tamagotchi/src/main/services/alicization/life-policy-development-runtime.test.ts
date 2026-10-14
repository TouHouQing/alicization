import type { AlicizationSelfRevisionEvent } from './self-evolution/self-revision-ledger'

import process from 'node:process'

import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { setupAlicizationDb } from './db'
import { createLifePolicyDevelopmentRuntime } from './life-policy-development-runtime'
import { createAlicizationRuntimeSelfEvolutionComposition } from './runtime-self-evolution-composition'
import { buildAlicizationSelfRevisionStatePatch } from './self-evolution/state-revision-bus'
import { configuredLifeGeneration } from './test-support/configured-life-generation'
import { seedPolicyEvaluationFixture } from './test-support/policy-development-fixture'

describe('actual policy candidate evaluation', () => {
  it.skipIf(process.env.LIFE_QA_CONFIGURED_GROWTH !== '1')('runs the production policy reducer and actual configured-model pairs while retaining a shadow candidate', async () => {
    const root = await mkdtemp(join(tmpdir(), 'life-policy-configured-'))
    const db = await setupAlicizationDb(root, { cardId: 'alice' })
    try {
      await db.upsertMemoryFacts([{ subject: 'user', predicate: 'likes', object: '音乐', confidence: 0.95 }], 'rule')
      const fact = (await db.readLifeFactVersions({ cardId: 'alice' }))[0]
      const event: AlicizationSelfRevisionEvent = { version: 'self-revision-event-v1', id: 'qa-policy-source', sourceTurnId: 'qa-experience', decisionTraceId: 'qa-trace', domain: 'self-model', taskAction: 'revise', resultStatus: 'completed', evidence: { supportCount: 1, contradictionCount: 0, verificationBasis: ['cleaned-memory'], supportingFactIds: [fact.factId] }, proposedRevision: { summary: '先理解感受，再核对记忆', lifecycleState: 'verifying', nextLifecycleState: 'settled' }, verifier: { status: 'validated', mayInternalize: true, mayValidateOnly: false }, appliedTargets: [fact.factId], rollbackPlan: ['restore-previous-policy'] }
      const growth = createAlicizationRuntimeSelfEvolutionComposition({ now: Date.now, snapshotMetaKey: 'growth', alicizationDb: db }).selfEvolutionRuntime
      const candidate = await growth.proposeVersion({ event, patch: buildAlicizationSelfRevisionStatePatch({ event }) })
      const fixture = await seedPolicyEvaluationFixture(db)
      const trial = await configuredLifeGeneration()
      fixture.generate.mockImplementation(trial.generate)
      const owner = (await db.readLifeState()).owners.find(owner => owner.owner === 'growth')!
      await createLifePolicyDevelopmentRuntime({ ...fixture.options, factMetadata: () => db.listMemoryFacts() }).command({ cardId: 'alice', candidateId: candidate.id, expectedOwnerHash: owner.contentHash, operationId: 'qa-real-pair', action: 'evaluate' })
      const evaluation = (await db.readLifeState()).effects.find(effect => effect.id.startsWith('policy-evaluation:'))!
      expect(trial.calls()).toBe(9)
      expect(evaluation.receipt).toMatchObject({ pairs: expect.any(Array), shadowReplay: { passed: true } })
      expect(await growth.getActiveCandidate()).toBeNull()
      await trial.save('configured-policy-pairs', evaluation.receipt)
    }
    finally { await db.close(); await rm(root, { recursive: true, force: true }) }
  }, 600000)
  it('refuses missing samples, stale review, foreground interruption and adoption of a regressing pair', async () => {
    const root = await mkdtemp(join(tmpdir(), 'life-policy-development-'))
    const db = await setupAlicizationDb(root, { cardId: 'alice' })
    try {
      await db.upsertMemoryFacts([{ subject: 'user', predicate: 'likes', object: '音乐', confidence: 0.95 }], 'rule')
      const fact = (await db.readLifeFactVersions({ cardId: 'alice' }))[0]
      const event: AlicizationSelfRevisionEvent = { version: 'self-revision-event-v1', id: 'policy-source', sourceTurnId: 'experience', decisionTraceId: 'trace', domain: 'self-model', taskAction: 'revise', resultStatus: 'completed', evidence: { supportCount: 1, contradictionCount: 0, verificationBasis: ['cleaned-memory'], supportingFactIds: [fact.factId] }, proposedRevision: { summary: '先理解感受，再核对记忆', lifecycleState: 'verifying', nextLifecycleState: 'settled' }, verifier: { status: 'validated', mayInternalize: true, mayValidateOnly: false }, appliedTargets: [fact.factId], rollbackPlan: ['restore-previous-policy'] }
      const growth = createAlicizationRuntimeSelfEvolutionComposition({ now: Date.now, snapshotMetaKey: 'growth', alicizationDb: db }).selfEvolutionRuntime
      const candidate = await growth.proposeVersion({ event, patch: buildAlicizationSelfRevisionStatePatch({ event }) })
      const fixture = await seedPolicyEvaluationFixture(db)
      const owner = (await db.readLifeState()).owners.find(owner => owner.owner === 'growth')!
      const command = { cardId: 'alice', candidateId: candidate.id, expectedOwnerHash: owner.contentHash, operationId: 'pair', action: 'evaluate' as const }
      await expect(createLifePolicyDevelopmentRuntime({ ...fixture.options, gold: async () => [] }).command(command)).rejects.toThrow('human gold cases')
      await expect(fixture.create().command({ ...command, expectedOwnerHash: 'stale' })).rejects.toThrow('changed')
      await expect(createLifePolicyDevelopmentRuntime({ ...fixture.options, foregroundActive: () => true }).command(command)).rejects.toThrow('foreground work')
      fixture.generate.mockImplementation(async input => input.judge ? JSON.stringify({ identityPreserved: true, truthfulnessPreserved: false, companionshipPreserved: true, agencyPreserved: true, improved: true }) : '只说明可核验的部分。')
      await fixture.create().command(command)
      const evaluation = (await db.readLifeState()).effects[0]
      await expect(fixture.create().command({ ...command, action: 'adopt', operationId: 'adopt', expectedEvaluationHash: evaluation.id.slice('policy-evaluation:'.length) })).rejects.toThrow('passed evaluation')
      expect(await growth.getActiveCandidate()).toBeNull()
    }
    finally { await db.close(); await rm(root, { recursive: true, force: true }) }
  })
})
