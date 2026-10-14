/** Observed render-loop evidence; desktop alone decides whether life activity completed. */
export interface AlicizationBodyActivityReceipt {
  cardId: string
  activityId: string
  activitySequence: number
  modelId: string
  renderer: 'vrm' | 'live2d'
  state: 'started' | 'completed' | 'interrupted' | 'unsupported' | 'hidden'
  observedFrames: number
  observedMs: number
  movementRadians: number
  cue: string
  visiblePixels: boolean
  motionCompleted: boolean
  occurredAt: number
}

export interface AlicizationBodyFrame {
  serial: number
  renderedAt: number
  elapsedMs: number
  modelId: string
  cue: string | null
  motionOwnerId: string | null
  completedMotion?: { id: string, cue: string }
  rotations: number[][]
}
