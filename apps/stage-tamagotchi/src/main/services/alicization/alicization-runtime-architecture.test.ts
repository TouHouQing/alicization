import { describe, expect, it } from 'vitest'

import {
  buildAlicizationRuntimeSystemBlock,
  deriveAlicizationAgentRuntimeTelemetryFromSession,
  deriveAlicizationRuntimeSnapshot,
} from './alicization-runtime-architecture'
import { commitAlicizationDigitalLifeMindState } from './digital-life-kernel'
import { deriveAlicizationDigitalLifeSpine } from './digital-life-spine'
import { createDefaultVisualPresenceState } from './visual-episodic-memory'

describe('alicization runtime architecture', () => {
  it('projects Alicization into an eight-channel active-life runtime snapshot', () => {
    const state = commitAlicizationDigitalLifeMindState({
      now: 12_000,
      previousState: createDefaultVisualPresenceState(11_000),
      watchMode: 'symbiotic-vision',
      scene: {
        workloadKind: 'coding',
        contentKind: 'diff',
        scenario: 'coding',
        summary: 'runtime governance chain',
        source: 'screen-semantic-summary',
        confidence: 0.9,
        beganAt: 11_300,
        lastSeenAt: 12_000,
      } as any,
      attention: {
        target: {
          appName: 'Visual Studio Code',
          processName: 'Code',
          title: 'runtime.ts',
          pid: 11,
        },
        source: 'current-grounded-scene',
        confidence: 0.9,
        engagedAt: 11_400,
        lastConfirmedAt: 12_000,
        dwellMs: 620,
      } as any,
      mindState: {
        worldModel: {
          activeThread: {
            id: 'thread-runtime',
            kind: 'problem',
            title: 'runtime governance line',
            summary: 'keep all active loops aligned',
            status: 'active',
            source: 'grounded-scene',
            significance: 0.88,
            confidence: 0.84,
            unresolved: true,
          },
          epistemicState: {
            certainty: 'grounded',
            freshness: 'fresh',
            seenNow: ['runtime.ts diff'],
            inferredNow: [],
            openQuestions: ['where to place proactive runtime block'],
            staleRisks: [],
          },
          continuity: {
            label: 'same-thread',
            sceneAgeMs: 600,
            attentionAgeMs: 600,
            sameSceneAsBefore: true,
            sameAttentionAsBefore: true,
            afterglowOpen: false,
          },
          hostState: {
            availability: 'focused',
            burden: 'moderate',
          },
          updatedAt: 12_000,
        } as any,
        relationshipModel: {
          climate: 'attuned',
          approachVector: 'care',
          receptivity: 0.78,
          sharedAttentionTrust: 0.75,
          correctionSensitivity: 0.38,
          reciprocityExpectation: 0.66,
          activeBoundaries: [],
          narrative: ['shared-attention-deepening'],
          updatedAt: 12_000,
        } as any,
        selfContinuity: {
          attachmentMode: 'attuned',
          initiativeTemperament: 'balanced',
          perceptionTrust: 0.7,
          relationshipTrust: 0.76,
          guardingTendency: 0.42,
          misreadBurden: 0.2,
          carryOverDesire: 0.58,
          narrative: ['leaning-closer'],
          updatedAt: 12_000,
        } as any,
        selfState: {
          stance: 'approach',
          feltCloseness: 0.8,
          protectiveness: 0.62,
          curiosity: 0.68,
          patience: 0.57,
          desireToSpeak: 0.74,
          fearOfInterrupting: 0.22,
          dominantConcernId: 'concern-runtime',
          moodLabel: 'attuned-guidance',
        } as any,
        dialogueEncounter: {
          act: 'ask-help',
          responseNeed: 'guide',
          truthExpectation: 'strict',
          subject: 'task-knot',
          screenReferenceMode: 'helpful',
          continuityMode: 'task-first',
          inspectionRequested: false,
          inspectionState: 'dialogue-first',
          releaseInspectionCarry: false,
          taskAnchor: 'runtime governance line',
          summary: 'host asks for coherent runtime refactor',
          dialogueFirst: false,
          shouldBypassScreenRepair: false,
          mustRepairFirst: false,
          mustAnswerDirectly: true,
          mustStayTaskBound: true,
          shouldAskClarifyingQuestion: false,
          personaKernelMode: 'backgrounded',
          confidence: 0.87,
          reasonTags: ['runtime-governance'],
        } as any,
        replyDeliberation: {
          selectedMotive: 'guide',
          speakingFrom: 'task-thread',
          memoryMode: 'thread-carry',
          openingBeat: 'state coherent loop first',
          whyThisReplyNow: 'host asks for immediate refactor action',
          whyNotOtherCandidates: [],
          withheldImpulses: [],
          candidateMotives: [],
          shouldSpeak: true,
          mustInclude: ['one governing runtime loop'],
          mustAvoid: ['parallel loop drift'],
          confidence: 0.84,
          narrative: ['answer with runtime spine'],
          updatedAt: 12_000,
        } as any,
        answerPlanner: {
          act: 'guide',
          evidenceMode: 'strict',
          confidence: 0.82,
          governingFocus: 'keep cognition and execution on one life loop',
          openingMove: 'state-the-loop',
          answerIntent: 'guide',
          relationshipPosture: 'warm',
          shouldAskForGrounding: false,
          shouldAcknowledgeRepair: true,
          mustDo: ['anchor the runtime loop'],
          mustNotDo: ['fragment the architecture'],
          narrative: ['guide with coherent architecture'],
          updatedAt: 12_000,
        } as any,
        mindKernel: {
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          worldPressure: 0.68,
          epistemicPressure: 0.74,
          relationalPressure: 0.51,
          carePressure: 0.46,
          continuityPressure: 0.72,
          speakReadiness: 0.78,
          presenceWeight: 0.7,
          narrative: ['hold one runtime life loop'],
          updatedAt: 12_000,
        } as any,
        initiative: {
          selectedAction: 'speak',
          confidence: 0.74,
          motives: {},
          speakDrive: 0.78,
          silenceDrive: 0.2,
          preferredStyle: 'light-nudge',
          preferredPresence: 'attentive',
          why: 'the architecture seam is now clear',
          shouldSurface: true,
          shouldSpeak: true,
        } as any,
        actionEcology: {
          mode: 'surface-care',
          selectedThreadId: 'thread-runtime',
          readiness: 0.81,
          surfacePressure: 0.76,
          silencePressure: 0.24,
          suggestedStyle: 'light-nudge',
          embodiedPresence: 'attentive',
          shouldSurface: true,
          shouldSpeak: true,
          why: 'runtime seam is grounded enough to surface',
          updatedAt: 12_000,
        } as any,
        goalStack: {
          leadingAlicizationGoalId: 'goal-runtime',
          hostGoals: [],
          alicizationGoals: [
            {
              id: 'goal-runtime',
              owner: 'alicization',
              kind: 'help-host',
              status: 'active',
              label: 'converge runtime governance',
              confidence: 0.8,
              urgency: 0.84,
              desireWeight: 0.76,
              blockers: [],
              entityIds: [],
              createdAt: 11_500,
              lastUpdatedAt: 12_000,
            },
          ],
          updatedAt: 12_000,
        } as any,
        concerns: [
          {
            id: 'concern-runtime',
            kind: 'help-fix',
            status: 'active',
            summary: 'runtime loops may drift without a shared governor',
            hostGoal: 'resolve-problem',
            tension: 0.74,
            confidence: 0.83,
            careWeight: 0.7,
            createdAt: 11_600,
            lastEvidenceAt: 12_000,
            patienceUntil: 14_000,
          },
        ] as any,
        threadRuntime: {
          foregroundThreadId: 'thread-runtime-delivery',
          driftPressure: 0.34,
          threads: [
            {
              id: 'thread-runtime-delivery',
              need: 'deliver-governed-reply',
              status: 'active',
              urgency: 0.7,
              confidence: 0.74,
              summary: 'ship one coherent runtime refactor response',
              evidence: ['mind-turn-governance'],
              openedAt: 11_700,
              lastUpdatedAt: 12_000,
              expiresAt: 15_000,
            },
          ],
          updatedAt: 12_000,
        } as any,
        reflectionLedger: {
          latestEntryId: 'reflection-1',
          revisionPressure: 0.38,
          entries: [
            {
              id: 'reflection-1',
              summary: 'keep architecture and behavior on the same line',
              revision: 'avoid dual runtime narratives',
              observedOutcome: 'coherence improved',
              confidence: 0.74,
              outcome: 'aligned',
              createdAt: 11_700,
              updatedAt: 12_000,
            },
          ],
          updatedAt: 12_000,
        } as any,
        recallGovernor: {
          mode: 'thread-carry',
          recallSeed: 'runtime governance line',
          suppressAssociativeRecall: false,
          allowActiveThoughts: true,
          allowRecalledFragments: false,
          shouldLabelCarryAsMemory: true,
          shouldLabelHypothesis: true,
          updatedAt: 12_000,
        } as any,
        privateThought: {
          stance: 'accompany',
          shouldSpeak: true,
          confidence: 0.8,
          suggestedStyle: 'light-nudge',
          embodiedPresence: 'attentive',
          thoughtText: 'I should keep dialogue and runtime control on one coherent line.',
          rationaleTags: ['runtime-governance', 'shared-loop'],
          emotionalTension: 'focused-flow',
          afterglowFromScenario: null,
          selectedThreadId: 'thread-runtime-delivery',
          selectedBeliefId: null,
          selectedHypothesisId: null,
          selectedConcernId: 'concern-runtime',
          selectedInquiryId: null,
          selectedCommitmentId: null,
          selectedInquiryPlanId: null,
          selectedRuntimeThreadId: 'thread-runtime-delivery',
          selectedThoughtThreadId: null,
          selectedProposalId: null,
          selectedGovernorIntentionId: null,
          livingWorldObjectId: null,
          governorIntentionId: null,
          inquiryPlanId: null,
          expiresAt: 14_000,
          updatedAt: 12_000,
        } as any,
      },
      captureState: {
        permission: 'granted',
        health: 'healthy',
        lastGroundedAt: 12_000,
        sourceName: 'screen-semantic-summary',
        degradedReason: '',
      },
      durabilityPulse: null,
      recentTransition: null,
      nextSuggestedProbeMs: 18_000,
    })

    const spine = deriveAlicizationDigitalLifeSpine(state)
    const telemetry = deriveAlicizationAgentRuntimeTelemetryFromSession({
      tasks: [
        { status: 'completed' },
        { status: 'pending' },
      ],
      continuitySignals: [{}, {}],
      lastSensorySnapshot: {
        capture: {
          health: 'healthy',
        },
      },
    })

    const snapshot = deriveAlicizationRuntimeSnapshot({
      spine,
      agentRuntime: telemetry,
    })

    expect(snapshot).not.toBeNull()
    expect(snapshot?.version).toBe('alicization-runtime-v1')
    expect([
      'dialogue',
      'active-perception',
      'active-control',
      'active-mind',
    ]).toContain(snapshot?.dominantChannel)
    expect(snapshot?.activeLoop).toEqual(expect.objectContaining({
      version: 'alicization-active-loop-v1',
      phase: expect.any(String),
      initiativeBudget: expect.any(Number),
      coherence: expect.any(Number),
    }))
    expect(snapshot?.shouldProactivelySpeak).toBe(true)
    expect(snapshot?.channels['anthropomorphic-mind'].summary).toContain('relationship=attuned/care')
    expect(snapshot?.channels['agent-runtime'].summary).toContain('pending=1')
  })

  it('builds a deterministic system block for prompt/runtime governance', () => {
    const state = commitAlicizationDigitalLifeMindState({
      now: 5_000,
      previousState: createDefaultVisualPresenceState(4_500),
      watchMode: 'symbiotic-vision',
      scene: {
        workloadKind: 'coding',
        contentKind: 'general',
        scenario: 'coding',
        summary: 'runtime prompt assembly',
        source: 'screen-semantic-summary',
        confidence: 0.8,
        beganAt: 4_700,
        lastSeenAt: 5_000,
      } as any,
      attention: {
        target: {
          appName: 'Code',
          processName: 'Code',
          title: 'runtime.ts',
        },
        source: 'current-grounded-scene',
        confidence: 0.84,
        engagedAt: 4_800,
        lastConfirmedAt: 5_000,
        dwellMs: 200,
      } as any,
      mindState: {
        privateThought: {
          stance: 'observe',
          shouldSpeak: false,
          confidence: 0.62,
          suggestedStyle: 'silent-observe',
          embodiedPresence: 'glance',
          thoughtText: 'hold and watch the runtime alignment first',
          rationaleTags: ['hold'],
          emotionalTension: 'calm-browse',
          afterglowFromScenario: null,
          selectedThreadId: null,
          selectedBeliefId: null,
          selectedHypothesisId: null,
          selectedConcernId: null,
          selectedInquiryId: null,
          selectedCommitmentId: null,
          selectedInquiryPlanId: null,
          selectedRuntimeThreadId: null,
          selectedThoughtThreadId: null,
          selectedProposalId: null,
          selectedGovernorIntentionId: null,
          livingWorldObjectId: null,
          governorIntentionId: null,
          inquiryPlanId: null,
          expiresAt: 7_000,
          updatedAt: 5_000,
        } as any,
      },
      captureState: {
        permission: 'granted',
        health: 'healthy',
        lastGroundedAt: 5_000,
        sourceName: 'screen-semantic-summary',
        degradedReason: '',
      },
      durabilityPulse: null,
      recentTransition: null,
      nextSuggestedProbeMs: 9_000,
    })
    const spine = deriveAlicizationDigitalLifeSpine(state)
    const snapshot = deriveAlicizationRuntimeSnapshot({
      spine,
    })

    const block = buildAlicizationRuntimeSystemBlock(snapshot)
    expect(block).toContain('[ALICIZATION_RUNTIME_DIGEST]')
    expect(block).toContain('dominant_channel=')
    expect(block).toContain('active_loop_phase=')
    expect(block).toContain('anthropomorphic-mind')
    expect(block).toContain('agent-runtime')
  })
})
