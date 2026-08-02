import type {
  AlicizationPrivateThoughtSnapshot,
  AlicizationRepairLedgerSnapshot,
  AlicizationWorldModelSnapshot,
} from '../../../shared/eventa'
import type { AlicizationDialogueTurnSemantics } from './dialogue-turn-semantics'
import type { AlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'
import type { AlicizationProactiveLayeredContext } from './proactive-layered-context'

import { isDialogueFirstSubject, isSceneThreadSubject } from './dialogue-surface-text'

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

export type AlicizationDialogueObligationKind
  = | 'repair'
    | 'guide'
    | 'teach'
    | 'answer'
    | 'care'
    | 'accompany'
    | 'clarify'

export type AlicizationPersonaKernelMode = 'full' | 'backgrounded' | 'muted'

export interface AlicizationDialogueObligation {
  kind: AlicizationDialogueObligationKind
  summary: string
  confidence: number
  mustRepairFirst: boolean
  mustAnswerDirectly: boolean
  mustStayTaskBound: boolean
  shouldAskClarifyingQuestion: boolean
  personaKernelMode: AlicizationPersonaKernelMode
  narrative: string[]
}

export function buildDialogueObligation(input: {
  semantics: AlicizationDialogueTurnSemantics
  context: AlicizationProactiveLayeredContext
  worldModel?: AlicizationWorldModelSnapshot | null
  repairLedger?: AlicizationRepairLedgerSnapshot | null
  privateThought?: AlicizationPrivateThoughtSnapshot | null
  runtimeSurface?: AlicizationDigitalLifeRuntimeSurface | null
}): AlicizationDialogueObligation {
  const runtimeSurface = input.runtimeSurface ?? null
  const worldModel = runtimeSurface?.world.worldModel ?? input.worldModel ?? null
  const repairLedger = runtimeSurface?.memory.repairLedger ?? input.repairLedger ?? null
  const privateThought = runtimeSurface?.cognition.privateThought ?? input.privateThought ?? null
  const sceneBoundTurn = input.semantics.reasonTags.includes('scene-bound-turn')
  const dialogueFirstSubject = isDialogueFirstSubject(input.semantics.subjectPreference)
  const sceneThreadSubject = isSceneThreadSubject(input.semantics.subjectPreference)
  const nonSceneChallenge = input.semantics.act === 'challenge' && !sceneBoundTurn && !sceneThreadSubject
  const currentActivityQuestionTurn = input.semantics.reasonTags.includes('current-activity-question')
  const shouldPreferSceneAnswerOverRepair = currentActivityQuestionTurn
    && (
      input.semantics.responseNeed === 'answer'
      || input.semantics.responseNeed === 'guide'
      || input.semantics.responseNeed === 'clarify'
    )
  const unstableTruth = worldModel?.epistemicState.certainty === 'uncertain'
    || worldModel?.epistemicState.certainty === 'lingering'
    || repairLedger?.shouldConstrainPresentTense === true
    || privateThought?.stance === 'uncertain'
  const codingLike = input.context.workload.kind === 'coding'
    || input.context.workload.kind === 'terminal'
    || input.context.content.kind === 'error'
    || input.context.content.kind === 'diff'
    || worldModel?.activeThread?.kind === 'debugging'
    || worldModel?.activeThread?.kind === 'change-review'
  const careLike = input.context.relationship.fatigue >= 58
    || worldModel?.activeThread?.kind === 'late-night-endurance'
    || privateThought?.stance === 'care'
    || privateThought?.stance === 'warn'

  let kind: AlicizationDialogueObligationKind = 'answer'
  if (
    ((input.semantics.responseNeed === 'repair' || input.semantics.act === 'verify-grounding')
      && !dialogueFirstSubject
      && (sceneBoundTurn || sceneThreadSubject)
      && !shouldPreferSceneAnswerOverRepair)
    || input.semantics.act === 'correct'
    || (input.semantics.act === 'challenge' && sceneBoundTurn && !shouldPreferSceneAnswerOverRepair)
    || (
      unstableTruth
      && input.semantics.truthExpectation === 'strict'
      && sceneBoundTurn
      && !dialogueFirstSubject
      && !shouldPreferSceneAnswerOverRepair
    )
  ) {
    kind = 'repair'
  }
  else if (nonSceneChallenge) {
    kind = 'answer'
  }
  else if (
    input.semantics.responseNeed === 'repair'
    || input.semantics.act === 'verify-grounding'
  ) {
    kind = input.semantics.subjectPreference === 'relationship' ? 'accompany' : 'answer'
  }
  else if (input.semantics.responseNeed === 'teach' || input.semantics.act === 'ask-teach') {
    kind = 'teach'
  }
  else if (
    !dialogueFirstSubject
    && (input.semantics.responseNeed === 'guide' || (codingLike && input.semantics.act === 'ask-help'))
  ) {
    kind = 'guide'
  }
  else if (input.semantics.responseNeed === 'care' || input.semantics.act === 'seek-care' || (careLike && input.semantics.act === 'share-state')) {
    kind = 'care'
  }
  else if (input.semantics.responseNeed === 'accompany' || input.semantics.act === 'social-bid') {
    kind = 'accompany'
  }
  else if (input.semantics.responseNeed === 'clarify') {
    kind = 'clarify'
  }

  const mustRepairFirst = kind === 'repair'
  const mustStayTaskBound = kind === 'repair' || kind === 'guide' || kind === 'teach'
  const shouldAskClarifyingQuestion = kind === 'clarify'
    || (kind === 'repair' && !worldModel?.activeThread && !input.semantics.taskAnchor)
  const mustAnswerDirectly = kind !== 'accompany' && !shouldAskClarifyingQuestion
  const personaKernelMode: AlicizationPersonaKernelMode = mustRepairFirst
    ? 'muted'
    : (mustStayTaskBound || input.semantics.personaSuppression >= 0.58 || input.semantics.truthExpectation === 'strict')
        ? 'backgrounded'
        : kind === 'care' || kind === 'accompany'
          ? 'full'
          : 'backgrounded'

  const summary = sanitizeText(
    input.semantics.taskAnchor
    || worldModel?.activeThread?.summary,
    180,
  )

  return {
    kind,
    summary,
    confidence: clamp01(
      input.semantics.confidence * 0.58
      + (worldModel?.activeThread?.confidence ?? 0.32) * 0.14
      + (unstableTruth ? 0.12 : 0.04)
      + (mustStayTaskBound ? 0.08 : 0.04),
    ),
    mustRepairFirst,
    mustAnswerDirectly,
    mustStayTaskBound,
    shouldAskClarifyingQuestion,
    personaKernelMode,
    narrative: [
      `obligation:${kind}`,
      `persona-kernel:${personaKernelMode}`,
      mustRepairFirst ? 'repair-first' : '',
      mustStayTaskBound ? 'stay-task-bound' : '',
      mustAnswerDirectly ? 'answer-directly' : '',
      shouldAskClarifyingQuestion ? 'clarify-before-claiming' : '',
      summary,
    ].filter(Boolean),
  }
}
