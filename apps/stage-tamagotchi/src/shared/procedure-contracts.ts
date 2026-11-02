export type ProcedureCommand
  = { cardId: string, action: 'list' }
    | { cardId: string, action: 'cancel-evaluation' }
    | { cardId: string, action: 'evaluate', candidateId: string, baselineCandidateId?: string }
    | { cardId: string, action: 'activate' | 'revoke' | 'rollback', id: string, version: string }

export interface ProcedureRepairNotice {
  reason: 'acceptance-not-satisfied'
  sourceThreadId: string
  sourcePlanId: string
  verificationId: string
  evidenceHash: string
  observedAt: number
}

export interface ProcedureSummary {
  candidateId: string
  id: string
  version: string
  operations: string[]
  parameters: Array<{ name: string, kind: string, role: string }>
  sourceThreadId: string
  sourceValid: boolean
  comparisonFamily?: string
  evaluation: { status: 'passed' | 'failed', cases: Array<{ name: string, passed: boolean, evidenceHash: string }>, completedAt: number, comparison?: { baselineCandidateId: string, baselineHash: string, verdict: 'improved' | 'non-regressing' | 'regressed' | 'incomparable', baseline: ProcedurePerformanceSample[], candidate: ProcedurePerformanceSample[] }, comparisonFailure?: string } | null
  status: 'candidate' | 'active' | 'rolled-back' | 'revoked'
  evaluating: boolean
  repair?: ProcedureRepairNotice | null
}
export interface ProcedureCommandResult { status: string, items: ProcedureSummary[] }

export interface ProcedurePerformanceSample { inputHash: string, fulfilled: boolean, operations: number, rework: number, approvals: number, elapsedMs: number }
