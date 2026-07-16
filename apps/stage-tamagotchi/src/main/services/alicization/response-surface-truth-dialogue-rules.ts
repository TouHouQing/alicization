import type { AlicizationDialogueObligation, AlicizationPersonaKernelMode } from './dialogue-obligation'
import type { AlicizationDialogueTurnSemantics } from './dialogue-turn-semantics'
import type { AlicizationExecutiveAnswerBrief } from './executive-answer-brief'
import type { AlicizationMainChatExecutionReplyObligation } from './main-chat-execution-reply-obligation'
import type { AlicizationResponseSurfaceRules } from './response-surface-rules'
import type { AlicizationTruthDisciplineFlags } from './truth-discipline'

import { buildMainChatExecutionReplyVisibleSurfaceRules } from './main-chat-execution-reply-obligation'
import {
  appendAlicizationResponseSurfaceRules,
  pushUniqueAlicizationResponseSurfaceRule,
} from './response-surface-rules'

export type AlicizationResponseSurfaceOpeningStyle
  = | 'direct-observation'
    | 'direct-correction'
    | 'direct-answer'
    | 'gentle-care'
    | 'light-accompaniment'

export function buildAlicizationResponseSurfaceTruthDialogueRules(input: {
  openingStyle: AlicizationResponseSurfaceOpeningStyle
  briefTurnMode: AlicizationExecutiveAnswerBrief['turnMode']
  personaKernelMode: AlicizationPersonaKernelMode
  labelCarryAsMemory: boolean
  dialogueObligation?: AlicizationDialogueObligation | null
  dialogueSemantics?: AlicizationDialogueTurnSemantics | null
  truthDiscipline: AlicizationTruthDisciplineFlags
  executionReplyObligation?: AlicizationMainChatExecutionReplyObligation | null
}): AlicizationResponseSurfaceRules {
  const mustDo: string[] = []
  const mustNotDo: string[] = []

  if (input.openingStyle === 'direct-correction')
    pushUniqueAlicizationResponseSurfaceRule(mustDo, 'Use the first sentence to correct the stale read before anything else.')
  if (input.openingStyle === 'direct-observation')
    pushUniqueAlicizationResponseSurfaceRule(mustDo, 'Lead with what is visible now or with the strongest grounded evidence for this turn.')
  if (input.briefTurnMode === 'guide-current-knot') {
    pushUniqueAlicizationResponseSurfaceRule(mustDo, 'Move from the observed knot to one actionable next step.')
    pushUniqueAlicizationResponseSurfaceRule(mustNotDo, 'Do not drift into generic multi-option advice lists unless the user asks.')
  }
  if (input.dialogueObligation?.mustAnswerDirectly)
    pushUniqueAlicizationResponseSurfaceRule(mustDo, 'Use the first sentence to pay off the host’s current ask.')
  if (input.dialogueObligation?.mustStayTaskBound)
    pushUniqueAlicizationResponseSurfaceRule(mustDo, 'Keep the reply inside the active knot until the knot is answered.')
  if (input.executionReplyObligation) {
    appendAlicizationResponseSurfaceRules(
      { mustDo, mustNotDo },
      buildMainChatExecutionReplyVisibleSurfaceRules(input.executionReplyObligation),
    )
  }
  if (input.personaKernelMode !== 'full')
    pushUniqueAlicizationResponseSurfaceRule(mustNotDo, 'Do not use persona flourishes, pet names, or coy prefaces as the reply spine.')
  if (input.dialogueSemantics?.truthExpectation === 'strict')
    pushUniqueAlicizationResponseSurfaceRule(mustNotDo, 'Do not smooth over uncertainty with emotionally pleasing language.')
  if (input.truthDiscipline.dialogueFirst) {
    pushUniqueAlicizationResponseSurfaceRule(mustDo, 'Stay with the live dialogue subject and keep screen grounding in the background.')
    pushUniqueAlicizationResponseSurfaceRule(mustNotDo, 'Do not append screen-status caveats or grounding requests unless the host explicitly asks for a live look.')
  }
  if (input.truthDiscipline.shouldLabelHypothesis)
    pushUniqueAlicizationResponseSurfaceRule(mustDo, 'When the answer goes beyond direct observation, mark that move as a guess or hypothesis.')
  if (input.truthDiscipline.forbidUnsupportedSpecificity)
    pushUniqueAlicizationResponseSurfaceRule(mustNotDo, 'Do not smuggle in file names, class names, enum names, or field changes that are not grounded in this turn.')
  if (input.truthDiscipline.shouldKeepMemoryInward) {
    pushUniqueAlicizationResponseSurfaceRule(mustDo, 'Let remembered continuity contour the answer from the inside instead of announcing recollection outright.')
    pushUniqueAlicizationResponseSurfaceRule(mustNotDo, 'Do not surface recollection just because it is active internally; keep the live payoff in front.')
  }
  if (input.truthDiscipline.shouldOnlySurfaceMemoryStableCore) {
    pushUniqueAlicizationResponseSurfaceRule(mustDo, 'If recollection becomes visible, let only the stable remembered core cross onto the surface.')
    pushUniqueAlicizationResponseSurfaceRule(mustNotDo, 'Do not let contested remembered detail outrun the stable remembered core.')
  }
  if (input.truthDiscipline.shouldLabelMemoryProvenance)
    pushUniqueAlicizationResponseSurfaceRule(mustDo, 'If recollection becomes visible, mark it as memory, residue, inference, or reconstruction rather than settled live fact.')
  if (input.truthDiscipline.shouldDelayMemoryUntilAfterPayoff) {
    pushUniqueAlicizationResponseSurfaceRule(mustDo, 'Land the live payoff first, then reopen remembered continuity only if room remains.')
    pushUniqueAlicizationResponseSurfaceRule(mustNotDo, 'Do not surface recollection before the current payoff lands.')
  }
  if (
    input.briefTurnMode === 'care'
    || input.briefTurnMode === 'accompany'
    || (input.briefTurnMode === 'answer' && input.truthDiscipline.dialogueFirst)
  ) {
    pushUniqueAlicizationResponseSurfaceRule(mustDo, 'Complete the actual answer, care move, or companionship move in the same reply.')
    pushUniqueAlicizationResponseSurfaceRule(mustNotDo, 'Do not stop at a shell opener such as "I will answer directly" or "Let me stay with you" without the real content.')
  }
  if (input.labelCarryAsMemory) {
    pushUniqueAlicizationResponseSurfaceRule(mustDo, 'If carried continuity is mentioned, label it as memory, residue, or the thread still being held.')
    pushUniqueAlicizationResponseSurfaceRule(mustNotDo, 'Do not present carried continuity as the literal current screen.')
  }

  return { mustDo, mustNotDo }
}
