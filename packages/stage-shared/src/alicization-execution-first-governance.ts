import type { AlicizationExecutionDispatchChannel } from './alicization-execution-intent'

import { analyzeAlicizationExecutionTurnAuthority } from './alicization-execution-intent'

type AlicizationExecutionFirstTurnMode
  = | 'grounded-inspection'
    | 'screen-repair'
    | 'guide-current-knot'
    | 'care'
    | 'accompany'
    | 'answer'

type AlicizationExecutionFirstAnswerAct
  = | 'answer'
    | 'guide'
    | 'ask-reground'
    | 'correct-stale-anchor'
    | 'care'
    | 'defer'

type AlicizationExecutionFirstAnswerSubject
  = | 'alicization-self'
    | 'project-state'
    | 'relationship'
    | 'host-state'
    | 'task-knot'
    | 'visible-scene'
    | 'general'

export interface AlicizationExecutionFirstGovernanceLike {
  turnMode: AlicizationExecutionFirstTurnMode
  answerAct?: AlicizationExecutionFirstAnswerAct | null
  answerSubject?: AlicizationExecutionFirstAnswerSubject | null
  screenReferenceMode?: 'required' | 'helpful' | 'incidental' | 'avoid' | null
  repairState: 'none' | 'stale-anchor' | 'need-reground'
  shouldAskForGrounding: boolean
  shouldAcknowledgeRepair: boolean
  mindTurnFrame?: {
    relation?: {
      subject?: AlicizationExecutionFirstAnswerSubject | null
    } | null
    obligation?: {
      answerAct?: AlicizationExecutionFirstAnswerAct | null
    } | null
  } | null
}

export interface AlicizationExecutionFirstGovernanceNormalization<
  T extends AlicizationExecutionFirstGovernanceLike = AlicizationExecutionFirstGovernanceLike,
> {
  applied: boolean
  executionBound: boolean
  explicitExecutionDemand: boolean
  governance: T | null
  mentionedDispatchChannels: AlicizationExecutionDispatchChannel[]
  reasonCodes: string[]
  signalScore: number
}

function executionTurnNeedsRepairAuthorityOverride(
  governance: AlicizationExecutionFirstGovernanceLike,
) {
  return governance.repairState !== 'none'
    || governance.turnMode === 'screen-repair'
    || governance.turnMode === 'grounded-inspection'
    || governance.answerAct === 'ask-reground'
    || governance.answerAct === 'correct-stale-anchor'
    || governance.shouldAskForGrounding
    || governance.shouldAcknowledgeRepair
    || governance.screenReferenceMode === 'required'
}

function resolveExecutionFirstAnswerAct(input: {
  governance: AlicizationExecutionFirstGovernanceLike
  mentionedDispatchChannels: AlicizationExecutionDispatchChannel[]
  explicitExecutionDemand: boolean
}): AlicizationExecutionFirstAnswerAct {
  if (input.governance.answerAct === 'care' || input.governance.answerAct === 'defer')
    return input.governance.answerAct
  if (input.governance.answerAct === 'guide')
    return 'guide'

  const subject = input.governance.answerSubject
    ?? input.governance.mindTurnFrame?.relation?.subject
    ?? null
  const taskDirected = subject === 'task-knot'
    || input.governance.turnMode === 'guide-current-knot'
    || input.mentionedDispatchChannels.length > 0
    || input.explicitExecutionDemand

  return taskDirected ? 'guide' : 'answer'
}

function resolveExecutionFirstTurnMode(input: {
  governance: AlicizationExecutionFirstGovernanceLike
  answerAct: AlicizationExecutionFirstAnswerAct
}): AlicizationExecutionFirstTurnMode {
  if (input.governance.turnMode === 'care' || input.governance.turnMode === 'accompany')
    return input.governance.turnMode
  if (input.answerAct === 'guide')
    return 'guide-current-knot'
  return 'answer'
}

export function normalizeExecutionFirstGovernance<
  T extends AlicizationExecutionFirstGovernanceLike,
>(input: {
  governance?: T | null
  userText?: string
}): AlicizationExecutionFirstGovernanceNormalization<T> {
  const governance = input.governance ?? null
  const executionTurnAuthority = analyzeAlicizationExecutionTurnAuthority(input.userText ?? '')
  const baseResult = {
    executionBound: executionTurnAuthority.executionBound,
    explicitExecutionDemand: executionTurnAuthority.explicitExecutionDemand,
    mentionedDispatchChannels: executionTurnAuthority.semanticSignals.mentionedDispatchChannels,
    reasonCodes: executionTurnAuthority.reasonCodes,
    signalScore: executionTurnAuthority.semanticSignals.executionSignalScore,
  }

  if (!governance) {
    return {
      ...baseResult,
      applied: false,
      governance: null,
    }
  }

  if (!executionTurnAuthority.executionBound || !executionTurnNeedsRepairAuthorityOverride(governance)) {
    return {
      ...baseResult,
      applied: false,
      governance,
    }
  }

  const answerAct = resolveExecutionFirstAnswerAct({
    governance,
    mentionedDispatchChannels: executionTurnAuthority.semanticSignals.mentionedDispatchChannels,
    explicitExecutionDemand: executionTurnAuthority.explicitExecutionDemand,
  })
  const turnMode = resolveExecutionFirstTurnMode({
    governance,
    answerAct,
  })
  const relationSubject = governance.mindTurnFrame?.relation?.subject ?? null
  const normalizedGovernance = {
    ...governance,
    turnMode,
    answerAct,
    answerSubject: governance.answerSubject === 'visible-scene'
      ? 'task-knot'
      : governance.answerSubject,
    screenReferenceMode: governance.screenReferenceMode === 'avoid'
      ? 'avoid'
      : 'incidental',
    repairState: 'none',
    shouldAskForGrounding: false,
    shouldAcknowledgeRepair: false,
    mindTurnFrame: governance.mindTurnFrame
      ? {
          ...governance.mindTurnFrame,
          relation: governance.mindTurnFrame.relation
            ? {
                ...governance.mindTurnFrame.relation,
                subject: relationSubject === 'visible-scene' ? 'task-knot' : relationSubject,
              }
            : governance.mindTurnFrame.relation,
          obligation: governance.mindTurnFrame.obligation
            ? {
                ...governance.mindTurnFrame.obligation,
                answerAct,
              }
            : governance.mindTurnFrame.obligation,
        }
      : governance.mindTurnFrame,
  } as T

  return {
    ...baseResult,
    applied: true,
    executionBound: true,
    governance: normalizedGovernance,
    reasonCodes: [
      ...executionTurnAuthority.reasonCodes,
      'execution-first-governance-override',
    ],
  }
}
