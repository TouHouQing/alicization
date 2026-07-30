import type {
  AlicizationDialoguePerformancePayload,
  AlicizationEmotion,
  AlicizationPerformanceDelivery,
  CharacterPerformanceCapabilitiesManifest,
} from './alicization-performance-contracts'
import type { StageEmbodimentPresencePostureMode } from './stage-embodiment-presence-posture'
import type { StageEmbodimentSpeechStyleProfile } from './stage-embodiment-profile'

import {
  normalizeAlicizationEmotion,
  normalizeAlicizationPerformancePayload,
} from './alicization-performance-contracts'
import {
  resolveStageEmbodimentCueCandidates,
  resolveStageEmbodimentLive2DExpressionAliases,
  resolveStageEmbodimentLive2DMotionAliases,
  resolveStageEmbodimentSpeechStyle,
  resolveStageEmbodimentVrmBaseExpressionCandidates,
} from './stage-embodiment-profile'

export interface AlicizationDialogueEmbodimentGovernanceLike {
  answerAct?: string | null
  answerSubject?: string | null
  embodiedPresence?: string | null
  repairState?: string | null
  screenReferenceMode?: string | null
  decisionTraceId?: string | null
  mindTurnFrame?: {
    obligation?: {
      openingMove?: string | null
    } | null
    self?: {
      embodiedPresence?: string | null
      emotionalTension?: string | null
    } | null
  } | null
  turnMode?: string | null
}

export interface AlicizationDialogueEmbodimentPreviousState {
  actionCue?: string | null
  delivery?: AlicizationPerformanceDelivery | string | null
  emotion?: AlicizationEmotion | string | null
  facialCue?: string | null
  variationToken?: string | null
}

export interface AlicizationDialogueEmbodimentEnvelope {
  emotion: AlicizationEmotion
  performance: AlicizationDialoguePerformancePayload
  postureHint: StageEmbodimentPresencePostureMode
  speechStyle: StageEmbodimentSpeechStyleProfile
  rendererHints?: AlicizationDialogueEmbodimentRendererHints | null
  variationToken: string
}

export interface AlicizationDialogueEmbodimentRendererHints {
  preferredExpressionAliases?: readonly string[]
  preferredMotionAliases?: readonly string[]
  preferredGazeMode?: 'steady' | 'soften' | 'drift'
  preferredBlinkCadence?: 'normal' | 'linger' | 'quiet'
  preferredPauseMode?: 'longer' | 'natural'
  preferredLipsyncMode?: 'restrained' | 'matched'
  preferredVoiceMode?: 'lower-pressure' | 'even'
  preferredPacingMode?: 'slower' | 'natural'
  residentMode?: string
  reasonTags?: readonly string[]
  signature?: string
}

export interface ResolveAlicizationDialogueEmbodimentInput {
  candidateEmotion?: string
  candidatePerformance?: AlicizationDialoguePerformancePayload | null
  governance?: AlicizationDialogueEmbodimentGovernanceLike | null
  performanceManifest?: CharacterPerformanceCapabilitiesManifest | null
  previous?: AlicizationDialogueEmbodimentPreviousState | null
  reply: string
  thought?: string
  turnId?: string
}

interface DialogueEncounterSnapshot {
  apologySignal: boolean
  careSignal: boolean
  energeticSignal: boolean
  firmSignal: boolean
  questionSignal: boolean
  teasingSignal: boolean
  uncertaintySignal: boolean
}

const deliveryPitchAdjustments: Record<AlicizationPerformanceDelivery, number> = {
  calm: 0,
  gentle: 2,
  firm: -2,
  energetic: 4,
  hesitant: -2,
  teasing: 3,
}

const deliveryRateAdjustments: Record<AlicizationPerformanceDelivery, number> = {
  calm: 1,
  gentle: 0.96,
  firm: 1.05,
  energetic: 1.08,
  hesitant: 0.93,
  teasing: 1.03,
}

function clampPitchDelta(value: number) {
  if (!Number.isFinite(value))
    return 0

  return Math.max(-50, Math.min(50, Math.round(value)))
}

function clampRateMultiplier(value: number) {
  if (!Number.isFinite(value))
    return 1

  return Math.max(0.5, Math.min(2, Number(value.toFixed(2))))
}

function clampVariationToken(raw: unknown) {
  if (typeof raw !== 'string')
    return ''

  return raw.trim().slice(0, 256)
}

function hashTextSeed(text: string) {
  let hash = 0
  for (let index = 0; index < text.length; index += 1)
    hash = (hash * 31 + text.charCodeAt(index)) >>> 0
  return hash
}

function normalizeCue(raw: unknown) {
  if (typeof raw !== 'string')
    return null

  const normalized = raw.trim()
  return normalized || null
}

function dedupeCues(cues: Array<string | null | undefined>) {
  const deduped: string[] = []
  const seen = new Set<string>()
  for (const cue of cues) {
    if (!cue)
      continue
    const normalized = cue.trim()
    if (!normalized || seen.has(normalized))
      continue
    seen.add(normalized)
    deduped.push(normalized)
  }
  return deduped
}

function normalizeRendererHintAliases(raw: unknown) {
  if (!Array.isArray(raw))
    return []

  return dedupeCues(raw)
}

function shouldPreserveExplicitRendererActionCue(input: {
  candidatePerformance?: AlicizationDialoguePerformancePayload | null
  performanceManifest?: CharacterPerformanceCapabilitiesManifest | null
  previous?: AlicizationDialogueEmbodimentPreviousState | null
}) {
  const explicitCue = normalizeCue(input.candidatePerformance?.actionCue)
  if (!explicitCue)
    return false

  if (input.performanceManifest?.renderer !== 'vrm')
    return false

  const supportedActionKeys = new Set((input.performanceManifest?.supportedActions ?? []).map(item => item.key))
  if (!supportedActionKeys.has(explicitCue))
    return false

  if (normalizeCue(input.previous?.actionCue) === explicitCue)
    return true

  return false
}

function normalizeEmbodimentRendererHints(raw: unknown): AlicizationDialogueEmbodimentRendererHints | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null

  const candidate = raw as Record<string, unknown>
  const preferredExpressionAliases = normalizeRendererHintAliases(candidate.preferredExpressionAliases)
  const preferredMotionAliases = normalizeRendererHintAliases(candidate.preferredMotionAliases)
  const preferredGazeMode = candidate.preferredGazeMode === 'steady'
    || candidate.preferredGazeMode === 'soften'
    || candidate.preferredGazeMode === 'drift'
    ? candidate.preferredGazeMode
    : undefined
  const preferredBlinkCadence = candidate.preferredBlinkCadence === 'normal'
    || candidate.preferredBlinkCadence === 'linger'
    || candidate.preferredBlinkCadence === 'quiet'
    ? candidate.preferredBlinkCadence
    : undefined
  const preferredPauseMode = candidate.preferredPauseMode === 'longer'
    || candidate.preferredPauseMode === 'natural'
    ? candidate.preferredPauseMode
    : undefined
  const preferredLipsyncMode = candidate.preferredLipsyncMode === 'restrained'
    || candidate.preferredLipsyncMode === 'matched'
    ? candidate.preferredLipsyncMode
    : undefined
  const preferredVoiceMode = candidate.preferredVoiceMode === 'lower-pressure'
    || candidate.preferredVoiceMode === 'even'
    ? candidate.preferredVoiceMode
    : undefined
  const preferredPacingMode = candidate.preferredPacingMode === 'slower'
    || candidate.preferredPacingMode === 'natural'
    ? candidate.preferredPacingMode
    : undefined
  const residentMode = typeof candidate.residentMode === 'string' && candidate.residentMode.trim()
    ? candidate.residentMode.trim()
    : undefined
  const reasonTags = normalizeRendererHintAliases(candidate.reasonTags)
  const signature = typeof candidate.signature === 'string' && candidate.signature.trim()
    ? candidate.signature.trim()
    : undefined
  if (
    preferredExpressionAliases.length === 0
    && preferredMotionAliases.length === 0
    && !preferredGazeMode
    && !preferredBlinkCadence
    && !preferredPauseMode
    && !preferredLipsyncMode
    && !preferredVoiceMode
    && !preferredPacingMode
    && !residentMode
    && reasonTags.length === 0
    && !signature
  ) {
    return null
  }

  return {
    preferredExpressionAliases: preferredExpressionAliases.length > 0 ? preferredExpressionAliases : undefined,
    preferredMotionAliases: preferredMotionAliases.length > 0 ? preferredMotionAliases : undefined,
    preferredGazeMode,
    preferredBlinkCadence,
    preferredPauseMode,
    preferredLipsyncMode,
    preferredVoiceMode,
    preferredPacingMode,
    reasonTags: reasonTags.length > 0 ? reasonTags : undefined,
    residentMode,
    signature,
  }
}

function selectCueWithVariation(input: {
  candidates: string[]
  previousCue?: string | null
  variationToken: string
}) {
  if (input.candidates.length === 0)
    return null

  const normalizedPreviousCue = normalizeCue(input.previousCue)
  const pool = normalizedPreviousCue && input.candidates.length > 1
    ? input.candidates.filter(candidate => candidate !== normalizedPreviousCue)
    : input.candidates
  const resolvedPool = pool.length > 0 ? pool : input.candidates
  const seed = hashTextSeed(`${input.variationToken}:${resolvedPool.join('|')}`)
  const index = seed % resolvedPool.length
  return resolvedPool[index] ?? resolvedPool[0] ?? null
}

function inferEncounter(input: {
  reply: string
}): DialogueEncounterSnapshot {
  const reply = input.reply
  const normalizedReply = reply.toLowerCase()

  return {
    apologySignal: /抱歉|对不起|不好意思|sorry|apolog/i.test(reply),
    careSignal: /别急|慢慢|先休息|照顾|没关系|take it easy|rest|care/i.test(reply),
    firmSignal: /必须|立刻|马上|务必|stop|must|need to/i.test(reply),
    energeticSignal: /[!！]{2,}|太好了|真棒|awesome|great|wow/i.test(reply),
    uncertaintySignal: /也许|可能|不确定|我想|我觉得|maybe|perhaps|i think/i.test(reply),
    questionSignal: /[?？]/.test(reply),
    teasingSignal: /哼|逗你|坏笑|tease|playful/i.test(normalizedReply),
  }
}

function resolveBaseEmotion(input: {
  candidateEmotion?: string
  encounter: DialogueEncounterSnapshot
  previousEmotion?: string | null
}): AlicizationEmotion {
  const candidateEmotion = normalizeAlicizationEmotion(input.candidateEmotion).emotion
  const previousEmotion = normalizeAlicizationEmotion(input.previousEmotion ?? 'neutral').emotion
  const encounter = input.encounter
  let resolved = candidateEmotion

  if (encounter.apologySignal)
    resolved = 'apologetic'
  else if (encounter.firmSignal)
    resolved = 'angry'
  else if (encounter.careSignal)
    resolved = 'concerned'
  else if (encounter.uncertaintySignal || encounter.questionSignal)
    resolved = 'thinking'
  else if (encounter.energeticSignal)
    resolved = 'happy'

  if (
    candidateEmotion === 'concerned'
    && resolved === 'thinking'
    && !encounter.apologySignal
    && !encounter.firmSignal
    && !encounter.energeticSignal
  ) {
    resolved = 'concerned'
  }

  const strongSignal
    = encounter.apologySignal
      || encounter.firmSignal
      || encounter.careSignal
      || encounter.energeticSignal
      || encounter.questionSignal

  if (!strongSignal && resolved === previousEmotion) {
    if (resolved === 'neutral')
      resolved = 'thinking'
    else if (resolved === 'thinking')
      resolved = 'concerned'
    else if (resolved === 'concerned')
      resolved = 'neutral'
  }

  return normalizeAlicizationEmotion(resolved).emotion
}

function resolveDelivery(input: {
  encounter: DialogueEncounterSnapshot
  emotion: AlicizationEmotion
  previousDelivery?: string | null
}): AlicizationPerformanceDelivery {
  const previousDelivery = input.previousDelivery?.trim().toLowerCase() ?? ''
  const encounter = input.encounter
  let resolved: AlicizationPerformanceDelivery = 'calm'

  if (encounter.teasingSignal)
    resolved = 'teasing'
  else if (encounter.firmSignal)
    resolved = 'firm'
  else if (encounter.careSignal || input.emotion === 'concerned' || input.emotion === 'apologetic')
    resolved = 'gentle'
  else if (encounter.energeticSignal || input.emotion === 'happy' || input.emotion === 'surprised')
    resolved = 'energetic'
  else if (encounter.uncertaintySignal || input.emotion === 'thinking')
    resolved = 'hesitant'

  if (previousDelivery === resolved) {
    if (resolved === 'calm')
      resolved = input.emotion === 'thinking' ? 'hesitant' : 'gentle'
    else if (resolved === 'hesitant')
      resolved = 'calm'
    else if (resolved === 'gentle')
      resolved = 'calm'
  }

  return resolved
}

function resolveEmphasis(input: {
  delivery: AlicizationPerformanceDelivery
  encounter: DialogueEncounterSnapshot
  reply: string
}): 0 | 1 | 2 {
  const exclamationCount = (input.reply.match(/[!！]/g) ?? []).length
  if (input.encounter.energeticSignal || input.encounter.firmSignal || exclamationCount >= 2)
    return 2
  if (
    input.encounter.questionSignal
    || input.encounter.uncertaintySignal
    || input.delivery === 'firm'
    || input.delivery === 'energetic'
    || exclamationCount >= 1
  ) {
    return 1
  }
  return 0
}

function resolvePostureHint(input: {
  delivery: AlicizationPerformanceDelivery
  encounter: DialogueEncounterSnapshot
  emotion: AlicizationEmotion
  governance?: AlicizationDialogueEmbodimentGovernanceLike | null
}): StageEmbodimentPresencePostureMode {
  const governance = input.governance
  if (
    governance?.embodiedPresence === 'concerned'
    || input.encounter.careSignal
    || input.emotion === 'concerned'
    || input.emotion === 'apologetic'
  ) {
    return 'concerned'
  }

  if (
    governance?.screenReferenceMode === 'required'
    || governance?.answerSubject === 'visible-scene'
    || governance?.turnMode === 'grounded-inspection'
    || governance?.turnMode === 'guide-current-knot'
  ) {
    return 'inspection'
  }

  if (
    governance?.embodiedPresence === 'hesitant'
    || input.delivery === 'hesitant'
    || input.encounter.questionSignal
    || input.encounter.uncertaintySignal
  ) {
    return 'hesitant'
  }

  if (
    governance?.embodiedPresence === 'attentive'
    || input.delivery === 'firm'
    || input.delivery === 'energetic'
  ) {
    return 'attentive'
  }

  return 'idle'
}

function resolveSpeechStyle(input: {
  delivery: AlicizationPerformanceDelivery
  emotion: AlicizationEmotion
  emphasis: 0 | 1 | 2
  encounter?: DialogueEncounterSnapshot
}) {
  const baseStyle = resolveStageEmbodimentSpeechStyle(input.emotion)
  const emphasisPitch = input.emphasis === 2 ? 1 : 0
  const emphasisRate = input.emphasis === 2
    ? 1.05
    : input.emphasis === 1
      ? 1.02
      : 1

  return {
    pitchDelta: clampPitchDelta(
      baseStyle.pitchDelta
      + deliveryPitchAdjustments[input.delivery]
      + emphasisPitch,
    ),
    rateMultiplier: clampRateMultiplier(
      baseStyle.rateMultiplier
      * deliveryRateAdjustments[input.delivery]
      * emphasisRate,
    ),
  } satisfies StageEmbodimentSpeechStyleProfile
}

function resolveDialogueEmbodimentRendererHints(input: {
  emotion: AlicizationEmotion
  governance?: AlicizationDialogueEmbodimentGovernanceLike | null
  performanceManifest?: CharacterPerformanceCapabilitiesManifest | null
}): AlicizationDialogueEmbodimentRendererHints | null {
  const manifestHints = input.performanceManifest?.embodimentHints?.[input.emotion]
  const preferredExpressionAliases = dedupeCues([
    ...(manifestHints?.preferredExpressionAliases ?? []),
    ...resolveStageEmbodimentLive2DExpressionAliases(input.emotion),
    ...resolveStageEmbodimentVrmBaseExpressionCandidates(input.emotion),
  ])
  const preferredMotionAliases = dedupeCues([
    ...(manifestHints?.preferredMotionAliases ?? []),
    ...resolveStageEmbodimentLive2DMotionAliases(input.emotion),
  ])

  if (
    preferredExpressionAliases.length === 0
    && preferredMotionAliases.length === 0
  ) {
    return null
  }

  return {
    preferredExpressionAliases: preferredExpressionAliases.length > 0 ? preferredExpressionAliases : undefined,
    preferredMotionAliases: preferredMotionAliases.length > 0 ? preferredMotionAliases : undefined,
  }
}

export function normalizeAlicizationDialogueEmbodimentEnvelope(
  raw: unknown,
  fallbackEmotion: AlicizationEmotion = 'neutral',
): AlicizationDialogueEmbodimentEnvelope | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null

  const candidate = raw as Record<string, unknown>
  const variationToken = clampVariationToken(candidate.variationToken)
  if (!variationToken)
    return null

  const normalizedEmotion = normalizeAlicizationEmotion(
    candidate.emotion
    ?? (candidate.performance as Record<string, unknown> | undefined)?.baseEmotion
    ?? fallbackEmotion,
  ).emotion
  const performance = normalizeAlicizationPerformancePayload(candidate.performance, normalizedEmotion)
  const speechStyle = candidate.speechStyle && typeof candidate.speechStyle === 'object'
    ? {
        pitchDelta: clampPitchDelta(Number((candidate.speechStyle as Record<string, unknown>).pitchDelta)),
        rateMultiplier: clampRateMultiplier(Number((candidate.speechStyle as Record<string, unknown>).rateMultiplier)),
      }
    : resolveSpeechStyle({
        delivery: performance.delivery,
        emotion: normalizedEmotion,
        emphasis: performance.emphasis,
        encounter: undefined,
      })
  const postureHint = (() => {
    const rawPostureHint = typeof candidate.postureHint === 'string'
      ? candidate.postureHint.trim().toLowerCase()
      : ''
    return rawPostureHint === 'attentive'
      || rawPostureHint === 'inspection'
      || rawPostureHint === 'hesitant'
      || rawPostureHint === 'concerned'
      || rawPostureHint === 'idle'
      ? rawPostureHint
      : 'idle'
  })()

  return {
    emotion: normalizedEmotion,
    performance: {
      ...performance,
      baseEmotion: normalizedEmotion,
      emotion: normalizedEmotion,
    },
    postureHint,
    speechStyle,
    rendererHints: normalizeEmbodimentRendererHints(candidate.rendererHints),
    variationToken,
  }
}

export function resolveAlicizationDialogueEmbodiment(
  input: ResolveAlicizationDialogueEmbodimentInput,
): AlicizationDialogueEmbodimentEnvelope {
  const reply = input.reply.trim()
  const encounter = inferEncounter({
    reply,
  })
  const variationToken = clampVariationToken([
    input.turnId?.trim() || '',
    input.governance?.decisionTraceId?.trim() || '',
    input.previous?.variationToken?.trim() || '',
    reply.slice(0, 96),
  ]
    .join('|')
    .trim()
    || `fallback:${hashTextSeed(reply)}`)

  const emotion = resolveBaseEmotion({
    candidateEmotion: input.candidateEmotion,
    encounter,
    previousEmotion: input.previous?.emotion,
  })
  const delivery = resolveDelivery({
    encounter,
    emotion,
    previousDelivery: input.previous?.delivery,
  })
  const emphasis = resolveEmphasis({
    delivery,
    encounter,
    reply,
  })

  const cueCandidates = resolveStageEmbodimentCueCandidates({
    delivery,
    emotion,
  })
  const facialCueCandidates = dedupeCues(cueCandidates.facialCueCandidates)
  const actionCueCandidates = dedupeCues(cueCandidates.actionCueCandidates)

  const facialCue = selectCueWithVariation({
    candidates: facialCueCandidates,
    previousCue: input.previous?.facialCue,
    variationToken: `${variationToken}:facial`,
  })
  const actionCue = shouldPreserveExplicitRendererActionCue({
    candidatePerformance: input.candidatePerformance,
    performanceManifest: input.performanceManifest,
    previous: input.previous,
  })
    ? normalizeCue(input.candidatePerformance?.actionCue)
    : selectCueWithVariation({
        candidates: actionCueCandidates,
        previousCue: input.previous?.actionCue,
        variationToken: `${variationToken}:action`,
      })

  const performance = normalizeAlicizationPerformancePayload({
    ...input.candidatePerformance,
    baseEmotion: emotion,
    emotion,
    delivery,
    emphasis,
    facialCue,
    actionCue,
  }, emotion)

  return {
    emotion,
    performance,
    postureHint: resolvePostureHint({
      delivery,
      encounter,
      emotion,
      governance: input.governance,
    }),
    speechStyle: resolveSpeechStyle({
      delivery,
      emotion,
      emphasis,
      encounter,
    }),
    rendererHints: resolveDialogueEmbodimentRendererHints({
      emotion,
      governance: input.governance,
      performanceManifest: input.performanceManifest,
    }),
    variationToken,
  }
}
