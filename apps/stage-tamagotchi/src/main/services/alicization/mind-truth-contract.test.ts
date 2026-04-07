import { describe, expect, it } from 'vitest'

import { buildAlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'
import { buildMindTruthContractLines, deriveMindTruthContract } from './mind-truth-contract'

describe('deriveMindTruthContract', () => {
  it('treats grounded live scenes as current facts', () => {
    const contract = deriveMindTruthContract({
      currentScene: null,
      worldModel: {
        activeThread: {
          id: 'thread',
          kind: 'debugging',
          status: 'active',
          source: 'grounded-scene',
          title: 'TypeScript error',
          summary: 'The host is staring at a TypeScript error.',
          confidence: 0.95,
          significance: 0.72,
          unresolved: true,
          beganAt: 0,
          lastUpdatedAt: 10_000,
          target: null,
        },
        lingeringThreads: [],
        focusTarget: null,
        epistemicState: {
          certainty: 'grounded',
          freshness: 'live',
          seenNow: [],
          inferredNow: [],
          openQuestions: [],
          staleRisks: [],
        },
        continuity: {
          label: 'staying-with-thread',
          sceneAgeMs: 10_000,
          attentionAgeMs: 10_000,
          sameSceneAsBefore: true,
          sameAttentionAsBefore: true,
          afterglowOpen: false,
        },
        hostState: {
          availability: 'focused',
          burden: 'moderate',
        },
        updatedAt: 10_000,
      },
    })

    expect(contract.truthState).toBe('live-grounded')
    expect(contract.canDescribeCurrentSceneAsFact).toBe(true)
  })

  it('treats continuity-carried threads as remembered rather than current facts', () => {
    const contract = deriveMindTruthContract({
      currentScene: null,
      worldModel: {
        activeThread: {
          id: 'thread',
          kind: 'browsing',
          status: 'lingering',
          source: 'continuity',
          title: 'Old Chrome page',
          summary: 'A carried browser page from before.',
          confidence: 0.58,
          significance: 0.4,
          unresolved: false,
          beganAt: 0,
          lastUpdatedAt: 10_000,
          target: null,
        },
        lingeringThreads: [],
        focusTarget: null,
        epistemicState: {
          certainty: 'lingering',
          freshness: 'recent',
          seenNow: [],
          inferredNow: [],
          openQuestions: [],
          staleRisks: ['Old thread may be leaking into current understanding.'],
        },
        continuity: {
          label: 'afterglow',
          sceneAgeMs: 10_000,
          attentionAgeMs: 10_000,
          sameSceneAsBefore: false,
          sameAttentionAsBefore: false,
          afterglowOpen: true,
        },
        hostState: {
          availability: 'open',
          burden: 'light',
        },
        updatedAt: 10_000,
      },
    })

    expect(contract.truthState).toBe('remembered')
    expect(contract.canDescribeCurrentSceneAsFact).toBe(false)
    expect(buildMindTruthContractLines({
      currentScene: null,
      worldModel: {
        activeThread: {
          id: 'thread',
          kind: 'browsing',
          status: 'lingering',
          source: 'continuity',
          title: 'Old Chrome page',
          summary: 'A carried browser page from before.',
          confidence: 0.58,
          significance: 0.4,
          unresolved: false,
          beganAt: 0,
          lastUpdatedAt: 10_000,
          target: null,
        },
        lingeringThreads: [],
        focusTarget: null,
        epistemicState: {
          certainty: 'lingering',
          freshness: 'recent',
          seenNow: [],
          inferredNow: [],
          openQuestions: [],
          staleRisks: [],
        },
        continuity: {
          label: 'afterglow',
          sceneAgeMs: 10_000,
          attentionAgeMs: 10_000,
          sameSceneAsBefore: false,
          sameAttentionAsBefore: false,
          afterglowOpen: true,
        },
        hostState: {
          availability: 'open',
          burden: 'light',
        },
        updatedAt: 10_000,
      },
    }).lines.join('\n')).toContain('Present-tense screen claims allowed: no.')
  })

  it('treats hypothesis-led world state as imagined rather than current fact', () => {
    const contract = deriveMindTruthContract({
      currentScene: null,
      worldModel: {
        activeThread: null,
        lingeringThreads: [],
        focusTarget: null,
        epistemicState: {
          certainty: 'uncertain',
          freshness: 'stale',
          seenNow: [],
          inferredNow: [],
          openQuestions: ['The host may still be inspecting a risky diff.'],
          staleRisks: [],
        },
        continuity: {
          label: 'scene-shift',
          sceneAgeMs: 15_000,
          attentionAgeMs: 15_000,
          sameSceneAsBefore: false,
          sameAttentionAsBefore: false,
          afterglowOpen: false,
        },
        hostState: {
          availability: 'open',
          burden: 'light',
        },
        updatedAt: 10_000,
      },
      worldOntology: {
        dominantFrame: 'imagined',
        truthPriority: ['imagined'],
        live: null,
        remembered: null,
        imagined: {
          kind: 'imagined',
          summary: 'The host may still be inspecting a risky diff.',
          confidence: 0.64,
          stability: 0.4,
          focusHypothesisId: 'hypothesis::diff',
          evidence: ['hypothesis:problem-locus/active'],
        },
        updatedAt: 10_000,
      },
    })

    expect(contract.truthState).toBe('imagined')
    expect(contract.canDescribeCurrentSceneAsFact).toBe(false)
    expect(contract.rationale).toContain('hypothesis')
  })

  it('accepts the digital-life runtime surface as truth input', () => {
    const contract = deriveMindTruthContract(buildAlicizationDigitalLifeRuntimeSurface({
      watchMode: 'symbiotic-vision',
      currentScene: null,
      attention: null,
      workingMemoryEpisodes: [],
      worldModel: {
        activeThread: {
          id: 'thread-surface',
          kind: 'debugging',
          status: 'active',
          source: 'grounded-scene',
          title: 'Runtime surface thread',
          summary: 'The truth contract should read from the runtime surface.',
          confidence: 0.9,
          significance: 0.7,
          unresolved: true,
          beganAt: 0,
          lastUpdatedAt: 12_000,
          target: null,
        },
        lingeringThreads: [],
        focusTarget: null,
        epistemicState: {
          certainty: 'grounded',
          freshness: 'live',
          seenNow: [],
          inferredNow: [],
          openQuestions: [],
          staleRisks: [],
        },
        continuity: {
          label: 'same-thread',
          sceneAgeMs: 12_000,
          attentionAgeMs: 12_000,
          sameSceneAsBefore: true,
          sameAttentionAsBefore: true,
          afterglowOpen: false,
        },
        hostState: {
          availability: 'focused',
          burden: 'moderate',
        },
        updatedAt: 12_000,
      },
      worldOntology: {
        dominantFrame: 'grounded',
        truthPriority: ['grounded'],
        live: null,
        remembered: null,
        imagined: null,
        updatedAt: 12_000,
      },
      privateThought: null,
      captureState: {
        permission: 'granted',
        lastGroundedAt: 12_000,
      },
      durabilityPulse: null,
      recentTransition: null,
      nextSuggestedProbeMs: 15_000,
      updatedAt: 12_000,
    } as any))

    expect(contract.truthState).toBe('live-grounded')
    expect(contract.canDescribeCurrentSceneAsFact).toBe(true)
  })
})
