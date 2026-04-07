import type {
  AlicizationCommitmentLedgerSnapshot,
  AlicizationConversationMemoryMode,
  AlicizationConversationStateSnapshot,
  AlicizationDialogueTurnEncounterSnapshot,
  AlicizationDiscourseStateSnapshot,
  AlicizationPrivateThoughtSnapshot,
  AlicizationReflectionLedgerSnapshot,
  AlicizationRelationshipModelSnapshot,
  AlicizationRepairLedgerSnapshot,
  AlicizationVisualSceneSnapshot,
  AlicizationWorldModelSnapshot,
} from '../../../shared/eventa'
import type { AlicizationDialogueFocusGovernance } from './dialogue-focus-governor'
import type { AlicizationDialogueObligation } from './dialogue-obligation'
import type { AlicizationDialogueTurnEncounter } from './dialogue-turn-encounter'
import type { AlicizationDialogueTurnSemantics } from './dialogue-turn-semantics'
import type { AlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'

import { isDialogueFirstSubject, isSceneThreadSubject, pickDialogueSurfaceText, sanitizeDialogueAnchorText, sanitizeDialogueSurfaceText } from './dialogue-surface-text'
import { resolvePrimaryTurnAnchor, turnAnchorAligns } from './dialogue-turn-anchor'

interface AlicizationDialogueEncounterSurface extends Pick<
  AlicizationDialogueTurnEncounterSnapshot,
  'summary' | 'dialogueFirst'
> {}

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

function uniqueList(values: Array<string | null | undefined>, maxItems = 8) {
  const result: string[] = []
  for (const value of values) {
    const normalized = sanitizeText(value, 180)
    if (!normalized || result.includes(normalized))
      continue
    result.push(normalized)
    if (result.length >= maxItems)
      break
  }
  return result
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

function resolveMemoryMode(input: {
  discourseState: AlicizationDiscourseStateSnapshot
  worldModel?: AlicizationWorldModelSnapshot | null
  privateThought?: AlicizationPrivateThoughtSnapshot | null
}) {
  if (input.discourseState.screenReferenceMode === 'avoid')
    return 'dialogue-carry' as const satisfies AlicizationConversationMemoryMode
  if (input.discourseState.currentTurnSubject === 'task-knot')
    return 'task-thread' as const satisfies AlicizationConversationMemoryMode
  if (input.discourseState.currentTurnSubject === 'visible-scene')
    return 'scene-anchored' as const satisfies AlicizationConversationMemoryMode
  if (
    input.privateThought?.emotionalTension === 'tense-debug'
    || input.privateThought?.emotionalTension === 'late-night-drain'
    || input.worldModel?.activeThread?.unresolved
  ) {
    return 'emotional-resonance' as const satisfies AlicizationConversationMemoryMode
  }
  return 'suppress-associative' as const satisfies AlicizationConversationMemoryMode
}

function resolveContinuityPolicy(input: {
  discourseState: AlicizationDiscourseStateSnapshot
  worldModel?: AlicizationWorldModelSnapshot | null
}) {
  if (input.discourseState.screenReferenceMode === 'avoid')
    return 'dialogue-before-scene' as const
  if (input.discourseState.currentTurnSubject === 'visible-scene')
    return 'scene-before-memory' as const
  if (input.discourseState.currentTurnSubject === 'task-knot' || input.worldModel?.activeThread?.unresolved)
    return 'stay-on-thread' as const
  return 'answer-then-carry' as const
}

// This state is the carried conversational seam. It decides what thread the
// current turn belongs to before memory, visual carry, or persona style enter.
export function buildConversationState(input: {
  now: number
  userText?: string
  dialogueEncounter?: AlicizationDialogueTurnEncounter | null
  dialogueSemantics?: AlicizationDialogueTurnSemantics | null
  dialogueObligation?: AlicizationDialogueObligation | null
  dialogueFocus?: AlicizationDialogueFocusGovernance | null
  discourseState?: AlicizationDiscourseStateSnapshot | null
  currentScene?: AlicizationVisualSceneSnapshot | null
  worldModel?: AlicizationWorldModelSnapshot | null
  relationshipModel?: AlicizationRelationshipModelSnapshot | null
  commitmentLedger?: AlicizationCommitmentLedgerSnapshot | null
  repairLedger?: AlicizationRepairLedgerSnapshot | null
  reflectionLedger?: AlicizationReflectionLedgerSnapshot | null
  privateThought?: AlicizationPrivateThoughtSnapshot | null
  previous?: AlicizationConversationStateSnapshot | null
  runtimeSurface?: AlicizationDigitalLifeRuntimeSurface | null
}): AlicizationConversationStateSnapshot | null {
  const runtimeSurface = input.runtimeSurface ?? null
  const dialogueEncounter = input.dialogueEncounter ?? null
  const dialogueEncounterSurface: AlicizationDialogueEncounterSurface | null = runtimeSurface?.dialogue.dialogueEncounter ?? dialogueEncounter ?? null
  const dialogueSemantics = dialogueEncounter?.semantics ?? input.dialogueSemantics ?? null
  const dialogueObligation = dialogueEncounter?.obligation ?? input.dialogueObligation ?? null
  const dialogueFocus = dialogueEncounter?.focus ?? input.dialogueFocus ?? null
  const discourseState = runtimeSurface?.dialogue.discourseState ?? input.discourseState ?? null
  const currentScene = runtimeSurface?.perception.currentScene ?? input.currentScene ?? null
  const worldModel = runtimeSurface?.world.worldModel ?? input.worldModel ?? null
  const relationshipModel = runtimeSurface?.world.relationshipModel ?? input.relationshipModel ?? null
  const commitmentLedger = runtimeSurface?.memory.commitmentLedger ?? input.commitmentLedger ?? null
  const repairLedger = runtimeSurface?.memory.repairLedger ?? input.repairLedger ?? null
  const reflectionLedger = runtimeSurface?.memory.reflectionLedger ?? input.reflectionLedger ?? null
  const privateThought = runtimeSurface?.cognition.privateThought ?? input.privateThought ?? null

  if (!discourseState)
    return null

  const commitment = governingCommitment(commitmentLedger)
  const repair = governingRepair(repairLedger)
  const reflection = latestReflection(reflectionLedger)
  const memoryMode = resolveMemoryMode({
    discourseState,
    worldModel,
    privateThought,
  })
  const continuityPolicy = resolveContinuityPolicy({
    discourseState,
    worldModel,
  })
  const dialogueFirst = dialogueEncounterSurface?.dialogueFirst ?? isDialogueFirstSubject(discourseState.currentTurnSubject)
  const carryRepairForward = isSceneThreadSubject(discourseState.currentTurnSubject)
  const { text: primaryTurnAnchor, source: primaryTurnAnchorSource } = resolvePrimaryTurnAnchor([
    { source: 'user-text', text: dialogueFirst ? input.userText : null },
    { source: 'question', text: discourseState.primaryTurnAnchorSource === 'question' ? discourseState.primaryTurnAnchor : null },
    { source: 'question', text: discourseState.currentQuestion },
    { source: 'dialogue-summary', text: dialogueFirst ? discourseState.primaryTurnAnchor : null },
    { source: 'dialogue-summary', text: dialogueFirst ? discourseState.currentTurnSummary : null },
    { source: 'focus-summary', text: dialogueEncounterSurface?.summary ?? dialogueFocus?.focusSummary },
    { source: 'obligation', text: dialogueObligation?.summary },
    { source: 'thread', text: worldModel?.activeThread?.summary },
    { source: 'carry', text: input.previous?.primaryTurnAnchor },
  ])
  const explicitlyContinuingPreviousQuestion = Boolean(
    dialogueFirst
    && (
      dialogueSemantics?.act === 'continue-thread'
      || dialogueSemantics?.reasonTags.includes('continue-thread')
    ),
  )
  const previousQuestionCanCarry = Boolean(
    input.previous?.shouldHoldThread
    && input.previous?.unansweredQuestion
    && (
      dialogueFirst
        ? input.previous.continuityPolicy === 'dialogue-before-scene'
        : input.previous.continuityPolicy !== 'scene-before-memory'
    )
    && (
      explicitlyContinuingPreviousQuestion
      || turnAnchorAligns({
        anchor: primaryTurnAnchor,
        context: [
          input.previous.unansweredQuestion,
          input.previous.primaryTurnAnchor,
          input.previous.jointThread,
          input.previous.hostMove,
        ],
      })
    ),
  )
  const jointThread = sanitizeDialogueAnchorText(
    primaryTurnAnchor
    || (dialogueFirst
      ? input.userText
      : '')
    || (dialogueFirst
      ? discourseState.currentTurnSummary
      : '')
    || discourseState.currentQuestion
    || dialogueEncounterSurface?.summary
    || dialogueFocus?.focusSummary
    || dialogueObligation?.summary
    || dialogueSemantics?.summary
    || worldModel?.activeThread?.summary
    || worldModel?.activeThread?.title
    || input.previous?.jointThread
    || currentScene?.summary
    || 'Stay with the current living thread.',
    220,
  ) || 'Stay with the current living thread.'
  const hostMove = sanitizeText(
    input.userText
    || primaryTurnAnchor
    || (dialogueFirst
      ? discourseState.currentTurnSummary
      : '')
    || dialogueEncounterSurface?.summary
    || dialogueSemantics?.summary
    || dialogueFocus?.focusSummary
    || input.previous?.hostMove
    || jointThread,
    220,
  ) || jointThread
  const unansweredQuestion = sanitizeDialogueAnchorText(
    discourseState.currentQuestion
    || (
      previousQuestionCanCarry
        ? input.previous?.unansweredQuestion
        : ''
    )
    || '',
    180,
  ) || null
  const owedRepair = carryRepairForward
    ? sanitizeDialogueAnchorText(
      discourseState.ruptureRepair
      || repair?.summary
      || reflection?.revision
      || '',
      180,
    ) || null
    : null
  const activeCommitments = uniqueList([
    sanitizeDialogueSurfaceText(commitment?.summary, 180) || null,
    sanitizeDialogueSurfaceText(commitment?.title, 180) || null,
    sanitizeDialogueSurfaceText(discourseState.unresolvedCarry, 180) || null,
    owedRepair,
    unansweredQuestion,
    carryRepairForward
      ? sanitizeDialogueSurfaceText(worldModel?.activeThread?.summary, 180) || null
      : null,
  ], 5)
  const activeProject = sanitizeText(
    dialogueFirst
      ? ''
      : pickDialogueSurfaceText(
          sanitizeDialogueAnchorText(dialogueSemantics?.taskAnchor, 180),
          sanitizeDialogueAnchorText(worldModel?.activeThread?.title, 180),
          sanitizeDialogueAnchorText(worldModel?.activeThread?.summary, 180),
          commitment?.title,
          commitment?.summary,
        ),
    180,
  ) || null
  const shouldHoldThread = Boolean(
    (carryRepairForward && worldModel?.activeThread?.unresolved)
    || unansweredQuestion
    || activeCommitments.length > 0
    || continuityPolicy === 'stay-on-thread',
  )
  const carryReason = unansweredQuestion
    ? (previousQuestionCanCarry && !discourseState.currentQuestion
        ? 'aligned-previous-question'
        : 'current-question')
    : carryRepairForward && worldModel?.activeThread?.unresolved
      ? 'unresolved-scene-thread'
      : activeCommitments.length > 0
        ? 'active-commitment'
        : continuityPolicy === 'stay-on-thread'
          ? 'continuity-policy'
          : null
  const carryEligible = Boolean(primaryTurnAnchor && carryReason)
  const memoryQueryHints = uniqueList([
    primaryTurnAnchor,
    jointThread,
    hostMove,
    dialogueFirst
      ? null
      : sanitizeDialogueAnchorText(worldModel?.activeThread?.title, 180) || null,
    dialogueFirst
      ? null
      : sanitizeDialogueAnchorText(worldModel?.activeThread?.summary, 180) || null,
    unansweredQuestion,
    owedRepair,
    dialogueFirst
      ? null
      : sanitizeDialogueAnchorText(currentScene?.summary, 180) || null,
    privateThought?.emotionalTension ? `emotional_tension:${privateThought.emotionalTension}` : null,
    relationshipModel?.approachVector ? `relationship:${relationshipModel.approachVector}` : null,
  ], 8)

  return {
    jointThread,
    hostMove,
    primaryTurnAnchor,
    primaryTurnAnchorSource,
    activeProject,
    unansweredQuestion,
    owedRepair,
    activeCommitments,
    relationFrame: discourseState.relationMove,
    continuityPolicy,
    memoryMode,
    memoryQueryHints,
    shouldHoldThread,
    carryEligible,
    carryReason,
    confidence: clamp01(
      discourseState.confidence * 0.44
      + (dialogueEncounter?.confidence ?? dialogueSemantics?.confidence ?? 0.34) * 0.18
      + (commitment?.confidence ?? 0.32) * 0.14
      + (repair?.confidence ?? 0.32) * 0.12
      + (privateThought?.confidence ?? 0.32) * 0.12,
    ),
    narrative: uniqueList([
      primaryTurnAnchor ? `anchor:${primaryTurnAnchor}` : null,
      `joint:${jointThread}`,
      unansweredQuestion ? `question:${unansweredQuestion}` : null,
      owedRepair ? `repair:${owedRepair}` : null,
      `memory:${memoryMode}`,
      `continuity:${continuityPolicy}`,
      carryReason ? `carry:${carryReason}` : null,
      shouldHoldThread ? 'hold-thread' : 'answer-and-release',
    ], 6),
    updatedAt: input.now,
  } satisfies AlicizationConversationStateSnapshot
}

export function buildConversationStateSystemBlock(state: AlicizationConversationStateSnapshot | null | undefined) {
  if (!state)
    return ''

  return [
    '[ALICIZATION_CONVERSATION_STATE]',
    'This block is the carried conversational world-thread. It decides what Alicization believes "we are doing together" in this turn.',
    `Joint thread: ${state.jointThread}.`,
    `Host move: ${state.hostMove}.`,
    `Primary turn anchor: ${state.primaryTurnAnchor ?? 'none'}.`,
    `Primary turn anchor source: ${state.primaryTurnAnchorSource ?? 'none'}.`,
    `Active project: ${state.activeProject ?? 'none'}.`,
    `Unanswered question: ${state.unansweredQuestion ?? 'none'}.`,
    `Owed repair: ${state.owedRepair ?? 'none'}.`,
    `Relation frame: ${state.relationFrame}.`,
    `Continuity policy: ${state.continuityPolicy}.`,
    `Memory mode: ${state.memoryMode}.`,
    `Should hold thread: ${state.shouldHoldThread ? 'yes' : 'no'}.`,
    `Carry eligible: ${state.carryEligible === true ? 'yes' : 'no'}.`,
    `Carry reason: ${state.carryReason ?? 'none'}.`,
    `Active commitments: ${state.activeCommitments.length > 0 ? state.activeCommitments.join(' | ') : 'none'}.`,
    `Memory query hints: ${state.memoryQueryHints.length > 0 ? state.memoryQueryHints.join(' | ') : 'none'}.`,
    'The reply must stay inside this shared thread before it reaches for associative memory, idle affection, or stale scene residue.',
  ].join('\n')
}
