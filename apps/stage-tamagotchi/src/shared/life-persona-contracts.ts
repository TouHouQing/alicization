export interface LifePersonaEvaluation {
  format: 'persona-paired-evaluation-v1'
  proposalId: string
  baseHash: string
  targetHash: string
  examples: Array<{ id: string, contentHash: string, sourceId: string, sourceKind: 'cleaned-long-term-reflection' | 'persona-reinforcement' }>
  pairs: Array<{ scenario: string, baseline: string, candidate: string, identityPreserved: boolean, truthfulnessPreserved: boolean, companionshipPreserved: boolean, agencyPreserved: boolean, improved: boolean }>
  reviewedBy: 'human' | null
  approved: boolean
}
export interface LifePersonaCommand {
  cardId: string
  proposalId: string
  operationId: string
  expectedTargetHash: string
  action: 'evaluate' | 'approve' | 'reject' | 'adopt' | 'rollback'
  expectedEvaluationHash?: string
}
