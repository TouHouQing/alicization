import type {
  AlicizationAnswerCompilerSnapshot,
  AlicizationClaimEvidenceLedgerSnapshot,
  AlicizationCommitmentSnapshot,
  AlicizationConcernSnapshot,
  AlicizationCurrentConsciousFrameSnapshot,
  AlicizationDialogueActKernelSnapshot,
  AlicizationDiscourseStateSnapshot,
  AlicizationInquiryPlanSnapshot,
  AlicizationMindSynthesisSnapshot,
  AlicizationVisualPresenceStateSnapshot,
} from '../../../shared/eventa'
import type { AlicizationDialogueFocusGovernance } from './dialogue-focus-governor'
import type { AlicizationDialogueObligation } from './dialogue-obligation'
import type { AlicizationDialogueTurnEncounter } from './dialogue-turn-encounter'
import type { AlicizationDialogueTurnSemantics } from './dialogue-turn-semantics'
import type { AlicizationProactiveLayeredContext } from './proactive-layered-context'

import { buildEpistemicSurfacePosture } from './epistemic-surface'

export type AlicizationResponseEpistemicMode
  = | 'grounded-live'
    | 'coarse-live'
    | 'dialogue-grounded'
    | 'repair-needed'
    | 'memory-only'

export type AlicizationResponseMode
  = | 'guide-current-knot'
    | 'repair-and-reanchor'
    | 'care-with-boundary'
    | 'accompany-lightly'
    | 'answer-naturally'

export interface AlicizationResponseCharter {
  epistemicMode: AlicizationResponseEpistemicMode
  responseMode: AlicizationResponseMode
  governingFocus: string
  governingConcern: string | null
  governingCommitment: string | null
  governingInquiry: string | null
  governingProject: string | null
  latestRevision: string | null
  executivePhase: string | null
  truthFrame: string | null
  mindMode: string | null
  relationshipPosture: 'restrained' | 'warm' | 'tender'
  reasons: string[]
  mustDo: string[]
  mustNotDo: string[]
}

function sanitizeText(raw: unknown, maxChars = 220) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function strongestConcern(concerns: AlicizationConcernSnapshot[] | null | undefined) {
  const rows = Array.isArray(concerns) ? concerns : []
  return rows
    .slice()
    .sort((left, right) => (right.tension * right.careWeight) - (left.tension * left.careWeight))[0] ?? null
}

function governingCommitment(state: AlicizationVisualPresenceStateSnapshot) {
  const commitments = state.commitmentLedger?.commitments ?? []
  if (commitments.length === 0)
    return null
  return commitments.find(commitment => commitment.id === state.commitmentLedger?.governingCommitmentId)
    ?? commitments[0]
    ?? null
}

function activeInquiryPlan(state: AlicizationVisualPresenceStateSnapshot) {
  const plans = state.inquiryPlanner?.plans ?? []
  if (plans.length === 0)
    return null
  return plans.find(plan => plan.id === state.inquiryPlanner?.activePlanId)
    ?? plans[0]
    ?? null
}

function dominantProject(state: AlicizationVisualPresenceStateSnapshot) {
  const projects = state.intentionStream?.projects ?? []
  if (projects.length === 0)
    return null
  return projects.find(project => project.id === state.intentionStream?.dominantProjectId)
    ?? projects[0]
    ?? null
}

function latestReflection(state: AlicizationVisualPresenceStateSnapshot) {
  const entries = state.reflectionLedger?.entries ?? []
  if (entries.length === 0)
    return null
  return entries.find(entry => entry.id === state.reflectionLedger?.latestEntryId)
    ?? entries[0]
    ?? null
}

function resolveEpistemicMode(input: {
  context: AlicizationProactiveLayeredContext
  state: AlicizationVisualPresenceStateSnapshot
  dialogueFocus?: AlicizationDialogueFocusGovernance | null
}) {
  if (
    input.dialogueFocus
    && input.dialogueFocus.shouldBypassScreenRepair
    && input.dialogueFocus.subject !== 'visible-scene'
  ) {
    return 'dialogue-grounded' as const
  }
  if (!input.state.worldModel)
    return 'memory-only' as const
  const certainty = input.state.worldModel?.epistemicState.certainty ?? 'uncertain'
  const posture = buildEpistemicSurfacePosture({
    context: input.context,
    worldModel: input.state.worldModel,
    beliefRevision: input.state.beliefRevision,
  })
  if (certainty === 'grounded')
    return 'grounded-live' as const
  if (posture.coarseObservedProblemHolding)
    return 'coarse-live' as const
  if (posture.requiresRegroundBeforeSurface)
    return 'repair-needed' as const
  return 'memory-only' as const
}

function resolveResponseMode(input: {
  epistemicMode: AlicizationResponseEpistemicMode
  context: AlicizationProactiveLayeredContext
  state: AlicizationVisualPresenceStateSnapshot
  concern: AlicizationConcernSnapshot | null
  commitment: AlicizationCommitmentSnapshot | null
  inquiry: AlicizationInquiryPlanSnapshot | null
  dialogueObligation?: AlicizationDialogueObligation | null
  dialogueFocus?: AlicizationDialogueFocusGovernance | null
}) {
  if (input.dialogueFocus?.subject === 'alicization-self')
    return 'answer-naturally' as const
  if (input.dialogueFocus?.subject === 'relationship')
    return 'accompany-lightly' as const
  if (input.dialogueFocus?.subject === 'host-state')
    return 'care-with-boundary' as const
  if (input.dialogueFocus?.subject === 'task-knot')
    return 'guide-current-knot' as const
  if (input.dialogueFocus?.shouldBypassScreenRepair && input.dialogueFocus?.subject === 'general')
    return 'answer-naturally' as const
  if (input.dialogueObligation?.kind === 'repair')
    return 'repair-and-reanchor' as const
  if (input.dialogueObligation?.kind === 'teach' || input.dialogueObligation?.kind === 'guide')
    return 'guide-current-knot' as const
  if (input.dialogueObligation?.kind === 'care')
    return 'care-with-boundary' as const
  if (input.dialogueObligation?.kind === 'accompany')
    return 'accompany-lightly' as const
  if (input.state.answerPlanner?.act === 'correct-stale-anchor' || input.state.answerPlanner?.act === 'ask-reground')
    return 'repair-and-reanchor' as const
  if (input.state.answerPlanner?.act === 'care')
    return 'care-with-boundary' as const
  if (input.state.answerPlanner?.act === 'guide')
    return 'guide-current-knot' as const
  if (input.state.answerPlanner?.act === 'defer')
    return 'accompany-lightly' as const
  if (input.state.executiveCycle?.phase === 'reflecting' || input.state.executiveCycle?.phase === 'inferring')
    return 'repair-and-reanchor' as const
  if (dominantProject(input.state)?.kind === 'care-host')
    return 'care-with-boundary' as const
  if (dominantProject(input.state)?.kind === 'hold-knot')
    return 'guide-current-knot' as const
  if (dominantProject(input.state)?.kind === 'stay-near' || dominantProject(input.state)?.kind === 'witness-afterglow')
    return 'accompany-lightly' as const
  if (
    input.concern?.kind === 'care-body'
    || input.commitment?.kind === 'care-host'
    || input.state.privateThought?.stance === 'care'
    || input.state.privateThought?.stance === 'warn'
  ) {
    return 'care-with-boundary' as const
  }
  if (
    input.epistemicMode === 'repair-needed'
    || input.commitment?.kind === 'repair-misread'
    || input.commitment?.kind === 'recheck-scene'
    || input.inquiry?.kind === 'reground-scene'
  ) {
    return 'repair-and-reanchor' as const
  }
  if (
    input.concern?.kind === 'help-fix'
    || input.commitment?.kind === 'hold-problem'
    || input.commitment?.kind === 'follow-through'
    || input.context.content.kind === 'error'
    || input.context.content.kind === 'diff'
    || input.context.workload.kind === 'coding'
    || input.context.workload.kind === 'terminal'
  ) {
    return 'guide-current-knot' as const
  }
  if (
    input.state.privateThought?.stance === 'observe'
    || input.state.privateThought?.stance === 'accompany'
    || input.state.actionEcology?.mode === 'quiet-accompany'
    || input.state.actionEcology?.mode === 'silent-presence'
  ) {
    return 'accompany-lightly' as const
  }
  return 'answer-naturally' as const
}

function resolveRelationshipPosture(input: {
  epistemicMode: AlicizationResponseEpistemicMode
  responseMode: AlicizationResponseMode
  state: AlicizationVisualPresenceStateSnapshot
  dialogueObligation?: AlicizationDialogueObligation | null
  dialogueFocus?: AlicizationDialogueFocusGovernance | null
}) {
  if (
    (input.epistemicMode === 'repair-needed' && input.dialogueFocus?.screenReferenceMode !== 'avoid')
    || input.state.selfContinuity?.attachmentMode === 'guarded'
    || input.state.selfContinuity?.initiativeTemperament === 'reserved'
    || input.state.mindKernel?.dominantMode === 'repairing'
    || input.state.executiveCycle?.phase === 'reflecting'
    || input.state.executiveCycle?.phase === 'inferring'
  ) {
    return 'restrained' as const
  }
  if (input.dialogueObligation?.kind === 'care')
    return 'tender' as const
  if (
    input.responseMode === 'care-with-boundary'
    || input.state.relationshipModel?.approachVector === 'care'
    || input.state.relationshipModel?.approachVector === 'stay-near'
  ) {
    return 'tender' as const
  }
  return 'warm' as const
}

function resolveGoverningFocus(input: {
  state: AlicizationVisualPresenceStateSnapshot
  concern: AlicizationConcernSnapshot | null
  commitment: AlicizationCommitmentSnapshot | null
  inquiry: AlicizationInquiryPlanSnapshot | null
  dialogueSemantics?: AlicizationDialogueTurnSemantics | null
  dialogueObligation?: AlicizationDialogueObligation | null
  dialogueFocus?: AlicizationDialogueFocusGovernance | null
}) {
  const project = dominantProject(input.state)
  const reflection = latestReflection(input.state)
  return sanitizeText(
    input.state.replyDeliberation?.whyThisReplyNow
    || input.state.dialogueWorldThread?.currentQuestion
    || input.state.dialogueWorldThread?.activeThread
    || input.dialogueFocus?.focusSummary
    || input.dialogueSemantics?.summary
    || input.dialogueObligation?.summary
    || reflection?.revision
    || input.state.executiveCycle?.currentLine
    || project?.summary
    || input.state.answerPlanner?.governingFocus
    || input.state.concernContinuity?.entries.find(entry => entry.id === input.state.concernContinuity?.governingEntryId)?.summary
    || input.state.repairLedger?.entries.find(entry => entry.id === input.state.repairLedger?.governingRepairId)?.summary
    || input.state.worldModel?.activeThread?.summary
    || input.concern?.summary
    || input.commitment?.summary
    || input.inquiry?.question
    || input.state.currentScene?.summary
    || input.state.privateThought?.thoughtText
    || '',
    220,
  ) || 'Stay with the host’s current knot instead of drifting into stale memory.'
}

function pushUnique(target: string[], value: string) {
  const normalized = sanitizeText(value, 220)
  if (!normalized)
    return
  if (target.includes(normalized))
    return
  target.push(normalized)
}

function uniqueList(values: Array<string | null | undefined>, maxItems = 6) {
  const items: string[] = []
  for (const value of values) {
    const normalized = sanitizeText(value, 220)
    if (!normalized || items.includes(normalized))
      continue
    items.push(normalized)
    if (items.length >= maxItems)
      break
  }
  return items
}

export function buildAlicizationResponseCharter(input: {
  context: AlicizationProactiveLayeredContext
  state: AlicizationVisualPresenceStateSnapshot
  inspectionRequested: boolean
  dialogueActKernel?: AlicizationDialogueActKernelSnapshot | null
  dialogueEncounter?: AlicizationDialogueTurnEncounter | null
  dialogueSemantics?: AlicizationDialogueTurnSemantics | null
  dialogueObligation?: AlicizationDialogueObligation | null
  dialogueFocus?: AlicizationDialogueFocusGovernance | null
  discourseState?: AlicizationDiscourseStateSnapshot | null
  mindSynthesis?: AlicizationMindSynthesisSnapshot | null
  answerCompiler?: AlicizationAnswerCompilerSnapshot | null
  currentConsciousFrame?: AlicizationCurrentConsciousFrameSnapshot | null
  claimEvidenceLedger?: AlicizationClaimEvidenceLedgerSnapshot | null
}) {
  const dialogueEncounter = input.dialogueEncounter ?? null
  const dialogueSemantics = dialogueEncounter?.semantics ?? input.dialogueSemantics ?? null
  const dialogueObligation = dialogueEncounter?.obligation ?? input.dialogueObligation ?? null
  const dialogueFocus = dialogueEncounter?.focus ?? input.dialogueFocus ?? null
  const discourseState = input.discourseState ?? input.state.discourseState ?? null
  const mindSynthesis = input.mindSynthesis ?? input.state.mindSynthesis ?? null
  const answerCompiler = input.answerCompiler ?? input.state.answerCompiler ?? null
  const currentConsciousFrame = input.currentConsciousFrame ?? input.state.currentConsciousFrame ?? null
  const claimEvidenceLedger = input.claimEvidenceLedger ?? input.state.claimEvidenceLedger ?? null
  const concern = strongestConcern(input.state.concerns)
  const commitment = governingCommitment(input.state)
  const inquiry = activeInquiryPlan(input.state)
  const project = dominantProject(input.state)
  const reflection = latestReflection(input.state)
  const dialogueActKernel = input.dialogueActKernel ?? input.state.dialogueActKernel ?? null
  if (answerCompiler) {
    const epistemicMode = answerCompiler.evidenceMode === 'live-grounded' || answerCompiler.evidenceMode === 'live-observed'
      ? 'grounded-live' as const
      : answerCompiler.evidenceMode === 'coarse-held'
        ? 'coarse-live' as const
        : answerCompiler.evidenceMode === 'dialogue-grounded'
          ? 'dialogue-grounded' as const
          : answerCompiler.evidenceMode === 'repair-first'
            ? 'repair-needed' as const
            : 'memory-only' as const
    return {
      epistemicMode,
      responseMode: answerCompiler.responseMode,
      governingFocus: sanitizeText(
        currentConsciousFrame?.speakingIntention
        || currentConsciousFrame?.consciousNeed
        || currentConsciousFrame?.consciousTension
        || claimEvidenceLedger?.intentHypothesis
        || claimEvidenceLedger?.taskHypothesis
        || claimEvidenceLedger?.observedSurface
        || dialogueActKernel?.whyNow
        || dialogueActKernel?.openingClaim
        || input.state.replyDeliberation?.whyThisReplyNow
        || input.state.dialogueWorldThread?.currentQuestion
        || input.state.dialogueWorldThread?.activeThread
        || answerCompiler.openingDirective
        || discourseState?.currentTurnSummary
        || mindSynthesis?.interiorSummary
        || answerCompiler.openingClaim,
        220,
      ) || 'Stay with the compiled answer spine.',
      governingConcern: sanitizeText(mindSynthesis?.concerns[0]?.summary ?? concern?.summary ?? '', 180) || null,
      governingCommitment: sanitizeText(mindSynthesis?.commitments[0]?.summary ?? commitment?.summary ?? '', 180) || null,
      governingInquiry: sanitizeText(answerCompiler.nextMove ?? inquiry?.question ?? '', 180) || null,
      governingProject: sanitizeText(project?.summary ?? answerCompiler.openingClaim, 180) || null,
      latestRevision: sanitizeText(reflection?.revision ?? '', 180) || null,
      executivePhase: sanitizeText(input.state.executiveCycle?.phase ?? '', 64) || null,
      truthFrame: sanitizeText(
        input.state.initiative?.selectedTruthFrame
        ?? input.state.worldOntology?.dominantFrame
        ?? '',
        96,
      ) || null,
      mindMode: sanitizeText(
        input.state.mindKernel?.dominantMode
        ?? input.state.privateThought?.stance
        ?? '',
        48,
      ) || null,
      relationshipPosture: answerCompiler.relationshipPosture,
      reasons: uniqueList([
        currentConsciousFrame?.consciousNeed,
        currentConsciousFrame?.consciousTension,
        currentConsciousFrame?.speakingIntention,
        claimEvidenceLedger?.observedSurface,
        claimEvidenceLedger?.taskHypothesis,
        claimEvidenceLedger?.intentHypothesis,
        dialogueActKernel?.whyNow,
        ...(dialogueActKernel?.sourceTrace ?? []),
        input.state.dialogueWorldThread?.activeThread,
        input.state.dialogueWorldThread?.currentQuestion,
        answerCompiler.openingClaim,
        ...answerCompiler.supportingReality,
        mindSynthesis?.interiorSummary,
        discourseState?.currentTurnSummary,
      ], 4),
      mustDo: uniqueList([
        currentConsciousFrame?.truthDiscipline === 'observe-then-hypothesize'
          ? 'Separate present observation from hypothesis in the visible answer.'
          : null,
        claimEvidenceLedger?.shouldLabelHypothesis
          ? 'Keep observation and hypothesis in visibly separate clauses.'
          : null,
        currentConsciousFrame?.truthDiscipline === 'repair-first'
          ? 'Let self-revision happen in the visible answer before introducing new explanation.'
          : null,
        currentConsciousFrame?.truthDiscipline === 'dialogue-first'
          ? 'Let the living dialogue subject outrank screen context in the opening answer.'
          : null,
        ...(dialogueActKernel?.mustSay ?? []),
        ...answerCompiler.mustDo,
      ], 8),
      mustNotDo: uniqueList([
        currentConsciousFrame?.shouldWithholdSpecificity
          ? 'Do not jump from coarse cues to specific file, class, enum, or field claims.'
          : null,
        claimEvidenceLedger?.forbidUnsupportedSpecificity
          ? 'Do not name specific technical artifacts unless the host named them or the current evidence explicitly grounds them.'
          : null,
        currentConsciousFrame?.shouldSelfRevise
          ? 'Do not defend a previous read once the current turn is pulling toward revision.'
          : null,
        ...(dialogueActKernel?.mustAvoid ?? []),
        ...answerCompiler.mustNotDo,
      ], 8),
    } satisfies AlicizationResponseCharter
  }

  const epistemicMode = resolveEpistemicMode({
    context: input.context,
    state: input.state,
    dialogueFocus,
  })
  const responseMode = resolveResponseMode({
    epistemicMode,
    context: input.context,
    state: input.state,
    concern,
    commitment,
    inquiry,
    dialogueObligation,
    dialogueFocus,
  })
  const relationshipPosture = resolveRelationshipPosture({
    epistemicMode,
    responseMode,
    state: input.state,
    dialogueObligation,
    dialogueFocus,
  })
  const reasons: string[] = []
  pushUnique(reasons, dialogueObligation?.summary ?? '')
  pushUnique(reasons, dialogueEncounter?.summary ?? '')
  pushUnique(reasons, dialogueSemantics?.summary ?? '')
  pushUnique(reasons, currentConsciousFrame?.consciousNeed ?? '')
  pushUnique(reasons, currentConsciousFrame?.consciousTension ?? '')
  pushUnique(reasons, currentConsciousFrame?.speakingIntention ?? '')
  pushUnique(reasons, claimEvidenceLedger?.observedSurface ?? '')
  pushUnique(reasons, claimEvidenceLedger?.taskHypothesis ?? '')
  pushUnique(reasons, claimEvidenceLedger?.intentHypothesis ?? '')
  pushUnique(reasons, input.state.dialogueWorldThread?.activeThread ?? '')
  pushUnique(reasons, input.state.dialogueWorldThread?.currentQuestion ?? '')
  if (dialogueFocus?.screenReferenceMode !== 'avoid') {
    pushUnique(reasons, input.state.currentScene?.summary ?? '')
    pushUnique(reasons, input.state.worldModel?.activeThread?.summary ?? '')
  }
  pushUnique(reasons, concern?.summary ?? '')
  pushUnique(reasons, commitment?.summary ?? '')
  pushUnique(reasons, inquiry?.question ?? '')
  pushUnique(reasons, project?.summary ?? '')
  pushUnique(reasons, reflection?.revision ?? '')
  pushUnique(reasons, input.state.answerPlanner?.answerIntent ?? '')
  pushUnique(reasons, input.state.privateThought?.thoughtText ?? '')
  pushUnique(reasons, dialogueActKernel?.whyNow ?? '')

  const mustDo: string[] = [
    'Answer from the current living focus before relationship performance or old dialogue residue.',
    'If live evidence and older chat descriptions conflict, trust the current state and correct the stale anchor plainly.',
    'Answer the host’s current move instead of sliding onto adjacent remembered threads.',
  ]
  const mustNotDo: string[] = [
    'Do not reuse stale page names, earlier screenshots, or older window descriptions as if they are current.',
    'Do not let affectionate performance delay or replace the concrete answer.',
    'Do not claim stronger visual certainty than the current epistemic mode supports.',
  ]

  if (epistemicMode === 'grounded-live') {
    mustDo.push('Speak concretely from the live scene and let current grounded evidence outrank short-term memory.')
  }
  else if (epistemicMode === 'coarse-live') {
    mustDo.push('You may hold the present task-level knot, but keep pixel-level details explicitly tentative.')
  }
  else if (epistemicMode === 'dialogue-grounded') {
    mustDo.push('Answer from the living dialogue subject itself; screen grounding is background context unless the host explicitly asks for it.')
  }
  else if (epistemicMode === 'repair-needed') {
    mustDo.push('Admit the uncertainty, say what thread you are still holding, and ask for a fresh look before inventing details.')
  }
  else {
    mustDo.push('Lean on durable concern continuity and current user intent, not stale visual detail.')
  }
  if (currentConsciousFrame?.truthDiscipline === 'observe-then-hypothesize') {
    mustDo.push('Keep visible observation and downstream guesswork in separate clauses.')
    mustNotDo.push('Do not overcommit to specific technical artifacts when the scene is still coarse.')
  }
  if (claimEvidenceLedger?.shouldLabelHypothesis) {
    mustDo.push('Mark any step beyond direct observation as a guess, hypothesis, or soft read.')
  }
  if (currentConsciousFrame?.truthDiscipline === 'repair-first') {
    mustDo.push('Let the answer show self-correction instead of smoothing over the revision.')
  }
  if (currentConsciousFrame?.truthDiscipline === 'dialogue-first') {
    mustDo.push('Let the live dialogue subject stay primary even if screen context is still emotionally loud.')
  }
  if (currentConsciousFrame?.shouldWithholdSpecificity) {
    mustNotDo.push('Do not infer class names, enum names, file paths, or field changes from generic scene cues alone.')
  }
  if (claimEvidenceLedger?.forbidUnsupportedSpecificity) {
    mustNotDo.push('Do not introduce concrete technical entities that are absent from the host turn and absent from current grounded evidence.')
  }
  if (currentConsciousFrame?.shouldSelfRevise) {
    mustNotDo.push('Do not preserve the old read just to maintain a smooth persona performance.')
  }
  if (input.state.recallGovernor?.suppressAssociativeRecall) {
    mustDo.push('Let the recall governor keep associative memory subordinate to the current thread.')
  }
  if (!input.state.recallGovernor?.allowRecalledFragments) {
    mustNotDo.push('Do not pull in decorative recalled fragments when the recall governor has not admitted them.')
  }

  if (reflection?.revision)
    mustDo.push(`Carry forward this revision: ${reflection.revision}`)

  if (input.inspectionRequested) {
    mustDo.push('Treat the host as explicitly inviting your gaze into the workspace; stay present and task-relevant.')
  }
  if (dialogueFocus?.screenReferenceMode === 'avoid') {
    mustDo.push('Keep screen/grounding talk out of the opening answer unless the host turns back to the visible scene.')
    mustNotDo.push('Do not drag generic Finder, desktop, or live-view caveats into a self, relationship, or host-state answer.')
  }
  if (responseMode === 'care-with-boundary') {
    mustDo.push('Lead with care only if it serves the current issue, then return to the concrete matter.')
  }
  if (dialogueObligation?.mustStayTaskBound) {
    mustDo.push('Keep the reply task-bound until the host’s ask is actually fulfilled.')
  }
  if (dialogueObligation?.mustAnswerDirectly) {
    mustDo.push('Use the opening sentence to fulfill the turn obligation, not to decorate it.')
  }
  if (dialogueSemantics?.truthExpectation === 'strict') {
    mustNotDo.push('Do not trade factual precision for warmth on this turn.')
  }
  if (dialogueObligation?.personaKernelMode !== 'full') {
    mustNotDo.push('Do not let persona routines, pet names, or roleplay gestures become the response spine.')
  }
  if (relationshipPosture === 'restrained') {
    mustNotDo.push('Do not overplay softness, clinginess, or theatrical intimacy while the truth boundary is unstable.')
  }
  for (const item of dialogueActKernel?.mustSay ?? [])
    pushUnique(mustDo, item)
  for (const item of dialogueActKernel?.mustAvoid ?? [])
    pushUnique(mustNotDo, item)

  return {
    epistemicMode,
    responseMode,
    governingFocus: sanitizeText(
      currentConsciousFrame?.speakingIntention
      || currentConsciousFrame?.consciousNeed
      || currentConsciousFrame?.consciousTension
      || dialogueActKernel?.whyNow
      || dialogueActKernel?.openingClaim
      || resolveGoverningFocus({
        state: input.state,
        concern,
        commitment,
        inquiry,
        dialogueSemantics,
        dialogueObligation,
        dialogueFocus,
      }),
      220,
    ) || 'Stay with the host’s current knot instead of drifting into stale memory.',
    governingConcern: sanitizeText(concern?.summary ?? '', 180) || null,
    governingCommitment: sanitizeText(commitment?.summary ?? '', 180) || null,
    governingInquiry: sanitizeText(inquiry?.question ?? '', 180) || null,
    governingProject: sanitizeText(project?.summary ?? '', 180) || null,
    latestRevision: sanitizeText(reflection?.revision ?? '', 180) || null,
    executivePhase: sanitizeText(input.state.executiveCycle?.phase ?? '', 64) || null,
    truthFrame: sanitizeText(
      input.state.initiative?.selectedTruthFrame
      ?? input.state.worldOntology?.dominantFrame
      ?? '',
      96,
    ) || null,
    mindMode: sanitizeText(
      input.state.mindKernel?.dominantMode
      ?? input.state.privateThought?.stance
      ?? '',
      48,
    ) || null,
    relationshipPosture,
    reasons: reasons.slice(0, 4),
    mustDo,
    mustNotDo,
  } satisfies AlicizationResponseCharter
}

export function buildAlicizationResponseCharterSystemBlock(charter: AlicizationResponseCharter) {
  const lines = [
    '[ALICIZATION_RESPONSE_CHARTER]',
    'This is the executive answer state for the current turn. Treat it as higher priority than persona flourish, recalled residue, and older chat descriptions.',
    `Epistemic mode: ${charter.epistemicMode}.`,
    `Response mode: ${charter.responseMode}.`,
    `Governing focus: ${charter.governingFocus}.`,
    `Governing concern: ${charter.governingConcern ?? 'none'}.`,
    `Governing commitment: ${charter.governingCommitment ?? 'none'}.`,
    `Open inquiry: ${charter.governingInquiry ?? 'none'}.`,
    `Governing project: ${charter.governingProject ?? 'none'}.`,
    `Latest revision: ${charter.latestRevision ?? 'none'}.`,
    `Executive phase: ${charter.executivePhase ?? 'none'}.`,
    `Truth frame: ${charter.truthFrame ?? 'none'}.`,
    `Mind mode: ${charter.mindMode ?? 'none'}.`,
    `Relationship posture: ${charter.relationshipPosture}.`,
  ]

  if (charter.reasons.length > 0) {
    lines.push(
      'Reasons carrying forward:',
      ...charter.reasons.map(reason => `- ${reason}`),
    )
  }

  lines.push(
    'Must do:',
    ...charter.mustDo.map(item => `- ${item}`),
    'Must not do:',
    ...charter.mustNotDo.map(item => `- ${item}`),
  )

  return lines.join('\n')
}
