import type { AlicizationMindTurnContractSnapshot, AlicizationVisualPresenceStateSnapshot } from '../../../../shared/eventa'
import type { AlicizationPerceptionState } from '../attention-anchor'
import type { AlicizationDialogueFocusGovernance } from '../dialogue-focus-governor'
import type { AlicizationDialogueObligation } from '../dialogue-obligation'
import type { AlicizationDialogueTurnEncounter } from '../dialogue-turn-encounter'
import type { AlicizationDialogueTurnSemantics } from '../dialogue-turn-semantics'
import type { AlicizationDigitalLifeRuntimeSurface } from '../digital-life-kernel'
import type { AlicizationProactiveLayeredContext } from '../proactive-layered-context'
import type { AlicizationResponseCharter } from '../response-charter'
import type { AlicizationSelfRevisionStatePatch } from '../self-evolution/state-revision-bus'

import {
  containsAlicizationFixedTemplateResidue,
  sanitizeAlicizationProviderFacingText,
  sanitizeAlicizationStructuredInternalText,
} from '@proj-alicization/stage-shared'

import { preferStrongerContinuityClosureAuthority } from '../continuity-closure-authority'
import { buildAlicizationExecutiveAnswerBrief } from '../executive-answer-brief'
import { buildAlicizationMindTurnContract } from '../mind-turn-contract'
import {
  buildAlicizationProjectPreDialogueAwarenessLine,
  isAlicizationThinProjectAwarenessLine,
  resolveAlicizationSurfaceProjectStateSnapshot,
} from '../project-state-brief'
import {
  buildAlicizationResponseCharter,
} from '../response-charter'
import { buildAlicizationResponseSurfaceContract } from '../response-surface-contract'

export {
  buildAlicizationMindAuthoringFailureArtifact,
  isAlicizationNonHumanAuthoredVisibleReply,
} from './authority-orchestrator'

export type {
  AlicizationVisibleReplyClosureDraft,
  AlicizationVisibleReplyClosureResult,
} from './closure-orchestrator'

export {
  AlicizationVisibleReplyClosureBlockedError,
  closeAlicizationVisibleReply,
} from './closure-orchestrator'

export type {
  AlicizationVisibleReplyCriticArtifact,
} from './critic'

export {
  buildAlicizationVisibleReplyCriticArtifact,
  shouldBlockAlicizationVisibleReply,
} from './critic'

export type {
  AlicizationProjectStateEvidenceStatus,
  AlicizationResolvedVisibleReply,
  AlicizationVisibleReplyClosureArtifact,
  AlicizationVisibleReplyRealizationArtifact,
  AlicizationVisibleReplyValidationStatus,
} from './realization-engine'

export {
  buildAlicizationResolvedVisibleReply,
  buildAlicizationVisibleReplyRealizationArtifact,
  createAlicizationVisibleReplyExecution,
  deriveAlicizationVisibleReplyText,
  normalizeAlicizationProjectStateEvidenceStatus,
  normalizeAlicizationVisibleReplyValidationStatus,
  resolveAlicizationPreparedVisibleReplyExecution,
  resolveAlicizationTimeoutRecoveredVisibleReply,
} from './realization-engine'

export type {
  AlicizationMainChatReplyAuthoritySurface,
  AlicizationMainChatReplyExecutionPlanSurface,
} from './runtime-surface-authority'

export {
  describeAlicizationMainChatProviderMindRequirement,
  resolveAlicizationMainChatNormalVisibleReplyAuthority,
} from './runtime-surface-authority'

export type {
  AlicizationVisibleReplySettlementDraft,
  AlicizationVisibleReplySettlementResult,
} from './settlement'

export {
  AlicizationVisibleReplySettlementBlockedError,
  settleAlicizationVisibleReply,
} from './settlement'

export interface AlicizationVisibleReplySurfacePlan {
  version: 'visible-reply-surface-plan-v1'
  responseCharter: AlicizationResponseCharter
  executiveAnswerBrief: ReturnType<typeof buildAlicizationExecutiveAnswerBrief>
  responseSurfaceContract: ReturnType<typeof buildAlicizationResponseSurfaceContract>
  mindTurnContract: AlicizationMindTurnContractSnapshot
}

function sanitizeProjectStateText(value: unknown, maxChars = 220) {
  return sanitizeAlicizationProviderFacingText(value, maxChars)
}

function sanitizeVisibleReplyInternalProjectText(value: unknown, maxChars = 320) {
  if (typeof value !== 'string')
    return ''
  return sanitizeAlicizationStructuredInternalText(value, maxChars, '') || ''
}

function preferVisibleReplyProjectStateAuditText(input: {
  current?: unknown
  candidate?: unknown
}) {
  const current = sanitizeProjectStateText(input.current, 320)
  const candidate = sanitizeProjectStateText(input.candidate, 320)

  if (!current)
    return candidate || null
  if (!candidate)
    return current
  if (current === candidate)
    return current

  return preferStrongerContinuityClosureAuthority(current, candidate)
    || current
}

function stripVisibleReplyProjectContinuityPrefix(value: string, pattern: RegExp) {
  const stripped = value.replace(pattern, '').trim()
  if (!stripped || stripped === value)
    return null
  return stripped
}

function looksLikeThinVisibleReplyProjectIdentity(raw: unknown) {
  const text = sanitizeProjectStateText(raw, 220).toLowerCase()
  if (!text)
    return true

  return text === 'project'
    || text === 'digital life project'
    || text === 'this local-first digital life project'
    || !text.includes('alicization is a local-first digital life project')
}

function looksLikeThinVisibleReplyProjectAwarenessLine(raw: unknown) {
  const text = sanitizeProjectStateText(raw, 320)
  return Boolean(text) && isAlicizationThinProjectAwarenessLine(text)
}

function looksLikeSameHerVisibleReplyProjectContinuityLine(raw: unknown) {
  const normalized = sanitizeVisibleReplyInternalProjectText(raw, 320).toLowerCase()
  if (!normalized)
    return false
  if (containsAlicizationFixedTemplateResidue(raw))
    return false

  const carriesSameHer = /project_anchor=|continuity_(?:identity|line|thread)|project_state_review|runtime_personhood|current thread continuity/u.test(normalized)
  const carriesClosureContext = /callback|returned result|execution|project|closure|open closure|next closure|generic callback shell|detached utility notice|open_loop=|memory_dialogue_embodiment/u.test(normalized)

  return carriesSameHer && carriesClosureContext
}

function readVisibleReplyProjectContinuityFromAnswerCompiler(
  answerCompiler?: AlicizationDigitalLifeRuntimeSurface['dialogue']['answerCompiler'],
) {
  const supportingReality = Array.isArray(answerCompiler?.supportingReality) ? answerCompiler.supportingReality : []
  let preDialogueAwarenessLine: string | null = null
  let currentPhase: string | null = null
  let latestLandedProgress: string | null = null
  let primaryOpenLoop: string | null = null
  let nextClosureTarget: string | null = null

  for (const item of supportingReality) {
    const normalized = sanitizeProjectStateText(item, 320)
    if (!normalized)
      continue
    preDialogueAwarenessLine ||= stripVisibleReplyProjectContinuityPrefix(normalized, /^pre-dialogue project awareness:\s*/i)
    currentPhase ||= stripVisibleReplyProjectContinuityPrefix(normalized, /^current phase:\s*/i)
    latestLandedProgress ||= stripVisibleReplyProjectContinuityPrefix(normalized, /^project progress:\s*/i)
    primaryOpenLoop ||= stripVisibleReplyProjectContinuityPrefix(normalized, /^phase-one open loop:\s*/i)
    nextClosureTarget ||= stripVisibleReplyProjectContinuityPrefix(normalized, /^next closure target:\s*/i)
  }

  const sameHerSelfLine = looksLikeSameHerVisibleReplyProjectContinuityLine(answerCompiler?.openingClaim)
    ? sanitizeVisibleReplyInternalProjectText(answerCompiler?.openingClaim, 320)
    : null
  const sameHerDriftRisk = (answerCompiler?.mustNotDo ?? [])
    .map(item => sanitizeVisibleReplyInternalProjectText(item, 320))
    .find(item =>
      Boolean(item)
      && /generic assistant shell|generic task shell|detached project narration|project-summary voice|generic callback shell|detached utility notice/u.test(String(item))
      && /continuity_(?:identity|line|thread)|current thread continuity|project_state_review/u.test(String(item).toLowerCase()),
    ) ?? null

  return {
    preDialogueAwarenessLine,
    currentPhase,
    latestLandedProgress,
    primaryOpenLoop,
    nextClosureTarget,
    sameHerSelfLine,
    sameHerDriftRisk,
  }
}

function resolveVisibleReplyProjectState(input: {
  runtimeSurface: AlicizationDigitalLifeRuntimeSurface
  answerCompiler?: AlicizationDigitalLifeRuntimeSurface['dialogue']['answerCompiler']
}) {
  const projectState = resolveAlicizationSurfaceProjectStateSnapshot({
    runtimeSurface: input.runtimeSurface,
  })
  const answerCompilerProjectContinuity = readVisibleReplyProjectContinuityFromAnswerCompiler(input.answerCompiler)
  const rawRuntimeProjectState = input.runtimeSurface.raw?.runtimeDigest?.projectState ?? null
  const cognitionRuntimeProjectState = input.runtimeSurface.cognition?.runtimeDigest?.projectState ?? null
  const dialogueRuntimeProjectState = input.runtimeSurface.dialogue?.runtimeDigest?.projectState ?? null
  const currentConsciousProjectState = input.runtimeSurface.dialogue.currentConsciousFrame?.projectState ?? null
  const identity
    = (!looksLikeThinVisibleReplyProjectIdentity(currentConsciousProjectState?.identity)
      ? sanitizeProjectStateText(currentConsciousProjectState?.identity, 220)
      : '')
    || sanitizeProjectStateText(projectState.identity, 220)
  const currentPhase
    = sanitizeProjectStateText(currentConsciousProjectState?.currentPhase, 160)
      || sanitizeProjectStateText(answerCompilerProjectContinuity.currentPhase, 160)
      || sanitizeProjectStateText(projectState.currentPhase, 160)
  const preflightSummary
    = sanitizeProjectStateText(currentConsciousProjectState?.preflightSummary, 320)
      || sanitizeProjectStateText(projectState.preflightSummary, 320)
      || null
  const latestLandedProgress
    = sanitizeProjectStateText(currentConsciousProjectState?.latestLandedProgress, 220)
      || sanitizeProjectStateText(currentConsciousProjectState?.latestProgress, 220)
      || sanitizeProjectStateText(answerCompilerProjectContinuity.latestLandedProgress, 220)
      || sanitizeProjectStateText(projectState.latestLandedProgress, 220)
      || null
  const primaryOpenLoop
    = sanitizeProjectStateText(currentConsciousProjectState?.primaryOpenLoop, 220)
      || sanitizeProjectStateText(answerCompilerProjectContinuity.primaryOpenLoop, 220)
      || sanitizeProjectStateText(projectState.primaryOpenLoop, 220)
      || null
  const nextClosureTarget
    = sanitizeProjectStateText(currentConsciousProjectState?.nextClosureTarget, 220)
      || sanitizeProjectStateText(answerCompilerProjectContinuity.nextClosureTarget, 220)
      || sanitizeProjectStateText(projectState.nextClosureTarget, 220)
  const persistedSameHerSelfLine
    = sanitizeProjectStateText(cognitionRuntimeProjectState?.sameHerSelfLine, 320)
      || sanitizeProjectStateText(rawRuntimeProjectState?.sameHerSelfLine, 320)
      || sanitizeProjectStateText(dialogueRuntimeProjectState?.sameHerSelfLine, 320)
      || null
  const consciousSameHerSelfLine = sanitizeProjectStateText(currentConsciousProjectState?.sameHerSelfLine, 320)
  const sameHerSelfLine = (
    consciousSameHerSelfLine.toLowerCase().includes('thin')
    || consciousSameHerSelfLine.toLowerCase().includes('should not outrank')
  )
    ? (
        persistedSameHerSelfLine
        || sanitizeProjectStateText(answerCompilerProjectContinuity.sameHerSelfLine, 320)
        || consciousSameHerSelfLine
        || sanitizeProjectStateText(projectState.sameHerSelfLine, 320)
      )
    : (
        consciousSameHerSelfLine
        || persistedSameHerSelfLine
        || sanitizeProjectStateText(answerCompilerProjectContinuity.sameHerSelfLine, 320)
        || sanitizeProjectStateText(projectState.sameHerSelfLine, 320)
      )
  const explicitPreDialogueAwarenessLine
    = sanitizeProjectStateText(currentConsciousProjectState?.preDialogueAwarenessLine, 320)
      || sanitizeProjectStateText(currentConsciousProjectState?.awarenessLine, 320)
      || sanitizeProjectStateText(cognitionRuntimeProjectState?.preDialogueAwarenessLine, 320)
      || sanitizeProjectStateText(rawRuntimeProjectState?.preDialogueAwarenessLine, 320)
      || sanitizeProjectStateText(dialogueRuntimeProjectState?.preDialogueAwarenessLine, 320)
      || null
  const compilerPreDialogueAwarenessLine = sanitizeProjectStateText(
    answerCompilerProjectContinuity.preDialogueAwarenessLine,
    320,
  )
  const preDialogueAwarenessLine = (
    explicitPreDialogueAwarenessLine
    && !looksLikeThinVisibleReplyProjectAwarenessLine(explicitPreDialogueAwarenessLine)
  )
    ? explicitPreDialogueAwarenessLine
    : compilerPreDialogueAwarenessLine
      || explicitPreDialogueAwarenessLine
      || sanitizeProjectStateText(
        buildAlicizationProjectPreDialogueAwarenessLine({
          identity,
          currentPhase,
          latestLandedProgress,
          primaryOpenLoop,
          nextClosureTarget,
          sameHerSelfLine,
        }),
        320,
      )
      || sanitizeProjectStateText(projectState.preDialogueAwarenessLine, 320)
      || null

  return {
    identity,
    currentPhase,
    preflightSummary,
    preDialogueAwarenessLine,
    latestLandedProgress,
    primaryOpenLoop,
    nextClosureTarget,
    sameHerSelfLine: sameHerSelfLine || null,
    sameHerHoldDetail:
      preferVisibleReplyProjectStateAuditText({
        current: currentConsciousProjectState?.sameHerHoldDetail,
        candidate: preferVisibleReplyProjectStateAuditText({
          current: cognitionRuntimeProjectState?.sameHerHoldDetail,
          candidate: preferVisibleReplyProjectStateAuditText({
            current: rawRuntimeProjectState?.sameHerHoldDetail,
            candidate: preferVisibleReplyProjectStateAuditText({
              current: dialogueRuntimeProjectState?.sameHerHoldDetail,
              candidate: projectState.sameHerHoldDetail,
            }),
          }),
        }),
      })
      || null,
    continuityArcStage:
      sanitizeProjectStateText(currentConsciousProjectState?.continuityArcStage, 120)
      || sanitizeProjectStateText(cognitionRuntimeProjectState?.continuityArcStage, 120)
      || sanitizeProjectStateText(rawRuntimeProjectState?.continuityArcStage, 120)
      || sanitizeProjectStateText(dialogueRuntimeProjectState?.continuityArcStage, 120)
      || sanitizeProjectStateText(projectState.continuityArcStage, 120)
      || null,
    continuityCue:
      sanitizeProjectStateText(currentConsciousProjectState?.continuityCue, 220)
      || sanitizeProjectStateText(cognitionRuntimeProjectState?.continuityCue, 220)
      || sanitizeProjectStateText(rawRuntimeProjectState?.continuityCue, 220)
      || sanitizeProjectStateText(dialogueRuntimeProjectState?.continuityCue, 220)
      || sanitizeProjectStateText(projectState.continuityCue, 220)
      || null,
    sameHerDriftRisk:
      sanitizeProjectStateText(currentConsciousProjectState?.sameHerDriftRisk, 220)
      || sanitizeProjectStateText(cognitionRuntimeProjectState?.sameHerDriftRisk, 220)
      || sanitizeProjectStateText(rawRuntimeProjectState?.sameHerDriftRisk, 220)
      || sanitizeProjectStateText(answerCompilerProjectContinuity.sameHerDriftRisk, 220)
      || sanitizeProjectStateText(projectState.sameHerDriftRisk, 220)
      || null,
    companionHeadlineLine: sanitizeProjectStateText(projectState.companionHeadlineLine, 320) || null,
    awarenessLine: sanitizeProjectStateText(projectState.awarenessLine, 320) || null,
    companionBriefingLine: sanitizeProjectStateText(projectState.companionBriefingLine, 320) || null,
    continuityPreferredTiming: input.runtimeSurface.dialogue.currentConsciousFrame?.projectState?.continuityPreferredTiming ?? null,
  }
}

export function buildAlicizationVisibleReplySurfacePlan(input: {
  now: number
  context: AlicizationProactiveLayeredContext
  state: AlicizationVisualPresenceStateSnapshot
  runtimeSurface: AlicizationDigitalLifeRuntimeSurface
  inspectionRequested: boolean
  groundedThisTurn: boolean
  perceptionState: AlicizationPerceptionState
  currentForeground?: {
    appName?: string
    processName?: string
    title?: string
  } | null
  dialogueActKernel?: AlicizationDigitalLifeRuntimeSurface['dialogue']['dialogueActKernel']
  dialogueEncounter?: AlicizationDialogueTurnEncounter | null
  dialogueSemantics?: AlicizationDialogueTurnSemantics | null
  dialogueObligation?: AlicizationDialogueObligation | null
  dialogueFocus?: AlicizationDialogueFocusGovernance | null
  discourseState?: AlicizationDigitalLifeRuntimeSurface['dialogue']['discourseState']
  mindSynthesis?: AlicizationDigitalLifeRuntimeSurface['dialogue']['mindSynthesis']
  answerCompiler?: AlicizationDigitalLifeRuntimeSurface['dialogue']['answerCompiler']
  claimEvidenceLedger?: AlicizationDigitalLifeRuntimeSurface['dialogue']['claimEvidenceLedger']
  currentConsciousFrame?: AlicizationDigitalLifeRuntimeSurface['dialogue']['currentConsciousFrame']
  includeProjectStateFacts?: boolean
  recollectionSpeechPlan?: Parameters<typeof buildAlicizationResponseSurfaceContract>[0]['recollectionSpeechPlan']
  selfRevisionPatch?: AlicizationSelfRevisionStatePatch | null
}) {
  const projectState = resolveVisibleReplyProjectState({
    runtimeSurface: input.runtimeSurface,
    answerCompiler: input.answerCompiler ?? null,
  })
  const responseCharter = buildAlicizationResponseCharter({
    context: input.context,
    state: input.state,
    runtimeSurface: input.runtimeSurface,
    inspectionRequested: input.inspectionRequested,
    projectState,
    dialogueActKernel: input.dialogueActKernel ?? undefined,
    dialogueEncounter: input.dialogueEncounter ?? undefined,
    dialogueSemantics: input.dialogueSemantics ?? undefined,
    dialogueObligation: input.dialogueObligation ?? undefined,
    dialogueFocus: input.dialogueFocus ?? undefined,
    discourseState: input.discourseState ?? undefined,
    mindSynthesis: input.mindSynthesis ?? undefined,
    answerCompiler: input.answerCompiler ?? undefined,
    currentConsciousFrame: input.currentConsciousFrame ?? undefined,
    claimEvidenceLedger: input.claimEvidenceLedger ?? undefined,
    selfRevisionPatch: input.selfRevisionPatch ?? undefined,
  })
  const executiveAnswerBrief = buildAlicizationExecutiveAnswerBrief({
    now: input.now,
    inspectionRequested: input.inspectionRequested,
    groundedThisTurn: input.groundedThisTurn,
    currentForeground: input.currentForeground ?? undefined,
    perceptionState: input.perceptionState,
    visualPresenceState: input.state,
    runtimeSurface: input.runtimeSurface,
    responseCharter,
    dialogueEncounter: input.dialogueEncounter ?? undefined,
    dialogueSemantics: input.dialogueSemantics ?? undefined,
    dialogueObligation: input.dialogueObligation ?? undefined,
    dialogueFocus: input.dialogueFocus ?? undefined,
    discourseState: input.discourseState ?? undefined,
    mindSynthesis: input.mindSynthesis ?? undefined,
    answerCompiler: input.answerCompiler ?? undefined,
    claimEvidenceLedger: input.claimEvidenceLedger ?? undefined,
  })
  const responseSurfaceContract = buildAlicizationResponseSurfaceContract({
    brief: executiveAnswerBrief.brief,
    charter: responseCharter,
    dialogueActKernel: input.dialogueActKernel ?? undefined,
    dialogueEncounter: input.dialogueEncounter ?? undefined,
    dialogueSemantics: input.dialogueSemantics ?? undefined,
    dialogueObligation: input.dialogueObligation ?? undefined,
    dialogueFocus: input.dialogueFocus ?? undefined,
    answerCompiler: input.answerCompiler ?? undefined,
    claimEvidenceLedger: input.claimEvidenceLedger ?? undefined,
    currentConsciousFrame: input.currentConsciousFrame ?? undefined,
    runtimeSurface: input.runtimeSurface,
    recollectionSpeechPlan: input.recollectionSpeechPlan ?? undefined,
    selfRevisionPatch: input.selfRevisionPatch ?? undefined,
  })
  const mindTurnContract = buildAlicizationMindTurnContract({
    answerPlanner: input.runtimeSurface.dialogue.answerPlanner ?? null,
    answerCompiler: input.answerCompiler ?? null,
    responseCharter,
    responseSurfaceContract: responseSurfaceContract.contract,
    projectState,
    runtimeSurface: input.runtimeSurface,
    now: input.now,
  })

  return {
    version: 'visible-reply-surface-plan-v1',
    responseCharter,
    executiveAnswerBrief,
    responseSurfaceContract,
    mindTurnContract,
  } satisfies AlicizationVisibleReplySurfacePlan
}
