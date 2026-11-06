import type { PersonaTrainingDatasetExample } from './persona-training-dataset-runtime'

import { describe, expect, it } from 'vitest'

import { isLifeBehaviorExampleEligible } from './life-behavior-example-policy'

const example: PersonaTrainingDatasetExample = { id: 'example', cardId: 'alice', datasetId: 'cleaned', schemaVersion: 'persona-training-example-v1', sourceId: 'reflection', sourceKind: 'cleaned-long-term-reflection', contentHash: 'a'.repeat(64), behaviorLesson: 'A reviewed local lesson.', positiveExample: 'A grounded example.', negativeExample: null, sensitivity: 'public', piiStatus: 'clear', piiReason: 'source consent is not granted', consentSnapshot: { granted: false, policyVersion: 'v1', scope: 'training' }, provenance: { kind: 'working-memory-cleaning', cleaningTransactionId: 'cleaning', cleanedAt: 1 }, allowTraining: false, state: 'quarantined', createdAt: 1 }

describe('local behavior eligibility', () => {
  it('does not require model-weight training consent', () => expect(isLifeBehaviorExampleEligible(example)).toBe(true))
  it.each([
    { state: 'revoked' as const },
    { piiStatus: 'detected' as const },
    { sensitivity: 'secret' },
    { piiReason: 'fixed-template residue detected' },
    { provenance: null },
    { behaviorLesson: '' },
  ])('keeps revoked, sensitive, contaminated and unsourced samples out: %j', patch => expect(isLifeBehaviorExampleEligible({ ...example, ...patch })).toBe(false))
})
