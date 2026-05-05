import type {
  AlicizationAnswerCompilerSnapshot,
  AlicizationAnswerPlannerSnapshot,
  AlicizationMindTurnContractSnapshot,
} from '../../../shared/eventa'
import { normalizeAlicizationNormalVisibleReplyAuthority } from '@proj-alicization/stage-shared'
import type { AlicizationResponseCharter } from './response-charter'
import type { AlicizationResponseSurfaceContract } from './response-surface-contract'

function uniqueList(values: Array<string | null | undefined>, maxItems = 12) {
  const result: string[] = []
  for (const value of values) {
    const normalized = typeof value === 'string'
      ? value.trim().replace(/\s+/g, ' ')
      : ''
    if (!normalized)
      continue
    if (result.includes(normalized))
      continue
    result.push(normalized)
    if (result.length >= maxItems)
      break
  }
  return result
}

export function buildAlicizationMindTurnContract(input: {
  answerPlanner?: AlicizationAnswerPlannerSnapshot | null
  answerCompiler?: AlicizationAnswerCompilerSnapshot | null
  responseCharter: AlicizationResponseCharter
  responseSurfaceContract: AlicizationResponseSurfaceContract
  now?: number
}): AlicizationMindTurnContractSnapshot {
  const planner = input.answerPlanner ?? null
  const compiler = input.answerCompiler ?? null
  const charter = input.responseCharter
  const surface = input.responseSurfaceContract
  const activeClosenessContext: AlicizationAnswerCompilerSnapshot['activeClosenessContext']
    = (surface.activeClosenessContext ?? planner?.activeClosenessContext ?? compiler?.activeClosenessContext ?? null) as AlicizationAnswerCompilerSnapshot['activeClosenessContext']
  const activeClosenessRung: AlicizationAnswerCompilerSnapshot['activeClosenessRung']
    = (surface.activeClosenessRung ?? planner?.activeClosenessRung ?? compiler?.activeClosenessRung ?? null) as AlicizationAnswerCompilerSnapshot['activeClosenessRung']

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
    activeClosenessContext,
    activeClosenessRung,
    relationshipPosture: charter.relationshipPosture,
    labelCarryAsMemory: surface.labelCarryAsMemory,
    suppressAssociativeRecall: surface.suppressAssociativeRecall,
    allowAffectionatePreface: surface.allowAffectionatePreface,
    allowStageDirections: surface.allowStageDirections,
    allowBodyNarration: surface.allowBodyNarration,
    maxParagraphs: surface.maxParagraphs,
    maxSentences: surface.maxSentences,
    mustDo: uniqueList([
      ...(planner?.mustDo ?? []),
      ...(compiler?.mustDo ?? []),
      ...charter.mustDo,
      ...surface.mustDo,
    ], 24),
    mustNotDo: uniqueList([
      ...(planner?.mustNotDo ?? []),
      ...(compiler?.mustNotDo ?? []),
      ...charter.mustNotDo,
      ...surface.mustNotDo,
    ], 24),
    governingFocus: planner?.governingFocus ?? charter.governingFocus,
    governingConcern: charter.governingConcern,
    governingCommitment: charter.governingCommitment,
    governingInquiry: charter.governingInquiry,
    governingProject: charter.governingProject,
    reasons: uniqueList([
      ...(planner?.narrative ?? []),
      ...(compiler?.narrative ?? []),
      ...charter.reasons,
    ], 16),
    updatedAt: Math.max(
      planner?.updatedAt ?? 0,
      compiler?.updatedAt ?? 0,
      Number.isFinite(input.now) ? Math.floor(Number(input.now)) : Date.now(),
    ),
  }
}

export function buildAlicizationMindTurnContractSystemBlock(contract: AlicizationMindTurnContractSnapshot) {
  return [
    '[ALICIZATION_MIND_TURN_CONTRACT]',
    'This is the single latent contract for the current reply. Downstream layers must consume this contract instead of re-deriving reply authority.',
    `Version: ${contract.version}.`,
    `Turn mode: ${contract.turnMode}.`,
    `Response mode: ${contract.responseMode}.`,
    `Answer act: ${contract.answerAct ?? 'unknown'}.`,
    `Evidence mode: ${contract.evidenceMode ?? 'unknown'}.`,
    `Opening style: ${contract.openingStyle}.`,
    `Expected visible reply authority: ${contract.expectedVisibleReplyAuthority}.`,
    `Reply realization mode: ${contract.replyRealizationMode}.`,
    `Persona kernel mode: ${contract.personaKernelMode}.`,
    contract.activeClosenessContext && contract.activeClosenessRung
      ? `Closeness ladder: ${contract.activeClosenessContext}/${contract.activeClosenessRung}.`
      : '',
    `Label carried continuity explicitly: ${contract.labelCarryAsMemory ? 'yes' : 'no'}.`,
    `Suppress associative recall noise: ${contract.suppressAssociativeRecall ? 'yes' : 'no'}.`,
    `Allow affectionate preface: ${contract.allowAffectionatePreface ? 'yes' : 'no'}.`,
    `Allow stage directions: ${contract.allowStageDirections ? 'yes' : 'no'}.`,
    `Allow body narration: ${contract.allowBodyNarration ? 'yes' : 'no'}.`,
    `Maximum paragraphs: ${contract.maxParagraphs}.`,
    `Maximum sentences: ${contract.maxSentences}.`,
    `Governing focus: ${contract.governingFocus}.`,
    contract.governingConcern ? `Governing concern: ${contract.governingConcern}.` : '',
    contract.governingCommitment ? `Governing commitment: ${contract.governingCommitment}.` : '',
    contract.governingInquiry ? `Governing inquiry: ${contract.governingInquiry}.` : '',
    contract.governingProject ? `Governing project: ${contract.governingProject}.` : '',
    contract.answerIntent ? `Answer intent: ${contract.answerIntent}.` : '',
    'Must do:',
    ...contract.mustDo.map(item => `- ${item}`),
    'Must not do:',
    ...contract.mustNotDo.map(item => `- ${item}`),
  ].filter(Boolean).join('\n')
}
