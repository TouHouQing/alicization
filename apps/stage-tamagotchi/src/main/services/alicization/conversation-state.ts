import type {
  AlicizationCommitmentLedgerSnapshot,
  AlicizationConversationMemoryMode,
  AlicizationConversationStateSnapshot,
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
import type { AlicizationDialogueTurnSemantics } from './dialogue-turn-semantics'

import { isDialogueFirstSubject, isSceneThreadSubject, pickDialogueSurfaceText, sanitizeDialogueAnchorText, sanitizeDialogueSurfaceText } from './dialogue-surface-text'

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
}): AlicizationConversationStateSnapshot | null {
  if (!input.discourseState)
    return null

  const commitment = governingCommitment(input.commitmentLedger)
  const repair = governingRepair(input.repairLedger)
  const reflection = latestReflection(input.reflectionLedger)
  const memoryMode = resolveMemoryMode({
    discourseState: input.discourseState,
    worldModel: input.worldModel ?? null,
    privateThought: input.privateThought ?? null,
  })
  const continuityPolicy = resolveContinuityPolicy({
    discourseState: input.discourseState,
    worldModel: input.worldModel ?? null,
  })
  const dialogueFirst = isDialogueFirstSubject(input.discourseState.currentTurnSubject)
  const carryRepairForward = isSceneThreadSubject(input.discourseState.currentTurnSubject)
  const previousQuestionCanCarry = Boolean(
    input.previous?.shouldHoldThread
    && (
      dialogueFirst
        ? input.previous.continuityPolicy === 'dialogue-before-scene'
        : input.previous.continuityPolicy !== 'scene-before-memory'
    ),
  )
  const jointThread = sanitizeDialogueAnchorText(
    (dialogueFirst
      ? input.userText
      : '')
    || (dialogueFirst
      ? input.discourseState.currentTurnSummary
      : '')
    || input.discourseState.currentQuestion
    || input.dialogueFocus?.focusSummary
    || input.dialogueObligation?.summary
    || input.dialogueSemantics?.summary
    || input.worldModel?.activeThread?.summary
    || input.worldModel?.activeThread?.title
    || input.previous?.jointThread
    || input.currentScene?.summary
    || 'Stay with the current living thread.',
    220,
  ) || 'Stay with the current living thread.'
  const hostMove = sanitizeText(
    input.userText
    || (dialogueFirst
      ? input.discourseState.currentTurnSummary
      : '')
    || input.dialogueSemantics?.summary
    || input.dialogueFocus?.focusSummary
    || input.previous?.hostMove
    || jointThread,
    220,
  ) || jointThread
  const unansweredQuestion = sanitizeDialogueAnchorText(
    input.discourseState.currentQuestion
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
      input.discourseState.ruptureRepair
      || repair?.summary
      || reflection?.revision
      || '',
      180,
    ) || null
    : null
  const activeCommitments = uniqueList([
    sanitizeDialogueSurfaceText(commitment?.summary, 180) || null,
    sanitizeDialogueSurfaceText(commitment?.title, 180) || null,
    sanitizeDialogueSurfaceText(input.discourseState.unresolvedCarry, 180) || null,
    owedRepair,
    unansweredQuestion,
    carryRepairForward
      ? sanitizeDialogueSurfaceText(input.worldModel?.activeThread?.summary, 180) || null
      : null,
  ], 5)
  const activeProject = sanitizeText(
    dialogueFirst
      ? ''
      : pickDialogueSurfaceText(
          sanitizeDialogueAnchorText(input.dialogueSemantics?.taskAnchor, 180),
          sanitizeDialogueAnchorText(input.worldModel?.activeThread?.title, 180),
          sanitizeDialogueAnchorText(input.worldModel?.activeThread?.summary, 180),
          commitment?.title,
          commitment?.summary,
        ),
    180,
  ) || null
  const shouldHoldThread = Boolean(
    (carryRepairForward && input.worldModel?.activeThread?.unresolved)
    || unansweredQuestion
    || activeCommitments.length > 0
    || continuityPolicy === 'stay-on-thread',
  )
  const memoryQueryHints = uniqueList([
    jointThread,
    hostMove,
    dialogueFirst
      ? null
      : sanitizeDialogueAnchorText(input.worldModel?.activeThread?.title, 180) || null,
    dialogueFirst
      ? null
      : sanitizeDialogueAnchorText(input.worldModel?.activeThread?.summary, 180) || null,
    unansweredQuestion,
    owedRepair,
    dialogueFirst
      ? null
      : sanitizeDialogueAnchorText(input.currentScene?.summary, 180) || null,
    input.privateThought?.emotionalTension ? `emotional_tension:${input.privateThought.emotionalTension}` : null,
    input.relationshipModel?.approachVector ? `relationship:${input.relationshipModel.approachVector}` : null,
  ], 8)

  return {
    jointThread,
    hostMove,
    activeProject,
    unansweredQuestion,
    owedRepair,
    activeCommitments,
    relationFrame: input.discourseState.relationMove,
    continuityPolicy,
    memoryMode,
    memoryQueryHints,
    shouldHoldThread,
    confidence: clamp01(
      input.discourseState.confidence * 0.44
      + (input.dialogueSemantics?.confidence ?? 0.34) * 0.18
      + (commitment?.confidence ?? 0.32) * 0.14
      + (repair?.confidence ?? 0.32) * 0.12
      + (input.privateThought?.confidence ?? 0.32) * 0.12,
    ),
    narrative: uniqueList([
      `joint:${jointThread}`,
      unansweredQuestion ? `question:${unansweredQuestion}` : null,
      owedRepair ? `repair:${owedRepair}` : null,
      `memory:${memoryMode}`,
      `continuity:${continuityPolicy}`,
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
    `Active project: ${state.activeProject ?? 'none'}.`,
    `Unanswered question: ${state.unansweredQuestion ?? 'none'}.`,
    `Owed repair: ${state.owedRepair ?? 'none'}.`,
    `Relation frame: ${state.relationFrame}.`,
    `Continuity policy: ${state.continuityPolicy}.`,
    `Memory mode: ${state.memoryMode}.`,
    `Should hold thread: ${state.shouldHoldThread ? 'yes' : 'no'}.`,
    `Active commitments: ${state.activeCommitments.length > 0 ? state.activeCommitments.join(' | ') : 'none'}.`,
    `Memory query hints: ${state.memoryQueryHints.length > 0 ? state.memoryQueryHints.join(' | ') : 'none'}.`,
    'The reply must stay inside this shared thread before it reaches for associative memory, idle affection, or stale scene residue.',
  ].join('\n')
}
