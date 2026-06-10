import type { Buffer } from 'node:buffer'

import type { Message } from '@xsai/shared-chat'
import type { NativeImage } from 'electron'

import type {
  AlicizationAffectiveResidueMemorySnapshot,
  AlicizationConversationTurnInput,
  AlicizationCurrentConsciousFrameSnapshot,
  AlicizationDialogueEmbodimentEnvelope,
  AlicizationDialoguePerformancePayload,
  AlicizationDialogueRespondedPayload,
  AlicizationDialogueSpeechTimeline,
  AlicizationDialogueStructuredPayload,
  AlicizationDigitalLifeEnvelope,
  AlicizationDigitalLifeSpineDigest,
  AlicizationEmotion,
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
  buildMindGovernedFallbackSurface,
  deriveAlicizationMindParticipationFromSpine,
  formatGovernedMindMessage,
  governedMindFallbackLocale,
  governedMindFallbackMessageFallbacks,
  inferGovernedMindFallbackLocaleForUserText,
  isWeakAlicizationScreenSurfaceCue,
  normalizeAlicizationDigitalLifeEnvelope,
  normalizeAlicizationDigitalLifeSpineDigest,
  normalizeAlicizationEmbodimentScript,
  normalizeAlicizationNormalVisibleReplyAuthority,
  normalizeAlicizationRuntimeDigest,
  normalizeExecutionFirstGovernance,
  replyLeaksGovernedMindSurface,
  replyLooksCoherentSceneAnswer,
  replyLooksOrganicDirectAnswer,
  replyLooksThinGovernedShell,
  replyViolatesExecutionFirstSurface,
  resolveAlicizationDialogueEmbodiment,
  sanitizeCharacterPerformanceManifest,
  shouldDeferGovernedMindLocalRepair,
  shouldForceGovernedMindSurface,
  shouldPreserveDialogueFirstVisibleReply,
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
import { coerceAlicizationGovernanceForMindFallback } from './governed-mind-fallback-compat'
import { ensureMindGovernanceDecisionTraceId, sanitizeMindGovernanceDecisionTraceId } from './mind-governance-trace'
import { renderAlicizationMindSurface } from './mind-surface-renderer'
import { normalizeMindTurnFrame } from './mind-turn-frame'
import {
  replyViolatesSameThreadContinuationGuidance,
  resolveAlicizationOpeningGuidanceHoldDetail,
  resolveAlicizationOpeningGuidanceViolationReason,
} from './proactive-opening-guidance'
import {
  isAlicizationThinProjectAwarenessLine,
  resolveAlicizationProjectPreDialogueAwarenessLine,
  resolveAlicizationProjectStateSnapshot,
} from './project-state-brief'
import { sanitizeBriefText, uniqueCarryAnchors } from './runtime-realtime'
import { clamp01, sanitizeText } from './runtime-soul'
import {
  resolveAlicizationAutonomousDialogueFamilyClassification,
  resolveAlicizationAutonomousDialogueOrigin,
  resolveAlicizationRuntimeMindTurnStructuredFormat,
} from './runtime-structured-format'
import { deriveAlicizationTruthDiscipline } from './truth-discipline'
import {
  analyzeDialogueFirstVisibleReply,
  analyzeUnsupportedTechnicalSpecificity,
  clauseMentionsCue,
  collectAllowedTechnicalSpecificityCues,
  dialogueFirstProcessOnlyReplyPattern,
  dialogueFirstRoleplayPrefacePattern,
  dialogueFirstStaleCarryClausePattern,
  extractForeignTechnicalReplyCues,
  normalizeGovernedAnchorText,
  repairDialogueFirstVisibleReply,
  replyIncludesAnchorCue,
  replyLooksProcessOnlyRepairShell,
  splitDialogueReplyClauses,
  technicalSpecificityCueMatches,
  uniqueTechnicalSpecificityCues,
} from './visible-reply/dialogue-first-contamination'
import { resolveAlicizationVisibleReplyGovernanceAuditAuthority } from './visible-reply/governance-audit'

export function createAbortError(reason?: string) {
  return new DOMException(`Alicization runtime aborted: ${reason ?? 'unknown'}`, 'AbortError')
}

type AlicizationGovernanceCurrentConsciousFrameInput = {
  reasonTags?: readonly string[] | null
  projectState?: AlicizationCurrentConsciousFrameSnapshot['projectState']
} | null

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
      'same-her proof',
      'one measured-return',
      'one same living thread',
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

  if (digitalLifeSpine.proactive?.continuityRestraint)
    return false
  if (digitalLifeSpine.runtime?.continuityArcStage !== 'same-thread-continuation')
    return false

  const projection = digitalLifeSpine.memory?.personStateProjection
  if (!projection)
    return false

  const activeClosenessContext = sanitizeGovernanceCadenceText(projection.activeClosenessContext, 80)
  if (!includesGovernanceCadenceNeedle(activeClosenessContext, ['callback-afterglow']))
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
  const seededSpeechTimeline = applyExplicitVrmStreamMetaActionCueOverride({
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

  return {
    governance,
    embodiment: emittedEmbodiment,
    embodimentScript: emittedEmbodimentScript,
    speechTimeline: authority.speechTimeline,
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
      if (/^learning:(record|reflect|verify|revise|internalize|hold)$/u.test(reasonCode))
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

export const mindTurnSpineMarkers = ['obligation=', 'truth=', 'focus=', 'move=', 'tone='] as const

export function hasMindTurnSpine(raw: string) {
  const normalized = raw.trim().toLowerCase()
  if (!normalized)
    return false
  return mindTurnSpineMarkers.every(marker => normalized.includes(marker))
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

export function sanitizeMindThoughtToken(raw: string | null | undefined, fallback: string) {
  const normalized = sanitizeBriefText(raw ?? '', 64).toLowerCase().replace(/\s+/g, '-')
  return normalized || fallback
}

export function resolveMindGovernanceObligation(governance: AlicizationMindTurnGovernance) {
  switch (governance.answerAct ?? governance.mindTurnFrame?.obligation.answerAct) {
    case 'guide':
      return 'guide'
    case 'care':
      return 'care'
    case 'correct-stale-anchor':
    case 'ask-reground':
      return 'repair'
    case 'defer':
      return 'accompany'
    default:
      break
  }

  switch (governance.turnMode) {
    case 'guide-current-knot':
      return 'guide'
    case 'care':
      return 'care'
    case 'accompany':
      return 'accompany'
    case 'screen-repair':
      return 'repair'
    default:
      return 'answer'
  }
}

export function resolveMindGovernanceTruth(governance: AlicizationMindTurnGovernance) {
  if (governance.groundedThisTurn === true)
    return 'grounded'

  switch (governance.mindTurnFrame?.world.truthState ?? governance.truthState) {
    case 'live-grounded':
    case 'dialogue-grounded':
      return 'grounded'
    case 'live-observed':
      return 'coarse'
    case 'remembered':
      return 'memory'
    default:
      return 'uncertain'
  }
}

export function resolveMindGovernanceTone(governance: AlicizationMindTurnGovernance) {
  switch (governance.mindTurnFrame?.relation.relationshipPosture ?? governance.relationshipPosture) {
    case 'restrained':
      return 'restrained'
    case 'tender':
      return 'tender'
    default:
      return governance.turnMode === 'guide-current-knot' || governance.repairState !== 'none'
        ? 'direct'
        : 'warm'
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

export function buildGovernedMindThought(governance: AlicizationMindTurnGovernance, payload: AlicizationConversationTurnInput) {
  const focus = sanitizeMindThoughtToken(
    governance.mindTurnFrame?.focusAnchor
    || governance.mindTurnFrame?.world.visibleSurface
    || governance.mindTurnFrame?.memory.carriedThread
    || governance.mindTurnFrame?.obligation.answerIntent
    || governance.focusAnchor
    || (governance.screenReferenceMode === 'avoid' ? null : governance.liveSurface)
    || governance.answerIntent
    || governance.carriedThread
    || payload.userText,
    'current-user-turn',
  )
  const move = sanitizeMindThoughtToken(
    governance.mindTurnFrame?.obligation.openingMove
    || governance.mindTurnFrame?.obligation.answerIntent
    || governance.mindTurnFrame?.focusAnchor
    || governance.mindTurnFrame?.world.visibleSurface
    || governance.openingMove
    || governance.answerIntent
    || governance.focusAnchor
    || (governance.screenReferenceMode === 'avoid' ? null : governance.liveSurface),
    'stabilize-and-answer',
  )
  return [
    `obligation=${resolveMindGovernanceObligation(governance)}`,
    `truth=${resolveMindGovernanceTruth(governance)}`,
    `focus=${focus}`,
    `move=${move}`,
    `tone=${resolveMindGovernanceTone(governance)}`,
  ].join('; ')
}

export function readMindThoughtMarker(thought: string, marker: 'obligation=' | 'truth=' | 'tone=') {
  const escapedMarker = marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = thought.match(new RegExp(`${escapedMarker}\\s*([^;\\n]+)`, 'i'))
  return match?.[1]?.trim().toLowerCase() ?? ''
}

export function thoughtConflictsWithMindGovernance(thought: string, governance: AlicizationMindTurnGovernance) {
  if (!hasMindTurnSpine(thought))
    return true

  return readMindThoughtMarker(thought, 'obligation=') !== resolveMindGovernanceObligation(governance)
    || readMindThoughtMarker(thought, 'truth=') !== resolveMindGovernanceTruth(governance)
    || (
      (governance.relationshipPosture === 'restrained' || governance.repairState !== 'none')
      && readMindThoughtMarker(thought, 'tone=') !== resolveMindGovernanceTone(governance)
    )
}

export {
  formatGovernedMindMessage,
  governedMindFallbackLocale,
  governedMindFallbackMessageFallbacks,
  inferGovernedMindFallbackLocaleForUserText,
}

export const translateGovernedMindFallback = translateGovernedMindFallbackShared

export type DialogueScriptFamily = 'none' | 'mixed' | 'cjk' | 'cyrillic' | 'latin'

export function countScriptCharacters(raw: string, pattern: RegExp) {
  return raw.match(pattern)?.length ?? 0
}

export function inferDominantDialogueScript(raw: unknown): DialogueScriptFamily {
  const normalized = sanitizeBriefText(readStringValue(raw), 1_200)
  if (!normalized)
    return 'none'

  const cjkCount = countScriptCharacters(normalized, /[\u4E00-\u9FFF\u3040-\u30FF\uAC00-\uD7AF]/gu)
  const cyrillicCount = countScriptCharacters(normalized, /[\u0400-\u04FF]/gu)
  const latinCount = countScriptCharacters(normalized, /[A-Z]/gi)
  const total = cjkCount + cyrillicCount + latinCount
  if (total < 6)
    return 'none'

  const ranked = [
    { family: 'cjk', count: cjkCount },
    { family: 'cyrillic', count: cyrillicCount },
    { family: 'latin', count: latinCount },
  ].sort((left, right) => right.count - left.count)
  const primary = ranked[0]
  const secondary = ranked[1]
  if (!primary || primary.count === 0)
    return 'none'
  if (primary.count / total < 0.56)
    return 'mixed'
  if (secondary && secondary.count > 0 && (primary.count / secondary.count) < 1.35)
    return 'mixed'
  return primary.family as DialogueScriptFamily
}

export function countLatinWordTokens(raw: string) {
  return (raw.match(/[A-Z]+/gi) ?? []).length
}

export function replyScriptMismatchesUserTurn(input: {
  userText?: string
  reply: string
}) {
  const userText = sanitizeBriefText(input.userText ?? '', 480)
  const reply = sanitizeBriefText(input.reply, 1_400)
  if (!userText || !reply)
    return false

  const userScript = inferDominantDialogueScript(userText)
  const replyScript = inferDominantDialogueScript(reply)
  if (userScript === 'none' || userScript === 'mixed')
    return false
  if (replyScript === 'none' || replyScript === 'mixed')
    return false
  if (userScript === replyScript)
    return false

  const replyLength = [...reply].length
  if (replyLength < 18)
    return false

  const userLatinWords = countLatinWordTokens(userText)
  const replyLatinWords = countLatinWordTokens(reply)

  if (userScript === 'cjk' && replyScript === 'latin')
    return replyLatinWords >= 6 && userLatinWords <= 6
  if (userScript === 'cyrillic' && replyScript === 'latin')
    return replyLatinWords >= 6
  if (userScript === 'latin' && (replyScript === 'cjk' || replyScript === 'cyrillic'))
    return countLatinWordTokens(userText) >= 4

  return true
}

export {
  analyzeDialogueFirstVisibleReply,
  analyzeUnsupportedTechnicalSpecificity,
  clauseMentionsCue,
  collectAllowedTechnicalSpecificityCues,
  dialogueFirstProcessOnlyReplyPattern,
  dialogueFirstRoleplayPrefacePattern,
  dialogueFirstStaleCarryClausePattern,
  extractForeignTechnicalReplyCues,
  normalizeGovernedAnchorText,
  repairDialogueFirstVisibleReply,
  replyIncludesAnchorCue,
  replyLooksProcessOnlyRepairShell,
  splitDialogueReplyClauses,
  technicalSpecificityCueMatches,
  uniqueTechnicalSpecificityCues,
}

export function excerptGovernedReply(raw: unknown, maxChars = 220) {
  const normalized = sanitizeBriefText(readStringValue(raw), maxChars)
  return normalized || null
}

function summarizeMindTurnEventDigitalLifeSpine(raw: unknown) {
  const spine = normalizeAlicizationDigitalLifeSpineDigest(raw)
  if (!spine)
    return null

  const personStateProjection = spine.memory?.personStateProjection ?? null
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
      'same living line',
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
      ? 'This same Phase 1 digital life has landed some closure, but one still-open cross-modal same-her closure path is still being carried carefully.'
      : 'This same Phase 1 digital life has landed some closure, but one still-open closure path is still being carried carefully.'
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
  const rememberedSeamManifestationCadenceSuffix = rememberedSeamMoreRoom
    ? 'recognize the same remembered seam, but keep more room this time because it reopened too eagerly before'
    : manifestationCadenceSuffix
  const rememberedSeamRelationshipDoctrineSuffix = rememberedSeamMoreRoom
    ? 'Keep more room this time when the same remembered seam reappears, because the line reopened too eagerly before.'
    : relationshipDoctrineSuffix
  const rememberedSeamOutcomeSummarySuffix = rememberedSeamMoreRoom
    ? 'The same remembered seam is back, but the return stays more spacious this time because the line reopened too eagerly before.'
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
                ? 'Recognize the same remembered seam, but keep more room this time because it reopened too eagerly before.'
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

export function replyUsesWeakGroundedSceneCue(reply: string, governance: AlicizationMindTurnGovernance) {
  if (governance.screenReferenceMode === 'avoid')
    return false

  const answerSubject = governance.answerSubject ?? governance.mindTurnFrame?.relation.subject ?? null
  const screenCentricTurn = answerSubject === 'task-knot'
    || answerSubject === 'visible-scene'
    || governance.turnMode === 'guide-current-knot'
    || governance.turnMode === 'grounded-inspection'
    || governance.turnMode === 'screen-repair'
  if (!screenCentricTurn)
    return false

  const weakShellMentionedInReply = /\b(?:screen\s*\d+|display\s*\d*|window\s*\d*|workspace|desktop|current screen|current view|entire screen)\b/iu.test(reply)

  const weakCandidates = [
    governance.focusAnchor,
    governance.answerIntent,
    governance.liveSurface,
    governance.mindTurnFrame?.focusAnchor,
    governance.mindTurnFrame?.world.visibleSurface,
    governance.mindTurnFrame?.obligation.openingClaim,
    governance.mindTurnFrame?.obligation.answerIntent,
    governance.dialogueActKernel?.openingClaim,
    governance.dialogueActKernel?.activeProject,
    governance.dialogueActKernel?.selectedEvidence[0]?.summary,
    governance.dialogueActKernel?.mustSay[0],
  ]
    .map(candidate => sanitizeBriefText(readStringValue(candidate), 220))
    .filter(Boolean)
    .filter(candidate => isWeakAlicizationScreenSurfaceCue(candidate))

  const weakCueMentioned = weakCandidates.some(candidate => replyIncludesAnchorCue(reply, candidate))
  if (governance.groundedThisTurn === true)
    return weakShellMentionedInReply || weakCueMentioned

  const truthState = governance.mindTurnFrame?.world.truthState ?? governance.truthState
  const uncertainTruth = truthState === 'uncertain' || truthState === 'remembered' || truthState === 'imagined'
  return uncertainTruth && (weakShellMentionedInReply || weakCueMentioned)
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

export function detectReplyConflictingAnchors(
  reply: string,
  governance: AlicizationMindTurnGovernance,
  preferredDominant?: string | null,
) {
  const coherence = resolveDialogueAnchorCoherence({
    subject: governance.answerSubject ?? governance.mindTurnFrame?.relation.subject ?? governance.dialogueActKernel?.subject ?? null,
    screenReferenceMode: governance.screenReferenceMode ?? null,
    truthState: governance.mindTurnFrame?.world.truthState ?? governance.truthState,
    groundedThisTurn: governance.groundedThisTurn === true,
    hostMove: governance.mindTurnFrame?.relation.hostMove ?? null,
    candidates: [
      { role: 'focus', text: governance.focusAnchor },
      { role: 'answer-intent', text: governance.answerIntent },
      { role: 'carry', text: governance.carriedThread },
      { role: 'scene', text: governance.dialogueActKernel?.selectedEvidence[0]?.summary },
      { role: 'visible-surface', text: governance.liveSurface },
    ],
  })
  const dominantAnchor = sanitizeBriefText(readStringValue(preferredDominant ?? coherence.dominant), 220) || null
  if (!dominantAnchor)
    return { hasConflict: false, reason: '', coherence }

  const conflictingCandidates = [
    governance.focusAnchor,
    governance.answerIntent,
    governance.carriedThread,
    governance.dialogueActKernel?.selectedEvidence[0]?.summary,
    governance.liveSurface,
  ]
    .map((candidate) => {
      const normalized = typeof candidate === 'string' ? sanitizeBriefText(candidate, 220) : ''
      return normalized || null
    })
    .filter((candidate): candidate is string => Boolean(candidate))
    .filter(candidate => anchorsMateriallyConflict(candidate, dominantAnchor))
    .filter((candidate, index, items) => items.findIndex(item => item === candidate) === index)

  if (conflictingCandidates.length === 0) {
    return {
      hasConflict: false,
      reason: '',
      coherence,
      dominantAnchor,
      conflictingCandidates: [] as string[],
      mentionedConflicts: [] as string[],
    }
  }

  const mentionsDominant = replyIncludesAnchorCue(reply, dominantAnchor)
  const mentionedConflicts = conflictingCandidates.filter(candidate => replyIncludesAnchorCue(reply, candidate))
  const hasConflict = mentionedConflicts.length > 0
    && (mentionsDominant || coherence.sceneAuthority || governance.groundedThisTurn === true)

  return {
    hasConflict,
    reason: hasConflict
      ? (coherence.sceneAuthority || governance.groundedThisTurn === true
          ? 'reply-split-brain-scene-thread'
          : 'reply-conflicting-anchors')
      : '',
    coherence,
    dominantAnchor,
    conflictingCandidates,
    mentionedConflicts,
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

export function resolveGovernedFallbackPatternId(governance: AlicizationMindTurnGovernance, replyOverridden: boolean) {
  if (!replyOverridden)
    return 'none'
  if (governance.repairState === 'stale-anchor')
    return 'repair-stale-anchor'
  if (governance.repairState === 'need-reground')
    return 'repair-need-reground'
  if (governance.turnMode === 'guide-current-knot')
    return 'guide-current-knot'
  if (governance.turnMode === 'grounded-inspection')
    return 'grounded-inspection'
  if (governance.turnMode === 'care')
    return 'care'
  if (governance.turnMode === 'accompany')
    return 'accompany'
  return 'answer'
}

function buildGovernedVisibleReplyRewriteRequest(input: {
  shouldOverrideVisibleReply: boolean
  reasons: string[]
  coherentGovernance: AlicizationMindTurnGovernance
  fallbackPatternId: string
  projectStateContinuityCarry?: string | null
  projectStateContinuityAnchors?: string[] | null
  openingGuidanceHoldDetail?: string | null
  companionshipHoldMode?: 'quiet-companionship' | 'measured-return' | 'repair-before-closeness' | 'rest-protective' | null
  renderedOverrideReply?: string | null
  governedSurfaceReply?: string | null
  candidateReply: string
  unsupportedCues: string[]
  conflictingCandidates: string[]
  droppedClauses: string[]
}) {
  if (!input.shouldOverrideVisibleReply)
    return null

  const mustPreserve = buildPrioritizedProjectStateRewritePreserveLines({
    projectStateContinuityCarry: input.projectStateContinuityCarry ?? null,
    projectStateContinuityAnchors: input.projectStateContinuityAnchors ?? null,
    answerIntent: input.coherentGovernance.answerIntent ?? null,
    focusAnchor: input.coherentGovernance.focusAnchor ?? null,
    openingClaim: input.coherentGovernance.dialogueActKernel?.openingClaim ?? null,
    obligationOpeningClaim: input.coherentGovernance.mindTurnFrame?.obligation.openingClaim ?? null,
  })
  const mustDrop = uniqueCarryAnchors([
    ...input.unsupportedCues,
    ...input.conflictingCandidates,
    ...input.droppedClauses,
    input.renderedOverrideReply ?? '',
    input.governedSurfaceReply ?? '',
  ].filter(item => item && input.candidateReply.includes(item)), 10)
  if (input.reasons.includes('same-thread-restart-shell'))
    mustDrop.push('same-thread continuation restart shell that breaks one living line into a fresh opening')
  if (input.reasons.some(reason => reason.startsWith('opening-guidance-')))
    mustDrop.push('same-her opening drift')
  const memoryTruthDiscipline = deriveAlicizationTruthDiscipline({
    answerSubject: input.coherentGovernance.answerSubject ?? input.coherentGovernance.mindTurnFrame?.relation.subject ?? null,
    screenReferenceMode: input.coherentGovernance.screenReferenceMode ?? null,
    truthState: input.coherentGovernance.truthState,
    turnMode: input.coherentGovernance.turnMode,
    repairState: input.coherentGovernance.repairState,
    evidenceMode: input.coherentGovernance.evidenceMode ?? input.coherentGovernance.claimEvidence?.evidenceMode ?? null,
    labelCarryAsMemory: input.coherentGovernance.labelCarryAsMemory,
    suppressAssociativeRecall: input.coherentGovernance.suppressAssociativeRecall,
    claimEvidenceLedger: input.coherentGovernance.claimEvidence ?? null,
  }).mode

  return {
    required: true,
    authority: 'llm-second-pass-rewrite' as const,
    reasonCodes: uniqueCarryAnchors(input.reasons, 12),
    mustPreserve,
    mustDrop,
    openingGuidanceHoldDetail: input.openingGuidanceHoldDetail ?? null,
    companionshipHoldMode: input.companionshipHoldMode ?? null,
    surfaceContract: input.coherentGovernance.answerIntent ?? input.coherentGovernance.openingMove ?? null,
    memoryTruthDiscipline,
    fallbackPatternId: input.fallbackPatternId,
  }
}

export function buildPrioritizedProjectStateRewritePreserveLines(input: {
  projectStateContinuityCarry?: string | null
  projectStateContinuityAnchors?: string[] | null
  answerIntent?: string | null
  focusAnchor?: string | null
  openingClaim?: string | null
  obligationOpeningClaim?: string | null
}) {
  const projectStateContinuityAnchors = Array.isArray(input.projectStateContinuityAnchors)
    ? input.projectStateContinuityAnchors
    : []
  const findProjectStatePreserveLine = (prefix: string) =>
    projectStateContinuityAnchors.find(anchor => anchor.toLowerCase().startsWith(prefix))
    ?? ''
  const projectStatePreserveLines = [
    findProjectStatePreserveLine('same-her='),
    findProjectStatePreserveLine('hold='),
    findProjectStatePreserveLine('arc='),
    findProjectStatePreserveLine('cue='),
    findProjectStatePreserveLine('proactive-gap='),
    findProjectStatePreserveLine('phase='),
    findProjectStatePreserveLine('landed='),
    findProjectStatePreserveLine('open='),
    findProjectStatePreserveLine('next='),
    findProjectStatePreserveLine('closure='),
    findProjectStatePreserveLine('body='),
    findProjectStatePreserveLine('drift='),
  ].filter(Boolean)
  const nonProjectStateContinuityAnchors = projectStateContinuityAnchors.filter(
    anchor => !/^(?:same-her|hold|arc|cue|proactive-gap|phase|landed|open|next|closure|body|drift)=/i.test(anchor),
  )
  const protectedProjectStatePreserveLines = uniqueCarryAnchors(projectStatePreserveLines, 10, 220)
  const genericCarryTail = uniqueCarryAnchors([
    input.projectStateContinuityCarry ?? '',
    ...nonProjectStateContinuityAnchors,
    input.answerIntent ?? '',
    input.focusAnchor ?? '',
    input.openingClaim ?? '',
    input.obligationOpeningClaim ?? '',
  ], 10, 220).filter(anchor => !protectedProjectStatePreserveLines.includes(anchor))

  return [
    ...protectedProjectStatePreserveLines,
    ...genericCarryTail.slice(0, Math.max(0, 10 - protectedProjectStatePreserveLines.length)),
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
    return 'Recognize the same remembered seam, but keep more room this time because it reopened too eagerly before.'
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
    ? 'Stay inside the current same-her baseline. Keep the opening lower-pressure and leave room before widening closeness.'
    : null
}

function resolveProjectStateContinuityCarry(projectStateAudit?: {
  sameHerSummary?: string | null
  sameHerHoldDetail?: string | null
  continuityArcStage?: string | null
  continuityCue?: string | null
  proactiveSameHerGapSummary?: string | null
  currentPhaseSummary?: string | null
  landedProgressSummary?: string | null
  openClosureSummary?: string | null
  openFocusSummary?: string | null
  nextFocusSummary?: string | null
  nextClosureTargetSummary?: string | null
  emotionalClosureSummary?: string | null
  continuitySummary?: string | null
  preDialogueAwarenessSummary?: string | null
} | null) {
  const rawContinuitySummary = typeof projectStateAudit?.continuitySummary === 'string'
    ? projectStateAudit.continuitySummary.replace(/\s+/g, ' ').trim()
    : ''
  const preDialogueAwarenessSummary = sanitizeBriefText(projectStateAudit?.preDialogueAwarenessSummary ?? '', 220)
  const currentPhaseSummary = sanitizeBriefText(projectStateAudit?.currentPhaseSummary ?? '', 220)
  const landedProgressSummary = sanitizeBriefText(projectStateAudit?.landedProgressSummary ?? '', 220)
  const openClosureSummary = sanitizeBriefText(projectStateAudit?.openClosureSummary ?? '', 220)
  const openFocusSummary = sanitizeBriefText(projectStateAudit?.openFocusSummary ?? '', 220)
  const nextFocusSummary = sanitizeBriefText(projectStateAudit?.nextFocusSummary ?? '', 220)
  const nextClosureTargetSummary = sanitizeBriefText(projectStateAudit?.nextClosureTargetSummary ?? '', 220)
  const emotionalClosureSummary = sanitizeBriefText(projectStateAudit?.emotionalClosureSummary ?? '', 220)
  const continuitySummary = sanitizeBriefText(rawContinuitySummary, 320)
  const sameHerSummary = sanitizeBriefText(projectStateAudit?.sameHerSummary ?? '', 220)
  const sameHerHoldDetail = sanitizeBriefText(projectStateAudit?.sameHerHoldDetail ?? '', 220)
  const continuityArcStage = sanitizeBriefText(projectStateAudit?.continuityArcStage ?? '', 220)
  const continuityCue = sanitizeBriefText(projectStateAudit?.continuityCue ?? '', 220)
  const proactiveGapMatch = rawContinuitySummary.match(/(?:^|\|)\s*proactive-gap=([^|]+)/i)
  const proactiveSameHerGapSummary = sanitizeBriefText(proactiveGapMatch?.[1] ?? '', 220)
    || sanitizeBriefText(projectStateAudit?.proactiveSameHerGapSummary ?? '', 220)
  const closureMatch = rawContinuitySummary.match(/(?:^|\|)\s*closure=([^|]+)/i)
  const closureSummary = sanitizeBriefText(closureMatch?.[1] ?? '', 220) || emotionalClosureSummary
  const continuityLooksStronger = /\b(?:same-her=|same her=|same-her continuity|same her continuity|one continuous her|one living her|detached shell)\b/i.test(continuitySummary)
  const sameHerLooksStronger = /\b(?:one living her|one living digital life|holding together mainly through|audible-body rejoin|audible body rejoin|face|motion|voice|lipsync|cross-modal|embodiment closure|same living line|without splitting her continuity|initiative and embodiment closure|one continuous her)\b/i.test(sameHerSummary)
  const awarenessLooksThinner
    = isAlicizationThinProjectAwarenessLine(preDialogueAwarenessSummary)
      || /\b(?:before any local fluency takes over|remember this is still the same digital life project|keep this same digital life project in view)\b/i.test(preDialogueAwarenessSummary)
  const continuityLine = [
    sameHerSummary ? `same-her=${sameHerSummary}` : '',
    sameHerHoldDetail ? `hold=${sameHerHoldDetail}` : '',
    continuityArcStage ? `arc=${continuityArcStage}` : '',
    continuityCue ? `cue=${continuityCue}` : '',
    proactiveSameHerGapSummary ? `proactive-gap=${proactiveSameHerGapSummary}` : '',
    currentPhaseSummary ? `phase=${currentPhaseSummary}` : '',
    landedProgressSummary ? `landed=${landedProgressSummary}` : '',
    openClosureSummary ? `open=${openClosureSummary}` : '',
    openFocusSummary ? `open-focus=${openFocusSummary}` : '',
    nextFocusSummary ? `next-focus=${nextFocusSummary}` : '',
    nextClosureTargetSummary ? `next=${nextClosureTargetSummary}` : '',
    closureSummary ? `closure=${closureSummary}` : '',
  ].filter(Boolean).join(' | ')
  if (sameHerLooksStronger && /\bsame-her=keep the same digital life project in view\b/i.test(continuitySummary))
    return continuityLine || sameHerSummary
  if (continuityLooksStronger && awarenessLooksThinner)
    return continuityLine || continuitySummary
  const strongestAwarenessCarry = resolveAlicizationProjectPreDialogueAwarenessLine({
    runtimeProjectState: {
      preDialogueAwarenessLine: preDialogueAwarenessSummary,
      preDialogueAwarenessSummary: continuityLine || continuitySummary,
      landedProgressSummary,
      openClosureSummary,
      openFocusSummary,
      nextFocusSummary,
      proactiveSameHerGap: proactiveSameHerGapSummary || null,
      companionHeadlineLine: sameHerSummary || null,
      awarenessLine: sameHerHoldDetail || continuityCue || continuityArcStage || sameHerSummary || continuityLine,
    },
  })
  return strongestAwarenessCarry
    || continuityLine
    || continuitySummary
    || sameHerHoldDetail
    || sameHerSummary
    || null
}

function resolveProjectStateContinuityAnchors(projectStateAudit?: {
  sameHerSummary?: string | null
  sameHerHoldDetail?: string | null
  continuityArcStage?: string | null
  continuityCue?: string | null
  proactiveSameHerGapSummary?: string | null
  currentPhaseSummary?: string | null
  landedProgressSummary?: string | null
  openClosureSummary?: string | null
  openFocusSummary?: string | null
  nextFocusSummary?: string | null
  nextClosureTargetSummary?: string | null
  emotionalClosureSummary?: string | null
  continuitySummary?: string | null
  preDialogueAwarenessSummary?: string | null
} | null) {
  const rawContinuitySummary = typeof projectStateAudit?.continuitySummary === 'string'
    ? projectStateAudit.continuitySummary.replace(/\s+/g, ' ').trim()
    : ''
  const proactiveGapMatch = rawContinuitySummary.match(/(?:^|\|)\s*proactive-gap=([^|]+)/i)
  const proactiveSameHerGapSummary = sanitizeBriefText(proactiveGapMatch?.[1] ?? '', 220)
    || sanitizeBriefText(projectStateAudit?.proactiveSameHerGapSummary ?? '', 220)
  const closureMatch = rawContinuitySummary.match(/(?:^|\|)\s*closure=([^|]+)/i)
  const closureSummary = sanitizeBriefText(closureMatch?.[1] ?? '', 220)
    || sanitizeBriefText(projectStateAudit?.emotionalClosureSummary ?? '', 220)
  const canonicalProjectStateAnchors = [
    projectStateAudit?.sameHerSummary ? `same-her=${sanitizeBriefText(projectStateAudit.sameHerSummary, 220)}` : '',
    projectStateAudit?.sameHerHoldDetail ? `hold=${sanitizeBriefText(projectStateAudit.sameHerHoldDetail, 220)}` : '',
    projectStateAudit?.continuityArcStage ? `arc=${sanitizeBriefText(projectStateAudit.continuityArcStage, 220)}` : '',
    projectStateAudit?.continuityCue ? `cue=${sanitizeBriefText(projectStateAudit.continuityCue, 220)}` : '',
    proactiveSameHerGapSummary ? `proactive-gap=${proactiveSameHerGapSummary}` : '',
    projectStateAudit?.currentPhaseSummary ? `phase=${sanitizeBriefText(projectStateAudit.currentPhaseSummary, 220)}` : '',
    projectStateAudit?.landedProgressSummary ? `landed=${sanitizeBriefText(projectStateAudit.landedProgressSummary, 220)}` : '',
    projectStateAudit?.openClosureSummary ? `open=${sanitizeBriefText(projectStateAudit.openClosureSummary, 220)}` : '',
    projectStateAudit?.openFocusSummary ? `open-focus=${sanitizeBriefText(projectStateAudit.openFocusSummary, 220)}` : '',
    projectStateAudit?.nextFocusSummary ? `next-focus=${sanitizeBriefText(projectStateAudit.nextFocusSummary, 220)}` : '',
    projectStateAudit?.nextClosureTargetSummary ? `next=${sanitizeBriefText(projectStateAudit.nextClosureTargetSummary, 220)}` : '',
    closureSummary ? `closure=${closureSummary}` : '',
  ]
  return uniqueCarryAnchors([
    ...canonicalProjectStateAnchors,
    resolveProjectStateContinuityCarry(projectStateAudit) ?? '',
  ], 8, 220)
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

export function coerceConversationTurnToMindGovernedPayload(
  input: AlicizationConversationTurnInput,
  performanceManifest?: CharacterPerformanceCapabilitiesManifest | null,
  options?: {
    dialogueFirstLocalRepairMode?: 'compat-visible' | 'rewrite-request-only'
    visibleReplyOverrideMode?: 'compat-visible' | 'rewrite-request-only'
    currentConsciousFrame?: AlicizationGovernanceCurrentConsciousFrameInput
  },
) {
  const dialogueFirstLocalRepairMode = options?.dialogueFirstLocalRepairMode ?? 'compat-visible'
  const visibleReplyOverrideMode = options?.visibleReplyOverrideMode ?? 'rewrite-request-only'
  const normalizedCurrentConsciousFrame = coerceGovernanceCurrentConsciousFrame(options?.currentConsciousFrame)
  const structuredPayload = input.structured && typeof input.structured === 'object'
    ? input.structured as Record<string, unknown>
    : {}
  const structuredRuntimeDigest = normalizeAlicizationRuntimeDigest(
    structuredPayload.runtimeDigest,
  ) as AlicizationRuntimeDigest | null
  const autonomousDialogueFamily = resolveAlicizationAutonomousDialogueFamilyClassification({
    turnId: input.turnId,
    rawFormat: structuredPayload.format,
    origin: input.origin,
  })
  const governance = normalizeMindTurnGovernance(input.governance ?? structuredPayload.governance)
  if (autonomousDialogueFamily.isAutonomous || !governance)
    return { payload: input, governance, tookOver: false, replyOverridden: false, reasons: [] as string[], audit: null as Record<string, unknown> | null }

  const reply = readStringValue(structuredPayload.reply).trim()
    || sanitizeBriefText(readStringValue(input.assistantText), 2_000)
  if (!reply)
    return { payload: input, governance, tookOver: false, replyOverridden: false, reasons: [] as string[], audit: null as Record<string, unknown> | null }

  const thought = readStringValue(structuredPayload.thought).trim()
  const formatResolution = resolveAlicizationRuntimeMindTurnStructuredFormat({
    rawFormat: structuredPayload.format,
    contractFailed: structuredPayload.contractFailed === true,
    hasGovernance: true,
    origin: input.origin,
  })
  const format = formatResolution.format
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
    governance: coerceAlicizationGovernanceForMindFallback(anchorCoherentGovernance),
    userText: input.userText,
  })
  const coherentGovernance = (executionFirstGovernance.governance ?? anchorCoherentGovernance) as AlicizationMindTurnGovernance
  const fallbackGovernance = coerceAlicizationGovernanceForMindFallback(coherentGovernance)
  const normalizedEmotion = resolveMindGovernanceEmotion(
    coherentGovernance,
    readStringValue(structuredPayload.emotion).trim().toLowerCase(),
  )
  const thoughtConflict = thoughtConflictsWithMindGovernance(thought, coherentGovernance)
  const initialGovernedSurface = buildMindGovernedFallbackSurface({
    governance: fallbackGovernance,
    userText: input.userText,
    translate: (path, params) => translateGovernedMindFallback(path, params, input.userText),
  })
  const strictGovernance = shouldForceGovernedMindSurface(coherentGovernance, input.userText)
  const initialDialogueFirstVisibleReply = analyzeDialogueFirstVisibleReply({
    reply,
    userText: input.userText,
    governance: coherentGovernance,
  })
  const preserveDialogueFirstVisibleReply = shouldPreserveDialogueFirstVisibleReply(coherentGovernance)
  const dialogueFirstRepairEvidence = preserveDialogueFirstVisibleReply
    ? repairDialogueFirstVisibleReply({
        reply,
        userText: input.userText,
        governance: coherentGovernance,
        analysis: initialDialogueFirstVisibleReply,
      })
    : {
        applied: false,
        reply,
        analysis: initialDialogueFirstVisibleReply,
        reason: null as string | null,
        droppedClauses: [] as string[],
      }
  const useDialogueFirstRepairAsVisibleCandidate = dialogueFirstLocalRepairMode === 'compat-visible'
  const candidateReply = useDialogueFirstRepairAsVisibleCandidate && dialogueFirstRepairEvidence.applied
    ? dialogueFirstRepairEvidence.reply
    : reply
  const leakedGovernedSurface = replyLeaksGovernedMindSurface(candidateReply, coherentGovernance, input.userText)
  const executionSurfaceViolation = replyViolatesExecutionFirstSurface({
    reply: candidateReply,
    governance: coherentGovernance,
    userText: input.userText,
  })
  const weakGroundedSceneCue = replyUsesWeakGroundedSceneCue(candidateReply, coherentGovernance)
  const unsupportedTechnicalSpecificity = analyzeUnsupportedTechnicalSpecificity({
    reply: candidateReply,
    userText: input.userText,
    governance: coherentGovernance,
  })
  const projectStateContinuityCarry = resolveProjectStateContinuityCarry(
    input.visibleReplyRealization?.projectStateAudit ?? null,
  )
  const projectStateContinuityAnchors = resolveProjectStateContinuityAnchors(
    input.visibleReplyRealization?.projectStateAudit ?? null,
  )
  const effectiveOpeningMove = deriveProjectStateClosureOpeningMove(
    input.visibleReplyRealization?.projectStateAudit ?? null,
  ) ?? coherentGovernance.openingMove
  const openingGuidanceViolationReason = effectiveOpeningMove
    ? resolveAlicizationOpeningGuidanceViolationReason({
        reply: candidateReply,
        openingGuidance: effectiveOpeningMove,
      })
    : null
  const sameThreadRestartShell = effectiveOpeningMove
    ? replyViolatesSameThreadContinuationGuidance({
        reply: candidateReply,
        openingGuidance: effectiveOpeningMove,
      })
    : false
  const openingGuidanceHoldDetail = openingGuidanceViolationReason
    ? resolveAlicizationOpeningGuidanceHoldDetail({
        reply: candidateReply,
        openingGuidance: effectiveOpeningMove ?? '',
        openingGuidanceViolationReason,
      })
    : null
  const companionshipHoldMode = openingGuidanceViolationReason === 'proactive-opening-guidance-violation:repair-first'
    ? 'repair-before-closeness'
    : openingGuidanceHoldDetail === 'memory-familiarity-closeness-cap'
      ? 'repair-before-closeness'
      : openingGuidanceViolationReason === 'proactive-opening-guidance-violation:lower-pressure'
        ? 'measured-return'
        : inferCompanionshipHoldModeFromDigitalLifeSpine({
            digitalLifeSpine: normalizeGovernanceDigitalLifeSpineDigest(
              (structuredPayload as Record<string, unknown>).digitalLifeSpine,
            ),
            currentConsciousFrame: normalizedCurrentConsciousFrame,
          })
  const conflictingAnchors = detectReplyConflictingAnchors(
    candidateReply,
    coherentGovernance,
    governedAnchorRepair.coherence.dominant ?? coherentGovernance.focusAnchor,
  )
  const scriptMismatch = replyScriptMismatchesUserTurn({
    userText: input.userText,
    reply: candidateReply,
  })
  const dialogueFirstVisibleReply = useDialogueFirstRepairAsVisibleCandidate
    ? dialogueFirstRepairEvidence.analysis
    : initialDialogueFirstVisibleReply
  const dialogueFirstOverrideRequired = Boolean(
    preserveDialogueFirstVisibleReply
    && dialogueFirstVisibleReply.contaminated,
  )
  const governedSurface = dialogueFirstOverrideRequired
    ? buildMindGovernedFallbackSurface({
        governance: fallbackGovernance,
        userText: input.userText,
        translate: (path, params) => translateGovernedMindFallback(path, params, input.userText),
        forceDialogueAnswerFallback: true,
      })
    : initialGovernedSurface
  const dispatchOnlyVisibleOverride = governedSurface?.visibleReplyMode === 'dispatch-only'
  const thinGovernedShell = governedSurface
    ? replyLooksThinGovernedShell(candidateReply, governedSurface.reply, fallbackGovernance, governedSurface.thinShellCue)
    : false
  const coherentSceneReply = replyLooksCoherentSceneAnswer({
    reply: candidateReply,
    governance: fallbackGovernance,
    userText: input.userText,
  })
  const organicDirectReply = replyLooksOrganicDirectAnswer({
    reply: candidateReply,
    governance: fallbackGovernance,
    userText: input.userText,
    thinShellCue: governedSurface?.thinShellCue,
  })
  const hasMindThought = hasMindTurnSpine(thought)
  const missingMindThought = !hasMindThought
  const invalidFormat = format !== 'mind-turn-v1'
  const invalidParsePath = !['json', 'repair-json'].includes(parsePath)
  const contractFailed = structuredPayload.contractFailed === true
  const reasons = [
    contractFailed ? 'structured-contract-failed' : '',
    invalidFormat ? 'structured-format-repaired' : '',
    invalidParsePath ? 'structured-parsepath-repaired' : '',
    missingMindThought ? 'thought-missing-mind-spine' : '',
    thoughtConflict ? 'thought-governance-mismatch' : '',
    governedAnchorRepair.changed ? 'governance-anchor-coherence-repaired' : '',
    executionFirstGovernance.applied ? 'execution-first-governance-override' : '',
    dispatchOnlyVisibleOverride ? 'execution-first-dispatch-hidden' : '',
    dialogueFirstRepairEvidence.applied
      ? (useDialogueFirstRepairAsVisibleCandidate
          ? 'dialogue-first-visible-reply-soft-repaired'
          : 'dialogue-first-visible-reply-rewrite-evidence')
      : '',
    strictGovernance ? 'strict-governance-surface' : '',
    executionSurfaceViolation ? 'execution-first-visible-reply-violation' : '',
    leakedGovernedSurface ? 'reply-leaked-internal-governance' : '',
    weakGroundedSceneCue ? 'reply-used-weak-grounded-scene-cue' : '',
    unsupportedTechnicalSpecificity.unsupportedCues.length > 0 ? 'reply-introduced-unsupported-technical-specificity' : '',
    sameThreadRestartShell ? 'same-thread-restart-shell' : '',
    openingGuidanceViolationReason
      ? openingGuidanceViolationReason.replace('proactive-opening-guidance-violation:', 'opening-guidance-')
      : '',
    scriptMismatch ? 'reply-script-mismatch-with-user-turn' : '',
    conflictingAnchors.reason,
    dialogueFirstVisibleReply.contaminated && (!useDialogueFirstRepairAsVisibleCandidate
      || !dialogueFirstRepairEvidence.applied)
      ? 'dialogue-first-visible-reply-contaminated'
      : '',
    thinGovernedShell ? 'reply-thin-governed-shell' : '',
    shouldDeferGovernedMindLocalRepair(coherentGovernance) && (!useDialogueFirstRepairAsVisibleCandidate
      || !dialogueFirstRepairEvidence.applied)
      ? 'dialogue-first-repair-deferred'
      : '',
    structuredPayload.governance == null ? 'governance-snapshot-injected' : '',
  ].filter(Boolean)

  const hardOverrideRequired = Boolean(
    executionSurfaceViolation
    || leakedGovernedSurface
    || (
      weakGroundedSceneCue
      || unsupportedTechnicalSpecificity.shouldOverride
      || sameThreadRestartShell
      || Boolean(openingGuidanceViolationReason)
      || scriptMismatch
      || conflictingAnchors.hasConflict
      || dialogueFirstOverrideRequired
    ),
  )
  const thinShellOverrideRequired = Boolean(
    thinGovernedShell
    && !preserveDialogueFirstVisibleReply,
  )
  const strictOverrideRequired = strictGovernance
  const explicitRepairTurn = isExplicitGovernanceRepairTurn(coherentGovernance)
  const strictRepairReplySuppressed = Boolean(
    strictOverrideRequired
    && !hardOverrideRequired
    && !thinShellOverrideRequired
    && explicitRepairTurn
    && (coherentSceneReply || organicDirectReply),
  )
  const softStrictOverrideSuppressed = Boolean(
    strictOverrideRequired
    && !hardOverrideRequired
    && (!explicitRepairTurn || strictRepairReplySuppressed),
  )
  if (softStrictOverrideSuppressed)
    reasons.push('soft-strict-governance-suppressed')
  if (strictRepairReplySuppressed) {
    reasons.push(coherentSceneReply
      ? 'strict-repair-scene-reply-preserved'
      : 'strict-repair-organic-reply-preserved')
  }
  const overrideCandidateNeeded = Boolean(
    hardOverrideRequired
    || thinShellOverrideRequired
    || (strictOverrideRequired && !softStrictOverrideSuppressed),
  )
  const renderedOverrideSurface = overrideCandidateNeeded
    ? renderAlicizationMindSurface({
        governance: coherentGovernance,
        userText: input.userText,
        moves: [],
        forceDialogueAnswerFallback: dialogueFirstOverrideRequired,
      })
    : null
  const shouldOverrideVisibleReply = Boolean(
    overrideCandidateNeeded
    && (
      dispatchOnlyVisibleOverride
      || Boolean(renderedOverrideSurface?.reply)
      || Boolean(governedSurface?.reply)
    ),
  )
  const replyKeptDespiteMismatch = Boolean(
    !shouldOverrideVisibleReply
    && (
      thoughtConflict
      || governedAnchorRepair.changed
      || dialogueFirstVisibleReply.contaminated
      || unsupportedTechnicalSpecificity.unsupportedCues.length > 0
      || conflictingAnchors.hasConflict
    ),
  )
  if (replyKeptDespiteMismatch)
    reasons.push('reply-kept-despite-mismatch')
  const overrideClass = shouldOverrideVisibleReply
    ? (hardOverrideRequired ? 'hard-override' : 'soft-override')
    : 'none'
  const fallbackPatternId = resolveGovernedFallbackPatternId(coherentGovernance, shouldOverrideVisibleReply)
  const visibleReplyRewriteRequest = buildGovernedVisibleReplyRewriteRequest({
    shouldOverrideVisibleReply,
    reasons,
    coherentGovernance,
    fallbackPatternId,
    projectStateContinuityCarry,
    projectStateContinuityAnchors,
    openingGuidanceHoldDetail,
    companionshipHoldMode,
    renderedOverrideReply: renderedOverrideSurface?.reply ?? null,
    governedSurfaceReply: governedSurface?.reply ?? null,
    candidateReply,
    unsupportedCues: unsupportedTechnicalSpecificity.unsupportedCues,
    conflictingCandidates: conflictingAnchors.conflictingCandidates ?? [],
    droppedClauses: [
      ...(dialogueFirstRepairEvidence.droppedClauses ?? []),
      ...(projectStateContinuityCarry ? [projectStateContinuityCarry] : []),
    ],
  })
  const visibleReplyAuditAuthority = resolveAlicizationVisibleReplyGovernanceAuditAuthority({
    shouldOverrideVisibleReply,
    governance: coherentGovernance,
  })
  const hardFallbackReason = shouldOverrideVisibleReply && hardOverrideRequired
    ? [
        executionSurfaceViolation ? 'execution-first-visible-reply-violation' : '',
        leakedGovernedSurface ? 'reply-leaked-internal-governance' : '',
        weakGroundedSceneCue ? 'reply-used-weak-grounded-scene-cue' : '',
        unsupportedTechnicalSpecificity.unsupportedCues.length > 0 ? 'reply-introduced-unsupported-technical-specificity' : '',
        scriptMismatch ? 'reply-script-mismatch-with-user-turn' : '',
        conflictingAnchors.reason,
        dialogueFirstOverrideRequired ? 'dialogue-first-visible-reply-contaminated' : '',
      ].find(Boolean) ?? 'hard-governance-fallback'
    : null
  const compatVisibleOverrideReply = shouldOverrideVisibleReply && !dispatchOnlyVisibleOverride
    ? sanitizeBriefText(renderedOverrideSurface?.reply ?? governedSurface?.reply ?? '', 2_000)
    : ''
  const finalReply = shouldOverrideVisibleReply
    ? (visibleReplyOverrideMode === 'compat-visible' ? compatVisibleOverrideReply : '')
    : candidateReply
  const finalThought = shouldOverrideVisibleReply
    ? renderedOverrideSurface?.thought ?? governedSurface?.thought ?? buildGovernedMindThought(coherentGovernance, input)
    : (missingMindThought || thoughtConflict)
        ? governedSurface?.thought ?? buildGovernedMindThought(coherentGovernance, input)
        : thought
  const finalEmotion = resolveMindGovernanceEmotion(
    coherentGovernance,
    shouldOverrideVisibleReply && renderedOverrideSurface
      ? renderedOverrideSurface.emotion
      : normalizedEmotion,
  )
  let finalDigitalLifeSpine = applyCompanionshipHoldModeToDigitalLifeSpine({
    digitalLifeSpine: normalizeAlicizationDigitalLifeSpineDigest(
      (structuredPayload as Record<string, unknown>).digitalLifeSpine,
    ),
    fallbackContinuityAuthority: input.digitalLifeSpine,
    companionshipHoldMode,
    openingGuidanceAuthority: effectiveOpeningMove,
  })
  const rememberedSeamMoreRoomOpeningGuidance = companionshipHoldMode === 'measured-return'
    && typeof effectiveOpeningMove === 'string'
    && /remembered seam|more room this time|too eagerly/u.test(effectiveOpeningMove.toLowerCase())
    ? effectiveOpeningMove
    : null
  if (rememberedSeamMoreRoomOpeningGuidance) {
    finalDigitalLifeSpine = normalizeAlicizationDigitalLifeSpineDigest({
      ...finalDigitalLifeSpine,
      proactive: {
        ...finalDigitalLifeSpine?.proactive,
        continuityRestraint: 'measured-return',
        personaBias: {
          ...finalDigitalLifeSpine?.proactive?.personaBias,
          manifestationCadenceSummary: [
            finalDigitalLifeSpine?.proactive?.personaBias?.manifestationCadenceSummary,
            rememberedSeamMoreRoomOpeningGuidance,
          ].filter(Boolean).join(' | '),
        },
      },
      memory: finalDigitalLifeSpine?.memory
        ? {
            ...finalDigitalLifeSpine.memory,
            personStateProjection: finalDigitalLifeSpine.memory.personStateProjection
              ? {
                  ...finalDigitalLifeSpine.memory.personStateProjection,
                  openingGuidance: rememberedSeamMoreRoomOpeningGuidance,
                }
              : {
                  selfContinuityAuthority: null,
                  activeClosenessContext: null,
                  activeClosenessRung: null,
                  relationshipPosture: null,
                  openingGuidance: rememberedSeamMoreRoomOpeningGuidance,
                  preferredProactiveStyle: 'silent-observe',
                  manifestationCadenceSummary: rememberedSeamMoreRoomOpeningGuidance,
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
              selfContinuityAuthority: null,
              activeClosenessContext: null,
              activeClosenessRung: null,
              relationshipPosture: null,
              openingGuidance: rememberedSeamMoreRoomOpeningGuidance,
              preferredProactiveStyle: 'silent-observe',
              manifestationCadenceSummary: rememberedSeamMoreRoomOpeningGuidance,
            },
          },
    }) as AlicizationDialogueStructuredPayload['digitalLifeSpine']
  }
  const finalPerformance = shouldOverrideVisibleReply && renderedOverrideSurface
    ? alignDialoguePerformanceEmotion(
        structuredPayload.performance ?? renderedOverrideSurface.performance,
        finalEmotion,
      )
    : alignDialoguePerformanceEmotion(structuredPayload.performance, finalEmotion)
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
  const finalParsePath = (
    shouldOverrideVisibleReply
    || contractFailed
    || invalidFormat
    || invalidParsePath
    || missingMindThought
    || thoughtConflict
  )
    ? 'repair-json'
    : parsePath
  const normalizedAssistantText = shouldOverrideVisibleReply
    ? finalReply
    : (finalReply || sanitizeBriefText(readStringValue(input.assistantText), 2_000))
  const tookOver = Boolean(
    shouldOverrideVisibleReply
    || structuredPayload.governance == null
    || finalThought !== thought
    || finalEmotion !== normalizeAlicizationEmotion(readStringValue(structuredPayload.emotion).trim().toLowerCase()).emotion
    || finalParsePath !== parsePath
    || invalidFormat
    || contractFailed
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
      ...input,
      assistantText: normalizedAssistantText,
      governance: coherentGovernance,
      structured: {
        ...structuredPayload,
        thought: finalThought,
        emotion: finalEmotion,
        reply: finalReply,
        visibleReplyAuthority: shouldOverrideVisibleReply
          ? 'llm-second-pass-rewrite'
          : (coherentGovernance.visibleReplyAuthority ?? 'llm-mind'),
        visibleReplyRewriteRequest,
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
    replyOverridden: shouldOverrideVisibleReply,
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
      execution_dispatch_hidden: dispatchOnlyVisibleOverride && shouldOverrideVisibleReply,
      execution_reason_codes: executionFirstGovernance.reasonCodes,
      execution_turn_mode_before: anchorCoherentGovernance.turnMode,
      execution_turn_mode_after: coherentGovernance.turnMode,
      execution_answer_act_before: anchorCoherentGovernance.answerAct ?? null,
      execution_answer_act_after: coherentGovernance.answerAct ?? null,
      execution_screen_mode_before: anchorCoherentGovernance.screenReferenceMode ?? null,
      execution_screen_mode_after: coherentGovernance.screenReferenceMode ?? null,
      anchor_candidates_before: summarizeGovernanceAnchorAuditCandidates(governedAnchorRepair.anchorCandidatesBefore),
      anchor_candidates_after: summarizeGovernanceAnchorAuditCandidates(governedAnchorRepair.anchorCandidatesAfter),
      dominant_anchor: conflictingAnchors.dominantAnchor ?? null,
      conflicting_anchor_candidates: conflictingAnchors.conflictingCandidates,
      mentioned_conflicting_anchors: conflictingAnchors.mentionedConflicts,
      dialogue_focus_overlap: Number(dialogueFirstVisibleReply.overlapRatio.toFixed(2)),
      roleplay_preface: dialogueFirstVisibleReply.roleplayPreface,
      stale_carry_reference: dialogueFirstVisibleReply.staleCarryReference,
      scene_cue_mentions: dialogueFirstVisibleReply.sceneCueMentions,
      foreign_technical_cues: dialogueFirstVisibleReply.foreignTechnicalCues,
      dialogue_truth_discipline_mode: dialogueFirstVisibleReply.truthDisciplineMode,
      execution_surface_violation: executionSurfaceViolation,
      reply_specificity_cues: unsupportedTechnicalSpecificity.replyCues,
      allowed_specificity_cues: unsupportedTechnicalSpecificity.allowedCues,
      unsupported_specificity_cues: unsupportedTechnicalSpecificity.unsupportedCues,
      specificity_truth_discipline_mode: unsupportedTechnicalSpecificity.truthDisciplineMode,
      claim_specificity_budget: coherentGovernance.claimEvidence?.specificityBudget ?? null,
      claim_observed_surface: coherentGovernance.claimEvidence?.observedSurface ?? null,
      claim_task_hypothesis: coherentGovernance.claimEvidence?.taskHypothesis ?? null,
      claim_intent_hypothesis: coherentGovernance.claimEvidence?.intentHypothesis ?? null,
      claim_should_label_hypothesis: coherentGovernance.claimEvidence?.shouldLabelHypothesis === true,
      claim_forbid_unsupported_specificity: coherentGovernance.claimEvidence?.forbidUnsupportedSpecificity === true,
      reply_before_excerpt: excerptGovernedReply(reply),
      reply_after_excerpt: excerptGovernedReply(finalReply),
      local_repair_candidate_blocked: dialogueFirstRepairEvidence.applied && !useDialogueFirstRepairAsVisibleCandidate,
      local_repair_candidate_reason: dialogueFirstRepairEvidence.reason,
      local_repair_candidate_reply_excerpt: dialogueFirstRepairEvidence.applied
        ? excerptGovernedReply(dialogueFirstRepairEvidence.reply)
        : null,
      local_repair_candidate_dropped_clauses: dialogueFirstRepairEvidence.droppedClauses,
      soft_repair_applied: dialogueFirstRepairEvidence.applied && useDialogueFirstRepairAsVisibleCandidate,
      soft_repair_reason: dialogueFirstRepairEvidence.reason,
      soft_repair_dropped_clauses: dialogueFirstRepairEvidence.droppedClauses,
      visible_reply_override_mode: visibleReplyOverrideMode,
      visible_reply_local_compat_realized: shouldOverrideVisibleReply && visibleReplyOverrideMode === 'compat-visible' && Boolean(finalReply),
      hard_fallback_reason: hardFallbackReason,
      fallback_template_key: shouldOverrideVisibleReply ? fallbackPatternId : null,
      visible_reply_authority: visibleReplyAuditAuthority.visibleReplyAuthority,
      visible_reply_realization_authority: visibleReplyAuditAuthority.visibleReplyRealizationAuthority,
      visible_reply_rewrite_request: visibleReplyRewriteRequest,
      opening_guidance_hold_detail: openingGuidanceHoldDetail,
      companionship_hold_mode: companionshipHoldMode,
      reply_kept_despite_mismatch: replyKeptDespiteMismatch,
      organic_direct_reply: organicDirectReply,
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
    visibleLead: sanitizeMindTraceTelemetryText(input.snapshot.visibleLine, 180) || null,
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
  const persistedDigitalLifeSpine = summarizeMindTurnEventDigitalLifeSpine(structured.digitalLifeSpine)
  const participation = deriveAlicizationMindParticipationFromSpine(
    normalizeAlicizationDigitalLifeSpineDigest(structured.digitalLifeSpine),
  )
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
      derivedMindStateBundle: structured.derivedMindStateBundle && typeof structured.derivedMindStateBundle === 'object'
        ? structured.derivedMindStateBundle
        : null,
      memoryStageReplay: structured.memoryStageReplay && typeof structured.memoryStageReplay === 'object'
        ? structured.memoryStageReplay
        : null,
      memoryResolutionLedger: structured.memoryResolutionLedger && typeof structured.memoryResolutionLedger === 'object'
        ? structured.memoryResolutionLedger
        : null,
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
      derivedMindStateBundle: structured.derivedMindStateBundle && typeof structured.derivedMindStateBundle === 'object'
        ? structured.derivedMindStateBundle
        : null,
      memoryStageReplay: structured.memoryStageReplay && typeof structured.memoryStageReplay === 'object'
        ? structured.memoryStageReplay
        : null,
      memoryResolutionLedger: structured.memoryResolutionLedger && typeof structured.memoryResolutionLedger === 'object'
        ? structured.memoryResolutionLedger
        : null,
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
    const dialogueDigitalLifeSpine = summarizeMindTurnEventDigitalLifeSpine(
      ((input.dialoguePayload.structured as unknown) as Record<string, unknown>).digitalLifeSpine,
    ) ?? persistedDigitalLifeSpine
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
        digitalLife: input.dialoguePayload.structured.digitalLife
          ? {
              emotion: input.dialoguePayload.structured.digitalLife.emotion,
              mode: input.dialoguePayload.structured.digitalLife.mode,
              performance: {
                baseEmotion: input.dialoguePayload.structured.digitalLife.performance.baseEmotion,
                facialCue: input.dialoguePayload.structured.digitalLife.performance.facialCue ?? null,
                actionCue: input.dialoguePayload.structured.digitalLife.performance.actionCue ?? null,
              },
              face: {
                emotion: input.dialoguePayload.structured.digitalLife.face.emotion,
                facialCue: input.dialoguePayload.structured.digitalLife.face.facialCue ?? null,
              },
              action: {
                actionCue: input.dialoguePayload.structured.digitalLife.action.actionCue ?? null,
                actionMode: input.dialoguePayload.structured.digitalLife.action.actionMode,
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
              },
              speechPlan: {
                segmentCount: input.dialoguePayload.structured.embodimentScript.speechPlan.segments.length,
                interruptPolicy: input.dialoguePayload.structured.embodimentScript.speechPlan.interruptPolicy,
              },
            }
          : null,
        digitalLifeSpine: dialogueDigitalLifeSpine,
        derivedMindStateBundle: ((input.dialoguePayload.structured as unknown) as Record<string, unknown>)?.derivedMindStateBundle
          && typeof ((input.dialoguePayload.structured as unknown) as Record<string, unknown>)?.derivedMindStateBundle === 'object'
          ? ((input.dialoguePayload.structured as unknown) as Record<string, unknown>).derivedMindStateBundle
          : null,
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
  const structuredVisibleReplyText = readStringValue(
    structuredVisibleReplyRealization && typeof structuredVisibleReplyRealization === 'object'
      ? structuredVisibleReplyRealization.visibleText
      : '',
  ).trim()
  const reply = readStringValue((structuredPayload as Record<string, unknown>).reply).trim()
    || structuredVisibleReplyText
    || input.assistantText?.trim()
    || ''
  const parsePath = readStringValue((structuredPayload as Record<string, unknown>).parsePath).trim().toLowerCase()
  const contractFailed = (structuredPayload as Record<string, unknown>).contractFailed === true
  const policyLocked = readStringValue((structuredPayload as Record<string, unknown>).policyLocked).trim()
  const governance = normalizeMindTurnGovernance(
    input.governance ?? (structuredPayload as Record<string, unknown>).governance,
  )
  const explicitLegacyInputFormat = (() => {
    const rawLegacyInputFormat = readStringValue((structuredPayload as Record<string, unknown>).legacyInputFormat).trim().toLowerCase()
    return rawLegacyInputFormat === 'epoch1-v1' || rawLegacyInputFormat === 'fallback-v1'
      ? rawLegacyInputFormat
      : null
  })()
  const formatResolution = resolveAlicizationRuntimeMindTurnStructuredFormat({
    rawFormat: (structuredPayload as Record<string, unknown>).format,
    contractFailed,
    hasGovernance: Boolean(governance),
    origin: input.origin,
  })
  const format = formatResolution.format
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
  const visibleReplyRealization: AlicizationConversationTurnInput['visibleReplyRealization'] = (() => {
    const raw = input.visibleReplyRealization ?? structuredVisibleReplyRealization
    if (!raw)
      return undefined
    const currentProjectState = normalizedCurrentConsciousFrame?.projectState
    const rawProjectStateAudit: NonNullable<AlicizationVisibleReplyRealizationArtifact['projectStateAudit']> | null
      = raw.projectStateAudit
        ? { ...raw.projectStateAudit }
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
    return {
      ...raw,
      blockedReasons: Array.isArray(raw.blockedReasons)
        ? raw.blockedReasons.filter((reason): reason is string => typeof reason === 'string')
        : [],
      emotionalClosureAudit: raw.emotionalClosureAudit
        ? { ...raw.emotionalClosureAudit }
        : null,
      selfAuthorityAudit: raw.selfAuthorityAudit
        ? { ...raw.selfAuthorityAudit }
        : null,
      projectStateAudit,
      critic: raw.critic ? { ...raw.critic } : null,
      closure: raw.closure ? { ...raw.closure } : null,
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
      && (sameThreadConcernCarry || continuityResidentMode != null
      && (
        normalizedPerformance.baseEmotion === 'concerned'
        || normalizedPerformance.emotion === 'concerned'
        || rawEmotion === 'concerned'
        || hasConcernCarryNeedle([
          'concerned-but-restrained',
        ])
      ))
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
  const isFallback = contractFailed || !['json', 'repair-json'].includes(parsePath)
  const autonomousDialogueFamily = resolveAlicizationAutonomousDialogueFamilyClassification({
    turnId,
    rawFormat: format,
    origin: input.origin,
  })
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

  const structured: AlicizationDialogueStructuredPayload = {
    thought,
    emotion: embodiment.emotion,
    reply,
    visibleReplyAuthority: visibleReplyAuthority
      ? normalizeAlicizationNormalVisibleReplyAuthority(visibleReplyAuthority as any, 'llm-mind')
      : governance?.visibleReplyAuthority ?? null,
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
