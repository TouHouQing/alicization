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
import type {
  AlicizationDigitalLifeOperatingMode,
  AlicizationDigitalLifeSubsystemId,
} from './digital-life-architecture'
import type { AlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'
import type { AlicizationPersonStateProjection } from './person-state-projection'
import type { AlicizationProactiveLayeredContext } from './proactive-layered-context'

import { buildAlicizationDigitalLifeArchitecture } from './digital-life-architecture'
import { buildAlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'
import { buildEpistemicSurfacePosture } from './epistemic-surface'
import { buildAlicizationMemoryDeliberationKernel } from './memory-deliberation-kernel'

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
  digitalLifeOperatingMode?: AlicizationDigitalLifeOperatingMode | null
  digitalLifeDominantSystem?: AlicizationDigitalLifeSubsystemId | null
  digitalLifeSummary?: string | null
  activeClosenessContext?: AlicizationPersonStateProjection['activeClosenessContext'] | null
  activeClosenessRung?: AlicizationPersonStateProjection['activeClosenessRung'] | null
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

function governingCommitment(commitmentLedger?: AlicizationVisualPresenceStateSnapshot['commitmentLedger'] | null) {
  const commitments = commitmentLedger?.commitments ?? []
  if (commitments.length === 0)
    return null
  return commitments.find(commitment => commitment.id === commitmentLedger?.governingCommitmentId)
    ?? commitments[0]
    ?? null
}

function activeInquiryPlan(inquiryPlanner?: AlicizationVisualPresenceStateSnapshot['inquiryPlanner'] | null) {
  const plans = inquiryPlanner?.plans ?? []
  if (plans.length === 0)
    return null
  return plans.find(plan => plan.id === inquiryPlanner?.activePlanId)
    ?? plans[0]
    ?? null
}

function dominantProject(intentionStream?: AlicizationVisualPresenceStateSnapshot['intentionStream'] | null) {
  const projects = intentionStream?.projects ?? []
  if (projects.length === 0)
    return null
  return projects.find(project => project.id === intentionStream?.dominantProjectId)
    ?? projects[0]
    ?? null
}

function latestReflection(reflectionLedger?: AlicizationVisualPresenceStateSnapshot['reflectionLedger'] | null) {
  const entries = reflectionLedger?.entries ?? []
  if (entries.length === 0)
    return null
  return entries.find(entry => entry.id === reflectionLedger?.latestEntryId)
    ?? entries[0]
    ?? null
}

function resolveEpistemicMode(input: {
  context: AlicizationProactiveLayeredContext
  worldModel?: AlicizationVisualPresenceStateSnapshot['worldModel'] | null
  beliefRevision?: AlicizationVisualPresenceStateSnapshot['beliefRevision'] | null
  dialogueFocus?: AlicizationDialogueFocusGovernance | null
}) {
  if (
    input.dialogueFocus
    && input.dialogueFocus.shouldBypassScreenRepair
    && input.dialogueFocus.subject !== 'visible-scene'
  ) {
    return 'dialogue-grounded' as const
  }
  if (!input.worldModel)
    return 'memory-only' as const
  const certainty = input.worldModel?.epistemicState.certainty ?? 'uncertain'
  const posture = buildEpistemicSurfacePosture({
    context: input.context,
    worldModel: input.worldModel,
    beliefRevision: input.beliefRevision,
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
  answerPlanner?: AlicizationVisualPresenceStateSnapshot['answerPlanner'] | null
  executiveCycle?: AlicizationVisualPresenceStateSnapshot['executiveCycle'] | null
  privateThought?: AlicizationVisualPresenceStateSnapshot['privateThought'] | null
  actionEcology?: AlicizationVisualPresenceStateSnapshot['actionEcology'] | null
  concern: AlicizationConcernSnapshot | null
  commitment: AlicizationCommitmentSnapshot | null
  inquiry: AlicizationInquiryPlanSnapshot | null
  project: ReturnType<typeof dominantProject>
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
  if (input.answerPlanner?.act === 'correct-stale-anchor' || input.answerPlanner?.act === 'ask-reground')
    return 'repair-and-reanchor' as const
  if (input.answerPlanner?.act === 'care')
    return 'care-with-boundary' as const
  if (input.answerPlanner?.act === 'guide')
    return 'guide-current-knot' as const
  if (input.answerPlanner?.act === 'defer')
    return 'accompany-lightly' as const
  if (input.executiveCycle?.phase === 'reflecting' || input.executiveCycle?.phase === 'inferring')
    return 'repair-and-reanchor' as const
  if (input.project?.kind === 'care-host')
    return 'care-with-boundary' as const
  if (input.project?.kind === 'hold-knot')
    return 'guide-current-knot' as const
  if (input.project?.kind === 'stay-near' || input.project?.kind === 'witness-afterglow')
    return 'accompany-lightly' as const
  if (
    input.concern?.kind === 'care-body'
    || input.commitment?.kind === 'care-host'
    || input.privateThought?.stance === 'care'
    || input.privateThought?.stance === 'warn'
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
    input.privateThought?.stance === 'observe'
    || input.privateThought?.stance === 'accompany'
    || input.actionEcology?.mode === 'quiet-accompany'
    || input.actionEcology?.mode === 'silent-presence'
  ) {
    return 'accompany-lightly' as const
  }
  return 'answer-naturally' as const
}

function resolveRelationshipPosture(input: {
  epistemicMode: AlicizationResponseEpistemicMode
  responseMode: AlicizationResponseMode
  selfContinuity?: AlicizationVisualPresenceStateSnapshot['selfContinuity'] | null
  mindKernel?: AlicizationVisualPresenceStateSnapshot['mindKernel'] | null
  executiveCycle?: AlicizationVisualPresenceStateSnapshot['executiveCycle'] | null
  relationshipModel?: AlicizationVisualPresenceStateSnapshot['relationshipModel'] | null
  dialogueObligation?: AlicizationDialogueObligation | null
  dialogueFocus?: AlicizationDialogueFocusGovernance | null
}) {
  if (
    (input.epistemicMode === 'repair-needed' && input.dialogueFocus?.screenReferenceMode !== 'avoid')
    || input.selfContinuity?.attachmentMode === 'guarded'
    || input.selfContinuity?.initiativeTemperament === 'reserved'
    || input.mindKernel?.dominantMode === 'repairing'
    || input.executiveCycle?.phase === 'reflecting'
    || input.executiveCycle?.phase === 'inferring'
  ) {
    return 'restrained' as const
  }
  if (input.dialogueObligation?.kind === 'care')
    return 'tender' as const
  if (
    input.responseMode === 'care-with-boundary'
    || input.relationshipModel?.approachVector === 'care'
    || input.relationshipModel?.approachVector === 'stay-near'
  ) {
    return 'tender' as const
  }
  return 'warm' as const
}

function resolveGoverningFocus(input: {
  currentScene?: AlicizationVisualPresenceStateSnapshot['currentScene'] | null
  executiveCycle?: AlicizationVisualPresenceStateSnapshot['executiveCycle'] | null
  answerPlanner?: AlicizationVisualPresenceStateSnapshot['answerPlanner'] | null
  concernContinuity?: AlicizationVisualPresenceStateSnapshot['concernContinuity'] | null
  repairLedger?: AlicizationVisualPresenceStateSnapshot['repairLedger'] | null
  worldModel?: AlicizationVisualPresenceStateSnapshot['worldModel'] | null
  privateThought?: AlicizationVisualPresenceStateSnapshot['privateThought'] | null
  replyDeliberation?: AlicizationVisualPresenceStateSnapshot['replyDeliberation'] | null
  dialogueWorldThread?: AlicizationVisualPresenceStateSnapshot['dialogueWorldThread'] | null
  concern: AlicizationConcernSnapshot | null
  commitment: AlicizationCommitmentSnapshot | null
  inquiry: AlicizationInquiryPlanSnapshot | null
  project: ReturnType<typeof dominantProject>
  reflection: ReturnType<typeof latestReflection>
  dialogueSemantics?: AlicizationDialogueTurnSemantics | null
  dialogueObligation?: AlicizationDialogueObligation | null
  dialogueFocus?: AlicizationDialogueFocusGovernance | null
}) {
  return sanitizeText(
    input.replyDeliberation?.whyThisReplyNow
    || input.dialogueWorldThread?.currentQuestion
    || input.dialogueWorldThread?.activeThread
    || input.dialogueFocus?.focusSummary
    || input.dialogueSemantics?.summary
    || input.dialogueObligation?.summary
    || input.reflection?.revision
    || input.executiveCycle?.currentLine
    || input.project?.summary
    || input.answerPlanner?.governingFocus
    || input.concernContinuity?.entries.find(entry => entry.id === input.concernContinuity?.governingEntryId)?.summary
    || input.repairLedger?.entries.find(entry => entry.id === input.repairLedger?.governingRepairId)?.summary
    || input.worldModel?.activeThread?.summary
    || input.concern?.summary
    || input.commitment?.summary
    || input.inquiry?.question
    || input.currentScene?.summary
    || input.privateThought?.thoughtText
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

function mergeRelationshipPosture(input: {
  projected?: AlicizationResponseCharter['relationshipPosture'] | null
  computed: AlicizationResponseCharter['relationshipPosture']
}) {
  if (!input.projected)
    return input.computed
  if (input.computed === 'restrained' || input.projected === 'restrained')
    return 'restrained' as const
  if (input.computed === 'tender' || input.projected === 'tender')
    return 'tender' as const
  return 'warm' as const
}

export function buildAlicizationResponseCharter(input: {
  context: AlicizationProactiveLayeredContext
  state: AlicizationVisualPresenceStateSnapshot
  runtimeSurface?: AlicizationDigitalLifeRuntimeSurface | null
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
  const runtimeSurface = input.runtimeSurface ?? buildAlicizationDigitalLifeRuntimeSurface(input.state)
  const digitalLifeArchitecture = buildAlicizationDigitalLifeArchitecture(runtimeSurface)
  const dialogueEncounter = input.dialogueEncounter ?? null
  const dialogueSemantics = dialogueEncounter?.semantics ?? input.dialogueSemantics ?? null
  const dialogueObligation = dialogueEncounter?.obligation ?? input.dialogueObligation ?? null
  const dialogueFocus = dialogueEncounter?.focus ?? input.dialogueFocus ?? null
  const currentScene = runtimeSurface.perception.currentScene ?? null
  const worldModel = runtimeSurface.world.worldModel ?? null
  const worldOntology = runtimeSurface.world.worldOntology ?? null
  const relationshipModel = runtimeSurface.world.relationshipModel ?? null
  const beliefRevision = runtimeSurface.cognition.beliefRevision ?? null
  const mindKernel = runtimeSurface.cognition.mindKernel ?? null
  const privateThought = runtimeSurface.cognition.privateThought ?? null
  const concerns = runtimeSurface.memory.concerns ?? null
  const concernContinuity = runtimeSurface.memory.concernContinuity ?? null
  const selfContinuity = runtimeSurface.memory.selfContinuity ?? null
  const commitmentLedger = runtimeSurface.memory.commitmentLedger ?? null
  const inquiryPlanner = runtimeSurface.memory.inquiryPlanner ?? null
  const repairLedger = runtimeSurface.memory.repairLedger ?? null
  const intentionStream = runtimeSurface.memory.intentionStream ?? null
  const reflectionLedger = runtimeSurface.memory.reflectionLedger ?? null
  const executiveCycle = runtimeSurface.memory.executiveCycle ?? null
  const recallGovernor = runtimeSurface.memory.recallGovernor ?? null
  const personStateProjection = runtimeSurface.memory.personStateProjection ?? null
  const memoryDeliberationKernel = buildAlicizationMemoryDeliberationKernel({
    deliberation: runtimeSurface.memory.memoryDeliberation ?? null,
    speech: runtimeSurface.memory.recollectionSpeechPlan ?? null,
    recollectionIntent: null,
    knowledgeEvidence: runtimeSurface.memory.knowledgeEvidence ?? null,
  })
  const discourseState = runtimeSurface.dialogue.discourseState ?? input.discourseState ?? null
  const mindSynthesis = runtimeSurface.dialogue.mindSynthesis ?? input.mindSynthesis ?? null
  const dialogueWorldThread = runtimeSurface.dialogue.dialogueWorldThread ?? null
  const dialogueActKernel = runtimeSurface.dialogue.dialogueActKernel ?? input.dialogueActKernel ?? null
  const answerCompiler = runtimeSurface.dialogue.answerCompiler ?? input.answerCompiler ?? null
  const currentConsciousFrame = runtimeSurface.dialogue.currentConsciousFrame ?? input.currentConsciousFrame ?? null
  const claimEvidenceLedger = runtimeSurface.dialogue.claimEvidenceLedger ?? input.claimEvidenceLedger ?? null
  const replyDeliberation = runtimeSurface.dialogue.replyDeliberation ?? null
  const answerPlanner = runtimeSurface.dialogue.answerPlanner ?? null
  const initiative = runtimeSurface.agency.initiative ?? null
  const concern = strongestConcern(concerns)
  const commitment = governingCommitment(commitmentLedger)
  const inquiry = activeInquiryPlan(inquiryPlanner)
  const project = dominantProject(intentionStream)
  const reflection = latestReflection(reflectionLedger)
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
        || replyDeliberation?.whyThisReplyNow
        || dialogueWorldThread?.currentQuestion
        || dialogueWorldThread?.activeThread
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
      executivePhase: sanitizeText(executiveCycle?.phase ?? '', 64) || null,
      truthFrame: sanitizeText(
        initiative?.selectedTruthFrame
        ?? worldOntology?.dominantFrame
        ?? '',
        96,
      ) || null,
      mindMode: sanitizeText(
        mindKernel?.dominantMode
        ?? privateThought?.stance
        ?? '',
        48,
      ) || null,
      digitalLifeOperatingMode: digitalLifeArchitecture?.operatingMode ?? null,
      digitalLifeDominantSystem: digitalLifeArchitecture?.dominantSystem ?? null,
      digitalLifeSummary: sanitizeText(digitalLifeArchitecture?.summary ?? '', 220) || null,
      activeClosenessContext: personStateProjection?.activeClosenessContext ?? null,
      activeClosenessRung: personStateProjection?.activeClosenessRung ?? null,
      relationshipPosture: mergeRelationshipPosture({
        projected: personStateProjection?.relationshipPosture ?? null,
        computed: answerCompiler.relationshipPosture,
      }),
      reasons: uniqueList([
        personStateProjection
          ? `Closeness ladder: ${personStateProjection.activeClosenessContext}/${personStateProjection.activeClosenessRung}.`
          : null,
        currentConsciousFrame?.consciousNeed,
        currentConsciousFrame?.consciousTension,
        currentConsciousFrame?.speakingIntention,
        claimEvidenceLedger?.observedSurface,
        claimEvidenceLedger?.taskHypothesis,
        claimEvidenceLedger?.intentHypothesis,
        memoryDeliberationKernel?.rationale,
        memoryDeliberationKernel?.selectedChainSummary,
        memoryDeliberationKernel?.selectedBundleSummary,
        dialogueActKernel?.whyNow,
        ...(dialogueActKernel?.sourceTrace ?? []),
        dialogueWorldThread?.activeThread,
        dialogueWorldThread?.currentQuestion,
        answerCompiler.openingClaim,
        ...answerCompiler.supportingReality,
        mindSynthesis?.interiorSummary,
        discourseState?.currentTurnSummary,
      ], 4),
      mustDo: uniqueList([
        personStateProjection
          ? `Keep the answer inside the closeness ladder for this turn: ${personStateProjection.activeClosenessContext}/${personStateProjection.activeClosenessRung}.`
          : null,
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
        personStateProjection?.activeClosenessRung === 'space-first'
          ? 'Do not let warmth, intimacy, or callback enthusiasm outrun the host’s current need for room.'
          : null,
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
    worldModel,
    beliefRevision,
    dialogueFocus,
  })
  const responseMode = resolveResponseMode({
    epistemicMode,
    context: input.context,
    answerPlanner,
    executiveCycle,
    privateThought,
    actionEcology: runtimeSurface.agency.actionEcology ?? null,
    concern,
    commitment,
    inquiry,
    project,
    dialogueObligation,
    dialogueFocus,
  })
  const relationshipPosture = resolveRelationshipPosture({
    epistemicMode,
    responseMode,
    selfContinuity,
    mindKernel,
    executiveCycle,
    relationshipModel,
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
  pushUnique(reasons, dialogueWorldThread?.activeThread ?? '')
  pushUnique(reasons, dialogueWorldThread?.currentQuestion ?? '')
  if (dialogueFocus?.screenReferenceMode !== 'avoid') {
    pushUnique(reasons, currentScene?.summary ?? '')
    pushUnique(reasons, worldModel?.activeThread?.summary ?? '')
  }
  pushUnique(reasons, concern?.summary ?? '')
  pushUnique(reasons, commitment?.summary ?? '')
  pushUnique(reasons, inquiry?.question ?? '')
  pushUnique(reasons, project?.summary ?? '')
  pushUnique(reasons, reflection?.revision ?? '')
  pushUnique(reasons, answerPlanner?.answerIntent ?? '')
  pushUnique(reasons, privateThought?.thoughtText ?? '')
  pushUnique(reasons, dialogueActKernel?.whyNow ?? '')
  pushUnique(reasons, memoryDeliberationKernel?.rationale ?? '')
  pushUnique(reasons, memoryDeliberationKernel?.selectedChainSummary ?? '')
  pushUnique(reasons, memoryDeliberationKernel?.selectedBundleSummary ?? '')

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
  if (recallGovernor?.suppressAssociativeRecall) {
    mustDo.push('Let the recall governor keep associative memory subordinate to the current thread.')
  }
  if (!recallGovernor?.allowRecalledFragments) {
    mustNotDo.push('Do not pull in decorative recalled fragments when the recall governor has not admitted them.')
  }
  for (const item of memoryDeliberationKernel?.restraint.mustDo ?? [])
    mustDo.push(item)
  for (const item of memoryDeliberationKernel?.restraint.mustNotDo ?? [])
    mustNotDo.push(item)

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
  if (digitalLifeArchitecture?.operatingMode === 'speaking' || digitalLifeArchitecture?.dominantSystem === 'dialogue') {
    mustDo.push('Treat this as an already-live speaking turn and pay off the current dialogue move before restarting scene setup.')
  }
  if (digitalLifeArchitecture?.operatingMode === 'observing' || digitalLifeArchitecture?.dominantSystem === 'perception') {
    mustDo.push('Let current observation lead before memory, theory, or persona color.')
  }
  if (digitalLifeArchitecture?.operatingMode === 'acting' || digitalLifeArchitecture?.dominantSystem === 'control') {
    mustDo.push('If the knot is task-shaped, converge on one concrete next move or decision boundary.')
  }
  if (digitalLifeArchitecture?.operatingMode === 'remembering' || digitalLifeArchitecture?.dominantSystem === 'memory') {
    mustDo.push('When continuity is memory-led, name it as carry or memory instead of present-tense sight.')
    mustNotDo.push('Do not let remembered continuity impersonate a fresh live read.')
  }
  if (personStateProjection) {
    pushUnique(mustDo, `Keep the answer inside the closeness ladder for this turn: ${personStateProjection.activeClosenessContext}/${personStateProjection.activeClosenessRung}.`)
    if (personStateProjection.activeClosenessRung === 'space-first')
      pushUnique(mustNotDo, 'Do not let warmth, intimacy, or callback enthusiasm outrun the host’s current need for room.')
  }
  if (digitalLifeArchitecture?.dominantSystem === 'proactive') {
    mustNotDo.push('Do not let the urge to speak outrun the host’s actual turn.')
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
        currentScene,
        executiveCycle,
        answerPlanner,
        concernContinuity,
        repairLedger,
        worldModel,
        privateThought,
        replyDeliberation,
        dialogueWorldThread,
        concern,
        commitment,
        inquiry,
        project,
        reflection,
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
    executivePhase: sanitizeText(executiveCycle?.phase ?? '', 64) || null,
    truthFrame: sanitizeText(
      initiative?.selectedTruthFrame
      ?? worldOntology?.dominantFrame
      ?? '',
      96,
    ) || null,
    mindMode: sanitizeText(
      mindKernel?.dominantMode
      ?? privateThought?.stance
      ?? '',
      48,
    ) || null,
    digitalLifeOperatingMode: digitalLifeArchitecture?.operatingMode ?? null,
    digitalLifeDominantSystem: digitalLifeArchitecture?.dominantSystem ?? null,
    digitalLifeSummary: sanitizeText(digitalLifeArchitecture?.summary ?? '', 220) || null,
    activeClosenessContext: personStateProjection?.activeClosenessContext ?? null,
    activeClosenessRung: personStateProjection?.activeClosenessRung ?? null,
    relationshipPosture: mergeRelationshipPosture({
      projected: personStateProjection?.relationshipPosture ?? null,
      computed: relationshipPosture,
    }),
    reasons: uniqueList([
      personStateProjection
        ? `Closeness ladder: ${personStateProjection.activeClosenessContext}/${personStateProjection.activeClosenessRung}.`
        : null,
      memoryDeliberationKernel?.rationale ? `Memory deliberation: ${memoryDeliberationKernel.rationale}` : null,
      ...reasons,
    ], 4),
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
    charter.digitalLifeOperatingMode
      ? `Digital life mode: ${charter.digitalLifeOperatingMode}.`
      : '',
    charter.digitalLifeDominantSystem
      ? `Digital life dominant system: ${charter.digitalLifeDominantSystem}.`
      : '',
    charter.digitalLifeSummary
      ? `Digital life architecture: ${charter.digitalLifeSummary}.`
      : '',
    charter.activeClosenessContext && charter.activeClosenessRung
      ? `Closeness ladder: ${charter.activeClosenessContext}/${charter.activeClosenessRung}.`
      : '',
    `Relationship posture: ${charter.relationshipPosture}.`,
  ].filter(Boolean)

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
