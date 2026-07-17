import type {
  AlicizationAnswerEvidenceMode,
  AlicizationClaimEvidenceLedgerSnapshot,
  AlicizationCurrentConsciousFrameSnapshot,
  AlicizationDialogueAnswerSubject,
  AlicizationDialogueScreenReferenceMode,
} from '../../../shared/eventa'
import type { AlicizationMemoryRestraintJudge } from './memory-restraint-judge'

type AlicizationTruthDisciplineMode
  = | 'repair-first'
    | 'observe-first'
    | 'observe-then-hypothesize'
    | 'dialogue-first'
    | 'memory-labeled'

export interface AlicizationTruthDisciplineFlags {
  mode: AlicizationTruthDisciplineMode
  dialogueFirst: boolean
  shouldLabelHypothesis: boolean
  forbidUnsupportedSpecificity: boolean
  shouldSuppressAssociativeRecall: boolean
  shouldBlockScreenCarry: boolean
  memorySurfaceMode: AlicizationMemoryRestraintJudge['surfaceMode'] | null
  memoryProvenanceMode: AlicizationMemoryRestraintJudge['provenanceMode'] | null
  shouldKeepMemoryInward: boolean
  shouldOnlySurfaceMemoryStableCore: boolean
  shouldLabelMemoryProvenance: boolean
  shouldDelayMemoryUntilAfterPayoff: boolean
  memoryWithheldReasons: AlicizationMemoryRestraintJudge['withheldReasons']
  reasonTags: string[]
}

function isDialogueFirstSubject(subject: AlicizationDialogueAnswerSubject | null | undefined) {
  return subject === 'alicization-self'
    || subject === 'relationship'
    || subject === 'host-state'
}

function uniqueTags(values: string[]) {
  const tags: string[] = []
  for (const value of values) {
    if (!value || tags.includes(value))
      continue
    tags.push(value)
  }
  return tags
}

function resolveMode(input: {
  consciousTruthDiscipline?: AlicizationCurrentConsciousFrameSnapshot['truthDiscipline'] | null
  answerSubject?: AlicizationDialogueAnswerSubject | null
  screenReferenceMode?: AlicizationDialogueScreenReferenceMode | null
  truthState?: 'live-grounded' | 'live-observed' | 'dialogue-grounded' | 'remembered' | 'imagined' | 'uncertain' | null
  turnMode?: 'grounded-inspection' | 'screen-repair' | 'guide-current-knot' | 'care' | 'accompany' | 'answer' | null
  repairState?: 'none' | 'stale-anchor' | 'need-reground' | null
  evidenceMode?: AlicizationAnswerEvidenceMode | null
  labelCarryAsMemory?: boolean
}) {
  if (input.consciousTruthDiscipline)
    return input.consciousTruthDiscipline

  if (
    input.repairState === 'stale-anchor'
    || input.repairState === 'need-reground'
    || input.turnMode === 'screen-repair'
    || input.evidenceMode === 'repair-first'
  ) {
    return 'repair-first' as const
  }

  if (input.screenReferenceMode === 'avoid' || isDialogueFirstSubject(input.answerSubject))
    return 'dialogue-first' as const

  if (
    input.labelCarryAsMemory
    || input.truthState === 'remembered'
    || input.truthState === 'imagined'
    || input.evidenceMode === 'continuity-carry'
  ) {
    return 'memory-labeled' as const
  }

  if (
    input.truthState === 'live-grounded'
    || input.truthState === 'live-observed'
    || input.evidenceMode === 'live-grounded'
    || input.evidenceMode === 'live-observed'
  ) {
    return 'observe-first' as const
  }

  return 'observe-then-hypothesize' as const
}

export function deriveAlicizationTruthDiscipline(input: {
  answerSubject?: AlicizationDialogueAnswerSubject | null
  screenReferenceMode?: AlicizationDialogueScreenReferenceMode | null
  truthState?: 'live-grounded' | 'live-observed' | 'dialogue-grounded' | 'remembered' | 'imagined' | 'uncertain' | null
  turnMode?: 'grounded-inspection' | 'screen-repair' | 'guide-current-knot' | 'care' | 'accompany' | 'answer' | null
  repairState?: 'none' | 'stale-anchor' | 'need-reground' | null
  evidenceMode?: AlicizationAnswerEvidenceMode | null
  labelCarryAsMemory?: boolean
  suppressAssociativeRecall?: boolean
  currentConsciousFrame?: AlicizationCurrentConsciousFrameSnapshot | null
  claimEvidenceLedger?: AlicizationClaimEvidenceLedgerSnapshot | null
  memoryRestraint?: Pick<
    AlicizationMemoryRestraintJudge,
    | 'surfaceMode'
    | 'provenanceMode'
    | 'shouldStayInward'
    | 'shouldOnlySurfaceStableCore'
    | 'shouldLabelProvenance'
    | 'shouldLabelHypothesis'
    | 'shouldSuppressSpecificity'
    | 'shouldDelayUntilAfterPayoff'
    | 'withheldReasons'
  > | null
}): AlicizationTruthDisciplineFlags {
  const mode = resolveMode({
    consciousTruthDiscipline: input.currentConsciousFrame?.truthDiscipline ?? null,
    answerSubject: input.answerSubject ?? null,
    screenReferenceMode: input.screenReferenceMode ?? null,
    truthState: input.truthState ?? null,
    turnMode: input.turnMode ?? null,
    repairState: input.repairState ?? null,
    evidenceMode: input.evidenceMode ?? null,
    labelCarryAsMemory: input.labelCarryAsMemory === true,
  })
  const memoryRestraint = input.memoryRestraint ?? null
  const dialogueFirst = mode === 'dialogue-first'
    || input.screenReferenceMode === 'avoid'
    || isDialogueFirstSubject(input.answerSubject)
  const shouldKeepMemoryInward = memoryRestraint?.shouldStayInward === true
    || memoryRestraint?.surfaceMode === 'inward-only'
  const shouldOnlySurfaceMemoryStableCore = memoryRestraint?.shouldOnlySurfaceStableCore === true
    || memoryRestraint?.surfaceMode === 'stable-core-only'
  const shouldLabelMemoryProvenance = memoryRestraint?.shouldLabelProvenance === true
    || memoryRestraint?.surfaceMode === 'provenance-labeled'
  const shouldDelayMemoryUntilAfterPayoff = memoryRestraint?.shouldDelayUntilAfterPayoff === true
  const shouldLabelHypothesis = input.claimEvidenceLedger?.shouldLabelHypothesis === true
    || mode === 'observe-then-hypothesize'
    || mode === 'memory-labeled'
    || input.truthState === 'uncertain'
    || memoryRestraint?.shouldLabelHypothesis === true
  const forbidUnsupportedSpecificity = input.claimEvidenceLedger?.forbidUnsupportedSpecificity === true
    || mode === 'observe-then-hypothesize'
    || mode === 'repair-first'
    || memoryRestraint?.shouldSuppressSpecificity === true
  const shouldSuppressAssociativeRecall = input.suppressAssociativeRecall === true
    || mode === 'repair-first'
    || shouldKeepMemoryInward
    || shouldDelayMemoryUntilAfterPayoff
  const shouldBlockScreenCarry = dialogueFirst || mode === 'memory-labeled'

  return {
    mode,
    dialogueFirst,
    shouldLabelHypothesis,
    forbidUnsupportedSpecificity,
    shouldSuppressAssociativeRecall,
    shouldBlockScreenCarry,
    memorySurfaceMode: memoryRestraint?.surfaceMode ?? null,
    memoryProvenanceMode: memoryRestraint?.provenanceMode ?? null,
    shouldKeepMemoryInward,
    shouldOnlySurfaceMemoryStableCore,
    shouldLabelMemoryProvenance,
    shouldDelayMemoryUntilAfterPayoff,
    memoryWithheldReasons: memoryRestraint?.withheldReasons ?? [],
    reasonTags: uniqueTags([
      `mode:${mode}`,
      dialogueFirst ? 'dialogue-first-turn' : '',
      shouldLabelHypothesis ? 'label-hypothesis' : '',
      forbidUnsupportedSpecificity ? 'forbid-unsupported-specificity' : '',
      shouldSuppressAssociativeRecall ? 'suppress-associative-recall' : '',
      shouldBlockScreenCarry ? 'block-screen-carry' : '',
      memoryRestraint?.surfaceMode ? `memory-surface:${memoryRestraint.surfaceMode}` : '',
      memoryRestraint?.provenanceMode ? `memory-provenance:${memoryRestraint.provenanceMode}` : '',
      shouldKeepMemoryInward ? 'memory-inward-only' : '',
      shouldOnlySurfaceMemoryStableCore ? 'memory-stable-core-only' : '',
      shouldLabelMemoryProvenance ? 'memory-label-provenance' : '',
      shouldDelayMemoryUntilAfterPayoff ? 'memory-delay-until-payoff' : '',
    ]),
  }
}
