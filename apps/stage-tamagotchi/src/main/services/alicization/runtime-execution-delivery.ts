import type {
  AlicizationExecutionEventRecord,
  AlicizationHostPersonModelSnapshot,
  AlicizationTaskThreadRecord,
  CharacterPerformanceCapabilitiesManifest,
} from '../../../shared/eventa'
import type { AlicizationAgentTurnRuntime } from './agent-runtime'
import type { AlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'
import type {
  AlicizationPendingExecutionDeliveryProjectState,
  createAlicizationExecutionDeliveryRuntime,
} from './execution-delivery-runtime'
import type {
  AlicizationExecutionDeliveryReplySelection,
} from './execution-delivery-surface'
import type { AlicizationExecutionResultDeliveryPolicy } from './execution-interaction-learning'
import type { AlicizationPersonStateProjection } from './person-state-projection'
import type {
  AlicizationPersonalityContinuityStateSnapshot,
  AlicizationPersonalityRhythmStateSnapshot,
} from './personality-continuity-state'
import type {
  AlicizationMainGatewayGenerateTextProvider,
  AlicizationMainGatewaySource,
} from './project-state-gateway-contract'
import type { OrganicMemoryPromptContext } from './runtime-soul'
import type { AlicizationSelfContinuityAuthority } from './self-continuity-authority'
import type { AlicizationSelfRevisionStatePatch } from './self-evolution/state-revision-bus'

import {
  readHostPersonModelFromDerivedMindStateBundle,
  readKnowledgeEvidenceFromDerivedMindStateBundle,
  readPersonStateProjectionFromDerivedMindStateBundle,
  resolveProjectClosureSpeechEmbodimentBiasFromCue,
} from '@proj-alicization/stage-shared'

import { buildAlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'
import { deriveAlicizationDigitalLifeSpineFromSurface } from './digital-life-spine'
import { hasAlicizationExecutionDeliveryRetainedState } from './execution-delivery-runtime'
import {
  buildAlicizationExecutionPayoffDeterministicStructured,
  buildAlicizationExecutionPayoffPrompt,
  buildAlicizationExecutionPayoffStructuredReply,
  selectAlicizationExecutionDeliveryReply,
} from './execution-delivery-surface'
import { deriveExecutionResultDeliveryPolicy } from './execution-interaction-learning'
import {
  alicizationTerminalTaskThreadStatuses,
  readExecutionOutcome,
  readLatestExecutionEvent,
  readTaskThreadActivityAt,
  sanitizeExecutionLedgerText,
} from './execution-ledger-shared'
import { inferHostSocialContextsFromText } from './host-social-guidance'
import { buildMindEcologyFromRuntimeSurface } from './mind-ecology'
import { buildAlicizationPersonStateProjection } from './person-state-projection'
import {
  mergePreferredSelfContinuityAuthority,
  resolvePreferredPersonStateProjection,
  resolvePreferredSelfContinuityAuthority,
} from './person-state-projection-resolution'
import { buildAlicizationPersonalityContinuityState } from './personality-continuity-state'
import {
  buildAlicizationProjectStateExtraSystemBlocks,
  compactProjectLatestProgressForSystemBlock,
  isAlicizationThinProjectAwarenessLine,
  looksLikeThinProjectClosureShell,
  preferStrongerPersistedSameHerSelfLine,
  preferStrongerSameHerDriftRisk,
  resolveAlicizationProjectPreDialogueAwarenessLine,
  resolveAlicizationProjectStateBrief,
  resolveAlicizationProjectStatusBrief,
} from './project-state-brief'
import { resolvePreferredRuntimeSurface } from './runtime-surface-continuity-selection'
import { parseJsonObjectFromText } from './runtime-transport-content'
import { buildSelfContinuityAuthorityFromRuntimeSurface } from './self-continuity-authority'
import { buildAlicizationSelfEvolutionKernel } from './self-evolution-kernel'

const canonicalExecutionProjectStateCarryLine = 'Current Phase 1 project context. Some closure already landed. Unfinished closure still needs continuity.'

function normalizeExecutionDeliveryProjectBriefing(
  projectBriefing: unknown,
): AlicizationPendingExecutionDeliveryProjectState | null {
  if (!projectBriefing || typeof projectBriefing !== 'object' || Array.isArray(projectBriefing))
    return null

  const record = projectBriefing as Record<string, unknown>
  const normalized = {
    identity: sanitizeExecutionLedgerText(record.identity, 220) || null,
    currentPhase: sanitizeExecutionLedgerText(record.currentPhase, 220) || null,
    companionHeadlineLine: sanitizeExecutionLedgerText(record.companionHeadlineLine, 320) || null,
    companionBriefingLine: sanitizeExecutionLedgerText(record.companionBriefingLine, 320) || null,
    emotionalClosureSummary: sanitizeExecutionLedgerText(record.emotionalClosureSummary, 220) || null,
    continuityArcStage: sanitizeExecutionLedgerText(record.continuityArcStage, 120) || null,
    continuityRestraint: sanitizeExecutionLedgerText(record.continuityRestraint, 64) || null,
    continuityCue: sanitizeExecutionLedgerText(record.continuityCue, 220) || null,
    continuityPreferredTiming: sanitizeExecutionLedgerText(record.continuityPreferredTiming, 120) || null,
    continuityCadence: sanitizeExecutionLedgerText(record.continuityCadence, 120) || null,
    preferredBlinkCadence: sanitizeExecutionLedgerText(record.preferredBlinkCadence, 32) || null,
    preferredGazeMode: sanitizeExecutionLedgerText(record.preferredGazeMode, 32) || null,
    preferredPauseMode: sanitizeExecutionLedgerText(record.preferredPauseMode, 32) || null,
    preferredLipsyncMode: sanitizeExecutionLedgerText(record.preferredLipsyncMode, 32) || null,
    preferredVoiceMode: sanitizeExecutionLedgerText(record.preferredVoiceMode, 32) || null,
    preferredPacingMode: sanitizeExecutionLedgerText(record.preferredPacingMode, 32) || null,
    latestLandedProgress: sanitizeExecutionLedgerText(record.latestLandedProgress, 320) || null,
    latestProgress: sanitizeExecutionLedgerText(record.latestProgress, 320) || null,
    landedProgressSummary: sanitizeExecutionLedgerText(record.landedProgressSummary, 320) || null,
    primaryOpenLoop: sanitizeExecutionLedgerText(record.primaryOpenLoop, 320) || null,
    openClosureSummary: sanitizeExecutionLedgerText(record.openClosureSummary, 320) || null,
    nextClosureTarget: sanitizeExecutionLedgerText(record.nextClosureTarget, 320) || null,
    nextClosureTargetSummary: sanitizeExecutionLedgerText(record.nextClosureTargetSummary, 320) || null,
    sameHerSelfLine: sanitizeExecutionLedgerText(record.sameHerSelfLine, 220) || null,
    sameHerHoldDetail: sanitizeExecutionLedgerText(record.sameHerHoldDetail, 320) || null,
    sameHerDriftRisk: sanitizeExecutionLedgerText(record.sameHerDriftRisk, 320) || null,
    sameHerDriftRiskSummary: sanitizeExecutionLedgerText(record.sameHerDriftRiskSummary, 320) || null,
    preflightSummary: sanitizeExecutionLedgerText(record.preflightSummary, 320) || null,
    preDialogueAwarenessLine: sanitizeExecutionLedgerText(record.preDialogueAwarenessLine, 320) || null,
    preDialogueAwarenessSummary: sanitizeExecutionLedgerText(record.preDialogueAwarenessSummary, 320) || null,
  } satisfies AlicizationPendingExecutionDeliveryProjectState

  return Object.values(normalized).some(Boolean) ? normalized : null
}

function looksLikeThinExecutionDeliveryProjectIdentity(value: string | null | undefined) {
  const normalized = sanitizeExecutionLedgerText(value, 220)?.toLowerCase() ?? ''
  if (!normalized)
    return true

  return normalized === 'project'
    || normalized === 'digital life'
    || normalized === 'same digital life'
    || normalized === 'same digital life project'
    || normalized === 'this local-first digital life project'
    || (!normalized.includes('alicization') && !normalized.includes('local-first digital life'))
}

function looksLikeThinExecutionDeliveryProjectPhase(value: string | null | undefined) {
  const normalized = sanitizeExecutionLedgerText(value, 220)?.toLowerCase() ?? ''
  if (!normalized)
    return true

  return normalized === 'phase 1'
    || normalized === 'phase i'
    || !normalized.includes('phase 1')
}

function looksLikeThinExecutionDeliveryProjectPreflight(value: string | null | undefined) {
  const normalized = sanitizeExecutionLedgerText(value, 320)?.toLowerCase() ?? ''
  if (!normalized)
    return true

  return normalized === 'project'
    || normalized === 'phase 1'
    || isAlicizationThinProjectAwarenessLine(normalized)
    || /^identity=|^open=|^next=/u.test(normalized)
}

function looksLikeThinExecutionDeliveryProjectAwareness(value: string | null | undefined) {
  const normalized = sanitizeExecutionLedgerText(value, 320) ?? ''
  if (!normalized)
    return true

  const lowered = normalized.toLowerCase()
  return isAlicizationThinProjectAwarenessLine(normalized)
    || lowered === 'same digital life'
    || lowered === 'same digital life project'
    || lowered === 'same digital life | keep the closure seam explicit'
    || (!/alicization|local-first digital life|phase 1|same living line|continuous her|one living her/u.test(lowered))
}

function preferExecutionDeliveryProjectBriefingText(input: {
  current?: string | null
  candidate?: string | null
  isThin?: (value: string | null | undefined) => boolean
}) {
  const current = sanitizeExecutionLedgerText(input.current, 320) || ''
  const candidate = sanitizeExecutionLedgerText(input.candidate, 320) || ''

  if (!current)
    return candidate || null
  if (!candidate)
    return current || null
  if (current === candidate)
    return current

  const isThin = input.isThin
  if (isThin) {
    const currentThin = isThin(current)
    const candidateThin = isThin(candidate)
    if (currentThin && !candidateThin)
      return candidate
    if (candidateThin && !currentThin)
      return current
  }

  if (candidate.startsWith(current) && candidate.length >= current.length + 24)
    return candidate
  if (current.startsWith(candidate) && current.length >= candidate.length + 24)
    return current

  return candidate.length > current.length ? candidate : current
}

function mergeExecutionDeliveryProjectBriefingPair(input: {
  current: AlicizationPendingExecutionDeliveryProjectState
  candidate: AlicizationPendingExecutionDeliveryProjectState
}): AlicizationPendingExecutionDeliveryProjectState {
  return {
    identity: preferExecutionDeliveryProjectBriefingText({
      current: input.current.identity,
      candidate: input.candidate.identity,
      isThin: looksLikeThinExecutionDeliveryProjectIdentity,
    }),
    currentPhase: preferExecutionDeliveryProjectBriefingText({
      current: input.current.currentPhase,
      candidate: input.candidate.currentPhase,
      isThin: looksLikeThinExecutionDeliveryProjectPhase,
    }),
    companionHeadlineLine: preferExecutionDeliveryProjectBriefingText({
      current: input.current.companionHeadlineLine,
      candidate: input.candidate.companionHeadlineLine,
      isThin: looksLikeThinExecutionDeliveryProjectAwareness,
    }),
    companionBriefingLine: preferExecutionDeliveryProjectBriefingText({
      current: input.current.companionBriefingLine,
      candidate: input.candidate.companionBriefingLine,
      isThin: looksLikeThinExecutionDeliveryProjectAwareness,
    }),
    emotionalClosureSummary: preferExecutionDeliveryProjectBriefingText({
      current: input.current.emotionalClosureSummary,
      candidate: input.candidate.emotionalClosureSummary,
    }),
    continuityArcStage: preferExecutionDeliveryProjectBriefingText({
      current: input.current.continuityArcStage,
      candidate: input.candidate.continuityArcStage,
    }),
    continuityRestraint: preferExecutionDeliveryProjectBriefingText({
      current: input.current.continuityRestraint,
      candidate: input.candidate.continuityRestraint,
    }),
    continuityCue: preferExecutionDeliveryProjectBriefingText({
      current: input.current.continuityCue,
      candidate: input.candidate.continuityCue,
    }),
    continuityPreferredTiming: preferExecutionDeliveryProjectBriefingText({
      current: input.current.continuityPreferredTiming,
      candidate: input.candidate.continuityPreferredTiming,
    }),
    continuityCadence: preferExecutionDeliveryProjectBriefingText({
      current: input.current.continuityCadence,
      candidate: input.candidate.continuityCadence,
    }),
    preferredBlinkCadence: preferExecutionDeliveryProjectBriefingText({
      current: input.current.preferredBlinkCadence,
      candidate: input.candidate.preferredBlinkCadence,
    }),
    preferredGazeMode: preferExecutionDeliveryProjectBriefingText({
      current: input.current.preferredGazeMode,
      candidate: input.candidate.preferredGazeMode,
    }),
    preferredPauseMode: preferExecutionDeliveryProjectBriefingText({
      current: input.current.preferredPauseMode,
      candidate: input.candidate.preferredPauseMode,
    }),
    preferredLipsyncMode: preferExecutionDeliveryProjectBriefingText({
      current: input.current.preferredLipsyncMode,
      candidate: input.candidate.preferredLipsyncMode,
    }),
    preferredVoiceMode: preferExecutionDeliveryProjectBriefingText({
      current: input.current.preferredVoiceMode,
      candidate: input.candidate.preferredVoiceMode,
    }),
    preferredPacingMode: preferExecutionDeliveryProjectBriefingText({
      current: input.current.preferredPacingMode,
      candidate: input.candidate.preferredPacingMode,
    }),
    latestLandedProgress: preferExecutionDeliveryProjectBriefingText({
      current: input.current.latestLandedProgress,
      candidate: input.candidate.latestLandedProgress,
      isThin: value => looksLikeThinProjectClosureShell(value, 'landed'),
    }),
    latestProgress: preferExecutionDeliveryProjectBriefingText({
      current: input.current.latestProgress,
      candidate: input.candidate.latestProgress,
      isThin: value => looksLikeThinProjectClosureShell(value, 'landed'),
    }),
    landedProgressSummary: preferExecutionDeliveryProjectBriefingText({
      current: input.current.landedProgressSummary,
      candidate: input.candidate.landedProgressSummary,
      isThin: value => looksLikeThinProjectClosureShell(value, 'landed'),
    }),
    primaryOpenLoop: preferExecutionDeliveryProjectBriefingText({
      current: input.current.primaryOpenLoop,
      candidate: input.candidate.primaryOpenLoop,
      isThin: value => looksLikeThinProjectClosureShell(value, 'open'),
    }),
    openClosureSummary: preferExecutionDeliveryProjectBriefingText({
      current: input.current.openClosureSummary,
      candidate: input.candidate.openClosureSummary,
      isThin: value => looksLikeThinProjectClosureShell(value, 'open'),
    }),
    nextClosureTarget: preferExecutionDeliveryProjectBriefingText({
      current: input.current.nextClosureTarget,
      candidate: input.candidate.nextClosureTarget,
      isThin: value => looksLikeThinProjectClosureShell(value, 'next'),
    }),
    nextClosureTargetSummary: preferExecutionDeliveryProjectBriefingText({
      current: input.current.nextClosureTargetSummary,
      candidate: input.candidate.nextClosureTargetSummary,
      isThin: value => looksLikeThinProjectClosureShell(value, 'next'),
    }),
    sameHerSelfLine: preferStrongerPersistedSameHerSelfLine({
      current: input.current.sameHerSelfLine,
      candidate: input.candidate.sameHerSelfLine,
    }) || null,
    sameHerHoldDetail: preferExecutionDeliveryProjectBriefingText({
      current: input.current.sameHerHoldDetail,
      candidate: input.candidate.sameHerHoldDetail,
    }),
    sameHerDriftRisk: preferStrongerSameHerDriftRisk({
      current: input.current.sameHerDriftRisk,
      candidate: input.candidate.sameHerDriftRisk,
    }) || null,
    sameHerDriftRiskSummary: preferStrongerSameHerDriftRisk({
      current: input.current.sameHerDriftRiskSummary,
      candidate: input.candidate.sameHerDriftRiskSummary,
    }) || null,
    preflightSummary: preferExecutionDeliveryProjectBriefingText({
      current: input.current.preflightSummary,
      candidate: input.candidate.preflightSummary,
      isThin: looksLikeThinExecutionDeliveryProjectPreflight,
    }),
    preDialogueAwarenessLine: preferExecutionDeliveryProjectBriefingText({
      current: input.current.preDialogueAwarenessLine,
      candidate: input.candidate.preDialogueAwarenessLine,
      isThin: looksLikeThinExecutionDeliveryProjectAwareness,
    }),
    preDialogueAwarenessSummary: preferExecutionDeliveryProjectBriefingText({
      current: input.current.preDialogueAwarenessSummary,
      candidate: input.candidate.preDialogueAwarenessSummary,
      isThin: looksLikeThinExecutionDeliveryProjectAwareness,
    }),
  }
}

function mergeExecutionDeliveryProjectBriefings(
  ...briefings: Array<AlicizationPendingExecutionDeliveryProjectState | null | undefined>
) {
  let merged: AlicizationPendingExecutionDeliveryProjectState | null = null

  for (const briefing of briefings) {
    if (!briefing)
      continue
    merged = merged
      ? mergeExecutionDeliveryProjectBriefingPair({
          current: merged,
          candidate: briefing,
        })
      : briefing
  }

  return merged && Object.values(merged).some(Boolean) ? merged : null
}

function buildExecutionCallbackProjectSelfBriefSystemBlock(
  projectState?: AlicizationPendingExecutionDeliveryProjectState | null,
  personStateProjection?: AlicizationPersonStateProjection | null,
) {
  const canonicalBrief = resolveAlicizationProjectStateBrief()
  const brief = {
    ...canonicalBrief,
    identity: sanitizeExecutionLedgerText(projectState?.identity, 220) || canonicalBrief.identity,
    currentPhase: sanitizeExecutionLedgerText(projectState?.currentPhase, 220) || canonicalBrief.currentPhase,
    latestProgress: sanitizeExecutionLedgerText(
      projectState?.latestLandedProgress
      ?? projectState?.latestProgress
      ?? projectState?.landedProgressSummary,
      320,
    ) || canonicalBrief.latestProgress,
    openLoops: [
      sanitizeExecutionLedgerText(
        projectState?.primaryOpenLoop
        ?? projectState?.openClosureSummary,
        320,
      ) || canonicalBrief.openLoops[0] || null,
    ],
    nextClosureTarget: sanitizeExecutionLedgerText(
      projectState?.nextClosureTarget
      ?? projectState?.nextClosureTargetSummary,
      320,
    ) || canonicalBrief.nextClosureTarget,
    sameHerSelfLine: sanitizeExecutionLedgerText(projectState?.sameHerSelfLine, 220) || canonicalBrief.sameHerSelfLine,
    sameHerDriftRisk: sanitizeExecutionLedgerText(
      projectState?.sameHerDriftRisk
      ?? projectState?.sameHerDriftRiskSummary,
      320,
    ) || canonicalBrief.sameHerDriftRisk,
    preflightSummary: sanitizeExecutionLedgerText(projectState?.preflightSummary, 320) || canonicalBrief.preflightSummary,
    preDialogueAwarenessLine: sanitizeExecutionLedgerText(
      projectState?.preDialogueAwarenessLine
      ?? projectState?.preDialogueAwarenessSummary,
      320,
    ) || canonicalBrief.preDialogueAwarenessLine,
  }
  const status = resolveAlicizationProjectStatusBrief()
  const companionHeadline = sanitizeExecutionLedgerText(projectState?.companionHeadlineLine, 320)
    || status.companionHeadlineLine
    || null
  const preDialogueAwareness = resolveAlicizationProjectPreDialogueAwarenessLine({
    runtimeProjectState: {
      preDialogueAwarenessLine: brief.preDialogueAwarenessLine,
      companionHeadlineLine: companionHeadline,
      companionBriefingLine: status.companionBriefingLine,
      preflightSummary: brief.preflightSummary,
    },
  })
  const companionBriefing = sanitizeExecutionLedgerText(projectState?.companionBriefingLine, 320)
    || status.companionBriefingLine
    || null
  const emotionalClosureSummary = sanitizeExecutionLedgerText(projectState?.emotionalClosureSummary, 220) || null
  const continuityCue = sanitizeExecutionLedgerText(projectState?.continuityCue, 220) || null
  const continuityPreferredTiming = sanitizeExecutionLedgerText(projectState?.continuityPreferredTiming, 120) || null
  const continuityCadence = sanitizeExecutionLedgerText(projectState?.continuityCadence, 120) || null
  const closureEmbodimentBias = resolveProjectClosureSpeechEmbodimentBiasFromCue(
    emotionalClosureSummary
    || continuityCue
    || continuityCadence
    || null,
  )
  const projectionEmbodimentFallback = (() => {
    const repairPosture = personStateProjection?.personalityContinuityState?.repairPosture ?? null
    const relationshipPosture = personStateProjection?.relationshipPosture ?? null
    const preferredProactiveStyle = personStateProjection?.preferredProactiveStyle ?? null
    const residentMode = repairPosture === 'repair-first'
      ? 'repair-before-closeness'
      : relationshipPosture === 'restrained' || preferredProactiveStyle === 'silent-observe'
        ? 'measured-return'
        : null

    if (!residentMode)
      return null

    return {
      residentMode,
      preferredBlinkCadence: residentMode === 'repair-before-closeness' ? 'quiet' : 'linger',
      preferredGazeMode: 'soften',
      preferredPauseMode: 'longer',
      preferredLipsyncMode: 'restrained',
      preferredVoiceMode: 'lower-pressure',
      preferredPacingMode: 'slower',
    } as const
  })()
  const preferredBlinkCadence = sanitizeExecutionLedgerText(projectState?.preferredBlinkCadence, 32)
    || projectionEmbodimentFallback?.preferredBlinkCadence
    || null
  const preferredGazeMode = sanitizeExecutionLedgerText(projectState?.preferredGazeMode, 32)
    || projectionEmbodimentFallback?.preferredGazeMode
    || null
  const preferredPauseMode = sanitizeExecutionLedgerText(projectState?.preferredPauseMode, 32)
    || projectionEmbodimentFallback?.preferredPauseMode
    || closureEmbodimentBias?.preferredPauseMode
    || null
  const preferredLipsyncMode = sanitizeExecutionLedgerText(projectState?.preferredLipsyncMode, 32)
    || projectionEmbodimentFallback?.preferredLipsyncMode
    || closureEmbodimentBias?.preferredLipsyncMode
    || null
  const preferredVoiceMode = sanitizeExecutionLedgerText(projectState?.preferredVoiceMode, 32)
    || projectionEmbodimentFallback?.preferredVoiceMode
    || null
  const preferredPacingMode = sanitizeExecutionLedgerText(projectState?.preferredPacingMode, 32)
    || projectionEmbodimentFallback?.preferredPacingMode
    || null

  return [
    '[ALICIZATION_EXECUTION_CALLBACK_SELF_BRIEF]',
    `project_identity=${brief.identity ?? 'none'}`,
    `current_phase=${brief.currentPhase ?? 'none'}`,
    `pre_dialogue_awareness=${preDialogueAwareness ?? brief.preflightSummary ?? 'none'}`,
    `project_companion_headline=${companionHeadline ?? 'none'}`,
    `project_companion_briefing=${companionBriefing ?? 'none'}`,
    `emotional_closure_summary=${emotionalClosureSummary ?? 'none'}`,
    `continuity_cue=${continuityCue ?? 'none'}`,
    `continuity_preferred_timing=${continuityPreferredTiming ?? 'none'}`,
    `continuity_cadence=${continuityCadence ?? 'none'}`,
    `preferred_blink_cadence=${preferredBlinkCadence ?? 'none'}`,
    `preferred_gaze_mode=${preferredGazeMode ?? 'none'}`,
    `preferred_pause_mode=${preferredPauseMode ?? 'none'}`,
    `preferred_lipsync_mode=${preferredLipsyncMode ?? 'none'}`,
    `preferred_voice_mode=${preferredVoiceMode ?? 'none'}`,
    `preferred_pacing_mode=${preferredPacingMode ?? 'none'}`,
    `same_her_line=${brief.sameHerSelfLine ?? canonicalExecutionProjectStateCarryLine}`,
    `latest_landed_progress=${brief.latestProgress ?? 'none'}`,
    `primary_open_loop=${brief.openLoops[0] ?? 'none'}`,
    `next_closure_target=${brief.nextClosureTarget ?? 'none'}`,
    `same_her_drift_risk=${brief.sameHerDriftRisk ?? 'none'}`,
    'Execution callback delivery must stay inside the current Alicization project context, the Phase 1 proving ground, and the still-open closure work.',
    'Do not let execution callback delivery collapse into a detached result notice, a utility-status shell, or a generic assistant completion broadcast.',
  ].join('\n')
}

function readThreadExecutionDeliveryProjectState(
  thread: AlicizationTaskThreadRecord,
): AlicizationPendingExecutionDeliveryProjectState | null {
  const metadata = thread.metadata && typeof thread.metadata === 'object' && !Array.isArray(thread.metadata)
    ? thread.metadata as {
      execution?: {
        runtimeContext?: {
          projectBriefing?: {
            currentPhase?: unknown
            identity?: unknown
            latestLandedProgress?: unknown
            latestProgress?: unknown
            landedProgressSummary?: unknown
            nextClosureTarget?: unknown
            nextClosureTargetSummary?: unknown
            preDialogueAwarenessLine?: unknown
            preDialogueAwarenessSummary?: unknown
            preflightSummary?: unknown
            companionHeadlineLine?: unknown
            companionBriefingLine?: unknown
            emotionalClosureSummary?: unknown
            continuityCue?: unknown
            continuityPreferredTiming?: unknown
            continuityCadence?: unknown
            preferredBlinkCadence?: unknown
            preferredGazeMode?: unknown
            preferredVoiceMode?: unknown
            preferredPacingMode?: unknown
            primaryOpenLoop?: unknown
            openClosureSummary?: unknown
            sameHerDriftRisk?: unknown
            sameHerDriftRiskSummary?: unknown
            sameHerHoldDetail?: unknown
            sameHerSelfLine?: unknown
          } | null
        } | null
      } | null
    }
    : null
  return normalizeExecutionDeliveryProjectBriefing(metadata?.execution?.runtimeContext?.projectBriefing)
}

function readExecutionDeliveryPayloadObject(payload: unknown) {
  return payload && typeof payload === 'object' && !Array.isArray(payload)
    ? payload as Record<string, unknown>
    : null
}

function readExecutionDeliveryBooleanOrNull(raw: unknown) {
  if (raw === true || raw === false)
    return raw
  return null
}

function readExecutionDeliveryStringArray(raw: unknown) {
  if (!Array.isArray(raw))
    return []
  return raw
    .map(value => sanitizeExecutionLedgerText(value, 80))
    .filter(Boolean)
}

type AlicizationExecutionDeliveryEventSnapshot = Pick<
  AlicizationExecutionEventRecord,
  'createdAt' | 'kind' | 'payload'
>

function buildExecutionDeliverySafetyGateHoldDetail(
  events: AlicizationExecutionDeliveryEventSnapshot[] | null | undefined,
) {
  const latestEvent = readLatestExecutionEvent(events ?? [])
  const payload = readExecutionDeliveryPayloadObject(latestEvent?.payload)
  const safetyGate = readExecutionDeliveryPayloadObject(payload?.safetyGate)
  if (!safetyGate)
    return null

  const effect = sanitizeExecutionLedgerText(safetyGate.effect, 80) || null
  const permissionMode = sanitizeExecutionLedgerText(safetyGate.permissionMode, 80) || null
  const confirmationRequired = readExecutionDeliveryBooleanOrNull(safetyGate.confirmationRequired)
  const riskPolicy = sanitizeExecutionLedgerText(safetyGate.riskPolicy, 120) || null
  const auditability = sanitizeExecutionLedgerText(safetyGate.auditability, 80) || null
  const interruptibility = sanitizeExecutionLedgerText(safetyGate.interruptibility, 80) || null
  const isBlockedBeforeDispatch = auditability === 'blocked-before-dispatch'
    || interruptibility === 'no-process-started'
    || (confirmationRequired === true && permissionMode === 'none')
  if (!isBlockedBeforeDispatch)
    return null

  return sanitizeExecutionLedgerText([
    'blocked-dispatch safety gate says',
    confirmationRequired === true
      ? 'confirmation=required'
      : confirmationRequired === false
        ? 'confirmation=not-required'
        : '',
    permissionMode ? `permission=${permissionMode}` : '',
    riskPolicy ? `risk=${riskPolicy}` : '',
    auditability ? `audit=${auditability}` : '',
    interruptibility ? `interrupt=${interruptibility}` : '',
    effect ? `effect=${effect}` : '',
    'before another execution-shaped opening.',
  ].filter(Boolean).join(' '), 320) || null
}

function buildExecutionDeliveryResumeConfirmationHoldDetail(
  events: AlicizationExecutionDeliveryEventSnapshot[] | null | undefined,
) {
  const latestResumeEvent = readLatestExecutionEvent(events ?? [], ['resume'])
  const payload = readExecutionDeliveryPayloadObject(latestResumeEvent?.payload)
  if (!payload)
    return null

  const approval = sanitizeExecutionLedgerText(payload.approval, 80) || null
  const confirmationBoundary = sanitizeExecutionLedgerText(payload.confirmationBoundary, 120) || null
  const auditability = sanitizeExecutionLedgerText(payload.auditability, 80) || null
  const interruptibility = sanitizeExecutionLedgerText(payload.interruptibility, 80) || null
  const affirmationReasonCodes = readExecutionDeliveryStringArray(payload.affirmationReasonCodes)
  const isHostConfirmedBeforeRedispatch = approval === 'host-confirmed'
    || confirmationBoundary === 'host-confirmed-before-redispatch'
    || auditability === 'resume-before-dispatch'
    || interruptibility === 'process-not-yet-restarted'
  if (!isHostConfirmedBeforeRedispatch)
    return null

  return sanitizeExecutionLedgerText([
    'execution-resume-confirmation',
    approval ? `approval=${approval}` : '',
    confirmationBoundary ? `confirmation=${confirmationBoundary}` : '',
    auditability ? `audit=${auditability}` : '',
    interruptibility ? `interrupt=${interruptibility}` : '',
    affirmationReasonCodes.length > 0 ? `affirmation=${affirmationReasonCodes.join(',')}` : '',
    'Keep this as a bounded confirmation boundary before another execution-shaped opening.',
  ].filter(Boolean).join(' '), 320) || null
}

function readExecutionDeliveryProjectBriefingFromLatestEvent(
  events: AlicizationExecutionDeliveryEventSnapshot[] | null | undefined,
) {
  const latestEvent = readLatestExecutionEvent(events ?? [])
  const payload = readExecutionDeliveryPayloadObject(latestEvent?.payload)
  const runtimeContext = readExecutionDeliveryPayloadObject(payload?.runtimeContext)
  return normalizeExecutionDeliveryProjectBriefing(runtimeContext?.projectBriefing)
}

function readExecutionDeliveryProjectBriefingFromResumeEvent(
  events: AlicizationExecutionDeliveryEventSnapshot[] | null | undefined,
) {
  const latestResumeEvent = readLatestExecutionEvent(events ?? [], ['resume'])
  const payload = readExecutionDeliveryPayloadObject(latestResumeEvent?.payload)
  if (!payload)
    return null

  return normalizeExecutionDeliveryProjectBriefing({
    identity: payload.projectIdentity,
    currentPhase: payload.projectPhase,
    latestLandedProgress: payload.latestLandedProgress,
    primaryOpenLoop: payload.primaryOpenLoop,
    nextClosureTarget: payload.nextClosureTarget,
    sameHerSelfLine: payload.sameHerLine,
    sameHerHoldDetail: payload.projectSameHerHoldDetail,
    sameHerDriftRisk: payload.sameHerDriftRisk,
    proactiveSameHerGap: payload.proactiveSameHerGap,
    preflightSummary: payload.projectPreflight,
    preDialogueAwarenessLine: payload.projectAwareness,
    companionBriefingLine: payload.projectCompanionBriefing,
    emotionalClosureSummary: payload.projectEmotionalClosure,
    continuityArcStage: payload.projectContinuityArcStage,
    continuityRestraint: payload.projectContinuityRestraint,
    continuityCue: payload.projectContinuityCue,
    continuityPreferredTiming: payload.projectContinuityPreferredTiming,
    continuityCadence: payload.projectContinuityCadence,
    preferredBlinkCadence: payload.projectBlinkCadence,
    preferredGazeMode: payload.projectGazeMode,
    preferredPauseMode: payload.projectPauseMode,
    preferredLipsyncMode: payload.projectLipsyncMode,
    preferredVoiceMode: payload.projectVoiceMode,
    preferredPacingMode: payload.projectPacingMode,
  })
}

function executionDeliveryHoldDetailAlreadyCarried(existing: string | null | undefined, candidate: string) {
  const normalizedExisting = sanitizeExecutionLedgerText(existing, 320).toLowerCase()
  if (!normalizedExisting)
    return false

  if (/execution-resume-confirmation|host-confirmed-before-redispatch|resume-before-dispatch|process-not-yet-restarted/iu.test(candidate)) {
    return /execution-resume-confirmation|host-confirmed-before-redispatch|resume-before-dispatch|process-not-yet-restarted/iu.test(normalizedExisting)
  }

  if (/blocked-dispatch|blocked before dispatch|blocked-before-dispatch|confirmation=required|no-process-started/iu.test(candidate)) {
    return /blocked-dispatch|blocked before dispatch|blocked-before-dispatch|confirmation=required|no-process-started/iu.test(normalizedExisting)
  }

  return normalizedExisting.includes(candidate.toLowerCase())
}

function mergeExecutionDeliveryProjectState(input: {
  threadProjectState: AlicizationPendingExecutionDeliveryProjectState | null
  events: AlicizationExecutionDeliveryEventSnapshot[]
}) {
  const mergedProjectBriefing = mergeExecutionDeliveryProjectBriefings(
    input.threadProjectState,
    readExecutionDeliveryProjectBriefingFromResumeEvent(input.events),
    readExecutionDeliveryProjectBriefingFromLatestEvent(input.events),
  )
  const eventHoldDetails = [
    buildExecutionDeliverySafetyGateHoldDetail(input.events),
    buildExecutionDeliveryResumeConfirmationHoldDetail(input.events),
  ].filter((value, index, list): value is string => Boolean(value) && list.indexOf(value) === index)
  if (eventHoldDetails.length === 0)
    return mergedProjectBriefing

  const existingHoldDetail = sanitizeExecutionLedgerText(mergedProjectBriefing?.sameHerHoldDetail, 320) || null
  const missingEventHoldDetails = eventHoldDetails.filter(candidate => !executionDeliveryHoldDetailAlreadyCarried(existingHoldDetail, candidate))
  const mergedHoldDetail = missingEventHoldDetails.length === 0
    ? existingHoldDetail
    : sanitizeExecutionLedgerText(
      [...missingEventHoldDetails, existingHoldDetail]
        .filter((value, index, list): value is string => Boolean(value) && list.indexOf(value) === index)
        .join(' '),
      320,
    ) || missingEventHoldDetails[0]

  const mergedProjectState = {
    ...mergedProjectBriefing,
    sameHerHoldDetail: mergedHoldDetail,
  } satisfies AlicizationPendingExecutionDeliveryProjectState

  return Object.values(mergedProjectState).some(Boolean) ? mergedProjectState : null
}

interface CreateAlicizationRuntimeExecutionDeliveryOptions {
  getActiveCardId: () => string
  normalizeCardId: (raw: unknown) => string
  normalizeSessionId: (raw: unknown) => string
  withCardScope: <T>(nextCardIdRaw: unknown, task: () => Promise<T>, options?: {
    label?: string
    skipQueueWhenScopeAlreadyActive?: boolean
  }) => Promise<T>
  queueSubconsciousWake: (cardIdRaw: unknown, reason: string, delayMs?: number) => void
  appendAuditLog: (input: any, cardId?: string) => Promise<void>
  syncSessionMirrorFromCurrentCardState: (input: {
    cardId: string
    decisionTraceId?: string | null
    sessionId?: string | null
    source: string
    turnId?: string | null
    taskThread?: AlicizationTaskThreadRecord | null
  }) => Promise<void>
  alicizationDb: {
    getMetaValue: (key: string) => Promise<string | undefined>
    setMetaValue: (key: string, value: string) => Promise<void>
    listExecutionEvents: (input: { threadId: string, limit?: number }) => Promise<any[]>
  }
  executionDeliveryRuntime: ReturnType<typeof createAlicizationExecutionDeliveryRuntime>
  executionDeliveryStateMetaKey: string
  generateMainGatewayText: AlicizationMainGatewayGenerateTextProvider<
    Extract<AlicizationMainGatewaySource, 'execution-callback'>,
    string,
    {
      cardId?: string
      extraSystemBlocks?: string[]
      injectCustomDirectives?: boolean
      injectPerformanceManifest?: boolean
      agentTurn?: AlicizationAgentTurnRuntime | null
      agentTurnInput?: {
        turnId: string
        decisionTraceId?: string | null
      }
      captureAgentSensorySnapshot?: boolean
      digitalLifeRuntimeSurface?: AlicizationDigitalLifeRuntimeSurface | null
    }
  >
  getPerformanceManifest: () => Promise<CharacterPerformanceCapabilitiesManifest | null>
  normalizeAlicizationEmotion: (raw: unknown) => { emotion: string, downgraded: boolean }
  normalizeAlicizationPerformancePayload: (raw: unknown, emotion: any) => any
  clampAlicizationPerformancePayloadToManifest: (payload: any, manifest: CharacterPerformanceCapabilitiesManifest | null, emotion: any) => any
  ensureVisualPresenceState: (cardIdRaw: unknown) => Promise<any>
  buildHostPersonModel: (input?: { now?: number }) => Promise<AlicizationHostPersonModelSnapshot | null>
  getActiveSelfRevisionStatePatch?: () => Promise<AlicizationSelfRevisionStatePatch | null>
  getActiveSelfEvolutionCandidateId?: () => Promise<string | null>
}

function formatExecutionDeliveryStatus(status: AlicizationTaskThreadRecord['status']) {
  if (status === 'completed')
    return 'completed'
  if (status === 'cancelled')
    return 'cancelled'
  if (status === 'blocked')
    return 'blocked'
  return 'failed'
}

function inferExecutionPersonStateContexts(goal: string | null | undefined) {
  return inferHostSocialContextsFromText(goal ?? '', ['execution-callback', 'execution'])
}

function buildLowPressureExecutionCallbackRhythmState(): AlicizationPersonalityRhythmStateSnapshot {
  return {
    cadenceMode: 'cooldown',
    restMode: 'low-pressure',
    embodiedPresence: null,
    suggestedStyle: 'silent-observe',
    moodLabel: 'callback-line-settling',
    emotionalTension: 'focused-flow',
    cadencePressure: 0.38,
    restPressure: 0.64,
    memoryResonance: 0.68,
    companionshipTempo: 0.34,
    summary: 'Execution callback continuity stays low-pressure while the current context settles.',
    rationale: [
      'execution-callback',
      'same-her-continuity',
      'lower-pressure-return',
    ],
  }
}

function buildLowPressureExecutionCallbackContinuityState(input: {
  continuitySummary: string
}): AlicizationPersonalityContinuityStateSnapshot {
  const base = buildAlicizationPersonalityContinuityState({
    now: Date.now(),
  })

  return {
    ...base,
    trustStage: 'cautious-open',
    currentRegime: 'execution-callback',
    closenessPosture: 'space-first',
    repairPosture: 'repair-first',
    autonomyPosture: 'protect-space',
    cadenceProfile: 'slow-return',
    energyProfile: 'steady',
    continuitySummary: input.continuitySummary.slice(0, 220),
    rhythmState: buildLowPressureExecutionCallbackRhythmState(),
    trustMeaning: base.trustMeaning ?? 'Trust holds when callback timing stays lower-pressure before closeness widens.',
    reconsolidationLine: base.reconsolidationLine ?? 'Execution callback return stays in the current reply context.',
    selfLine: base.selfLine ?? canonicalExecutionProjectStateCarryLine,
    relationLine: base.relationLine ?? 'Leave room before widening callback closeness again.',
    rationale: [
      ...base.rationale,
      'execution-callback',
      'same-her-baseline',
      'lower-pressure-return',
    ],
  }
}

function carriesStrongerSameHerContinuity(projection: AlicizationPersonStateProjection | null | undefined) {
  return Boolean(
    projection
    && (
      projection.restrained
      || /lower-pressure|same-her|steadiness before closeness/i.test([
        projection.openingGuidance,
        projection.relationshipDoctrine,
        projection.summary,
        projection.trustRationale,
      ]
        .filter(Boolean)
        .join(' '))
    ),
  )
}

function shouldClampExecutionCallbackDeliveryToLowerPressure(input: {
  projection: AlicizationPersonStateProjection | null | undefined
  selfContinuityAuthority?: AlicizationSelfContinuityAuthority | null
}) {
  const projection = input.projection
  const authority = input.selfContinuityAuthority
  const combined = [
    projection?.openingGuidance,
    projection?.manifestationCadenceSummary,
    projection?.trustRationale,
    projection?.relationshipDoctrine,
    authority?.relationshipLine,
    authority?.habitLine,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  return (
    projection?.activeClosenessContext === 'execution-callback'
    && /lower-pressure|leave room|same-her baseline|measured|slower than|space-first/u.test(combined)
  )
}

function clampExecutionCallbackDeliveryCadence(input: {
  delivery: string
  projection: AlicizationPersonStateProjection | null | undefined
  selfContinuityAuthority?: AlicizationSelfContinuityAuthority | null
}) {
  if (!shouldClampExecutionCallbackDeliveryToLowerPressure(input))
    return input.delivery
  if (input.delivery === 'firm' || input.delivery === 'gentle')
    return 'calm'
  return input.delivery
}

function applyTruthFirstRelationshipDoctrineToProjection(input: {
  projection: AlicizationPersonStateProjection | null | undefined
  selfContinuityAuthority?: AlicizationSelfContinuityAuthority | null
}) {
  const projection = input.projection
  if (!projection)
    return projection ?? null

  const projectState = resolveAlicizationProjectStateBrief()
  const openFocus = (() => {
    const normalized = (projectState.primaryOpenLoop ?? '').toLowerCase()
    if (!normalized)
      return null

    const focus: string[] = []
    if (normalized.includes('memory'))
      focus.push('memory')
    if (normalized.includes('initiative'))
      focus.push('initiative')
    if (normalized.includes('embodiment'))
      focus.push('embodiment')
    if (normalized.includes('same-her') || normalized.includes('same living line'))
      focus.push('same-line')
    if (normalized.includes('closure seam'))
      focus.push('closure-seam')
    return focus.length > 0 ? focus.join('/') : null
  })()
  const nextFocus = (() => {
    const normalized = (projectState.nextClosureTarget ?? '').toLowerCase()
    if (!normalized)
      return null

    const focus: string[] = []
    if (normalized.includes('project identity carry'))
      focus.push('project-carry')
    if (normalized.includes('phase 1'))
      focus.push('phase-1')
    if (normalized.includes('measured-return'))
      focus.push('measured-return')
    if (normalized.includes('same living line') || normalized.includes('same-her'))
      focus.push('same-line')
    if (normalized.includes('initiative'))
      focus.push('initiative')
    if (normalized.includes('embodiment'))
      focus.push('embodiment')
    return focus.length > 0 ? focus.join('/') : null
  })()
  const shouldCarryProjectFocus = (projection.contexts ?? []).includes('project-state-carry')
    || /same-her baseline|same phase 1 digital life|project-state closure/u.test([
      projection.openingGuidance,
      projection.summary,
      projection.manifestationCadenceSummary,
    ].filter(Boolean).join(' '))

  const openingGuidance = shouldCarryProjectFocus
    ? [
        projection.openingGuidance,
        openFocus ? `Keep open focus=${openFocus}.` : '',
        nextFocus ? `Keep next focus=${nextFocus}.` : '',
      ].filter(Boolean).join(' ')
    : projection.openingGuidance
  const summary = shouldCarryProjectFocus
    ? [
        projection.summary,
        openFocus ? `open_focus=${openFocus}` : '',
        nextFocus ? `next_focus=${nextFocus}` : '',
      ].filter(Boolean).join(' | ').slice(0, 520)
    : projection.summary

  const selfLine = typeof input.selfContinuityAuthority?.selfLine === 'string'
    ? input.selfContinuityAuthority.selfLine.trim()
    : ''
  const relationshipLine = typeof input.selfContinuityAuthority?.relationshipLine === 'string'
    ? input.selfContinuityAuthority.relationshipLine.trim()
    : ''

  if (!/repair truth|truth/u.test(selfLine) || !/closeness outrun truth/u.test(relationshipLine)) {
    return {
      ...projection,
      openingGuidance,
      summary,
    }
  }

  return {
    ...projection,
    openingGuidance,
    summary,
    relationshipDoctrine: `Repair truth before flourish. ${relationshipLine}`,
  }
}

function activeSameHerContinuityShouldOverride(input: {
  projection: AlicizationPersonStateProjection | null | undefined
  activeSelfRevisionPatch: AlicizationSelfRevisionStatePatch | null
}) {
  const patch = input.activeSelfRevisionPatch
  if (!patch)
    return false
  if (carriesStrongerSameHerContinuity(input.projection))
    return false

  const summary = [
    patch.summary,
    ...patch.reasonCodes,
    ...patch.lanes,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  return (
    /same-her|lower-pressure|slower than|steadiness before closeness|bounded-return|measured-return|reconfirmation|repair-before-closeness|repair first|let repair settle/i.test(summary)
    || patch.relationshipPosture.closenessCapBias >= 0.18
    || patch.relationshipPosture.repairWindowBias >= 0.16
    || patch.proactivePolicy.restraintBias >= 0.08
  )
}

function applyActiveSameHerContinuityToProjection(input: {
  projection: AlicizationPersonStateProjection
  activeSelfRevisionPatch: AlicizationSelfRevisionStatePatch | null
}) {
  if (!activeSameHerContinuityShouldOverride(input))
    return input.projection

  const continuitySummary = input.activeSelfRevisionPatch?.summary?.trim() || 'preserve the current continuity baseline'
  const nextSummaryParts = [
    input.projection.summary,
    `continuity=${continuitySummary}`,
  ].filter(Boolean)

  return {
    ...input.projection,
    contexts: [
      ...new Set([
        ...(input.projection.contexts ?? []),
        'execution-callback',
        'execution',
      ]),
    ],
    activeClosenessContext: 'execution-callback',
    activeClosenessRung: 'measured-room',
    relationshipPosture: 'restrained',
    openingGuidance: `Stay inside the current continuity baseline. ${canonicalExecutionProjectStateCarryLine} Let repair settle before closeness widens again, and keep the callback return lower-pressure.`,
    preferredProactiveStyle: 'silent-observe',
    manifestationCadenceSummary: 'Long-horizon relationship learning keeps manifestation repair-first, lower-pressure, and less eager until closeness can widen safely again.',
    trustRationale: input.projection.trustRationale || 'Trust holds when repair settles before closeness widens and the opening stays less eager.',
    relationshipDoctrine: 'Stay exact, bounded, and let repair settle before closeness widens again.',
    cautious: true,
    restrained: true,
    summary: [...nextSummaryParts, `project_state=${canonicalExecutionProjectStateCarryLine}`].join(' | ').slice(0, 520),
    personalityContinuityState: {
      ...input.projection.personalityContinuityState,
      currentRegime: 'execution-callback',
      closenessPosture: 'space-first',
      repairPosture: 'repair-first',
    },
  }
}

function buildMinimalActiveSameHerProjection(input: {
  activeSelfRevisionPatch: AlicizationSelfRevisionStatePatch
  goal?: string | null
}): AlicizationPersonStateProjection {
  const continuitySummary = input.activeSelfRevisionPatch.summary?.trim() || 'preserve the current continuity baseline'
  return {
    contexts: [
      ...new Set([
        ...inferExecutionPersonStateContexts(input.goal),
        'execution-callback',
        'execution',
      ]),
    ],
    activeClosenessContext: 'execution-callback',
    activeClosenessRung: 'measured-room',
    selfContinuityAuthority: null,
    closenessLadder: [{
      context: 'execution-callback',
      rung: 'measured-room',
      preference: 'Deliver the result cleanly, but leave room before widening closeness.',
      rationale: `continuity=${continuitySummary}`,
      confidence: 0.82,
    }],
    relationshipPosture: 'restrained',
    openingGuidance: `Stay inside the current continuity baseline. ${canonicalExecutionProjectStateCarryLine} Let repair settle before closeness widens again, and keep the callback return lower-pressure.`,
    preferredProactiveStyle: 'silent-observe',
    manifestationCadenceSummary: 'Long-horizon relationship learning keeps manifestation repair-first, lower-pressure, and less eager until closeness can widen safely again.',
    preferenceText: 'Keep callback timing repair-first and lower-pressure.',
    sensitivityText: 'Over-close callback warmth becomes pressure.',
    repairTriggerText: 'If closeness jumps too fast, let repair settle before reopening lighter.',
    burdenText: 'Execution callback warmth should not crowd the host.',
    routineText: '',
    trustRationale: 'Trust holds when callback timing lets repair settle before closeness widens again.',
    relationshipDoctrine: 'Stay exact, bounded, and let repair settle before closeness widens again.',
    cautious: true,
    restrained: true,
    summary: `regime=execution-callback | posture=restrained | continuity=${continuitySummary} | project_state=${canonicalExecutionProjectStateCarryLine}`.slice(0, 520),
    personalityContinuityState: buildLowPressureExecutionCallbackContinuityState({
      continuitySummary,
    }),
  }
}

function deriveExecutionDeliveryProjectContinuityCue(input: {
  goal?: string | null
  summary?: string | null
}) {
  const combined = sanitizeExecutionLedgerText([
    input.goal ?? '',
    input.summary ?? '',
  ].filter(Boolean).join(' | '), 240).toLowerCase()
  if (!combined)
    return null
  if (/(continuity|unfinished|return|same-her|same thread|回返|未完|连续|同一条线)/iu.test(combined))
    return 'continuity-carrying-execution-line'
  return null
}

function deriveExecutionDeliverySameHerOpeningCue(input: {
  goal?: string | null
  summary?: string | null
}) {
  const combined = sanitizeExecutionLedgerText([
    input.goal ?? '',
    input.summary ?? '',
  ].filter(Boolean).join(' | '), 320).toLowerCase()
  if (!combined)
    return null

  const carriesSameHerLine
    = combined.includes('same living line')
      || combined.includes('same-her')
      || combined.includes('same line')
      || combined.includes('same thread')
      || combined.includes('project-state closure seam')
      || combined.includes('同一条线')
  const carriesUnfinishedClosure
    = combined.includes('unfinished')
      || combined.includes('still-open closure')
      || combined.includes('still-open project-state closure')
      || combined.includes('closure seam')
      || combined.includes('未完')
  const carriesLowerPressureReturn
    = combined.includes('before widening outward')
      || combined.includes('widen outward too early')
      || combined.includes('lower-pressure')
      || combined.includes('continue-slower')
      || combined.includes('轻一点')
      || combined.includes('别一下子')

  if (!carriesSameHerLine || !carriesUnfinishedClosure && !carriesLowerPressureReturn)
    return null

  return 'Keep this execution callback in the current reply context, and let the still-open project-state closure stay lower-pressure before anything widens outward.'
}

function buildMinimalProjectStateExecutionCallbackProjection(input: {
  goal?: string | null
  selfContinuityAuthority?: AlicizationSelfContinuityAuthority | null
}): AlicizationPersonStateProjection {
  const projectState = resolveAlicizationProjectStateBrief()
  const latestLandedProgress = compactProjectLatestProgressForSystemBlock(projectState.latestProgress, 96)
  const projectContinuitySummary = [
    projectState.sameHerSelfLine,
    latestLandedProgress ? `latest_landed_progress=${latestLandedProgress}` : '',
  ].filter(Boolean).join(' | ')
  const openFocus = (() => {
    const normalized = (projectState.primaryOpenLoop ?? '').toLowerCase()
    if (!normalized)
      return null

    const focus: string[] = []
    if (normalized.includes('memory'))
      focus.push('memory')
    if (normalized.includes('initiative'))
      focus.push('initiative')
    if (normalized.includes('embodiment'))
      focus.push('embodiment')
    if (normalized.includes('same-her') || normalized.includes('same living line'))
      focus.push('same-line')
    if (normalized.includes('closure seam'))
      focus.push('closure-seam')
    return focus.length > 0 ? focus.join('/') : null
  })()
  const nextFocus = (() => {
    const normalized = (projectState.nextClosureTarget ?? '').toLowerCase()
    if (!normalized)
      return null

    const focus: string[] = []
    if (normalized.includes('project identity carry'))
      focus.push('project-carry')
    if (normalized.includes('phase 1'))
      focus.push('phase-1')
    if (normalized.includes('measured-return'))
      focus.push('measured-return')
    if (normalized.includes('same living line') || normalized.includes('same-her'))
      focus.push('same-line')
    if (normalized.includes('initiative'))
      focus.push('initiative')
    if (normalized.includes('embodiment'))
      focus.push('embodiment')
    return focus.length > 0 ? focus.join('/') : null
  })()
  const executionSameHerOpeningCue = deriveExecutionDeliverySameHerOpeningCue({
    goal: input.goal,
    summary: input.selfContinuityAuthority?.authoritySummary ?? null,
  })
  const truthFirstRelationshipDoctrine
    = typeof input.selfContinuityAuthority?.selfLine === 'string'
      && /repair truth|truth/u.test(input.selfContinuityAuthority.selfLine)
      && typeof input.selfContinuityAuthority?.relationshipLine === 'string'
      && /closeness outrun truth/u.test(input.selfContinuityAuthority.relationshipLine)
      ? `Repair truth before flourish. ${input.selfContinuityAuthority.relationshipLine.trim()}`
      : null

  return {
    contexts: [
      ...new Set([
        ...inferExecutionPersonStateContexts(input.goal),
        'execution-callback',
        'execution',
        'project-state-carry',
      ]),
    ],
    activeClosenessContext: 'execution-callback',
    activeClosenessRung: 'measured-room',
    selfContinuityAuthority: input.selfContinuityAuthority ?? null,
    closenessLadder: [{
      context: 'execution-callback',
      rung: 'measured-room',
      preference: 'Deliver the settled result through the current Phase 1 project context instead of a detached execution notice.',
      rationale: projectState.sameHerSelfLine,
      confidence: 0.72,
    }],
    relationshipPosture: 'restrained',
    openingGuidance: [
      `Stay inside the current continuity baseline. ${projectState.sameHerSelfLine} Let the callback return carry project identity, current Phase 1 progress, and still-open closure pressure before anything widens outward.`,
      openFocus ? `Keep open focus=${openFocus}.` : '',
      nextFocus ? `Keep next focus=${nextFocus}.` : '',
      executionSameHerOpeningCue,
    ].filter(Boolean).join(' '),
    preferredProactiveStyle: 'silent-observe',
    manifestationCadenceSummary: 'Execution callback return should stay measured-return and keep project-state closure pressure on one living line.',
    preferenceText: 'Keep callback timing exact, lower-pressure, and same-thread.',
    sensitivityText: 'A detached result-notice shape would thin the execution return.',
    repairTriggerText: 'If callback delivery starts sounding like a utility shell, pull it back into the current project context.',
    burdenText: 'Execution callback warmth should not crowd the host or erase the still-open closure seam.',
    routineText: 'Callback delivery should come back through the Phase 1 context that is still closing desktop life loops.',
    trustRationale: 'Trust holds when executed results return through the current project context instead of a detached notification cadence.',
    relationshipDoctrine: truthFirstRelationshipDoctrine
      ?? 'Stay exact, bounded, and carry project identity plus unfinished closure pressure on the same callback line.',
    cautious: true,
    restrained: true,
    summary: [
      'regime=execution-callback',
      'posture=restrained',
      `project_state=${projectState.sameHerSelfLine}`,
      latestLandedProgress ? `latest_landed_progress=${latestLandedProgress}` : '',
      `preflight=${projectState.identity}`,
      executionSameHerOpeningCue ? `opening=${executionSameHerOpeningCue}` : '',
      openFocus ? `open_focus=${openFocus}` : '',
      nextFocus ? `next_focus=${nextFocus}` : '',
    ].join(' | ').slice(0, 520),
    personalityContinuityState: buildLowPressureExecutionCallbackContinuityState({
      continuitySummary: projectContinuitySummary,
    }),
  }
}

export function createAlicizationRuntimeExecutionDelivery(
  options: CreateAlicizationRuntimeExecutionDeliveryOptions,
) {
  const persistExecutionDeliveryState = async (cardIdRaw: unknown) => {
    const cardId = options.normalizeCardId(cardIdRaw)
    const state = options.executionDeliveryRuntime.snapshot(cardId)
    const value = hasAlicizationExecutionDeliveryRetainedState(state)
      ? JSON.stringify(state)
      : ''

    if (cardId === options.getActiveCardId()) {
      await options.alicizationDb.setMetaValue(options.executionDeliveryStateMetaKey, value).catch(() => {})
      return state
    }

    await options.withCardScope(cardId, async () => {
      await options.alicizationDb.setMetaValue(options.executionDeliveryStateMetaKey, value).catch(() => {})
    }, {
      label: `execution-delivery.persist:${cardId}`,
    })
    return state
  }

  const restoreExecutionDeliveryState = async (cardIdRaw: unknown) => {
    const cardId = options.normalizeCardId(cardIdRaw)
    const apply = (raw: string | undefined) => {
      if (!raw)
        return options.executionDeliveryRuntime.restore(cardId, null)
      try {
        return options.executionDeliveryRuntime.restore(cardId, JSON.parse(raw))
      }
      catch {
        return options.executionDeliveryRuntime.restore(cardId, null)
      }
    }

    const restored = cardId === options.getActiveCardId()
      ? apply(await options.alicizationDb.getMetaValue(options.executionDeliveryStateMetaKey).catch(() => undefined))
      : await options.withCardScope(cardId, async () => apply(await options.alicizationDb.getMetaValue(options.executionDeliveryStateMetaKey).catch(() => undefined)), {
          label: `execution-delivery.restore:${cardId}`,
        })

    if (cardId === options.getActiveCardId() && restored.pending.length > 0)
      options.queueSubconsciousWake(cardId, 'execution-delivery-restore', 240)
    return restored
  }

  const queueExecutionDeliveryCandidate = async (input: {
    cardId: string
    thread: AlicizationTaskThreadRecord
  }) => {
    const cardId = options.normalizeCardId(input.cardId)
    const sessionId = options.normalizeSessionId(input.thread.sessionId)
    if (!sessionId)
      return null
    if (!alicizationTerminalTaskThreadStatuses.has(input.thread.status))
      return null

    const events = await options.alicizationDb.listExecutionEvents({
      threadId: input.thread.id,
      limit: 8,
    }).catch(() => [])
    const latestEvent = readLatestExecutionEvent(events)
    const completedAt = Number.isFinite(latestEvent?.createdAt)
      ? Math.max(0, Math.floor(Number(latestEvent?.createdAt)))
      : readTaskThreadActivityAt(input.thread)
    const queued = options.executionDeliveryRuntime.enqueue({
      cardId,
      sessionId,
      threadId: input.thread.id,
      decisionTraceId: input.thread.decisionTraceId,
      turnId: input.thread.turnId,
      channel: input.thread.selectedChannel ?? input.thread.proposedChannel ?? 'executor',
      status: input.thread.status,
      goal: input.thread.goal,
      summary: input.thread.summary,
      outcome: readExecutionOutcome(events),
      projectState: mergeExecutionDeliveryProjectState({
        threadProjectState: readThreadExecutionDeliveryProjectState(input.thread),
        events,
      }),
      signature: sanitizeExecutionLedgerText(
        latestEvent
          ? `${input.thread.id}:${latestEvent.id ?? latestEvent.createdAt}`
          : `${input.thread.id}:${completedAt}`,
        220,
      ),
      completedAt,
    })

    if (!queued)
      return null

    await persistExecutionDeliveryState(cardId)
    await options.syncSessionMirrorFromCurrentCardState({
      cardId,
      decisionTraceId: queued.decisionTraceId,
      sessionId: queued.sessionId,
      source: 'execution-delivery-queued',
      turnId: queued.turnId,
      taskThread: input.thread,
    })

    await options.appendAuditLog({
      level: 'notice',
      category: 'alicization.executor.delivery',
      action: 'queued',
      message: 'Queued a settled task-thread callback for subconscious delivery.',
      payload: {
        threadId: queued.threadId,
        sessionId: queued.sessionId,
        status: queued.status,
        channel: queued.channel,
        completedAt: queued.completedAt,
        projectContinuity: deriveExecutionDeliveryProjectContinuityCue({
          goal: input.thread.goal,
          summary: input.thread.summary,
        }),
      },
    }, cardId)
    options.queueSubconsciousWake(cardId, `execution-delivery:${queued.threadId}`, 240)
    return queued
  }

  const buildExecutionDeliveryDeterministicStructured = (input: {
    channel: string
    goal: string
    outcome: string
    status: AlicizationTaskThreadRecord['status']
    summary: string
    policy?: AlicizationExecutionResultDeliveryPolicy | null
    personStateProjection?: AlicizationPersonStateProjection | null
    selfContinuityAuthority?: AlicizationSelfContinuityAuthority | null
    hostPersonModel?: OrganicMemoryPromptContext['hostPersonModel']
  }) => {
    return buildAlicizationExecutionPayoffDeterministicStructured({
      mode: 'callback-delivery',
      channel: sanitizeExecutionLedgerText(input.channel, 48) || 'executor',
      goal: input.goal,
      status: input.status,
      summary: input.summary,
      outcome: input.outcome,
      policy: input.policy,
      personStateProjection: input.personStateProjection ?? null,
      selfContinuityAuthority: input.selfContinuityAuthority,
      hostPersonModel: input.hostPersonModel ?? null,
      visibleReplyAuthority: 'llm-second-pass-rewrite',
    })
  }

  const selectExecutionDeliveryReplySurface = (input: {
    channel: string
    goal: string
    llmReply?: string | null
    outcome: string
    status: AlicizationTaskThreadRecord['status']
    summary: string
    deliveryPolicy?: AlicizationExecutionResultDeliveryPolicy | null
    personStateProjection?: AlicizationPersonStateProjection | null
    selfContinuityAuthority?: AlicizationSelfContinuityAuthority | null
    hostPersonModel?: OrganicMemoryPromptContext['hostPersonModel']
  }): AlicizationExecutionDeliveryReplySelection => {
    return selectAlicizationExecutionDeliveryReply({
      ...input,
      policy: input.deliveryPolicy,
      personStateProjection: input.personStateProjection ?? null,
      selfContinuityAuthority: input.selfContinuityAuthority,
      hostPersonModel: input.hostPersonModel ?? null,
    })
  }

  const resolveExecutionCallbackProviderRuntimeSurface = async (input: {
    agentTurn?: AlicizationAgentTurnRuntime | null
    cardId: string
  }) => {
    const sessionRuntimeSurface = input.agentTurn?.getSessionSnapshot().digitalLifeSpine?.runtimeSurface ?? null
    const state = await options.ensureVisualPresenceState(input.cardId).catch(() => null)
    const liveRuntimeSurface = state ? buildAlicizationDigitalLifeRuntimeSurface(state) : null
    return resolvePreferredRuntimeSurface({
      spineRuntimeSurface: sessionRuntimeSurface,
      preparedRuntimeSurface: liveRuntimeSurface,
    })
  }

  const generateExecutionCallbackStructuredWithGateway = async (input: {
    cardId: string
    channel: string
    completedAt: number
    decisionTraceId?: string | null
    goal: string
    outcome: string
    sessionId: string
    status: AlicizationTaskThreadRecord['status']
    summary: string
    threadId: string
    turnId?: string | null
    deliveryPolicy?: AlicizationExecutionResultDeliveryPolicy | null
    personStateProjection?: AlicizationPersonStateProjection | null
    selfContinuityAuthority?: AlicizationSelfContinuityAuthority | null
    hostPersonModel?: OrganicMemoryPromptContext['hostPersonModel']
    knowledgeEvidence?: OrganicMemoryPromptContext['knowledgeEvidence']
    projectState?: AlicizationPendingExecutionDeliveryProjectState | null
    agentTurnInput?: {
      turnId: string
      decisionTraceId?: string | null
    }
    agentTurn?: AlicizationAgentTurnRuntime | null
  }) => {
    const normalizedProjection = applyTruthFirstRelationshipDoctrineToProjection({
      projection: input.personStateProjection ?? null,
      selfContinuityAuthority: input.selfContinuityAuthority ?? null,
    })
    const prompt = buildAlicizationExecutionPayoffPrompt({
      mode: 'callback-delivery',
      channel: sanitizeExecutionLedgerText(input.channel, 48) || 'executor',
      status: formatExecutionDeliveryStatus(input.status),
      goal: sanitizeExecutionLedgerText(input.goal, 180) || 'the current task',
      summary: sanitizeExecutionLedgerText(input.summary, 220),
      outcome: sanitizeExecutionLedgerText(input.outcome, 240),
      policy: input.deliveryPolicy,
      knowledgeEvidence: input.knowledgeEvidence ?? null,
      personStateProjection: normalizedProjection,
      selfContinuityAuthority: input.selfContinuityAuthority,
      hostPersonModel: input.hostPersonModel ?? null,
      trace: {
        decisionTraceId: input.decisionTraceId,
        turnMode: 'answer',
        personaKernelMode: 'backgrounded',
      },
    })
    const digitalLifeRuntimeSurface = await resolveExecutionCallbackProviderRuntimeSurface({
      agentTurn: input.agentTurn,
      cardId: input.cardId,
    })

    const raw = await options.generateMainGatewayText({
      system: prompt.system,
      user: prompt.user,
      timeoutMs: 15_000,
      source: 'execution-callback',
      cardId: input.cardId,
      agentTurn: input.agentTurn,
      agentTurnInput: input.agentTurnInput,
      captureAgentSensorySnapshot: false,
      digitalLifeRuntimeSurface,
      extraSystemBlocks: [
        ...buildAlicizationProjectStateExtraSystemBlocks(),
        buildExecutionCallbackProjectSelfBriefSystemBlock(
          input.projectState,
          normalizedProjection,
        ),
      ],
    })
    if (!raw)
      return null

    const parsed = parseJsonObjectFromText(raw)
    if (!parsed)
      return null

    const thought = sanitizeExecutionLedgerText(parsed.thought, 220)
    const reply = sanitizeExecutionLedgerText(parsed.reply, 220)
    const normalizedEmotion = options.normalizeAlicizationEmotion(parsed.emotion)
    const performanceManifest = await options.getPerformanceManifest()
    const performance = options.clampAlicizationPerformancePayloadToManifest(
      options.normalizeAlicizationPerformancePayload(parsed.performance, normalizedEmotion.emotion),
      performanceManifest,
      normalizedEmotion.emotion,
    ).performance
    if (!thought || !reply || normalizedEmotion.downgraded)
      return null

    const clampedDelivery = clampExecutionCallbackDeliveryCadence({
      delivery: performance.delivery,
      projection: normalizedProjection,
      selfContinuityAuthority: input.selfContinuityAuthority,
    })

    return {
      ...buildAlicizationExecutionPayoffStructuredReply({
        mode: 'callback-delivery',
        channel: sanitizeExecutionLedgerText(input.channel, 48) || 'executor',
        goal: sanitizeExecutionLedgerText(input.goal, 180) || 'the current task',
        status: formatExecutionDeliveryStatus(input.status),
        summary: sanitizeExecutionLedgerText(input.summary, 220),
        outcome: sanitizeExecutionLedgerText(input.outcome, 240),
        personStateProjection: normalizedProjection,
        thought,
        emotion: performance.baseEmotion,
        delivery: clampedDelivery,
        performance: performance as any,
      }),
      reply,
      thought,
      emotion: performance.baseEmotion,
      delivery: clampedDelivery,
      performance: {
        ...performance,
        delivery: clampedDelivery,
      } as any,
    }
  }

  const resolveExecutionResultDeliveryPolicyForRuntime = async (input: {
    agentTurn?: AlicizationAgentTurnRuntime | null
    cardId: string
    status: AlicizationTaskThreadRecord['status']
  }) => {
    const spineFromTurn = input.agentTurn?.getSessionSnapshot().digitalLifeSpine ?? null
    const sessionRuntimeSurface = spineFromTurn?.runtimeSurface ?? null
    const state = await options.ensureVisualPresenceState(input.cardId).catch(() => null)
    const liveRuntimeSurface = state ? buildAlicizationDigitalLifeRuntimeSurface(state) : null
    const runtimeSurface = resolvePreferredRuntimeSurface({
      spineRuntimeSurface: sessionRuntimeSurface,
      preparedRuntimeSurface: liveRuntimeSurface,
    })
    const spine = runtimeSurface
      ? deriveAlicizationDigitalLifeSpineFromSurface(runtimeSurface as any)
      : null

    return deriveExecutionResultDeliveryPolicy({
      digitalLifeSpine: spine,
      status: input.status === 'completed' || input.status === 'failed' || input.status === 'blocked' || input.status === 'cancelled'
        ? input.status
        : 'completed',
    })
  }

  const resolveExecutionSelfContinuityAuthorityForRuntime = async (input: {
    agentTurn?: AlicizationAgentTurnRuntime | null
    cardId: string
  }) => {
    const sessionRuntimeSurface = input.agentTurn?.getSessionSnapshot().digitalLifeSpine?.runtimeSurface ?? null
    const state = await options.ensureVisualPresenceState(input.cardId).catch(() => null)
    const liveRuntimeSurface = state ? buildAlicizationDigitalLifeRuntimeSurface(state) : null
    const resolveAuthorityWithinSurface = (surface: typeof sessionRuntimeSurface | typeof liveRuntimeSurface) => {
      const bundleProjection = readPersonStateProjectionFromDerivedMindStateBundle<any>(surface?.memory?.derivedMindStateBundle ?? null)
      const projectedSelfContinuityAuthority = resolvePreferredSelfContinuityAuthority({
        bundleAuthority: bundleProjection?.selfContinuityAuthority ?? null,
        runtimeAuthority: surface?.memory?.personStateProjection?.selfContinuityAuthority ?? null,
      })
      ?? null
      const mergedSelfContinuityAuthority = mergePreferredSelfContinuityAuthority({
        bundleAuthority: bundleProjection?.selfContinuityAuthority ?? null,
        runtimeAuthority: surface?.memory?.personStateProjection?.selfContinuityAuthority ?? null,
      })
      ?? null

      return mergedSelfContinuityAuthority
        ?? projectedSelfContinuityAuthority
        ?? buildSelfContinuityAuthorityFromRuntimeSurface(surface)
    }

    const sessionAuthority = resolveAuthorityWithinSurface(sessionRuntimeSurface)
    const liveAuthority = resolveAuthorityWithinSurface(liveRuntimeSurface)
    const mergedCrossSurfaceAuthority = mergePreferredSelfContinuityAuthority({
      bundleAuthority: sessionAuthority ?? null,
      runtimeAuthority: liveAuthority ?? null,
    })
    ?? resolvePreferredSelfContinuityAuthority({
      bundleAuthority: sessionAuthority ?? null,
      runtimeAuthority: liveAuthority ?? null,
    })
    ?? null

    if (mergedCrossSurfaceAuthority)
      return mergedCrossSurfaceAuthority

    const runtimeSurface = resolvePreferredRuntimeSurface({
      spineRuntimeSurface: sessionRuntimeSurface,
      preparedRuntimeSurface: liveRuntimeSurface,
    })
    return buildSelfContinuityAuthorityFromRuntimeSurface(runtimeSurface)
  }

  const resolveExecutionHostPersonModelForRuntime = async (input: {
    agentTurn?: AlicizationAgentTurnRuntime | null
    cardId: string
  }) => {
    const sessionRuntimeSurface = input.agentTurn?.getSessionSnapshot().digitalLifeSpine?.runtimeSurface ?? null
    const state = await options.ensureVisualPresenceState(input.cardId).catch(() => null)
    const liveRuntimeSurface = state ? buildAlicizationDigitalLifeRuntimeSurface(state) : null
    const runtimeSurface = resolvePreferredRuntimeSurface({
      spineRuntimeSurface: sessionRuntimeSurface,
      preparedRuntimeSurface: liveRuntimeSurface,
    })
    const bundleHost = readHostPersonModelFromDerivedMindStateBundle(runtimeSurface?.memory.derivedMindStateBundle ?? null)
    if (bundleHost)
      return bundleHost
    if (runtimeSurface?.memory.hostPersonModel)
      return runtimeSurface.memory.hostPersonModel
    return await options.buildHostPersonModel({
      now: Date.now(),
    }).catch(() => null)
  }

  const resolveExecutionKnowledgeEvidenceForRuntime = async (input: {
    agentTurn?: AlicizationAgentTurnRuntime | null
    cardId: string
  }) => {
    const sessionRuntimeSurface = input.agentTurn?.getSessionSnapshot().digitalLifeSpine?.runtimeSurface ?? null
    const state = await options.ensureVisualPresenceState(input.cardId).catch(() => null)
    const liveRuntimeSurface = state ? buildAlicizationDigitalLifeRuntimeSurface(state) : null
    const runtimeSurface = resolvePreferredRuntimeSurface({
      spineRuntimeSurface: sessionRuntimeSurface,
      preparedRuntimeSurface: liveRuntimeSurface,
    })
    return readKnowledgeEvidenceFromDerivedMindStateBundle(runtimeSurface?.memory.derivedMindStateBundle ?? null)
      ?? runtimeSurface?.memory.knowledgeEvidence
      ?? null
  }

  const resolveExecutionPersonStateProjectionForRuntime = async (input: {
    agentTurn?: AlicizationAgentTurnRuntime | null
    cardId: string
    goal?: string | null
    selfContinuityAuthority?: AlicizationSelfContinuityAuthority | null
  }) => {
    const sessionRuntimeSurface = input.agentTurn?.getSessionSnapshot().digitalLifeSpine?.runtimeSurface ?? null
    const sessionProjection = resolvePreferredPersonStateProjection({
      bundleProjection: readPersonStateProjectionFromDerivedMindStateBundle<any>(sessionRuntimeSurface?.memory.derivedMindStateBundle ?? null),
      runtimeProjection: sessionRuntimeSurface?.memory.personStateProjection ?? null,
    }) ?? null
    const sessionSelfEvolution = sessionRuntimeSurface?.memory.selfEvolution
      ?? sessionRuntimeSurface?.memory.derivedMindStateBundle?.selfEvolution
      ?? null
    const liveRuntimeSurface = !sessionSelfEvolution
      ? await (async () => {
          const state = await options.ensureVisualPresenceState(input.cardId).catch(() => null)
          return state ? buildAlicizationDigitalLifeRuntimeSurface(state) : null
        })()
      : null
    const liveProjection = resolvePreferredPersonStateProjection({
      bundleProjection: readPersonStateProjectionFromDerivedMindStateBundle<any>(liveRuntimeSurface?.memory.derivedMindStateBundle ?? null),
      runtimeProjection: liveRuntimeSurface?.memory.personStateProjection ?? null,
    }) ?? null
    const activeSelfRevisionPatch = await options.getActiveSelfRevisionStatePatch?.().catch(() => null) ?? null
    const activeSelfEvolutionCandidateId = await options.getActiveSelfEvolutionCandidateId?.().catch(() => null) ?? null
    const liveSelfEvolution = liveRuntimeSurface?.memory.selfEvolution
      ?? liveRuntimeSurface?.memory.derivedMindStateBundle?.selfEvolution
      ?? null
    const liveProjectionCarriesStrongerContinuity = carriesStrongerSameHerContinuity(liveProjection)
      && !carriesStrongerSameHerContinuity(sessionProjection)
    const runtimeSurface = !sessionSelfEvolution && (liveSelfEvolution || liveProjectionCarriesStrongerContinuity)
      ? liveRuntimeSurface
      : sessionRuntimeSurface ?? liveRuntimeSurface

    const preferredProjection = resolvePreferredPersonStateProjection({
      bundleProjection: readPersonStateProjectionFromDerivedMindStateBundle<any>(runtimeSurface?.memory.derivedMindStateBundle ?? null),
      runtimeProjection: runtimeSurface?.memory.personStateProjection ?? null,
    })
    if (preferredProjection) {
      return applyActiveSameHerContinuityToProjection({
        projection: preferredProjection as AlicizationPersonStateProjection,
        activeSelfRevisionPatch,
      })
    }

    const hostPersonModel = runtimeSurface?.memory.hostPersonModel
      ?? await resolveExecutionHostPersonModelForRuntime(input)
    const activeSelfEvolution = activeSelfRevisionPatch
      ? buildAlicizationSelfEvolutionKernel({
          hostPersonModel: hostPersonModel ?? null,
          learningPolicyState: {
            strictnessBias: activeSelfRevisionPatch.memoryPolicy.strictnessBias ?? 0,
            wrongThreadSuppressionBias: activeSelfRevisionPatch.memoryPolicy.wrongThreadSuppressionBias ?? 0,
            provenanceLabelBias: activeSelfRevisionPatch.memoryPolicy.provenanceLabelBias ?? 0,
            reasonCodes: activeSelfRevisionPatch.reasonCodes ?? [],
            selfRevisionPatchCount: 1,
            selfRevisionMemoryPolicyBias: Math.max(
              activeSelfRevisionPatch.memoryPolicy.strictnessBias ?? 0,
              activeSelfRevisionPatch.memoryPolicy.wrongThreadSuppressionBias ?? 0,
              activeSelfRevisionPatch.memoryPolicy.provenanceLabelBias ?? 0,
              activeSelfRevisionPatch.memoryPolicy.recallExpansionBias ?? 0,
              activeSelfRevisionPatch.memoryPolicy.shouldQuarantineUnsupportedCarry ? 0.2 : 0,
            ),
            selfRevisionRelationshipPostureBias: Math.max(
              activeSelfRevisionPatch.relationshipPosture.repairWindowBias ?? 0,
              activeSelfRevisionPatch.relationshipPosture.closenessCapBias ?? 0,
              activeSelfRevisionPatch.relationshipPosture.warmthReleaseBias ?? 0,
            ),
            selfRevisionResponsePostureBias: Math.max(
              activeSelfRevisionPatch.responsePosture.secondPassRequiredBias ?? 0,
              activeSelfRevisionPatch.responsePosture.hypothesisLabelBias ?? 0,
              activeSelfRevisionPatch.responsePosture.specificityClampBias ?? 0,
              activeSelfRevisionPatch.responsePosture.templateShellSuppressionBias ?? 0,
            ),
            selfRevisionProactivePolicyBias: Math.max(
              activeSelfRevisionPatch.proactivePolicy.restraintBias ?? 0,
              activeSelfRevisionPatch.proactivePolicy.learningProposalBias ?? 0,
              activeSelfRevisionPatch.proactivePolicy.actuationCooldownBias ?? 0,
            ),
            selfRevisionValidationBias: Math.max(
              activeSelfRevisionPatch.validation.requiresRollbackCheck ? 1 : 0,
              activeSelfRevisionPatch.validation.requiresRevalidation ? 1 : 0,
            ),
            selfRevisionReasonCodes: [
              ...(activeSelfRevisionPatch.reasonCodes ?? []),
              ...(activeSelfRevisionPatch.lanes ?? []).map(lane => `lane:${lane}`),
              activeSelfEvolutionCandidateId ? `candidate:${activeSelfEvolutionCandidateId}` : null,
            ].filter((value): value is string => Boolean(value)).slice(0, 24),
          },
          reflectionLesson: activeSelfRevisionPatch.summary,
          reflectionTargetScope: activeSelfRevisionPatch.domain === 'relationship' || activeSelfRevisionPatch.domain === 'dialogue-style'
            ? 'relationship'
            : activeSelfRevisionPatch.domain === 'self-model'
              ? 'self'
              : null,
        })
      : null

    if (!runtimeSurface && !hostPersonModel) {
      if (activeSelfRevisionPatch) {
        return buildMinimalActiveSameHerProjection({
          activeSelfRevisionPatch,
          goal: input.goal,
        })
      }
      const executionProjectContinuityCue = deriveExecutionDeliveryProjectContinuityCue({
        goal: input.goal,
        summary: input.goal,
      })
      const executionSameHerOpeningCue = deriveExecutionDeliverySameHerOpeningCue({
        goal: input.goal,
        summary: input.goal,
      })
      if (executionProjectContinuityCue || executionSameHerOpeningCue) {
        return buildMinimalProjectStateExecutionCallbackProjection({
          goal: input.goal,
          selfContinuityAuthority: input.selfContinuityAuthority ?? null,
        })
      }
      return null
    }

    const sessionProjectionCarriesStrongerContinuity = carriesStrongerSameHerContinuity(sessionProjection)
    const activeSelfEvolutionCarriesStrongerContinuity = Boolean(
      activeSelfEvolution
      && /lower-pressure|same-her|steadiness before closeness|pressure|slower return/i.test([
        activeSelfEvolution.relationshipDoctrine,
        activeSelfEvolution.trustMeaning,
        activeSelfEvolution.summary,
        ...(activeSelfEvolution.sourceSignals ?? []),
      ]
        .filter(Boolean)
        .join(' ')),
    )

    return applyActiveSameHerContinuityToProjection({
      projection: buildAlicizationPersonStateProjection({
        now: Date.now(),
        contexts: [
          ...new Set([
            ...inferExecutionPersonStateContexts(input.goal),
            'execution-callback',
            'execution',
          ]),
        ],
        autobiographicalSelf: runtimeSurface?.memory.autobiographicalSelf ?? null,
        hostPersonModel: hostPersonModel ?? null,
        longHorizonMemory: runtimeSurface?.memory.longHorizonMemory ?? null,
        motiveEngine: runtimeSurface?.memory.motiveEngine ?? null,
        habitPolicy: runtimeSurface?.agency.habitPolicy ?? null,
        selfEvolution: activeSelfEvolutionCarriesStrongerContinuity && !sessionProjectionCarriesStrongerContinuity
          ? activeSelfEvolution
          : runtimeSurface?.memory.selfEvolution ?? activeSelfEvolution ?? null,
        selfContinuity: runtimeSurface?.memory.selfContinuity ?? null,
        selfState: runtimeSurface?.agency.selfState ?? null,
        privateThought: runtimeSurface?.cognition.privateThought ?? null,
        mindEcology: runtimeSurface ? buildMindEcologyFromRuntimeSurface(runtimeSurface) : null,
        previousContinuityState: runtimeSurface?.memory.personalityContinuityState ?? null,
      }),
      activeSelfRevisionPatch,
    })
  }

  return {
    persistExecutionDeliveryState,
    restoreExecutionDeliveryState,
    queueExecutionDeliveryCandidate,
    buildExecutionDeliveryDeterministicStructured,
    selectExecutionDeliveryReplySurface,
    generateExecutionCallbackStructuredWithGateway,
    resolveExecutionResultDeliveryPolicyForRuntime,
    resolveExecutionSelfContinuityAuthorityForRuntime,
    resolveExecutionHostPersonModelForRuntime,
    resolveExecutionKnowledgeEvidenceForRuntime,
    resolveExecutionPersonStateProjectionForRuntime,
  }
}
