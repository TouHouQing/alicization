import type {
  AlicizationAnswerCompilerSnapshot,
  AlicizationAnswerPlannerSnapshot,
  AlicizationClaimEvidenceLedgerSnapshot,
  AlicizationConversationStateSnapshot,
  AlicizationDialogueActKernelSnapshot,
  AlicizationDialogueTurnEncounterSnapshot,
  AlicizationDialogueWorldThreadSnapshot,
  AlicizationDiscourseStateSnapshot,
  AlicizationMindKernelMode,
  AlicizationMindTurnContractSnapshot,
  AlicizationMindTurnFrameSnapshot,
  AlicizationMindTurnGovernance,
  AlicizationPrivateThoughtSnapshot,
  AlicizationRecallGovernorSnapshot,
  AlicizationReplyDeliberationSnapshot,
} from '../../../shared/eventa'
import type { AlicizationDialogueFocusGovernance } from './dialogue-focus-governor'
import type { AlicizationDialogueTurnEncounter } from './dialogue-turn-encounter'
import type { AlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'
import type { AlicizationExecutiveAnswerBrief } from './executive-answer-brief'
import type { AlicizationResponseCharter } from './response-charter'
import type { AlicizationResponseSurfaceContract } from './response-surface-contract'

import { anchorsMateriallyConflict, resolveDialogueAnchorCoherence } from './dialogue-anchor-coherence'
import { sanitizeDialogueAnchorText, sanitizeDialogueSurfaceText } from './dialogue-surface-text'
import { ensureMindGovernanceDecisionTraceId } from './mind-governance-trace'
import { deriveAlicizationTruthDiscipline } from './truth-discipline'

function sanitizeUserFacingCandidate(raw: unknown, maxChars = 180) {
  const normalized = sanitizeDialogueSurfaceText(raw, maxChars)
  if (!normalized)
    return ''
  return normalized
}

function sanitizeSemanticAnchorCandidate(raw: unknown, maxChars = 180) {
  const normalized = sanitizeDialogueAnchorText(raw, maxChars)
  if (!normalized)
    return ''
  return normalized
}

function normalizeComparisonText(raw: unknown) {
  if (typeof raw !== 'string')
    return ''
  return raw.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim()
}

function extractComparisonTerms(raw: unknown) {
  const normalized = normalizeComparisonText(raw)
  if (!normalized)
    return []

  return [...new Set(
    (normalized.match(/[\p{Letter}\p{Number}\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]+/gu) ?? [])
      .filter(segment => [...segment].length >= 2),
  )]
}

function mirrorsHostMove(candidate: unknown, hostMove: unknown) {
  const normalizedCandidate = normalizeComparisonText(candidate)
  const normalizedHostMove = normalizeComparisonText(hostMove)
  if (!normalizedCandidate || !normalizedHostMove)
    return false

  if (normalizedCandidate === normalizedHostMove)
    return true

  const shorterLength = Math.max(1, Math.min(normalizedCandidate.length, normalizedHostMove.length))
  if (
    (normalizedCandidate.includes(normalizedHostMove) || normalizedHostMove.includes(normalizedCandidate))
    && shorterLength / Math.max(normalizedCandidate.length, normalizedHostMove.length) >= 0.68
  ) {
    return true
  }

  const hostTerms = extractComparisonTerms(normalizedHostMove)
  const candidateTerms = extractComparisonTerms(normalizedCandidate)
  if (hostTerms.length === 0 || candidateTerms.length === 0)
    return false

  const overlap = candidateTerms.filter(term => hostTerms.includes(term))
  return overlap.length / Math.max(1, Math.min(hostTerms.length, candidateTerms.length)) >= 0.72
}

function pickGovernedCue(hostMove: unknown, ...values: unknown[]) {
  for (const value of values) {
    const normalized = sanitizeSemanticAnchorCandidate(value)
    if (!normalized || mirrorsHostMove(normalized, hostMove))
      continue
    return normalized
  }
  return ''
}

interface AlicizationDialogueEncounterSurface extends Pick<
  AlicizationDialogueTurnEncounterSnapshot,
  'subject' | 'screenReferenceMode' | 'summary' | 'taskAnchor'
> {}

function resolveRepairState(input: {
  brief: AlicizationExecutiveAnswerBrief
  answerPlanner?: AlicizationAnswerPlannerSnapshot | null
  groundedThisTurn?: boolean
}) {
  if (input.groundedThisTurn === true)
    return 'none' as const
  if (input.answerPlanner?.act === 'correct-stale-anchor' || input.brief.turnMode === 'screen-repair')
    return 'stale-anchor' as const
  if (input.answerPlanner?.act === 'ask-reground' || input.answerPlanner?.shouldAskForGrounding)
    return 'need-reground' as const
  return 'none' as const
}

function resolveGovernedAnchorCoherence(input: {
  brief: AlicizationExecutiveAnswerBrief
  mindTurnFrame?: AlicizationMindTurnFrameSnapshot | null
  kernel?: AlicizationDialogueActKernelSnapshot | null
  answerPlanner?: AlicizationAnswerPlannerSnapshot | null
  answerCompiler?: AlicizationAnswerCompilerSnapshot | null
  conversationState?: AlicizationConversationStateSnapshot | null
  discourseState?: AlicizationDiscourseStateSnapshot | null
  dialogueWorldThread?: AlicizationDialogueWorldThreadSnapshot | null
  replyDeliberation?: AlicizationReplyDeliberationSnapshot | null
  dialogueEncounter?: AlicizationDialogueEncounterSurface | null
  answerSubject?: AlicizationMindTurnGovernance['answerSubject'] | null
  screenReferenceMode?: AlicizationMindTurnGovernance['screenReferenceMode'] | null
  truthState?: AlicizationMindTurnGovernance['truthState'] | null
  groundedThisTurn?: boolean
}) {
  const allowScreen = input.screenReferenceMode !== 'avoid'
  return resolveDialogueAnchorCoherence({
    subject: input.answerSubject ?? input.mindTurnFrame?.relation.subject ?? input.kernel?.subject ?? null,
    screenReferenceMode: input.screenReferenceMode ?? null,
    truthState: input.truthState ?? input.mindTurnFrame?.world.truthState ?? null,
    groundedThisTurn: input.groundedThisTurn === true,
    hostMove: input.conversationState?.hostMove ?? null,
    candidates: [
      { role: 'focus', text: input.conversationState?.primaryTurnAnchor },
      { role: 'focus', text: input.discourseState?.primaryTurnAnchor },
      { role: 'focus', text: input.dialogueEncounter?.taskAnchor },
      { role: 'question', text: input.dialogueEncounter?.summary },
      { role: 'focus', text: input.mindTurnFrame?.focusAnchor },
      { role: 'visible-surface', text: allowScreen ? input.mindTurnFrame?.world.visibleSurface : null },
      { role: 'carry', text: input.mindTurnFrame?.memory.carriedThread },
      { role: 'answer-intent', text: input.mindTurnFrame?.obligation.answerIntent },
      { role: 'opening-claim', text: input.kernel?.openingClaim },
      { role: 'project', text: input.conversationState?.activeProject },
      { role: 'question', text: input.dialogueWorldThread?.currentQuestion },
      { role: 'scene', text: input.kernel?.selectedEvidence[0]?.summary },
      { role: 'thread', text: input.dialogueWorldThread?.activeThread },
      { role: 'answer-intent', text: input.answerCompiler?.supportingReality?.[0] },
      { role: 'live-surface', text: allowScreen ? input.brief.liveSurface : null },
      { role: 'answer-intent', text: input.answerPlanner?.governingFocus },
      { role: 'answer-intent', text: input.answerCompiler?.nextMove },
      { role: 'answer-intent', text: input.answerPlanner?.answerIntent },
      { role: 'carry', text: input.brief.carriedThread },
    ],
  })
}

export function buildAlicizationMindTurnGovernance(input: {
  brief: AlicizationExecutiveAnswerBrief
  charter: AlicizationResponseCharter
  surfaceContract: AlicizationResponseSurfaceContract
  mindTurnContract?: AlicizationMindTurnContractSnapshot | null
  mindTurnFrame?: AlicizationMindTurnFrameSnapshot | null
  kernel?: AlicizationDialogueActKernelSnapshot | null
  discourseState?: AlicizationDiscourseStateSnapshot | null
  conversationState?: AlicizationConversationStateSnapshot | null
  dialogueWorldThread?: AlicizationDialogueWorldThreadSnapshot | null
  answerCompiler?: AlicizationAnswerCompilerSnapshot | null
  answerPlanner?: AlicizationAnswerPlannerSnapshot | null
  replyDeliberation?: AlicizationReplyDeliberationSnapshot | null
  recallGovernor?: AlicizationRecallGovernorSnapshot | null
  claimEvidenceLedger?: AlicizationClaimEvidenceLedgerSnapshot | null
  privateThought?: AlicizationPrivateThoughtSnapshot | null
  mindMode?: AlicizationMindKernelMode | null
  dialogueEncounter?: AlicizationDialogueTurnEncounter | null
  dialogueFocus?: AlicizationDialogueFocusGovernance | null
  groundedThisTurn?: boolean
  decisionTraceId?: string | null
  runtimeSurface?: AlicizationDigitalLifeRuntimeSurface | null
}): AlicizationMindTurnGovernance {
  const runtimeSurface = input.runtimeSurface ?? null
  const dialogueEncounter = input.dialogueEncounter ?? null
  const dialogueEncounterSurface: AlicizationDialogueEncounterSurface | null = runtimeSurface?.dialogue.dialogueEncounter ?? dialogueEncounter ?? null
  const dialogueFocus = dialogueEncounter?.focus ?? input.dialogueFocus ?? null
  const frame = runtimeSurface?.dialogue.currentConsciousFrame
    ? null
    : input.mindTurnFrame ?? null
  const mindTurnFrame = runtimeSurface?.cognition.mindTurnFrame ?? input.mindTurnFrame ?? frame
  const kernel = runtimeSurface?.dialogue.dialogueActKernel ?? input.kernel ?? null
  const discourseState = runtimeSurface?.dialogue.discourseState ?? input.discourseState ?? null
  const conversationState = runtimeSurface?.dialogue.conversationState ?? input.conversationState ?? null
  const dialogueWorldThread = runtimeSurface?.dialogue.dialogueWorldThread ?? input.dialogueWorldThread ?? null
  const answerCompiler = runtimeSurface?.dialogue.answerCompiler ?? input.answerCompiler ?? null
  const answerPlanner = runtimeSurface?.dialogue.answerPlanner ?? input.answerPlanner ?? null
  const replyDeliberation = runtimeSurface?.dialogue.replyDeliberation ?? input.replyDeliberation ?? null
  const recallGovernor = runtimeSurface?.memory.recallGovernor ?? input.recallGovernor ?? null
  const claimEvidenceLedger = runtimeSurface?.dialogue.claimEvidenceLedger ?? input.claimEvidenceLedger ?? null
  const privateThought = runtimeSurface?.cognition.privateThought ?? input.privateThought ?? null
  const mindMode = runtimeSurface?.cognition.mindKernel?.dominantMode ?? input.mindMode ?? null

  const repairState = frame?.obligation.repairState ?? resolveRepairState({
    brief: input.brief,
    answerPlanner,
    groundedThisTurn: input.groundedThisTurn === true,
  })
  const screenReferenceMode = kernel?.screenReferenceMode
    ?? answerCompiler?.screenReferenceMode
    ?? discourseState?.screenReferenceMode
    ?? dialogueEncounterSurface?.screenReferenceMode
    ?? dialogueFocus?.screenReferenceMode
    ?? null
  const groundedThisTurn = input.groundedThisTurn === true
  const truthState = groundedThisTurn && screenReferenceMode !== 'avoid'
    ? 'live-grounded' as const
    : mindTurnFrame?.world.truthState ?? input.brief.truthState
  const anchorCoherence = resolveGovernedAnchorCoherence({
    brief: input.brief,
    mindTurnFrame,
    kernel,
    answerPlanner,
    answerCompiler,
    conversationState,
    discourseState,
    dialogueWorldThread,
    replyDeliberation,
    dialogueEncounter: dialogueEncounterSurface,
    answerSubject: mindTurnFrame?.relation.subject ?? kernel?.subject ?? answerCompiler?.answerSubject ?? discourseState?.currentTurnSubject ?? dialogueEncounterSurface?.subject ?? dialogueFocus?.subject ?? null,
    screenReferenceMode,
    truthState,
    groundedThisTurn,
  })
  const conversationalProjectAnchor = sanitizeSemanticAnchorCandidate(conversationState?.activeProject) || null
  const dominantAnchor = (
    !anchorCoherence.sceneAuthority
    && !mindTurnFrame
    && kernel == null
    && conversationalProjectAnchor
  )
    ? conversationalProjectAnchor
    : anchorCoherence.dominant
  const keepCoherent = (value: unknown) => {
    const normalized = sanitizeSemanticAnchorCandidate(value)
    if (!normalized)
      return ''
    if (!anchorCoherence.sceneAuthority || !dominantAnchor)
      return normalized
    return anchorsMateriallyConflict(normalized, dominantAnchor) ? '' : normalized
  }
  const turnMode = mindTurnFrame?.obligation.turnMode ?? kernel?.turnMode ?? input.brief.turnMode
  const answerSubject = mindTurnFrame?.relation.subject
    ?? kernel?.subject
    ?? answerCompiler?.answerSubject
    ?? discourseState?.currentTurnSubject
    ?? dialogueEncounterSurface?.subject
    ?? dialogueFocus?.subject
    ?? null
  const answerAct = mindTurnFrame?.obligation.answerAct
    ?? kernel?.speechAct
    ?? answerCompiler?.recommendedAct
    ?? answerPlanner?.act
    ?? null
  const evidenceMode = kernel?.truthMode === 'memory-only'
    ? answerCompiler?.evidenceMode ?? answerPlanner?.evidenceMode ?? null
    : kernel?.truthMode ?? answerCompiler?.evidenceMode ?? answerPlanner?.evidenceMode ?? null
  const truthDiscipline = deriveAlicizationTruthDiscipline({
    answerSubject,
    screenReferenceMode,
    truthState,
    turnMode,
    repairState,
    evidenceMode,
    labelCarryAsMemory: mindTurnFrame?.memory.labelCarryAsMemory
      ?? recallGovernor?.carryAsMemory
      ?? answerCompiler?.labelCarryAsMemory
      ?? input.surfaceContract.labelCarryAsMemory,
    currentConsciousFrame: null,
    claimEvidenceLedger,
  })
  const mindTurnContract = input.mindTurnContract ?? null
  const emotionalClosureCue = sanitizeUserFacingCandidate(
    mindTurnContract?.emotionalClosureCue,
    220,
  ) || null

  return {
    decisionTraceId: ensureMindGovernanceDecisionTraceId(input.decisionTraceId),
    turnMode,
    truthState,
    groundedThisTurn,
    personaKernelMode: mindTurnContract?.personaKernelMode ?? input.surfaceContract.personaKernelMode,
    openingStyle: mindTurnContract?.openingStyle ?? input.surfaceContract.openingStyle,
    relationshipPosture: mindTurnFrame?.relation.relationshipPosture ?? input.charter.relationshipPosture,
    answerSubject,
    screenReferenceMode,
    answerAct,
    evidenceMode,
    repairState,
    liveSurface: sanitizeUserFacingCandidate(mindTurnFrame?.world.visibleSurface ?? input.brief.liveSurface) || null,
    focusAnchor: dominantAnchor
      ?? (sanitizeSemanticAnchorCandidate(
        conversationState?.primaryTurnAnchor
        ?? discourseState?.primaryTurnAnchor
        ?? dialogueEncounterSurface?.taskAnchor
        ?? dialogueEncounterSurface?.summary
        ?? conversationState?.activeProject
        ?? (screenReferenceMode === 'avoid' ? null : input.brief.liveSurface),
      ) || null),
    answerIntent: pickGovernedCue(
      conversationState?.hostMove ?? '',
      dominantAnchor,
      conversationState?.primaryTurnAnchor,
      discourseState?.primaryTurnAnchor,
      dialogueEncounterSurface?.taskAnchor,
      dialogueEncounterSurface?.summary,
      keepCoherent(mindTurnFrame?.obligation.answerIntent),
      keepCoherent(mindTurnFrame?.focusAnchor),
      keepCoherent(screenReferenceMode === 'avoid' ? null : mindTurnFrame?.world.visibleSurface),
      keepCoherent(kernel?.openingClaim),
      keepCoherent(kernel?.selectedEvidence[0]?.summary),
      keepCoherent(answerCompiler?.supportingReality?.[0]),
      keepCoherent(dialogueWorldThread?.activeThread),
      keepCoherent(conversationState?.activeProject),
      keepCoherent(screenReferenceMode === 'avoid' ? null : input.brief.liveSurface),
      keepCoherent(answerPlanner?.answerIntent),
      keepCoherent(answerCompiler?.nextMove),
      keepCoherent(replyDeliberation?.whyThisReplyNow),
      keepCoherent(dialogueWorldThread?.currentQuestion),
      keepCoherent(conversationState?.jointThread),
    ) || sanitizeSemanticAnchorCandidate(
      dominantAnchor
      ?? conversationState?.primaryTurnAnchor
      ?? discourseState?.primaryTurnAnchor
      ?? dialogueEncounterSurface?.taskAnchor
      ?? dialogueEncounterSurface?.summary
      ?? keepCoherent(mindTurnFrame?.focusAnchor)
      ?? keepCoherent(conversationState?.activeProject)
      ?? keepCoherent(input.brief.liveSurface)
      ?? keepCoherent(answerPlanner?.answerIntent)
      ?? keepCoherent(answerCompiler?.nextMove),
    ) || null,
    openingMove: sanitizeUserFacingCandidate(
      mindTurnFrame?.obligation.openingMove
      ?? kernel?.openingMove
      ?? replyDeliberation?.openingBeat
      ?? answerPlanner?.openingMove
      ?? answerCompiler?.openingDirective,
    ) || null,
    emotionalClosureCue,
    carriedThread: truthDiscipline.shouldBlockScreenCarry
      ? null
      : (() => {
          const carry = sanitizeSemanticAnchorCandidate(
            mindTurnFrame?.memory.carriedThread
            ?? input.brief.carriedThread
            ?? conversationState?.primaryTurnAnchor,
          )
          if (!carry)
            return null
          if (dominantAnchor && anchorsMateriallyConflict(carry, dominantAnchor))
            return null
          return carry
        })(),
    labelCarryAsMemory: mindTurnFrame?.memory.labelCarryAsMemory ?? recallGovernor?.carryAsMemory ?? answerCompiler?.labelCarryAsMemory ?? mindTurnContract?.labelCarryAsMemory ?? input.surfaceContract.labelCarryAsMemory,
    shouldAskForGrounding: groundedThisTurn
      ? false
      : mindTurnFrame?.obligation.shouldAskForGrounding ?? answerPlanner?.shouldAskForGrounding
        ?? (kernel?.speechAct === 'ask-reground' || answerCompiler?.recommendedAct === 'ask-reground' || repairState === 'need-reground'),
    shouldAcknowledgeRepair: mindTurnFrame?.obligation.shouldAcknowledgeRepair ?? answerPlanner?.shouldAcknowledgeRepair
      ?? (kernel?.turnMode === 'screen-repair' || answerCompiler?.turnMode === 'screen-repair' || repairState === 'stale-anchor'),
    maxSentences: answerCompiler?.maxSentences ?? mindTurnContract?.maxSentences ?? input.surfaceContract.maxSentences,
    mindMode: mindTurnFrame?.self.mindMode ?? mindMode ?? null,
    embodiedPresence: mindTurnFrame?.self.embodiedPresence ?? privateThought?.embodiedPresence ?? 'none',
    emotionalTension: mindTurnFrame?.self.emotionalTension ?? privateThought?.emotionalTension,
    dialogueActKernel: kernel,
    claimEvidence: claimEvidenceLedger,
    mustDo: [],
    mustNotDo: [],
    mindTurnFrame,
  }
}
