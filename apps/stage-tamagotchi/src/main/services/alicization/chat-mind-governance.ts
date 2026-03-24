import type {
  AlicizationAnswerPlannerSnapshot,
  AlicizationMindKernelMode,
  AlicizationMindTurnGovernance,
  AlicizationPrivateThoughtSnapshot,
} from '../../../shared/eventa'
import type { AlicizationExecutiveAnswerBrief } from './executive-answer-brief'
import type { AlicizationResponseCharter } from './response-charter'
import type { AlicizationResponseSurfaceContract } from './response-surface-contract'

function sanitizeText(raw: unknown, maxChars = 220) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

const internalMindNarrativePattern = /living seam|current knot|carried continuity|truth seam|epistemic|governing|foreground thread|residue|afterglow|runtime thread|host(?:'s)?|obligation|mind kernel|thread still being held/iu

function sanitizeUserFacingCandidate(raw: unknown, maxChars = 180) {
  const normalized = sanitizeText(raw, maxChars)
  if (!normalized)
    return ''
  if (normalized.toLowerCase() === 'none')
    return ''
  if (internalMindNarrativePattern.test(normalized))
    return ''
  return normalized
}

function uniqueList(values: Array<string | null | undefined>, maxItems = 6) {
  const items: string[] = []
  for (const value of values) {
    const normalized = sanitizeText(value)
    if (!normalized || items.includes(normalized))
      continue
    items.push(normalized)
    if (items.length >= maxItems)
      break
  }
  return items
}

function resolveRepairState(input: {
  brief: AlicizationExecutiveAnswerBrief
  answerPlanner?: AlicizationAnswerPlannerSnapshot | null
}) {
  if (input.answerPlanner?.act === 'correct-stale-anchor' || input.brief.turnMode === 'screen-repair')
    return 'stale-anchor' as const
  if (input.answerPlanner?.act === 'ask-reground' || input.answerPlanner?.shouldAskForGrounding)
    return 'need-reground' as const
  return 'none' as const
}

function resolveFocusAnchor(input: {
  brief: AlicizationExecutiveAnswerBrief
  answerPlanner?: AlicizationAnswerPlannerSnapshot | null
}) {
  return (
    sanitizeUserFacingCandidate(input.answerPlanner?.governingFocus)
    || sanitizeUserFacingCandidate(input.answerPlanner?.answerIntent)
    || sanitizeUserFacingCandidate(input.brief.liveSurface)
    || sanitizeUserFacingCandidate(input.brief.carriedThread)
    || null
  )
}

export function buildAlicizationMindTurnGovernance(input: {
  brief: AlicizationExecutiveAnswerBrief
  charter: AlicizationResponseCharter
  surfaceContract: AlicizationResponseSurfaceContract
  answerPlanner?: AlicizationAnswerPlannerSnapshot | null
  privateThought?: AlicizationPrivateThoughtSnapshot | null
  mindMode?: AlicizationMindKernelMode | null
}): AlicizationMindTurnGovernance {
  const repairState = resolveRepairState({
    brief: input.brief,
    answerPlanner: input.answerPlanner,
  })

  return {
    turnMode: input.brief.turnMode,
    truthState: input.brief.truthState,
    personaKernelMode: input.surfaceContract.personaKernelMode,
    openingStyle: input.surfaceContract.openingStyle,
    relationshipPosture: input.charter.relationshipPosture,
    answerAct: input.answerPlanner?.act ?? null,
    evidenceMode: input.answerPlanner?.evidenceMode ?? null,
    repairState,
    liveSurface: sanitizeUserFacingCandidate(input.brief.liveSurface) || null,
    focusAnchor: resolveFocusAnchor({
      brief: input.brief,
      answerPlanner: input.answerPlanner,
    }),
    answerIntent: sanitizeUserFacingCandidate(input.answerPlanner?.answerIntent) || null,
    openingMove: sanitizeUserFacingCandidate(input.answerPlanner?.openingMove) || null,
    carriedThread: sanitizeUserFacingCandidate(input.brief.carriedThread) || null,
    suppressAssociativeRecall: input.surfaceContract.suppressAssociativeRecall,
    labelCarryAsMemory: input.surfaceContract.labelCarryAsMemory,
    shouldAskForGrounding: input.answerPlanner?.shouldAskForGrounding ?? repairState === 'need-reground',
    shouldAcknowledgeRepair: input.answerPlanner?.shouldAcknowledgeRepair ?? repairState === 'stale-anchor',
    maxSentences: input.surfaceContract.maxSentences,
    mindMode: input.mindMode ?? null,
    embodiedPresence: input.privateThought?.embodiedPresence ?? 'none',
    emotionalTension: input.privateThought?.emotionalTension,
    mustDo: uniqueList([
      ...input.brief.mustDo,
      ...input.surfaceContract.mustDo,
      ...(input.answerPlanner?.mustDo ?? []),
    ]),
    mustNotDo: uniqueList([
      ...input.brief.mustNotDo,
      ...input.surfaceContract.mustNotDo,
      ...(input.answerPlanner?.mustNotDo ?? []),
    ]),
  }
}
