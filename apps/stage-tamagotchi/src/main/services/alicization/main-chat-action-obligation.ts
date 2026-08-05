import type { AlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'

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

function resolveObligationSummary(values: unknown[], maxChars = 180) {
  for (const value of values) {
    const normalized = sanitizeText(value, maxChars)
    if (normalized)
      return normalized
  }
  return ''
}

export type AlicizationMainChatActionObligationKind
  = | 'answer'
    | 'clarify'
    | 'inspect'

export interface AlicizationMainChatActionObligation {
  confidence: number
  kind: AlicizationMainChatActionObligationKind
  reasonCodes: string[]
  source: 'dialogue-governance'
  summary: string
}

export function deriveMainChatActionObligation(input: {
  runtimeSurface?: AlicizationDigitalLifeRuntimeSurface | null
  userText: string
}): AlicizationMainChatActionObligation {
  const runtimeSurface = input.runtimeSurface ?? null
  const dialogueEncounter = runtimeSurface?.dialogue.dialogueEncounter ?? null
  const discourseState = runtimeSurface?.dialogue.discourseState ?? null
  const conversationState = runtimeSurface?.dialogue.conversationState ?? null
  const currentConsciousFrame = runtimeSurface?.dialogue.currentConsciousFrame ?? null
  const userText = sanitizeText(input.userText, 320)

  if (dialogueEncounter?.shouldAskClarifyingQuestion === true) {
    return {
      kind: 'clarify',
      summary: resolveObligationSummary([
        dialogueEncounter.summary,
        currentConsciousFrame?.consciousNeed,
        userText,
      ]),
      confidence: clamp01(
        (dialogueEncounter.confidence ?? 0.52) * 0.72
        + (currentConsciousFrame?.confidence ?? 0.38) * 0.12
        + 0.16,
      ),
      source: 'dialogue-governance',
      reasonCodes: [
        'clarify-before-claiming',
        ...(dialogueEncounter.mustRepairFirst ? ['repair-pressure'] : []),
        ...(discourseState?.owedAction ? [`owed-action:${discourseState.owedAction}`] : []),
      ],
    }
  }

  if (
    discourseState?.owedAction === 'inspect-scene'
    && dialogueEncounter?.inspectionRequested === true
  ) {
    return {
      kind: 'inspect',
      summary: resolveObligationSummary([
        dialogueEncounter.summary,
        currentConsciousFrame?.consciousNeed,
        userText,
      ]),
      confidence: clamp01(
        (dialogueEncounter.confidence ?? 0.48) * 0.58
        + (currentConsciousFrame?.confidence ?? 0.34) * 0.18
        + 0.18,
      ),
      source: 'dialogue-governance',
      reasonCodes: [
        'inspect-scene',
        ...(dialogueEncounter.inspectionState ? [`inspection-state:${dialogueEncounter.inspectionState}`] : []),
        ...(discourseState.owedAction ? [`owed-action:${discourseState.owedAction}`] : []),
      ],
    }
  }

  const dialogueFirst = dialogueEncounter?.dialogueFirst === true
    || runtimeSurface?.dialogue.discourseState?.screenReferenceMode === 'avoid'
  const taskBound = dialogueEncounter?.mustStayTaskBound === true
    || discourseState?.owedAction === 'guide-task'
    || discourseState?.owedAction === 'repair-truth'

  return {
    kind: 'answer',
    summary: resolveObligationSummary([
      userText,
      currentConsciousFrame?.speakingIntention,
      dialogueEncounter?.summary,
      conversationState?.jointThread,
    ]),
    confidence: clamp01(
      (dialogueEncounter?.confidence ?? 0.42) * 0.34
      + (conversationState?.confidence ?? 0.4) * 0.16
      + (currentConsciousFrame?.confidence ?? 0.38) * 0.18
      + 0.22,
    ),
    source: 'dialogue-governance',
    reasonCodes: [
      ...(discourseState?.owedAction ? [`owed-action:${discourseState.owedAction}`] : ['owed-action:answer-general']),
      ...(dialogueFirst ? ['dialogue-first'] : []),
      ...(taskBound ? ['stay-task-bound'] : []),
    ],
  }
}
