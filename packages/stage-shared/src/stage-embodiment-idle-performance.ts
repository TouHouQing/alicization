import type { StageEmbodimentPresencePostureMode } from './stage-embodiment-presence-posture'

export interface StageEmbodimentIdleMotionPreference {
  mode: StageEmbodimentPresencePostureMode
  confidence: number
  actionKey: string
  motionName: string
  motionIndex: number
}
