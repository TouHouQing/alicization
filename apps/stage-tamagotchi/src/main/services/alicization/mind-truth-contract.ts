import type { AlicizationVisualPresenceStateSnapshot } from '../../../shared/eventa'
import type { AlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'

export interface AlicizationMindTruthContract {
  truthState: 'live-grounded' | 'live-observed' | 'dialogue-grounded' | 'remembered' | 'imagined' | 'uncertain'
  canDescribeCurrentSceneAsFact: boolean
  shouldLabelMemory: boolean
  reasonCode: 'ontology-imagined' | 'fresh-grounded-scene' | 'fresh-observed-scene' | 'memory-or-stale-carry' | 'uncertain-grounding'
  source: string | null
  certainty: string
  freshness: string
}

type AlicizationMindTruthSource
  = | Pick<AlicizationVisualPresenceStateSnapshot, 'currentScene' | 'worldModel' | 'worldOntology'>
    | AlicizationDigitalLifeRuntimeSurface

function resolveMindTruthSource(input: AlicizationMindTruthSource) {
  if ('version' in input) {
    return {
      currentScene: input.perception.currentScene ?? null,
      worldModel: input.world.worldModel ?? null,
      worldOntology: input.world.worldOntology ?? null,
    }
  }

  return input
}

export function deriveMindTruthContract(input: AlicizationMindTruthSource): AlicizationMindTruthContract {
  const state = resolveMindTruthSource(input)
  const dominantFrame = state.worldOntology?.dominantFrame ?? null
  const certainty = state.worldModel?.epistemicState.certainty ?? 'uncertain'
  const freshness = state.worldModel?.epistemicState.freshness ?? 'stale'
  const source = state.worldModel?.activeThread?.source ?? null

  if (dominantFrame === 'imagined' && state.worldOntology?.imagined) {
    return {
      truthState: 'imagined',
      canDescribeCurrentSceneAsFact: false,
      shouldLabelMemory: true,
      reasonCode: 'ontology-imagined',
      source,
      certainty,
      freshness,
    }
  }

  if (source === 'grounded-scene' && certainty === 'grounded' && freshness !== 'stale') {
    return {
      truthState: 'live-grounded',
      canDescribeCurrentSceneAsFact: true,
      shouldLabelMemory: false,
      reasonCode: 'fresh-grounded-scene',
      source,
      certainty,
      freshness,
    }
  }

  if ((source === 'observed-scene' || source === 'durability-pulse') && (certainty === 'observed' || certainty === 'grounded') && freshness === 'live') {
    return {
      truthState: 'live-observed',
      canDescribeCurrentSceneAsFact: true,
      shouldLabelMemory: false,
      reasonCode: 'fresh-observed-scene',
      source,
      certainty,
      freshness,
    }
  }

  if (
    dominantFrame === 'remembered'
    || source === 'continuity'
    || source === 'working-memory'
    || certainty === 'lingering'
    || freshness === 'stale'
  ) {
    return {
      truthState: 'remembered',
      canDescribeCurrentSceneAsFact: false,
      shouldLabelMemory: true,
      reasonCode: 'memory-or-stale-carry',
      source,
      certainty,
      freshness,
    }
  }

  return {
    truthState: 'uncertain',
    canDescribeCurrentSceneAsFact: false,
    shouldLabelMemory: true,
    reasonCode: 'uncertain-grounding',
    source,
    certainty,
    freshness,
  }
}
