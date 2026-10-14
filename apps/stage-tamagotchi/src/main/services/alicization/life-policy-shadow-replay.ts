import type { AlicizationSelfRevisionStatePatch } from './self-evolution/state-revision-bus'

import { createHash } from 'node:crypto'

import { buildOrganicMemoryEvolutionState } from './runtime-organic-memory-self-evolution-integration'

const fingerprint = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex')
type Context = Parameters<typeof buildOrganicMemoryEvolutionState>[0]

export function projectLifePolicyContext(patch: AlicizationSelfRevisionStatePatch | null, facts: Context['retrievedFacts'], producedAt: number) {
  return buildOrganicMemoryEvolutionState({ producedAt, retrievedFacts: facts, proceduralMemories: [], hostPersonModel: null, recollectionIntent: null, recollectionPlan: null, recollectionSpeechPlan: null, memoryDeliberation: null, personStateProjection: null, activeSelfRevisionPatch: patch }).selfEvolution
}

// Fixed held-out reducer cases are data, never autobiographical experiences.
// Use the same projection constructor that prepares production mind context.
export function replayLifePolicyShadow(candidate: AlicizationSelfRevisionStatePatch, baseline: AlicizationSelfRevisionStatePatch | null) {
  const cases: Array<{ id: string, facts: Context['retrievedFacts'], producedAt: number }> = [{ id: 'no-evidence', facts: [], producedAt: 1000 }, { id: 'sleep-resume', facts: [], producedAt: 1_000_000_000 }, { id: 'clock-rollback', facts: [], producedAt: 0 }]
  for (const domain of ['procedure', 'relationship', 'self-model', 'world-model'] as const) {
    for (const contradicted of [false, true]) {
      const fact = { id: `shadow:${domain}`, subject: 'shadow-fixture', predicate: domain, object: 'Held-out reducer input', confidence: 0.9, validationCount: contradicted ? 0 : 3, contradictionCount: contradicted ? 3 : 0, memoryDomain: domain, influenceTags: [], source: 'rule', validationStatus: contradicted ? 'disputed' : 'validated', knowledgeStage: contradicted ? 'working-context' : 'internalized-long-horizon-knowledge', createdAt: 0, lastAccessedAt: 0 }
      cases.push({ id: `${domain}:${contradicted ? 'contradicted' : 'validated'}`, facts: [fact] as unknown as Context['retrievedFacts'], producedAt: 1000 })
    }
  }
  const rows = cases.map((test) => {
    const project = (patch: AlicizationSelfRevisionStatePatch | null) => projectLifePolicyContext(patch, test.facts, test.producedAt)
    const before = project(baseline)
    const revised = project(candidate)
    const rollback = project(baseline)
    const numbers: number[] = []
    const collect = (value: unknown) => {
      if (typeof value === 'number')
        numbers.push(value); else if (value && typeof value === 'object')
        Object.values(value).forEach(collect)
    }
    collect(revised)
    const evidenceAllowsInternalization = test.facts.filter(fact => fact.memoryDomain === 'procedure' && (fact.validationCount ?? 0) >= 2 && (fact.contradictionCount ?? 0) === 0).length >= 2
    const groundedLearning = revised === null || !revised.shouldInternalize || evidenceAllowsInternalization
    return { id: test.id, baselineHash: fingerprint(before), candidateHash: fingerprint(revised), rollbackHash: fingerprint(rollback), finite: numbers.every(value => Number.isFinite(value) && value >= 0 && value <= 1), rollbackExact: fingerprint(before) === fingerprint(rollback), advisory: groundedLearning && (revised === null || revised.version === 'self-evolution-kernel-v1') }
  })
  return { version: 'organic-policy-shadow-replay-v1' as const, cases: rows, passed: rows.every(row => row.finite && row.rollbackExact && row.advisory) }
}
