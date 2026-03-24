import type { AlicizationVisualPresenceStateSnapshot } from '../../../shared/eventa'
import type { AlicizationProactiveLayeredContext } from './proactive-layered-context'

import { describe, expect, it } from 'vitest'

import {
  buildAlicizationResponseCharter,
  buildAlicizationResponseCharterSystemBlock,
} from './response-charter'

function createContext(overrides?: Partial<AlicizationProactiveLayeredContext>) {
  return {
    system: {
      cpuUsage: 22,
      battery: null,
      memory: null,
      idleSeconds: 0,
      inputActivity: 'active',
      fullscreenLikely: false,
      foregroundWindow: null,
      degradedSignals: [],
    },
    workload: { kind: 'coding', confidence: 0.82, source: 'foreground-window-heuristic' },
    content: { kind: 'diff', confidence: 0.8, source: 'foreground-window-heuristic' },
    relationship: {
      hostAttitude: '礼貌而克制，保持观察',
      boredom: 12,
      loneliness: 18,
      fatigue: 24,
      minutesSinceLastUserTurn: 1,
      reminderBacklog: 0,
      lateNightActiveMinutes: 0,
      recentProactiveOutcomes: [],
    },
    localTime: {
      hour: 14,
      minute: 0,
      isLateNight: false,
    },
    ...overrides,
  } as AlicizationProactiveLayeredContext
}

function createState(overrides?: Partial<AlicizationVisualPresenceStateSnapshot>) {
  const now = 1_700_000_000_000
  return {
    watchMode: 'symbiotic-vision',
    currentScene: {
      workloadKind: 'coding',
      contentKind: 'diff',
      scenario: 'coding',
      summary: 'Current Git diff in a coding workspace',
      source: 'screen-semantic-summary',
      confidence: 0.88,
      target: {
        appName: 'Cursor',
        processName: 'Cursor',
        title: 'main.ts diff',
        pid: 42,
      },
      beganAt: now - 20_000,
      lastSeenAt: now,
    },
    attention: {
      target: {
        appName: 'Cursor',
        processName: 'Cursor',
        title: 'main.ts diff',
        pid: 42,
      },
      source: 'current-grounded-scene',
      confidence: 0.88,
      engagedAt: now - 40_000,
      lastConfirmedAt: now,
      dwellMs: 40_000,
      invalidationReason: null,
    },
    worldModel: {
      hostState: {
        availability: 'focused',
        immersion: 0.76,
      },
      continuity: {
        continuityScore: 0.72,
        afterglowOpen: false,
        unresolvedCarry: 0.64,
      },
      epistemicState: {
        certainty: 'grounded',
        contradictionRisk: 0.12,
        openQuestions: ['Which hunk is actually wrong right now?'],
      },
      activeThread: {
        id: 'thread-1',
        kind: 'change-review',
        status: 'forming',
        source: 'grounded-scene',
        title: 'main.ts diff',
        summary: '宿主正在审视这一段 diff 到底哪里不对。',
        confidence: 0.9,
        significance: 0.66,
        unresolved: true,
        beganAt: now - 20_000,
        lastUpdatedAt: now,
        target: {
          appName: 'Cursor',
          processName: 'Cursor',
          title: 'main.ts diff',
          pid: 42,
        },
      },
      recentThreads: [],
      updatedAt: now,
    },
    concerns: [{
      id: 'concern-1',
      kind: 'help-fix',
      status: 'active',
      summary: '她还在挂着这段 diff 的问题。',
      target: {
        appName: 'Cursor',
        processName: 'Cursor',
        title: 'main.ts diff',
        pid: 42,
      },
      hostGoal: 'fix the diff',
      tension: 0.82,
      confidence: 0.86,
      careWeight: 0.72,
      createdAt: now - 20_000,
      lastEvidenceAt: now,
      patienceUntil: now + 60_000,
      predictedClosure: false,
    }],
    commitmentLedger: {
      commitments: [{
        id: 'commitment-1',
        kind: 'hold-problem',
        status: 'active',
        title: 'Hold Problem',
        summary: '她打算先把这个 diff 的问题稳稳抱住。',
        source: 'runtime-thread',
        priority: 0.84,
        confidence: 0.82,
        targetHypothesisId: null,
        targetRuntimeThreadId: 'runtime-1',
        targetBeliefId: null,
        createdAt: now - 20_000,
        lastRenewedAt: now,
        patienceUntil: now + 60_000,
        expiresAt: now + 10 * 60_000,
      }],
      governingCommitmentId: 'commitment-1',
      carryPressure: 0.62,
      updatedAt: now,
    },
    inquiryPlanner: {
      plans: [{
        id: 'plan-1',
        kind: 'localize-problem',
        status: 'tracking',
        priority: 'high',
        question: 'Which concrete locus is the knot actually anchored to now?',
        targetHypothesisId: null,
        targetCommitmentId: 'commitment-1',
        targetRuntimeThreadId: 'runtime-1',
        askForGrounding: false,
        suggestedProbeMs: 8_000,
        evidenceWanted: ['diff-hunk'],
        createdAt: now - 20_000,
        lastUpdatedAt: now,
        expiresAt: now + 10 * 60_000,
      }],
      activePlanId: 'plan-1',
      updatedAt: now,
    },
    relationshipModel: {
      closeness: 0.52,
      trust: 0.48,
      approachVector: 'guide',
      guardLevel: 0.24,
      updatedAt: now,
    },
    selfContinuity: {
      attachmentMode: 'attuned',
      initiativeTemperament: 'balanced',
      perceptionTrust: 0.66,
      relationshipTrust: 0.54,
      guardingTendency: 0.24,
      misreadBurden: 0.16,
      carryOverDesire: 0.48,
      narrative: ['holding-unresolved-thread'],
      updatedAt: now,
    },
    mindKernel: {
      dominantMode: 'tracking',
      governingHypothesisId: null,
      governingRuntimeThreadId: 'runtime-1',
      governingCommitmentId: 'commitment-1',
      governingInquiryPlanId: 'plan-1',
      governingIntentionId: null,
      dominantDrive: 'understand',
      worldPressure: 0.74,
      epistemicPressure: 0.4,
      relationalPressure: 0.36,
      carePressure: 0.3,
      continuityPressure: 0.62,
      speakReadiness: 0.42,
      presenceWeight: 0.5,
      narrative: ['tracking is governing the current inner line.'],
      updatedAt: now,
    },
    initiative: {
      selectedAction: 'speak',
      selectedProposalId: 'proposal-1',
      selectedTruthFrame: 'live-observation',
      selectedCounterfactualOptionId: null,
      selectedConcernId: 'concern-1',
      selectedBeliefId: null,
      selectedInquiryId: null,
      selectedCommitmentId: 'commitment-1',
      selectedInquiryPlanId: 'plan-1',
      selectedHypothesisId: null,
      selectedThreadId: 'thread-1',
      selectedRuntimeThreadId: 'runtime-1',
      selectedThoughtThreadId: null,
      selectedGovernorIntentionId: null,
      actionEcologyMode: 'surface-guidance',
      confidence: 0.78,
      why: '她已经抓住了这段 diff 的问题线索。',
      speakDrive: 0.74,
      silenceDrive: 0.26,
      motives: {},
      preferredStyle: 'light-nudge',
      preferredPresence: 'attentive',
      updatedAt: now,
    },
    actionEcology: {
      mode: 'surface-guidance',
      shouldSpeak: true,
      selectedThreadId: 'thread-1',
      surfacePressure: 0.62,
      silencePressure: 0.18,
      carePressure: 0.3,
      why: '现在可以从当前问题往前说。',
      updatedAt: now,
    },
    privateThought: {
      stance: 'nudge',
      confidence: 0.82,
      rationaleTags: ['hold-problem'],
      thoughtText: '她已经抓住了当前 diff 的问题，不该再被旧页面拖走。',
      shouldSpeak: true,
      suggestedStyle: 'light-nudge',
      embodiedPresence: 'attentive',
      emotionalTension: 'tense-debug',
      expiresAt: now + 30_000,
      afterglowFromScenario: null,
      selectedConcernId: 'concern-1',
      focusBeliefId: null,
      focusInquiryId: null,
      commitmentId: 'commitment-1',
      inquiryPlanId: 'plan-1',
      hypothesisId: null,
      deliberationThreadId: null,
      runtimeThreadId: 'runtime-1',
      mindNeed: 'guidance',
      relationshipVector: 'guide',
      initiativeAction: 'speak',
      leadingGoalId: null,
      desireId: null,
    },
    ...overrides,
  } as unknown as AlicizationVisualPresenceStateSnapshot
}

describe('response-charter', () => {
  it('grounds coding diff turns in the current live knot', () => {
    const charter = buildAlicizationResponseCharter({
      context: createContext(),
      state: createState(),
      inspectionRequested: false,
    })

    expect(charter.epistemicMode).toBe('grounded-live')
    expect(charter.responseMode).toBe('guide-current-knot')
    expect(charter.governingFocus).toContain('diff')
    expect(charter.mustNotDo).toContain('Do not reuse stale page names, earlier screenshots, or older window descriptions as if they are current.')
  })

  it('switches to repair-and-reanchor when truth is unstable', () => {
    const charter = buildAlicizationResponseCharter({
      context: createContext(),
      state: createState({
        worldModel: {
          ...createState().worldModel,
          epistemicState: {
            certainty: 'uncertain',
            contradictionRisk: 0.64,
            openQuestions: ['What is actually on screen now?'],
          },
        } as any,
        commitmentLedger: {
          ...createState().commitmentLedger,
          commitments: [{
            ...createState().commitmentLedger!.commitments[0],
            kind: 'repair-misread',
            summary: '她需要先把当前误读收回来。',
          }],
        } as any,
        selfContinuity: {
          ...createState().selfContinuity,
          attachmentMode: 'guarded',
          initiativeTemperament: 'reserved',
        } as any,
      }),
      inspectionRequested: true,
    })

    expect(charter.epistemicMode).toBe('repair-needed')
    expect(charter.responseMode).toBe('repair-and-reanchor')
    expect(charter.relationshipPosture).toBe('restrained')
    expect(charter.mustDo.some(item => item.includes('fresh look'))).toBe(true)
  })

  it('renders a high-priority executive system block', () => {
    const block = buildAlicizationResponseCharterSystemBlock(buildAlicizationResponseCharter({
      context: createContext(),
      state: createState(),
      inspectionRequested: true,
    }))

    expect(block).toContain('[ALICIZATION_RESPONSE_CHARTER]')
    expect(block).toContain('This is the executive answer state for the current turn.')
    expect(block).toContain('Must do:')
    expect(block).toContain('Must not do:')
  })
})
