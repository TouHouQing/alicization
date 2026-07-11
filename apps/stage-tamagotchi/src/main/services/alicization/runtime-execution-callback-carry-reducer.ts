import type { AlicizationMindTurnGovernance } from '../../../shared/eventa'
import type { AlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'
import type { OrganicMemoryPromptContext } from './runtime-soul'

import { sanitizeAlicizationProviderFacingText } from '@proj-alicization/stage-shared'

import {
  isAlicizationThinProjectAwarenessLine,
  resolveAlicizationProjectPreDialogueAwarenessLine,
  resolveAlicizationProjectStateBrief,
} from './project-state-brief'

function uniqueList(values: Array<string | null | undefined>, maxItems = 8) {
  const items: string[] = []
  for (const value of values) {
    const normalized = typeof value === 'string' ? value.trim() : ''
    if (!normalized || items.includes(normalized))
      continue
    items.push(normalized)
    if (items.length >= maxItems)
      break
  }
  return items
}

type CurrentConsciousProjectState = NonNullable<NonNullable<AlicizationDigitalLifeRuntimeSurface['dialogue']['currentConsciousFrame']>['projectState']>
type CallbackSelfContinuityAuthority = NonNullable<NonNullable<AlicizationDigitalLifeRuntimeSurface['memory']['personStateProjection']>['selfContinuityAuthority']>
type CallbackFollowUpAffordance = NonNullable<NonNullable<AlicizationDigitalLifeRuntimeSurface['memory']['memoryDeliberation']>['followUpAffordance']>
type CallbackMemoryDeliberation = NonNullable<AlicizationDigitalLifeRuntimeSurface['memory']['memoryDeliberation']>
type CallbackRuntimeDigest = NonNullable<AlicizationDigitalLifeRuntimeSurface['raw']>['runtimeDigest']

function sanitizeCallbackCarryText(raw: unknown, maxChars = 420) {
  return sanitizeAlicizationProviderFacingText(raw, maxChars, '') || null
}

function sanitizeCallbackCarryAnchor(raw: unknown, fallback = 'callback_thread') {
  return sanitizeCallbackCarryText(raw, 220) ?? fallback
}

function sanitizeContinuityPreferredTiming(raw: unknown): CurrentConsciousProjectState['continuityPreferredTiming'] {
  const normalized = typeof raw === 'string' ? raw.trim() : ''
  return normalized === 'internal-only'
    || normalized === 'after-payoff'
    || normalized === 'same-turn-if-invited'
    || normalized === 'next-open-window'
    ? normalized
    : null
}

function sanitizeContinuityArcStage(raw: unknown): CurrentConsciousProjectState['continuityArcStage'] {
  const normalized = typeof raw === 'string' ? raw.trim() : ''
  return normalized
    ? normalized.slice(0, 120)
    : null
}

function sanitizePreferredBlinkCadence(raw: unknown): CurrentConsciousProjectState['preferredBlinkCadence'] {
  const normalized = typeof raw === 'string' ? raw.trim() : ''
  return normalized === 'normal' || normalized === 'linger' || normalized === 'quiet'
    ? normalized
    : null
}

function sanitizePreferredGazeMode(raw: unknown): CurrentConsciousProjectState['preferredGazeMode'] {
  const normalized = typeof raw === 'string' ? raw.trim() : ''
  return normalized === 'steady' || normalized === 'soften' || normalized === 'drift'
    ? normalized
    : null
}

function sanitizePreferredPauseMode(raw: unknown): CurrentConsciousProjectState['preferredPauseMode'] {
  const normalized = typeof raw === 'string' ? raw.trim() : ''
  return normalized === 'longer' || normalized === 'natural'
    ? normalized
    : null
}

function sanitizePreferredLipsyncMode(raw: unknown): CurrentConsciousProjectState['preferredLipsyncMode'] {
  const normalized = typeof raw === 'string' ? raw.trim() : ''
  return normalized === 'restrained' || normalized === 'matched'
    ? normalized
    : null
}

function sanitizePreferredVoiceMode(raw: unknown): CurrentConsciousProjectState['preferredVoiceMode'] {
  const normalized = typeof raw === 'string' ? raw.trim() : ''
  return normalized === 'lower-pressure' || normalized === 'even'
    ? normalized
    : null
}

function sanitizePreferredPacingMode(raw: unknown): CurrentConsciousProjectState['preferredPacingMode'] {
  const normalized = typeof raw === 'string' ? raw.trim() : ''
  return normalized === 'slower' || normalized === 'natural'
    ? normalized
    : null
}

function hasNeutralRelationshipLine(raw: unknown) {
  if (typeof raw !== 'string')
    return false
  return /relationship line is neutral|I can be warm|stay usefully oriented toward the host'?s knot/u.test(raw)
}

function hasContinuityRestraintRelationshipSignal(raw: unknown) {
  if (typeof raw !== 'string')
    return false
  return /repair-before-closeness|repair first|lower-pressure|leave room|measured-return|same line|same thread|bounded-return|before leaning closer/u.test(raw.toLowerCase())
}

function readContinuityPreferredTimingFromFrame(
  frame: AlicizationDigitalLifeRuntimeSurface['dialogue']['currentConsciousFrame'],
): CurrentConsciousProjectState['continuityPreferredTiming'] {
  const projectStateTiming = sanitizeContinuityPreferredTiming(frame?.projectState?.continuityPreferredTiming)
  if (projectStateTiming)
    return projectStateTiming
  const reasonTags = Array.isArray(frame?.reasonTags) ? frame.reasonTags : []
  if (reasonTags.includes('continuity-timing:next-open-window'))
    return 'next-open-window'
  if (reasonTags.includes('continuity-timing:after-payoff'))
    return 'after-payoff'
  if (reasonTags.includes('continuity-timing:same-turn-if-invited'))
    return 'same-turn-if-invited'
  return null
}

function buildCallbackSelfContinuityAuthority(input: {
  existing: CallbackSelfContinuityAuthority | null
  relationshipLine: string
}): CallbackSelfContinuityAuthority {
  const existing = input.existing
  const authoritySummary = (() => {
    const summary = uniqueList([
      existing?.selfLine ?? null,
      input.relationshipLine,
      existing?.inwardLine ?? null,
      existing?.authoritySummary ?? null,
    ], 4).join(' | ')
    return summary || existing?.authoritySummary || input.relationshipLine
  })()

  return {
    selfLine: existing?.selfLine ?? null,
    relationshipLine: input.relationshipLine,
    motiveLine: existing?.motiveLine ?? null,
    habitLine: existing?.habitLine ?? null,
    inwardLine: existing?.inwardLine ?? null,
    authoritySummary,
    closenessPosture: existing?.closenessPosture ?? null,
    sourceTags: uniqueList([
      ...(existing?.sourceTags ?? []),
      'execution-callback-carry',
    ], 8),
  }
}

function buildCallbackMemoryDeliberation(input: {
  carrySummary: string
  relationshipLine: string
  followUpAffordance: CallbackFollowUpAffordance
  confidence: number
}): CallbackMemoryDeliberation {
  return {
    shouldRecall: true,
    selectedEraIds: [],
    selectedConsolidationIds: [],
    selectedWindowIds: [],
    selectedProcedureIds: [],
    selectedEpisodeIds: [],
    selectedConversationTurnIds: [],
    selectedRelationshipLines: [input.relationshipLine],
    selectedEras: [],
    selectedPeriods: [],
    selectedEpisodes: [],
    selectedProcedures: [],
    selectedBundles: [],
    selectedChains: [],
    surfacePolicy: 'relationship-continuity',
    confidence: input.confidence,
    whyNow: input.followUpAffordance.whyNow,
    inwardLine: input.carrySummary,
    visibleLine: null,
    followUpAffordance: input.followUpAffordance,
  }
}

function mergeCallbackRuntimeDigestProjectState(input: {
  runtimeDigest: CallbackRuntimeDigest | null | undefined
  projectState: Pick<CurrentConsciousProjectState, 'nextClosureTarget' | 'continuityArcStage' | 'continuityPreferredTiming' | 'continuityCadence' | 'preferredBlinkCadence' | 'preferredGazeMode' | 'preferredPauseMode' | 'preferredLipsyncMode' | 'preferredVoiceMode' | 'preferredPacingMode'>
}): CallbackRuntimeDigest | null | undefined {
  if (!input.runtimeDigest)
    return input.runtimeDigest

  return {
    ...input.runtimeDigest,
    projectState: {
      ...input.runtimeDigest.projectState,
      ...input.projectState,
    },
  }
}

export function applyExecutionCallbackCarryToDigitalLifeRuntimeSurface(input: {
  surface: AlicizationDigitalLifeRuntimeSurface | null
  governance: AlicizationMindTurnGovernance | null
  context: OrganicMemoryPromptContext
  now: number
}) {
  const surface = input.surface ?? null
  const governance = input.governance ?? null
  const carry = input.context.executionCallbackCarry ?? null
  if (!surface || !governance || !carry)
    return surface

  const canonicalProjectState = resolveAlicizationProjectStateBrief()
  const surfaceProjectState
    = surface.dialogue.currentConsciousFrame?.projectState
      ?? surface.raw?.runtimeDigest?.projectState
      ?? surface.cognition.runtimeDigest?.projectState
      ?? null
  const runtimeDigestProjectState
    = surface.raw?.runtimeDigest?.projectState
      ?? surface.cognition.runtimeDigest?.projectState
      ?? null
  const projectPreflightCue
    = typeof surfaceProjectState?.preflightSummary === 'string' && surfaceProjectState.preflightSummary.trim()
      ? sanitizeCallbackCarryText(surfaceProjectState.preflightSummary, 520)
      : sanitizeCallbackCarryText(canonicalProjectState.preflightSummary ?? null, 520)
  const surfaceProjectAwarenessLine
    = typeof surfaceProjectState?.preDialogueAwarenessLine === 'string' ? surfaceProjectState.preDialogueAwarenessLine : null
  const surfaceCompanionBriefingLine
    = typeof (surfaceProjectState as { companionBriefingLine?: unknown } | null)?.companionBriefingLine === 'string'
      ? (surfaceProjectState as { companionBriefingLine?: string | null }).companionBriefingLine ?? null
      : null
  const runtimeDigestProjectAwarenessState = runtimeDigestProjectState as {
    preDialogueAwarenessLine?: unknown
    awarenessLine?: unknown
    companionHeadlineLine?: unknown
    companionBriefingLine?: unknown
    preDialogueAwarenessSummary?: unknown
  } | null
  const hasRuntimeDigestProjectAwarenessCarry = Boolean(
    typeof runtimeDigestProjectAwarenessState?.preDialogueAwarenessLine === 'string' && runtimeDigestProjectAwarenessState.preDialogueAwarenessLine.trim()
    || typeof runtimeDigestProjectAwarenessState?.awarenessLine === 'string' && runtimeDigestProjectAwarenessState.awarenessLine.trim()
    || typeof runtimeDigestProjectAwarenessState?.companionHeadlineLine === 'string' && runtimeDigestProjectAwarenessState.companionHeadlineLine.trim()
    || typeof runtimeDigestProjectAwarenessState?.companionBriefingLine === 'string' && runtimeDigestProjectAwarenessState.companionBriefingLine.trim()
    || typeof runtimeDigestProjectAwarenessState?.preDialogueAwarenessSummary === 'string' && runtimeDigestProjectAwarenessState.preDialogueAwarenessSummary.trim(),
  )
  const runtimeDigestProjectAwarenessLine = hasRuntimeDigestProjectAwarenessCarry
    ? resolveAlicizationProjectPreDialogueAwarenessLine({
        runtimeProjectState: {
          preDialogueAwarenessLine:
            typeof runtimeDigestProjectAwarenessState?.preDialogueAwarenessLine === 'string'
              ? runtimeDigestProjectAwarenessState.preDialogueAwarenessLine
              : null,
          awarenessLine:
            typeof runtimeDigestProjectAwarenessState?.awarenessLine === 'string'
              ? runtimeDigestProjectAwarenessState.awarenessLine
              : null,
          companionHeadlineLine:
            typeof runtimeDigestProjectAwarenessState?.companionHeadlineLine === 'string'
              ? runtimeDigestProjectAwarenessState.companionHeadlineLine
              : null,
          companionBriefingLine:
            typeof runtimeDigestProjectAwarenessState?.companionBriefingLine === 'string'
              ? runtimeDigestProjectAwarenessState.companionBriefingLine
              : null,
          preDialogueAwarenessSummary:
            typeof runtimeDigestProjectAwarenessState?.preDialogueAwarenessSummary === 'string'
              ? runtimeDigestProjectAwarenessState.preDialogueAwarenessSummary
              : null,
          preflightSummary: projectPreflightCue,
        },
        fallbackProjectState: {
          preDialogueAwarenessLine: canonicalProjectState.preDialogueAwarenessLine ?? null,
          companionBriefingLine: null,
          preflightSummary: canonicalProjectState.preflightSummary ?? null,
        },
      })
    : null
  const richerSurfaceCompanionBriefingLine
    = surfaceCompanionBriefingLine && !isAlicizationThinProjectAwarenessLine(surfaceCompanionBriefingLine)
      ? surfaceCompanionBriefingLine
      : null
  const richerRuntimeDigestProjectAwarenessLine
    = runtimeDigestProjectAwarenessLine && !isAlicizationThinProjectAwarenessLine(runtimeDigestProjectAwarenessLine)
      ? runtimeDigestProjectAwarenessLine
      : null
  const preferredProjectAwarenessLine = isAlicizationThinProjectAwarenessLine(surfaceProjectAwarenessLine)
    ? richerSurfaceCompanionBriefingLine
    || richerRuntimeDigestProjectAwarenessLine
    || surfaceCompanionBriefingLine
    || surfaceProjectAwarenessLine
    : surfaceProjectAwarenessLine
  const projectPreDialogueAwarenessCue = sanitizeCallbackCarryText(resolveAlicizationProjectPreDialogueAwarenessLine({
    runtimeProjectState: {
      preDialogueAwarenessLine: preferredProjectAwarenessLine,
      awarenessLine:
        typeof (surfaceProjectState as { awarenessLine?: unknown } | null)?.awarenessLine === 'string'
          ? (surfaceProjectState as { awarenessLine?: string | null }).awarenessLine ?? null
          : null,
      companionHeadlineLine:
        typeof (surfaceProjectState as { companionHeadlineLine?: unknown } | null)?.companionHeadlineLine === 'string'
          ? (surfaceProjectState as { companionHeadlineLine?: string | null }).companionHeadlineLine ?? null
          : null,
      companionBriefingLine:
        typeof (surfaceProjectState as { companionBriefingLine?: unknown } | null)?.companionBriefingLine === 'string'
          ? (surfaceProjectState as { companionBriefingLine?: string | null }).companionBriefingLine ?? null
          : null,
      preflightSummary: projectPreflightCue,
    },
    fallbackProjectState: {
      preDialogueAwarenessLine: canonicalProjectState.preDialogueAwarenessLine ?? null,
      companionBriefingLine: null,
      preflightSummary: canonicalProjectState.preflightSummary ?? null,
    },
  }) ?? projectPreflightCue, 720) ?? projectPreflightCue
  const projectIdentityCue
    = typeof surfaceProjectState?.identity === 'string' && surfaceProjectState.identity.trim()
      ? sanitizeCallbackCarryAnchor(surfaceProjectState.identity, 'project_identity')
      : sanitizeCallbackCarryAnchor(canonicalProjectState.identity, 'project_identity')
  const currentPhaseCue
    = typeof surfaceProjectState?.currentPhase === 'string' && surfaceProjectState.currentPhase.trim()
      ? sanitizeCallbackCarryAnchor(surfaceProjectState.currentPhase, 'project_phase')
      : sanitizeCallbackCarryAnchor(canonicalProjectState.currentPhase, 'project_phase')
  const projectProgressCue
    = typeof surfaceProjectState?.latestLandedProgress === 'string' && surfaceProjectState.latestLandedProgress.trim()
      ? sanitizeCallbackCarryText(surfaceProjectState.latestLandedProgress, 420)
      : sanitizeCallbackCarryText(canonicalProjectState.continuityProgressSummary
        ?? canonicalProjectState.memoryAnthropomorphismProgress[canonicalProjectState.memoryAnthropomorphismProgress.length - 1]
        ?? null, 420)
  const primaryOpenLoopCue
    = typeof surfaceProjectState?.primaryOpenLoop === 'string' && surfaceProjectState.primaryOpenLoop.trim()
      ? sanitizeCallbackCarryText(surfaceProjectState.primaryOpenLoop, 420)
      : sanitizeCallbackCarryText(canonicalProjectState.openLoops[0] ?? null, 420)
  const nextClosureTargetCue
    = typeof runtimeDigestProjectState?.nextClosureTarget === 'string' && runtimeDigestProjectState.nextClosureTarget.trim()
      ? sanitizeCallbackCarryText(runtimeDigestProjectState.nextClosureTarget, 420)
      : typeof surfaceProjectState?.nextClosureTarget === 'string' && surfaceProjectState.nextClosureTarget.trim()
        ? sanitizeCallbackCarryText(surfaceProjectState.nextClosureTarget, 420)
        : sanitizeCallbackCarryText(canonicalProjectState.nextClosureTarget, 420)
  const continuityArcStage
    = sanitizeContinuityArcStage(surfaceProjectState?.continuityArcStage)
      ?? sanitizeContinuityArcStage(runtimeDigestProjectState?.continuityArcStage)
      ?? sanitizeContinuityArcStage(canonicalProjectState.continuityArcStage)
  const continuityPreferredTiming
    = readContinuityPreferredTimingFromFrame(surface.dialogue.currentConsciousFrame)
      ?? sanitizeContinuityPreferredTiming(surfaceProjectState?.continuityPreferredTiming)
      ?? sanitizeContinuityPreferredTiming(surface.memory.memoryDeliberation?.followUpAffordance?.preferredTiming)
  const continuityCadence
    = typeof surfaceProjectState?.continuityCadence === 'string' && surfaceProjectState.continuityCadence.trim()
      ? surfaceProjectState.continuityCadence
      : null
  const preferredBlinkCadence = sanitizePreferredBlinkCadence(surfaceProjectState?.preferredBlinkCadence)
  const preferredGazeMode = sanitizePreferredGazeMode(surfaceProjectState?.preferredGazeMode)
  const preferredPauseMode = sanitizePreferredPauseMode(surfaceProjectState?.preferredPauseMode)
  const preferredLipsyncMode = sanitizePreferredLipsyncMode(surfaceProjectState?.preferredLipsyncMode)
  const preferredVoiceMode = sanitizePreferredVoiceMode(surfaceProjectState?.preferredVoiceMode)
  const preferredPacingMode = sanitizePreferredPacingMode(surfaceProjectState?.preferredPacingMode)

  const callbackThreadAnchor = sanitizeCallbackCarryAnchor(carry.threadAnchor, 'callback_thread')
  const callbackSummary = sanitizeCallbackCarryText(carry.summary, 420) ?? 'callback_result=available'
  const openingClaim = [
    'execution_callback=return',
    `thread=${callbackThreadAnchor}`,
    `summary=${callbackSummary}`,
  ].join(' | ')
  const openingDirective = carry.carryMode === 'repair-before-closeness'
    ? 'callback_return_policy=repair_before_closeness | utility_notice=blocked'
    : carry.carryMode === 'lower-pressure'
      ? 'callback_return_policy=lower_pressure | utility_notice=blocked'
      : carry.carryMode === 'trust-warming'
        ? 'callback_return_policy=trust_warming | utility_notice=blocked'
        : 'callback_return_policy=thread_connected | utility_notice=blocked'
  const supportingReality = uniqueList([
    projectPreflightCue ? `project preflight: ${projectPreflightCue}` : null,
    `project identity: ${projectIdentityCue}`,
    `current phase: ${currentPhaseCue}`,
    projectProgressCue ? `project progress: ${projectProgressCue}` : null,
    callbackSummary,
    surface.dialogue.answerCompiler?.supportingReality?.[0] ?? null,
    `execution-callback carry mode: ${carry.carryMode}`,
    `thread anchor: ${callbackThreadAnchor}`,
    primaryOpenLoopCue ? `phase-one open loop: ${primaryOpenLoopCue}` : null,
    nextClosureTargetCue ? `next closure target: ${nextClosureTargetCue}` : null,
  ])
  const carryFollowUpAffordance = surface.memory.memoryDeliberation?.followUpAffordance
    ? surface.memory.memoryDeliberation.followUpAffordance
    : {
        summary: carry.threadAnchor
          ? `execution_callback=follow_up | thread=${callbackThreadAnchor} | notice_shape=blocked_detached_result`
          : `execution_callback=follow_up | thread=${callbackThreadAnchor} | summary=${callbackSummary}`,
        whyNow: carry.carryMode === 'repair-before-closeness'
          ? 'callback_landed=true | return_policy=repair_before_closeness | timing=next_open_window'
          : carry.carryMode === 'trust-warming'
            ? 'callback_landed=true | return_policy=trust_warming | timing=after_payoff'
            : carry.carryMode === 'lower-pressure'
              ? 'callback_landed=true | return_policy=lower_pressure | timing=next_open_window'
              : 'callback_landed=true | return_policy=thread_connected | timing=after_payoff',
        intrusionRisk: carry.carryMode === 'trust-warming' ? 'low' as const : 'medium' as const,
        payoffDependency: 'requires-current-payoff' as const,
        preferredTiming:
          continuityPreferredTiming === 'next-open-window'
            ? 'next-open-window' as const
            : carry.carryMode === 'lower-pressure' || carry.carryMode === 'repair-before-closeness'
              ? 'next-open-window' as const
              : 'after-payoff' as const,
      }
  const callbackRelationshipCarry = carry.carryMode === 'repair-before-closeness'
    ? 'callback_relationship_carry=repair_before_closeness | timing=next_open_window'
    : carry.carryMode === 'lower-pressure'
      ? 'callback_relationship_carry=lower_pressure | timing=next_open_window'
      : carry.carryMode === 'trust-warming'
        ? 'callback_relationship_carry=trust_warming | timing=after_payoff'
        : 'callback_relationship_carry=thread_connected | timing=after_payoff'
  const existingAuthority = surface.memory.personStateProjection?.selfContinuityAuthority ?? null
  const shouldPreserveCallbackRelationshipCarry = (
    !existingAuthority?.relationshipLine
    || hasNeutralRelationshipLine(existingAuthority.relationshipLine)
    || (
      hasContinuityRestraintRelationshipSignal(callbackRelationshipCarry)
      && !hasContinuityRestraintRelationshipSignal(existingAuthority.relationshipLine)
    )
  )

  return {
    ...surface,
    memory: {
      ...surface.memory,
      autobiographicalSelf: input.context.autobiographicalSelf ?? surface.memory.autobiographicalSelf,
      longHorizonMemory: input.context.longHorizonMemory ?? surface.memory.longHorizonMemory,
      personStateProjection: (() => {
        const projection = input.context.personStateProjection ?? surface.memory.personStateProjection
        if (!projection)
          return projection
        if (!shouldPreserveCallbackRelationshipCarry)
          return projection

        const existingProjectionAuthority = projection.selfContinuityAuthority ?? null
        return {
          ...projection,
          selfContinuityAuthority: buildCallbackSelfContinuityAuthority({
            existing: existingProjectionAuthority,
            relationshipLine: callbackRelationshipCarry,
          }),
        }
      })(),
      memoryDeliberation: surface.memory.memoryDeliberation
        ? {
            ...surface.memory.memoryDeliberation,
            followUpAffordance: carryFollowUpAffordance,
          }
        : buildCallbackMemoryDeliberation({
            carrySummary: carry.summary,
            relationshipLine: callbackRelationshipCarry,
            followUpAffordance: carryFollowUpAffordance,
            confidence: carry.confidence,
          }),
    },
    raw: surface.raw
      ? {
          ...surface.raw,
          runtimeDigest: mergeCallbackRuntimeDigestProjectState({
            runtimeDigest: surface.raw.runtimeDigest,
            projectState: {
              nextClosureTarget: nextClosureTargetCue,
              continuityArcStage,
              continuityPreferredTiming: continuityPreferredTiming ?? carryFollowUpAffordance.preferredTiming ?? null,
              continuityCadence: continuityCadence ?? null,
              preferredBlinkCadence: preferredBlinkCadence ?? null,
              preferredGazeMode: preferredGazeMode ?? null,
              preferredPauseMode: preferredPauseMode ?? null,
              preferredLipsyncMode: preferredLipsyncMode ?? null,
              preferredVoiceMode: preferredVoiceMode ?? null,
              preferredPacingMode: preferredPacingMode ?? null,
            },
          }),
        }
      : surface.raw,
    dialogue: {
      ...surface.dialogue,
      currentConsciousFrame: surface.dialogue.currentConsciousFrame
        ? {
            ...surface.dialogue.currentConsciousFrame,
            projectState: {
              ...surface.dialogue.currentConsciousFrame.projectState,
              preDialogueAwarenessLine: projectPreDialogueAwarenessCue,
              preflightSummary: projectPreflightCue,
              identity: projectIdentityCue,
              currentPhase: currentPhaseCue,
              latestLandedProgress: projectProgressCue,
              latestProgress: projectProgressCue,
              primaryOpenLoop: primaryOpenLoopCue,
              nextClosureTarget: nextClosureTargetCue,
              continuityArcStage,
              continuityPreferredTiming: continuityPreferredTiming ?? carryFollowUpAffordance.preferredTiming ?? null,
              continuityCadence,
              preferredBlinkCadence,
              preferredGazeMode,
              preferredPauseMode,
              preferredLipsyncMode,
              preferredVoiceMode,
              preferredPacingMode,
            },
          }
        : surface.dialogue.currentConsciousFrame,
      conversationState: surface.dialogue.conversationState ?? {
        jointThread: carry.threadAnchor ?? carry.summary,
        hostMove: governance.focusAnchor ?? governance.answerIntent ?? null,
        activeProject: null,
        unansweredQuestion: governance.focusAnchor ?? governance.answerIntent ?? null,
        owedRepair: governance.repairState === 'none' ? null : (governance.answerIntent ?? governance.focusAnchor ?? null),
        activeCommitments: [],
        relationFrame: governance.answerSubject === 'relationship' ? 'attune' : 'witness',
        continuityPolicy: 'dialogue-before-scene',
        memoryMode: 'dialogue-carry',
        memoryQueryHints: supportingReality,
        shouldHoldThread: true,
        confidence: carry.confidence,
        narrative: ['execution-callback-carry'],
        updatedAt: input.now,
      } as any,
      discourseState: surface.dialogue.discourseState ?? {
        currentTurnSubject: governance.answerSubject ?? 'task-knot',
        screenReferenceMode: governance.screenReferenceMode ?? 'avoid',
        currentTurnSummary: carry.summary,
        currentQuestion: governance.focusAnchor ?? governance.answerIntent ?? carry.summary,
        owedAction: governance.answerAct === 'guide' ? 'guide-task' : governance.repairState === 'none' ? 'answer-general' : 'repair-truth',
        relationMove: governance.answerSubject === 'relationship' ? 'attune' : 'witness',
        continuityMode: 'task-first',
        primaryTurnAnchor: carry.threadAnchor ?? openingClaim,
        confidence: carry.confidence,
        narrative: ['execution-callback-carry'],
        updatedAt: input.now,
      } as any,
      answerCompiler: surface.dialogue.answerCompiler ?? {
        answerSubject: governance.answerSubject ?? 'task-knot',
        screenReferenceMode: governance.screenReferenceMode ?? 'avoid',
        recommendedAct: governance.answerAct === 'care'
          ? 'care'
          : governance.answerAct === 'guide'
            ? 'guide'
            : 'answer',
        evidenceMode: governance.labelCarryAsMemory ? 'continuity-carry' : 'dialogue-grounded',
        turnMode: governance.turnMode,
        openingClaim,
        openingDirective,
        supportingReality,
        labelCarryAsMemory: governance.labelCarryAsMemory,
        confidence: carry.confidence,
      } as any,
    },
  } satisfies AlicizationDigitalLifeRuntimeSurface
}
