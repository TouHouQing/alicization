import type {
  AlicizationDigitalLifeSpineDigest,
  AlicizationVisualPresenceStateSnapshot,
} from '../../../shared/eventa'
import type {
  AlicizationDigitalLifeArchitectureSnapshot,
} from './digital-life-architecture'
import type {
  AlicizationDigitalLifeContinuitySignal,
  AlicizationDigitalLifeMindStateCommitShape,
  AlicizationDigitalLifeProactivePolicySnapshot,
  AlicizationDigitalLifeProactiveSelection,
  AlicizationDigitalLifeRuntimeSurface,
  CommitAlicizationDigitalLifeMindStateInput,
} from './digital-life-kernel'

import { buildAlicizationDigitalLifeArchitecture } from './digital-life-architecture'
import {
  buildAlicizationDigitalLifeContinuitySignal,
  buildAlicizationDigitalLifeProactivePolicySnapshot,
  buildAlicizationDigitalLifeProactiveSelection,
  buildAlicizationDigitalLifeRuntimeSurface,
  commitAlicizationDigitalLifeMindState,
} from './digital-life-kernel'
import { buildAlicizationDigitalLifeMemoryDigest } from './digital-life-memory'
import { buildMindEcology } from './mind-ecology'

export interface AlicizationDigitalLifeSpineSnapshot {
  version: 'digital-life-spine-v1'
  runtimeSurface: AlicizationDigitalLifeRuntimeSurface
  architecture: AlicizationDigitalLifeArchitectureSnapshot | null
  continuitySignal: AlicizationDigitalLifeContinuitySignal | null
  proactiveSelection: AlicizationDigitalLifeProactiveSelection
  proactivePolicy: AlicizationDigitalLifeProactivePolicySnapshot
  runtime?: AlicizationDigitalLifeSpineDigest['runtime'] | null
  proactive?: AlicizationDigitalLifeSpineDigest['proactive'] | null
  autonomy?: AlicizationDigitalLifeSpineDigest['autonomy'] | null
  memory?: AlicizationDigitalLifeSpineDigest['memory'] | null
  motive?: AlicizationDigitalLifeSpineDigest['motive'] | null
  habit?: AlicizationDigitalLifeSpineDigest['habit'] | null
  outcomeLearning?: AlicizationDigitalLifeSpineDigest['outcomeLearning'] | null
  embodiment?: AlicizationDigitalLifeSpineDigest['embodiment'] | null
  cognition?: AlicizationDigitalLifeRuntimeSurface['cognition'] | null
  dialogue?: AlicizationDigitalLifeRuntimeSurface['dialogue'] | null
  agency?: AlicizationDigitalLifeRuntimeSurface['agency'] | null
}

export interface AlicizationCommittedDigitalLifeSpine {
  version: 'digital-life-spine-commit-v1'
  previousState: AlicizationVisualPresenceStateSnapshot
  nextState: AlicizationVisualPresenceStateSnapshot
  previous: AlicizationDigitalLifeSpineSnapshot
  current: AlicizationDigitalLifeSpineSnapshot
}

function sanitizeDigitalLifeSpineDigestText(raw: unknown, maxChars = 160) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

const digitalLifeArchitectureOperatingModes = new Set([
  'observing',
  'thinking',
  'speaking',
  'acting',
  'remembering',
])

const digitalLifeArchitectureSubsystemIds = new Set([
  'dialogue',
  'perception',
  'proactive',
  'control',
  'mind',
  'memory',
  'runtime',
])

function projectDigitalLifeArchitectureDigest(
  architecture: AlicizationDigitalLifeArchitectureSnapshot | null | undefined,
): AlicizationDigitalLifeSpineDigest['architecture'] {
  if (!architecture)
    return null

  const operatingMode = digitalLifeArchitectureOperatingModes.has(architecture.operatingMode)
    ? architecture.operatingMode
    : null
  const dominantSystem = digitalLifeArchitectureSubsystemIds.has(architecture.dominantSystem)
    ? architecture.dominantSystem
    : null
  const supportingSystems = Array.isArray(architecture.supportingSystems)
    ? architecture.supportingSystems.filter(system => digitalLifeArchitectureSubsystemIds.has(system))
    : []
  const summary = [
    operatingMode ? `mode=${operatingMode}` : '',
    dominantSystem ? `dominant=${dominantSystem}` : '',
    supportingSystems.length > 0 ? `support=${supportingSystems.join(',')}` : '',
  ].filter(Boolean).join(' | ')

  return {
    operatingMode,
    dominantSystem,
    supportingSystems,
    governingFocus: null,
    summary: summary || null,
  }
}

function normalizeDigitalLifeSpineDigestNumber(raw: unknown) {
  const value = Number(raw)
  if (!Number.isFinite(value))
    return null
  return value
}

function normalizeDigitalLifeSpineDigestUnit(raw: unknown) {
  const value = normalizeDigitalLifeSpineDigestNumber(raw)
  if (value == null)
    return null
  return Math.max(0, Math.min(1, value))
}

function asArray<T>(value: T[] | null | undefined) {
  return Array.isArray(value) ? value : []
}

function readDigitalLifeGoalSummary(goal: unknown) {
  if (!goal || typeof goal !== 'object')
    return ''

  const candidate = goal as {
    summary?: unknown
    title?: unknown
    label?: unknown
    reason?: unknown
  }

  return sanitizeDigitalLifeSpineDigestText(
    candidate.summary ?? candidate.title ?? candidate.label ?? candidate.reason,
    160,
  )
}

function readDigitalLifeContinuitySignalField(
  continuitySignal: AlicizationDigitalLifeSpineSnapshot['continuitySignal'],
  field: 'watchMode' | 'sceneScenario' | 'activeThreadId' | 'dominantMode' | 'dominantDrive' | 'answerIntent' | 'preferredPresence',
) {
  if (!continuitySignal)
    return null

  return sanitizeDigitalLifeSpineDigestText(
    continuitySignal.metadata[field] ?? '',
    field === 'activeThreadId' ? 96 : 64,
  ) || null
}

function joinNarrativeLine(items: string[] | null | undefined, maxItems = 4, maxChars = 220) {
  if (!Array.isArray(items))
    return null
  const text = items
    .map(item => sanitizeDigitalLifeSpineDigestText(item, 96))
    .filter(Boolean)
    .slice(0, maxItems)
    .join(', ')
  return text ? sanitizeDigitalLifeSpineDigestText(text, maxChars) : null
}

function extractPersonaBiasSummary(surface: Partial<AlicizationDigitalLifeRuntimeSurface>) {
  const capsule = surface.memory?.personMemoryCapsule ?? null
  const projection = surface.memory?.personStateProjection ?? null
  const rawPersonality = (
    surface.memory?.derivedMindStateBundle as { personalityState?: unknown } | null | undefined
  )?.personalityState ?? null
  const personality = rawPersonality && typeof rawPersonality === 'object'
    ? rawPersonality as {
      identityKernel?: { relationshipPosture?: unknown, initiativeStyle?: unknown } | null
      initiativeBaseline?: { silenceReconnect?: unknown, comfortStyle?: unknown } | null
    }
    : null

  const relationshipPosture = sanitizeDigitalLifeSpineDigestText(personality?.identityKernel?.relationshipPosture, 48) || null
  const initiativeStyle = sanitizeDigitalLifeSpineDigestText(personality?.identityKernel?.initiativeStyle, 48) || null
  const silenceReconnect = sanitizeDigitalLifeSpineDigestText(personality?.initiativeBaseline?.silenceReconnect, 48) || null
  const comfortStyle = sanitizeDigitalLifeSpineDigestText(personality?.initiativeBaseline?.comfortStyle, 48) || null
  const preferredProactiveStyle = sanitizeDigitalLifeSpineDigestText(projection?.preferredProactiveStyle ?? '', 48) || null
  const capsulePreferredProactiveStyle = sanitizeDigitalLifeSpineDigestText(capsule?.modules.initiative.proactiveStyle ?? '', 48) || null
  const rawWhySummary = sanitizeDigitalLifeSpineDigestText(
    surface.agency?.autonomy?.whyNow
    ?? surface.agency?.initiative?.why
    ?? capsule?.modules.memory.selectedMemory
    ?? '',
    320,
  ) || null
  const whySummary = rawWhySummary

  if (!relationshipPosture && !initiativeStyle && !silenceReconnect && !comfortStyle && !preferredProactiveStyle && !capsulePreferredProactiveStyle && !whySummary)
    return null

  return {
    relationshipPosture: relationshipPosture ?? (sanitizeDigitalLifeSpineDigestText(capsule?.modules.dialogue.answerPosture ?? '', 48) || null),
    initiativeStyle,
    silenceReconnect,
    comfortStyle,
    preferredProactiveStyle: capsulePreferredProactiveStyle ?? preferredProactiveStyle,
    whySummary,
  }
}

function normalizeSelfContinuitySourceTags(sourceTags: unknown) {
  const normalizedTags = Array.isArray(sourceTags)
    ? sourceTags
        .map(tag => sanitizeDigitalLifeSpineDigestText(tag, 64))
        .filter(Boolean)
        .slice(0, 8)
    : []
  return [...new Set(normalizedTags)].slice(0, 8)
}

export function projectAlicizationDigitalLifeSpineDigest(
  spine: AlicizationDigitalLifeSpineSnapshot | null | undefined,
): AlicizationDigitalLifeSpineDigest | null {
  if (!spine)
    return null

  const surface = spine.runtimeSurface
  const perception = surface.perception ?? null
  const world = surface.world ?? null
  const cognition = surface.cognition ?? null
  const memory = surface.memory ?? null
  const agency = surface.agency ?? null
  const dialogue = surface.dialogue ?? null
  const architecture = spine.architecture
  const continuitySignal = spine.continuitySignal
  const proactiveSelection = spine.proactiveSelection ?? null
  const activeThread = proactiveSelection?.activeThread ?? world?.worldModel?.activeThread ?? null
  const initiative = agency?.initiative ?? null
  const autonomy = agency?.autonomy ?? null
  const privateThought = cognition?.privateThought ?? null
  const personMemoryCapsule = memory?.personMemoryCapsule ?? null
  const selfContinuity = memory?.selfContinuity ?? null
  const autobiographicalSelf = memory?.autobiographicalSelf ?? null
  const personStateProjection = memory?.personStateProjection ?? null
  const selfContinuityAuthority = personStateProjection?.selfContinuityAuthority ?? null
  const motiveEngine = memory?.motiveEngine ?? null
  const relationshipModel = world?.relationshipModel ?? null
  const selfState = agency?.selfState ?? null
  const habitPolicy = agency?.habitPolicy ?? null
  const leadingGoal = proactiveSelection?.leadingGoal ?? null
  const dominantConcern = proactiveSelection?.dominantConcern ?? null
  const reflectionEntries = asArray(memory?.reflectionLedger?.entries)
  const latestReflectionCandidate = reflectionEntries.find(
    entry => entry.id === memory?.reflectionLedger?.latestEntryId,
  )
  const latestReflection = (
    latestReflectionCandidate && latestReflectionCandidate.outcome !== 'released'
      ? latestReflectionCandidate
      : reflectionEntries.find(entry => entry.outcome !== 'released')
  ) ?? reflectionEntries[0] ?? null
  const motiveLongTermGoals = asArray(motiveEngine?.longTermGoals)
  const motiveBackgroundAgendas = asArray(motiveEngine?.backgroundAgendas)
  const leadingMotiveGoal = motiveLongTermGoals[0] ?? null
  const leadingMotiveAgenda = motiveBackgroundAgendas[0] ?? null
  const initiativeShouldSpeak = typeof (initiative as { shouldSpeak?: unknown } | null)?.shouldSpeak === 'boolean'
    ? (initiative as { shouldSpeak: boolean }).shouldSpeak
    : null
  const preferredPresence = sanitizeDigitalLifeSpineDigestText(
    privateThought?.embodiedPresence ?? initiative?.preferredPresence ?? '',
    48,
  ) || null
  const personaBias = extractPersonaBiasSummary(surface)
  const mindEcology = buildMindEcology({
    now: perception?.updatedAt ?? 0,
    watchMode: perception?.watchMode,
    worldModel: world?.worldModel,
    appraisal: cognition?.appraisal,
    subjectiveInference: cognition?.subjectiveInference,
    beliefRevision: cognition?.beliefRevision,
    relationshipModel,
    longHorizonMemory: memory?.longHorizonMemory,
    selfContinuity,
    autobiographicalSelf,
    motiveEngine: memory?.motiveEngine ?? null,
    selfState,
    selfGovernor: agency?.selfGovernor,
    habitPolicy: agency?.habitPolicy ?? null,
    mindDynamics: cognition?.mindDynamics,
    mindKernel: cognition?.mindKernel,
    commitmentLedger: memory?.commitmentLedger,
    inquiryPlanner: memory?.inquiryPlanner,
    reflectionLedger: memory?.reflectionLedger,
    desireMemory: memory?.desireMemory,
    privateThought,
    actionEcology: agency?.actionEcology,
    answerPlanner: dialogue?.answerPlanner,
    conversationState: dialogue?.conversationState,
  })

  return {
    version: 'digital-life-spine-digest-v1',
    runtime: {
      watchMode: sanitizeDigitalLifeSpineDigestText(perception?.watchMode, 48) || null,
      sceneScenario: sanitizeDigitalLifeSpineDigestText(perception?.currentScene?.scenario ?? '', 48) || null,
      sceneSummary: sanitizeDigitalLifeSpineDigestText(perception?.currentScene?.summary ?? '', 160) || null,
      activeThreadId: sanitizeDigitalLifeSpineDigestText(activeThread?.id ?? '', 96) || null,
      activeThreadTitle: sanitizeDigitalLifeSpineDigestText(activeThread?.title ?? activeThread?.kind ?? '', 96) || null,
      dominantMode: sanitizeDigitalLifeSpineDigestText(cognition?.mindKernel?.dominantMode ?? '', 48) || null,
      dominantDrive: sanitizeDigitalLifeSpineDigestText(cognition?.mindKernel?.dominantDrive ?? '', 48) || null,
      answerIntent: sanitizeDigitalLifeSpineDigestText(dialogue?.answerPlanner?.answerIntent ?? '', 64) || null,
      preferredPresence,
      selectedAction: sanitizeDigitalLifeSpineDigestText(autonomy?.visibleAction ?? initiative?.selectedAction ?? '', 48) || null,
      updatedAt: normalizeDigitalLifeSpineDigestNumber(perception?.updatedAt),
    },
    architecture: projectDigitalLifeArchitectureDigest(architecture),
    continuitySignal: continuitySignal
      ? {
          label: 'digital-life-line',
          summary: sanitizeDigitalLifeSpineDigestText(continuitySignal.summary, 220),
          signature: sanitizeDigitalLifeSpineDigestText(continuitySignal.signature, 512),
          createdAt: continuitySignal.createdAt,
          watchMode: readDigitalLifeContinuitySignalField(continuitySignal, 'watchMode'),
          sceneScenario: readDigitalLifeContinuitySignalField(continuitySignal, 'sceneScenario'),
          activeThreadId: readDigitalLifeContinuitySignalField(continuitySignal, 'activeThreadId'),
          dominantMode: readDigitalLifeContinuitySignalField(continuitySignal, 'dominantMode'),
          dominantDrive: readDigitalLifeContinuitySignalField(continuitySignal, 'dominantDrive'),
          answerIntent: readDigitalLifeContinuitySignalField(continuitySignal, 'answerIntent'),
          preferredPresence: readDigitalLifeContinuitySignalField(continuitySignal, 'preferredPresence'),
        }
      : null,
    proactive: {
      selectedAction: sanitizeDigitalLifeSpineDigestText(autonomy?.visibleAction ?? initiative?.selectedAction ?? '', 48) || null,
      preferredStyle: sanitizeDigitalLifeSpineDigestText(
        initiative?.preferredStyle ?? privateThought?.suggestedStyle ?? '',
        48,
      ) || null,
      confidence: normalizeDigitalLifeSpineDigestUnit(
        autonomy?.confidence ?? initiative?.confidence ?? privateThought?.confidence,
      ),
      shouldSpeak: typeof autonomy?.shouldSpeak === 'boolean'
        ? autonomy.shouldSpeak
        : initiativeShouldSpeak != null
          ? initiativeShouldSpeak
          : typeof privateThought?.shouldSpeak === 'boolean'
            ? privateThought.shouldSpeak
            : null,
      activeThreadId: sanitizeDigitalLifeSpineDigestText(activeThread?.id ?? '', 96) || null,
      activeThreadTitle: sanitizeDigitalLifeSpineDigestText(activeThread?.title ?? activeThread?.kind ?? '', 96) || null,
      dominantConcernKind: sanitizeDigitalLifeSpineDigestText(dominantConcern?.kind ?? '', 48) || null,
      dominantConcernSummary: sanitizeDigitalLifeSpineDigestText(dominantConcern?.summary ?? '', 160) || null,
      leadingGoalId: sanitizeDigitalLifeSpineDigestText(leadingGoal?.id ?? '', 96) || null,
      leadingGoalSummary: readDigitalLifeGoalSummary(leadingGoal) || null,
      preferredPresence,
      personaBias,
    },
    autonomy: autonomy
      ? {
          selectedMode: sanitizeDigitalLifeSpineDigestText(autonomy.selectedMode, 48) || null,
          visibleAction: sanitizeDigitalLifeSpineDigestText(autonomy.visibleAction, 48) || null,
          shouldSurface: typeof autonomy.shouldSurface === 'boolean' ? autonomy.shouldSurface : null,
          shouldSpeak: typeof autonomy.shouldSpeak === 'boolean' ? autonomy.shouldSpeak : null,
          shouldAct: typeof autonomy.shouldAct === 'boolean' ? autonomy.shouldAct : null,
          speakReadiness: normalizeDigitalLifeSpineDigestUnit(autonomy.speakReadiness),
          actReadiness: normalizeDigitalLifeSpineDigestUnit(autonomy.actReadiness),
          inhibition: normalizeDigitalLifeSpineDigestUnit(autonomy.inhibition),
          confidence: normalizeDigitalLifeSpineDigestUnit(autonomy.confidence),
          executionIntentKind: sanitizeDigitalLifeSpineDigestText(autonomy.executionIntent?.kind ?? '', 64) || null,
          executionIntentSummary: sanitizeDigitalLifeSpineDigestText(autonomy.executionIntent?.summary ?? '', 220) || null,
          deferReason: sanitizeDigitalLifeSpineDigestText(autonomy.deferReason ?? '', 160) || null,
          whyNow: sanitizeDigitalLifeSpineDigestText(autonomy.whyNow, 220) || null,
          sourceGoalId: sanitizeDigitalLifeSpineDigestText(autonomy.sourceGoalId ?? '', 96) || null,
          sourceGoalSummary: sanitizeDigitalLifeSpineDigestText(autonomy.sourceGoalSummary ?? '', 160) || null,
          sourceAgendaKind: sanitizeDigitalLifeSpineDigestText(autonomy.sourceAgendaKind ?? '', 64) || null,
          sourceAgendaSummary: sanitizeDigitalLifeSpineDigestText(autonomy.sourceAgendaSummary ?? '', 180) || null,
          sourceThreadId: sanitizeDigitalLifeSpineDigestText(autonomy.sourceThreadId ?? '', 96) || null,
          sourceThreadSummary: sanitizeDigitalLifeSpineDigestText(autonomy.sourceThreadSummary ?? '', 180) || null,
        }
      : null,
    motive: motiveEngine
      ? {
          rulingDrive: sanitizeDigitalLifeSpineDigestText(motiveEngine.rulingDrive ?? '', 48) || null,
          returnPressure: normalizeDigitalLifeSpineDigestUnit(motiveEngine.returnPressure),
          companionshipDrive: normalizeDigitalLifeSpineDigestUnit(motiveEngine.drives.companionship),
          boundaryRespectDrive: normalizeDigitalLifeSpineDigestUnit(motiveEngine.drives.boundaryRespect),
          truthDisciplineDrive: normalizeDigitalLifeSpineDigestUnit(motiveEngine.drives.truthDiscipline),
          restProtectionDrive: normalizeDigitalLifeSpineDigestUnit(motiveEngine.drives.restProtection),
          selfDirectionDrive: normalizeDigitalLifeSpineDigestUnit(motiveEngine.drives.selfDirection),
          leadingGoalSummary: readDigitalLifeGoalSummary(leadingMotiveGoal) || null,
          leadingAgendaKind: sanitizeDigitalLifeSpineDigestText(leadingMotiveAgenda?.kind ?? '', 64) || null,
          leadingAgendaSummary: sanitizeDigitalLifeSpineDigestText(leadingMotiveAgenda?.summary ?? '', 180) || null,
          narrative: joinNarrativeLine(motiveEngine.narrative) ?? null,
        }
      : null,
    habit: habitPolicy
      ? {
          dominantMode: sanitizeDigitalLifeSpineDigestText(habitPolicy.dominantMode, 64) || null,
          requiresGroundingBeforeSurface: habitPolicy.requiresGroundingBeforeSurface,
          prefersQuietCompanionship: habitPolicy.prefersQuietCompanionship,
          blocksDirectSpeakWhenBusy: habitPolicy.blocksDirectSpeakWhenBusy,
          protectsRestWindow: habitPolicy.protectsRestWindow,
          returnViaRecheck: habitPolicy.returnViaRecheck,
          suggestedStyleCap: sanitizeDigitalLifeSpineDigestText(habitPolicy.suggestedStyleCap, 64) || null,
          suggestedPresenceCap: sanitizeDigitalLifeSpineDigestText(habitPolicy.suggestedPresenceCap, 64) || null,
          narrative: joinNarrativeLine(habitPolicy.narrative) ?? null,
        }
      : null,
    outcomeLearning: latestReflection || autobiographicalSelf?.latestInflection
      || memory?.selfEvolution || personMemoryCapsule?.modules.learning.nextAction
      ? {
          reflectionTargetScope: asArray(memory?.selfEvolution?.activeLearningFocuses)[0]
            ?? personMemoryCapsule?.modules.learning.focuses[0]
            ?? null,
          reflectionSummary: sanitizeDigitalLifeSpineDigestText(latestReflection?.summary ?? '', 180) || null,
          reflectionLesson: sanitizeDigitalLifeSpineDigestText(latestReflection?.revision ?? '', 220) || null,
          latestInflection: sanitizeDigitalLifeSpineDigestText(
            memory?.selfEvolution?.latestInflection
            ?? autobiographicalSelf?.latestInflection
            ?? '',
            180,
          ) || null,
          revisionPressure: normalizeDigitalLifeSpineDigestUnit(memory?.reflectionLedger?.revisionPressure),
          autobiographicalStability: normalizeDigitalLifeSpineDigestUnit(
            memory?.selfEvolution?.autobiographicalStability
            ?? autobiographicalSelf?.stability,
          ),
          learningReadiness: normalizeDigitalLifeSpineDigestUnit(memory?.selfEvolution?.learningReadiness),
          contradictionPressure: normalizeDigitalLifeSpineDigestUnit(memory?.selfEvolution?.contradictionPressure),
          dominantTrajectory: sanitizeDigitalLifeSpineDigestText(memory?.selfEvolution?.dominantTrajectory ?? personMemoryCapsule?.modules.learning.reason ?? '', 180) || null,
          activeLearningFocuses: asArray(memory?.selfEvolution?.activeLearningFocuses).length > 0
            ? asArray(memory?.selfEvolution?.activeLearningFocuses).slice(0, 4)
            : personMemoryCapsule?.modules.learning.focuses.slice(0, 4) ?? [],
          evolutionMomentum: normalizeDigitalLifeSpineDigestUnit(memory?.selfEvolution?.evolutionMomentum),
          nextLearningAction: sanitizeDigitalLifeSpineDigestText(memory?.selfEvolution?.nextLearningAction ?? personMemoryCapsule?.modules.learning.nextAction ?? '', 48) || null,
          nextLearningReason: sanitizeDigitalLifeSpineDigestText(memory?.selfEvolution?.nextLearningReason ?? personMemoryCapsule?.modules.learning.reason ?? '', 180) || null,
          summary: sanitizeDigitalLifeSpineDigestText(
            memory?.selfEvolution?.summary
            || latestReflection?.revision
            || latestReflection?.summary
            || personMemoryCapsule?.modules.learning.executionSummary
            || personMemoryCapsule?.modules.learning.reason
            || personStateProjection?.relationshipDoctrine
            || memory?.selfEvolution?.latestInflection
            || autobiographicalSelf?.latestInflection
            || '',
            220,
          ) || null,
        }
      : null,
    embodiment: {
      privateThought: privateThought
        ? {
            stance: sanitizeDigitalLifeSpineDigestText(privateThought.stance, 48) || null,
            confidence: normalizeDigitalLifeSpineDigestUnit(privateThought.confidence),
            shouldSpeak: typeof privateThought.shouldSpeak === 'boolean'
              ? privateThought.shouldSpeak
              : null,
            suggestedStyle: sanitizeDigitalLifeSpineDigestText(privateThought.suggestedStyle, 48) || null,
            embodiedPresence: sanitizeDigitalLifeSpineDigestText(privateThought.embodiedPresence, 48) || null,
            emotionalTension: sanitizeDigitalLifeSpineDigestText(privateThought.emotionalTension, 48) || null,
            relationshipVector: sanitizeDigitalLifeSpineDigestText(privateThought.relationshipVector ?? '', 48) || null,
            initiativeAction: sanitizeDigitalLifeSpineDigestText(privateThought.initiativeAction ?? '', 48) || null,
            governorDrive: sanitizeDigitalLifeSpineDigestText(privateThought.governorDrive ?? '', 48) || null,
          }
        : null,
      selfContinuity: selfContinuity
        ? {
            attachmentMode: sanitizeDigitalLifeSpineDigestText(selfContinuity.attachmentMode, 48) || null,
            initiativeTemperament: sanitizeDigitalLifeSpineDigestText(selfContinuity.initiativeTemperament, 48) || null,
            perceptionTrust: normalizeDigitalLifeSpineDigestUnit(selfContinuity.perceptionTrust),
            relationshipTrust: normalizeDigitalLifeSpineDigestUnit(selfContinuity.relationshipTrust),
            guardingTendency: normalizeDigitalLifeSpineDigestUnit(selfContinuity.guardingTendency),
            misreadBurden: normalizeDigitalLifeSpineDigestUnit(selfContinuity.misreadBurden),
            carryOverDesire: normalizeDigitalLifeSpineDigestUnit(selfContinuity.carryOverDesire),
          }
        : null,
      autobiographicalSelf: autobiographicalSelf
        ? {
            attachmentStyle: sanitizeDigitalLifeSpineDigestText(autobiographicalSelf.personaDrift?.attachmentStyle ?? '', 48) || null,
            expressionStyle: sanitizeDigitalLifeSpineDigestText(autobiographicalSelf.personaDrift?.expressionStyle ?? '', 48) || null,
            conflictStyle: sanitizeDigitalLifeSpineDigestText(autobiographicalSelf.personaDrift?.conflictStyle ?? '', 64) || null,
            agencyStyle: sanitizeDigitalLifeSpineDigestText(autobiographicalSelf.personaDrift?.agencyStyle ?? '', 48) || null,
            attachmentNeed: normalizeDigitalLifeSpineDigestUnit(autobiographicalSelf.personaDrift?.attachmentNeed),
            autonomyNeed: normalizeDigitalLifeSpineDigestUnit(autobiographicalSelf.personaDrift?.autonomyNeed),
            truthAnchor: normalizeDigitalLifeSpineDigestUnit(autobiographicalSelf.personaDrift?.truthAnchor),
            careBias: normalizeDigitalLifeSpineDigestUnit(autobiographicalSelf.personaDrift?.careBias),
            playBias: normalizeDigitalLifeSpineDigestUnit(autobiographicalSelf.personaDrift?.playBias),
            irritabilityThreshold: normalizeDigitalLifeSpineDigestUnit(autobiographicalSelf.personaDrift?.irritabilityThreshold),
            stubbornness: normalizeDigitalLifeSpineDigestUnit(autobiographicalSelf.personaDrift?.stubbornness),
            companionship: normalizeDigitalLifeSpineDigestUnit(autobiographicalSelf.preferenceEvolution?.companionship),
            truthfulGrounding: normalizeDigitalLifeSpineDigestUnit(autobiographicalSelf.preferenceEvolution?.truthfulGrounding),
            gentleRepair: normalizeDigitalLifeSpineDigestUnit(autobiographicalSelf.preferenceEvolution?.gentleRepair),
            quietObservation: normalizeDigitalLifeSpineDigestUnit(autobiographicalSelf.preferenceEvolution?.quietObservation),
            proactiveCare: normalizeDigitalLifeSpineDigestUnit(autobiographicalSelf.preferenceEvolution?.proactiveCare),
            playfulIntimacy: normalizeDigitalLifeSpineDigestUnit(autobiographicalSelf.preferenceEvolution?.playfulIntimacy),
            autonomyRespect: normalizeDigitalLifeSpineDigestUnit(autobiographicalSelf.preferenceEvolution?.autonomyRespect),
            unfinishedThreadReturn: normalizeDigitalLifeSpineDigestUnit(autobiographicalSelf.preferenceEvolution?.unfinishedThreadReturn),
            stability: normalizeDigitalLifeSpineDigestUnit(autobiographicalSelf.stability),
            identityNarrative: sanitizeDigitalLifeSpineDigestText(autobiographicalSelf.identityNarrative, 220) || null,
            relationshipDoctrine: sanitizeDigitalLifeSpineDigestText(
              autobiographicalSelf.relationshipDoctrine
              || personStateProjection?.relationshipDoctrine
              || '',
              220,
            ) || null,
            latestInflection: sanitizeDigitalLifeSpineDigestText(autobiographicalSelf.latestInflection, 220) || null,
          }
        : null,
      relationship: relationshipModel
        ? {
            climate: sanitizeDigitalLifeSpineDigestText(relationshipModel.climate, 48) || null,
            approachVector: sanitizeDigitalLifeSpineDigestText(relationshipModel.approachVector, 48) || null,
            receptivity: normalizeDigitalLifeSpineDigestUnit(relationshipModel.receptivity),
            sharedAttentionTrust: normalizeDigitalLifeSpineDigestUnit(relationshipModel.sharedAttentionTrust),
            correctionSensitivity: normalizeDigitalLifeSpineDigestUnit(relationshipModel.correctionSensitivity),
            reciprocityExpectation: normalizeDigitalLifeSpineDigestUnit(relationshipModel.reciprocityExpectation),
          }
        : null,
      selfState: selfState
        ? {
            stance: sanitizeDigitalLifeSpineDigestText(selfState.stance, 48) || null,
            feltCloseness: normalizeDigitalLifeSpineDigestUnit(selfState.feltCloseness),
            protectiveness: normalizeDigitalLifeSpineDigestUnit(selfState.protectiveness),
            curiosity: normalizeDigitalLifeSpineDigestUnit(selfState.curiosity),
            patience: normalizeDigitalLifeSpineDigestUnit(selfState.patience),
            desireToSpeak: normalizeDigitalLifeSpineDigestUnit(selfState.desireToSpeak),
            fearOfInterrupting: normalizeDigitalLifeSpineDigestUnit(selfState.fearOfInterrupting),
            moodLabel: sanitizeDigitalLifeSpineDigestText(selfState.moodLabel ?? '', 48) || null,
          }
        : null,
      mindEcology: {
        moodLabel: sanitizeDigitalLifeSpineDigestText(mindEcology.moodLabel, 48) || null,
        replyHabit: sanitizeDigitalLifeSpineDigestText(mindEcology.replyHabit, 48) || null,
        relationshipHabit: sanitizeDigitalLifeSpineDigestText(mindEcology.relationshipHabit, 48) || null,
        explorationHabit: sanitizeDigitalLifeSpineDigestText(mindEcology.explorationHabit, 48) || null,
        regulationHabit: sanitizeDigitalLifeSpineDigestText(mindEcology.regulationHabit, 48) || null,
        selfNarrative: sanitizeDigitalLifeSpineDigestText(mindEcology.selfNarrative, 220) || null,
        relationNarrative: sanitizeDigitalLifeSpineDigestText(mindEcology.relationNarrative, 220) || null,
        currentPreoccupation: sanitizeDigitalLifeSpineDigestText(mindEcology.currentPreoccupation, 220) || null,
        temperament: {
          attachment: normalizeDigitalLifeSpineDigestUnit(mindEcology.temperament.attachment),
          curiosity: normalizeDigitalLifeSpineDigestUnit(mindEcology.temperament.curiosity),
          steadiness: normalizeDigitalLifeSpineDigestUnit(mindEcology.temperament.steadiness),
          directness: normalizeDigitalLifeSpineDigestUnit(mindEcology.temperament.directness),
          playfulness: normalizeDigitalLifeSpineDigestUnit(mindEcology.temperament.playfulness),
          irritability: normalizeDigitalLifeSpineDigestUnit(mindEcology.temperament.irritability),
          tenderness: normalizeDigitalLifeSpineDigestUnit(mindEcology.temperament.tenderness),
        },
        climate: {
          valence: normalizeDigitalLifeSpineDigestUnit(mindEcology.climate.valence),
          arousal: normalizeDigitalLifeSpineDigestUnit(mindEcology.climate.arousal),
          socialNeed: normalizeDigitalLifeSpineDigestUnit(mindEcology.climate.socialNeed),
          solitudeNeed: normalizeDigitalLifeSpineDigestUnit(mindEcology.climate.solitudeNeed),
          irritation: normalizeDigitalLifeSpineDigestUnit(mindEcology.climate.irritation),
          restlessness: normalizeDigitalLifeSpineDigestUnit(mindEcology.climate.restlessness),
          reflectivePull: normalizeDigitalLifeSpineDigestUnit(mindEcology.climate.reflectivePull),
        },
      },
      initiative: initiative || personaBias
        ? {
            selectedAction: sanitizeDigitalLifeSpineDigestText(initiative?.selectedAction ?? '', 48) || null,
            preferredStyle: sanitizeDigitalLifeSpineDigestText(
              initiative?.preferredStyle
              ?? personaBias?.preferredProactiveStyle
              ?? '',
              48,
            ) || null,
            preferredPresence: sanitizeDigitalLifeSpineDigestText(initiative?.preferredPresence ?? '', 48) || null,
            confidence: normalizeDigitalLifeSpineDigestUnit(initiative?.confidence),
            shouldSpeak: typeof initiative?.shouldSpeak === 'boolean'
              ? initiative.shouldSpeak
              : null,
            speakDrive: normalizeDigitalLifeSpineDigestUnit(initiative?.speakDrive),
            silenceDrive: normalizeDigitalLifeSpineDigestUnit(initiative?.silenceDrive),
            why: sanitizeDigitalLifeSpineDigestText(
              initiative?.why
              ?? personaBias?.whySummary
              ?? '',
              220,
            ) || null,
            personaBias,
          }
        : null,
      personMemoryCapsule: personMemoryCapsule
        ? {
            hint: sanitizeDigitalLifeSpineDigestText(personMemoryCapsule.modules.embodiment.hint, 220) || null,
            expressionPosture: sanitizeDigitalLifeSpineDigestText(personMemoryCapsule.modules.embodiment.expressionPosture ?? '', 64) || null,
            voicePacing: sanitizeDigitalLifeSpineDigestText(personMemoryCapsule.modules.embodiment.voicePacing ?? '', 64) || null,
            motionPosture: sanitizeDigitalLifeSpineDigestText(personMemoryCapsule.modules.embodiment.motionPosture ?? '', 64) || null,
            emotion: sanitizeDigitalLifeSpineDigestText(personMemoryCapsule.modules.emotion.affectiveSummary ?? '', 180) || null,
            selectedMemory: sanitizeDigitalLifeSpineDigestText(personMemoryCapsule.modules.memory.selectedMemory ?? '', 180) || null,
          }
        : null,
    } as NonNullable<AlicizationDigitalLifeSpineDigest['embodiment']> & {
      personMemoryCapsule?: {
        hint: string | null
        expressionPosture: string | null
        voicePacing: string | null
        motionPosture: string | null
        emotion: string | null
        selectedMemory: string | null
      } | null
    },
    memory: (() => {
      const memoryDigest = buildAlicizationDigitalLifeMemoryDigest(surface as AlicizationDigitalLifeRuntimeSurface | null | undefined)
      if (!memoryDigest)
        return memoryDigest

      return {
        ...memoryDigest,
        summary: [
          memoryDigest.summary,
          personMemoryCapsule?.modules.memory.selectedMemory
            ? `capsule=${sanitizeDigitalLifeSpineDigestText(personMemoryCapsule.modules.memory.selectedMemory, 160)}`
            : null,
          personMemoryCapsule?.modules.personality.identityLine
            ? `person=${sanitizeDigitalLifeSpineDigestText(personMemoryCapsule.modules.personality.identityLine, 120)}`
            : null,
        ].filter(Boolean).join(' | ') || memoryDigest.summary,
        personStateProjection: personStateProjection
          ? {
              ...memoryDigest.personStateProjection,
              summary: sanitizeDigitalLifeSpineDigestText(personStateProjection.summary ?? '', 220) || null,
              selfContinuityAuthority: selfContinuityAuthority
                ? {
                    sourceTags: normalizeSelfContinuitySourceTags(selfContinuityAuthority.sourceTags),
                    selfLine: sanitizeDigitalLifeSpineDigestText(selfContinuityAuthority.selfLine ?? '', 220) || null,
                    relationshipLine: sanitizeDigitalLifeSpineDigestText(selfContinuityAuthority.relationshipLine ?? '', 220) || null,
                    motiveLine: sanitizeDigitalLifeSpineDigestText(selfContinuityAuthority.motiveLine ?? '', 220) || null,
                    habitLine: sanitizeDigitalLifeSpineDigestText(selfContinuityAuthority.habitLine ?? '', 220) || null,
                    inwardLine: sanitizeDigitalLifeSpineDigestText(selfContinuityAuthority.inwardLine ?? '', 220) || null,
                    authoritySummary: sanitizeDigitalLifeSpineDigestText(selfContinuityAuthority.authoritySummary ?? '', 220) || null,
                  }
                : memoryDigest.personStateProjection?.selfContinuityAuthority ?? null,
              activeClosenessContext: sanitizeDigitalLifeSpineDigestText(personStateProjection.activeClosenessContext ?? '', 64) || null,
              activeClosenessRung: sanitizeDigitalLifeSpineDigestText(personStateProjection.activeClosenessRung ?? '', 64) || null,
              relationshipPosture: sanitizeDigitalLifeSpineDigestText(personStateProjection.relationshipPosture ?? '', 64) || null,
              preferredProactiveStyle: sanitizeDigitalLifeSpineDigestText(personStateProjection.preferredProactiveStyle ?? '', 64) || null,
            }
          : memoryDigest.personStateProjection ?? null,
      }
    })(),
  }
}

// Treat the committed visual-presence snapshot as the single living spine so
// dialogue, proactive behavior, screen grounding, and agent sessions all read
// the same derived architecture instead of rebuilding parallel interpretations.
export function deriveAlicizationDigitalLifeSpineFromSurface(
  runtimeSurface: AlicizationDigitalLifeRuntimeSurface,
): AlicizationDigitalLifeSpineSnapshot {
  const architecture = buildAlicizationDigitalLifeArchitecture(runtimeSurface)

  return {
    version: 'digital-life-spine-v1',
    runtimeSurface,
    architecture,
    continuitySignal: buildAlicizationDigitalLifeContinuitySignal(runtimeSurface),
    proactiveSelection: buildAlicizationDigitalLifeProactiveSelection(runtimeSurface),
    proactivePolicy: {
      ...buildAlicizationDigitalLifeProactivePolicySnapshot(runtimeSurface),
      architecture,
    },
  }
}

export function deriveAlicizationDigitalLifeSpine(
  state: AlicizationVisualPresenceStateSnapshot,
): AlicizationDigitalLifeSpineSnapshot {
  return deriveAlicizationDigitalLifeSpineFromSurface(
    buildAlicizationDigitalLifeRuntimeSurface(state),
  )
}

export function commitAlicizationDigitalLifeSpine<TMindState extends AlicizationDigitalLifeMindStateCommitShape>(
  input: CommitAlicizationDigitalLifeMindStateInput<TMindState>,
): AlicizationCommittedDigitalLifeSpine {
  const previousState = input.previousState
  const nextState = commitAlicizationDigitalLifeMindState(input)

  return {
    version: 'digital-life-spine-commit-v1',
    previousState,
    nextState,
    previous: deriveAlicizationDigitalLifeSpine(previousState),
    current: deriveAlicizationDigitalLifeSpine(nextState),
  }
}
