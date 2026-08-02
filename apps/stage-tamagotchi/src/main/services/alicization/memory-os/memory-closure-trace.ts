import type { OrganicMemoryPromptContext } from '../runtime-soul'
import type { AlicizationMemoryCandidateCompetitionArtifact } from './candidate-competition'
import type { AlicizationMemoryCandidateRetrievalArtifact } from './candidate-retrieval'
import type { AlicizationMemoryDeliberationArtifact } from './memory-deliberation'
import type { AlicizationMemorySettlementArtifact } from './memory-settlement'
import type { AlicizationMemorySpeechPostureArtifact } from './speech-posture'

export type AlicizationMemoryClosureTraceSource
  = 'personality'
    | 'affective-residue'
    | 'execution-feedback'
    | 'embodiment-cadence'
    | 'initiative'
    | 'retrieval'
    | 'settlement'

export interface AlicizationMemoryClosureTrace {
  version: 'memory-closure-trace-v1'
  authority: 'memory-os'
  whySurface: Array<{
    source: AlicizationMemoryClosureTraceSource
    summary: string
    reasonCodes: string[]
  }>
  surfacePolicy: {
    gateStatus: AlicizationMemorySettlementArtifact['visibleMemoryGate']['status']
    mode: 'open' | 'gist-only' | 'tone-carry' | 'inward-only' | 'closed'
    timing: string | null
    speechMode: string | null
    placement: string | null
    certainty: string | null
    reasons: string[]
  }
  nextInfluence: {
    initiative: {
      restraint: string | null
      preferredTiming: string | null
      pressure: 'lower-pressure' | 'standard'
      reason: string | null
    }
    execution: {
      carry: string | null
      nextLearningAction: string | null
      shouldVerify: boolean
      shouldReflect: boolean
      activeLearningFocuses: string[]
    }
    embodiment: {
      cadence: string | null
      preferredVoiceMode: 'lower-pressure' | 'even' | null
      preferredLipsyncMode: 'restrained' | 'matched' | null
      preferredGazeMode: 'steady' | 'soften' | 'drift' | null
      reason: string | null
    }
  }
  closureState: {
    state: AlicizationMemorySettlementArtifact['closure']['closureState']
    open: boolean
    revisionRequired: boolean
    shouldLabelUncertainty: boolean
    visibleCarryMode: AlicizationMemorySettlementArtifact['closure']['visibleCarryMode']
    retrievalQuality: AlicizationMemorySettlementArtifact['closure']['retrievalQuality']
    conflictPressure: AlicizationMemorySettlementArtifact['closure']['conflictPressure']
  }
  selectedCandidateIds: string[]
  memoryIdentity: {
    selectedCandidateIds: string[]
    continuityKey: string | null
    reasonTags: string[]
  } | null
  reasonTags: string[]
}

function asRecord(raw: unknown) {
  return raw && typeof raw === 'object' && !Array.isArray(raw)
    ? raw as Record<string, unknown>
    : null
}

function normalizeText(raw: unknown, maxChars = 220) {
  return typeof raw === 'string'
    ? raw.trim().replace(/\s+/g, ' ').slice(0, maxChars) || null
    : null
}

function compactList(values: Array<string | null | undefined>, limit = 8, maxChars = 180) {
  const result: string[] = []
  for (const value of values) {
    const normalized = normalizeText(value, maxChars)
    if (!normalized || result.includes(normalized))
      continue
    result.push(normalized)
    if (result.length >= limit)
      break
  }
  return result
}

function readStringList(raw: unknown, limit = 8) {
  if (!Array.isArray(raw))
    return []
  return compactList(raw.map(item => normalizeText(item, 120)), limit, 120)
}

function readRelationshipCadence(context: OrganicMemoryPromptContext) {
  const cadence = asRecord(context.affectiveResidue?.relationshipCadence)
  if (!cadence) {
    return {
      cadenceMode: null,
      distancePosture: null,
      summary: null,
      shouldDelayWarmth: false,
      shouldProtectRest: false,
    }
  }

  return {
    cadenceMode: normalizeText(cadence.cadenceMode, 80)
      ?? normalizeText(cadence.stance, 80),
    distancePosture: normalizeText(cadence.distancePosture, 80)
      ?? normalizeText(cadence.posture, 80),
    summary: normalizeText(cadence.summary, 220)
      ?? normalizeText(cadence.why, 220),
    shouldDelayWarmth: cadence.shouldDelayWarmth === true,
    shouldProtectRest: cadence.shouldProtectRest === true,
  }
}

function readPersonAuthority(context: OrganicMemoryPromptContext) {
  return asRecord(context.personStateProjection?.selfContinuityAuthority)
}

function pushWhy(input: {
  target: AlicizationMemoryClosureTrace['whySurface']
  source: AlicizationMemoryClosureTraceSource
  summary: string | null | undefined
  reasonCodes?: Array<string | null | undefined>
}) {
  if (!input.summary)
    return
  input.target.push({
    source: input.source,
    summary: input.summary,
    reasonCodes: compactList(input.reasonCodes ?? [], 8, 120),
  })
}

function deriveSurfaceMode(input: {
  settlement: AlicizationMemorySettlementArtifact
}) {
  if (input.settlement.visibleMemoryGate.status === 'closed')
    return 'closed' as const
  if (input.settlement.visibleMemoryGate.status === 'inward-only')
    return 'inward-only' as const
  if (input.settlement.visibleMemoryGate.status === 'gist-only')
    return 'gist-only' as const
  if (input.settlement.closure.visibleCarryMode === 'tone-carry')
    return 'tone-carry' as const
  return 'open' as const
}

function derivePreferredTiming(input: {
  context: OrganicMemoryPromptContext
  deliberation: AlicizationMemoryDeliberationArtifact
  speechPosture: AlicizationMemorySpeechPostureArtifact
}) {
  return input.deliberation.followUp?.preferredTiming
    ?? (input.context.memoryResolutionLedger?.shouldDelayUntilAfterPayoff ? 'after-payoff' : null)
    ?? normalizeText(input.speechPosture.placement, 80)
}

function inferPreferredVoiceMode(text: string | null): AlicizationMemoryClosureTrace['nextInfluence']['embodiment']['preferredVoiceMode'] {
  const lower = text?.toLowerCase() ?? ''
  if (!lower)
    return null
  if (/lower-pressure|low-pressure|quieter|gentle|measured/u.test(lower))
    return 'lower-pressure'
  if (/even|steady/u.test(lower))
    return 'even'
  return null
}

function inferPreferredLipsyncMode(text: string | null): AlicizationMemoryClosureTrace['nextInfluence']['embodiment']['preferredLipsyncMode'] {
  const lower = text?.toLowerCase() ?? ''
  if (!lower.includes('lipsync'))
    return null
  if (/restrained|lower-pressure|low-pressure|quieter|measured|slower/u.test(lower))
    return 'restrained'
  return 'matched'
}

function inferPreferredGazeMode(text: string | null): AlicizationMemoryClosureTrace['nextInfluence']['embodiment']['preferredGazeMode'] {
  const lower = text?.toLowerCase() ?? ''
  if (!lower.includes('gaze'))
    return null
  if (/soften|gentle|lower-pressure|low-pressure|measured/u.test(lower))
    return 'soften'
  if (/drift/u.test(lower))
    return 'drift'
  if (/steady/u.test(lower))
    return 'steady'
  return null
}

function inferInitiativeRestraint(input: {
  context: OrganicMemoryPromptContext
  deliberation: AlicizationMemoryDeliberationArtifact
}) {
  const cadence = readRelationshipCadence(input.context)
  const combined = [
    cadence.cadenceMode,
    cadence.distancePosture,
    cadence.summary,
    input.context.affectiveResidue?.summary,
    input.deliberation.followUp?.summary,
    input.deliberation.inwardLine,
  ].filter(Boolean).join(' ').toLowerCase()

  return normalizeText(cadence.cadenceMode, 80)
    ?? (combined.includes('repair-before-closeness') ? 'repair-before-closeness' : null)
    ?? (combined.includes('measured-return') ? 'measured-return' : null)
    ?? (combined.includes('lower-pressure') || combined.includes('low-pressure') ? 'lower-pressure' : null)
    ?? (input.context.affectiveResidue?.dominantResidueKind === 'repair' ? 'repair-before-closeness' : null)
    ?? (input.context.affectiveResidue?.dominantResidueKind === 'rest-protective' ? 'lower-pressure' : null)
}

function deriveClosureOpen(state: AlicizationMemorySettlementArtifact['closure']['closureState']) {
  return state === 'approximate-recall'
    || state === 'conflicted-recall'
    || state === 'inward-only'
    || state == null
}

function deriveRevisionRequired(input: {
  settlement: AlicizationMemorySettlementArtifact
  competition: AlicizationMemoryCandidateCompetitionArtifact
}) {
  return input.settlement.closure.shouldLabelUncertainty
    || input.settlement.closure.closureState === 'approximate-recall'
    || input.settlement.closure.closureState === 'conflicted-recall'
    || input.settlement.closure.retrievalQuality === 'low'
    || input.settlement.closure.retrievalQuality === 'insufficient'
    || input.competition.conflictCandidateIds.length > 0
    || input.competition.wrongThreadSuppressedCount > 0
}

function deriveReasonTags(input: {
  context: OrganicMemoryPromptContext
  settlement: AlicizationMemorySettlementArtifact
  competition: AlicizationMemoryCandidateCompetitionArtifact
}) {
  const authority = readPersonAuthority(input.context)
  const rawTags = [
    'memory-os-authority',
    ...readStringList(authority?.sourceTags, 12),
    input.context.coreIncarnation ? `incarnation:${input.context.coreIncarnation}` : null,
    input.context.memoryResolutionLedger?.closureState ? `closure:${input.context.memoryResolutionLedger.closureState}` : null,
    input.settlement.visibleMemoryGate.status ? `gate:${input.settlement.visibleMemoryGate.status}` : null,
    input.competition.wrongThreadSuppressedCount > 0 ? 'wrong-thread-guarded' : null,
  ]
  return compactList(rawTags, 16, 120)
}

function deriveMemoryIdentity(input: {
  context: OrganicMemoryPromptContext
  retrieval: AlicizationMemoryCandidateRetrievalArtifact
  selectedCandidateIds: string[]
  reasonTags: string[]
}) {
  const continuityKey = normalizeText(input.context.memoryResolutionLedger?.dominantClusterId, 160)
    ?? input.selectedCandidateIds[0]
    ?? null

  if (!continuityKey && input.selectedCandidateIds.length === 0)
    return null

  return {
    selectedCandidateIds: input.selectedCandidateIds.slice(0, 8),
    continuityKey,
    reasonTags: compactList([
      continuityKey ? `cluster:${continuityKey}` : null,
      ...input.reasonTags,
      ...input.retrieval.candidates
        .filter(candidate => candidate.selected)
        .flatMap(candidate => candidate.ranking.reasons),
    ], 8, 120),
  }
}

export function buildAlicizationMemoryClosureTrace(input: {
  context: OrganicMemoryPromptContext
  retrieval: AlicizationMemoryCandidateRetrievalArtifact
  competition: AlicizationMemoryCandidateCompetitionArtifact
  deliberation: AlicizationMemoryDeliberationArtifact
  speechPosture: AlicizationMemorySpeechPostureArtifact
  settlement: AlicizationMemorySettlementArtifact
}): AlicizationMemoryClosureTrace {
  const authority = readPersonAuthority(input.context)
  const cadence = readRelationshipCadence(input.context)
  const whySurface: AlicizationMemoryClosureTrace['whySurface'] = []
  const selectedCandidates = input.retrieval.candidates
    .filter(candidate => candidate.selected)
    .sort((left, right) => right.ranking.finalScore - left.ranking.finalScore)
  const selectedCandidateSummary = selectedCandidates
    .map(candidate => candidate.summary)
    .find((summary): summary is string => Boolean(summary))
  const executionCarry = normalizeText(
    input.context.learningExecutionState?.lastCompletedSummary
    ?? input.context.learningExecutionState?.currentBlockedReason
    ?? input.context.learningExecutionState?.lastFailureReason
    ?? null,
    220,
  )
  const embodimentCadence = normalizeText(
    input.context.personStateProjection?.summary
    ?? null,
    240,
  )
  const preferredTiming = derivePreferredTiming(input)
  const initiativeRestraint = inferInitiativeRestraint(input)
  const initiativeReason = compactList([
    input.deliberation.followUp?.summary,
    cadence.summary,
    input.deliberation.inwardLine,
  ], 3, 180).join(' | ') || null
  const selectedCandidateIds = input.retrieval.selectedCandidateIds.slice(0, 16)
  const reasonTags = deriveReasonTags({
    context: input.context,
    settlement: input.settlement,
    competition: input.competition,
  })

  pushWhy({
    target: whySurface,
    source: 'personality',
    summary: normalizeText(authority?.authoritySummary, 240)
      ?? normalizeText(authority?.relationshipLine, 200)
      ?? normalizeText(input.context.personStateProjection?.relationshipDoctrine, 220)
      ?? normalizeText(input.context.personStateProjection?.summary, 220),
    reasonCodes: [
      ...readStringList(authority?.sourceTags, 8),
      input.context.coreIncarnation ? `core:${input.context.coreIncarnation}` : null,
    ],
  })
  pushWhy({
    target: whySurface,
    source: 'affective-residue',
    summary: input.context.affectiveResidue?.summary
      ?? cadence.summary,
    reasonCodes: [
      input.context.affectiveResidue?.dominantResidueKind ?? null,
      cadence.cadenceMode,
      cadence.distancePosture,
      cadence.shouldDelayWarmth ? 'delay-warmth' : null,
      cadence.shouldProtectRest ? 'protect-rest' : null,
    ],
  })
  pushWhy({
    target: whySurface,
    source: 'execution-feedback',
    summary: executionCarry,
    reasonCodes: [
      input.context.learningExecutionState?.lastCompletedAction ?? null,
      input.context.learningExecutionState?.nextLearningAction ?? null,
      input.context.learningExecutionState?.shouldVerify ? 'verify' : null,
      input.context.learningExecutionState?.shouldReflect ? 'reflect' : null,
    ],
  })
  pushWhy({
    target: whySurface,
    source: 'embodiment-cadence',
    summary: embodimentCadence,
    reasonCodes: compactList([
      inferPreferredVoiceMode(embodimentCadence) ? `voice:${inferPreferredVoiceMode(embodimentCadence)}` : null,
      inferPreferredLipsyncMode(embodimentCadence) ? `lipsync:${inferPreferredLipsyncMode(embodimentCadence)}` : null,
      inferPreferredGazeMode(embodimentCadence) ? `gaze:${inferPreferredGazeMode(embodimentCadence)}` : null,
    ], 5, 80),
  })
  pushWhy({
    target: whySurface,
    source: 'initiative',
    summary: initiativeReason,
    reasonCodes: [
      initiativeRestraint,
      preferredTiming,
      input.deliberation.followUp?.intrusionRisk ?? null,
    ],
  })
  pushWhy({
    target: whySurface,
    source: 'retrieval',
    summary: selectedCandidateSummary,
    reasonCodes: [
      `selected:${selectedCandidates.length}`,
      `candidates:${input.competition.candidateCount}`,
    ],
  })
  pushWhy({
    target: whySurface,
    source: 'settlement',
    summary: input.context.memoryResolutionLedger?.finalRationale
      ?? input.settlement.visibleMemoryGate.reasons.join(' | ')
      ?? null,
    reasonCodes: [
      input.settlement.visibleMemoryGate.status,
      input.settlement.closure.closureState ?? null,
      input.settlement.closure.visibleCarryMode ?? null,
      ...input.settlement.withheld,
    ],
  })

  return {
    version: 'memory-closure-trace-v1',
    authority: 'memory-os',
    whySurface,
    surfacePolicy: {
      gateStatus: input.settlement.visibleMemoryGate.status,
      mode: deriveSurfaceMode({ settlement: input.settlement }),
      timing: preferredTiming,
      speechMode: input.speechPosture.surfaceMode,
      placement: input.speechPosture.placement,
      certainty: input.speechPosture.certainty,
      reasons: compactList([
        ...input.settlement.visibleMemoryGate.reasons,
        ...input.settlement.withheld,
      ], 12, 120),
    },
    nextInfluence: {
      initiative: {
        restraint: initiativeRestraint,
        preferredTiming,
        pressure: [initiativeRestraint, initiativeReason, cadence.distancePosture]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .match(/lower-pressure|low-pressure|measured|protect-space/u)
          ? 'lower-pressure'
          : 'standard',
        reason: initiativeReason,
      },
      execution: {
        carry: executionCarry,
        nextLearningAction: input.context.learningExecutionState?.nextLearningAction ?? null,
        shouldVerify: input.context.learningExecutionState?.shouldVerify ?? false,
        shouldReflect: input.context.learningExecutionState?.shouldReflect ?? false,
        activeLearningFocuses: compactList(input.context.learningExecutionState?.activeLearningFocuses ?? [], 8, 120),
      },
      embodiment: {
        cadence: embodimentCadence,
        preferredVoiceMode: inferPreferredVoiceMode(embodimentCadence),
        preferredLipsyncMode: inferPreferredLipsyncMode(embodimentCadence),
        preferredGazeMode: inferPreferredGazeMode(embodimentCadence),
        reason: normalizeText(authority?.inwardLine, 220)
          ?? input.deliberation.inwardLine,
      },
    },
    closureState: {
      state: input.settlement.closure.closureState,
      open: deriveClosureOpen(input.settlement.closure.closureState),
      revisionRequired: deriveRevisionRequired({
        settlement: input.settlement,
        competition: input.competition,
      }),
      shouldLabelUncertainty: input.settlement.closure.shouldLabelUncertainty,
      visibleCarryMode: input.settlement.closure.visibleCarryMode,
      retrievalQuality: input.settlement.closure.retrievalQuality,
      conflictPressure: input.settlement.closure.conflictPressure,
    },
    selectedCandidateIds,
    memoryIdentity: deriveMemoryIdentity({
      context: input.context,
      retrieval: input.retrieval,
      selectedCandidateIds,
      reasonTags,
    }),
    reasonTags,
  }
}
