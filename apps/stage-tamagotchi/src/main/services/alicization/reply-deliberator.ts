import type {
  AlicizationAnswerCompilerSnapshot,
  AlicizationClaimEvidenceLedgerSnapshot,
  AlicizationConversationStateSnapshot,
  AlicizationCurrentConsciousFrameSnapshot,
  AlicizationDialogueTurnEncounterSnapshot,
  AlicizationDiscourseStateSnapshot,
  AlicizationPrivateThoughtSnapshot,
  AlicizationReplyDeliberationSnapshot,
  AlicizationReplyMotive,
  AlicizationReplyMotiveSnapshot,
  AlicizationWorldModelSnapshot,
} from '../../../shared/eventa'
import type { AlicizationDialogueTurnEncounter } from './dialogue-turn-encounter'
import type { AlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'

import {
  sanitizeDialogueAnchorText,
  sanitizeDialogueSurfaceText,
} from './dialogue-surface-text'

interface AlicizationDialogueEncounterSurface extends Pick<
  AlicizationDialogueTurnEncounterSnapshot,
  'subject' | 'screenReferenceMode' | 'summary' | 'taskAnchor' | 'mustAnswerDirectly'
> {}

interface DynamicTextSource {
  value: unknown
  sourceTag: string
}

interface DynamicTextSelection {
  text: string
  sourceTag: string
}

function selectionAsSource(selection: DynamicTextSelection): DynamicTextSource {
  return {
    value: selection.text,
    sourceTag: selection.sourceTag,
  }
}

function clamp01(value: number) {
  if (!Number.isFinite(value))
    return 0
  return Math.max(0, Math.min(1, Number(value.toFixed(2))))
}

function sanitizeTag(raw: unknown, maxChars = 48) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function sanitizeDynamicText(raw: unknown, maxChars = 220) {
  return sanitizeDialogueSurfaceText(raw, maxChars)
}

function pickDynamicText(maxChars: number, ...sources: DynamicTextSource[]): DynamicTextSelection | null {
  for (const source of sources) {
    const text = sanitizeDynamicText(source.value, maxChars)
    const sourceTag = sanitizeTag(source.sourceTag)
    if (text && sourceTag) {
      return {
        text,
        sourceTag,
      }
    }
  }
  return null
}

function pickDynamicAnchor(...sources: DynamicTextSource[]): DynamicTextSelection | null {
  for (const source of sources) {
    const text = sanitizeDialogueAnchorText(source.value, 180)
    const sourceTag = sanitizeTag(source.sourceTag)
    if (text && sourceTag) {
      return {
        text,
        sourceTag,
      }
    }
  }
  return null
}

function resolvePrimaryReplyAnchor(input: {
  conversationState: AlicizationConversationStateSnapshot
  discourseState: AlicizationDiscourseStateSnapshot
  dialogueEncounter?: AlicizationDialogueEncounterSurface | null
}) {
  return pickDynamicAnchor(
    {
      value: input.conversationState.primaryTurnAnchor,
      sourceTag: 'conversation-state:primary-turn-anchor',
    },
    {
      value: input.discourseState.primaryTurnAnchor,
      sourceTag: 'discourse-state:primary-turn-anchor',
    },
    {
      value: input.dialogueEncounter?.taskAnchor,
      sourceTag: 'dialogue-encounter:task-anchor',
    },
    {
      value: input.conversationState.hostMove,
      sourceTag: 'conversation-state:host-move',
    },
  )
}

function isDialogueFirstReplyTurn(input: {
  discourseState: AlicizationDiscourseStateSnapshot
  answerCompiler: AlicizationAnswerCompilerSnapshot
  dialogueEncounter?: AlicizationDialogueEncounterSurface | null
}) {
  const subject = input.dialogueEncounter?.subject
    ?? input.answerCompiler.answerSubject
    ?? input.discourseState.currentTurnSubject
  return input.dialogueEncounter?.screenReferenceMode === 'avoid'
    || subject === 'relationship'
    || subject === 'alicization-self'
    || subject === 'host-state'
    || subject === 'general'
}

function makeMotive(input: {
  kind: AlicizationReplyMotive
  summary: DynamicTextSelection | null
  weight: number
}) {
  if (!input.summary)
    return null

  return {
    kind: input.kind,
    summary: input.summary.text,
    weight: clamp01(input.weight),
    sourceTags: [input.summary.sourceTag],
  } satisfies AlicizationReplyMotiveSnapshot
}

function uniqueCandidateSummaries(candidates: AlicizationReplyMotiveSnapshot[]) {
  const seen = new Set<string>()
  return candidates.filter((candidate) => {
    if (seen.has(candidate.summary))
      return false
    seen.add(candidate.summary)
    return true
  })
}

function speakingFrom(input: {
  answerCompiler: AlicizationAnswerCompilerSnapshot
  discourseState: AlicizationDiscourseStateSnapshot
}) {
  if (input.answerCompiler.evidenceMode === 'live-grounded' || input.answerCompiler.evidenceMode === 'live-observed')
    return 'live-scene' as const
  if (input.answerCompiler.evidenceMode === 'continuity-carry' || input.answerCompiler.evidenceMode === 'repair-first')
    return 'held-memory' as const
  if (input.discourseState.currentTurnSubject === 'task-knot')
    return 'task-thread' as const
  if (input.discourseState.currentTurnSubject === 'relationship' || input.discourseState.currentTurnSubject === 'host-state')
    return 'dialogue-bond' as const
  if (input.discourseState.currentTurnSubject === 'alicization-self')
    return 'self-continuity' as const
  return 'task-thread' as const
}

function resolveSpeakingSource(input: {
  answerCompiler: AlicizationAnswerCompilerSnapshot
  discourseState: AlicizationDiscourseStateSnapshot
  truthDiscipline: AlicizationCurrentConsciousFrameSnapshot['truthDiscipline'] | null
  shouldSelfRevise: boolean
  shouldWithholdSpecificity: boolean
  groundedRepairResolved: boolean
}) {
  if (input.groundedRepairResolved)
    return speakingFrom(input)
  if (input.truthDiscipline === 'dialogue-first') {
    if (input.discourseState.currentTurnSubject === 'alicization-self')
      return 'self-continuity' as const
    if (
      input.discourseState.currentTurnSubject === 'relationship'
      || input.discourseState.currentTurnSubject === 'host-state'
      || input.discourseState.currentTurnSubject === 'general'
    ) {
      return 'dialogue-bond' as const
    }
  }
  if (input.truthDiscipline === 'memory-labeled' || input.shouldSelfRevise)
    return 'held-memory' as const
  if (input.shouldWithholdSpecificity)
    return 'live-scene' as const
  return speakingFrom(input)
}

function repairIsAlreadySettledByFreshGrounding(input: {
  answerCompiler: AlicizationAnswerCompilerSnapshot
  discourseState: AlicizationDiscourseStateSnapshot
}) {
  return input.answerCompiler.evidenceMode === 'live-grounded'
    && input.answerCompiler.turnMode !== 'screen-repair'
    && input.answerCompiler.screenReferenceMode !== 'avoid'
    && (
      input.discourseState.currentTurnSubject === 'visible-scene'
      || input.discourseState.currentTurnSubject === 'task-knot'
    )
}

function recommendedMotive(answerCompiler: AlicizationAnswerCompilerSnapshot): AlicizationReplyMotive {
  switch (answerCompiler.recommendedAct) {
    case 'ask-reground':
    case 'correct-stale-anchor':
      return 'repair'
    case 'guide':
      return 'guide'
    case 'care':
      return 'care'
    case 'defer':
      return 'defer'
    case 'answer':
    default:
      return 'answer'
  }
}

function resolveDynamicReplyText(input: {
  selectedMotive: AlicizationReplyMotive
  conversationState: AlicizationConversationStateSnapshot
  discourseState: AlicizationDiscourseStateSnapshot
  answerCompiler: AlicizationAnswerCompilerSnapshot
  primaryTurnAnchor: DynamicTextSelection | null
  claimEvidenceLedger?: AlicizationClaimEvidenceLedgerSnapshot | null
  worldModel?: AlicizationWorldModelSnapshot | null
  dialogueEncounter?: AlicizationDialogueEncounterSurface | null
  groundedRepairResolved: boolean
}) {
  const repairText = input.selectedMotive === 'repair' && !input.groundedRepairResolved
    ? pickDynamicText(
        220,
        {
          value: input.conversationState.owedRepair,
          sourceTag: 'conversation-state:owed-repair',
        },
        {
          value: input.answerCompiler.uncertaintyBoundary,
          sourceTag: 'answer-compiler:uncertainty-boundary',
        },
        {
          value: input.discourseState.ruptureRepair,
          sourceTag: 'discourse-state:rupture-repair',
        },
        {
          value: input.worldModel?.epistemicState.staleRisks[0],
          sourceTag: 'world-model:stale-risk',
        },
      )
    : null

  return (repairText ?? pickDynamicText(
    220,
    {
      value: input.discourseState.currentQuestion,
      sourceTag: 'discourse-state:current-question',
    },
    ...(input.primaryTurnAnchor ? [selectionAsSource(input.primaryTurnAnchor)] : []),
    {
      value: input.conversationState.unansweredQuestion,
      sourceTag: 'conversation-state:unanswered-question',
    },
    {
      value: input.dialogueEncounter?.taskAnchor,
      sourceTag: 'dialogue-encounter:task-anchor',
    },
    {
      value: input.claimEvidenceLedger?.observedSurface,
      sourceTag: 'claim-evidence-ledger:observed-surface',
    },
    {
      value: input.conversationState.hostMove,
      sourceTag: 'conversation-state:host-move',
    },
  ))?.text ?? ''
}

export function buildReplyDeliberation(input: {
  now: number
  conversationState?: AlicizationConversationStateSnapshot | null
  discourseState?: AlicizationDiscourseStateSnapshot | null
  mindSynthesis?: unknown
  answerCompiler?: AlicizationAnswerCompilerSnapshot | null
  currentConsciousFrame?: AlicizationCurrentConsciousFrameSnapshot | null
  claimEvidenceLedger?: AlicizationClaimEvidenceLedgerSnapshot | null
  privateThought?: AlicizationPrivateThoughtSnapshot | null
  worldModel?: AlicizationWorldModelSnapshot | null
  dialogueEncounter?: AlicizationDialogueTurnEncounter | AlicizationDialogueEncounterSurface | null
  runtimeSurface?: AlicizationDigitalLifeRuntimeSurface | null
}): AlicizationReplyDeliberationSnapshot | null {
  const runtimeSurface = input.runtimeSurface ?? null
  const conversationState = runtimeSurface?.dialogue.conversationState ?? input.conversationState ?? null
  const discourseState = runtimeSurface?.dialogue.discourseState ?? input.discourseState ?? null
  const answerCompiler = runtimeSurface?.dialogue.answerCompiler ?? input.answerCompiler ?? null
  const currentConsciousFrame = runtimeSurface?.dialogue.currentConsciousFrame ?? input.currentConsciousFrame ?? null
  const claimEvidenceLedger = runtimeSurface?.dialogue.claimEvidenceLedger ?? input.claimEvidenceLedger ?? null
  const privateThought = runtimeSurface?.cognition.privateThought ?? input.privateThought ?? null
  const worldModel = runtimeSurface?.world.worldModel ?? input.worldModel ?? null
  const dialogueEncounter = runtimeSurface?.dialogue.dialogueEncounter ?? input.dialogueEncounter ?? null

  if (!conversationState || !discourseState || !answerCompiler)
    return null

  const primaryTurnAnchor = resolvePrimaryReplyAnchor({
    conversationState,
    discourseState,
    dialogueEncounter,
  })
  const dialogueFirstTurn = isDialogueFirstReplyTurn({
    discourseState,
    answerCompiler,
    dialogueEncounter,
  })
  const groundedRepairResolved = repairIsAlreadySettledByFreshGrounding({
    answerCompiler,
    discourseState,
  })
  const rawFrameCenter = currentConsciousFrame?.centerOfGravity ?? null
  const frameCenter = groundedRepairResolved && rawFrameCenter === 'repair'
    ? null
    : rawFrameCenter
  const shouldWithholdSpecificity = !groundedRepairResolved
    && currentConsciousFrame?.shouldWithholdSpecificity === true
  const shouldSelfRevise = !groundedRepairResolved
    && currentConsciousFrame?.shouldSelfRevise === true
  const truthDiscipline = currentConsciousFrame?.truthDiscipline ?? null
  const coarseSceneBudget = claimEvidenceLedger?.specificityBudget === 'coarse-scene'
  const repairRequired = discourseState.owedAction === 'repair-truth'
    || answerCompiler.recommendedAct === 'ask-reground'
    || answerCompiler.recommendedAct === 'correct-stale-anchor'
  const repairApplies = !groundedRepairResolved
    && (
      repairRequired
      || frameCenter === 'repair'
      || shouldSelfRevise
    )
  const guideApplies = discourseState.owedAction === 'guide-task'
    || answerCompiler.recommendedAct === 'guide'
    || discourseState.currentTurnSubject === 'task-knot'
    || frameCenter === 'guide'
  const careApplies = discourseState.owedAction === 'care-host'
    || answerCompiler.recommendedAct === 'care'
    || discourseState.currentTurnSubject === 'host-state'
    || privateThought?.stance === 'care'
    || privateThought?.stance === 'warn'
    || frameCenter === 'care'
  const attuneApplies = discourseState.currentTurnSubject === 'relationship'
    || discourseState.currentTurnSubject === 'alicization-self'
    || frameCenter === 'attune'
  const witnessApplies = discourseState.currentTurnSubject === 'visible-scene'
    || answerCompiler.evidenceMode === 'live-grounded'
    || answerCompiler.evidenceMode === 'live-observed'
    || frameCenter === 'witness'
    || Boolean(sanitizeDynamicText(claimEvidenceLedger?.observedSurface))
  const answerApplies = answerCompiler.recommendedAct === 'answer'
    || discourseState.owedAction === 'answer-self'
    || discourseState.owedAction === 'answer-relationship'
    || discourseState.owedAction === 'answer-general'
    || frameCenter === 'answer'
  const deferApplies = answerCompiler.recommendedAct === 'defer'
    || privateThought?.shouldSpeak === false
    || frameCenter === 'defer'
  const directReplyRequired = Boolean(
    sanitizeDynamicText(discourseState.currentQuestion)
    || sanitizeDynamicText(conversationState.unansweredQuestion)
    || primaryTurnAnchor?.text
    || dialogueEncounter?.mustAnswerDirectly === true,
  )

  const motiveWeights: Record<AlicizationReplyMotive, number> = {
    repair: groundedRepairResolved
      ? 0.08
      : repairRequired
        ? 0.96
        : 0.12
          + (frameCenter === 'repair' ? 0.12 : 0)
          + (shouldSelfRevise ? 0.1 : 0),
    guide: (
      groundedRepairResolved && answerCompiler.answerSubject === 'task-knot'
        ? 0.92
        : discourseState.owedAction === 'guide-task' || answerCompiler.recommendedAct === 'guide'
          ? 0.88
          : conversationState.shouldHoldThread ? 0.52 : 0.18
    )
    + (frameCenter === 'guide' ? 0.12 : 0)
    - (coarseSceneBudget ? 0.12 : 0)
    - (shouldWithholdSpecificity ? 0.18 : 0),
    care: discourseState.owedAction === 'care-host'
      || answerCompiler.recommendedAct === 'care'
      || privateThought?.stance === 'care'
      || privateThought?.stance === 'warn'
      ? 0.84
      : 0.18 + (frameCenter === 'care' ? 0.12 : 0),
    attune: discourseState.currentTurnSubject === 'relationship'
      ? 0.82
      : discourseState.currentTurnSubject === 'alicization-self'
        ? 0.74
        : dialogueFirstTurn
          ? 0.44
          : 0.14 + (frameCenter === 'attune' ? 0.12 : 0),
    witness: (
      groundedRepairResolved && answerCompiler.answerSubject === 'visible-scene'
        ? 0.92
        : discourseState.currentTurnSubject === 'visible-scene'
          ? 0.8
          : answerCompiler.evidenceMode === 'live-grounded' || answerCompiler.evidenceMode === 'live-observed'
            ? (dialogueFirstTurn ? 0.22 : 0.64)
            : 0.16
    )
    + (frameCenter === 'witness' ? 0.12 : 0)
    + (coarseSceneBudget ? 0.14 : 0)
    + (shouldWithholdSpecificity ? 0.28 : 0),
    answer: answerCompiler.recommendedAct === 'answer'
      ? (dialogueFirstTurn ? 0.8 : 0.72) - (coarseSceneBudget ? 0.08 : 0)
      : dialogueFirstTurn
        ? 0.42
        : 0.32
          + (frameCenter === 'answer' ? 0.12 : 0)
          - (shouldWithholdSpecificity ? 0.1 : 0),
    defer: answerCompiler.recommendedAct === 'defer' || privateThought?.shouldSpeak === false
      ? 0.58
      : 0.08 + (frameCenter === 'defer' ? 0.12 : 0),
  }

  const repairSummary = repairApplies
    ? pickDynamicText(
        180,
        {
          value: conversationState.owedRepair,
          sourceTag: 'conversation-state:owed-repair',
        },
        {
          value: answerCompiler.uncertaintyBoundary,
          sourceTag: 'answer-compiler:uncertainty-boundary',
        },
        {
          value: discourseState.ruptureRepair,
          sourceTag: 'discourse-state:rupture-repair',
        },
        {
          value: worldModel?.epistemicState.staleRisks[0],
          sourceTag: 'world-model:stale-risk',
        },
      )
    : null
  const guideSummary = pickDynamicText(
    180,
    {
      value: discourseState.currentQuestion,
      sourceTag: 'discourse-state:current-question',
    },
    ...(primaryTurnAnchor ? [selectionAsSource(primaryTurnAnchor)] : []),
    {
      value: conversationState.unansweredQuestion,
      sourceTag: 'conversation-state:unanswered-question',
    },
    {
      value: dialogueEncounter?.taskAnchor,
      sourceTag: 'dialogue-encounter:task-anchor',
    },
    {
      value: claimEvidenceLedger?.observedSurface,
      sourceTag: 'claim-evidence-ledger:observed-surface',
    },
    {
      value: conversationState.hostMove,
      sourceTag: 'conversation-state:host-move',
    },
  )
  const careSummary = pickDynamicText(
    180,
    {
      value: conversationState.hostMove,
      sourceTag: 'conversation-state:host-move',
    },
    {
      value: discourseState.currentQuestion,
      sourceTag: 'discourse-state:current-question',
    },
    ...(primaryTurnAnchor ? [selectionAsSource(primaryTurnAnchor)] : []),
  )
  const attuneSummary = pickDynamicText(
    180,
    {
      value: conversationState.hostMove,
      sourceTag: 'conversation-state:host-move',
    },
    {
      value: discourseState.currentQuestion,
      sourceTag: 'discourse-state:current-question',
    },
    ...(primaryTurnAnchor ? [selectionAsSource(primaryTurnAnchor)] : []),
  )
  const witnessSummary = pickDynamicText(
    180,
    {
      value: claimEvidenceLedger?.observedSurface,
      sourceTag: 'claim-evidence-ledger:observed-surface',
    },
    {
      value: discourseState.currentQuestion,
      sourceTag: 'discourse-state:current-question',
    },
    ...(primaryTurnAnchor ? [selectionAsSource(primaryTurnAnchor)] : []),
  )
  const answerSummary = pickDynamicText(
    180,
    {
      value: discourseState.currentQuestion,
      sourceTag: 'discourse-state:current-question',
    },
    ...(primaryTurnAnchor ? [selectionAsSource(primaryTurnAnchor)] : []),
    {
      value: conversationState.hostMove,
      sourceTag: 'conversation-state:host-move',
    },
    {
      value: conversationState.unansweredQuestion,
      sourceTag: 'conversation-state:unanswered-question',
    },
    {
      value: claimEvidenceLedger?.observedSurface,
      sourceTag: 'claim-evidence-ledger:observed-surface',
    },
  )
  const deferSummary = pickDynamicText(
    180,
    {
      value: conversationState.hostMove,
      sourceTag: 'conversation-state:host-move',
    },
    {
      value: discourseState.currentQuestion,
      sourceTag: 'discourse-state:current-question',
    },
    ...(primaryTurnAnchor ? [selectionAsSource(primaryTurnAnchor)] : []),
  )

  const candidates = [
    makeMotive({
      kind: 'repair',
      summary: repairApplies ? repairSummary : null,
      weight: motiveWeights.repair,
    }),
    makeMotive({
      kind: 'guide',
      summary: guideApplies ? guideSummary : null,
      weight: motiveWeights.guide,
    }),
    makeMotive({
      kind: 'care',
      summary: careApplies ? careSummary : null,
      weight: motiveWeights.care,
    }),
    makeMotive({
      kind: 'attune',
      summary: attuneApplies ? attuneSummary : null,
      weight: motiveWeights.attune,
    }),
    makeMotive({
      kind: 'witness',
      summary: witnessApplies ? witnessSummary : null,
      weight: motiveWeights.witness,
    }),
    makeMotive({
      kind: 'answer',
      summary: answerApplies ? answerSummary : null,
      weight: motiveWeights.answer,
    }),
    makeMotive({
      kind: 'defer',
      summary: deferApplies ? deferSummary : null,
      weight: motiveWeights.defer,
    }),
  ]
    .filter((candidate): candidate is AlicizationReplyMotiveSnapshot => Boolean(candidate))
    .sort((left, right) => right.weight - left.weight)
  const uniqueCandidates = uniqueCandidateSummaries(candidates)

  const selectedMotive = [
    { applies: repairApplies, kind: 'repair' as const },
    { applies: guideApplies, kind: 'guide' as const },
    { applies: careApplies, kind: 'care' as const },
    { applies: attuneApplies, kind: 'attune' as const },
    { applies: witnessApplies, kind: 'witness' as const },
    { applies: answerApplies, kind: 'answer' as const },
    { applies: deferApplies, kind: 'defer' as const },
  ]
    .filter(candidate => candidate.applies)
    .sort((left, right) => motiveWeights[right.kind] - motiveWeights[left.kind])[0]
    ?.kind
    ?? recommendedMotive(answerCompiler)
  const selectedWeight = clamp01(motiveWeights[selectedMotive])
  const speakingSource = resolveSpeakingSource({
    answerCompiler,
    discourseState,
    truthDiscipline,
    shouldSelfRevise: shouldSelfRevise && !groundedRepairResolved,
    shouldWithholdSpecificity,
    groundedRepairResolved,
  })
  const dynamicReplyText = resolveDynamicReplyText({
    selectedMotive,
    conversationState,
    discourseState,
    answerCompiler,
    primaryTurnAnchor,
    claimEvidenceLedger,
    worldModel,
    dialogueEncounter,
    groundedRepairResolved,
  })

  return {
    selectedMotive,
    speakingFrom: speakingSource,
    memoryMode: conversationState.memoryMode,
    openingBeat: dynamicReplyText,
    whyThisReplyNow: dynamicReplyText,
    whyNotOtherCandidates: [],
    withheldImpulses: [],
    candidateMotives: uniqueCandidates.slice(0, 5),
    shouldSpeak: answerCompiler.recommendedAct !== 'defer'
      && (directReplyRequired || privateThought?.shouldSpeak !== false),
    mustInclude: [],
    mustAvoid: [],
    confidence: clamp01(
      selectedWeight * 0.42
      + answerCompiler.confidence * 0.28
      + conversationState.confidence * 0.18
      + (privateThought?.confidence ?? 0.34) * 0.12,
    ),
    narrative: [],
    updatedAt: input.now,
  } satisfies AlicizationReplyDeliberationSnapshot
}
