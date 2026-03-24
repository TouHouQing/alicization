import type { AlicizationVisualPresenceStateSnapshot } from '../../../shared/eventa'
import type { AlicizationPerceptionState, AlicizationPerceptionTarget } from './attention-anchor'
import type { AlicizationDialogueObligation } from './dialogue-obligation'
import type { AlicizationDialogueTurnSemantics } from './dialogue-turn-semantics'
import type { AlicizationResponseCharter } from './response-charter'

import {
  getActiveAttentionAnchor,
  getActivePerceptionSceneResidue,
  isSelfPerceptionTarget,
} from './attention-anchor'
import { deriveMindTruthContract } from './mind-truth-contract'

function sanitizeText(raw: unknown, maxChars = 220) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function describeTarget(target?: AlicizationPerceptionTarget | null) {
  if (!target)
    return 'none'
  return [
    sanitizeText(target.appName, 48),
    sanitizeText(target.processName, 48),
    sanitizeText(target.title, 120),
  ].filter(Boolean).join(' | ') || 'none'
}

function targetSignature(target?: AlicizationPerceptionTarget | null) {
  if (!target)
    return ''
  return [
    sanitizeText(target.appName, 48),
    sanitizeText(target.processName, 48),
    sanitizeText(target.title, 120),
  ].filter(Boolean).join('::').toLowerCase()
}

function pushUnique(target: string[], value: string) {
  const normalized = sanitizeText(value, 220)
  if (!normalized)
    return
  if (target.includes(normalized))
    return
  target.push(normalized)
}

export interface AlicizationExecutiveAnswerBrief {
  turnMode: 'grounded-inspection' | 'screen-repair' | 'guide-current-knot' | 'care' | 'accompany' | 'answer'
  liveSurface: string
  carriedThread: string | null
  truthState: ReturnType<typeof deriveMindTruthContract>['truthState']
  separateCarryFromSurface: boolean
  shouldCompactHistory: boolean
  maxRecentUserTurns: number
  mustDo: string[]
  mustNotDo: string[]
}

export function buildAlicizationExecutiveAnswerBrief(input: {
  now: number
  inspectionRequested: boolean
  groundedThisTurn: boolean
  currentForeground?: AlicizationPerceptionTarget | null
  perceptionState: AlicizationPerceptionState
  visualPresenceState: AlicizationVisualPresenceStateSnapshot
  responseCharter: AlicizationResponseCharter
  dialogueSemantics?: AlicizationDialogueTurnSemantics | null
  dialogueObligation?: AlicizationDialogueObligation | null
}) {
  const truthContract = deriveMindTruthContract(input.visualPresenceState)
  const liveSurfaceTarget = input.currentForeground
    ?? input.visualPresenceState.attention?.target
    ?? input.visualPresenceState.currentScene?.target
    ?? null
  const activeAnchor = getActiveAttentionAnchor(input.perceptionState, input.now)
  const residue = getActivePerceptionSceneResidue(input.perceptionState, input.now, 10 * 60_000)
  const carriedThreadCandidates = [
    sanitizeText(residue?.summary ?? '', 220),
    sanitizeText(input.visualPresenceState.worldModel?.activeThread?.summary ?? '', 220),
    sanitizeText(input.visualPresenceState.answerPlanner?.governingFocus ?? '', 220),
    sanitizeText(input.visualPresenceState.currentScene?.summary ?? '', 220),
  ].filter(Boolean)
  const liveSurfaceSignature = targetSignature(liveSurfaceTarget)
  const carryTarget = residue?.focusTarget ?? activeAnchor ?? null
  const carryTargetSignature = targetSignature(carryTarget)
  const carryFromNonSelfResidue = Boolean(
    liveSurfaceTarget
    && isSelfPerceptionTarget(liveSurfaceTarget)
    && carryTarget
    && !isSelfPerceptionTarget(carryTarget)
    && carryTargetSignature
    && carryTargetSignature !== liveSurfaceSignature,
  )
  const separateCarryFromSurface = carryFromNonSelfResidue
    || (
      Boolean(liveSurfaceTarget)
      && Boolean(input.visualPresenceState.currentScene?.summary)
      && Boolean(liveSurfaceSignature)
      && targetSignature(input.visualPresenceState.currentScene?.target) !== liveSurfaceSignature
    )
  const carriedThread = separateCarryFromSurface
    ? carriedThreadCandidates[0] ?? null
    : null

  const turnMode = (() => {
    if (input.groundedThisTurn)
      return 'grounded-inspection' as const
    if (input.dialogueObligation?.kind === 'repair')
      return 'screen-repair' as const
    if (input.dialogueObligation?.kind === 'guide' || input.dialogueObligation?.kind === 'teach')
      return 'guide-current-knot' as const
    if (input.dialogueObligation?.kind === 'care')
      return 'care' as const
    if (input.dialogueObligation?.kind === 'accompany')
      return 'accompany' as const
    if (input.responseCharter.responseMode === 'repair-and-reanchor')
      return 'screen-repair' as const
    if (input.responseCharter.responseMode === 'guide-current-knot')
      return 'guide-current-knot' as const
    if (input.responseCharter.responseMode === 'care-with-boundary')
      return 'care' as const
    if (input.responseCharter.responseMode === 'accompany-lightly')
      return 'accompany' as const
    return 'answer' as const
  })()

  const shouldCompactHistory = input.groundedThisTurn
    || input.inspectionRequested
    || input.dialogueObligation?.mustStayTaskBound === true
    || turnMode === 'screen-repair'
    || turnMode === 'guide-current-knot'
    || truthContract.truthState === 'remembered'
    || truthContract.truthState === 'uncertain'

  const maxRecentUserTurns = input.groundedThisTurn || input.inspectionRequested
    ? 2
    : input.dialogueObligation?.mustStayTaskBound
      ? 2
      : turnMode === 'screen-repair' || turnMode === 'guide-current-knot'
        ? 3
        : 4

  const mustDo: string[] = [
    'Lead with the concrete answer or correction in the first sentence.',
    'Let the executive brief outrank roleplay flourish, residue, and older assistant wording.',
    'Answer the host’s current turn rather than whatever continuity feels most emotionally loud.',
  ]
  const mustNotDo: string[] = [
    'Do not open with stage directions, moans, pet-name padding, or body-action narration.',
    'Do not recycle older screen descriptions as if they are current facts.',
  ]

  if (input.groundedThisTurn) {
    pushUnique(mustDo, 'Treat the grounded screenshot from this turn as the primary truth source.')
  }
  if (turnMode === 'screen-repair') {
    pushUnique(mustDo, 'Correct the stale anchor plainly before offering any new interpretation.')
    pushUnique(mustNotDo, 'Do not defend the old read once you know it may be stale.')
  }
  if (turnMode === 'guide-current-knot') {
    pushUnique(mustDo, 'Keep the reply narrow, task-shaped, and actionable.')
    pushUnique(mustNotDo, 'Do not drift into broad generic troubleshooting lists.')
  }
  if (input.dialogueObligation?.mustAnswerDirectly) {
    pushUnique(mustDo, 'Treat the opening sentence as the owed action for this turn.')
  }
  if (input.dialogueObligation?.personaKernelMode !== 'full') {
    pushUnique(mustNotDo, 'Do not let pet names, coy prefaces, or persona routines delay the first useful sentence.')
  }
  if (input.dialogueSemantics?.truthExpectation === 'strict') {
    pushUnique(mustDo, 'Keep truth, repair, and task focus above mood display.')
  }
  if (truthContract.truthState === 'remembered' || truthContract.truthState === 'uncertain') {
    pushUnique(mustDo, 'Label carried or uncertain scene details as memory, residue, or tentative read.')
    pushUnique(mustNotDo, 'Do not describe carried memory in simple present tense.')
  }
  if (separateCarryFromSurface) {
    pushUnique(mustDo, 'If you mention the carried thread, label it as the task you are still holding or rechecking, not the current visible surface.')
    pushUnique(mustNotDo, 'Do not collapse the carried thread into what is literally visible now.')
  }
  if (turnMode === 'care' || turnMode === 'accompany') {
    pushUnique(mustDo, 'If you show care, keep it subordinate to the current truth and task.')
  }

  const brief: AlicizationExecutiveAnswerBrief = {
    turnMode,
    liveSurface: describeTarget(liveSurfaceTarget),
    carriedThread,
    truthState: truthContract.truthState,
    separateCarryFromSurface,
    shouldCompactHistory,
    maxRecentUserTurns,
    mustDo,
    mustNotDo,
  }

  return {
    brief,
    systemBlock: [
      '[ALICIZATION_EXECUTIVE_ANSWER_BRIEF]',
      'This brief is the turn-level executive directive. It outranks persona flourish, recalled residue, and older assistant phrasings.',
      `Turn mode: ${brief.turnMode}.`,
      `Truth state: ${brief.truthState}.`,
      `Visible surface now: ${brief.liveSurface}.`,
      `Carried thread: ${brief.carriedThread ?? 'none'}.`,
      `Carry must stay separate from visible surface: ${brief.separateCarryFromSurface ? 'yes' : 'no'}.`,
      `Compact prior dialogue hard for this turn: ${brief.shouldCompactHistory ? `yes (keep last ${brief.maxRecentUserTurns} user turns)` : 'no'}.`,
      'Must do:',
      ...brief.mustDo.map(item => `- ${item}`),
      'Must not do:',
      ...brief.mustNotDo.map(item => `- ${item}`),
    ].join('\n'),
  }
}
