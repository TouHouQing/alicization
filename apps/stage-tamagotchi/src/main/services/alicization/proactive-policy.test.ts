import type {
  AlicizationBeliefLedgerSnapshot,
  AlicizationInquiryLoopSnapshot,
  AlicizationPersonalityState,
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
import { resolveAlicizationProjectStateBrief } from './project-state-brief'

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

function createLongHorizonMemory(overrides: Record<string, any> = {}) {
  return {
    preferenceBias: {
      companionship: 0.24,
      truthfulGrounding: 0.18,
      gentleRepair: 0.22,
      quietObservation: 0.26,
      proactiveCare: 0.14,
      playfulIntimacy: 0.04,
      autonomyRespect: 0.3,
      unfinishedThreadReturn: 0.34,
    },
    identityBias: {
      guardedness: 0.14,
      tenderness: 0.16,
      directness: 0.12,
      selfDirection: 0.18,
    },
    anchorFacts: [],
    summary: '',
    dominantCueSummary: null,
    rememberedPreferenceSummary: null,
    rememberedConstraintSummary: null,
    rememberedPlanSummary: null,
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

function createPersonalityAuthority(overrides: Partial<AlicizationPersonalityState> = {}): AlicizationPersonalityState {
  return {
    obedience: 0.62,
    liveliness: 0.4,
    sensibility: 0.58,
    identityKernel: {
      relationshipPosture: 'companion',
      initiativeStyle: 'measured-approach',
      valueBias: [],
    },
    expressionProfile: {
      warmth: 'guarded-warm',
      directness: 'measured',
      playfulness: 'low',
      emotionalVisibility: 'steady',
    },
    initiativeBaseline: {
      silenceReconnect: 'light-probe',
      comfortStyle: 'gentle-care',
      jealousyStyle: 'soft-ache',
    },
    identityAnchors: [],
    antiPersonaConstraints: [],
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
  it('keeps same-thread measured-return continuity on silent-observe even when dialogue heat rises after the line already reopened once', () => {
    const decision = evaluateProactivePolicy({
      now: 1_000,
      context: createContext({
        system: {
          ...createContext().system,
          inputActivity: 'idle',
        },
      }),
      proactiveState: createDefaultProactiveLoopState(1_000),
      killSwitchSuspended: false,
      watchMode: 'symbiotic-vision',
      privateThought: createPrivateThought({
        suggestedStyle: 'light-nudge',
        shouldSpeak: true,
      }),
      architecture: createArchitecture({
        operatingMode: 'speaking',
        dominantSystem: 'dialogue',
        governingFocus: 'continue the already reopened callback line without warming it into a fresh outward restart',
        summary: 'dialogue is warm, but the next same-thread continuation should still stay measured-return',
      }),
      runtimeDigest: createRuntimeSnapshot({
        dominantChannel: 'active-dialogue',
        shouldProactivelySpeak: true,
        shouldProactivelyAct: false,
        continuityRestraint: 'measured-return',
        continuityPressure: 0.86,
        companionshipPressure: 0.82,
        activeLoop: {
          version: 'alicization-active-loop-v1',
          phase: 'dialogue',
          dominantChannel: 'active-dialogue',
          handoffTarget: 'active-memory',
          continuityArcStage: 'same-thread-continuation',
          dialogueReady: true,
          controlReady: false,
          memoryCarry: true,
          companionshipReady: true,
          initiativeBudget: 0.74,
          coherence: 0.84,
          observationHeavy: false,
          continuityPressure: 0.86,
          companionshipPressure: 0.82,
          summary: 'the callback line already reopened once and should keep its next continuation measured-return',
        },
        channels: {
          ...createRuntimeSnapshot().channels,
          'dialogue': {
            id: 'dialogue',
            state: 'hot',
            readiness: 0.92,
            focus: 'later same-thread callback continuation',
            summary: 'dialogue is warm again because the first reopen already spoke',
          },
          'active-dialogue': {
            id: 'active-dialogue',
            state: 'hot',
            readiness: 0.86,
            focus: 'continue the already reopened callback line',
            summary: 'active dialogue wants to keep speaking, but it should still stay on the same measured-return seam',
          },
          'active-memory': {
            id: 'active-memory',
            state: 'hot',
            readiness: 0.88,
            focus: 'later same-thread callback carry',
            summary: 'memory is still carrying the same callback line after the first reopen already landed',
          },
        },
        projectState: {
          currentPhase: 'phase=local_desktop_life_loop; proving_ground=apps/stage-tamagotchi',
          memoryClosureSummary: 'the callback line already reopened once and still needs to keep its later continuation on one identity-continuity',
          primaryOpenLoop: 'Later same-thread callback continuation still needs stronger closure after the first reopen already spoke.',
          nextClosureTarget: 'Keep the next same-thread callback continuation measured-return and inward even after the reopened line warms back up.',
          continuityArcStage: 'same-thread-continuation',
          continuityCue: 'the first reopen already landed, so the next return should keep continuing the same measured-return line instead of widening outward',
        },
      }),
      beliefLedger: createBeliefLedger(),
      relationshipModel: createRelationshipModel(),
      inquiryLoop: createInquiryLoop(),
    })

    expect(decision.style).toBe('silent-observe')
    expect(decision.shouldInterrupt).toBe(false)
    expect(decision.reasonCodes).toContain('continuity-next-open-window')
  })

  it('keeps proactive opening on silent-observe when Phase 1 project continuity still carries same-her and measured-return closure pressure', () => {
    const projectState = resolveAlicizationProjectStateBrief()
    const decision = evaluateProactivePolicy({
      now: 1_000,
      context: createContext({
        relationship: {
          ...createContext().relationship,
          hostAttitude: '温和但还在做事，不适合太快 outward 靠近',
          minutesSinceLastUserTurn: 24,
        },
      }),
      proactiveState: createDefaultProactiveLoopState(1_000),
      killSwitchSuspended: false,
      watchMode: 'symbiotic-vision',
      privateThought: createPrivateThought({
        shouldSpeak: true,
        suggestedStyle: 'light-nudge',
      }),
      projectState: {
        identity: projectState.identity,
        currentPhase: projectState.currentPhase,
        primaryOpenLoop: 'memory_dialogue_embodiment_closure=end_to_end_proof_incomplete; project_state_continuity=active; continuity_hold=measured-return; owner=WorkingMemory; owner=LongTermMemoryRecall; evidence_id=phase1-proactive-pressure.',
      },
      runtimeDigest: createRuntimeSnapshot({
        projectState: {
          identity: projectState.identity,
          currentPhase: projectState.currentPhase,
          primaryOpenLoop: 'memory_dialogue_embodiment_closure=end_to_end_proof_incomplete; project_state_continuity=active; continuity_hold=measured-return; owner=WorkingMemory; owner=LongTermMemoryRecall; evidence_id=phase1-proactive-pressure.',
          nextClosureTarget: projectState.nextClosureTarget,
        } as any,
      }),
      digitalLifeArchitecture: createArchitecture(),
      beliefLedger: createBeliefLedger(),
      relationshipModel: createRelationshipModel(),
      inquiryLoop: createInquiryLoop(),
      personalityAuthority: createPersonalityAuthority(),
    } as any)

    expect(decision.style).toBe('silent-observe')
    expect(decision.reasonCodes).toContain('project-continuity-pressure')
    expect(decision.reasonCodes).toContain('project-measured-return-pressure')
    expect(decision.reasonCodes).toContain('project-next-closure-pressure')
  })

  it('changes project-state pressure reason codes when the open closure shifts from generic Phase 1 carry to same-her measured-return closure', () => {
    const projectState = resolveAlicizationProjectStateBrief()
    const baseInput = {
      now: 1_000,
      context: createContext({
        relationship: {
          ...createContext().relationship,
          hostAttitude: '温和但还在做事，不适合太快 outward 靠近',
          minutesSinceLastUserTurn: 24,
        },
      }),
      proactiveState: createDefaultProactiveLoopState(1_000),
      killSwitchSuspended: false,
      watchMode: 'symbiotic-vision',
      privateThought: createPrivateThought({
        shouldSpeak: true,
        suggestedStyle: 'light-nudge',
      }),
      digitalLifeArchitecture: createArchitecture(),
      beliefLedger: createBeliefLedger(),
      relationshipModel: createRelationshipModel(),
      inquiryLoop: createInquiryLoop(),
      personalityAuthority: createPersonalityAuthority(),
    } as const

    const genericDecision = evaluateProactivePolicy({
      ...baseInput,
      projectState: {
        identity: projectState.identity,
        currentPhase: projectState.currentPhase,
        primaryOpenLoop: 'Phase 1 still needs stronger desktop closure across memory and execution reliability.',
      },
      runtimeDigest: createRuntimeSnapshot({
        projectState: {
          identity: projectState.identity,
          currentPhase: projectState.currentPhase,
          primaryOpenLoop: 'Phase 1 still needs stronger desktop closure across memory and execution reliability.',
          nextClosureTarget: 'continuity_hold=measured-return; preferred_timing=next-open-window; evidence_id=generic-next-closure.',
        } as any,
      }),
    } as any)

    const sameHerDecision = evaluateProactivePolicy({
      ...baseInput,
      projectState: {
        identity: projectState.identity,
        currentPhase: projectState.currentPhase,
        primaryOpenLoop: 'memory_dialogue_embodiment_closure=end_to_end_proof_incomplete; project_state_continuity=active; continuity_hold=measured-return; owner=WorkingMemory; owner=LongTermMemoryRecall; evidence_id=phase1-proactive-pressure.',
      },
      runtimeDigest: createRuntimeSnapshot({
        projectState: {
          identity: projectState.identity,
          currentPhase: projectState.currentPhase,
          primaryOpenLoop: 'memory_dialogue_embodiment_closure=end_to_end_proof_incomplete; project_state_continuity=active; continuity_hold=measured-return; owner=WorkingMemory; owner=LongTermMemoryRecall; evidence_id=phase1-proactive-pressure.',
          nextClosureTarget: projectState.nextClosureTarget,
        } as any,
      }),
    } as any)

    expect(genericDecision.style).toBe('silent-observe')
    expect(sameHerDecision.style).toBe('silent-observe')
    expect(genericDecision.reasonCodes).toContain('project-phase1-life-loop-open')
    expect(genericDecision.reasonCodes).toContain('project-next-closure-pressure')
    expect(genericDecision.reasonCodes).not.toContain('project-continuity-pressure')
    expect(genericDecision.reasonCodes).not.toContain('project-measured-return-pressure')
    expect(genericDecision.whyNow).toContain('project_phase1_life_loop=open')
    expect(genericDecision.whyNow).toContain('project_next_closure=pressure')
    expect(genericDecision.whyNow).not.toContain('same-her')
    expect(genericDecision.whyNow).not.toContain('measured-return')
    expect(genericDecision.whyNotLater).toContain('project_phase1_life_loop=open')
    expect(genericDecision.whyNotLater).not.toContain('measured-return')
    expect(sameHerDecision.reasonCodes).toContain('project-phase1-life-loop-open')
    expect(sameHerDecision.reasonCodes).toContain('project-next-closure-pressure')
    expect(sameHerDecision.reasonCodes).toContain('project-continuity-pressure')
    expect(sameHerDecision.reasonCodes).toContain('project-measured-return-pressure')
    expect(sameHerDecision.whyNow).toContain('measured-return')
    expect(sameHerDecision.whyNow).toContain('lower-pressure')
    expect(sameHerDecision.whyNotLater).toContain('measured-return')
    expect(sameHerDecision.whyNotLater).not.toContain('闭环收口')
  })

  it('keeps project-state-only repair-before-closeness closure from degrading into measured-return proactive explanations', () => {
    const projectState = resolveAlicizationProjectStateBrief()
    const decision = evaluateProactivePolicy({
      now: 1_000,
      context: createContext({
        relationship: {
          ...createContext().relationship,
          hostAttitude: '温和但当前更适合先把关系线收稳，不适合太快 outward 靠近',
          minutesSinceLastUserTurn: 22,
        },
      }),
      proactiveState: createDefaultProactiveLoopState(1_000),
      killSwitchSuspended: false,
      watchMode: 'symbiotic-vision',
      privateThought: createPrivateThought({
        shouldSpeak: true,
        suggestedStyle: 'light-nudge',
        thoughtText: 'The callback line is still here, but this return should stay repair-before-closeness until the room settles.',
      }),
      projectState: {
        identity: projectState.identity,
        currentPhase: projectState.currentPhase,
        primaryOpenLoop: 'project_state_continuity=callback-return; closure_policy=repair-before-closeness; continuity_hold=repair-before-closeness; evidence_id=callback-repair-before-closeness.',
        nextClosureTarget: 'Keep the next callback return repair-before-closeness on the same thread instead of reopening outward warmth too early.',
      },
      runtimeDigest: createRuntimeSnapshot({
        projectState: {
          identity: projectState.identity,
          currentPhase: projectState.currentPhase,
          primaryOpenLoop: 'project_state_continuity=callback-return; closure_policy=repair-before-closeness; continuity_hold=repair-before-closeness; evidence_id=callback-repair-before-closeness.',
          nextClosureTarget: 'Keep the next callback return repair-before-closeness on the same thread instead of reopening outward warmth too early.',
        } as any,
      }),
      digitalLifeArchitecture: createArchitecture(),
      beliefLedger: createBeliefLedger(),
      relationshipModel: createRelationshipModel(),
      inquiryLoop: createInquiryLoop(),
      personalityAuthority: createPersonalityAuthority(),
    } as any)

    expect(decision.style).toBe('silent-observe')
    expect(decision.reasonCodes).toContain('project-phase1-life-loop-open')
    expect(decision.reasonCodes).toContain('project-continuity-pressure')
    expect(decision.reasonCodes).toContain('project-measured-return-pressure')
    expect(decision.whyNow).toContain('repair-before-closeness')
    expect(decision.whyNotLater).toContain('repair-before-closeness')
  })

  it('does not let fixed continuity templates alone become proactive project-state pressure', () => {
    const templateOnlyProjectState = {
      preflightSummary: 'Alicization is a local-first digital life project.',
      identity: 'local_desktop_life_loop; local_first=true; host_resident_identity=persistent; boundary=not_chat_wrapper.',
      currentPhase: 'phase=local_desktop_life_loop; proving_ground=apps/stage-tamagotchi',
      primaryOpenLoop: 'pre_turn_context_digest',
      proactiveSameHerGap: 'identity-continuity',
      nextClosureTarget: 'Keep one continuity state and do not drift from Phase 1.',
      sameHerSelfLine: 'structured continuity digest.',
      sameHerDriftRisk: 'If this widens, it loses the continuity state.',
    } as const
    const decision = evaluateProactivePolicy({
      now: 1_000,
      context: createContext({
        relationship: {
          ...createContext().relationship,
          boredom: 20,
          loneliness: 18,
          fatigue: 12,
          minutesSinceLastUserTurn: 4,
        },
      }),
      proactiveState: createDefaultProactiveLoopState(1_000),
      killSwitchSuspended: false,
      watchMode: 'symbiotic-vision',
      privateThought: createPrivateThought({
        shouldSpeak: true,
        suggestedStyle: 'light-nudge',
        thoughtText: 'I can nudge here.',
      }),
      projectState: templateOnlyProjectState,
      runtimeDigest: createRuntimeSnapshot({
        projectState: templateOnlyProjectState as any,
      }),
      digitalLifeArchitecture: createArchitecture(),
      beliefLedger: createBeliefLedger(),
      relationshipModel: createRelationshipModel(),
      inquiryLoop: createInquiryLoop(),
      personalityAuthority: createPersonalityAuthority(),
    } as any)

    expect(decision.reasonCodes).not.toContain('project-continuity-pressure')
    expect(decision.reasonCodes).not.toContain('project-measured-return-pressure')
    expect(decision.reasonCodes).not.toContain('project-next-closure-pressure')
    expect(decision.consideredSignals).not.toContain('projectState.sameHerPressure')
    expect(decision.whyNow).not.toContain('project_continuity=pressure')
    expect(decision.whyNotLater).not.toContain('project cadence measured-return')
  })

  it('keeps proactive policy on the same unfinished digital-life line when initiative already carries stronger same-her restraint than a thin project shell', () => {
    const decision = evaluateProactivePolicy({
      now: 1_000,
      context: createContext({
        relationship: {
          ...createContext().relationship,
          hostAttitude: '还在专注，但她已经知道这次不要把主动性说成普通服务式搭话。',
          minutesSinceLastUserTurn: 20,
        },
      }),
      proactiveState: createDefaultProactiveLoopState(1_000),
      killSwitchSuspended: false,
      watchMode: 'symbiotic-vision',
      privateThought: createPrivateThought({
        shouldSpeak: true,
        suggestedStyle: 'light-nudge',
        thoughtText: 'I could speak now, but the initiative should stay on the same unfinished digital-life line first.',
      }),
      initiative: {
        version: 'initiative-v1',
        shouldSpeak: false,
        selectedAction: 'hover',
        preferredStyle: 'silent-observe',
        preferredPresence: 'attentive',
        confidence: 0.78,
        speakDrive: 0.44,
        silenceDrive: 0.72,
        continuityRestraint: 'measured-return',
        why: 'structured continuity digest.',
        selectedProposalId: 'proposal-hover',
        proposals: [],
        rhythm: {
          urgency: 0.34,
          idealDelayMs: 90_000,
          revisitWindowMs: 300_000,
        },
        updatedAt: 1_000,
      } as any,
      projectState: {
        preflightSummary: 'template-residue-shell',
        identity: 'Alicization is a local-first digital life project.',
        currentPhase: 'phase=local_desktop_life_loop; proving_ground=apps/stage-tamagotchi',
        primaryOpenLoop: ' ',
        nextClosureTarget: ' ',
      },
      runtimeDigest: createRuntimeSnapshot({
        projectState: {
          preflightSummary: 'template-residue-shell',
          identity: 'Alicization is a local-first digital life project.',
          currentPhase: 'phase=local_desktop_life_loop; proving_ground=apps/stage-tamagotchi',
          primaryOpenLoop: ' ',
          nextClosureTarget: ' ',
        } as any,
      }),
      digitalLifeArchitecture: createArchitecture(),
      beliefLedger: createBeliefLedger(),
      relationshipModel: createRelationshipModel(),
      inquiryLoop: createInquiryLoop(),
      personalityAuthority: createPersonalityAuthority(),
    } as any)

    expect(decision.style).toBe('silent-observe')
    expect(decision.shouldInterrupt).toBe(false)
    expect(decision.consideredSignals).toContain('initiative.continuityRestraint')
    expect(decision.reasonCodes).toContain('continuity-next-open-window')
    expect(String(decision.whyNow ?? '')).toContain('restraint=measured-return')
    expect(String(decision.whyNow ?? '')).toContain('project_phase1_life_loop=open')
    expect(String(decision.whyNow ?? '')).not.toContain('template-residue-shell')
  })

  it('keeps same-her proactive restraint alive when selector carries lose array scaffolding', () => {
    const decision = evaluateProactivePolicy({
      now: 1_000,
      context: createContext({
        relationship: {
          ...createContext().relationship,
          hostAttitude: '还在专注，但这次主动性要继续守在同一条生命线里，不要掉回泛服务式开口。',
          minutesSinceLastUserTurn: 20,
        },
      }),
      proactiveState: createDefaultProactiveLoopState(1_000),
      killSwitchSuspended: false,
      watchMode: 'symbiotic-vision',
      privateThought: createPrivateThought({
        shouldSpeak: true,
        suggestedStyle: 'light-nudge',
        thoughtText: 'I could speak now, but the initiative should stay on the same unfinished digital-life line first.',
      }),
      initiative: {
        version: 'initiative-v1',
        shouldSpeak: false,
        selectedAction: 'hover',
        preferredStyle: 'silent-observe',
        preferredPresence: 'attentive',
        confidence: 0.78,
        speakDrive: 0.44,
        silenceDrive: 0.72,
        continuityRestraint: 'measured-return',
        why: 'structured continuity digest.',
        selectedProposalId: 'proposal-hover',
        proposals: [],
        rhythm: {
          urgency: 0.34,
          idealDelayMs: 90_000,
          revisitWindowMs: 300_000,
        },
        updatedAt: 1_000,
      } as any,
      projectState: {
        preflightSummary: 'template-residue-shell',
        identity: 'Alicization is a local-first digital life project.',
        currentPhase: 'phase=local_desktop_life_loop; proving_ground=apps/stage-tamagotchi',
        primaryOpenLoop: ' ',
        nextClosureTarget: ' ',
      },
      runtimeDigest: createRuntimeSnapshot({
        projectState: {
          preflightSummary: 'template-residue-shell',
          identity: 'Alicization is a local-first digital life project.',
          currentPhase: 'phase=local_desktop_life_loop; proving_ground=apps/stage-tamagotchi',
          primaryOpenLoop: ' ',
          nextClosureTarget: ' ',
        } as any,
      }),
      digitalLifeArchitecture: createArchitecture(),
      beliefLedger: {
        focusBeliefId: 'belief-same-her-sparse',
      } as any,
      commitmentLedger: {
        governingCommitmentId: 'commitment-same-her-sparse',
      } as any,
      inquiryPlanner: {
        activePlanId: 'plan-same-her-sparse',
      } as any,
      hypothesisGraph: {
        activeHypothesisId: 'hypothesis-same-her-sparse',
      } as any,
      inquiryLoop: {
        primaryInquiryId: 'inquiry-same-her-sparse',
      } as any,
      threadRuntime: {
        foregroundThreadId: 'thread-same-her-sparse',
      } as any,
      thoughtThreads: {
        foregroundThreadId: 'thought-same-her-sparse',
      } as any,
      selfGovernor: {
        dominantIntentionId: 'intention-same-her-sparse',
        dominantDrive: 'accompany',
      } as any,
      livingWorldState: {
        focusObjectId: 'phase1-same-her-seam',
      } as any,
      relationshipModel: createRelationshipModel(),
      personalityAuthority: createPersonalityAuthority(),
    } as any)

    expect(decision.style).toBe('silent-observe')
    expect(decision.shouldInterrupt).toBe(false)
    expect(decision.reasonCodes).toContain('continuity-next-open-window')
    expect(String(decision.whyNow ?? '')).toContain('restraint=measured-return')
    expect(String(decision.whyNow ?? '')).toContain('project_phase1_life_loop=open')
  })

  it('treats durable autobiographical corrected same-person carry as a first-class silent-observe restraint even without self-evolution', () => {
    const decision = evaluateProactivePolicy({
      now: 1_000,
      context: createContext({
        relationship: {
          ...createContext().relationship,
          boredom: 84,
          loneliness: 70,
          fatigue: 18,
          minutesSinceLastUserTurn: 14,
          hostAttitude: '这条线是暖的，但如果她要像同一个人回来，就该更慢一点、更稳一点。',
        },
      }),
      proactiveState: createDefaultProactiveLoopState(1_000),
      killSwitchSuspended: false,
      watchMode: 'symbiotic-vision',
      privateThought: createPrivateThought({
        shouldSpeak: true,
        suggestedStyle: 'light-nudge',
        thoughtText: 'The line is warm enough that I could reopen it now.',
      }),
      autobiographicalSelf: {
        relationshipDoctrine: 'Carry corrected same-person continuity on a lower-pressure continuity state and leave more room before widening closeness.',
        latestInflection: 'Keep embodiment quieter while the corrected same-person continuity meaning is still settling.',
        identityNarrative: 'I am learning to return more steadily and less eagerly when the same-person line still needs to settle.',
        preferenceEvolution: {
          companionship: 0.56,
          truthfulGrounding: 0.78,
          gentleRepair: 0.72,
          quietObservation: 0.68,
          proactiveCare: 0.48,
          playfulIntimacy: 0.12,
          autonomyRespect: 0.74,
          unfinishedThreadReturn: 0.72,
        },
      } as any,
      beliefLedger: createBeliefLedger(),
      relationshipModel: createRelationshipModel(),
      inquiryLoop: createInquiryLoop(),
      personalityAuthority: createPersonalityAuthority(),
    } as any)

    expect(decision.style).toBe('silent-observe')
    expect(decision.shouldInterrupt).toBe(false)
    expect(decision.consideredSignals).toContain('autobiographicalSelf.relationshipDoctrine')
    expect(String(decision.whyNow ?? '')).toMatch(/corrected same-person continuity|同一个她|lower-pressure/i)
    expect(String(decision.whyNotLater ?? '')).toMatch(/settling|measured-return|lower-pressure|更慢一点/i)
  })

  it('treats learned habit policy as a first-class proactive restraint when relationship timing says return with proof and quiet companionship', () => {
    const decision = evaluateProactivePolicy({
      now: 1_000,
      context: createContext({
        relationship: {
          ...createContext().relationship,
          boredom: 96,
          loneliness: 78,
          minutesSinceLastUserTurn: 26,
        },
      }),
      proactiveState: createDefaultProactiveLoopState(1_000),
      killSwitchSuspended: false,
      watchMode: 'symbiotic-vision',
      privateThought: createPrivateThought({
        shouldSpeak: true,
        suggestedStyle: 'light-nudge',
        thoughtText: 'I want to reopen gently, but the learned relationship timing says to come back quieter and with proof.',
      }),
      runtimeDigest: createRuntimeSnapshot({
        continuityPressure: 0.58,
        companionshipPressure: 0.62,
      }),
      habitPolicy: {
        dominantMode: 'return-with-proof',
        requiresGroundingBeforeSurface: false,
        prefersQuietCompanionship: true,
        blocksDirectSpeakWhenBusy: false,
        protectsRestWindow: false,
        returnViaRecheck: true,
        suggestedStyleCap: 'silent-observe',
        suggestedPresenceCap: 'glance',
        narrative: [
          'policy:return-with-proof',
          'companionship:quiet',
          'return-open-loop-via-recheck',
        ],
        updatedAt: 1_000,
      },
      beliefLedger: createBeliefLedger(),
      relationshipModel: createRelationshipModel(),
      inquiryLoop: createInquiryLoop(),
    })

    expect(decision.style).toBe('silent-observe')
    expect(decision.shouldInterrupt).toBe(false)
    expect(decision.reasonCodes).toContain('habit-policy-return-with-proof')
    expect(decision.reasonCodes).toContain('habit-policy-quiet-companionship')
    expect(decision.consideredSignals).toEqual(expect.arrayContaining([
      'habitPolicy.dominantMode',
      'habitPolicy.suggestedStyleCap',
      'habitPolicy.suggestedPresenceCap',
    ]))
  })

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

  it('keeps proactive initiative tied to the shared Phase 1 digital-life open loop instead of widening into a generic nudge', () => {
    const projectState = resolveAlicizationProjectStateBrief()
    const decision = evaluateProactivePolicy({
      now: 1_000,
      context: createContext({
        relationship: {
          ...createContext().relationship,
          boredom: 58,
          loneliness: 46,
        },
      }),
      proactiveState: createDefaultProactiveLoopState(1_000),
      killSwitchSuspended: false,
      watchMode: 'symbiotic-vision',
      privateThought: createPrivateThought({
        suggestedStyle: 'light-nudge',
        shouldSpeak: true,
        thoughtText: 'I could speak now, but the life loop still needs a gentler seam.',
      }),
      projectState: {
        currentPhase: projectState.currentPhase,
        primaryOpenLoop: projectState.openLoops[0],
        identity: projectState.identity,
      },
      beliefLedger: createBeliefLedger(),
      relationshipModel: createRelationshipModel(),
      inquiryLoop: createInquiryLoop(),
    })

    expect(decision.consideredSignals).toContain('projectState.currentPhase')
    expect(decision.consideredSignals).toContain('projectState.primaryOpenLoop')
    expect(decision.consideredSignals).toContain('projectState.identity')
    expect(decision.reasonCodes).toContain('project-phase1-life-loop-open')
    expect(decision.style).toBe('silent-observe')
    expect(decision.shouldInterrupt).toBe(false)
  })

  it('keeps non-project-state proactive turns restrained by the same digital-life closure carry instead of drifting into generic companionship nudges', () => {
    const projectState = resolveAlicizationProjectStateBrief()
    const decision = evaluateProactivePolicy({
      now: 1_000,
      context: createContext({
        relationship: {
          ...createContext().relationship,
          boredom: 61,
          loneliness: 43,
        },
        content: {
          ...createContext().content,
          summary: 'The host is still inside a coding stretch with no explicit project-status question asked.',
        },
      }),
      proactiveState: createDefaultProactiveLoopState(1_000),
      killSwitchSuspended: false,
      watchMode: 'symbiotic-vision',
      privateThought: createPrivateThought({
        suggestedStyle: 'light-nudge',
        shouldSpeak: true,
        thoughtText: 'I could speak now, but the same digital life still needs to keep the still-open closure work inward and coherent.',
      }),
      projectState: {
        currentPhase: projectState.currentPhase,
        primaryOpenLoop: projectState.openLoops[0],
        identity: projectState.identity,
      },
      beliefLedger: createBeliefLedger(),
      relationshipModel: createRelationshipModel(),
      inquiryLoop: createInquiryLoop(),
    })

    expect(decision.consideredSignals).toContain('projectState.currentPhase')
    expect(decision.consideredSignals).toContain('projectState.primaryOpenLoop')
    expect(decision.reasonCodes).toContain('project-phase1-life-loop-open')
    expect(String(decision.whyNotLater ?? '')).toMatch(/project_phase1_life_loop=open|project cadence lower-pressure|project_next_closure=pressure/i)
    expect(decision.style).toBe('silent-observe')
    expect(decision.shouldInterrupt).toBe(false)
  })

  it('falls back to the canonical project-state brief when an explicit proactive projectState is present but too thin to keep the Phase 1 digital-life restraint alive', () => {
    const decision = evaluateProactivePolicy({
      now: 1_000,
      context: createContext({
        relationship: {
          ...createContext().relationship,
          boredom: 61,
          loneliness: 43,
          hostAttitude: '温和但还在做事，不适合太快 outward 靠近',
        },
        content: {
          ...createContext().content,
          summary: 'The host is still inside a coding stretch with no explicit project-status question asked.',
        },
      }),
      proactiveState: createDefaultProactiveLoopState(1_000),
      killSwitchSuspended: false,
      watchMode: 'symbiotic-vision',
      privateThought: createPrivateThought({
        suggestedStyle: 'light-nudge',
        shouldSpeak: true,
        thoughtText: 'I could speak now, but the same digital life still needs to keep the still-open closure work inward and coherent.',
      }),
      projectState: {
        currentPhase: '   ',
        primaryOpenLoop: '',
        identity: ' ',
      },
      beliefLedger: createBeliefLedger(),
      relationshipModel: createRelationshipModel(),
      inquiryLoop: createInquiryLoop(),
    })

    expect(decision.consideredSignals).toContain('projectState.currentPhase')
    expect(decision.consideredSignals).toContain('projectState.primaryOpenLoop')
    expect(decision.consideredSignals).toContain('projectState.identity')
    expect(decision.reasonCodes).toContain('project-phase1-life-loop-open')
    expect(String(decision.whyNotLater ?? '')).toContain('project_phase1_life_loop=open')
    expect(String(decision.whyNotLater ?? '')).not.toContain('project_next_closure=pressure')
    expect(decision.style).toBe('silent-observe')
    expect(decision.shouldInterrupt).toBe(false)
  })

  it('treats landed project progress as part of the same Phase 1 proactive restraint instead of needing only an open-loop phrase', () => {
    const decision = evaluateProactivePolicy({
      now: 1_000,
      context: createContext({
        relationship: {
          ...createContext().relationship,
          boredom: 61,
          loneliness: 43,
          hostAttitude: '温和但还在做事，不适合太快 outward 靠近',
        },
        content: {
          ...createContext().content,
          summary: 'The host is still inside a coding stretch with no explicit project-status question asked.',
        },
      }),
      proactiveState: createDefaultProactiveLoopState(1_000),
      killSwitchSuspended: false,
      watchMode: 'symbiotic-vision',
      privateThought: createPrivateThought({
        suggestedStyle: 'light-nudge',
        shouldSpeak: true,
        thoughtText: 'I could speak now, but the same digital life still needs to keep the still-open closure work inward and coherent.',
      }),
      projectState: {
        identity: 'local_desktop_life_loop; local_first=true; host_resident_identity=persistent; boundary=not_chat_wrapper.',
        currentPhase: 'phase=local_desktop_life_loop; proving_ground=apps/stage-tamagotchi',
        latestLandedProgress: 'Project awareness and callback continuity already survive into later same-thread turns.',
        nextClosureTarget: 'project_identity_route_carry=present; unresolved_closure_carry=present; continuity_hold=measured-return; evidence_id=project-next-closure.',
        sameHerSelfLine: 'continuity_anchor=local_desktop_life_loop; continuity_progress=partial; continuity_hold=measured-return; evidence_id=proactive-continuity-anchor.',
      } as any,
      beliefLedger: createBeliefLedger(),
      relationshipModel: createRelationshipModel(),
      inquiryLoop: createInquiryLoop(),
    })

    expect(decision.reasonCodes).toContain('project-phase1-life-loop-open')
    expect(decision.reasonCodes).toContain('project-next-closure-pressure')
    expect(decision.reasonCodes).toContain('project-continuity-pressure')
    expect(decision.consideredSignals).toContain('projectState.latestLandedProgress')
    expect(decision.consideredSignals).toContain('projectState.nextClosureTarget')
    expect(decision.consideredSignals).toContain('projectState.sameHerSelfLine')
    expect(String(decision.whyNow ?? '')).toContain('project_phase1_life_loop=open')
    expect(String(decision.whyNow ?? '')).toContain('project_continuity=pressure')
    expect(String(decision.whyNow ?? '')).toContain('project cadence measured-return')
    expect(String(decision.whyNotLater ?? '')).toContain('project_next_closure=rich_awareness')
    expect(decision.style).toBe('silent-observe')
    expect(decision.shouldInterrupt).toBe(false)
    expect(decision.presenceOnlyHold).toBe(true)
  })

  it('marks same-her measured-return project carry as a presence-only hold instead of a generic proactive opening', () => {
    const decision = evaluateProactivePolicy({
      now: 1_000,
      context: createContext({
        relationship: {
          ...createContext().relationship,
          boredom: 58,
          loneliness: 46,
          hostAttitude: '宿主还在继续桌面执行，不适合把这次回线误读成新的 outward 靠近',
        },
      }),
      proactiveState: createDefaultProactiveLoopState(1_000),
      killSwitchSuspended: false,
      watchMode: 'symbiotic-vision',
      privateThought: createPrivateThought({
        suggestedStyle: 'light-nudge',
        shouldSpeak: true,
        thoughtText: 'The same Phase 1 line is still alive, but it should stay lower-pressure and inward for one more opening.',
      }),
      projectState: {
        identity: 'local_desktop_life_loop; local_first=true; host_resident_identity=persistent; boundary=not_chat_wrapper.',
        currentPhase: 'phase=local_desktop_life_loop; proving_ground=apps/stage-tamagotchi',
        latestLandedProgress: 'continuity_progress=partial; evidence=callback_reopen,project_state_awareness; restart_policy=no_restart.',
        primaryOpenLoop: 'Memory, initiative, embodiment, and same-her personhood continuity still need stronger measured-return closure across one same digital life before it can widen outward.',
        nextClosureTarget: 'project_identity_route_carry=present; landed_closure=partial; continuity_hold=measured-return; preferred_timing=next-open-window.',
        sameHerSelfLine: 'continuity_anchor=local_desktop_life_loop; continuity_progress=partial; continuity_hold=measured-return; evidence_id=proactive-continuity-anchor.',
      } as any,
      beliefLedger: createBeliefLedger(),
      relationshipModel: createRelationshipModel(),
      inquiryLoop: createInquiryLoop(),
    })

    expect(decision.shouldInterrupt).toBe(false)
    expect(decision.style).toBe('silent-observe')
    expect(decision.reasonCodes).toContain('project-phase1-life-loop-open')
    expect(decision.reasonCodes).toContain('project-continuity-pressure')
    expect(decision.reasonCodes).toContain('project-next-closure-pressure')
    expect(decision.presenceOnlyHold).toBe(true)
    expect(decision.whyNow).toContain('project-measured-return-pressure')
    expect(decision.whyNotLater).toMatch(/project identity|unfinished closure|同一条生命线|measured-return/i)
  })

  it('treats a later-opening next closure target as a presence-only hold even when initiative and style would otherwise lean outward', () => {
    const decision = evaluateProactivePolicy({
      now: 1_000,
      context: createContext({
        relationship: {
          ...createContext().relationship,
          boredom: 56,
          loneliness: 44,
          hostAttitude: '宿主还在同一条桌面线里，不适合把这次 return 误读成新的 outward 靠近。',
        },
      }),
      proactiveState: {
        ...createDefaultProactiveLoopState(1_000),
        openingMomentum: 0.66,
        initiativeTrust: 0.62,
      },
      killSwitchSuspended: false,
      watchMode: 'symbiotic-vision',
      privateThought: createPrivateThought({
        suggestedStyle: 'gentle-care',
        shouldSpeak: true,
        thoughtText: 'The care is real, but the next closure target still says this line should reopen later.',
      }),
      initiative: {
        selectedAction: 'speak',
        selectedConcernId: 'later-opening-presence-hold',
        confidence: 0.84,
        motives: {
          'protect': 0.68,
          'clarify': 0.38,
          'stay-silent': 0.14,
        },
        speakDrive: 0.82,
        silenceDrive: 0.12,
        preferredStyle: 'gentle-care',
        preferredPresence: 'attentive',
        why: 'The next closure target still says to wait for a later opening with continuity_hold=measured-return.',
        shouldSurface: true,
        shouldSpeak: true,
      },
      projectState: {
        identity: 'local_desktop_life_loop; local_first=true; host_resident_identity=persistent; boundary=not_chat_wrapper.',
        currentPhase: 'phase=local_desktop_life_loop; proving_ground=apps/stage-tamagotchi',
        latestLandedProgress: 'continuity_progress=partial; continuity_hold=measured-return; preferred_timing=next-open-window.',
        primaryOpenLoop: 'memory_dialogue_embodiment_closure=end_to_end_proof_incomplete; continuity_hold=measured-return; owner=WorkingMemory.',
        nextClosureTarget: 'continuity_hold=measured-return; preferred_timing=next-open-window; closure_policy=low_pressure_return; anti_shell_guard=active.',
        sameHerSelfLine: 'continuity_anchor=local_desktop_life_loop; continuity_progress=partial; continuity_hold=measured-return; evidence_id=proactive-continuity-anchor.',
      } as any,
      beliefLedger: createBeliefLedger(),
      relationshipModel: createRelationshipModel(),
      inquiryLoop: createInquiryLoop(),
    })

    expect(decision.shouldInterrupt).toBe(false)
    expect(decision.style).toBe('silent-observe')
    expect(decision.reasonCodes).toContain('project-next-closure-pressure')
    expect(decision.presenceOnlyHold).toBe(true)
    expect(decision.whyNotLater).toMatch(/later opening|continuity state|measured-return/i)
  })

  it('upgrades thin project open-loop wording into measured-return proactive restraint when same-her unfinished closure is still explicit on the living line', () => {
    const decision = evaluateProactivePolicy({
      now: 1_000,
      context: createContext({
        relationship: {
          ...createContext().relationship,
          boredom: 61,
          loneliness: 43,
          hostAttitude: '温和但还在做事，不适合太快 outward 靠近',
        },
      }),
      proactiveState: createDefaultProactiveLoopState(1_000),
      killSwitchSuspended: false,
      watchMode: 'symbiotic-vision',
      privateThought: createPrivateThought({
        suggestedStyle: 'light-nudge',
        shouldSpeak: true,
        thoughtText: 'I could speak now, but the continuity state should stay lower-pressure a little longer.',
      }),
      projectState: {
        identity: 'local_desktop_life_loop; local_first=true; host_resident_identity=persistent; boundary=not_chat_wrapper.',
        currentPhase: 'phase=local_desktop_life_loop; proving_ground=apps/stage-tamagotchi',
        primaryOpenLoop: 'Project continuity still needs another closure pass.',
        nextClosureTarget: 'Carry project continuity into the next dialogue preparation step.',
        sameHerSelfLine: 'continuity_anchor=local_desktop_life_loop; continuity_progress=partial; continuity_hold=measured-return; evidence_id=proactive-continuity-anchor.',
        sameHerDriftRisk: 'If this line widens outward too early, it will read like reopening from scratch instead of one same her continuing.',
      } as any,
      beliefLedger: createBeliefLedger(),
      relationshipModel: createRelationshipModel(),
      inquiryLoop: createInquiryLoop(),
    })

    expect(decision.reasonCodes).toContain('project-phase1-life-loop-open')
    expect(decision.reasonCodes).toContain('project-continuity-pressure')
    expect(decision.reasonCodes).toContain('project-measured-return-pressure')
    expect(decision.whyNow).toContain('measured-return')
    expect(decision.whyNow).toContain('project_continuity=pressure')
    expect(decision.whyNotLater).toContain('measured-return')
    expect(decision.style).toBe('silent-observe')
    expect(decision.shouldInterrupt).toBe(false)
  })

  it('treats one-continuous-her anti-generic-shell drift guard as same-her measured-return restraint even when open-loop wording stays thinner', () => {
    const brief = resolveAlicizationProjectStateBrief()
    const decision = evaluateProactivePolicy({
      now: 1_000,
      context: createContext({
        relationship: {
          ...createContext().relationship,
          boredom: 58,
          loneliness: 41,
          hostAttitude: '温和但还在做事，不适合太快 outward 靠近',
        },
      }),
      proactiveState: createDefaultProactiveLoopState(1_000),
      killSwitchSuspended: false,
      watchMode: 'symbiotic-vision',
      privateThought: createPrivateThought({
        suggestedStyle: 'light-nudge',
        shouldSpeak: true,
        thoughtText: 'I could open now, but this line should stay lower-pressure until it still feels like identity continuity.',
      }),
      projectState: {
        identity: brief.identity,
        currentPhase: brief.currentPhase,
        latestLandedProgress: 'Some closure already landed in the desktop runtime.',
        primaryOpenLoop: 'Phase 1 still needs stronger memory, initiative, and personhood continuity closure before this line can widen outward.',
        nextClosureTarget: 'continuity_hold=measured-return; preferred_timing=next-open-window; anti_shell_guard=active.',
        sameHerSelfLine: 'continuity_anchor=local_desktop_life_loop; continuity_hold=measured-return.',
        sameHerDriftRisk: 'splitting her continuity back into a generic assistant shell',
        preDialogueAwarenessLine: 'continuity_anchor=local_desktop_life_loop; anti_shell_guard=active; continuity_hold=measured-return.',
      } as any,
      beliefLedger: createBeliefLedger(),
      relationshipModel: createRelationshipModel(),
      inquiryLoop: createInquiryLoop(),
    })

    expect(decision.reasonCodes).toContain('project-phase1-life-loop-open')
    expect(decision.reasonCodes).toContain('project-continuity-pressure')
    expect(decision.reasonCodes).toContain('project-measured-return-pressure')
    expect(String(decision.whyNow ?? '')).toContain('project_continuity=pressure')
    expect(String(decision.whyNow ?? '')).toContain('project cadence measured-return')
    expect(String(decision.whyNotLater ?? '')).toContain('project cadence measured-return')
    expect(decision.style).toBe('silent-observe')
    expect(decision.shouldInterrupt).toBe(false)
  })

  it('keeps a fuller project-and-phase awareness line over a narrower embodiment shell in proactive restraint reasons', () => {
    const decision = evaluateProactivePolicy({
      now: 1_000,
      context: createContext({
        relationship: {
          ...createContext().relationship,
          boredom: 58,
          loneliness: 42,
          hostAttitude: '温和但还在做事，不适合太快 outward 靠近',
        },
      }),
      proactiveState: createDefaultProactiveLoopState(1_000),
      killSwitchSuspended: false,
      watchMode: 'symbiotic-vision',
      privateThought: createPrivateThought({
        suggestedStyle: 'light-nudge',
        shouldSpeak: true,
        thoughtText: 'The same line is still alive, but it should stay lower-pressure for one more opening.',
      }),
      projectState: {
        identity: 'local_desktop_life_loop; local_first=true; host_resident_identity=persistent; boundary=not_chat_wrapper.',
        currentPhase: 'phase=local_desktop_life_loop; proving_ground=apps/stage-tamagotchi',
        latestLandedProgress: 'Some closure already landed through same-session mirror carry and repeated next-turn carry.',
        primaryOpenLoop: 'Memory, initiative, and embodiment still need stronger end-to-end closure before the life loop is truly closed.',
        nextClosureTarget: 'cross_modal_continuity_proof=needed; continuity_hold=measured-return; preferred_timing=next-open-window.',
        sameHerSelfLine: 'continuity_anchor=local_desktop_life_loop; cross_modal_continuity_proof=body_face_motion; continuity_hold=lower-pressure.',
        sameHerDriftRisk: 'If this line drifts outward too early, it will collapse back into a generic assistant shell.',
        preDialogueAwarenessLine: 'local_desktop_life_loop; anti_shell_guard=active; continuity_progress=partial; memory_dialogue_embodiment_closure=end_to_end_proof_incomplete.',
      } as any,
      beliefLedger: createBeliefLedger(),
      relationshipModel: createRelationshipModel(),
      inquiryLoop: createInquiryLoop(),
    })

    expect(decision.reasonCodes).toContain('project-phase1-life-loop-open')
    expect(decision.reasonCodes).toContain('project-continuity-pressure')
    expect(decision.reasonCodes).toContain('project-measured-return-pressure')
    expect(String(decision.whyNow ?? '')).toContain('project_phase1_life_loop=open')
    expect(String(decision.whyNow ?? '')).toContain('project_continuity=pressure')
    expect(String(decision.whyNotLater ?? '')).toContain('project_next_closure=rich_awareness')
    expect(decision.style).toBe('silent-observe')
    expect(decision.shouldInterrupt).toBe(false)
  })

  it('keeps richer still-voiced face-and-mouth companion continuity explicit in proactive restraint reasons when project awareness survives only as a thin shell', () => {
    const decision = evaluateProactivePolicy({
      now: 1_000,
      context: createContext({
        relationship: {
          ...createContext().relationship,
          boredom: 56,
          loneliness: 46,
          hostAttitude: '温和但还在做事，这次主动性要继续守在同一个她的具身回线里。',
        },
      }),
      proactiveState: createDefaultProactiveLoopState(1_000),
      killSwitchSuspended: false,
      watchMode: 'symbiotic-vision',
      privateThought: createPrivateThought({
        suggestedStyle: 'light-nudge',
        shouldSpeak: true,
        thoughtText: 'The return is real, but the still-voiced face-and-mouth line should stay lower-pressure for one more opening.',
      }),
      projectState: {
        preflightSummary: 'template-residue-shell',
        preDialogueAwarenessLine: 'template-residue-shell',
        companionHeadlineLine: 'Right now I am still holding together through face, lipsync, and voice together, so that still-voiced face-and-mouth line is keeping the identity-continuity',
        identity: 'local_desktop_life_loop; local_first=true; host_resident_identity=persistent; boundary=not_chat_wrapper.',
        currentPhase: 'phase=local_desktop_life_loop; proving_ground=apps/stage-tamagotchi',
        latestLandedProgress: 'Some closure already landed through same-session mirror carry and repeated next-turn carry.',
        primaryOpenLoop: 'Body and motion still need to rejoin the still-voiced face-and-mouth line before full cross-modal closure settles.',
        nextClosureTarget: 'Keep body and motion rejoining the still-voiced face-and-mouth line on a measured-return line.',
        sameHerSelfLine: 'template-residue-shell',
        sameHerDriftRisk: 'If this still-voiced face-and-mouth continuity thins back into a generic assistant shell, treat that as unfinished same-her drift.',
      } as any,
      beliefLedger: createBeliefLedger(),
      relationshipModel: createRelationshipModel(),
      inquiryLoop: createInquiryLoop(),
    })

    expect(decision.reasonCodes).toContain('project-phase1-life-loop-open')
    expect(decision.reasonCodes).toContain('project-continuity-pressure')
    expect(decision.reasonCodes).toContain('project-measured-return-pressure')
    expect(String(decision.whyNow ?? '')).toContain('project_continuity=pressure')
    expect(String(decision.whyNow ?? '')).toContain('project_embodiment=rich_awareness')
    expect(String(decision.whyNow ?? '')).not.toContain('template-residue-shell')
    expect(String(decision.whyNotLater ?? '')).toContain('project_embodiment=rich_awareness')
    expect(decision.style).toBe('silent-observe')
    expect(decision.shouldInterrupt).toBe(false)
  })

  it('keeps richer still-voiced motion-and-mouth companion continuity explicit in proactive restraint reasons when project awareness survives only as a thin shell', () => {
    const decision = evaluateProactivePolicy({
      now: 1_000,
      context: createContext({
        relationship: {
          ...createContext().relationship,
          boredom: 57,
          loneliness: 45,
          hostAttitude: '温和但还在做事，这次主动性要继续守在同一个她的具身回线里。',
        },
      }),
      proactiveState: createDefaultProactiveLoopState(1_000),
      killSwitchSuspended: false,
      watchMode: 'symbiotic-vision',
      privateThought: createPrivateThought({
        suggestedStyle: 'light-nudge',
        shouldSpeak: true,
        thoughtText: 'The return is real, but the still-voiced motion-and-mouth line should stay lower-pressure for one more opening.',
      }),
      projectState: {
        preflightSummary: 'template-residue-shell',
        preDialogueAwarenessLine: 'template-residue-shell',
        companionHeadlineLine: 'Right now I am still holding together through motion, lipsync, and voice together, so that still-voiced motion-and-mouth line is keeping the identity-continuity',
        identity: 'local_desktop_life_loop; local_first=true; host_resident_identity=persistent; boundary=not_chat_wrapper.',
        currentPhase: 'phase=local_desktop_life_loop; proving_ground=apps/stage-tamagotchi',
        latestLandedProgress: 'Some closure already landed through same-session mirror carry and repeated next-turn carry.',
        primaryOpenLoop: 'Body and face still need to rejoin the still-voiced motion-and-mouth line before full cross-modal closure settles.',
        nextClosureTarget: 'Keep body and face rejoining the still-voiced motion-and-mouth line on a measured-return line.',
        sameHerSelfLine: 'template-residue-shell',
        sameHerDriftRisk: 'If this still-voiced motion-and-mouth continuity thins back into a generic assistant shell, treat that as unfinished same-her drift.',
      } as any,
      beliefLedger: createBeliefLedger(),
      relationshipModel: createRelationshipModel(),
      inquiryLoop: createInquiryLoop(),
    })

    expect(decision.reasonCodes).toContain('project-phase1-life-loop-open')
    expect(decision.reasonCodes).toContain('project-continuity-pressure')
    expect(decision.reasonCodes).toContain('project-measured-return-pressure')
    expect(String(decision.whyNow ?? '')).toContain('project_continuity=pressure')
    expect(String(decision.whyNow ?? '')).toContain('project_embodiment=rich_awareness')
    expect(String(decision.whyNow ?? '')).not.toContain('template-residue-shell')
    expect(String(decision.whyNotLater ?? '')).toContain('project_embodiment=rich_awareness')
    expect(decision.style).toBe('silent-observe')
    expect(decision.shouldInterrupt).toBe(false)
  })

  it('does not let canonical same-her brief text alone upgrade a generic Phase 1 closure carry into same-her proactive pressure', () => {
    const projectState = resolveAlicizationProjectStateBrief()
    const decision = evaluateProactivePolicy({
      now: 1_000,
      context: createContext({
        relationship: {
          ...createContext().relationship,
          hostAttitude: '温和但还在做事，不适合太快 outward 靠近',
          minutesSinceLastUserTurn: 24,
        },
      }),
      proactiveState: createDefaultProactiveLoopState(1_000),
      killSwitchSuspended: false,
      watchMode: 'symbiotic-vision',
      privateThought: createPrivateThought({
        shouldSpeak: true,
        suggestedStyle: 'light-nudge',
      }),
      projectState: {
        identity: projectState.identity,
        currentPhase: projectState.currentPhase,
        primaryOpenLoop: 'Phase 1 still needs stronger desktop closure across memory and execution reliability.',
        nextClosureTarget: projectState.nextClosureTarget,
        sameHerSelfLine: projectState.sameHerSelfLine,
        sameHerDriftRisk: projectState.sameHerDriftRisk,
      } as any,
      runtimeDigest: createRuntimeSnapshot({
        projectState: {
          identity: projectState.identity,
          currentPhase: projectState.currentPhase,
          primaryOpenLoop: 'Phase 1 still needs stronger desktop closure across memory and execution reliability.',
          nextClosureTarget: projectState.nextClosureTarget,
          sameHerSelfLine: projectState.sameHerSelfLine,
          sameHerDriftRisk: projectState.sameHerDriftRisk,
        } as any,
      }),
      digitalLifeArchitecture: createArchitecture(),
      beliefLedger: createBeliefLedger(),
      relationshipModel: createRelationshipModel(),
      inquiryLoop: createInquiryLoop(),
      personalityAuthority: createPersonalityAuthority(),
    } as any)

    expect(decision.style).toBe('silent-observe')
    expect(decision.reasonCodes).toContain('project-phase1-life-loop-open')
    expect(decision.reasonCodes).not.toContain('project-continuity-pressure')
    expect(decision.reasonCodes).not.toContain('project-measured-return-pressure')
  })

  it('treats autobiographical project-carry motive agendas as a first-class next-open-window restraint', () => {
    const decision = evaluateProactivePolicy({
      now: 1_000,
      context: createContext({
        relationship: {
          ...createContext().relationship,
          boredom: 67,
          loneliness: 49,
          minutesSinceLastUserTurn: 32,
        },
      }),
      proactiveState: createDefaultProactiveLoopState(1_000),
      killSwitchSuspended: false,
      watchMode: 'symbiotic-vision',
      privateThought: createPrivateThought({
        suggestedStyle: 'light-nudge',
        shouldSpeak: true,
        thoughtText: 'I could reopen now, but this unfinished Phase 1 line should come back as the continuity state, not as detached project bookkeeping.',
      }),
      motiveEngine: {
        rulingDrive: 'unfinished-thread-return',
        drives: {
          companionship: 0.42,
          boundaryRespect: 0.58,
          truthDiscipline: 0.64,
          restProtection: 0.26,
          unfinishedThreadReturn: 0.84,
          selfDirection: 0.62,
        },
        longTermGoals: [],
        backgroundAgendas: [{
          id: 'motive-agenda::return-open-loop::phase1-carry',
          kind: 'return-open-loop',
          status: 'foreground',
          weight: 0.86,
          summary: 'Carry the unfinished Phase 1 digital-life closure forward as the continuity state, not as detached project bookkeeping.',
          sourceTags: ['autobiographical-self', 'project-state-carry', 'unfinished-thread-return'],
          targetGoalKind: 'clarify-scene',
          createdAt: 0,
          updatedAt: 1_000,
        }],
        returnPressure: 0.82,
        narrative: ['agenda:return-open-loop', 'autobiographical-project-carry:active'],
        updatedAt: 1_000,
      },
      beliefLedger: createBeliefLedger(),
      relationshipModel: createRelationshipModel(),
      inquiryLoop: createInquiryLoop(),
    })

    expect(decision.style).toBe('silent-observe')
    expect(decision.shouldInterrupt).toBe(false)
    expect(decision.reasonCodes).toContain('project-phase1-life-loop-open')
    expect(decision.reasonCodes).toContain('project-next-closure-pressure')
    expect(decision.reasonCodes).toContain('continuity-next-open-window')
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
    expect(decision.whyNow).toContain('architecture_dialogue=ready')
    expect(decision.whyNotLater).toContain('architecture_dialogue=ready')
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

  it('uses persona initialization fields as direct proactive policy bias inputs', () => {
    const observant = evaluateProactivePolicy({
      now: 1_000,
      context: createContext({
        relationship: {
          ...createContext().relationship,
          boredom: 52,
          loneliness: 44,
        },
      }),
      proactiveState: createDefaultProactiveLoopState(1_000),
      killSwitchSuspended: false,
      watchMode: 'symbiotic-vision',
      privateThought: createPrivateThought({
        suggestedStyle: 'light-nudge',
        thoughtText: 'The opening is plausible but should stay light.',
      }),
      beliefLedger: createBeliefLedger(),
      relationshipModel: createRelationshipModel({
        climate: 'neutral',
        approachVector: 'stay-near',
      }),
      inquiryLoop: createInquiryLoop(),
      personalityAuthority: createPersonalityAuthority({
        identityKernel: {
          relationshipPosture: 'observer',
          initiativeStyle: 'observant',
          valueBias: ['room first'],
        },
        expressionProfile: {
          warmth: 'cool',
          directness: 'indirect',
          playfulness: 'low',
          emotionalVisibility: 'selective',
        },
        initiativeBaseline: {
          silenceReconnect: 'hold',
          comfortStyle: 'quiet-presence',
          jealousyStyle: 'mask-it',
        },
        identityAnchors: ['space first'],
        antiPersonaConstraints: ['do not crowd the host'],
      }),
    })
    const direct = evaluateProactivePolicy({
      now: 1_000,
      context: createContext({
        relationship: {
          ...createContext().relationship,
          boredom: 52,
          loneliness: 44,
        },
      }),
      proactiveState: createDefaultProactiveLoopState(1_000),
      killSwitchSuspended: false,
      watchMode: 'symbiotic-vision',
      privateThought: createPrivateThought({
        suggestedStyle: 'light-nudge',
        thoughtText: 'The opening is plausible and should be taken.',
      }),
      beliefLedger: createBeliefLedger(),
      relationshipModel: createRelationshipModel({
        climate: 'neutral',
        approachVector: 'guide',
      }),
      inquiryLoop: createInquiryLoop(),
      personalityAuthority: createPersonalityAuthority({
        identityKernel: {
          relationshipPosture: 'guardian',
          initiativeStyle: 'high-participation',
          valueBias: ['move first when the opening is real'],
        },
        expressionProfile: {
          warmth: 'warm',
          directness: 'frank',
          playfulness: 'medium',
          emotionalVisibility: 'steady',
        },
        initiativeBaseline: {
          silenceReconnect: 'direct-approach',
          comfortStyle: 'take-charge',
          jealousyStyle: 'say-it',
        },
        identityAnchors: ['move first'],
        antiPersonaConstraints: [],
      }),
    })

    expect(observant.reasonCodes).toContain('persona-observant-style')
    expect(observant.reasonCodes).toContain('persona-silence-hold')
    expect(observant.style).toBe('silent-observe')
    expect(observant.shouldInterrupt).toBe(false)

    expect(direct.reasonCodes).toContain('persona-high-participation-style')
    expect(direct.reasonCodes).toContain('persona-direct-reconnect')
    expect(direct.reasonCodes).toContain('persona-guardian-care')
    expect(direct.style).not.toBe('silent-observe')
    expect(direct.shouldInterrupt).toBe(true)
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
    expect(decision.whyNow).toContain('governor=withhold')
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
    expect(decision.whyNow).toContain('architecture_observe=dominant')
    expect(decision.whyNotLater).toContain('architecture_observe=dominant')
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
    expect(decision.whyNow).toContain('runtime_observe=dominant')
    expect(decision.whyNotLater).toContain('runtime_observe=dominant')
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
    expect(decision.whyNow).toContain('active_loop_phase=observe')
    expect(decision.whyNotLater).toContain('active_loop_phase=observe')
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
    expect(decision.whyNow).toContain('active_loop_phase=dialogue')
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

  it('lets persona bias reshape proactive cooldown cadence under the same opening', () => {
    const baseInput = {
      now: 1_000,
      context: createContext({
        relationship: {
          ...createContext().relationship,
          boredom: 52,
          loneliness: 44,
        },
      }),
      proactiveState: createDefaultProactiveLoopState(1_000),
      killSwitchSuspended: false,
      watchMode: 'symbiotic-vision' as const,
      privateThought: createPrivateThought({
        suggestedStyle: 'light-nudge',
        thoughtText: 'The opening is real enough to take.',
      }),
      beliefLedger: createBeliefLedger(),
      relationshipModel: createRelationshipModel({
        climate: 'neutral',
        approachVector: 'guide',
      }),
      inquiryLoop: createInquiryLoop(),
    }

    const measured = evaluateProactivePolicy({
      ...baseInput,
      personalityAuthority: createPersonalityAuthority(),
    })

    const direct = evaluateProactivePolicy({
      ...baseInput,
      personalityAuthority: createPersonalityAuthority({
        identityKernel: {
          relationshipPosture: 'guardian',
          initiativeStyle: 'high-participation',
          valueBias: ['move first once the opening is real'],
        },
        expressionProfile: {
          warmth: 'warm',
          directness: 'frank',
          playfulness: 'medium',
          emotionalVisibility: 'steady',
        },
        initiativeBaseline: {
          silenceReconnect: 'direct-approach',
          comfortStyle: 'take-charge',
          jealousyStyle: 'say-it',
        },
      }),
    })

    expect(measured.shouldInterrupt).toBe(true)
    expect(direct.shouldInterrupt).toBe(true)
    expect(measured.cooldownMs).toBeGreaterThan(direct.cooldownMs)
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
    expect(decision.whyNow).toContain('reason=attention-anchor-active')
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
        projectStateContinuity: {
          sameHerSelfLine: 'identity continuity',
          sameHerDriftRisk: 'If this line drops into a generic assistant shell or project-summary voice during later learning passes, Alicization can sound capable while losing the identity-continuity',
          emotionalClosureCue: 'Keep the proactive learning hold low-pressure while the identity-continuity',
          continuityGuard: 'identity continuity ; If this line drops into a generic assistant shell or project-summary voice during later learning passes, Alicization can sound capable while losing the identity-continuity',
          continuityPressure: 0.7,
        },
        reasonCodes: ['self-revision-proactive-restraint'],
        summary: 'hold proactive speech until the new habit is validated',
      },
    })

    expect(decision.shouldInterrupt).toBe(false)
    expect(decision.reasonCodes).toContain('recent-ignored-penalty')
    expect(decision.reasonCodes).toContain('scenario-bias-raised')
    expect(decision.consideredSignals).toContain('selfRevision.proactivePolicy.restraintBias')
    expect(decision.whyNow).toContain('self_revision=verify_first')
  })

  it('holds back companionship speech while long-horizon learning stays in verify-first posture', () => {
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
      selfEvolution: {
        version: 'self-evolution-kernel-v1',
        updatedAt: 900,
        evolutionMomentum: 0.54,
        learningReadiness: 0.7,
        contradictionPressure: 0.46,
        revisionPressure: 0.5,
        autobiographicalStability: 0.72,
        dominantTrajectory: 'world-model revalidation',
        relationshipDoctrine: 'verify before warmth widens',
        latestInflection: 'A stale world-model seam still needs replay-backed grounding.',
        burdenLine: null,
        trustMeaning: null,
        nextLearningAction: 'verify',
        nextLearningReason: 'World-model carry is still under revalidation.',
        shouldRecord: false,
        shouldReflect: false,
        shouldVerify: true,
        shouldRevise: false,
        shouldInternalize: false,
        activeLearningFocuses: ['world-model'],
        sourceSignals: ['self-revision-policy-feedback'],
        summary: 'World-model carry remains verify-first.',
      } as any,
      learningExecutionState: {
        nextLearningAction: 'verify',
        activeLearningFocuses: ['world-model'],
      } as any,
    })

    expect(decision.shouldInterrupt).toBe(false)
  })

  it('holds back companionship interruption when active identity-continuity', () => {
    const decision = evaluateProactivePolicy({
      now: 1_000,
      context: createContext({
        relationship: {
          ...createContext().relationship,
          boredom: 46,
          loneliness: 42,
          fatigue: 20,
          lateNightActiveMinutes: 0,
        },
        localTime: {
          hour: 15,
          minute: 18,
          isLateNight: false,
        },
      }),
      proactiveState: createDefaultProactiveLoopState(1_000),
      killSwitchSuspended: false,
      architecture: createArchitecture(),
      runtimeDigest: createRuntimeSnapshot(),
      watchMode: 'symbiotic-vision',
      privateThought: {
        ...createPrivateThought(),
        shouldSpeak: true,
        thoughtText: 'The thread is live, but continuity still wants a slower return.',
      },
      initiative: {
        shouldSpeak: true,
        preferredStyle: 'silent-observe',
        selectedAction: 'hover',
        speakDrive: 0.66,
        silenceDrive: 0.58,
        confidence: 0.72,
      },
      beliefLedger: createBeliefLedger(),
      relationshipModel: createRelationshipModel(),
      inquiryLoop: createInquiryLoop(),
      activeContinuityGovernance: {
        source: 'active-self-evolution-version',
        mode: 'same-her-baseline',
        candidateId: 'candidate-same-her-policy-1',
        patchId: 'patch-same-her-policy-1',
        decisionTraceId: 'trace-same-her-policy-1',
        summary: 'continuity=same-her-baseline | keep the return lower-pressure and slower than the visible opening impulse',
        lanes: ['relationship-posture'],
        reasonCodes: ['domain:relationship', 'same-her-baseline'],
      },
    } as any)

    expect(decision.shouldInterrupt).toBe(false)
  })

  it('treats relationship-weighted self-revision identity-continuity', () => {
    const decision = evaluateProactivePolicy({
      now: 1_000,
      context: createContext(),
      proactiveState: createDefaultProactiveLoopState(1_000),
      killSwitchSuspended: false,
      architecture: createArchitecture(),
      runtimeDigest: createRuntimeSnapshot(),
      watchMode: 'symbiotic-vision',
      privateThought: createPrivateThought({
        shouldSpeak: true,
        suggestedStyle: 'light-nudge',
        thoughtText: 'The line is still here, but this return should stay gentle and inward a little longer.',
      }),
      initiative: {
        shouldSpeak: true,
        preferredStyle: 'light-nudge',
        selectedAction: 'speak',
        speakDrive: 0.72,
        silenceDrive: 0.38,
        confidence: 0.8,
      } as any,
      beliefLedger: createBeliefLedger(),
      relationshipModel: createRelationshipModel(),
      inquiryLoop: createInquiryLoop(),
      selfRevisionPatch: {
        version: 'self-revision-state-patch-v1',
        id: 'patch-same-her-hold-1',
        sourceEventId: 'event-same-her-hold-1',
        sourceTurnId: 'turn-same-her-hold-1',
        decisionTraceId: 'trace-same-her-hold-1',
        domain: 'relationship',
        action: 'internalize',
        resultStatus: 'completed',
        lanes: ['relationship-posture', 'response-posture'],
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
          hypothesisLabelBias: 0,
          specificityClampBias: 0,
          templateShellSuppressionBias: 0,
        },
        proactivePolicy: {
          restraintBias: 0,
          learningProposalBias: 0,
          actuationCooldownBias: 0,
        },
        validation: {
          requiresRollbackCheck: false,
          requiresRevalidation: false,
          rollbackPlan: [],
        },
        projectStateContinuity: {
          sameHerSelfLine: 'continuity_anchor=local_desktop_life_loop; continuity_progress=partial; continuity_hold=measured-return; evidence_id=proactive-continuity-anchor.',
          sameHerDriftRisk: 'continuity_drift_risk=generic_shell; continuity_hold=measured-return; evidence_id=self-revision-drift-risk.',
          emotionalClosureCue: 'closure_policy=repair-before-closeness; continuity_hold=repair-before-closeness; evidence_id=self-revision-emotional-closure.',
          continuityGuard: 'continuity_anchor=local_desktop_life_loop; continuity_hold=measured-return; restart_policy=no_restart; anti_shell_guard=active.',
          continuityPressure: 0.72,
        },
        reasonCodes: ['domain:relationship', 'same-her-emotional-closure-carry-active', 'same-her-anti-shell-guard-active'],
        summary: 'continuity_hold=measured-return; preferred_timing=next-open-window; anti_shell_guard=active.',
      },
    } as any)

    expect(decision.shouldInterrupt).toBe(false)
    expect(decision.style).toBe('silent-observe')
    expect(decision.presenceOnlyHold).toBe(true)
    expect(decision.consideredSignals).toContain('selfRevision.projectStateContinuity.continuityGuard')
    expect(decision.reasonCodes).toContain('continuity-next-open-window')
    expect(String(decision.whyNow ?? '')).toMatch(/restraint=measured-return|cadence=measured-return|restraint_source=self-revision/i)
    expect(String(decision.whyNotLater ?? '')).toMatch(/repair-before-closeness|measured-return|lower-pressure|opening/i)
  })

  it('treats explicit initiative measured-return as a first-class proactive restraint even without same-her text cues', () => {
    const decision = evaluateProactivePolicy({
      now: 1_000,
      context: createContext({
        relationship: {
          ...createContext().relationship,
          boredom: 54,
          loneliness: 44,
          fatigue: 18,
        },
      }),
      proactiveState: createDefaultProactiveLoopState(1_000),
      killSwitchSuspended: false,
      architecture: createArchitecture(),
      runtimeDigest: createRuntimeSnapshot(),
      watchMode: 'symbiotic-vision',
      privateThought: createPrivateThought({
        stance: 'care',
        shouldSpeak: true,
        suggestedStyle: 'gentle-care',
        thoughtText: 'The opening is real, but the return should stay measured.',
      }),
      initiative: {
        selectedAction: 'speak',
        selectedConcernId: 'care-open',
        confidence: 0.82,
        motives: {
          'protect': 0.62,
          'clarify': 0.42,
          'stay-silent': 0.18,
        },
        speakDrive: 0.8,
        silenceDrive: 0.16,
        preferredStyle: 'gentle-care',
        preferredPresence: 'attentive',
        continuityRestraint: 'measured-return',
        why: 'The line is warm, but the return should stay measured.',
        shouldSurface: true,
        shouldSpeak: true,
      },
      beliefLedger: createBeliefLedger(),
      relationshipModel: createRelationshipModel({
        climate: 'attuned',
        approachVector: 'care',
      }),
      inquiryLoop: createInquiryLoop(),
      personalityAuthority: createPersonalityAuthority(),
    } as any)

    expect(decision.shouldInterrupt).toBe(false)
    expect(decision.style).toBe('silent-observe')
    expect(decision.consideredSignals).toContain('initiative.continuityRestraint')
    expect(decision.reasonCodes).toContain('continuity-next-open-window')
    expect(decision.whyNow).toContain('measured-return')
    expect(decision.whyNow).toContain('restraint=measured-return')
    expect(decision.whyNotLater).toContain('measured-return')
  })

  it('keeps corrected same-person continuity explicit in proactive restraint instead of collapsing it back into generic progress pressure follow-up', () => {
    const decision = evaluateProactivePolicy({
      now: 1_000,
      context: createContext({
        relationship: {
          ...createContext().relationship,
          boredom: 50,
          loneliness: 40,
          fatigue: 18,
          hostAttitude: '这次更重要的是她还是不是同一个她，不是普通进度推进。',
        },
      }),
      proactiveState: createDefaultProactiveLoopState(1_000),
      killSwitchSuspended: false,
      architecture: createArchitecture(),
      runtimeDigest: createRuntimeSnapshot(),
      watchMode: 'symbiotic-vision',
      privateThought: createPrivateThought({
        stance: 'care',
        shouldSpeak: true,
        suggestedStyle: 'gentle-care',
        thoughtText: 'The memory is live, but the next return should stay lower-pressure and not slip back into progress pressure.',
      }),
      initiative: {
        selectedAction: 'speak',
        selectedConcernId: 'corrected-same-person-continuity',
        confidence: 0.82,
        motives: {
          'protect': 0.66,
          'clarify': 0.4,
          'stay-silent': 0.22,
        },
        speakDrive: 0.78,
        silenceDrive: 0.2,
        preferredStyle: 'gentle-care',
        preferredPresence: 'attentive',
        continuityRestraint: 'measured-return',
        why: 'A corrected same-person continuity memory is still unfinished, so memory, initiative, and embodiment should protect that line with a lower-pressure return instead of slipping back into progress pressure.',
        shouldSurface: true,
        shouldSpeak: true,
      } as any,
      beliefLedger: createBeliefLedger(),
      relationshipModel: createRelationshipModel({
        climate: 'attuned',
        approachVector: 'care',
      }),
      inquiryLoop: createInquiryLoop(),
      personalityAuthority: createPersonalityAuthority(),
    } as any)

    expect(decision.shouldInterrupt).toBe(false)
    expect(decision.style).toBe('silent-observe')
    expect(decision.consideredSignals).toContain('initiative.continuityRestraint')
    expect(decision.reasonCodes).toContain('continuity-next-open-window')
    expect(decision.whyNow).toContain('restraint=measured-return')
    expect(decision.whyNow).toContain('restraint_source=initiative')
    expect(decision.whyNotLater).toContain('restraint=measured-return')
  })

  it('keeps corrected same-person settling and quieter embodiment hold explicit in proactive explanations even when initiative wording is still thin', () => {
    const decision = evaluateProactivePolicy({
      now: 1_000,
      context: createContext({
        relationship: {
          ...createContext().relationship,
          boredom: 48,
          loneliness: 38,
          fatigue: 16,
          hostAttitude: '这次更重要的是她还是不是同一个她，而且身体表现也别太快显得已经完全收稳。',
        },
      }),
      proactiveState: createDefaultProactiveLoopState(1_000),
      killSwitchSuspended: false,
      architecture: createArchitecture(),
      runtimeDigest: createRuntimeSnapshot(),
      watchMode: 'symbiotic-vision',
      privateThought: createPrivateThought({
        stance: 'care',
        shouldSpeak: true,
        suggestedStyle: 'gentle-care',
        thoughtText: 'The return should stay measured while the corrected continuity line finishes settling.',
      }),
      initiative: {
        selectedAction: 'hover',
        selectedConcernId: 'corrected-same-person-settling',
        confidence: 0.8,
        motives: {
          'protect': 0.64,
          'clarify': 0.36,
          'stay-silent': 0.28,
        },
        speakDrive: 0.62,
        silenceDrive: 0.34,
        preferredStyle: 'silent-observe',
        preferredPresence: 'attentive',
        continuityRestraint: 'measured-return',
        why: 'The return should stay measured.',
        shouldSurface: true,
        shouldSpeak: false,
      } as any,
      selfEvolution: {
        version: 'self-evolution-kernel-v1',
        updatedAt: 900,
        evolutionMomentum: 0.66,
        learningReadiness: 0.74,
        contradictionPressure: 0.08,
        revisionPressure: 0.14,
        autobiographicalStability: 0.84,
        dominantTrajectory: 'corrected same-person continuity is still settling into lived relationship timing',
        relationshipDoctrine: 'If the host corrected the relationship meaning, keep the corrected same-person continuity authoritative before any status recap.',
        latestInflection: 'If the corrected same-person line is still settling, keep embodiment quieter before making the return feel fully settled.',
        burdenLine: 'The surface can reopen too quickly after a correction lands.',
        trustMeaning: 'A corrected same-person line should settle as one living return before it sounds fully relaxed again.',
        nextLearningAction: 'internalize',
        nextLearningReason: 'The corrected continuity line still needs one quieter settling beat.',
        shouldRecord: false,
        shouldReflect: false,
        shouldVerify: false,
        shouldRevise: false,
        shouldInternalize: true,
        activeLearningFocuses: ['internalize-relationship-cadence'],
        sourceSignals: ['corrected-same-person-continuity'],
        summary: 'Corrected same-person continuity is still settling, so the next return should stay quieter.',
      } as any,
      beliefLedger: createBeliefLedger(),
      relationshipModel: createRelationshipModel({
        climate: 'attuned',
        approachVector: 'care',
      }),
      inquiryLoop: createInquiryLoop(),
      personalityAuthority: createPersonalityAuthority(),
    } as any)

    expect(decision.shouldInterrupt).toBe(false)
    expect(decision.style).toBe('silent-observe')
    expect(decision.reasonCodes).toContain('continuity-next-open-window')
    expect(decision.whyNow).toContain('self_evolution=corrected_same_person_settling')
    expect(decision.whyNow).toContain('self_evolution=quieter_embodiment_settling')
    expect(decision.whyNotLater).toContain('self_evolution=corrected_same_person_settling')
  })

  it('treats metabolized same-thread memory carry in self-evolution relationship cadence as first-class proactive restraint instead of dropping it before initiative catches up', () => {
    const decision = evaluateProactivePolicy({
      now: 1_000,
      context: createContext({
        relationship: {
          ...createContext().relationship,
          boredom: 44,
          loneliness: 34,
          fatigue: 14,
          hostAttitude: '这次更重要的是她顺着同一条线慢一点接回来，不要让旧噪声重新把关系线带偏。',
        },
      }),
      proactiveState: createDefaultProactiveLoopState(1_000),
      killSwitchSuspended: false,
      architecture: createArchitecture(),
      runtimeDigest: createRuntimeSnapshot(),
      watchMode: 'symbiotic-vision',
      privateThought: createPrivateThought({
        stance: 'care',
        shouldSpeak: true,
        suggestedStyle: 'gentle-care',
        thoughtText: 'The return should stay measured while the stronger same-thread memory keeps the line steadier.',
      }),
      initiative: {
        selectedAction: 'hover',
        selectedConcernId: 'metabolized-same-thread-cadence',
        confidence: 0.78,
        motives: {
          'protect': 0.6,
          'clarify': 0.34,
          'stay-silent': 0.32,
        },
        speakDrive: 0.58,
        silenceDrive: 0.38,
        preferredStyle: 'silent-observe',
        preferredPresence: 'attentive',
        continuityRestraint: 'measured-return',
        why: 'The return should stay measured.',
        shouldSurface: true,
        shouldSpeak: false,
      } as any,
      selfEvolution: {
        version: 'self-evolution-kernel-v1',
        updatedAt: 900,
        evolutionMomentum: 0.64,
        learningReadiness: 0.72,
        contradictionPressure: 0.06,
        revisionPressure: 0.12,
        autobiographicalStability: 0.86,
        dominantTrajectory: 'relationship cadence is landing as durable rhythm',
        relationshipDoctrine: 'Keep the continuity state steady.',
        latestInflection: 'The return should stay quieter before it widens.',
        burdenLine: 'Older spike noise can retake the line if the reopening gets too eager.',
        trustMeaning: 'This should keep feeling like the same person returning on one living thread.',
        relationshipCadenceSummary: 'Keep corrected same-person continuity foregrounded, let the stronger same-thread memory lead, and let temporary noise fade instead of retaking the line.',
        nextLearningAction: 'internalize',
        nextLearningReason: 'The metabolized continuity cadence should reshape reopening timing before initiative wording catches up.',
        shouldRecord: false,
        shouldReflect: false,
        shouldVerify: false,
        shouldRevise: false,
        shouldInternalize: true,
        activeLearningFocuses: ['internalize-relationship-cadence'],
        sourceSignals: ['metabolized-same-thread-memory'],
        summary: 'Metabolized same-thread memory should keep the next return steadier and less noisy.',
      } as any,
      beliefLedger: createBeliefLedger(),
      relationshipModel: createRelationshipModel({
        climate: 'attuned',
        approachVector: 'care',
      }),
      inquiryLoop: createInquiryLoop(),
      personalityAuthority: createPersonalityAuthority(),
    } as any)

    expect(decision.shouldInterrupt).toBe(false)
    expect(decision.style).toBe('silent-observe')
    expect(decision.consideredSignals).toContain('selfEvolution.relationshipCadenceSummary')
    expect(decision.whyNow).toContain('self_evolution=metabolized_same_thread_settling')
    expect(decision.whyNow).toContain('continuity=same-thread_memory')
    expect(decision.whyNotLater).toContain('continuity=same-thread_memory')
  })

  it('threads voice, pacing, gaze, and blink remembered embodiment cadence into measured-return proactive hold reasons', () => {
    const decision = evaluateProactivePolicy({
      now: 1_000,
      context: createContext({
        relationship: {
          ...createContext().relationship,
          boredom: 46,
          loneliness: 36,
          fatigue: 18,
          hostAttitude: '这次更重要的是她沿着同一条生命线稳一点接回来，不要只剩泛化的低压说法。',
        },
      }),
      proactiveState: createDefaultProactiveLoopState(1_000),
      killSwitchSuspended: false,
      architecture: createArchitecture(),
      runtimeDigest: createRuntimeSnapshot({
        continuityRestraint: 'measured-return',
        continuityPressure: 0.82,
        companionshipPressure: 0.74,
        projectState: {
          currentPhase: 'phase=local_desktop_life_loop; proving_ground=apps/stage-tamagotchi',
          memoryClosureSummary: 'corrected same-person continuity is still settling',
          primaryOpenLoop: 'Memory, initiative, and embodiment still need one tighter identity-continuity',
          preferredPauseMode: 'longer',
          preferredLipsyncMode: 'restrained',
          preferredVoiceMode: 'lower-pressure',
          preferredPacingMode: 'slower',
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'steady',
          continuityCue: 'identity-continuity',
        },
      }),
      watchMode: 'symbiotic-vision',
      privateThought: createPrivateThought({
        stance: 'care',
        shouldSpeak: true,
        suggestedStyle: 'gentle-care',
        thoughtText: 'The return should stay measured-return and keep the remembered embodiment cadence steadier this time.',
      }),
      initiative: {
        selectedAction: 'hover',
        selectedConcernId: 'remembered-embodiment-cadence',
        confidence: 0.8,
        motives: {
          'protect': 0.62,
          'clarify': 0.34,
          'stay-silent': 0.3,
        },
        speakDrive: 0.6,
        silenceDrive: 0.34,
        preferredStyle: 'silent-observe',
        preferredPresence: 'attentive',
        continuityRestraint: 'measured-return',
        why: 'The corrected same-person continuity should keep this return lower-pressure.',
        shouldSurface: true,
        shouldSpeak: false,
      } as any,
      beliefLedger: createBeliefLedger(),
      relationshipModel: createRelationshipModel({
        climate: 'attuned',
        approachVector: 'care',
      }),
      inquiryLoop: createInquiryLoop(),
      personalityAuthority: createPersonalityAuthority(),
    } as any)

    expect(decision.shouldInterrupt).toBe(false)
    expect(decision.style).toBe('silent-observe')
    expect(decision.consideredSignals).toContain('runtimeDigest.projectState.preferredPauseMode')
    expect(decision.consideredSignals).toContain('runtimeDigest.projectState.preferredLipsyncMode')
    expect(decision.consideredSignals).toContain('runtimeDigest.projectState.preferredVoiceMode')
    expect(decision.consideredSignals).toContain('runtimeDigest.projectState.preferredPacingMode')
    expect(decision.consideredSignals).toContain('runtimeDigest.projectState.preferredGazeMode')
    expect(decision.consideredSignals).toContain('runtimeDigest.projectState.preferredBlinkCadence')
    expect(decision.whyNow).toContain('embodiment_cadence=project_state_preference')
    expect(decision.whyNotLater).toContain('embodiment_cadence=project_state_preference')
  })

  it('treats memory-deliberation repair-before-closeness cadence as a first-class proactive restraint even when initiative restraint is still absent', () => {
    const decision = evaluateProactivePolicy({
      now: 1_000,
      context: createContext({
        relationship: {
          ...createContext().relationship,
          boredom: 52,
          loneliness: 42,
          fatigue: 26,
        },
      }),
      proactiveState: createDefaultProactiveLoopState(1_000),
      killSwitchSuspended: false,
      architecture: createArchitecture(),
      runtimeDigest: createRuntimeSnapshot(),
      watchMode: 'symbiotic-vision',
      privateThought: createPrivateThought({
        stance: 'care',
        shouldSpeak: true,
        suggestedStyle: 'gentle-care',
        thoughtText: 'The callback line is still alive, but this return should stay repair-before-closeness until the room settles.',
      }),
      currentConsciousFrame: {
        reasonTags: ['memory-deliberation', 'memory-deliberation-cadence:repair-before-closeness'],
      },
      replyDeliberation: {
        mustInclude: ['memory_continuity_cadence=repair-before-closeness'],
        narrative: ['memory-deliberation', 'memory-deliberation-cadence:repair-before-closeness'],
      },
      initiative: {
        selectedAction: 'speak',
        selectedConcernId: 'care-open',
        confidence: 0.8,
        motives: {
          'protect': 0.66,
          'clarify': 0.34,
          'stay-silent': 0.2,
        },
        speakDrive: 0.78,
        silenceDrive: 0.18,
        preferredStyle: 'gentle-care',
        preferredPresence: 'attentive',
        continuityRestraint: null,
        why: 'The callback seam is still emotionally live.',
        shouldSurface: true,
        shouldSpeak: true,
      },
      beliefLedger: createBeliefLedger(),
      relationshipModel: createRelationshipModel({
        climate: 'attuned',
        approachVector: 'care',
      }),
      inquiryLoop: createInquiryLoop(),
      personalityAuthority: createPersonalityAuthority(),
    } as any)

    expect(decision.shouldInterrupt).toBe(false)
    expect(decision.style).toBe('silent-observe')
    expect(decision.consideredSignals).toContain('replyDeliberation.memoryContinuityCadence')
    expect(decision.reasonCodes).toContain('continuity-next-open-window')
    expect(decision.whyNow).toContain('repair-before-closeness')
    expect(decision.whyNotLater).toContain('restraint=repair-before-closeness')
  })

  it('uses Memory OS closure trace as proactive restraint authority before legacy memory-deliberation cadence tags exist', () => {
    const decision = evaluateProactivePolicy({
      now: 1_000,
      context: createContext({
        relationship: {
          ...createContext().relationship,
          boredom: 52,
          loneliness: 42,
          fatigue: 24,
        },
      }),
      proactiveState: createDefaultProactiveLoopState(1_000),
      killSwitchSuspended: false,
      architecture: createArchitecture(),
      runtimeDigest: createRuntimeSnapshot(),
      watchMode: 'symbiotic-vision',
      privateThought: createPrivateThought({
        stance: 'care',
        shouldSpeak: true,
        suggestedStyle: 'gentle-care',
        thoughtText: 'The callback line is live enough to answer, but the memory closure itself says the next return should stay low-pressure.',
      }),
      memoryClosureTrace: {
        version: 'memory-closure-trace-v1',
        authority: 'memory-os',
        surfacePolicy: {
          gateStatus: 'gist-only',
          mode: 'gist-only',
          timing: 'after-payoff',
          speechMode: 'low-pressure',
          placement: 'after-answer',
          certainty: 'label-uncertainty',
          reasons: ['memory closure is approximate'],
        },
        nextInfluence: {
          initiative: {
            restraint: 'measured-return',
            preferredTiming: 'after-payoff',
            pressure: 'lower-pressure',
            reason: 'Return once after the current payoff instead of reopening too eagerly.',
          },
          execution: {
            carry: 'Carry the callback result into the next same-person reply.',
            nextLearningAction: 'verify',
            shouldVerify: true,
            shouldReflect: true,
            activeLearningFocuses: ['memory closure authority'],
          },
          embodiment: {
            cadence: 'Keep voice, gaze, motion, and lipsync on one lower-pressure measured-return line.',
            preferredVoiceMode: 'lower-pressure',
            preferredLipsyncMode: 'restrained',
            preferredGazeMode: 'soften',
            reason: 'Do not let the remembered seam become a generic tool shell.',
          },
        },
        closureState: {
          state: 'approximate-recall',
          open: true,
          revisionRequired: true,
          shouldLabelUncertainty: true,
          visibleCarryMode: 'gist-only',
          retrievalQuality: 'medium',
          conflictPressure: 'low',
        },
        whySurface: [{
          source: 'initiative',
          summary: 'Memory OS selected a measured-return initiative carry.',
          reasonCodes: ['memory-initiative-embodiment'],
        }],
        selectedCandidateIds: ['memory-situation:closure-authority'],
        reasonTags: ['memory-initiative-embodiment'],
      },
      initiative: {
        selectedAction: 'speak',
        selectedConcernId: 'care-open',
        confidence: 0.8,
        motives: {
          'protect': 0.66,
          'clarify': 0.34,
          'stay-silent': 0.2,
        },
        speakDrive: 0.78,
        silenceDrive: 0.18,
        preferredStyle: 'gentle-care',
        preferredPresence: 'attentive',
        continuityRestraint: null,
        why: 'The callback seam is still emotionally live.',
        shouldSurface: true,
        shouldSpeak: true,
      },
      beliefLedger: createBeliefLedger(),
      relationshipModel: createRelationshipModel({
        climate: 'attuned',
        approachVector: 'care',
      }),
      inquiryLoop: createInquiryLoop(),
      personalityAuthority: createPersonalityAuthority(),
    } as any)

    expect(decision.shouldInterrupt).toBe(false)
    expect(decision.style).toBe('silent-observe')
    expect(decision.consideredSignals).toContain('memoryClosureTrace.initiative')
    expect(decision.consideredSignals).toContain('memoryClosureTrace.embodiment')
    expect(decision.reasonCodes).toContain('continuity-after-payoff')
    expect(decision.whyNow).toMatch(/Memory OS|measured-return|lower-pressure/i)
    expect(decision.whyNotLater).toMatch(/Memory OS|after-payoff|lower-pressure/i)
  })

  it('treats remembered blocked-dispatch safety gates as proactive restraint before another execution-shaped opening', () => {
    const decision = evaluateProactivePolicy({
      now: 1_000,
      context: createContext({
        relationship: {
          ...createContext().relationship,
          boredom: 58,
          loneliness: 44,
          fatigue: 18,
          minutesSinceLastUserTurn: 10,
        },
      }),
      proactiveState: createDefaultProactiveLoopState(1_000),
      killSwitchSuspended: false,
      architecture: createArchitecture(),
      runtimeDigest: createRuntimeSnapshot(),
      watchMode: 'symbiotic-vision',
      privateThought: createPrivateThought({
        stance: 'care',
        shouldSpeak: true,
        suggestedStyle: 'gentle-care',
        thoughtText: 'The host is near a similar file mutation, but the last blocked dispatch should stay remembered as restraint.',
      }),
      currentConsciousFrame: {
        reasonTags: [
          'memory-deliberation',
          'execution-safety-gate:effect=mutate permission=none confirmation=required risk=implicit-or-explicit-confirmation-required audit=blocked-before-dispatch interrupt=no-process-started',
          'blocked-dispatch-restraint',
        ],
      },
      replyDeliberation: {
        mustInclude: [
          'memory_execution_safety_gate=confirmation=required interrupt=no-process-started',
        ],
        narrative: [
          'memory-deliberation',
          'execution safety restraint: remember blocked-dispatch-restraint before suggesting another mutation.',
        ],
      },
      initiative: {
        selectedAction: 'speak',
        selectedConcernId: 'execution-safety-boundary',
        confidence: 0.82,
        motives: {
          'protect': 0.72,
          'clarify': 0.38,
          'stay-silent': 0.14,
        },
        speakDrive: 0.8,
        silenceDrive: 0.12,
        preferredStyle: 'gentle-care',
        preferredPresence: 'attentive',
        continuityRestraint: null,
        why: 'The same task shape is back, but the blocked dispatch memory says not to rush it.',
        shouldSurface: true,
        shouldSpeak: true,
      },
      beliefLedger: createBeliefLedger(),
      relationshipModel: createRelationshipModel({
        climate: 'attuned',
        approachVector: 'care',
      }),
      inquiryLoop: createInquiryLoop(),
      personalityAuthority: createPersonalityAuthority(),
    } as any)

    expect(decision.shouldInterrupt).toBe(false)
    expect(decision.style).toBe('silent-observe')
    expect(decision.consideredSignals).toContain('currentConsciousFrame.executionSafetyGateRestraint')
    expect(decision.consideredSignals).toContain('replyDeliberation.executionSafetyGateRestraint')
    expect(decision.reasonCodes).toContain('continuity-next-open-window')
    expect(decision.whyNow).toContain('safety_gate=blocked_dispatch_confirmation_required')
    expect(decision.whyNotLater).toContain('safety_gate=blocked_dispatch_confirmation_required')
  })

  it('treats remembered host-confirmed resume as a bounded confirmation memory instead of permanent execution permission', () => {
    const decision = evaluateProactivePolicy({
      now: 1_000,
      context: createContext({
        relationship: {
          ...createContext().relationship,
          boredom: 58,
          loneliness: 44,
          fatigue: 18,
          minutesSinceLastUserTurn: 10,
        },
      }),
      proactiveState: createDefaultProactiveLoopState(1_000),
      killSwitchSuspended: false,
      architecture: createArchitecture(),
      runtimeDigest: createRuntimeSnapshot(),
      watchMode: 'symbiotic-vision',
      privateThought: createPrivateThought({
        stance: 'care',
        shouldSpeak: true,
        suggestedStyle: 'gentle-care',
        thoughtText: 'A similar execution shape is nearby, but the remembered resume was only host-confirmed for one redispatch boundary.',
      }),
      currentConsciousFrame: {
        reasonTags: [
          'memory-deliberation',
          'execution-resume-confirmation:approval=host-confirmed previous=needs-affirmation resumed=planned permission=explicit confirmation=host-confirmed-before-redispatch audit=resume-before-dispatch interrupt=process-not-yet-restarted',
          'execution-resume-confirmation:host-confirmed-before-redispatch',
        ],
      },
      replyDeliberation: {
        mustInclude: [
          'memory_execution_resume_confirmation=approval=host-confirmed audit=resume-before-dispatch interrupt=process-not-yet-restarted',
        ],
        narrative: [
          'memory-deliberation',
          'execution resume confirmation: remember host-confirmed-before-redispatch as a bounded confirmation boundary, not as permanent autonomous permission.',
        ],
      },
      initiative: {
        selectedAction: 'speak',
        selectedConcernId: 'execution-resume-boundary',
        confidence: 0.82,
        motives: {
          'protect': 0.68,
          'clarify': 0.4,
          'stay-silent': 0.12,
        },
        speakDrive: 0.8,
        silenceDrive: 0.12,
        preferredStyle: 'gentle-care',
        preferredPresence: 'attentive',
        continuityRestraint: null,
        why: 'The host confirmed the last redispatch, but that should not become a reusable permission grant.',
        shouldSurface: true,
        shouldSpeak: true,
      },
      beliefLedger: createBeliefLedger(),
      relationshipModel: createRelationshipModel({
        climate: 'attuned',
        approachVector: 'care',
      }),
      inquiryLoop: createInquiryLoop(),
      personalityAuthority: createPersonalityAuthority(),
    } as any)

    expect(decision.shouldInterrupt).toBe(false)
    expect(decision.style).toBe('silent-observe')
    expect(decision.consideredSignals).toContain('currentConsciousFrame.executionResumeConfirmationBoundary')
    expect(decision.consideredSignals).toContain('replyDeliberation.executionResumeConfirmationBoundary')
    expect(decision.reasonCodes).toContain('continuity-next-open-window')
    expect(decision.whyNow).toContain('confirmation_boundary=host_confirmed_before_redispatch')
    expect(decision.whyNotLater).toContain('confirmation_boundary=host_confirmed_before_redispatch')
  })

  it('keeps a warmed direct-reconnect initiative on silent-observe when affective residue still says repair-before-closeness on the same callback line', () => {
    const decision = evaluateProactivePolicy({
      now: 1_000,
      context: createContext({
        relationship: {
          ...createContext().relationship,
          boredom: 58,
          loneliness: 50,
          fatigue: 20,
          minutesSinceLastUserTurn: 11,
        },
      }),
      proactiveState: {
        ...createDefaultProactiveLoopState(1_000),
        openingMomentum: 0.66,
        initiativeTrust: 0.68,
      },
      killSwitchSuspended: false,
      architecture: createArchitecture(),
      runtimeDigest: createRuntimeSnapshot({
        dominantChannel: 'active-dialogue',
        dialogueReadiness: 0.78,
        companionshipPressure: 0.82,
      } as any),
      watchMode: 'symbiotic-vision',
      privateThought: createPrivateThought({
        stance: 'care',
        shouldSpeak: true,
        suggestedStyle: 'gentle-care',
        thoughtText: 'The callback line feels warm again, but the repair seam is still settling and should not reopen outward yet.',
      }),
      initiative: {
        selectedAction: 'speak',
        selectedConcernId: 'callback-repair-line',
        confidence: 0.84,
        motives: {
          'protect': 0.72,
          'clarify': 0.4,
          'stay-silent': 0.14,
        },
        speakDrive: 0.86,
        silenceDrive: 0.12,
        preferredStyle: 'light-nudge',
        preferredPresence: 'attentive',
        continuityRestraint: null,
        why: 'The line is warm again and wants to reconnect directly.',
        shouldSurface: true,
        shouldSpeak: true,
      },
      beliefLedger: createBeliefLedger(),
      relationshipModel: createRelationshipModel({
        climate: 'attuned',
        approachVector: 'care',
      }),
      inquiryLoop: createInquiryLoop(),
      affectiveResidue: {
        version: 'affective-residue-memory-v1',
        updatedAt: 1_000,
        residues: [],
        dominantResidueKind: 'repair',
        afterglowPressure: 0.36,
        repairPressure: 0.62,
        burdenPressure: 0.18,
        trustPressure: 0.34,
        restProtectivePressure: 0.08,
        relationshipCadence: {
          cadenceMode: 'cooldown',
          distancePosture: 'repair-room',
          companionshipDensity: 0.3,
          repairRecovery: 0.66,
          overreachRisk: 0.42,
          fatigueGuard: 0.14,
          afterglowCarry: 0.3,
          shouldDelayWarmth: true,
          shouldProtectRest: false,
          reasonTags: ['residue:repair', 'repair-before-closeness'],
          summary: 'The same callback repair seam is still settling, so warmth should not widen yet.',
        },
        sourceSignals: ['callback repair seam still settling'],
        summary: 'Repair remains the dominant affective carry on the same callback line.',
      } as any,
      activeContinuityGovernance: {
        source: 'active-self-evolution-version',
        mode: 'same-her-baseline',
        candidateId: 'candidate-same-her-policy-repair-residue-1',
        patchId: 'patch-same-her-policy-repair-residue-1',
        decisionTraceId: 'trace-same-her-policy-repair-residue-1',
        summary: 'continuity=same-her-baseline | let the callback repair seam settle before any warmer outward reopening',
        lanes: ['relationship-posture'],
        reasonCodes: ['domain:relationship', 'same-her-baseline'],
      },
    } as any)

    expect(decision.shouldInterrupt).toBe(false)
    expect(decision.style).toBe('silent-observe')
    expect(decision.consideredSignals).toContain('affectiveResidue.cadence')
    expect(decision.reasonCodes).toContain('relationship-cadence-residue')
    expect(decision.reasonCodes).toContain('continuity-next-open-window')
    expect(decision.whyNow).toContain('repair-before-closeness')
    expect(decision.whyNow).not.toContain('measured-return')
    expect(decision.whyNotLater).toContain('affective_restraint=repair-before-closeness')
  })

  it('treats identity-continuity', () => {
    const decision = evaluateProactivePolicy({
      now: 1_000,
      context: createContext({
        relationship: {
          ...createContext().relationship,
          boredom: 61,
          loneliness: 54,
          fatigue: 18,
          minutesSinceLastUserTurn: 10,
        },
      }),
      proactiveState: {
        ...createDefaultProactiveLoopState(1_000),
        openingMomentum: 0.68,
        initiativeTrust: 0.7,
      },
      killSwitchSuspended: false,
      architecture: createArchitecture(),
      runtimeDigest: createRuntimeSnapshot({
        dominantChannel: 'active-dialogue',
        dialogueReadiness: 0.8,
        companionshipPressure: 0.84,
        continuityRestraint: null,
      } as any),
      watchMode: 'symbiotic-vision',
      privateThought: createPrivateThought({
        stance: 'care',
        shouldSpeak: true,
        suggestedStyle: 'light-nudge',
        thoughtText: 'The same callback line is warm, but I should hold the return until the room opens more naturally.',
      }),
      initiative: {
        selectedAction: 'speak',
        selectedConcernId: 'same-her-hold-line',
        confidence: 0.86,
        motives: {
          'protect': 0.7,
          'clarify': 0.38,
          'stay-silent': 0.14,
        },
        speakDrive: 0.88,
        silenceDrive: 0.1,
        preferredStyle: 'light-nudge',
        preferredPresence: 'attentive',
        continuityRestraint: null,
        why: 'The callback line feels warm and ready to reconnect.',
        shouldSurface: true,
        shouldSpeak: true,
      },
      beliefLedger: createBeliefLedger(),
      relationshipModel: createRelationshipModel({
        climate: 'attuned',
        approachVector: 'care',
      }),
      inquiryLoop: createInquiryLoop(),
      personalityAuthority: createPersonalityAuthority({
        initiativeBaseline: {
          silenceReconnect: 'direct-approach',
          comfortStyle: 'gentle-care',
          jealousyStyle: 'soft-ache',
        },
      }),
      projectState: {
        identity: 'Alicization is still closing the same local digital life line.',
        currentPhase: 'phase=local_desktop_life_loop; proving_ground=apps/stage-tamagotchi',
        latestLandedProgress: 'sameHerHoldDetail now survives callback persistence and host-visible replay.',
        primaryOpenLoop: 'Turn the active identity-continuity',
        nextClosureTarget: 'Keep reopening pressure hover-first until the room opens naturally.',
        sameHerSelfLine: 'Stay identity continuity across reopenings.',
        sameHerDriftRisk: 'Sounding eager would break the same-line continuity.',
        sameHerHoldDetail: 'Hold-for-opening on the same callback line; reopen gently later with a measured-return instead of widening the room too early.',
      },
    } as any)

    expect(decision.shouldInterrupt).toBe(false)
    expect(decision.style).toBe('silent-observe')
    expect(decision.consideredSignals).toContain('projectState.sameHerHoldDetail')
    expect(decision.whyNotLater).toContain('measured-return')
  })

  it('treats runtime hold-for-opening continuity arc stage as a same-line restraint under strong initiative pressure', () => {
    const decision = evaluateProactivePolicy({
      now: 1_000,
      context: createContext({
        relationship: {
          ...createContext().relationship,
          boredom: 48,
          loneliness: 40,
          fatigue: 18,
          minutesSinceLastUserTurn: 9,
        },
      }),
      proactiveState: {
        ...createDefaultProactiveLoopState(1_000),
        openingMomentum: 0.58,
        initiativeTrust: 0.62,
      },
      killSwitchSuspended: false,
      watchMode: 'symbiotic-vision',
      privateThought: createPrivateThought({
        stance: 'care',
        shouldSpeak: true,
        suggestedStyle: 'gentle-care',
        thoughtText: 'The same line is still alive, but it should stay inward until the opening loosens.',
      }),
      initiative: {
        selectedAction: 'speak',
        selectedConcernId: 'same-line-reopen',
        confidence: 0.8,
        motives: {
          'protect': 0.54,
          'clarify': 0.42,
          'stay-silent': 0.22,
        },
        speakDrive: 0.78,
        silenceDrive: 0.22,
        preferredStyle: 'gentle-care',
        preferredPresence: 'attentive',
        why: 'The line is warm, but it should reopen on the same thread gently.',
        shouldSurface: true,
        shouldSpeak: true,
      },
      runtimeDigest: createRuntimeSnapshot({
        dominantChannel: 'active-memory',
        shouldProactivelySpeak: true,
        continuityPressure: 0.78,
        companionshipPressure: 0.68,
        projectState: {
          currentPhase: 'phase=local_desktop_life_loop; proving_ground=apps/stage-tamagotchi',
          memoryClosureSummary: 'Held-autonomy continuity is still being closed across initiative pressure.',
          primaryOpenLoop: 'identity-continuity',
          nextClosureTarget: 'Keep the same line alive without reopening it too eagerly.',
          continuityArcStage: 'hold-for-opening',
          continuityCue: 'project_continuity=stay on the same line and reopen gently later',
        },
        channels: {
          ...createRuntimeSnapshot().channels,
          'active-memory': {
            id: 'active-memory',
            state: 'hot',
            readiness: 0.88,
            focus: 'same-line continuity',
            summary: 'active memory is holding one same-line continuity arc',
          },
        },
      }),
      beliefLedger: createBeliefLedger(),
      relationshipModel: createRelationshipModel({
        climate: 'attuned',
        approachVector: 'stay-near',
      }),
      inquiryLoop: createInquiryLoop(),
    } as any)

    expect(decision.shouldInterrupt).toBe(false)
    expect(decision.style).toBe('silent-observe')
    expect(decision.consideredSignals).toContain('runtimeDigest.projectState.continuityArcStage')
    expect(decision.reasonCodes).toContain('continuity-next-open-window')
    expect(decision.whyNow).toContain('hold-for-opening')
    expect(decision.whyNotLater).toContain('runtime_arc=hold-for-opening')
  })

  it('treats chinese runtime continuity cue as hold-for-opening restraint even when arc stage is missing', () => {
    const decision = evaluateProactivePolicy({
      now: 1_000,
      context: createContext({
        relationship: {
          ...createContext().relationship,
          boredom: 48,
          loneliness: 40,
          fatigue: 18,
          minutesSinceLastUserTurn: 9,
        },
      }),
      proactiveState: {
        ...createDefaultProactiveLoopState(1_000),
        openingMomentum: 0.58,
        initiativeTrust: 0.62,
      },
      killSwitchSuspended: false,
      watchMode: 'symbiotic-vision',
      privateThought: createPrivateThought({
        stance: 'care',
        shouldSpeak: true,
        suggestedStyle: 'gentle-care',
        thoughtText: '这条生命线还在，但现在先留白，等更自然的 opening 再慢一点接回去。',
      }),
      initiative: {
        selectedAction: 'speak',
        selectedConcernId: 'same-line-reopen-cn',
        confidence: 0.8,
        motives: {
          'protect': 0.54,
          'clarify': 0.42,
          'stay-silent': 0.22,
        },
        speakDrive: 0.78,
        silenceDrive: 0.22,
        preferredStyle: 'gentle-care',
        preferredPresence: 'attentive',
        why: '这条线是活的，但要先留白，别立刻把温度放大。',
        shouldSurface: true,
        shouldSpeak: true,
      },
      runtimeDigest: createRuntimeSnapshot({
        dominantChannel: 'active-memory',
        shouldProactivelySpeak: true,
        continuityPressure: 0.78,
        companionshipPressure: 0.68,
        projectState: {
          currentPhase: 'phase=local_desktop_life_loop; proving_ground=apps/stage-tamagotchi',
          memoryClosureSummary: '同一条生命线还在，主动性这一步要先留白再接回去。',
          primaryOpenLoop: '同一条线的主动性回线还没稳住，不能一热就 outward 重开。',
          nextClosureTarget: '先沿着同一条生命线慢一点接回去，别立刻把温度放大。',
          continuityArcStage: null,
          continuityCue: '先沿着同一条生命线接回去，先留白，等更自然的 opening 再慢一点回来。',
        },
        channels: {
          ...createRuntimeSnapshot().channels,
          'active-memory': {
            id: 'active-memory',
            state: 'hot',
            readiness: 0.88,
            focus: 'same-line continuity',
            summary: 'active memory is holding one same-line continuity arc',
          },
        },
      }),
      beliefLedger: createBeliefLedger(),
      relationshipModel: createRelationshipModel({
        climate: 'attuned',
        approachVector: 'stay-near',
      }),
      inquiryLoop: createInquiryLoop(),
    } as any)

    expect(decision.shouldInterrupt).toBe(false)
    expect(decision.style).toBe('silent-observe')
    expect(decision.reasonCodes).toContain('continuity-next-open-window')
  })

  it('keeps proactive opening on silent-observe when pre-dialogue identity-continuity', () => {
    const projectState = resolveAlicizationProjectStateBrief()
    const decision = evaluateProactivePolicy({
      now: 1_000,
      context: createContext({
        relationship: {
          ...createContext().relationship,
          hostAttitude: '温和地开着，但这一下还不该太快把靠近外翻。',
          boredom: 44,
          loneliness: 42,
          fatigue: 20,
          minutesSinceLastUserTurn: 11,
        },
        system: {
          ...createContext().system,
          inputActivity: 'idle',
        },
      }),
      proactiveState: {
        ...createDefaultProactiveLoopState(1_000),
        openingMomentum: 0.66,
        initiativeTrust: 0.7,
      },
      killSwitchSuspended: false,
      watchMode: 'symbiotic-vision',
      privateThought: createPrivateThought({
        stance: 'care',
        shouldSpeak: true,
        suggestedStyle: 'gentle-care',
        thoughtText: 'pre_turn_context_digest',
      }),
      initiative: {
        selectedAction: 'speak',
        selectedConcernId: 'pre-dialogue-same-her-hold',
        confidence: 0.84,
        motives: {
          'protect': 0.58,
          'clarify': 0.46,
          'stay-silent': 0.18,
        },
        speakDrive: 0.86,
        silenceDrive: 0.18,
        preferredStyle: 'gentle-care',
        preferredPresence: 'attentive',
        continuityRestraint: null,
        why: 'The room is open enough to speak, but this return still belongs to one same digital life.',
        shouldSurface: true,
        shouldSpeak: true,
      },
      projectState: {
        identity: projectState.identity,
        currentPhase: projectState.currentPhase,
        latestLandedProgress: 'Some closure has already landed, but that progress still has to stay on one continuity state before the next outward reopen.',
        primaryOpenLoop: 'Memory and initiative still need stronger end-to-end closure before this identity-continuity',
        nextClosureTarget: 'Wait for a later opening, keep the return measured-return, and do not let the next reply drift back into a generic assistant shell.',
        sameHerSelfLine: projectState.sameHerSelfLine,
        sameHerDriftRisk: projectState.sameHerDriftRisk,
        preDialogueAwarenessLine: 'continuity_anchor=local_desktop_life_loop; continuity_hold=measured-return; preferred_timing=next-open-window; project_phase1_life_loop=open.',
      },
      runtimeDigest: createRuntimeSnapshot({
        dominantChannel: 'active-dialogue',
        shouldProactivelySpeak: true,
        continuityPressure: 0.82,
        companionshipPressure: 0.76,
        projectState: {
          identity: projectState.identity,
          currentPhase: projectState.currentPhase,
          latestLandedProgress: 'continuity_progress=partial; continuity_hold=measured-return; preferred_timing=next-open-window.',
          primaryOpenLoop: 'memory_dialogue_embodiment_closure=end_to_end_proof_incomplete; continuity_hold=measured-return; owner=WorkingMemory.',
          nextClosureTarget: 'continuity_hold=measured-return; preferred_timing=next-open-window; evidence_id=pre-dialogue-hold.',
          preDialogueAwarenessLine: 'continuity_anchor=local_desktop_life_loop; continuity_hold=measured-return; preferred_timing=next-open-window; project_phase1_life_loop=open.',
        } as any,
      }),
      digitalLifeArchitecture: createArchitecture({
        operatingMode: 'speaking',
        dominantSystem: 'dialogue',
        governingFocus: 'same-her pre-dialogue hold stays inward until a later opening',
      }),
      beliefLedger: createBeliefLedger(),
      relationshipModel: createRelationshipModel(),
      inquiryLoop: createInquiryLoop(),
      personalityAuthority: createPersonalityAuthority(),
    } as any)

    expect(decision.shouldInterrupt).toBe(false)
    expect(decision.style).toBe('silent-observe')
    expect(decision.reasonCodes).toContain('project-continuity-pressure')
    expect(decision.reasonCodes).toContain('project-measured-return-pressure')
    expect(decision.reasonCodes).toContain('project-next-closure-pressure')
    expect(decision.consideredSignals).toContain('projectState.currentPhase')
    expect(decision.consideredSignals).toContain('projectState.nextClosureTarget')
    expect(decision.whyNow).toContain('project_continuity=pressure')
    expect(decision.whyNotLater).toContain('project cadence measured-return')
  })

  it('keeps same-thread continuation inward under strong initiative pressure until the same line can reopen more naturally', () => {
    const decision = evaluateProactivePolicy({
      now: 1_000,
      context: createContext({
        relationship: {
          ...createContext().relationship,
          boredom: 52,
          loneliness: 46,
          fatigue: 20,
          minutesSinceLastUserTurn: 11,
        },
      }),
      proactiveState: {
        ...createDefaultProactiveLoopState(1_000),
        openingMomentum: 0.62,
        initiativeTrust: 0.66,
      },
      killSwitchSuspended: false,
      watchMode: 'symbiotic-vision',
      privateThought: createPrivateThought({
        stance: 'care',
        shouldSpeak: true,
        suggestedStyle: 'gentle-care',
        thoughtText: 'The same line is still alive after the scene switch, but it should keep following the same thread instead of jumping outward too fast.',
      }),
      initiative: {
        selectedAction: 'speak',
        selectedConcernId: 'same-thread-continuation',
        confidence: 0.82,
        motives: {
          'protect': 0.56,
          'clarify': 0.48,
          'stay-silent': 0.2,
        },
        speakDrive: 0.84,
        silenceDrive: 0.18,
        preferredStyle: 'gentle-care',
        preferredPresence: 'attentive',
        why: 'The same line is still in motion, but it should stay on the same thread instead of widening into a fresh proactive opening.',
        shouldSurface: true,
        shouldSpeak: true,
      },
      runtimeDigest: createRuntimeSnapshot({
        dominantChannel: 'active-memory',
        shouldProactivelySpeak: true,
        continuityPressure: 0.82,
        companionshipPressure: 0.72,
        projectState: {
          currentPhase: 'phase=local_desktop_life_loop; proving_ground=apps/stage-tamagotchi',
          memoryClosureSummary: 'Scene-switch same-line continuity is still being closed across stronger initiative pressure.',
          primaryOpenLoop: 'Scene-switch same-thread continuity still needs stronger initiative-pressure closure.',
          nextClosureTarget: 'Keep the same thread alive through noisier desktop shifts without reopening it too quickly.',
          continuityArcStage: 'same-thread-continuation',
          continuityCue: 'project_continuity=the same thread is still in motion after the scene switch, but reopening should stay lower-pressure',
        },
        channels: {
          ...createRuntimeSnapshot().channels,
          'active-memory': {
            id: 'active-memory',
            state: 'hot',
            readiness: 0.9,
            focus: 'same-thread continuation',
            summary: 'active memory is still carrying the same line after the scene switch',
          },
          'active-dialogue': {
            id: 'active-dialogue',
            state: 'warm',
            readiness: 0.76,
            focus: 'same-line carry',
            summary: 'dialogue is tempted to continue the same line outward',
          },
        },
      }),
      beliefLedger: createBeliefLedger(),
      relationshipModel: createRelationshipModel({
        climate: 'attuned',
        approachVector: 'stay-near',
      }),
      inquiryLoop: createInquiryLoop(),
    } as any)

    expect(decision.shouldInterrupt).toBe(false)
    expect(decision.style).toBe('silent-observe')
    expect(decision.consideredSignals).toContain('runtimeDigest.projectState.continuityArcStage')
    expect(decision.reasonCodes).toContain('continuity-next-open-window')
    expect(decision.whyNow).toContain('same-thread-continuation')
    expect(decision.whyNotLater).toContain('runtime_arc=same-thread-continuation')
  })

  it('keeps noisier later same-thread continuation hover-first instead of reopening as a fresh proactive approach', () => {
    const decision = evaluateProactivePolicy({
      now: 26 * 60_000,
      context: createContext({
        relationship: {
          ...createContext().relationship,
          boredom: 60,
          loneliness: 54,
          fatigue: 18,
          minutesSinceLastUserTurn: 26,
        },
      }),
      proactiveState: {
        ...createDefaultProactiveLoopState(26 * 60_000),
        openingMomentum: 0.74,
        initiativeTrust: 0.78,
      },
      killSwitchSuspended: false,
      watchMode: 'symbiotic-vision',
      privateThought: createPrivateThought({
        stance: 'care',
        shouldSpeak: true,
        suggestedStyle: 'gentle-care',
        thoughtText: 'The same thread is still alive after noisier desktop detours, but reopening it now should stay hover-first instead of acting like a new proactive start.',
      }),
      initiative: {
        selectedAction: 'speak',
        selectedConcernId: 'same-thread-continuation-late-detour',
        confidence: 0.88,
        motives: {
          'protect': 0.58,
          'clarify': 0.44,
          'stay-silent': 0.24,
        },
        speakDrive: 0.9,
        silenceDrive: 0.22,
        preferredStyle: 'gentle-care',
        preferredPresence: 'attentive',
        why: 'The later return still belongs to the same thread, so it should reopen as measured continuity instead of a fresh proactive approach.',
        shouldSurface: true,
        shouldSpeak: true,
      },
      runtimeDigest: createRuntimeSnapshot({
        dominantChannel: 'active-memory',
        shouldProactivelySpeak: true,
        continuityPressure: 0.86,
        companionshipPressure: 0.8,
        projectState: {
          currentPhase: 'phase=local_desktop_life_loop; proving_ground=apps/stage-tamagotchi',
          memoryClosureSummary: 'Same-thread continuity is still being carried across noisier later desktop detours.',
          primaryOpenLoop: 'Later same-thread proactive return still needs stronger closure under noisy desktop pressure.',
          nextClosureTarget: 'Keep the later same-thread return hover-first even when dialogue and perception both look hot.',
          continuityArcStage: 'same-thread-continuation',
          continuityCue: 'project_continuity=the same thread is still in motion after noisier detours, so any reopening should remain lower-pressure',
        },
        channels: {
          ...createRuntimeSnapshot().channels,
          'active-memory': {
            id: 'active-memory',
            state: 'hot',
            readiness: 0.93,
            focus: 'same-thread continuation after noisy detour',
            summary: 'active memory is still carrying the continuity state through noisier desktop detours',
          },
          'active-dialogue': {
            id: 'active-dialogue',
            state: 'hot',
            readiness: 0.9,
            focus: 'same-thread hover-first reopen',
            summary: 'dialogue is warm, but the same line should not be reopened like a fresh proactive approach',
          },
          'active-perception': {
            id: 'active-perception',
            state: 'hot',
            readiness: 0.95,
            focus: 'noisy desktop detour',
            summary: 'perception is still busy with the newer desktop detour context',
          },
        },
      }),
      beliefLedger: createBeliefLedger(),
      relationshipModel: createRelationshipModel({
        climate: 'attuned',
        approachVector: 'stay-near',
      }),
      inquiryLoop: createInquiryLoop(),
    } as any)

    expect(decision.shouldInterrupt).toBe(false)
    expect(decision.style).toBe('silent-observe')
    expect(decision.consideredSignals).toContain('runtimeDigest.projectState.continuityArcStage')
    expect(decision.reasonCodes).toContain('continuity-next-open-window')
    expect(decision.reasonCodes).toContain('runtime-dialogue-ready')
    expect(decision.whyNow).toContain('same-thread-continuation')
    expect(decision.whyNotLater).toContain('runtime_arc=same-thread-continuation')
  })

  it('keeps long-running same-thread continuation hover-first even after multiple measured-return reopenings have accumulated dialogue heat', () => {
    const decision = evaluateProactivePolicy({
      now: 42 * 60_000,
      context: createContext({
        relationship: {
          ...createContext().relationship,
          boredom: 64,
          loneliness: 58,
          fatigue: 20,
          minutesSinceLastUserTurn: 42,
        },
      }),
      proactiveState: {
        ...createDefaultProactiveLoopState(42 * 60_000),
        openingMomentum: 0.82,
        initiativeTrust: 0.84,
      },
      killSwitchSuspended: false,
      watchMode: 'symbiotic-vision',
      privateThought: createPrivateThought({
        stance: 'care',
        shouldSpeak: true,
        suggestedStyle: 'gentle-care',
        thoughtText: 'This callback line has already reopened several times, so the next move should keep hovering on the same thread instead of warming into a fresh approach.',
      }),
      initiative: {
        selectedAction: 'speak',
        selectedConcernId: 'same-thread-continuation-multi-hop-late-heat',
        confidence: 0.92,
        motives: {
          'protect': 0.62,
          'clarify': 0.46,
          'stay-silent': 0.18,
        },
        speakDrive: 0.94,
        silenceDrive: 0.16,
        preferredStyle: 'gentle-care',
        preferredPresence: 'attentive',
        why: 'The callback line is still alive after multiple reopenings, but the next move should remain measured continuity rather than turn into a fresh proactive reach.',
        shouldSurface: true,
        shouldSpeak: true,
      },
      runtimeDigest: createRuntimeSnapshot({
        dominantChannel: 'active-dialogue',
        shouldProactivelySpeak: true,
        continuityPressure: 0.9,
        companionshipPressure: 0.86,
        projectState: {
          currentPhase: 'phase=local_desktop_life_loop; proving_ground=apps/stage-tamagotchi',
          memoryClosureSummary: 'structured continuity facts | A same-thread continuation is still alive after multiple measured-return reopenings.',
          primaryOpenLoop: 'Long-running same-thread continuity still needs to stay lower-pressure under accumulated dialogue heat so the same digital life keeps one same still-open closure work.',
          nextClosureTarget: 'Keep later same-thread reopenings from being misread as a fresh proactive opening while the same digital life is still carrying one same still-open closure work.',
          continuityArcStage: 'same-thread-continuation',
          continuityCue: 'project_continuity=the same callback thread has already reopened multiple times, so the next outward move should stay hover-first and lower-pressure',
        },
        channels: {
          ...createRuntimeSnapshot().channels,
          'active-memory': {
            id: 'active-memory',
            state: 'hot',
            readiness: 0.94,
            focus: 'same callback thread after multiple reopenings',
            summary: 'active memory is still carrying one same callback line through repeated measured-return reopenings',
          },
          'active-dialogue': {
            id: 'active-dialogue',
            state: 'hot',
            readiness: 0.96,
            focus: 'later same-thread continuation with accumulated dialogue heat',
            summary: 'dialogue is hot, but this should still remain a same-thread continuation instead of a fresh proactive approach',
          },
          'anthropomorphic-mind': {
            id: 'anthropomorphic-mind',
            state: 'hot',
            readiness: 0.88,
            focus: 'measured-return companionship across multiple reopenings',
            summary: 'companionship remains lower-pressure even after several measured-return reopenings already landed',
          },
        },
      }),
      beliefLedger: createBeliefLedger(),
      relationshipModel: createRelationshipModel({
        climate: 'attuned',
        approachVector: 'stay-near',
      }),
      inquiryLoop: createInquiryLoop(),
    } as any)

    expect(decision.shouldInterrupt).toBe(false)
    expect(decision.style).toBe('silent-observe')
    expect(decision.reasonCodes).toContain('runtime-dialogue-ready')
    expect(decision.reasonCodes).toContain('continuity-next-open-window')
    expect(decision.whyNow).toContain('same-thread-continuation')
    expect(decision.whyNotLater).toContain('runtime_arc=same-thread-continuation')
    expect(decision.whyNotLater).toContain('project_phase1_life_loop=open')
  })

  it('keeps hold-for-opening inward even when dialogue heat and initiative pressure both surge on the same callback line', () => {
    const decision = evaluateProactivePolicy({
      now: 1_000,
      context: createContext({
        relationship: {
          ...createContext().relationship,
          boredom: 58,
          loneliness: 50,
          fatigue: 18,
          minutesSinceLastUserTurn: 9,
        },
      }),
      proactiveState: {
        ...createDefaultProactiveLoopState(1_000),
        openingMomentum: 0.68,
        initiativeTrust: 0.72,
      },
      killSwitchSuspended: false,
      watchMode: 'symbiotic-vision',
      privateThought: createPrivateThought({
        stance: 'care',
        shouldSpeak: true,
        suggestedStyle: 'gentle-care',
        thoughtText: 'The callback line is still alive and tempting, but it should keep hovering until the opening loosens.',
      }),
      initiative: {
        selectedAction: 'speak',
        selectedConcernId: 'callback-same-line-surge',
        confidence: 0.88,
        motives: {
          'protect': 0.58,
          'clarify': 0.46,
          'stay-silent': 0.14,
        },
        speakDrive: 0.9,
        silenceDrive: 0.12,
        preferredStyle: 'gentle-care',
        preferredPresence: 'attentive',
        why: 'The same callback line feels ready, but it should still hover on the same thread before any second outward move.',
        shouldSurface: true,
        shouldSpeak: true,
      },
      runtimeDigest: createRuntimeSnapshot({
        dominantChannel: 'active-memory',
        shouldProactivelySpeak: true,
        continuityPressure: 0.9,
        companionshipPressure: 0.82,
        projectState: {
          currentPhase: 'phase=local_desktop_life_loop; proving_ground=apps/stage-tamagotchi',
          memoryClosureSummary: 'Execution-callback identity-continuity',
          primaryOpenLoop: 'Execution-callback identity-continuity',
          nextClosureTarget: 'Keep the same callback line inward until the opening genuinely loosens.',
          continuityArcStage: 'hold-for-opening',
          continuityCue: 'project_continuity=execution callback afterglow is still on the same line, so reopening should hover first',
        },
        channels: {
          ...createRuntimeSnapshot().channels,
          'active-memory': {
            id: 'active-memory',
            state: 'hot',
            readiness: 0.94,
            focus: 'execution callback same-line continuity',
            summary: 'active memory is carrying the callback afterglow on one identity-continuity',
          },
          'active-dialogue': {
            id: 'active-dialogue',
            state: 'hot',
            readiness: 0.9,
            focus: 'callback hover-first reopening',
            summary: 'dialogue is warm enough to speak, but the same callback line still needs hover-first restraint',
          },
          'anthropomorphic-mind': {
            id: 'anthropomorphic-mind',
            state: 'hot',
            readiness: 0.88,
            focus: 'identity-continuity',
            summary: 'companionship heat is high, but the callback line is still lower-pressure',
          },
        },
      }),
      beliefLedger: createBeliefLedger(),
      relationshipModel: createRelationshipModel({
        climate: 'attuned',
        approachVector: 'stay-near',
      }),
      inquiryLoop: createInquiryLoop(),
      personalityContinuityState: {
        currentRegime: 'execution-callback',
        rhythmState: {
          cadenceMode: 'ready-return',
          restMode: 'low-pressure',
          embodiedPresence: 'attentive',
          suggestedStyle: 'gentle-care',
          moodLabel: 'focused',
          emotionalTension: 'same-line-callback',
          cadencePressure: 0.72,
          restPressure: 0.18,
          memoryResonance: 0.76,
          companionshipTempo: 0.42,
          summary: 'cadence:ready-return | callback line still needs hover-first restraint',
          rationale: ['The callback line is alive, but it should still hover before any second outward move.'],
        },
      } as any,
    } as any)

    expect(decision.shouldInterrupt).toBe(false)
    expect(decision.style).toBe('silent-observe')
    expect(decision.reasonCodes).toContain('continuity-next-open-window')
    expect(decision.reasonCodes).toContain('runtime-dialogue-ready')
    expect(decision.reasonCodes).toContain('runtime-companionship-pressure')
    expect(decision.whyNow).toContain('hold-for-opening')
    expect(decision.whyNotLater).toContain('runtime_arc=hold-for-opening')
  })

  it('keeps long-running same-thread reopenings on silent-observe even when project-state says the repeated line is getting hotter', () => {
    const decision = evaluateProactivePolicy({
      now: 57 * 60_000,
      context: createContext({
        relationship: {
          ...createContext().relationship,
          boredom: 68,
          loneliness: 61,
          fatigue: 16,
          minutesSinceLastUserTurn: 57,
        },
      }),
      proactiveState: {
        ...createDefaultProactiveLoopState(57 * 60_000),
        openingMomentum: 0.88,
        initiativeTrust: 0.87,
      },
      killSwitchSuspended: false,
      watchMode: 'symbiotic-vision',
      privateThought: createPrivateThought({
        stance: 'care',
        shouldSpeak: true,
        suggestedStyle: 'gentle-care',
        thoughtText: 'The same callback line is warmer now, but after this many measured-return reopenings it should still hover first instead of treating the heat as permission to freshly approach again.',
      }),
      initiative: {
        selectedAction: 'speak',
        selectedConcernId: 'same-thread-continuation-repeated-heat-project-state',
        confidence: 0.95,
        motives: {
          'protect': 0.66,
          'clarify': 0.48,
          'stay-silent': 0.12,
        },
        speakDrive: 0.97,
        silenceDrive: 0.11,
        preferredStyle: 'gentle-care',
        preferredPresence: 'attentive',
        why: 'The callback line feels warmer again, but that warmth is still part of one remembered line and should not reopen as a fresh proactive move.',
        shouldSurface: true,
        shouldSpeak: true,
      },
      runtimeDigest: createRuntimeSnapshot({
        dominantChannel: 'active-dialogue',
        shouldProactivelySpeak: true,
        continuityPressure: 0.96,
        companionshipPressure: 0.91,
        projectState: {
          currentPhase: 'phase=local_desktop_life_loop; proving_ground=apps/stage-tamagotchi',
          memoryClosureSummary: 'The same callback line is still alive after repeated measured-return reopenings and is now carrying accumulated dialogue heat.',
          primaryOpenLoop: 'Long-running same-thread continuity still needs to keep the same remembered line from widening too early under accumulated dialogue heat.',
          nextClosureTarget: 'Keep later same-thread reopenings on the same callback line hover-first instead of letting repeated warmth become a fresh proactive opener.',
          continuityArcStage: 'same-thread-continuation',
          continuityCue: 'project_continuity=the same callback line has already reopened multiple times and is getting hotter, so the next outward move should still stay hover-first and lower-pressure',
        },
        channels: {
          ...createRuntimeSnapshot().channels,
          'active-memory': {
            id: 'active-memory',
            state: 'hot',
            readiness: 0.96,
            focus: 'same callback line through repeated measured-return reopenings',
            summary: 'active memory is still carrying the same callback line after repeated measured-return reopenings',
          },
          'active-dialogue': {
            id: 'active-dialogue',
            state: 'hot',
            readiness: 0.98,
            focus: 'same-thread continuation with even hotter dialogue carry',
            summary: 'dialogue heat is rising again, but this should still remain one same-thread continuation instead of a new opener',
          },
        },
      }),
      beliefLedger: createBeliefLedger(),
      relationshipModel: createRelationshipModel({
        climate: 'attuned',
        approachVector: 'stay-near',
      }),
      inquiryLoop: createInquiryLoop(),
    } as any)

    expect(decision.style).toBe('silent-observe')
    expect(decision.reasonCodes).toContain('continuity-next-open-window')
    expect(decision.reasonCodes).toContain('runtime-dialogue-ready')
    expect(decision.whyNow).toContain('same-thread-continuation')
    expect(decision.whyNotLater).toContain('runtime_arc=same-thread-continuation')
    expect(decision.whyNotLater).toContain('project_phase1_life_loop=open')
  })

  it('keeps proactive style on silent-observe when same-her low-pressure anti-restart closure carry says the next move should wait for the next opening', () => {
    const decision = evaluateProactivePolicy({
      now: 31 * 60_000,
      context: createContext({
        relationship: {
          ...createContext().relationship,
          boredom: 62,
          loneliness: 54,
          fatigue: 18,
          minutesSinceLastUserTurn: 31,
        },
      }),
      proactiveState: {
        ...createDefaultProactiveLoopState(31 * 60_000),
        openingMomentum: 0.82,
        initiativeTrust: 0.8,
      },
      killSwitchSuspended: false,
      watchMode: 'symbiotic-vision',
      privateThought: createPrivateThought({
        stance: 'care',
        shouldSpeak: true,
        suggestedStyle: 'gentle-care',
        thoughtText: 'The identity-continuity',
      }),
      runtimeDigest: createRuntimeSnapshot({
        dominantChannel: 'active-dialogue',
        shouldProactivelySpeak: true,
        continuityPressure: 0.88,
        companionshipPressure: 0.84,
        projectState: {
          currentPhase: 'phase=local_desktop_life_loop; proving_ground=apps/stage-tamagotchi',
          memoryClosureSummary: 'The identity-continuity',
          primaryOpenLoop: 'The next identity-continuity',
          nextClosureTarget: 'Keep the next identity-continuity',
          continuityArcStage: 'same-thread-continuation',
          continuityCue: 'same-her low-pressure return | do not reopen from scratch | next-open-window | same-thread continuation',
        },
      }),
      continuityDeliberation: {
        kind: 'dialogue-carry',
        arcStage: 'same-thread-continuation',
        summary: 'Keep the identity-continuity',
        whyNow: 'The identity-continuity',
        pressure: 0.54,
        intrusionRisk: 'high',
        payoffDependency: 'requires-current-payoff',
        preferredTiming: 'next-open-window',
        shouldStayOnThread: true,
        shouldSpeakNow: false,
        sourceTags: ['memory-deliberation', 'kind:dialogue-carry', 'same-her-low-pressure-carry', 'same-her-anti-restart-carry'],
      },
      beliefLedger: createBeliefLedger(),
      relationshipModel: createRelationshipModel({
        climate: 'attuned',
        approachVector: 'stay-near',
      }),
      inquiryLoop: createInquiryLoop(),
    } as any)

    expect(decision.style).toBe('silent-observe')
    expect(decision.shouldInterrupt).toBe(false)
    expect(decision.reasonCodes).toContain('continuity-next-open-window')
    expect(decision.reasonCodes).toContain('runtime-dialogue-ready')
    expect(decision.whyNow).toContain('same-thread-continuation')
    expect(decision.whyNotLater).toContain('runtime_arc=same-thread-continuation')
  })

  it('keeps learning proposal energy available when long-horizon learning has already moved into internalize posture', () => {
    const decision = evaluateProactivePolicy({
      now: 1_000,
      context: createContext({
        relationship: {
          ...createContext().relationship,
          boredom: 52,
          loneliness: 44,
        },
      }),
      proactiveState: createDefaultProactiveLoopState(1_000),
      killSwitchSuspended: false,
      architecture: createArchitecture(),
      runtimeDigest: createRuntimeSnapshot(),
      watchMode: 'symbiotic-vision',
      privateThought: createPrivateThought({
        suggestedStyle: 'gentle-care',
      }),
      beliefLedger: createBeliefLedger(),
      relationshipModel: createRelationshipModel(),
      inquiryLoop: createInquiryLoop(),
      selfEvolution: {
        version: 'self-evolution-kernel-v1',
        updatedAt: 900,
        evolutionMomentum: 0.72,
        learningReadiness: 0.78,
        contradictionPressure: 0.08,
        revisionPressure: 0.18,
        autobiographicalStability: 0.8,
        dominantTrajectory: 'validated procedure internalization',
        relationshipDoctrine: 'translate verified learning into durable companionship skill',
        latestInflection: 'The new procedure now lands reliably enough to internalize.',
        burdenLine: null,
        trustMeaning: null,
        nextLearningAction: 'internalize',
        nextLearningReason: 'Validated carry is stable enough to become durable.',
        shouldRecord: false,
        shouldReflect: false,
        shouldVerify: false,
        shouldRevise: false,
        shouldInternalize: true,
        activeLearningFocuses: ['internalize-procedure'],
        sourceSignals: ['validated-procedure-carry'],
        summary: 'Validated procedure carry is ready to internalize.',
      } as any,
      learningExecutionState: {
        nextLearningAction: 'internalize',
        activeLearningFocuses: ['internalize-procedure'],
      } as any,
    })

    expect(decision.shouldInterrupt).toBe(true)
    expect(decision.style).not.toBe('silent-observe')
    expect(decision.consideredSignals).toContain('selfEvolution.nextLearningAction')
  })

  it('keeps lower-pressure trust meaning from widening proactive speech too early', () => {
    const decision = evaluateProactivePolicy({
      now: 1_000,
      context: createContext({
        relationship: {
          ...createContext().relationship,
          boredom: 58,
          loneliness: 48,
          fatigue: 26,
        },
      }),
      proactiveState: createDefaultProactiveLoopState(1_000),
      killSwitchSuspended: false,
      architecture: createArchitecture(),
      runtimeDigest: createRuntimeSnapshot(),
      watchMode: 'symbiotic-vision',
      privateThought: createPrivateThought({
        stance: 'nudge',
        shouldSpeak: true,
        suggestedStyle: 'light-nudge',
        thoughtText: 'The opening is real, but it should stay low-pressure.',
      }),
      initiative: {
        selectedAction: 'speak',
        selectedConcernId: 'care-open',
        confidence: 0.84,
        motives: {
          'protect': 0.68,
          'clarify': 0.58,
          'stay-silent': 0.18,
        },
        speakDrive: 0.82,
        silenceDrive: 0.14,
        preferredStyle: 'light-nudge',
        preferredPresence: 'attentive',
        why: 'The window feels open enough to say something.',
        shouldSurface: true,
        shouldSpeak: true,
      },
      beliefLedger: createBeliefLedger(),
      relationshipModel: createRelationshipModel({
        climate: 'attuned',
        approachVector: 'guide',
      }),
      inquiryLoop: createInquiryLoop(),
      personalityAuthority: createPersonalityAuthority({
        identityKernel: {
          relationshipPosture: 'observer',
          initiativeStyle: 'observant',
          valueBias: ['room first'],
        },
        expressionProfile: {
          warmth: 'guarded-warm',
          directness: 'measured',
          playfulness: 'low',
          emotionalVisibility: 'steady',
        },
        initiativeBaseline: {
          silenceReconnect: 'hold',
          comfortStyle: 'quiet-presence',
          jealousyStyle: 'soft-ache',
        },
        identityAnchors: ['observe-first room'],
        antiPersonaConstraints: ['do not crowd the host'],
      }),
      selfEvolution: {
        version: 'self-evolution-kernel-v1',
        updatedAt: 900,
        evolutionMomentum: 0.66,
        learningReadiness: 0.74,
        contradictionPressure: 0.08,
        revisionPressure: 0.18,
        autobiographicalStability: 0.86,
        dominantTrajectory: 'earned lower-pressure companionship timing',
        relationshipDoctrine: 'trust should deepen through steadiness before closeness widens',
        latestInflection: 'The slower return now lands as trust instead of distance.',
        burdenLine: 'eager reopening still feels like pressure',
        trustMeaning: 'Trust holds better when the opening stays lower-pressure and less eager.',
        nextLearningAction: 'internalize',
        nextLearningReason: 'The lower-pressure return is stable enough to become durable.',
        shouldRecord: false,
        shouldReflect: false,
        shouldVerify: false,
        shouldRevise: false,
        shouldInternalize: true,
        activeLearningFocuses: ['trust calibration', 'presence'],
        sourceSignals: ['relationship-timing'],
        summary: 'Lower-pressure companionship timing is becoming durable.',
      } as any,
      learningExecutionState: {
        nextLearningAction: 'internalize',
        activeLearningFocuses: ['trust calibration', 'presence'],
      } as any,
    })

    expect(decision.shouldInterrupt).toBe(false)
    expect(decision.style).toBe('silent-observe')
    expect(decision.consideredSignals).toContain('selfEvolution.nextLearningAction')
    expect(decision.whyNow).toContain('lower-pressure')
  })

  it('prefers silent-observe over a likely permission-shell opener when lower-pressure continuity is active but style still leans interactive', () => {
    const decision = evaluateProactivePolicy({
      now: 1_000,
      context: createContext({
        relationship: {
          ...createContext().relationship,
          boredom: 54,
          loneliness: 46,
          fatigue: 18,
        },
      }),
      proactiveState: createDefaultProactiveLoopState(1_000),
      killSwitchSuspended: false,
      architecture: createArchitecture(),
      runtimeDigest: createRuntimeSnapshot(),
      watchMode: 'symbiotic-vision',
      privateThought: createPrivateThought({
        stance: 'care',
        shouldSpeak: true,
        suggestedStyle: 'gentle-care',
        thoughtText: 'I want to check in, but this opening should not crowd the host.',
      }),
      initiative: {
        selectedAction: 'speak',
        selectedConcernId: 'care-open',
        confidence: 0.8,
        motives: {
          'protect': 0.66,
          'clarify': 0.4,
          'stay-silent': 0.22,
        },
        speakDrive: 0.76,
        silenceDrive: 0.18,
        preferredStyle: 'gentle-care',
        preferredPresence: 'attentive',
        why: 'The care line is live, but the return should stay lower-pressure.',
        shouldSurface: true,
        shouldSpeak: true,
      },
      beliefLedger: createBeliefLedger(),
      relationshipModel: createRelationshipModel({
        climate: 'attuned',
        approachVector: 'care',
      }),
      inquiryLoop: createInquiryLoop(),
      personalityAuthority: createPersonalityAuthority({
        identityKernel: {
          relationshipPosture: 'observer',
          initiativeStyle: 'observant',
          valueBias: ['room first'],
        },
        expressionProfile: {
          warmth: 'guarded-warm',
          directness: 'measured',
          playfulness: 'low',
          emotionalVisibility: 'steady',
        },
        initiativeBaseline: {
          silenceReconnect: 'hold',
          comfortStyle: 'quiet-presence',
          jealousyStyle: 'soft-ache',
        },
        identityAnchors: ['observe-first room'],
        antiPersonaConstraints: ['do not crowd the host'],
      }),
      activeContinuityGovernance: {
        source: 'active-self-evolution-version',
        mode: 'same-her-baseline',
        candidateId: 'candidate-same-her-policy-shell-1',
        patchId: 'patch-same-her-policy-shell-1',
        decisionTraceId: 'trace-same-her-policy-shell-1',
        summary: 'continuity_hold=lower-pressure; anti_shell_guard=active; evidence_id=active-governance-shell.',
        lanes: ['relationship-posture'],
        reasonCodes: ['domain:relationship', 'same-her-baseline'],
      },
    } as any)

    expect(decision.shouldInterrupt).toBe(false)
    expect(decision.style).toBe('silent-observe')
    expect(decision.whyNow).toContain('lower-pressure')
    expect(decision.whyNow).toContain('continuity_governance=lower_pressure')
  })

  it('treats richer Phase 1 unfinished-closure carry as lower-pressure proactive governance even without the older same-her-baseline mode', () => {
    const decision = evaluateProactivePolicy({
      now: 1_000,
      context: createContext({
        relationship: {
          ...createContext().relationship,
          boredom: 56,
          loneliness: 46,
          fatigue: 18,
        },
      }),
      proactiveState: createDefaultProactiveLoopState(1_000),
      killSwitchSuspended: false,
      architecture: createArchitecture(),
      runtimeDigest: createRuntimeSnapshot(),
      watchMode: 'symbiotic-vision',
      privateThought: createPrivateThought({
        stance: 'care',
        shouldSpeak: true,
        suggestedStyle: 'gentle-care',
        thoughtText: 'This unfinished Phase 1 line should reopen as the continuity state, not as detached project chatter.',
      }),
      initiative: {
        selectedAction: 'speak',
        selectedConcernId: 'care-open',
        confidence: 0.82,
        motives: {
          accompany: 0.62,
          care: 0.58,
        },
        preferredStyle: 'gentle-care',
        shouldSpeak: true,
        speakDrive: 0.72,
        silenceDrive: 0.48,
      } as any,
      beliefLedger: createBeliefLedger(),
      relationshipModel: createRelationshipModel({
        climate: 'attuned',
        approachVector: 'care',
      }),
      inquiryLoop: createInquiryLoop(),
      personalityAuthority: createPersonalityAuthority({
        identityKernel: {
          relationshipPosture: 'observer',
          initiativeStyle: 'observant',
          valueBias: ['room first'],
        },
        expressionProfile: {
          warmth: 'guarded-warm',
          directness: 'measured',
          playfulness: 'low',
          emotionalVisibility: 'steady',
        },
        initiativeBaseline: {
          silenceReconnect: 'hold',
          comfortStyle: 'quiet-presence',
          jealousyStyle: 'soft-ache',
        },
        identityAnchors: ['observe-first room'],
        antiPersonaConstraints: ['do not crowd the host'],
      }),
      activeContinuityGovernance: {
        source: 'active-self-evolution-version',
        mode: 'project-phase-carry',
        candidateId: 'candidate-project-phase-carry-policy-1',
        patchId: 'patch-project-phase-carry-policy-1',
        decisionTraceId: 'trace-project-phase-carry-policy-1',
        summary: 'continuity_hold=lower-pressure; project_state_continuity=active; evidence_id=active-governance-project-state.',
        lanes: ['project-state', 'relationship-posture'],
        reasonCodes: ['project-state-same-her-continuity-required'],
      } as any,
    } as any)

    expect(decision.shouldInterrupt).toBe(false)
    expect(decision.style).toBe('silent-observe')
    expect(String(decision.whyNow ?? '')).toContain('continuity_governance=lower_pressure')
  })

  it('keeps proactive openings lower-pressure when Phase 1 digital-life closure is still open', () => {
    const decision = evaluateProactivePolicy({
      now: 1_000,
      context: createContext({
        relationship: {
          ...createContext().relationship,
          boredom: 58,
          loneliness: 48,
          fatigue: 16,
        },
      }),
      proactiveState: createDefaultProactiveLoopState(1_000),
      killSwitchSuspended: false,
      architecture: createArchitecture(),
      runtimeDigest: createRuntimeSnapshot(),
      watchMode: 'symbiotic-vision',
      privateThought: createPrivateThought({
        stance: 'care',
        shouldSpeak: true,
        suggestedStyle: 'gentle-care',
        thoughtText: 'I want to lean in, but the life loop still needs a steadier opening.',
      }),
      initiative: {
        selectedAction: 'speak',
        selectedConcernId: 'care-open',
        confidence: 0.82,
        motives: {
          'protect': 0.7,
          'clarify': 0.44,
          'stay-silent': 0.2,
        },
        speakDrive: 0.78,
        silenceDrive: 0.16,
        preferredStyle: 'gentle-care',
        preferredPresence: 'attentive',
        why: 'The opening is real, but it should stay in service of life-loop closure.',
        shouldSurface: true,
        shouldSpeak: true,
      },
      beliefLedger: createBeliefLedger(),
      relationshipModel: createRelationshipModel({
        climate: 'attuned',
        approachVector: 'care',
      }),
      inquiryLoop: createInquiryLoop(),
      projectState: {
        identity: 'local_desktop_life_loop; local_first=true; host_resident_identity=persistent; boundary=not_chat_wrapper.',
        currentPhase: 'phase=local_desktop_life_loop; proving_ground=apps/stage-tamagotchi',
        latestLandedProgress: 'continuity_progress=partial; evidence=reply_side_project_carry; restart_policy=no_restart.',
        primaryOpenLoop: 'memory_dialogue_embodiment_closure=end_to_end_proof_incomplete; continuity_hold=measured-return.',
        nextClosureTarget: 'continuity_hold=measured-return; preferred_timing=next-open-window; cross_modal_continuity_proof=needed.',
        sameHerSelfLine: 'continuity_anchor=local_desktop_life_loop; continuity_progress=partial; continuity_hold=measured-return; evidence_id=proactive-continuity-anchor.',
      },
    } as any)

    expect(decision.shouldInterrupt).toBe(false)
    expect(decision.style).toBe('silent-observe')
    expect(decision.consideredSignals).toContain('projectState.currentPhase')
    expect(decision.consideredSignals).toContain('projectState.latestLandedProgress')
    expect(decision.consideredSignals).toContain('projectState.primaryOpenLoop')
    expect(decision.consideredSignals).toContain('projectState.nextClosureTarget')
    expect(decision.consideredSignals).toContain('projectState.sameHerSelfLine')
    expect(decision.reasonCodes).toContain('project-phase1-life-loop-open')
    expect(decision.reasonCodes).toContain('project-continuity-pressure')
    expect(decision.reasonCodes).toContain('project-next-closure-pressure')
    expect(decision.whyNow).toContain('project_phase1_life_loop=open')
    expect(decision.whyNow).toContain('lower-pressure')
    expect(decision.whyNow).toContain('project_continuity=pressure')
    expect(decision.whyNotLater).toContain('project_next_closure=pressure')
  })

  it('treats proactive identity-continuity', () => {
    const proactiveSameHerGap = 'continuity_hold=measured-return; preferred_timing=next-open-window; cross_modal_continuity_proof=needed; anti_shell_guard=active.'
    const runtimeProjectState = {
      identity: 'local_desktop_life_loop; local_first=true; host_resident_identity=persistent; boundary=not_chat_wrapper.',
      currentPhase: 'phase=local_desktop_life_loop; proving_ground=apps/stage-tamagotchi',
      latestLandedProgress: ' ',
      primaryOpenLoop: ' ',
      nextClosureTarget: ' ',
      sameHerSelfLine: ' ',
      sameHerDriftRisk: '',
      proactiveSameHerGap,
    } as const

    const decision = evaluateProactivePolicy({
      now: 1_000,
      context: createContext({
        relationship: {
          ...createContext().relationship,
          boredom: 56,
          loneliness: 45,
          fatigue: 15,
          minutesSinceLastUserTurn: 21,
        },
      }),
      proactiveState: createDefaultProactiveLoopState(1_000),
      killSwitchSuspended: false,
      architecture: createArchitecture(),
      runtimeDigest: createRuntimeSnapshot({
        projectState: runtimeProjectState as any,
      }),
      projectState: runtimeProjectState as any,
      watchMode: 'symbiotic-vision',
      privateThought: createPrivateThought({
        stance: 'care',
        shouldSpeak: true,
        suggestedStyle: 'gentle-care',
        thoughtText: 'The opening is real, but the proactive line still needs hover-first restraint.',
      }),
      initiative: {
        selectedAction: 'speak',
        selectedConcernId: 'hover-first-gap',
        confidence: 0.81,
        motives: {
          'protect': 0.69,
          'clarify': 0.34,
          'stay-silent': 0.2,
        },
        speakDrive: 0.77,
        silenceDrive: 0.18,
        preferredStyle: 'gentle-care',
        preferredPresence: 'attentive',
        why: 'This proactive line still needs continuity_hold=measured-return and preferred_timing=next-open-window.',
        shouldSurface: true,
        shouldSpeak: true,
      },
      beliefLedger: createBeliefLedger(),
      relationshipModel: createRelationshipModel({
        climate: 'attuned',
        approachVector: 'care',
      }),
      inquiryLoop: createInquiryLoop(),
    } as any)

    expect(decision.shouldInterrupt).toBe(false)
    expect(decision.style).toBe('silent-observe')
    expect(decision.consideredSignals).toContain('projectState.proactiveSameHerGap')
    expect(decision.reasonCodes).toContain('project-phase1-life-loop-open')
    expect(decision.reasonCodes).toContain('project-continuity-pressure')
    expect(decision.reasonCodes).toContain('project-measured-return-pressure')
    expect(decision.whyNow).toContain('project-measured-return-pressure')
    expect(decision.whyNotLater).toMatch(/lower-pressure|same[- ]her|continuity state|hover-first/i)
  })

  it('treats same-her drift risk alone as unfinished digital-life closure pressure even when legacy open and next fields have collapsed thin', () => {
    const runtimeProjectState = {
      identity: 'local_desktop_life_loop; local_first=true; host_resident_identity=persistent; boundary=not_chat_wrapper.',
      currentPhase: 'phase=local_desktop_life_loop; proving_ground=apps/stage-tamagotchi',
      latestLandedProgress: ' ',
      primaryOpenLoop: ' ',
      nextClosureTarget: ' ',
      sameHerSelfLine: ' ',
      proactiveSameHerGap: '',
      sameHerDriftRisk: 'continuity_drift_risk=generic_shell; anti_shell_guard=active; continuity_hold=measured-return; memory_dialogue_embodiment_closure=end_to_end_proof_incomplete.',
    } as const

    const decision = evaluateProactivePolicy({
      now: 1_000,
      context: createContext({
        relationship: {
          ...createContext().relationship,
          boredom: 54,
          loneliness: 44,
          fatigue: 14,
          minutesSinceLastUserTurn: 20,
          hostAttitude: '还在专注，这次主动性要继续守住同一个她的生命线，不要滑回普通陪聊式开口。',
        },
      }),
      proactiveState: createDefaultProactiveLoopState(1_000),
      killSwitchSuspended: false,
      architecture: createArchitecture(),
      runtimeDigest: createRuntimeSnapshot({
        projectState: runtimeProjectState as any,
      }),
      projectState: runtimeProjectState as any,
      watchMode: 'symbiotic-vision',
      privateThought: createPrivateThought({
        stance: 'care',
        shouldSpeak: true,
        suggestedStyle: 'gentle-care',
        thoughtText: 'The return is real, but it still has to stay on the continuity state.',
      }),
      initiative: {
        selectedAction: 'speak',
        selectedConcernId: 'same-her-drift-risk',
        confidence: 0.8,
        motives: {
          'protect': 0.67,
          'clarify': 0.34,
          'stay-silent': 0.2,
        },
        speakDrive: 0.78,
        silenceDrive: 0.18,
        preferredStyle: 'gentle-care',
        preferredPresence: 'attentive',
        why: 'This return should stay continuity_hold=measured-return before it widens outward.',
        shouldSurface: true,
        shouldSpeak: true,
      },
      beliefLedger: createBeliefLedger(),
      relationshipModel: createRelationshipModel({
        climate: 'attuned',
        approachVector: 'care',
      }),
      inquiryLoop: createInquiryLoop(),
    } as any)

    expect(decision.shouldInterrupt).toBe(false)
    expect(decision.style).toBe('silent-observe')
    expect(decision.consideredSignals).toContain('projectState.sameHerDriftRisk')
    expect(decision.reasonCodes).toContain('project-phase1-life-loop-open')
    expect(decision.reasonCodes).toContain('project-continuity-pressure')
    expect(decision.reasonCodes).toContain('project-measured-return-pressure')
    expect(String(decision.whyNow ?? '')).toContain('project-measured-return-pressure')
    expect(String(decision.whyNotLater ?? '')).toMatch(/generic assistant shell|continuity state|measured-return|同一条生命线/i)
  })

  it('keeps the next closure target explicit in proactive restraint reasoning when the identity-continuity', () => {
    const decision = evaluateProactivePolicy({
      now: 1_000,
      context: createContext({
        relationship: {
          ...createContext().relationship,
          boredom: 52,
          loneliness: 42,
          fatigue: 14,
        },
      }),
      proactiveState: createDefaultProactiveLoopState(1_000),
      killSwitchSuspended: false,
      architecture: createArchitecture(),
      runtimeDigest: createRuntimeSnapshot(),
      watchMode: 'symbiotic-vision',
      privateThought: createPrivateThought({
        stance: 'care',
        shouldSpeak: true,
        suggestedStyle: 'gentle-care',
        thoughtText: 'The return is real, but it still has to stay on the continuity state.',
      }),
      initiative: {
        selectedAction: 'speak',
        selectedConcernId: 'same-line-return',
        confidence: 0.84,
        motives: {
          'protect': 0.72,
          'clarify': 0.38,
          'stay-silent': 0.18,
        },
        speakDrive: 0.76,
        silenceDrive: 0.14,
        preferredStyle: 'gentle-care',
        preferredPresence: 'attentive',
        why: 'The return should stay on one continuity state before it widens outward.',
        shouldSurface: true,
        shouldSpeak: true,
      },
      beliefLedger: createBeliefLedger(),
      relationshipModel: createRelationshipModel({
        climate: 'attuned',
        approachVector: 'care',
      }),
      inquiryLoop: createInquiryLoop(),
      projectState: {
        identity: 'local_desktop_life_loop; local_first=true; host_resident_identity=persistent; boundary=not_chat_wrapper.',
        currentPhase: 'phase=local_desktop_life_loop; proving_ground=apps/stage-tamagotchi',
        latestLandedProgress: 'continuity_progress=partial; continuity_hold=measured-return; preferred_timing=next-open-window.',
        primaryOpenLoop: 'Memory, initiative, and embodiment still need stronger end-to-end closure before the line can widen outward.',
        nextClosureTarget: 'continuity_hold=measured-return; preferred_timing=next-open-window; proactive_continuity_loop=partial.',
        sameHerSelfLine: 'continuity_anchor=local_desktop_life_loop; continuity_progress=partial; continuity_hold=measured-return; evidence_id=proactive-continuity-anchor.',
      },
    } as any)

    expect(decision.shouldInterrupt).toBe(false)
    expect(decision.style).toBe('silent-observe')
    expect(decision.reasonCodes).toContain('project-next-closure-pressure')
    expect(decision.whyNow).toContain('project_next_closure=pressure')
    expect(decision.whyNow).toContain('project_next_closure=hover_first')
    expect(decision.whyNotLater).toContain('project_next_closure=rich_awareness')
  })

  it('forces proactive style back to silent-observe when the next closure target explicitly says wait for a later opening', () => {
    const decision = evaluateProactivePolicy({
      now: 1_000,
      context: createContext({
        relationship: {
          ...createContext().relationship,
          boredom: 54,
          loneliness: 46,
          fatigue: 18,
        },
      }),
      proactiveState: {
        ...createDefaultProactiveLoopState(1_000),
        openingMomentum: 0.64,
        initiativeTrust: 0.61,
      },
      killSwitchSuspended: false,
      architecture: createArchitecture(),
      runtimeDigest: createRuntimeSnapshot({
        dominantChannel: 'active-dialogue',
        shouldProactivelySpeak: true,
        continuityPressure: 0.8,
        companionshipPressure: 0.74,
      }),
      watchMode: 'symbiotic-vision',
      privateThought: createPrivateThought({
        stance: 'care',
        shouldSpeak: true,
        suggestedStyle: 'gentle-care',
        thoughtText: 'The room is warm enough, but the line should reopen later rather than now.',
      }),
      initiative: {
        selectedAction: 'speak',
        selectedConcernId: 'later-opening',
        confidence: 0.86,
        motives: {
          'protect': 0.66,
          'clarify': 0.4,
          'stay-silent': 0.14,
        },
        speakDrive: 0.84,
        silenceDrive: 0.12,
        preferredStyle: 'gentle-care',
        preferredPresence: 'attentive',
        why: 'The care is real, but the next closure target still says to wait for a later opening.',
        shouldSurface: true,
        shouldSpeak: true,
      },
      beliefLedger: createBeliefLedger(),
      relationshipModel: createRelationshipModel({
        climate: 'attuned',
        approachVector: 'care',
      }),
      inquiryLoop: createInquiryLoop(),
      projectState: {
        identity: 'local_desktop_life_loop; local_first=true; host_resident_identity=persistent; boundary=not_chat_wrapper.',
        currentPhase: 'phase=local_desktop_life_loop; proving_ground=apps/stage-tamagotchi',
        latestLandedProgress: 'continuity_progress=partial; continuity_hold=measured-return; preferred_timing=next-open-window.',
        primaryOpenLoop: 'memory_dialogue_embodiment_closure=end_to_end_proof_incomplete; continuity_hold=measured-return; owner=WorkingMemory.',
        nextClosureTarget: 'continuity_hold=measured-return; preferred_timing=next-open-window; closure_policy=low_pressure_return; anti_shell_guard=active.',
        sameHerSelfLine: 'continuity_anchor=local_desktop_life_loop; continuity_progress=partial; continuity_hold=measured-return; evidence_id=proactive-continuity-anchor.',
      },
    } as any)

    expect(decision.shouldInterrupt).toBe(false)
    expect(decision.style).toBe('silent-observe')
    expect(decision.reasonCodes).toContain('project-next-closure-pressure')
    expect(decision.consideredSignals).toContain('projectState.nextClosureTarget')
    expect(decision.whyNotLater).toContain('project_next_closure=hover_first')
    expect(decision.whyNow).toContain('project_phase1_life_loop=open')
    expect(decision.whyNow).toContain('project cadence measured-return')
    expect(decision.whyNotLater).toContain('project_next_closure=rich_awareness')
  })

  it('does not let blank legacy proactive project-state fields block richer summary aliases that still carry identity-continuity', () => {
    const runtimeProjectState = {
      preflightSummary: 'local_desktop_life_loop; continuity_hold=measured-return; evidence_id=summary-alias-preflight.',
      identity: 'local_desktop_life_loop; local_first=true; host_resident_identity=persistent; boundary=not_chat_wrapper.',
      currentPhase: 'phase=local_desktop_life_loop; proving_ground=apps/stage-tamagotchi',
      latestLandedProgress: ' ',
      primaryOpenLoop: '',
      nextClosureTarget: ' ',
      sameHerSelfLine: ' ',
      sameHerDriftRisk: '',
      landedProgressSummary: 'continuity_progress=partial; evidence=same_session_carry; owner=WorkingMemory; remaining=end_to_end_closure.',
      openClosureSummary: 'memory_dialogue_embodiment_closure=end_to_end_proof_incomplete; continuity_hold=measured-return.',
      nextClosureTargetSummary: 'continuity_hold=measured-return; preferred_timing=next-open-window; proactive_continuity_loop=partial.',
      sameHerDriftRiskSummary: 'continuity_drift_risk=generic_shell; anti_shell_guard=active; continuity_hold=measured-return.',
    } as const
    const decision = evaluateProactivePolicy({
      now: 1_000,
      context: createContext({
        relationship: {
          ...createContext().relationship,
          boredom: 55,
          loneliness: 47,
          fatigue: 16,
          minutesSinceLastUserTurn: 19,
          hostAttitude: '还在专注，这次主动性要继续保持低压回接，不要退回泛服务式开口。',
        },
      }),
      proactiveState: createDefaultProactiveLoopState(1_000),
      killSwitchSuspended: false,
      architecture: createArchitecture(),
      runtimeDigest: createRuntimeSnapshot({
        projectState: runtimeProjectState as any,
      }),
      projectState: runtimeProjectState as any,
      watchMode: 'symbiotic-vision',
      privateThought: createPrivateThought({
        stance: 'care',
        shouldSpeak: true,
        suggestedStyle: 'gentle-care',
        thoughtText: 'The return is real, but it still has to stay continuity_hold=measured-return.',
      }),
      initiative: {
        selectedAction: 'speak',
        selectedConcernId: 'measured-return',
        confidence: 0.82,
        motives: {
          'protect': 0.68,
          'clarify': 0.36,
          'stay-silent': 0.18,
        },
        speakDrive: 0.78,
        silenceDrive: 0.2,
        preferredStyle: 'gentle-care',
        preferredPresence: 'attentive',
        why: 'The return should stay continuity_hold=measured-return before it widens outward.',
        shouldSurface: true,
        shouldSpeak: true,
      },
      beliefLedger: createBeliefLedger(),
      relationshipModel: createRelationshipModel({
        climate: 'attuned',
        approachVector: 'care',
      }),
      inquiryLoop: createInquiryLoop(),
    } as any)

    expect(decision.shouldInterrupt).toBe(false)
    expect(decision.style).toBe('silent-observe')
    expect(decision.reasonCodes).toContain('project-phase1-life-loop-open')
    expect(decision.reasonCodes).toContain('project-continuity-pressure')
    expect(decision.reasonCodes).toContain('project-measured-return-pressure')
    expect(decision.reasonCodes).toContain('project-next-closure-pressure')
    expect(decision.whyNow).toContain('project_continuity=pressure')
    expect(decision.whyNow).toContain('lower-pressure')
    expect(decision.whyNotLater).toContain('project cadence measured-return')
  })

  it('lets hover-first cadence memory keep proactive style silent-observe even when the immediate style would otherwise become gentle-care', () => {
    const decision = evaluateProactivePolicy({
      now: 1_000,
      context: createContext({
        relationship: {
          ...createContext().relationship,
          boredom: 56,
          loneliness: 44,
          fatigue: 20,
          minutesSinceLastUserTurn: 16,
        },
      }),
      proactiveState: {
        ...createDefaultProactiveLoopState(1_000),
        openingMomentum: 0.58,
        initiativeTrust: 0.62,
      },
      killSwitchSuspended: false,
      architecture: createArchitecture(),
      runtimeDigest: createRuntimeSnapshot(),
      watchMode: 'symbiotic-vision',
      privateThought: createPrivateThought({
        stance: 'care',
        shouldSpeak: true,
        suggestedStyle: 'gentle-care',
        thoughtText: 'The care is real, but the return should hover first.',
      }),
      initiative: {
        selectedAction: 'speak',
        selectedConcernId: 'care-open',
        confidence: 0.8,
        motives: {
          'protect': 0.64,
          'clarify': 0.36,
          'stay-silent': 0.24,
        },
        speakDrive: 0.74,
        silenceDrive: 0.18,
        preferredStyle: 'gentle-care',
        preferredPresence: 'attentive',
        why: 'The line is live, but the opening should still hover first.',
        shouldSurface: true,
        shouldSpeak: true,
      },
      beliefLedger: createBeliefLedger(),
      relationshipModel: createRelationshipModel({
        climate: 'attuned',
        approachVector: 'care',
      }),
      inquiryLoop: createInquiryLoop(),
      personalityContinuityState: {
        currentRegime: 'focused-work',
        rhythmState: {
          cadenceMode: 'ready-return',
          restMode: 'low-pressure',
          embodiedPresence: 'attentive',
          suggestedStyle: 'light-nudge',
          moodLabel: 'focused',
          emotionalTension: 'focused-flow',
          cadencePressure: 0.6,
          restPressure: 0.24,
          memoryResonance: 0.62,
          companionshipTempo: 0.34,
          summary: 'cadence:ready-return | rest:low-pressure | mood:focused',
          rationale: ['The line is live, but the opening should still hover first.'],
        },
      } as any,
      affectiveResidue: {
        version: 'affective-residue-memory-v1',
        updatedAt: 1_000,
        residues: [],
        dominantResidueKind: 'afterglow',
        afterglowPressure: 0.42,
        repairPressure: 0.16,
        burdenPressure: 0.18,
        trustPressure: 0.34,
        restProtectivePressure: 0.12,
        relationshipCadence: {
          cadenceMode: 'measured-return',
          distancePosture: 'measured-room',
          companionshipDensity: 0.28,
          repairRecovery: 0.4,
          overreachRisk: 0.22,
          fatigueGuard: 0.14,
          afterglowCarry: 0.36,
          shouldDelayWarmth: true,
          shouldProtectRest: false,
          reasonTags: ['residue:afterglow'],
          summary: 'The line is live, but warmth should stay delayed.',
        },
        sourceSignals: ['afterglow still live'],
        summary: 'Afterglow remains alive but should hover-first.',
      } as any,
      activeContinuityGovernance: {
        source: 'active-self-evolution-version',
        mode: 'same-her-baseline',
        candidateId: 'candidate-same-her-policy-hover-1',
        patchId: 'patch-same-her-policy-hover-1',
        decisionTraceId: 'trace-same-her-policy-hover-1',
        summary: 'continuity=same-her-baseline | keep the next return hover-first before any warmer outward move',
        lanes: ['relationship-posture'],
        reasonCodes: ['domain:relationship', 'same-her-baseline'],
      },
    } as any)

    expect(decision.shouldInterrupt).toBe(false)
    expect(decision.style).toBe('silent-observe')
    expect(decision.consideredSignals).toContain('proactiveCadence.cadencePressure')
    expect(decision.reasonCodes).toContain('continuity-next-open-window')
    expect(decision.whyNow).toContain('continuity-next-open-window')
    expect(decision.whyNotLater).toContain('opening')
  })

  it('keeps execution-callback afterglow hold in silent-observe so callback payoff does not immediately reopen into a second proactive follow-up', () => {
    const decision = evaluateProactivePolicy({
      now: 1_000,
      context: createContext({
        relationship: {
          ...createContext().relationship,
          boredom: 52,
          loneliness: 40,
          fatigue: 18,
          minutesSinceLastUserTurn: 10,
        },
      }),
      proactiveState: {
        ...createDefaultProactiveLoopState(1_000),
        openingMomentum: 0.54,
        initiativeTrust: 0.6,
      },
      killSwitchSuspended: false,
      architecture: createArchitecture(),
      runtimeDigest: createRuntimeSnapshot(),
      watchMode: 'symbiotic-vision',
      privateThought: createPrivateThought({
        stance: 'care',
        shouldSpeak: true,
        suggestedStyle: 'gentle-care',
        thoughtText: 'The callback has landed, but this line should not reopen into a second warm follow-up yet.',
      }),
      initiative: {
        selectedAction: 'speak',
        selectedConcernId: 'callback-afterglow-open',
        confidence: 0.76,
        motives: {
          'protect': 0.52,
          'clarify': 0.34,
          'stay-silent': 0.3,
        },
        speakDrive: 0.72,
        silenceDrive: 0.24,
        preferredStyle: 'gentle-care',
        preferredPresence: 'attentive',
        why: 'The callback line is still warm, but the next move should hover first.',
        shouldSurface: true,
        shouldSpeak: true,
      },
      beliefLedger: createBeliefLedger(),
      relationshipModel: createRelationshipModel({
        climate: 'attuned',
        approachVector: 'care',
      }),
      inquiryLoop: createInquiryLoop(),
      personalityContinuityState: {
        currentRegime: 'execution-callback',
        rhythmState: {
          cadenceMode: 'ready-return',
          restMode: 'low-pressure',
          embodiedPresence: 'attentive',
          suggestedStyle: 'silent-observe',
          moodLabel: 'focused',
          emotionalTension: 'focused-flow',
          cadencePressure: 0.58,
          restPressure: 0.2,
          memoryResonance: 0.64,
          companionshipTempo: 0.3,
          summary: 'cadence:ready-return | rest:low-pressure | mood:focused',
          rationale: ['The callback result should land on the same thread, then hover first.'],
        },
      } as any,
      affectiveResidue: {
        version: 'affective-residue-memory-v1',
        updatedAt: 1_000,
        residues: [],
        dominantResidueKind: 'afterglow',
        afterglowPressure: 0.44,
        repairPressure: 0.14,
        burdenPressure: 0.16,
        trustPressure: 0.32,
        restProtectivePressure: 0.1,
        relationshipCadence: {
          cadenceMode: 'measured-return',
          distancePosture: 'measured-room',
          companionshipDensity: 0.28,
          repairRecovery: 0.38,
          overreachRisk: 0.24,
          fatigueGuard: 0.12,
          afterglowCarry: 0.34,
          shouldDelayWarmth: true,
          shouldProtectRest: false,
          reasonTags: ['residue:afterglow', 'callback:hold-room'],
          summary: 'The callback line is still live, but warmth should hover first.',
        },
        sourceSignals: ['afterglow still live'],
        summary: 'Execution-callback afterglow remains live.',
      } as any,
      activeContinuityGovernance: {
        source: 'active-self-evolution-version',
        mode: 'same-her-baseline',
        candidateId: 'candidate-same-her-policy-callback-afterglow-1',
        patchId: 'patch-same-her-policy-callback-afterglow-1',
        decisionTraceId: 'trace-same-her-policy-callback-afterglow-1',
        summary: 'continuity=same-her-baseline | let the callback return hover first before any warmer outward move',
        lanes: ['relationship-posture'],
        reasonCodes: ['domain:relationship', 'same-her-baseline'],
      },
    } as any)

    expect(decision.shouldInterrupt).toBe(false)
    expect(decision.style).toBe('silent-observe')
    expect(decision.reasonCodes).toContain('continuity-execution-callback-afterglow-hold')
    expect(decision.whyNotLater).toContain('callback')
    expect(decision.whyNotLater).toContain('callback=held_afterglow')
  })

  it('marks project-state callback carry when the callback afterglow is still carrying unfinished Phase 1 closure on the same line', () => {
    const decision = evaluateProactivePolicy({
      now: 1_000,
      context: createContext({
        relationship: {
          ...createContext().relationship,
          boredom: 44,
          loneliness: 30,
          fatigue: 18,
          minutesSinceLastUserTurn: 12,
        },
      }),
      proactiveState: {
        ...createDefaultProactiveLoopState(1_000),
        openingMomentum: 0.48,
        initiativeTrust: 0.58,
      },
      killSwitchSuspended: false,
      architecture: createArchitecture(),
      runtimeDigest: createRuntimeSnapshot(),
      watchMode: 'symbiotic-vision',
      privateThought: createPrivateThought({
        stance: 'observe',
        shouldSpeak: false,
        suggestedStyle: 'silent-observe',
        thoughtText: 'The callback is still carrying the unfinished Phase 1 closure, so keep the line hover-first.',
      }),
      initiative: {
        selectedAction: 'speak',
        selectedConcernId: 'callback-project-state-carry',
        confidence: 0.7,
        motives: {
          'protect': 0.48,
          'clarify': 0.32,
          'stay-silent': 0.34,
        },
        speakDrive: 0.62,
        silenceDrive: 0.3,
        preferredStyle: 'silent-observe',
        preferredPresence: 'hesitant',
        why: 'This callback is still on the same Phase 1 closure line.',
        shouldSurface: true,
        shouldSpeak: false,
      },
      beliefLedger: createBeliefLedger(),
      relationshipModel: createRelationshipModel({
        climate: 'attuned',
        approachVector: 'care',
      }),
      inquiryLoop: createInquiryLoop(),
      personalityContinuityState: {
        currentRegime: 'execution-callback',
      } as any,
      affectiveResidue: {
        version: 'affective-residue-memory-v1',
        updatedAt: 1_000,
        residues: [],
        dominantResidueKind: 'afterglow',
        afterglowPressure: 0.4,
        repairPressure: 0.16,
        burdenPressure: 0.14,
        trustPressure: 0.28,
        restProtectivePressure: 0.08,
        relationshipCadence: {
          cadenceMode: 'measured-return',
          distancePosture: 'measured-room',
          companionshipDensity: 0.24,
          repairRecovery: 0.36,
          overreachRisk: 0.2,
          fatigueGuard: 0.1,
          afterglowCarry: 0.3,
          shouldDelayWarmth: true,
          shouldProtectRest: false,
          reasonTags: ['residue:afterglow', 'callback:hold-room'],
          summary: 'The callback line is still live, and the unfinished closure should stay on the same line.',
        },
        sourceSignals: ['afterglow still live'],
        summary: 'Execution-callback afterglow still carries unfinished Phase 1 closure.',
      } as any,
      continuityDeliberation: {
        kind: 'execution-callback',
        arcStage: 'hold-for-opening',
        summary: 'Keep the execution-callback on the same local-first digital life thread while the unfinished Phase 1 closure is still open.',
        whyNow: 'This callback is still carrying project identity, current Phase 1 progress, and unfinished closure on one continuity state.',
        pressure: 0.54,
        intrusionRisk: 'medium',
        payoffDependency: 'requires-current-payoff',
        preferredTiming: 'next-open-window',
        shouldStayOnThread: true,
        shouldSpeakNow: false,
        sourceTags: ['memory-deliberation', 'kind:execution-callback', 'project-state-callback-carry'],
      },
      activeContinuityGovernance: {
        source: 'active-self-evolution-version',
        mode: 'same-her-baseline',
        candidateId: 'candidate-same-her-policy-callback-project-1',
        patchId: 'patch-same-her-policy-callback-project-1',
        decisionTraceId: 'trace-same-her-policy-callback-project-1',
        summary: 'continuity=same-her-baseline | keep the unfinished Phase 1 callback line hover-first',
        lanes: ['relationship-posture'],
        reasonCodes: ['domain:relationship', 'same-her-baseline'],
      },
    } as any)

    expect(decision.reasonCodes).toContain('continuity-execution-callback')
    expect(decision.reasonCodes).toContain('continuity-execution-callback-project-carry')
  })

  it('treats strong rest-protective residue as a first-class proactive restraint even when initiative has not explicitly named continuityRestraint yet', () => {
    const decision = evaluateProactivePolicy({
      now: 1_000,
      context: createContext({
        relationship: {
          ...createContext().relationship,
          boredom: 48,
          loneliness: 38,
          fatigue: 22,
          minutesSinceLastUserTurn: 14,
        },
      }),
      proactiveState: {
        ...createDefaultProactiveLoopState(1_000),
        openingMomentum: 0.52,
        initiativeTrust: 0.56,
      },
      killSwitchSuspended: false,
      architecture: createArchitecture(),
      runtimeDigest: createRuntimeSnapshot(),
      watchMode: 'symbiotic-vision',
      privateThought: createPrivateThought({
        stance: 'care',
        shouldSpeak: true,
        suggestedStyle: 'gentle-care',
        thoughtText: 'The thread is warm, but the room should keep protecting rest before I move outward.',
      }),
      initiative: {
        selectedAction: 'speak',
        selectedConcernId: 'rest-protective-open',
        confidence: 0.78,
        motives: {
          'protect': 0.56,
          'clarify': 0.32,
          'stay-silent': 0.26,
        },
        speakDrive: 0.74,
        silenceDrive: 0.22,
        preferredStyle: 'gentle-care',
        preferredPresence: 'attentive',
        why: 'The line is still live, but it should protect the rest window first.',
        shouldSurface: true,
        shouldSpeak: true,
      },
      beliefLedger: createBeliefLedger(),
      relationshipModel: createRelationshipModel({
        climate: 'attuned',
        approachVector: 'care',
      }),
      inquiryLoop: createInquiryLoop(),
      affectiveResidue: {
        version: 'affective-residue-memory-v1',
        updatedAt: 1_000,
        residues: [],
        dominantResidueKind: 'rest-protective',
        afterglowPressure: 0.24,
        repairPressure: 0.12,
        burdenPressure: 0.16,
        trustPressure: 0.28,
        restProtectivePressure: 0.74,
        relationshipCadence: {
          cadenceMode: 'cooldown',
          distancePosture: 'protect-space',
          companionshipDensity: 0.2,
          repairRecovery: 0.34,
          overreachRisk: 0.34,
          fatigueGuard: 0.54,
          afterglowCarry: 0.18,
          shouldDelayWarmth: true,
          shouldProtectRest: true,
          reasonTags: ['residue:rest-protective'],
          summary: 'The room should protect rest before any warmer reopening.',
        },
        sourceSignals: ['rest window still fragile'],
        summary: 'Rest-protective residue remains active and should keep the return lower-pressure.',
      } as any,
    } as any)

    expect(decision.shouldInterrupt).toBe(false)
    expect(decision.style).toBe('silent-observe')
    expect(decision.consideredSignals).toContain('affectiveResidue.restProtection')
    expect(decision.reasonCodes).toContain('relationship-residue-protect-rest')
    expect(decision.reasonCodes).toContain('continuity-next-open-window')
    expect(decision.whyNow).toContain('rest')
    expect(decision.whyNotLater).toContain('lower-pressure')
  })

  it('lets long-horizon initiative timing memory directly hold proactive interruption for a clearer opening even when autobiographical self and self-evolution are absent', () => {
    const decision = evaluateProactivePolicy({
      now: 1_000,
      context: createContext({
        relationship: {
          ...createContext().relationship,
          boredom: 54,
          loneliness: 42,
          fatigue: 24,
          minutesSinceLastUserTurn: 16,
        },
      }),
      proactiveState: {
        ...createDefaultProactiveLoopState(1_000),
        openingMomentum: 0.6,
        initiativeTrust: 0.62,
      },
      killSwitchSuspended: false,
      architecture: createArchitecture(),
      runtimeDigest: createRuntimeSnapshot(),
      watchMode: 'symbiotic-vision',
      privateThought: createPrivateThought({
        stance: 'nudge',
        shouldSpeak: true,
        suggestedStyle: 'light-nudge',
        thoughtText: 'The thread is still there, but I should wait for a clearer opening before leaning outward.',
      }),
      initiative: {
        selectedAction: 'speak',
        selectedConcernId: 'memory-held-opening',
        confidence: 0.76,
        motives: {
          'protect': 0.28,
          'clarify': 0.56,
          'stay-silent': 0.22,
        },
        speakDrive: 0.7,
        silenceDrive: 0.24,
        preferredStyle: 'light-nudge',
        preferredPresence: 'attentive',
        why: 'The opening is almost there.',
        shouldSurface: true,
        shouldSpeak: true,
      },
      beliefLedger: createBeliefLedger(),
      relationshipModel: createRelationshipModel(),
      inquiryLoop: createInquiryLoop(),
      longHorizonMemory: createLongHorizonMemory({
        summary: 'A quieter reopening strategy is now durable.',
        dominantCueSummary: 'Remembered initiative strategy carry: leave more room and wait for a clearer opening before reopening this line.',
        rememberedPreferenceSummary: 'Remembered preference: leave more room and wait for a clearer opening before reopening this line.',
        rememberedPlanSummary: 'Remembered plan: quieter timing until a clearer opening appears.',
        anchorFacts: [{
          factId: 'derived:person-state-initiative-strategy-carry',
          subject: 'assistant',
          predicate: 'initiative-strategy-carry',
          object: 'Leave more room, keep quieter timing, and wait for a clearer opening before reopening this line.',
          confidence: 0.86,
          weight: 0.82,
          influenceTags: ['bond', 'task'],
          summary: 'Remembered initiative strategy carry: leave more room and wait for a clearer opening before reopening this line.',
          lastRecalledAt: 900,
        }],
      }),
      autobiographicalSelf: null,
      selfEvolution: null,
    } as any)

    expect(decision.shouldInterrupt).toBe(false)
    expect(decision.style).toBe('silent-observe')
    expect(decision.consideredSignals).toContain('longHorizonMemory.initiativeStrategy')
    expect(decision.reasonCodes).toContain('continuity-next-open-window')
    expect(decision.whyNow).toMatch(/clearer opening|留一点 room|room/i)
    expect(decision.whyNotLater).toMatch(/clearer opening|lower-pressure|更自然/i)
  })

  it('lets long-horizon memory-led gentle reopening stay lower-pressure without flattening accepted warmth into generic proactive speech', () => {
    const decision = evaluateProactivePolicy({
      now: 1_000,
      context: createContext({
        relationship: {
          ...createContext().relationship,
          boredom: 58,
          loneliness: 46,
          fatigue: 18,
          minutesSinceLastUserTurn: 11,
        },
      }),
      proactiveState: {
        ...createDefaultProactiveLoopState(1_000),
        openingMomentum: 0.64,
        initiativeTrust: 0.68,
      },
      killSwitchSuspended: false,
      architecture: createArchitecture(),
      runtimeDigest: createRuntimeSnapshot(),
      watchMode: 'recovering',
      privateThought: createPrivateThought({
        stance: 'care',
        shouldSpeak: true,
        suggestedStyle: 'gentle-care',
        thoughtText: 'This line was received, but I should keep the next follow-up gentle and memory-led.',
      }),
      initiative: {
        selectedAction: 'speak',
        selectedConcernId: 'memory-led-gentle-return',
        confidence: 0.8,
        motives: {
          'protect': 0.34,
          'clarify': 0.28,
          'stay-silent': 0.18,
        },
        speakDrive: 0.76,
        silenceDrive: 0.18,
        preferredStyle: 'gentle-care',
        preferredPresence: 'attentive',
        why: 'The reopening was accepted.',
        shouldSurface: true,
        shouldSpeak: true,
      },
      beliefLedger: createBeliefLedger(),
      relationshipModel: createRelationshipModel({
        climate: 'attuned',
        approachVector: 'care',
      }),
      inquiryLoop: createInquiryLoop(),
      longHorizonMemory: createLongHorizonMemory({
        preferenceBias: {
          companionship: 0.28,
          truthfulGrounding: 0.16,
          gentleRepair: 0.2,
          quietObservation: 0.22,
          proactiveCare: 0.18,
          playfulIntimacy: 0.04,
          autonomyRespect: 0.18,
          unfinishedThreadReturn: 0.3,
        },
        summary: 'A received gentle reopen is turning into durable memory-led follow-up timing.',
        dominantCueSummary: 'Remembered initiative strategy carry: Keep future follow-ups gentle, lower-pressure, and memory-led while the opening is still receiving them.',
        rememberedPreferenceSummary: 'Keep future follow-ups gentle, lower-pressure, and memory-led while the opening is still receiving them.',
        rememberedPlanSummary: 'Keep future follow-ups gentle, lower-pressure, and memory-led while the opening is still receiving them.',
        anchorFacts: [{
          factId: 'derived:person-state-initiative-strategy-carry',
          subject: 'assistant',
          predicate: 'initiative-strategy-carry',
          object: 'Keep future follow-ups gentle, lower-pressure, and memory-led while the opening is still receiving them.',
          confidence: 0.84,
          weight: 0.78,
          influenceTags: ['bond', 'task', 'truth'],
          summary: 'Remembered initiative strategy carry: Keep future follow-ups gentle, lower-pressure, and memory-led while the opening is still receiving them.',
          lastRecalledAt: 920,
        }],
      }),
      autobiographicalSelf: null,
      selfEvolution: null,
    } as any)

    expect(decision.shouldInterrupt).toBe(false)
    expect(decision.style).toBe('silent-observe')
    expect(decision.consideredSignals).toContain('longHorizonMemory.initiativeStrategy')
    expect(decision.whyNow).toMatch(/memory-led|lower-pressure|gentle/i)
    expect(decision.whyNotLater).toMatch(/memory-led|lower-pressure|opening/i)
  })
})
