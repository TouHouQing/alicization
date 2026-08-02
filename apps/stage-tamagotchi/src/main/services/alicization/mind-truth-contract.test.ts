import { describe, expect, it } from 'vitest'

import { deriveMindTruthContract } from './mind-truth-contract'

function createWorldModel(input: {
  certainty: 'grounded' | 'observed' | 'lingering' | 'uncertain'
  freshness: 'live' | 'recent' | 'stale'
  source: 'grounded-scene' | 'observed-scene' | 'continuity' | 'working-memory'
}) {
  return {
    activeThread: {
      source: input.source,
    },
    epistemicState: {
      certainty: input.certainty,
      freshness: input.freshness,
    },
  } as any
}

describe('deriveMindTruthContract', () => {
  it('treats fresh grounded scenes as current facts', () => {
    const contract = deriveMindTruthContract({
      currentScene: null,
      worldModel: createWorldModel({
        certainty: 'grounded',
        freshness: 'live',
        source: 'grounded-scene',
      }),
      worldOntology: null,
    })
    expect(contract).toMatchObject({
      truthState: 'live-grounded',
      canDescribeCurrentSceneAsFact: true,
      shouldLabelMemory: false,
      reasonCode: 'fresh-grounded-scene',
      source: 'grounded-scene',
      certainty: 'grounded',
      freshness: 'live',
    })
    expect('rationale' in contract).toBe(false)
  })

  it('keeps continuity-carried state out of present-tense fact authority', () => {
    const contract = deriveMindTruthContract({
      currentScene: null,
      worldModel: createWorldModel({
        certainty: 'lingering',
        freshness: 'recent',
        source: 'continuity',
      }),
      worldOntology: null,
    })
    expect(contract).toMatchObject({
      truthState: 'remembered',
      canDescribeCurrentSceneAsFact: false,
      shouldLabelMemory: true,
      reasonCode: 'memory-or-stale-carry',
      source: 'continuity',
      certainty: 'lingering',
      freshness: 'recent',
    })
    expect('rationale' in contract).toBe(false)
  })

  it('treats imagined ontology as non-factual', () => {
    const contract = deriveMindTruthContract({
      currentScene: null,
      worldModel: null,
      worldOntology: {
        dominantFrame: 'imagined',
        imagined: {
          kind: 'imagined',
        },
      } as any,
    })
    expect(contract).toMatchObject({
      truthState: 'imagined',
      canDescribeCurrentSceneAsFact: false,
      shouldLabelMemory: true,
      reasonCode: 'ontology-imagined',
      source: null,
      certainty: 'uncertain',
      freshness: 'stale',
    })
    expect('rationale' in contract).toBe(false)
  })
})
