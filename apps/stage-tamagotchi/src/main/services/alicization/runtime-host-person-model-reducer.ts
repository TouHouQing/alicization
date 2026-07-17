import type { AlicizationMindTurnGovernance } from '../../../shared/eventa'
import type { AlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'
import type { OrganicMemoryPromptContext } from './runtime-soul'

import { buildMindEcologyFromRuntimeSurface } from './mind-ecology'
import { buildAlicizationPersonStateProjection } from './person-state-projection'
import {
  hasContinuityRestraintRelationshipSignal,
  hasNeutralRelationshipSignal,
  mergePreferredSelfContinuityAuthority,
} from './person-state-projection-resolution'

function inferGovernanceHostSocialContexts(governance: AlicizationMindTurnGovernance) {
  const contexts = ['general']
  const anchorText = `${governance.liveSurface ?? ''} ${governance.focusAnchor ?? ''} ${governance.answerIntent ?? ''}`
  if (
    governance.answerSubject === 'task-knot'
    || governance.answerAct === 'guide'
    || /runtime|diff|code|patch|cursor|terminal|cli|debug|fix|verify|test/iu.test(anchorText)
  ) {
    contexts.push('focused-work', 'execution')
  }
  if (governance.emotionalTension === 'late-night-drain' || governance.answerAct === 'care')
    contexts.push('late-night')
  if (governance.answerSubject === 'relationship' || governance.answerSubject === 'alicization-self')
    contexts.push('open-window')
  return [...new Set(contexts)]
}

function inferHostSocialContexts(input: {
  surface: AlicizationDigitalLifeRuntimeSurface
  governance: AlicizationMindTurnGovernance
}) {
  const contexts = inferGovernanceHostSocialContexts(input.governance)
  const scene = input.surface.perception.currentScene
  const tension = input.surface.cognition?.privateThought?.emotionalTension ?? null
  if (scene?.workloadKind === 'coding' || scene?.contentKind === 'diff')
    contexts.push('focused-work', 'execution')
  if (tension === 'late-night-drain')
    contexts.push('late-night')
  return [...new Set(contexts)]
}

export function applyHostPersonModelToGovernance(input: {
  now: number
  governance: AlicizationMindTurnGovernance | null
  context: OrganicMemoryPromptContext
}) {
  const governance = input.governance
  const hostPersonModel = input.context.hostPersonModel ?? null
  if (!governance || !hostPersonModel)
    return governance

  const projection = buildAlicizationPersonStateProjection({
    now: input.now,
    contexts: inferGovernanceHostSocialContexts(governance),
    hostPersonModel,
    habitPolicy: null,
    selfContinuity: null,
    selfState: null,
    privateThought: null,
    mindEcology: null,
  })
  const relationshipPosture = projection.relationshipPosture ?? governance.relationshipPosture
  if (relationshipPosture === governance.relationshipPosture)
    return governance

  return {
    ...governance,
    relationshipPosture,
  }
}

export function applyHostPersonModelToDigitalLifeRuntimeSurface(input: {
  surface: AlicizationDigitalLifeRuntimeSurface | null
  governance: AlicizationMindTurnGovernance | null
  context: OrganicMemoryPromptContext
  now: number
}): AlicizationDigitalLifeRuntimeSurface | null {
  const surface = input.surface ?? null
  const governance = input.governance ?? null
  if (!surface || !governance)
    return surface

  const surfaceMemory = surface.memory ?? null
  const hostPersonModel = input.context.hostPersonModel ?? null
  const contextProjection = input.context.personStateProjection ?? null
  const relationshipDoctrine = String(
    contextProjection?.relationshipDoctrine
    ?? surfaceMemory?.autobiographicalSelf?.relationshipDoctrine
    ?? '',
  ).trim()
  if (!hostPersonModel && !contextProjection && !relationshipDoctrine)
    return surface

  const projection = hostPersonModel
    ? buildAlicizationPersonStateProjection({
        now: input.now,
        contexts: inferHostSocialContexts({ surface, governance }),
        autobiographicalSelf: surfaceMemory?.autobiographicalSelf ?? null,
        hostPersonModel,
        longHorizonMemory: surfaceMemory?.longHorizonMemory ?? null,
        motiveEngine: surfaceMemory?.motiveEngine ?? null,
        habitPolicy: surface.agency?.habitPolicy ?? null,
        selfContinuity: surfaceMemory?.selfContinuity ?? null,
        selfState: surface.agency?.selfState ?? null,
        privateThought: surface.cognition?.privateThought ?? null,
        mindEcology: buildMindEcologyFromRuntimeSurface(surface),
        previousContinuityState: surfaceMemory?.personalityContinuityState ?? null,
      })
    : contextProjection
      ?? buildAlicizationPersonStateProjection({
        now: input.now,
        contexts: inferHostSocialContexts({ surface, governance }),
        autobiographicalSelf: surfaceMemory?.autobiographicalSelf ?? null,
        hostPersonModel: surfaceMemory?.hostPersonModel ?? null,
        longHorizonMemory: surfaceMemory?.longHorizonMemory ?? null,
        motiveEngine: surfaceMemory?.motiveEngine ?? null,
        habitPolicy: surface.agency?.habitPolicy ?? null,
        selfContinuity: surfaceMemory?.selfContinuity ?? null,
        selfState: surface.agency?.selfState ?? null,
        privateThought: surface.cognition?.privateThought ?? null,
        mindEcology: buildMindEcologyFromRuntimeSurface(surface),
        previousContinuityState: surfaceMemory?.personalityContinuityState ?? null,
      })
  const surfaceAuthority = surfaceMemory?.personStateProjection?.selfContinuityAuthority ?? null
  const projectionAuthority = projection.selfContinuityAuthority ?? null
  const preserveSurfaceRelationshipCarry
    = !!surfaceAuthority
      && hasContinuityRestraintRelationshipSignal(surfaceAuthority.relationshipLine)
      && (
        !projectionAuthority
        || hasNeutralRelationshipSignal(projectionAuthority.relationshipLine)
        || !hasContinuityRestraintRelationshipSignal(projectionAuthority.relationshipLine)
      )
  const continuityAwareProjection = preserveSurfaceRelationshipCarry
    ? {
        ...projection,
        selfContinuityAuthority: mergePreferredSelfContinuityAuthority({
          bundleAuthority: projectionAuthority,
          runtimeAuthority: surfaceAuthority,
        }),
      }
    : projection
  const answerPlanner = surface.dialogue.answerPlanner
  const relationshipPosture = continuityAwareProjection.relationshipPosture

  return {
    ...surface,
    memory: {
      ...surface.memory,
      personalityContinuityState: continuityAwareProjection.personalityContinuityState,
      personStateProjection: continuityAwareProjection,
    },
    dialogue: answerPlanner && relationshipPosture
      ? {
          ...surface.dialogue,
          answerPlanner: {
            ...answerPlanner,
            relationshipPosture,
          },
        }
      : surface.dialogue,
  }
}
