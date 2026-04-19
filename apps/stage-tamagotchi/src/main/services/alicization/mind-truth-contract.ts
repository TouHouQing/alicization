import type { AlicizationVisualPresenceStateSnapshot } from '../../../shared/eventa'
import type { AlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'

export interface AlicizationMindTruthContract {
  truthState: 'live-grounded' | 'live-observed' | 'dialogue-grounded' | 'remembered' | 'imagined' | 'uncertain'
  canDescribeCurrentSceneAsFact: boolean
  shouldLabelMemory: boolean
  rationale: string
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
      rationale: 'The strongest current frame is still hypothesis or imagined world, not direct perception.',
    }
  }

  if (source === 'grounded-scene' && certainty === 'grounded' && freshness !== 'stale') {
    return {
      truthState: 'live-grounded',
      canDescribeCurrentSceneAsFact: true,
      shouldLabelMemory: false,
      rationale: 'Current screen facts come from fresh grounded visual evidence.',
    }
  }

  if ((source === 'observed-scene' || source === 'durability-pulse') && (certainty === 'observed' || certainty === 'grounded') && freshness === 'live') {
    return {
      truthState: 'live-observed',
      canDescribeCurrentSceneAsFact: true,
      shouldLabelMemory: false,
      rationale: 'Current screen facts come from live observation, but may still need one more grounding pass.',
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
      rationale: 'The active thread is being carried by continuity or working memory, not by fresh live evidence.',
    }
  }

  return {
    truthState: 'uncertain',
    canDescribeCurrentSceneAsFact: false,
    shouldLabelMemory: true,
    rationale: 'The current world is not stable enough to turn into present-tense facts yet.',
  }
}

export function buildMindTruthContractLines(input: AlicizationMindTruthSource) {
  const contract = deriveMindTruthContract(input)
  return {
    contract,
    lines: [
      '[ALICIZATION_TRUTH_CONTRACT]',
      `Truth state: ${contract.truthState}.`,
      `Current rationale: ${contract.rationale}`,
      `Present-tense screen claims allowed: ${contract.canDescribeCurrentSceneAsFact ? 'yes' : 'no'}.`,
      'Persona only shapes tone. It must never upgrade remembered, imagined, or unresolved content into current facts.',
      contract.truthState === 'imagined'
        ? 'If screen-related content comes from hypothesis, imagined repair, or unresolved inference, explicitly label it as a guess, tentative read, or what still needs grounding.'
        : contract.shouldLabelMemory
          ? 'If screen-related content comes from continuity, residue, or an unresolved hypothesis, explicitly label it as memory, residual impression, or uncertainty.'
          : 'If you mention the current screen, keep it tied to the freshest grounded evidence rather than old residue.',
    ],
  }
}
