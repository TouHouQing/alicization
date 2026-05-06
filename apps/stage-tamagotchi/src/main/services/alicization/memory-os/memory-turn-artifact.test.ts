import { describe, expect, it } from 'vitest'

import { buildAlicizationMemoryTurnArtifact } from './memory-turn-artifact'

describe('memory-turn-artifact', () => {
  it('summarizes humanlike recall stages without rendering fixed visible memory text', () => {
    const artifact = buildAlicizationMemoryTurnArtifact({
      context: {
        hostAttitude: 'focused',
        coreIncarnation: 'alice',
        activeThoughts: [],
        retrievedFacts: [{ id: 'fact-1' } as any],
        recalledFragments: [{ id: 'fragment-1' } as any],
        recalledEpisodes: [{
          id: 'episode-1',
          confidence: 0.82,
          provenance: 'remembered',
          semanticScore: 0.76,
          graphAffinity: 0.71,
          relationshipThreadMatch: 0.74,
        } as any],
        recalledConversationHistory: [{ turnId: 'turn-1' } as any],
        recollectionIntent: {
          shouldOpenRecollection: true,
          recollectionAgenda: ['repair the old misunderstanding'],
        } as any,
        memoryDeliberation: {
          shouldRecall: true,
          selectedEpisodeIds: ['episode-1'],
          stableCore: ['The host corrected the previous approach.'],
          unsafeDetails: ['Exact file path is not safe to claim.'],
          conflictSeverity: 'medium',
          surfacePolicy: 'gist-first',
          ambiguityPosture: 'approximate',
          whyNow: 'The current turn resembles the earlier correction.',
          inwardLine: 'Hold exact technical detail inward.',
          confidence: 0.74,
          followUpAffordance: {
            summary: 'Return to the repair line after payoff.',
            preferredTiming: 'after-payoff',
            intrusionRisk: 'medium',
            payoffDependency: 'requires-current-payoff',
          },
        } as any,
        recollectionSpeechPlan: {
          shouldSurface: true,
          surfaceMode: 'gist-first',
          placement: 'inside-payoff',
          certainty: 'approximate',
          styleNote: 'Let memory guide tone, not wording.',
        } as any,
        memoryResolutionLedger: {
          version: 'memory-resolution-ledger-v1',
          producedAt: 42,
          dominantClusterId: 'cluster-correction',
          dominantClusterSummary: 'Earlier correction',
          competingClusterId: 'cluster-wrong-thread',
          competingClusterSummary: 'Wrong thread',
          candidates: [],
          selectedCandidates: [],
          rejectedCandidates: [],
          finalSurfacePolicy: 'gist-first',
          shouldStayInward: false,
          shouldDelayUntilAfterPayoff: false,
          stableCoreOnly: false,
          suppressionTags: ['wrong-thread', 'unsupported-specificity'],
          closureState: 'approximate-recall',
          surfaceConfidence: 0.68,
          shouldLabelUncertainty: true,
          visibleCarryMode: 'gist-only',
          conflictPressure: 'medium',
          retrievalQuality: 'medium',
          finalRationale: 'Select stable core only.',
        },
      },
      retrievalPolicySnapshot: {
        policy: {
          reasonCodes: ['low-recall'],
        },
        plan: {
          prewarmKey: 'policy-turn-1',
        },
      } as any,
      latencyMs: 42,
    })

    expect(artifact.policySnapshotId).toBe('policy-turn-1')
    expect(artifact.recallIntent.shouldRecall).toBe(true)
    expect(artifact.competition.selectedCandidateCount).toBeGreaterThan(0)
    expect(artifact.competition.wrongThreadSuppressedCount).toBe(1)
    expect(artifact.candidates.retrievalCandidateIds).toEqual(expect.arrayContaining(['fact-1', 'fragment-1', 'episode-1', 'turn-1']))
    expect(artifact.candidates.selectedCandidateIds).toContain('episode-1')
    expect(artifact.candidates.topRankedCandidates[0]).toEqual(expect.objectContaining({
      id: 'episode-1',
      kind: 'episode',
      selected: true,
      provenance: 'remembered',
    }))
    expect(artifact.candidates.topRankedCandidates[0]?.finalScore ?? 0).toBeGreaterThan(0.6)
    expect(artifact.candidates.topRankedCandidates[0]?.reasons).toEqual(expect.arrayContaining([
      'selected-by-deliberation',
      'graph-affinity',
      'relationship-thread-match',
    ]))
    expect(artifact.deliberation.unsafeDetails).toContain('Exact file path is not safe to claim.')
    expect(artifact.deliberation.ambiguityPosture).toBe('approximate')
    expect(artifact.deliberation.followUp).toEqual(expect.objectContaining({
      preferredTiming: 'after-payoff',
      intrusionRisk: 'medium',
    }))
    expect(artifact.speechPosture.styleNote).toBe('Let memory guide tone, not wording.')
    expect(artifact.closure).toEqual(expect.objectContaining({
      closureState: 'approximate-recall',
      visibleCarryMode: 'gist-only',
      retrievalQuality: 'medium',
      shouldLabelUncertainty: true,
    }))
    expect(artifact.metrics.unsupportedSpecificityBlockedCount).toBe(1)
    expect(artifact.metrics.recallReadiness).toBeGreaterThan(0.4)
    expect(artifact.metrics.precisionProxy).toBeGreaterThan(0.4)
    expect(artifact.metrics.wrongThreadRisk).toBeGreaterThan(0)
    expect(artifact.visibleMemoryGate.status).toBe('inward-only')
    expect(artifact.visibleMemoryGate.reasons).toEqual(expect.arrayContaining([
      'precision-proxy-low',
    ]))
    expect(artifact.withheld).toEqual(expect.arrayContaining([
      'wrong-thread-suppressed',
      'unsafe-specificity-withheld',
      'visible-memory-gate-inward-only',
      'uncertainty-label-required',
    ]))
  })
})
