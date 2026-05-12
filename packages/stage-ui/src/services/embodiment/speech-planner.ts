import type {
  AlicizationDialogueSpeechTimeline,
  AlicizationDigitalLifeEnvelope,
  AlicizationEmbodimentSpeechPlan,
  AlicizationEmbodimentSpeechSegment,
} from '@proj-alicization/stage-shared'

interface BuildAlicizationEmbodimentSpeechPlanInput {
  turnId: string
  replyText: string
  speechTimeline: AlicizationDialogueSpeechTimeline | null
  digitalLife: AlicizationDigitalLifeEnvelope | null
}

function clampNonNegativeInteger(value: number, fallback = 0) {
  if (!Number.isFinite(value))
    return fallback

  return Math.max(0, Math.round(value))
}

function resolveInterruptPolicy(
  interruptMode: AlicizationDialogueSpeechTimeline['segments'][number]['interruptMode'] | undefined,
): AlicizationEmbodimentSpeechSegment['interruptPolicy'] {
  return interruptMode === 'continue' || interruptMode === 'soft-interrupt'
    ? 'soft-settle'
    : 'hard-stop'
}

function resolveSegmentSettleMs(input: {
  timelineSettleMs: number
  frameSettleMs: number
  candidateHoldMs: number
  candidateSettleMode: AlicizationDialogueSpeechTimeline['segments'][number]['settleMode'] | undefined
}) {
  const baseSettleMs = Math.max(
    input.timelineSettleMs,
    input.frameSettleMs,
    input.candidateHoldMs,
    120,
  )

  switch (input.candidateSettleMode) {
    case 'hold':
      return clampNonNegativeInteger(baseSettleMs + 40, 160)
    case 'linger':
      return clampNonNegativeInteger(baseSettleMs + 120, 220)
    case 'release':
    default:
      return clampNonNegativeInteger(baseSettleMs, 140)
  }
}

function buildSpeechPlanSegment(input: {
  segment: AlicizationDialogueSpeechTimeline['segments'][number]
  frame: AlicizationDigitalLifeEnvelope['frames'][number] | null
  timelineSettleMs: number
}) {
  const interruptPolicy = resolveInterruptPolicy(input.segment.interruptMode)
  const candidateHoldMs = Math.max(
    input.segment.actionHoldMs ?? 0,
    input.segment.emotionHoldMs ?? 0,
    input.segment.facialHoldMs ?? 0,
  )
  const frameSettleMs = Math.max(
    input.frame?.lipSync.continuityHoldMs ?? 0,
    input.frame?.face.holdMs ?? 0,
    input.frame?.action.holdMs ?? 0,
  )

  return {
    id: input.segment.id,
    index: input.segment.index,
    text: input.segment.text,
    interruptPolicy,
    preRollMs: clampNonNegativeInteger(
      input.segment.actionWindow === 'segment-start'
        ? 40
        : input.segment.actionWindow === 'cadence-peak'
          ? 20
          : 0,
    ),
    settleMs: resolveSegmentSettleMs({
      timelineSettleMs: input.timelineSettleMs,
      frameSettleMs,
      candidateHoldMs,
      candidateSettleMode: input.segment.settleMode,
    }),
  } satisfies AlicizationEmbodimentSpeechSegment
}

export function buildAlicizationEmbodimentSpeechPlan(
  input: BuildAlicizationEmbodimentSpeechPlanInput,
): AlicizationEmbodimentSpeechPlan {
  const fallbackText = input.replyText.trim() || input.speechTimeline?.reply.trim() || input.turnId
  const timelineSegments = input.speechTimeline?.segments ?? []
  const frameById = new Map((input.digitalLife?.frames ?? []).map(frame => [frame.id, frame] as const))
  const timelineSettleMs = Math.max(
    input.digitalLife?.frames.reduce((max, frame) => {
      return Math.max(max, frame.lipSync.continuityHoldMs, frame.face.holdMs, frame.action.holdMs)
    }, 0) ?? 0,
    160,
  )

  const segments = timelineSegments.length > 0
    ? timelineSegments.map(segment => buildSpeechPlanSegment({
        segment,
        frame: frameById.get(segment.id) ?? null,
        timelineSettleMs,
      }))
    : [{
        id: `${input.turnId}-segment-0`,
        index: 0,
        text: fallbackText,
        interruptPolicy: 'hard-stop',
        preRollMs: 0,
        settleMs: timelineSettleMs,
      } satisfies AlicizationEmbodimentSpeechSegment]

  const interruptPolicy = segments.some(segment => segment.interruptPolicy === 'hard-stop')
    ? 'hard-stop'
    : 'soft-settle'
  const preRollMs = segments.reduce((max, segment) => Math.max(max, segment.preRollMs), 0)
  const settleMs = segments.reduce((max, segment) => Math.max(max, segment.settleMs), timelineSettleMs)

  return {
    segments,
    interruptPolicy,
    preRollMs,
    settleMs,
  }
}
