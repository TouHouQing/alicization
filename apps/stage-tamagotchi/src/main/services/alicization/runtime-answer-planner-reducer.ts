import type {
  AlicizationDialogueActKernelSnapshot,
  AlicizationMindTurnGovernance,
  AlicizationReplyDeliberationSnapshot,
} from '../../../shared/eventa'
import type { AlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'

import { sanitizeAlicizationProviderFacingText } from '@proj-alicization/stage-shared'

export interface RuntimeAnswerPlannerReducerInput {
  surface: AlicizationDigitalLifeRuntimeSurface | null
  governance: AlicizationMindTurnGovernance | null
  now: number
}

function sanitizeRuntimeDialogueText(raw: unknown, maxChars = 360) {
  return sanitizeAlicizationProviderFacingText(raw, maxChars, '')
}

function sanitizeRuntimeDialogueTextList(
  values: string[] | null | undefined,
  maxChars = 360,
) {
  return (values ?? [])
    .map(value => sanitizeRuntimeDialogueText(value, maxChars))
    .filter(Boolean)
}

function sanitizeReplyDeliberation(
  state: AlicizationReplyDeliberationSnapshot | null | undefined,
) {
  if (!state)
    return null

  return {
    ...state,
    openingBeat: sanitizeRuntimeDialogueText(state.openingBeat),
    whyThisReplyNow: sanitizeRuntimeDialogueText(state.whyThisReplyNow),
    whyNotOtherCandidates: sanitizeRuntimeDialogueTextList(state.whyNotOtherCandidates),
    withheldImpulses: sanitizeRuntimeDialogueTextList(state.withheldImpulses),
    candidateMotives: state.candidateMotives
      .map(candidate => ({
        ...candidate,
        summary: sanitizeRuntimeDialogueText(candidate.summary),
      }))
      .filter(candidate => Boolean(candidate.summary)),
    mustInclude: [],
    mustAvoid: [],
    narrative: [],
  } satisfies AlicizationReplyDeliberationSnapshot
}

function sanitizeDialogueActKernel(
  state: AlicizationDialogueActKernelSnapshot | null | undefined,
) {
  if (!state)
    return null

  return {
    ...state,
    activeProject: sanitizeRuntimeDialogueText(state.activeProject, 800) || null,
    selectedEvidence: state.selectedEvidence
      .map(evidence => ({
        ...evidence,
        summary: sanitizeRuntimeDialogueText(evidence.summary, 800),
      }))
      .filter(evidence => Boolean(evidence.summary)),
    openingClaim: sanitizeRuntimeDialogueText(state.openingClaim),
    openingMove: sanitizeRuntimeDialogueText(state.openingMove),
    whyNow: sanitizeRuntimeDialogueText(state.whyNow),
    mustSay: [],
    mustAvoid: [],
    sourceTrace: [],
  } satisfies AlicizationDialogueActKernelSnapshot
}

export function reduceRuntimeAnswerPlanner(input: RuntimeAnswerPlannerReducerInput) {
  const surface = input.surface ?? null
  if (!surface)
    return null

  const answerPlanner = surface.dialogue?.answerPlanner ?? null
  const replyDeliberation = surface.dialogue?.replyDeliberation ?? null
  const dialogueActKernel = surface.dialogue?.dialogueActKernel ?? null

  if (!answerPlanner && !replyDeliberation && !dialogueActKernel)
    return surface

  return {
    ...surface,
    dialogue: {
      ...surface.dialogue,
      answerPlanner: answerPlanner
        ? {
            ...answerPlanner,
            governingFocus: sanitizeRuntimeDialogueText(answerPlanner.governingFocus),
            governingProject: null,
            openingMove: sanitizeRuntimeDialogueText(answerPlanner.openingMove),
            answerIntent: sanitizeRuntimeDialogueText(answerPlanner.answerIntent),
            mustDo: [],
            mustNotDo: [],
            narrative: [],
          }
        : null,
      replyDeliberation: sanitizeReplyDeliberation(replyDeliberation),
      dialogueActKernel: sanitizeDialogueActKernel(dialogueActKernel),
    },
  } satisfies AlicizationDigitalLifeRuntimeSurface
}
