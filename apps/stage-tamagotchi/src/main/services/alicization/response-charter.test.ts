import type { AlicizationVisualPresenceStateSnapshot } from '../../../shared/eventa'
import type { AlicizationProactiveLayeredContext } from './proactive-layered-context'

import { describe, expect, it } from 'vitest'

import { buildAlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'
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
    expect(charter.digitalLifeSummary).toContain('mode=')
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
    expect(block).toContain('Digital life mode:')
    expect(block).toContain('Digital life architecture:')
    expect(block).toContain('Must do:')
    expect(block).toContain('Must not do:')
  })

  it('threads closeness ladder authority into the response charter when runtime surface provides person-state projection', () => {
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface(createState())
    runtimeSurface.memory.personStateProjection = {
      contexts: ['focused-work', 'execution-callback', 'execution'],
      summary: 'regime=focused-work | ladder=focused-work/space-first | posture=restrained',
      activeClosenessContext: 'focused-work',
      activeClosenessRung: 'space-first',
      closenessLadder: [{
        context: 'focused-work',
        rung: 'space-first',
        preference: 'Lighter touch, more room, less interruption pressure.',
        rationale: 'context=focused-work | regime=focused-work | posture=restrained',
        confidence: 0.86,
      }],
      relationshipPosture: 'restrained',
      openingGuidance: 'Open with the live answer first and keep the approach lighter.',
      preferredProactiveStyle: 'light-nudge',
      preferenceText: 'Lighter touch, more room, less interruption pressure.',
      sensitivityText: 'Pressure and over-close timing become intrusive quickly.',
      repairTriggerText: 'If closeness feels heavy, back off first and reopen with lighter presence.',
      burdenText: 'Focused work gets overloaded quickly by extra conversational pressure.',
      routineText: 'Focused work windows usually need space first, then precise follow-up.',
      trustRationale: 'Trust is warming, but the host still needs clear room while focused.',
      relationshipDoctrine: 'Repair the seam before leaning closer.',
      cautious: true,
      restrained: true,
      personalityContinuityState: {
        currentRegime: 'focused-work',
        closenessPosture: 'space-first',
        repairPosture: 'repair-first',
      } as any,
    }

    const charter = buildAlicizationResponseCharter({
      context: createContext(),
      state: createState(),
      runtimeSurface,
      inspectionRequested: false,
    })

    expect(charter.activeClosenessContext).toBe('focused-work')
    expect(charter.activeClosenessRung).toBe('space-first')
    expect(charter.relationshipPosture).toBe('restrained')
    expect(charter.mustDo.some(item => item.includes('focused-work/space-first'))).toBe(true)
    expect(charter.mustNotDo.some(item => item.includes('need for room'))).toBe(true)
    expect(charter.reasons.some(item => item.includes('focused-work/space-first'))).toBe(true)

    const block = buildAlicizationResponseCharterSystemBlock(charter)
    expect(block).toContain('Closeness ladder: focused-work/space-first.')
  })

  it('lets shared memory deliberation kernel feed reasons and truth discipline in the response charter', () => {
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface(createState())
    runtimeSurface.memory.recollectionSpeechPlan = {
      shouldSurface: true,
      surfaceMode: 'answer-anchoring',
      placement: 'before-payoff',
      certainty: 'approximate',
      confidence: 0.88,
      internalLead: 'What comes back first is the runtime seam we kept carrying.',
      visibleLead: 'It feels like the same runtime seam again.',
      styleNote: 'Let recollection bend the answer without becoming a memory dump.',
      rationale: 'The host is explicitly asking how this used to be handled.',
    } as any
    runtimeSurface.memory.memoryDeliberation = {
      shouldRecall: true,
      surfacePolicy: 'answer-anchoring',
      confidence: 0.88,
      whyNow: 'The answer needs the remembered runtime seam as its internal anchor.',
      stableCore: ['Return to the same seam before branching.'],
      unsafeDetails: ['Do not assert which exact wording belonged to that old seam.'],
      selectedPeriods: [{ kind: 'consolidation', summary: 'That period kept bending toward the runtime seam until it finally held together.' }],
      selectedEras: [],
      selectedEpisodes: [],
      selectedProcedures: [{ label: 'same seam first', approach: 'Return to the same seam before branching.' }],
      selectedBundles: [{ id: 'bundle-runtime', summary: 'Runtime seam bundle', confidence: 0.84 }],
      selectedChains: [{
        kind: 'task-procedure-relationship-stance',
        summary: 'Return to the same seam before branching.',
        currentStance: 'Carry the same runtime seam before branching.',
        answerPosture: 'Procedure-carry.',
        confidence: 0.82,
      }],
      selectedRelationshipLines: ['Carry the same runtime seam before branching.'],
      followUpAffordance: {
        summary: 'Carry the same runtime seam before branching.',
        whyNow: 'The answer needs the remembered runtime seam as its internal anchor.',
        intrusionRisk: 'high',
        payoffDependency: 'requires-current-payoff',
        preferredTiming: 'after-payoff',
      },
    } as any

    const charter = buildAlicizationResponseCharter({
      context: createContext(),
      state: createState(),
      runtimeSurface,
      inspectionRequested: false,
    })

    expect(charter.reasons.some(item => item.includes('remembered runtime seam'))).toBe(true)
    expect(charter.mustDo).toContain('If recollection becomes visible, let the stable remembered core do the work before any fragmentary detail.')
    expect(charter.mustDo).toContain('If recollection is pressing forward too hard, keep recollection inward until the host has room for it.')
    expect(charter.mustNotDo.some(item => item.includes('Do not outrun this recollection boundary'))).toBe(true)
    expect(charter.mustNotDo.some(item => item.includes('Do not surface unstable remembered detail as settled fact'))).toBe(true)
  })

  it('lets the conscious frame impose hypothesis discipline on coarse screen turns', () => {
    const charter = buildAlicizationResponseCharter({
      context: createContext(),
      state: createState({
        currentConsciousFrame: {
          subject: 'task-knot',
          centerOfGravity: 'witness',
          truthDiscipline: 'observe-then-hypothesize',
          consciousNeed: 'Start from what is visible before naming the task.',
          consciousTension: 'The scene is still too coarse for class-level certainty.',
          speakingIntention: 'Separate observation from guess and keep the guess soft.',
          focusAnchor: 'Git commit diff in Java code editor',
          withheldImpulse: 'Do not collapse coarse visual evidence into file, class, or field certainty.',
          shouldWithholdSpecificity: true,
          shouldSelfRevise: false,
          confidence: 0.82,
          reasonTags: ['discipline:observe-then-hypothesize'],
          updatedAt: 1_700_000_000_000,
        },
        claimEvidenceLedger: {
          subject: 'task-knot',
          evidenceMode: 'coarse-held',
          observedSurface: 'Git commit diff in Java code editor',
          taskHypothesis: 'The host is probably working through a Java diff.',
          intentHypothesis: 'Separate observation from guess and keep the guess soft.',
          specificityBudget: 'coarse-scene',
          hostReferencedCues: [],
          groundedArtifactCues: [],
          allowedSpecificCues: [],
          shouldLabelHypothesis: true,
          forbidUnsupportedSpecificity: true,
          shouldSelfRevise: false,
          confidence: 0.8,
          reasonTags: ['budget:coarse-scene'],
          updatedAt: 1_700_000_000_000,
        },
      }),
      inspectionRequested: true,
    })

    expect(charter.governingFocus).toContain('guess')
    expect(charter.mustDo).toContain('Keep visible observation and downstream guesswork in separate clauses.')
    expect(charter.mustDo).toContain('Mark any step beyond direct observation as a guess, hypothesis, or soft read.')
    expect(charter.mustNotDo).toContain('Do not infer class names, enum names, file paths, or field changes from generic scene cues alone.')
    expect(charter.mustNotDo).toContain('Do not introduce concrete technical entities that are absent from the host turn and absent from current grounded evidence.')
  })

  it('prefers the runtime surface when state and runtime snapshots diverge', () => {
    const runtimeBackedState = createState()
    const staleState = createState({
      currentScene: null,
      worldModel: null,
      concerns: [],
      commitmentLedger: null,
      inquiryPlanner: null,
      relationshipModel: null,
      selfContinuity: null,
      mindKernel: null,
      initiative: null,
      actionEcology: null,
      answerPlanner: null,
      privateThought: null,
    })

    const charter = buildAlicizationResponseCharter({
      context: createContext(),
      state: staleState,
      runtimeSurface: buildAlicizationDigitalLifeRuntimeSurface(runtimeBackedState),
      inspectionRequested: false,
    })

    expect(charter.epistemicMode).toBe('grounded-live')
    expect(charter.responseMode).toBe('guide-current-knot')
    expect(charter.governingFocus).toContain('diff')
    expect(charter.reasons.some(item => item.includes('diff'))).toBe(true)
  })

  it('lets runtimeSurface override conflicting explicit dialogue outputs', () => {
    const runtimeBackedState = createState({
      discourseState: {
        currentTurnSubject: 'task-knot',
        screenReferenceMode: 'helpful',
        currentTurnSummary: 'Runtime discourse summary',
        currentQuestion: 'Which runtime seam is still broken?',
        owedAction: 'guide-task',
        relationMove: 'guide',
        continuityMode: 'task-first',
        unresolvedCarry: 'Runtime unresolved carry',
        ruptureRepair: null,
        confidence: 0.9,
        narrative: [],
        updatedAt: 1_700_000_000_000,
      } as any,
      mindSynthesis: {
        relationMove: 'guide',
        answerSubject: 'task-knot',
        speechObligation: 'guide-task',
        truthBoundary: 'Stay with runtime-grounded evidence.',
        interiorSummary: 'Runtime interior summary',
        concerns: [{ summary: 'Runtime concern' }],
        commitments: [{ summary: 'Runtime commitment' }],
        narrative: [],
        updatedAt: 1_700_000_000_000,
      } as any,
      dialogueActKernel: {
        relationMove: 'guide',
        answerSubject: 'task-knot',
        speechObligation: 'guide-task',
        responseMode: 'guide-current-knot',
        relationFrame: 'guide',
        whyNow: 'Runtime why now',
        openingClaim: 'Runtime opening claim',
        mustSay: ['Runtime must say'],
        mustAvoid: ['Runtime must avoid'],
        sourceTrace: ['runtime source trace'],
        confidence: 0.88,
        narrative: [],
        updatedAt: 1_700_000_000_000,
      } as any,
      answerCompiler: {
        answerSubject: 'task-knot',
        screenReferenceMode: 'helpful',
        speechObligation: 'guide-task',
        relationMove: 'guide',
        turnMode: 'guide-current-knot',
        responseMode: 'guide-current-knot',
        recommendedAct: 'guide',
        evidenceMode: 'live-grounded',
        openingStyle: 'direct-answer',
        personaKernelMode: 'backgrounded',
        relationshipPosture: 'warm',
        openingDirective: 'Runtime directive',
        openingClaim: 'Runtime compiled claim',
        supportingReality: ['Runtime supporting reality'],
        uncertaintyBoundary: null,
        careVector: null,
        nextMove: 'Runtime next move',
        suppressAssociativeRecall: true,
        labelCarryAsMemory: false,
        maxSentences: 4,
        mustDo: ['Runtime must do'],
        mustNotDo: ['Runtime must not do'],
        confidence: 0.9,
        narrative: [],
        updatedAt: 1_700_000_000_000,
      } as any,
      currentConsciousFrame: {
        subject: 'task-knot',
        centerOfGravity: 'guide',
        truthDiscipline: 'task-first',
        consciousNeed: 'Runtime conscious need',
        consciousTension: 'Runtime conscious tension',
        speakingIntention: 'Runtime speaking intention',
        focusAnchor: 'runtime.ts diff',
        withheldImpulse: null,
        shouldWithholdSpecificity: false,
        shouldSelfRevise: false,
        confidence: 0.86,
        reasonTags: ['runtime-surface'],
        updatedAt: 1_700_000_000_000,
      } as any,
      claimEvidenceLedger: {
        subject: 'task-knot',
        evidenceMode: 'live-grounded',
        observedSurface: 'Runtime observed surface',
        taskHypothesis: 'Runtime task hypothesis',
        intentHypothesis: 'Runtime intent hypothesis',
        specificityBudget: 'grounded-artifact',
        hostReferencedCues: [],
        groundedArtifactCues: [],
        allowedSpecificCues: [],
        shouldLabelHypothesis: false,
        forbidUnsupportedSpecificity: false,
        shouldSelfRevise: false,
        confidence: 0.84,
        reasonTags: ['runtime-surface'],
        updatedAt: 1_700_000_000_000,
      } as any,
    })

    const charter = buildAlicizationResponseCharter({
      context: createContext(),
      state: createState(),
      runtimeSurface: buildAlicizationDigitalLifeRuntimeSurface(runtimeBackedState),
      inspectionRequested: false,
      discourseState: {
        currentTurnSubject: 'alicization-self',
        screenReferenceMode: 'avoid',
        currentTurnSummary: 'raw conflict',
        currentQuestion: null,
        owedAction: 'answer-self',
        relationMove: 'self-disclose',
        continuityMode: 'dialogue-first',
        unresolvedCarry: null,
        ruptureRepair: null,
        confidence: 0.2,
        narrative: [],
        updatedAt: 1_700_000_000_000,
      } as any,
      mindSynthesis: {
        interiorSummary: 'raw conflict',
        concerns: [{ summary: 'raw conflict' }],
        commitments: [{ summary: 'raw conflict' }],
      } as any,
      dialogueActKernel: {
        whyNow: 'raw conflict',
        openingClaim: 'raw conflict',
        mustSay: ['raw conflict'],
        mustAvoid: ['raw conflict'],
        sourceTrace: ['raw conflict'],
      } as any,
      answerCompiler: {
        responseMode: 'answer-naturally',
        evidenceMode: 'memory-only',
        relationshipPosture: 'restrained',
        openingDirective: 'raw conflict',
        openingClaim: 'raw conflict',
        supportingReality: ['raw conflict'],
        nextMove: 'raw conflict',
        mustDo: ['raw conflict'],
        mustNotDo: ['raw conflict'],
      } as any,
      currentConsciousFrame: {
        speakingIntention: 'raw conflict',
        consciousNeed: 'raw conflict',
        consciousTension: 'raw conflict',
      } as any,
      claimEvidenceLedger: {
        observedSurface: 'raw conflict',
        taskHypothesis: 'raw conflict',
        intentHypothesis: 'raw conflict',
        shouldLabelHypothesis: true,
        forbidUnsupportedSpecificity: true,
      } as any,
    })

    expect(charter.responseMode).toBe('guide-current-knot')
    expect(charter.governingFocus).toContain('Runtime speaking intention')
    expect(charter.digitalLifeSummary).toContain('mode=')
    expect(charter.mustDo).toContain('Runtime must do')
    expect(charter.mustDo).toContain('Runtime must say')
    expect(charter.mustNotDo).toContain('Runtime must not do')
    expect(charter.mustNotDo).toContain('Runtime must avoid')
    expect(charter.mustDo).not.toContain('raw conflict')
    expect(charter.mustNotDo).not.toContain('raw conflict')
  })
})
