import type {
  AlicizationAnswerCompilerSnapshot,
  AlicizationAnswerPlannerSnapshot,
  AlicizationMindTurnContractSnapshot,
} from '../../../shared/eventa'
import type { AlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'
import type { AlicizationResponseCharter } from './response-charter'
import type { AlicizationResponseSurfaceContract } from './response-surface-contract'

import { normalizeAlicizationNormalVisibleReplyAuthority } from '@proj-alicization/stage-shared'

function uniqueList(values: Array<string | null | undefined>, maxItems = 16) {
  const result: string[] = []
  for (const value of values) {
    const normalized = typeof value === 'string'
      ? value.trim().replace(/\s+/g, ' ')
      : ''
    if (!normalized || result.includes(normalized))
      continue
    result.push(normalized)
    if (result.length >= maxItems)
      break
  }
  return result
}

function normalizeNullableText(value: unknown, maxChars = 320) {
  if (typeof value !== 'string')
    return null
  const normalized = value.trim().replace(/\s+/g, ' ').slice(0, maxChars)
  return normalized || null
}

/**
 * The mind-turn contract is runtime telemetry for the current turn.
 *
 * Project-state governance, pre-dialogue awareness, closure instructions, and
 * body cadence do not belong here. They are not dialogue authority and must
 * never be rebuilt as provider-facing text.
 */
export function buildAlicizationMindTurnContract(input: {
  answerPlanner?: AlicizationAnswerPlannerSnapshot | null
  answerCompiler?: AlicizationAnswerCompilerSnapshot | null
  responseCharter: AlicizationResponseCharter
  responseSurfaceContract: AlicizationResponseSurfaceContract
  projectState?: Record<string, unknown> | null
  runtimeSurface?: AlicizationDigitalLifeRuntimeSurface | null
  now?: number
}): AlicizationMindTurnContractSnapshot {
  const planner = input.answerPlanner ?? null
  const compiler = input.answerCompiler ?? null
  const charter = input.responseCharter
  const surface = input.responseSurfaceContract

  return {
    version: 'mind-turn-contract-v1',
    answerIntent: planner?.answerIntent ?? compiler?.openingDirective ?? null,
    answerAct: planner?.act ?? compiler?.recommendedAct ?? null,
    turnMode: compiler?.turnMode ?? 'answer',
    responseMode: compiler?.responseMode ?? 'answer-naturally',
    evidenceMode: planner?.evidenceMode ?? compiler?.evidenceMode ?? null,
    openingStyle: surface.openingStyle,
    expectedVisibleReplyAuthority: normalizeAlicizationNormalVisibleReplyAuthority(
      surface.expectedVisibleReplyAuthority ?? null,
      'llm-mind',
    ),
    replyRealizationMode: 'provider-mind-required',
    personaKernelMode: surface.personaKernelMode,
    activeClosenessContext: (surface.activeClosenessContext
      ?? planner?.activeClosenessContext
      ?? compiler?.activeClosenessContext
      ?? null) as AlicizationAnswerCompilerSnapshot['activeClosenessContext'],
    activeClosenessRung: (surface.activeClosenessRung
      ?? planner?.activeClosenessRung
      ?? compiler?.activeClosenessRung
      ?? null) as AlicizationAnswerCompilerSnapshot['activeClosenessRung'],
    relationshipPosture: charter.relationshipPosture,
    labelCarryAsMemory: surface.labelCarryAsMemory,
    suppressAssociativeRecall: surface.suppressAssociativeRecall,
    allowAffectionatePreface: surface.allowAffectionatePreface,
    allowStageDirections: surface.allowStageDirections,
    allowBodyNarration: surface.allowBodyNarration,
    maxParagraphs: surface.maxParagraphs,
    maxSentences: surface.maxSentences,
    mustDo: [],
    mustNotDo: [],
    governingFocus: planner?.governingFocus ?? charter.governingFocus ?? '',
    governingConcern: charter.governingConcern,
    governingCommitment: charter.governingCommitment,
    governingInquiry: charter.governingInquiry,
    governingProject: charter.governingProject,
    emotionalClosureCue: normalizeNullableText(charter.emotionalClosureCue),
    relationshipTruthDoctrine: null,
    projectState: null,
    preDialogueClosure: null,
    reasons: uniqueList([
      ...(planner?.narrative ?? []),
      ...(compiler?.narrative ?? []),
    ]),
    updatedAt: Math.max(
      planner?.updatedAt ?? 0,
      compiler?.updatedAt ?? 0,
      Number.isFinite(input.now) ? Math.floor(Number(input.now)) : Date.now(),
    ),
  }
}

export function buildAlicizationMindTurnContractSystemBlock(
  _contract: AlicizationMindTurnContractSnapshot,
  _options?: {
    includeProjectStateFacts?: boolean
  },
) {
  return ''
}
