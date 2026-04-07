import type {
  AlicizationConversationTurnInput,
  AlicizationMindTurnGovernance,
  AlicizationVisualPresenceStateSnapshot,
} from '../../../shared/eventa'
import type { AlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'

function sanitizeText(raw: unknown, maxChars = 220) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

// This layer distills a governed dialogue turn into stable recall text so future
// turns can re-open the same conversational intention without replaying full logs.
export function buildDialogueTurnMemoryFragment(input: {
  payload: AlicizationConversationTurnInput
  governance?: AlicizationMindTurnGovernance | null
  state?: AlicizationVisualPresenceStateSnapshot | null
  runtimeSurface?: AlicizationDigitalLifeRuntimeSurface | null
}) {
  if (input.payload.origin === 'subconscious-proactive')
    return ''

  const governance = input.governance ?? null
  if (!governance)
    return ''

  const userText = sanitizeText(input.payload.userText, 160)
  const assistantText = sanitizeText(input.payload.assistantText, 200)
  if (!userText && !assistantText)
    return ''

  const focus = sanitizeText(governance.focusAnchor, 120)
  const answerIntent = sanitizeText(governance.answerIntent, 160)
  const carriedThread = sanitizeText(governance.carriedThread, 140)
  const dialogueThread = sanitizeText(input.runtimeSurface?.dialogue.dialogueWorldThread?.activeThread ?? input.state?.dialogueWorldThread?.activeThread, 160)
  const continuityPolicy = sanitizeText(input.runtimeSurface?.dialogue.conversationState?.continuityPolicy ?? input.state?.conversationState?.continuityPolicy, 64)
  const answerFocus = sanitizeText(input.runtimeSurface?.dialogue.answerPlanner?.governingFocus ?? input.state?.answerPlanner?.governingFocus, 160)

  return [
    `dialogue_turn_mode:${governance.turnMode}`,
    `dialogue_truth:${governance.truthState}`,
    governance.answerSubject ? `dialogue_subject:${governance.answerSubject}` : '',
    governance.answerAct ? `dialogue_act:${governance.answerAct}` : '',
    governance.evidenceMode ? `dialogue_evidence:${governance.evidenceMode}` : '',
    governance.screenReferenceMode ? `dialogue_screen:${governance.screenReferenceMode}` : '',
    focus ? `dialogue_focus:${focus}` : '',
    answerIntent ? `dialogue_intent:${answerIntent}` : '',
    carriedThread ? `carried_thread:${carriedThread}` : '',
    dialogueThread ? `dialogue_thread:${dialogueThread}` : '',
    continuityPolicy ? `continuity_policy:${continuityPolicy}` : '',
    answerFocus ? `answer_focus:${answerFocus}` : '',
    userText ? `user:${userText}` : '',
    assistantText ? `assistant:${assistantText}` : '',
  ]
    .filter(Boolean)
    .join(' ')
}
