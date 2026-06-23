import type {
  AlicizationAffectiveResidueMemorySnapshot,
  AlicizationDialogueEmbodimentEnvelope,
  AlicizationDialoguePerformancePayload,
  AlicizationDialogueSpeechTimeline,
  AlicizationDigitalLifeEnvelope,
  AlicizationDigitalLifeSpineDigest,
  AlicizationResidentPerformanceSnapshot,
  AlicizationRuntimeDigest,
} from '@proj-alicization/stage-shared'

import { normalizeAlicizationPerformancePayload } from '@proj-alicization/stage-shared'

export type AlicizationRuntimeEmbodimentSilentContinuityMode
  = | 'measured-return'
    | 'repair-before-closeness'
    | 'rest-protective'
    | 'quiet-companionship'

export interface AlicizationRuntimeEmbodimentSilentContinuity {
  mode: AlicizationRuntimeEmbodimentSilentContinuityMode | null
  openingGuidance?: string | null
  manifestationCadenceSummary?: string | null
  inwardLine?: string | null
  emotionalClosureCue?: string | null
  landedProgressLine?: string | null
  preferredBlinkCadence?: 'normal' | 'linger' | 'quiet' | null
  preferredGazeMode?: 'steady' | 'soften' | 'drift' | null
  preferredVoiceMode?: 'lower-pressure' | 'even' | null
  preferredPauseMode?: 'longer' | 'natural' | null
  preferredLipsyncMode?: 'restrained' | 'matched' | null
  preferredPacingMode?: 'slower' | 'natural' | null
  preferredPresence?: string | null
  embodimentRecallStrength?: 'lightly-noticed' | 'strongly-moved' | 'cautious-avoidance' | null
  embodimentModalityRisk?: 'low' | 'medium' | 'high' | null
  reasonTags?: string[]
}

export type AlicizationRuntimeEmbodimentCurrentConsciousFrame
  = NonNullable<AlicizationRuntimeDigest['currentConsciousFrame']> & {
    projectState?: Record<string, unknown> | null
  }

export interface AlicizationRuntimeEmbodimentSeed {
  decisionTraceId?: string | null
  turnId: string
  replyText: string
  performance: AlicizationDialoguePerformancePayload
  embodiment: AlicizationDialogueEmbodimentEnvelope | null
  speechTimeline: AlicizationDialogueSpeechTimeline | null
  digitalLife: AlicizationDigitalLifeEnvelope | null
  digitalLifeSpine: AlicizationDigitalLifeSpineDigest | null
  currentConsciousFrame: AlicizationRuntimeEmbodimentCurrentConsciousFrame | null
  residentPerformance: AlicizationResidentPerformanceSnapshot | null
  affectiveResidue: AlicizationAffectiveResidueMemorySnapshot | null
  silentContinuity: AlicizationRuntimeEmbodimentSilentContinuity | null
}

export interface BuildAlicizationRuntimeEmbodimentSeedInput {
  decisionTraceId?: string | null
  turnId: string
  reply: string
  performance: AlicizationDialoguePerformancePayload
  embodiment: AlicizationDialogueEmbodimentEnvelope | null
  speechTimeline: AlicizationDialogueSpeechTimeline | null
  digitalLife: AlicizationDigitalLifeEnvelope | null
  digitalLifeSpine: AlicizationDigitalLifeSpineDigest | null
  currentConsciousFrame?: AlicizationRuntimeEmbodimentCurrentConsciousFrame | null
  residentPerformance?: AlicizationResidentPerformanceSnapshot | null
  affectiveResidue?: AlicizationAffectiveResidueMemorySnapshot | null
  silentContinuity?: AlicizationRuntimeEmbodimentSilentContinuity | null
}

function normalizeSeedText(raw: unknown, maxChars: number) {
  return typeof raw === 'string'
    ? raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
    : ''
}

function normalizeSeedDecisionTraceId(raw: string | null | undefined) {
  if (typeof raw !== 'string')
    return null

  const normalized = normalizeSeedText(raw, 120)
  return normalized || null
}

function normalizeSeedTags(raw: unknown) {
  if (!Array.isArray(raw))
    return []

  const result: string[] = []
  for (const value of raw) {
    const normalized = normalizeSeedText(value, 80)
    if (!normalized || result.includes(normalized))
      continue
    result.push(normalized)
    if (result.length >= 12)
      break
  }
  return result
}

function normalizeSilentMode(raw: unknown): AlicizationRuntimeEmbodimentSilentContinuityMode | null {
  return raw === 'measured-return'
    || raw === 'repair-before-closeness'
    || raw === 'rest-protective'
    || raw === 'quiet-companionship'
    ? raw
    : null
}

function normalizeSilentContinuity(raw: AlicizationRuntimeEmbodimentSilentContinuity | null | undefined) {
  if (!raw)
    return null

  return {
    mode: normalizeSilentMode(raw.mode),
    openingGuidance: normalizeSeedText(raw.openingGuidance, 320) || null,
    manifestationCadenceSummary: normalizeSeedText(raw.manifestationCadenceSummary, 320) || null,
    inwardLine: normalizeSeedText(raw.inwardLine, 320) || null,
    emotionalClosureCue: normalizeSeedText(raw.emotionalClosureCue, 240) || null,
    landedProgressLine: normalizeSeedText(raw.landedProgressLine, 240) || null,
    preferredBlinkCadence: raw.preferredBlinkCadence ?? null,
    preferredGazeMode: raw.preferredGazeMode ?? null,
    preferredVoiceMode: raw.preferredVoiceMode ?? null,
    preferredPauseMode: raw.preferredPauseMode ?? null,
    preferredLipsyncMode: raw.preferredLipsyncMode ?? null,
    preferredPacingMode: raw.preferredPacingMode ?? null,
    preferredPresence: normalizeSeedText(raw.preferredPresence, 80) || null,
    embodimentRecallStrength: raw.embodimentRecallStrength ?? null,
    embodimentModalityRisk: raw.embodimentModalityRisk ?? null,
    reasonTags: normalizeSeedTags(raw.reasonTags),
  } satisfies AlicizationRuntimeEmbodimentSilentContinuity
}

function readProjectText(projectState: Record<string, unknown> | null | undefined, key: string, maxChars = 320) {
  return normalizeSeedText(projectState?.[key], maxChars) || null
}

function deriveSilentContinuityMode(input: {
  currentConsciousFrame?: AlicizationRuntimeEmbodimentCurrentConsciousFrame | null
  digitalLifeSpine?: AlicizationDigitalLifeSpineDigest | null
}) {
  const reasonTags = input.currentConsciousFrame?.reasonTags ?? []
  const restraint = input.digitalLifeSpine?.proactive?.continuityRestraint ?? null
  const arcStage = input.digitalLifeSpine?.runtime?.continuityArcStage
    ?? input.currentConsciousFrame?.continuityArcStage
    ?? null
  const combined = [
    ...reasonTags,
    restraint,
    arcStage,
    input.digitalLifeSpine?.runtime?.continuityCue,
    input.digitalLifeSpine?.memory?.personStateProjection?.openingGuidance,
    input.digitalLifeSpine?.memory?.personStateProjection?.manifestationCadenceSummary,
  ]
    .map(value => normalizeSeedText(value, 220).toLowerCase())
    .filter(Boolean)
    .join(' ')

  if (!combined)
    return null
  if (combined.includes('repair-before-closeness') || combined.includes('repair first'))
    return 'repair-before-closeness' as const
  if (combined.includes('rest-protective') || combined.includes('protect rest'))
    return 'rest-protective' as const
  if (
    combined.includes('measured-return')
    || combined.includes('same-thread-continuation')
    || combined.includes('hold-for-opening')
    || combined.includes('lower-pressure')
    || combined.includes('same remembered seam')
    || combined.includes('same living line')
    || combined.includes('same-her')
  ) {
    return 'measured-return' as const
  }
  if (combined.includes('quiet-companionship') || combined.includes('silent-continuity'))
    return 'quiet-companionship' as const
  return null
}

function deriveSilentContinuity(input: {
  currentConsciousFrame?: AlicizationRuntimeEmbodimentCurrentConsciousFrame | null
  digitalLifeSpine?: AlicizationDigitalLifeSpineDigest | null
  explicit?: AlicizationRuntimeEmbodimentSilentContinuity | null
}) {
  const explicit = normalizeSilentContinuity(input.explicit)
  if (explicit)
    return explicit

  const mode = deriveSilentContinuityMode(input)
  if (!mode)
    return null

  const projection = input.digitalLifeSpine?.memory?.personStateProjection ?? null
  const runtimeProjectState = input.digitalLifeSpine?.runtime?.projectState as Record<string, unknown> | null | undefined
  const consciousProjectState = input.currentConsciousFrame?.projectState ?? null
  const projectState = consciousProjectState ?? runtimeProjectState ?? null
  const reasonTags = normalizeSeedTags([
    ...(input.currentConsciousFrame?.reasonTags ?? []),
    input.digitalLifeSpine?.proactive?.continuityRestraint
      ? `restraint:${input.digitalLifeSpine.proactive.continuityRestraint}`
      : null,
    input.digitalLifeSpine?.runtime?.continuityArcStage
      ? `continuity-arc:${input.digitalLifeSpine.runtime.continuityArcStage}`
      : null,
  ])

  return {
    mode,
    openingGuidance:
      normalizeSeedText(projection?.openingGuidance, 320)
      || readProjectText(projectState, 'preDialogueAwarenessLine')
      || readProjectText(projectState, 'companionHeadlineLine')
      || readProjectText(projectState, 'primaryOpenLoop')
      || null,
    manifestationCadenceSummary:
      normalizeSeedText(projection?.manifestationCadenceSummary, 320)
      || readProjectText(projectState, 'nextClosureTarget')
      || readProjectText(projectState, 'openClosureSummary')
      || null,
    inwardLine:
      normalizeSeedText(projection?.selfContinuityAuthority?.inwardLine, 320)
      || readProjectText(projectState, 'sameHerSelfLine')
      || readProjectText(projectState, 'identity')
      || null,
    emotionalClosureCue:
      readProjectText(projectState, 'emotionalClosureCue', 240)
      || readProjectText(projectState, 'emotionalClosureSummary', 240)
      || null,
    landedProgressLine:
      readProjectText(projectState, 'latestLandedProgress', 240)
      || readProjectText(projectState, 'latestProgress', 240)
      || readProjectText(projectState, 'landedProgressSummary', 240)
      || null,
    preferredBlinkCadence: projectState?.preferredBlinkCadence as AlicizationRuntimeEmbodimentSilentContinuity['preferredBlinkCadence'] ?? null,
    preferredGazeMode: projectState?.preferredGazeMode as AlicizationRuntimeEmbodimentSilentContinuity['preferredGazeMode'] ?? null,
    preferredVoiceMode: projectState?.preferredVoiceMode as AlicizationRuntimeEmbodimentSilentContinuity['preferredVoiceMode'] ?? null,
    preferredPauseMode: projectState?.preferredPauseMode as AlicizationRuntimeEmbodimentSilentContinuity['preferredPauseMode'] ?? null,
    preferredLipsyncMode: projectState?.preferredLipsyncMode as AlicizationRuntimeEmbodimentSilentContinuity['preferredLipsyncMode'] ?? null,
    preferredPacingMode: projectState?.preferredPacingMode as AlicizationRuntimeEmbodimentSilentContinuity['preferredPacingMode'] ?? null,
    preferredPresence: readProjectText(projectState, 'preferredPresence', 80),
    embodimentRecallStrength: projectState?.embodimentRecallStrength as AlicizationRuntimeEmbodimentSilentContinuity['embodimentRecallStrength'] ?? null,
    embodimentModalityRisk: projectState?.embodimentModalityRisk as AlicizationRuntimeEmbodimentSilentContinuity['embodimentModalityRisk'] ?? null,
    reasonTags,
  } satisfies AlicizationRuntimeEmbodimentSilentContinuity
}

export function buildAlicizationRuntimeEmbodimentSeed(
  input: BuildAlicizationRuntimeEmbodimentSeedInput,
): AlicizationRuntimeEmbodimentSeed {
  // NOTICE:
  // In P0 this helper becomes the canonical local input shape for the director,
  // but it is not transported over shared IPC yet. The transported execution
  // authority remains `structured.embodimentScript`.
  return {
    decisionTraceId: normalizeSeedDecisionTraceId(input.decisionTraceId),
    turnId: normalizeSeedText(input.turnId, 120),
    replyText: normalizeSeedText(input.reply, 4000),
    performance: normalizeAlicizationPerformancePayload(
      input.performance,
      input.performance.baseEmotion,
    ),
    embodiment: input.embodiment,
    speechTimeline: input.speechTimeline,
    digitalLife: input.digitalLife,
    digitalLifeSpine: input.digitalLifeSpine,
    currentConsciousFrame: input.currentConsciousFrame ?? null,
    residentPerformance: input.residentPerformance ?? null,
    affectiveResidue: input.affectiveResidue ?? null,
    silentContinuity: deriveSilentContinuity({
      currentConsciousFrame: input.currentConsciousFrame ?? null,
      digitalLifeSpine: input.digitalLifeSpine,
      explicit: input.silentContinuity ?? null,
    }),
  }
}
