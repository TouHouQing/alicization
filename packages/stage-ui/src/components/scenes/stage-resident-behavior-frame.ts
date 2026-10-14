import type { StageEmbodimentPerformanceState } from '@proj-alicization/stage-shared'

export interface StageResidentBehaviorFrame {
  cardId: string
  observedAt: number
  mode: 'accompany' | 'listening' | 'thinking' | 'speaking' | 'settling'
  headYaw: number
  headPitch: number
  headRoll: number
  bodySway: number
  bodyLean: number
  gazeAzimuth: number
  gazeElevation: number
  breathScale: number
}

const bounded = (value: number, limit: number) => Number.isFinite(value) ? Math.max(-limit, Math.min(limit, value)) : 0

/** A desktop presentation layer; emotion, speech and task authority stay intact. */
export function projectStageResidentBehavior(base: StageEmbodimentPerformanceState, frame: StageResidentBehaviorFrame | null | undefined, context: { cardId: string, now: number, paused: boolean, taskActive: boolean, speaking: boolean }) {
  if (!frame || !Number.isFinite(frame.observedAt) || context.paused || context.taskActive || context.speaking || frame.cardId !== context.cardId || context.now - frame.observedAt > 500 || frame.observedAt > context.now + 100 || base.phase !== 'idle' || base.activeCue)
    return base
  const restrained = ['angry', 'sad', 'tired', 'apologetic', 'concerned'].includes(base.performance.baseEmotion)
  const strength = restrained ? 0.45 : 1
  const signed = (original: number, offset: number, limit: number) => bounded(original + bounded(offset, limit) * strength, 1)
  return { ...base, motor: {
    ...base.motor,
    head: { ...base.motor.head, yaw: signed(base.motor.head.yaw, frame.headYaw, 0.18), pitch: signed(base.motor.head.pitch, frame.headPitch, 0.16), roll: signed(base.motor.head.roll, frame.headRoll, 0.12) },
    body: { ...base.motor.body, sway: signed(base.motor.body.sway, frame.bodySway, 0.14), lean: signed(base.motor.body.lean, frame.bodyLean, 0.12) },
    gaze: { ...base.motor.gaze, azimuth: signed(base.motor.gaze.azimuth, frame.gazeAzimuth, 0.3), elevation: signed(base.motor.gaze.elevation, frame.gazeElevation, 0.2) },
    breath: { ...base.motor.breath, amplitude: Math.max(0, Math.min(1, base.motor.breath.amplitude * (1 + bounded(frame.breathScale - 1, 0.15) * strength))) },
  } }
}
