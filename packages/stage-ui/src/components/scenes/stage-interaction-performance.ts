import type { AlicizationInteractionIntent, StageEmbodimentPerformanceState } from '@proj-alicization/stage-shared'

import { interactionEase } from '@proj-alicization/stage-shared'

/** Renderer projection only: it never writes emotion, memory, or task outcomes. */
export function projectStageInteractionPerformance(base: StageEmbodimentPerformanceState, intent: AlicizationInteractionIntent | null, context: { cardId: string, now: number, playbackNow: number, paused: boolean, taskActive: boolean, viewport?: { left: number, top: number, width: number, height: number } }) {
  if (!intent || context.paused || (context.taskActive && !intent.target) || intent.cardId !== context.cardId || intent.createdAt > context.now + 100 || intent.expiresAt <= context.now || base.phase === 'idle')
    return base
  if (base.performance.residentMode === 'repair-before-closeness' || base.residentReasonTags.includes('rest-protective'))
    return base
  if (base.phase === 'speaking') {
    const script = base.activeSegment?.metadata?.embodimentScript as { turnId?: string, state?: { interactionIntent?: { cardId?: string } } } | undefined
    if (script?.turnId !== intent.turnId || script.state?.interactionIntent?.cardId !== intent.cardId)
      return base
  }
  // Admission uses epoch time; the existing playback runtime uses performance.now().
  const onset = base.speakingStartedAt ?? base.armedAt ?? context.playbackNow
  const age = Math.max(0, context.playbackNow - onset)
  const release = base.phase === 'cooldown' ? 1 - interactionEase(1 - Math.max(0, (base.cooldownUntil ?? context.playbackNow) - context.playbackNow) / 720) : 1
  const strength = intent.confidence * release * (base.phase === 'armed' ? 0.35 : 1)
  // Eyes orient before the head and torso. Holding preserves the intention;
  // the playback lifecycle, rather than a second action timer, releases it.
  const eyes = interactionEase(age / 220) * strength
  const head = interactionEase((age - 100) / 400) * strength
  const body = interactionEase((age - 200) / 600) * strength
  const inward = intent.attention === 'inward' || intent.purpose === 'clarify'
  const care = intent.purpose === 'care' || intent.purpose === 'repair'
  const deferring = intent.purpose === 'defer'
  const target = intent.target && context.now - intent.target.observedAt <= 30000 && context.viewport ? intent.target : null
  const viewport = context.viewport
  const targetYaw = target && viewport ? Math.max(-1, Math.min(1, (target.screenX - viewport.left - viewport.width / 2) / Math.max(1, viewport.width / 2))) : 0
  const targetPitch = target && viewport ? Math.max(-1, Math.min(1, (viewport.top + viewport.height / 2 - target.screenY) / Math.max(1, viewport.height / 2))) : 0
  const add = (value: number, delta: number) => Math.max(-1, Math.min(1, value + delta))
  return { ...base, motor: { ...base.motor, gaze: { ...base.motor.gaze, azimuth: add(base.motor.gaze.azimuth, target ? eyes * targetYaw * 0.55 : inward ? eyes * 0.18 : intent.attention === 'shared-task' ? eyes * 0.1 : 0), elevation: add(base.motor.gaze.elevation, target ? eyes * targetPitch * 0.3 : inward ? -eyes * 0.12 : 0), focus: Math.min(1, base.motor.gaze.focus + (care ? eyes * 0.16 : 0)) }, head: { ...base.motor.head, yaw: add(base.motor.head.yaw, target ? head * targetYaw * 0.35 : inward ? head * 0.16 : 0), pitch: add(base.motor.head.pitch, inward ? head * 0.1 : care ? head * 0.07 : 0), roll: add(base.motor.head.roll, care ? -head * 0.07 : 0) }, body: { ...base.motor.body, lean: add(base.motor.body.lean, deferring ? -body * 0.07 : care ? body * 0.13 : 0), openness: Math.min(1, Math.max(0, base.motor.body.openness + (intent.purpose === 'guide' ? body * 0.18 : deferring ? -body * 0.08 : 0))) } } }
}
