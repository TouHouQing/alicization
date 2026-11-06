import type { PersonaTrainingDatasetExample } from './persona-training-dataset-runtime'

/** Local behavior review is independent of permission to train model weights. */
export function isLifeBehaviorExampleEligible(example: PersonaTrainingDatasetExample) {
  const consentOnlyQuarantine = example.state === 'quarantined'
    && ['source consent is not granted', 'source consent does not match dataset policy'].includes(example.piiReason ?? '')
  return (example.state === 'staged' || consentOnlyQuarantine)
    && example.piiStatus === 'clear'
    && ['public', 'personal'].includes(example.sensitivity)
    && example.provenance?.kind === 'working-memory-cleaning'
    && Boolean(example.provenance.cleaningTransactionId.trim())
    && ['cleaned-long-term-reflection', 'persona-reinforcement'].includes(example.sourceKind)
    && Boolean(example.behaviorLesson.trim() && example.positiveExample.trim())
}
