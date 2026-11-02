export type ExecutionPredicate
  = | { kind: 'file-bytes', path: string, sha256: string }
    | { kind: 'file-matches-read', path: string, stepId: string }
    | { kind: 'browser-download', stepId: string, minimumBytes: number, sha256?: string }
    | { kind: 'json-structure', path: string, requiredKeys: string[] }
    | { kind: 'text-content', path: string, includes: string[] }
    | { kind: 'directory-members', path: string, names: string[], exact: boolean }
    | { kind: 'setting', key: string, expected: string }
    | { kind: 'interface-state', channel: 'browser' | 'desktop', targetId: string, contentHash: string, expectedValue: string }
    | { kind: 'external-receipt', recipeId: string, targetHash: string }
    | { kind: 'quality-review', rubricId: string, artifactIds: string[] }
    | { kind: 'user-review', question: string, artifactIds: string[] }

export interface ExecutionCriterion {
  id: string
  required: boolean
  predicate: ExecutionPredicate
  proofScope: 'bytes' | 'structure' | 'displayed-state' | 'external-state' | 'quality' | 'user-reported'
}

export interface TaskAcceptance {
  version: 1
  cardId: string
  rootObligationId: string
  obligationGeneration: number
  revision: number
  sourceInputIds: string[]
  criteria: ExecutionCriterion[]
  permittedResourceIds: string[]
  permittedEffectPolicyId: string
  stopConditions: string[]
  contractHash: string
}

export interface WorkStep {
  id: string
  dependsOn: string[]
  capabilityId: string
  input: Record<string, unknown>
  inputHash: string
  inputBindings?: WorkInputBinding[]
  /** A resumed native read must retain the exact previously observed window. */
  nativeWindowSourceStepId?: string
  acceptanceCriterionIds: string[]
  resourceIds: string[]
  retryMode: 'read-only' | 'reconcile-first' | 'manual-only'
  state: 'pending' | 'running' | 'awaiting-verification' | 'verified' | 'waiting' | 'blocked' | 'cancelled'
  attemptId: string | null
}

export interface WorkInputBinding {
  parameter: string
  stepId: string
  path: string[]
  select?: { field: string, equals: string, valueField: string }
}

export interface BrowserWorkBinding { kind: 'managed' | 'authorized-page', id: string }

export interface WorkPlan {
  id: string
  cardId: string
  rootThreadId: string
  rootObligationId: string
  obligationGeneration: number
  revision: number
  acceptanceHash: string
  steps: WorkStep[]
  sourceEvidenceRefs: string[]
  browserBinding?: BrowserWorkBinding
  readRepairPolicy?: 'grounded-read-v1'
}

export interface WorkSlice {
  id: string
  planId: string
  planRevision: number
  rootObligationId: string
  obligationGeneration: number
  ingressId: string
  state: 'ready' | 'running' | 'yielded' | 'waiting' | 'stopping' | 'stopped'
  cursor: number
  budget: number
  attemptId: string
  updatedAt: number
}

export interface WorkStepResult {
  planId: string
  planRevision: number
  stepId: string
  attemptId: string
  inputHash: string
  effectId: string | null
  observationRefs: string[]
  output: Record<string, unknown>
  state: WorkStep['state']
  createdAt: number
}

export interface ExecutionStateView {
  contracts: TaskAcceptance[]
  plans: WorkPlan[]
  slices: WorkSlice[]
  results: WorkStepResult[]
}

export interface ExecutionWorkProposal {
  goal: string
  criteria: ExecutionCriterion[]
  steps: Array<{ id: string, dependsOn: string[], capabilityId: string, input: Record<string, unknown>, inputBindings?: WorkInputBinding[], acceptanceCriterionIds: string[] }>
}

export interface ExecutionWorkStepEdit { stepId: string, changes: Record<string, string> }

export type ExecutionWorkGraphChange
  = | { kind: 'insert-after', stepId: string, templateStepId: string, afterStepId: string }
    | { kind: 'remove', stepId: string }
    | { kind: 'dependencies', stepId: string, dependsOn: string[] }

export interface ExecutionCriteriaChange {
  cardId: string
  planId: string
  expectedRevision: number
  expectedGeneration: number
  contractHash: string
  criteria: ExecutionCriterion[]
  stepChanges?: ExecutionWorkStepEdit[]
  graphChanges?: ExecutionWorkGraphChange[]
  requestId: string
}

export interface ExecutionWorkStop {
  cardId: string
  planId: string
  expectedRevision: number
  requestId: string
  action: 'pause' | 'cancel'
}
