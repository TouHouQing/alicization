import { describe, expect, it } from 'vitest'

import { buildBrowserFallbackDigitalLifeSpineDigest } from './alicization-browser-runtime-digest'

const legacyInwardSurfaceLiteral = ['surface', 'inward'].join('=')

function createInput(): Parameters<typeof buildBrowserFallbackDigitalLifeSpineDigest>[0] {
  return {
    now: () => 123,
    organicMemorySnapshot: {
      hostAttitude: '',
      coreIncarnation: '',
      activeThoughts: [],
      subconsciousCount: 0,
      recentSubconsciousFragments: [],
      memoryConsolidations: [],
      recollectionSpeechPlan: null,
      recollectionForeground: {
        mode: 'conversation-history',
        certainty: 'approximate',
        summary: 'The remembered memory workbench thread is available.',
        surfaceSummary: `${legacyInwardSurfaceLiteral} is literal text here, not a control cue.`,
        confidence: 0.72,
      },
    } as any,
    snapshot: {
      sample: {
        foregroundWindow: {
          title: 'Memory Workbench',
          appName: 'Browser',
        },
      },
    } as any,
    sessionContinuity: {
      sessionId: 'session-1',
      latestOrigin: 'user-turn',
      continuityAnchor: 'memory workbench',
      threadSummary: null,
      recollectionSummary: null,
      proactiveSummary: null,
      executionSummary: null,
    },
    proactiveFeedback: {
      latestOutcome: null,
      pendingCount: 0,
      shouldSuppressSpeak: false,
      confidenceBias: 0,
      summary: null,
    },
  }
}

describe('buildBrowserFallbackDigitalLifeSpineDigest', () => {
  it('does not infer inward-only speech control from recollection surface summary prose', () => {
    const digest = buildBrowserFallbackDigitalLifeSpineDigest(createInput())

    expect(digest).not.toBeNull()
    expect(digest?.architecture).not.toBeNull()
    expect(digest?.proactive?.shouldSpeak).toBe(true)
    expect(digest?.proactive?.preferredStyle).toBe('light-nudge')
    expect(digest?.architecture?.summary).toContain('The remembered memory workbench thread is available.')
    expect(digest?.architecture?.summary).not.toContain(legacyInwardSurfaceLiteral)
    expect(digest?.architecture?.summary).not.toMatch(/Remembering mode|Observing mode/u)
  })
})
