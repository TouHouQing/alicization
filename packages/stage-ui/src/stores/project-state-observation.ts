import type {
  AlicizationConversationTurnInput,
  AlicizationProjectStateContinuitySnapshot,
  AlicizationProjectStateObservation,
} from './alicization-bridge'

import { normalizeStructuredProjectStatePayload } from '../composables/alicization-structured-output'

type LegacyAwareObservedProjectState = AlicizationProjectStateObservation['projectState'] & {
  latestProgress?: string | null
  landedProgressSummary?: string | null
}

type ConversationTurnProjectStateRecord = Pick<
  AlicizationConversationTurnInput,
  'origin'
> & {
  turnId?: string | null
  sessionId: string
  structured?: Record<string, unknown> | null
}

function readOptionalText(value: unknown) {
  return typeof value === 'string' && value.trim()
    ? value.trim()
    : null
}

function readStructuredFact(
  value: unknown,
  allowedPrefixes: string[],
  maxLength: number,
) {
  const text = readOptionalText(value)
  if (!text || text.length > maxLength || text.includes('\n'))
    return null

  const normalized = text.toLowerCase()
  return allowedPrefixes.some(prefix => normalized.startsWith(`${prefix}=`))
    ? text
    : null
}

function resolveObservationLatestLandedProgress(
  projectState: AlicizationProjectStateObservation['projectState'] | null | undefined,
) {
  const legacyAwareProjectState = projectState as LegacyAwareObservedProjectState | null | undefined
  return readOptionalText(projectState?.latestLandedProgress)
    || readOptionalText(legacyAwareProjectState?.latestProgress)
    || readOptionalText(legacyAwareProjectState?.landedProgressSummary)
}

export function readConversationTurnProjectStateObservation(
  record: ConversationTurnProjectStateRecord,
): AlicizationProjectStateObservation | null {
  const structured = record.structured && typeof record.structured === 'object'
    ? record.structured
    : null
  const projectState = structured?.projectState && typeof structured.projectState === 'object'
    ? structured.projectState as Record<string, unknown>
    : null
  const normalizedProjectState = normalizeStructuredProjectStatePayload(projectState)
  if (!normalizedProjectState)
    return null
  const identity = readOptionalText(normalizedProjectState.identity)
    || readStructuredFact(projectState?.identity, ['identity', 'runtime_identity'], 180)
    || ''
  const currentPhase = readOptionalText(normalizedProjectState.currentPhase)
    || readStructuredFact(projectState?.currentPhase, ['runtime_context', 'phase_state'], 180)
    || ''
  const continuitySummary = readOptionalText(normalizedProjectState.continuitySummary)
    || readStructuredFact(projectState?.continuitySummary, ['source'], 320)

  return {
    turnId: record.turnId?.trim() || '',
    sessionId: record.sessionId,
    origin: record.origin === 'subconscious-proactive' ? 'subconscious-proactive' : 'user-turn',
    nonHumanAuthoredStatus: readOptionalText(structured?.nonHumanAuthoredStatus),
    preDialogueAwareness: null,
    preDialogueClosure: null,
    projectState: {
      identity,
      currentPhase,
      latestLandedProgress: normalizedProjectState.latestLandedProgress,
      primaryOpenLoop: normalizedProjectState.primaryOpenLoop,
      nextClosureTarget: normalizedProjectState.nextClosureTarget,
      continuitySummary,
      continuityRestraint: normalizedProjectState.continuityRestraint ?? null,
      continuityArcStage: null,
      continuityPreferredTiming: normalizedProjectState.continuityPreferredTiming ?? null,
      continuityCadence: normalizedProjectState.continuityCadence ?? null,
      continuityCue: null,
      sameHerSelfLine: null,
      sameHerHoldDetail: null,
      sameHerDriftRisk: null,
      proactiveSameHerGap: null,
    },
  }
}

export function projectStateObservationToContinuitySnapshot(
  observation: AlicizationProjectStateObservation | null | undefined,
): AlicizationProjectStateContinuitySnapshot | null {
  if (!observation)
    return null

  return {
    identity: readOptionalText(observation.projectState.identity),
    currentPhase: readOptionalText(observation.projectState.currentPhase),
    latestLandedProgress: resolveObservationLatestLandedProgress(observation.projectState),
    primaryOpenLoop: readOptionalText(observation.projectState.primaryOpenLoop),
    nextClosureTarget: readOptionalText(observation.projectState.nextClosureTarget),
    continuitySummary: readOptionalText(observation.projectState.continuitySummary),
    continuityRestraint: readOptionalText(observation.projectState.continuityRestraint),
    continuityArcStage: null,
    continuityPreferredTiming: readOptionalText(observation.projectState.continuityPreferredTiming),
    continuityCadence: readOptionalText(observation.projectState.continuityCadence),
    continuityCue: null,
    sameHerSelfLine: null,
    sameHerHoldDetail: null,
    sameHerDriftRisk: null,
    proactiveSameHerGap: null,
    emotionalClosureCue: null,
    preDialogueAwareness: null,
    preDialogueClosure: null,
    nonHumanAuthoredStatus: readOptionalText(observation.nonHumanAuthoredStatus),
    turnId: observation.turnId,
    sessionId: observation.sessionId,
    origin: observation.origin,
  }
}
