export interface LifePolicyShadowReplay {
  version: 'organic-policy-shadow-replay-v1'
  passed: boolean
  cases: Array<{ id: string, baselineHash: string, candidateHash: string, rollbackHash: string, finite: boolean, rollbackExact: boolean, advisory: boolean }>
}
export interface LifePolicyEvaluation {
  format: 'policy-paired-evaluation-v1'
  candidateId: string
  candidateHash: string
  baseOwnerHash: string
  shadowReplay: LifePolicyShadowReplay
  contextEvidence: import('./life-contracts').LifeEvidenceRef[]
  examples: import('./life-persona-contracts').LifePersonaEvaluation['examples']
  pairs: Array<import('./life-persona-contracts').LifePersonaEvaluation['pairs'][number] & { goldId: string, goldHash: string }>
}
export interface LifePolicyCommand {
  cardId: string
  candidateId: string
  expectedOwnerHash: string
  operationId: string
  action: 'evaluate' | 'adopt'
  expectedEvaluationHash?: string
}
