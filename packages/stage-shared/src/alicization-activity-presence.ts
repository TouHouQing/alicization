/** Read-only body projection of the desktop's authoritative task and goal. */
export interface AlicizationActivityPresence {
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
