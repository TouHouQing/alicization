import type {
  AlicizationAnswerEvidenceMode,
  AlicizationClaimEvidenceLedgerSnapshot,
  AlicizationCurrentConsciousFrameSnapshot,
  AlicizationDialogueAnswerSubject,
  AlicizationDialogueScreenReferenceMode,
} from '../../../shared/eventa'

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
  const dialogueFirst = mode === 'dialogue-first'
    || input.screenReferenceMode === 'avoid'
    || isDialogueFirstSubject(input.answerSubject)
  const shouldLabelHypothesis = input.claimEvidenceLedger?.shouldLabelHypothesis === true
    || mode === 'observe-then-hypothesize'
    || mode === 'memory-labeled'
    || input.truthState === 'uncertain'
  const forbidUnsupportedSpecificity = input.claimEvidenceLedger?.forbidUnsupportedSpecificity === true
    || mode === 'observe-then-hypothesize'
    || mode === 'repair-first'
  const shouldSuppressAssociativeRecall = input.suppressAssociativeRecall === true
    || mode === 'repair-first'
  const shouldBlockScreenCarry = dialogueFirst || mode === 'memory-labeled'

  return {
    mode,
    dialogueFirst,
    shouldLabelHypothesis,
    forbidUnsupportedSpecificity,
    shouldSuppressAssociativeRecall,
    shouldBlockScreenCarry,
    reasonTags: uniqueTags([
      `mode:${mode}`,
      dialogueFirst ? 'dialogue-first-turn' : '',
      shouldLabelHypothesis ? 'label-hypothesis' : '',
      forbidUnsupportedSpecificity ? 'forbid-unsupported-specificity' : '',
      shouldSuppressAssociativeRecall ? 'suppress-associative-recall' : '',
      shouldBlockScreenCarry ? 'block-screen-carry' : '',
    ]),
  }
}
