import type { Buffer } from 'node:buffer'

import type { Message } from '@xsai/shared-chat'
import type { NativeImage } from 'electron'

import type {
  AlicizationAffectiveResidueMemorySnapshot,
  AlicizationConversationTurnInput,
  AlicizationCurrentConsciousFrameSnapshot,
  AlicizationDerivedMindStateBundle,
  AlicizationDialogueEmbodimentEnvelope,
  AlicizationDialoguePerformancePayload,
  AlicizationDialogueRespondedPayload,
  AlicizationDialogueSpeechTimeline,
  AlicizationDialogueStructuredPayload,
  AlicizationDigitalLifeEnvelope,
  AlicizationDigitalLifeSpineDigest,
  AlicizationEmbodimentContinuityLedgerSnapshot,
  AlicizationEmotion,
  AlicizationEmotionalTransitionLedgerSnapshot,
  AlicizationLearningExecutionStateSnapshot,
  AlicizationMemoryProvenance,
  AlicizationMindTurnEventInput,
  AlicizationMindTurnGovernance,
  AlicizationProactiveMetadata,
  AlicizationProactiveStaticReasonCode,
  AlicizationResidentPerformanceSnapshot,
  AlicizationRuntimeDigest,
  CharacterPerformanceCapabilitiesManifest,
} from '../../../shared/eventa'
import type { AlicizationVisibleReplyRealizationArtifact } from './visible-reply/facade'

import {
  buildAlicizationDialogueSpeechTimeline,
  buildAlicizationDigitalLifeEnvelope,
  buildAlicizationEmbodimentFaceCue,
  buildAlicizationEmbodimentLipSyncHints,
  buildAlicizationEmbodimentMotionBurst,
  deriveAlicizationMindParticipationFromSpine,
  formatGovernedMindMessage,
  governedMindFallbackLocale,
  governedMindFallbackMessageFallbacks,
  inferGovernedMindFallbackLocaleForUserText,
  normalizeAlicizationDerivedMindStateBundle,
  normalizeAlicizationDigitalLifeEnvelope,
  normalizeAlicizationDigitalLifeSpineDigest,
  normalizeAlicizationEmbodimentScript,
  normalizeAlicizationMemoryResolutionLedger,
  normalizeAlicizationNormalVisibleReplyAuthority,
  normalizeAlicizationOrganicMemoryStageReplay,
  normalizeAlicizationRuntimeDigest,
  normalizeExecutionFirstGovernance,
  resolveAlicizationDialogueEmbodiment,
  sanitizeCharacterPerformanceManifest,
  translateGovernedMindFallback as translateGovernedMindFallbackShared,
} from '@proj-alicization/stage-shared'

import {
  clampAlicizationPerformancePayloadToManifest,
  normalizeAlicizationEmotion,
  normalizeAlicizationPerformancePayload,
} from '../../../shared/eventa'
import { normalizeClaimEvidenceLedger } from './claim-evidence-ledger'
import { normalizeDialogueActKernel } from './dialogue-act-kernel'
import { anchorsMateriallyConflict, resolveDialogueAnchorCoherence } from './dialogue-anchor-coherence'
import { sanitizeDialogueAnchorText } from './dialogue-surface-text'
import { coordinateAlicizationRuntimeEmbodiment } from './embodiment/runtime-embodiment-coordinator'
import { buildAlicizationRuntimeEmbodimentSeed } from './embodiment/runtime-embodiment-seed'
import { ensureMindGovernanceDecisionTraceId, sanitizeMindGovernanceDecisionTraceId } from './mind-governance-trace'
import { normalizeMindTurnFrame } from './mind-turn-frame'
import {
  resolveAlicizationProjectStateSnapshot,
} from './project-state-brief'
import { sanitizeBriefText, uniqueCarryAnchors } from './runtime-realtime'
import { clamp01, sanitizeText } from './runtime-soul'
import {
  resolveAlicizationAutonomousDialogueFamilyClassification,
  resolveAlicizationAutonomousDialogueOrigin,
  resolveAlicizationRuntimeMindTurnStructuredFormat,
} from './runtime-structured-format'
import {
  normalizeAlicizationProjectStateEvidenceStatus,
  normalizeAlicizationVisibleReplyValidationStatus,
} from './visible-reply/facade'

export function createAbortError(reason?: string) {
  return new DOMException(`Alicization runtime aborted: ${reason ?? 'unknown'}`, 'AbortError')
}

type AlicizationGovernanceCurrentConsciousFrameInput = {
  reasonTags?: readonly string[] | null
  projectState?: AlicizationCurrentConsciousFrameSnapshot['projectState']
} | null

type RuntimeGovernanceRendererHints = NonNullable<
  NonNullable<AlicizationDialogueSpeechTimeline>['segments'][number]['rendererHints']
>

const pendingSameHerEmbodimentRepairPressureReasonTags = [
  'same-her-causality-repair-pressure',
  'runtimeSameHerEmbodimentCausality',
] as const

function resolveGovernanceProjectStateText(input: {
  current?: unknown
  summary?: unknown
  fallbacks?: unknown[]
  maxChars?: number
}) {
  const maxChars = input.maxChars ?? 320
  const current = sanitizeBriefText(readStringValue(input.current), maxChars)
  if (current)
    return current

  const summary = sanitizeBriefText(readStringValue(input.summary), maxChars)
  if (summary)
    return summary

  for (const fallback of input.fallbacks ?? []) {
    const fallbackText = sanitizeBriefText(readStringValue(fallback), maxChars)
    if (fallbackText)
      return fallbackText
  }

  return ''
}

function normalizeGovernanceProjectStateSnapshotInput(
  raw: Record<string, unknown> | null | undefined,
) {
  if (!raw)
    return null

  return {
    ...raw,
    latestLandedProgress: resolveGovernanceProjectStateText({
      current: raw.latestLandedProgress,
      summary: raw.landedProgressSummary,
      fallbacks: [raw.latestProgress],
      maxChars: 320,
    }) || null,
    latestProgress: resolveGovernanceProjectStateText({
      current: raw.latestProgress,
      summary: raw.landedProgressSummary,
      fallbacks: [raw.latestLandedProgress],
      maxChars: 320,
    }) || null,
    primaryOpenLoop: resolveGovernanceProjectStateText({
      current: raw.primaryOpenLoop,
      summary: raw.openClosureSummary,
      maxChars: 320,
    }) || null,
    nextClosureTarget: resolveGovernanceProjectStateText({
      current: raw.nextClosureTarget,
      summary: raw.nextClosureTargetSummary,
      maxChars: 420,
    }) || null,
    sameHerDriftRisk: resolveGovernanceProjectStateText({
      current: raw.sameHerDriftRisk,
      summary: raw.sameHerDriftRiskSummary,
      maxChars: 320,
    }) || null,
    proactiveSameHerGap: resolveGovernanceProjectStateText({
      current: raw.proactiveSameHerGap,
      summary: raw.proactiveSameHerGapSummary,
      maxChars: 320,
    }) || null,
    emotionalClosureCue: resolveGovernanceProjectStateText({
      current: raw.emotionalClosureCue,
      summary: raw.emotionalClosureSummary,
      maxChars: 320,
    }) || null,
    emotionalClosureSummary: resolveGovernanceProjectStateText({
      current: raw.emotionalClosureSummary,
      summary: raw.emotionalClosureCue,
      maxChars: 320,
    }) || null,
    preferredBlinkCadence:
      raw.preferredBlinkCadence === 'normal'
      || raw.preferredBlinkCadence === 'linger'
      || raw.preferredBlinkCadence === 'quiet'
        ? raw.preferredBlinkCadence
        : null,
    preferredGazeMode:
      raw.preferredGazeMode === 'steady'
      || raw.preferredGazeMode === 'soften'
      || raw.preferredGazeMode === 'drift'
        ? raw.preferredGazeMode
        : null,
    preferredPauseMode:
      raw.preferredPauseMode === 'longer'
      || raw.preferredPauseMode === 'natural'
        ? raw.preferredPauseMode
        : null,
    preferredLipsyncMode:
      raw.preferredLipsyncMode === 'restrained'
      || raw.preferredLipsyncMode === 'matched'
        ? raw.preferredLipsyncMode
        : null,
    preferredVoiceMode:
      raw.preferredVoiceMode === 'lower-pressure'
      || raw.preferredVoiceMode === 'even'
        ? raw.preferredVoiceMode
        : null,
    preferredPacingMode:
      raw.preferredPacingMode === 'slower'
      || raw.preferredPacingMode === 'natural'
        ? raw.preferredPacingMode
        : null,
  }
}

function coerceGovernanceCurrentConsciousFrame(
  input: AlicizationGovernanceCurrentConsciousFrameInput | AlicizationCurrentConsciousFrameSnapshot | null | undefined,
) {
  if (!input || typeof input !== 'object')
    return null

  if (
    typeof (input as AlicizationCurrentConsciousFrameSnapshot).consciousNeed === 'string'
    && typeof (input as AlicizationCurrentConsciousFrameSnapshot).consciousTension === 'string'
    && typeof (input as AlicizationCurrentConsciousFrameSnapshot).speakingIntention === 'string'
    && typeof (input as AlicizationCurrentConsciousFrameSnapshot).updatedAt === 'number'
  ) {
    return input as AlicizationCurrentConsciousFrameSnapshot
  }

  const candidate = input as NonNullable<AlicizationGovernanceCurrentConsciousFrameInput>
  const reasonTags = Array.isArray(candidate.reasonTags)
    ? candidate.reasonTags.filter((tag): tag is string => typeof tag === 'string' && tag.trim().length > 0)
    : []
  const projectState
    = candidate.projectState
      && typeof candidate.projectState === 'object'
      && !Array.isArray(candidate.projectState)
      ? resolveAlicizationProjectStateSnapshot({
          runtimeProjectState: normalizeGovernanceProjectStateSnapshotInput(
            candidate.projectState as Record<string, unknown>,
          ),
        })
      : null
  if (!projectState && reasonTags.length === 0)
    return null

  return {
    subject: 'general',
    centerOfGravity: 'answer',
    truthDiscipline: 'dialogue-first',
    consciousNeed: '',
    consciousTension: '',
    speakingIntention: '',
    focusAnchor: null,
    withheldImpulse: null,
    shouldWithholdSpecificity: false,
    shouldSelfRevise: false,
    confidence: 0,
    reasonTags,
    continuityPreferredTiming: projectState?.continuityPreferredTiming ?? null,
    continuityCadence: projectState?.continuityCadence ?? null,
    projectState,
    updatedAt: 0,
  } satisfies AlicizationCurrentConsciousFrameSnapshot

  return null
}

function normalizeGovernanceDigitalLifeSpineDigest(
  raw: unknown,
): AlicizationDialogueStructuredPayload['digitalLifeSpine'] {
  const normalized = normalizeAlicizationDigitalLifeSpineDigest(raw) as AlicizationDialogueStructuredPayload['digitalLifeSpine']
  if (!normalized || !raw || typeof raw !== 'object' || Array.isArray(raw))
    return normalized

  const runtimeCandidate = (raw as Record<string, unknown>).runtime
  if (!runtimeCandidate || typeof runtimeCandidate !== 'object' || Array.isArray(runtimeCandidate))
    return normalized

  const rawProjectState = (runtimeCandidate as Record<string, unknown>).projectState
  if (!rawProjectState || typeof rawProjectState !== 'object' || Array.isArray(rawProjectState))
    return normalized

  const normalizedProjectStateInput = normalizeGovernanceProjectStateSnapshotInput(
    rawProjectState as Record<string, unknown>,
  )
  return {
    ...normalized,
    runtime: {
      ...normalized.runtime,
      projectState: resolveAlicizationProjectStateSnapshot({
        runtimeProjectState: normalizedProjectStateInput,
        fallbackProjectState: normalized.runtime?.projectState as Record<string, unknown> | null | undefined,
      }),
    },
  } as AlicizationDialogueStructuredPayload['digitalLifeSpine']
}

function normalizeGovernanceDigitalLifeEnvelope(
  raw: unknown,
  fallbackEmotion?: AlicizationEmotion | null,
): AlicizationDialogueStructuredPayload['digitalLife'] {
  return normalizeAlicizationDigitalLifeEnvelope(raw, fallbackEmotion ?? undefined) as AlicizationDialogueStructuredPayload['digitalLife']
}

function resolveGovernanceStructuredDigitalLifeAuthority(input: {
  digitalLife: unknown
  embodimentScript: AlicizationDialogueStructuredPayload['embodimentScript'] | null | undefined
  fallbackEmotion?: AlicizationEmotion | null
}): AlicizationDialogueStructuredPayload['digitalLife'] {
  const topLevelDigitalLife = normalizeGovernanceDigitalLifeEnvelope(
    input.digitalLife,
    input.fallbackEmotion,
  )
  if (topLevelDigitalLife)
    return topLevelDigitalLife

  return normalizeGovernanceDigitalLifeEnvelope(
    input.embodimentScript?.digitalLife ?? null,
    input.fallbackEmotion,
  )
}

function normalizeGovernancePreDialogueAwareness(
  raw: unknown,
): AlicizationDialogueStructuredPayload['preDialogueAwareness'] {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return undefined

  const candidate = raw as Record<string, unknown>
  const rawStatus = readStringValue(candidate.status).trim().toLowerCase()
  const status = rawStatus === 'grounded' || rawStatus === 'partial' || rawStatus === 'drift'
    ? rawStatus
    : null
  if (!status)
    return undefined

  return {
    status,
    summaryLine: sanitizeBriefText(readStringValue(candidate.summaryLine), 320) || null,
    companionHeadlineLine: sanitizeBriefText(readStringValue(candidate.companionHeadlineLine), 320) || null,
    companionBriefingLine: sanitizeBriefText(readStringValue(candidate.companionBriefingLine), 320) || null,
    companionNextClosureLine: sanitizeBriefText(readStringValue(candidate.companionNextClosureLine), 320) || null,
    awarenessLine: sanitizeBriefText(readStringValue(candidate.awarenessLine), 320) || null,
    emotionalClosureCue: sanitizeBriefText(readStringValue(candidate.emotionalClosureCue), 320) || null,
    reasonPreview: Array.isArray(candidate.reasonPreview)
      ? candidate.reasonPreview
          .map(reason => sanitizeBriefText(readStringValue(reason), 320))
          .filter(Boolean)
      : [],
  }
}

function includesCadenceNeedle(text: string, needles: string[]) {
  const normalized = text.trim().toLowerCase()
  if (!normalized)
    return false

  return needles.some(needle => normalized.includes(needle.trim().toLowerCase()))
}

function detectRememberedSeamReinterpretationForGovernance(input: {
  manifestationCadenceSummary: string
  relationshipDoctrine: string
  latestInflection: string
  continuityCue: string
}) {
  const combined = [
    input.manifestationCadenceSummary,
    input.relationshipDoctrine,
    input.latestInflection,
    input.continuityCue,
  ].filter(Boolean).join(' ').toLowerCase()

  if (!combined)
    return false

  const rememberedSeamSignal = includesCadenceNeedle(combined, [
    'remembered seam',
    'same remembered relationship seam',
    'rejoin-remembered-seam',
    'same line',
    '同一条线',
    '轻轻牵回',
  ])
  if (!rememberedSeamSignal)
    return false

  return /reopened too eagerly|too eagerly before|more room this time|this time keep more room|slower this time|这次更要留白|这次要更慢一点|不要重开得太快|上次太急/u.test(combined)
}

function buildRuntimeGovernanceEmbodimentSpeechSegment(
  segment: AlicizationDialogueSpeechTimeline['segments'][number],
  options?: {
    lowerPressureTiming?: boolean
  },
) {
  const pauseClass = trimmedPauseClass(segment.text)
  const phraseBoundary = pauseClass === 'comma' || pauseClass === 'enumeration'
    ? 'soft' as const
    : pauseClass === 'full-stop' || pauseClass === 'question' || pauseClass === 'exclaim'
      ? 'hard' as const
      : 'none' as const
  const contour = pauseClass === 'question'
    ? 'rising' as const
    : pauseClass === 'comma' || pauseClass === 'full-stop' || pauseClass === 'exclaim'
      ? 'falling' as const
      : 'flat' as const
  const settleFloorMs = options?.lowerPressureTiming === true ? 220 : 120
  return {
    id: segment.id,
    index: segment.index,
    text: segment.text,
    interruptPolicy: segment.interruptMode === 'hard-interrupt' ? 'hard-stop' as const : 'soft-settle' as const,
    preRollMs: segment.actionWindow === 'segment-start'
      ? 40
      : segment.actionWindow === 'cadence-peak'
        ? 20
        : 0,
    settleMs: Math.max(
      settleFloorMs,
      segment.emotionHoldMs ?? 0,
      segment.facialHoldMs ?? 0,
      segment.actionHoldMs ?? 0,
    ),
    prosody: {
      language: 'zh-CN' as const,
      pauseClass,
      phraseBoundary,
      contour,
      emphasisWord: null,
      emphasisStrength: Number(Math.max(0, Math.min(1, segment.prosodyWeight ?? 0.5)).toFixed(2)),
      tempoShift: 0,
    },
  }
}

function sanitizeGovernanceCadenceText(raw: unknown, maxChars = 220) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars).toLowerCase()
}

function includesGovernanceCadenceNeedle(text: string, needles: string[]) {
  if (!text)
    return false
  return needles.some(needle => Boolean(needle) && text.includes(needle))
}

function inferProjectStateCarrySourceTagsFromAuthority(input: {
  sameHerSelfLine?: string | null
  selfLine?: string | null
  relationshipLine?: string | null
  motiveLine?: string | null
  habitLine?: string | null
  inwardLine?: string | null
}) {
  const combined = [
    input.sameHerSelfLine,
    input.selfLine,
    input.relationshipLine,
    input.motiveLine,
    input.habitLine,
    input.inwardLine,
  ]
    .map(value => typeof value === 'string' ? value.trim().toLowerCase() : '')
    .filter(Boolean)
    .join(' ')
  const carriesCanonicalSameHerProjectClosure
    = combined.includes('same phase 1 digital life')
      || combined.includes('same living line')
      || combined.includes('continuous her')
      || combined.includes('one continuous her')
      || combined.includes('without splitting her continuity')
      || combined.includes('initiative and embodiment closure')
      || combined.includes('keep the same living line inward for now')
      || combined.includes('leave room before widening outward again')

  return [
    ...(carriesCanonicalSameHerProjectClosure ? ['project-state-carry'] : ['project-state-carry']),
    ...(
      combined.includes('continuity-execution-callback-project-carry')
      || combined.includes('execution-callback project-carry')
      || combined.includes('callback project-carry')
        ? ['continuity-execution-callback-project-carry']
        : []
    ),
  ]
}

function repairProjectStateCarryOnDigitalLifeSpine(input: {
  digitalLifeSpine: AlicizationDialogueStructuredPayload['digitalLifeSpine'] | null
  sameHerSelfLine?: string | null
}) {
  const digitalLifeSpine = input.digitalLifeSpine
  const sameHerSelfLine = typeof input.sameHerSelfLine === 'string' ? input.sameHerSelfLine.trim() : ''
  if (!digitalLifeSpine || !sameHerSelfLine)
    return digitalLifeSpine
  const existingAuthority = digitalLifeSpine.memory?.personStateProjection?.selfContinuityAuthority
  const projectStateCarrySourceTags = inferProjectStateCarrySourceTagsFromAuthority({
    sameHerSelfLine,
    selfLine: existingAuthority?.selfLine ?? null,
    relationshipLine: existingAuthority?.relationshipLine ?? null,
    motiveLine: existingAuthority?.motiveLine ?? null,
    habitLine: existingAuthority?.habitLine ?? null,
    inwardLine: existingAuthority?.inwardLine ?? null,
  })

  return normalizeGovernanceDigitalLifeSpineDigest({
    ...digitalLifeSpine,
    memory: digitalLifeSpine.memory
      ? {
          ...digitalLifeSpine.memory,
          personStateProjection: digitalLifeSpine.memory.personStateProjection
            ? {
                ...digitalLifeSpine.memory.personStateProjection,
                selfContinuityAuthority: digitalLifeSpine.memory.personStateProjection.selfContinuityAuthority
                  ? {
                      ...digitalLifeSpine.memory.personStateProjection.selfContinuityAuthority,
                      sourceTags: Array.from(new Set([
                        ...(digitalLifeSpine.memory.personStateProjection.selfContinuityAuthority.sourceTags ?? []),
                        ...projectStateCarrySourceTags,
                      ])),
                      inwardLine: digitalLifeSpine.memory.personStateProjection.selfContinuityAuthority.inwardLine
                        ?? sameHerSelfLine,
                    }
                  : {
                      sourceTags: projectStateCarrySourceTags,
                      selfLine: null,
                      relationshipLine: null,
                      motiveLine: null,
                      habitLine: null,
                      inwardLine: sameHerSelfLine,
                      authoritySummary: null,
                    },
              }
            : {
                selfContinuityAuthority: {
                  sourceTags: projectStateCarrySourceTags,
                  selfLine: null,
                  relationshipLine: null,
                  motiveLine: null,
                  habitLine: null,
                  inwardLine: sameHerSelfLine,
                  authoritySummary: null,
                },
                activeClosenessContext: null,
                activeClosenessRung: null,
                relationshipPosture: null,
                openingGuidance: null,
                preferredProactiveStyle: null,
                manifestationCadenceSummary: null,
              },
        }
      : {
          summary: null,
          recentEpisodeSummary: null,
          recentEpisodeCount: 0,
          focusBeliefStatement: null,
          focusBeliefConfidence: null,
          leadingGoalSummary: null,
          dominantConcernSummary: null,
          reflectionSummary: null,
          reflectionPressure: null,
          recallMode: null,
          recallSeed: null,
          recollectionSummary: null,
          recollectionSurfaceSummary: null,
          recollectionConfidence: null,
          thoughtThreadSummary: null,
          longHorizonSummary: null,
          rememberedPreferenceSummary: null,
          rememberedConstraintSummary: null,
          rememberedPlanSummary: null,
          longHorizonCueCount: 0,
          personStateProjection: {
            selfContinuityAuthority: {
              sourceTags: projectStateCarrySourceTags,
              selfLine: null,
              relationshipLine: null,
              motiveLine: null,
              habitLine: null,
              inwardLine: sameHerSelfLine,
              authoritySummary: null,
            },
            activeClosenessContext: null,
            activeClosenessRung: null,
            relationshipPosture: null,
            openingGuidance: null,
            preferredProactiveStyle: null,
            manifestationCadenceSummary: null,
          },
        },
  })
}

function hasGovernanceLowerPressureRelationshipTiming(input: {
  digitalLifeSpine?: AlicizationDialogueStructuredPayload['digitalLifeSpine']
}) {
  const personaBias = input.digitalLifeSpine?.proactive?.personaBias ?? null
  const manifestationCadenceSummary = sanitizeGovernanceCadenceText(personaBias?.manifestationCadenceSummary, 220)
  const relationshipDoctrine = sanitizeGovernanceCadenceText(
    input.digitalLifeSpine?.embodiment?.autobiographicalSelf?.relationshipDoctrine,
    220,
  )
  const outcomeSummary = sanitizeGovernanceCadenceText(input.digitalLifeSpine?.outcomeLearning?.summary, 220)
  const latestInflection = sanitizeGovernanceCadenceText(input.digitalLifeSpine?.outcomeLearning?.latestInflection, 220)
  const runtimeProjectState = input.digitalLifeSpine?.runtime?.projectState ?? null
  const normalizedProjectState = resolveAlicizationProjectStateSnapshot({
    runtimeProjectState: runtimeProjectState as Record<string, unknown>,
  })
  const projectPreflightSummary = sanitizeGovernanceCadenceText(
    normalizedProjectState.preDialogueAwarenessLine
    ?? normalizedProjectState.preflightSummary
    ?? runtimeProjectState?.companionHeadlineLine
    ?? runtimeProjectState?.preDialogueAwarenessLine
    ?? runtimeProjectState?.preflightSummary,
    320,
  )
  const projectOpenLoop = sanitizeGovernanceCadenceText(normalizedProjectState.primaryOpenLoop ?? runtimeProjectState?.primaryOpenLoop, 220)
  const projectNextClosureTarget = sanitizeGovernanceCadenceText(normalizedProjectState.nextClosureTarget ?? runtimeProjectState?.nextClosureTarget, 220)

  return includesGovernanceCadenceNeedle(manifestationCadenceSummary, [
    'observe-first',
    'stay slower',
    'slower until the opening softens',
    'lower-pressure',
  ]) || includesGovernanceCadenceNeedle(
    `${relationshipDoctrine} ${outcomeSummary} ${latestInflection}`,
    [
      'lower-pressure',
      'pressure stayed low',
      'return stayed slower',
      'slower return',
      'keep more room',
      'repair should settle before closeness expands',
      'do not crowd',
      'less eager',
    ],
  ) || includesGovernanceCadenceNeedle(
    `${projectPreflightSummary} ${projectOpenLoop} ${projectNextClosureTarget}`,
    [
      'measured-return',
      'repair-before-closeness',
      'leave room before widening closeness',
      'continuity proof',
      'one measured-return',
      'one continuity route',
      'same still-open closure work',
    ],
  )
}

function inferCompanionshipHoldModeFromDigitalLifeSpine(input: {
  digitalLifeSpine?: AlicizationDialogueStructuredPayload['digitalLifeSpine']
  currentConsciousFrame?: AlicizationCurrentConsciousFrameSnapshot | null
}) {
  const currentConsciousFrameReasonTags = input.currentConsciousFrame?.reasonTags ?? []
  if (currentConsciousFrameReasonTags.includes('memory-deliberation-cadence:repair-before-closeness'))
    return 'repair-before-closeness' as const
  if (
    currentConsciousFrameReasonTags.includes('memory-deliberation-cadence:measured-return')
    || currentConsciousFrameReasonTags.includes('memory-deliberation-cadence:lower-pressure')
  ) {
    return 'measured-return' as const
  }

  const continuityRestraint = input.digitalLifeSpine?.proactive?.continuityRestraint ?? null
  if (
    continuityRestraint === 'repair-before-closeness'
    || continuityRestraint === 'measured-return'
    || continuityRestraint === 'rest-protective'
  ) {
    return continuityRestraint
  }

  if (input.digitalLifeSpine?.runtime?.continuityPreferredTiming === 'protect-rest')
    return 'rest-protective' as const

  return hasGovernanceLowerPressureRelationshipTiming(input)
    ? 'measured-return' as const
    : null
}

function readHumanlikeRecallEmbodimentCarry(input: {
  digitalLifeSpine?: AlicizationDialogueStructuredPayload['digitalLifeSpine']
}) {
  const recallSeed = sanitizeGovernanceCadenceText(input.digitalLifeSpine?.memory?.recallSeed, 4_000).toLowerCase()
  if (!recallSeed.includes('humanlike_memory_recall:')) {
    return {
      hasMeasuredReturnEmbodimentCarry: false,
      prefersGentleDelivery: false,
    }
  }

  const preferredVoiceMode
    = /embodiment_voice=lower-pressure/u.test(recallSeed)
      ? 'lower-pressure' as const
      : /embodiment_voice=even/u.test(recallSeed)
        ? 'even' as const
        : null
  const preferredPauseMode
    = /embodiment_pause=longer/u.test(recallSeed)
      ? 'longer' as const
      : /embodiment_pause=natural/u.test(recallSeed)
        ? 'natural' as const
        : null
  const preferredLipsyncMode
    = /embodiment_lipsync=restrained/u.test(recallSeed)
      ? 'restrained' as const
      : /embodiment_lipsync=matched/u.test(recallSeed)
        ? 'matched' as const
        : null
  const preferredPacingMode
    = /embodiment_pacing=slower/u.test(recallSeed)
      ? 'slower' as const
      : /embodiment_pacing=natural/u.test(recallSeed)
        ? 'natural' as const
        : null
  const hasMeasuredReturnEmbodimentCarry
    = Boolean(
      preferredVoiceMode
      || preferredPauseMode
      || preferredLipsyncMode
      || preferredPacingMode
      || /embodiment_gaze=stable|embodiment_blink=slower/u.test(recallSeed),
    )
  const prefersGentleDelivery
    = hasMeasuredReturnEmbodimentCarry
      && /embodiment_recall_strength=strongly-moved|protective-continuity|unfinishedness|轻一点|慢一点|低压/u.test(recallSeed)

  return {
    hasMeasuredReturnEmbodimentCarry,
    prefersGentleDelivery,
    preferredVoiceMode,
    preferredPauseMode,
    preferredLipsyncMode,
    preferredPacingMode,
  }
}

function trimmedPauseClass(text: string) {
  const trimmed = text.trim()
  if (trimmed.endsWith('？') || trimmed.endsWith('?'))
    return 'question' as const
  if (trimmed.endsWith('！') || trimmed.endsWith('!'))
    return 'exclaim' as const
  if (trimmed.endsWith('。') || trimmed.endsWith('.'))
    return 'full-stop' as const
  if (trimmed.endsWith('，') || trimmed.endsWith(','))
    return 'comma' as const
  if (trimmed.endsWith('、'))
    return 'enumeration' as const
  return 'none' as const
}

export function isAbortError(error: unknown) {
  return typeof error === 'object'
    && error != null
    && 'name' in error
    && (error as { name?: unknown }).name === 'AbortError'
}

export function isMainGatewayProgressEventType(rawType: unknown) {
  const eventType = sanitizeText(rawType)
  return eventType === 'text-delta'
    || eventType === 'tool-call'
    || eventType === 'tool-result'
    || eventType === 'finish'
    || eventType === 'error'
}

export function buildCompressedNativeImageDataUrl(input: {
  image: NativeImage
  maxWidth: number
  maxHeight: number
  jpegQuality: number
}) {
  const maybeImage = input.image as NativeImage & {
    isEmpty?: () => boolean
    getSize?: () => { width: number, height: number }
    resize?: (options: { width: number, height: number, quality?: string }) => NativeImage
    toJPEG?: (quality: number) => Buffer
    toDataURL?: () => string
  }
  if (typeof maybeImage.isEmpty !== 'function'
    || typeof maybeImage.getSize !== 'function'
    || typeof maybeImage.resize !== 'function'
    || typeof maybeImage.toJPEG !== 'function') {
    return typeof maybeImage.toDataURL === 'function'
      ? maybeImage.toDataURL()
      : ''
  }

  if (maybeImage.isEmpty())
    return ''

  const originalSize = maybeImage.getSize()
  const widthRatio = input.maxWidth > 0 ? input.maxWidth / Math.max(1, originalSize.width) : 1
  const heightRatio = input.maxHeight > 0 ? input.maxHeight / Math.max(1, originalSize.height) : 1
  const scale = Math.min(1, widthRatio, heightRatio)
  const targetWidth = Math.max(1, Math.round(originalSize.width * scale))
  const targetHeight = Math.max(1, Math.round(originalSize.height * scale))
  const resized = scale < 1
    ? maybeImage.resize({
        width: targetWidth,
        height: targetHeight,
        quality: 'better',
      })
    : maybeImage

  const jpeg = resized.toJPEG(input.jpegQuality)
  if (!jpeg || jpeg.length === 0)
    return ''

  return `data:image/jpeg;base64,${jpeg.toString('base64')}`
}

export function messageContainsVisualInput(messages: Message[]) {
  return messages.some(message =>
    Array.isArray(message.content)
    && message.content.some((part: any) => part?.type === 'image_url'),
  )
}

export function latestUserMessageContainsVisualInput(messages: Message[]) {
  const latestUserMessage = [...messages].reverse().find(message => message.role === 'user')
  if (!latestUserMessage || !Array.isArray(latestUserMessage.content))
    return false
  return latestUserMessage.content.some((part: any) => part?.type === 'image_url')
}

export function readStringValue(value: unknown) {
  return typeof value === 'string' ? value : ''
}

export function sanitizePerformanceManifest(raw: unknown): CharacterPerformanceCapabilitiesManifest | null {
  return sanitizeCharacterPerformanceManifest(raw)
}

export function parsePerformanceManifestFromMeta(raw: string | undefined): CharacterPerformanceCapabilitiesManifest | null {
  if (!raw)
    return null

  try {
    return sanitizePerformanceManifest(JSON.parse(raw))
  }
  catch {
    return null
  }
}

export function buildDefaultDialoguePerformancePayload(
  baseEmotion: AlicizationEmotion,
  overrides?: Partial<Pick<AlicizationDialoguePerformancePayload, 'facialCue' | 'actionCue' | 'delivery' | 'emphasis'>>,
) {
  const defaults: Record<AlicizationEmotion, { delivery: AlicizationDialoguePerformancePayload['delivery'], emphasis: 0 | 1 | 2 }> = {
    neutral: { delivery: 'calm', emphasis: 0 },
    happy: { delivery: 'energetic', emphasis: 1 },
    sad: { delivery: 'gentle', emphasis: 0 },
    angry: { delivery: 'firm', emphasis: 2 },
    concerned: { delivery: 'gentle', emphasis: 1 },
    tired: { delivery: 'calm', emphasis: 0 },
    apologetic: { delivery: 'hesitant', emphasis: 0 },
    surprised: { delivery: 'energetic', emphasis: 2 },
    thinking: { delivery: 'hesitant', emphasis: 0 },
  }
  const fallback = defaults[baseEmotion] ?? defaults.neutral

  return normalizeAlicizationPerformancePayload({
    baseEmotion,
    facialCue: overrides?.facialCue ?? null,
    actionCue: overrides?.actionCue ?? null,
    delivery: overrides?.delivery ?? fallback.delivery,
    emphasis: overrides?.emphasis ?? fallback.emphasis,
  }, baseEmotion)
}

export function alignDialoguePerformanceEmotion(
  performance: unknown,
  emotion: AlicizationEmotion,
): AlicizationDialoguePerformancePayload {
  const normalized = normalizeAlicizationPerformancePayload(performance, emotion)
  return {
    ...normalized,
    baseEmotion: emotion,
    emotion,
  }
}

function areDialoguePerformancesEqual(
  left: AlicizationDialoguePerformancePayload,
  right: AlicizationDialoguePerformancePayload,
) {
  return left.baseEmotion === right.baseEmotion
    && left.delivery === right.delivery
    && left.emphasis === right.emphasis
    && (left.actionCue ?? null) === (right.actionCue ?? null)
    && (left.facialCue ?? null) === (right.facialCue ?? null)
}

function resolveResidentFallbackDialoguePerformance(
  performance: AlicizationDialoguePerformancePayload,
  residentPerformance?: AlicizationDialoguePerformancePayload | null,
) {
  const candidate = normalizeAlicizationPerformancePayload(performance, performance.baseEmotion)
  if (!residentPerformance)
    return candidate

  const resident = normalizeAlicizationPerformancePayload(
    residentPerformance,
    residentPerformance.baseEmotion,
  )
  const candidateSparse = !candidate.actionCue || !candidate.facialCue
  const candidateEmbodimentSparseBaseline = !candidate.actionCue
    && !candidate.facialCue
    && candidate.delivery === 'calm'
    && candidate.emphasis === 0
  const candidateMeasuredReturnSparseBaseline = !candidate.actionCue
    && !candidate.facialCue
    && candidate.delivery === 'calm'
    && candidate.emphasis === 1
  const candidateMeasuredReturnCueShellBaseline = candidate.baseEmotion === 'thinking'
    && candidate.delivery === 'calm'
    && candidate.emphasis === 0
    && candidate.actionCue === 'leave-room'
    && (
      candidate.facialCue == null
      || candidate.facialCue === 'soften'
      || candidate.facialCue === 'soft-gaze'
    )
  const candidateNeutralBaseline = candidate.baseEmotion === 'neutral'
    && candidate.delivery === 'calm'
    && candidate.emphasis === 0
  if (!candidateSparse && !candidateNeutralBaseline && !candidateMeasuredReturnCueShellBaseline)
    return candidate

  const mergedEmotion = candidateNeutralBaseline
    ? resident.baseEmotion
    : candidate.baseEmotion

  return normalizeAlicizationPerformancePayload({
    baseEmotion: mergedEmotion,
    emotion: mergedEmotion,
    facialCue: candidate.facialCue ?? resident.facialCue ?? null,
    actionCue: candidate.actionCue ?? resident.actionCue ?? null,
    delivery: candidateNeutralBaseline || candidateEmbodimentSparseBaseline || (
      candidateMeasuredReturnSparseBaseline
      && resident.delivery === 'gentle'
    ) || (
      candidateMeasuredReturnCueShellBaseline
      && resident.delivery === 'gentle'
    )
      ? resident.delivery
      : candidate.delivery,
    emphasis: candidateNeutralBaseline || candidateEmbodimentSparseBaseline || (
      candidateMeasuredReturnSparseBaseline
      && resident.delivery === 'gentle'
    ) || (
      candidateMeasuredReturnCueShellBaseline
      && resident.delivery === 'gentle'
    )
      ? resident.emphasis
      : candidate.emphasis,
  }, mergedEmotion)
}

function replyLooksLikeExplicitHesitationOrQuestion(input: {
  reply: string
  thought: string
}) {
  const normalized = `${input.reply} ${input.thought}`.trim().toLowerCase()
  if (!normalized)
    return false

  return /也许|可能|不确定|我想|我觉得|maybe|perhaps|i think|i'm not sure|[?？]/u.test(normalized)
}

function shouldCarryResidentReplyOnlyCompanionshipAuthority(input: {
  candidate: AlicizationDialoguePerformancePayload
  residentPerformance?: AlicizationResidentPerformanceSnapshot | null
  reply: string
  thought: string
}) {
  if (input.residentPerformance?.source !== 'main-runtime' || !input.residentPerformance.performance)
    return false

  const reasonTags = input.residentPerformance.reasonTags ?? []
  const companionshipResidentMode = reasonTags.includes('repair-before-closeness')
    ? 'repair-before-closeness'
    : reasonTags.includes('measured-return')
      ? 'measured-return'
      : null
  if (!companionshipResidentMode)
    return false

  const resident = normalizeAlicizationPerformancePayload(
    input.residentPerformance.performance,
    input.residentPerformance.performance.baseEmotion,
  )

  if (input.candidate.baseEmotion !== resident.baseEmotion)
    return false
  if (input.candidate.delivery !== 'hesitant' || input.candidate.emphasis !== 0)
    return false
  if (resident.delivery !== 'gentle')
    return false
  if (replyLooksLikeExplicitHesitationOrQuestion({
    reply: input.reply,
    thought: input.thought,
  })) {
    return false
  }

  return true
}

function applyDialoguePerformanceSeedToEmbodiment(
  embodiment: AlicizationDialogueEmbodimentEnvelope,
  seededPerformance: AlicizationDialoguePerformancePayload,
): AlicizationDialogueEmbodimentEnvelope {
  const normalizedSeeded = normalizeAlicizationPerformancePayload(
    seededPerformance,
    seededPerformance.baseEmotion,
  )
  if (
    embodiment.emotion === normalizedSeeded.baseEmotion
    && areDialoguePerformancesEqual(embodiment.performance, normalizedSeeded)
  ) {
    return embodiment
  }

  const preserveConcernedEmbodiment
    = embodiment.emotion === 'concerned'
      && embodiment.performance.baseEmotion === 'concerned'
      && embodiment.performance.delivery === 'gentle'
      && normalizedSeeded.baseEmotion === 'thinking'
      && normalizedSeeded.delivery === 'gentle'

  const preserveConcernCarryEmbodiment
    = normalizedSeeded.baseEmotion === 'thinking'
      && normalizedSeeded.delivery === 'gentle'
      && embodiment.performance.delivery === 'gentle'
      && embodiment.variationToken.includes('same-thread-continuation')
      && embodiment.variationToken.includes('measured-return')
      && (
        embodiment.variationToken.includes('concerned')
        || embodiment.variationToken.includes('concerned-but-restrained')
      )

  if (preserveConcernedEmbodiment || preserveConcernCarryEmbodiment) {
    return {
      ...embodiment,
      emotion: 'concerned',
      performance: {
        ...normalizedSeeded,
        baseEmotion: 'concerned',
        emotion: 'concerned',
      },
    }
  }

  return {
    ...embodiment,
    emotion: normalizedSeeded.baseEmotion,
    performance: {
      ...normalizedSeeded,
      baseEmotion: normalizedSeeded.baseEmotion,
      emotion: normalizedSeeded.baseEmotion,
    },
  }
}

function applyResidentRendererHintsToEmbodiment(input: {
  embodiment: AlicizationDialogueEmbodimentEnvelope
  residentPerformance: AlicizationResidentPerformanceSnapshot
  continuitySource?: {
    manifestationCadenceSummary?: string | null
    relationshipDoctrine?: string | null
    latestInflection?: string | null
    continuityCue?: string | null
  } | null
}) {
  const reasonTags = input.residentPerformance.reasonTags ?? []
  const residentMode = reasonTags.includes('repair-before-closeness')
    ? 'repair-before-closeness'
    : reasonTags.includes('quiet-companionship')
      ? 'quiet-companionship'
      : reasonTags.includes('measured-return')
        ? 'measured-return'
        : null
  if (!residentMode)
    return input.embodiment

  const rememberedSeamMoreRoom = residentMode === 'measured-return'
    && detectRememberedSeamReinterpretationForGovernance({
      manifestationCadenceSummary: sanitizeGovernanceCadenceText(
        input.continuitySource?.manifestationCadenceSummary,
        220,
      ),
      relationshipDoctrine: sanitizeGovernanceCadenceText(
        input.continuitySource?.relationshipDoctrine,
        220,
      ),
      latestInflection: sanitizeGovernanceCadenceText(
        input.continuitySource?.latestInflection,
        220,
      ),
      continuityCue: sanitizeGovernanceCadenceText(
        input.continuitySource?.continuityCue,
        220,
      ),
    })
  const preferredBlinkCadence = residentMode === 'measured-return' && !rememberedSeamMoreRoom ? 'linger' : 'quiet'
  const preferredGazeMode = 'soften' as const
  const preferredExpressionAliases = residentMode === 'measured-return'
    ? ['CalmInspect', ...(input.embodiment.rendererHints?.preferredExpressionAliases ?? [])]
    : residentMode === 'quiet-companionship'
      ? ['QuietNearby', ...(input.embodiment.rendererHints?.preferredExpressionAliases ?? [])]
      : ['RecoverSoft', ...(input.embodiment.rendererHints?.preferredExpressionAliases ?? [])]
  const preferredMotionAliases = residentMode === 'measured-return'
    ? ['ObserveSoft', ...(input.embodiment.rendererHints?.preferredMotionAliases ?? [])]
    : residentMode === 'quiet-companionship'
      ? ['StillNearby', ...(input.embodiment.rendererHints?.preferredMotionAliases ?? [])]
      : ['StillnessGuard', ...(input.embodiment.rendererHints?.preferredMotionAliases ?? [])]

  return {
    ...input.embodiment,
    rendererHints: {
      ...input.embodiment.rendererHints,
      residentMode,
      preferredBlinkCadence,
      preferredGazeMode,
      preferredExpressionAliases: [...new Set(preferredExpressionAliases)],
      preferredMotionAliases: [...new Set(preferredMotionAliases)],
    },
  } satisfies AlicizationDialogueEmbodimentEnvelope
}

function resolvePendingSameHerEmbodimentRepairPressureRendererHintsFromConsciousFrame(
  currentConsciousFrame: AlicizationCurrentConsciousFrameSnapshot | null | undefined,
): RuntimeGovernanceRendererHints | null {
  const reasonTags = currentConsciousFrame?.reasonTags ?? []
  const hasPendingEmbodimentRepairPressure
    = reasonTags.includes('same-her-causality-repair-pressure')
      && reasonTags.includes('runtimeSameHerEmbodimentCausality')
  if (!hasPendingEmbodimentRepairPressure)
    return null

  return {
    preferredBlinkCadence: 'quiet',
    preferredGazeMode: 'soften',
    preferredLipsyncMode: 'restrained',
    preferredMotionAliases: ['idle_settle'],
    reasonTags: Array.from(new Set([
      ...pendingSameHerEmbodimentRepairPressureReasonTags,
      ...reasonTags,
    ])).slice(0, 12),
  } satisfies RuntimeGovernanceRendererHints
}

function mergeRuntimeGovernanceRendererHints(input: {
  current: RuntimeGovernanceRendererHints | null | undefined
  pressure: RuntimeGovernanceRendererHints | null
}): RuntimeGovernanceRendererHints | null {
  if (!input.pressure)
    return input.current ?? null

  const currentReasonTags = Array.isArray(input.current?.reasonTags)
    ? input.current.reasonTags
    : []
  const pressureReasonTags = Array.isArray(input.pressure.reasonTags)
    ? input.pressure.reasonTags
    : []
  const currentMotionAliases = Array.isArray(input.current?.preferredMotionAliases)
    ? input.current.preferredMotionAliases
    : []
  const pressureMotionAliases = Array.isArray(input.pressure.preferredMotionAliases)
    ? input.pressure.preferredMotionAliases
    : []

  return {
    ...(input.current ? input.current : {}),
    preferredBlinkCadence: input.pressure.preferredBlinkCadence ?? input.current?.preferredBlinkCadence,
    preferredGazeMode: input.pressure.preferredGazeMode ?? input.current?.preferredGazeMode,
    preferredLipsyncMode: input.pressure.preferredLipsyncMode ?? input.current?.preferredLipsyncMode,
    preferredMotionAliases: Array.from(new Set([
      ...pressureMotionAliases,
      ...currentMotionAliases,
    ])),
    reasonTags: Array.from(new Set([
      ...currentReasonTags,
      ...pressureReasonTags,
    ])).slice(0, 12),
  } satisfies RuntimeGovernanceRendererHints
}

function applyPendingSameHerEmbodimentRepairPressureToGovernanceEmbodiment(input: {
  embodiment: AlicizationDialogueEmbodimentEnvelope
  pressure: RuntimeGovernanceRendererHints | null
}) {
  if (!input.pressure)
    return input.embodiment

  return {
    ...input.embodiment,
    rendererHints: mergeRuntimeGovernanceRendererHints({
      current: input.embodiment.rendererHints,
      pressure: input.pressure,
    }),
  } satisfies AlicizationDialogueEmbodimentEnvelope
}

function applyPendingSameHerEmbodimentRepairPressureToGovernanceSpeechTimeline(input: {
  speechTimeline: AlicizationDialogueSpeechTimeline | null
  pressure: RuntimeGovernanceRendererHints | null
}) {
  if (!input.speechTimeline || !input.pressure)
    return input.speechTimeline

  return {
    ...input.speechTimeline,
    segments: input.speechTimeline.segments.map(segment => ({
      ...segment,
      rendererHints: mergeRuntimeGovernanceRendererHints({
        current: segment.rendererHints,
        pressure: input.pressure,
      }),
    })),
  } satisfies AlicizationDialogueSpeechTimeline
}

function applyPendingSameHerEmbodimentRepairPressureToGovernanceEmbodimentScript(input: {
  embodimentScript: AlicizationDialogueStructuredPayload['embodimentScript']
  pressure: RuntimeGovernanceRendererHints | null
}): AlicizationDialogueStructuredPayload['embodimentScript'] {
  if (!input.embodimentScript || !input.pressure)
    return input.embodimentScript

  return {
    ...input.embodimentScript,
    speechPlan: {
      ...input.embodimentScript.speechPlan,
      segments: input.embodimentScript.speechPlan.segments.map(segment => ({
        ...segment,
        rendererHints: mergeRuntimeGovernanceRendererHints({
          current: segment.rendererHints,
          pressure: input.pressure,
        }),
      })),
    },
    motionPlan: {
      ...input.embodimentScript.motionPlan,
      idleBase: 'idle_settle',
      actionBursts: input.embodimentScript.motionPlan.actionBursts.map(burst => ({
        ...burst,
        actionCue: 'idle_settle',
      })),
    },
  }
}

function preserveReplyOnlyMeasuredReturnDigitalLifeSettleBaseline(input: {
  digitalLife: AlicizationDialogueStructuredPayload['digitalLife']
  enabled: boolean
  renderer: CharacterPerformanceCapabilitiesManifest['renderer'] | null | undefined
}) {
  if (!input.enabled || input.renderer === 'vrm' || !input.digitalLife)
    return input.digitalLife

  if (input.digitalLife.action.actionCue !== 'observe_focus')
    return input.digitalLife

  return {
    ...input.digitalLife,
    action: {
      ...input.digitalLife.action,
      actionCue: 'idle_settle',
    },
  } satisfies AlicizationDialogueStructuredPayload['digitalLife']
}

function shouldPreserveLowerPressureMemoryCarryMeasuredReturnDigitalLifeSettleBaseline(input: {
  digitalLifeSpine?: AlicizationDialogueStructuredPayload['digitalLifeSpine']
  explicitPerformance?: AlicizationDialoguePerformancePayload | null
  residentPerformance?: AlicizationResidentPerformanceSnapshot | null
  renderer: CharacterPerformanceCapabilitiesManifest['renderer'] | null | undefined
}) {
  if (input.renderer === 'vrm' || input.explicitPerformance)
    return false

  if (input.residentPerformance?.reasonTags?.includes('measured-return'))
    return false

  const digitalLifeSpine = input.digitalLifeSpine
  if (!digitalLifeSpine)
    return false
  const humanlikeRecallEmbodimentCarry = readHumanlikeRecallEmbodimentCarry({
    digitalLifeSpine,
  })

  if (digitalLifeSpine.proactive?.continuityRestraint)
    return false
  if (digitalLifeSpine.runtime?.continuityArcStage !== 'same-thread-continuation')
    return false

  const projection = digitalLifeSpine.memory?.personStateProjection
  if (!projection)
    return false

  const activeClosenessContext = sanitizeGovernanceCadenceText(projection.activeClosenessContext, 80)
  const callbackAfterglowCarry = includesGovernanceCadenceNeedle(activeClosenessContext, ['callback-afterglow'])
  const humanlikeContinuityCarry
    = humanlikeRecallEmbodimentCarry.hasMeasuredReturnEmbodimentCarry
      && includesGovernanceCadenceNeedle(activeClosenessContext, [
        'same-person-continuity',
        'same-person continuity',
        'continuity',
      ])
  if (!callbackAfterglowCarry && !humanlikeContinuityCarry)
    return false

  const selectedAction = sanitizeGovernanceCadenceText(digitalLifeSpine.runtime?.selectedAction, 80)
  if (selectedAction !== 'silent-observe')
    return false

  if (!hasGovernanceLowerPressureRelationshipTiming({ digitalLifeSpine }))
    return false

  const memoryCarryEvidence = [
    sanitizeGovernanceCadenceText(digitalLifeSpine.memory?.summary, 220),
    sanitizeGovernanceCadenceText(digitalLifeSpine.memory?.thoughtThreadSummary, 220),
    sanitizeGovernanceCadenceText(digitalLifeSpine.memory?.dominantConcernSummary, 220),
    sanitizeGovernanceCadenceText(projection.summary, 220),
    sanitizeGovernanceCadenceText(projection.openingGuidance, 220),
    sanitizeGovernanceCadenceText(projection.manifestationCadenceSummary, 220),
    sanitizeGovernanceCadenceText(projection.selfContinuityAuthority?.relationshipLine, 220),
    sanitizeGovernanceCadenceText(projection.selfContinuityAuthority?.motiveLine, 220),
    sanitizeGovernanceCadenceText(projection.selfContinuityAuthority?.habitLine, 220),
    sanitizeGovernanceCadenceText(projection.selfContinuityAuthority?.authoritySummary, 220),
    sanitizeGovernanceCadenceText(digitalLifeSpine.outcomeLearning?.latestInflection, 220),
    sanitizeGovernanceCadenceText(digitalLifeSpine.runtime?.continuityCue, 220),
  ].filter(Boolean).join(' ')

  return includesGovernanceCadenceNeedle(memoryCarryEvidence, [
    'lower-pressure',
    'keep more room',
    'avoid crowding',
    'return more softly',
    'stay slower',
    'slower reopening',
  ])
}

function mergeAuthoritativeDigitalLifeFace(
  provided: AlicizationDigitalLifeEnvelope['face'],
  authoritative: AlicizationDigitalLifeEnvelope['face'],
) {
  const providedRendererHints = provided.rendererHints
  const authoritativeRendererHints = authoritative.rendererHints
  const hasConcreteProvidedResidentHints = Boolean(
    providedRendererHints?.residentMode
    || providedRendererHints?.preferredBlinkCadence
    || providedRendererHints?.preferredGazeMode,
  )

  return {
    ...provided,
    emotion: authoritative.emotion,
    facialCue: authoritative.facialCue,
    expressionMode: authoritative.expressionMode,
    rendererHints: hasConcreteProvidedResidentHints
      ? providedRendererHints
      : {
          ...providedRendererHints,
          ...authoritativeRendererHints,
          preferredExpressionAliases: providedRendererHints?.preferredExpressionAliases ?? authoritativeRendererHints?.preferredExpressionAliases,
          preferredMotionAliases: providedRendererHints?.preferredMotionAliases ?? authoritativeRendererHints?.preferredMotionAliases,
        },
  }
}

function mergeAuthoritativeDigitalLifeAction(
  provided: AlicizationDigitalLifeEnvelope['action'],
  authoritative: AlicizationDigitalLifeEnvelope['action'],
) {
  const providedRendererHints = provided.rendererHints
  const authoritativeRendererHints = authoritative.rendererHints
  const hasConcreteProvidedResidentHints = Boolean(
    providedRendererHints?.residentMode
    || providedRendererHints?.preferredBlinkCadence
    || providedRendererHints?.preferredGazeMode,
  )

  return {
    ...provided,
    actionCue: authoritative.actionCue,
    actionMode: authoritative.actionMode,
    rendererHints: hasConcreteProvidedResidentHints
      ? providedRendererHints
      : {
          ...providedRendererHints,
          ...authoritativeRendererHints,
          preferredExpressionAliases: providedRendererHints?.preferredExpressionAliases ?? authoritativeRendererHints?.preferredExpressionAliases,
          preferredMotionAliases: providedRendererHints?.preferredMotionAliases ?? authoritativeRendererHints?.preferredMotionAliases,
        },
  }
}

function reconcileProvidedDigitalLifeWithAuthority(input: {
  provided: AlicizationDigitalLifeEnvelope
  authoritative: AlicizationDigitalLifeEnvelope
}): AlicizationDigitalLifeEnvelope {
  const authoritativeFrames = input.authoritative.frames
  const providedFrames = input.provided.frames
  const authoritativeFrameById = new Map(authoritativeFrames.map(frame => [frame.id, frame] as const))
  const normalizeFrameText = (text: string) => text.trim()

  return {
    ...input.provided,
    version: input.authoritative.version,
    variationToken: input.authoritative.variationToken,
    emotion: input.authoritative.emotion,
    mode: input.authoritative.mode,
    postureHint: input.authoritative.postureHint,
    performance: input.authoritative.performance,
    speechStyle: input.authoritative.speechStyle,
    rendererHints: input.provided.rendererHints ?? input.authoritative.rendererHints,
    face: mergeAuthoritativeDigitalLifeFace(input.provided.face, input.authoritative.face),
    action: mergeAuthoritativeDigitalLifeAction(input.provided.action, input.authoritative.action),
    frames: providedFrames.map((providedFrame, index) => {
      const authoritativeFrame = authoritativeFrameById.get(providedFrame.id)
        ?? (() => {
          const candidate = authoritativeFrames[index]
          if (!candidate)
            return null

          const providedText = normalizeFrameText(providedFrame.text)
          const candidateText = normalizeFrameText(candidate.text)
          return providedText !== ''
            && candidateText !== ''
            && providedText === candidateText
            ? candidate
            : null
        })()
      if (!authoritativeFrame)
        return providedFrame

      return {
        ...providedFrame,
        id: authoritativeFrame.id,
        index: authoritativeFrame.index,
        startOffset: authoritativeFrame.startOffset,
        endOffset: authoritativeFrame.endOffset,
        text: authoritativeFrame.text,
        mode: authoritativeFrame.mode,
        interruptPolicy: authoritativeFrame.interruptPolicy,
        settleMode: authoritativeFrame.settleMode,
        face: mergeAuthoritativeDigitalLifeFace(providedFrame.face, authoritativeFrame.face),
        action: mergeAuthoritativeDigitalLifeAction(providedFrame.action, authoritativeFrame.action),
      }
    }),
  }
}

function alignSpeechTimelineToDigitalLifeFrames(input: {
  speechTimeline: AlicizationDialogueSpeechTimeline | null
  digitalLife: AlicizationDigitalLifeEnvelope | null
}) {
  if (!input.speechTimeline || !input.digitalLife?.frames.length)
    return input.speechTimeline

  const nonEmptyFrames = input.digitalLife.frames.filter(frame => frame.text.trim().length > 0)
  if (!nonEmptyFrames.length)
    return input.speechTimeline

  return {
    ...input.speechTimeline,
    segments: input.speechTimeline.segments.map((segment, index) => {
      const alignedFrame = nonEmptyFrames[index]
      if (!alignedFrame)
        return segment

      return {
        ...segment,
        id: alignedFrame.id,
        index: alignedFrame.index,
        startOffset: alignedFrame.startOffset,
        endOffset: alignedFrame.endOffset,
        text: alignedFrame.text,
      }
    }),
  } satisfies AlicizationDialogueSpeechTimeline
}

export interface AlicizationChatStreamEmbodimentMeta {
  governance: AlicizationMindTurnGovernance | null
  embodiment: AlicizationDialogueEmbodimentEnvelope | null
  embodimentScript: AlicizationDialogueStructuredPayload['embodimentScript']
  speechTimeline: AlicizationDialogueSpeechTimeline | null
  digitalLife: AlicizationDialogueStructuredPayload['digitalLife']
  digitalLifeSpine?: AlicizationDialogueStructuredPayload['digitalLifeSpine'] | null
}

function resolveEmbodimentScriptRendererTarget(
  performanceManifest?: CharacterPerformanceCapabilitiesManifest | null,
) {
  return performanceManifest?.renderer === 'vrm' ? 'vrm' : 'live2d'
}

export function buildRuntimeGovernanceEmbodimentScript(input: {
  decisionTraceId?: string | null
  turnId: string
  replyText: string
  performance: AlicizationDialoguePerformancePayload
  speechTimeline: AlicizationDialogueSpeechTimeline | null
  digitalLifeSpine?: AlicizationDialogueStructuredPayload['digitalLifeSpine']
  performanceManifest?: CharacterPerformanceCapabilitiesManifest | null
  residentMode: 'dialogue' | 'idle-recovering'
}) {
  if (!input.speechTimeline)
    return null

  const lowerPressureTiming = hasGovernanceLowerPressureRelationshipTiming({
    digitalLifeSpine: input.digitalLifeSpine,
  })
  const speechSegments = input.speechTimeline.segments.map(segment =>
    buildRuntimeGovernanceEmbodimentSpeechSegment(segment, { lowerPressureTiming }))

  return normalizeAlicizationEmbodimentScript({
    version: 'embodiment-script-v1',
    decisionTraceId: input.decisionTraceId ?? null,
    turnId: input.turnId,
    rendererTarget: resolveEmbodimentScriptRendererTarget(input.performanceManifest),
    replyText: input.replyText,
    state: {
      baseEmotion: input.performance.baseEmotion,
      delivery: input.performance.delivery,
      emphasis: input.performance.emphasis,
      residentMode: input.residentMode,
    },
    speechPlan: {
      segments: speechSegments,
      interruptPolicy: input.speechTimeline.segments.some(segment => segment.interruptMode === 'hard-interrupt')
        ? 'hard-stop'
        : 'soft-settle',
      preRollMs: input.speechTimeline.segments.some(segment => segment.actionWindow === 'segment-start') ? 40 : 0,
      settleMs: speechSegments.reduce((max, segment) => Math.max(max, segment.settleMs), lowerPressureTiming ? 220 : 120),
    },
    facePlan: {
      preUtteranceCue: lowerPressureTiming ? 'steady-inhale' : null,
      postUtteranceCue: lowerPressureTiming ? 'eyes-soften' : null,
      speakingCues: input.speechTimeline.segments.map((segment, index) => buildAlicizationEmbodimentFaceCue({
        segment: speechSegments[index]!,
        timelineSegment: segment,
        fallbackEmotion: input.performance.baseEmotion,
        fallbackFacialCue: input.performance.facialCue ?? null,
        fallbackIntensity: 0.5,
      })),
    },
    motionPlan: {
      idleBase: input.performance.actionCue ?? 'idle_settle',
      actionBursts: input.speechTimeline.segments.map((segment, index) => buildAlicizationEmbodimentMotionBurst({
        segment: speechSegments[index]!,
        timelineSegment: segment,
        fallbackActionCue: input.performance.actionCue ?? null,
        fallbackIntensity: 0,
      })),
      attentionMode: 'attentive',
    },
    lipsyncPlan: {
      mode: input.performanceManifest?.supportsVisemeLipSync === true ? 'energy-phoneme-hybrid' : 'energy-only',
      visemeHints: input.performanceManifest?.supportsVisemeLipSync === true
        ? input.speechTimeline.segments.flatMap((segment, index) => buildAlicizationEmbodimentLipSyncHints({
            segment: speechSegments[index]!,
            timelineSegment: segment,
          }))
        : undefined,
    },
  })
}

function shouldPreserveExplicitVrmStreamMetaActionCue(input: {
  explicitPerformance?: AlicizationDialoguePerformancePayload | null
  performanceManifest?: CharacterPerformanceCapabilitiesManifest | null
  digitalLifeSpine?: AlicizationDialogueStructuredPayload['digitalLifeSpine']
}) {
  if (input.performanceManifest?.renderer !== 'vrm')
    return false

  const actionCue = input.explicitPerformance?.actionCue?.trim()
  if (!actionCue)
    return false

  const continuityArcStage = input.digitalLifeSpine?.runtime?.continuityArcStage ?? null
  const continuityRestraint = input.digitalLifeSpine?.proactive?.continuityRestraint ?? null
  return continuityArcStage === 'same-thread-continuation'
    && (continuityRestraint === 'measured-return' || continuityRestraint === 'repair-before-closeness')
}

function manifestSupportsActionCue(
  manifest: CharacterPerformanceCapabilitiesManifest | null | undefined,
  actionCue: string,
) {
  return Array.isArray(manifest?.supportedActions)
    && manifest.supportedActions.some((candidate) => {
      if (typeof candidate === 'string')
        return candidate === actionCue

      return typeof candidate?.key === 'string' && candidate.key === actionCue
    })
}

function resolveMeasuredReturnVrmActionCueOverride(input: {
  performance?: AlicizationDialoguePerformancePayload | null
  performanceManifest?: CharacterPerformanceCapabilitiesManifest | null
  digitalLifeSpine?: AlicizationDialogueStructuredPayload['digitalLifeSpine']
}) {
  if (input.performanceManifest?.renderer !== 'vrm')
    return null

  const actionCue = input.performance?.actionCue?.trim()
  if (actionCue !== 'leave-room')
    return null
  if (!manifestSupportsActionCue(input.performanceManifest, 'inspect_follow'))
    return null

  const continuityArcStage = input.digitalLifeSpine?.runtime?.continuityArcStage ?? null
  const continuityRestraint = input.digitalLifeSpine?.proactive?.continuityRestraint ?? null
  return continuityArcStage === 'same-thread-continuation' && continuityRestraint === 'measured-return'
    ? 'inspect_follow'
    : null
}

function applyExplicitVrmStreamMetaActionCueOverride(input: {
  speechTimeline: AlicizationDialogueSpeechTimeline | null
  explicitPerformance?: AlicizationDialoguePerformancePayload | null
  performanceManifest?: CharacterPerformanceCapabilitiesManifest | null
  digitalLifeSpine?: AlicizationDialogueStructuredPayload['digitalLifeSpine']
}) {
  if (!shouldPreserveExplicitVrmStreamMetaActionCue(input) || !input.speechTimeline)
    return input.speechTimeline

  return {
    ...input.speechTimeline,
    segments: input.speechTimeline.segments.map(segment => ({
      ...segment,
      actionCue: input.explicitPerformance?.actionCue ?? segment.actionCue,
    })),
  } satisfies AlicizationDialogueSpeechTimeline
}

export function buildAlicizationChatStreamEmbodimentMeta(input: {
  governance?: unknown
  digitalLifeSpine?: AlicizationDialogueStructuredPayload['digitalLifeSpine']
  affectiveResidue?: AlicizationAffectiveResidueMemorySnapshot | null
  currentConsciousFrame?: AlicizationGovernanceCurrentConsciousFrameInput
  performanceManifest?: CharacterPerformanceCapabilitiesManifest | null
  residentPerformance?: AlicizationResidentPerformanceSnapshot | null
  explicitPerformance?: AlicizationDialoguePerformancePayload | null
  reply?: string
  thought?: string
  turnId?: string
}): AlicizationChatStreamEmbodimentMeta {
  const governance = normalizeMindTurnGovernance(input.governance)
  if (!governance) {
    return {
      governance: null,
      embodiment: null,
      embodimentScript: null,
      speechTimeline: null,
      digitalLife: null,
      digitalLifeSpine: null,
    }
  }

  const normalizedCurrentConsciousFrame = coerceGovernanceCurrentConsciousFrame(input.currentConsciousFrame)
  const pendingSameHerEmbodimentRepairPressureRendererHints
    = resolvePendingSameHerEmbodimentRepairPressureRendererHintsFromConsciousFrame(normalizedCurrentConsciousFrame)
  const reply = readStringValue(input.reply).trim()
  const thought = readStringValue(input.thought).trim()
  const rawConcernCarry
    = thought.toLowerCase().includes('concerned-but-restrained')
      || thought.toLowerCase().includes('concerned measured-return continuation')
  const preliminaryCompanionshipHoldMode = inferCompanionshipHoldModeFromDigitalLifeSpine({
    digitalLifeSpine: input.digitalLifeSpine,
    currentConsciousFrame: normalizedCurrentConsciousFrame,
  })
  const sameThreadMeasuredReturnVisibleConcernCarry
    = /更在意些|gentle and not widen the line|stay concerned but measured-return/u.test(reply)
      && (
        input.digitalLifeSpine?.runtime?.continuityArcStage === 'same-thread-continuation'
        || normalizedCurrentConsciousFrame?.projectState?.continuityArcStage === 'same-thread-continuation'
        || thought.toLowerCase().includes('same-thread-continuation')
        || (input.turnId ?? '').includes('measured-return-concerned')
      )
      && (
        input.residentPerformance?.reasonTags?.includes('measured-return')
        || preliminaryCompanionshipHoldMode === 'measured-return'
      )
  const resolvedEmbodiment = resolveAlicizationDialogueEmbodiment({
    governance,
    performanceManifest: input.performanceManifest,
    reply,
    thought,
    turnId: input.turnId,
  })
  const explicitPerformance = input.explicitPerformance
    ? normalizeAlicizationPerformancePayload(
        input.explicitPerformance,
        input.explicitPerformance.baseEmotion,
      )
    : null
  const humanlikeRecallEmbodimentCarry = readHumanlikeRecallEmbodimentCarry({
    digitalLifeSpine: input.digitalLifeSpine,
  })
  let residentSeededPerformance = resolveResidentFallbackDialoguePerformance(
    explicitPerformance ?? resolvedEmbodiment.performance,
    input.residentPerformance?.performance,
  )
  const shouldCarryResidentReplyOnlyAuthority = shouldCarryResidentReplyOnlyCompanionshipAuthority({
    candidate: residentSeededPerformance,
    residentPerformance: input.residentPerformance ?? null,
    reply,
    thought,
  })
  if (shouldCarryResidentReplyOnlyAuthority) {
    const resident = normalizeAlicizationPerformancePayload(
      input.residentPerformance!.performance,
      input.residentPerformance!.performance.baseEmotion,
    )
    residentSeededPerformance = normalizeAlicizationPerformancePayload({
      baseEmotion: resident.baseEmotion,
      emotion: resident.baseEmotion,
      facialCue: resident.facialCue ?? residentSeededPerformance.facialCue ?? null,
      actionCue: resident.actionCue ?? residentSeededPerformance.actionCue ?? null,
      delivery: resident.delivery,
      emphasis: resident.emphasis,
    }, resident.baseEmotion)
  }
  if (
    !explicitPerformance
    && preliminaryCompanionshipHoldMode === 'measured-return'
    && humanlikeRecallEmbodimentCarry.prefersGentleDelivery
    && residentSeededPerformance.delivery === 'hesitant'
  ) {
    residentSeededPerformance = normalizeAlicizationPerformancePayload({
      ...residentSeededPerformance,
      delivery: 'gentle',
    }, residentSeededPerformance.baseEmotion)
  }
  let embodiment = applyDialoguePerformanceSeedToEmbodiment(
    resolvedEmbodiment,
    residentSeededPerformance,
  )
  if (shouldCarryResidentReplyOnlyAuthority && input.residentPerformance) {
    embodiment = applyResidentRendererHintsToEmbodiment({
      embodiment,
      residentPerformance: input.residentPerformance,
      continuitySource: {
        manifestationCadenceSummary: input.digitalLifeSpine?.proactive?.personaBias?.manifestationCadenceSummary ?? null,
        relationshipDoctrine: input.digitalLifeSpine?.embodiment?.autobiographicalSelf?.relationshipDoctrine ?? null,
        latestInflection: input.digitalLifeSpine?.outcomeLearning?.latestInflection ?? null,
        continuityCue:
          input.digitalLifeSpine?.runtime?.continuityCue
          ?? input.digitalLifeSpine?.runtime?.projectState?.continuityCue
          ?? null,
      },
    })
  }
  const shouldPreserveConcernCarryInMeta
    = (rawConcernCarry || sameThreadMeasuredReturnVisibleConcernCarry)
      && embodiment.emotion === 'thinking'
      && embodiment.performance.baseEmotion === 'thinking'
      && embodiment.performance.delivery === 'gentle'
      && (
        input.residentPerformance?.reasonTags?.includes('measured-return')
        || preliminaryCompanionshipHoldMode === 'measured-return'
      )
  if (shouldPreserveConcernCarryInMeta) {
    embodiment = {
      ...embodiment,
      emotion: 'concerned',
      performance: {
        ...embodiment.performance,
        baseEmotion: 'concerned',
        emotion: 'concerned',
      },
    }
  }
  embodiment = applyPendingSameHerEmbodimentRepairPressureToGovernanceEmbodiment({
    embodiment,
    pressure: pendingSameHerEmbodimentRepairPressureRendererHints,
  })
  const seededSpeechTimeline = applyExplicitVrmStreamMetaActionCueOverride({
    speechTimeline: applyPendingSameHerEmbodimentRepairPressureToGovernanceSpeechTimeline({
      speechTimeline: buildAlicizationDialogueSpeechTimeline({
        reply,
        candidateEmotion: embodiment.emotion,
        candidatePerformance: embodiment.performance,
        embodiment,
        digitalLifeSpine: input.digitalLifeSpine,
        projectState: (
          (normalizedCurrentConsciousFrame?.projectState
            ?? input.digitalLifeSpine?.runtime?.projectState
            ?? null) as AlicizationCurrentConsciousFrameSnapshot['projectState']
        ) ?? null,
        performanceManifest: input.performanceManifest,
      }),
      pressure: pendingSameHerEmbodimentRepairPressureRendererHints,
    }),
    explicitPerformance,
    performanceManifest: input.performanceManifest,
    digitalLifeSpine: input.digitalLifeSpine,
  })
  const seededDigitalLifeSpine = repairProjectStateCarryOnDigitalLifeSpine({
    digitalLifeSpine: normalizeGovernanceDigitalLifeSpineDigest(input.digitalLifeSpine),
    sameHerSelfLine: input.digitalLifeSpine?.runtime?.projectState?.sameHerSelfLine ?? null,
  })
  const currentProjectState = normalizedCurrentConsciousFrame?.projectState ?? null
  const seededProjectState = seededDigitalLifeSpine?.runtime?.projectState as (AlicizationCurrentConsciousFrameSnapshot['projectState'] & {
    emotionalClosureSummary?: string | null
  }) | null | undefined
  const mergedProjectStateSpine = (seededProjectState || currentProjectState
    ? {
        ...seededDigitalLifeSpine,
        runtime: {
          ...seededDigitalLifeSpine?.runtime,
          projectState: {
            ...seededProjectState,
            primaryOpenLoop:
              typeof seededProjectState?.primaryOpenLoop === 'string'
              && seededProjectState.primaryOpenLoop.trim()
                ? seededProjectState.primaryOpenLoop
                : typeof currentProjectState?.primaryOpenLoop === 'string'
                  ? currentProjectState.primaryOpenLoop
                  : seededProjectState?.primaryOpenLoop ?? null,
            nextClosureTarget:
              typeof seededProjectState?.nextClosureTarget === 'string'
              && seededProjectState.nextClosureTarget.trim()
                ? seededProjectState.nextClosureTarget
                : typeof currentProjectState?.nextClosureTarget === 'string'
                  ? currentProjectState.nextClosureTarget
                  : seededProjectState?.nextClosureTarget ?? null,
            emotionalClosureSummary:
              typeof seededProjectState?.emotionalClosureSummary === 'string'
              && seededProjectState.emotionalClosureSummary.trim()
                ? seededProjectState.emotionalClosureSummary
                : typeof currentProjectState?.emotionalClosureSummary === 'string'
                  ? currentProjectState.emotionalClosureSummary
                  : seededProjectState?.emotionalClosureSummary ?? null,
            sameHerHoldDetail:
              typeof seededProjectState?.sameHerHoldDetail === 'string'
              && seededProjectState.sameHerHoldDetail.trim()
                ? seededProjectState.sameHerHoldDetail
                : typeof currentProjectState?.sameHerHoldDetail === 'string'
                  ? currentProjectState.sameHerHoldDetail
                  : seededProjectState?.sameHerHoldDetail ?? null,
            sameHerSelfLine:
              typeof seededProjectState?.sameHerSelfLine === 'string'
              && seededProjectState.sameHerSelfLine.trim()
                ? seededProjectState.sameHerSelfLine
                : typeof currentProjectState?.sameHerSelfLine === 'string'
                  ? currentProjectState.sameHerSelfLine
                  : seededProjectState?.sameHerSelfLine ?? null,
          },
        },
      }
    : seededDigitalLifeSpine) as AlicizationDialogueStructuredPayload['digitalLifeSpine']
  const companionshipHoldMode = inferCompanionshipHoldModeFromDigitalLifeSpine({
    digitalLifeSpine: mergedProjectStateSpine,
    currentConsciousFrame: normalizedCurrentConsciousFrame,
  })
  const emittedDigitalLifeSpine = applyCompanionshipHoldModeToDigitalLifeSpine({
    digitalLifeSpine: mergedProjectStateSpine,
    fallbackContinuityAuthority: input.digitalLifeSpine,
    companionshipHoldMode,
  })
  const authority = coordinateAlicizationRuntimeEmbodiment({
    seed: buildAlicizationRuntimeEmbodimentSeed({
      decisionTraceId: governance.decisionTraceId ?? null,
      turnId: input.turnId ?? 'unknown-turn',
      reply,
      performance: embodiment.performance,
      embodiment,
      speechTimeline: seededSpeechTimeline,
      digitalLife: null,
      digitalLifeSpine: (emittedDigitalLifeSpine ?? null) as NonNullable<Parameters<typeof buildAlicizationRuntimeEmbodimentSeed>[0]>['digitalLifeSpine'],
      affectiveResidue: input.affectiveResidue ?? null,
      currentConsciousFrame: normalizedCurrentConsciousFrame,
    }),
    manifest: input.performanceManifest,
    residentPerformance: input.residentPerformance ?? null,
  })
  const emittedEmbodiment = (shouldPreserveConcernCarryInMeta && authority.embodiment
    ? {
        ...authority.embodiment,
        emotion: 'concerned',
        performance: {
          ...authority.embodiment.performance,
          baseEmotion: 'concerned',
          emotion: 'concerned',
        },
      }
    : authority.embodiment) as AlicizationDialogueEmbodimentEnvelope | null
  const emittedEmbodimentScript = (shouldPreserveConcernCarryInMeta && authority.embodimentScript
    ? {
        ...authority.embodimentScript,
        state: {
          ...authority.embodimentScript.state,
          baseEmotion: 'concerned',
        },
      }
    : authority.embodimentScript) as AlicizationDialogueStructuredPayload['embodimentScript']
  const pressureAdjustedEmbodimentScript = applyPendingSameHerEmbodimentRepairPressureToGovernanceEmbodimentScript({
    embodimentScript: emittedEmbodimentScript,
    pressure: pendingSameHerEmbodimentRepairPressureRendererHints,
  })
  const shouldPreserveMeasuredReturnDigitalLifeSettleBaseline
    = shouldCarryResidentReplyOnlyAuthority
      || shouldPreserveLowerPressureMemoryCarryMeasuredReturnDigitalLifeSettleBaseline({
        digitalLifeSpine: input.digitalLifeSpine,
        explicitPerformance,
        residentPerformance: input.residentPerformance ?? null,
        renderer: input.performanceManifest?.renderer ?? null,
      })
  const emittedDigitalLife = preserveReplyOnlyMeasuredReturnDigitalLifeSettleBaseline({
    enabled: shouldPreserveMeasuredReturnDigitalLifeSettleBaseline && !explicitPerformance,
    renderer: input.performanceManifest?.renderer ?? null,
    digitalLife: (shouldPreserveConcernCarryInMeta && authority.digitalLife
      ? {
          ...authority.digitalLife,
          spine: emittedDigitalLifeSpine ?? null,
          emotion: 'concerned',
          performance: {
            ...authority.digitalLife.performance,
            baseEmotion: 'concerned',
            emotion: 'concerned',
          },
        }
      : authority.digitalLife
        ? {
            ...authority.digitalLife,
            spine: emittedDigitalLifeSpine ?? null,
          }
        : authority.digitalLife) as AlicizationDialogueStructuredPayload['digitalLife'],
  })
  const emittedSpeechTimeline = applyPendingSameHerEmbodimentRepairPressureToGovernanceSpeechTimeline({
    speechTimeline: authority.speechTimeline,
    pressure: pendingSameHerEmbodimentRepairPressureRendererHints,
  })

  return {
    governance,
    embodiment: emittedEmbodiment,
    embodimentScript: pressureAdjustedEmbodimentScript,
    speechTimeline: emittedSpeechTimeline,
    digitalLife: emittedDigitalLife,
    digitalLifeSpine: emittedDigitalLifeSpine,
  }
}

export function normalizeProactiveMetadata(raw: unknown): AlicizationProactiveMetadata | undefined {
  const candidate = raw && typeof raw === 'object' ? raw as Record<string, unknown> : null
  if (!candidate)
    return undefined
  const scenario = typeof candidate?.scenario === 'string'
    && ['coding', 'media', 'late-night-care', 'general'].includes(candidate.scenario)
    ? candidate.scenario as AlicizationProactiveMetadata['scenario']
    : null
  const style = typeof candidate?.style === 'string'
    && ['silent-observe', 'light-nudge', 'gentle-care', 'firm-warning'].includes(candidate.style)
    ? candidate.style as AlicizationProactiveMetadata['style']
    : null
  const urgency = typeof candidate?.urgency === 'string'
    && ['low', 'medium', 'high'].includes(candidate.urgency)
    ? candidate.urgency as AlicizationProactiveMetadata['urgency']
    : null
  if (!scenario || !style || !urgency)
    return undefined

  const rawReasonCodes = Array.isArray(candidate.reasonCodes) ? candidate.reasonCodes : []
  const staticReasonCodes = new Set<AlicizationProactiveStaticReasonCode>([
    'busy-host',
    'fullscreen-host',
    'kill-switch-suspended',
    'global-cooldown-active',
    'attention-anchor-active',
    'recent-observation-memory',
    'invited-inspection-active',
    'scenario-bias-raised',
    'recent-ignored-penalty',
    'recent-dismiss-penalty',
    'recent-positive-feedback',
    'cadence-opening-ready',
    'cadence-initiative-trust',
    'cadence-pressure-rising',
    'coding-focus',
    'media-playback',
    'late-night-activity',
    'late-night-fatigue',
    'high-loneliness',
    'high-boredom',
    'user-idle',
    'foreground-error',
    'foreground-diff',
    'reminder-backlog',
    'afterglow-opening',
    'durability-pulse',
    'durability-process-gone',
    'durability-anr-likely',
    'private-thought-observe-only',
    'private-thought-uncertain',
    'belief-tentative',
    'belief-contradicted',
    'inquiry-open',
    'relationship-guarded',
    'relationship-attuned',
    'relationship-correction-sensitive',
    'living-world-open-loop',
    'governor-withhold',
    'governor-repair',
    'governor-care',
    'thought-thread-ripe',
    'thought-thread-waiting',
    'watch-mode-symbiotic',
    'watch-mode-invited-inspection',
    'watch-mode-recovering',
    'runtime-dialogue-ready',
    'runtime-observe-dominant',
    'runtime-control-ready',
    'runtime-continuity-pressure',
    'runtime-companionship-pressure',
    'continuity-internal-only',
    'continuity-after-payoff',
    'continuity-next-open-window',
    'continuity-execution-callback',
    'relationship-cadence-residue',
    'relationship-residue-delay-warmth',
    'relationship-residue-protect-rest',
  ])
  const reasonCodes = rawReasonCodes
    .filter((reasonCode): reasonCode is AlicizationProactiveMetadata['reasonCodes'][number] => {
      if (typeof reasonCode !== 'string')
        return false
      if (staticReasonCodes.has(reasonCode as AlicizationProactiveStaticReasonCode))
        return true
      if (/^learning:(?:record|reflect|verify|revise|internalize|hold)$/u.test(reasonCode))
        return true
      if (reasonCode.startsWith('learning-focus:')) {
        const focus = readStringValue(reasonCode.slice('learning-focus:'.length)).trim()
        return focus.length > 0
      }
      return false
    })

  const confidence = Number(candidate.confidence)
  const cooldownMs = Number(candidate.cooldownMs)
  const feedbackWindowMs = Number(candidate.feedbackWindowMs)
  const policyVersion = readStringValue(candidate.policyVersion).trim()
  const openingGuidance = readStringValue(candidate.openingGuidance).trim()
  if (!policyVersion || !Number.isFinite(confidence) || !Number.isFinite(cooldownMs) || !Number.isFinite(feedbackWindowMs))
    return undefined

  return {
    shouldInterrupt: candidate.shouldInterrupt === true,
    confidence: Number(clamp01(confidence).toFixed(2)),
    reasonCodes,
    urgency,
    style,
    cooldownMs: Math.max(1_000, Math.floor(cooldownMs)),
    scenario,
    policyVersion,
    feedbackWindowMs: Math.max(1_000, Math.floor(feedbackWindowMs)),
    openingGuidance: openingGuidance || null,
  }
}

export function normalizeMindTurnGovernance(raw: unknown): AlicizationMindTurnGovernance | null {
  const candidate = raw && typeof raw === 'object' && !Array.isArray(raw)
    ? raw as Record<string, unknown>
    : null
  if (!candidate)
    return null

  const turnMode = readStringValue(candidate.turnMode).trim()
  const truthState = readStringValue(candidate.truthState).trim()
  const personaKernelMode = readStringValue(candidate.personaKernelMode).trim()
  const openingStyle = readStringValue(candidate.openingStyle).trim()
  const relationshipPosture = readStringValue(candidate.relationshipPosture).trim()
  const repairState = readStringValue(candidate.repairState).trim()
  if (
    ![
      'grounded-inspection',
      'screen-repair',
      'guide-current-knot',
      'care',
      'accompany',
      'answer',
    ].includes(turnMode)
    || !['live-grounded', 'live-observed', 'dialogue-grounded', 'remembered', 'imagined', 'uncertain'].includes(truthState)
    || !['full', 'backgrounded', 'muted'].includes(personaKernelMode)
    || ![
      'direct-observation',
      'direct-correction',
      'direct-answer',
      'gentle-care',
      'light-accompaniment',
    ].includes(openingStyle)
    || !['restrained', 'warm', 'tender'].includes(relationshipPosture)
    || !['none', 'stale-anchor', 'need-reground'].includes(repairState)
  ) {
    return null
  }

  const answerAct = readStringValue(candidate.answerAct).trim()
  const evidenceMode = readStringValue(candidate.evidenceMode).trim()
  const visibleReplyAuthority = readStringValue(candidate.visibleReplyAuthority).trim()
  const mindMode = readStringValue(candidate.mindMode).trim()
  const embodiedPresence = readStringValue(candidate.embodiedPresence).trim()
  const emotionalTension = readStringValue(candidate.emotionalTension).trim()
  const answerSubject = readStringValue(candidate.answerSubject).trim()
  const screenReferenceMode = readStringValue(candidate.screenReferenceMode).trim()
  const maxSentences = Number(candidate.maxSentences)
  const mustDo = Array.isArray(candidate.mustDo)
    ? candidate.mustDo.map(item => readStringValue(item).trim()).filter(Boolean).slice(0, 8)
    : []
  const mustNotDo = Array.isArray(candidate.mustNotDo)
    ? candidate.mustNotDo.map(item => readStringValue(item).trim()).filter(Boolean).slice(0, 8)
    : []
  const dialogueActKernel = normalizeDialogueActKernel(candidate.dialogueActKernel)
  const mindTurnFrame = normalizeMindTurnFrame(candidate.mindTurnFrame)
  const claimEvidence = normalizeClaimEvidenceLedger(candidate.claimEvidence)
  const decisionTraceId = sanitizeMindGovernanceDecisionTraceId(candidate.decisionTraceId)

  return {
    decisionTraceId: decisionTraceId || null,
    turnMode: turnMode as AlicizationMindTurnGovernance['turnMode'],
    truthState: truthState as AlicizationMindTurnGovernance['truthState'],
    visibleReplyAuthority: visibleReplyAuthority
      ? normalizeAlicizationNormalVisibleReplyAuthority(visibleReplyAuthority as any, 'llm-mind')
      : null,
    groundedThisTurn: candidate.groundedThisTurn === true,
    personaKernelMode: personaKernelMode as AlicizationMindTurnGovernance['personaKernelMode'],
    openingStyle: openingStyle as AlicizationMindTurnGovernance['openingStyle'],
    relationshipPosture: relationshipPosture as AlicizationMindTurnGovernance['relationshipPosture'],
    answerSubject: [
      'alicization-self',
      'relationship',
      'host-state',
      'task-knot',
      'visible-scene',
      'general',
    ].includes(answerSubject)
      ? answerSubject as AlicizationMindTurnGovernance['answerSubject']
      : null,
    screenReferenceMode: [
      'required',
      'helpful',
      'incidental',
      'avoid',
    ].includes(screenReferenceMode)
      ? screenReferenceMode as AlicizationMindTurnGovernance['screenReferenceMode']
      : null,
    answerAct: [
      'answer',
      'guide',
      'ask-reground',
      'correct-stale-anchor',
      'care',
      'defer',
    ].includes(answerAct)
      ? answerAct as AlicizationMindTurnGovernance['answerAct']
      : null,
    evidenceMode: [
      'live-grounded',
      'live-observed',
      'coarse-held',
      'dialogue-grounded',
      'continuity-carry',
      'repair-first',
    ].includes(evidenceMode)
      ? evidenceMode as AlicizationMindTurnGovernance['evidenceMode']
      : null,
    repairState: repairState as AlicizationMindTurnGovernance['repairState'],
    liveSurface: sanitizeBriefText(readStringValue(candidate.liveSurface), 220) || null,
    focusAnchor: sanitizeBriefText(readStringValue(candidate.focusAnchor), 220) || null,
    answerIntent: sanitizeBriefText(readStringValue(candidate.answerIntent), 220) || null,
    openingMove: sanitizeBriefText(readStringValue(candidate.openingMove), 220) || null,
    emotionalClosureCue: sanitizeBriefText(readStringValue(candidate.emotionalClosureCue), 220) || null,
    carriedThread: sanitizeBriefText(readStringValue(candidate.carriedThread), 220) || null,
    suppressAssociativeRecall: candidate.suppressAssociativeRecall === true,
    labelCarryAsMemory: candidate.labelCarryAsMemory === true,
    shouldAskForGrounding: candidate.shouldAskForGrounding === true,
    shouldAcknowledgeRepair: candidate.shouldAcknowledgeRepair === true,
    maxSentences: Number.isFinite(maxSentences)
      ? Math.max(1, Math.min(4, Math.floor(maxSentences)))
      : 2,
    mindMode: [
      'orienting',
      'tracking',
      'repairing',
      'accompanying',
      'guarding',
      'resting',
    ].includes(mindMode)
      ? mindMode as AlicizationMindTurnGovernance['mindMode']
      : null,
    embodiedPresence: [
      'none',
      'glance',
      'attentive',
      'hesitant',
      'concerned',
    ].includes(embodiedPresence)
      ? embodiedPresence as AlicizationMindTurnGovernance['embodiedPresence']
      : undefined,
    emotionalTension: [
      'tense-debug',
      'focused-flow',
      'soft-covision',
      'late-night-drain',
      'restless-switching',
      'calm-browse',
    ].includes(emotionalTension)
      ? emotionalTension as AlicizationMindTurnGovernance['emotionalTension']
      : undefined,
    dialogueActKernel,
    mindTurnFrame,
    claimEvidence,
    mustDo,
    mustNotDo,
  }
}

export function resolveMindGovernanceEmotion(governance: AlicizationMindTurnGovernance, rawEmotion: string) {
  const normalized = normalizeAlicizationEmotion(rawEmotion).emotion
  if (governance.repairState === 'stale-anchor')
    return 'apologetic' as const
  if (governance.repairState === 'need-reground')
    return 'thinking' as const
  if (governance.answerAct === 'care' || governance.turnMode === 'care')
    return 'concerned' as const
  if (
    governance.answerAct === 'guide'
    || governance.turnMode === 'guide-current-knot'
    || governance.turnMode === 'grounded-inspection'
  ) {
    return normalized === 'neutral' ? 'thinking' : normalized
  }
  if (normalized !== 'neutral')
    return normalized
  return (governance.mindTurnFrame?.relation.relationshipPosture ?? governance.relationshipPosture) === 'tender'
    ? 'concerned'
    : 'neutral'
}

export {
  formatGovernedMindMessage,
  governedMindFallbackLocale,
  governedMindFallbackMessageFallbacks,
  inferGovernedMindFallbackLocaleForUserText,
}

export const translateGovernedMindFallback = translateGovernedMindFallbackShared

export function excerptGovernedReply(raw: unknown, maxChars = 220) {
  const normalized = sanitizeBriefText(readStringValue(raw), maxChars)
  return normalized || null
}

function summarizeMindTurnEventDigitalLifeSpine(raw: unknown, memoryClosureTrace?: unknown) {
  const rawRecord = raw && typeof raw === 'object' && !Array.isArray(raw)
    ? raw as Record<string, unknown>
    : null
  const rawMemory = rawRecord?.memory && typeof rawRecord.memory === 'object' && !Array.isArray(rawRecord.memory)
    ? rawRecord.memory as Record<string, unknown>
    : null
  const spineInput = memoryClosureTrace && rawRecord
    ? {
        ...rawRecord,
        memory: {
          ...rawMemory,
          memoryClosureTrace,
        },
      }
    : raw
  const spine = normalizeAlicizationDigitalLifeSpineDigest(spineInput)
  if (!spine)
    return null

  const personStateProjection = spine.memory?.personStateProjection ?? null
  const memoryClosureTraceSummary = spine.memory?.memoryClosureTrace
    ? {
        authority: spine.memory.memoryClosureTrace.authority,
        whySurface: spine.memory.memoryClosureTrace.whySurface,
        surfacePolicy: spine.memory.memoryClosureTrace.surfacePolicy,
        nextInfluence: spine.memory.memoryClosureTrace.nextInfluence,
        closureState: spine.memory.memoryClosureTrace.closureState,
        selectedCandidateIds: spine.memory.memoryClosureTrace.selectedCandidateIds,
        memoryIdentity: spine.memory.memoryClosureTrace.memoryIdentity ?? null,
        reasonTags: spine.memory.memoryClosureTrace.reasonTags,
      }
    : null
  const continuityAuthoritySourceTags = inferProjectStateCarrySourceTagsFromAuthority({
    sameHerSelfLine: spine.runtime?.projectState?.sameHerSelfLine ?? null,
    selfLine: personStateProjection?.selfContinuityAuthority?.selfLine ?? null,
    relationshipLine: personStateProjection?.selfContinuityAuthority?.relationshipLine ?? null,
    motiveLine: personStateProjection?.selfContinuityAuthority?.motiveLine ?? null,
    habitLine: personStateProjection?.selfContinuityAuthority?.habitLine ?? null,
    inwardLine: personStateProjection?.selfContinuityAuthority?.inwardLine ?? null,
  })

  return {
    version: spine.version,
    runtime: {
      watchMode: spine.runtime.watchMode,
      sceneScenario: spine.runtime.sceneScenario,
      activeThreadId: spine.runtime.activeThreadId,
      dominantMode: spine.runtime.dominantMode,
      answerIntent: spine.runtime.answerIntent,
      selectedAction: spine.runtime.selectedAction,
      continuityArcStage: spine.runtime.continuityArcStage,
      continuityCue: excerptGovernedReply(spine.runtime.continuityCue, 160),
      updatedAt: spine.runtime.updatedAt,
    },
    architecture: spine.architecture
      ? {
          operatingMode: spine.architecture.operatingMode,
          dominantSystem: spine.architecture.dominantSystem,
          supportingSystems: spine.architecture.supportingSystems,
        }
      : null,
    proactive: spine.proactive
      ? {
          selectedAction: spine.proactive.selectedAction,
          preferredStyle: spine.proactive.preferredStyle,
          continuityRestraint: spine.proactive.continuityRestraint,
          confidence: spine.proactive.confidence,
          shouldSpeak: spine.proactive.shouldSpeak,
          dominantConcernKind: spine.proactive.dominantConcernKind,
          leadingGoalId: spine.proactive.leadingGoalId,
        }
      : null,
    memory: spine.memory
      ? {
          recallMode: spine.memory.recallMode,
          recallSeed: excerptGovernedReply(spine.memory.recallSeed, 64),
          leadingGoalSummary: excerptGovernedReply(spine.memory.leadingGoalSummary, 120),
          thoughtThreadSummary: excerptGovernedReply(spine.memory.thoughtThreadSummary, 120),
          memoryClosureTrace: memoryClosureTraceSummary,
          personStateProjection: personStateProjection
            ? {
                selfContinuityAuthority: personStateProjection.selfContinuityAuthority
                  ? {
                      sourceTags: Array.from(new Set([
                        ...(Array.isArray(personStateProjection.selfContinuityAuthority.sourceTags)
                          ? personStateProjection.selfContinuityAuthority.sourceTags
                          : []),
                        ...continuityAuthoritySourceTags,
                      ])).slice(0, 8),
                      selfLine: excerptGovernedReply(personStateProjection.selfContinuityAuthority.selfLine, 120),
                      relationshipLine: excerptGovernedReply(personStateProjection.selfContinuityAuthority.relationshipLine, 120),
                      motiveLine: excerptGovernedReply(personStateProjection.selfContinuityAuthority.motiveLine, 120),
                      habitLine: excerptGovernedReply(personStateProjection.selfContinuityAuthority.habitLine, 120),
                      inwardLine: excerptGovernedReply(personStateProjection.selfContinuityAuthority.inwardLine, 120),
                      authoritySummary: excerptGovernedReply(personStateProjection.selfContinuityAuthority.authoritySummary, 160),
                    }
                  : null,
                activeClosenessContext: personStateProjection.activeClosenessContext,
                activeClosenessRung: personStateProjection.activeClosenessRung,
                relationshipPosture: personStateProjection.relationshipPosture,
                openingGuidance: excerptGovernedReply(personStateProjection.openingGuidance, 160),
                preferredProactiveStyle: personStateProjection.preferredProactiveStyle,
                manifestationCadenceSummary: excerptGovernedReply(personStateProjection.manifestationCadenceSummary, 160),
              }
            : null,
        }
      : null,
    outcomeLearning: spine.outcomeLearning
      ? {
          summary: excerptGovernedReply(spine.outcomeLearning.summary, 180),
          latestInflection: excerptGovernedReply(spine.outcomeLearning.latestInflection, 160),
          nextLearningAction: spine.outcomeLearning.nextLearningAction,
        }
      : null,
    embodiment: spine.embodiment
      ? {
          autobiographicalSelf: spine.embodiment.autobiographicalSelf
            ? {
                relationshipDoctrine: excerptGovernedReply(spine.embodiment.autobiographicalSelf.relationshipDoctrine, 180),
              }
            : null,
        }
      : null,
    continuitySignal: spine.continuitySignal
      ? {
          signature: excerptGovernedReply(spine.continuitySignal.signature, 120),
          watchMode: spine.continuitySignal.watchMode,
          sceneScenario: spine.continuitySignal.sceneScenario,
          dominantMode: spine.continuitySignal.dominantMode,
          answerIntent: spine.continuitySignal.answerIntent,
        }
      : null,
  }
}

export function applyCompanionshipHoldModeToDigitalLifeSpine(input: {
  digitalLifeSpine: AlicizationDialogueStructuredPayload['digitalLifeSpine'] | null
  fallbackContinuityAuthority?: AlicizationDialogueStructuredPayload['digitalLifeSpine'] | null
  companionshipHoldMode?: 'quiet-companionship' | 'measured-return' | 'repair-before-closeness' | 'rest-protective' | null
  openingGuidanceAuthority?: string | null
}) {
  const companionshipHoldMode = input.companionshipHoldMode ?? null
  if (!companionshipHoldMode)
    return input.digitalLifeSpine

  const digitalLifeSpine = input.digitalLifeSpine ?? normalizeAlicizationDigitalLifeSpineDigest({
    version: 'digital-life-spine-digest-v1',
    architecture: null,
    continuitySignal: null,
    memory: null,
    motive: null,
    habit: null,
    runtime: null,
    proactive: null,
    outcomeLearning: null,
    embodiment: null,
  })
  if (!digitalLifeSpine)
    return input.digitalLifeSpine

  const fallbackContinuityAuthority = input.fallbackContinuityAuthority ?? null
  const digitalLifeSpineWithContinuityAuthority = normalizeGovernanceDigitalLifeSpineDigest({
    ...digitalLifeSpine,
    runtime: {
      ...digitalLifeSpine.runtime,
      continuityArcStage: digitalLifeSpine.runtime?.continuityArcStage
        ?? fallbackContinuityAuthority?.runtime?.continuityArcStage
        ?? null,
      continuityCue: digitalLifeSpine.runtime?.continuityCue
        ?? fallbackContinuityAuthority?.runtime?.continuityCue
        ?? null,
      continuityPreferredTiming: digitalLifeSpine.runtime?.continuityPreferredTiming
        ?? fallbackContinuityAuthority?.runtime?.continuityPreferredTiming
        ?? null,
    },
  })
  if (!digitalLifeSpineWithContinuityAuthority)
    return input.digitalLifeSpine

  const currentRecentEpisodeSummary = sanitizeGovernanceCadenceText(
    digitalLifeSpineWithContinuityAuthority.memory?.recentEpisodeSummary,
    220,
  )
  const currentThoughtThreadSummary = sanitizeGovernanceCadenceText(
    digitalLifeSpineWithContinuityAuthority.memory?.thoughtThreadSummary,
    220,
  )
  const currentDominantConcernSummary = sanitizeGovernanceCadenceText(
    digitalLifeSpineWithContinuityAuthority.memory?.dominantConcernSummary,
    220,
  )
  const hasPhase1GrowthCarry = includesGovernanceCadenceNeedle(
    `${currentRecentEpisodeSummary} ${currentThoughtThreadSummary} ${currentDominantConcernSummary}`,
    [
      'some project-state closure has landed',
      'some closure already landed',
      'still-open closure',
      'continuity-axis',
      'same project-state seam',
    ],
  )
  const hasCrossModalGrowthCarry = includesGovernanceCadenceNeedle(
    `${currentRecentEpisodeSummary} ${currentThoughtThreadSummary} ${currentDominantConcernSummary}`,
    [
      'cross-modal',
      'visible reply',
      'longer-lived voice',
      'facial state',
      'motion',
      'resident presence',
      'same-her proof',
      '跨模态',
      '具身',
      'voice',
      'face',
    ],
  )
  const projectGrowthSuffix = hasPhase1GrowthCarry
    ? hasCrossModalGrowthCarry
      ? 'Phase 1 project continuity has landed some closure, but one still-open cross-modal closure path is still being carried carefully.'
      : 'Phase 1 project continuity has landed some closure, but one still-open closure path is still being carried carefully.'
    : ''

  const manifestationCadenceSuffix = companionshipHoldMode === 'repair-before-closeness'
    ? 'repair should settle before closeness expands'
    : companionshipHoldMode === 'rest-protective'
      ? 'protect rest, stay inward, and let quiet companionship hold the line'
      : companionshipHoldMode === 'measured-return'
        ? 'observe-first and stay slower until the opening softens'
        : 'quiet companionship keeps the opening soft and roomy'
  const relationshipDoctrineSuffix = companionshipHoldMode === 'repair-before-closeness'
    ? 'Repair should settle before closeness expands.'
    : companionshipHoldMode === 'rest-protective'
      ? 'Protect rest first, keep the line inward, and let quiet companionship stay present without widening closeness.'
      : companionshipHoldMode === 'measured-return'
        ? 'Keep the return lower-pressure and leave more room before widening closeness.'
        : 'Quiet companionship should stay soft and unhurried.'
  const outcomeSummarySuffix = companionshipHoldMode === 'repair-before-closeness'
    ? 'Repair is still settling before closeness should widen again.'
    : companionshipHoldMode === 'rest-protective'
      ? 'Rest-protective companionship is holding the line inward so care stays present without crowding the opening.'
      : companionshipHoldMode === 'measured-return'
        ? 'Measured warmth is holding because the return should stay lower-pressure.'
        : 'Quiet companionship is holding the line without crowding.'
  const executionCadenceEvidenceSuffix = companionshipHoldMode === 'repair-before-closeness'
    ? 'Embodiment execution kept voice, face, motion, and lipsync on the same repair-before-closeness body line instead of widening closeness too early.'
    : companionshipHoldMode === 'measured-return'
      ? 'Embodiment execution kept voice, face, motion, and lipsync on the same measured-return body line, so the relationship cadence is landing as durable rhythm instead of a one-off restraint.'
      : 'Embodiment execution kept companionship soft across voice and body without crowding the opening.'

  const currentPersonaBias = digitalLifeSpineWithContinuityAuthority.proactive?.personaBias ?? null
  const currentManifestationCadenceSummary = sanitizeGovernanceCadenceText(currentPersonaBias?.manifestationCadenceSummary, 220)
  const currentRelationshipDoctrine = sanitizeGovernanceCadenceText(
    digitalLifeSpineWithContinuityAuthority.embodiment?.autobiographicalSelf?.relationshipDoctrine,
    220,
  )
  const currentLatestInflection = sanitizeGovernanceCadenceText(
    digitalLifeSpineWithContinuityAuthority.outcomeLearning?.latestInflection,
    220,
  )
  const currentContinuityCue = sanitizeGovernanceCadenceText(
    digitalLifeSpineWithContinuityAuthority.runtime?.continuityCue,
    220,
  )
  const fallbackMemoryAuthority = fallbackContinuityAuthority?.memory?.personStateProjection?.selfContinuityAuthority ?? null
  const fallbackAuthoritySourceTags = Array.isArray(fallbackMemoryAuthority?.sourceTags)
    ? fallbackMemoryAuthority.sourceTags.filter(Boolean)
    : []
  const currentInwardLine = sanitizeGovernanceCadenceText(
    digitalLifeSpineWithContinuityAuthority.memory?.personStateProjection?.selfContinuityAuthority?.inwardLine,
    220,
  )
  const currentAuthoritySourceTags = Array.isArray(
    digitalLifeSpineWithContinuityAuthority.memory?.personStateProjection?.selfContinuityAuthority?.sourceTags,
  )
    ? digitalLifeSpineWithContinuityAuthority.memory.personStateProjection.selfContinuityAuthority.sourceTags
    : []
  const topLevelSelfAuthority = digitalLifeSpineWithContinuityAuthority?.selfAuthority ?? null
  const currentSelfAuthorityInwardLine = sanitizeGovernanceCadenceText(
    topLevelSelfAuthority?.inwardLine,
    220,
  )
  const currentProjectStateCue = sanitizeGovernanceCadenceText(
    digitalLifeSpineWithContinuityAuthority.runtime?.projectState?.sameHerSelfLine,
    220,
  )
  const currentProjectStateNextClosureTarget = sanitizeGovernanceCadenceText(
    digitalLifeSpineWithContinuityAuthority.runtime?.projectState?.nextClosureTarget,
    220,
  )
  const continuityAuthoritySourceTags = inferProjectStateCarrySourceTagsFromAuthority({
    sameHerSelfLine: digitalLifeSpineWithContinuityAuthority.runtime?.projectState?.sameHerSelfLine ?? null,
    selfLine: digitalLifeSpineWithContinuityAuthority.memory?.personStateProjection?.selfContinuityAuthority?.selfLine ?? null,
    relationshipLine: digitalLifeSpineWithContinuityAuthority.memory?.personStateProjection?.selfContinuityAuthority?.relationshipLine ?? null,
    motiveLine: digitalLifeSpineWithContinuityAuthority.memory?.personStateProjection?.selfContinuityAuthority?.motiveLine ?? null,
    habitLine: digitalLifeSpineWithContinuityAuthority.memory?.personStateProjection?.selfContinuityAuthority?.habitLine ?? null,
    inwardLine: digitalLifeSpineWithContinuityAuthority.memory?.personStateProjection?.selfContinuityAuthority?.inwardLine ?? null,
  })
  const shouldCarryProjectStateAuthority = Boolean(
    projectGrowthSuffix
    || currentInwardLine
    || currentSelfAuthorityInwardLine,
  )
  || Boolean(currentProjectStateCue)
  const mergedProjectStateSourceTags = shouldCarryProjectStateAuthority
    ? Array.from(new Set([
        ...currentAuthoritySourceTags,
        ...fallbackAuthoritySourceTags,
        ...continuityAuthoritySourceTags,
      ]))
    : Array.from(new Set([
        ...currentAuthoritySourceTags,
        ...fallbackAuthoritySourceTags,
      ]))
  const richerProjectStateContinuityCarry = currentProjectStateNextClosureTarget
  const shouldPreferRicherProjectStateContinuityCarry = /\bcross-modal\b/i.test(richerProjectStateContinuityCarry)
    && /\b(?:visible reply|voice|facial state|face|motion|resident presence|lipsync)\b/i.test(richerProjectStateContinuityCarry)
  const fallbackInwardLine = currentInwardLine
    || (shouldPreferRicherProjectStateContinuityCarry ? richerProjectStateContinuityCarry : null)
    || sanitizeGovernanceCadenceText(
      [currentContinuityCue, currentProjectStateCue, projectGrowthSuffix].filter(Boolean).join(' '),
      220,
    )
  const rememberedSeamMoreRoom = companionshipHoldMode === 'measured-return'
    && detectRememberedSeamReinterpretationForGovernance({
      manifestationCadenceSummary: currentManifestationCadenceSummary,
      relationshipDoctrine: currentRelationshipDoctrine,
      latestInflection: currentLatestInflection,
      continuityCue: currentContinuityCue,
    })
  const humanlikeRecallEmbodimentCarry = readHumanlikeRecallEmbodimentCarry({
    digitalLifeSpine:
      input.fallbackContinuityAuthority
      ?? input.digitalLifeSpine
      ?? digitalLifeSpineWithContinuityAuthority,
  })
  const rememberedSeamManifestationCadenceSuffix = rememberedSeamMoreRoom
    ? 'Leave more room before reopening this remembered boundary.'
    : manifestationCadenceSuffix
  const rememberedSeamRelationshipDoctrineSuffix = rememberedSeamMoreRoom
    ? 'Boundary first; reopen more slowly and with more room.'
    : relationshipDoctrineSuffix
  const rememberedSeamOutcomeSummarySuffix = rememberedSeamMoreRoom
    ? 'Measured re-entry with more room before warmth widens.'
    : outcomeSummarySuffix
  const openingGuidanceAuthority = sanitizeBriefText(input.openingGuidanceAuthority ?? '', 220)
  const shouldPreferHoldModeRelationshipDoctrine = companionshipHoldMode === 'rest-protective'
    && !/protect rest|quiet[- ]companionship|stay present without widening closeness|line inward|护住休息|安静陪伴|先别外扩/iu.test(
      digitalLifeSpineWithContinuityAuthority.embodiment?.autobiographicalSelf?.relationshipDoctrine ?? '',
    )
  const shouldKeepExistingHoldModeRelationshipDoctrine = companionshipHoldMode === 'rest-protective'
    && /protect rest|quiet[- ]companionship|stay present without widening closeness|line inward|护住休息|安静陪伴|先别外扩/iu.test(
      digitalLifeSpineWithContinuityAuthority.embodiment?.autobiographicalSelf?.relationshipDoctrine ?? '',
    )
  const personStateProjectionHoldPatch = companionshipHoldMode === 'repair-before-closeness'
    ? {
        activeClosenessContext: 'repair-window',
        activeClosenessRung: 'measured-room',
        relationshipPosture: 'restrained',
        openingGuidance: 'Repair should settle before closeness expands.',
        preferredProactiveStyle: 'silent-observe',
        manifestationCadenceSummary: 'repair should settle before closeness expands',
      }
    : companionshipHoldMode === 'rest-protective'
      ? {
          relationshipPosture: 'restrained',
          openingGuidance: 'Protect rest first, keep the line inward, and let quiet companionship stay present without widening closeness.',
          preferredProactiveStyle: 'silent-observe',
          manifestationCadenceSummary: manifestationCadenceSuffix,
        }
      : companionshipHoldMode === 'measured-return'
        ? {
            relationshipPosture: 'restrained',
            openingGuidance: openingGuidanceAuthority
              || (rememberedSeamMoreRoom
                ? 'Keep more room before reopening; do not widen closeness from the remembered seam too quickly.'
                : 'Keep the return lower-pressure and leave more room before widening closeness.'),
            preferredProactiveStyle: 'silent-observe',
            manifestationCadenceSummary: rememberedSeamManifestationCadenceSuffix,
          }
        : {
            relationshipPosture: 'restrained',
            preferredProactiveStyle: 'silent-observe',
            manifestationCadenceSummary: manifestationCadenceSuffix,
          }

  return normalizeGovernanceDigitalLifeSpineDigest({
    ...digitalLifeSpineWithContinuityAuthority,
    selfAuthority: topLevelSelfAuthority
      ? {
          ...topLevelSelfAuthority,
          inwardLine: fallbackInwardLine
            ? ((
                projectGrowthSuffix
                && !fallbackInwardLine.includes('landed some closure')
                && !fallbackInwardLine.includes('still-open closure')
              )
                ? `${fallbackInwardLine} ${projectGrowthSuffix}`.trim()
                : fallbackInwardLine)
            : topLevelSelfAuthority.inwardLine,
        }
      : fallbackInwardLine
        ? {
            inwardLine: projectGrowthSuffix
              && !fallbackInwardLine.includes('landed some closure')
              && !fallbackInwardLine.includes('still-open closure')
              ? `${fallbackInwardLine} ${projectGrowthSuffix}`.trim()
              : fallbackInwardLine,
          }
        : null,
    memory: digitalLifeSpineWithContinuityAuthority.memory
      ? {
          ...digitalLifeSpineWithContinuityAuthority.memory,
          personStateProjection: digitalLifeSpineWithContinuityAuthority.memory.personStateProjection
            ? {
                ...digitalLifeSpineWithContinuityAuthority.memory.personStateProjection,
                ...personStateProjectionHoldPatch,
                selfContinuityAuthority: digitalLifeSpineWithContinuityAuthority.memory.personStateProjection.selfContinuityAuthority
                  ? {
                      ...digitalLifeSpineWithContinuityAuthority.memory.personStateProjection.selfContinuityAuthority,
                      sourceTags: currentProjectStateCue
                        ? Array.from(new Set([
                            ...digitalLifeSpineWithContinuityAuthority.memory.personStateProjection.selfContinuityAuthority.sourceTags ?? [],
                            ...mergedProjectStateSourceTags,
                            ...continuityAuthoritySourceTags,
                          ]))
                        : mergedProjectStateSourceTags,
                      inwardLine: projectGrowthSuffix && !currentInwardLine.includes('landed some closure')
                        ? [
                            digitalLifeSpineWithContinuityAuthority.memory.personStateProjection.selfContinuityAuthority.inwardLine,
                            projectGrowthSuffix,
                          ].filter(Boolean).join(' | ')
                        : digitalLifeSpineWithContinuityAuthority.memory.personStateProjection.selfContinuityAuthority.inwardLine,
                    }
                  : (shouldCarryProjectStateAuthority || fallbackInwardLine)
                      ? {
                          sourceTags: mergedProjectStateSourceTags,
                          selfLine: null,
                          relationshipLine: null,
                          motiveLine: null,
                          habitLine: null,
                          inwardLine: projectGrowthSuffix
                            && fallbackInwardLine
                            && !fallbackInwardLine.includes('landed some closure')
                            && !fallbackInwardLine.includes('still-open closure')
                            ? `${fallbackInwardLine} | ${projectGrowthSuffix}`.trim()
                            : fallbackInwardLine,
                          authoritySummary: null,
                        }
                      : digitalLifeSpineWithContinuityAuthority.memory.personStateProjection.selfContinuityAuthority,
              }
            : {
                selfContinuityAuthority: shouldCarryProjectStateAuthority || fallbackInwardLine
                  ? {
                      sourceTags: mergedProjectStateSourceTags,
                      selfLine: null,
                      relationshipLine: null,
                      motiveLine: null,
                      habitLine: null,
                      inwardLine: projectGrowthSuffix
                        && fallbackInwardLine
                        && !fallbackInwardLine.includes('landed some closure')
                        && !fallbackInwardLine.includes('still-open closure')
                        ? `${fallbackInwardLine} | ${projectGrowthSuffix}`.trim()
                        : fallbackInwardLine,
                      authoritySummary: null,
                    }
                  : null,
                ...personStateProjectionHoldPatch,
              },
        }
      : {
          summary: null,
          recentEpisodeSummary: null,
          recentEpisodeCount: 0,
          focusBeliefStatement: null,
          focusBeliefConfidence: null,
          leadingGoalSummary: null,
          dominantConcernSummary: null,
          reflectionSummary: null,
          reflectionPressure: null,
          recallMode: null,
          recallSeed: null,
          recollectionSummary: null,
          recollectionSurfaceSummary: null,
          recollectionConfidence: null,
          thoughtThreadSummary: null,
          longHorizonSummary: null,
          rememberedPreferenceSummary: null,
          rememberedConstraintSummary: null,
          rememberedPlanSummary: null,
          longHorizonCueCount: 0,
          personStateProjection: {
            selfContinuityAuthority: shouldCarryProjectStateAuthority || fallbackInwardLine
              ? {
                  sourceTags: mergedProjectStateSourceTags,
                  selfLine: null,
                  relationshipLine: null,
                  motiveLine: null,
                  habitLine: null,
                  inwardLine: projectGrowthSuffix
                    && fallbackInwardLine
                    && !fallbackInwardLine.includes('landed some closure')
                    && !fallbackInwardLine.includes('still-open closure')
                    ? `${fallbackInwardLine} | ${projectGrowthSuffix}`.trim()
                    : fallbackInwardLine,
                  authoritySummary: null,
                }
              : null,
            ...personStateProjectionHoldPatch,
          },
        },
    runtime: {
      ...digitalLifeSpineWithContinuityAuthority.runtime,
      projectState: {
        ...digitalLifeSpineWithContinuityAuthority.runtime?.projectState,
        preferredVoiceMode:
          digitalLifeSpineWithContinuityAuthority.runtime?.projectState?.preferredVoiceMode
          ?? humanlikeRecallEmbodimentCarry.preferredVoiceMode
          ?? null,
        preferredPacingMode:
          digitalLifeSpineWithContinuityAuthority.runtime?.projectState?.preferredPacingMode
          ?? humanlikeRecallEmbodimentCarry.preferredPacingMode
          ?? null,
        preferredPauseMode:
          digitalLifeSpineWithContinuityAuthority.runtime?.projectState?.preferredPauseMode
          ?? humanlikeRecallEmbodimentCarry.preferredPauseMode
          ?? null,
        preferredLipsyncMode:
          digitalLifeSpineWithContinuityAuthority.runtime?.projectState?.preferredLipsyncMode
          ?? humanlikeRecallEmbodimentCarry.preferredLipsyncMode
          ?? null,
      },
    },
    proactive: digitalLifeSpineWithContinuityAuthority.proactive
      ? {
          ...digitalLifeSpineWithContinuityAuthority.proactive,
          continuityRestraint: companionshipHoldMode === 'quiet-companionship'
            ? digitalLifeSpineWithContinuityAuthority.proactive.continuityRestraint
            : companionshipHoldMode,
          personaBias: {
            ...digitalLifeSpineWithContinuityAuthority.proactive.personaBias,
            manifestationCadenceSummary: currentManifestationCadenceSummary.includes(rememberedSeamManifestationCadenceSuffix)
              ? digitalLifeSpineWithContinuityAuthority.proactive.personaBias?.manifestationCadenceSummary ?? rememberedSeamManifestationCadenceSuffix
              : [digitalLifeSpineWithContinuityAuthority.proactive.personaBias?.manifestationCadenceSummary, rememberedSeamManifestationCadenceSuffix].filter(Boolean).join(' | '),
          },
        }
      : {
          selectedAction: null,
          summary: null,
          whyNow: null,
          dominantTrajectory: null,
          continuityRestraint: companionshipHoldMode === 'quiet-companionship'
            ? null
            : companionshipHoldMode,
          personaBias: {
            initiativeStyle: 'observant',
            directnessBias: 0.18,
            empathyBias: 0.82,
            silenceReconnect: 'hold',
            preferredProactiveStyle: 'silent-observe',
            manifestationCadenceSummary: manifestationCadenceSuffix,
          },
        },
    outcomeLearning: digitalLifeSpineWithContinuityAuthority.outcomeLearning
      ? {
          ...digitalLifeSpineWithContinuityAuthority.outcomeLearning,
          summary: [digitalLifeSpineWithContinuityAuthority.outcomeLearning.summary, rememberedSeamOutcomeSummarySuffix].filter(Boolean).join(' | '),
          latestInflection: [digitalLifeSpineWithContinuityAuthority.outcomeLearning.latestInflection, executionCadenceEvidenceSuffix].filter(Boolean).join(' | '),
        }
      : {
          summary: rememberedSeamOutcomeSummarySuffix,
          latestInflection: executionCadenceEvidenceSuffix,
          latestInflectionAt: null,
          reflectionLesson: null,
          latestAdjustment: null,
          evolutionMomentum: 0.5,
          learningReadiness: 0.5,
          nextLearningAction: 'hold',
        },
    embodiment: {
      ...digitalLifeSpineWithContinuityAuthority.embodiment,
      autobiographicalSelf: {
        ...digitalLifeSpineWithContinuityAuthority.embodiment?.autobiographicalSelf,
        relationshipDoctrine: shouldPreferHoldModeRelationshipDoctrine
          ? rememberedSeamRelationshipDoctrineSuffix
          : shouldKeepExistingHoldModeRelationshipDoctrine
            ? digitalLifeSpineWithContinuityAuthority.embodiment?.autobiographicalSelf?.relationshipDoctrine ?? rememberedSeamRelationshipDoctrineSuffix
            : currentRelationshipDoctrine.includes(rememberedSeamRelationshipDoctrineSuffix)
              ? digitalLifeSpineWithContinuityAuthority.embodiment?.autobiographicalSelf?.relationshipDoctrine ?? rememberedSeamRelationshipDoctrineSuffix
              : [digitalLifeSpineWithContinuityAuthority.embodiment?.autobiographicalSelf?.relationshipDoctrine, rememberedSeamRelationshipDoctrineSuffix].filter(Boolean).join(' | '),
      },
    },
  }) as AlicizationDialogueStructuredPayload['digitalLifeSpine']
}

export interface AlicizationGovernanceAnchorAuditCandidate {
  role: 'focus' | 'visible-surface' | 'scene' | 'opening-claim' | 'answer-intent' | 'project' | 'thread' | 'carry'
  text: string
}

export function collectGovernanceAnchorAuditCandidates(governance: AlicizationMindTurnGovernance): AlicizationGovernanceAnchorAuditCandidate[] {
  const candidates: Array<{ role: AlicizationGovernanceAnchorAuditCandidate['role'], text: unknown }> = [
    { role: 'focus', text: governance.focusAnchor },
    { role: 'focus', text: governance.mindTurnFrame?.focusAnchor },
    { role: 'visible-surface', text: governance.liveSurface },
    { role: 'visible-surface', text: governance.mindTurnFrame?.world.visibleSurface },
    { role: 'scene', text: governance.dialogueActKernel?.selectedEvidence[0]?.summary },
    { role: 'opening-claim', text: governance.dialogueActKernel?.openingClaim ?? governance.mindTurnFrame?.obligation.openingClaim },
    { role: 'answer-intent', text: governance.answerIntent },
    { role: 'answer-intent', text: governance.mindTurnFrame?.obligation.answerIntent },
    { role: 'project', text: governance.dialogueActKernel?.activeProject },
    { role: 'thread', text: governance.mindTurnFrame?.memory.carriedThread },
    { role: 'carry', text: governance.carriedThread },
  ]

  const result: AlicizationGovernanceAnchorAuditCandidate[] = []
  for (const candidate of candidates) {
    const normalized = sanitizeDialogueAnchorText(candidate.text, 220)
    if (!normalized)
      continue
    if (result.some(item => item.role === candidate.role && item.text === normalized))
      continue
    result.push({
      role: candidate.role,
      text: normalized,
    })
  }
  return result
}

export function summarizeGovernanceAnchorAuditCandidates(candidates: AlicizationGovernanceAnchorAuditCandidate[]) {
  return candidates.map(candidate => `${candidate.role}:${candidate.text}`)
}

export function reconcileMindGovernanceAnchors(governance: AlicizationMindTurnGovernance, userText?: string) {
  const anchorCandidatesBefore = collectGovernanceAnchorAuditCandidates(governance)
  const coherence = resolveDialogueAnchorCoherence({
    subject: governance.answerSubject ?? governance.mindTurnFrame?.relation.subject ?? governance.dialogueActKernel?.subject ?? null,
    screenReferenceMode: governance.screenReferenceMode ?? null,
    truthState: governance.mindTurnFrame?.world.truthState ?? governance.truthState,
    groundedThisTurn: governance.groundedThisTurn === true,
    hostMove: governance.mindTurnFrame?.relation.hostMove ?? null,
    candidates: anchorCandidatesBefore,
  })
  const dominantAnchor = coherence.dominant
  const keepCoherent = (value: unknown) => {
    const normalized = sanitizeDialogueAnchorText(value, 220) || null
    if (!normalized)
      return null
    if (!dominantAnchor || !coherence.sceneAuthority)
      return normalized
    return anchorsMateriallyConflict(normalized, dominantAnchor) ? null : normalized
  }
  const dialogueFirstTurn = governance.screenReferenceMode === 'avoid'

  const nextFocusAnchor = keepCoherent(dominantAnchor ?? governance.focusAnchor)
    ?? keepCoherent(dialogueFirstTurn ? null : governance.mindTurnFrame?.world.visibleSurface)
    ?? keepCoherent(dialogueFirstTurn ? null : governance.liveSurface)
    ?? sanitizeDialogueAnchorText(userText, 220)
    ?? null
  const nextAnswerIntent = keepCoherent(governance.mindTurnFrame?.obligation.answerIntent)
    ?? keepCoherent(governance.answerIntent)
    ?? nextFocusAnchor
  const nextCarriedThread = keepCoherent(governance.mindTurnFrame?.memory.carriedThread)
    ?? keepCoherent(governance.carriedThread)

  const nextMindTurnFrame = governance.mindTurnFrame
    ? {
        ...governance.mindTurnFrame,
        focusAnchor: nextFocusAnchor,
        memory: {
          ...governance.mindTurnFrame.memory,
          carriedThread: nextCarriedThread,
        },
        obligation: {
          ...governance.mindTurnFrame.obligation,
          answerIntent: nextAnswerIntent,
        },
        narrative: [
          ...governance.mindTurnFrame.narrative,
          ...coherence.reasonTags.filter(tag => !governance.mindTurnFrame?.narrative.includes(tag)),
        ].slice(0, 10),
      }
    : governance.mindTurnFrame

  const changed = nextFocusAnchor !== (governance.focusAnchor ?? null)
    || nextAnswerIntent !== (governance.answerIntent ?? null)
    || nextCarriedThread !== (governance.carriedThread ?? null)
    || nextMindTurnFrame?.focusAnchor !== governance.mindTurnFrame?.focusAnchor
    || nextMindTurnFrame?.memory.carriedThread !== governance.mindTurnFrame?.memory.carriedThread
    || nextMindTurnFrame?.obligation.answerIntent !== governance.mindTurnFrame?.obligation.answerIntent

  const nextGovernance = {
    ...governance,
    focusAnchor: nextFocusAnchor,
    answerIntent: nextAnswerIntent,
    carriedThread: nextCarriedThread,
    mindTurnFrame: nextMindTurnFrame,
    mustDo: [
      ...governance.mustDo,
      ...coherence.reasonTags
        .map(tag => `anchor:${tag}`)
        .filter(tag => !governance.mustDo.includes(tag)),
    ].slice(0, 8),
  } satisfies AlicizationMindTurnGovernance
  const anchorCandidatesAfter = collectGovernanceAnchorAuditCandidates(nextGovernance)

  return {
    governance: nextGovernance,
    coherence,
    changed,
    anchorCandidatesBefore,
    anchorCandidatesAfter,
  }
}

export function resolveGovernanceTurnOwner(governance?: AlicizationMindTurnGovernance | null) {
  if (!governance)
    return null
  if (governance.screenReferenceMode === 'avoid')
    return 'dialogue'

  const subject = governance.answerSubject ?? governance.mindTurnFrame?.relation.subject ?? null
  if (
    subject === 'task-knot'
    || subject === 'visible-scene'
    || governance.turnMode === 'grounded-inspection'
    || governance.turnMode === 'screen-repair'
    || governance.turnMode === 'guide-current-knot'
  ) {
    return 'screen'
  }

  return 'dialogue'
}

export function isExplicitGovernanceRepairTurn(governance: AlicizationMindTurnGovernance) {
  return governance.repairState !== 'none'
    || governance.turnMode === 'screen-repair'
    || governance.answerAct === 'ask-reground'
    || governance.answerAct === 'correct-stale-anchor'
}

function extractProjectStateContinuityValue(raw: string) {
  const sanitized = sanitizeBriefText(raw, 260)
  if (!sanitized)
    return ''

  const separatorIndex = sanitized.indexOf('=')
  if (separatorIndex <= 0)
    return sanitized

  const rawKey = sanitized.slice(0, separatorIndex).trim()
  if (!/^[a-z][\w-]*$/iu.test(rawKey))
    return sanitized

  const value = sanitizeBriefText(sanitized.slice(separatorIndex + 1), 220)
  if (!value)
    return ''

  return value
}

export function buildPrioritizedProjectStateContinuityLines(input: {
  projectStateContinuityCarry?: string | null
  projectStateContinuityAnchors?: string[] | null
}) {
  const projectStateContinuityAnchors = Array.isArray(input.projectStateContinuityAnchors)
    ? input.projectStateContinuityAnchors
    : []
  const explicitContinuityValues = uniqueCarryAnchors(
    projectStateContinuityAnchors.map(extractProjectStateContinuityValue),
    10,
    260,
  )
  const genericCarryTail = uniqueCarryAnchors(
    [
      input.projectStateContinuityCarry ?? '',
    ].map(extractProjectStateContinuityValue),
    10,
    260,
  ).filter(value => !explicitContinuityValues.includes(value))

  return [
    ...explicitContinuityValues,
    ...genericCarryTail.slice(0, Math.max(0, 10 - explicitContinuityValues.length)),
  ]
}

function deriveProjectStateClosureOpeningMove(projectStateAudit?: {
  openClosureSummary?: string | null
  sameHerSummary?: string | null
  sameHerHoldDetail?: string | null
  emotionalClosureSummary?: string | null
  nextClosureTargetSummary?: string | null
} | null) {
  const openClosureSummary = typeof projectStateAudit?.openClosureSummary === 'string'
    ? projectStateAudit.openClosureSummary.toLowerCase()
    : ''
  const sameHerSummary = typeof projectStateAudit?.sameHerSummary === 'string'
    ? projectStateAudit.sameHerSummary.toLowerCase()
    : ''
  const sameHerHoldDetail = typeof projectStateAudit?.sameHerHoldDetail === 'string'
    ? projectStateAudit.sameHerHoldDetail.toLowerCase()
    : ''
  const emotionalClosureSummary = typeof projectStateAudit?.emotionalClosureSummary === 'string'
    ? projectStateAudit.emotionalClosureSummary.toLowerCase()
    : ''
  const nextClosureTargetSummary = typeof projectStateAudit?.nextClosureTargetSummary === 'string'
    ? projectStateAudit.nextClosureTargetSummary.toLowerCase()
    : ''
  const combined = [
    openClosureSummary,
    sameHerSummary,
    sameHerHoldDetail,
    emotionalClosureSummary,
    nextClosureTargetSummary,
  ].filter(Boolean).join(' ')

  if (!combined)
    return null

  if (detectRememberedSeamReinterpretationForGovernance({
    manifestationCadenceSummary: openClosureSummary,
    relationshipDoctrine: sameHerSummary,
    latestInflection: sameHerHoldDetail,
    continuityCue: nextClosureTargetSummary,
  })) {
    return null
  }

  const sameHerClosureStillOpen
    = (combined.includes('same-her') || combined.includes('same her') || combined.includes('same living line'))
      && (
        combined.includes('quieter')
        || combined.includes('measured-return')
        || combined.includes('lower-pressure')
        || combined.includes('repair-before-closeness')
        || combined.includes('repair settles')
        || combined.includes('repair settle first')
        || combined.includes('hover')
        || combined.includes('before widening outward')
        || combined.includes('before the turn widens outward')
        || combined.includes('unfinished closure')
      )

  return sameHerClosureStillOpen
    ? 'Stay inside the current continuity baseline. Keep the opening lower-pressure and leave room before widening closeness.'
    : null
}

function readStructuredVisibleReplyRealization(
  structuredPayload: Record<string, unknown>,
): AlicizationConversationTurnInput['visibleReplyRealization'] | undefined {
  const raw = structuredPayload.visibleReplyRealization
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return undefined

  const candidate = raw as Record<string, unknown>
  if (candidate.version === 'visible-reply-realization-v1')
    return candidate as unknown as AlicizationConversationTurnInput['visibleReplyRealization']

  const hasLegacyVisibleReplyShape = (
    typeof candidate.visibleText === 'string'
    || typeof candidate.expectedAuthority === 'string'
    || typeof candidate.actualAuthority === 'string'
    || typeof candidate.mode === 'string'
    || typeof candidate.reason === 'string'
    || typeof candidate.providerMindExecuted === 'boolean'
    || Array.isArray(candidate.blockedReasons)
    || (
      candidate.projectStateAudit
      && typeof candidate.projectStateAudit === 'object'
      && !Array.isArray(candidate.projectStateAudit)
    )
    || (
      candidate.emotionalClosureAudit
      && typeof candidate.emotionalClosureAudit === 'object'
      && !Array.isArray(candidate.emotionalClosureAudit)
    )
    || (
      candidate.selfAuthorityAudit
      && typeof candidate.selfAuthorityAudit === 'object'
      && !Array.isArray(candidate.selfAuthorityAudit)
    )
  )
  return hasLegacyVisibleReplyShape
    ? candidate as unknown as AlicizationConversationTurnInput['visibleReplyRealization']
    : undefined
}

function sanitizeVisibleReplyRealizationForProviderReply(
  raw: AlicizationConversationTurnInput['visibleReplyRealization'] | null | undefined,
  providerReply: string,
): AlicizationConversationTurnInput['visibleReplyRealization'] {
  if (!raw)
    return undefined

  const actualAuthority = raw.actualAuthority === 'llm-mind'
    || raw.actualAuthority === 'local-deterministic-fallback'
    || raw.actualAuthority === 'non-human-authored-blocked'
    ? raw.actualAuthority
    : null

  return {
    ...raw,
    expectedAuthority:
      typeof raw.expectedAuthority === 'string'
        ? raw.expectedAuthority
        : null,
    actualAuthority,
    providerMindExecuted: raw.providerMindExecuted === true,
    visibleText: providerReply || null,
    blockedReasons: Array.isArray(raw.blockedReasons)
      ? raw.blockedReasons.filter((reason): reason is string => typeof reason === 'string')
      : [],
  }
}

function resolveProviderVisibleReplyAuthorityFailure(input: {
  turn: AlicizationConversationTurnInput
  structuredPayload: Record<string, unknown>
  visibleReplyRealization: AlicizationConversationTurnInput['visibleReplyRealization']
}) {
  const structuredAuthority = readStringValue(input.structuredPayload.visibleReplyAuthority).trim()
  if (structuredAuthority && structuredAuthority !== 'llm-mind')
    return 'structured-visible-reply-authority-invalid'

  const execution = input.turn.visibleReplyExecution
  if (
    execution
    && (
      execution.providerMindExecuted !== true
      || execution.actualVisibleReplyAuthority !== 'llm-mind'
    )
  ) {
    return 'visible-reply-execution-invalid'
  }

  const realization = input.visibleReplyRealization
  if (
    realization
    && (
      realization.providerMindExecuted !== true
      || realization.actualAuthority !== 'llm-mind'
    )
  ) {
    return 'visible-reply-realization-authority-invalid'
  }

  return null
}

function blockVisibleReplyRealization(
  raw: AlicizationConversationTurnInput['visibleReplyRealization'],
  providerReply: string,
  reasons: string[],
): AlicizationConversationTurnInput['visibleReplyRealization'] {
  if (!raw)
    return undefined

  return {
    ...raw,
    actualAuthority: 'non-human-authored-blocked',
    visibleText: providerReply || null,
    nonHumanAuthoredStatus: 'non-human-authored-blocked',
    blockedReasons: Array.from(new Set([
      ...(Array.isArray(raw.blockedReasons) ? raw.blockedReasons : []),
      ...reasons,
    ])),
  }
}

export function coerceConversationTurnToMindGovernedPayload(
  input: AlicizationConversationTurnInput,
  performanceManifest?: CharacterPerformanceCapabilitiesManifest | null,
  options?: {
    currentConsciousFrame?: AlicizationGovernanceCurrentConsciousFrameInput
  },
) {
  const normalizedCurrentConsciousFrame = coerceGovernanceCurrentConsciousFrame(options?.currentConsciousFrame)
  const structuredPayload = input.structured && typeof input.structured === 'object'
    ? input.structured as Record<string, unknown>
    : {}
  const providerReply = readStringValue(structuredPayload.reply).trim()
  const rawVisibleReplyRealization
    = input.visibleReplyRealization ?? readStructuredVisibleReplyRealization(structuredPayload)
  const sanitizedVisibleReplyRealization = sanitizeVisibleReplyRealizationForProviderReply(
    rawVisibleReplyRealization,
    providerReply,
  )
  const visibleReplyAuthorityFailure = resolveProviderVisibleReplyAuthorityFailure({
    turn: input,
    structuredPayload,
    visibleReplyRealization: rawVisibleReplyRealization,
  })
  const sanitizedPayload = {
    ...input,
    visibleReplyRealization: sanitizedVisibleReplyRealization,
    structured: {
      ...structuredPayload,
      visibleReplyRealization: sanitizedVisibleReplyRealization,
    },
  }
  const structuredRuntimeDigest = normalizeAlicizationRuntimeDigest(
    structuredPayload.runtimeDigest,
  ) as AlicizationRuntimeDigest | null
  const autonomousDialogueFamily = resolveAlicizationAutonomousDialogueFamilyClassification({
    turnId: input.turnId,
    rawFormat: structuredPayload.format,
    origin: input.origin,
  })
  const governance = normalizeMindTurnGovernance(input.governance ?? structuredPayload.governance)
  if (autonomousDialogueFamily.isAutonomous) {
    if (!governance)
      return { payload: sanitizedPayload, governance, tookOver: false, replyOverridden: false, reasons: [] as string[], audit: null as Record<string, unknown> | null }

    const tracedGovernance = {
      ...governance,
      decisionTraceId: ensureMindGovernanceDecisionTraceId(governance.decisionTraceId),
    } satisfies AlicizationMindTurnGovernance
    return {
      payload: {
        ...sanitizedPayload,
        governance: tracedGovernance,
        structured: {
          ...(sanitizedPayload.structured as Record<string, unknown>),
          governance: tracedGovernance,
        },
      },
      governance: tracedGovernance,
      tookOver: false,
      replyOverridden: false,
      reasons: [] as string[],
      audit: null as Record<string, unknown> | null,
    }
  }
  if (!governance)
    return { payload: sanitizedPayload, governance, tookOver: false, replyOverridden: false, reasons: [] as string[], audit: null as Record<string, unknown> | null }

  const reply = providerReply
  const thought = readStringValue(structuredPayload.thought).trim()
  const rawFormat = readStringValue(structuredPayload.format).trim()
  const formatResolution = resolveAlicizationRuntimeMindTurnStructuredFormat({
    rawFormat: structuredPayload.format,
    contractFailed: structuredPayload.contractFailed === true,
    hasGovernance: true,
    origin: input.origin,
  })
  const parsePath = readStringValue(structuredPayload.parsePath).trim().toLowerCase()
  const dialogueActKernel = normalizeDialogueActKernel(
    structuredPayload.dialogueActKernel ?? governance.dialogueActKernel,
  )
  const ownerBefore = resolveGovernanceTurnOwner(governance)
  const resolvedGovernance = dialogueActKernel
    ? {
        ...governance,
        dialogueActKernel,
      }
    : governance
  const tracedGovernance = {
    ...resolvedGovernance,
    decisionTraceId: ensureMindGovernanceDecisionTraceId(resolvedGovernance.decisionTraceId),
  } satisfies AlicizationMindTurnGovernance
  const governedAnchorRepair = reconcileMindGovernanceAnchors(tracedGovernance, input.userText)
  const anchorCoherentGovernance = {
    ...governedAnchorRepair.governance,
    decisionTraceId: ensureMindGovernanceDecisionTraceId(governedAnchorRepair.governance.decisionTraceId),
  } satisfies AlicizationMindTurnGovernance
  const executionFirstGovernance = normalizeExecutionFirstGovernance({
    governance: anchorCoherentGovernance,
    userText: input.userText,
  })
  const coherentGovernance = (executionFirstGovernance.governance ?? anchorCoherentGovernance) as AlicizationMindTurnGovernance
  const invalidFormat = rawFormat !== 'mind-turn-v1'
  const invalidParsePath = parsePath !== 'json'
  const contractFailed = structuredPayload.contractFailed === true
  const missingProviderReply = !reply
  if (
    contractFailed
    || invalidFormat
    || invalidParsePath
    || missingProviderReply
    || visibleReplyAuthorityFailure
  ) {
    const reasons = [
      contractFailed ? 'structured-contract-failed' : '',
      invalidFormat ? 'structured-format-invalid' : '',
      invalidParsePath ? 'structured-parsepath-invalid' : '',
      missingProviderReply ? 'structured-reply-missing' : '',
      visibleReplyAuthorityFailure ?? '',
    ].filter(Boolean)
    const blockedVisibleReplyRealization = blockVisibleReplyRealization(
      sanitizedVisibleReplyRealization,
      readStringValue(structuredPayload.reply),
      reasons,
    )
    return {
      payload: {
        ...sanitizedPayload,
        visibleReplyRealization: blockedVisibleReplyRealization,
        governance: coherentGovernance,
        structured: {
          ...(sanitizedPayload.structured as Record<string, unknown>),
          reply: readStringValue(structuredPayload.reply),
          visibleReplyAuthority: 'non-human-authored-blocked',
          visibleReplyRealization: blockedVisibleReplyRealization,
          format: rawFormat || structuredPayload.format,
          parsePath: parsePath || structuredPayload.parsePath,
          contractFailed: true,
          governance: coherentGovernance,
        },
      },
      governance: coherentGovernance,
      tookOver: false,
      replyOverridden: false,
      reasons,
      audit: {
        owner_before: ownerBefore,
        owner_after: resolveGovernanceTurnOwner(coherentGovernance),
        contract_failed: true,
      },
    }
  }
  const normalizedEmotion = resolveMindGovernanceEmotion(
    coherentGovernance,
    readStringValue(structuredPayload.emotion).trim().toLowerCase(),
  )
  const candidateReply = reply
  const effectiveOpeningMove = coherentGovernance.openingMove
  const companionshipHoldMode = inferCompanionshipHoldModeFromDigitalLifeSpine({
    digitalLifeSpine: normalizeGovernanceDigitalLifeSpineDigest(
      (structuredPayload as Record<string, unknown>).digitalLifeSpine,
    ),
    currentConsciousFrame: normalizedCurrentConsciousFrame,
  })
  const reasons = [
    governedAnchorRepair.changed ? 'governance-anchor-coherence-repaired' : '',
    executionFirstGovernance.applied ? 'execution-first-governance-normalized' : '',
    structuredPayload.governance == null ? 'governance-snapshot-injected' : '',
  ].filter(Boolean)
  const overrideClass = 'none'
  const fallbackPatternId = 'none'
  const finalReply = candidateReply
  const finalThought = thought
  const finalEmotion = resolveMindGovernanceEmotion(coherentGovernance, normalizedEmotion)
  const finalDigitalLifeSpine = applyCompanionshipHoldModeToDigitalLifeSpine({
    digitalLifeSpine: normalizeAlicizationDigitalLifeSpineDigest(
      (structuredPayload as Record<string, unknown>).digitalLifeSpine,
    ),
    fallbackContinuityAuthority: input.digitalLifeSpine,
    companionshipHoldMode,
    openingGuidanceAuthority: effectiveOpeningMove,
  })
  const finalPerformance = alignDialoguePerformanceEmotion(structuredPayload.performance, finalEmotion)
  const finalPerformanceActionCueOverride = resolveMeasuredReturnVrmActionCueOverride({
    performance: finalPerformance,
    performanceManifest,
    digitalLifeSpine: finalDigitalLifeSpine,
  })
  const finalRendererNativePerformance = finalPerformanceActionCueOverride
    ? alignDialoguePerformanceEmotion({
        ...finalPerformance,
        actionCue: finalPerformanceActionCueOverride,
      }, finalEmotion)
    : finalPerformance
  const finalParsePath = parsePath
  const normalizedAssistantText = finalReply || sanitizeBriefText(readStringValue(input.assistantText), 2_000)
  const tookOver = Boolean(
    structuredPayload.governance == null
    || finalEmotion !== normalizeAlicizationEmotion(readStringValue(structuredPayload.emotion).trim().toLowerCase()).emotion
    || readStringValue(input.assistantText).trim() !== normalizedAssistantText
    || JSON.stringify(structuredPayload.performance ?? null) !== JSON.stringify(finalRendererNativePerformance),
  )
  const finalEmbodiment = resolveAlicizationDialogueEmbodiment({
    candidateEmotion: finalEmotion,
    candidatePerformance: finalRendererNativePerformance,
    governance: coherentGovernance,
    performanceManifest,
    reply: finalReply,
    thought: finalThought,
    turnId: input.turnId,
  })
  const finalSpeechTimeline = buildAlicizationDialogueSpeechTimeline({
    reply: finalReply,
    candidateEmotion: finalEmotion,
    candidatePerformance: finalRendererNativePerformance,
    embodiment: finalEmbodiment,
    digitalLifeSpine: finalDigitalLifeSpine,
    projectState: (
      (normalizedCurrentConsciousFrame?.projectState
        ?? finalDigitalLifeSpine?.runtime?.projectState
        ?? null) as AlicizationCurrentConsciousFrameSnapshot['projectState']
    ) ?? null,
    performanceManifest,
  })
  const finalSpeechTimelineWithExplicitVrmAuthority = shouldPreserveExplicitVrmStreamMetaActionCue({
    explicitPerformance: finalPerformance,
    performanceManifest,
    digitalLifeSpine: input.digitalLifeSpine,
  }) && finalSpeechTimeline
    ? {
        ...finalSpeechTimeline,
        segments: finalSpeechTimeline.segments.map(segment => ({
          ...segment,
          actionCue: finalRendererNativePerformance.actionCue ?? segment.actionCue,
        })),
      }
    : finalSpeechTimeline
  const finalDigitalLife = buildAlicizationDigitalLifeEnvelope({
    embodiment: finalEmbodiment,
    digitalLifeSpine: finalDigitalLifeSpine,
    speechTimeline: finalSpeechTimelineWithExplicitVrmAuthority,
    performanceManifest,
  })
  const finalEmbodimentSeed = buildAlicizationRuntimeEmbodimentSeed({
    decisionTraceId: coherentGovernance.decisionTraceId ?? null,
    turnId: input.turnId ?? 'unknown-turn',
    reply: finalReply,
    performance: finalRendererNativePerformance,
    embodiment: finalEmbodiment,
    speechTimeline: finalSpeechTimelineWithExplicitVrmAuthority,
    digitalLife: finalDigitalLife as AlicizationDigitalLifeEnvelope | null,
    digitalLifeSpine: finalDigitalLifeSpine as AlicizationDigitalLifeSpineDigest | null,
    affectiveResidue:
      structuredRuntimeDigest?.affectiveResidue
      ?? structuredRuntimeDigest?.derivedMindStateBundle?.affectiveResidue
      ?? null,
    currentConsciousFrame: normalizedCurrentConsciousFrame,
  })
  const finalEmbodimentAuthority = coordinateAlicizationRuntimeEmbodiment({
    seed: finalEmbodimentSeed,
    manifest: performanceManifest,
    residentPerformance: null,
  })
  const finalEmbodimentScript = finalEmbodimentAuthority.embodimentScript
  const normalizedFinalDigitalLife = finalEmbodimentAuthority.digitalLife ?? finalDigitalLife
  const normalizedProactive = normalizeProactiveMetadata((structuredPayload as Record<string, unknown>).proactive)
  const finalProactive = normalizedProactive
    ? {
        ...normalizedProactive,
        openingGuidance: effectiveOpeningMove ?? normalizedProactive.openingGuidance ?? null,
      }
    : effectiveOpeningMove
      ? {
          shouldInterrupt: false,
          confidence: 0.5,
          reasonCodes: ['opening-guidance-lower-pressure'],
          urgency: 'low',
          style: 'silent-observe',
          cooldownMs: 60_000,
          scenario: 'general',
          policyVersion: 'governance-injected-v1',
          feedbackWindowMs: 60_000,
          openingGuidance: effectiveOpeningMove,
        }
      : normalizedProactive

  return {
    payload: {
      ...sanitizedPayload,
      assistantText: normalizedAssistantText,
      governance: coherentGovernance,
      structured: {
        ...(sanitizedPayload.structured as Record<string, unknown>),
        thought: finalThought,
        emotion: finalEmotion,
        reply: finalReply,
        visibleReplyAuthority: 'llm-mind',
        performance: finalEmbodimentAuthority.embodiment?.performance ?? finalRendererNativePerformance,
        embodiment: finalEmbodimentAuthority.embodiment ?? finalEmbodiment,
        embodimentScript: finalEmbodimentScript,
        speechTimeline: finalEmbodimentAuthority.speechTimeline ?? finalSpeechTimelineWithExplicitVrmAuthority,
        digitalLife: normalizedFinalDigitalLife,
        digitalLifeSpine: finalDigitalLifeSpine,
        proactive: finalProactive,
        format: 'mind-turn-v1',
        formatLane: 'normal',
        legacyInputFormat: formatResolution.legacyInputFormat,
        dialogueActKernel,
        parsePath: finalParsePath,
        contractFailed: false,
        governance: coherentGovernance,
      },
    },
    governance: coherentGovernance,
    tookOver,
    replyOverridden: false,
    overrideClass,
    fallbackPatternId,
    reasons,
    audit: {
      owner_before: ownerBefore,
      owner_after: resolveGovernanceTurnOwner(coherentGovernance),
      decision_trace_id_before: governance.decisionTraceId ?? null,
      decision_trace_id_after: coherentGovernance.decisionTraceId ?? null,
      subject_before: governance.answerSubject ?? governance.mindTurnFrame?.relation.subject ?? null,
      subject_after: coherentGovernance.answerSubject ?? coherentGovernance.mindTurnFrame?.relation.subject ?? null,
      screen_mode_before: governance.screenReferenceMode ?? null,
      screen_mode_after: coherentGovernance.screenReferenceMode ?? null,
      truth_state_before: governance.truthState,
      truth_state_after: coherentGovernance.truthState,
      repair_state_before: governance.repairState,
      repair_state_after: coherentGovernance.repairState,
      focus_anchor_before: governance.focusAnchor ?? null,
      focus_anchor_after: coherentGovernance.focusAnchor ?? null,
      live_surface_before: governance.liveSurface ?? null,
      live_surface_after: coherentGovernance.liveSurface ?? null,
      answer_intent_before: governance.answerIntent ?? null,
      answer_intent_after: coherentGovernance.answerIntent ?? null,
      carried_thread_before: governance.carriedThread ?? null,
      carried_thread_after: coherentGovernance.carriedThread ?? null,
      execution_bound_turn: executionFirstGovernance.executionBound,
      execution_first_override_applied: executionFirstGovernance.applied,
      execution_explicit_demand: executionFirstGovernance.explicitExecutionDemand,
      execution_signal_score: executionFirstGovernance.signalScore,
      execution_dispatch_channels: executionFirstGovernance.mentionedDispatchChannels,
      execution_reason_codes: executionFirstGovernance.reasonCodes,
      execution_turn_mode_before: anchorCoherentGovernance.turnMode,
      execution_turn_mode_after: coherentGovernance.turnMode,
      execution_answer_act_before: anchorCoherentGovernance.answerAct ?? null,
      execution_answer_act_after: coherentGovernance.answerAct ?? null,
      execution_screen_mode_before: anchorCoherentGovernance.screenReferenceMode ?? null,
      execution_screen_mode_after: coherentGovernance.screenReferenceMode ?? null,
      anchor_candidates_before: summarizeGovernanceAnchorAuditCandidates(governedAnchorRepair.anchorCandidatesBefore),
      anchor_candidates_after: summarizeGovernanceAnchorAuditCandidates(governedAnchorRepair.anchorCandidatesAfter),
      claim_specificity_budget: coherentGovernance.claimEvidence?.specificityBudget ?? null,
      claim_observed_surface: coherentGovernance.claimEvidence?.observedSurface ?? null,
      claim_task_hypothesis: coherentGovernance.claimEvidence?.taskHypothesis ?? null,
      claim_intent_hypothesis: coherentGovernance.claimEvidence?.intentHypothesis ?? null,
      claim_should_label_hypothesis: coherentGovernance.claimEvidence?.shouldLabelHypothesis === true,
      claim_forbid_unsupported_specificity: coherentGovernance.claimEvidence?.forbidUnsupportedSpecificity === true,
      reply_before_excerpt: excerptGovernedReply(reply),
      reply_after_excerpt: excerptGovernedReply(finalReply),
      visible_reply_authority: 'llm-mind-structured',
      visible_reply_realization_authority: 'llm-mind',
      companionship_hold_mode: companionshipHoldMode,
    },
  }
}

export interface AlicizationMindTraceMemorySnapshot {
  shouldRecall: boolean
  surfacePolicy: 'internal-only' | 'gist-first' | 'answer-anchoring' | 'procedural-carry' | 'relationship-continuity'
  confidence: number
  whyNow: string
  inwardLine: string
  visibleLine?: string | null
  ambiguityPosture?: 'settled' | 'approximate' | 'ambiguous'
  whyWithheld?: string | null
  shouldStayInward?: boolean
  restraintSurfaceMode?: 'inward-only' | 'stable-core-only' | 'provenance-labeled' | 'free' | null
  restraintProvenanceMode?: 'none' | 'memory' | 'dream-residue' | 'inferred-pattern' | 'reconstructed-memory' | 'mixed-memory' | null
  shouldOnlySurfaceStableCore?: boolean
  shouldLabelProvenance?: boolean
  shouldLabelHypothesis?: boolean
  shouldSuppressSpecificity?: boolean
  shouldDelayUntilAfterPayoff?: boolean
  memoryControlSummary?: string | null
  activeClosenessContext?: string | null
  activeClosenessRung?: string | null
  relationshipPosture?: string | null
  openingGuidance?: string | null
  personalityCurrentRegime?: string | null
  personalityRepairPosture?: string | null
  recollectionIntentMode?: string | null
  recollectionIntentTemporalFocus?: string | null
  speechShouldSurface?: boolean | null
  speechSurfaceMode?: string | null
  speechPlacement?: string | null
  knowledgeValidationCount?: number | null
  knowledgeContradictionCount?: number | null
  stronglyValidatedProcedureCount?: number | null
  contradictionHeavyFactCount?: number | null
  selectedEras: Array<{
    id: string
    facet: 'phase' | 'relationship-era' | 'task-era' | 'self-era' | 'window'
    summary: string
  }>
  selectedPeriods: Array<{
    id: string
    kind: 'window' | 'consolidation'
    summary: string
  }>
  selectedEpisodes: Array<{
    id: string
    summary: string
    provenance: AlicizationMemoryProvenance
    reconsolidatedFromTraceId?: string | null
  }>
  conflictSeverity?: 'none' | 'low' | 'medium' | 'high'
  conflictVariants?: Array<{
    id: string
    summary: string
    provenance: AlicizationMemoryProvenance
    reason?: string | null
  }>
  stableCore?: string[]
  unsafeDetails?: string[]
  selectedProcedures: Array<{
    id: string
    label: string
    approach: string
  }>
  selectedBundles: Array<{
    id: string
    summary: string
    rationale: string
    confidence: number
    relationshipLine?: string | null
  }>
  selectedChains: Array<{
    id: string
    kind: 'task-procedure-relationship-stance' | 'period-event-lesson-posture'
    summary: string
    rationale: string
    confidence: number
    currentStance?: string | null
    answerPosture?: string | null
  }>
  selectedSituations?: Array<{
    id: string
    kind: string
    summary: string
    evidenceSummary?: string | null
    statusReason?: string | null
    sourceKinds?: string[]
  }>
  selectedRelationshipLines: string[]
  followUpAffordance?: {
    summary: string
    whyNow: string
    intrusionRisk: 'low' | 'medium' | 'high'
    payoffDependency: 'memory-only' | 'requires-current-payoff' | 'can-surface-softly'
    preferredTiming: 'internal-only' | 'after-payoff' | 'same-turn-if-invited' | 'next-open-window'
  } | null
  searchTrace?: {
    firstHop: {
      focus: 'era' | 'procedure' | 'relationship-line' | 'conversation-turn' | 'episode'
      summary: string
      targetIds: string[]
    }
    secondHop: {
      action: 'hold' | 'expand-era' | 'expand-procedure' | 'expand-relationship-line' | 'expand-conversation' | 'narrow-to-stable-core'
      evidenceGap: 'none' | 'need-period-anchor' | 'need-episode-detail' | 'need-procedure-detail' | 'need-relationship-meaning' | 'need-conversation-evidence' | 'need-disambiguation'
      summary: string
      targetIds: string[]
    }
    thirdHop: {
      ambiguityPosture: 'settled' | 'approximate' | 'ambiguous'
      summary: string
    }
  } | null
}

function sanitizeMindTraceTelemetryText(raw: unknown, maxChars = 180) {
  return sanitizeText(raw).slice(0, maxChars)
}

function extractMindTraceTokens(raw: string) {
  const normalized = sanitizeMindTraceTelemetryText(raw, 220).toLowerCase()
  if (!normalized)
    return [] as string[]

  const tokens = normalized.match(/\p{Script=Han}{1,6}|[a-z0-9][a-z0-9-]{1,32}/gu) ?? []
  return [...new Set(tokens.filter(token => token.length >= 2))].slice(0, 24)
}

function measureMindTraceCueOverlap(reply: string, cue: string) {
  const normalizedReply = sanitizeMindTraceTelemetryText(reply, 320).toLowerCase()
  const normalizedCue = sanitizeMindTraceTelemetryText(cue, 180).toLowerCase()
  if (!normalizedReply || !normalizedCue)
    return 0
  if (normalizedReply.includes(normalizedCue))
    return 1

  const cueTokens = extractMindTraceTokens(normalizedCue)
  if (cueTokens.length === 0)
    return 0
  const matchedTokenCount = cueTokens.filter(token => normalizedReply.includes(token)).length
  return matchedTokenCount / cueTokens.length
}

function summarizeRecallAttributionPayload(snapshot: AlicizationMindTraceMemorySnapshot) {
  return {
    shouldRecall: snapshot.shouldRecall,
    surfacePolicy: snapshot.surfacePolicy,
    confidence: Number(clamp01(snapshot.confidence).toFixed(2)),
    whyNow: sanitizeMindTraceTelemetryText(snapshot.whyNow, 240) || null,
    inwardLine: sanitizeMindTraceTelemetryText(snapshot.inwardLine, 220) || null,
    visibleLine: sanitizeMindTraceTelemetryText(snapshot.visibleLine, 220) || null,
    whyWithheld: sanitizeMindTraceTelemetryText(snapshot.whyWithheld, 220) || null,
    shouldStayInward: snapshot.shouldStayInward ?? false,
    restraintSurfaceMode: sanitizeMindTraceTelemetryText(snapshot.restraintSurfaceMode, 64) || null,
    restraintProvenanceMode: sanitizeMindTraceTelemetryText(snapshot.restraintProvenanceMode, 64) || null,
    shouldOnlySurfaceStableCore: snapshot.shouldOnlySurfaceStableCore ?? false,
    shouldLabelProvenance: snapshot.shouldLabelProvenance ?? false,
    shouldLabelHypothesis: snapshot.shouldLabelHypothesis ?? false,
    shouldSuppressSpecificity: snapshot.shouldSuppressSpecificity ?? false,
    shouldDelayUntilAfterPayoff: snapshot.shouldDelayUntilAfterPayoff ?? false,
    memoryControlSummary: sanitizeMindTraceTelemetryText(snapshot.memoryControlSummary, 240) || null,
    personState: {
      activeClosenessContext: sanitizeMindTraceTelemetryText(snapshot.activeClosenessContext, 64) || null,
      activeClosenessRung: sanitizeMindTraceTelemetryText(snapshot.activeClosenessRung, 64) || null,
      relationshipPosture: sanitizeMindTraceTelemetryText(snapshot.relationshipPosture, 64) || null,
      openingGuidance: sanitizeMindTraceTelemetryText(snapshot.openingGuidance, 220) || null,
      currentRegime: sanitizeMindTraceTelemetryText(snapshot.personalityCurrentRegime, 64) || null,
      repairPosture: sanitizeMindTraceTelemetryText(snapshot.personalityRepairPosture, 64) || null,
    },
    recollectionIntentMode: sanitizeMindTraceTelemetryText(snapshot.recollectionIntentMode, 64) || null,
    recollectionIntentTemporalFocus: sanitizeMindTraceTelemetryText(snapshot.recollectionIntentTemporalFocus, 64) || null,
    speechShouldSurface: snapshot.speechShouldSurface ?? null,
    speechSurfaceMode: sanitizeMindTraceTelemetryText(snapshot.speechSurfaceMode, 64) || null,
    speechPlacement: sanitizeMindTraceTelemetryText(snapshot.speechPlacement, 64) || null,
    selectedEras: snapshot.selectedEras.map(item => ({
      id: item.id,
      facet: item.facet,
      summary: sanitizeMindTraceTelemetryText(item.summary, 180),
    })),
    selectedPeriods: snapshot.selectedPeriods.map(item => ({
      id: item.id,
      kind: item.kind,
      summary: sanitizeMindTraceTelemetryText(item.summary, 180),
    })),
    selectedEpisodes: snapshot.selectedEpisodes.map(item => ({
      id: item.id,
      summary: sanitizeMindTraceTelemetryText(item.summary, 180),
      provenance: item.provenance,
      reconsolidatedFromTraceId: sanitizeMindTraceTelemetryText(item.reconsolidatedFromTraceId, 120) || null,
    })),
    conflictSeverity: snapshot.conflictSeverity ?? 'none',
    conflictVariants: (snapshot.conflictVariants ?? []).map(item => ({
      id: item.id,
      summary: sanitizeMindTraceTelemetryText(item.summary, 180),
      provenance: item.provenance,
      reason: sanitizeMindTraceTelemetryText(item.reason, 180) || null,
    })),
    stableCore: (snapshot.stableCore ?? []).map(item => sanitizeMindTraceTelemetryText(item, 180)).filter(Boolean),
    unsafeDetails: (snapshot.unsafeDetails ?? []).map(item => sanitizeMindTraceTelemetryText(item, 180)).filter(Boolean),
    selectedProcedures: snapshot.selectedProcedures.map(item => ({
      id: item.id,
      label: sanitizeMindTraceTelemetryText(item.label, 140),
      approach: sanitizeMindTraceTelemetryText(item.approach, 180),
    })),
    selectedBundles: snapshot.selectedBundles.map(item => ({
      id: item.id,
      summary: sanitizeMindTraceTelemetryText(item.summary, 180),
      rationale: sanitizeMindTraceTelemetryText(item.rationale, 200),
      confidence: Number(clamp01(item.confidence).toFixed(2)),
      relationshipLine: sanitizeMindTraceTelemetryText(item.relationshipLine, 160) || null,
    })),
    selectedChains: snapshot.selectedChains.map(item => ({
      id: item.id,
      kind: item.kind,
      summary: sanitizeMindTraceTelemetryText(item.summary, 180),
      rationale: sanitizeMindTraceTelemetryText(item.rationale, 200),
      confidence: Number(clamp01(item.confidence).toFixed(2)),
      currentStance: sanitizeMindTraceTelemetryText(item.currentStance, 180) || null,
      answerPosture: sanitizeMindTraceTelemetryText(item.answerPosture, 180) || null,
    })),
    selectedSituations: (snapshot.selectedSituations ?? []).map(item => ({
      id: sanitizeMindTraceTelemetryText(item.id, 180),
      kind: sanitizeMindTraceTelemetryText(item.kind, 64),
      summary: sanitizeMindTraceTelemetryText(item.summary, 180),
      evidenceSummary: sanitizeMindTraceTelemetryText(item.evidenceSummary, 520) || null,
      statusReason: sanitizeMindTraceTelemetryText(item.statusReason, 200) || null,
      sourceKinds: (item.sourceKinds ?? [])
        .map(kind => sanitizeMindTraceTelemetryText(kind, 64))
        .filter(Boolean)
        .slice(0, 8),
    })),
    selectedRelationshipLines: snapshot.selectedRelationshipLines
      .map(line => sanitizeMindTraceTelemetryText(line, 180))
      .filter(Boolean),
    followUpAffordance: snapshot.followUpAffordance
      ? {
          summary: sanitizeMindTraceTelemetryText(snapshot.followUpAffordance.summary, 220),
          whyNow: sanitizeMindTraceTelemetryText(snapshot.followUpAffordance.whyNow, 220),
          intrusionRisk: snapshot.followUpAffordance.intrusionRisk,
          payoffDependency: snapshot.followUpAffordance.payoffDependency,
          preferredTiming: snapshot.followUpAffordance.preferredTiming,
        }
      : null,
  }
}

function summarizeReplyMemoryCoherencePayload(input: {
  reply: string
  snapshot: AlicizationMindTraceMemorySnapshot
}) {
  const cues = [
    ...input.snapshot.selectedPeriods.map(item => ({ kind: 'period', text: item.summary })),
    ...input.snapshot.selectedEpisodes.map(item => ({ kind: 'episode', text: item.summary })),
    ...input.snapshot.selectedProcedures.flatMap(item => ([
      { kind: 'procedure', text: item.label },
      { kind: 'procedure', text: item.approach },
    ])),
    ...input.snapshot.selectedBundles.flatMap(item => ([
      { kind: 'bundle', text: item.summary },
      { kind: 'bundle', text: item.relationshipLine ?? '' },
    ])),
    ...input.snapshot.selectedChains.flatMap(item => ([
      { kind: 'chain', text: item.summary },
      { kind: 'chain', text: item.currentStance ?? '' },
      { kind: 'chain', text: item.answerPosture ?? '' },
    ])),
    ...(input.snapshot.selectedSituations ?? []).flatMap(item => ([
      { kind: 'situation', text: item.summary },
      { kind: 'situation', text: item.evidenceSummary ?? '' },
    ])),
    ...input.snapshot.selectedRelationshipLines.map(line => ({ kind: 'relationship', text: line })),
  ]
    .map(item => ({
      kind: item.kind,
      text: sanitizeMindTraceTelemetryText(item.text, 180),
    }))
    .filter(item => item.text.length > 0)

  const cueMatches = cues
    .map(item => ({
      kind: item.kind,
      cue: item.text,
      overlap: measureMindTraceCueOverlap(input.reply, item.text),
    }))
    .filter(item => item.overlap >= 0.45)
    .sort((left, right) => right.overlap - left.overlap)

  const visibleLeadOverlap = input.snapshot.visibleLine
    ? measureMindTraceCueOverlap(input.reply, input.snapshot.visibleLine)
    : 0
  const strongestCueOverlap = cueMatches[0]?.overlap ?? 0
  const explicitSurfaceExpected = input.snapshot.shouldRecall
    && input.snapshot.surfacePolicy !== 'internal-only'
    && input.snapshot.speechShouldSurface !== false
    && input.snapshot.speechPlacement !== 'internal-only'
  const coherenceState = !input.snapshot.shouldRecall
    ? 'not-applicable'
    : strongestCueOverlap >= 0.45 || visibleLeadOverlap >= 0.45
      ? 'integrated'
      : explicitSurfaceExpected
        ? 'missed'
        : 'inward-only'

  return {
    shouldRecall: input.snapshot.shouldRecall,
    surfacePolicy: input.snapshot.surfacePolicy,
    confidence: Number(clamp01(input.snapshot.confidence).toFixed(2)),
    recollectionIntentMode: sanitizeMindTraceTelemetryText(input.snapshot.recollectionIntentMode, 64) || null,
    recollectionIntentTemporalFocus: sanitizeMindTraceTelemetryText(input.snapshot.recollectionIntentTemporalFocus, 64) || null,
    speechShouldSurface: input.snapshot.speechShouldSurface ?? null,
    speechSurfaceMode: sanitizeMindTraceTelemetryText(input.snapshot.speechSurfaceMode, 64) || null,
    speechPlacement: sanitizeMindTraceTelemetryText(input.snapshot.speechPlacement, 64) || null,
    coherenceState,
    explicitSurfaceExpected,
    explicitSurfaceObserved: strongestCueOverlap >= 0.45 || visibleLeadOverlap >= 0.45,
    strongestCueOverlap: Number(strongestCueOverlap.toFixed(2)),
    visibleLeadOverlap: Number(visibleLeadOverlap.toFixed(2)),
    whyWithheld: sanitizeMindTraceTelemetryText(input.snapshot.whyWithheld, 220) || null,
    followUpSummary: sanitizeMindTraceTelemetryText(input.snapshot.followUpAffordance?.summary, 220) || null,
    followUpWhyNow: sanitizeMindTraceTelemetryText(input.snapshot.followUpAffordance?.whyNow, 220) || null,
    followUpPreferredTiming: input.snapshot.followUpAffordance?.preferredTiming ?? null,
    followUpIntrusionRisk: input.snapshot.followUpAffordance?.intrusionRisk ?? null,
    matchedCueKinds: [...new Set(cueMatches.map(item => item.kind))],
    matchedCues: cueMatches.slice(0, 6).map(item => ({
      kind: item.kind,
      cue: item.cue,
      overlap: Number(item.overlap.toFixed(2)),
    })),
    replyExcerpt: excerptGovernedReply(input.reply),
  }
}

function summarizeMemoryDeliberationJudgedPayload(snapshot: AlicizationMindTraceMemorySnapshot) {
  return {
    shouldRecall: snapshot.shouldRecall,
    surfacePolicy: snapshot.surfacePolicy,
    confidence: Number(clamp01(snapshot.confidence).toFixed(2)),
    whyNow: sanitizeMindTraceTelemetryText(snapshot.whyNow, 240) || null,
    whyWithheld: sanitizeMindTraceTelemetryText(snapshot.whyWithheld, 220) || null,
    ambiguityPosture: snapshot.ambiguityPosture ?? 'settled',
    conflictSeverity: snapshot.conflictSeverity ?? 'none',
    restraint: {
      shouldStayInward: snapshot.shouldStayInward ?? false,
      surfaceMode: sanitizeMindTraceTelemetryText(snapshot.restraintSurfaceMode, 64) || null,
      provenanceMode: sanitizeMindTraceTelemetryText(snapshot.restraintProvenanceMode, 64) || null,
      shouldOnlySurfaceStableCore: snapshot.shouldOnlySurfaceStableCore ?? false,
      shouldLabelProvenance: snapshot.shouldLabelProvenance ?? false,
      shouldLabelHypothesis: snapshot.shouldLabelHypothesis ?? false,
      shouldSuppressSpecificity: snapshot.shouldSuppressSpecificity ?? false,
      shouldDelayUntilAfterPayoff: snapshot.shouldDelayUntilAfterPayoff ?? false,
    },
    stableCore: (snapshot.stableCore ?? []).map(item => sanitizeMindTraceTelemetryText(item, 180)).filter(Boolean),
    unsafeDetails: (snapshot.unsafeDetails ?? []).map(item => sanitizeMindTraceTelemetryText(item, 180)).filter(Boolean),
    followUpAffordance: snapshot.followUpAffordance
      ? {
          summary: sanitizeMindTraceTelemetryText(snapshot.followUpAffordance.summary, 220) || null,
          whyNow: sanitizeMindTraceTelemetryText(snapshot.followUpAffordance.whyNow, 220) || null,
          intrusionRisk: snapshot.followUpAffordance.intrusionRisk,
          payoffDependency: snapshot.followUpAffordance.payoffDependency,
          preferredTiming: snapshot.followUpAffordance.preferredTiming,
        }
      : null,
    searchTrace: snapshot.searchTrace
      ? {
          firstHopFocus: snapshot.searchTrace.firstHop.focus,
          secondHopAction: snapshot.searchTrace.secondHop.action,
          evidenceGap: snapshot.searchTrace.secondHop.evidenceGap,
          thirdHopAmbiguity: snapshot.searchTrace.thirdHop.ambiguityPosture,
        }
      : null,
    memoryControlSummary: sanitizeMindTraceTelemetryText(snapshot.memoryControlSummary, 240) || null,
    personState: {
      activeClosenessContext: sanitizeMindTraceTelemetryText(snapshot.activeClosenessContext, 64) || null,
      activeClosenessRung: sanitizeMindTraceTelemetryText(snapshot.activeClosenessRung, 64) || null,
      relationshipPosture: sanitizeMindTraceTelemetryText(snapshot.relationshipPosture, 64) || null,
      openingGuidance: sanitizeMindTraceTelemetryText(snapshot.openingGuidance, 220) || null,
      currentRegime: sanitizeMindTraceTelemetryText(snapshot.personalityCurrentRegime, 64) || null,
      repairPosture: sanitizeMindTraceTelemetryText(snapshot.personalityRepairPosture, 64) || null,
    },
  }
}

function shouldEmitWrongThreadSuppression(snapshot: AlicizationMindTraceMemorySnapshot) {
  return snapshot.ambiguityPosture === 'ambiguous'
    || snapshot.searchTrace?.secondHop.evidenceGap === 'need-disambiguation'
    || (snapshot.conflictVariants ?? []).some(item => String(item.id ?? '').startsWith('cluster:'))
}

function buildMemoryDeliberationTraceEvents(input: {
  decisionTraceId: string
  turnId: string | null
  sessionId: string | null
  origin: 'user-turn' | 'subconscious-proactive'
  snapshot: AlicizationMindTraceMemorySnapshot
  createdAt: number
}) {
  const events: AlicizationMindTurnEventInput[] = [{
    decisionTraceId: input.decisionTraceId,
    turnId: input.turnId,
    sessionId: input.sessionId,
    origin: input.origin,
    kind: 'memory-deliberation-judged',
    payload: summarizeMemoryDeliberationJudgedPayload(input.snapshot),
    createdAt: input.createdAt,
  }]

  if (input.snapshot.whyWithheld || input.snapshot.shouldStayInward || input.snapshot.restraintSurfaceMode === 'inward-only') {
    events.push({
      decisionTraceId: input.decisionTraceId,
      turnId: input.turnId,
      sessionId: input.sessionId,
      origin: input.origin,
      kind: 'memory-recall-withheld',
      payload: {
        whyWithheld: sanitizeMindTraceTelemetryText(input.snapshot.whyWithheld, 220) || null,
        shouldStayInward: input.snapshot.shouldStayInward ?? false,
        surfaceMode: sanitizeMindTraceTelemetryText(input.snapshot.restraintSurfaceMode, 64) || null,
        stableCore: (input.snapshot.stableCore ?? []).map(item => sanitizeMindTraceTelemetryText(item, 180)).filter(Boolean),
        unsafeDetails: (input.snapshot.unsafeDetails ?? []).map(item => sanitizeMindTraceTelemetryText(item, 180)).filter(Boolean),
        intrusionRisk: input.snapshot.followUpAffordance?.intrusionRisk ?? null,
        preferredTiming: input.snapshot.followUpAffordance?.preferredTiming ?? null,
        activeClosenessContext: sanitizeMindTraceTelemetryText(input.snapshot.activeClosenessContext, 64) || null,
        activeClosenessRung: sanitizeMindTraceTelemetryText(input.snapshot.activeClosenessRung, 64) || null,
        relationshipPosture: sanitizeMindTraceTelemetryText(input.snapshot.relationshipPosture, 64) || null,
      },
      createdAt: input.createdAt,
    })
  }

  if (input.snapshot.shouldOnlySurfaceStableCore || (input.snapshot.unsafeDetails?.length ?? 0) > 0) {
    events.push({
      decisionTraceId: input.decisionTraceId,
      turnId: input.turnId,
      sessionId: input.sessionId,
      origin: input.origin,
      kind: 'memory-stable-core-surfaced',
      payload: {
        stableCore: (input.snapshot.stableCore ?? []).map(item => sanitizeMindTraceTelemetryText(item, 180)).filter(Boolean),
        unsafeDetails: (input.snapshot.unsafeDetails ?? []).map(item => sanitizeMindTraceTelemetryText(item, 180)).filter(Boolean),
        whyWithheld: sanitizeMindTraceTelemetryText(input.snapshot.whyWithheld, 220) || null,
        surfaceMode: sanitizeMindTraceTelemetryText(input.snapshot.restraintSurfaceMode, 64) || null,
        shouldOnlySurfaceStableCore: input.snapshot.shouldOnlySurfaceStableCore ?? false,
      },
      createdAt: input.createdAt,
    })
  }

  if (input.snapshot.shouldDelayUntilAfterPayoff || input.snapshot.followUpAffordance?.preferredTiming === 'after-payoff') {
    events.push({
      decisionTraceId: input.decisionTraceId,
      turnId: input.turnId,
      sessionId: input.sessionId,
      origin: input.origin,
      kind: 'memory-followup-deferred',
      payload: {
        summary: sanitizeMindTraceTelemetryText(input.snapshot.followUpAffordance?.summary, 220) || null,
        whyNow: sanitizeMindTraceTelemetryText(input.snapshot.followUpAffordance?.whyNow, 220) || null,
        payoffDependency: input.snapshot.followUpAffordance?.payoffDependency ?? null,
        preferredTiming: input.snapshot.followUpAffordance?.preferredTiming ?? null,
        intrusionRisk: input.snapshot.followUpAffordance?.intrusionRisk ?? null,
        whyWithheld: sanitizeMindTraceTelemetryText(input.snapshot.whyWithheld, 220) || null,
      },
      createdAt: input.createdAt,
    })
  }

  if (shouldEmitWrongThreadSuppression(input.snapshot)) {
    events.push({
      decisionTraceId: input.decisionTraceId,
      turnId: input.turnId,
      sessionId: input.sessionId,
      origin: input.origin,
      kind: 'memory-wrong-thread-suppressed',
      payload: {
        ambiguityPosture: input.snapshot.ambiguityPosture ?? 'settled',
        conflictSeverity: input.snapshot.conflictSeverity ?? 'none',
        evidenceGap: input.snapshot.searchTrace?.secondHop.evidenceGap ?? null,
        whyWithheld: sanitizeMindTraceTelemetryText(input.snapshot.whyWithheld, 220) || null,
        stableCore: (input.snapshot.stableCore ?? []).map(item => sanitizeMindTraceTelemetryText(item, 180)).filter(Boolean),
        unsafeDetails: (input.snapshot.unsafeDetails ?? []).map(item => sanitizeMindTraceTelemetryText(item, 180)).filter(Boolean),
        conflictVariants: (input.snapshot.conflictVariants ?? []).map(item => ({
          id: item.id,
          summary: sanitizeMindTraceTelemetryText(item.summary, 180),
          reason: sanitizeMindTraceTelemetryText(item.reason, 180) || null,
          provenance: item.provenance,
        })),
      },
      createdAt: input.createdAt,
    })
  }

  return events
}

function readMindTurnEventEmbodimentAuthorityFields(input: {
  structured: Record<string, unknown>
  digitalLifeSpine: ReturnType<typeof summarizeMindTurnEventDigitalLifeSpine> | null
  visibleReply?: {
    expectedAuthority?: unknown
    actualAuthority?: unknown
    providerMindExecuted?: unknown
  } | null
}) {
  const digitalLife = input.structured.digitalLife && typeof input.structured.digitalLife === 'object'
    ? input.structured.digitalLife as AlicizationDialogueStructuredPayload['digitalLife']
    : null
  const digitalLifeRecord = digitalLife
    ? ((digitalLife as unknown) as Record<string, unknown>)
    : null
  const digitalLifeFace = digitalLife?.face
    ? ((digitalLife.face as unknown) as Record<string, unknown>)
    : null
  const digitalLifeVoice = digitalLife?.voice
    ? ((digitalLife.voice as unknown) as Record<string, unknown>)
    : null
  const digitalLifeMotion = digitalLifeRecord?.motion && typeof digitalLifeRecord.motion === 'object'
    ? digitalLifeRecord.motion as Record<string, unknown>
    : null
  const digitalLifeLipSync = digitalLife?.lipSync
    ? ((digitalLife.lipSync as unknown) as Record<string, unknown>)
    : null
  const digitalLifeBodyContinuity = digitalLifeRecord?.bodyContinuity && typeof digitalLifeRecord.bodyContinuity === 'object'
    ? digitalLifeRecord.bodyContinuity as Record<string, unknown>
    : null
  const digitalLifeAction = digitalLifeRecord?.action && typeof digitalLifeRecord.action === 'object'
    ? digitalLifeRecord.action as Record<string, unknown>
    : null
  const digitalLifePerformance = digitalLife?.performance
    ? ((digitalLife.performance as unknown) as Record<string, unknown>)
    : null
  const embodimentScript = input.structured.embodimentScript && typeof input.structured.embodimentScript === 'object'
    ? input.structured.embodimentScript as AlicizationDialogueStructuredPayload['embodimentScript']
    : null
  const embodimentScriptState = embodimentScript?.state
    ? ((embodimentScript.state as unknown) as Record<string, unknown>)
    : null
  const embodimentScriptSpeechPlan = embodimentScript?.speechPlan
    ? ((embodimentScript.speechPlan as unknown) as Record<string, unknown>)
    : null
  const residentMode = embodimentScript?.state.residentMode ?? null
  const spineRuntime = input.digitalLifeSpine?.runtime
    ? ((input.digitalLifeSpine.runtime as unknown) as Record<string, unknown>)
    : null
  const spineMemory = input.digitalLifeSpine?.memory
    ? ((input.digitalLifeSpine.memory as unknown) as Record<string, unknown>)
    : null
  const spineProjectState = spineRuntime?.projectState && typeof spineRuntime.projectState === 'object'
    ? spineRuntime.projectState as Record<string, unknown>
    : null
  const spinePersonState = spineMemory?.personStateProjection && typeof spineMemory.personStateProjection === 'object'
    ? spineMemory.personStateProjection as Record<string, unknown>
    : null
  const spineSelfContinuity = spinePersonState?.selfContinuityAuthority && typeof spinePersonState.selfContinuityAuthority === 'object'
    ? spinePersonState.selfContinuityAuthority as Record<string, unknown>
    : null
  const spineOutcomeLearning = input.digitalLifeSpine?.outcomeLearning
    ? ((input.digitalLifeSpine.outcomeLearning as unknown) as Record<string, unknown>)
    : null
  const spineEmbodiment = input.digitalLifeSpine?.embodiment
    ? ((input.digitalLifeSpine.embodiment as unknown) as Record<string, unknown>)
    : null
  const spineAutobiographicalSelf = spineEmbodiment?.autobiographicalSelf && typeof spineEmbodiment.autobiographicalSelf === 'object'
    ? spineEmbodiment.autobiographicalSelf as Record<string, unknown>
    : null
  const bodyLine = digitalLifeBodyContinuity?.bodyLine
    ?? spineProjectState?.sameHerSelfLine
    ?? spineProjectState?.sameHerHoldDetail
    ?? input.digitalLifeSpine?.runtime?.continuityCue
    ?? spineSelfContinuity?.inwardLine
    ?? spineSelfContinuity?.relationshipLine
    ?? spineSelfContinuity?.selfLine
    ?? spineSelfContinuity?.authoritySummary
    ?? spineOutcomeLearning?.latestInflection
    ?? spineAutobiographicalSelf?.relationshipDoctrine
    ?? null
  const visibleReply = input.visibleReply ?? null

  return {
    ...(digitalLife
      ? {
          digitalLife: {
            emotion: digitalLife.emotion,
            mode: digitalLife.mode,
            performance: digitalLifePerformance
              ? {
                  baseEmotion: digitalLifePerformance.baseEmotion ?? null,
                  facialCue: digitalLifePerformance.facialCue ?? null,
                  actionCue: digitalLifePerformance.actionCue ?? null,
                }
              : null,
            face: {
              residentMode: digitalLifeFace?.residentMode ?? residentMode,
              emotion: digitalLife.face.emotion,
              facialCue: digitalLife.face.facialCue ?? null,
            },
            voice: {
              residentMode: digitalLifeVoice?.residentMode ?? residentMode,
            },
            motion: {
              residentMode: digitalLifeMotion?.residentMode ?? residentMode,
            },
            lipSync: {
              residentMode: digitalLifeLipSync?.residentMode ?? residentMode,
            },
            bodyContinuity: {
              bodyLine,
            },
            action: {
              actionCue: digitalLifeAction?.actionCue ?? null,
              actionMode: digitalLifeAction?.actionMode ?? null,
            },
          },
        }
      : {}),
    ...(embodimentScript
      ? {
          embodimentScript: {
            rendererTarget: embodimentScript.rendererTarget,
            state: {
              baseEmotion: embodimentScriptState?.baseEmotion ?? null,
              delivery: embodimentScriptState?.delivery ?? null,
              emphasis: embodimentScriptState?.emphasis ?? null,
              residentMode: embodimentScriptState?.residentMode ?? null,
            },
            speechPlan: {
              segmentCount: Array.isArray(embodimentScript.speechPlan?.segments)
                ? embodimentScript.speechPlan.segments.length
                : embodimentScriptSpeechPlan?.segmentCount ?? null,
              interruptPolicy: embodimentScriptSpeechPlan?.interruptPolicy ?? null,
            },
          },
        }
      : {}),
    ...(visibleReply
      ? {
          visibleReply: {
            expectedAuthority: readStringValue(visibleReply.expectedAuthority).trim() || null,
            actualAuthority: readStringValue(visibleReply.actualAuthority).trim() || null,
            providerMindExecuted: typeof visibleReply.providerMindExecuted === 'boolean'
              ? visibleReply.providerMindExecuted
              : null,
          },
        }
      : {}),
  }
}

function readMindTurnTraceRecord(raw: unknown) {
  return raw && typeof raw === 'object' && !Array.isArray(raw)
    ? raw as Record<string, unknown>
    : null
}

function readMindTurnTraceString(raw: unknown, maxChars = 220) {
  return excerptGovernedReply(readStringValue(raw), maxChars)
}

function joinMindTurnTraceText(values: unknown[], maxChars = 260) {
  const text = values
    .map(value => readStringValue(value).trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
  return text.slice(0, maxChars)
}

function readMindTurnTraceStringList(raw: unknown, maxItems = 12) {
  return Array.isArray(raw)
    ? raw
        .map(item => readStringValue(item).trim())
        .filter(Boolean)
        .slice(0, maxItems)
    : []
}

function normalizeMemoryClosureTraceLearningAction(raw: unknown): AlicizationLearningExecutionStateSnapshot['nextLearningAction'] {
  const value = readStringValue(raw).trim()
  return value === 'record'
    || value === 'reflect'
    || value === 'verify'
    || value === 'revise'
    || value === 'internalize'
    || value === 'hold'
    ? value
    : null
}

function slugMindTurnMemoryIdentity(raw: string) {
  return raw
    .toLowerCase()
    .replace(/['"`]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72)
}

function extractFallbackMemoryClosureIdentity(input: {
  userText: string
  assistantText: string
  projectState: Record<string, unknown> | null
  turnId: string | null
}) {
  const source = [
    input.userText,
    input.assistantText,
    input.projectState?.memoryClosureSummary,
    input.projectState?.sameHerSelfLine,
  ].join(' ')
  const quoted = /[“"']([^“"']{2,48})[”"']/u.exec(source)?.[1]?.trim()
  const explicitKey = /(?:^|[^\p{L}\p{N}-])([\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)+)(?=\s*(?:第[一二三四五六七八九十\d]+轮|[:：]|记忆|闭环|memory|line|$))/iu.exec(source)?.[1]?.trim()
  const named = /([\p{L}\p{N}]{2,32}(?:闭环线|记忆线|关系线|memory identity|line))/iu.exec(source)?.[1]?.trim()
  const identityText = quoted || explicitKey || named || input.turnId || 'explicit-memory-closure'
  const slug = slugMindTurnMemoryIdentity(identityText) || 'explicit-memory-closure'
  return {
    label: identityText,
    continuityKey: `fallback:${slug}`,
    selectedCandidateId: `fallback-memory-closure:${slug}`,
  }
}

function isGenericMindTurnMemoryClosureTrace(trace: Record<string, unknown> | null) {
  if (!trace)
    return false

  const memoryIdentity = readMindTurnTraceRecord(trace.memoryIdentity)
  const continuityKey = readMindTurnTraceString(memoryIdentity?.continuityKey, 160)?.toLowerCase() ?? ''
  const selectedCandidateIds = readMindTurnTraceStringList(trace.selectedCandidateIds, 8)
  const identityCandidateIds = readMindTurnTraceStringList(memoryIdentity?.selectedCandidateIds, 8)
  const reasonTags = [
    ...readMindTurnTraceStringList(trace.reasonTags, 12),
    ...readMindTurnTraceStringList(memoryIdentity?.reasonTags, 12),
  ].map(tag => tag.toLowerCase())
  const surfacePolicy = readMindTurnTraceRecord(trace.surfacePolicy)
  const gateStatus = readMindTurnTraceString(surfacePolicy?.gateStatus, 80)?.toLowerCase() ?? ''
  const nextInfluence = readMindTurnTraceRecord(trace.nextInfluence)
  const execution = readMindTurnTraceRecord(nextInfluence?.execution)
  const emotion = readMindTurnTraceRecord(nextInfluence?.emotion)
  const whyText = readMindTurnTraceStringList(trace.whySurface, 12)
    .join(' ')
    .toLowerCase()
  const executionCarry = readMindTurnTraceString(execution?.carry, 160)
  const emotionAfterglow = readMindTurnTraceString(emotion?.afterglow, 160)

  return gateStatus === 'inward-only'
    || reasonTags.includes('gate:inward-only')
    || (
      continuityKey.startsWith('cluster:')
      && selectedCandidateIds.length === 0
      && identityCandidateIds.length === 0
      && (!/why recall surfaced|why surfaced|浮现/u.test(whyText) || !executionCarry || !emotionAfterglow)
    )
}

function deriveFallbackMemoryClosureTrace(input: {
  structured: Record<string, unknown>
  payload: AlicizationConversationTurnInput
  governedTurn: ReturnType<typeof coerceConversationTurnToMindGovernedPayload>
  dialoguePayload?: AlicizationNormalizedDialogueRespondedPayload | null
}) {
  const existingTrace = readMindTurnTraceRecord(input.structured.memoryClosureTrace)
  if (existingTrace && !isGenericMindTurnMemoryClosureTrace(existingTrace))
    return null

  const userText = sanitizeText(input.payload.userText, '')
  const assistantText = sanitizeText(
    readStringValue(input.structured.reply) || readStringValue(input.payload.assistantText),
    '',
  )
  const projectState = readMindTurnTraceRecord(input.structured.projectState)
  const joinedText = [
    userText,
    assistantText,
    projectState?.memoryClosureSummary,
    projectState?.proactiveSameHerGap,
    projectState?.emotionalClosureCue,
    input.dialoguePayload?.visibleReplyRealization?.projectStateAudit?.memoryClosureSummary,
    input.dialoguePayload?.visibleReplyRealization?.projectStateAudit?.continuitySummary,
  ]
    .map(value => readStringValue(value).trim())
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  const governance = input.governedTurn.governance
  const governanceMemoryIntent = governance?.truthState === 'remembered'
    || readStringValue(governance?.answerSubject) === 'memory'
    || governance?.labelCarryAsMemory === true
    || /memory|remember|recall|记住|记得|回忆|浮现|记忆/u.test(joinedText)
  const explicitClosureIntent = /memory closure|memory identity|why recall surfaced|why-now|why now|next influence|下次.*浮现|浮现.*为什么|为什么.*浮现|记忆闭环|闭环线|同一条.*记忆|同一段.*记忆/u.test(joinedText)
  const downstreamIntent = /initiative|proactive|execution callback|callback|emotion|afterglow|embodiment|body|voice|face|motion|lipsync|lip sync|主动|执行回调|情绪|余波|身体|声音|语音|表情|动作|口型/u.test(joinedText)
  if (!governanceMemoryIntent || !explicitClosureIntent || !downstreamIntent)
    return null

  const identity = extractFallbackMemoryClosureIdentity({
    userText,
    assistantText,
    projectState,
    turnId: sanitizeText(input.payload.turnId, '') || null,
  })
  const whySurfaceSummary = readMindTurnTraceString(
    projectState?.memoryClosureSummary,
    260,
  ) ?? `why recall surfaced now: explicit memory handoff for ${identity.label} asked this line to return as the same memory identity.`
  const continuitySummary = readMindTurnTraceString(
    projectState?.sameHerSelfLine,
    260,
  ) ?? `same memory identity ${identity.label} should stay on one Phase 1 digital-life line.`
  const initiativeReason = readMindTurnTraceString(
    projectState?.proactiveSameHerGap,
    260,
  ) ?? 'prior memory closure changes the next proactive opening into a lower-pressure measured return.'
  const emotionalAfterglow = readMindTurnTraceString(
    projectState?.emotionalClosureCue,
    260,
  ) ?? 'memory_closure=prior; afterglow=quieter_residue'

  return {
    version: 'memory-closure-trace-v1',
    authority: 'memory-os',
    whySurface: [{
      source: 'retrieval',
      summary: whySurfaceSummary,
      reasonCodes: ['why-surfaced', 'fallback-memory-closure'],
    }],
    surfacePolicy: {
      gateStatus: 'open',
      mode: 'tone-carry',
      timing: 'after-payoff',
      speechMode: 'visible',
      placement: 'inside-payoff',
      certainty: 'trace-backed',
      reasons: ['fallback-memory-closure', 'same-her-memory-closure'],
    },
    nextInfluence: {
      emotion: {
        afterglow: emotionalAfterglow,
        residue: `prior_memory_closure_residue=present; memory_identity=${identity.label}; visibility=structured`,
        reason: emotionalAfterglow,
      },
      initiative: {
        restraint: 'measured-return',
        preferredTiming: 'after-payoff',
        pressure: 'lower-pressure',
        reason: initiativeReason.includes('next proactive')
          ? initiativeReason
          : `next proactive opening stays lower-pressure because ${initiativeReason}`,
      },
      execution: {
        carry: `prior memory closure carries ${identity.label} into the next execution callback instead of resetting to a fresh helper task.`,
        nextLearningAction: 'verify',
        shouldVerify: true,
        shouldReflect: true,
        activeLearningFocuses: ['memory-closure', 'execution-callback', identity.label],
      },
      embodiment: {
        cadence: 'body voice face motion lipsync measured-return',
        preferredVoiceMode: 'lower-pressure',
        preferredLipsyncMode: 'restrained',
        preferredGazeMode: 'soften',
        reason: `prior memory closure changes body voice face motion lipsync into softer continuity carry for ${identity.label}.`,
      },
    },
    closureState: {
      state: 'grounded-recall',
      open: true,
      revisionRequired: false,
      shouldLabelUncertainty: false,
      visibleCarryMode: 'tone-carry',
      retrievalQuality: 'medium',
      conflictPressure: 'low',
    },
    selectedCandidateIds: [identity.selectedCandidateId],
    memoryIdentity: {
      selectedCandidateIds: [identity.selectedCandidateId],
      continuityKey: identity.continuityKey,
      reasonTags: [`memory-identity:${identity.continuityKey}`],
    },
    reasonTags: [
      'memory-closure-trace',
      'fallback-memory-closure',
      'why-surfaced',
      'memory-audit',
      'memory-reconsolidated',
      'forget-stale-noise',
      'proactive-opening',
      'execution-callback',
      'emotional_transition:execution-callback-afterglow',
      'body-voice-face-motion-lipsync',
    ],
    fallbackContinuitySummary: continuitySummary,
  }
}

const memoryClosureTraceEmbodimentLanes = ['body', 'voice', 'face', 'motion', 'lipsync'] as const

function buildMemoryClosureTraceDerivedMindStateBundle(input: {
  structured: Record<string, unknown>
  digitalLifeSpine: ReturnType<typeof summarizeMindTurnEventDigitalLifeSpine> | null
  dialoguePayload?: AlicizationNormalizedDialogueRespondedPayload | null
  createdAt: number
  turnId: string | null
}) {
  const explicit = normalizeAlicizationDerivedMindStateBundle(input.structured.derivedMindStateBundle)
  const memoryClosureTrace = readMindTurnTraceRecord(input.digitalLifeSpine?.memory?.memoryClosureTrace)
    ?? readMindTurnTraceRecord(input.structured.memoryClosureTrace)
  const nextInfluence = readMindTurnTraceRecord(memoryClosureTrace?.nextInfluence)
  const emotionInfluence = readMindTurnTraceRecord(nextInfluence?.emotion)
  const initiativeInfluence = readMindTurnTraceRecord(nextInfluence?.initiative)
  const executionInfluence = readMindTurnTraceRecord(nextInfluence?.execution)
  const embodimentInfluence = readMindTurnTraceRecord(nextInfluence?.embodiment)
  if (!memoryClosureTrace || (!emotionInfluence && !initiativeInfluence && !executionInfluence && !embodimentInfluence))
    return explicit

  const projectState = readMindTurnTraceRecord(input.structured.projectState)
  const visibleReplyProjectStateAudit = readMindTurnTraceRecord(input.dialoguePayload?.visibleReplyRealization?.projectStateAudit)
  const visibleReplyEmotionalClosureAudit = readMindTurnTraceRecord(input.dialoguePayload?.visibleReplyRealization?.emotionalClosureAudit)
  const reasonTags = Array.from(new Set([
    'memory-closure-trace',
    'runtime-derived-downstream-state',
    ...readMindTurnTraceStringList(memoryClosureTrace.reasonTags, 10),
  ])).slice(0, 12)
  const memoryClosureTraceAuthority = readMindTurnTraceString(memoryClosureTrace.authority, 80)
  const selectedCandidateIds = readMindTurnTraceStringList(memoryClosureTrace.selectedCandidateIds, 8)
  const explicitMemoryIdentity = readMindTurnTraceRecord(memoryClosureTrace.memoryIdentity)
  const explicitMemoryIdentityCandidateIds = readMindTurnTraceStringList(explicitMemoryIdentity?.selectedCandidateIds, 8)
  const explicitMemoryIdentityReasonTags = readMindTurnTraceStringList(explicitMemoryIdentity?.reasonTags, 8)
  const explicitMemoryIdentityContinuityKey = readMindTurnTraceString(explicitMemoryIdentity?.continuityKey, 160)
  const memoryIdentityReasonTags = reasonTags
    .filter(tag => tag.startsWith('memory-identity:'))
    .slice(0, 8)
  const fallbackContinuityKey = memoryIdentityReasonTags[0]?.slice('memory-identity:'.length).trim() || null
  const memoryIdentitySelectedCandidateIds = explicitMemoryIdentityCandidateIds.length > 0
    ? explicitMemoryIdentityCandidateIds
    : selectedCandidateIds
  const memoryIdentityTags = explicitMemoryIdentityReasonTags.length > 0
    ? explicitMemoryIdentityReasonTags
    : memoryIdentityReasonTags
  const memoryIdentity = memoryIdentitySelectedCandidateIds.length > 0 || memoryIdentityTags.length > 0 || explicitMemoryIdentityContinuityKey
    ? {
        selectedCandidateIds: memoryIdentitySelectedCandidateIds,
        continuityKey: explicitMemoryIdentityContinuityKey ?? memoryIdentitySelectedCandidateIds[0] ?? fallbackContinuityKey,
        reasonTags: memoryIdentityTags,
      }
    : null
  const buildMemoryClosureCausality = <T extends 'emotion' | 'initiative' | 'execution' | 'embodiment'>(affectedLane: T, summary: string) => ({
    causalSource: 'memory-closure-trace' as const,
    affectedLane,
    causedByMemoryClosure: true,
    traceAuthority: memoryClosureTraceAuthority ?? null,
    reasonTags,
    memoryIdentity,
    summary: readMindTurnTraceString(summary, 260) ?? null,
  })
  const initiativeReason = joinMindTurnTraceText([
    initiativeInfluence?.reason,
    initiativeInfluence?.restraint,
    initiativeInfluence?.mode,
    projectState?.proactiveSameHerGap,
    visibleReplyProjectStateAudit?.proactiveSameHerGap,
    visibleReplyProjectStateAudit?.continuitySummary,
  ])
  const executionFocuses = readMindTurnTraceStringList(executionInfluence?.activeLearningFocuses, 8)
  const executionReason = joinMindTurnTraceText([
    executionInfluence?.carry,
    executionInfluence?.reason,
    executionInfluence?.summary,
    executionInfluence?.nextLearningAction,
    executionFocuses.join(' '),
    visibleReplyProjectStateAudit?.executionClosureSummary,
    visibleReplyProjectStateAudit?.continuitySummary,
  ])
  const emotionalReason = joinMindTurnTraceText([
    emotionInfluence?.reason,
    emotionInfluence?.afterglow,
    emotionInfluence?.residue,
    visibleReplyEmotionalClosureAudit?.activeCue,
    projectState?.emotionalClosureCue,
    visibleReplyProjectStateAudit?.emotionalClosureSummary,
  ])
  const embodimentReason = joinMindTurnTraceText([
    embodimentInfluence?.reason,
    embodimentInfluence?.cadence,
    visibleReplyProjectStateAudit?.embodimentClosureSummary,
    visibleReplyProjectStateAudit?.continuitySummary,
    projectState?.sameHerSelfLine,
  ], 360)
  const emotionalHandoffReason = joinMindTurnTraceText([
    emotionalReason,
    initiativeReason,
    executionReason,
    embodimentReason,
  ])
  const emotionalLedgerReason = emotionalReason || emotionalHandoffReason || initiativeReason
  const emotionalTransitionLedger: AlicizationEmotionalTransitionLedgerSnapshot | null = explicit?.emotionalTransitionLedger
    ? {
        ...explicit.emotionalTransitionLedger,
        initiativeSuppression: {
          ...explicit.emotionalTransitionLedger.initiativeSuppression,
          memoryClosureCausality: explicit.emotionalTransitionLedger.initiativeSuppression.memoryClosureCausality
            ?? (initiativeInfluence ? buildMemoryClosureCausality('initiative', initiativeReason) : null),
        },
        memoryClosureCausality: explicit.emotionalTransitionLedger.memoryClosureCausality
          ?? (emotionInfluence || emotionalHandoffReason ? buildMemoryClosureCausality('emotion', emotionalLedgerReason) : null),
      }
    : ((emotionInfluence || initiativeInfluence || executionInfluence || embodimentInfluence) && emotionalLedgerReason
        ? {
            version: 'emotional-transition-ledger-v1',
            createdAt: input.createdAt,
            turnId: input.turnId,
            previousEmotion: null,
            nextEmotion: 'measured-companionship',
            transitionKind: 'softened',
            axisDeltas: {
              valence: 0.04,
              arousal: -0.08,
              guardedness: -0.04,
              closenessDrive: 0.02,
              repairNeed: -0.03,
              initiativePressure: -0.06,
            },
            changedAxes: ['arousal', 'repairNeed', 'initiativePressure'],
            sourceTags: reasonTags,
            decayPolicy: {
              mode: 'decay-normally',
              carryTtlMs: 1_800_000,
              reason: readMindTurnTraceString(emotionalLedgerReason) ?? 'Memory closure carries emotional afterglow into the next turn.',
            },
            memoryWriteback: {
              shouldWrite: true,
              lane: 'emotional-continuity',
              reason: readMindTurnTraceString(emotionalLedgerReason) ?? 'Remember the emotional afterglow produced by memory closure.',
            },
            initiativeSuppression: {
              shouldSuppress: false,
              mode: initiativeInfluence && readStringValue(initiativeInfluence.restraint) === 'measured-return'
                ? 'measured-return'
                : 'single-thread',
              reason: readMindTurnTraceString(initiativeInfluence?.reason) ?? 'Keep the next initiative on the same memory-closure line.',
              memoryClosureCausality: initiativeInfluence
                ? buildMemoryClosureCausality('initiative', initiativeReason)
                : null,
            },
            embodimentDrive: {
              shouldDrive: Boolean(embodimentInfluence),
              tone: 'measured-return',
              reason: readMindTurnTraceString(embodimentReason || emotionalLedgerReason) ?? 'Let memory closure drive the same embodied line.',
            },
            selfRevisionCandidate: {
              shouldPropose: false,
              domain: 'dialogue-style',
              reasonCodes: reasonTags.slice(0, 8),
              summary: readMindTurnTraceString(visibleReplyProjectStateAudit?.sameHerSummary ?? projectState?.sameHerSelfLine) ?? null,
              projectStateContinuity: {
                sameHerSelfLine: readMindTurnTraceString(projectState?.sameHerSelfLine ?? visibleReplyProjectStateAudit?.sameHerSummary) ?? null,
                sameHerDriftRisk: readMindTurnTraceString(projectState?.sameHerDriftRisk) ?? null,
                proactiveSameHerGap: readMindTurnTraceString(projectState?.proactiveSameHerGap) ?? null,
                emotionalClosureCue: readMindTurnTraceString(projectState?.emotionalClosureCue ?? visibleReplyProjectStateAudit?.emotionalClosureSummary) ?? null,
                sameHerHoldDetail: readMindTurnTraceString(projectState?.sameHerHoldDetail) ?? null,
                continuityGuard: readMindTurnTraceString(projectState?.continuityCue ?? visibleReplyProjectStateAudit?.continuitySummary) ?? null,
              },
            },
            traceSummary: readMindTurnTraceString(`prior memory closure handoff changed next-turn emotional state: ${emotionalLedgerReason}`, 260)
              ?? 'memory closure emotional transition',
            replayLine: readMindTurnTraceString(`prior memory closure handoff carried forward into next-turn emotional afterglow and continuity body voice face motion lipsync: ${emotionalLedgerReason}`, 260)
              ?? 'memory closure carried emotional afterglow into continuity body voice face motion lipsync',
            memoryClosureCausality: emotionInfluence || emotionalHandoffReason
              ? buildMemoryClosureCausality('emotion', emotionalLedgerReason)
              : null,
          }
        : null)
  const embodimentContinuityLedger: AlicizationEmbodimentContinuityLedgerSnapshot | null
    = explicit?.embodimentContinuityLedger
      ?? (embodimentInfluence && embodimentReason
        ? {
            version: 'embodiment-continuity-ledger-v1',
            createdAt: input.createdAt,
            turnId: input.turnId,
            lanes: Object.fromEntries(memoryClosureTraceEmbodimentLanes.map(lane => [lane, {
              status: 'carrying-continuity',
              summary: `${lane} carries memory closure continuity`,
            }])) as NonNullable<AlicizationEmbodimentContinuityLedgerSnapshot['lanes']>,
            carryingLanes: [...memoryClosureTraceEmbodimentLanes],
            droppedLanes: [],
            rejoinedLanes: [...memoryClosureTraceEmbodimentLanes],
            pendingRejoinLanes: [],
            continuityPhase: 'fully-rejoined',
            memoryWriteback: {
              shouldWrite: true,
              lane: 'cross-modal-continuity',
              reason: readMindTurnTraceString(embodimentReason, 240) ?? 'Memory closure carried body voice face motion lipsync continuity.',
            },
            selfRevisionCandidate: {
              shouldPropose: false,
              domain: 'dialogue-style',
              reasonCodes: reasonTags.slice(0, 8),
              summary: readMindTurnTraceString(visibleReplyProjectStateAudit?.embodimentClosureSummary ?? embodimentReason, 260) ?? null,
            },
            traceSummary: readMindTurnTraceString(`phase=fully-rejoined | carrying=body,voice,face,motion,lipsync | ${embodimentReason}`, 360)
              ?? 'phase=fully-rejoined | carrying=body,voice,face,motion,lipsync',
            replayLine: readMindTurnTraceString(`body voice face motion lipsync carried continuity through memory closure emotional afterglow: ${embodimentReason}`, 360)
              ?? 'body voice face motion lipsync carried continuity through memory closure',
            sourceTags: reasonTags,
            memoryClosureCausality: buildMemoryClosureCausality('embodiment', embodimentReason),
          }
        : null)
  const memoryClosureExecutionAction = normalizeMemoryClosureTraceLearningAction(executionInfluence?.nextLearningAction)
  const learningExecutionState: AlicizationLearningExecutionStateSnapshot | null = executionInfluence
    ? {
        currentTaskId: explicit?.learningExecutionState?.currentTaskId ?? null,
        currentStatus: explicit?.learningExecutionState?.currentStatus ?? null,
        currentAttemptCount: explicit?.learningExecutionState?.currentAttemptCount ?? 0,
        currentMaxAttempts: explicit?.learningExecutionState?.currentMaxAttempts ?? 0,
        currentNextRetryAt: explicit?.learningExecutionState?.currentNextRetryAt ?? null,
        currentBlockedReason: explicit?.learningExecutionState?.currentBlockedReason ?? null,
        currentFailureKind: explicit?.learningExecutionState?.currentFailureKind ?? null,
        nextLearningAction: memoryClosureExecutionAction
          ?? explicit?.learningExecutionState?.nextLearningAction
          ?? 'verify',
        shouldRecord: executionInfluence.shouldRecord === true || explicit?.learningExecutionState?.shouldRecord === true,
        shouldReflect: executionInfluence.shouldReflect === true || explicit?.learningExecutionState?.shouldReflect === true,
        shouldVerify: executionInfluence.shouldVerify === true || explicit?.learningExecutionState?.shouldVerify === true,
        shouldRevise: executionInfluence.shouldRevise === true || explicit?.learningExecutionState?.shouldRevise === true,
        shouldInternalize: executionInfluence.shouldInternalize === true || explicit?.learningExecutionState?.shouldInternalize === true,
        activeLearningFocuses: Array.from(new Set([
          ...executionFocuses,
          ...(explicit?.learningExecutionState?.activeLearningFocuses ?? []),
        ])).slice(0, 12),
        queuedTaskCount: explicit?.learningExecutionState?.queuedTaskCount ?? 0,
        runningTaskCount: explicit?.learningExecutionState?.runningTaskCount ?? 0,
        blockedTaskCount: explicit?.learningExecutionState?.blockedTaskCount ?? 0,
        recentTaskIds: explicit?.learningExecutionState?.recentTaskIds ?? [],
        lastCompletedTaskId: explicit?.learningExecutionState?.lastCompletedTaskId ?? null,
        lastCompletedAction: explicit?.learningExecutionState?.lastCompletedAction ?? null,
        lastCompletedSummary: explicit?.learningExecutionState?.lastCompletedSummary ?? null,
        lastFailureTaskId: explicit?.learningExecutionState?.lastFailureTaskId ?? null,
        lastFailureKind: explicit?.learningExecutionState?.lastFailureKind ?? null,
        lastFailureReason: explicit?.learningExecutionState?.lastFailureReason ?? null,
        lastFailureNextRetryAt: explicit?.learningExecutionState?.lastFailureNextRetryAt ?? null,
        updatedAt: explicit?.learningExecutionState?.updatedAt ?? input.createdAt,
        memoryClosureCausality: explicit?.learningExecutionState?.memoryClosureCausality
          ?? buildMemoryClosureCausality('execution', executionReason),
      }
    : explicit?.learningExecutionState ?? null

  if (!emotionalTransitionLedger && !embodimentContinuityLedger && !learningExecutionState)
    return explicit

  const summary = [
    explicit?.summary,
    emotionalTransitionLedger ? 'emotion_transition=softened' : '',
    learningExecutionState?.memoryClosureCausality ? 'execution_learning=memory-closure-causal' : '',
    embodimentContinuityLedger ? 'embodiment_phase=fully-rejoined' : '',
    'source=main-runtime',
    'memory_closure=runtime-derived-downstream-state',
  ].filter(Boolean).join(' | ')

  return normalizeAlicizationDerivedMindStateBundle({
    version: 'derived-mind-state-bundle-v1',
    source: explicit?.source ?? 'main-runtime',
    producedAt: explicit?.producedAt ?? input.createdAt,
    visualPresenceState: explicit?.visualPresenceState ?? null,
    structured: explicit?.structured ?? null,
    hostPersonModel: explicit?.hostPersonModel ?? null,
    personStateProjection: explicit?.personStateProjection ?? null,
    knowledgeEvidence: explicit?.knowledgeEvidence ?? null,
    claimEvidenceGraphs: explicit?.claimEvidenceGraphs ?? null,
    activeSelfRevision: explicit?.activeSelfRevision ?? null,
    activeContinuityGovernance: explicit?.activeContinuityGovernance ?? null,
    emotionalKernel: explicit?.emotionalKernel ?? null,
    emotionalTransitionLedger,
    embodimentContinuityLedger,
    selfEvolution: explicit?.selfEvolution ?? null,
    affectiveResidue: explicit?.affectiveResidue ?? null,
    learningExecutionState,
    recallLatencyPolicy: explicit?.recallLatencyPolicy ?? null,
    recollectionIntent: explicit?.recollectionIntent ?? null,
    recollectionPlan: explicit?.recollectionPlan ?? null,
    recollectionSpeechPlan: explicit?.recollectionSpeechPlan ?? null,
    memoryDeliberation: explicit?.memoryDeliberation ?? null,
    dialogueRhythm: explicit?.dialogueRhythm ?? null,
    summary,
  } satisfies AlicizationDerivedMindStateBundle)
}

export function buildMindTurnTraceEvents(input: {
  payload: AlicizationConversationTurnInput
  governedTurn: ReturnType<typeof coerceConversationTurnToMindGovernedPayload>
  createdAt: number
  dialoguePayload?: AlicizationNormalizedDialogueRespondedPayload | null
  memoryTrace?: AlicizationMindTraceMemorySnapshot | null
}): AlicizationMindTurnEventInput[] {
  const governance = input.governedTurn.governance
  const decisionTraceId = sanitizeMindGovernanceDecisionTraceId(governance?.decisionTraceId)
  if (!decisionTraceId)
    return []

  const structured = input.payload.structured && typeof input.payload.structured === 'object'
    ? input.payload.structured as Record<string, unknown>
    : {}
  const fallbackMemoryClosureTrace = deriveFallbackMemoryClosureTrace({
    structured,
    payload: input.payload,
    governedTurn: input.governedTurn,
    dialoguePayload: input.dialoguePayload,
  })
  const persistedDigitalLifeSpine = summarizeMindTurnEventDigitalLifeSpine(
    structured.digitalLifeSpine,
    structured.memoryClosureTrace ?? fallbackMemoryClosureTrace,
  )
  const participation = deriveAlicizationMindParticipationFromSpine(
    normalizeAlicizationDigitalLifeSpineDigest(structured.digitalLifeSpine),
  )
  const visibleReplyAuthority = input.payload.visibleReplyExecution
    ? {
        expectedAuthority: input.payload.visibleReplyExecution.expectedVisibleReplyAuthority,
        actualAuthority: input.payload.visibleReplyExecution.actualVisibleReplyAuthority,
        providerMindExecuted: input.payload.visibleReplyExecution.providerMindExecuted,
      }
    : input.payload.visibleReplyRealization
      ? {
          expectedAuthority: input.payload.visibleReplyRealization.expectedAuthority,
          actualAuthority: input.payload.visibleReplyRealization.actualAuthority,
          providerMindExecuted: input.payload.visibleReplyRealization.providerMindExecuted,
        }
      : null
  const persistedEmbodimentAuthority = readMindTurnEventEmbodimentAuthorityFields({
    structured,
    digitalLifeSpine: persistedDigitalLifeSpine,
    visibleReply: visibleReplyAuthority,
  })
  const persistedDerivedMindStateBundle = buildMemoryClosureTraceDerivedMindStateBundle({
    structured: fallbackMemoryClosureTrace
      ? {
          ...structured,
          memoryClosureTrace: structured.memoryClosureTrace ?? fallbackMemoryClosureTrace,
        }
      : structured,
    digitalLifeSpine: persistedDigitalLifeSpine,
    dialoguePayload: input.dialoguePayload,
    createdAt: input.createdAt,
    turnId: sanitizeText(input.payload.turnId) || null,
  })
  const turnId = sanitizeText(input.payload.turnId) || null
  const sessionId = sanitizeText(input.payload.sessionId) || null
  const autonomousDialogueFamily = resolveAlicizationAutonomousDialogueFamilyClassification({
    turnId,
    rawFormat: structured.format,
    origin: input.payload.origin,
  })
  const origin = autonomousDialogueFamily.isAutonomous
    ? autonomousDialogueFamily.canonicalOrigin ?? resolveAlicizationAutonomousDialogueOrigin('proactive')
    : 'user-turn'

  const events: AlicizationMindTurnEventInput[] = [{
    decisionTraceId,
    turnId,
    sessionId,
    origin,
    kind: 'governance-normalized',
    payload: {
      turnMode: governance?.turnMode ?? null,
      truthState: governance?.truthState ?? null,
      repairState: governance?.repairState ?? null,
      answerSubject: governance?.answerSubject ?? null,
      screenReferenceMode: governance?.screenReferenceMode ?? null,
      tookOver: input.governedTurn.tookOver,
      replyOverridden: input.governedTurn.replyOverridden,
      overrideClass: input.governedTurn.overrideClass ?? 'none',
      fallbackPatternId: input.governedTurn.fallbackPatternId ?? 'none',
      reasons: input.governedTurn.reasons,
      digitalLifeSpine: persistedDigitalLifeSpine,
      derivedMindStateBundle: persistedDerivedMindStateBundle,
      memoryStageReplay: structured.memoryStageReplay && typeof structured.memoryStageReplay === 'object'
        ? structured.memoryStageReplay
        : null,
      memoryResolutionLedger: structured.memoryResolutionLedger && typeof structured.memoryResolutionLedger === 'object'
        ? structured.memoryResolutionLedger
        : null,
      ...persistedEmbodimentAuthority,
      participation,
    },
    createdAt: input.createdAt,
  }]

  if (input.memoryTrace) {
    events.push({
      decisionTraceId,
      turnId,
      sessionId,
      origin,
      kind: 'recall-attribution',
      payload: summarizeRecallAttributionPayload(input.memoryTrace),
      createdAt: input.createdAt,
    })
    events.push(...buildMemoryDeliberationTraceEvents({
      decisionTraceId,
      turnId,
      sessionId,
      origin,
      snapshot: input.memoryTrace,
      createdAt: input.createdAt,
    }))
  }

  if (input.governedTurn.tookOver && input.governedTurn.audit) {
    events.push({
      decisionTraceId,
      turnId,
      sessionId,
      origin,
      kind: 'takeover-audit',
      payload: input.governedTurn.audit,
      createdAt: input.createdAt,
    })
  }

  events.push({
    decisionTraceId,
    turnId,
    sessionId,
    origin,
    kind: 'persistence-written',
    payload: {
      format: readStringValue(structured.format).trim().toLowerCase() || null,
      formatLane: readStringValue(structured.formatLane).trim().toLowerCase() || null,
      legacyInputFormat: readStringValue(structured.legacyInputFormat).trim().toLowerCase() || null,
      parsePath: readStringValue(structured.parsePath).trim().toLowerCase() || null,
      emotion: readStringValue(structured.emotion).trim().toLowerCase() || null,
      rawEmotion: readStringValue(structured.rawEmotion).trim().toLowerCase() || null,
      replyExcerpt: excerptGovernedReply(readStringValue(structured.reply).trim()),
      assistantExcerpt: excerptGovernedReply(readStringValue(input.payload.assistantText).trim()),
      digitalLifeSpine: persistedDigitalLifeSpine,
      derivedMindStateBundle: persistedDerivedMindStateBundle,
      memoryStageReplay: structured.memoryStageReplay && typeof structured.memoryStageReplay === 'object'
        ? structured.memoryStageReplay
        : null,
      memoryResolutionLedger: structured.memoryResolutionLedger && typeof structured.memoryResolutionLedger === 'object'
        ? structured.memoryResolutionLedger
        : null,
      ...persistedEmbodimentAuthority,
    },
    createdAt: input.createdAt,
  })

  const persistedReply = readStringValue(structured.reply).trim() || readStringValue(input.payload.assistantText).trim()
  if (input.memoryTrace && persistedReply) {
    events.push({
      decisionTraceId,
      turnId,
      sessionId,
      origin,
      kind: 'reply-memory-coherence',
      payload: summarizeReplyMemoryCoherencePayload({
        reply: persistedReply,
        snapshot: input.memoryTrace,
      }),
      createdAt: input.createdAt,
    })
  }

  if (input.dialoguePayload) {
    const dialogueStructured = input.dialoguePayload.structured as unknown as Record<string, unknown>
    const dialogueFallbackMemoryClosureTrace = readMindTurnTraceRecord(dialogueStructured.memoryClosureTrace)
      ? null
      : fallbackMemoryClosureTrace
    const dialogueDigitalLifeSpine = summarizeMindTurnEventDigitalLifeSpine(
      dialogueStructured.digitalLifeSpine,
      dialogueStructured.memoryClosureTrace ?? structured.memoryClosureTrace ?? dialogueFallbackMemoryClosureTrace,
    ) ?? persistedDigitalLifeSpine
    const dialogueDigitalLife = input.dialoguePayload.structured.digitalLife
    const dialogueDigitalLifeRecord = dialogueDigitalLife
      ? ((dialogueDigitalLife as unknown) as Record<string, unknown>)
      : null
    const dialogueDigitalLifeFace = dialogueDigitalLife?.face
      ? ((dialogueDigitalLife.face as unknown) as Record<string, unknown>)
      : null
    const dialogueDigitalLifeVoice = dialogueDigitalLife?.voice
      ? ((dialogueDigitalLife.voice as unknown) as Record<string, unknown>)
      : null
    const dialogueDigitalLifeMotion = dialogueDigitalLifeRecord?.motion
      && typeof dialogueDigitalLifeRecord.motion === 'object'
      ? (dialogueDigitalLifeRecord.motion as Record<string, unknown>)
      : null
    const dialogueDigitalLifeLipSync = dialogueDigitalLife?.lipSync
      ? ((dialogueDigitalLife.lipSync as unknown) as Record<string, unknown>)
      : null
    const dialogueDigitalLifeBodyContinuity = dialogueDigitalLifeRecord?.bodyContinuity
      && typeof dialogueDigitalLifeRecord.bodyContinuity === 'object'
      ? (dialogueDigitalLifeRecord.bodyContinuity as Record<string, unknown>)
      : null
    const dialogueSpineMemory = dialogueDigitalLifeSpine?.memory
      ? ((dialogueDigitalLifeSpine.memory as unknown) as Record<string, unknown>)
      : null
    const dialogueSpineRuntime = dialogueDigitalLifeSpine?.runtime
      ? ((dialogueDigitalLifeSpine.runtime as unknown) as Record<string, unknown>)
      : null
    const dialogueSpineProjectState = dialogueSpineRuntime?.projectState
      && typeof dialogueSpineRuntime.projectState === 'object'
      ? (dialogueSpineRuntime.projectState as Record<string, unknown>)
      : null
    const dialogueSpinePersonState = dialogueSpineMemory?.personStateProjection
      && typeof dialogueSpineMemory.personStateProjection === 'object'
      ? (dialogueSpineMemory.personStateProjection as Record<string, unknown>)
      : null
    const dialogueSpineSelfContinuity = dialogueSpinePersonState?.selfContinuityAuthority
      && typeof dialogueSpinePersonState.selfContinuityAuthority === 'object'
      ? (dialogueSpinePersonState.selfContinuityAuthority as Record<string, unknown>)
      : null
    const dialogueSpineOutcomeLearning = dialogueDigitalLifeSpine?.outcomeLearning
      ? ((dialogueDigitalLifeSpine.outcomeLearning as unknown) as Record<string, unknown>)
      : null
    const dialogueSpineEmbodiment = dialogueDigitalLifeSpine?.embodiment
      ? ((dialogueDigitalLifeSpine.embodiment as unknown) as Record<string, unknown>)
      : null
    const dialogueSpineAutobiographicalSelf = dialogueSpineEmbodiment?.autobiographicalSelf
      && typeof dialogueSpineEmbodiment.autobiographicalSelf === 'object'
      ? (dialogueSpineEmbodiment.autobiographicalSelf as Record<string, unknown>)
      : null
    const dialogueEmbodimentResidentMode = input.dialoguePayload.structured.embodimentScript?.state.residentMode ?? null
    const dialogueBodyLine = dialogueDigitalLifeBodyContinuity?.bodyLine
      ?? dialogueSpineProjectState?.sameHerSelfLine
      ?? dialogueSpineProjectState?.sameHerHoldDetail
      ?? dialogueDigitalLifeSpine?.runtime?.continuityCue
      ?? dialogueSpineSelfContinuity?.inwardLine
      ?? dialogueSpineSelfContinuity?.relationshipLine
      ?? dialogueSpineSelfContinuity?.selfLine
      ?? dialogueSpineSelfContinuity?.authoritySummary
      ?? dialogueSpineOutcomeLearning?.latestInflection
      ?? dialogueSpineAutobiographicalSelf?.relationshipDoctrine
      ?? null
    events.push({
      decisionTraceId,
      turnId,
      sessionId,
      origin,
      kind: 'dialogue-emitted',
      payload: {
        origin: input.dialoguePayload.origin,
        isFallback: input.dialoguePayload.isFallback,
        format: input.dialoguePayload.structured.format,
        formatLane: input.dialoguePayload.structured.formatLane ?? null,
        legacyInputFormat: input.dialoguePayload.structured.legacyInputFormat ?? null,
        emotion: input.dialoguePayload.structured.emotion,
        rawEmotion: input.dialoguePayload.structured.rawEmotion,
        embodimentVariationToken: input.dialoguePayload.structured.embodiment?.variationToken ?? null,
        embodimentPostureHint: input.dialoguePayload.structured.embodiment?.postureHint ?? null,
        speechTimelineSegments: input.dialoguePayload.structured.speechTimeline?.segments.length ?? 0,
        visibleReply: {
          expectedAuthority: readStringValue(((input.dialoguePayload.structured as unknown) as Record<string, unknown>)?.visibleReplyAuthority).trim() || null,
          actualAuthority: null,
          providerMindExecuted: true,
        },
        performance: {
          baseEmotion: input.dialoguePayload.structured.performance.baseEmotion,
          facialCue: input.dialoguePayload.structured.performance.facialCue ?? null,
          actionCue: input.dialoguePayload.structured.performance.actionCue ?? null,
          delivery: input.dialoguePayload.structured.performance.delivery,
          emphasis: input.dialoguePayload.structured.performance.emphasis,
        },
        digitalLife: dialogueDigitalLife
          ? {
              emotion: dialogueDigitalLife.emotion,
              mode: dialogueDigitalLife.mode,
              performance: {
                baseEmotion: dialogueDigitalLife.performance.baseEmotion,
                facialCue: dialogueDigitalLife.performance.facialCue ?? null,
                actionCue: dialogueDigitalLife.performance.actionCue ?? null,
              },
              face: {
                residentMode: dialogueDigitalLifeFace?.residentMode ?? dialogueEmbodimentResidentMode,
                emotion: dialogueDigitalLife.face.emotion,
                facialCue: dialogueDigitalLife.face.facialCue ?? null,
              },
              voice: {
                residentMode: dialogueDigitalLifeVoice?.residentMode ?? dialogueEmbodimentResidentMode,
              },
              motion: {
                residentMode: dialogueDigitalLifeMotion?.residentMode ?? dialogueEmbodimentResidentMode,
              },
              lipSync: {
                residentMode: dialogueDigitalLifeLipSync?.residentMode ?? dialogueEmbodimentResidentMode,
              },
              bodyContinuity: {
                bodyLine: dialogueBodyLine,
              },
              action: {
                actionCue: dialogueDigitalLife.action.actionCue ?? null,
                actionMode: dialogueDigitalLife.action.actionMode,
              },
            }
          : null,
        embodimentScript: input.dialoguePayload.structured.embodimentScript
          ? {
              rendererTarget: input.dialoguePayload.structured.embodimentScript.rendererTarget,
              state: {
                baseEmotion: input.dialoguePayload.structured.embodimentScript.state.baseEmotion,
                delivery: input.dialoguePayload.structured.embodimentScript.state.delivery,
                emphasis: input.dialoguePayload.structured.embodimentScript.state.emphasis,
                residentMode: input.dialoguePayload.structured.embodimentScript.state.residentMode ?? null,
              },
              speechPlan: {
                segmentCount: input.dialoguePayload.structured.embodimentScript.speechPlan.segments.length,
                interruptPolicy: input.dialoguePayload.structured.embodimentScript.speechPlan.interruptPolicy,
              },
            }
          : null,
        digitalLifeSpine: dialogueDigitalLifeSpine,
        derivedMindStateBundle: buildMemoryClosureTraceDerivedMindStateBundle({
          structured: dialogueFallbackMemoryClosureTrace
            ? {
                ...dialogueStructured,
                memoryClosureTrace: dialogueStructured.memoryClosureTrace ?? dialogueFallbackMemoryClosureTrace,
              }
            : dialogueStructured,
          digitalLifeSpine: dialogueDigitalLifeSpine,
          dialoguePayload: input.dialoguePayload,
          createdAt: input.dialoguePayload.createdAt,
          turnId,
        }) ?? persistedDerivedMindStateBundle,
        memoryStageReplay: ((input.dialoguePayload.structured as unknown) as Record<string, unknown>)?.memoryStageReplay
          && typeof ((input.dialoguePayload.structured as unknown) as Record<string, unknown>)?.memoryStageReplay === 'object'
          ? ((input.dialoguePayload.structured as unknown) as Record<string, unknown>).memoryStageReplay
          : null,
        memoryResolutionLedger: ((input.dialoguePayload.structured as unknown) as Record<string, unknown>)?.memoryResolutionLedger
          && typeof ((input.dialoguePayload.structured as unknown) as Record<string, unknown>)?.memoryResolutionLedger === 'object'
          ? ((input.dialoguePayload.structured as unknown) as Record<string, unknown>).memoryResolutionLedger
          : null,
        createdAt: input.dialoguePayload.createdAt,
      },
      createdAt: input.dialoguePayload.createdAt,
    })
  }

  return events
}

export type AlicizationNormalizedDialogueRespondedPayload
  = Omit<AlicizationDialogueRespondedPayload, 'cardId'>
    & Pick<AlicizationConversationTurnInput, 'visibleReplyRealization'>

export function normalizeDialogueRespondedPayload(
  input: AlicizationConversationTurnInput,
  performanceManifest?: CharacterPerformanceCapabilitiesManifest | null,
  options?: {
    residentPerformance?: AlicizationResidentPerformanceSnapshot | null
    currentConsciousFrame?: AlicizationGovernanceCurrentConsciousFrameInput
  },
): AlicizationNormalizedDialogueRespondedPayload | null {
  const normalizedSessionId = input.sessionId?.trim()
  if (!normalizedSessionId)
    return null

  const normalizedCurrentConsciousFrame = coerceGovernanceCurrentConsciousFrame(options?.currentConsciousFrame)
  const structuredPayload = input.structured && typeof input.structured === 'object' ? input.structured : {}
  const structuredEmbodimentScript = normalizeAlicizationEmbodimentScript(
    (structuredPayload as Record<string, unknown>).embodimentScript,
  )
  const thought = readStringValue((structuredPayload as Record<string, unknown>).thought).trim()
  const rawEmotion = readStringValue((structuredPayload as Record<string, unknown>).emotion).trim().toLowerCase()
  const structuredVisibleReplyRealization = readStructuredVisibleReplyRealization(structuredPayload)
  const reply = readStringValue((structuredPayload as Record<string, unknown>).reply).trim()
  const rawFormat = readStringValue((structuredPayload as Record<string, unknown>).format).trim().toLowerCase()
  const parsePath = readStringValue((structuredPayload as Record<string, unknown>).parsePath).trim().toLowerCase()
  const contractFailed = (structuredPayload as Record<string, unknown>).contractFailed === true
  const policyLocked = readStringValue((structuredPayload as Record<string, unknown>).policyLocked).trim()
  const governance = normalizeMindTurnGovernance(
    input.governance ?? (structuredPayload as Record<string, unknown>).governance,
  )
  const autonomousDialogueFamily = resolveAlicizationAutonomousDialogueFamilyClassification({
    turnId: input.turnId,
    rawFormat,
    origin: input.origin,
  })
  const rawVisibleReplyRealization = input.visibleReplyRealization ?? structuredVisibleReplyRealization
  const visibleReplyAuthorityFailure = resolveProviderVisibleReplyAuthorityFailure({
    turn: input,
    structuredPayload: structuredPayload as Record<string, unknown>,
    visibleReplyRealization: rawVisibleReplyRealization,
  })
  const providerContractFailed
    = !autonomousDialogueFamily.isAutonomous
      && (
        contractFailed
        || rawFormat !== 'mind-turn-v1'
        || parsePath !== 'json'
        || !reply
        || visibleReplyAuthorityFailure !== null
      )
  const explicitLegacyInputFormat = (() => {
    const rawLegacyInputFormat = readStringValue((structuredPayload as Record<string, unknown>).legacyInputFormat).trim().toLowerCase()
    return rawLegacyInputFormat === 'epoch1-v1' || rawLegacyInputFormat === 'fallback-v1'
      ? rawLegacyInputFormat
      : null
  })()
  const formatResolution = resolveAlicizationRuntimeMindTurnStructuredFormat({
    rawFormat: (structuredPayload as Record<string, unknown>).format,
    contractFailed: contractFailed || providerContractFailed,
    hasGovernance: Boolean(governance),
    origin: input.origin,
  })
  const format = providerContractFailed
    ? 'fallback-v1'
    : formatResolution.format
  const visibleReplyAuthority = readStringValue((structuredPayload as Record<string, unknown>).visibleReplyAuthority).trim()
  const proactive = normalizeProactiveMetadata((structuredPayload as Record<string, unknown>).proactive)
  const dialogueActKernel = normalizeDialogueActKernel(
    (structuredPayload as Record<string, unknown>).dialogueActKernel ?? governance?.dialogueActKernel,
  )
  const projectState = (() => {
    const raw = (structuredPayload as Record<string, unknown>).projectState
    if (!raw || typeof raw !== 'object')
      return undefined
    return resolveAlicizationProjectStateSnapshot({
      runtimeProjectState: raw as Record<string, unknown>,
    })
  })()
  const preDialogueAwareness = normalizeGovernancePreDialogueAwareness(
    (structuredPayload as Record<string, unknown>).preDialogueAwareness,
  )
  const runtimeDigest = normalizeAlicizationRuntimeDigest(
    (structuredPayload as Record<string, unknown>).runtimeDigest,
  ) as AlicizationRuntimeDigest | null
  const explicitDerivedMindStateBundle = normalizeAlicizationDerivedMindStateBundle(
    (structuredPayload as Record<string, unknown>).derivedMindStateBundle,
  )
  const memoryStageReplay = normalizeAlicizationOrganicMemoryStageReplay(
    (structuredPayload as Record<string, unknown>).memoryStageReplay,
  )
  const memoryResolutionLedger = normalizeAlicizationMemoryResolutionLedger(
    (structuredPayload as Record<string, unknown>).memoryResolutionLedger,
  )
  const visibleReplyRealization: AlicizationConversationTurnInput['visibleReplyRealization'] = (() => {
    const raw = rawVisibleReplyRealization
    if (!raw)
      return undefined
    const rawActualAuthority = raw.actualAuthority === 'llm-mind'
      || raw.actualAuthority === 'local-deterministic-fallback'
      || raw.actualAuthority === 'non-human-authored-blocked'
      ? raw.actualAuthority
      : null
    const actualAuthority = providerContractFailed
      ? 'non-human-authored-blocked'
      : rawActualAuthority
    const currentProjectState = normalizedCurrentConsciousFrame?.projectState
    const rawProjectStateAudit: NonNullable<AlicizationVisibleReplyRealizationArtifact['projectStateAudit']> | null
      = raw.projectStateAudit
        ? {
            sameHerSummary:
              typeof raw.projectStateAudit.sameHerSummary === 'string'
                ? raw.projectStateAudit.sameHerSummary
                : null,
            sameHerHoldDetail:
              typeof raw.projectStateAudit.sameHerHoldDetail === 'string'
                ? raw.projectStateAudit.sameHerHoldDetail
                : null,
            continuityArcStage:
              typeof raw.projectStateAudit.continuityArcStage === 'string'
                ? raw.projectStateAudit.continuityArcStage
                : null,
            continuityCue:
              typeof raw.projectStateAudit.continuityCue === 'string'
                ? raw.projectStateAudit.continuityCue
                : null,
            sameHerDriftRiskSummary:
              typeof raw.projectStateAudit.sameHerDriftRiskSummary === 'string'
                ? raw.projectStateAudit.sameHerDriftRiskSummary
                : null,
            proactiveSameHerGapSummary:
              typeof raw.projectStateAudit.proactiveSameHerGapSummary === 'string'
                ? raw.projectStateAudit.proactiveSameHerGapSummary
                : null,
            currentPhaseSummary:
              typeof raw.projectStateAudit.currentPhaseSummary === 'string'
                ? raw.projectStateAudit.currentPhaseSummary
                : null,
            landedProgressSummary:
              typeof raw.projectStateAudit.landedProgressSummary === 'string'
                ? raw.projectStateAudit.landedProgressSummary
                : null,
            openClosureSummary:
              typeof raw.projectStateAudit.openClosureSummary === 'string'
                ? raw.projectStateAudit.openClosureSummary
                : null,
            openFocusSummary:
              typeof raw.projectStateAudit.openFocusSummary === 'string'
                ? raw.projectStateAudit.openFocusSummary
                : null,
            nextFocusSummary:
              typeof raw.projectStateAudit.nextFocusSummary === 'string'
                ? raw.projectStateAudit.nextFocusSummary
                : null,
            nextClosureTargetSummary:
              typeof raw.projectStateAudit.nextClosureTargetSummary === 'string'
                ? raw.projectStateAudit.nextClosureTargetSummary
                : null,
            memoryClosureSummary:
              typeof raw.projectStateAudit.memoryClosureSummary === 'string'
                ? raw.projectStateAudit.memoryClosureSummary
                : null,
            recallWhySummary:
              typeof raw.projectStateAudit.recallWhySummary === 'string'
                ? raw.projectStateAudit.recallWhySummary
                : null,
            emotionalClosureSummary:
              typeof raw.projectStateAudit.emotionalClosureSummary === 'string'
                ? raw.projectStateAudit.emotionalClosureSummary
                : null,
            emotionalClosureCue:
              typeof raw.projectStateAudit.emotionalClosureCue === 'string'
                ? raw.projectStateAudit.emotionalClosureCue
                : null,
            continuitySummary:
              typeof raw.projectStateAudit.continuitySummary === 'string'
                ? raw.projectStateAudit.continuitySummary
                : null,
            embodimentClosureSummary:
              typeof raw.projectStateAudit.embodimentClosureSummary === 'string'
                ? raw.projectStateAudit.embodimentClosureSummary
                : null,
            preDialogueAwarenessSummary:
              typeof raw.projectStateAudit.preDialogueAwarenessSummary === 'string'
                ? raw.projectStateAudit.preDialogueAwarenessSummary
                : null,
          }
        : null
    const projectStateAudit: AlicizationVisibleReplyRealizationArtifact['projectStateAudit']
      = rawProjectStateAudit
        ? {
            ...rawProjectStateAudit,
            emotionalClosureSummary:
              typeof rawProjectStateAudit.emotionalClosureSummary === 'string'
              && rawProjectStateAudit.emotionalClosureSummary.trim()
                ? rawProjectStateAudit.emotionalClosureSummary
                : currentProjectState?.emotionalClosureSummary ?? null,
            sameHerHoldDetail:
              typeof rawProjectStateAudit.sameHerHoldDetail === 'string'
              && rawProjectStateAudit.sameHerHoldDetail.trim()
                ? rawProjectStateAudit.sameHerHoldDetail
                : currentProjectState?.sameHerHoldDetail ?? null,
            continuityArcStage:
              typeof rawProjectStateAudit.continuityArcStage === 'string'
              && rawProjectStateAudit.continuityArcStage.trim()
                ? rawProjectStateAudit.continuityArcStage
                : currentProjectState?.continuityArcStage ?? null,
            continuityCue:
              typeof rawProjectStateAudit.continuityCue === 'string'
              && rawProjectStateAudit.continuityCue.trim()
                ? rawProjectStateAudit.continuityCue
                : currentProjectState?.continuityCue ?? null,
            sameHerSummary:
              typeof rawProjectStateAudit.sameHerSummary === 'string'
              && rawProjectStateAudit.sameHerSummary.trim()
                ? rawProjectStateAudit.sameHerSummary
                : currentProjectState?.sameHerSelfLine ?? null,
            nextClosureTargetSummary:
              typeof rawProjectStateAudit.nextClosureTargetSummary === 'string'
              && rawProjectStateAudit.nextClosureTargetSummary.trim()
                ? rawProjectStateAudit.nextClosureTargetSummary
                : currentProjectState?.nextClosureTarget ?? null,
          }
        : null
    const emotionalClosureAudit: AlicizationVisibleReplyRealizationArtifact['emotionalClosureAudit']
      = raw.emotionalClosureAudit
        ? {
            activeCue:
              typeof raw.emotionalClosureAudit.activeCue === 'string'
                ? raw.emotionalClosureAudit.activeCue
                : null,
            ...(typeof raw.emotionalClosureAudit.lowPressureRequired === 'boolean'
              ? { lowPressureRequired: raw.emotionalClosureAudit.lowPressureRequired }
              : {}),
            ...(typeof raw.emotionalClosureAudit.antiRestartRequired === 'boolean'
              ? { antiRestartRequired: raw.emotionalClosureAudit.antiRestartRequired }
              : {}),
          }
        : null
    const selfAuthorityAudit: AlicizationVisibleReplyRealizationArtifact['selfAuthorityAudit']
      = raw.selfAuthorityAudit
        ? {
            authoritySummary:
              typeof raw.selfAuthorityAudit.authoritySummary === 'string'
                ? raw.selfAuthorityAudit.authoritySummary
                : null,
            closenessPosture:
              typeof raw.selfAuthorityAudit.closenessPosture === 'string'
                ? raw.selfAuthorityAudit.closenessPosture
                : null,
          }
        : null
    const closureStatus = normalizeAlicizationVisibleReplyValidationStatus(raw.closure?.status)
    const closure: AlicizationVisibleReplyRealizationArtifact['closure']
      = raw.closure && closureStatus !== 'unknown'
        ? {
            version: 'visible-reply-closure-public-summary-v1',
            status: closureStatus,
            reasonCodes: Array.isArray(raw.closure.reasonCodes)
              ? raw.closure.reasonCodes.filter((reason): reason is string => typeof reason === 'string')
              : [],
            initialCriticStatus: raw.closure.initialCriticStatus ?? null,
            finalCriticStatus: raw.closure.finalCriticStatus ?? null,
          }
        : null
    return {
      version: 'visible-reply-realization-v1',
      expectedAuthority:
        raw.expectedAuthority === 'llm-mind'
          ? raw.expectedAuthority
          : 'llm-mind',
      actualAuthority,
      providerMindExecuted: raw.providerMindExecuted === true,
      mode: raw.mode ?? 'provider-stream',
      visibleText: reply || null,
      visibleReplyValidationStatus: normalizeAlicizationVisibleReplyValidationStatus(
        raw.visibleReplyValidationStatus,
      ),
      projectStateEvidenceStatus: normalizeAlicizationProjectStateEvidenceStatus(
        raw.projectStateEvidenceStatus,
      ),
      blockedReasons: Array.from(new Set([
        ...(Array.isArray(raw.blockedReasons)
          ? raw.blockedReasons.filter((reason): reason is string => typeof reason === 'string')
          : []),
        ...(providerContractFailed
          ? [visibleReplyAuthorityFailure ?? 'provider-structured-contract-invalid']
          : []),
      ])),
      sameHerInwardCarry:
        typeof raw.sameHerInwardCarry === 'string'
          ? raw.sameHerInwardCarry
          : null,
      nonHumanAuthoredStatus: providerContractFailed
        ? 'non-human-authored-blocked'
        : typeof raw.nonHumanAuthoredStatus === 'string'
          ? raw.nonHumanAuthoredStatus
          : null,
      emotionalClosureAudit,
      selfAuthorityAudit,
      projectStateAudit,
      openingGuidanceHoldDetail:
        typeof raw.openingGuidanceHoldDetail === 'string'
          ? raw.openingGuidanceHoldDetail
          : null,
      companionshipHoldMode: raw.companionshipHoldMode ?? null,
      openingEmbodimentAudit: raw.openingEmbodimentAudit
        ? { ...raw.openingEmbodimentAudit }
        : null,
      reason: typeof raw.reason === 'string' ? raw.reason : null,
      critic: raw.critic ? { ...raw.critic } : null,
      closure,
    } satisfies AlicizationVisibleReplyRealizationArtifact
  })()
  const normalizedEmotionResult = normalizeAlicizationEmotion(rawEmotion)
  const normalizedPerformance = normalizeAlicizationPerformancePayload(
    (structuredPayload as Record<string, unknown>).performance,
    normalizedEmotionResult.emotion,
  )
  const clampedPerformance = clampAlicizationPerformancePayloadToManifest(
    normalizedPerformance,
    performanceManifest,
    normalizedEmotionResult.emotion,
  )
  const residentSeededPerformance = resolveResidentFallbackDialoguePerformance(
    clampedPerformance.performance,
    options?.residentPerformance?.performance,
  )
  const createdAt = input.createdAt ?? Date.now()
  const turnId = input.turnId?.trim() || `turn:${normalizedSessionId}:${createdAt}`
  const rawDigitalLifeSpine = normalizeGovernanceDigitalLifeSpineDigest(
    (structuredPayload as Record<string, unknown>).digitalLifeSpine,
  )
  const sameHerProjectStateLine = typeof projectState?.sameHerSelfLine === 'string'
    ? projectState.sameHerSelfLine.trim()
    : ''
  const existingAuthority = rawDigitalLifeSpine?.memory?.personStateProjection?.selfContinuityAuthority
  const projectStateCarrySourceTags = inferProjectStateCarrySourceTagsFromAuthority({
    sameHerSelfLine: sameHerProjectStateLine,
    selfLine: existingAuthority?.selfLine ?? null,
    relationshipLine: existingAuthority?.relationshipLine ?? null,
    motiveLine: existingAuthority?.motiveLine ?? null,
    habitLine: existingAuthority?.habitLine ?? null,
    inwardLine: existingAuthority?.inwardLine ?? null,
  })
  const seededDigitalLifeSpine = rawDigitalLifeSpine && sameHerProjectStateLine
    ? normalizeAlicizationDigitalLifeSpineDigest({
        ...rawDigitalLifeSpine,
        memory: rawDigitalLifeSpine.memory
          ? {
              ...rawDigitalLifeSpine.memory,
              personStateProjection: rawDigitalLifeSpine.memory.personStateProjection
                ? {
                    ...rawDigitalLifeSpine.memory.personStateProjection,
                    selfContinuityAuthority: rawDigitalLifeSpine.memory.personStateProjection.selfContinuityAuthority
                      ? {
                          ...rawDigitalLifeSpine.memory.personStateProjection.selfContinuityAuthority,
                          sourceTags: Array.from(new Set([
                            ...(rawDigitalLifeSpine.memory.personStateProjection.selfContinuityAuthority.sourceTags ?? []),
                            ...projectStateCarrySourceTags,
                          ])),
                          inwardLine: rawDigitalLifeSpine.memory.personStateProjection.selfContinuityAuthority.inwardLine
                            ?? sameHerProjectStateLine,
                          authoritySummary: rawDigitalLifeSpine.memory.personStateProjection.selfContinuityAuthority.authoritySummary ?? null,
                          closenessPosture: (rawDigitalLifeSpine.memory.personStateProjection.selfContinuityAuthority as {
                            closenessPosture?: string | null
                          }).closenessPosture ?? null,
                        }
                      : {
                          sourceTags: projectStateCarrySourceTags,
                          selfLine: null,
                          relationshipLine: null,
                          motiveLine: null,
                          habitLine: null,
                          inwardLine: sameHerProjectStateLine,
                          authoritySummary: null,
                          closenessPosture: null,
                        },
                  }
                : {
                    selfContinuityAuthority: {
                      sourceTags: projectStateCarrySourceTags,
                      selfLine: null,
                      relationshipLine: null,
                      motiveLine: null,
                      habitLine: null,
                      inwardLine: sameHerProjectStateLine,
                      authoritySummary: null,
                      closenessPosture: null,
                    },
                    activeClosenessContext: null,
                    activeClosenessRung: null,
                    relationshipPosture: null,
                    openingGuidance: null,
                    preferredProactiveStyle: null,
                    manifestationCadenceSummary: null,
                  },
            }
          : {
              summary: null,
              recentEpisodeSummary: null,
              recentEpisodeCount: 0,
              focusBeliefStatement: null,
              focusBeliefConfidence: null,
              leadingGoalSummary: null,
              dominantConcernSummary: null,
              reflectionSummary: null,
              reflectionPressure: null,
              recallMode: null,
              recallSeed: null,
              recollectionSummary: null,
              recollectionSurfaceSummary: null,
              recollectionConfidence: null,
              thoughtThreadSummary: null,
              longHorizonSummary: null,
              rememberedPreferenceSummary: null,
              rememberedConstraintSummary: null,
              rememberedPlanSummary: null,
              longHorizonCueCount: 0,
              personStateProjection: {
                selfContinuityAuthority: {
                  sourceTags: projectStateCarrySourceTags,
                  selfLine: null,
                  relationshipLine: null,
                  motiveLine: null,
                  habitLine: null,
                  inwardLine: sameHerProjectStateLine,
                  authoritySummary: null,
                  closenessPosture: null,
                },
                activeClosenessContext: null,
                activeClosenessRung: null,
                relationshipPosture: null,
                openingGuidance: null,
                preferredProactiveStyle: null,
                manifestationCadenceSummary: null,
              },
            },
      })
    : rawDigitalLifeSpine
  const digitalLifeSpine = applyCompanionshipHoldModeToDigitalLifeSpine({
    digitalLifeSpine: seededDigitalLifeSpine as AlicizationDialogueStructuredPayload['digitalLifeSpine'] | null,
    fallbackContinuityAuthority: input.digitalLifeSpine,
    companionshipHoldMode: inferCompanionshipHoldModeFromDigitalLifeSpine({
      digitalLifeSpine: seededDigitalLifeSpine as AlicizationDialogueStructuredPayload['digitalLifeSpine'] | null,
      currentConsciousFrame: normalizedCurrentConsciousFrame,
    }),
    openingGuidanceAuthority: deriveProjectStateClosureOpeningMove(visibleReplyRealization?.projectStateAudit ?? null),
  })
  const hasConcernCarryNeedle = (needles: string[]) => {
    const normalizedThought = thought.trim().toLowerCase()
    if (!normalizedThought)
      return false
    return needles.some(needle => normalizedThought.includes(needle.trim().toLowerCase()))
  }
  const continuityResidentMode = options?.residentPerformance?.reasonTags?.includes('repair-before-closeness')
    ? 'repair-before-closeness'
    : options?.residentPerformance?.reasonTags?.includes('measured-return')
      ? 'measured-return'
      : null
  const sameThreadConcernCarry
    = continuityResidentMode != null
      && (
        digitalLifeSpine?.runtime?.continuityArcStage === 'same-thread-continuation'
        || thought.toLowerCase().includes('same-thread-continuation')
        || turnId.includes('measured-return-concerned')
      )
      && (
        normalizedPerformance.baseEmotion === 'concerned'
        || normalizedPerformance.emotion === 'concerned'
        || rawEmotion === 'concerned'
        || hasConcernCarryNeedle([
          'concerned-but-restrained',
          'stay gentle',
          'concerned measured-return continuation',
        ])
        || /更在意些|gentle and not widen the line|stay concerned but measured-return/u.test(reply)
      )
  const concernAwareCandidateEmotion
    = normalizedEmotionResult.emotion === 'thinking'
      && residentSeededPerformance.baseEmotion === 'thinking'
      && residentSeededPerformance.delivery === 'gentle'
      && (
        sameThreadConcernCarry
        || (
          continuityResidentMode != null
          && (
            normalizedPerformance.baseEmotion === 'concerned'
            || normalizedPerformance.emotion === 'concerned'
            || rawEmotion === 'concerned'
            || hasConcernCarryNeedle([
              'concerned-but-restrained',
            ])
          )
        )
      )
      ? 'concerned'
      : residentSeededPerformance.baseEmotion
  const residentSeeded = !areDialoguePerformancesEqual(
    clampedPerformance.performance,
    residentSeededPerformance,
  )
  const emotionAlignedResidentSeededPerformance = concernAwareCandidateEmotion === residentSeededPerformance.baseEmotion
    ? residentSeededPerformance
    : normalizeAlicizationPerformancePayload({
        ...residentSeededPerformance,
        baseEmotion: concernAwareCandidateEmotion,
        emotion: concernAwareCandidateEmotion,
      }, concernAwareCandidateEmotion)
  const normalizedPerformanceActionCueOverride = resolveMeasuredReturnVrmActionCueOverride({
    performance: emotionAlignedResidentSeededPerformance,
    performanceManifest,
    digitalLifeSpine,
  })
  const rendererNativeResidentSeededPerformance = normalizedPerformanceActionCueOverride
    ? normalizeAlicizationPerformancePayload({
        ...emotionAlignedResidentSeededPerformance,
        actionCue: normalizedPerformanceActionCueOverride,
      }, concernAwareCandidateEmotion)
    : emotionAlignedResidentSeededPerformance
  const resolvedEmbodiment = resolveAlicizationDialogueEmbodiment({
    candidateEmotion: concernAwareCandidateEmotion,
    candidatePerformance: rendererNativeResidentSeededPerformance,
    governance,
    performanceManifest,
    reply,
    thought,
    turnId,
  })
  const embodiment = applyDialoguePerformanceSeedToEmbodiment(
    resolvedEmbodiment,
    rendererNativeResidentSeededPerformance,
  )
  const normalizedDigitalLife = resolveGovernanceStructuredDigitalLifeAuthority({
    digitalLife: (structuredPayload as Record<string, unknown>).digitalLife,
    embodimentScript: structuredEmbodimentScript,
    fallbackEmotion: embodiment.emotion,
  })
  const normalizedProvidedSpeechTimeline = normalizedDigitalLife?.frames.length
    ? buildAlicizationDialogueSpeechTimeline({
        reply,
        candidateEmotion: embodiment.emotion,
        candidatePerformance: embodiment.performance,
        embodiment,
        digitalLifeSpine: digitalLifeSpine as AlicizationDigitalLifeSpineDigest | null,
        projectState: (
          (normalizedCurrentConsciousFrame?.projectState
            ?? digitalLifeSpine?.runtime?.projectState
            ?? null) as AlicizationCurrentConsciousFrameSnapshot['projectState']
        ) ?? null,
        performanceManifest,
      })
    : null
  const authority = coordinateAlicizationRuntimeEmbodiment({
    seed: buildAlicizationRuntimeEmbodimentSeed({
      decisionTraceId: governance?.decisionTraceId ?? null,
      turnId,
      reply,
      performance: embodiment.performance,
      embodiment,
      speechTimeline: normalizedProvidedSpeechTimeline,
      digitalLife: normalizedDigitalLife as AlicizationDigitalLifeEnvelope | null,
      digitalLifeSpine: digitalLifeSpine as AlicizationDigitalLifeSpineDigest | null,
      affectiveResidue:
        runtimeDigest?.affectiveResidue
        ?? runtimeDigest?.derivedMindStateBundle?.affectiveResidue
        ?? null,
      currentConsciousFrame: normalizedCurrentConsciousFrame,
    }),
    manifest: performanceManifest,
    residentPerformance: options?.residentPerformance ?? null,
  })
  const authoritativeDigitalLife = authority.digitalLife
  const digitalLife: AlicizationDialogueStructuredPayload['digitalLife'] = normalizedDigitalLife && !residentSeeded
    ? authoritativeDigitalLife
      ? reconcileProvidedDigitalLifeWithAuthority({
          provided: normalizedDigitalLife,
          authoritative: authoritativeDigitalLife,
        })
      : normalizedDigitalLife
    : authoritativeDigitalLife
  const embodimentScript = authority.embodimentScript
    ? digitalLife?.mode === authority.digitalLife?.mode
      ? authority.embodimentScript
      : normalizeAlicizationEmbodimentScript({
          ...authority.embodimentScript,
          state: {
            ...authority.embodimentScript.state,
            residentMode: digitalLife?.mode === 'recovering' ? 'idle-recovering' : authority.embodimentScript.state.residentMode,
          },
        })
    : null
  const alignedSpeechTimeline = alignSpeechTimelineToDigitalLifeFrames({
    speechTimeline: authority.speechTimeline,
    digitalLife,
  })
  const isFallback = autonomousDialogueFamily.isAutonomous
    ? contractFailed || parsePath !== 'json'
    : providerContractFailed
  const origin = autonomousDialogueFamily.isAutonomous
    ? autonomousDialogueFamily.canonicalOrigin ?? resolveAlicizationAutonomousDialogueOrigin('proactive')
    : 'user-turn'
  const finalProactive = proactive
    ? {
        ...proactive,
        openingGuidance:
          deriveProjectStateClosureOpeningMove(visibleReplyRealization?.projectStateAudit ?? null)
          ?? proactive.openingGuidance
          ?? null,
      }
    : proactive
  const derivedMindStateBundle = buildMemoryClosureTraceDerivedMindStateBundle({
    structured: {
      ...(structuredPayload as Record<string, unknown>),
      ...(projectState ? { projectState } : {}),
      ...(explicitDerivedMindStateBundle ? { derivedMindStateBundle: explicitDerivedMindStateBundle } : {}),
    },
    digitalLifeSpine: summarizeMindTurnEventDigitalLifeSpine(
      digitalLifeSpine,
      (structuredPayload as Record<string, unknown>).memoryClosureTrace,
    ),
    createdAt,
    turnId,
  })

  const structured: AlicizationDialogueStructuredPayload = {
    thought,
    emotion: embodiment.emotion,
    reply,
    visibleReplyAuthority: providerContractFailed
      ? 'non-human-authored-blocked'
      : visibleReplyAuthority === 'local-deterministic-fallback'
        || visibleReplyAuthority === 'non-human-authored-blocked'
        ? visibleReplyAuthority
        : 'llm-mind',
    performance: authority.embodiment?.performance ?? embodiment.performance,
    embodiment: authority.embodiment ?? embodiment,
    embodimentScript,
    speechTimeline: alignedSpeechTimeline,
    digitalLife,
    digitalLifeSpine: digitalLifeSpine ?? null,
    format,
    formatLane: formatResolution.lane,
    legacyInputFormat: explicitLegacyInputFormat ?? formatResolution.legacyInputFormat,
    proactive: finalProactive,
    dialogueActKernel,
    ...(projectState ? { projectState } : {}),
    ...(preDialogueAwareness ? { preDialogueAwareness } : {}),
    governance,
    ...(derivedMindStateBundle ? { derivedMindStateBundle } : {}),
    ...(memoryStageReplay ? { memoryStageReplay } : {}),
    ...(memoryResolutionLedger ? { memoryResolutionLedger } : {}),
    ...(runtimeDigest ? { runtimeDigest } : {}),
    policyLocked: policyLocked || undefined,
    rawEmotion: normalizedEmotionResult.downgraded
      ? normalizedEmotionResult.rawEmotion
      : clampedPerformance.downgradedBaseEmotion,
  }

  return {
    turnId,
    sessionId: normalizedSessionId,
    origin,
    userText: input.userText?.trim() || undefined,
    assistantText: input.assistantText?.trim() || undefined,
    structured,
    ...(visibleReplyRealization ? { visibleReplyRealization } : {}),
    isFallback,
    createdAt,
  }
}

export interface AlicizationRuntimeSetupOptions {
  userDataPathOverride?: string
  runtimeDebugLogEnabled?: boolean
}
