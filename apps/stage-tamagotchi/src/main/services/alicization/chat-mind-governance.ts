import type {
  AlicizationAnswerCompilerSnapshot,
  AlicizationAnswerPlannerSnapshot,
  AlicizationClaimEvidenceLedgerSnapshot,
  AlicizationConversationStateSnapshot,
  AlicizationDialogueActKernelSnapshot,
  AlicizationDialogueWorldThreadSnapshot,
  AlicizationDiscourseStateSnapshot,
  AlicizationMindKernelMode,
  AlicizationMindTurnFrameSnapshot,
  AlicizationMindTurnGovernance,
  AlicizationPrivateThoughtSnapshot,
  AlicizationRecallGovernorSnapshot,
  AlicizationReplyDeliberationSnapshot,
} from '../../../shared/eventa'
import type { AlicizationDialogueFocusGovernance } from './dialogue-focus-governor'
import type { AlicizationDialogueTurnEncounter } from './dialogue-turn-encounter'
import type { AlicizationExecutiveAnswerBrief } from './executive-answer-brief'
import type { AlicizationResponseCharter } from './response-charter'
import type { AlicizationResponseSurfaceContract } from './response-surface-contract'

import { anchorsMateriallyConflict, resolveDialogueAnchorCoherence } from './dialogue-anchor-coherence'
import { sanitizeDialogueAnchorText, sanitizeDialogueSurfaceText } from './dialogue-surface-text'
import { ensureMindGovernanceDecisionTraceId } from './mind-governance-trace'
import { deriveAlicizationTruthDiscipline } from './truth-discipline'

function sanitizeText(raw: unknown, maxChars = 220) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

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

function uniqueList(values: Array<string | null | undefined>, maxItems = 6) {
  const items: string[] = []
  for (const value of values) {
    const normalized = sanitizeText(value)
    if (!normalized || items.includes(normalized))
      continue
    items.push(normalized)
    if (items.length >= maxItems)
      break
  }
  return items
}

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
  dialogueEncounter?: AlicizationDialogueTurnEncounter | null
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
      { role: 'answer-intent', text: input.answerCompiler?.supportingReality[0] },
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
}): AlicizationMindTurnGovernance {
  const dialogueFocus = input.dialogueEncounter?.focus ?? input.dialogueFocus ?? null
  const frame = input.mindTurnFrame ?? null
  const repairState = frame?.obligation.repairState ?? resolveRepairState({
    brief: input.brief,
    answerPlanner: input.answerPlanner,
    groundedThisTurn: input.groundedThisTurn === true,
  })
  const screenReferenceMode = input.kernel?.screenReferenceMode
    ?? input.answerCompiler?.screenReferenceMode
    ?? input.discourseState?.screenReferenceMode
    ?? input.dialogueEncounter?.screenReferenceMode
    ?? dialogueFocus?.screenReferenceMode
    ?? null
  const groundedThisTurn = input.groundedThisTurn === true
  const truthState = groundedThisTurn && screenReferenceMode !== 'avoid'
    ? 'live-grounded' as const
    : frame?.world.truthState ?? input.brief.truthState
  const anchorCoherence = resolveGovernedAnchorCoherence({
    brief: input.brief,
    mindTurnFrame: frame,
    kernel: input.kernel ?? null,
    answerPlanner: input.answerPlanner,
    answerCompiler: input.answerCompiler,
    conversationState: input.conversationState ?? null,
    discourseState: input.discourseState ?? null,
    dialogueWorldThread: input.dialogueWorldThread ?? null,
    replyDeliberation: input.replyDeliberation ?? null,
    dialogueEncounter: input.dialogueEncounter ?? null,
    answerSubject: frame?.relation.subject ?? input.kernel?.subject ?? input.answerCompiler?.answerSubject ?? input.discourseState?.currentTurnSubject ?? input.dialogueEncounter?.subject ?? dialogueFocus?.subject ?? null,
    screenReferenceMode,
    truthState,
    groundedThisTurn,
  })
  const conversationalProjectAnchor = sanitizeSemanticAnchorCandidate(input.conversationState?.activeProject) || null
  const dominantAnchor = (
    !anchorCoherence.sceneAuthority
    && !frame
    && input.kernel == null
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
  const turnMode = frame?.obligation.turnMode ?? input.kernel?.turnMode ?? input.brief.turnMode
  const answerSubject = frame?.relation.subject
    ?? input.kernel?.subject
    ?? input.answerCompiler?.answerSubject
    ?? input.discourseState?.currentTurnSubject
    ?? input.dialogueEncounter?.subject
    ?? dialogueFocus?.subject
    ?? null
  const answerAct = frame?.obligation.answerAct
    ?? input.kernel?.speechAct
    ?? input.answerCompiler?.recommendedAct
    ?? input.answerPlanner?.act
    ?? null
  const evidenceMode = input.kernel?.truthMode === 'memory-only'
    ? input.answerCompiler?.evidenceMode ?? input.answerPlanner?.evidenceMode ?? null
    : input.kernel?.truthMode ?? input.answerCompiler?.evidenceMode ?? input.answerPlanner?.evidenceMode ?? null
  const truthDiscipline = deriveAlicizationTruthDiscipline({
    answerSubject,
    screenReferenceMode,
    truthState,
    turnMode,
    repairState,
    evidenceMode,
    labelCarryAsMemory: frame?.memory.labelCarryAsMemory
      ?? input.recallGovernor?.carryAsMemory
      ?? input.answerCompiler?.labelCarryAsMemory
      ?? input.surfaceContract.labelCarryAsMemory,
    suppressAssociativeRecall: frame?.memory.suppressAssociativeRecall
      ?? input.recallGovernor?.suppressAssociativeRecall
      ?? input.answerCompiler?.suppressAssociativeRecall
      ?? input.surfaceContract.suppressAssociativeRecall,
    currentConsciousFrame: null,
    claimEvidenceLedger: input.claimEvidenceLedger ?? null,
  })

  return {
    decisionTraceId: ensureMindGovernanceDecisionTraceId(input.decisionTraceId),
    turnMode,
    truthState,
    groundedThisTurn,
    personaKernelMode: input.surfaceContract.personaKernelMode,
    openingStyle: input.surfaceContract.openingStyle,
    relationshipPosture: frame?.relation.relationshipPosture ?? input.charter.relationshipPosture,
    answerSubject,
    screenReferenceMode,
    answerAct,
    evidenceMode,
    repairState,
    liveSurface: sanitizeUserFacingCandidate(frame?.world.visibleSurface ?? input.brief.liveSurface) || null,
    focusAnchor: dominantAnchor
      ?? (sanitizeSemanticAnchorCandidate(
        input.conversationState?.primaryTurnAnchor
        ?? input.discourseState?.primaryTurnAnchor
        ?? input.dialogueEncounter?.taskAnchor
        ?? input.dialogueEncounter?.summary
        ?? input.conversationState?.activeProject
        ?? (screenReferenceMode === 'avoid' ? null : input.brief.liveSurface),
      ) || null),
    answerIntent: pickGovernedCue(
      input.conversationState?.hostMove ?? '',
      dominantAnchor,
      input.conversationState?.primaryTurnAnchor,
      input.discourseState?.primaryTurnAnchor,
      input.dialogueEncounter?.taskAnchor,
      input.dialogueEncounter?.summary,
      keepCoherent(frame?.obligation.answerIntent),
      keepCoherent(frame?.focusAnchor),
      keepCoherent(screenReferenceMode === 'avoid' ? null : frame?.world.visibleSurface),
      keepCoherent(input.kernel?.openingClaim),
      keepCoherent(input.kernel?.selectedEvidence[0]?.summary),
      keepCoherent(input.answerCompiler?.supportingReality[0]),
      keepCoherent(input.dialogueWorldThread?.activeThread),
      keepCoherent(input.conversationState?.activeProject),
      keepCoherent(screenReferenceMode === 'avoid' ? null : input.brief.liveSurface),
      keepCoherent(input.answerPlanner?.answerIntent),
      keepCoherent(input.answerCompiler?.nextMove),
      keepCoherent(input.replyDeliberation?.whyThisReplyNow),
      keepCoherent(input.dialogueWorldThread?.currentQuestion),
      keepCoherent(input.conversationState?.jointThread),
    ) || sanitizeSemanticAnchorCandidate(
      dominantAnchor
      ?? input.conversationState?.primaryTurnAnchor
      ?? input.discourseState?.primaryTurnAnchor
      ?? input.dialogueEncounter?.taskAnchor
      ?? input.dialogueEncounter?.summary
      ?? keepCoherent(frame?.focusAnchor)
      ?? keepCoherent(input.conversationState?.activeProject)
      ?? keepCoherent(input.brief.liveSurface)
      ?? keepCoherent(input.answerPlanner?.answerIntent)
      ?? keepCoherent(input.answerCompiler?.nextMove),
    ) || null,
    openingMove: sanitizeUserFacingCandidate(
      frame?.obligation.openingMove
      ?? input.kernel?.openingMove
      ?? input.kernel?.mustSay[0]
      ?? input.replyDeliberation?.openingBeat
      ?? input.answerPlanner?.openingMove
      ?? input.answerCompiler?.openingDirective,
    ) || null,
    carriedThread: truthDiscipline.shouldBlockScreenCarry
      ? null
      : (() => {
          const carry = sanitizeSemanticAnchorCandidate(
            frame?.memory.carriedThread
            ?? input.brief.carriedThread
            ?? input.conversationState?.primaryTurnAnchor,
          )
          if (!carry)
            return null
          if (dominantAnchor && anchorsMateriallyConflict(carry, dominantAnchor))
            return null
          return carry
        })(),
    suppressAssociativeRecall: truthDiscipline.shouldSuppressAssociativeRecall,
    labelCarryAsMemory: frame?.memory.labelCarryAsMemory ?? input.recallGovernor?.carryAsMemory ?? input.answerCompiler?.labelCarryAsMemory ?? input.surfaceContract.labelCarryAsMemory,
    shouldAskForGrounding: groundedThisTurn
      ? false
      : frame?.obligation.shouldAskForGrounding ?? input.answerPlanner?.shouldAskForGrounding
        ?? (input.kernel?.speechAct === 'ask-reground' || input.answerCompiler?.recommendedAct === 'ask-reground' || repairState === 'need-reground'),
    shouldAcknowledgeRepair: frame?.obligation.shouldAcknowledgeRepair ?? input.answerPlanner?.shouldAcknowledgeRepair
      ?? (input.kernel?.turnMode === 'screen-repair' || input.answerCompiler?.turnMode === 'screen-repair' || repairState === 'stale-anchor'),
    maxSentences: input.answerCompiler?.maxSentences ?? input.surfaceContract.maxSentences,
    mindMode: frame?.self.mindMode ?? input.mindMode ?? null,
    embodiedPresence: frame?.self.embodiedPresence ?? input.privateThought?.embodiedPresence ?? 'none',
    emotionalTension: frame?.self.emotionalTension ?? input.privateThought?.emotionalTension,
    dialogueActKernel: input.kernel ?? null,
    claimEvidence: input.claimEvidenceLedger ?? null,
    mustDo: uniqueList([
      ...anchorCoherence.reasonTags.map(tag => `anchor:${tag}`),
      ...truthDiscipline.reasonTags.map(tag => `truth:${tag}`),
      ...(frame?.mustDo ?? []),
      ...(input.kernel?.mustSay ?? []),
      truthDiscipline.shouldLabelHypothesis
        ? 'Keep direct observation and any hypothesis in separate clauses.'
        : null,
      ...(input.answerCompiler?.mustDo ?? []),
      ...input.brief.mustDo,
      ...input.surfaceContract.mustDo,
      ...(input.answerPlanner?.mustDo ?? []),
    ], 12),
    mustNotDo: uniqueList([
      ...(frame?.mustNotDo ?? []),
      ...(input.kernel?.mustAvoid ?? []),
      truthDiscipline.forbidUnsupportedSpecificity
        ? 'Do not introduce file names, class names, enum names, or field changes that this turn has not actually evidenced.'
        : null,
      ...(input.answerCompiler?.mustNotDo ?? []),
      ...input.brief.mustNotDo,
      ...input.surfaceContract.mustNotDo,
      ...(input.answerPlanner?.mustNotDo ?? []),
    ], 12),
    mindTurnFrame: frame,
  }
}
