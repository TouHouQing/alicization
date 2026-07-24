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

import { buildAlicizationExecutiveAnswerBrief } from '../executive-answer-brief'
import { buildAlicizationMindTurnContract } from '../mind-turn-contract'
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
  normalizeAlicizationVisibleReplyValidationStatus,
  resolveAlicizationPreparedVisibleReplyExecution,
  resolveAlicizationTimeoutRecoveredVisibleReply,
} from './realization-engine'

export type {
  AlicizationMainChatReplyAuthoritySurface,
  AlicizationMainChatReplyExecutionPlanSurface,
} from './runtime-surface-authority'

export {
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
  const responseCharter = buildAlicizationResponseCharter({
    context: input.context,
    state: input.state,
    runtimeSurface: input.runtimeSurface,
    inspectionRequested: input.inspectionRequested,
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
