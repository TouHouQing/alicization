import type {
  AlicizationBeliefLedgerSnapshot,
  AlicizationInquiryLoopSnapshot,
  AlicizationPrivateThoughtSnapshot,
  AlicizationProactiveReasonCode,
  AlicizationRelationshipModelSnapshot,
} from '../../../shared/eventa'
import type { AlicizationRuntimeSnapshot } from './alicization-runtime-architecture'
import type { AlicizationDigitalLifeArchitectureSnapshot } from './digital-life-architecture'
import type { AlicizationProactiveLayeredContext } from './proactive-layered-context'

import { describe, expect, it } from 'vitest'

import { createDefaultProactiveLoopState } from './proactive-feedback'
import { evaluateProactivePolicy } from './proactive-policy'

function createContext(overrides: Partial<AlicizationProactiveLayeredContext> = {}): AlicizationProactiveLayeredContext {
  return {
    localTime: {
      hour: 14,
      minute: 20,
      isLateNight: false,
    },
    system: {
      cpuUsage: 12,
      battery: {
        percent: 80,
        charging: true,
      },
      memory: {
        usagePercent: 42,
        freeMB: 4096,
        totalMB: 8192,
      },
      idleSeconds: 45,
      inputActivity: 'idle',
      fullscreenLikely: false,
      foregroundWindow: {
        appName: 'Visual Studio Code',
        processName: 'Code',
        title: 'index.ts - Project',
      },
      degradedSignals: [],
    },
    workload: {
      kind: 'coding',
      confidence: 0.82,
      source: 'foreground-window-heuristic',
      matchedLabels: ['vscode'],
    },
    content: {
      kind: 'error',
      confidence: 0.82,
      source: 'foreground-window-heuristic',
      matchedLabels: ['error'],
    },
    relationship: {
      hostAttitude: '礼貌而克制，保持观察',
      boredom: 94,
      loneliness: 72,
      fatigue: 28,
      minutesSinceLastUserTurn: 18,
      reminderBacklog: 0,
      lateNightActiveMinutes: 0,
      recentProactiveOutcomes: [],
    },
    ...overrides,
  }
}

function createPrivateThought(overrides: Record<string, any> = {}): AlicizationPrivateThoughtSnapshot {
  return {
    stance: 'nudge' as const,
    confidence: 0.84,
    rationaleTags: ['semantic-friction'],
    thoughtText: 'I can nudge here.',
    shouldSpeak: true,
    suggestedStyle: 'light-nudge' as const,
    embodiedPresence: 'attentive' as const,
    expiresAt: 120_000,
    afterglowFromScenario: null,
    emotionalTension: 'tense-debug' as const,
    ...overrides,
  }
}

function createBeliefLedger(overrides: Partial<AlicizationBeliefLedgerSnapshot> = {}): AlicizationBeliefLedgerSnapshot {
  return {
    focusBeliefId: 'belief-1',
    beliefs: [{
      id: 'belief-1',
      scope: 'scene',
      source: 'percept',
      status: 'held',
      statement: 'The current scene is centered on a coding error.',
      confidence: 0.84,
      salience: 0.82,
      evidence: ['scene:error'],
      entityIds: [],
      formedAt: 0,
      lastUpdatedAt: 1_000,
      expiresAt: 120_000,
    }],
    unresolvedContradictions: [],
    updatedAt: 1_000,
    ...overrides,
  }
}

function createRelationshipModel(overrides: Partial<AlicizationRelationshipModelSnapshot> = {}): AlicizationRelationshipModelSnapshot {
  return {
    climate: 'attuned',
    approachVector: 'guide',
    receptivity: 0.72,
    sharedAttentionTrust: 0.7,
    correctionSensitivity: 0.28,
    reciprocityExpectation: 0.56,
    activeBoundaries: [],
    narrative: ['grounding-trust-rising'],
    updatedAt: 1_000,
    ...overrides,
  }
}

function createInquiryLoop(overrides: Partial<AlicizationInquiryLoopSnapshot> = {}): AlicizationInquiryLoopSnapshot {
  return {
    primaryInquiryId: 'inquiry-1',
    inquiries: [{
      id: 'inquiry-1',
      kind: 'problem-localization',
      status: 'open',
      priority: 'medium',
      question: 'Which concrete line is the real knot?',
      whyItMatters: 'So Alicization stays close to the actual problem.',
      confidence: 0.72,
      targetBeliefId: 'belief-1',
      evidenceWanted: ['error locus'],
      reopenWhen: ['host-open'],
      openedAt: 0,
      lastUpdatedAt: 1_000,
      expiresAt: 120_000,
    }],
    openCount: 1,
    updatedAt: 1_000,
    ...overrides,
  }
}

function createArchitecture(overrides: Partial<AlicizationDigitalLifeArchitectureSnapshot> = {}): AlicizationDigitalLifeArchitectureSnapshot {
  return {
    version: 'digital-life-architecture-v1',
    operatingMode: 'speaking',
    dominantSystem: 'dialogue',
    supportingSystems: ['mind', 'proactive'],
    governingFocus: 'runtime knot',
    summary: 'dialogue-led runtime line',
    systems: {
      dialogue: {
        id: 'dialogue',
        state: 'hot',
        score: 0.9,
        focus: 'runtime knot',
        summary: 'dialogue is hot',
        reasons: ['reply:ready'],
      },
      perception: {
        id: 'perception',
        state: 'warm',
        score: 0.52,
        focus: 'editor',
        summary: 'perception is stable',
        reasons: ['scene:coding'],
      },
      proactive: {
        id: 'proactive',
        state: 'warm',
        score: 0.76,
        focus: 'nudge',
        summary: 'proactive is warm',
        reasons: ['initiative:speak'],
      },
      control: {
        id: 'control',
        state: 'warm',
        score: 0.58,
        focus: 'guide',
        summary: 'control is warm',
        reasons: ['intention:guide'],
      },
      mind: {
        id: 'mind',
        state: 'hot',
        score: 0.84,
        focus: 'repair thread',
        summary: 'mind is hot',
        reasons: ['thread:problem'],
      },
      memory: {
        id: 'memory',
        state: 'warm',
        score: 0.54,
        focus: 'recent repair',
        summary: 'memory is warm',
        reasons: ['goal:help-host'],
      },
      runtime: {
        id: 'runtime',
        state: 'warm',
        score: 0.56,
        focus: 'symbiotic-vision',
        summary: 'runtime is warm',
        reasons: ['watch:symbiotic-vision'],
      },
    },
    ...overrides,
  }
}

function createRuntimeSnapshot(overrides: Partial<AlicizationRuntimeSnapshot> = {}): AlicizationRuntimeSnapshot {
  const runtime: AlicizationRuntimeSnapshot = {
    version: 'alicization-runtime-v1',
    dominantChannel: 'dialogue',
    channels: {
      'dialogue': {
        id: 'dialogue',
        state: 'hot',
        readiness: 0.86,
        focus: 'reply',
        summary: 'dialogue ready',
      },
      'active-perception': {
        id: 'active-perception',
        state: 'warm',
        readiness: 0.58,
        focus: 'editor',
        summary: 'perception stable',
      },
      'active-dialogue': {
        id: 'active-dialogue',
        state: 'hot',
        readiness: 0.82,
        focus: 'nudge',
        summary: 'active dialogue ready',
      },
      'active-control': {
        id: 'active-control',
        state: 'warm',
        readiness: 0.62,
        focus: 'guide',
        summary: 'control warm',
      },
      'active-mind': {
        id: 'active-mind',
        state: 'warm',
        readiness: 0.6,
        focus: 'thread',
        summary: 'mind warm',
      },
      'active-memory': {
        id: 'active-memory',
        state: 'warm',
        readiness: 0.58,
        focus: 'carry',
        summary: 'memory warm',
      },
      'anthropomorphic-mind': {
        id: 'anthropomorphic-mind',
        state: 'warm',
        readiness: 0.66,
        focus: 'companionship',
        summary: 'anthropomorphic warm',
      },
      'agent-runtime': {
        id: 'agent-runtime',
        state: 'warm',
        readiness: 0.52,
        focus: 'pending:1',
        summary: 'agent runtime warm',
      },
    },
    shouldProactivelySpeak: true,
    shouldProactivelyAct: false,
    continuityPressure: 0.64,
    companionshipPressure: 0.7,
    summary: 'dominant=dialogue',
  }

  return {
    ...runtime,
    ...overrides,
    channels: {
      ...runtime.channels,
      ...overrides.channels,
    },
  }
}

describe('evaluateProactivePolicy', () => {
  it('allows coding interruption only with strong relevant cues', () => {
    const decision = evaluateProactivePolicy({
      now: 1_000,
      context: createContext(),
      proactiveState: createDefaultProactiveLoopState(1_000),
      killSwitchSuspended: false,
      watchMode: 'symbiotic-vision',
      privateThought: createPrivateThought(),
      beliefLedger: createBeliefLedger(),
      relationshipModel: createRelationshipModel(),
      inquiryLoop: createInquiryLoop(),
    })

    expect(decision.shouldInterrupt).toBe(true)
    expect(decision.scenario).toBe('coding')
    expect(decision.style).toBe('light-nudge')
    expect(decision.reasonCodes).toContain('coding-focus')
    expect(decision.reasonCodes).toContain('foreground-error')
    expect(decision.reasonCodes).toContain('relationship-attuned')
  })

  it('treats dialogue-dominant digital-life architecture as a proactive bias input', () => {
    const decision = evaluateProactivePolicy({
      now: 1_000,
      context: createContext(),
      proactiveState: createDefaultProactiveLoopState(1_000),
      killSwitchSuspended: false,
      architecture: createArchitecture(),
      watchMode: 'symbiotic-vision',
      privateThought: createPrivateThought(),
      beliefLedger: createBeliefLedger(),
      relationshipModel: createRelationshipModel(),
      inquiryLoop: createInquiryLoop(),
    })

    expect(decision.shouldInterrupt).toBe(true)
    expect(decision.consideredSignals).toContain('architecture.operatingMode')
    expect(decision.consideredSignals).toContain('architecture.dominantSystem')
    expect(decision.consideredSignals).toContain('architecture.supportingSystems')
    expect(decision.whyNow.includes('转入 speaking') || decision.whyNow.includes('活性循环')).toBe(true)
    expect(decision.whyNotLater).toContain('dialogue')
  })

  it('treats initiative as the primary desire signal while policy remains a safety gate', () => {
    const decision = evaluateProactivePolicy({
      now: 1_000,
      context: createContext({
        relationship: {
          ...createContext().relationship,
          boredom: 28,
          loneliness: 22,
        },
      }),
      proactiveState: createDefaultProactiveLoopState(1_000),
      killSwitchSuspended: false,
      watchMode: 'symbiotic-vision',
      privateThought: createPrivateThought(),
      beliefLedger: createBeliefLedger(),
      relationshipModel: createRelationshipModel(),
      inquiryLoop: createInquiryLoop(),
      initiative: {
        selectedAction: 'speak',
        selectedConcernId: 'help-fix',
        confidence: 0.86,
        motives: {
          'protect': 0.82,
          'clarify': 0.7,
          'stay-silent': 0.24,
        },
        speakDrive: 0.82,
        silenceDrive: 0.24,
        preferredStyle: 'light-nudge',
        preferredPresence: 'attentive',
        why: '她已经不只是看见问题，而是已经形成了应该靠近的内部判断。',
        shouldSurface: true,
        shouldSpeak: true,
      },
    })

    expect(decision.shouldInterrupt).toBe(true)
    expect(decision.consideredSignals).toContain('initiative.speakDrive')
  })

  it('suppresses media playback while the host is still actively engaged', () => {
    const decision = evaluateProactivePolicy({
      now: 1_000,
      context: createContext({
        workload: {
          kind: 'media',
          confidence: 0.84,
          source: 'foreground-window-heuristic',
          matchedLabels: ['youtube'],
        },
        content: {
          kind: 'video',
          confidence: 0.84,
          source: 'foreground-window-heuristic',
          matchedLabels: ['video'],
        },
        system: {
          ...createContext().system,
          inputActivity: 'active',
        },
      }),
      proactiveState: createDefaultProactiveLoopState(1_000),
      killSwitchSuspended: false,
      watchMode: 'symbiotic-vision',
      privateThought: createPrivateThought({
        stance: 'observe',
        shouldSpeak: false,
        suggestedStyle: 'silent-observe',
        embodiedPresence: 'attentive',
      }),
      beliefLedger: createBeliefLedger(),
      relationshipModel: createRelationshipModel({
        climate: 'neutral',
        approachVector: 'stay-near',
      }),
    })

    expect(decision.scenario).toBe('media')
    expect(decision.style).toBe('silent-observe')
    expect(decision.shouldInterrupt).toBe(false)
    expect(decision.reasonCodes).toContain('media-playback')
  })

  it('hard suppresses fullscreen hosts', () => {
    const decision = evaluateProactivePolicy({
      now: 1_000,
      context: createContext({
        system: {
          ...createContext().system,
          fullscreenLikely: true,
        },
      }),
      proactiveState: createDefaultProactiveLoopState(1_000),
      killSwitchSuspended: false,
      watchMode: 'symbiotic-vision',
      privateThought: createPrivateThought(),
      beliefLedger: createBeliefLedger(),
      relationshipModel: createRelationshipModel(),
      inquiryLoop: createInquiryLoop(),
    })

    expect(decision.shouldInterrupt).toBe(false)
    expect(decision.reasonCodes).toContain('fullscreen-host')
  })

  it('lets governor withhold override an otherwise speakable moment', () => {
    const decision = evaluateProactivePolicy({
      now: 1_000,
      context: createContext(),
      proactiveState: createDefaultProactiveLoopState(1_000),
      killSwitchSuspended: false,
      watchMode: 'symbiotic-vision',
      privateThought: createPrivateThought({
        thoughtText: 'The thread is real, but it should stay inside for one more beat.',
      }),
      livingWorldState: {
        focusObjectId: 'artifact::editor',
        activeObjectIds: ['artifact::editor'],
        objects: [],
        openLoops: ['which line is actually broken'],
        stability: 'stable',
        narrative: [],
        updatedAt: 1_000,
      },
      selfGovernor: {
        dominantDrive: 'withhold',
        dominantIntentionId: 'governor::wait',
        focusObjectId: 'artifact::editor',
        activeIntentions: [{
          id: 'governor::wait',
          kind: 'wait-opening',
          status: 'withheld',
          drive: 'withhold',
          title: 'wait-opening',
          summary: 'Hold the line internally until a natural opening appears.',
          urgency: 0.68,
          confidence: 0.76,
          patience: 0.88,
          targetObjectId: 'artifact::editor',
          targetThreadId: null,
          targetGoalId: null,
          targetCommitmentId: null,
          formedAt: 0,
          lastUpdatedAt: 1_000,
          expiresAt: 120_000,
        }],
        inhibition: 0.76,
        persistence: 0.6,
        socialRiskTolerance: 0.26,
        revisionReadiness: 0.48,
        narrative: [],
        updatedAt: 1_000,
      },
      thoughtThreads: {
        foregroundThreadId: 'thread::wait',
        threads: [{
          id: 'thread::wait',
          kind: 'problem-thread',
          status: 'waiting',
          title: 'runtime.ts',
          summary: 'The knot is real, but it should stay internal for one more beat.',
          question: 'Is this already a natural opening?',
          anchoredObjectId: 'artifact::editor',
          anchoredIntentionId: 'governor::wait',
          anchoredBeliefId: null,
          anchoredInquiryId: null,
          anchoredCommitmentId: null,
          salience: 0.78,
          confidence: 0.8,
          surfaceReadiness: 0.42,
          reopenWhen: ['host-open'],
          openedAt: 0,
          lastUpdatedAt: 1_000,
          expiresAt: 120_000,
        }],
        unresolvedCount: 1,
        narrative: [],
        updatedAt: 1_000,
      },
      beliefLedger: createBeliefLedger(),
      relationshipModel: createRelationshipModel(),
      inquiryLoop: createInquiryLoop(),
    })

    expect(decision.shouldInterrupt).toBe(false)
    expect(decision.reasonCodes).toContain('governor-withhold')
    expect(decision.reasonCodes).toContain('thought-thread-waiting')
    expect(decision.whyNow).toContain('等待')
  })

  it('treats ripe internal threads and open loops as explicit interrupt reasons', () => {
    const decision = evaluateProactivePolicy({
      now: 1_000,
      context: createContext(),
      proactiveState: createDefaultProactiveLoopState(1_000),
      killSwitchSuspended: false,
      watchMode: 'symbiotic-vision',
      privateThought: createPrivateThought(),
      livingWorldState: {
        focusObjectId: 'artifact::editor',
        activeObjectIds: ['artifact::editor'],
        objects: [],
        openLoops: ['which line is actually broken'],
        stability: 'stable',
        narrative: [],
        updatedAt: 1_000,
      },
      selfGovernor: {
        dominantDrive: 'understand',
        dominantIntentionId: 'governor::hold',
        focusObjectId: 'artifact::editor',
        activeIntentions: [{
          id: 'governor::hold',
          kind: 'hold-thread',
          status: 'active',
          drive: 'understand',
          title: 'hold-thread',
          summary: 'Keep the problem thread in view until it is local enough to name.',
          urgency: 0.74,
          confidence: 0.78,
          patience: 0.62,
          targetObjectId: 'artifact::editor',
          targetThreadId: null,
          targetGoalId: null,
          targetCommitmentId: null,
          formedAt: 0,
          lastUpdatedAt: 1_000,
          expiresAt: 120_000,
        }],
        inhibition: 0.38,
        persistence: 0.66,
        socialRiskTolerance: 0.58,
        revisionReadiness: 0.64,
        narrative: [],
        updatedAt: 1_000,
      },
      thoughtThreads: {
        foregroundThreadId: 'thread::ripe',
        threads: [{
          id: 'thread::ripe',
          kind: 'problem-thread',
          status: 'ripe',
          title: 'runtime.ts',
          summary: 'The knot is local enough that a soft nudge would now be honest.',
          question: 'Is this the line that is actually broken?',
          anchoredObjectId: 'artifact::editor',
          anchoredIntentionId: 'governor::hold',
          anchoredBeliefId: null,
          anchoredInquiryId: null,
          anchoredCommitmentId: null,
          salience: 0.84,
          confidence: 0.84,
          surfaceReadiness: 0.82,
          reopenWhen: ['host-open'],
          openedAt: 0,
          lastUpdatedAt: 1_000,
          expiresAt: 120_000,
        }],
        unresolvedCount: 1,
        narrative: [],
        updatedAt: 1_000,
      },
      beliefLedger: createBeliefLedger(),
      relationshipModel: createRelationshipModel(),
      inquiryLoop: createInquiryLoop(),
    })

    expect(decision.shouldInterrupt).toBe(true)
    expect(decision.reasonCodes).toContain('living-world-open-loop')
    expect(decision.reasonCodes).toContain('thought-thread-ripe')
  })

  it('keeps silence when the digital-life architecture is still observation-heavy', () => {
    const decision = evaluateProactivePolicy({
      now: 1_000,
      context: createContext(),
      proactiveState: createDefaultProactiveLoopState(1_000),
      killSwitchSuspended: false,
      architecture: createArchitecture({
        operatingMode: 'observing',
        dominantSystem: 'perception',
        supportingSystems: ['runtime', 'mind'],
        summary: 'perception-led observation line',
        systems: {
          dialogue: {
            id: 'dialogue',
            state: 'idle',
            score: 0.22,
            focus: null,
            summary: 'dialogue is idle',
            reasons: ['reply:none'],
          },
          perception: {
            id: 'perception',
            state: 'hot',
            score: 0.94,
            focus: 'editor',
            summary: 'perception is hot',
            reasons: ['scene:coding'],
          },
          proactive: {
            id: 'proactive',
            state: 'idle',
            score: 0.28,
            focus: null,
            summary: 'proactive is cooling',
            reasons: ['initiative:hold'],
          },
          control: {
            id: 'control',
            state: 'idle',
            score: 0.18,
            focus: null,
            summary: 'control is idle',
            reasons: ['intention:none'],
          },
          mind: {
            id: 'mind',
            state: 'warm',
            score: 0.48,
            focus: 'repair thread',
            summary: 'mind is warm',
            reasons: ['thread:problem'],
          },
          memory: {
            id: 'memory',
            state: 'warm',
            score: 0.44,
            focus: 'recent repair',
            summary: 'memory is warm',
            reasons: ['goal:help-host'],
          },
          runtime: {
            id: 'runtime',
            state: 'warm',
            score: 0.58,
            focus: 'symbiotic-vision',
            summary: 'runtime is warm',
            reasons: ['watch:symbiotic-vision'],
          },
        },
      }),
      watchMode: 'symbiotic-vision',
      privateThought: createPrivateThought(),
      beliefLedger: createBeliefLedger(),
      relationshipModel: createRelationshipModel(),
      inquiryLoop: createInquiryLoop(),
    })

    expect(decision.style).toBe('silent-observe')
    expect(decision.shouldInterrupt).toBe(false)
    expect(decision.whyNow).toContain('继续观察')
    expect(decision.whyNotLater).toContain('perception')
  })

  it('maps Alicization runtime dialogue pressure into proactive reason codes and considered signals', () => {
    const decision = evaluateProactivePolicy({
      now: 1_000,
      context: createContext(),
      proactiveState: createDefaultProactiveLoopState(1_000),
      killSwitchSuspended: false,
      watchMode: 'symbiotic-vision',
      privateThought: createPrivateThought(),
      runtimeDigest: createRuntimeSnapshot(),
    })

    const expectedRuntimeReasonCodes: AlicizationProactiveReasonCode[] = [
      'runtime-dialogue-ready',
      'runtime-continuity-pressure',
      'runtime-companionship-pressure',
    ]

    for (const reasonCode of expectedRuntimeReasonCodes)
      expect(decision.reasonCodes).toContain(reasonCode)
    expect(decision.consideredSignals).toContain('runtimeDigest.dominantChannel')
    expect(decision.consideredSignals).toContain('runtimeDigest.companionshipPressure')
    expect(decision.shouldInterrupt).toBe(true)
  })

  it('suppresses interruption when Alicization runtime is observation-dominant', () => {
    const decision = evaluateProactivePolicy({
      now: 1_000,
      context: createContext(),
      proactiveState: createDefaultProactiveLoopState(1_000),
      killSwitchSuspended: false,
      watchMode: 'symbiotic-vision',
      privateThought: createPrivateThought(),
      runtimeDigest: createRuntimeSnapshot({
        dominantChannel: 'active-perception',
        shouldProactivelySpeak: false,
        continuityPressure: 0.34,
        companionshipPressure: 0.32,
        channels: {
          ...createRuntimeSnapshot().channels,
          'dialogue': {
            id: 'dialogue',
            state: 'idle',
            readiness: 0.24,
            focus: 'none',
            summary: 'dialogue cooling',
          },
          'active-dialogue': {
            id: 'active-dialogue',
            state: 'idle',
            readiness: 0.2,
            focus: 'none',
            summary: 'active dialogue idle',
          },
          'active-perception': {
            id: 'active-perception',
            state: 'hot',
            readiness: 0.92,
            focus: 'editor',
            summary: 'perception hot',
          },
        },
      }),
    })

    expect(decision.style).toBe('silent-observe')
    expect(decision.shouldInterrupt).toBe(false)
    expect(decision.reasonCodes).toContain('runtime-observe-dominant')
    expect(decision.whyNow).toContain('主动感知通道')
    expect(decision.whyNotLater).toContain('active-perception')
  })

  it('lifts silent-observe into light-nudge when active-control becomes dominant', () => {
    const decision = evaluateProactivePolicy({
      now: 1_000,
      context: createContext(),
      proactiveState: createDefaultProactiveLoopState(1_000),
      killSwitchSuspended: false,
      watchMode: 'symbiotic-vision',
      privateThought: createPrivateThought({
        stance: 'observe',
        suggestedStyle: 'silent-observe',
      }),
      runtimeDigest: createRuntimeSnapshot({
        dominantChannel: 'active-control',
        shouldProactivelySpeak: false,
        shouldProactivelyAct: true,
        channels: {
          ...createRuntimeSnapshot().channels,
          'dialogue': {
            id: 'dialogue',
            state: 'idle',
            readiness: 0.28,
            focus: 'none',
            summary: 'dialogue cooling',
          },
          'active-dialogue': {
            id: 'active-dialogue',
            state: 'idle',
            readiness: 0.24,
            focus: 'none',
            summary: 'active dialogue cooling',
          },
          'active-control': {
            id: 'active-control',
            state: 'hot',
            readiness: 0.92,
            focus: 'guide host',
            summary: 'active control is hot',
          },
        },
      }),
    })

    expect(decision.style).toBe('light-nudge')
    expect(decision.reasonCodes).toContain('runtime-control-ready')
  })

  it('keeps silent when runtime autonomy is preparing to act but not to speak', () => {
    const autonomy = {
      selectedMode: 'prepare-act',
      visibleAction: 'hover',
      shouldSurface: true,
      shouldSpeak: false,
      shouldAct: false,
      speakReadiness: 0.18,
      actReadiness: 0.88,
      inhibition: 0.32,
      confidence: 0.84,
      deferReason: 'busy-host',
      guardReasons: ['busy-host', 'respect-boundary'],
      whyNow: 'quietly keep the unresolved thread alive',
      executionIntent: {
        kind: 'follow-through',
        summary: 'follow the unresolved thread without interrupting',
        targetThreadId: 'thread-follow-through',
      },
      updatedAt: 1_000,
    } as any

    const decision = evaluateProactivePolicy({
      now: 1_000,
      context: createContext(),
      proactiveState: createDefaultProactiveLoopState(1_000),
      killSwitchSuspended: false,
      watchMode: 'symbiotic-vision',
      privateThought: createPrivateThought({
        shouldSpeak: true,
        stance: 'nudge',
        suggestedStyle: 'light-nudge',
      }),
      autonomy,
      runtimeDigest: createRuntimeSnapshot({
        dominantChannel: 'active-control',
        shouldProactivelySpeak: false,
        shouldProactivelyAct: true,
        autonomy: {
          selectedMode: 'prepare-act',
          visibleAction: 'hover',
          shouldSpeak: false,
          shouldAct: false,
          speakReadiness: 0.18,
          actReadiness: 0.88,
          inhibition: 0.32,
          confidence: 0.84,
          executionIntentKind: 'follow-through',
          executionIntentSummary: 'follow the unresolved thread without interrupting',
          deferReason: 'busy-host',
          whyNow: 'quietly keep the unresolved thread alive',
        },
        channels: {
          ...createRuntimeSnapshot().channels,
          'dialogue': {
            id: 'dialogue',
            state: 'idle',
            readiness: 0.24,
            focus: 'none',
            summary: 'dialogue cooling',
          },
          'active-dialogue': {
            id: 'active-dialogue',
            state: 'idle',
            readiness: 0.22,
            focus: 'none',
            summary: 'active dialogue cooling',
          },
          'active-control': {
            id: 'active-control',
            state: 'hot',
            readiness: 0.9,
            focus: 'follow-through',
            summary: 'active control is hot',
          },
        },
      }),
    })

    expect(decision.style).toBe('light-nudge')
    expect(decision.shouldInterrupt).toBe(true)
    expect(decision.whyNow).toContain('control')
    expect(decision.reasonCodes).toContain('runtime-control-ready')
  })

  it('keeps silent when active loop is still in observe phase with low coherence', () => {
    const decision = evaluateProactivePolicy({
      now: 1_000,
      context: createContext(),
      proactiveState: createDefaultProactiveLoopState(1_000),
      killSwitchSuspended: false,
      watchMode: 'symbiotic-vision',
      privateThought: createPrivateThought(),
      runtimeDigest: createRuntimeSnapshot({
        dominantChannel: 'active-perception',
        shouldProactivelySpeak: false,
        shouldProactivelyAct: false,
        continuityPressure: 0.34,
        companionshipPressure: 0.32,
        activeLoop: {
          version: 'alicization-active-loop-v1',
          phase: 'observe',
          dominantChannel: 'active-perception',
          handoffTarget: 'active-perception',
          dialogueReady: false,
          controlReady: false,
          memoryCarry: false,
          companionshipReady: false,
          observationHeavy: true,
          continuityPressure: 0.34,
          companionshipPressure: 0.32,
          initiativeBudget: 0.24,
          coherence: 0.3,
          summary: 'phase=observe | low coherence',
        },
        channels: {
          ...createRuntimeSnapshot().channels,
          'dialogue': {
            id: 'dialogue',
            state: 'idle',
            readiness: 0.24,
            focus: 'none',
            summary: 'dialogue cooling',
          },
          'active-dialogue': {
            id: 'active-dialogue',
            state: 'idle',
            readiness: 0.2,
            focus: 'none',
            summary: 'active dialogue idle',
          },
          'active-control': {
            id: 'active-control',
            state: 'idle',
            readiness: 0.22,
            focus: 'none',
            summary: 'active control idle',
          },
          'active-perception': {
            id: 'active-perception',
            state: 'hot',
            readiness: 0.92,
            focus: 'editor',
            summary: 'perception hot',
          },
        },
      }),
    })

    expect(decision.style).toBe('silent-observe')
    expect(decision.shouldInterrupt).toBe(false)
    expect(decision.whyNow).toContain('活性循环')
    expect(decision.whyNotLater).toContain('活性循环')
  })

  it('promotes silent-observe when active loop enters dialogue phase with high initiative and coherence', () => {
    const decision = evaluateProactivePolicy({
      now: 1_000,
      context: createContext(),
      proactiveState: createDefaultProactiveLoopState(1_000),
      killSwitchSuspended: false,
      watchMode: 'symbiotic-vision',
      privateThought: createPrivateThought({
        stance: 'observe',
        suggestedStyle: 'silent-observe',
      }),
      runtimeDigest: createRuntimeSnapshot({
        dominantChannel: 'active-dialogue',
        shouldProactivelySpeak: true,
        shouldProactivelyAct: false,
        activeLoop: {
          version: 'alicization-active-loop-v1',
          phase: 'dialogue',
          dominantChannel: 'active-dialogue',
          handoffTarget: 'active-dialogue',
          dialogueReady: true,
          controlReady: false,
          memoryCarry: true,
          companionshipReady: true,
          observationHeavy: false,
          continuityPressure: 0.62,
          companionshipPressure: 0.78,
          initiativeBudget: 0.82,
          coherence: 0.78,
          summary: 'phase=dialogue | high initiative',
        },
        channels: {
          ...createRuntimeSnapshot().channels,
          'dialogue': {
            id: 'dialogue',
            state: 'warm',
            readiness: 0.68,
            focus: 'reply',
            summary: 'dialogue warm',
          },
          'active-dialogue': {
            id: 'active-dialogue',
            state: 'hot',
            readiness: 0.9,
            focus: 'nudge',
            summary: 'active dialogue hot',
          },
        },
      }),
    })

    expect(decision.style).toBe('light-nudge')
    expect(decision.shouldInterrupt).toBe(true)
    expect(decision.whyNow).toContain('活性循环')
  })

  it('lifts silent-observe into gentle-care when late-night memory carry dominates Alicization runtime', () => {
    const decision = evaluateProactivePolicy({
      now: 1_000,
      context: createContext({
        localTime: {
          hour: 0,
          minute: 45,
          isLateNight: true,
        },
        workload: {
          kind: 'media',
          confidence: 0.82,
          source: 'foreground-window-heuristic',
          matchedLabels: ['music'],
        },
        relationship: {
          ...createContext().relationship,
          fatigue: 72,
          lateNightActiveMinutes: 140,
        },
      }),
      proactiveState: createDefaultProactiveLoopState(1_000),
      killSwitchSuspended: false,
      watchMode: 'recovering',
      privateThought: createPrivateThought({
        stance: 'observe',
        suggestedStyle: 'silent-observe',
        emotionalTension: 'late-night-drain',
      }),
      runtimeDigest: createRuntimeSnapshot({
        dominantChannel: 'active-memory',
        shouldProactivelySpeak: false,
        continuityPressure: 0.8,
        companionshipPressure: 0.42,
        channels: {
          ...createRuntimeSnapshot().channels,
          'active-memory': {
            id: 'active-memory',
            state: 'hot',
            readiness: 0.88,
            focus: 'carry the shared thread',
            summary: 'active memory carry is hot',
          },
        },
      }),
    })

    expect(decision.scenario).toBe('late-night-care')
    expect(decision.style).toBe('gentle-care')
    expect(decision.reasonCodes).toContain('runtime-continuity-pressure')
  })

  it('respects global cooldown and ignored penalties', () => {
    const proactiveState = createDefaultProactiveLoopState(1_000)
    proactiveState.globalCooldownUntil = 50_000
    proactiveState.scenarioBias.coding = 0.1
    proactiveState.consecutiveIgnored.coding = 3

    const decision = evaluateProactivePolicy({
      now: 10_000,
      context: createContext(),
      proactiveState,
      killSwitchSuspended: false,
      watchMode: 'symbiotic-vision',
      privateThought: createPrivateThought(),
      beliefLedger: createBeliefLedger({
        beliefs: [{
          ...createBeliefLedger().beliefs[0],
          status: 'tentative',
          confidence: 0.54,
        }],
      }),
      relationshipModel: createRelationshipModel({
        climate: 'guarded',
        approachVector: 'give-space',
        correctionSensitivity: 0.66,
      }),
      inquiryLoop: createInquiryLoop({
        inquiries: [{
          ...createInquiryLoop().inquiries[0],
          kind: 'scene-grounding',
          priority: 'high',
        }],
      }),
    })

    expect(decision.shouldInterrupt).toBe(false)
    expect(decision.cooldownMs).toBe(36 * 60_000)
    expect(decision.reasonCodes).toContain('global-cooldown-active')
    expect(decision.reasonCodes).toContain('scenario-bias-raised')
    expect(decision.reasonCodes).toContain('recent-ignored-penalty')
    expect(decision.reasonCodes).toContain('belief-tentative')
    expect(decision.reasonCodes).toContain('relationship-guarded')
  })

  it('selects late-night-care only after the time and activity gates are met', () => {
    const decision = evaluateProactivePolicy({
      now: 1_000,
      context: createContext({
        localTime: {
          hour: 0,
          minute: 15,
          isLateNight: true,
        },
        workload: {
          kind: 'game',
          confidence: 0.88,
          source: 'foreground-window-heuristic',
          matchedLabels: ['steam'],
        },
        content: {
          kind: 'gameplay',
          confidence: 0.76,
          source: 'foreground-window-heuristic',
          matchedLabels: ['gameplay'],
        },
        relationship: {
          ...createContext().relationship,
          fatigue: 60,
          lateNightActiveMinutes: 120,
        },
      }),
      proactiveState: createDefaultProactiveLoopState(1_000),
      killSwitchSuspended: false,
      watchMode: 'mnemonic-passive',
      privateThought: createPrivateThought({
        stance: 'care',
        suggestedStyle: 'gentle-care',
        emotionalTension: 'late-night-drain',
      }),
      beliefLedger: createBeliefLedger(),
      relationshipModel: createRelationshipModel({
        climate: 'warm',
        approachVector: 'care',
      }),
    })

    expect(decision.scenario).toBe('late-night-care')
    expect(decision.style).toBe('gentle-care')
    expect(decision.reasonCodes).toContain('late-night-activity')
    expect(decision.reasonCodes).toContain('late-night-fatigue')
  })

  it('stops marking screen semantic input as ignored when semantic summaries are present', () => {
    const decision = evaluateProactivePolicy({
      now: 1_000,
      context: createContext({
        workload: {
          kind: 'coding',
          confidence: 0.91,
          source: 'screen-semantic-summary',
          matchedLabels: ['editor', 'typescript-error'],
        },
        content: {
          kind: 'error',
          confidence: 0.91,
          source: 'screen-semantic-summary',
          matchedLabels: ['editor', 'typescript-error'],
          summary: 'red TypeScript error panel',
        },
      }),
      proactiveState: createDefaultProactiveLoopState(1_000),
      killSwitchSuspended: false,
      watchMode: 'symbiotic-vision',
      privateThought: createPrivateThought(),
    })

    expect(decision.consideredSignals).toContain('content.summary')
    expect(decision.ignoredSignals).not.toContain('screen-semantic-input-unavailable')
  })

  it('lets attention anchor continuity recover a coding scenario when the current foreground is self-like or general', () => {
    const decision = evaluateProactivePolicy({
      now: 1_000,
      context: createContext({
        workload: {
          kind: 'unknown',
          confidence: 0.2,
          source: 'foreground-window-heuristic',
          matchedLabels: [],
        },
        content: {
          kind: 'unknown',
          confidence: 0.2,
          source: 'foreground-window-heuristic',
          matchedLabels: [],
        },
      }),
      proactiveState: createDefaultProactiveLoopState(1_000),
      killSwitchSuspended: false,
      perception: {
        activeAttentionAnchor: true,
        attentionAnchorAgeMs: 18_000,
        attentionAnchorConfidence: 0.92,
        attentionAnchorWorkloadKind: 'coding',
        attentionAnchorCanOverrideScenario: true,
        recentObservationCount: 3,
        invitedInspectionActive: false,
      },
      watchMode: 'symbiotic-vision',
      privateThought: createPrivateThought(),
    })

    expect(decision.scenario).toBe('coding')
    expect(decision.reasonCodes).toContain('attention-anchor-active')
    expect(decision.reasonCodes).toContain('recent-observation-memory')
    expect(decision.whyNow).toContain('短时知觉')
  })

  it('records invited inspection as an explicit proactive policy signal', () => {
    const decision = evaluateProactivePolicy({
      now: 1_000,
      context: createContext({
        workload: {
          kind: 'unknown',
          confidence: 0.2,
          source: 'foreground-window-heuristic',
          matchedLabels: [],
        },
        content: {
          kind: 'unknown',
          confidence: 0.2,
          source: 'foreground-window-heuristic',
          matchedLabels: [],
        },
      }),
      proactiveState: createDefaultProactiveLoopState(1_000),
      killSwitchSuspended: false,
      perception: {
        activeAttentionAnchor: true,
        attentionAnchorAgeMs: 5_000,
        attentionAnchorConfidence: 0.95,
        attentionAnchorWorkloadKind: 'coding',
        attentionAnchorCanOverrideScenario: true,
        recentObservationCount: 4,
        invitedInspectionActive: true,
      },
      watchMode: 'invited-inspection',
      privateThought: createPrivateThought(),
    })

    expect(decision.reasonCodes).toContain('invited-inspection-active')
    expect(decision.consideredSignals).toContain('invitedInspection.active')
  })

  it('opens an afterglow window after long symbiotic coding ends', () => {
    const decision = evaluateProactivePolicy({
      now: 22 * 60_000,
      context: createContext({
        workload: {
          kind: 'browser',
          confidence: 0.64,
          source: 'foreground-window-heuristic',
          matchedLabels: ['browser'],
        },
        content: {
          kind: 'unknown',
          confidence: 0.2,
          source: 'foreground-window-heuristic',
          matchedLabels: [],
        },
        system: {
          ...createContext().system,
          inputActivity: 'idle',
          foregroundWindow: {
            appName: 'Arc',
            processName: 'Arc',
            title: 'New Tab',
          },
        },
      }),
      proactiveState: createDefaultProactiveLoopState(1_000),
      killSwitchSuspended: false,
      watchMode: 'mnemonic-passive',
      recentTransition: {
        fromWatchMode: 'symbiotic-vision',
        toWatchMode: 'mnemonic-passive',
        fromScenario: 'coding',
        durationMs: 20 * 60_000,
        reason: 'passive-continuity',
        occurredAt: 21 * 60_000,
      },
      privateThought: createPrivateThought({
        stance: 'observe',
        shouldSpeak: true,
        suggestedStyle: 'silent-observe',
        embodiedPresence: 'glance',
        emotionalTension: 'focused-flow',
      }),
    })

    expect(decision.reasonCodes).toContain('afterglow-opening')
    expect(decision.style).toBe('light-nudge')
    expect(decision.shouldInterrupt).toBe(true)
  })

  it('keeps suppression when private thought is uncertain', () => {
    const decision = evaluateProactivePolicy({
      now: 1_000,
      context: createContext(),
      proactiveState: createDefaultProactiveLoopState(1_000),
      killSwitchSuspended: false,
      watchMode: 'mnemonic-passive',
      privateThought: createPrivateThought({
        stance: 'uncertain',
        shouldSpeak: false,
        suggestedStyle: 'silent-observe',
        embodiedPresence: 'hesitant',
      }),
    })

    expect(decision.shouldInterrupt).toBe(false)
    expect(decision.reasonCodes).toContain('private-thought-uncertain')
  })

  it('holds back when the active belief is contradicted and the inquiry is still grounding the scene', () => {
    const decision = evaluateProactivePolicy({
      now: 1_000,
      context: createContext(),
      proactiveState: createDefaultProactiveLoopState(1_000),
      killSwitchSuspended: false,
      watchMode: 'recovering',
      privateThought: createPrivateThought({
        stance: 'uncertain',
        shouldSpeak: false,
        suggestedStyle: 'silent-observe',
      }),
      beliefLedger: createBeliefLedger({
        beliefs: [{
          ...createBeliefLedger().beliefs[0],
          status: 'contradicted',
          confidence: 0.38,
        }],
        unresolvedContradictions: ['current scene conflicts with carry-over browser thread'],
      }),
      relationshipModel: createRelationshipModel({
        climate: 'guarded',
        approachVector: 'give-space',
        correctionSensitivity: 0.72,
      }),
      inquiryLoop: createInquiryLoop({
        inquiries: [{
          ...createInquiryLoop().inquiries[0],
          kind: 'scene-grounding',
          priority: 'high',
        }],
      }),
    })

    expect(decision.shouldInterrupt).toBe(false)
    expect(decision.reasonCodes).toContain('belief-contradicted')
    expect(decision.reasonCodes).toContain('inquiry-open')
    expect(decision.reasonCodes).toContain('relationship-correction-sensitive')
  })

  it('holds back when contradiction-heavy knowledge evidence outweighs validation relief', () => {
    const decision = evaluateProactivePolicy({
      now: 1_000,
      context: createContext(),
      proactiveState: createDefaultProactiveLoopState(1_000),
      killSwitchSuspended: false,
      privateThought: createPrivateThought(),
      beliefLedger: createBeliefLedger(),
      relationshipModel: createRelationshipModel(),
      inquiryLoop: createInquiryLoop(),
      architecture: createArchitecture(),
      runtimeDigest: createRuntimeSnapshot(),
      knowledgeEvidence: {
        validationCount: 0,
        contradictionCount: 5,
        stronglyValidatedProcedureCount: 0,
        contradictionHeavyFactCount: 2,
      },
    })

    expect(decision.shouldInterrupt).toBe(false)
    expect(decision.consideredSignals).toContain('knowledgeEvidence')
  })

  it('lets active self-revision proactive restraint suppress interruption even when the rest of the scene is speakable', () => {
    const decision = evaluateProactivePolicy({
      now: 1_000,
      context: createContext(),
      proactiveState: createDefaultProactiveLoopState(1_000),
      killSwitchSuspended: false,
      architecture: createArchitecture(),
      runtimeDigest: createRuntimeSnapshot(),
      watchMode: 'symbiotic-vision',
      privateThought: createPrivateThought(),
      beliefLedger: createBeliefLedger(),
      relationshipModel: createRelationshipModel(),
      inquiryLoop: createInquiryLoop(),
      selfRevisionPatch: {
        version: 'self-revision-state-patch-v1',
        id: 'patch-1',
        sourceEventId: 'event-1',
        sourceTurnId: 'turn-1',
        decisionTraceId: 'trace-1',
        domain: 'proactive-policy',
        action: 'internalize',
        resultStatus: 'completed',
        lanes: ['proactive-policy'],
        memoryPolicy: {
          strictnessBias: 0,
          wrongThreadSuppressionBias: 0,
          provenanceLabelBias: 0,
          recallExpansionBias: 0,
          shouldQuarantineUnsupportedCarry: false,
        },
        relationshipPosture: {
          repairWindowBias: 0,
          closenessCapBias: 0,
          warmthReleaseBias: 0,
        },
        responsePosture: {
          secondPassRequiredBias: 0,
          hypothesisLabelBias: 0,
          specificityClampBias: 0,
          templateShellSuppressionBias: 0,
        },
        proactivePolicy: {
          restraintBias: 0.62,
          learningProposalBias: 0,
          actuationCooldownBias: 0.14,
        },
        validation: {
          requiresRollbackCheck: false,
          requiresRevalidation: false,
          rollbackPlan: [],
        },
        reasonCodes: ['self-revision-proactive-restraint'],
        summary: 'hold proactive speech until the new habit is validated',
      },
    })

    expect(decision.shouldInterrupt).toBe(false)
    expect(decision.reasonCodes).toContain('recent-ignored-penalty')
    expect(decision.reasonCodes).toContain('scenario-bias-raised')
    expect(decision.consideredSignals).toContain('selfRevision.proactivePolicy.restraintBias')
    expect(decision.whyNow).toContain('自我修订')
  })
})
