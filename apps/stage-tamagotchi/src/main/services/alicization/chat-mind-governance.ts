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

import { alicizationFixedTemplateReplacement, sanitizeAlicizationStructuredInternalText } from '@proj-alicization/stage-shared'

import { anchorsMateriallyConflict, resolveDialogueAnchorCoherence } from './dialogue-anchor-coherence'
import { sanitizeDialogueAnchorText, sanitizeDialogueSurfaceText } from './dialogue-surface-text'
import { ensureMindGovernanceDecisionTraceId } from './mind-governance-trace'
import { resolveAlicizationProjectStateBrief } from './project-state-brief'
import { deriveAlicizationTruthDiscipline } from './truth-discipline'

function sanitizeText(raw: unknown, maxChars = 220) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function sanitizeProjectVoiceMode(raw: unknown) {
  const normalized = sanitizeText(raw, 32)
  return normalized === 'lower-pressure' || normalized === 'even'
    ? normalized
    : null
}

function sanitizeProjectPacingMode(raw: unknown) {
  const normalized = sanitizeText(raw, 32)
  return normalized === 'slower' || normalized === 'natural'
    ? normalized
    : null
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

function extractProjectNextClosureCue(governingProjectCue: string) {
  const explicitMatch = governingProjectCue.match(/next closure target:\s*([^|]+)$/iu)
    ?? governingProjectCue.match(/\|\s*next closure target:\s*([^|]+)/iu)
  return sanitizeText(explicitMatch?.[1] ?? '', 180) || null
}

function renderProjectControlValue(raw: string) {
  const sanitized = sanitizeAlicizationStructuredInternalText(
    sanitizeText(raw, 220),
    220,
    alicizationFixedTemplateReplacement,
  )
  const safe = sanitized === alicizationFixedTemplateReplacement
    ? 'content=withheld; reason=continuity-residue'
    : sanitized
  return safe
    .replace(/[;|]+/gu, ',')
    .replace(/\s+/gu, ' ')
    .trim()
}

function renderProjectFocusControl(raw: string) {
  const value = renderProjectControlValue(raw)
  return value ? `project_focus=${value}; continuity_gap=still_open` : null
}

function renderProjectNextClosureControl(raw: string) {
  const value = renderProjectControlValue(raw)
  return value ? `project_next_closure_target=${value}` : null
}

function renderGoverningProjectControl(raw: string) {
  const normalized = renderProjectControlValue(raw)
  if (!normalized)
    return null

  const structuredPairs = normalized
    .split(/\s*,\s*/gu)
    .map(segment => segment.trim())
    .filter(segment => /^[\w.:-]+=[^=]+$/iu.test(segment))
  const suffix = structuredPairs.length > 0
    ? `; ${structuredPairs.join('; ')}`
    : '; cue=withheld_non_structured'
  return `governing_project=active; detached_local_optimization=blocked${suffix}`
}

function renderEmotionalClosureControl(raw: string) {
  const value = renderProjectControlValue(raw)
  return value
    ? `emotional_closure=active; surface=low_pressure_internal_until_payoff; cue=${value}`
    : null
}

function resolvePreferredProjectGovernanceCue(input: {
  governingProjectCue: string
  livePreDialogueAwarenessLine?: string | null
}) {
  const governingProjectCue = sanitizeText(input.governingProjectCue, 220)
  const livePreDialogueAwarenessLine = sanitizeText(input.livePreDialogueAwarenessLine, 220)
  if (!livePreDialogueAwarenessLine)
    return governingProjectCue

  const lowerGovernance = governingProjectCue.toLowerCase()
  const lowerLiveAwareness = livePreDialogueAwarenessLine.toLowerCase()
  const liveHasPhaseAndOpenClosure = lowerLiveAwareness.includes('phase 1')
    && (
      lowerLiveAwareness.includes('still need')
      || lowerLiveAwareness.includes('not yet closed')
      || lowerLiveAwareness.includes('not fully closed')
      || lowerLiveAwareness.includes('generic assistant shell')
    )
  const governanceLooksEmbodimentThin = lowerGovernance.includes('body')
    || lowerGovernance.includes('face')
    || lowerGovernance.includes('motion')
    || lowerGovernance.includes('same living line gentle')

  if (liveHasPhaseAndOpenClosure && (!governingProjectCue || governanceLooksEmbodimentThin))
    return livePreDialogueAwarenessLine

  return governingProjectCue
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
    suppressAssociativeRecall: mindTurnFrame?.memory.suppressAssociativeRecall
      ?? recallGovernor?.suppressAssociativeRecall
      ?? answerCompiler?.suppressAssociativeRecall
      ?? input.surfaceContract.suppressAssociativeRecall,
    currentConsciousFrame: null,
    claimEvidenceLedger,
  })
  const mindTurnContract = input.mindTurnContract ?? null
  const rawGoverningProjectCue
    = answerPlanner?.governingProject
      ?? mindTurnContract?.governingProject
      ?? input.charter.governingProject
      ?? ''
  const liveProjectState = runtimeSurface?.dialogue.currentConsciousFrame?.projectState ?? null
  const governingProjectCue = resolvePreferredProjectGovernanceCue({
    governingProjectCue: rawGoverningProjectCue,
    livePreDialogueAwarenessLine: liveProjectState?.preDialogueAwarenessLine,
  })
  const rawGoverningProjectCueSanitized = sanitizeText(rawGoverningProjectCue, 220)
  const projectStateBrief = resolveAlicizationProjectStateBrief()
  const projectStateFocusCue = sanitizeSemanticAnchorCandidate(
    liveProjectState?.primaryOpenLoop
    ?? projectStateBrief.openLoops[0],
    180,
  ) || null
  const projectStatePhaseCue = sanitizeText(
    liveProjectState?.currentPhase
    ?? projectStateBrief.currentPhase,
    120,
  ) || null
  const projectStateNextClosureCue = sanitizeText(
    liveProjectState?.nextClosureTarget
    ?? extractProjectNextClosureCue(rawGoverningProjectCue),
    180,
  ) || null
  const projectStateVoiceModeCue
    = sanitizeProjectVoiceMode(liveProjectState?.preferredVoiceMode)
      ?? sanitizeProjectVoiceMode(mindTurnContract?.projectState?.preferredVoiceMode)
      ?? projectStateBrief.preferredVoiceMode
      ?? null
  const projectStatePacingModeCue
    = sanitizeProjectPacingMode(liveProjectState?.preferredPacingMode)
      ?? sanitizeProjectPacingMode(mindTurnContract?.projectState?.preferredPacingMode)
      ?? projectStateBrief.preferredPacingMode
      ?? null
  const emotionalClosureCue = sanitizeText(mindTurnContract?.emotionalClosureCue, 220) || null

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
      keepCoherent(answerCompiler?.supportingReality[0]),
      keepCoherent(dialogueWorldThread?.activeThread),
      keepCoherent(conversationState?.activeProject),
      keepCoherent(projectStateFocusCue),
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
      ?? keepCoherent(projectStateFocusCue)
      ?? keepCoherent(input.brief.liveSurface)
      ?? keepCoherent(answerPlanner?.answerIntent)
      ?? keepCoherent(answerCompiler?.nextMove),
    ) || null,
    openingMove: sanitizeUserFacingCandidate(
      mindTurnFrame?.obligation.openingMove
      ?? kernel?.openingMove
      ?? kernel?.mustSay[0]
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
    suppressAssociativeRecall: truthDiscipline.shouldSuppressAssociativeRecall,
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
    mustDo: uniqueList([
      ...anchorCoherence.reasonTags.map(tag => `anchor:${tag}`),
      ...truthDiscipline.reasonTags.map(tag => `truth:${tag}`),
      ...(mindTurnFrame?.mustDo ?? []),
      ...(kernel?.mustSay ?? []),
      truthDiscipline.shouldLabelHypothesis
        ? 'direct_observation_clause=separate; hypothesis_clause=separate'
        : null,
      projectStatePhaseCue
        ? `turn_alignment=${projectStatePhaseCue}; detached_local_optimization=blocked`
        : null,
      projectStateFocusCue
        ? renderProjectFocusControl(projectStateFocusCue)
        : null,
      projectStateNextClosureCue
        ? renderProjectNextClosureControl(projectStateNextClosureCue)
        : null,
      projectStateVoiceModeCue === 'lower-pressure'
        ? 'voice_pressure=lower; generic_assistant_delivery=blocked'
        : projectStateVoiceModeCue === 'even'
          ? 'voice_pressure=even; performative_overeager_delivery=blocked'
          : null,
      projectStatePacingModeCue === 'slower'
        ? 'pacing=slower; widening=deferred'
        : projectStatePacingModeCue === 'natural'
          ? 'pacing=natural_unforced; rushing_ahead=blocked'
          : null,
      governingProjectCue && governingProjectCue !== rawGoverningProjectCueSanitized
        ? renderGoverningProjectControl(governingProjectCue)
        : rawGoverningProjectCueSanitized
          ? renderGoverningProjectControl(rawGoverningProjectCueSanitized)
          : null,
      emotionalClosureCue
        ? renderEmotionalClosureControl(emotionalClosureCue)
        : null,
      ...(answerCompiler?.mustDo ?? []),
      ...input.brief.mustDo,
      ...(mindTurnContract?.mustDo ?? []),
      ...input.surfaceContract.mustDo,
      ...(answerPlanner?.mustDo ?? []),
    ], 14),
    mustNotDo: uniqueList([
      ...(mindTurnFrame?.mustNotDo ?? []),
      ...(kernel?.mustAvoid ?? []),
      truthDiscipline.forbidUnsupportedSpecificity
        ? 'unsupported_specificity=blocked; file_class_enum_field_claims=require_current_evidence'
        : null,
      ...(answerCompiler?.mustNotDo ?? []),
      ...input.brief.mustNotDo,
      ...(mindTurnContract?.mustNotDo ?? []),
      ...input.surfaceContract.mustNotDo,
      ...(answerPlanner?.mustNotDo ?? []),
    ], 12),
    mindTurnFrame,
  }
}
