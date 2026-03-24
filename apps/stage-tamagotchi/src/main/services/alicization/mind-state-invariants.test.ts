import { describe, expect, it } from 'vitest'

import { stabilizeMindStateInvariants } from './mind-state-invariants'

describe('stabilizeMindStateInvariants', () => {
  it('synthesizes living world, governor, and thought thread when live world exists but slices collapse', () => {
    const stabilized = stabilizeMindStateInvariants({
      now: 120_000,
      watchMode: 'symbiotic-vision',
      currentScene: {
        workloadKind: 'coding',
        contentKind: 'error',
        scenario: 'coding',
        summary: 'TypeScript error in runtime.ts',
        source: 'screen-semantic-summary',
        confidence: 0.94,
        target: {
          appName: 'Cursor',
          processName: 'Cursor',
          title: 'runtime.ts - TypeScript error',
          pid: 7,
        },
        beganAt: 60_000,
        lastSeenAt: 120_000,
      },
      worldModel: {
        activeThread: {
          id: 'debugging::runtime.ts',
          kind: 'debugging',
          status: 'active',
          source: 'grounded-scene',
          title: 'TypeScript error in runtime.ts',
          summary: 'The host is pinned on a TypeScript error in runtime.ts.',
          confidence: 0.92,
          significance: 0.74,
          unresolved: true,
          beganAt: 60_000,
          lastUpdatedAt: 120_000,
          target: {
            appName: 'Cursor',
            processName: 'Cursor',
            title: 'runtime.ts - TypeScript error',
            pid: 7,
          },
        },
        lingeringThreads: [],
        focusTarget: {
          appName: 'Cursor',
          processName: 'Cursor',
          title: 'runtime.ts - TypeScript error',
          pid: 7,
        },
        epistemicState: {
          certainty: 'grounded',
          freshness: 'live',
          seenNow: ['scene:TypeScript error in runtime.ts'],
          inferredNow: ['thread:debugging'],
          openQuestions: ['What exactly is failing in the current error?'],
          staleRisks: [],
        },
        continuity: {
          label: 'staying-with-thread',
          sceneAgeMs: 60_000,
          attentionAgeMs: 60_000,
          sameSceneAsBefore: true,
          sameAttentionAsBefore: true,
          afterglowOpen: false,
        },
        hostState: {
          availability: 'focused',
          burden: 'moderate',
        },
        updatedAt: 120_000,
      },
      livingWorldState: null,
      relationshipModel: null,
      selfGovernor: null,
      thoughtThreads: null,
      privateThought: null,
    })

    expect(stabilized.livingWorldState?.focusObjectId).toBeTruthy()
    expect(stabilized.livingWorldState?.objects.length).toBeGreaterThan(0)
    expect(stabilized.selfGovernor?.dominantDrive).toBeTruthy()
    expect(stabilized.selfGovernor?.activeIntentions.length).toBeGreaterThan(0)
    expect(stabilized.thoughtThreads?.foregroundThreadId).toBeTruthy()
    expect(stabilized.thoughtThreads?.threads.length).toBeGreaterThan(0)
  })

  it('keeps empty slices empty when no live world anchor exists', () => {
    const stabilized = stabilizeMindStateInvariants({
      now: 1_000,
      watchMode: 'mnemonic-passive',
      currentScene: null,
      worldModel: null,
      livingWorldState: null,
      relationshipModel: null,
      selfGovernor: null,
      thoughtThreads: null,
      privateThought: null,
    })

    expect(stabilized.livingWorldState).toBeNull()
    expect(stabilized.selfGovernor).toBeNull()
    expect(stabilized.thoughtThreads).toBeNull()
  })
})
