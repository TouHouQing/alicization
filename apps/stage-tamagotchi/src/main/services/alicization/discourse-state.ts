import type {
  AlicizationDialogueAnswerSubject,
  AlicizationDialogueScreenReferenceMode,
  AlicizationDiscourseStateSnapshot,
  AlicizationMindSpeechObligation,
  AlicizationReflectionLedgerSnapshot,
  AlicizationRelationshipModelSnapshot,
  AlicizationRepairLedgerSnapshot,
  AlicizationWorldModelSnapshot,
} from '../../../shared/eventa'
import type { AlicizationDialogueFocusGovernance } from './dialogue-focus-governor'
import type { AlicizationDialogueObligation } from './dialogue-obligation'
import type { AlicizationDialogueTurnOwnership } from './dialogue-turn-ownership'
import type { AlicizationDialogueTurnSemantics } from './dialogue-turn-semantics'

import { isDialogueFirstSubject, sanitizeDialogueAnchorText, sanitizeDialogueSurfaceText } from './dialogue-surface-text'

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

function latestReflectionRevision(reflectionLedger?: AlicizationReflectionLedgerSnapshot | null) {
  const latest = reflectionLedger?.entries.find(entry => entry.id === reflectionLedger.latestEntryId)
    ?? reflectionLedger?.entries[0]
    ?? null
  return sanitizeText(latest?.revision ?? '', 180) || null
}

function governingRepairSummary(repairLedger?: AlicizationRepairLedgerSnapshot | null) {
  const repair = repairLedger?.entries.find(entry => entry.id === repairLedger.governingRepairId)
    ?? repairLedger?.entries[0]
    ?? null
  return sanitizeText(repair?.summary ?? '', 180) || null
}

function resolveSubject(input: {
  dialogueSemantics?: AlicizationDialogueTurnSemantics | null
  dialogueFocus?: AlicizationDialogueFocusGovernance | null
  dialogueObligation?: AlicizationDialogueObligation | null
  inspectionRequested?: boolean
  worldModel?: AlicizationWorldModelSnapshot | null
}) {
  const inspectionOwnedTurn = input.inspectionRequested
    && input.dialogueSemantics?.reasonTags.includes('inspection-owned-turn')
  const preferredSubject = input.dialogueSemantics?.subjectPreference ?? null
  if (inspectionOwnedTurn) {
    return input.worldModel?.activeThread
      ? 'task-knot'
      : 'visible-scene'
  }
  const baseSubject = (
    isDialogueFirstSubject(preferredSubject)
      ? preferredSubject
      : input.dialogueFocus?.subject
        ?? preferredSubject
        ?? (input.dialogueObligation?.kind === 'care'
          ? 'host-state'
          : input.dialogueObligation?.kind === 'accompany'
            ? 'relationship'
            : input.dialogueObligation?.kind === 'guide' || input.dialogueObligation?.kind === 'teach'
              ? 'task-knot'
              : input.dialogueObligation?.kind === 'repair'
                ? 'visible-scene'
                : 'general')
  ) satisfies AlicizationDialogueAnswerSubject

  if (
    input.inspectionRequested
    && baseSubject === 'general'
  ) {
    return input.worldModel?.activeThread
      ? 'task-knot'
      : 'visible-scene'
  }

  return baseSubject
}

function resolveOwedAction(input: {
  subject: AlicizationDialogueAnswerSubject
  dialogueObligation?: AlicizationDialogueObligation | null
}) {
  switch (input.subject) {
    case 'alicization-self':
      return 'answer-self'
    case 'relationship':
      return 'answer-relationship'
    case 'host-state':
      return 'care-host'
    default:
      break
  }

  if (input.dialogueObligation?.kind === 'repair')
    return 'repair-truth' as const
  if (input.dialogueObligation?.kind === 'guide' || input.dialogueObligation?.kind === 'teach')
    return 'guide-task' as const
  if (input.dialogueObligation?.kind === 'care')
    return 'care-host' as const

  switch (input.subject) {
    case 'task-knot':
      return 'guide-task'
    case 'visible-scene':
      return 'inspect-scene'
    default:
      return 'answer-general'
  }
}

function resolveRelationMove(input: {
  subject: AlicizationDialogueAnswerSubject
  owedAction: AlicizationMindSpeechObligation
  relationshipModel?: AlicizationRelationshipModelSnapshot | null
}) {
  if (input.owedAction === 'repair-truth')
    return 'repair' as const
  if (input.owedAction === 'guide-task')
    return 'guide' as const
  if (input.owedAction === 'care-host')
    return 'care' as const

  if (input.subject === 'alicization-self')
    return 'self-disclose' as const
  if (input.subject === 'relationship') {
    return input.relationshipModel?.approachVector === 'care'
      ? 'care' as const
      : 'attune' as const
  }
  if (input.subject === 'visible-scene')
    return 'witness' as const
  return 'clarify' as const
}

function resolveContinuityMode(subject: AlicizationDialogueAnswerSubject) {
  if (subject === 'task-knot')
    return 'task-first' as const
  if (subject === 'visible-scene')
    return 'scene-first' as const
  return 'dialogue-first' as const
}

function resolveScreenReferenceMode(input: {
  subject: AlicizationDialogueAnswerSubject
  inspectionRequested?: boolean
  dialogueFocus?: AlicizationDialogueFocusGovernance | null
}): AlicizationDialogueScreenReferenceMode {
  if (input.inspectionRequested) {
    if (input.subject === 'visible-scene')
      return 'required' as const
    if (input.subject === 'task-knot')
      return 'helpful' as const
  }
  if (input.subject === 'visible-scene')
    return 'required' as const
  if (input.subject === 'task-knot')
    return input.dialogueFocus?.screenReferenceMode ?? 'helpful'
  if (input.subject === 'host-state')
    return input.dialogueFocus?.screenReferenceMode === 'incidental' ? 'incidental' as const : 'avoid' as const
  if (input.subject === 'relationship' || input.subject === 'alicization-self')
    return 'avoid' as const
  return input.dialogueFocus?.screenReferenceMode ?? 'incidental'
}

export function buildDiscourseState(input: {
  now: number
  userText?: string
  dialogueSemantics?: AlicizationDialogueTurnSemantics | null
  dialogueObligation?: AlicizationDialogueObligation | null
  dialogueFocus?: AlicizationDialogueFocusGovernance | null
  ownership?: AlicizationDialogueTurnOwnership | null
  inspectionRequested?: boolean
  worldModel?: AlicizationWorldModelSnapshot | null
  relationshipModel?: AlicizationRelationshipModelSnapshot | null
  repairLedger?: AlicizationRepairLedgerSnapshot | null
  reflectionLedger?: AlicizationReflectionLedgerSnapshot | null
  previous?: AlicizationDiscourseStateSnapshot | null
}): AlicizationDiscourseStateSnapshot | null {
  if (!input.dialogueSemantics && !input.dialogueObligation && !input.dialogueFocus)
    return null

  const subject = input.ownership?.subject ?? resolveSubject({
    dialogueSemantics: input.dialogueSemantics,
    dialogueFocus: input.dialogueFocus,
    dialogueObligation: input.dialogueObligation,
    inspectionRequested: input.inspectionRequested,
    worldModel: input.worldModel ?? null,
  })
  const screenReferenceMode = input.ownership?.screenReferenceMode ?? resolveScreenReferenceMode({
    subject,
    inspectionRequested: input.inspectionRequested,
    dialogueFocus: input.dialogueFocus,
  })
  const owedAction = resolveOwedAction({
    subject,
    dialogueObligation: input.dialogueObligation,
  })
  const relationMove = resolveRelationMove({
    subject,
    owedAction,
    relationshipModel: input.relationshipModel ?? null,
  })
  const continuityMode = input.ownership?.continuityMode ?? resolveContinuityMode(subject)
  const unresolvedCarry = subject === 'task-knot' || subject === 'visible-scene'
    ? null
    : sanitizeText(
      input.worldModel?.activeThread?.unresolved
        ? input.worldModel.activeThread.summary
        : input.previous?.unresolvedCarry,
      180,
    ) || null
  const ruptureRepair = sanitizeText(
    governingRepairSummary(input.repairLedger)
    ?? latestReflectionRevision(input.reflectionLedger)
    ?? '',
    180,
  ) || null
  const currentTurnSummary = sanitizeText(
    (isDialogueFirstSubject(subject)
      ? input.dialogueSemantics?.summary
      : '')
    || (isDialogueFirstSubject(subject)
      ? input.userText
      : '')
    || input.dialogueFocus?.focusSummary
    || input.dialogueObligation?.summary
    || input.dialogueSemantics?.summary
    || input.worldModel?.activeThread?.summary
    || input.previous?.currentTurnSummary
    || 'Stay with the current turn.',
    200,
  ) || 'Stay with the current turn.'

  const currentQuestion = sanitizeDialogueAnchorText(
    input.dialogueSemantics?.taskAnchor
    ?? (/[?？]/u.test(input.userText ?? '')
      ? input.userText
      : /[?？]/u.test(input.dialogueSemantics?.summary ?? '')
        ? input.dialogueSemantics?.summary
        : '')
      ?? '',
    180,
  ) || null

  return {
    currentTurnSubject: subject,
    screenReferenceMode,
    currentTurnSummary,
    currentQuestion,
    owedAction,
    relationMove,
    continuityMode,
    unresolvedCarry,
    ruptureRepair,
    confidence: clamp01(
      (input.dialogueFocus?.confidence ?? 0.34) * 0.4
      + (input.dialogueObligation?.confidence ?? 0.34) * 0.28
      + (input.dialogueSemantics?.confidence ?? 0.34) * 0.2
      + (subject === input.previous?.currentTurnSubject ? 0.08 : 0.03),
    ),
    narrative: [
      `subject:${subject}`,
      `owed:${owedAction}`,
      `relation:${relationMove}`,
      `continuity:${continuityMode}`,
      input.ownership ? 'ownership-ssot' : '',
      input.dialogueFocus?.shouldBypassScreenRepair ? 'bypass-screen-repair' : '',
      unresolvedCarry ? `carry:${sanitizeDialogueSurfaceText(unresolvedCarry, 72) || sanitizeText(unresolvedCarry, 72)}` : '',
      ruptureRepair ? `repair:${sanitizeDialogueSurfaceText(ruptureRepair, 72) || sanitizeText(ruptureRepair, 72)}` : '',
      sanitizeDialogueSurfaceText(currentTurnSummary, 120) || currentTurnSummary,
    ].filter(Boolean),
    updatedAt: input.now,
  }
}

export function buildDiscourseStateSystemBlock(state: AlicizationDiscourseStateSnapshot | null | undefined) {
  if (!state)
    return ''

  return [
    '[ALICIZATION_DISCOURSE_STATE]',
    'This block defines what the current conversation turn is fundamentally about before visual grounding, memory carry, or persona habits can steer the reply.',
    `Current turn subject: ${state.currentTurnSubject}.`,
    `Screen reference mode: ${state.screenReferenceMode}.`,
    `Current turn summary: ${state.currentTurnSummary}.`,
    `Current question: ${state.currentQuestion ?? 'none'}.`,
    `Owed action: ${state.owedAction}.`,
    `Relation move: ${state.relationMove}.`,
    `Continuity mode: ${state.continuityMode}.`,
    `Unresolved carry: ${state.unresolvedCarry ?? 'none'}.`,
    `Rupture or repair pressure: ${state.ruptureRepair ?? 'none'}.`,
    'The reply must satisfy the owed action for this turn before it decorates mood or revisits unrelated scene residue.',
  ].join('\n')
}
