export type StageEmbodimentPresencePostureMode = 'idle' | 'attentive' | 'inspection' | 'hesitant' | 'concerned'

export interface StageEmbodimentPresencePostureState {
  engaged: boolean
  mode: StageEmbodimentPresencePostureMode
  confidence: number
  bodyYaw: number
  bodyPitch: number
  breathBoost: number
  gazeStability: number
}

export function createIdleStageEmbodimentPresencePostureState(): StageEmbodimentPresencePostureState {
  return {
    engaged: false,
    mode: 'idle',
    confidence: 0,
    bodyYaw: 0,
    bodyPitch: 0,
    breathBoost: 0,
    gazeStability: 0.32,
  }
}
