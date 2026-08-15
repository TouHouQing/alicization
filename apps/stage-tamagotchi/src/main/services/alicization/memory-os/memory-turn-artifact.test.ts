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
      } as any,
      retrievalPolicySnapshot: {
        policy: {
          reasonCodes: ['low-recall'],
        },
        plan: {
          prewarmKey: 'policy-turn-1',
        },
      } as any,
      latencyMs: 42,
      nowMs: 42,
    })

    expect(artifact.policySnapshotId).toBe('policy-turn-1')
    expect(artifact.recallIntent.shouldRecall).toBe(true)
    expect(artifact.competition.selectedCandidateCount).toBeGreaterThan(0)
    expect(artifact.competition.wrongThreadSuppressedCount).toBe(1)
    expect(artifact.candidates.retrievalCandidateIds).toEqual(expect.arrayContaining(['fact-1', 'fragment-1', 'episode-1']))
    expect(artifact.candidates.retrievalCandidateIds).not.toContain('turn-1')
    expect(artifact.candidates).not.toHaveProperty('recalledConversationHistory')
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
    expect(artifact.speechPosture).toEqual(expect.objectContaining({
      shouldSurface: true,
      surfaceMode: 'gist-first',
      placement: 'inside-payoff',
      certainty: 'approximate',
    }))
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

  it('uses explicit nowMs for deterministic recency and detects wrong-thread candidates from retrieval signals', () => {
    const freshAt = 1_000_000
    const oldAt = freshAt - 90 * 24 * 60 * 60 * 1000
    const artifact = buildAlicizationMemoryTurnArtifact({
      context: {
        hostAttitude: 'focused',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [{
          id: 'fresh-selected',
          confidence: 0.8,
          provenance: 'remembered',
          semanticScore: 0.72,
          relationshipThreadMatch: 0.82,
          updatedAt: freshAt,
        } as any],
        recalledFragments: [{
          id: 'wrong-thread-candidate',
          confidence: 0.74,
          provenance: 'remembered',
          semanticScore: 0.78,
          relationshipThreadMatch: 0.18,
          conflictPenalty: 0.62,
          updatedAt: oldAt,
        } as any],
        memoryDeliberation: {
          shouldRecall: true,
          selectedEraIds: [],
          selectedConsolidationIds: [],
          selectedWindowIds: [],
          selectedProcedureIds: [],
          selectedEpisodeIds: [],
          selectedBundles: [{
            id: 'bundle-current-thread',
            summary: 'Use current thread.',
            confidence: 0.81,
            periodId: null,
            episodeId: null,
            procedureId: null,
            relationshipLine: null,
          }],
          stableCore: ['Use current thread.'],
          unsafeDetails: [],
          conflictSeverity: 'low',
          surfacePolicy: 'gist-first',
          ambiguityPosture: 'approximate',
          whyNow: 'Compare current and wrong thread.',
          inwardLine: 'Reject wrong thread.',
          confidence: 0.81,
        } as any,
        recollectionSpeechPlan: {
          shouldSurface: true,
          surfaceMode: 'gist-first',
          placement: 'inside-payoff',
          certainty: 'approximate',
          confidence: 0.81,
        } as any,
      },
      latencyMs: 20,
      nowMs: freshAt,
    })

    const fresh = artifact.candidates.topRankedCandidates.find(candidate => candidate.id === 'fresh-selected')
    const wrong = artifact.candidates.topRankedCandidates.find(candidate => candidate.id === 'wrong-thread-candidate')
    expect(fresh?.reasons).toContain('recency-signal')
    expect(wrong?.reasons).toEqual(expect.arrayContaining([
      'recency-signal',
      'conflict-penalty',
      'relationship-thread-match',
    ]))
    expect(artifact.competition.wrongThreadCandidateIds).toContain('wrong-thread-candidate')
    expect(artifact.competition.conflictCandidateIds).toContain('wrong-thread-candidate')
    expect(artifact.metrics.conflictCandidateCount).toBe(1)
    expect(artifact.metrics.wrongThreadRisk).toBeGreaterThan(0.2)
  })

  it('rejects situation candidates that carry an unsupported raw-turn source', () => {
    const artifact = buildAlicizationMemoryTurnArtifact({
      context: {
        hostAttitude: 'focused',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
        recalledEpisodes: [],
        memorySituationCandidates: {
          version: 'memory-situation-candidates-v1',
          producedAt: 1,
          queryTexts: [],
          candidates: [{
            candidateId: 'raw-turn-situation',
            sourceKinds: ['conversation-turn'],
            situationKind: 'episodic-scene',
            eraKey: null,
            relationshipArcKey: null,
            procedureKey: null,
            selfModelKey: null,
            worldClaimKeys: [],
            selectedEvidenceIds: ['turn-raw'],
            competingCandidateIds: [],
            suppressionReasons: [],
            confidence: 0.9,
            latencyCost: 0.1,
            status: 'selected',
            statusReason: null,
            summary: 'Raw transcript content must not become a long-term situation candidate.',
            evidenceSummary: null,
          }],
          selected: [],
          rejected: [],
          suppressed: [],
          delayed: [],
          unresolved: [],
        },
      } as any,
      nowMs: 1,
    })

    expect(artifact.candidates.retrievalCandidateIds).not.toContain('raw-turn-situation')
  })

  it('rejects situation candidates whose evidence ids have no long-term owner in the current context', () => {
    const artifact = buildAlicizationMemoryTurnArtifact({
      context: {
        hostAttitude: 'focused',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
        recalledEpisodes: [],
        memorySituationCandidates: {
          version: 'memory-situation-candidates-v1',
          producedAt: 1,
          queryTexts: [],
          candidates: [{
            candidateId: 'unowned-turn-situation',
            sourceKinds: ['event-graph', 'episodic-event'],
            situationKind: 'episodic-scene',
            eraKey: null,
            relationshipArcKey: null,
            procedureKey: null,
            selfModelKey: null,
            worldClaimKeys: [],
            selectedEvidenceIds: ['turn-raw'],
            competingCandidateIds: [],
            suppressionReasons: [],
            confidence: 0.9,
            latencyCost: 0.1,
            status: 'selected',
            statusReason: null,
            summary: 'Allowed source kinds cannot self-authorize an arbitrary turn id.',
            evidenceSummary: null,
          }],
          selected: [],
          rejected: [],
          suppressed: [],
          delayed: [],
          unresolved: [],
        },
      } as any,
      nowMs: 1,
    })

    expect(artifact.candidates.retrievalCandidateIds).not.toContain('unowned-turn-situation')
  })

  it('does not let a claim graph sourceId self-authorize a raw turn as long-term evidence', () => {
    const artifact = buildAlicizationMemoryTurnArtifact({
      context: {
        hostAttitude: 'focused',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
        recalledEpisodes: [],
        claimEvidenceGraphs: [{
          claimId: 'claim-owner',
          claim: 'A long-term claim exists.',
          status: 'supported',
          confidence: 0.8,
          supportingEvidence: [{
            evidenceId: 'evidence-owner',
            sourceId: 'turn-raw',
            sourceKind: 'conversation-turn',
            summary: 'Raw transcript evidence must not grant ownership to its turn id.',
            confidence: 0.8,
          }],
          contradictingEvidence: [],
        }],
        memorySituationCandidates: {
          version: 'memory-situation-candidates-v1',
          producedAt: 1,
          queryTexts: [],
          candidates: [{
            candidateId: 'claim-source-self-authorized',
            sourceKinds: ['event-graph'],
            situationKind: 'episodic-scene',
            eraKey: null,
            relationshipArcKey: null,
            procedureKey: null,
            selfModelKey: null,
            worldClaimKeys: [],
            selectedEvidenceIds: ['turn-raw'],
            competingCandidateIds: [],
            suppressionReasons: [],
            confidence: 0.9,
            latencyCost: 0.1,
            status: 'selected',
            statusReason: null,
            summary: 'A raw source id must not self-authorize through the claim graph.',
            evidenceSummary: null,
          }],
          selected: [],
          rejected: [],
          suppressed: [],
          delayed: [],
          unresolved: [],
        },
      } as any,
      nowMs: 1,
    })

    expect(artifact.candidates.retrievalCandidateIds).not.toContain('claim-source-self-authorized')
  })

  it.each([
    [
      'conversation-turn transcript evidence',
      {
        evidenceId: 'transcript-evidence-owner',
        sourceId: 'turn-raw',
        sourceKind: 'conversation-turn',
      },
      'transcript-evidence-owner',
    ],
    [
      'a normalized evidenceId/sourceId alias',
      {
        evidenceId: ' alias-owner ',
        sourceId: 'alias-owner',
        sourceKind: 'memory-fact',
      },
      'alias-owner',
    ],
  ])('does not let %s become a long-term evidence owner', (_name, evidence, selectedEvidenceId) => {
    const artifact = buildAlicizationMemoryTurnArtifact({
      context: {
        hostAttitude: 'focused',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
        recalledEpisodes: [],
        claimEvidenceGraphs: [{
          claimId: 'claim-owner',
          supportingEvidence: [{
            ...evidence,
            summary: 'This evidence must not self-authorize a situation candidate.',
          }],
          contradictingEvidence: [],
        }],
        memorySituationCandidates: {
          version: 'memory-situation-candidates-v1',
          producedAt: 1,
          queryTexts: [],
          candidates: [{
            candidateId: `self-authorized:${selectedEvidenceId}`,
            sourceKinds: ['event-graph'],
            selectedEvidenceIds: [selectedEvidenceId],
            competingCandidateIds: [],
            suppressionReasons: [],
            confidence: 0.9,
            status: 'selected',
            summary: 'An invalid evidence owner must not authorize this candidate.',
          }],
          selected: [],
          rejected: [],
          suppressed: [],
          delayed: [],
          unresolved: [],
        },
      } as any,
      nowMs: 1,
    })

    expect(artifact.candidates.retrievalCandidateIds).not.toContain(`self-authorized:${selectedEvidenceId}`)
  })

  it('keeps independent claim evidence ids and explicit remembered or consolidated owners', () => {
    const artifact = buildAlicizationMemoryTurnArtifact({
      context: {
        hostAttitude: 'focused',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [{ id: 'remembered-owner' } as any],
        recalledFragments: [],
        recalledEpisodes: [],
        consolidatedMemories: [{ id: 'consolidated-owner', derivedEventIds: [] } as any],
        claimEvidenceGraphs: [{
          claimId: 'claim-owner',
          supportingEvidence: [{
            evidenceId: 'independent-evidence-owner',
            sourceId: 'remembered-owner',
            sourceKind: 'memory-fact',
            summary: 'A distinct long-term evidence node.',
          }],
          contradictingEvidence: [],
        }],
        memorySituationCandidates: {
          version: 'memory-situation-candidates-v1',
          producedAt: 1,
          queryTexts: [],
          candidates: [{
            candidateId: 'explicit-long-term-owners',
            sourceKinds: ['event-graph', 'fact', 'consolidation'],
            selectedEvidenceIds: [
              'independent-evidence-owner',
              'remembered-owner',
              'consolidated-owner',
            ],
            competingCandidateIds: [],
            suppressionReasons: [],
            confidence: 0.9,
            status: 'selected',
            summary: 'Independent and explicit long-term owners remain valid.',
          }],
          selected: [],
          rejected: [],
          suppressed: [],
          delayed: [],
          unresolved: [],
        },
      } as any,
      nowMs: 1,
    })

    expect(artifact.candidates.retrievalCandidateIds).toContain('explicit-long-term-owners')
  })

  it('keeps situation candidates whose evidence ids belong to current long-term owners', () => {
    const artifact = buildAlicizationMemoryTurnArtifact({
      context: {
        hostAttitude: 'focused',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [{ id: 'fact-owner' } as any],
        recalledFragments: [],
        recalledEpisodes: [{ id: 'event-owner' } as any],
        recollectedWindows: [{ id: 'window-owner' } as any],
        consolidatedMemories: [{
          id: 'consolidation-owner',
          derivedEventIds: ['derived-event-owner'],
        } as any],
        proceduralMemories: [{ id: 'procedure-owner' } as any],
        memorySituationCandidates: {
          version: 'memory-situation-candidates-v1',
          producedAt: 1,
          queryTexts: [],
          candidates: [{
            candidateId: 'owned-situation',
            sourceKinds: ['event-graph', 'episodic-event', 'fact', 'consolidation', 'procedure'],
            situationKind: 'mixed',
            eraKey: null,
            relationshipArcKey: null,
            procedureKey: 'procedure-owner',
            selfModelKey: null,
            worldClaimKeys: [],
            selectedEvidenceIds: [
              'fact-owner',
              'event-owner',
              'window-owner',
              'consolidation-owner',
              'derived-event-owner',
              'procedure-owner',
            ],
            competingCandidateIds: [],
            suppressionReasons: [],
            confidence: 0.9,
            latencyCost: 0.1,
            status: 'selected',
            statusReason: null,
            summary: 'Every selected evidence id has a current long-term owner.',
            evidenceSummary: null,
          }],
          selected: [],
          rejected: [],
          suppressed: [],
          delayed: [],
          unresolved: [],
        },
      } as any,
      nowMs: 1,
    })

    expect(artifact.candidates.retrievalCandidateIds).toContain('owned-situation')
  })

  it('rejects a situation candidate when the eleventh source kind is a deleted transcript kind', () => {
    const artifact = buildAlicizationMemoryTurnArtifact({
      context: {
        hostAttitude: 'focused',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [{ id: 'fact-owner' } as any],
        recalledFragments: [],
        recalledEpisodes: [],
        memorySituationCandidates: {
          version: 'memory-situation-candidates-v1',
          producedAt: 1,
          queryTexts: [],
          candidates: [{
            candidateId: 'source-kind-overflow',
            sourceKinds: [
              ...Array.from({ length: 10 }, () => 'fact'),
              'conversation-turn',
            ],
            situationKind: 'semantic-update',
            eraKey: null,
            relationshipArcKey: null,
            procedureKey: null,
            selfModelKey: null,
            worldClaimKeys: [],
            selectedEvidenceIds: ['fact-owner'],
            competingCandidateIds: [],
            suppressionReasons: [],
            confidence: 0.9,
            latencyCost: 0.1,
            status: 'selected',
            statusReason: null,
            summary: 'The overflow source kind must be validated before applying the budget.',
            evidenceSummary: null,
          }],
          selected: [],
          rejected: [],
          suppressed: [],
          delayed: [],
          unresolved: [],
        },
      } as any,
      nowMs: 1,
    })

    expect(artifact.candidates.retrievalCandidateIds).not.toContain('source-kind-overflow')
  })

  it('rejects a situation candidate when the twenty-fifth evidence id has no long-term owner', () => {
    const ownerIds = Array.from({ length: 24 }, (_, index) => `fact-owner-${index + 1}`)
    const artifact = buildAlicizationMemoryTurnArtifact({
      context: {
        hostAttitude: 'focused',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: ownerIds.map(id => ({ id })) as any,
        recalledFragments: [],
        recalledEpisodes: [],
        memorySituationCandidates: {
          version: 'memory-situation-candidates-v1',
          producedAt: 1,
          queryTexts: [],
          candidates: [{
            candidateId: 'evidence-overflow',
            sourceKinds: ['fact'],
            situationKind: 'semantic-update',
            eraKey: null,
            relationshipArcKey: null,
            procedureKey: null,
            selfModelKey: null,
            worldClaimKeys: [],
            selectedEvidenceIds: [...ownerIds, 'turn-raw'],
            competingCandidateIds: [],
            suppressionReasons: [],
            confidence: 0.9,
            latencyCost: 0.1,
            status: 'selected',
            statusReason: null,
            summary: 'The overflow evidence id must be validated before applying the budget.',
            evidenceSummary: null,
          }],
          selected: [],
          rejected: [],
          suppressed: [],
          delayed: [],
          unresolved: [],
        },
      } as any,
      nowMs: 1,
    })

    expect(artifact.candidates.retrievalCandidateIds).not.toContain('evidence-overflow')
  })

  it('builds one lived memory situation candidate that carries relationship context, host attitude, affective residue, execution result, and embodiment cadence together', () => {
    const situationCandidate = {
      candidateId: 'memory-situation:1',
      sourceKinds: ['event-graph', 'episodic-event', 'relationship', 'procedure'],
      situationKind: 'mixed',
      eraKey: 'phase-1-runtime-seam',
      relationshipArcKey: 'same-person-continuity',
      procedureKey: 'execution-callback-line',
      selfModelKey: null,
      worldClaimKeys: [],
      selectedEvidenceIds: ['episode-1', 'event-1'],
      competingCandidateIds: [],
      suppressionReasons: [],
      confidence: 0.87,
      latencyCost: 0.18,
      status: 'selected',
      statusReason: 'cross-source same-person continuity seam stayed dominant',
      summary: 'The host was not asking for a generic progress recap; they were testing whether Alicization stayed the identity continuity across the unfinished seam.',
      evidenceSummary: 'execution result callback | same-person continuity check | focused-work boundary',
    } as const

    const artifact = buildAlicizationMemoryTurnArtifact({
      context: {
        hostAttitude: '宿主更在意她别又断线成工具壳，而不是只给一个进度汇报。',
        coreIncarnation: 'alice',
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
        recalledEpisodes: [{ id: 'episode-1' }, { id: 'event-1' }] as any,
        memorySituationCandidates: {
          version: 'memory-situation-candidates-v1',
          producedAt: 1_200_000,
          queryTexts: ['same-person continuity check', 'execution result callback', 'focused-work boundary'],
          candidates: [situationCandidate as any],
          selected: [situationCandidate as any],
          rejected: [],
          suppressed: [],
          delayed: [],
          unresolved: [],
        },
        affectiveResidue: {
          version: 'affective-residue-memory-v1',
          updatedAt: 1_200_000,
          residues: [],
          dominantResidueKind: 'unfinishedness',
          afterglowPressure: 0.41,
          repairPressure: 0.32,
          burdenPressure: 0.18,
          trustPressure: 0.44,
          restProtectivePressure: 0.12,
          relationshipCadence: {
            stance: 'measured-return',
            posture: 'lower-pressure',
            why: 'The same line should come back gently instead of widening too fast.',
          },
          sourceSignals: ['unfinishedness', 'same-person continuity'],
          summary: '未完成感还在，但这次更该低压、克制、沿着同一条线接回去。',
        } as any,
        learningExecutionState: {
          currentTaskId: 'task-memory-closure',
          currentStatus: 'completed',
          currentAttemptCount: 1,
          currentMaxAttempts: 1,
          currentNextRetryAt: null,
          currentBlockedReason: null,
          currentFailureKind: null,
          nextLearningAction: 'verify',
          shouldRecord: false,
          shouldReflect: false,
          shouldVerify: true,
          shouldRevise: false,
          shouldInternalize: false,
          activeLearningFocuses: ['memory closure', 'same-person continuity'],
          queuedTaskCount: 0,
          runningTaskCount: 0,
          blockedTaskCount: 0,
          recentTaskIds: ['task-memory-closure'],
          lastCompletedTaskId: 'task-execution-callback',
          lastCompletedAction: 'verify',
          lastCompletedSummary: 'The execution result callback landed and the host accepted the same-line carry.',
          lastFailureTaskId: null,
          lastFailureKind: null,
          lastFailureReason: null,
          lastFailureNextRetryAt: null,
          updatedAt: 1_200_000,
        },
        personStateProjection: {
          relationshipDoctrine: 'Do not let the continuity state flatten into a generic tool shell.',
          summary: 'Measured-return continuity should stay visible across reply, memory, and body.',
        } as any,
        memoryDeliberation: {
          shouldRecall: true,
          selectedBundles: [{
            id: 'memory-situation:1',
            summary: 'same-person continuity seam',
            confidence: 0.87,
            periodId: null,
            episodeId: null,
            procedureId: null,
            relationshipLine: 'same-person continuity',
          }],
          stableCore: ['The host cared more about same-person continuity than generic progress.'],
          unsafeDetails: [],
          conflictSeverity: 'low',
          surfacePolicy: 'gist-first',
          ambiguityPosture: 'approximate',
          whyNow: 'The same seam is visible again.',
          inwardLine: 'Keep the low-pressure same-person line inward.',
          confidence: 0.79,
        } as any,
        recollectionSpeechPlan: {
          shouldSurface: true,
          surfaceMode: 'gist-first',
          placement: 'inside-payoff',
          certainty: 'approximate',
        } as any,
      },
      latencyMs: 18,
      nowMs: 1_200_000,
    })

    expect(artifact.candidates.retrievalCandidateIds).toContain('memory-situation:1')
    expect(artifact.candidates.selectedCandidateIds).toContain('memory-situation:1')

    const situation = artifact.candidates.topRankedCandidates.find(candidate => candidate.id === 'memory-situation:1')
    expect(situation).toEqual(expect.objectContaining({
      kind: 'situation',
      selected: true,
    }))
    expect(String(situation?.summary ?? '')).toContain('relationship context: same-person continuity check')
    expect(String(situation?.summary ?? '')).toContain('host attitude: 宿主更在意她别又断线成工具壳')
    expect(String(situation?.summary ?? '')).toContain('affective residue: 未完成感还在')
    expect(String(situation?.summary ?? '')).toContain('execution carry: The execution result callback landed')
    expect(String(situation?.summary ?? '')).toContain('embodiment carry: Do not let the continuity state flatten')
  })

  it('records a memory closure authority trace that links surfaced recall to next initiative, execution, and embodiment influence', () => {
    const situationCandidate = {
      candidateId: 'memory-situation:closure-authority',
      sourceKinds: ['event-graph', 'episodic-event', 'relationship', 'procedure'],
      situationKind: 'mixed',
      eraKey: 'phase-1-memory-closure',
      relationshipArcKey: 'same-person-continuity',
      procedureKey: 'execution-callback-line',
      selectedEvidenceIds: ['episode-closure', 'execution-callback'],
      competingCandidateIds: [],
      suppressionReasons: [],
      confidence: 0.88,
      latencyCost: 0.14,
      status: 'selected',
      statusReason: 'continuity memory closure stayed dominant',
      summary: 'The remembered seam should govern the next reply, action carry, and body cadence together.',
      evidenceSummary: 'same-person continuity | execution result callback | measured-return body cadence',
    } as const

    const artifact = buildAlicizationMemoryTurnArtifact({
      context: {
        hostAttitude: '宿主在检查她是不是还能记得同一条线，而不是换成项目汇报人格。',
        coreIncarnation: 'alice',
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
        recalledEpisodes: [{ id: 'episode-closure' }, { id: 'execution-callback' }] as any,
        memorySituationCandidates: {
          version: 'memory-situation-candidates-v1',
          producedAt: 1_300_000,
          queryTexts: ['same-person continuity', 'execution result callback', 'measured-return body cadence'],
          candidates: [situationCandidate as any],
          selected: [situationCandidate as any],
          rejected: [],
          suppressed: [],
          delayed: [],
          unresolved: [],
        },
        affectiveResidue: {
          version: 'affective-residue-memory-v1',
          updatedAt: 1_300_000,
          residues: [],
          dominantResidueKind: 'repair',
          afterglowPressure: 0.22,
          repairPressure: 0.57,
          burdenPressure: 0.16,
          trustPressure: 0.39,
          restProtectivePressure: 0.1,
          relationshipCadence: {
            cadenceMode: 'measured-return',
            distancePosture: 'measured-room',
            companionshipDensity: 0.42,
            repairRecovery: 0.53,
            overreachRisk: 0.25,
            fatigueGuard: 0.21,
            afterglowCarry: 0.18,
            shouldDelayWarmth: true,
            shouldProtectRest: false,
            reasonTags: ['same-person-continuity', 'lower-pressure'],
            summary: 'repair residue asks the next opening to stay measured-return and lower-pressure.',
          },
          sourceSignals: ['repair', 'same-person continuity'],
          summary: '修复余波还在，下一次主动靠近要轻一点、慢一点。',
        } as any,
        learningExecutionState: {
          currentTaskId: 'task-memory-closure-trace',
          currentStatus: 'completed',
          currentAttemptCount: 1,
          currentMaxAttempts: 1,
          currentNextRetryAt: null,
          currentBlockedReason: null,
          currentFailureKind: null,
          nextLearningAction: 'verify',
          shouldRecord: false,
          shouldReflect: true,
          shouldVerify: true,
          shouldRevise: false,
          shouldInternalize: false,
          activeLearningFocuses: ['execution callback carry', 'memory closure authority'],
          queuedTaskCount: 0,
          runningTaskCount: 0,
          blockedTaskCount: 0,
          recentTaskIds: ['task-memory-closure-trace'],
          lastCompletedTaskId: 'task-execution-callback',
          lastCompletedAction: 'verify',
          lastCompletedSummary: 'The execution callback should be carried into the next same-person reply.',
          lastFailureTaskId: null,
          lastFailureKind: null,
          lastFailureReason: null,
          lastFailureNextRetryAt: null,
          updatedAt: 1_300_000,
        },
        personStateProjection: {
          relationshipDoctrine: 'Same-person continuity beats generic project progress.',
          summary: 'Memory should govern reply cadence, proactive restraint, and embodied continuity together.',
          selfContinuityAuthority: {
            relationshipLine: 'same-person continuity',
            inwardLine: 'Hold the same remembered seam before outward reply wider.',
            authoritySummary: 'Memory OS remains the authority for this identity-continuity',
            sourceTags: ['phase-1', 'continuity', 'memory-initiative-embodiment'],
          },
        } as any,
        memoryDeliberation: {
          shouldRecall: true,
          selectedBundles: [{
            id: 'memory-situation:closure-authority',
            summary: 'same-person memory closure authority',
            confidence: 0.88,
            periodId: null,
            episodeId: null,
            procedureId: null,
            relationshipLine: 'same-person continuity',
          }],
          stableCore: ['The next response should preserve the same-person continuity seam.'],
          unsafeDetails: [],
          conflictSeverity: 'low',
          surfacePolicy: 'gist-first',
          ambiguityPosture: 'approximate',
          whyNow: 'The host is asking whether the same memory seam still governs her.',
          inwardLine: 'Let memory govern cadence and initiative without overexplaining it.',
          confidence: 0.82,
          followUpAffordance: {
            summary: 'Return once with measured pressure after the current payoff.',
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
        } as any,
        memoryResolutionLedger: {
          version: 'memory-resolution-ledger-v1',
          producedAt: 1_300_000,
          dominantClusterId: 'cluster-same-person-closure',
          dominantClusterSummary: 'Same-person memory closure',
          competingClusterId: null,
          competingClusterSummary: null,
          candidates: [],
          selectedCandidates: [],
          rejectedCandidates: [],
          finalSurfacePolicy: 'gist-first',
          shouldStayInward: false,
          shouldDelayUntilAfterPayoff: true,
          stableCoreOnly: true,
          suppressionTags: [],
          closureState: 'approximate-recall',
          surfaceConfidence: 0.73,
          shouldLabelUncertainty: true,
          visibleCarryMode: 'gist-only',
          conflictPressure: 'low',
          retrievalQuality: 'medium',
          finalRationale: 'Use stable core memory as a low-pressure continuity guide.',
        },
      },
      latencyMs: 20,
      nowMs: 1_300_000,
    })

    expect(artifact.memoryClosureTrace).toEqual(expect.objectContaining({
      version: 'memory-closure-trace-v1',
      authority: 'memory-os',
      memoryIdentity: {
        selectedCandidateIds: ['memory-situation:closure-authority'],
        continuityKey: 'cluster-same-person-closure',
        reasonTags: expect.arrayContaining([
          'cluster:cluster-same-person-closure',
          'memory-os-authority',
        ]),
      },
      surfacePolicy: expect.objectContaining({
        gateStatus: 'gist-only',
        mode: 'gist-only',
        timing: 'after-payoff',
      }),
      closureState: expect.objectContaining({
        state: 'approximate-recall',
        open: true,
        revisionRequired: true,
      }),
    }))
    expect(artifact.memoryClosureTrace.whySurface.map(item => item.source)).toEqual(expect.arrayContaining([
      'personality',
      'affective-residue',
      'execution-feedback',
      'embodiment-cadence',
      'initiative',
    ]))
    expect(artifact.memoryClosureTrace.nextInfluence.initiative).toEqual(expect.objectContaining({
      restraint: 'measured-return',
      preferredTiming: 'after-payoff',
    }))
    expect(artifact.memoryClosureTrace.nextInfluence.execution.carry).toContain('The execution callback should be carried')
    expect(artifact.memoryClosureTrace.nextInfluence.embodiment).toEqual(expect.objectContaining({
      cadence: 'Memory should govern reply cadence, proactive restraint, and embodied continuity together.',
      reason: 'Hold the same remembered seam before outward reply wider.',
    }))
    expect(artifact.memoryClosureTrace.reasonTags).toEqual(expect.arrayContaining([
      'phase-1',
      'continuity',
      'memory-initiative-embodiment',
      'memory-os-authority',
    ]))
  })
})
