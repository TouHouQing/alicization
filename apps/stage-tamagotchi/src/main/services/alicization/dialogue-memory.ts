import type {
  AlicizationConversationTurnInput,
  AlicizationMindTurnGovernance,
  AlicizationVisualPresenceStateSnapshot,
} from '../../../shared/eventa'
import type { AlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'

import { isAlicizationAutonomousDialogueOrigin } from './runtime-structured-format'

function sanitizeText(raw: unknown, maxChars = 220) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

// Keep recall text grounded in the persisted dialogue and machine-readable turn
// metadata. Reply planning prose is intentionally excluded from memory.
export function buildDialogueTurnMemoryFragment(input: {
  payload: AlicizationConversationTurnInput
  governance?: AlicizationMindTurnGovernance | null
  state?: AlicizationVisualPresenceStateSnapshot | null
  runtimeSurface?: AlicizationDigitalLifeRuntimeSurface | null
}) {
  const normalizedOrigin = typeof input.payload.origin === 'string'
    ? input.payload.origin.trim().toLowerCase()
    : ''
  if (isAlicizationAutonomousDialogueOrigin(normalizedOrigin))
    return ''

  const governance = input.governance ?? null
  if (!governance)
    return ''

  const userText = sanitizeText(input.payload.userText, 160)
  const assistantText = sanitizeText(input.payload.assistantText, 200)
  if (!userText && !assistantText)
    return ''

  const dialogueThread = sanitizeText(input.runtimeSurface?.dialogue.dialogueWorldThread?.activeThread ?? input.state?.dialogueWorldThread?.activeThread, 160)
  const continuityPolicy = sanitizeText(input.runtimeSurface?.dialogue.conversationState?.continuityPolicy ?? input.state?.conversationState?.continuityPolicy, 64)

  return [
    `dialogue_turn_mode:${governance.turnMode}`,
    `dialogue_truth:${governance.truthState}`,
    governance.answerSubject ? `dialogue_subject:${governance.answerSubject}` : '',
    governance.answerAct ? `dialogue_act:${governance.answerAct}` : '',
    governance.evidenceMode ? `dialogue_evidence:${governance.evidenceMode}` : '',
    governance.screenReferenceMode ? `dialogue_screen:${governance.screenReferenceMode}` : '',
    dialogueThread ? `dialogue_thread:${dialogueThread}` : '',
    continuityPolicy ? `continuity_policy:${continuityPolicy}` : '',
    userText ? `user:${userText}` : '',
    assistantText ? `assistant:${assistantText}` : '',
  ]
    .filter(Boolean)
    .join(' ')
}
