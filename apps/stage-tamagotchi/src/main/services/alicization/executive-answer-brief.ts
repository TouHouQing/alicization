import type {
  AlicizationAnswerCompilerSnapshot,
  AlicizationClaimEvidenceLedgerSnapshot,
  AlicizationDiscourseStateSnapshot,
  AlicizationMindSynthesisSnapshot,
  AlicizationVisualPresenceStateSnapshot,
} from '../../../shared/eventa'
import type { AlicizationPerceptionState, AlicizationPerceptionTarget } from './attention-anchor'
import type { AlicizationDialogueFocusGovernance } from './dialogue-focus-governor'
import type { AlicizationDialogueObligation } from './dialogue-obligation'
import type { AlicizationDialogueTurnEncounter } from './dialogue-turn-encounter'
import type { AlicizationDialogueTurnSemantics } from './dialogue-turn-semantics'
import type { AlicizationResponseCharter } from './response-charter'

import { buildAlicizationScreenSurfaceCue, isWeakAlicizationScreenSurfaceCue } from '@proj-alicization/stage-shared'

import {
  getActiveAttentionAnchor,
  getActivePerceptionSceneResidue,
  isSelfPerceptionTarget,
} from './attention-anchor'
import { sanitizeDialogueSurfaceText } from './dialogue-surface-text'
import { deriveMindTruthContract } from './mind-truth-contract'

function sanitizeText(raw: unknown, maxChars = 220) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function sanitizeCarryThreadCandidate(raw: unknown, maxChars = 220) {
  return sanitizeDialogueSurfaceText(raw, maxChars)
}

function describeTarget(input: {
  target?: AlicizationPerceptionTarget | null
  sceneSummary?: string | null
  scenario?: string | null
  workloadKind?: string | null
  contentKind?: string | null
}) {
  if (!input.target && !input.sceneSummary)
    return 'none'
  return buildAlicizationScreenSurfaceCue({
    rawCues: [input.sceneSummary],
    target: input.target ?? null,
    scenario: input.scenario ?? null,
    workloadKind: input.workloadKind ?? null,
    contentKind: input.contentKind ?? null,
  })
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

function isWeakGenericSurface(target?: AlicizationPerceptionTarget | null) {
  if (!target)
    return true
  const signature = targetSignature(target)
  if (!signature)
    return true
  if (
    ['finder', 'chat overlay', 'alicization', 'codex', 'unknown']
      .some(marker => signature.includes(marker))
  ) {
    return true
  }
  return isWeakAlicizationScreenSurfaceCue(target.title)
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
  dialogueEncounter?: AlicizationDialogueTurnEncounter | null
  dialogueSemantics?: AlicizationDialogueTurnSemantics | null
  dialogueObligation?: AlicizationDialogueObligation | null
  dialogueFocus?: AlicizationDialogueFocusGovernance | null
  discourseState?: AlicizationDiscourseStateSnapshot | null
  mindSynthesis?: AlicizationMindSynthesisSnapshot | null
  answerCompiler?: AlicizationAnswerCompilerSnapshot | null
  claimEvidenceLedger?: AlicizationClaimEvidenceLedgerSnapshot | null
}) {
  const dialogueEncounter = input.dialogueEncounter ?? null
  const dialogueSemantics = dialogueEncounter?.semantics ?? input.dialogueSemantics ?? null
  const dialogueObligation = dialogueEncounter?.obligation ?? input.dialogueObligation ?? null
  const dialogueFocus = dialogueEncounter?.focus ?? input.dialogueFocus ?? null
  const discourseState = input.discourseState ?? input.visualPresenceState.discourseState ?? null
  const mindSynthesis = input.mindSynthesis ?? input.visualPresenceState.mindSynthesis ?? null
  const answerCompiler = input.answerCompiler ?? input.visualPresenceState.answerCompiler ?? null
  const claimEvidenceLedger = input.claimEvidenceLedger ?? input.visualPresenceState.claimEvidenceLedger ?? null
  const truthContract = deriveMindTruthContract(input.visualPresenceState)
  const preferredScreenReferenceMode = answerCompiler?.screenReferenceMode
    ?? discourseState?.screenReferenceMode
    ?? dialogueFocus?.screenReferenceMode
    ?? null
  const liveSurfaceTarget = input.currentForeground
    ?? input.visualPresenceState.attention?.target
    ?? input.visualPresenceState.currentScene?.target
    ?? null
  const activeAnchor = getActiveAttentionAnchor(input.perceptionState, input.now)
  const residue = getActivePerceptionSceneResidue(input.perceptionState, input.now, 10 * 60_000)
  const carriedThreadCandidates = [
    sanitizeCarryThreadCandidate(residue?.summary ?? '', 220),
    sanitizeCarryThreadCandidate(input.visualPresenceState.worldModel?.activeThread?.summary ?? '', 220),
    sanitizeCarryThreadCandidate(input.visualPresenceState.answerPlanner?.governingFocus ?? '', 220),
    sanitizeCarryThreadCandidate(input.visualPresenceState.currentScene?.summary ?? '', 220),
  ].filter(Boolean)
  const liveSurfaceSignature = targetSignature(liveSurfaceTarget)
  const carryTarget = residue?.focusTarget ?? activeAnchor ?? null
  const carryTargetSignature = targetSignature(carryTarget)
  const weakLiveSurface = isWeakGenericSurface(liveSurfaceTarget)
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
  const carriedThread = separateCarryFromSurface && preferredScreenReferenceMode !== 'avoid'
    ? carriedThreadCandidates[0] ?? null
    : null
  const truthState = input.groundedThisTurn && preferredScreenReferenceMode !== 'avoid'
    ? 'live-grounded' as const
    : truthContract.truthState

  const turnMode = (() => {
    if (answerCompiler)
      return answerCompiler.turnMode
    if (
      input.groundedThisTurn
      && preferredScreenReferenceMode !== 'avoid'
      && dialogueFocus?.subject !== 'alicization-self'
      && dialogueFocus?.subject !== 'relationship'
      && dialogueFocus?.subject !== 'host-state'
    ) {
      return 'grounded-inspection' as const
    }
    if (dialogueObligation?.kind === 'repair')
      return 'screen-repair' as const
    if (dialogueFocus?.subject === 'alicization-self')
      return 'answer' as const
    if (dialogueFocus?.subject === 'relationship')
      return 'accompany' as const
    if (dialogueFocus?.subject === 'host-state')
      return 'care' as const
    if (dialogueObligation?.kind === 'guide' || dialogueObligation?.kind === 'teach')
      return 'guide-current-knot' as const
    if (dialogueObligation?.kind === 'care')
      return 'care' as const
    if (dialogueObligation?.kind === 'accompany')
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
    || dialogueObligation?.mustStayTaskBound === true
    || turnMode === 'screen-repair'
    || turnMode === 'guide-current-knot'
    || truthState === 'remembered'
    || truthState === 'uncertain'
    || preferredScreenReferenceMode === 'avoid'

  const maxRecentUserTurns = preferredScreenReferenceMode === 'avoid'
    ? 3
    : input.groundedThisTurn || input.inspectionRequested
      ? 2
      : dialogueObligation?.mustStayTaskBound
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
  if (answerCompiler) {
    for (const item of answerCompiler.mustDo)
      pushUnique(mustDo, item)
    for (const item of answerCompiler.mustNotDo)
      pushUnique(mustNotDo, item)
    pushUnique(mustDo, answerCompiler.openingDirective)
  }
  if (turnMode === 'screen-repair') {
    pushUnique(mustDo, 'Correct the stale anchor plainly before offering any new interpretation.')
    pushUnique(mustNotDo, 'Do not defend the old read once you know it may be stale.')
  }
  if (turnMode === 'guide-current-knot') {
    pushUnique(mustDo, 'Keep the reply narrow, task-shaped, and actionable.')
    pushUnique(mustNotDo, 'Do not drift into broad generic troubleshooting lists.')
  }
  if (preferredScreenReferenceMode === 'avoid') {
    pushUnique(mustDo, 'Answer the actual self, relationship, or host-state subject before mentioning any screen context.')
    pushUnique(mustNotDo, 'Do not open with screen grounding, Finder/Desktop status, or live-view disclaimers when the screen is not the subject.')
  }
  if (weakLiveSurface && dialogueFocus?.screenReferenceMode !== 'required') {
    pushUnique(mustDo, 'Treat a generic desktop shell as background noise unless the host explicitly asks about it.')
    pushUnique(mustNotDo, 'Do not let a weak generic surface outrank the user’s real question.')
  }
  if (dialogueObligation?.mustAnswerDirectly) {
    pushUnique(mustDo, 'Treat the opening sentence as the owed action for this turn.')
  }
  if (claimEvidenceLedger?.shouldLabelHypothesis) {
    pushUnique(mustDo, 'Separate direct observation from downstream guesswork in the visible answer.')
  }
  if (claimEvidenceLedger?.forbidUnsupportedSpecificity) {
    pushUnique(mustNotDo, 'Do not introduce concrete technical entities that are absent from the host turn and absent from the current evidence.')
  }
  if (dialogueObligation?.personaKernelMode !== 'full') {
    pushUnique(mustNotDo, 'Do not let pet names, coy prefaces, or persona routines delay the first useful sentence.')
  }
  if (dialogueSemantics?.truthExpectation === 'strict') {
    pushUnique(mustDo, 'Keep truth, repair, and task focus above mood display.')
  }
  if (truthContract.truthState === 'remembered' || truthContract.truthState === 'uncertain') {
    pushUnique(mustDo, 'Label carried or uncertain scene details as memory, residue, or tentative read.')
    pushUnique(mustNotDo, 'Do not describe carried memory in simple present tense.')
  }
  if (answerCompiler?.labelCarryAsMemory || discourseState?.unresolvedCarry) {
    pushUnique(mustDo, 'Keep carried continuity explicitly separate from what is visible right now.')
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
    liveSurface: describeTarget({
      target: liveSurfaceTarget,
      sceneSummary: input.visualPresenceState.currentScene?.summary ?? null,
      scenario: input.visualPresenceState.currentScene?.scenario ?? null,
      workloadKind: input.visualPresenceState.currentScene?.workloadKind ?? null,
      contentKind: input.visualPresenceState.currentScene?.contentKind ?? null,
    }),
    carriedThread: carriedThread ?? (sanitizeText(discourseState?.unresolvedCarry ?? mindSynthesis?.commitments[0]?.summary ?? '', 220) || null),
    truthState,
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
