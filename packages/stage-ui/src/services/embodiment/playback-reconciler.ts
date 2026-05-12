import type { AlicizationEmbodimentScriptV1 } from '@proj-alicization/stage-shared'
import type { Live2DFaceDriverState } from '../../components/scenes/drivers/live2d-face-driver'
import type { Live2DLipSyncDriverState } from '../../components/scenes/drivers/live2d-lipsync-driver'
import type { Live2DMotionDriverState } from '../../components/scenes/drivers/live2d-motion-driver'

export interface EmbodimentPlaybackDriverTelemetry {
  face: Live2DFaceDriverState | null
  lipsync: Live2DLipSyncDriverState | null
  motion: Live2DMotionDriverState | null
}

export interface ReconcileEmbodimentPlaybackInput {
  actualDurationMs: number | null | undefined
  plannedDurationMs: number | null | undefined
  script: AlicizationEmbodimentScriptV1 | null | undefined
  stopReason: string | null | undefined
}

export interface EmbodimentPlaybackReconciliation {
  actualDurationMs: number
  driftMs: number
  plannedDurationMs: number
  settleMs: number
  stopReason: string | null
}

export interface EmbodimentPlaybackTelemetry extends EmbodimentPlaybackReconciliation {
  drivers: EmbodimentPlaybackDriverTelemetry
}

function normalizeDurationMs(value: number | null | undefined) {
  if (!Number.isFinite(value))
    return 0

  return Math.max(0, Math.round(Number(value)))
}

function shouldExtendSettleWindow(stopReason: string | null | undefined) {
  return stopReason == null || stopReason === 'ended'
}

export function reconcileEmbodimentPlayback(
  input: ReconcileEmbodimentPlaybackInput,
): EmbodimentPlaybackReconciliation {
  const plannedDurationMs = normalizeDurationMs(input.plannedDurationMs)
  const actualDurationMs = normalizeDurationMs(input.actualDurationMs)
  const driftMs = actualDurationMs - plannedDurationMs
  const baseSettleMs = normalizeDurationMs(input.script?.speechPlan.settleMs)
  const settleMs = shouldExtendSettleWindow(input.stopReason)
    ? Math.max(baseSettleMs, baseSettleMs + Math.max(0, driftMs))
    : baseSettleMs

  return {
    actualDurationMs,
    driftMs,
    plannedDurationMs,
    settleMs,
    stopReason: input.stopReason ?? null,
  }
}
