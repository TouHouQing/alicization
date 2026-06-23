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

interface AlicizationDigitalLifeSpineSnapshotCore {
  version: 'digital-life-spine-v1'
  runtimeSurface: AlicizationDigitalLifeRuntimeSurface
  architecture: AlicizationDigitalLifeArchitectureSnapshot | null
  continuitySignal: AlicizationDigitalLifeContinuitySignal | null
  proactiveSelection: AlicizationDigitalLifeProactiveSelection
  proactivePolicy: AlicizationDigitalLifeProactivePolicySnapshot
}

export interface AlicizationDigitalLifeSpineSnapshot extends AlicizationDigitalLifeSpineSnapshotCore {
  autonomy?: AlicizationDigitalLifeSpineDigest['autonomy']
  embodiment?: AlicizationDigitalLifeSpineDigest['embodiment']
  habit?: AlicizationDigitalLifeSpineDigest['habit']
  memory?: AlicizationDigitalLifeSpineDigest['memory']
  motive?: AlicizationDigitalLifeSpineDigest['motive']
  outcomeLearning?: AlicizationDigitalLifeSpineDigest['outcomeLearning']
  proactive?: AlicizationDigitalLifeSpineDigest['proactive']
  runtime?: AlicizationDigitalLifeSpineDigest['runtime']
  selfAuthority?: AlicizationDigitalLifeSpineDigest['selfAuthority']
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

function extractPersonaBiasSummary(surface: AlicizationDigitalLifeRuntimeSurface) {
  const projection = surface.memory.personStateProjection ?? null
  const rawPersonality = (surface.memory.derivedMindStateBundle as { personalityState?: unknown } | null | undefined)?.personalityState ?? null
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
  const manifestationCadenceSummary = buildPersonaManifestationCadenceSummary({
    initiativeStyle,
    silenceReconnect,
    relationshipPosture,
    comfortStyle,
    preferredProactiveStyle,
  })
  const openingGuidance = sanitizeDigitalLifeSpineDigestText(projection?.openingGuidance ?? '', 220) || null
  const whySummary = sanitizeDigitalLifeSpineDigestText(
    surface.agency.autonomy?.whyNow
    ?? surface.agency.initiative?.why
    ?? '',
    220,
  ) || null

  if (!relationshipPosture && !initiativeStyle && !silenceReconnect && !comfortStyle && !preferredProactiveStyle && !manifestationCadenceSummary && !openingGuidance && !whySummary)
    return null

  return {
    relationshipPosture,
    initiativeStyle,
    silenceReconnect,
    comfortStyle,
    preferredProactiveStyle,
    manifestationCadenceSummary,
    openingGuidance,
    whySummary,
  }
}

function buildPersonaManifestationCadenceSummary(input: {
  initiativeStyle: string | null
  silenceReconnect: string | null
  relationshipPosture: string | null
  comfortStyle: string | null
  preferredProactiveStyle: string | null
}) {
  const observeFirst = input.initiativeStyle === 'observant'
    || input.silenceReconnect === 'hold'
    || input.preferredProactiveStyle === 'silent-observe'
  if (observeFirst) {
    return 'persona prefers observe-first room, so visible return cadence should stay slower until the opening softens.'
  }

  const directReconnect = input.initiativeStyle === 'high-participation'
    || input.silenceReconnect === 'direct-approach'
  if (directReconnect) {
    return 'persona leans toward direct reconnect once the opening is real, so the return cadence can loosen earlier.'
  }

  const guardianCare = input.relationshipPosture === 'guardian'
    || input.comfortStyle === 'take-charge'
  if (guardianCare) {
    return 'persona keeps a care-first cadence, so she can surface sooner when the host needs a steadier kind of presence.'
  }

  return null
}

export function projectAlicizationDigitalLifeSpineDigest(
  spine: AlicizationDigitalLifeSpineSnapshotCore | AlicizationDigitalLifeSpineSnapshot | null | undefined,
): AlicizationDigitalLifeSpineDigest | null {
  if (!spine)
    return null

  const surface = spine.runtimeSurface
  const architecture = spine.architecture
  const continuitySignal = spine.continuitySignal
  const activeThread = spine.proactiveSelection.activeThread ?? surface.world.worldModel?.activeThread ?? null
  const initiative = surface.agency.initiative ?? null
  const autonomy = surface.agency.autonomy ?? null
  const privateThought = surface.cognition.privateThought ?? null
  const selfContinuity = surface.memory.selfContinuity ?? null
  const autobiographicalSelf = surface.memory.autobiographicalSelf ?? null
  const motiveEngine = surface.memory.motiveEngine ?? null
  const relationshipModel = surface.world.relationshipModel ?? null
  const selfState = surface.agency.selfState ?? null
  const habitPolicy = surface.agency.habitPolicy ?? null
  const leadingGoal = spine.proactiveSelection.leadingGoal ?? null
  const dominantConcern = spine.proactiveSelection.dominantConcern ?? null
  const latestReflection = surface.memory.reflectionLedger?.entries.find(
    entry => entry.id === surface.memory.reflectionLedger?.latestEntryId,
  ) ?? surface.memory.reflectionLedger?.entries[0] ?? null
  const leadingMotiveGoal = motiveEngine?.longTermGoals[0] ?? null
  const leadingMotiveAgenda = motiveEngine?.backgroundAgendas[0] ?? null
  const initiativeShouldSpeak = typeof (initiative as { shouldSpeak?: unknown } | null)?.shouldSpeak === 'boolean'
    ? (initiative as { shouldSpeak: boolean }).shouldSpeak
    : null
  const preferredPresence = sanitizeDigitalLifeSpineDigestText(
    privateThought?.embodiedPresence ?? initiative?.preferredPresence ?? '',
    48,
  ) || null
  const personaBias = extractPersonaBiasSummary(surface)
  const mindEcology = buildMindEcology({
    now: surface.perception.updatedAt,
    watchMode: surface.perception.watchMode,
    worldModel: surface.world.worldModel,
    appraisal: surface.cognition.appraisal,
    subjectiveInference: surface.cognition.subjectiveInference,
    beliefRevision: surface.cognition.beliefRevision,
    relationshipModel,
    longHorizonMemory: surface.memory.longHorizonMemory,
    selfContinuity,
    autobiographicalSelf,
    motiveEngine: surface.memory.motiveEngine ?? null,
    selfState,
    selfGovernor: surface.agency.selfGovernor,
    habitPolicy: surface.agency.habitPolicy ?? null,
    mindDynamics: surface.cognition.mindDynamics,
    mindKernel: surface.cognition.mindKernel,
    commitmentLedger: surface.memory.commitmentLedger,
    inquiryPlanner: surface.memory.inquiryPlanner,
    reflectionLedger: surface.memory.reflectionLedger,
    desireMemory: surface.memory.desireMemory,
    privateThought,
    actionEcology: surface.agency.actionEcology,
    answerPlanner: surface.dialogue.answerPlanner,
    conversationState: surface.dialogue.conversationState,
  })

  return {
    version: 'digital-life-spine-digest-v1',
    runtime: {
      watchMode: sanitizeDigitalLifeSpineDigestText(surface.perception.watchMode, 48) || null,
      sceneScenario: sanitizeDigitalLifeSpineDigestText(surface.perception.currentScene?.scenario ?? '', 48) || null,
      sceneSummary: sanitizeDigitalLifeSpineDigestText(surface.perception.currentScene?.summary ?? '', 160) || null,
      activeThreadId: sanitizeDigitalLifeSpineDigestText(activeThread?.id ?? '', 96) || null,
      activeThreadTitle: sanitizeDigitalLifeSpineDigestText(activeThread?.title ?? activeThread?.kind ?? '', 96) || null,
      dominantMode: sanitizeDigitalLifeSpineDigestText(surface.cognition.mindKernel?.dominantMode ?? '', 48) || null,
      dominantDrive: sanitizeDigitalLifeSpineDigestText(surface.cognition.mindKernel?.dominantDrive ?? '', 48) || null,
      answerIntent: sanitizeDigitalLifeSpineDigestText(surface.dialogue.answerPlanner?.answerIntent ?? '', 64) || null,
      preferredPresence,
      selectedAction: sanitizeDigitalLifeSpineDigestText(autonomy?.visibleAction ?? initiative?.selectedAction ?? '', 48) || null,
      updatedAt: normalizeDigitalLifeSpineDigestNumber(surface.perception.updatedAt),
    },
    architecture: architecture
      ? {
          operatingMode: architecture.operatingMode,
          dominantSystem: architecture.dominantSystem,
          supportingSystems: [...architecture.supportingSystems],
          governingFocus: sanitizeDigitalLifeSpineDigestText(architecture.governingFocus ?? '', 160) || null,
          summary: sanitizeDigitalLifeSpineDigestText(architecture.summary, 200) || null,
        }
      : null,
    continuitySignal: continuitySignal
      ? {
          label: 'digital-life-line',
          summary: sanitizeDigitalLifeSpineDigestText(continuitySignal.summary, 220),
          signature: sanitizeDigitalLifeSpineDigestText(continuitySignal.signature, 512),
          createdAt: continuitySignal.createdAt,
          watchMode: sanitizeDigitalLifeSpineDigestText(continuitySignal.metadata.watchMode, 48) || null,
          sceneScenario: sanitizeDigitalLifeSpineDigestText(continuitySignal.metadata.sceneScenario ?? '', 48) || null,
          activeThreadId: sanitizeDigitalLifeSpineDigestText(continuitySignal.metadata.activeThreadId ?? '', 96) || null,
          dominantMode: sanitizeDigitalLifeSpineDigestText(continuitySignal.metadata.dominantMode ?? '', 48) || null,
          dominantDrive: sanitizeDigitalLifeSpineDigestText(continuitySignal.metadata.dominantDrive ?? '', 48) || null,
          answerIntent: sanitizeDigitalLifeSpineDigestText(continuitySignal.metadata.answerIntent ?? '', 64) || null,
          preferredPresence: sanitizeDigitalLifeSpineDigestText(continuitySignal.metadata.preferredPresence ?? '', 48) || null,
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
      || surface.memory.selfEvolution
      ? {
          reflectionTargetScope: surface.memory.selfEvolution?.activeLearningFocuses[0] ?? null,
          reflectionSummary: sanitizeDigitalLifeSpineDigestText(latestReflection?.summary ?? '', 180) || null,
          reflectionLesson: sanitizeDigitalLifeSpineDigestText(latestReflection?.revision ?? '', 220) || null,
          latestInflection: sanitizeDigitalLifeSpineDigestText(
            surface.memory.selfEvolution?.latestInflection
            ?? autobiographicalSelf?.latestInflection
            ?? '',
            180,
          ) || null,
          revisionPressure: normalizeDigitalLifeSpineDigestUnit(surface.memory.reflectionLedger?.revisionPressure),
          autobiographicalStability: normalizeDigitalLifeSpineDigestUnit(
            surface.memory.selfEvolution?.autobiographicalStability
            ?? autobiographicalSelf?.stability,
          ),
          learningReadiness: normalizeDigitalLifeSpineDigestUnit(surface.memory.selfEvolution?.learningReadiness),
          contradictionPressure: normalizeDigitalLifeSpineDigestUnit(surface.memory.selfEvolution?.contradictionPressure),
          dominantTrajectory: sanitizeDigitalLifeSpineDigestText(surface.memory.selfEvolution?.dominantTrajectory ?? '', 180) || null,
          activeLearningFocuses: surface.memory.selfEvolution?.activeLearningFocuses?.slice(0, 4) ?? [],
          evolutionMomentum: normalizeDigitalLifeSpineDigestUnit(surface.memory.selfEvolution?.evolutionMomentum),
          nextLearningAction: sanitizeDigitalLifeSpineDigestText(surface.memory.selfEvolution?.nextLearningAction ?? '', 48) || null,
          nextLearningReason: sanitizeDigitalLifeSpineDigestText(surface.memory.selfEvolution?.nextLearningReason ?? '', 180) || null,
          summary: sanitizeDigitalLifeSpineDigestText(
            surface.memory.selfEvolution?.summary
            || latestReflection?.revision
            || latestReflection?.summary
            || surface.memory.selfEvolution?.latestInflection
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
            attachmentStyle: sanitizeDigitalLifeSpineDigestText(autobiographicalSelf.personaDrift.attachmentStyle, 48) || null,
            expressionStyle: sanitizeDigitalLifeSpineDigestText(autobiographicalSelf.personaDrift.expressionStyle, 48) || null,
            conflictStyle: sanitizeDigitalLifeSpineDigestText(autobiographicalSelf.personaDrift.conflictStyle, 64) || null,
            agencyStyle: sanitizeDigitalLifeSpineDigestText(autobiographicalSelf.personaDrift.agencyStyle, 48) || null,
            attachmentNeed: normalizeDigitalLifeSpineDigestUnit(autobiographicalSelf.personaDrift.attachmentNeed),
            autonomyNeed: normalizeDigitalLifeSpineDigestUnit(autobiographicalSelf.personaDrift.autonomyNeed),
            truthAnchor: normalizeDigitalLifeSpineDigestUnit(autobiographicalSelf.personaDrift.truthAnchor),
            careBias: normalizeDigitalLifeSpineDigestUnit(autobiographicalSelf.personaDrift.careBias),
            playBias: normalizeDigitalLifeSpineDigestUnit(autobiographicalSelf.personaDrift.playBias),
            irritabilityThreshold: normalizeDigitalLifeSpineDigestUnit(autobiographicalSelf.personaDrift.irritabilityThreshold),
            stubbornness: normalizeDigitalLifeSpineDigestUnit(autobiographicalSelf.personaDrift.stubbornness),
            companionship: normalizeDigitalLifeSpineDigestUnit(autobiographicalSelf.preferenceEvolution.companionship),
            truthfulGrounding: normalizeDigitalLifeSpineDigestUnit(autobiographicalSelf.preferenceEvolution.truthfulGrounding),
            gentleRepair: normalizeDigitalLifeSpineDigestUnit(autobiographicalSelf.preferenceEvolution.gentleRepair),
            quietObservation: normalizeDigitalLifeSpineDigestUnit(autobiographicalSelf.preferenceEvolution.quietObservation),
            proactiveCare: normalizeDigitalLifeSpineDigestUnit(autobiographicalSelf.preferenceEvolution.proactiveCare),
            playfulIntimacy: normalizeDigitalLifeSpineDigestUnit(autobiographicalSelf.preferenceEvolution.playfulIntimacy),
            autonomyRespect: normalizeDigitalLifeSpineDigestUnit(autobiographicalSelf.preferenceEvolution.autonomyRespect),
            unfinishedThreadReturn: normalizeDigitalLifeSpineDigestUnit(autobiographicalSelf.preferenceEvolution.unfinishedThreadReturn),
            stability: normalizeDigitalLifeSpineDigestUnit(autobiographicalSelf.stability),
            identityNarrative: sanitizeDigitalLifeSpineDigestText(autobiographicalSelf.identityNarrative, 220) || null,
            relationshipDoctrine: sanitizeDigitalLifeSpineDigestText(autobiographicalSelf.relationshipDoctrine, 220) || null,
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
      initiative: initiative
        ? {
            selectedAction: sanitizeDigitalLifeSpineDigestText(initiative.selectedAction, 48) || null,
            preferredStyle: sanitizeDigitalLifeSpineDigestText(initiative.preferredStyle ?? '', 48) || null,
            preferredPresence: sanitizeDigitalLifeSpineDigestText(initiative.preferredPresence ?? '', 48) || null,
            confidence: normalizeDigitalLifeSpineDigestUnit(initiative.confidence),
            shouldSpeak: typeof initiative.shouldSpeak === 'boolean'
              ? initiative.shouldSpeak
              : null,
            speakDrive: normalizeDigitalLifeSpineDigestUnit(initiative.speakDrive),
            silenceDrive: normalizeDigitalLifeSpineDigestUnit(initiative.silenceDrive),
            why: sanitizeDigitalLifeSpineDigestText(initiative.why, 220) || null,
            personaBias,
          }
        : null,
    },
    memory: buildAlicizationDigitalLifeMemoryDigest(surface),
  }
}

// Treat the committed visual-presence snapshot as the single living spine so
// dialogue, proactive behavior, screen grounding, and agent sessions all read
// the same derived architecture instead of rebuilding parallel interpretations.
export function deriveAlicizationDigitalLifeSpineFromSurface(
  runtimeSurface: AlicizationDigitalLifeRuntimeSurface,
): AlicizationDigitalLifeSpineSnapshot {
  const architecture = buildAlicizationDigitalLifeArchitecture(runtimeSurface)

  const core: AlicizationDigitalLifeSpineSnapshotCore = {
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
  const digest = projectAlicizationDigitalLifeSpineDigest(core)

  return {
    ...core,
    autonomy: digest?.autonomy ?? null,
    embodiment: digest?.embodiment ?? null,
    habit: digest?.habit ?? null,
    memory: digest!.memory!,
    motive: digest?.motive ?? null,
    outcomeLearning: digest?.outcomeLearning ?? null,
    proactive: digest!.proactive!,
    runtime: digest!.runtime,
    selfAuthority: digest?.selfAuthority ?? null,
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
