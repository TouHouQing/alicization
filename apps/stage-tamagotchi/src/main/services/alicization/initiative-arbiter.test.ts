import { describe, expect, it } from 'vitest'

import { buildInitiativeArbitration } from './initiative-arbiter'

function createArbitrationInput(overrides: Record<string, unknown> = {}) {
  return {
    now: 10_000,
    context: {
      localTime: { hour: 14, minute: 0, isLateNight: false },
      system: {
        cpuUsage: 12,
        battery: { percent: 70, charging: true },
        memory: { usagePercent: 38, freeMB: 4096, totalMB: 8192 },
        idleSeconds: 10,
        inputActivity: 'active',
        fullscreenLikely: false,
        foregroundWindow: undefined,
        degradedSignals: [],
      },
      workload: { kind: 'coding', confidence: 0.82, source: 'foreground-window-heuristic', matchedLabels: ['editor'] },
      content: { kind: 'unknown', confidence: 0.4, source: 'foreground-window-heuristic', matchedLabels: [] },
      relationship: {
        hostAttitude: 'The user is focused.',
        boredom: 10,
        loneliness: 12,
        fatigue: 24,
        minutesSinceLastUserTurn: 2,
        reminderBacklog: 0,
        lateNightActiveMinutes: 0,
        recentProactiveOutcomes: [],
      },
    },
    worldModel: {
      activeThread: null,
      lingeringThreads: [],
      focusTarget: null,
      epistemicState: {
        certainty: 'uncertain',
        freshness: 'stale',
        seenNow: [],
        inferredNow: [],
        openQuestions: [],
        staleRisks: [],
      },
      continuity: {
        label: 'scene-shift',
        sceneAgeMs: 20_000,
        attentionAgeMs: 20_000,
        sameSceneAsBefore: false,
        sameAttentionAsBefore: false,
        afterglowOpen: false,
      },
      hostState: {
        availability: 'focused',
        burden: 'moderate',
      },
      updatedAt: 10_000,
    },
    worldOntology: {
      dominantFrame: 'imagined',
      truthPriority: ['imagined'],
      live: null,
      remembered: null,
      imagined: null,
      updatedAt: 10_000,
    },
    selfState: {
      stance: 'hesitate',
      feltCloseness: 0.42,
      protectiveness: 0.32,
      curiosity: 0.68,
      patience: 0.52,
      desireToSpeak: 0.58,
      fearOfInterrupting: 0.54,
      dominantConcernId: null,
    },
    mindDynamics: {
      dominantMotive: 'clarify',
      worldPressure: 0.42,
      epistemicPressure: 0.84,
      relationalPressure: 0.2,
      carePressure: 0.18,
      continuityPressure: 0.34,
      restraintPressure: 0.54,
      surfacePressure: 0.36,
      speakReadiness: 0.32,
      presenceWeight: 0.48,
      motives: {
        'clarify': 0.88,
        'stay-silent': 0.4,
      },
      speakDrive: 0.34,
      silenceDrive: 0.62,
      narrative: [],
      updatedAt: 10_000,
    },
    ...overrides,
  } as any
}

describe('buildInitiativeArbitration', () => {
  it('leaves the wait proposal reason empty when no authored reason exists', () => {
    const arbitration = buildInitiativeArbitration(createArbitrationInput())

    expect(arbitration.selectedProposalId).toBe('fallback:wait')
    expect(arbitration.proposals[0]?.action).toBe('wait')
    expect(arbitration.proposals[0]?.why).toBe('')
  })

  it('preserves the dynamic concern summary without adding persona or project narration', () => {
    const arbitration = buildInitiativeArbitration(createArbitrationInput({
      worldOntology: {
        dominantFrame: 'live',
        truthPriority: ['live'],
        live: {
          kind: 'live',
          summary: 'A concrete error is visible.',
          confidence: 0.88,
          stability: 0.86,
          focusBeliefId: null,
          evidence: ['screen:error'],
        },
        remembered: null,
        imagined: null,
        updatedAt: 10_000,
      },
      concerns: [{
        id: 'concern::error',
        kind: 'help-fix',
        status: 'active',
        summary: 'A concrete error is visible and can be checked now.',
        hostGoal: 'resolve-problem',
        tension: 0.8,
        confidence: 0.84,
        careWeight: 0.66,
        createdAt: 0,
        lastEvidenceAt: 10_000,
        patienceUntil: 60_000,
      }],
    }))

    const proposal = arbitration.proposals.find(item => item.id === 'concern:concern::error')
    expect(proposal?.why).toBe('A concrete error is visible and can be checked now.')
    expect(proposal?.why).not.toMatch(/persona|project|continuity|phase|closure|same[- ]her/iu)
  })

  it('does not let project-state prose change arbitration or proposal wording', () => {
    const base = createArbitrationInput({
      worldOntology: {
        dominantFrame: 'live',
        truthPriority: ['live'],
        live: {
          kind: 'live',
          summary: 'A concrete error is visible.',
          confidence: 0.88,
          stability: 0.86,
          focusBeliefId: null,
          evidence: ['screen:error'],
        },
        remembered: null,
        imagined: null,
        updatedAt: 10_000,
      },
      concerns: [{
        id: 'concern::error',
        kind: 'help-fix',
        status: 'active',
        summary: 'Check the concrete error.',
        hostGoal: 'resolve-problem',
        tension: 0.8,
        confidence: 0.84,
        careWeight: 0.66,
        createdAt: 0,
        lastEvidenceAt: 10_000,
        patienceUntil: 60_000,
      }],
    })
    const withProjectState = {
      ...base,
      projectState: {
        identity: 'A runtime note',
        currentPhase: 'active',
        latestLandedProgress: 'A recent change landed.',
        primaryOpenLoop: 'One question remains.',
        nextClosureTarget: 'Inspect the next failing branch.',
      },
    }

    const baseline = buildInitiativeArbitration(base)
    const projected = buildInitiativeArbitration(withProjectState)

    expect(projected).toEqual(baseline)
  })

  it('keeps personality authority out of proposal why text', () => {
    const input = createArbitrationInput({
      worldOntology: {
        dominantFrame: 'live',
        truthPriority: ['live'],
        live: {
          kind: 'live',
          summary: 'The current scene is grounded.',
          confidence: 0.82,
          stability: 0.8,
          focusBeliefId: null,
          evidence: ['scene:current'],
        },
        remembered: null,
        imagined: null,
        updatedAt: 10_000,
      },
      thoughtThreads: {
        foregroundThreadId: 'thought::current',
        threads: [{
          id: 'thought::current',
          kind: 'problem-thread',
          status: 'ripe',
          title: 'Current issue',
          summary: 'The current issue is ready for inspection.',
          salience: 0.8,
          confidence: 0.82,
          surfaceReadiness: 0.8,
          anchoredObjectId: null,
          anchoredIntentionId: null,
          reopenWhen: [],
          openedAt: 0,
          lastUpdatedAt: 10_000,
          expiresAt: 20_000,
        }],
        unresolvedCount: 1,
        narrative: [],
        updatedAt: 10_000,
      },
      personalityAuthority: {
        identityKernel: {
          relationshipPosture: 'observer',
          initiativeStyle: 'observant',
        },
        initiativeBaseline: {
          silenceReconnect: 'hold',
        },
      },
    })

    const arbitration = buildInitiativeArbitration(input)
    const proposal = arbitration.proposals.find(item => item.id === 'thought-thread:thought::current')

    expect(proposal?.why).toBe('The current issue is ready for inspection.')
    expect(proposal?.why).not.toContain('persona')
  })

  it('uses typed commitments for repair without a fixed repair sentence', () => {
    const arbitration = buildInitiativeArbitration(createArbitrationInput({
      commitmentLedger: {
        governingCommitmentId: 'commitment::repair',
        commitments: [{
          id: 'commitment::repair',
          kind: 'repair-misread',
          status: 'active',
          title: 'Repair the current interpretation',
          summary: 'Check the missing evidence before speaking.',
          source: 'hypothesis',
          priority: 0.82,
          confidence: 0.8,
          targetHypothesisId: null,
          targetRuntimeThreadId: null,
          targetBeliefId: null,
          createdAt: 0,
          lastRenewedAt: 10_000,
          patienceUntil: 20_000,
          expiresAt: 40_000,
        }],
        carryPressure: 0.82,
        narrative: [],
        updatedAt: 10_000,
      },
    }))

    const proposal = arbitration.proposals.find(item => item.id === 'commitment:commitment::repair')
    expect(proposal?.action).toBe('recheck')
    expect(proposal?.truthFrame).toBe('imagined')
    expect(proposal?.why).toBe('Check the missing evidence before speaking.')
  })
})
