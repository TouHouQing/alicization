import type {
  AlicizationAnswerCompilerSnapshot,
  AlicizationConversationStateSnapshot,
  AlicizationDialogueWorldThreadSnapshot,
  AlicizationPrivateThoughtSnapshot,
  AlicizationRecallGovernorSnapshot,
  AlicizationReplyDeliberationSnapshot,
} from '../../../shared/eventa'

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

function resolveMode(input: {
  dialogueWorldThread?: AlicizationDialogueWorldThreadSnapshot | null
  conversationState?: AlicizationConversationStateSnapshot | null
  answerCompiler?: AlicizationAnswerCompilerSnapshot | null
  replyDeliberation?: AlicizationReplyDeliberationSnapshot | null
  privateThought?: AlicizationPrivateThoughtSnapshot | null
}) {
  if (!input.dialogueWorldThread || !input.conversationState)
    return 'none' as const

  if (
    input.answerCompiler?.recommendedAct === 'ask-reground'
    || input.answerCompiler?.recommendedAct === 'correct-stale-anchor'
    || input.replyDeliberation?.selectedMotive === 'repair'
    || input.replyDeliberation?.selectedMotive === 'witness'
    || input.conversationState.memoryMode === 'scene-anchored'
  ) {
    return 'scene' as const
  }

  if (
    input.replyDeliberation?.selectedMotive === 'attune'
    || input.conversationState.memoryMode === 'dialogue-carry'
  ) {
    return 'self-continuity' as const
  }

  if (
    input.conversationState.memoryMode === 'emotional-resonance'
    || input.replyDeliberation?.selectedMotive === 'care'
    || input.privateThought?.emotionalTension === 'late-night-drain'
  ) {
    return 'emotional-resonance' as const
  }

  if (
    input.conversationState.shouldHoldThread
    || input.replyDeliberation?.selectedMotive === 'guide'
    || input.dialogueWorldThread.openLoops.length > 0
  ) {
    return 'thread' as const
  }

  return 'none' as const
}

export function buildRecallGovernor(input: {
  now: number
  dialogueWorldThread?: AlicizationDialogueWorldThreadSnapshot | null
  conversationState?: AlicizationConversationStateSnapshot | null
  answerCompiler?: AlicizationAnswerCompilerSnapshot | null
  replyDeliberation?: AlicizationReplyDeliberationSnapshot | null
  privateThought?: AlicizationPrivateThoughtSnapshot | null
}): AlicizationRecallGovernorSnapshot | null {
  const dialogueWorldThread = input.dialogueWorldThread ?? null
  const conversationState = input.conversationState ?? null
  if (!dialogueWorldThread || !conversationState)
    return null

  const mode = resolveMode({
    dialogueWorldThread,
    conversationState,
    answerCompiler: input.answerCompiler ?? null,
    replyDeliberation: input.replyDeliberation ?? null,
    privateThought: input.privateThought ?? null,
  })
  const suppressAssociativeRecall = Boolean(
    input.answerCompiler?.suppressAssociativeRecall
    || mode === 'scene'
    || mode === 'thread',
  )
  const allowActiveThoughts = mode !== 'none'
    && mode !== 'scene'
    && (mode !== 'thread' || !suppressAssociativeRecall)
  const allowRecalledFragments = !suppressAssociativeRecall && (mode === 'emotional-resonance' || mode === 'self-continuity')
  const carryAsMemory = Boolean(
    input.answerCompiler?.labelCarryAsMemory
    || mode === 'self-continuity'
    || mode === 'emotional-resonance',
  )
  const recallSeed = uniqueList([
    dialogueWorldThread.activeThread,
    dialogueWorldThread.currentQuestion,
    ...dialogueWorldThread.recallKeys,
    ...conversationState.memoryQueryHints,
    input.privateThought?.emotionalTension ? `emotional_tension:${input.privateThought.emotionalTension}` : null,
  ], 10).join(' | ')

  const rationale = mode === 'scene'
    ? 'Keep recall tightly constrained because live grounding or repair has priority over association.'
    : mode === 'thread'
      ? 'Carry only the current dialogue seam and unresolved loops; associative recall would dilute the knot.'
      : mode === 'emotional-resonance'
        ? 'Allow memory with matching emotional color because the host is still inside a felt continuity.'
        : mode === 'self-continuity'
          ? 'Carry dialogue/self continuity without pretending old scene residue is live.'
          : 'Do not admit memory unless the living turn explicitly earns it.'

  return {
    mode,
    recallSeed,
    suppressAssociativeRecall,
    allowActiveThoughts,
    allowRecalledFragments,
    carryAsMemory,
    rationale,
    narrative: uniqueList([
      `mode:${mode}`,
      suppressAssociativeRecall ? 'suppress:associative' : 'allow:associative',
      allowActiveThoughts ? 'allow:active-thoughts' : 'suppress:active-thoughts',
      allowRecalledFragments ? 'allow:recalled-fragments' : 'suppress:recalled-fragments',
      carryAsMemory ? 'carry:memory' : 'carry:none',
      dialogueWorldThread.lastOutcome ? `thread_outcome:${dialogueWorldThread.lastOutcome}` : null,
      input.replyDeliberation?.selectedMotive ? `reply:${input.replyDeliberation.selectedMotive}` : null,
    ], 8),
    updatedAt: input.now,
  } satisfies AlicizationRecallGovernorSnapshot
}

export function buildRecallGovernorSystemBlock(state: AlicizationRecallGovernorSnapshot | null | undefined) {
  if (!state)
    return ''

  return [
    '[ALICIZATION_RECALL_GOVERNOR]',
    'This block decides whether old memory may enter the current answer at all.',
    `Mode: ${state.mode}.`,
    `Recall seed: ${state.recallSeed || 'none'}.`,
    `Suppress associative recall: ${state.suppressAssociativeRecall ? 'yes' : 'no'}.`,
    `Allow active thoughts: ${state.allowActiveThoughts ? 'yes' : 'no'}.`,
    `Allow recalled fragments: ${state.allowRecalledFragments ? 'yes' : 'no'}.`,
    `Carry as memory: ${state.carryAsMemory ? 'yes' : 'no'}.`,
    `Rationale: ${state.rationale}.`,
  ].join('\n')
}
