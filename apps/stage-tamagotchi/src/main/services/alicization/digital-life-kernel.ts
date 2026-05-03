import type {
  AlicizationHostPersonModelSnapshot,
  AlicizationMemoryDeliberation,
  AlicizationRecollectionPlan,
  AlicizationRecollectionSpeechPlan,
  AlicizationSelfEvolutionKernelSnapshot,
  AlicizationVisualPresenceStateSnapshot,
} from '../../../shared/eventa'
import type { AlicizationDigitalLifeArchitectureSnapshot } from './digital-life-architecture'
import type {
  AlicizationPersonStateProjection,
} from './person-state-projection'
import type { AlicizationPersonalityContinuityStateSnapshot } from './personality-continuity-state'
import type { AlicizationContinuityDeliberation } from './continuity-deliberation'

import { buildAlicizationDigitalLifeArchitecture } from './digital-life-architecture'
import { buildMindEcology } from './mind-ecology'
import { buildAlicizationPersonStateProjection } from './person-state-projection'
import { deriveAlicizationContinuityDeliberationFromSurface } from './continuity-deliberation'
import { updateVisualPresenceState } from './visual-episodic-memory'

export interface AlicizationDigitalLifeMindStateCommitShape {
  mindTurnFrame?: AlicizationVisualPresenceStateSnapshot['mindTurnFrame']
  worldModel?: AlicizationVisualPresenceStateSnapshot['worldModel']
  worldOntology?: AlicizationVisualPresenceStateSnapshot['worldOntology']
  beliefLedger?: AlicizationVisualPresenceStateSnapshot['beliefLedger']
  beliefRevision?: AlicizationVisualPresenceStateSnapshot['beliefRevision']
  hypothesisGraph?: AlicizationVisualPresenceStateSnapshot['hypothesisGraph']
  entityWorld?: AlicizationVisualPresenceStateSnapshot['entityWorld']
  livingWorldState?: AlicizationVisualPresenceStateSnapshot['livingWorldState']
  subjectiveInference?: AlicizationVisualPresenceStateSnapshot['subjectiveInference']
  appraisal?: AlicizationVisualPresenceStateSnapshot['appraisal']
  goalStack?: AlicizationVisualPresenceStateSnapshot['goalStack']
  concerns?: AlicizationVisualPresenceStateSnapshot['concerns']
  concernContinuity?: AlicizationVisualPresenceStateSnapshot['concernContinuity']
  relationshipModel?: AlicizationVisualPresenceStateSnapshot['relationshipModel']
  longHorizonMemory?: AlicizationVisualPresenceStateSnapshot['longHorizonMemory']
  selfContinuity?: AlicizationVisualPresenceStateSnapshot['selfContinuity']
  autobiographicalSelf?: AlicizationVisualPresenceStateSnapshot['autobiographicalSelf']
  motiveEngine?: AlicizationVisualPresenceStateSnapshot['motiveEngine']
  habitPolicy?: AlicizationVisualPresenceStateSnapshot['habitPolicy']
  selfState?: AlicizationVisualPresenceStateSnapshot['selfState']
  selfGovernor?: AlicizationVisualPresenceStateSnapshot['selfGovernor']
  inquiryLoop?: AlicizationVisualPresenceStateSnapshot['inquiryLoop']
  deliberationState?: AlicizationVisualPresenceStateSnapshot['deliberationState']
  threadRuntime?: AlicizationVisualPresenceStateSnapshot['threadRuntime']
  commitmentLedger?: AlicizationVisualPresenceStateSnapshot['commitmentLedger']
  inquiryPlanner?: AlicizationVisualPresenceStateSnapshot['inquiryPlanner']
  repairLedger?: AlicizationVisualPresenceStateSnapshot['repairLedger']
  intentionStream?: AlicizationVisualPresenceStateSnapshot['intentionStream']
  reflectionLedger?: AlicizationVisualPresenceStateSnapshot['reflectionLedger']
  executiveCycle?: AlicizationVisualPresenceStateSnapshot['executiveCycle']
  mindDynamics?: AlicizationVisualPresenceStateSnapshot['mindDynamics']
  mindKernel?: AlicizationVisualPresenceStateSnapshot['mindKernel']
  thoughtThreads?: AlicizationVisualPresenceStateSnapshot['thoughtThreads']
  counterfactualDeliberation?: AlicizationVisualPresenceStateSnapshot['counterfactualDeliberation']
  actionEcology?: AlicizationVisualPresenceStateSnapshot['actionEcology']
  initiativeArbitration?: AlicizationVisualPresenceStateSnapshot['initiativeArbitration']
  initiative?: AlicizationVisualPresenceStateSnapshot['initiative']
  autonomy?: AlicizationVisualPresenceStateSnapshot['autonomy']
  desireMemory?: AlicizationVisualPresenceStateSnapshot['desireMemory']
  discourseState?: AlicizationVisualPresenceStateSnapshot['discourseState']
  dialogueEncounter?: AlicizationVisualPresenceStateSnapshot['dialogueEncounter']
  mindSynthesis?: AlicizationVisualPresenceStateSnapshot['mindSynthesis']
  conversationState?: AlicizationVisualPresenceStateSnapshot['conversationState']
  dialogueWorldThread?: AlicizationVisualPresenceStateSnapshot['dialogueWorldThread']
  dialogueActKernel?: AlicizationVisualPresenceStateSnapshot['dialogueActKernel']
  answerCompiler?: AlicizationVisualPresenceStateSnapshot['answerCompiler']
  currentConsciousFrame?: AlicizationVisualPresenceStateSnapshot['currentConsciousFrame']
  claimEvidenceLedger?: AlicizationVisualPresenceStateSnapshot['claimEvidenceLedger']
  replyDeliberation?: AlicizationVisualPresenceStateSnapshot['replyDeliberation']
  recallGovernor?: AlicizationVisualPresenceStateSnapshot['recallGovernor']
  answerPlanner?: AlicizationVisualPresenceStateSnapshot['answerPlanner']
  privateThought: AlicizationVisualPresenceStateSnapshot['privateThought']
}

export interface CommitAlicizationDigitalLifeMindStateInput<TMindState extends AlicizationDigitalLifeMindStateCommitShape> {
  now: number
  previousState: AlicizationVisualPresenceStateSnapshot
  watchMode: AlicizationVisualPresenceStateSnapshot['watchMode']
  scene: AlicizationVisualPresenceStateSnapshot['currentScene']
  attention: AlicizationVisualPresenceStateSnapshot['attention']
  mindState: TMindState
  captureState: AlicizationVisualPresenceStateSnapshot['captureState']
  durabilityPulse: AlicizationVisualPresenceStateSnapshot['durabilityPulse']
  recentTransition: AlicizationVisualPresenceStateSnapshot['recentTransition']
  nextSuggestedProbeMs: number
}

export interface AlicizationDigitalLifeRuntimeSurface {
  version: 'digital-life-runtime-surface-v1'
  perception: Pick<AlicizationVisualPresenceStateSnapshot, 'watchMode' | 'currentScene' | 'attention' | 'captureState' | 'durabilityPulse' | 'recentTransition' | 'nextSuggestedProbeMs' | 'updatedAt'>
  world: Pick<AlicizationVisualPresenceStateSnapshot, 'worldModel' | 'worldOntology' | 'entityWorld' | 'livingWorldState' | 'relationshipModel'>
  cognition: Pick<AlicizationVisualPresenceStateSnapshot, 'mindTurnFrame' | 'subjectiveInference' | 'appraisal' | 'beliefLedger' | 'beliefRevision' | 'hypothesisGraph' | 'mindDynamics' | 'mindKernel' | 'privateThought'>
  memory: Pick<AlicizationVisualPresenceStateSnapshot, 'workingMemoryEpisodes' | 'goalStack' | 'concerns' | 'concernContinuity' | 'longHorizonMemory' | 'selfContinuity' | 'autobiographicalSelf' | 'threadRuntime' | 'commitmentLedger' | 'inquiryPlanner' | 'repairLedger' | 'intentionStream' | 'reflectionLedger' | 'executiveCycle' | 'thoughtThreads' | 'desireMemory' | 'recallGovernor'> & {
    motiveEngine?: AlicizationVisualPresenceStateSnapshot['motiveEngine']
    hostPersonModel?: AlicizationHostPersonModelSnapshot | null
    personalityContinuityState?: AlicizationPersonalityContinuityStateSnapshot | null
    personStateProjection?: AlicizationPersonStateProjection | null
    recollectionPlan?: AlicizationRecollectionPlan | null
    recollectionSpeechPlan?: AlicizationRecollectionSpeechPlan | null
    memoryDeliberation?: AlicizationMemoryDeliberation | null
    knowledgeEvidence?: {
      validationCount: number
      contradictionCount: number
      stronglyValidatedProcedureCount: number
      contradictionHeavyFactCount: number
    } | null
    selfEvolution?: AlicizationSelfEvolutionKernelSnapshot | null
  }
  dialogue: Pick<AlicizationVisualPresenceStateSnapshot, 'discourseState' | 'dialogueEncounter' | 'mindSynthesis' | 'conversationState' | 'dialogueWorldThread' | 'dialogueActKernel' | 'answerCompiler' | 'currentConsciousFrame' | 'claimEvidenceLedger' | 'replyDeliberation' | 'answerPlanner'>
  agency: Pick<AlicizationVisualPresenceStateSnapshot, 'selfState' | 'selfGovernor' | 'inquiryLoop' | 'deliberationState' | 'counterfactualDeliberation' | 'actionEcology' | 'initiativeArbitration' | 'initiative' | 'autonomy'> & {
    habitPolicy?: AlicizationVisualPresenceStateSnapshot['habitPolicy']
  }
}

export interface AlicizationDigitalLifeProactiveSelection {
  surface: AlicizationDigitalLifeRuntimeSurface
  privateThought: NonNullable<AlicizationDigitalLifeRuntimeSurface['cognition']['privateThought']> | null
  focusBelief: NonNullable<AlicizationDigitalLifeRuntimeSurface['cognition']['beliefLedger']>['beliefs'][number] | null
  primaryInquiry: NonNullable<AlicizationDigitalLifeRuntimeSurface['agency']['inquiryLoop']>['inquiries'][number] | null
  dominantConcern: NonNullable<AlicizationDigitalLifeRuntimeSurface['memory']['concerns']>[number] | null
  activeThread: NonNullable<AlicizationDigitalLifeRuntimeSurface['world']['worldModel']>['activeThread']
  leadingGoal: NonNullable<AlicizationDigitalLifeRuntimeSurface['memory']['goalStack']>['alicizationGoals'][number] | null
  resurfacingDesire: NonNullable<AlicizationDigitalLifeRuntimeSurface['memory']['desireMemory']>['activeDesires'][number] | null
  livingWorldObject: NonNullable<AlicizationDigitalLifeRuntimeSurface['world']['livingWorldState']>['objects'][number] | null
  governorIntention: NonNullable<AlicizationDigitalLifeRuntimeSurface['agency']['selfGovernor']>['activeIntentions'][number] | null
  thoughtThread: NonNullable<AlicizationDigitalLifeRuntimeSurface['memory']['thoughtThreads']>['threads'][number] | null
}

export interface AlicizationDigitalLifeProactivePolicySnapshot {
  architecture: AlicizationDigitalLifeArchitectureSnapshot | null
  watchMode: AlicizationDigitalLifeRuntimeSurface['perception']['watchMode']
  recentTransition: AlicizationDigitalLifeRuntimeSurface['perception']['recentTransition']
  worldModel: AlicizationDigitalLifeRuntimeSurface['world']['worldModel']
  livingWorldState: AlicizationDigitalLifeRuntimeSurface['world']['livingWorldState']
  beliefLedger: AlicizationDigitalLifeRuntimeSurface['cognition']['beliefLedger']
  beliefRevision: AlicizationDigitalLifeRuntimeSurface['cognition']['beliefRevision']
  commitmentLedger: AlicizationDigitalLifeRuntimeSurface['memory']['commitmentLedger']
  inquiryPlanner: AlicizationDigitalLifeRuntimeSurface['memory']['inquiryPlanner']
  mindKernel: AlicizationDigitalLifeRuntimeSurface['cognition']['mindKernel']
  hypothesisGraph: AlicizationDigitalLifeRuntimeSurface['cognition']['hypothesisGraph']
  privateThought: AlicizationDigitalLifeRuntimeSurface['cognition']['privateThought']
  relationshipModel: AlicizationDigitalLifeRuntimeSurface['world']['relationshipModel']
  motiveEngine: AlicizationDigitalLifeRuntimeSurface['memory']['motiveEngine']
  selfGovernor: AlicizationDigitalLifeRuntimeSurface['agency']['selfGovernor']
  habitPolicy: AlicizationDigitalLifeRuntimeSurface['agency']['habitPolicy']
  inquiryLoop: AlicizationDigitalLifeRuntimeSurface['agency']['inquiryLoop']
  deliberationState: AlicizationDigitalLifeRuntimeSurface['agency']['deliberationState']
  threadRuntime: AlicizationDigitalLifeRuntimeSurface['memory']['threadRuntime']
  thoughtThreads: AlicizationDigitalLifeRuntimeSurface['memory']['thoughtThreads']
  actionEcology: AlicizationDigitalLifeRuntimeSurface['agency']['actionEcology']
  initiative: AlicizationDigitalLifeRuntimeSurface['agency']['initiative']
  autonomy: AlicizationDigitalLifeRuntimeSurface['agency']['autonomy']
  durabilityPulse: AlicizationDigitalLifeRuntimeSurface['perception']['durabilityPulse']
  personalityContinuityState: AlicizationDigitalLifeRuntimeSurface['memory']['personalityContinuityState']
  continuityDeliberation?: AlicizationContinuityDeliberation | null
}

export interface AlicizationDigitalLifeContinuitySignal {
  kind: 'presence'
  state: 'observed'
  label: 'digital-life-line'
  summary: string
  signature: string
  createdAt: number
  metadata: {
    source: 'digital-life-runtime'
    watchMode: AlicizationDigitalLifeRuntimeSurface['perception']['watchMode']
    sceneScenario: string | null
    activeThreadId: string | null
    dominantMode: string | null
    dominantDrive: string | null
    answerIntent: string | null
    preferredPresence: string | null
  }
}

function sanitizeDigitalLifeText(raw: unknown, maxChars = 160) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function buildDigitalLifeContinuitySummary(surface: AlicizationDigitalLifeRuntimeSurface) {
  const activeThread = surface.world.worldModel?.activeThread ?? null
  const mindKernel = surface.cognition.mindKernel ?? null
  const answerPlanner = surface.dialogue.answerPlanner ?? null
  const privateThought = surface.cognition.privateThought ?? null
  const initiative = surface.agency.initiative ?? null
  const motiveEngine = surface.memory.motiveEngine ?? null
  const habitPolicy = surface.agency.habitPolicy ?? null
  const currentScene = surface.perception.currentScene ?? null

  const parts = [
    `watch=${surface.perception.watchMode}`,
    currentScene?.scenario ? `scene=${sanitizeDigitalLifeText(currentScene.scenario, 48)}` : '',
    mindKernel?.dominantMode ? `mode=${sanitizeDigitalLifeText(mindKernel.dominantMode, 48)}` : '',
    mindKernel?.dominantDrive ? `drive=${sanitizeDigitalLifeText(mindKernel.dominantDrive, 48)}` : '',
    motiveEngine?.rulingDrive ? `motive=${sanitizeDigitalLifeText(motiveEngine.rulingDrive, 48)}` : '',
    habitPolicy?.dominantMode ? `habit=${sanitizeDigitalLifeText(habitPolicy.dominantMode, 48)}` : '',
    activeThread?.title
      ? `thread=${sanitizeDigitalLifeText(activeThread.title, 72)}`
      : activeThread?.kind
        ? `thread=${sanitizeDigitalLifeText(activeThread.kind, 48)}`
        : '',
    answerPlanner?.answerIntent ? `answer=${sanitizeDigitalLifeText(answerPlanner.answerIntent, 48)}` : '',
    privateThought?.embodiedPresence
      ? `presence=${sanitizeDigitalLifeText(privateThought.embodiedPresence, 48)}`
      : initiative?.preferredPresence
        ? `presence=${sanitizeDigitalLifeText(initiative.preferredPresence, 48)}`
        : '',
  ].filter(Boolean)

  return parts.length > 1 ? parts.join(' | ') : ''
}

// Centralize how freshly composed cognition becomes the persisted digital-life
// surface so background perception and foreground dialogue cannot drift apart.
export function commitAlicizationDigitalLifeMindState<TMindState extends AlicizationDigitalLifeMindStateCommitShape>(
  input: CommitAlicizationDigitalLifeMindStateInput<TMindState>,
) {
  return updateVisualPresenceState({
    now: input.now,
    previousState: input.previousState,
    watchMode: input.watchMode,
    scene: input.scene,
    attention: input.attention,
    mindTurnFrame: input.mindState.mindTurnFrame,
    worldModel: input.mindState.worldModel,
    worldOntology: input.mindState.worldOntology,
    beliefLedger: input.mindState.beliefLedger,
    beliefRevision: input.mindState.beliefRevision,
    hypothesisGraph: input.mindState.hypothesisGraph,
    entityWorld: input.mindState.entityWorld,
    livingWorldState: input.mindState.livingWorldState,
    subjectiveInference: input.mindState.subjectiveInference,
    appraisal: input.mindState.appraisal,
    goalStack: input.mindState.goalStack,
    concerns: input.mindState.concerns,
    concernContinuity: input.mindState.concernContinuity,
    relationshipModel: input.mindState.relationshipModel,
    longHorizonMemory: input.mindState.longHorizonMemory,
    selfContinuity: input.mindState.selfContinuity,
    autobiographicalSelf: input.mindState.autobiographicalSelf,
    motiveEngine: input.mindState.motiveEngine,
    habitPolicy: input.mindState.habitPolicy,
    selfState: input.mindState.selfState,
    selfGovernor: input.mindState.selfGovernor,
    inquiryLoop: input.mindState.inquiryLoop,
    deliberationState: input.mindState.deliberationState,
    threadRuntime: input.mindState.threadRuntime,
    commitmentLedger: input.mindState.commitmentLedger,
    inquiryPlanner: input.mindState.inquiryPlanner,
    repairLedger: input.mindState.repairLedger,
    intentionStream: input.mindState.intentionStream,
    reflectionLedger: input.mindState.reflectionLedger,
    executiveCycle: input.mindState.executiveCycle,
    mindDynamics: input.mindState.mindDynamics,
    mindKernel: input.mindState.mindKernel,
    thoughtThreads: input.mindState.thoughtThreads,
    counterfactualDeliberation: input.mindState.counterfactualDeliberation,
    actionEcology: input.mindState.actionEcology,
    initiativeArbitration: input.mindState.initiativeArbitration,
    initiative: input.mindState.initiative,
    autonomy: input.mindState.autonomy,
    desireMemory: input.mindState.desireMemory,
    discourseState: input.mindState.discourseState,
    dialogueEncounter: input.mindState.dialogueEncounter,
    mindSynthesis: input.mindState.mindSynthesis,
    conversationState: input.mindState.conversationState,
    dialogueWorldThread: input.mindState.dialogueWorldThread,
    dialogueActKernel: input.mindState.dialogueActKernel,
    answerCompiler: input.mindState.answerCompiler,
    currentConsciousFrame: input.mindState.currentConsciousFrame,
    claimEvidenceLedger: input.mindState.claimEvidenceLedger,
    replyDeliberation: input.mindState.replyDeliberation,
    recallGovernor: input.mindState.recallGovernor,
    answerPlanner: input.mindState.answerPlanner,
    privateThought: input.mindState.privateThought,
    captureState: input.captureState,
    durabilityPulse: input.durabilityPulse,
    recentTransition: input.recentTransition,
    nextSuggestedProbeMs: input.nextSuggestedProbeMs,
  })
}

// Project the full presence state into stable runtime domains so prompts and
// future control loops read from one explicit digital-life surface.
export function buildAlicizationDigitalLifeRuntimeSurface(
  state: AlicizationVisualPresenceStateSnapshot,
): AlicizationDigitalLifeRuntimeSurface {
  const provisionalMindEcology = buildMindEcology({
    now: state.updatedAt,
    watchMode: state.watchMode,
    worldModel: state.worldModel ?? null,
    appraisal: state.appraisal ?? null,
    subjectiveInference: state.subjectiveInference ?? null,
    beliefRevision: state.beliefRevision ?? null,
    relationshipModel: state.relationshipModel ?? null,
    longHorizonMemory: state.longHorizonMemory ?? null,
    selfContinuity: state.selfContinuity ?? null,
    autobiographicalSelf: state.autobiographicalSelf ?? null,
    motiveEngine: state.motiveEngine ?? null,
    selfState: state.selfState ?? null,
    selfGovernor: state.selfGovernor ?? null,
    habitPolicy: state.habitPolicy ?? null,
    mindDynamics: state.mindDynamics ?? null,
    mindKernel: state.mindKernel ?? null,
    commitmentLedger: state.commitmentLedger ?? null,
    inquiryPlanner: state.inquiryPlanner ?? null,
    reflectionLedger: state.reflectionLedger ?? null,
    desireMemory: state.desireMemory ?? null,
    privateThought: state.privateThought ?? null,
    actionEcology: state.actionEcology ?? null,
    answerPlanner: state.answerPlanner ?? null,
    conversationState: state.conversationState ?? null,
  })
  const personStateProjection = buildAlicizationPersonStateProjection({
    now: state.updatedAt,
    contexts: ['general'],
    autobiographicalSelf: state.autobiographicalSelf ?? null,
    hostPersonModel: null,
    longHorizonMemory: state.longHorizonMemory ?? null,
    motiveEngine: state.motiveEngine ?? null,
    habitPolicy: state.habitPolicy ?? null,
    selfContinuity: state.selfContinuity ?? null,
    selfState: state.selfState ?? null,
    privateThought: state.privateThought ?? null,
    mindEcology: provisionalMindEcology,
  })
  const personalityContinuityState = personStateProjection.personalityContinuityState
  return {
    version: 'digital-life-runtime-surface-v1',
    perception: {
      watchMode: state.watchMode,
      currentScene: state.currentScene,
      attention: state.attention,
      captureState: state.captureState,
      durabilityPulse: state.durabilityPulse,
      recentTransition: state.recentTransition,
      nextSuggestedProbeMs: state.nextSuggestedProbeMs,
      updatedAt: state.updatedAt,
    },
    world: {
      worldModel: state.worldModel ?? null,
      worldOntology: state.worldOntology ?? null,
      entityWorld: state.entityWorld ?? null,
      livingWorldState: state.livingWorldState ?? null,
      relationshipModel: state.relationshipModel ?? null,
    },
    cognition: {
      mindTurnFrame: state.mindTurnFrame ?? null,
      subjectiveInference: state.subjectiveInference ?? null,
      appraisal: state.appraisal ?? null,
      beliefLedger: state.beliefLedger ?? null,
      beliefRevision: state.beliefRevision ?? null,
      hypothesisGraph: state.hypothesisGraph ?? null,
      mindDynamics: state.mindDynamics ?? null,
      mindKernel: state.mindKernel ?? null,
      privateThought: state.privateThought ?? null,
    },
    memory: {
      workingMemoryEpisodes: state.workingMemoryEpisodes,
      goalStack: state.goalStack ?? null,
      concerns: state.concerns,
      concernContinuity: state.concernContinuity ?? null,
      longHorizonMemory: state.longHorizonMemory ?? null,
      selfContinuity: state.selfContinuity ?? null,
      autobiographicalSelf: state.autobiographicalSelf ?? null,
      motiveEngine: state.motiveEngine ?? null,
      threadRuntime: state.threadRuntime ?? null,
      commitmentLedger: state.commitmentLedger ?? null,
      inquiryPlanner: state.inquiryPlanner ?? null,
      repairLedger: state.repairLedger ?? null,
      intentionStream: state.intentionStream ?? null,
      reflectionLedger: state.reflectionLedger ?? null,
      executiveCycle: state.executiveCycle ?? null,
      thoughtThreads: state.thoughtThreads ?? null,
      desireMemory: state.desireMemory ?? null,
      recallGovernor: state.recallGovernor ?? null,
      personalityContinuityState,
      personStateProjection,
      knowledgeEvidence: null,
      selfEvolution: null,
    },
    dialogue: {
      discourseState: state.discourseState ?? null,
      dialogueEncounter: state.dialogueEncounter ?? null,
      mindSynthesis: state.mindSynthesis ?? null,
      conversationState: state.conversationState ?? null,
      dialogueWorldThread: state.dialogueWorldThread ?? null,
      dialogueActKernel: state.dialogueActKernel ?? null,
      answerCompiler: state.answerCompiler ?? null,
      currentConsciousFrame: state.currentConsciousFrame ?? null,
      claimEvidenceLedger: state.claimEvidenceLedger ?? null,
      replyDeliberation: state.replyDeliberation ?? null,
      answerPlanner: state.answerPlanner ?? null,
    },
    agency: {
      selfState: state.selfState ?? null,
      selfGovernor: state.selfGovernor ?? null,
      habitPolicy: state.habitPolicy ?? null,
      inquiryLoop: state.inquiryLoop ?? null,
      deliberationState: state.deliberationState ?? null,
      counterfactualDeliberation: state.counterfactualDeliberation ?? null,
      actionEcology: state.actionEcology ?? null,
      initiativeArbitration: state.initiativeArbitration ?? null,
      initiative: state.initiative ?? null,
      autonomy: state.autonomy ?? null,
    },
  }
}

export function buildAlicizationDigitalLifeContinuitySignal(
  surface: AlicizationDigitalLifeRuntimeSurface | null | undefined,
): AlicizationDigitalLifeContinuitySignal | null {
  if (!surface)
    return null

  const summary = buildDigitalLifeContinuitySummary(surface)
  if (!summary)
    return null

  const activeThread = surface.world.worldModel?.activeThread ?? null
  const mindKernel = surface.cognition.mindKernel ?? null
  const answerPlanner = surface.dialogue.answerPlanner ?? null
  const privateThought = surface.cognition.privateThought ?? null
  const initiative = surface.agency.initiative ?? null
  const currentScene = surface.perception.currentScene ?? null

  return {
    kind: 'presence',
    state: 'observed',
    label: 'digital-life-line',
    summary,
    signature: JSON.stringify([
      surface.version,
      surface.perception.watchMode,
      sanitizeDigitalLifeText(currentScene?.scenario ?? '', 48) || null,
      sanitizeDigitalLifeText(currentScene?.summary ?? '', 96) || null,
      sanitizeDigitalLifeText(activeThread?.id ?? '', 96) || null,
      sanitizeDigitalLifeText(activeThread?.title ?? '', 96) || null,
      sanitizeDigitalLifeText(mindKernel?.dominantMode ?? '', 48) || null,
      sanitizeDigitalLifeText(mindKernel?.dominantDrive ?? '', 48) || null,
      sanitizeDigitalLifeText(answerPlanner?.answerIntent ?? '', 48) || null,
      sanitizeDigitalLifeText(privateThought?.embodiedPresence ?? initiative?.preferredPresence ?? '', 48) || null,
      sanitizeDigitalLifeText(initiative?.selectedAction ?? '', 48) || null,
    ]),
    createdAt: surface.perception.updatedAt,
    metadata: {
      source: 'digital-life-runtime',
      watchMode: surface.perception.watchMode,
      sceneScenario: sanitizeDigitalLifeText(currentScene?.scenario ?? '', 48) || null,
      activeThreadId: sanitizeDigitalLifeText(activeThread?.id ?? '', 96) || null,
      dominantMode: sanitizeDigitalLifeText(mindKernel?.dominantMode ?? '', 48) || null,
      dominantDrive: sanitizeDigitalLifeText(mindKernel?.dominantDrive ?? '', 48) || null,
      answerIntent: sanitizeDigitalLifeText(answerPlanner?.answerIntent ?? '', 48) || null,
      preferredPresence: sanitizeDigitalLifeText(privateThought?.embodiedPresence ?? initiative?.preferredPresence ?? '', 48) || null,
    },
  }
}

export function buildAlicizationDigitalLifeProactiveSelection(
  surface: AlicizationDigitalLifeRuntimeSurface,
): AlicizationDigitalLifeProactiveSelection {
  const privateThought = surface.cognition.privateThought ?? null
  const focusBelief = surface.cognition.beliefLedger?.beliefs.find(belief => belief.id === surface.cognition.beliefLedger?.focusBeliefId)
    ?? null
  const primaryInquiry = surface.agency.inquiryLoop?.inquiries.find(inquiry => inquiry.id === surface.agency.inquiryLoop?.primaryInquiryId)
    ?? null
  const dominantConcern = (surface.memory.concerns ?? [])[0] ?? null
  const activeThread = surface.world.worldModel?.activeThread ?? null
  const leadingGoal = surface.memory.goalStack?.alicizationGoals.find(goal => goal.id === surface.memory.goalStack?.leadingAlicizationGoalId)
    ?? surface.memory.goalStack?.alicizationGoals[0]
    ?? null
  const resurfacingDesire = surface.memory.desireMemory?.activeDesires.find(desire => desire.id === surface.memory.desireMemory?.resurfacingDesireId)
    ?? null
  const livingWorldObject = surface.world.livingWorldState?.objects.find(object =>
    object.id === (privateThought?.livingWorldObjectId ?? surface.world.livingWorldState?.focusObjectId ?? ''),
  ) ?? surface.world.livingWorldState?.objects[0]
  ?? null
  const governorIntention = surface.agency.selfGovernor?.activeIntentions.find(intention =>
    intention.id === (privateThought?.governorIntentionId ?? surface.agency.selfGovernor?.dominantIntentionId ?? ''),
  ) ?? surface.agency.selfGovernor?.activeIntentions[0]
  ?? null
  const thoughtThread = surface.memory.thoughtThreads?.threads.find(thread =>
    thread.id === (privateThought?.selectedThoughtThreadId ?? surface.memory.thoughtThreads?.foregroundThreadId ?? ''),
  ) ?? surface.memory.thoughtThreads?.threads[0]
  ?? null

  return {
    surface,
    privateThought,
    focusBelief,
    primaryInquiry,
    dominantConcern,
    activeThread,
    leadingGoal,
    resurfacingDesire,
    livingWorldObject,
    governorIntention,
    thoughtThread,
  }
}

export function buildAlicizationDigitalLifeProactivePolicySnapshot(
  surface: AlicizationDigitalLifeRuntimeSurface,
): AlicizationDigitalLifeProactivePolicySnapshot {
  return {
    architecture: buildAlicizationDigitalLifeArchitecture(surface),
    watchMode: surface.perception.watchMode,
    recentTransition: surface.perception.recentTransition,
    worldModel: surface.world.worldModel,
    livingWorldState: surface.world.livingWorldState,
    beliefLedger: surface.cognition.beliefLedger,
    beliefRevision: surface.cognition.beliefRevision,
    commitmentLedger: surface.memory.commitmentLedger,
    inquiryPlanner: surface.memory.inquiryPlanner,
    mindKernel: surface.cognition.mindKernel,
    hypothesisGraph: surface.cognition.hypothesisGraph,
    privateThought: surface.cognition.privateThought,
    relationshipModel: surface.world.relationshipModel,
    motiveEngine: surface.memory.motiveEngine ?? null,
    selfGovernor: surface.agency.selfGovernor,
    habitPolicy: surface.agency.habitPolicy ?? null,
    inquiryLoop: surface.agency.inquiryLoop,
    deliberationState: surface.agency.deliberationState,
    threadRuntime: surface.memory.threadRuntime,
    thoughtThreads: surface.memory.thoughtThreads,
    actionEcology: surface.agency.actionEcology,
    initiative: surface.agency.initiative,
    autonomy: surface.agency.autonomy ?? null,
    durabilityPulse: surface.perception.durabilityPulse,
    personalityContinuityState: surface.memory.personalityContinuityState ?? null,
    continuityDeliberation: deriveAlicizationContinuityDeliberationFromSurface(surface),
  }
}
