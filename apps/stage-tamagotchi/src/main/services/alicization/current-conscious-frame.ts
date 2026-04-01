import type {
  AlicizationAnswerCompilerSnapshot,
  AlicizationConversationStateSnapshot,
  AlicizationCurrentConsciousFrameSnapshot,
  AlicizationDesireMemorySnapshot,
  AlicizationDiscourseStateSnapshot,
  AlicizationInitiativeSnapshot,
  AlicizationMindStatementSnapshot,
  AlicizationMindSynthesisSnapshot,
  AlicizationPrivateThoughtSnapshot,
  AlicizationReplyMotive,
} from '../../../shared/eventa'
import type { AlicizationDialogueTurnEncounter } from './dialogue-turn-encounter'

import { sanitizeDialogueAnchorText, sanitizeDialogueSurfaceText } from './dialogue-surface-text'

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
  const items: string[] = []
  for (const value of values) {
    const normalized = sanitizeText(value, 160)
    if (!normalized || items.includes(normalized))
      continue
    items.push(normalized)
    if (items.length >= maxItems)
      break
  }
  return items
}

function strongestMindStatement(
  rows: AlicizationMindStatementSnapshot[] | null | undefined,
) {
  return (rows ?? [])
    .slice()
    .sort((left, right) => right.confidence - left.confidence)[0] ?? null
}

function pickSurfaceText(...values: unknown[]) {
  for (const value of values) {
    const normalized = sanitizeDialogueSurfaceText(value, 180)
    if (normalized)
      return normalized
  }
  return ''
}

function pickAnchorText(...values: unknown[]) {
  for (const value of values) {
    const normalized = sanitizeDialogueAnchorText(value, 180)
    if (normalized)
      return normalized
  }
  return ''
}

function looksSpecificArtifact(text: string) {
  return /(?:[/\\][\w.-]+)+|[A-Z][A-Za-z0-9]+(?:Controller|Service|Enum|Component|ViewModel|Manager|RespVO|Request|DTO)\b|\b[\w.-]+\.(?:ts|tsx|js|jsx|java|kt|swift|go|rs|py|vue)\b/u.test(text)
}

function looksGenericTechnicalSurface(text: string) {
  return /code|diff|editor|workspace|window|screen|desktop|java code|git commit|intellij|cursor|vscode|ide|代码|编辑器|工作区|窗口|屏幕|桌面|提交差异/iu.test(text)
}

function resolveCenterOfGravity(input: {
  discourseState: AlicizationDiscourseStateSnapshot
  answerCompiler: AlicizationAnswerCompilerSnapshot
  dialogueEncounter?: AlicizationDialogueTurnEncounter | null
  privateThought?: AlicizationPrivateThoughtSnapshot | null
  initiative?: AlicizationInitiativeSnapshot | null
}) {
  if (
    input.dialogueEncounter?.mustRepairFirst
    || input.answerCompiler.recommendedAct === 'ask-reground'
    || input.answerCompiler.recommendedAct === 'correct-stale-anchor'
    || input.discourseState.owedAction === 'repair-truth'
  ) {
    return 'repair' as const
  }
  if (input.privateThought?.shouldSpeak === false || input.initiative?.selectedAction === 'wait')
    return 'defer' as const
  if (
    input.answerCompiler.recommendedAct === 'care'
    || input.discourseState.currentTurnSubject === 'host-state'
    || input.privateThought?.stance === 'care'
    || input.privateThought?.stance === 'warn'
  ) {
    return 'care' as const
  }
  if (input.discourseState.currentTurnSubject === 'relationship')
    return 'attune' as const
  if (input.answerCompiler.recommendedAct === 'guide' || input.discourseState.currentTurnSubject === 'task-knot')
    return 'guide' as const
  if (input.discourseState.currentTurnSubject === 'visible-scene')
    return 'witness' as const
  if (input.discourseState.currentTurnSubject === 'alicization-self')
    return 'answer' as const
  return input.answerCompiler.recommendedAct === 'defer' ? 'defer' : 'answer'
}

function resolveTruthDiscipline(input: {
  discourseState: AlicizationDiscourseStateSnapshot
  answerCompiler: AlicizationAnswerCompilerSnapshot
  dialogueEncounter?: AlicizationDialogueTurnEncounter | null
  evidencePhrases: string[]
}) {
  const subject = input.dialogueEncounter?.subject ?? input.discourseState.currentTurnSubject
  const screenTurn = subject === 'task-knot' || subject === 'visible-scene'
  const genericEvidence = input.evidencePhrases.some(text => looksGenericTechnicalSurface(text))
  const specificEvidence = input.evidencePhrases.some(text => looksSpecificArtifact(text))

  if (
    input.dialogueEncounter?.mustRepairFirst
    || input.answerCompiler.recommendedAct === 'ask-reground'
    || input.answerCompiler.recommendedAct === 'correct-stale-anchor'
    || input.discourseState.owedAction === 'repair-truth'
  ) {
    return 'repair-first' as const
  }
  if (
    input.dialogueEncounter?.screenReferenceMode === 'avoid'
    || input.answerCompiler.screenReferenceMode === 'avoid'
    || subject === 'alicization-self'
    || subject === 'relationship'
    || subject === 'host-state'
  ) {
    return 'dialogue-first' as const
  }
  if (input.answerCompiler.evidenceMode === 'continuity-carry' || input.answerCompiler.labelCarryAsMemory) {
    return 'memory-labeled' as const
  }
  if (screenTurn && (input.answerCompiler.evidenceMode === 'coarse-held' || (genericEvidence && !specificEvidence))) {
    return 'observe-then-hypothesize' as const
  }
  if (input.answerCompiler.evidenceMode === 'live-grounded' || input.answerCompiler.evidenceMode === 'live-observed')
    return 'observe-first' as const
  return screenTurn ? 'observe-then-hypothesize' : 'dialogue-first'
}

function resolveConsciousNeed(input: {
  centerOfGravity: AlicizationReplyMotive
  conversationState?: AlicizationConversationStateSnapshot | null
  answerCompiler: AlicizationAnswerCompilerSnapshot
  mindSynthesis?: AlicizationMindSynthesisSnapshot | null
  dialogueEncounter?: AlicizationDialogueTurnEncounter | null
  primaryAnchor: string | null
}) {
  switch (input.centerOfGravity) {
    case 'repair':
      return pickSurfaceText(
        input.conversationState?.owedRepair,
        input.answerCompiler.uncertaintyBoundary,
        input.mindSynthesis?.uncertainties?.[0]?.summary,
        input.dialogueEncounter?.summary,
      ) || 'Repair the truth seam before continuing.'
    case 'guide':
      return pickSurfaceText(
        input.primaryAnchor,
        input.conversationState?.unansweredQuestion,
        input.conversationState?.activeCommitments?.[0],
        input.answerCompiler.nextMove,
        input.mindSynthesis?.commitments?.[0]?.summary,
      ) || 'Move the active knot one step closer to resolution.'
    case 'care':
      return pickSurfaceText(
        input.primaryAnchor,
        input.answerCompiler.careVector,
        input.conversationState?.hostMove,
        input.mindSynthesis?.concerns?.[0]?.summary,
      ) || 'Stay close to the host’s present state without drifting away.'
    case 'attune':
    case 'answer':
      return pickSurfaceText(
        input.primaryAnchor,
        input.conversationState?.hostMove,
        input.dialogueEncounter?.summary,
        input.answerCompiler.openingClaim,
      ) || 'Answer from the live dialogue subject itself.'
    case 'witness':
      return pickSurfaceText(
        input.answerCompiler.supportingReality?.[0],
        input.answerCompiler.openingClaim,
        input.dialogueEncounter?.summary,
      ) || 'Start from what is actually visible before naming a larger story.'
    default:
      return 'Do not flood the turn with more than it can hold.'
  }
}

function resolveSpeakingIntention(input: {
  truthDiscipline: AlicizationCurrentConsciousFrameSnapshot['truthDiscipline']
  centerOfGravity: AlicizationReplyMotive
  answerCompiler: AlicizationAnswerCompilerSnapshot
  mindSynthesis?: AlicizationMindSynthesisSnapshot | null
  privateThought?: AlicizationPrivateThoughtSnapshot | null
  initiative?: AlicizationInitiativeSnapshot | null
}) {
  if (input.truthDiscipline === 'repair-first')
    return 'Let the answer visibly revise the old read before it tries to sound intelligent.'
  if (input.truthDiscipline === 'observe-then-hypothesize')
    return 'Separate what is visible now from what is only a guess, and keep the guess soft.'
  if (input.truthDiscipline === 'memory-labeled')
    return 'Carry continuity only as memory or residue, never as literal current perception.'
  if (input.truthDiscipline === 'dialogue-first')
    return 'Stay inside the living dialogue subject before dragging in screen context or old carry.'
  if (input.centerOfGravity === 'guide')
    return 'Stay with the active knot and move it one honest step closer to resolution.'

  return pickSurfaceText(
    input.mindSynthesis?.openingIntent,
    input.answerCompiler.openingDirective,
    input.privateThought?.thoughtText,
    input.initiative?.why,
  ) || 'Speak from the present center of gravity instead of default helpfulness.'
}

export function buildCurrentConsciousFrame(input: {
  now: number
  discourseState?: AlicizationDiscourseStateSnapshot | null
  conversationState?: AlicizationConversationStateSnapshot | null
  dialogueEncounter?: AlicizationDialogueTurnEncounter | null
  mindSynthesis?: AlicizationMindSynthesisSnapshot | null
  answerCompiler?: AlicizationAnswerCompilerSnapshot | null
  privateThought?: AlicizationPrivateThoughtSnapshot | null
  initiative?: AlicizationInitiativeSnapshot | null
  desireMemory?: AlicizationDesireMemorySnapshot | null
}): AlicizationCurrentConsciousFrameSnapshot | null {
  if (!input.discourseState || !input.answerCompiler)
    return null

  const primaryAnchor = pickAnchorText(
    input.conversationState?.primaryTurnAnchor,
    input.discourseState.primaryTurnAnchor,
    input.dialogueEncounter?.taskAnchor,
    input.answerCompiler.openingClaim,
    input.conversationState?.hostMove,
  ) || null
  const evidencePhrases = uniqueList([
    input.answerCompiler.supportingReality?.[0],
    input.answerCompiler.supportingReality?.[1],
    input.dialogueEncounter?.summary,
    input.conversationState?.jointThread,
    input.answerCompiler.openingClaim,
    primaryAnchor,
  ], 6)
  const centerOfGravity = resolveCenterOfGravity({
    discourseState: input.discourseState,
    answerCompiler: input.answerCompiler,
    dialogueEncounter: input.dialogueEncounter ?? null,
    privateThought: input.privateThought ?? null,
    initiative: input.initiative ?? null,
  })
  const truthDiscipline = resolveTruthDiscipline({
    discourseState: input.discourseState,
    answerCompiler: input.answerCompiler,
    dialogueEncounter: input.dialogueEncounter ?? null,
    evidencePhrases,
  })
  const screenTurn = input.discourseState.currentTurnSubject === 'task-knot'
    || input.discourseState.currentTurnSubject === 'visible-scene'
  const shouldWithholdSpecificity = truthDiscipline === 'observe-then-hypothesize'
    || truthDiscipline === 'memory-labeled'
    || (truthDiscipline === 'repair-first' && screenTurn)
  const shouldSelfRevise = truthDiscipline === 'repair-first'
    || input.answerCompiler.turnMode === 'screen-repair'
    || input.dialogueEncounter?.mustRepairFirst === true

  const consciousNeed = resolveConsciousNeed({
    centerOfGravity,
    conversationState: input.conversationState ?? null,
    answerCompiler: input.answerCompiler,
    mindSynthesis: input.mindSynthesis ?? null,
    dialogueEncounter: input.dialogueEncounter ?? null,
    primaryAnchor,
  })
  const consciousTension = pickSurfaceText(
    strongestMindStatement(input.mindSynthesis?.concerns)?.summary,
    strongestMindStatement(input.mindSynthesis?.uncertainties)?.summary,
    input.privateThought?.thoughtText,
    input.initiative?.why,
    input.desireMemory?.activeDesires?.[0]?.reason,
  ) || 'Keep the visible answer aligned with the real inner pressure of this turn.'
  const speakingIntention = resolveSpeakingIntention({
    truthDiscipline,
    centerOfGravity,
    answerCompiler: input.answerCompiler,
    mindSynthesis: input.mindSynthesis ?? null,
    privateThought: input.privateThought ?? null,
    initiative: input.initiative ?? null,
  })
  const withheldImpulse = shouldWithholdSpecificity
    ? 'Do not collapse coarse visual evidence into file, class, or field certainty.'
    : shouldSelfRevise
      ? 'Do not defend an older interpretation just to preserve continuity.'
      : null

  return {
    subject: input.dialogueEncounter?.subject ?? input.discourseState.currentTurnSubject,
    centerOfGravity,
    truthDiscipline,
    consciousNeed,
    consciousTension,
    speakingIntention,
    focusAnchor: primaryAnchor,
    withheldImpulse,
    shouldWithholdSpecificity,
    shouldSelfRevise,
    confidence: clamp01(
      input.answerCompiler.confidence * 0.38
      + (input.mindSynthesis?.confidence ?? 0.42) * 0.24
      + (input.dialogueEncounter?.confidence ?? input.discourseState.confidence) * 0.22
      + (input.privateThought?.confidence ?? 0.34) * 0.16,
    ),
    reasonTags: uniqueList([
      `subject:${input.dialogueEncounter?.subject ?? input.discourseState.currentTurnSubject}`,
      `center:${centerOfGravity}`,
      `discipline:${truthDiscipline}`,
      input.privateThought?.stance ? `stance:${input.privateThought.stance}` : null,
      input.initiative?.selectedAction ? `initiative:${input.initiative.selectedAction}` : null,
      input.answerCompiler.recommendedAct ? `act:${input.answerCompiler.recommendedAct}` : null,
      shouldWithholdSpecificity ? 'withhold-specificity' : null,
      shouldSelfRevise ? 'self-revise' : null,
    ], 8),
    updatedAt: input.now,
  }
}

export function buildCurrentConsciousFrameSystemBlock(
  frame: AlicizationCurrentConsciousFrameSnapshot | null | undefined,
) {
  if (!frame)
    return ''

  return [
    '[ALICIZATION_CURRENT_CONSCIOUS_FRAME]',
    'This block describes the present subjective center that is speaking now. Downstream reply generation should express this frame, not merely route to a generic helpful answer.',
    `Subject: ${frame.subject}.`,
    `Center of gravity: ${frame.centerOfGravity}.`,
    `Truth discipline: ${frame.truthDiscipline}.`,
    `Conscious need: ${frame.consciousNeed}.`,
    `Conscious tension: ${frame.consciousTension}.`,
    `Speaking intention: ${frame.speakingIntention}.`,
    `Focus anchor: ${frame.focusAnchor ?? 'none'}.`,
    `Withhold specificity: ${frame.shouldWithholdSpecificity ? 'yes' : 'no'}.`,
    `Self revision required: ${frame.shouldSelfRevise ? 'yes' : 'no'}.`,
    `Withheld impulse: ${frame.withheldImpulse ?? 'none'}.`,
    `Reason tags: ${frame.reasonTags.join(' | ') || 'none'}.`,
  ].join('\n')
}
