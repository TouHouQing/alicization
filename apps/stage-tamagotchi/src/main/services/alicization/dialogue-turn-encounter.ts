import type {
  AlicizationDialogueTurnEncounterSnapshot,
  AlicizationPrivateThoughtSnapshot,
  AlicizationRepairLedgerSnapshot,
  AlicizationVisualSceneSnapshot,
  AlicizationWorldModelSnapshot,
} from '../../../shared/eventa'
import type { AlicizationDialogueFocusGovernance } from './dialogue-focus-governor'
import type { AlicizationDialogueObligation } from './dialogue-obligation'
import type { AlicizationDialogueTurnOwnership, AlicizationDialogueTurnOwnershipHint } from './dialogue-turn-ownership'
import type { AlicizationDialogueTurnSemantics } from './dialogue-turn-semantics'
import type { AlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'
import type { AlicizationInspectionTurnState } from './inspection-turn-state-machine'
import type { AlicizationProactiveLayeredContext } from './proactive-layered-context'

import { buildDialogueFocusGovernance } from './dialogue-focus-governor'
import { buildDialogueObligation } from './dialogue-obligation'
import { isDialogueFirstSubject } from './dialogue-surface-text'
import { buildDialogueTurnOwnership } from './dialogue-turn-ownership'

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

function uniqueLabels(values: Array<string | null | undefined>, maxItems = 12) {
  const labels: string[] = []
  for (const value of values) {
    const normalized = sanitizeText(value, 96).toLowerCase()
    if (!normalized || labels.includes(normalized))
      continue
    labels.push(normalized)
    if (labels.length >= maxItems)
      break
  }
  return labels
}

export interface AlicizationDialogueTurnEncounter extends AlicizationDialogueTurnEncounterSnapshot {
  semantics: AlicizationDialogueTurnSemantics
  obligation: AlicizationDialogueObligation
  ownership: AlicizationDialogueTurnOwnership
  focus: AlicizationDialogueFocusGovernance
}

export function buildDialogueTurnEncounter(input: {
  semantics: AlicizationDialogueTurnSemantics
  context: AlicizationProactiveLayeredContext
  currentScene: AlicizationVisualSceneSnapshot | null
  worldModel?: AlicizationWorldModelSnapshot | null
  repairLedger?: AlicizationRepairLedgerSnapshot | null
  privateThought?: AlicizationPrivateThoughtSnapshot | null
  inspectionRequested: boolean
  inspectionState: AlicizationInspectionTurnState
  releaseInspectionCarry?: boolean
  ingressHint?: AlicizationDialogueTurnOwnershipHint | null
  runtimeSurface?: AlicizationDigitalLifeRuntimeSurface | null
}): AlicizationDialogueTurnEncounter {
  const runtimeSurface = input.runtimeSurface ?? null
  const currentScene = runtimeSurface?.perception.currentScene ?? input.currentScene
  const worldModel = runtimeSurface?.world.worldModel ?? input.worldModel ?? null
  const repairLedger = runtimeSurface?.memory.repairLedger ?? input.repairLedger ?? null
  const privateThought = runtimeSurface?.cognition.privateThought ?? input.privateThought ?? null
  const obligation = buildDialogueObligation({
    semantics: input.semantics,
    context: input.context,
    worldModel,
    repairLedger,
    privateThought,
    runtimeSurface,
  })
  const ownership = buildDialogueTurnOwnership({
    semantics: input.semantics,
    obligation,
    worldModel,
    inspectionRequested: input.inspectionRequested,
    inspectionState: input.inspectionState,
    releaseInspectionCarry: input.releaseInspectionCarry,
    ingressHint: input.ingressHint ?? null,
  })
  const focus = buildDialogueFocusGovernance({
    semantics: input.semantics,
    obligation,
    ownership,
    currentScene,
    worldModel,
    runtimeSurface,
  })

  return {
    semantics: input.semantics,
    obligation,
    ownership,
    focus,
    act: input.semantics.act,
    responseNeed: input.semantics.responseNeed,
    truthExpectation: input.semantics.truthExpectation,
    subject: ownership.subject,
    screenReferenceMode: ownership.screenReferenceMode,
    continuityMode: ownership.continuityMode,
    inspectionRequested: ownership.inspectionRequested,
    inspectionState: ownership.inspectionState,
    releaseInspectionCarry: ownership.releaseInspectionCarry,
    taskAnchor: input.semantics.taskAnchor ?? null,
    summary: '',
    dialogueFirst: isDialogueFirstSubject(ownership.subject),
    shouldBypassScreenRepair: focus.shouldBypassScreenRepair,
    mustRepairFirst: obligation.mustRepairFirst,
    mustAnswerDirectly: obligation.mustAnswerDirectly,
    mustStayTaskBound: obligation.mustStayTaskBound,
    shouldAskClarifyingQuestion: obligation.shouldAskClarifyingQuestion,
    personaKernelMode: obligation.personaKernelMode,
    confidence: clamp01(
      input.semantics.confidence * 0.34
      + obligation.confidence * 0.28
      + ownership.confidence * 0.18
      + focus.confidence * 0.2,
    ),
    reasonTags: uniqueLabels([
      ...input.semantics.reasonTags,
      ...obligation.narrative,
      ...ownership.reasonTags,
      ...focus.reasonTags,
      `act:${input.semantics.act}`,
      `need:${input.semantics.responseNeed}`,
      `truth:${input.semantics.truthExpectation}`,
      `subject:${ownership.subject}`,
      `screen:${ownership.screenReferenceMode}`,
      obligation.mustAnswerDirectly ? 'must-answer-directly' : '',
      obligation.mustStayTaskBound ? 'must-stay-task-bound' : '',
      obligation.mustRepairFirst ? 'must-repair-first' : '',
    ]),
  }
}
