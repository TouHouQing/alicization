/** Read-only body projection of the desktop's authoritative task and goal. */
export interface AlicizationWorkAttentionTarget {
  space: 'screen-dip'
  x: number
  y: number
  display: { x: number, y: number, width: number, height: number }
  observationId: string
  observedAt: number
  expiresAt: number
}

export interface AlicizationActivityPresence {
  work?: { mode: 'reading' | 'comparing' | 'acting' | 'waiting' | 'checking', causeId: string, source: 'execution-effect' | 'work-step-ledger', target?: AlicizationWorkAttentionTarget }
  id: string
  attemptId: string
  kind: 'execution' | 'personal-project' | 'daily-life'
  behavior?: 'rest' | 'stretch'
  posture?: 'stand' | 'sit' | 'lie' | 'sleep' | 'work'
  phase: 'orienting' | 'working' | 'verifying' | 'blocked' | 'finished' | 'interrupted' | 'failed'
  phaseStartedAt: number
  observedAt: number
  sequence: number
}
