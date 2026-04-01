import type {
  AlicizationCommitmentLedgerSnapshot,
  AlicizationConcernContinuityLedgerSnapshot,
  AlicizationConversationStateSnapshot,
  AlicizationDesireMemorySnapshot,
  AlicizationDialogueAnswerSubject,
  AlicizationDiscourseStateSnapshot,
  AlicizationMindSpeechObligation,
  AlicizationMindStatementSnapshot,
  AlicizationMindSynthesisSnapshot,
  AlicizationPrivateThoughtSnapshot,
  AlicizationReflectionLedgerSnapshot,
  AlicizationRelationshipModelSnapshot,
  AlicizationRepairLedgerSnapshot,
  AlicizationSelfContinuitySnapshot,
  AlicizationSelfStateSnapshot,
  AlicizationSubjectiveInferenceSnapshot,
  AlicizationSubjectiveSceneAppraisal,
  AlicizationWorldModelSnapshot,
} from '../../../shared/eventa'
import type { AlicizationDialogueTurnEncounter } from './dialogue-turn-encounter'

import { isDialogueFirstSubject } from './dialogue-surface-text'

function clamp01(value: number) {
  if (!Number.isFinite(value))
    return 0
  return Math.max(0, Math.min(1, Number(value.toFixed(2))))
}

function sanitizeText(raw: unknown, maxChars = 220) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function uniqueByLabel(items: AlicizationMindStatementSnapshot[], maxItems = items.length) {
  const seen = new Set<string>()
  const result: AlicizationMindStatementSnapshot[] = []
  for (const item of items) {
    const key = `${item.label}::${item.summary}`.toLowerCase()
    if (!item.summary || seen.has(key))
      continue
    seen.add(key)
    result.push(item)
    if (result.length >= maxItems)
      break
  }
  return result
}

function makeStatement(input: {
  label: string
  summary?: string | null
  confidence?: number | null
  sourceTags?: string[]
}) {
  const summary = sanitizeText(input.summary, 220)
  if (!summary)
    return null
  return {
    label: sanitizeText(input.label, 48) || 'signal',
    summary,
    confidence: clamp01(input.confidence ?? 0.36),
    sourceTags: (input.sourceTags ?? []).map(tag => sanitizeText(tag, 48)).filter(Boolean).slice(0, 6),
  } satisfies AlicizationMindStatementSnapshot
}

function governingConcern(concernContinuity?: AlicizationConcernContinuityLedgerSnapshot | null) {
  return concernContinuity?.entries.find(entry => entry.id === concernContinuity.governingEntryId)
    ?? concernContinuity?.entries[0]
    ?? null
}

function governingCommitment(commitmentLedger?: AlicizationCommitmentLedgerSnapshot | null) {
  return commitmentLedger?.commitments.find(entry => entry.id === commitmentLedger.governingCommitmentId)
    ?? commitmentLedger?.commitments[0]
    ?? null
}

function governingRepair(repairLedger?: AlicizationRepairLedgerSnapshot | null) {
  return repairLedger?.entries.find(entry => entry.id === repairLedger.governingRepairId)
    ?? repairLedger?.entries[0]
    ?? null
}

function latestReflection(reflectionLedger?: AlicizationReflectionLedgerSnapshot | null) {
  return reflectionLedger?.entries.find(entry => entry.id === reflectionLedger.latestEntryId)
    ?? reflectionLedger?.entries[0]
    ?? null
}

function strongestDesire(desireMemory?: AlicizationDesireMemorySnapshot | null) {
  return desireMemory?.activeDesires
    .slice()
    .sort((left, right) => right.strength - left.strength)[0]
    ?? null
}

function resolveTurnAnchorCue(input: {
  discourseState: AlicizationDiscourseStateSnapshot
  conversationState?: AlicizationConversationStateSnapshot | null
  dialogueEncounter?: AlicizationDialogueTurnEncounter | null
}) {
  return sanitizeText(
    input.conversationState?.primaryTurnAnchor
    || input.discourseState.primaryTurnAnchor
    || input.dialogueEncounter?.taskAnchor
    || input.conversationState?.unansweredQuestion
    || input.discourseState.currentQuestion
    || input.dialogueEncounter?.summary
    || input.conversationState?.jointThread
    || '',
    180,
  ) || null
}

function resolveOpeningIntent(input: {
  subject: AlicizationDialogueAnswerSubject
  speechObligation: AlicizationMindSpeechObligation
  discourseState: AlicizationDiscourseStateSnapshot
  privateThought?: AlicizationPrivateThoughtSnapshot | null
  anchorCue?: string | null
}) {
  if (input.speechObligation === 'repair-truth')
    return 'Repair the truth seam before warmth, style, or old carry can take over.'
  if (input.speechObligation === 'guide-task')
    return 'Stay inside the host’s current knot and move one step closer to resolution.'
  if (input.speechObligation === 'care-host')
    return 'Acknowledge the host condition, but keep the care anchored to what is actually happening.'
  if (input.speechObligation === 'inspect-scene')
    return 'Speak from what is visible now and separate live sight from carried memory.'
  if (input.subject === 'alicization-self')
    return 'Answer from Alicization’s own continuity instead of borrowing the screen as a crutch.'
  if (input.subject === 'relationship')
    return 'Stay with the relationship bid directly without forcing an oversized scene explanation.'
  if (input.privateThought?.stance === 'accompany')
    return 'Stay near the host without letting companionship replace the actual answer.'
  if (
    input.anchorCue
    && (
      input.discourseState.screenReferenceMode === 'avoid'
      || input.discourseState.continuityMode === 'dialogue-first'
      || isDialogueFirstSubject(input.subject)
    )
  ) {
    return `Answer the present seam directly: ${input.anchorCue}`
  }
  return `Fulfill the present turn directly: ${input.discourseState.currentTurnSummary}`
}

function resolveTruthBoundary(input: {
  discourseState: AlicizationDiscourseStateSnapshot
  worldModel?: AlicizationWorldModelSnapshot | null
  repairLedger?: AlicizationRepairLedgerSnapshot | null
  subjectiveInference?: AlicizationSubjectiveInferenceSnapshot | null
}) {
  if (input.discourseState.screenReferenceMode === 'avoid') {
    return 'The current answer is dialogue-first. Screen continuity may inform tone or caution, but it must not seize the opening answer.'
  }
  if (input.repairLedger?.shouldConstrainPresentTense) {
    return 'Present-tense scene claims are constrained until the stale anchor or ungrounded seam is repaired.'
  }
  const certainty = input.worldModel?.epistemicState.certainty ?? 'uncertain'
  if (certainty === 'grounded')
    return 'Fresh grounded evidence can carry the opening claim, but it still must stay inside the current turn subject.'
  if (certainty === 'observed')
    return 'Live observation is available, but low-level details should stay modest unless they are clearly seen.'
  if (certainty === 'lingering')
    return 'The active scene is being held through continuity; any scene detail should be labeled as carry, not current fact.'
  if (input.subjectiveInference?.uncertainty)
    return sanitizeText(input.subjectiveInference.uncertainty, 220)
  return 'If the scene is not freshly grounded, keep claims narrow and explicitly separate memory, continuity, and uncertainty.'
}

function resolveInteriorSummary(input: {
  discourseState: AlicizationDiscourseStateSnapshot
  concernSummary?: string | null
  commitmentSummary?: string | null
  repairSummary?: string | null
  desireSummary?: string | null
  privateThought?: AlicizationPrivateThoughtSnapshot | null
  turnAnchorCue?: string | null
  dialogueFirstTurn?: boolean
}) {
  return sanitizeText(
    input.privateThought?.thoughtText
    || (input.dialogueFirstTurn ? input.turnAnchorCue : '')
    || input.concernSummary
    || input.commitmentSummary
    || input.repairSummary
    || input.desireSummary
    || input.discourseState.currentTurnSummary,
    220,
  ) || 'Stay with the living turn rather than drifting into residue.'
}

export function buildMindSynthesis(input: {
  now: number
  discourseState?: AlicizationDiscourseStateSnapshot | null
  dialogueEncounter?: AlicizationDialogueTurnEncounter | null
  conversationState?: AlicizationConversationStateSnapshot | null
  worldModel?: AlicizationWorldModelSnapshot | null
  subjectiveInference?: AlicizationSubjectiveInferenceSnapshot | null
  appraisal?: AlicizationSubjectiveSceneAppraisal | null
  concernContinuity?: AlicizationConcernContinuityLedgerSnapshot | null
  commitmentLedger?: AlicizationCommitmentLedgerSnapshot | null
  repairLedger?: AlicizationRepairLedgerSnapshot | null
  reflectionLedger?: AlicizationReflectionLedgerSnapshot | null
  relationshipModel?: AlicizationRelationshipModelSnapshot | null
  privateThought?: AlicizationPrivateThoughtSnapshot | null
  desireMemory?: AlicizationDesireMemorySnapshot | null
  selfState?: AlicizationSelfStateSnapshot | null
  selfContinuity?: AlicizationSelfContinuitySnapshot | null
}): AlicizationMindSynthesisSnapshot | null {
  if (!input.discourseState)
    return null

  const concern = governingConcern(input.concernContinuity)
  const commitment = governingCommitment(input.commitmentLedger)
  const repair = governingRepair(input.repairLedger)
  const reflection = latestReflection(input.reflectionLedger)
  const desire = strongestDesire(input.desireMemory)
  const dialogueFirstTurn = input.dialogueEncounter?.dialogueFirst
    ?? isDialogueFirstSubject(input.discourseState.currentTurnSubject)
  const turnAnchorCue = resolveTurnAnchorCue({
    discourseState: input.discourseState,
    conversationState: input.conversationState ?? null,
    dialogueEncounter: input.dialogueEncounter ?? null,
  })

  const beliefs = uniqueByLabel([
    makeStatement({
      label: 'turn-anchor',
      summary: turnAnchorCue,
      confidence: Math.max(
        input.conversationState?.confidence ?? 0.4,
        input.dialogueEncounter?.confidence ?? input.discourseState.confidence,
      ),
      sourceTags: ['dialogue-anchor', input.conversationState?.primaryTurnAnchorSource ?? 'encounter'],
    }),
    makeStatement({
      label: 'living-thread',
      summary: input.worldModel?.activeThread?.summary ?? input.worldModel?.activeThread?.title ?? null,
      confidence: input.worldModel?.activeThread?.confidence ?? 0.44,
      sourceTags: ['world-model', input.worldModel?.activeThread?.kind ?? 'unknown'],
    }),
    makeStatement({
      label: 'subjective-read',
      summary: input.subjectiveInference?.dominantInterpretation,
      confidence: input.subjectiveInference?.confidence ?? 0.42,
      sourceTags: ['subjective-inference', input.subjectiveInference?.source ?? 'heuristic'],
    }),
    makeStatement({
      label: 'situated-meaning',
      summary: input.subjectiveInference?.situatedMeaning ?? input.appraisal?.situatedMeaning ?? input.appraisal?.currentKnot,
      confidence: Math.max(input.subjectiveInference?.confidence ?? 0.32, input.appraisal?.confidence ?? 0.32),
      sourceTags: ['appraisal'],
    }),
    makeStatement({
      label: 'reflection-revision',
      summary: reflection?.revision,
      confidence: Math.max(0.28, reflection?.confidenceShift ?? 0.28),
      sourceTags: ['reflection-ledger', reflection?.outcome ?? 'unknown'],
    }),
    makeStatement({
      label: 'conversation-thread',
      summary: input.conversationState?.jointThread,
      confidence: input.conversationState?.confidence ?? 0.42,
      sourceTags: ['conversation-state', input.conversationState?.memoryMode ?? 'unknown'],
    }),
  ].filter((item): item is AlicizationMindStatementSnapshot => Boolean(item)), 4)

  const uncertainties = uniqueByLabel([
    makeStatement({
      label: 'truth-boundary',
      summary: input.subjectiveInference?.uncertainty,
      confidence: 1 - (input.subjectiveInference?.confidence ?? 0.42),
      sourceTags: ['subjective-inference'],
    }),
    makeStatement({
      label: 'waiting-to-verify',
      summary: input.appraisal?.waitingToVerify,
      confidence: 1 - (input.appraisal?.confidence ?? 0.42),
      sourceTags: ['appraisal'],
    }),
    makeStatement({
      label: 'repair-pressure',
      summary: repair?.summary,
      confidence: Math.max(repair?.confidence ?? 0.42, input.repairLedger?.truthRisk ?? 0.42),
      sourceTags: ['repair-ledger', repair?.kind ?? 'unknown'],
    }),
    makeStatement({
      label: 'open-question',
      summary: input.worldModel?.epistemicState.openQuestions[0] ?? null,
      confidence: 0.4,
      sourceTags: ['world-model', 'epistemic-open-question'],
    }),
    makeStatement({
      label: 'conversation-question',
      summary: input.conversationState?.unansweredQuestion,
      confidence: input.conversationState?.shouldHoldThread ? 0.62 : 0.3,
      sourceTags: ['conversation-state'],
    }),
  ].filter((item): item is AlicizationMindStatementSnapshot => Boolean(item)), 4)

  const concerns = uniqueByLabel([
    makeStatement({
      label: 'governing-concern',
      summary: concern?.summary,
      confidence: concern?.confidence ?? 0.4,
      sourceTags: ['concern-continuity', concern?.kind ?? 'unknown'],
    }),
    makeStatement({
      label: 'private-tension',
      summary: input.privateThought?.thoughtText,
      confidence: input.privateThought?.confidence ?? 0.36,
      sourceTags: ['private-thought', input.privateThought?.stance ?? 'unknown'],
    }),
    makeStatement({
      label: 'host-state',
      summary: input.selfState?.moodLabel
        ? `Current inner reading leans toward ${input.selfState.moodLabel}.`
        : null,
      confidence: Math.max(input.selfState?.desireToSpeak ?? 0.24, input.selfState?.fearOfInterrupting ?? 0.24),
      sourceTags: ['self-state'],
    }),
    makeStatement({
      label: 'reply-pressure',
      summary: input.conversationState?.hostMove,
      confidence: input.conversationState?.confidence ?? 0.4,
      sourceTags: ['conversation-state'],
    }),
  ].filter((item): item is AlicizationMindStatementSnapshot => Boolean(item)), 4)

  const commitments = uniqueByLabel([
    makeStatement({
      label: 'governing-commitment',
      summary: commitment?.summary ?? commitment?.title ?? null,
      confidence: commitment?.confidence ?? 0.42,
      sourceTags: ['commitment-ledger', commitment?.kind ?? 'unknown'],
    }),
    makeStatement({
      label: 'repair-obligation',
      summary: input.discourseState.ruptureRepair,
      confidence: Math.max(input.discourseState.confidence, repair?.confidence ?? 0.36),
      sourceTags: ['discourse-state', 'repair-carry'],
    }),
    makeStatement({
      label: 'conversation-commitment',
      summary: input.conversationState?.activeCommitments[0] ?? null,
      confidence: input.conversationState?.confidence ?? 0.42,
      sourceTags: ['conversation-state'],
    }),
  ].filter((item): item is AlicizationMindStatementSnapshot => Boolean(item)), 3)

  const desires = uniqueByLabel([
    makeStatement({
      label: 'active-desire',
      summary: desire?.reason,
      confidence: desire?.strength ?? 0.34,
      sourceTags: ['desire-memory', desire?.kind ?? 'unknown'],
    }),
    makeStatement({
      label: 'relationship-vector',
      summary: input.relationshipModel
        ? `Approach the host with ${input.relationshipModel.approachVector} in a ${input.relationshipModel.climate} climate.`
        : null,
      confidence: Math.max(input.relationshipModel?.receptivity ?? 0.3, input.relationshipModel?.sharedAttentionTrust ?? 0.3),
      sourceTags: ['relationship-model'],
    }),
    makeStatement({
      label: 'continuity-drive',
      summary: input.selfContinuity
        ? `Current continuity is colored by ${input.selfContinuity.attachmentMode} attachment and ${input.selfContinuity.initiativeTemperament} initiative.`
        : null,
      confidence: Math.max(input.selfContinuity?.relationshipTrust ?? 0.28, input.selfContinuity?.carryOverDesire ?? 0.28),
      sourceTags: ['self-continuity'],
    }),
  ].filter((item): item is AlicizationMindStatementSnapshot => Boolean(item)), 3)

  const truthBoundary = resolveTruthBoundary({
    discourseState: input.discourseState,
    worldModel: input.worldModel ?? null,
    repairLedger: input.repairLedger ?? null,
    subjectiveInference: input.subjectiveInference ?? null,
  })
  const shouldAnchorDialogueOpeningIntent = dialogueFirstTurn
    && (
      input.discourseState.currentTurnSubject === 'general'
      || input.discourseState.currentTurnSubject === 'host-state'
    )
  const conversationOpeningSource = shouldAnchorDialogueOpeningIntent
    ? turnAnchorCue
    ?? input.dialogueEncounter?.summary
    ?? input.conversationState?.unansweredQuestion
    ?? input.conversationState?.jointThread
    : input.conversationState?.shouldHoldThread
      ? input.conversationState.unansweredQuestion
      ?? input.conversationState.primaryTurnAnchor
      ?? input.conversationState.activeCommitments[0]
      ?? input.conversationState.jointThread
      : ''
  const conversationOpeningIntent = sanitizeText(
    conversationOpeningSource,
    220,
  )
  const openingIntent = conversationOpeningIntent
    || resolveOpeningIntent({
      subject: input.discourseState.currentTurnSubject,
      speechObligation: input.discourseState.owedAction,
      discourseState: input.discourseState,
      privateThought: input.privateThought ?? null,
      anchorCue: dialogueFirstTurn ? turnAnchorCue : null,
    })
  const interiorSummary = resolveInteriorSummary({
    discourseState: input.discourseState,
    concernSummary: concerns[0]?.summary ?? null,
    commitmentSummary: commitments[0]?.summary ?? null,
    repairSummary: repair?.summary ?? null,
    desireSummary: turnAnchorCue ?? input.conversationState?.jointThread ?? desires[0]?.summary ?? null,
    privateThought: input.privateThought ?? null,
    turnAnchorCue,
    dialogueFirstTurn,
  })

  return {
    answerSubject: input.discourseState.currentTurnSubject,
    relationMove: input.discourseState.relationMove,
    speechObligation: input.discourseState.owedAction,
    beliefs,
    uncertainties,
    concerns,
    commitments,
    desires,
    openingIntent,
    truthBoundary,
    interiorSummary,
    confidence: clamp01(
      input.discourseState.confidence * 0.34
      + (beliefs[0]?.confidence ?? 0.3) * 0.16
      + (concerns[0]?.confidence ?? 0.3) * 0.14
      + (commitments[0]?.confidence ?? 0.3) * 0.14
      + (desires[0]?.confidence ?? 0.28) * 0.08
      + (input.privateThought?.confidence ?? 0.3) * 0.14,
    ),
    narrative: uniqueByLabel([
      makeStatement({
        label: 'subject',
        summary: `subject:${input.discourseState.currentTurnSubject}`,
        confidence: input.discourseState.confidence,
        sourceTags: ['discourse-state'],
      }),
      makeStatement({
        label: 'obligation',
        summary: `owed:${input.discourseState.owedAction}`,
        confidence: input.discourseState.confidence,
        sourceTags: ['discourse-state'],
      }),
      makeStatement({
        label: 'relation',
        summary: `relation:${input.discourseState.relationMove}`,
        confidence: input.discourseState.confidence,
        sourceTags: ['discourse-state'],
      }),
      makeStatement({
        label: 'opening-intent',
        summary: openingIntent,
        confidence: 0.6,
        sourceTags: ['mind-synthesis'],
      }),
      makeStatement({
        label: 'truth-boundary',
        summary: truthBoundary,
        confidence: 0.6,
        sourceTags: ['mind-synthesis'],
      }),
    ].filter((item): item is AlicizationMindStatementSnapshot => Boolean(item)), 5).map(item => item.summary),
    updatedAt: input.now,
  } satisfies AlicizationMindSynthesisSnapshot
}

export function buildMindSynthesisSystemBlock(state: AlicizationMindSynthesisSnapshot | null | undefined) {
  if (!state)
    return ''

  const summarize = (label: string, rows: AlicizationMindStatementSnapshot[]) => [
    `${label}:`,
    ...(rows.length > 0
      ? rows.map(row => `- ${row.label}: ${row.summary} (confidence ${row.confidence})`)
      : ['- none']),
  ]

  return [
    '[ALICIZATION_MIND_SYNTHESIS]',
    'This block is Alicization’s internal synthesis for the current turn. Treat it as the living mental spine, not decorative metadata.',
    `Answer subject: ${state.answerSubject}.`,
    `Relation move: ${state.relationMove}.`,
    `Speech obligation: ${state.speechObligation}.`,
    `Opening intent: ${state.openingIntent}.`,
    `Truth boundary: ${state.truthBoundary}.`,
    `Interior summary: ${state.interiorSummary}.`,
    ...summarize('Beliefs', state.beliefs),
    ...summarize('Uncertainties', state.uncertainties),
    ...summarize('Concerns', state.concerns),
    ...summarize('Commitments', state.commitments),
    ...summarize('Desires', state.desires),
    'The reply must sound like it was formed from this inner synthesis before it was phrased.',
  ].join('\n')
}
