import type { AlicizationMemoryResolutionLedger, AlicizationOrganicMemoryStageReplay } from '@proj-alicization/stage-shared'

import type {
  AlicizationAffectiveResidueMemorySnapshot,
  AlicizationDerivedMindStateBundle,
  AlicizationDigitalLifeSpineMemoryClosureTrace,
  AlicizationHostPersonModelSnapshot,
  AlicizationMemoryDeliberation,
  AlicizationRecollectionPlan,
  AlicizationRecollectionSpeechPlan,
  AlicizationSelfEvolutionKernelSnapshot,
  AlicizationVisualPresenceStateSnapshot,
} from '../../../shared/eventa'
import type { AlicizationContinuityDeliberation } from './continuity-deliberation'
import type { AlicizationDialogueSessionMirror } from './dialogue-session-manager'
import type { AlicizationDigitalLifeArchitectureSnapshot } from './digital-life-architecture'
import type { AlicizationMemoryTuningAdvice } from './memory-tuning-advice'
import type { AlicizationPersonMemoryCapsule } from './person-memory-capsule'
import type {
  AlicizationPersonStateProjection,
} from './person-state-projection'
import type { AlicizationPersonalityContinuityStateSnapshot } from './personality-continuity-state'
import type { AlicizationResponseCharter } from './response-charter'

import { deriveAlicizationContinuityDeliberationFromSurface } from './continuity-deliberation'
import { buildAlicizationDigitalLifeArchitecture } from './digital-life-architecture'
import { buildMindEcology } from './mind-ecology'
import { buildAlicizationPersonStateProjection } from './person-state-projection'
import { mergePreferredSelfContinuityAuthority, resolvePreferredPersonStateProjection } from './person-state-projection-resolution'
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
  selfEvolution?: AlicizationVisualPresenceStateSnapshot['selfEvolution']
  emotionalKernel?: AlicizationVisualPresenceStateSnapshot['emotionalKernel']
  learningExecutionState?: AlicizationVisualPresenceStateSnapshot['learningExecutionState']
  derivedMindStateBundle?: AlicizationDerivedMindStateBundle | null
  privateThought: AlicizationVisualPresenceStateSnapshot['privateThought']
}

export interface CommitAlicizationDigitalLifeMindStateInput<TMindState extends AlicizationDigitalLifeMindStateCommitShape> {
  now: number
  previousState: AlicizationVisualPresenceStateSnapshot
  watchMode: AlicizationVisualPresenceStateSnapshot['watchMode']
  scene: AlicizationVisualPresenceStateSnapshot['currentScene']
  attention: AlicizationVisualPresenceStateSnapshot['attention']
  mindState: TMindState
  captureState?: AlicizationVisualPresenceStateSnapshot['captureState']
  durabilityPulse?: AlicizationVisualPresenceStateSnapshot['durabilityPulse']
  recentTransition?: AlicizationVisualPresenceStateSnapshot['recentTransition']
  nextSuggestedProbeMs?: number
}

export interface AlicizationDigitalLifeRuntimeRawCarry extends Partial<AlicizationVisualPresenceStateSnapshot> {
  projectState?: AlicizationVisualPresenceStateSnapshot['projectState'] | null
  runtime?: AlicizationVisualPresenceStateSnapshot['runtime'] | null
  runtimeDigest?: AlicizationVisualPresenceStateSnapshot['runtimeDigest'] | null
  personStateProjection?: AlicizationPersonStateProjection | null
}

export interface AlicizationDigitalLifeRuntimeSurface {
  version: 'digital-life-runtime-surface-v1'
  raw?: AlicizationDigitalLifeRuntimeRawCarry | null
  perception: Pick<AlicizationVisualPresenceStateSnapshot, 'watchMode' | 'currentScene' | 'attention' | 'captureState' | 'durabilityPulse' | 'recentTransition' | 'nextSuggestedProbeMs' | 'updatedAt'> & Pick<Partial<AlicizationVisualPresenceStateSnapshot>, 'currentBodyState' | 'continuityMode' | 'quietLineMs' | 'currentInwardPreoccupation'>
  world: Pick<AlicizationVisualPresenceStateSnapshot, 'worldModel' | 'worldOntology' | 'entityWorld' | 'livingWorldState' | 'relationshipModel'>
  cognition: Pick<AlicizationVisualPresenceStateSnapshot, 'mindTurnFrame' | 'subjectiveInference' | 'appraisal' | 'beliefLedger' | 'beliefRevision' | 'hypothesisGraph' | 'mindDynamics' | 'mindKernel' | 'privateThought'> & {
    runtimeDigest?: AlicizationVisualPresenceStateSnapshot['runtimeDigest'] | null
  }
  memory: Pick<AlicizationVisualPresenceStateSnapshot, 'workingMemoryEpisodes' | 'goalStack' | 'concerns' | 'concernContinuity' | 'longHorizonMemory' | 'selfContinuity' | 'autobiographicalSelf' | 'threadRuntime' | 'commitmentLedger' | 'inquiryPlanner' | 'repairLedger' | 'intentionStream' | 'reflectionLedger' | 'executiveCycle' | 'thoughtThreads' | 'desireMemory' | 'recallGovernor'> & {
    motiveEngine?: AlicizationVisualPresenceStateSnapshot['motiveEngine']
    emotionalKernel?: AlicizationVisualPresenceStateSnapshot['emotionalKernel']
    hostPersonModel?: AlicizationHostPersonModelSnapshot | null
    personalityContinuityState?: AlicizationPersonalityContinuityStateSnapshot | null
    personStateProjection?: AlicizationPersonStateProjection | null
    recollectionPlan?: AlicizationRecollectionPlan | null
    recollectionSpeechPlan?: AlicizationRecollectionSpeechPlan | null
    memoryDeliberation?: AlicizationMemoryDeliberation | null
    memoryTuningAdvice?: AlicizationMemoryTuningAdvice | null
    knowledgeEvidence?: {
      validationCount: number
      contradictionCount: number
      stronglyValidatedProcedureCount: number
      contradictionHeavyFactCount: number
    } | null
    selfEvolution?: AlicizationSelfEvolutionKernelSnapshot | null
    learningExecutionState?: AlicizationVisualPresenceStateSnapshot['learningExecutionState'] | null
    affectiveResidue?: AlicizationAffectiveResidueMemorySnapshot | null
    derivedMindStateBundle?: AlicizationDerivedMindStateBundle | null
    memoryStageReplay?: AlicizationOrganicMemoryStageReplay | null
    memoryResolutionLedger?: AlicizationMemoryResolutionLedger | null
    memoryClosureTrace?: AlicizationDigitalLifeSpineMemoryClosureTrace | null
    personMemoryCapsule?: AlicizationPersonMemoryCapsule | null
  }
  dialogue: Pick<AlicizationVisualPresenceStateSnapshot, 'discourseState' | 'dialogueEncounter' | 'mindSynthesis' | 'conversationState' | 'dialogueWorldThread' | 'dialogueActKernel' | 'answerCompiler' | 'currentConsciousFrame' | 'claimEvidenceLedger' | 'replyDeliberation' | 'answerPlanner'> & {
    personStateProjection?: AlicizationPersonStateProjection | null
    sessionMirror?: AlicizationDialogueSessionMirror | null
    responseCharter?: AlicizationResponseCharter | null
    runtimeDigest?: AlicizationVisualPresenceStateSnapshot['runtimeDigest'] | null
  }
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
  emotionalKernel: AlicizationDigitalLifeRuntimeSurface['memory']['emotionalKernel']
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
  longHorizonMemory: AlicizationDigitalLifeRuntimeSurface['memory']['longHorizonMemory']
  autobiographicalSelf: AlicizationDigitalLifeRuntimeSurface['memory']['autobiographicalSelf']
  durabilityPulse: AlicizationDigitalLifeRuntimeSurface['perception']['durabilityPulse']
  personalityContinuityState: AlicizationDigitalLifeRuntimeSurface['memory']['personalityContinuityState']
  selfEvolution: AlicizationDigitalLifeRuntimeSurface['memory']['selfEvolution']
  activeContinuityGovernance?: AlicizationDigitalLifeRuntimeSurface['memory']['derivedMindStateBundle'] extends infer T
    ? T extends { activeContinuityGovernance?: infer G }
      ? G | null
      : null
    : null
  learningExecutionState: AlicizationDigitalLifeRuntimeSurface['memory']['learningExecutionState']
  affectiveResidue?: AlicizationAffectiveResidueMemorySnapshot | null
  continuityDeliberation?: AlicizationContinuityDeliberation | null
  memoryClosureTrace?: AlicizationDigitalLifeRuntimeSurface['memory']['memoryClosureTrace'] | null
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

function asArray<T>(value: T[] | null | undefined) {
  return Array.isArray(value) ? value : []
}

interface RuntimeSurfaceMemoryClosureTraceCarry {
  memoryClosureTrace?: AlicizationDigitalLifeSpineMemoryClosureTrace | null
  runtime?: {
    memoryClosureTrace?: AlicizationDigitalLifeSpineMemoryClosureTrace | null
  } | null
  runtimeDigest?: {
    memory?: {
      memoryClosureTrace?: AlicizationDigitalLifeSpineMemoryClosureTrace | null
    } | null
  } | null
}

type VisualPresenceStateWithMemoryClosureTrace = AlicizationVisualPresenceStateSnapshot & RuntimeSurfaceMemoryClosureTraceCarry & {
  raw?: (AlicizationVisualPresenceStateSnapshot['raw'] & RuntimeSurfaceMemoryClosureTraceCarry) | null
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

function normalizeSparseDigitalLifeRuntimeSurface(
  surface: AlicizationDigitalLifeRuntimeSurface,
): AlicizationDigitalLifeRuntimeSurface {
  return {
    ...surface,
    perception: (surface.perception ?? {}) as AlicizationDigitalLifeRuntimeSurface['perception'],
    world: (surface.world ?? {}) as AlicizationDigitalLifeRuntimeSurface['world'],
    cognition: (surface.cognition ?? {}) as AlicizationDigitalLifeRuntimeSurface['cognition'],
    memory: (surface.memory ?? {}) as AlicizationDigitalLifeRuntimeSurface['memory'],
    dialogue: (surface.dialogue ?? {}) as AlicizationDigitalLifeRuntimeSurface['dialogue'],
    agency: (surface.agency ?? {}) as AlicizationDigitalLifeRuntimeSurface['agency'],
  }
}

// Centralize how freshly composed cognition becomes the persisted digital-life
// surface so background perception and foreground dialogue cannot drift apart.
export function commitAlicizationDigitalLifeMindState<TMindState extends AlicizationDigitalLifeMindStateCommitShape>(
  input: CommitAlicizationDigitalLifeMindStateInput<TMindState>,
) {
  const provisionalMindEcology = buildMindEcology({
    now: input.now,
    watchMode: input.watchMode,
    worldModel: input.mindState.worldModel ?? input.previousState.worldModel ?? null,
    appraisal: input.mindState.appraisal ?? null,
    subjectiveInference: input.mindState.subjectiveInference ?? null,
    beliefRevision: input.mindState.beliefRevision ?? null,
    relationshipModel: input.mindState.relationshipModel ?? input.previousState.relationshipModel ?? null,
    longHorizonMemory: input.mindState.longHorizonMemory ?? input.previousState.longHorizonMemory ?? null,
    selfContinuity: input.mindState.selfContinuity ?? input.previousState.selfContinuity ?? null,
    autobiographicalSelf: input.mindState.autobiographicalSelf ?? input.previousState.autobiographicalSelf ?? null,
    motiveEngine: input.mindState.motiveEngine ?? input.previousState.motiveEngine ?? null,
    selfState: input.mindState.selfState ?? null,
    selfGovernor: input.mindState.selfGovernor ?? input.previousState.selfGovernor ?? null,
    habitPolicy: input.mindState.habitPolicy ?? input.previousState.habitPolicy ?? null,
    mindDynamics: input.mindState.mindDynamics ?? input.previousState.mindDynamics ?? null,
    mindKernel: input.mindState.mindKernel ?? input.previousState.mindKernel ?? null,
    commitmentLedger: input.mindState.commitmentLedger ?? input.previousState.commitmentLedger ?? null,
    inquiryPlanner: input.mindState.inquiryPlanner ?? input.previousState.inquiryPlanner ?? null,
    reflectionLedger: input.mindState.reflectionLedger ?? input.previousState.reflectionLedger ?? null,
    desireMemory: input.mindState.desireMemory ?? input.previousState.desireMemory ?? null,
    privateThought: input.mindState.privateThought ?? null,
    actionEcology: input.mindState.actionEcology ?? input.previousState.actionEcology ?? null,
    answerPlanner: input.mindState.answerPlanner ?? input.previousState.answerPlanner ?? null,
    conversationState: input.mindState.conversationState ?? input.previousState.conversationState ?? null,
  })
  const derivedCommittedProjection = buildAlicizationPersonStateProjection({
    now: input.now,
    contexts: ['general'],
    autobiographicalSelf: input.mindState.autobiographicalSelf ?? input.previousState.autobiographicalSelf ?? null,
    hostPersonModel: null,
    longHorizonMemory: input.mindState.longHorizonMemory ?? input.previousState.longHorizonMemory ?? null,
    motiveEngine: input.mindState.motiveEngine ?? input.previousState.motiveEngine ?? null,
    habitPolicy: input.mindState.habitPolicy ?? input.previousState.habitPolicy ?? null,
    selfContinuity: input.mindState.selfContinuity ?? input.previousState.selfContinuity ?? null,
    selfState: input.mindState.selfState ?? null,
    privateThought: input.mindState.privateThought ?? null,
    mindEcology: provisionalMindEcology,
    selfEvolution: input.mindState.selfEvolution ?? input.mindState.derivedMindStateBundle?.selfEvolution ?? null,
  })
  const answerCompilerProjection = (
    input.mindState.answerCompiler as {
      runtimeSurface?: {
        memory?: {
          personStateProjection?: AlicizationPersonStateProjection | null
        } | null
      } | null
    } | null | undefined
  )?.runtimeSurface?.memory?.personStateProjection ?? null
  const recallProjectionAuthority = (
    input.mindState.recallGovernor as {
      selfContinuityAuthority?: AlicizationPersonStateProjection['selfContinuityAuthority'] | null
    } | null | undefined
  )?.selfContinuityAuthority ?? null
  const recallProjection = recallProjectionAuthority
    ? {
        selfContinuityAuthority: recallProjectionAuthority,
      }
    : null
  const preferredCommittedProjection = resolvePreferredPersonStateProjection({
    bundleProjection: input.previousState.personStateProjection as typeof derivedCommittedProjection,
    runtimeProjection: resolvePreferredPersonStateProjection({
      bundleProjection: answerCompilerProjection as typeof derivedCommittedProjection,
      runtimeProjection: recallProjection as typeof derivedCommittedProjection,
    }) ?? derivedCommittedProjection,
  }) ?? answerCompilerProjection ?? derivedCommittedProjection
  const mergedCommittedAuthority = mergePreferredSelfContinuityAuthority({
    bundleAuthority: input.previousState.personStateProjection?.selfContinuityAuthority as typeof derivedCommittedProjection.selfContinuityAuthority,
    runtimeAuthority: mergePreferredSelfContinuityAuthority({
      bundleAuthority: answerCompilerProjection?.selfContinuityAuthority as typeof derivedCommittedProjection.selfContinuityAuthority,
      runtimeAuthority: recallProjection?.selfContinuityAuthority as typeof derivedCommittedProjection.selfContinuityAuthority,
    }) ?? derivedCommittedProjection.selfContinuityAuthority,
  }) ?? preferredCommittedProjection.selfContinuityAuthority
  const committedPersonStateProjection = preferredCommittedProjection
    ? {
        ...preferredCommittedProjection,
        selfContinuityAuthority: mergedCommittedAuthority ?? preferredCommittedProjection.selfContinuityAuthority ?? null,
      }
    : null

  const updateVisualPresenceStateWithProjection = updateVisualPresenceState as (
    input: Parameters<typeof updateVisualPresenceState>[0] & {
      personStateProjection?: AlicizationPersonStateProjection | null
    },
  ) => AlicizationVisualPresenceStateSnapshot

  return updateVisualPresenceStateWithProjection({
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
    personStateProjection: committedPersonStateProjection,
    currentConsciousFrame: input.mindState.currentConsciousFrame,
    claimEvidenceLedger: input.mindState.claimEvidenceLedger,
    replyDeliberation: input.mindState.replyDeliberation,
    recallGovernor: input.mindState.recallGovernor,
    answerPlanner: input.mindState.answerPlanner,
    selfEvolution: input.mindState.selfEvolution ?? null,
    emotionalKernel: input.mindState.emotionalKernel ?? null,
    learningExecutionState: input.mindState.learningExecutionState ?? null,
    derivedMindStateBundle: input.mindState.derivedMindStateBundle ?? null,
    privateThought: input.mindState.privateThought,
    captureState: input.captureState ?? input.previousState.captureState,
    durabilityPulse: input.durabilityPulse ?? input.previousState.durabilityPulse ?? null,
    recentTransition: input.recentTransition ?? input.previousState.recentTransition ?? null,
    nextSuggestedProbeMs: input.nextSuggestedProbeMs ?? input.previousState.nextSuggestedProbeMs,
  })
}

// Project the full presence state into stable runtime domains so prompts and
// future control loops read from one explicit digital-life surface.
export function buildAlicizationDigitalLifeRuntimeSurface(
  state: AlicizationVisualPresenceStateSnapshot,
): AlicizationDigitalLifeRuntimeSurface {
  const stateWithMemoryClosureTrace = state as VisualPresenceStateWithMemoryClosureTrace
  const legacyRaw = state.raw ?? null
  const liftedRuntime = state.runtime ?? legacyRaw?.runtime ?? null
  const liftedEmotionalKernel = state.emotionalKernel ?? null
  const liftedRuntimeDigestCandidate = state.runtimeDigest ?? legacyRaw?.runtimeDigest ?? null
  const liftedRuntimeDigest = liftedRuntimeDigestCandidate
    ? {
        ...liftedRuntimeDigestCandidate,
        emotionalKernel: liftedEmotionalKernel,
      }
    : null
  const liftedRawProjectState = legacyRaw?.projectState ?? liftedRuntime?.projectState ?? liftedRuntimeDigest?.projectState ?? null
  const liftedRawPersonStateProjection = legacyRaw?.personStateProjection ?? state.personStateProjection ?? null
  const liftedMemoryClosureTrace = stateWithMemoryClosureTrace.memoryClosureTrace
    ?? stateWithMemoryClosureTrace.raw?.memoryClosureTrace
    ?? stateWithMemoryClosureTrace.runtime?.memoryClosureTrace
    ?? stateWithMemoryClosureTrace.raw?.runtime?.memoryClosureTrace
    ?? stateWithMemoryClosureTrace.runtimeDigest?.memory?.memoryClosureTrace
    ?? stateWithMemoryClosureTrace.raw?.runtimeDigest?.memory?.memoryClosureTrace
    ?? null
  const stateWithBundle = state as AlicizationVisualPresenceStateSnapshot & {
    derivedMindStateBundle?: AlicizationDerivedMindStateBundle | null
  }
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
  const derivedPersonStateProjection = buildAlicizationPersonStateProjection({
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
    selfEvolution: state.selfEvolution ?? stateWithBundle.derivedMindStateBundle?.selfEvolution ?? null,
  })
  const persistedPersonStateProjection = state.personStateProjection ?? null
  const preferredPersonStateProjection = resolvePreferredPersonStateProjection({
    bundleProjection: persistedPersonStateProjection as typeof derivedPersonStateProjection,
    runtimeProjection: derivedPersonStateProjection,
  }) ?? derivedPersonStateProjection
  const projectedSelfContinuityAuthority = mergePreferredSelfContinuityAuthority({
    bundleAuthority: persistedPersonStateProjection?.selfContinuityAuthority as typeof derivedPersonStateProjection.selfContinuityAuthority,
    runtimeAuthority: derivedPersonStateProjection.selfContinuityAuthority,
  }) ?? preferredPersonStateProjection.selfContinuityAuthority
  const personStateProjection = {
    ...preferredPersonStateProjection,
    selfContinuityAuthority: projectedSelfContinuityAuthority,
  }
  const personalityContinuityState = personStateProjection.personalityContinuityState
  const derivedMindStateBundle = stateWithBundle.derivedMindStateBundle ?? null
  const selfEvolution = derivedMindStateBundle?.selfEvolution ?? null
  const learningExecutionState = state.learningExecutionState
    ?? derivedMindStateBundle?.learningExecutionState
    ?? null
  const affectiveResidue = derivedMindStateBundle?.affectiveResidue ?? null
  return {
    version: 'digital-life-runtime-surface-v1',
    raw: {
      ...state,
      personStateProjection: liftedRawPersonStateProjection,
      projectState: liftedRawProjectState,
      runtime: liftedRuntime,
      runtimeDigest: liftedRuntimeDigest,
    },
    perception: {
      watchMode: state.watchMode,
      currentScene: state.currentScene,
      attention: state.attention,
      captureState: state.captureState,
      durabilityPulse: state.durabilityPulse,
      recentTransition: state.recentTransition,
      nextSuggestedProbeMs: state.nextSuggestedProbeMs,
      currentBodyState: state.currentBodyState,
      continuityMode: state.continuityMode,
      quietLineMs: state.quietLineMs,
      currentInwardPreoccupation: state.currentInwardPreoccupation,
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
      runtimeDigest: liftedRuntimeDigest,
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
      emotionalKernel: liftedEmotionalKernel,
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
      selfEvolution,
      learningExecutionState,
      affectiveResidue,
      derivedMindStateBundle,
      memoryClosureTrace: liftedMemoryClosureTrace,
      personMemoryCapsule: null,
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
      personStateProjection,
      runtimeDigest: liftedRuntimeDigest,
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

  const normalizedSurface = normalizeSparseDigitalLifeRuntimeSurface(surface)

  const summary = buildDigitalLifeContinuitySummary(normalizedSurface)
  if (!summary)
    return null

  const activeThread = normalizedSurface.world.worldModel?.activeThread ?? null
  const mindKernel = normalizedSurface.cognition.mindKernel ?? null
  const answerPlanner = normalizedSurface.dialogue.answerPlanner ?? null
  const privateThought = normalizedSurface.cognition.privateThought ?? null
  const initiative = normalizedSurface.agency.initiative ?? null
  const currentScene = normalizedSurface.perception.currentScene ?? null

  return {
    kind: 'presence',
    state: 'observed',
    label: 'digital-life-line',
    summary,
    signature: JSON.stringify([
      normalizedSurface.version,
      normalizedSurface.perception.watchMode,
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
    createdAt: normalizedSurface.perception.updatedAt,
    metadata: {
      source: 'digital-life-runtime',
      watchMode: normalizedSurface.perception.watchMode,
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
  const normalizedSurface = normalizeSparseDigitalLifeRuntimeSurface(surface)
  const privateThought = normalizedSurface.cognition.privateThought ?? null
  const focusBelief = asArray(normalizedSurface.cognition.beliefLedger?.beliefs)
    .find(belief => belief.id === normalizedSurface.cognition.beliefLedger?.focusBeliefId)
    ?? null
  const primaryInquiry = asArray(normalizedSurface.agency.inquiryLoop?.inquiries)
    .find(inquiry => inquiry.id === normalizedSurface.agency.inquiryLoop?.primaryInquiryId)
    ?? null
  const dominantConcern = (normalizedSurface.memory.concerns ?? [])[0] ?? null
  const activeThread = normalizedSurface.world.worldModel?.activeThread ?? null
  const alicizationGoals = asArray(normalizedSurface.memory.goalStack?.alicizationGoals)
  const leadingGoal = alicizationGoals.find(goal => goal.id === normalizedSurface.memory.goalStack?.leadingAlicizationGoalId)
    ?? alicizationGoals[0]
    ?? null
  const activeDesires = asArray(normalizedSurface.memory.desireMemory?.activeDesires)
  const resurfacingDesire = activeDesires.find(desire => desire.id === normalizedSurface.memory.desireMemory?.resurfacingDesireId)
    ?? null
  const livingWorldObjects = asArray(normalizedSurface.world.livingWorldState?.objects)
  const livingWorldObject = livingWorldObjects.find(object =>
    object.id === (privateThought?.livingWorldObjectId ?? normalizedSurface.world.livingWorldState?.focusObjectId ?? ''),
  ) ?? livingWorldObjects[0]
  ?? null
  const activeIntentions = asArray(normalizedSurface.agency.selfGovernor?.activeIntentions)
  const governorIntention = activeIntentions.find(intention =>
    intention.id === (privateThought?.governorIntentionId ?? normalizedSurface.agency.selfGovernor?.dominantIntentionId ?? ''),
  ) ?? activeIntentions[0]
  ?? null
  const thoughtThreads = asArray(normalizedSurface.memory.thoughtThreads?.threads)
  const thoughtThread = thoughtThreads.find(thread =>
    thread.id === (privateThought?.selectedThoughtThreadId ?? normalizedSurface.memory.thoughtThreads?.foregroundThreadId ?? ''),
  ) ?? thoughtThreads[0]
  ?? null

  return {
    surface: normalizedSurface,
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
  const normalizedSurface = normalizeSparseDigitalLifeRuntimeSurface(surface)
  return {
    architecture: buildAlicizationDigitalLifeArchitecture(normalizedSurface),
    watchMode: normalizedSurface.perception.watchMode,
    recentTransition: normalizedSurface.perception.recentTransition,
    worldModel: normalizedSurface.world.worldModel,
    livingWorldState: normalizedSurface.world.livingWorldState,
    beliefLedger: normalizedSurface.cognition.beliefLedger,
    beliefRevision: normalizedSurface.cognition.beliefRevision,
    commitmentLedger: normalizedSurface.memory.commitmentLedger,
    inquiryPlanner: normalizedSurface.memory.inquiryPlanner,
    mindKernel: normalizedSurface.cognition.mindKernel,
    hypothesisGraph: normalizedSurface.cognition.hypothesisGraph,
    privateThought: normalizedSurface.cognition.privateThought,
    emotionalKernel: normalizedSurface.memory.emotionalKernel,
    relationshipModel: normalizedSurface.world.relationshipModel,
    motiveEngine: normalizedSurface.memory.motiveEngine ?? null,
    selfGovernor: normalizedSurface.agency.selfGovernor,
    habitPolicy: normalizedSurface.agency.habitPolicy ?? null,
    inquiryLoop: normalizedSurface.agency.inquiryLoop,
    deliberationState: normalizedSurface.agency.deliberationState,
    threadRuntime: normalizedSurface.memory.threadRuntime,
    thoughtThreads: normalizedSurface.memory.thoughtThreads,
    actionEcology: normalizedSurface.agency.actionEcology,
    initiative: normalizedSurface.agency.initiative,
    autonomy: normalizedSurface.agency.autonomy ?? null,
    longHorizonMemory: normalizedSurface.memory.longHorizonMemory ?? null,
    autobiographicalSelf: normalizedSurface.memory.autobiographicalSelf ?? null,
    durabilityPulse: normalizedSurface.perception.durabilityPulse,
    personalityContinuityState: normalizedSurface.memory.personalityContinuityState ?? null,
    selfEvolution: normalizedSurface.memory.selfEvolution ?? normalizedSurface.memory.derivedMindStateBundle?.selfEvolution ?? null,
    activeContinuityGovernance: normalizedSurface.memory.derivedMindStateBundle?.activeContinuityGovernance ?? null,
    learningExecutionState: normalizedSurface.memory.learningExecutionState ?? normalizedSurface.memory.derivedMindStateBundle?.learningExecutionState ?? null,
    affectiveResidue: normalizedSurface.memory.affectiveResidue ?? normalizedSurface.memory.derivedMindStateBundle?.affectiveResidue ?? null,
    continuityDeliberation: deriveAlicizationContinuityDeliberationFromSurface(normalizedSurface),
    memoryClosureTrace: normalizedSurface.memory.memoryClosureTrace ?? null,
  }
}
