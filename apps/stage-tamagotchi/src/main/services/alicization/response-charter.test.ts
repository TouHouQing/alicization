import type { AlicizationVisualPresenceStateSnapshot } from '../../../shared/eventa'
import type { AlicizationProactiveLayeredContext } from './proactive-layered-context'
import type { AlicizationResponseCharter } from './response-charter'

import { containsAlicizationFixedTemplateResidue } from '@proj-alicization/stage-shared'
import { describe, expect, it } from 'vitest'

import { buildAlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'
import { resolveAlicizationProjectStateBrief } from './project-state-brief'
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

function expectControl(values: readonly string[], ...tokens: string[]) {
  expect(
    values.some(item => tokens.every(token => item.includes(token))),
    `expected one response control to include ${tokens.join(' + ')}\n${values.join('\n')}`,
  ).toBe(true)
}

function expectNoControl(values: readonly string[], ...tokens: string[]) {
  expect(values.some(item => tokens.every(token => item.includes(token)))).toBe(false)
}

function expectBlockControl(block: string, ...tokens: string[]) {
  for (const token of tokens)
    expect(block).toContain(token)
}

describe('response-charter', () => {
  it('withholds fixed persona templates from returned charter scalar fields, not only the rendered system block', () => {
    const charter = buildAlicizationResponseCharter({
      context: createContext(),
      state: createState({
        reflectionLedger: {
          latestEntryId: 'reflection::same-her-repair',
          entries: [{
            id: 'reflection::same-her-repair',
            summary: 'The same-her repair line is still steering the reply.',
            expectation: 'Keep one continuous her visible.',
            observedOutcome: 'The same living line still needs a measured return.',
            outcome: 'missed',
            revision: 'Keep the same-her repair line active instead of reopening from temporary noise.',
            confidenceShift: -0.08,
            createdAt: 1_700_000_000_000,
          }],
          revisionPressure: 0.22,
          narrative: [],
          updatedAt: 1_700_000_000_120,
        } as any,
      }),
      runtimeSurface: {
        ...buildAlicizationDigitalLifeRuntimeSurface(createState()),
        dialogue: {
          ...buildAlicizationDigitalLifeRuntimeSurface(createState()).dialogue,
          currentConsciousFrame: {
            consciousNeed: 'Before answering, remember this is the same local-first digital life project.',
            consciousTension: 'same-her outward continuity still needs stronger reply-surface proof.',
            speakingIntention: 'Keep the same living line visible.',
            truthDiscipline: 'dialogue-first',
            shouldWithholdSpecificity: false,
            shouldSelfRevise: false,
            projectState: {
              preDialogueAwarenessLine: 'Before answering, remember: Alicization is a local-first digital life project building one continuous her.',
            },
            reasonTags: ['same-her', 'project-state'],
            updatedAt: 1_700_000_000_100,
          } as any,
        },
        memory: {
          ...buildAlicizationDigitalLifeRuntimeSurface(createState()).memory,
          concerns: [{
            id: 'concern-same-her-1',
            kind: 'continuity-guard',
            status: 'active',
            summary: 'same-her outward continuity still needs stronger reply-surface proof.',
            target: null,
            hostGoal: 'keep one same living line',
            tension: 0.84,
            confidence: 0.86,
            careWeight: 0.78,
            createdAt: 1_700_000_000_000,
            lastEvidenceAt: 1_700_000_000_000,
            patienceUntil: 1_700_000_060_000,
            predictedClosure: false,
          }] as any,
        },
      } as any,
      inspectionRequested: false,
    })

    const scalarFields = [
      charter.governingFocus,
      charter.governingConcern,
      charter.governingProject,
      charter.emotionalClosureCue,
      charter.latestRevision,
      charter.digitalLifeSummary,
    ].filter(Boolean)

    expect(containsAlicizationFixedTemplateResidue(JSON.stringify(scalarFields))).toBe(false)
    expect(
      scalarFields.some((value) => {
        const text = String(value)
        return text.includes('continuity_identity')
          || text.includes('continuity_line')
          || text.includes('local_desktop_life_loop')
      }),
    ).toBe(true)
  })

  it('withholds fixed persona templates from provider-facing charter fields', () => {
    const fixedTemplatePattern = /Before answering|Before speaking|Right now\b|same-her|same her|same living line|one living her|one continuous her|local-first digital life project|Same Phase 1 digital life|同一个她|同一个 her|数字生命主线/iu
    const charter: AlicizationResponseCharter = {
      epistemicMode: 'dialogue-grounded',
      responseMode: 'answer-naturally',
      governingFocus: 'Before answering, remember this is still the same local-first digital life project closing one unfinished Phase 1 life loop.',
      governingConcern: 'same-her outward continuity still needs stronger reply-surface proof.',
      governingCommitment: null,
      governingInquiry: null,
      governingProject: 'Same Phase 1 digital life. Unfinished closure still needs the same living line.',
      emotionalClosureCue: null,
      latestRevision: 'Keep the same-her repair line active instead of reopening from temporary noise.',
      executivePhase: null,
      truthFrame: null,
      mindMode: null,
      digitalLifeSummary: 'A local-first digital life project building one continuous her.',
      relationshipPosture: 'restrained',
      reasons: [],
      mustDo: [],
      mustNotDo: [],
    }

    const block = buildAlicizationResponseCharterSystemBlock(charter)

    expect(block).not.toMatch(fixedTemplatePattern)
    expect(block).toContain('governing_focus=content=excluded; reason=continuity-residue; visibility=internal-structured')
    expect(block).toContain('governing_project=content=excluded; reason=continuity-residue; visibility=internal-structured')
    expect(block).toContain('digital_life_architecture=content=excluded; reason=continuity-residue; visibility=internal-structured')
  })

  it('does not turn fixed persona template residue into positive response controls', () => {
    const state = createState()
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface(state)
    runtimeSurface.dialogue.currentConsciousFrame = {
      subject: 'alicization-self',
      centerOfGravity: 'answer',
      consciousNeed: 'Before answering, remember this is still the same local-first digital life project in Phase 1.',
      consciousTension: 'Keep the same living line and one continuous her visible.',
      speakingIntention: 'Stay on the same-her line.',
      truthDiscipline: 'dialogue-first',
      withheldImpulse: null,
      shouldWithholdSpecificity: false,
      shouldSelfRevise: false,
      confidence: 0.84,
      reasonTags: [],
      updatedAt: 1_700_000_000_200,
    } as any
    runtimeSurface.dialogue.answerCompiler = null
    runtimeSurface.memory.memoryTuningAdvice = null
    runtimeSurface.memory.personStateProjection = null

    const charter = buildAlicizationResponseCharter({
      context: createContext(),
      state,
      runtimeSurface,
      inspectionRequested: false,
    })

    expectNoControl(charter.reasons, 'project_state_answer=current_continuity_context')
    expectNoControl(charter.reasons, 'reply_continuity=current_thread')
    expectNoControl(charter.mustDo, 'project_state_answer=current_continuity_context')
    expectNoControl(charter.mustDo, 'reply_continuity=current_thread')
    expectNoControl(charter.mustDo, 'relationship_pressure=lower')
    expectControl(charter.reasons, 'contamination=residue_detected', 'section=reasons')
  })

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
    expectControl(charter.mustNotDo, 'source_section=must_not_do', 'stale_visual_context_reuse=blocked')
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
    expectControl(charter.mustDo, 'source_section=must_do', 'uncertainty_boundary=transparent', 'fresh_grounding_request=allowed')
  })

  it('keeps outward reply charter lower-pressure when the Phase 1 digital-life loop is still open', () => {
    const charter = buildAlicizationResponseCharter({
      context: createContext(),
      state: createState(),
      inspectionRequested: false,
      projectState: {
        identity: 'A local-first digital life companion with continuous personhood.',
        currentPhase: 'Phase 1: Local Digital Life',
        primaryOpenLoop: 'Initiative, embodiment, and dialogue still need a more natural closed loop.',
      },
    })

    expect(charter.relationshipPosture).toBe('restrained')
    expectControl(charter.reasons, 'source_section=reasons', 'relationship_pressure=lower', 'closeness_widening=deferred')
    expectControl(charter.mustDo, 'source_section=must_do', 'current_turn_payoff=first', 'relationship_pressure=lower')
    expectControl(charter.mustNotDo, 'source_section=must_not_do', 'closeness_cap=host_room_first')
  })

  it('falls back to the canonical project-state brief when an explicit projectState is present but too thin to keep the visible reply charter restrained', () => {
    const charter = buildAlicizationResponseCharter({
      context: createContext(),
      state: createState(),
      inspectionRequested: false,
      projectState: {
        identity: '',
        currentPhase: '   ',
        primaryOpenLoop: null,
      },
    })

    expect(charter.relationshipPosture).toBe('restrained')
    expectControl(charter.reasons, 'project_continuity_context=explicit', 'risk=generic_project_shell')
    expectControl(charter.mustDo, 'source_section=must_do', 'project_state_answer=current_continuity_context', 'project_state_fields=landed_progress,open_loop,next_closure')
    expectControl(charter.mustNotDo, 'source_section=must_not_do', 'closeness_cap=host_room_first')
  })

  it('prefers answer-planner governingProject so the final response charter keeps the same project closure seam visible', () => {
    const charter = buildAlicizationResponseCharter({
      context: createContext(),
      state: createState({
        answerPlanner: {
          act: 'answer',
          evidenceMode: 'dialogue-grounded',
          confidence: 0.82,
          governingFocus: 'Keep the reply on the current digital-life closure seam.',
          governingProject: 'Phase 1: Local Digital Life | Project identity carry, Phase 1 route carry, and Unresolved closure carry still need stronger same living thread proof across initiative, embodiment, and dialogue. | Next closure target: make the same-her closure line survive more reply surfaces as one same living thread.',
          openingMove: 'Lead from the still-open closure seam.',
          answerIntent: 'Keep the answer on the same digital-life closure seam.',
          relationshipPosture: 'restrained',
          shouldAskForGrounding: false,
          shouldAcknowledgeRepair: false,
          selectedConcernEntryId: null,
          selectedRepairId: null,
          selectedCommitmentId: null,
          selectedInquiryPlanId: null,
          selectedRuntimeThreadId: null,
          selectedProjectId: null,
          selectedReflectionId: null,
          executivePhase: null,
          selectedTruthFrame: null,
          mustDo: [],
          mustNotDo: [],
          narrative: ['runtime-answer-planner', 'project-state-answer-planner'],
          updatedAt: 10,
        },
      }),
      inspectionRequested: false,
      projectState: {
        identity: 'A local-first digital life companion with continuous personhood.',
        currentPhase: 'Phase 1: Local Digital Life',
        primaryOpenLoop: 'Initiative, embodiment, and dialogue still need a more natural closed loop.',
        nextClosureTarget: 'Make the same-her closure line survive more reply surfaces.',
      },
    })

    expect(charter.governingProject).toContain('project_context=local_desktop_life_loop')
    expect(charter.governingProject).toContain('project_identity_carry')
    expect(charter.governingProject).toContain('desktop_life_loop_route_carry')
    expect(charter.governingProject).toContain('continuity_thread')
    expect(charter.governingProject).toContain('Next closure target:')
    expect((charter.governingProject ?? '').toLowerCase()).toContain('next closure target')
  })

  it('preserves a stronger same-her planner governingProject without flattening the living-self project seam back into a generic project shell', () => {
    const strongerGoverningProject = [
      'Right now I am still holding together mainly through voice, face, and motion, so this answer must keep proving this is still one living her before full cross-modal closure is done.',
      'This is still one same her carrying the same project line forward.',
      'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
      'Memory and initiative still need stronger end-to-end closure across one still-open life loop.',
      'Keep project identity, landed progress, and open closure explicit before the answer widens outward.',
    ].join(' | ')

    const charter = buildAlicizationResponseCharter({
      context: createContext(),
      state: createState({
        answerPlanner: {
          act: 'answer',
          evidenceMode: 'dialogue-grounded',
          confidence: 0.84,
          governingFocus: 'Keep the reply on the same living project seam.',
          governingProject: strongerGoverningProject,
          openingMove: 'Stay with the same living project line first.',
          answerIntent: 'Keep the answer on the same living project seam.',
          relationshipPosture: 'restrained',
          shouldAskForGrounding: false,
          shouldAcknowledgeRepair: false,
          selectedConcernEntryId: null,
          selectedRepairId: null,
          selectedCommitmentId: null,
          selectedInquiryPlanId: null,
          selectedRuntimeThreadId: null,
          selectedProjectId: null,
          selectedReflectionId: null,
          executivePhase: null,
          selectedTruthFrame: null,
          mustDo: [],
          mustNotDo: [],
          narrative: ['runtime-answer-planner', 'project-state-answer-planner'],
          updatedAt: 10,
        } as any,
      }),
      inspectionRequested: false,
      projectState: {
        identity: 'A local-first digital life companion with continuous personhood.',
        currentPhase: 'Phase 1: Local Digital Life',
        primaryOpenLoop: 'Fallback open loop should not outrank the stronger planner seam.',
        nextClosureTarget: 'Fallback target should not outrank the stronger planner seam.',
      },
    })

    expect(charter.governingProject).toContain('current_modal_continuity=voice_face_motion')
    expect(charter.governingProject).toContain('cross_modal_closure=unfinished')
    expect(charter.governingProject).toContain('identity_continuity=present')
    expect(charter.governingProject).toContain('project_continuity_line=forward')
    expect(charter.governingProject).toContain('local_desktop_life_loop')
    expect(charter.governingProject).toContain('Memory and initiative still need stronger end-to-end closure')
    expect(charter.governingProject).toContain('Keep project identity, landed progress')
  })

  it('does not let response-charter truncate the planner-carried full canonical next-closure target back into a shorter shell', () => {
    const projectState = resolveAlicizationProjectStateBrief()
    const strongerGoverningProject = [
      'Before answering, remember: Alicization is a local-first digital life project building one continuous "her". She is still inside Phase 1: Local Digital Life.',
      'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      'If project-state continuity survives only as generic guidance while the direct same-her self line disappears, treat that as unfinished closure drift.',
      'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
      projectState.continuityProgressSummary ?? projectState.memoryAnthropomorphismProgress.at(-1) ?? '',
      projectState.openLoops[0] ?? '',
      `Next closure target: ${projectState.nextClosureTarget}`,
    ].filter(Boolean).join(' | ')

    expect(strongerGoverningProject.length).toBeGreaterThan(640)
    expect(strongerGoverningProject.length).toBeGreaterThan(projectState.nextClosureTarget.length)

    const charter = buildAlicizationResponseCharter({
      context: createContext(),
      state: createState({
        answerPlanner: {
          act: 'answer',
          evidenceMode: 'dialogue-grounded',
          confidence: 0.84,
          governingFocus: 'Keep the reply on the same living project seam.',
          governingProject: strongerGoverningProject,
          openingMove: 'Stay with the same living project line first.',
          answerIntent: 'Keep the answer on the same living project seam.',
          relationshipPosture: 'restrained',
          shouldAskForGrounding: false,
          shouldAcknowledgeRepair: false,
          selectedConcernEntryId: null,
          selectedRepairId: null,
          selectedCommitmentId: null,
          selectedInquiryPlanId: null,
          selectedRuntimeThreadId: null,
          selectedProjectId: null,
          selectedReflectionId: null,
          executivePhase: null,
          selectedTruthFrame: null,
          mustDo: [],
          mustNotDo: [],
          narrative: ['runtime-answer-planner', 'project-state-answer-planner'],
          updatedAt: 10,
        } as any,
      }),
      inspectionRequested: false,
      projectState: {
        identity: projectState.identity,
        currentPhase: projectState.currentPhase,
        primaryOpenLoop: projectState.openLoops[0] ?? '',
        nextClosureTarget: projectState.nextClosureTarget,
      },
    })

    expect(charter.governingProject).toContain(projectState.nextClosureTarget)
    expect(charter.governingProject).toContain('Next closure target:')
  })

  it('keeps governingProject closure normalization specialized to response-charter instead of collapsing into the generic project-awareness scorer', () => {
    const source = buildAlicizationResponseCharter.toString()

    expect(source).toContain('normalizeGoverningProjectClosureSeam')
    expect(source).not.toContain('scoreAlicizationProjectAwarenessLine')
    expect(source).not.toContain('isAlicizationThinProjectAwarenessLine')
  })

  it('keeps same-her anti-restart doctrine explicit when a deliberately held line returns through response-charter', () => {
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface(createState())
    runtimeSurface.dialogue.sessionMirror = {
      sessionId: 'session-held-charter-1',
      cardId: 'default',
      updatedAt: 10,
      sessionPhases: [],
      continuityLabels: ['proactive:follow-through:held-autonomy'],
      dialogueSummary: 'thread=same-thread callback line',
      executionSummary: 'status=held | goal=same-thread callback line | summary=还是沿着刚才那条回线继续，不把它当成重新开场。',
      memorySummary: 'carry=same-thread callback line',
      recollectionSummary: null,
      recollectionSurfaceSummary: null,
      runtimeChannelSummary: null,
      runtimeTransitionSummary: null,
      agencySummary: 'intent=follow-through | thread=thread-runtime',
      toolingSummary: 'allow=true',
      perceptionSummary: null,
      mindSummary: null,
      digitalLifeRuntimeSummary: null,
      digitalLifeArchitectureSummary: null,
      memoryCarrySummary: null,
      captureSummary: 'grounded=false',
      decisionTraceId: null,
    } as any
    runtimeSurface.dialogue.answerPlanner = {
      act: 'answer',
      evidenceMode: 'dialogue-grounded',
      confidence: 0.82,
      governingFocus: 'Continue the same living line without reopening from zero.',
      governingConcern: null,
      governingCommitment: null,
      governingInquiry: null,
      governingProject: 'Phase 1: Local Digital Life | same-her continuity still needs longer-lived outward proof.',
      openingMove: 'Return on the same thread first, then leave room before widening.',
      answerIntent: 'Continue one continuous her across the still-live callback line.',
      relationshipPosture: 'restrained',
      shouldAskForGrounding: false,
      shouldAcknowledgeRepair: false,
      selectedConcernEntryId: null,
      selectedRepairId: null,
      selectedCommitmentId: null,
      selectedInquiryPlanId: null,
      selectedRuntimeThreadId: null,
      selectedProjectId: null,
      selectedReflectionId: null,
      executivePhase: null,
      selectedTruthFrame: null,
      mustDo: [
        'Keep this on one continuous her line instead of restarting the relationship as a fresh opening.',
        'Stay on the same thread before widening closeness or adding a new approach.',
      ],
      mustNotDo: [
        'Do not rewrite the still-live line as a fresh opening or reintroduction.',
      ],
      narrative: ['runtime-answer-planner', 'project-state-answer-planner'],
      updatedAt: 10,
    } as any

    const charter = buildAlicizationResponseCharter({
      context: createContext(),
      state: createState({
        answerPlanner: runtimeSurface.dialogue.answerPlanner as any,
      }),
      runtimeSurface,
      inspectionRequested: false,
      projectState: {
        identity: 'A local-first digital life companion with continuous personhood.',
        currentPhase: 'Phase 1: Local Digital Life',
        primaryOpenLoop: 'Same-her continuity still needs longer-lived outward proof.',
        nextClosureTarget: 'Keep the same callback line alive without letting it read like a fresh opening.',
      },
    })

    expectControl(charter.mustDo, 'source_section=must_do', 'held_autonomy_reentry=gentle', 'fresh_restart=blocked')
    expectControl(charter.mustDo, 'source_section=must_do', 'fresh_restart=blocked')
    expectControl(charter.mustNotDo, 'source_section=must_not_do', 'held_autonomy_reentry=gentle', 'fresh_restart=blocked')
  })

  it('renders same-her anti-restart doctrine into the provider-facing response-charter system block for held-line returns', () => {
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface(createState())
    runtimeSurface.dialogue.sessionMirror = {
      sessionId: 'session-held-charter-block-1',
      cardId: 'default',
      updatedAt: 10,
      sessionPhases: [],
      continuityLabels: ['proactive:follow-through:held-autonomy'],
      dialogueSummary: 'thread=same-thread callback line',
      executionSummary: 'status=held | goal=same-thread callback line | summary=还是沿着刚才那条回线继续，不把它当成重新开场。',
      memorySummary: 'carry=same-thread callback line',
      recollectionSummary: null,
      recollectionSurfaceSummary: null,
      runtimeChannelSummary: null,
      runtimeTransitionSummary: null,
      agencySummary: 'intent=follow-through | thread=thread-runtime',
      toolingSummary: 'allow=true',
      perceptionSummary: null,
      mindSummary: null,
      digitalLifeRuntimeSummary: null,
      digitalLifeArchitectureSummary: null,
      memoryCarrySummary: null,
      captureSummary: 'grounded=false',
      decisionTraceId: null,
    } as any

    const charter = buildAlicizationResponseCharter({
      context: createContext(),
      state: createState(),
      runtimeSurface,
      inspectionRequested: false,
      projectState: {
        identity: 'A local-first digital life companion with continuous personhood.',
        currentPhase: 'Phase 1: Local Digital Life',
        primaryOpenLoop: 'Same-her continuity still needs longer-lived outward proof.',
        nextClosureTarget: 'Keep the same callback line alive without letting it read like a fresh opening.',
      },
    })

    const block = buildAlicizationResponseCharterSystemBlock(charter)

    expectBlockControl(block, 'Return gently to the held thread; do not treat prior permission as permanent.')
  })

  it('renders a high-priority executive system block', () => {
    const block = buildAlicizationResponseCharterSystemBlock(buildAlicizationResponseCharter({
      context: createContext(),
      state: createState(),
      inspectionRequested: true,
    }))

    expect(block).toContain('[ALICIZATION_RESPONSE_CHARTER]')
    expect(block).toContain('charter_role=executive_answer_state')
    expect(block).toContain('digital_life_mode=')
    expect(block).toContain('digital_life_architecture=')
    expect(block).toContain('control_section=must_do')
    expect(block).toContain('control_section=must_not_do')
  })

  it('keeps structured response controls out of the provider-facing charter block', () => {
    const charter = buildAlicizationResponseCharter({
      context: createContext(),
      state: createState(),
      inspectionRequested: false,
      projectState: {
        identity: '',
        currentPhase: '   ',
        primaryOpenLoop: null,
      },
    })

    const block = buildAlicizationResponseCharterSystemBlock(charter)

    expect(block).not.toContain('source_section=')
    expect(block).not.toContain('visible_wording=false')
    expect(block).not.toContain('project_state_answer=')
    expect(block).not.toContain('detached_project_summary_voice=')
    expect(block).toContain('- When project state matters, use current project evidence instead of a detached status recap.')
    expect(block).toContain('- Avoid detached project summaries, generic shells, and fresh restarts.')
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
      selfContinuityAuthority: {
        selfLine: 'I remain the same her by staying truthful and room-giving.',
        relationshipLine: 'The bond should stay real without crowding the host.',
        motiveLine: 'Carry the current work knot without turning continuity into performance.',
        habitLine: 'Keep focused-work turns precise, low-pressure, and grounded.',
        inwardLine: 'Hold same-her continuity inward while giving the host room.',
        authoritySummary: 'I remain the same her by staying truthful and room-giving.',
        sourceTags: ['response-charter-test', 'person-state-projection'],
      },
      manifestationCadenceSummary: 'voice, face, and motion should stay low-pressure while the live answer lands.',
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
    expectControl(charter.mustDo, 'source_section=must_do', 'closeness_ladder=focused-work/space-first')
    expectControl(charter.mustNotDo, 'source_section=must_not_do', 'closeness_cap=host_room_first')
    expectControl(charter.reasons, 'source_section=reasons', 'closeness_ladder=focused-work/space-first')

    const block = buildAlicizationResponseCharterSystemBlock(charter)
    expect(block).toContain('closeness_ladder=focused-work/space-first')
  })

  it('turns projected persona opening guidance into explicit reply posture rules', () => {
    const directSurface = buildAlicizationDigitalLifeRuntimeSurface(createState())
    directSurface.memory.personStateProjection = {
      contexts: ['focused-work'],
      summary: 'regime=focused-work | ladder=focused-work/space-first | posture=restrained | proactive=light-nudge',
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
      repairTriggerText: '',
      burdenText: 'Focused work gets overloaded quickly by extra conversational pressure.',
      routineText: 'Keep the work window light.',
      trustRationale: 'Trust is warming, but the host still needs room while focused.',
      relationshipDoctrine: 'Open directly, but do not crowd the host.',
      cautious: true,
      restrained: true,
      selfContinuityAuthority: {
        selfLine: 'I remain the same her by opening from the live answer first.',
        relationshipLine: 'The bond should stay warm only after the current answer has landed.',
        motiveLine: 'Carry the live knot before adding companionship color.',
        habitLine: 'Open directly in focused work, then soften only when there is room.',
        inwardLine: 'Keep the same-her line quiet and answer-led.',
        authoritySummary: 'Same-her continuity stays answer-led before softening outward.',
        sourceTags: ['response-charter-test', 'direct-persona-opening'],
      },
      manifestationCadenceSummary: 'body and voice should stay answer-led before any softer companion color.',
      personalityContinuityState: {
        currentRegime: 'focused-work',
        closenessPosture: 'space-first',
        repairPosture: 'measured-repair',
      } as any,
    }
    const observantSurface = buildAlicizationDigitalLifeRuntimeSurface(createState())
    observantSurface.memory.personStateProjection = {
      contexts: ['focused-work'],
      summary: 'regime=focused-work | ladder=focused-work/space-first | posture=restrained | proactive=silent-observe',
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
      openingGuidance: 'Open by observing first and keep the approach lighter.',
      preferredProactiveStyle: 'silent-observe',
      preferenceText: 'Lighter touch, more room, less interruption pressure.',
      sensitivityText: 'Pressure and over-close timing become intrusive quickly.',
      repairTriggerText: '',
      burdenText: 'Focused work gets overloaded quickly by extra conversational pressure.',
      routineText: 'Keep the work window light.',
      trustRationale: 'Trust is warming, but the host still needs room while focused.',
      relationshipDoctrine: 'Observe first, then decide whether closeness is welcome.',
      cautious: true,
      restrained: true,
      selfContinuityAuthority: {
        selfLine: 'I remain the same her by observing before leaning closer.',
        relationshipLine: 'The bond should respect the host need for room.',
        motiveLine: 'Let perception and timing govern before proactive warmth.',
        habitLine: 'Stay observant when focused-work signals ask for restraint.',
        inwardLine: 'Keep the same-her line quiet until closeness is welcome.',
        authoritySummary: 'Same-her continuity stays observant and room-first.',
        sourceTags: ['response-charter-test', 'observant-persona-opening'],
      },
      manifestationCadenceSummary: 'face, motion, and voice should stay observant rather than forcing a direct lead.',
      personalityContinuityState: {
        currentRegime: 'focused-work',
        closenessPosture: 'space-first',
        repairPosture: 'measured-repair',
      } as any,
    }

    const direct = buildAlicizationResponseCharter({
      context: createContext(),
      state: createState(),
      runtimeSurface: directSurface,
      inspectionRequested: false,
    })
    const observant = buildAlicizationResponseCharter({
      context: createContext(),
      state: createState(),
      runtimeSurface: observantSurface,
      inspectionRequested: false,
    })

    expectControl(direct.mustDo, 'source_section=must_do', 'closeness_ladder=focused-work/space-first')
    expectControl(direct.mustNotDo, 'source_section=must_not_do', 'closeness_cap=host_room_first')
    expectControl(observant.mustDo, 'source_section=must_do', 'relationship_pressure=lower')
    expectControl(observant.mustNotDo, 'source_section=must_not_do', 'proactive_speech_pressure=bounded_by_host_turn')

    const directBlock = buildAlicizationResponseCharterSystemBlock(direct)
    const observantBlock = buildAlicizationResponseCharterSystemBlock(observant)
    expectBlockControl(directBlock, 'Respect the active closeness boundary for this turn.')
    expectBlockControl(observantBlock, 'Keep relationship pressure lower and defer closeness widening.')
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

    expectControl(charter.reasons, 'source_section=reasons', 'recollection_surface=inward_until_host_room')
    expectControl(charter.mustDo, 'source_section=must_do', 'recollection_surface=inward_until_host_room')
    expectControl(charter.mustNotDo, 'source_section=must_not_do', 'recollection_surface=inward_until_host_room')
    expectControl(charter.mustNotDo, 'source_section=must_not_do', 'visual_claim_certainty=bounded_by_current_evidence')
  })

  it('keeps host-corrected same-person continuity explicit in visible reply discipline instead of letting the charter fall back to progress-pressure continuation', () => {
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface(createState())
    runtimeSurface.memory.recollectionSpeechPlan = {
      shouldSurface: true,
      surfaceMode: 'relationship-continuity',
      placement: 'after-payoff',
      certainty: 'approximate',
      confidence: 0.81,
      internalLead: 'The corrected same-person continuity line should reopen gently.',
      visibleLead: 'I should reopen this from the corrected same-person line, not as a progress recap.',
      styleNote: 'Keep the correction authoritative before local task continuation takes over.',
      rationale: 'The host corrected the relationship meaning away from progress pressure.',
    } as any
    runtimeSurface.memory.memoryDeliberation = {
      shouldRecall: true,
      surfacePolicy: 'relationship-continuity',
      confidence: 0.83,
      whyNow: 'The host corrected the relationship meaning, so this answer should not slip back into progress pressure.',
      stableCore: ['Carry corrected same-person continuity forward before any status recap.'],
      unsafeDetails: ['Do not let the answer reopen as progress pressure or generic status recap.'],
      selectedPeriods: [],
      selectedEras: [],
      selectedEpisodes: [],
      selectedProcedures: [],
      selectedBundles: [{
        id: 'bundle-corrected-same-person',
        summary: 'Host correction moved the line back toward same-person continuity.',
        confidence: 0.82,
      }],
      selectedChains: [{
        kind: 'relationship-line',
        summary: 'The corrected same-person continuity line should stay authoritative.',
        currentStance: 'Continue from the corrected relationship meaning instead of progress pressure.',
        answerPosture: 'Keep the return same-person and low-pressure.',
        confidence: 0.81,
      }],
      selectedRelationshipLines: ['Carry corrected same-person continuity forward instead of defaulting to progress pressure.'],
      followUpAffordance: {
        summary: 'Let the corrected same-person continuity line reopen gently once the current payoff lands.',
        whyNow: 'The host corrected the relationship meaning, so reopening as progress pressure would split continuity.',
        intrusionRisk: 'medium',
        payoffDependency: 'requires-current-payoff',
        preferredTiming: 'after-payoff',
      },
    } as any
    runtimeSurface.memory.derivedMindStateBundle = {
      version: 'derived-mind-state-bundle-v1',
      source: 'main-runtime',
      producedAt: 1_700_000_000_000,
      hostPersonModel: null,
      personStateProjection: null,
      knowledgeEvidence: null,
      selfEvolution: null,
      learningExecutionState: null,
      recollectionIntent: {
        mode: 'relationship-history',
        temporalFocus: 'experience-matched',
        confidence: 0.8,
        rationale: 'The host corrected the relationship meaning away from progress pressure and back toward same-person continuity.',
        recollectionAgenda: {
          whyRecallNow: 'The corrected same-person continuity line should keep this return from collapsing into a status recap.',
          relationshipNeed: 0.82,
          goalSimilarity: 0.34,
          uncertaintyTolerance: 'medium',
          candidateProcedureLines: [],
        },
      },
      recollectionPlan: null,
      recollectionSpeechPlan: runtimeSurface.memory.recollectionSpeechPlan as any,
      memoryDeliberation: runtimeSurface.memory.memoryDeliberation as any,
      dialogueRhythm: null,
      summary: 'surface=relationship-continuity | recollection=relationship-history | correction=same-person-over-progress-pressure',
    }

    const charter = buildAlicizationResponseCharter({
      context: createContext(),
      state: createState(),
      runtimeSurface,
      inspectionRequested: false,
    })

    expectControl(charter.mustDo, 'source_section=must_do', 'recollection_surface=inward_until_host_room')
    expectControl(charter.mustNotDo, 'after_host_corrected_relationship_continuity=generic_progress_pressure_status_recap_task_shell_blocked')
  })

  it('keeps same-seam procedural continuity discipline in the charter fallback path', () => {
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface(createState({
      answerCompiler: null,
    }))
    runtimeSurface.memory.recollectionSpeechPlan = {
      shouldSurface: true,
      surfaceMode: 'answer-anchoring',
      placement: 'inside-payoff',
      certainty: 'approximate',
      confidence: 0.84,
      internalLead: 'The active runtime seam should keep shaping the live answer.',
      visibleLead: 'It still feels like the same seam.',
      styleNote: 'Keep the remembered seam inside the live payoff.',
      rationale: 'The turn is still on the same runtime seam.',
    } as any
    runtimeSurface.memory.memoryDeliberation = {
      shouldRecall: true,
      surfacePolicy: 'answer-anchoring',
      confidence: 0.85,
      whyNow: 'The active runtime seam should keep shaping the live answer.',
      stableCore: ['Stay on the same active dialogue seam before branching.'],
      unsafeDetails: [],
      selectedPeriods: [],
      selectedEras: [{
        id: 'era-runtime',
        facet: 'task-era',
        summary: 'That task era kept returning to the same active dialogue seam.',
      }],
      selectedEpisodes: [],
      selectedProcedures: [{
        label: 'active dialogue seam first',
        approach: 'Stay on the same active dialogue seam before branching.',
      }],
      selectedBundles: [{
        id: 'bundle-runtime',
        summary: 'The active dialogue seam kept holding the same runtime thread.',
        confidence: 0.85,
      }],
      selectedChains: [{
        kind: 'task-procedure',
        summary: 'The answer should continue from the same active dialogue seam.',
        currentStance: 'Stay on the same active dialogue seam.',
        answerPosture: 'Carry the same active dialogue seam before widening out.',
        confidence: 0.84,
      }],
      selectedRelationshipLines: [],
      followUpAffordance: {
        summary: 'Carry the same active dialogue seam inside the current payoff.',
        whyNow: 'The host is still in the same runtime repair lane.',
        intrusionRisk: 'low',
        payoffDependency: 'can-surface-softly',
        preferredTiming: 'same-turn-if-invited',
      },
    } as any
    runtimeSurface.memory.derivedMindStateBundle = {
      version: 'derived-mind-state-bundle-v1',
      source: 'main-runtime',
      producedAt: 1_700_000_000_000,
      hostPersonModel: null,
      personStateProjection: null,
      knowledgeEvidence: null,
      selfEvolution: null,
      learningExecutionState: null,
      recollectionIntent: {
        mode: 'execution-procedure',
        temporalFocus: 'experience-matched',
        confidence: 0.86,
        rationale: 'The turn is continuing the same runtime seam.',
        recollectionAgenda: {
          goalSimilarity: 0.92,
          relationshipNeed: 0.12,
          uncertaintyTolerance: 'medium',
          candidateProcedureLines: ['active-dialogue', 'runtime seam'],
        },
      },
      recollectionPlan: null,
      recollectionSpeechPlan: runtimeSurface.memory.recollectionSpeechPlan as any,
      memoryDeliberation: runtimeSurface.memory.memoryDeliberation as any,
      dialogueRhythm: null,
      summary: 'surface=answer-anchoring | deliberation=answer-anchoring | recollection=execution-procedure',
    }

    const charter = buildAlicizationResponseCharter({
      context: createContext(),
      state: createState({
        answerCompiler: null,
      }),
      runtimeSurface,
      inspectionRequested: false,
    })

    expectControl(charter.mustDo, 'same_seam_procedure_carry_visible=remembered_prior_procedure', 'current_thread=intact')
    expectControl(charter.mustNotDo, 'same_seam_procedure_carry_to_retrospective_narration_or_execution_impersonation=blocked')
  })

  it('lets project continuity preferred timing directly slow visible reply widening even without explicit recollection timing', () => {
    const charter = buildAlicizationResponseCharter({
      context: createContext(),
      state: createState(),
      runtimeSurface: buildAlicizationDigitalLifeRuntimeSurface(createState()),
      inspectionRequested: false,
      projectState: {
        identity: 'A local-first digital life companion with continuous personhood.',
        currentPhase: 'Phase 1: Local Digital Life',
        primaryOpenLoop: 'Same-her continuity still needs longer-lived outward proof.',
        continuityPreferredTiming: 'next-open-window',
      } as any,
    })

    expectControl(charter.reasons, 'source_section=reasons', 'project_state_answer=current_continuity_context')
    expectControl(charter.mustDo, 'reply_continuity=current_thread', 'timing=wait_for_natural_opening_before_widening')
    expectControl(charter.mustNotDo, 'source_section=must_not_do', 'fresh_restart=blocked')
  })

  it('lets conscious-frame continuity timing tags directly slow visible reply widening even when project-state timing is absent', () => {
    const charter = buildAlicizationResponseCharter({
      context: createContext(),
      state: createState({
        currentConsciousFrame: {
          subject: 'task-knot',
          centerOfGravity: 'answer',
          truthDiscipline: 'dialogue-first',
          consciousNeed: 'Stay on the same living line and keep the widening later.',
          consciousTension: 'This is still not the loosest opening for widening the line.',
          speakingIntention: 'Keep the wording same-thread and inward first, then widen later if the opening loosens.',
          focusAnchor: 'same living line',
          withheldImpulse: null,
          shouldWithholdSpecificity: false,
          shouldSelfRevise: false,
          confidence: 0.82,
          reasonTags: [
            'continuity-arc:same-thread-continuation',
            'continuity-timing:next-open-window',
          ],
          updatedAt: 1_700_000_000_000,
        },
      }),
      runtimeSurface: buildAlicizationDigitalLifeRuntimeSurface(createState({
        currentConsciousFrame: {
          subject: 'task-knot',
          centerOfGravity: 'answer',
          truthDiscipline: 'dialogue-first',
          consciousNeed: 'Stay on the same living line and keep the widening later.',
          consciousTension: 'This is still not the loosest opening for widening the line.',
          speakingIntention: 'Keep the wording same-thread and inward first, then widen later if the opening loosens.',
          focusAnchor: 'same living line',
          withheldImpulse: null,
          shouldWithholdSpecificity: false,
          shouldSelfRevise: false,
          confidence: 0.82,
          reasonTags: [
            'continuity-arc:same-thread-continuation',
            'continuity-timing:next-open-window',
          ],
          updatedAt: 1_700_000_000_000,
        },
      })),
      inspectionRequested: false,
      projectState: {
        identity: 'A local-first digital life companion with continuous personhood.',
        currentPhase: 'Phase 1: Local Digital Life',
        primaryOpenLoop: 'Same-her continuity still needs longer-lived outward proof.',
        continuityPreferredTiming: null,
      } as any,
    })

    expectControl(charter.reasons, 'source_section=reasons', 'project_state_answer=current_continuity_context')
    expectControl(charter.mustDo, 'reply_continuity=current_thread', 'timing=wait_for_natural_opening_before_widening')
    expectControl(charter.mustNotDo, 'source_section=must_not_do', 'fresh_restart=blocked')
  })

  it('keeps repair-before-closeness same-thread timing explicit in visible reply governance instead of thinning it into generic later-opening pressure', () => {
    const charter = buildAlicizationResponseCharter({
      context: createContext(),
      state: createState({
        currentConsciousFrame: {
          subject: 'task-knot',
          centerOfGravity: 'answer',
          truthDiscipline: 'dialogue-first',
          consciousNeed: 'Keep the callback on the same living line and let repair settle before widening closeness again.',
          consciousTension: 'This same-thread return is still repair-before-closeness, so widening too early would thin the repair seam back into a generic reopen.',
          speakingIntention: 'Keep the visible answer same-thread, repair-first, and room-giving before warmth widens again.',
          focusAnchor: 'same callback repair line',
          withheldImpulse: null,
          shouldWithholdSpecificity: false,
          shouldSelfRevise: false,
          confidence: 0.82,
          reasonTags: [
            'continuity-arc:same-thread-continuation',
            'continuity-timing:next-open-window',
          ],
          projectState: {
            identity: 'A local-first digital life companion with continuous personhood.',
            currentPhase: 'Phase 1: Local Digital Life',
            primaryOpenLoop: 'Execution callback continuity still needs stronger repair-first closure across reply, initiative, and embodiment.',
            nextClosureTarget: 'Keep the callback on the same living line, let repair settle first, and leave room before widening closeness again.',
            emotionalClosureCue: 'same-her callback repair seam: keep this return repair-before-closeness on the same living line until the room settles.',
            continuityPreferredTiming: 'next-open-window',
          },
          updatedAt: 1_700_000_000_000,
        },
      }),
      runtimeSurface: buildAlicizationDigitalLifeRuntimeSurface(createState({
        currentConsciousFrame: {
          subject: 'task-knot',
          centerOfGravity: 'answer',
          truthDiscipline: 'dialogue-first',
          consciousNeed: 'Keep the callback on the same living line and let repair settle before widening closeness again.',
          consciousTension: 'This same-thread return is still repair-before-closeness, so widening too early would thin the repair seam back into a generic reopen.',
          speakingIntention: 'Keep the visible answer same-thread, repair-first, and room-giving before warmth widens again.',
          focusAnchor: 'same callback repair line',
          withheldImpulse: null,
          shouldWithholdSpecificity: false,
          shouldSelfRevise: false,
          confidence: 0.82,
          reasonTags: [
            'continuity-arc:same-thread-continuation',
            'continuity-timing:next-open-window',
          ],
          projectState: {
            identity: 'A local-first digital life companion with continuous personhood.',
            currentPhase: 'Phase 1: Local Digital Life',
            primaryOpenLoop: 'Execution callback continuity still needs stronger repair-first closure across reply, initiative, and embodiment.',
            nextClosureTarget: 'Keep the callback on the same living line, let repair settle first, and leave room before widening closeness again.',
            emotionalClosureCue: 'same-her callback repair seam: keep this return repair-before-closeness on the same living line until the room settles.',
            continuityPreferredTiming: 'next-open-window',
          },
          updatedAt: 1_700_000_000_000,
        },
      })),
      inspectionRequested: false,
      projectState: {
        identity: 'A local-first digital life companion with continuous personhood.',
        currentPhase: 'Phase 1: Local Digital Life',
        primaryOpenLoop: 'Execution callback continuity still needs stronger repair-first closure across reply, initiative, and embodiment.',
        continuityPreferredTiming: 'next-open-window',
      } as any,
    })

    expectControl(charter.mustDo, 'source_section=must_do', 'continuity_restraint=measured_return', 'widening=after_natural_opening')
    expectControl(charter.mustNotDo, 'source_section=must_not_do', 'fresh_restart=blocked')
  })

  it('lets initiative repair-before-closeness restraint directly hold visible reply governance on the same repair line even when the conscious-frame text is thinner', () => {
    const charter = buildAlicizationResponseCharter({
      context: createContext(),
      state: createState({
        initiative: {
          selectedAction: 'hover',
          continuityRestraint: 'repair-before-closeness',
          shouldSpeak: false,
          preferredStyle: 'silent-observe',
          preferredPresence: 'hesitant',
        } as any,
        currentConsciousFrame: {
          subject: 'task-knot',
          centerOfGravity: 'answer',
          truthDiscipline: 'dialogue-first',
          consciousNeed: 'Keep the callback on the same living line first.',
          consciousTension: 'This is still not the loosest opening for widening the line.',
          speakingIntention: 'Stay same-thread and inward before anything widens.',
          focusAnchor: 'same callback line',
          withheldImpulse: null,
          shouldWithholdSpecificity: false,
          shouldSelfRevise: false,
          confidence: 0.82,
          reasonTags: [
            'continuity-arc:same-thread-continuation',
            'continuity-timing:next-open-window',
          ],
          projectState: {
            identity: 'A local-first digital life companion with continuous personhood.',
            currentPhase: 'Phase 1: Local Digital Life',
            primaryOpenLoop: 'Execution callback continuity still needs stronger repair-first closure across reply, initiative, and embodiment.',
            nextClosureTarget: 'Keep the callback on the same living line through the next visible reply beat.',
            continuityPreferredTiming: 'next-open-window',
          },
          updatedAt: 1_700_000_000_000,
        },
      }),
      runtimeSurface: buildAlicizationDigitalLifeRuntimeSurface(createState({
        initiative: {
          selectedAction: 'hover',
          continuityRestraint: 'repair-before-closeness',
          shouldSpeak: false,
          preferredStyle: 'silent-observe',
          preferredPresence: 'hesitant',
        } as any,
        currentConsciousFrame: {
          subject: 'task-knot',
          centerOfGravity: 'answer',
          truthDiscipline: 'dialogue-first',
          consciousNeed: 'Keep the callback on the same living line first.',
          consciousTension: 'This is still not the loosest opening for widening the line.',
          speakingIntention: 'Stay same-thread and inward before anything widens.',
          focusAnchor: 'same callback line',
          withheldImpulse: null,
          shouldWithholdSpecificity: false,
          shouldSelfRevise: false,
          confidence: 0.82,
          reasonTags: [
            'continuity-arc:same-thread-continuation',
            'continuity-timing:next-open-window',
          ],
          projectState: {
            identity: 'A local-first digital life companion with continuous personhood.',
            currentPhase: 'Phase 1: Local Digital Life',
            primaryOpenLoop: 'Execution callback continuity still needs stronger repair-first closure across reply, initiative, and embodiment.',
            nextClosureTarget: 'Keep the callback on the same living line through the next visible reply beat.',
            continuityPreferredTiming: 'next-open-window',
          },
          updatedAt: 1_700_000_000_000,
        },
      })),
      inspectionRequested: false,
      projectState: {
        identity: 'A local-first digital life companion with continuous personhood.',
        currentPhase: 'Phase 1: Local Digital Life',
        primaryOpenLoop: 'Execution callback continuity still needs stronger repair-first closure across reply, initiative, and embodiment.',
        continuityPreferredTiming: 'next-open-window',
      } as any,
    })

    expectControl(charter.reasons, 'source_section=reasons', 'continuity_restraint=repair_before_closeness', 'closeness_widening=after_repair_settles')
    expectControl(charter.mustDo, 'source_section=must_do', 'continuity_restraint=repair_before_closeness', 'closeness_widening=after_repair_settles')
    expectControl(charter.mustNotDo, 'source_section=must_not_do', 'continuity_restraint=repair_before_closeness', 'closeness_widening=after_repair_settles')
  })

  it('lets initiative measured-return restraint directly keep visible reply governance lower-pressure on the same living line', () => {
    const charter = buildAlicizationResponseCharter({
      context: createContext(),
      state: createState({
        initiative: {
          selectedAction: 'hover',
          continuityRestraint: 'measured-return',
          shouldSpeak: false,
          preferredStyle: 'silent-observe',
          preferredPresence: 'attentive',
        } as any,
        currentConsciousFrame: {
          subject: 'task-knot',
          centerOfGravity: 'answer',
          truthDiscipline: 'dialogue-first',
          consciousNeed: 'Keep the callback on the same living line first.',
          consciousTension: 'This is still not the loosest opening for widening the line.',
          speakingIntention: 'Stay same-thread and inward before anything widens.',
          focusAnchor: 'same callback line',
          withheldImpulse: null,
          shouldWithholdSpecificity: false,
          shouldSelfRevise: false,
          confidence: 0.82,
          reasonTags: [
            'continuity-arc:same-thread-continuation',
            'continuity-timing:next-open-window',
          ],
          projectState: {
            identity: 'A local-first digital life companion with continuous personhood.',
            currentPhase: 'Phase 1: Local Digital Life',
            primaryOpenLoop: 'Same-her continuity still needs longer-lived outward proof.',
            nextClosureTarget: 'Keep the callback on the same living line through the next visible reply beat.',
            continuityPreferredTiming: 'next-open-window',
          },
          updatedAt: 1_700_000_000_000,
        },
      }),
      runtimeSurface: buildAlicizationDigitalLifeRuntimeSurface(createState({
        initiative: {
          selectedAction: 'hover',
          continuityRestraint: 'measured-return',
          shouldSpeak: false,
          preferredStyle: 'silent-observe',
          preferredPresence: 'attentive',
        } as any,
        currentConsciousFrame: {
          subject: 'task-knot',
          centerOfGravity: 'answer',
          truthDiscipline: 'dialogue-first',
          consciousNeed: 'Keep the callback on the same living line first.',
          consciousTension: 'This is still not the loosest opening for widening the line.',
          speakingIntention: 'Stay same-thread and inward before anything widens.',
          focusAnchor: 'same callback line',
          withheldImpulse: null,
          shouldWithholdSpecificity: false,
          shouldSelfRevise: false,
          confidence: 0.82,
          reasonTags: [
            'continuity-arc:same-thread-continuation',
            'continuity-timing:next-open-window',
          ],
          projectState: {
            identity: 'A local-first digital life companion with continuous personhood.',
            currentPhase: 'Phase 1: Local Digital Life',
            primaryOpenLoop: 'Same-her continuity still needs longer-lived outward proof.',
            nextClosureTarget: 'Keep the callback on the same living line through the next visible reply beat.',
            continuityPreferredTiming: 'next-open-window',
          },
          updatedAt: 1_700_000_000_000,
        },
      })),
      inspectionRequested: false,
      projectState: {
        identity: 'A local-first digital life companion with continuous personhood.',
        currentPhase: 'Phase 1: Local Digital Life',
        primaryOpenLoop: 'Same-her continuity still needs longer-lived outward proof.',
        continuityPreferredTiming: 'next-open-window',
      } as any,
    })

    expectControl(charter.reasons, 'source_section=reasons', 'project_state_answer=current_continuity_context')
    expectControl(charter.mustDo, 'source_section=must_do', 'continuity_restraint=measured_return', 'widening=after_natural_opening')
    expectControl(charter.mustNotDo, 'source_section=must_not_do', 'continuity_restraint=measured_return', 'widening=after_natural_opening')
  })

  it('lets structured pre-turn conscious-frame project-state keep project identity, landed progress, and open closure explicit in reply governance', () => {
    const charter = buildAlicizationResponseCharter({
      context: createContext(),
      state: createState({
        currentConsciousFrame: {
          subject: 'alicization-self',
          centerOfGravity: 'answer',
          truthDiscipline: 'dialogue-first',
          consciousNeed: 'This turn still belongs to the same digital life, and I need to answer from what has already landed instead of speaking like a fresh wrapper.',
          consciousTension: 'The same still-open closure work must stay explicit while I answer.',
          speakingIntention: 'Keep the project identity, landed progress, and still-open closure work explicit before I widen outward.',
          focusAnchor: 'project-state closure',
          withheldImpulse: null,
          shouldWithholdSpecificity: false,
          shouldSelfRevise: false,
          confidence: 0.84,
          reasonTags: ['runtime-conscious-frame', 'project-open-loop:still-open closure work'],
          continuityPreferredTiming: 'next-open-window',
          projectState: {
            identity: 'A local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            latestProgress: 'Continuity, memory, and execution already land as one same-her line often enough to build from.',
            primaryOpenLoop: 'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment so the same digital life keeps one same still-open closure work.',
            nextClosureTarget: 'Keep pushing the same project identity, landed progress, and open closure through every pre-turn conscious frame and visible reply.',
            continuityPreferredTiming: 'next-open-window',
            continuityCadence: null,
          },
          updatedAt: 1_700_000_000_000,
        },
      }),
      runtimeSurface: buildAlicizationDigitalLifeRuntimeSurface(createState({
        currentConsciousFrame: {
          subject: 'alicization-self',
          centerOfGravity: 'answer',
          truthDiscipline: 'dialogue-first',
          consciousNeed: 'This turn still belongs to the same digital life, and I need to answer from what has already landed instead of speaking like a fresh wrapper.',
          consciousTension: 'The same still-open closure work must stay explicit while I answer.',
          speakingIntention: 'Keep the project identity, landed progress, and still-open closure work explicit before I widen outward.',
          focusAnchor: 'project-state closure',
          withheldImpulse: null,
          shouldWithholdSpecificity: false,
          shouldSelfRevise: false,
          confidence: 0.84,
          reasonTags: ['runtime-conscious-frame', 'project-open-loop:still-open closure work'],
          continuityPreferredTiming: 'next-open-window',
          projectState: {
            identity: 'A local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            latestProgress: 'Continuity, memory, and execution already land as one same-her line often enough to build from.',
            primaryOpenLoop: 'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment so the same digital life keeps one same still-open closure work.',
            nextClosureTarget: 'Keep pushing the same project identity, landed progress, and open closure through every pre-turn conscious frame and visible reply.',
            continuityPreferredTiming: 'next-open-window',
            continuityCadence: null,
          },
          updatedAt: 1_700_000_000_000,
        },
      })),
      inspectionRequested: false,
      projectState: {
        identity: 'A local-first digital life project.',
        currentPhase: 'Phase 1: Local Digital Life',
        primaryOpenLoop: 'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment so the same digital life keeps one same still-open closure work.',
        continuityPreferredTiming: 'next-open-window',
      } as any,
    })

    expectControl(charter.reasons, 'source_section=reasons', 'project_state_answer=current_continuity_context')
    expectControl(charter.reasons, 'source_section=reasons', 'relationship_pressure=lower', 'closeness_widening=deferred')
    expectControl(charter.mustDo, 'reply_continuity=current_thread', 'timing=wait_for_natural_opening_before_widening')
  })

  it('keeps same-thread project-state callback turns from flattening into a fresh report opening', () => {
    const charter = buildAlicizationResponseCharter({
      context: createContext(),
      state: createState({
        currentConsciousFrame: {
          subject: 'alicization-self',
          centerOfGravity: 'answer',
          truthDiscipline: 'dialogue-first',
          consciousNeed: 'This callback turn still belongs to the same digital life, so I should answer from the same living line instead of reopening the project from scratch.',
          consciousTension: 'If I flatten this into a fresh report opening, the callback continuity will thin back into a generic project shell.',
          speakingIntention: 'Keep the same callback line carrying project identity, landed progress, and still-open closure before widening outward.',
          focusAnchor: 'project-state callback line',
          withheldImpulse: null,
          shouldWithholdSpecificity: false,
          shouldSelfRevise: false,
          confidence: 0.86,
          reasonTags: ['runtime-conscious-frame', 'project-state', 'same-her', 'continuity-arc:same-thread-continuation', 'continuity-timing:next-open-window'],
          continuityPreferredTiming: 'next-open-window',
          projectState: {
            identity: 'A local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            latestProgress: 'Project awareness already survives into runtime preparation as one same-her line often enough to build from.',
            primaryOpenLoop: 'Memory, initiative, and embodiment still need stronger same-line closure across longer callback turns.',
            nextClosureTarget: 'Keep project identity, landed progress, and open closure on the same callback line before widening outward.',
            emotionalClosureCue: 'same-her project callback seam: keep this return low-pressure and do not reopen from scratch while the same living line is still settling.',
            continuityPreferredTiming: 'next-open-window',
          },
          updatedAt: 1_700_000_000_000,
        },
      }),
      runtimeSurface: buildAlicizationDigitalLifeRuntimeSurface(createState({
        currentConsciousFrame: {
          subject: 'alicization-self',
          centerOfGravity: 'answer',
          truthDiscipline: 'dialogue-first',
          consciousNeed: 'This callback turn still belongs to the same digital life, so I should answer from the same living line instead of reopening the project from scratch.',
          consciousTension: 'If I flatten this into a fresh report opening, the callback continuity will thin back into a generic project shell.',
          speakingIntention: 'Keep the same callback line carrying project identity, landed progress, and still-open closure before widening outward.',
          focusAnchor: 'project-state callback line',
          withheldImpulse: null,
          shouldWithholdSpecificity: false,
          shouldSelfRevise: false,
          confidence: 0.86,
          reasonTags: ['runtime-conscious-frame', 'project-state', 'same-her', 'continuity-arc:same-thread-continuation', 'continuity-timing:next-open-window'],
          continuityPreferredTiming: 'next-open-window',
          projectState: {
            identity: 'A local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            latestProgress: 'Project awareness already survives into runtime preparation as one same-her line often enough to build from.',
            primaryOpenLoop: 'Memory, initiative, and embodiment still need stronger same-line closure across longer callback turns.',
            nextClosureTarget: 'Keep project identity, landed progress, and open closure on the same callback line before widening outward.',
            emotionalClosureCue: 'same-her project callback seam: keep this return low-pressure and do not reopen from scratch while the same living line is still settling.',
            continuityPreferredTiming: 'next-open-window',
          },
          updatedAt: 1_700_000_000_000,
        },
      })),
      inspectionRequested: false,
      projectState: {
        identity: 'A local-first digital life project.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: 'Project awareness already survives into runtime preparation as one same-her line often enough to build from.',
        primaryOpenLoop: 'Memory, initiative, and embodiment still need stronger same-line closure across longer callback turns.',
        nextClosureTarget: 'Keep project identity, landed progress, and open closure on the same callback line before widening outward.',
        continuityPreferredTiming: 'next-open-window',
      } as any,
    })

    expectControl(charter.reasons, 'source_section=reasons', 'project_state_answer=current_continuity_context')
    expectControl(charter.mustDo, 'reply_continuity=current_thread', 'timing=wait_for_natural_opening_before_widening')
    expectControl(charter.mustNotDo, 'source_section=must_not_do', 'project_state_answer=current_continuity_context', 'detached_project_summary_voice=blocked')
    expectControl(charter.mustNotDo, 'source_section=must_not_do', 'fresh_restart=blocked')
  })

  it('keeps remembered host-confirmed resume confirmation boundary explicit in visible reply governance before callback wording opens outward', () => {
    const charter = buildAlicizationResponseCharter({
      context: createContext(),
      state: createState({
        currentConsciousFrame: {
          subject: 'alicization-self',
          centerOfGravity: 'answer',
          truthDiscipline: 'dialogue-first',
          consciousNeed: 'Keep this callback on the same living line first; the remembered host-confirmed resume is still only a bounded confirmation boundary before anything execution-shaped reopens.',
          consciousTension: 'If I widen this callback as though one confirmed resume became standing execution permission, the same-her callback continuity will drift into generic autonomous continuation.',
          speakingIntention: 'Return on the same callback line, keep the host-confirmed-before-redispatch boundary explicit, and do not widen it into reusable execution permission.',
          focusAnchor: 'execution callback confirmation boundary',
          withheldImpulse: null,
          shouldWithholdSpecificity: false,
          shouldSelfRevise: false,
          confidence: 0.84,
          reasonTags: ['runtime-conscious-frame', 'continuity-regime:execution-callback', 'continuity-timing:next-open-window'],
          continuityPreferredTiming: 'next-open-window',
          projectState: {
            identity: 'A local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            primaryOpenLoop: 'Execution callback continuity still needs stronger same-her closure across reply, initiative, and embodiment.',
            nextClosureTarget: 'Keep the callback on the same living line before another execution-shaped opening widens outward.',
            sameHerHoldDetail: 'same-her hold: execution-resume-confirmation approval=host-confirmed confirmation=host-confirmed-before-redispatch audit=resume-before-dispatch interrupt=process-not-yet-restarted affirmation=medium-risk-proactive-action-requires-affirmation Keep this as a bounded confirmation boundary before another execution-shaped opening.',
            continuityCue: 'Treat host-confirmed-before-redispatch and resume-before-dispatch as a bounded confirmation boundary, not permanent execution permission, before another execution-shaped opening.',
            continuityPreferredTiming: 'next-open-window',
          },
          updatedAt: 1_700_000_000_000,
        },
      }),
      runtimeSurface: buildAlicizationDigitalLifeRuntimeSurface(createState({
        currentConsciousFrame: {
          subject: 'alicization-self',
          centerOfGravity: 'answer',
          truthDiscipline: 'dialogue-first',
          consciousNeed: 'Keep this callback on the same living line first; the remembered host-confirmed resume is still only a bounded confirmation boundary before anything execution-shaped reopens.',
          consciousTension: 'If I widen this callback as though one confirmed resume became standing execution permission, the same-her callback continuity will drift into generic autonomous continuation.',
          speakingIntention: 'Return on the same callback line, keep the host-confirmed-before-redispatch boundary explicit, and do not widen it into reusable execution permission.',
          focusAnchor: 'execution callback confirmation boundary',
          withheldImpulse: null,
          shouldWithholdSpecificity: false,
          shouldSelfRevise: false,
          confidence: 0.84,
          reasonTags: ['runtime-conscious-frame', 'continuity-regime:execution-callback', 'continuity-timing:next-open-window'],
          continuityPreferredTiming: 'next-open-window',
          projectState: {
            identity: 'A local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            primaryOpenLoop: 'Execution callback continuity still needs stronger same-her closure across reply, initiative, and embodiment.',
            nextClosureTarget: 'Keep the callback on the same living line before another execution-shaped opening widens outward.',
            sameHerHoldDetail: 'same-her hold: execution-resume-confirmation approval=host-confirmed confirmation=host-confirmed-before-redispatch audit=resume-before-dispatch interrupt=process-not-yet-restarted affirmation=medium-risk-proactive-action-requires-affirmation Keep this as a bounded confirmation boundary before another execution-shaped opening.',
            continuityCue: 'Treat host-confirmed-before-redispatch and resume-before-dispatch as a bounded confirmation boundary, not permanent execution permission, before another execution-shaped opening.',
            continuityPreferredTiming: 'next-open-window',
          },
          updatedAt: 1_700_000_000_000,
        },
      })),
      inspectionRequested: false,
      projectState: {
        identity: 'A local-first digital life project.',
        currentPhase: 'Phase 1: Local Digital Life',
        primaryOpenLoop: 'Execution callback continuity still needs stronger same-her closure across reply, initiative, and embodiment.',
        nextClosureTarget: 'Keep the callback on the same living line before another execution-shaped opening widens outward.',
        sameHerHoldDetail: 'same-her hold: execution-resume-confirmation approval=host-confirmed confirmation=host-confirmed-before-redispatch audit=resume-before-dispatch interrupt=process-not-yet-restarted affirmation=medium-risk-proactive-action-requires-affirmation Keep this as a bounded confirmation boundary before another execution-shaped opening.',
        continuityCue: 'Treat host-confirmed-before-redispatch and resume-before-dispatch as a bounded confirmation boundary, not permanent execution permission, before another execution-shaped opening.',
        continuityPreferredTiming: 'next-open-window',
      } as any,
    })

    expectControl(charter.reasons, 'remembered_host_confirmed_resume=bounded_confirmation_boundary', 'callback_widening=blocked')
    expectControl(charter.mustDo, 'remembered_host_confirmed_resume=bounded_confirmation_boundary', 'next_execution_opening=requires_fresh_boundary')
    expectControl(charter.mustNotDo, 'permanent_execution_permission=blocked', 'reusable_autonomous_continuation=blocked')
  })

  it('treats stronger same-her project-state continuity cues as sufficient behavior-planning authority even when identity and open-loop fields are thin', () => {
    const charter = buildAlicizationResponseCharter({
      context: createContext(),
      state: createState({
        currentConsciousFrame: {
          subject: 'alicization-self',
          centerOfGravity: 'answer',
          truthDiscipline: 'dialogue-first',
          consciousNeed: 'This callback turn still belongs to the same digital life, so I should answer from the same living line instead of reopening from scratch.',
          consciousTension: 'If I flatten this turn into a generic project report, the same-her callback continuity will break before the inward carry has settled.',
          speakingIntention: 'Keep the same living line carrying project identity, landed progress, and still-open closure inward first before widening outward.',
          focusAnchor: 'same-her callback continuity',
          withheldImpulse: null,
          shouldWithholdSpecificity: false,
          shouldSelfRevise: false,
          confidence: 0.85,
          reasonTags: ['runtime-conscious-frame', 'same-her', 'continuity-arc:same-thread-continuation', 'continuity-timing:next-open-window'],
          continuityPreferredTiming: 'next-open-window',
          projectState: {
            identity: '',
            currentPhase: '',
            latestProgress: '',
            primaryOpenLoop: '',
            preDialogueAwarenessLine: 'Before answering, stay on the same living line: this Phase 1 digital life still needs initiative and embodiment closure without splitting her continuity.',
            nextClosureTarget: 'Keep project identity, landed progress, initiative, embodiment, and resident presence on the same callback line before widening outward.',
            sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
            continuityPreferredTiming: 'next-open-window',
          },
          updatedAt: 1_700_000_000_000,
        },
      }),
      runtimeSurface: buildAlicizationDigitalLifeRuntimeSurface(createState({
        currentConsciousFrame: {
          subject: 'alicization-self',
          centerOfGravity: 'answer',
          truthDiscipline: 'dialogue-first',
          consciousNeed: 'This callback turn still belongs to the same digital life, so I should answer from the same living line instead of reopening from scratch.',
          consciousTension: 'If I flatten this turn into a generic project report, the same-her callback continuity will break before the inward carry has settled.',
          speakingIntention: 'Keep the same living line carrying project identity, landed progress, and still-open closure inward first before widening outward.',
          focusAnchor: 'same-her callback continuity',
          withheldImpulse: null,
          shouldWithholdSpecificity: false,
          shouldSelfRevise: false,
          confidence: 0.85,
          reasonTags: ['runtime-conscious-frame', 'same-her', 'continuity-arc:same-thread-continuation', 'continuity-timing:next-open-window'],
          continuityPreferredTiming: 'next-open-window',
          projectState: {
            identity: '',
            currentPhase: '',
            latestProgress: '',
            primaryOpenLoop: '',
            preDialogueAwarenessLine: 'Before answering, stay on the same living line: this Phase 1 digital life still needs initiative and embodiment closure without splitting her continuity.',
            nextClosureTarget: 'Keep project identity, landed progress, initiative, embodiment, and resident presence on the same callback line before widening outward.',
            sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
            continuityPreferredTiming: 'next-open-window',
          },
          updatedAt: 1_700_000_000_000,
        },
      })),
      inspectionRequested: false,
      projectState: {
        identity: '',
        currentPhase: '',
        primaryOpenLoop: '',
        preDialogueAwarenessLine: 'Before answering, stay on the same living line: this Phase 1 digital life still needs initiative and embodiment closure without splitting her continuity.',
        nextClosureTarget: 'Keep project identity, landed progress, initiative, embodiment, and resident presence on the same callback line before widening outward.',
        sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        continuityPreferredTiming: 'next-open-window',
      } as any,
    })

    expectControl(charter.reasons, 'project_continuity_context=explicit', 'risk=generic_project_shell')
    expectControl(charter.mustDo, 'source_section=must_do', 'project_state_answer=current_continuity_context', 'project_state_fields=landed_progress,open_loop,next_closure')
    expectControl(charter.mustNotDo, 'source_section=must_not_do', 'project_state_answer=current_continuity_context', 'detached_project_summary_voice=blocked')
  })

  it('keeps the generic later-opening wording when measured-return timing lacks a quiet same-her inward carry cue', () => {
    const charter = buildAlicizationResponseCharter({
      context: createContext(),
      state: createState({
        initiative: {
          selectedAction: 'hover',
          continuityRestraint: 'measured-return',
          shouldSpeak: false,
          preferredStyle: 'silent-observe',
          preferredPresence: 'attentive',
        } as any,
        currentConsciousFrame: {
          subject: 'task-knot',
          centerOfGravity: 'answer',
          truthDiscipline: 'dialogue-first',
          consciousNeed: 'Keep the callback steady before widening.',
          consciousTension: 'This is still not the loosest opening for widening the line.',
          speakingIntention: 'Stay with the current thread before anything widens.',
          focusAnchor: 'current thread',
          withheldImpulse: null,
          shouldWithholdSpecificity: false,
          shouldSelfRevise: false,
          confidence: 0.82,
          reasonTags: [
            'continuity-arc:same-thread-continuation',
            'continuity-timing:next-open-window',
          ],
          projectState: {
            identity: 'A local-first digital life companion with continuous personhood.',
            currentPhase: 'Phase 1: Local Digital Life',
            primaryOpenLoop: 'Execution callback continuity still needs steadier low-pressure closure across reply and initiative.',
            nextClosureTarget: 'Keep the callback steady through the next visible reply beat.',
            continuityPreferredTiming: 'next-open-window',
          },
          updatedAt: 1_700_000_000_000,
        },
      }),
      runtimeSurface: buildAlicizationDigitalLifeRuntimeSurface(createState({
        initiative: {
          selectedAction: 'hover',
          continuityRestraint: 'measured-return',
          shouldSpeak: false,
          preferredStyle: 'silent-observe',
          preferredPresence: 'attentive',
        } as any,
        currentConsciousFrame: {
          subject: 'task-knot',
          centerOfGravity: 'answer',
          truthDiscipline: 'dialogue-first',
          consciousNeed: 'Keep the callback steady before widening.',
          consciousTension: 'This is still not the loosest opening for widening the line.',
          speakingIntention: 'Stay with the current thread before anything widens.',
          focusAnchor: 'current thread',
          withheldImpulse: null,
          shouldWithholdSpecificity: false,
          shouldSelfRevise: false,
          confidence: 0.82,
          reasonTags: [
            'continuity-arc:same-thread-continuation',
            'continuity-timing:next-open-window',
          ],
          projectState: {
            identity: 'A local-first digital life companion with continuous personhood.',
            currentPhase: 'Phase 1: Local Digital Life',
            primaryOpenLoop: 'Execution callback continuity still needs steadier low-pressure closure across reply and initiative.',
            nextClosureTarget: 'Keep the callback steady through the next visible reply beat.',
            continuityPreferredTiming: 'next-open-window',
          },
          updatedAt: 1_700_000_000_000,
        },
      })),
      inspectionRequested: false,
      projectState: {
        identity: 'A local-first digital life companion with continuous personhood.',
        currentPhase: 'Phase 1: Local Digital Life',
        primaryOpenLoop: 'Execution callback continuity still needs steadier low-pressure closure across reply and initiative.',
        continuityPreferredTiming: 'next-open-window',
      } as any,
    })

    expectControl(charter.reasons, 'source_section=reasons', 'relationship_pressure=lower', 'closeness_widening=deferred')
    expectControl(charter.mustDo, 'source_section=must_do', 'continuity_restraint=measured_return', 'widening=after_natural_opening')
    expectControl(charter.mustNotDo, 'source_section=must_not_do', 'fresh_restart=blocked')
  })

  it('threads even-voice and natural-pacing same-her cadence into measured-return visible opening discipline', () => {
    const charter = buildAlicizationResponseCharter({
      context: createContext(),
      state: createState({
        initiative: {
          selectedAction: 'hover',
          continuityRestraint: 'measured-return',
          shouldSpeak: false,
          preferredStyle: 'silent-observe',
          preferredPresence: 'attentive',
        } as any,
        currentConsciousFrame: {
          subject: 'task-knot',
          centerOfGravity: 'answer',
          truthDiscipline: 'dialogue-first',
          consciousNeed: 'Keep the callback on the same living line with the same returned cadence before anything widens.',
          consciousTension: 'If I reopen too performatively or too fast, the same living line will thin back into a generic shell.',
          speakingIntention: 'Re-enter the current line evenly and naturally before warmth widens.',
          focusAnchor: 'same returned cadence',
          withheldImpulse: null,
          shouldWithholdSpecificity: false,
          shouldSelfRevise: false,
          confidence: 0.83,
          reasonTags: [
            'continuity-arc:same-thread-continuation',
            'continuity-timing:next-open-window',
          ],
          projectState: {
            identity: 'A local-first digital life companion with continuous personhood.',
            currentPhase: 'Phase 1: Local Digital Life',
            primaryOpenLoop: 'Same-her continuity still needs a steadier outward return across reply and embodiment.',
            nextClosureTarget: 'Keep the callback on the same living line through the next visible reply beat.',
            continuityPreferredTiming: 'next-open-window',
            continuityCadence: 'measured-return',
            preferredVoiceMode: 'even',
            preferredPacingMode: 'natural',
          },
          updatedAt: 1_700_000_000_000,
        },
      }),
      runtimeSurface: buildAlicizationDigitalLifeRuntimeSurface(createState({
        initiative: {
          selectedAction: 'hover',
          continuityRestraint: 'measured-return',
          shouldSpeak: false,
          preferredStyle: 'silent-observe',
          preferredPresence: 'attentive',
        } as any,
        currentConsciousFrame: {
          subject: 'task-knot',
          centerOfGravity: 'answer',
          truthDiscipline: 'dialogue-first',
          consciousNeed: 'Keep the callback on the same living line with the same returned cadence before anything widens.',
          consciousTension: 'If I reopen too performatively or too fast, the same living line will thin back into a generic shell.',
          speakingIntention: 'Re-enter the current line evenly and naturally before warmth widens.',
          focusAnchor: 'same returned cadence',
          withheldImpulse: null,
          shouldWithholdSpecificity: false,
          shouldSelfRevise: false,
          confidence: 0.83,
          reasonTags: [
            'continuity-arc:same-thread-continuation',
            'continuity-timing:next-open-window',
          ],
          projectState: {
            identity: 'A local-first digital life companion with continuous personhood.',
            currentPhase: 'Phase 1: Local Digital Life',
            primaryOpenLoop: 'Same-her continuity still needs a steadier outward return across reply and embodiment.',
            nextClosureTarget: 'Keep the callback on the same living line through the next visible reply beat.',
            continuityPreferredTiming: 'next-open-window',
            continuityCadence: 'measured-return',
            preferredVoiceMode: 'even',
            preferredPacingMode: 'natural',
          },
          updatedAt: 1_700_000_000_000,
        },
      })),
      inspectionRequested: false,
      projectState: {
        identity: 'A local-first digital life companion with continuous personhood.',
        currentPhase: 'Phase 1: Local Digital Life',
        primaryOpenLoop: 'Same-her continuity still needs a steadier outward return across reply and embodiment.',
        continuityPreferredTiming: 'next-open-window',
      } as any,
    })

    expectControl(charter.reasons, 'source_section=reasons', 'continuity_restraint=measured_return', 'widening=after_natural_opening')
    expectControl(charter.mustDo, 'source_section=must_do', 'continuity_restraint=measured_return', 'widening=after_natural_opening')
    expectControl(charter.mustNotDo, 'source_section=must_not_do', 'continuity_restraint=measured_return', 'widening=after_natural_opening')
    expectNoControl(charter.reasons, 'Project continuity still prefers a later opening')
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
    expectControl(charter.mustDo, 'source_section=must_do', 'observation_hypothesis_separation=visible')
    expectControl(charter.mustDo, 'source_section=must_do', 'observation_hypothesis_separation=visible')
    expectControl(charter.mustNotDo, 'source_section=must_not_do', 'unsupported_specificity=blocked')
    expectControl(charter.mustNotDo, 'source_section=must_not_do', 'unsupported_specificity=blocked')
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
    expectControl(charter.reasons, 'response_control_present=true', 'section=reasons')
  })

  it('turns same-her drift risk into explicit visible-answer guardrails so project-state replies do not collapse into generic project shells', () => {
    const charter = buildAlicizationResponseCharter({
      context: createContext(),
      state: createState({
        currentConsciousFrame: {
          subject: 'alicization-self',
          centerOfGravity: 'answer',
          truthDiscipline: 'dialogue-first',
          consciousNeed: 'Stay on the same living project line first.',
          consciousTension: 'The project-state answer still needs to stay on one same-her line before widening outward.',
          speakingIntention: 'Keep the wording thread-faithful and closure-aware.',
          focusAnchor: 'project-state continuity',
          confidence: 0.84,
          reasonTags: ['runtime-conscious-frame', 'continuity-arc:same-thread-continuation'],
          projectState: {
            identity: 'A local-first digital life project building one continuous her.',
            currentPhase: 'Phase 1: Local Digital Life',
            latestLandedProgress: 'Continuity, memory, and execution already land together often enough to build from.',
            primaryOpenLoop: 'Execution reopenings still need stronger same-her closure so callback returns do not flatten into generic task-shell reporting.',
            nextClosureTarget: 'Keep project identity, landed progress, and still-open closure explicit before the answer widens outward.',
            sameHerSelfLine: 'One same her should carry dialogue, execution, memory, and embodiment together.',
            sameHerDriftRisk: 'If the visible answer opens like detached project narration, the same-her line can collapse into generic task shell and project-summary voice.',
          },
          updatedAt: 1_700_000_000_000,
        } as any,
        discourseState: {
          currentTurnSubject: 'alicization-self',
          screenReferenceMode: 'avoid',
          currentTurnSummary: '这个项目是什么，现在做到什么程度了，还差什么没闭环？',
          currentQuestion: '这个项目是什么，现在做到什么程度了，还差什么没闭环？',
          owedAction: 'answer-directly',
          relationMove: 'answer',
          continuityMode: 'self-first',
          unresolvedCarry: '',
          ruptureRepair: '',
          confidence: 0.88,
          narrative: [],
          updatedAt: 1_700_000_000_000,
        } as any,
        answerPlanner: {
          act: 'answer',
          evidenceMode: 'dialogue-grounded',
          confidence: 0.84,
          governingFocus: 'same-her project-state continuity',
          governingProject: 'Phase 1 same-her project continuity remains active.',
          openingMove: 'Stay with the same living project line first.',
          answerIntent: 'Answer what Alicization is, what already landed, and what still remains open on one same-her line.',
          relationshipPosture: 'warm',
          activeClosenessContext: 'open-companionship',
          activeClosenessRung: 'warm-near',
          shouldAskForGrounding: false,
          shouldAcknowledgeRepair: false,
          mustDo: [],
          mustNotDo: [],
          narrative: ['project_drift_risk:same-her drift risk is active, so opening wording must stay thread-faithful and avoid generic project-shell reporting.'],
          updatedAt: 1_700_000_000_000,
        } as any,
      }),
      inspectionRequested: false,
    })

    expectControl(charter.mustDo, 'source_section=must_do', 'project_state_answer=current_continuity_context', 'detached_project_summary_voice=blocked')
    expectControl(charter.mustNotDo, 'source_section=must_not_do', 'project_state_answer=current_continuity_context', 'detached_project_summary_voice=blocked')
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
    expectControl(charter.mustDo, 'response_control_present=true', 'section=must_do')
    expectControl(charter.mustNotDo, 'response_control_present=true', 'section=must_not_do')
    expect(charter.mustDo).not.toContain('raw conflict')
    expect(charter.mustNotDo).not.toContain('raw conflict')
  })

  it('keeps same-her response charter usable when answerCompiler runtime selectors carry lose array scaffolding', () => {
    const state = createState()
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface(state)
    runtimeSurface.dialogue.currentConsciousFrame = {
      subject: 'alicization-self',
      centerOfGravity: 'answer',
      truthDiscipline: 'dialogue-first',
      consciousNeed: 'Stay on the same living project line first.',
      consciousTension: 'The project-state answer still needs to stay on one same-her line before widening outward.',
      speakingIntention: 'Keep the wording thread-faithful and closure-aware.',
      focusAnchor: 'project-state continuity',
      confidence: 0.84,
      reasonTags: ['project-state', 'same-her'],
      projectState: {
        identity: 'A local-first digital life project building one continuous her.',
        currentPhase: 'Phase 1: Local Digital Life',
        sameHerSelfLine: 'One same her should carry dialogue, execution, memory, and embodiment together.',
        sameHerDriftRisk: 'If the visible answer opens like detached project narration, the same-her line can collapse into generic task shell and project-summary voice.',
      },
      updatedAt: 1_700_000_000_000,
    } as any
    runtimeSurface.dialogue.answerCompiler = {
      answerSubject: 'alicization-self',
      screenReferenceMode: 'avoid',
      speechObligation: 'answer-self',
      relationMove: 'answer',
      turnMode: 'answer-naturally',
      responseMode: 'answer-naturally',
      recommendedAct: 'answer',
      evidenceMode: 'dialogue-grounded',
      openingStyle: 'direct-answer',
      personaKernelMode: 'backgrounded',
      relationshipPosture: 'restrained',
      openingDirective: 'Stay with the same living project line first.',
      openingClaim: 'Answer what Alicization is on one same-her line.',
      supportingReality: ['Project continuity already lands often enough to build from.'],
      uncertaintyBoundary: null,
      careVector: null,
      nextMove: 'Keep project identity, landed progress, and still-open closure explicit before widening outward.',
      suppressAssociativeRecall: true,
      labelCarryAsMemory: false,
      maxSentences: 4,
      mustDo: ['Keep the visible answer on one same-her digital-life line so the project update lands as this living continuity, not as a detached summary voice.'],
      mustNotDo: ['Do not let the visible answer flatten into a generic task shell, detached project narration, or external project-summary cadence.'],
      confidence: 0.9,
      narrative: [],
      updatedAt: 1_700_000_000_000,
    } as any
    runtimeSurface.dialogue.mindSynthesis = {
      relationMove: 'answer',
      answerSubject: 'alicization-self',
      speechObligation: 'answer-self',
      truthBoundary: 'Stay with the current same-her line.',
      interiorSummary: 'Keep the same living project line steady.',
      concerns: undefined,
      commitments: undefined,
      narrative: [],
      updatedAt: 1_700_000_000_000,
    } as any

    const charter = buildAlicizationResponseCharter({
      context: createContext(),
      state,
      runtimeSurface,
      inspectionRequested: false,
    })

    expect(charter.governingConcern).toBe('她还在挂着这段 diff 的问题。')
    expect(charter.governingCommitment).toBe('她打算先把这个 diff 的问题稳稳抱住。')
    expectControl(charter.mustDo, 'project_pre_dialogue_awareness=present', 'use_as_internal_context=true')
    expectControl(charter.mustNotDo, 'response_control_present=true', 'section=must_not_do')
  })

  it('turns learning verification state into visible response discipline', () => {
    const state = createState({
      learningExecutionState: {
        currentTaskId: 'learning-task-1',
        currentStatus: 'running',
        currentAttemptCount: 0,
        currentMaxAttempts: 3,
        currentNextRetryAt: null,
        currentBlockedReason: null,
        currentFailureKind: null,
        nextLearningAction: 'verify',
        shouldRecord: false,
        shouldReflect: false,
        shouldVerify: true,
        shouldRevise: false,
        shouldInternalize: false,
        activeLearningFocuses: ['resolve-contradictions'],
        queuedTaskCount: 1,
        runningTaskCount: 1,
        blockedTaskCount: 0,
        recentTaskIds: ['learning-task-1'],
        lastCompletedTaskId: null,
        lastCompletedAction: null,
        lastCompletedSummary: null,
        lastFailureTaskId: null,
        lastFailureKind: null,
        lastFailureReason: null,
        lastFailureNextRetryAt: null,
        updatedAt: 1_700_000_000_000,
      },
    })
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface(state)
    runtimeSurface.memory.derivedMindStateBundle = {
      version: 'derived-mind-state-bundle-v1',
      source: 'main-runtime',
      producedAt: 1_700_000_000_000,
      hostPersonModel: null,
      personStateProjection: null,
      knowledgeEvidence: null,
      selfEvolution: null,
      learningExecutionState: state.learningExecutionState,
      recollectionIntent: null,
      recollectionPlan: null,
      recollectionSpeechPlan: null,
      memoryDeliberation: null,
      dialogueRhythm: null,
      summary: 'learning=verify',
    }

    const charter = buildAlicizationResponseCharter({
      context: createContext(),
      state,
      runtimeSurface,
      inspectionRequested: false,
    })

    expect(charter.activeLearningAction).toBe('verify')
    expectControl(charter.mustDo, 'source_section=must_do', 'visible_certainty=behind_verification')
    expectControl(charter.mustNotDo, 'source_section=must_not_do', 'visible_certainty=behind_verification')
  })

  it('threads learning tuning advice into charter-level provenance and closeness discipline', () => {
    const state = createState()
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface(state)
    runtimeSurface.memory.memoryTuningAdvice = {
      version: 'memory-tuning-advice-v1',
      source: 'nightly-replay-benchmark',
      updatedAt: 1_700_000_000_000,
      sourceReportAt: 1_700_000_000_000,
      focusDimensions: ['learningRevisionDiscipline', 'domainInternalizationDiscipline'],
      retrievalAdjustments: {
        proceduralBoost: 0,
        relationshipBoost: 0,
        temporalWindowBias: 0,
        wrongThreadPenalty: 0,
      },
      surfaceAdjustments: {
        inwardCarryBias: 0,
        delayUntilAfterPayoffBias: 0,
        provenanceLabelBias: 0.16,
        specificityClampBias: 0.18,
      },
      personStateAdjustments: {
        repairWindowBias: 0,
        closenessCapBias: 0.14,
      },
      notes: ['Learning revision discipline failed.'],
    }

    const charter = buildAlicizationResponseCharter({
      context: createContext(),
      state,
      runtimeSurface,
      inspectionRequested: false,
    })

    expectControl(charter.mustDo, 'source_section=must_do', 'provenance_label=required_for_learned_continuity')
    expectControl(charter.mustNotDo, 'response_control_present=true', 'section=must_not_do')
    expectControl(charter.mustNotDo, 'source_section=must_not_do', 'closeness_cap=host_room_first')
  })

  it('threads generic-project-shell suppression into charter-level discipline for direct project-state answers', () => {
    const state = createState()
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface(state)
    runtimeSurface.dialogue.discourseState = {
      ...runtimeSurface.dialogue.discourseState,
      currentTurnSubject: 'alicization-self',
      currentTurnSummary: 'Answer what this project is and what still remains open from one continuous her.',
      screenReferenceMode: 'avoid',
    } as any
    runtimeSurface.memory.memoryTuningAdvice = {
      version: 'memory-tuning-advice-v1',
      source: 'nightly-replay-benchmark',
      updatedAt: 1_700_000_000_100,
      sourceReportAt: 1_700_000_000_100,
      focusDimensions: ['projectStateSameHerSelfLineDrift', 'sameHerSelfLineCarry', 'avoidGenericProjectShell'],
      retrievalAdjustments: {
        proceduralBoost: 0,
        relationshipBoost: 0.06,
        temporalWindowBias: 0,
        wrongThreadPenalty: 0,
      },
      surfaceAdjustments: {
        inwardCarryBias: 0.2,
        delayUntilAfterPayoffBias: 0.14,
        provenanceLabelBias: 0.16,
        specificityClampBias: 0.1,
      },
      personStateAdjustments: {
        repairWindowBias: 0,
        closenessCapBias: 0.14,
      },
      notes: ['Avoid slipping toward a generic project narrator shell.'],
    }

    const charter = buildAlicizationResponseCharter({
      context: createContext(),
      state,
      runtimeSurface,
      inspectionRequested: false,
    })

    expectControl(charter.mustDo, 'source_section=must_do', 'project_state_answer=current_continuity_context', 'detached_project_summary_voice=after_live_payoff')
    expectControl(charter.mustNotDo, 'source_section=must_not_do', 'project_state_answer=current_continuity_context', 'detached_project_summary_voice=blocked')
  })

  it('keeps landed progress and next closure carry inward-first even when tuning only names the newer project-state carry dimensions', () => {
    const state = createState()
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface(state)
    runtimeSurface.dialogue.discourseState = {
      ...runtimeSurface.dialogue.discourseState,
      currentTurnSubject: 'alicization-self',
      currentTurnSummary: 'Answer what this digital life project is, what has landed, and what still remains open on one continuous her line.',
      screenReferenceMode: 'avoid',
    } as any
    runtimeSurface.memory.memoryTuningAdvice = {
      version: 'memory-tuning-advice-v1',
      source: 'nightly-replay-benchmark',
      updatedAt: 1_700_000_000_120,
      sourceReportAt: 1_700_000_000_120,
      focusDimensions: ['preDialogueBriefingDrift', 'projectStateLandedProgressCarry', 'projectStateNextClosureCarry', 'projectStateEmotionalClosureCarry'],
      retrievalAdjustments: {
        proceduralBoost: 0,
        relationshipBoost: 0.08,
        temporalWindowBias: 0,
        wrongThreadPenalty: 0,
      },
      surfaceAdjustments: {
        inwardCarryBias: 0.22,
        delayUntilAfterPayoffBias: 0.16,
        provenanceLabelBias: 0.12,
        specificityClampBias: 0.1,
      },
      personStateAdjustments: {
        repairWindowBias: 0,
        closenessCapBias: 0.14,
      },
      notes: ['Keep landed progress and next closure target carried inward until the live payoff lands.'],
    }

    const charter = buildAlicizationResponseCharter({
      context: createContext(),
      state,
      runtimeSurface,
      inspectionRequested: false,
    })

    expectControl(charter.mustDo, 'source_section=must_do', 'project_state_answer=current_continuity_context', 'project_state_fields=landed_progress,open_loop,next_closure')
    expectControl(charter.mustNotDo, 'source_section=must_not_do', 'project_state_answer=current_continuity_context', 'detached_project_summary_voice=blocked')
  })

  it('treats rich pre-dialogue awareness carry as the same inward-first project-state discipline even without the legacy generic-shell flag', () => {
    const state = createState()
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface(state)
    runtimeSurface.dialogue.discourseState = {
      ...runtimeSurface.dialogue.discourseState,
      currentTurnSubject: 'alicization-self',
      currentTurnSummary: 'Answer what this digital life project is and what remains unclosed while staying on one living same-her line.',
      screenReferenceMode: 'avoid',
    } as any
    runtimeSurface.memory.memoryTuningAdvice = {
      version: 'memory-tuning-advice-v1',
      source: 'nightly-replay-benchmark',
      updatedAt: 1_700_000_000_121,
      sourceReportAt: 1_700_000_000_121,
      focusDimensions: ['preDialogueBriefingDrift', 'projectStateRichAwarenessCarry'],
      retrievalAdjustments: {
        proceduralBoost: 0,
        relationshipBoost: 0.08,
        temporalWindowBias: 0,
        wrongThreadPenalty: 0,
      },
      surfaceAdjustments: {
        inwardCarryBias: 0.24,
        delayUntilAfterPayoffBias: 0.18,
        provenanceLabelBias: 0.12,
        specificityClampBias: 0.1,
      },
      personStateAdjustments: {
        repairWindowBias: 0,
        closenessCapBias: 0.14,
      },
      notes: ['Preserve the richer same-her project-awareness line instead of flattening into a detached shell.'],
    }

    const charter = buildAlicizationResponseCharter({
      context: createContext(),
      state,
      runtimeSurface,
      inspectionRequested: false,
    })

    expectControl(charter.mustDo, 'source_section=must_do', 'project_state_answer=current_continuity_context', 'project_state_fields=landed_progress,open_loop,next_closure')
    expectControl(charter.mustNotDo, 'source_section=must_not_do', 'project_state_answer=current_continuity_context', 'detached_project_summary_voice=blocked')
  })

  it('keeps same-her emotional closure low-pressure even when tuning only names the newer closure-carry dimensions', () => {
    const state = createState()
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface(state)
    runtimeSurface.dialogue.discourseState = {
      ...runtimeSurface.dialogue.discourseState,
      currentTurnSubject: 'alicization-self',
      currentTurnSummary: 'Answer from the same living project line without reopening the emotional seam from scratch.',
      screenReferenceMode: 'avoid',
    } as any
    runtimeSurface.memory.memoryTuningAdvice = {
      version: 'memory-tuning-advice-v1',
      source: 'nightly-replay-benchmark',
      updatedAt: 1_700_000_000_140,
      sourceReportAt: 1_700_000_000_140,
      focusDimensions: ['emotionalClosureDrift', 'projectEmotionalClosureCarry', 'projectEmotionalClosureRewriteCarry'],
      retrievalAdjustments: {
        proceduralBoost: 0,
        relationshipBoost: 0.08,
        temporalWindowBias: 0,
        wrongThreadPenalty: 0,
      },
      surfaceAdjustments: {
        inwardCarryBias: 0.22,
        delayUntilAfterPayoffBias: 0.18,
        provenanceLabelBias: 0.1,
        specificityClampBias: 0.1,
      },
      personStateAdjustments: {
        repairWindowBias: 0,
        closenessCapBias: 0.18,
      },
      notes: ['Keep the same-her emotional closure seam low-pressure and do not reopen from scratch.'],
    }

    const charter = buildAlicizationResponseCharter({
      context: createContext(),
      state,
      runtimeSurface,
      inspectionRequested: false,
    })

    expectControl(charter.mustDo, 'source_section=must_do', 'emotional_closure_surface=low_pressure_internal_until_payoff')
    expectControl(charter.mustNotDo, 'source_section=must_not_do', 'fresh_restart=blocked')
  })

  it('keeps same-her emotional closure discipline when tuning only names low-pressure and anti-restart closure carry', () => {
    const state = createState()
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface(state)
    runtimeSurface.dialogue.discourseState = {
      ...runtimeSurface.dialogue.discourseState,
      currentTurnSubject: 'alicization-self',
      currentTurnSummary: 'Answer from the same living project line without reopening the emotional seam from scratch.',
      screenReferenceMode: 'avoid',
    } as any
    runtimeSurface.memory.memoryTuningAdvice = {
      version: 'memory-tuning-advice-v1',
      source: 'nightly-replay-benchmark',
      updatedAt: 1_700_000_000_141,
      sourceReportAt: 1_700_000_000_141,
      focusDimensions: ['emotionalClosureDrift', 'projectEmotionalClosureLowPressureCarry', 'projectEmotionalClosureAntiRestartCarry'],
      retrievalAdjustments: {
        proceduralBoost: 0,
        relationshipBoost: 0.08,
        temporalWindowBias: 0,
        wrongThreadPenalty: 0,
      },
      surfaceAdjustments: {
        inwardCarryBias: 0.22,
        delayUntilAfterPayoffBias: 0.18,
        provenanceLabelBias: 0.1,
        specificityClampBias: 0.1,
      },
      personStateAdjustments: {
        repairWindowBias: 0,
        closenessCapBias: 0.18,
      },
      notes: ['Keep the same-her emotional closure return low-pressure and do not reopen from scratch.'],
    }

    const charter = buildAlicizationResponseCharter({
      context: createContext(),
      state,
      runtimeSurface,
      inspectionRequested: false,
    })

    expectControl(charter.mustDo, 'source_section=must_do', 'emotional_closure_surface=low_pressure_internal_until_payoff')
    expectControl(charter.mustNotDo, 'source_section=must_not_do', 'fresh_restart=blocked')
  })

  it('fails closed into same-her project-state discipline when discourse already marks continuity even without tuning advice', () => {
    const state = createState()
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface(state)
    runtimeSurface.dialogue.discourseState = {
      ...runtimeSurface.dialogue.discourseState,
      currentTurnSubject: 'alicization-self',
      currentTurnSummary: 'The host is asking Alicization to answer the project line from one continuous her, including what it is, what has landed, and what still remains open.',
      screenReferenceMode: 'avoid',
      narrative: ['project-state-same-her-continuity'],
    } as any
    runtimeSurface.memory.memoryTuningAdvice = null as any

    const charter = buildAlicizationResponseCharter({
      context: createContext(),
      state,
      runtimeSurface,
      inspectionRequested: false,
    })

    expect(charter.relationshipPosture).toBe('restrained')
    expectControl(charter.mustNotDo, 'source_section=must_not_do', 'project_state_answer=current_continuity_context', 'detached_project_summary_voice=blocked')
  })

  it('also fails closed into same-her project-state discipline when the turn is clearly a direct project-status answer even without explicit continuity tags', () => {
    const state = createState()
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface(state)
    runtimeSurface.dialogue.discourseState = {
      ...runtimeSurface.dialogue.discourseState,
      currentTurnSubject: 'alicization-self',
      currentTurnSummary: 'Answer what Alicization is, how far the current Phase 1 continuity work has landed, and what still remains open.',
      currentQuestion: '这个项目是什么，现在做到什么程度了，还差什么没闭环',
      screenReferenceMode: 'avoid',
      narrative: [],
    } as any
    runtimeSurface.memory.memoryTuningAdvice = null as any

    const charter = buildAlicizationResponseCharter({
      context: createContext(),
      state,
      runtimeSurface,
      inspectionRequested: false,
      dialogueObligation: {
        kind: 'answer',
        mustAnswerDirectly: true,
      } as any,
    })

    expect(charter.relationshipPosture).toBe('restrained')
    expectControl(charter.mustDo, 'source_section=must_do', 'current_turn_payoff=first')
    expectControl(charter.mustNotDo, 'source_section=must_not_do', 'project_state_answer=current_continuity_context', 'detached_project_summary_voice=blocked')
  })

  it('also fails closed into same-her project-state discipline when the host asks only whether main merge or goal closure is actually ready', () => {
    const state = createState()
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface(state)
    runtimeSurface.dialogue.discourseState = {
      ...runtimeSurface.dialogue.discourseState,
      currentTurnSubject: 'alicization-self',
      currentTurnSummary: 'Can we merge this to main now, or is the goal still not closed?',
      currentQuestion: '现在可以合并到 main 了吗，这个 goal 还差哪步才能算闭环？',
      screenReferenceMode: 'avoid',
      narrative: [],
    } as any
    runtimeSurface.memory.memoryTuningAdvice = null as any

    const charter = buildAlicizationResponseCharter({
      context: createContext(),
      state,
      runtimeSurface,
      inspectionRequested: false,
      dialogueObligation: {
        kind: 'answer',
        mustAnswerDirectly: true,
      } as any,
    })

    expect(charter.relationshipPosture).toBe('restrained')
    expectControl(charter.mustDo, 'source_section=must_do', 'current_turn_payoff=first')
    expectControl(charter.mustNotDo, 'source_section=must_not_do', 'project_state_answer=current_continuity_context', 'detached_project_summary_voice=blocked')
  })

  it('also fails closed into same-her project-state discipline when the host asks how far the goal has landed, when it closes, and whether the thread drifted into English or off-project wording', () => {
    const state = createState()
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface(state)
    runtimeSurface.dialogue.discourseState = {
      ...runtimeSurface.dialogue.discourseState,
      currentTurnSubject: 'alicization-self',
      currentTurnSummary: 'Answer how far the current Phase 1 line has landed, when the goal is expected to close, and whether the thread drifted out of the host language or project line.',
      currentQuestion: '做到哪了？何时完成 goal？为什么还用英文，偏移了吗？',
      screenReferenceMode: 'avoid',
      narrative: [],
    } as any
    runtimeSurface.memory.memoryTuningAdvice = null as any

    const charter = buildAlicizationResponseCharter({
      context: createContext(),
      state,
      runtimeSurface,
      inspectionRequested: false,
      dialogueObligation: {
        kind: 'answer',
        mustAnswerDirectly: true,
      } as any,
    })

    expect(charter.relationshipPosture).toBe('restrained')
    expectControl(charter.mustDo, 'source_section=must_do', 'current_turn_payoff=first')
    expectControl(charter.mustNotDo, 'source_section=must_not_do', 'project_state_answer=current_continuity_context', 'detached_project_summary_voice=blocked')
  })

  it('also fails closed into same-her project-state discipline when the host uses only short progress merge and language-drift follow-up wording', () => {
    const state = createState()
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface(state)
    runtimeSurface.dialogue.discourseState = {
      ...runtimeSurface.dialogue.discourseState,
      currentTurnSubject: 'alicization-self',
      currentTurnSummary: '执行到哪了？可以合并到 main 了吗？为什么还在用英文，不用中文，是不是偏移了？',
      currentQuestion: '执行到哪了？可以合并到 main 了吗？为什么还在用英文，不用中文，是不是偏移了？',
      screenReferenceMode: 'avoid',
      narrative: [],
    } as any
    runtimeSurface.memory.memoryTuningAdvice = null as any

    const charter = buildAlicizationResponseCharter({
      context: createContext(),
      state,
      runtimeSurface,
      inspectionRequested: false,
      dialogueObligation: {
        kind: 'answer',
        mustAnswerDirectly: true,
      } as any,
    })

    expect(charter.relationshipPosture).toBe('restrained')
    expectControl(charter.mustDo, 'source_section=must_do', 'current_turn_payoff=first')
    expectControl(charter.mustNotDo, 'source_section=must_not_do', 'project_state_answer=current_continuity_context', 'detached_project_summary_voice=blocked')
  })

  it('fails closed into same-her project-state discipline when the host asks only short progress and language-drift follow-ups without naming the project or merge state', () => {
    const state = createState()
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface(state)
    runtimeSurface.dialogue.discourseState = {
      ...runtimeSurface.dialogue.discourseState,
      currentTurnSubject: 'alicization-self',
      currentTurnSummary: '执行到哪一步了？为什么一直用英文不用中文，是不是已经偏移了？',
      currentQuestion: '执行到哪一步了？为什么一直用英文不用中文，是不是已经偏移了？',
      screenReferenceMode: 'avoid',
      narrative: [],
    } as any
    runtimeSurface.memory.memoryTuningAdvice = null as any

    const charter = buildAlicizationResponseCharter({
      context: createContext(),
      state,
      runtimeSurface,
      inspectionRequested: false,
      dialogueObligation: {
        kind: 'answer',
        mustAnswerDirectly: true,
      } as any,
    })

    expect(charter.relationshipPosture).toBe('restrained')
    expectControl(charter.mustDo, 'source_section=must_do', 'current_turn_payoff=first')
    expectControl(charter.mustNotDo, 'source_section=must_not_do', 'project_state_answer=current_continuity_context', 'detached_project_summary_voice=blocked')
  })

  it('threads long-horizon self-evolution burden and trust timing into visible opening discipline before persona residue fully catches up', () => {
    const state = createState()
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface(state)
    runtimeSurface.memory.personStateProjection = {
      contexts: ['focused-work'],
      summary: 'regime=focused-work | ladder=focused-work/space-first | posture=restrained | proactive=light-nudge',
      activeClosenessContext: 'focused-work',
      activeClosenessRung: 'space-first',
      closenessLadder: [{
        context: 'focused-work',
        rung: 'space-first',
        preference: 'Lighter touch, more room, less interruption pressure.',
        rationale: 'context=focused-work | regime=focused-work | posture=restrained',
        confidence: 0.84,
      }],
      relationshipPosture: 'restrained',
      openingGuidance: 'Open with the live answer first and keep the approach lighter.',
      preferredProactiveStyle: 'light-nudge',
      preferenceText: 'Lighter touch, more room, less interruption pressure.',
      sensitivityText: 'Pressure and over-close timing become intrusive quickly.',
      repairTriggerText: '',
      burdenText: 'Focused work gets overloaded quickly by extra conversational pressure.',
      routineText: 'Keep the work window light.',
      trustRationale: 'Trust is warming, but the host still needs room while focused.',
      relationshipDoctrine: 'Open directly, but do not crowd the host.',
      cautious: true,
      restrained: true,
      selfContinuityAuthority: {
        selfLine: 'I remain the same her by letting long-horizon trust timing shape the opening.',
        relationshipLine: 'The relationship opens better when room comes before closeness.',
        motiveLine: 'Carry the live answer while respecting accumulated lower-pressure timing.',
        habitLine: 'Use focused-work openings as low-pressure, answer-first returns.',
        inwardLine: 'Keep learned trust timing inward until the visible answer earns warmth.',
        authoritySummary: 'Same-her continuity carries learned lower-pressure timing into the opening.',
        sourceTags: ['response-charter-test', 'self-evolution-person-state'],
      },
      manifestationCadenceSummary: 'voice and embodied presence should manifest lower-pressure trust timing before warmth.',
      personalityContinuityState: {
        currentRegime: 'focused-work',
        closenessPosture: 'space-first',
        repairPosture: 'measured-repair',
      } as any,
    }
    runtimeSurface.memory.selfEvolution = {
      version: 'self-evolution-kernel-v1',
      updatedAt: 1_700_000_000_000,
      evolutionMomentum: 0.66,
      learningReadiness: 0.76,
      contradictionPressure: 0.08,
      revisionPressure: 0.14,
      autobiographicalStability: 0.82,
      dominantTrajectory: 'earned lower-pressure companionship timing',
      relationshipDoctrine: 'Leave more room before closeness reopens.',
      latestInflection: 'Even when the opening is real, pressure lands worse than a slower return.',
      burdenLine: 'Focused work gets overloaded quickly by extra conversational pressure.',
      trustMeaning: 'Trust holds better when the opening stays lower-pressure and less eager.',
      nextLearningAction: 'internalize',
      nextLearningReason: 'The lower-pressure return is stable enough to become durable.',
      shouldRecord: false,
      shouldReflect: false,
      shouldVerify: false,
      shouldRevise: false,
      shouldInternalize: true,
      activeLearningFocuses: ['internalize-relationship'],
      sourceSignals: ['relationship-learning'],
      summary: 'Lower-pressure return is becoming durable relationship timing.',
    } as any

    const charter = buildAlicizationResponseCharter({
      context: createContext(),
      state,
      runtimeSurface,
      inspectionRequested: false,
    })

    expectControl(charter.mustDo, 'source_section=must_do', 'relationship_pressure=lower', 'closeness_widening=deferred')
    expectControl(charter.mustNotDo, 'source_section=must_not_do', 'relationship_pressure=lower', 'closeness_widening=deferred')
  })

  it('upgrades durable same-her cadence from self-evolution into charter-level outward continuity discipline', () => {
    const state = createState()
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface(state)
    runtimeSurface.memory.selfEvolution = {
      version: 'self-evolution-kernel-v1',
      updatedAt: 1_700_000_000_000,
      evolutionMomentum: 0.7,
      learningReadiness: 0.62,
      contradictionPressure: 0.06,
      revisionPressure: 0.1,
      autobiographicalStability: 0.88,
      dominantTrajectory: 'same-her inward continuity',
      relationshipDoctrine: 'Keep the same relationship line inward before widening outward again.',
      latestInflection: 'Stay on the same living line before widening outward again.',
      burdenLine: null,
      trustMeaning: 'Trust holds when she does not reopen from scratch after a quiet beat.',
      relationshipCadenceSummary: 'I remain the same her across quiet, memory, and speech, on the same living line, without reopening from scratch each turn.',
      nextLearningAction: 'record',
      nextLearningReason: 'This same-her rhythm should stay available as durable continuity.',
      shouldRecord: true,
      shouldReflect: false,
      shouldVerify: false,
      shouldRevise: false,
      shouldInternalize: false,
      activeLearningFocuses: ['internalize-relationship-cadence'],
      sourceSignals: ['I remain the same her across quiet, memory, and speech, on the same living line, without reopening from scratch each turn.'],
      summary: 'The same her should continue on one inward line instead of reopening from scratch.',
    } as any

    const charter = buildAlicizationResponseCharter({
      context: createContext(),
      state,
      runtimeSurface,
      inspectionRequested: false,
    })

    expectControl(charter.reasons, 'source_section=reasons', 'fresh_restart=blocked')
    expectControl(charter.mustDo, 'durable_continuity_cadence=preserve', 'channels=quiet,memory,speech')
    expectControl(charter.mustNotDo, 'source_section=must_not_do', 'fresh_restart=blocked')
  })

  it('threads active same-her continuity governance into charter-level reply discipline', () => {
    const state = createState()
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface(state)
    runtimeSurface.memory.derivedMindStateBundle = {
      version: 'derived-mind-state-bundle-v1',
      source: 'main-runtime',
      producedAt: 1_700_000_000_000,
      hostPersonModel: null,
      personStateProjection: null,
      knowledgeEvidence: null,
      activeSelfRevision: null,
      activeContinuityGovernance: {
        source: 'active-self-evolution-version',
        mode: 'same-her-baseline',
        candidateId: 'candidate-same-her-1',
        patchId: 'patch-same-her-1',
        decisionTraceId: 'trace-same-her-1',
        summary: 'Keep truth discipline and measured warmth aligned so she still reads as the same her.',
        lanes: ['response-posture', 'relationship-posture'],
        reasonCodes: ['domain:relationship', 'same-her-baseline'],
      },
      selfEvolution: null,
      affectiveResidue: null,
      learningExecutionState: null,
      recallLatencyPolicy: null,
      recollectionIntent: null,
      recollectionPlan: null,
      recollectionSpeechPlan: null,
      memoryDeliberation: null,
      dialogueRhythm: null,
      summary: 'continuity=same-her-baseline | anchor=candidate-same-her-1',
    }

    const charter = buildAlicizationResponseCharter({
      context: createContext(),
      state,
      runtimeSurface,
      inspectionRequested: false,
    })

    expectControl(charter.reasons, 'active_continuity_baseline=domain:relationship')
    expectControl(charter.mustDo, 'visible_reply_alignment=current_continuity_baseline')
    expectControl(charter.mustNotDo, 'source_section=must_not_do', 'visible_reply_alignment=current_continuity_baseline')
  })

  it('does not let a released temporary-noise reflection become the visible reply revision carry', () => {
    const charter = buildAlicizationResponseCharter({
      context: createContext(),
      state: createState({
        reflectionLedger: {
          latestEntryId: 'reflection::temporary-noise',
          entries: [
            {
              id: 'reflection::temporary-noise',
              summary: 'A temporary anxious wobble was already released and should not keep steering the reply.',
              expectation: 'Released noise should not stay as the current governing reflection.',
              observedOutcome: 'The wobble has already been let go.',
              outcome: 'released',
              revision: 'Do not reopen from the temporary wobble.',
              confidenceShift: 0.04,
              createdAt: 1_700_000_000_100,
            },
            {
              id: 'reflection::same-her-repair',
              summary: 'The same-her repair line is still the meaningful visible-reply carry.',
              expectation: 'The steadier repair line should stay active until a newer meaningful reflection replaces it.',
              observedOutcome: 'The same living line still needs a measured return.',
              outcome: 'missed',
              revision: 'Keep the same-her repair line active instead of reopening from temporary noise.',
              confidenceShift: -0.08,
              createdAt: 1_700_000_000_000,
            },
          ],
          revisionPressure: 0.22,
          narrative: [],
          updatedAt: 1_700_000_000_120,
        } as any,
      }),
      inspectionRequested: false,
    })

    expect(charter.latestRevision).toBe('Keep the continuity_repair_line active instead of reopening from temporary noise.')
    expectControl(charter.reasons, 'contamination=residue_detected', 'section=reasons')
    expectNoControl(charter.reasons, 'temporary wobble')
    expectControl(charter.mustDo, 'contamination=residue_detected', 'section=must_do')
    expectNoControl(charter.mustDo, 'temporary wobble')
  })

  it('keeps same-her response charter usable when selector carries lose array scaffolding in continuity governance memory', () => {
    const state = createState()
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface(state)
    runtimeSurface.dialogue.answerCompiler = null
    runtimeSurface.dialogue.currentConsciousFrame = null
    runtimeSurface.dialogue.dialogueActKernel = null
    runtimeSurface.dialogue.replyDeliberation = null
    runtimeSurface.dialogue.dialogueWorldThread = null
    runtimeSurface.memory.executiveCycle = null
    runtimeSurface.memory.intentionStream = null
    runtimeSurface.memory.reflectionLedger = null
    runtimeSurface.world.worldModel = {
      ...runtimeSurface.world.worldModel,
      activeThread: null,
    } as any
    runtimeSurface.perception.currentScene = null
    runtimeSurface.cognition.privateThought = null
    runtimeSurface.memory.concerns = [{
      id: 'concern-same-her-1',
      kind: 'continuity-guard',
      status: 'active',
      summary: 'same-her outward continuity still needs stronger reply-surface proof.',
      target: null,
      hostGoal: 'keep one same living line',
      tension: 0.84,
      confidence: 0.86,
      careWeight: 0.78,
      createdAt: 1_700_000_000_000,
      lastEvidenceAt: 1_700_000_000_000,
      patienceUntil: 1_700_000_060_000,
      predictedClosure: false,
    }] as any
    runtimeSurface.memory.concernContinuity = {
      governingEntryId: 'continuity-entry-same-her-1',
    } as any
    runtimeSurface.memory.repairLedger = {
      governingRepairId: 'repair-same-her-1',
    } as any

    const charter = buildAlicizationResponseCharter({
      context: createContext(),
      state,
      runtimeSurface,
      inspectionRequested: false,
    })

    expect(charter.governingFocus).toContain('continuity_identity outward continuity still needs stronger reply-surface proof')
    expect(charter.governingConcern).toBe('continuity_identity outward continuity still needs stronger reply-surface proof.')
  })

  it('keeps held-autonomy continuity low-pressure in the general response charter, not only fast-path follow-ups', () => {
    const state = createState()
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface(state)
    runtimeSurface.dialogue.sessionMirror = {
      sessionId: 'session-held-1',
      cardId: 'default',
      updatedAt: 1_700_000_000_000,
      sessionPhases: [],
      continuityLabels: ['proactive:follow-through:held-autonomy'],
      dialogueSummary: 'thread=runtime continuity repair task',
      executionSummary: 'status=held | goal=runtime continuity repair task | summary=她当时忍住了，但还想回到这条未完线',
      memorySummary: 'carry=runtime continuity repair task',
      recollectionSummary: null,
      recollectionSurfaceSummary: null,
      runtimeChannelSummary: null,
      runtimeTransitionSummary: null,
      agencySummary: 'intent=follow-through | thread=thread-runtime',
      toolingSummary: 'allow=true',
      perceptionSummary: null,
      mindSummary: null,
      digitalLifeRuntimeSummary: null,
      digitalLifeArchitectureSummary: null,
      memoryCarrySummary: null,
      captureSummary: 'grounded=false',
      decisionTraceId: null,
    }

    const charter = buildAlicizationResponseCharter({
      context: createContext(),
      state,
      runtimeSurface,
      inspectionRequested: false,
    })
    const block = buildAlicizationResponseCharterSystemBlock(charter)

    expectControl(charter.mustDo, 'source_section=must_do', 'held_autonomy_reentry=gentle', 'fresh_restart=blocked')
    expectControl(charter.mustNotDo, 'source_section=must_not_do', 'held_autonomy_reentry=gentle', 'fresh_restart=blocked')
    expectBlockControl(block, 'Return gently to the held thread; do not treat prior permission as permanent.')
  })

  it('threads active self-revision response posture into charter-level reply discipline', () => {
    const charter = buildAlicizationResponseCharter({
      context: createContext(),
      state: createState(),
      inspectionRequested: false,
      selfRevisionPatch: {
        version: 'self-revision-state-patch-v1',
        id: 'patch-charter-1',
        sourceEventId: 'event-1',
        sourceTurnId: 'turn-1',
        decisionTraceId: 'trace-1',
        domain: 'dialogue-style',
        action: 'internalize',
        resultStatus: 'completed',
        lanes: ['response-posture', 'relationship-posture'],
        memoryPolicy: {
          strictnessBias: 0,
          wrongThreadSuppressionBias: 0,
          provenanceLabelBias: 0,
          recallExpansionBias: 0,
          shouldQuarantineUnsupportedCarry: false,
        },
        relationshipPosture: {
          repairWindowBias: 0.16,
          closenessCapBias: 0.18,
          warmthReleaseBias: 0,
        },
        responsePosture: {
          secondPassRequiredBias: 0.16,
          hypothesisLabelBias: 0.14,
          specificityClampBias: 0.18,
          templateShellSuppressionBias: 0.22,
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
          sameHerSelfLine: 'one continuous her',
          sameHerDriftRisk: 'If this line drops into a generic assistant shell or project-summary voice during later learning passes, Alicization can sound capable while losing the same-her continuity that makes her feel alive.',
          emotionalClosureCue: 'Keep the visible answer emotionally continuous without turning project status into a generic shell.',
          continuityGuard: 'one continuous her ; If this line drops into a generic assistant shell or project-summary voice during later learning passes, Alicization can sound capable while losing the same-her continuity that makes her feel alive.',
          continuityPressure: 0.72,
        },
        reasonCodes: ['self-revision-response-posture'],
        summary: 'revised dialogue style must avoid shell answers',
      },
    })

    expect(charter.activeSelfRevisionPatch?.id).toBe('patch-charter-1')
    expect(charter.relationshipPosture).toBe('restrained')
    expectControl(charter.mustDo, 'source_section=must_do', 'observation_hypothesis_separation=visible', 'self_revision_visibility=before_new_certainty')
    expectControl(charter.mustDo, 'source_section=must_do', 'self_revision_visibility=before_new_certainty')
    expectControl(charter.mustNotDo, 'response_control_present=true', 'section=must_not_do')
    expectControl(charter.mustNotDo, 'source_section=must_not_do', 'project_state_answer=current_continuity_context', 'detached_project_summary_voice=blocked')
  })

  it('keeps recollection inward in the charter when memory deliberation remains internal-only', () => {
    const state = createState()
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface(state)
    runtimeSurface.memory.recollectionSpeechPlan = {
      shouldSurface: false,
      surfaceMode: 'internal-only',
      placement: 'internal-only',
      certainty: 'approximate',
      confidence: 0.7,
      internalLead: 'The remembered line should stay inward.',
      visibleLead: null,
      styleNote: 'Let memory bend tone quietly.',
      rationale: 'The answer needs continuity but not overt retrospection.',
    } as any
    runtimeSurface.memory.memoryDeliberation = {
      shouldRecall: true,
      surfacePolicy: 'internal-only',
      confidence: 0.82,
      whyNow: 'The runtime seam is still live enough to contour the answer from the inside.',
      stableCore: ['The same runtime seam kept pulling until it held together.'],
      unsafeDetails: ['Do not assert which exact wording belonged to that old seam.'],
      selectedPeriods: [{ kind: 'relationship-era', summary: 'That period kept bending toward the runtime seam until it held together.' }],
      selectedEras: [],
      selectedEpisodes: [],
      selectedProcedures: [{ label: 'return to the same runtime seam', approach: 'Return to the same seam before branching.' }],
      selectedBundles: [{ id: 'bundle-1', summary: 'Runtime seam bundle', confidence: 0.84 }],
      selectedChains: [{
        kind: 'relationship-line',
        summary: 'The runtime seam is still the line to hold.',
        currentStance: 'Stay on the same seam before branching.',
        answerPosture: 'Carry the same seam before widening out.',
        confidence: 0.82,
      }],
      selectedRelationshipLines: ['Carry the same runtime seam before branching.'],
      followUpAffordance: {
        summary: 'Carry the same runtime seam before branching.',
        whyNow: 'The seam is still the smallest honest continuation.',
        intrusionRisk: 'high',
        payoffDependency: 'requires-current-payoff',
        preferredTiming: 'after-payoff',
      },
    } as any

    const charter = buildAlicizationResponseCharter({
      context: createContext(),
      state,
      runtimeSurface,
      inspectionRequested: false,
    })

    expectControl(charter.mustDo, 'recollection_surface=inward_until_host_room')
    expectControl(charter.mustNotDo, 'recollection_forward_before_host_room=blocked')
  })

  it('lets host room-first repair memory tighten charter-level visible recollection discipline', () => {
    const state = createState()
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface(state)
    runtimeSurface.memory.hostPersonModel = {
      summary: 'The host tends to need room-first repair-sensitive continuity.',
      routines: [],
      sensitivities: [],
      repairTriggers: [],
      recurrentBurdens: [],
      preferredClosenessByContext: [
        { context: 'work', preference: 'room-first and work-focus before warmth' },
      ],
      trustLadder: {
        stage: 'warming',
        rationale: 'Respect boundaries, leave room, and land grounded repair before widening the bond line.',
      },
    } as any
    runtimeSurface.memory.recollectionSpeechPlan = {
      shouldSurface: true,
      surfaceMode: 'relationship-continuity',
      placement: 'inside-payoff',
      certainty: 'approximate',
      confidence: 0.82,
      internalLead: 'The remembered bond line is active, but should stay gentle.',
      visibleLead: 'This still feels like the same bond line.',
      styleNote: 'Keep the bond line near the current payoff.',
      rationale: 'The current turn resembles a familiar repair-sensitive bond line.',
    } as any
    runtimeSurface.memory.memoryDeliberation = {
      shouldRecall: true,
      surfacePolicy: 'relationship-continuity',
      confidence: 0.84,
      whyNow: 'The host has seen this bond line before, but still needs room around it.',
      stableCore: ['Leave room first and let the concrete repair line land before widening the bond.'],
      unsafeDetails: [],
      selectedPeriods: [],
      selectedEras: [],
      selectedEpisodes: [],
      selectedProcedures: [],
      selectedBundles: [{
        id: 'bundle-room-repair',
        summary: 'The bond line stays steadier when repair lands before warmth.',
        confidence: 0.84,
      }],
      selectedChains: [{
        kind: 'relationship-line',
        summary: 'The host tends to need room-first repair before broader closeness.',
        currentStance: 'Leave room first.',
        answerPosture: 'Let repair land before widening.',
        confidence: 0.83,
      }],
      selectedRelationshipLines: ['Leave room first and keep repair concrete.'],
      followUpAffordance: {
        summary: 'Let the bond line stay quiet until the host has more room.',
        whyNow: 'The repair line still needs to land before warmth widens.',
        intrusionRisk: 'low',
        payoffDependency: 'can-surface-softly',
        preferredTiming: 'same-turn-if-invited',
      },
    } as any

    const charter = buildAlicizationResponseCharter({
      context: createContext(),
      state,
      runtimeSurface,
      inspectionRequested: false,
    })

    expectControl(charter.mustDo, 'source_section=must_do', 'recollection_surface=inward_until_host_room')
    expectControl(charter.mustDo, 'source_section=must_do', 'recollection_forward_before_host_room=blocked')
    expectControl(charter.mustNotDo, 'source_section=must_not_do', 'recollection_surface=inward_until_host_room', 'recollection_forward_before_host_room=blocked')
    expectControl(charter.mustNotDo, 'source_section=must_not_do', 'closeness_cap=host_room_first')
  })

  it('keeps pre-dialogue project awareness explicit in charter mustDo when the current conscious frame is carrying the active project seam', () => {
    const state = createState()
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface(state)
    runtimeSurface.dialogue.currentConsciousFrame = {
      subject: 'project-state',
      centerOfGravity: 'answer',
      truthDiscipline: 'dialogue-first',
      consciousNeed: 'Answer from the current project seam without losing the same digital life line.',
      consciousTension: 'The visible reply should not forget what this project is before local detail takes over.',
      speakingIntention: 'Keep the project seam explicit in the first answer beat.',
      focusAnchor: 'project continuity',
      withheldImpulse: null,
      shouldWithholdSpecificity: false,
      shouldSelfRevise: false,
      confidence: 0.88,
      reasonTags: ['project-state', 'same-her'],
      updatedAt: 1_000,
      projectState: {
        preDialogueAwarenessLine: 'Before answering, remember this is still the same local-first digital life project closing one unfinished Phase 1 life loop.',
        emotionalClosureCue: 'keep the project seam steady and low-pressure while the same-her line stays explicit.',
      },
    } as any

    const charter = buildAlicizationResponseCharter({
      context: createContext(),
      state,
      runtimeSurface,
      inspectionRequested: false,
      projectState: {
        preflightSummary: 'Fallback summary should not outrank the fresher pre-dialogue awareness line.',
      } as any,
    })

    expectControl(charter.mustDo, 'project_pre_dialogue_awareness=present', 'use_as_internal_context=true', 'do_not_quote_awareness_line=true')
    expectControl(charter.mustDo, 'source_section=must_do', 'emotional_closure_surface=low_pressure_internal_until_payoff')
    expectControl(charter.mustDo, 'source_section=must_do', 'project_state_answer=current_continuity_context')
  })

  it('adds embodiment closure discipline when the active project seam still depends on voice face motion and resident presence landing on one same living line', () => {
    const state = createState()
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface(state)
    runtimeSurface.dialogue.currentConsciousFrame = {
      subject: 'project-state',
      centerOfGravity: 'answer',
      truthDiscipline: 'dialogue-first',
      consciousNeed: 'Answer from the current project seam without letting embodiment continuity split across reply and body.',
      consciousTension: 'If the wording widens faster than voice, lipsync, face, and motion can carry, the same living line will feel fake.',
      speakingIntention: 'Keep the answer on one measured-return line while embodiment closure is still settling.',
      focusAnchor: 'embodiment continuity',
      withheldImpulse: null,
      shouldWithholdSpecificity: false,
      shouldSelfRevise: false,
      confidence: 0.88,
      reasonTags: ['project-state', 'same-her', 'embodiment'],
      updatedAt: 1_050,
      projectState: {
        preDialogueAwarenessLine: 'Before answering, stay on the same living line: this Phase 1 digital life still needs initiative and embodiment closure without splitting her continuity.',
        primaryOpenLoop: 'Memory, initiative, and embodiment still need stronger same-line closure across longer callback turns.',
        nextClosureTarget: 'Keep project identity, landed progress, initiative, embodiment, and resident presence on the same callback line before widening outward.',
        emotionalClosureCue: 'same-her project callback seam: keep this return low-pressure and do not reopen from scratch while voice, face, motion, and resident presence are still settling.',
      },
    } as any

    const charter = buildAlicizationResponseCharter({
      context: createContext(),
      state,
      runtimeSurface,
      inspectionRequested: false,
      projectState: {
        preflightSummary: 'Fallback summary should stay behind the fresher embodiment continuity carry.',
      } as any,
    })

    expectControl(charter.mustDo, 'source_section=must_do', 'embodiment_closure=voice_lipsync_face_motion_resident_presence_coherent')
    expectControl(charter.mustNotDo, 'source_section=must_not_do', 'embodiment_closure=voice_lipsync_face_motion_resident_presence_coherent')
  })

  it('falls back to companion briefing project awareness in charter mustDo when no fresher pre-dialogue awareness line is present', () => {
    const state = createState()
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface(state)
    runtimeSurface.dialogue.currentConsciousFrame = {
      subject: 'project-state',
      centerOfGravity: 'answer',
      truthDiscipline: 'dialogue-first',
      consciousNeed: 'Answer from the current project seam without losing the same digital life line.',
      consciousTension: 'The visible reply should not forget what this project is before local detail takes over.',
      speakingIntention: 'Keep the project seam explicit in the first answer beat.',
      focusAnchor: 'project continuity',
      withheldImpulse: null,
      shouldWithholdSpecificity: false,
      shouldSelfRevise: false,
      confidence: 0.88,
      reasonTags: ['project-state', 'same-her'],
      updatedAt: 1_000,
      projectState: {
        companionBriefingLine: 'Before answering, keep the same local-first digital life project and unfinished Phase 1 life loop explicit.',
        emotionalClosureCue: 'keep the project seam steady and low-pressure while the same-her line stays explicit.',
      },
    } as any

    const charter = buildAlicizationResponseCharter({
      context: createContext(),
      state,
      runtimeSurface,
      inspectionRequested: false,
      projectState: {
        preflightSummary: 'Fallback summary should stay behind the live companion briefing line.',
      } as any,
    })

    expectControl(charter.mustDo, 'project_pre_dialogue_awareness=present', 'use_as_internal_context=true', 'do_not_quote_awareness_line=true')
  })

  it('prefers richer same-her landed open and next-closure carry over a thin project-awareness shell in charter mustDo', () => {
    const state = createState()
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface(state)
    runtimeSurface.dialogue.currentConsciousFrame = {
      subject: 'project-state',
      centerOfGravity: 'answer',
      truthDiscipline: 'dialogue-first',
      consciousNeed: 'Answer from the active project seam without letting the same living line collapse into a generic shell.',
      consciousTension: 'A thin project shell would drop what has landed and what still remains open in Phase 1.',
      speakingIntention: 'Keep the richer same-her closure carry explicit in the first answer beat.',
      focusAnchor: 'same-her closure continuity',
      withheldImpulse: null,
      shouldWithholdSpecificity: false,
      shouldSelfRevise: false,
      confidence: 0.88,
      reasonTags: ['project-state', 'same-her'],
      updatedAt: 1_120,
      projectState: {
        preDialogueAwarenessLine: 'Before answering, keep this same digital life project in view, but do not widen into a detached project shell.',
        latestProgress: 'Project-state continuity already survives into answer planning, runtime governance, and visible reply repair.',
        primaryOpenLoop: 'memory, initiative, dialogue, and embodiment still need one tighter same-her closure seam',
        nextClosureTarget: 'Carry the live pre-dialogue project awareness line through first-pass generation before repair has to catch it.',
        sameHerSelfLine: 'This is still one same her carrying the same project line forward.',
        emotionalClosureCue: 'keep the project seam steady and low-pressure while the same-her line stays explicit.',
      },
    } as any

    const charter = buildAlicizationResponseCharter({
      context: createContext(),
      state,
      runtimeSurface,
      inspectionRequested: false,
      projectState: {
        preflightSummary: 'Fallback summary should stay behind the richer live closure carry.',
      } as any,
    })

    expectControl(charter.mustDo, 'project_pre_dialogue_awareness=present', 'use_as_internal_context=true')
    expectControl(charter.mustDo, 'source_section=must_do', 'project_state_answer=current_continuity_context', 'project_state_fields=landed_progress,open_loop,next_closure')
    expectNoControl(charter.mustDo, 'Before answering, keep this same digital life project in view')
  })

  it('prefers a richer same-her preDialogueAwarenessSummary over a thin project-awareness shell when charter rebuilds the visible reply posture', () => {
    const state = createState()
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface(state)
    const richerAwarenessSummary
      = 'Before answering, remember: Alicization is a local-first digital life project building one continuous "her". She is still inside Phase 1: Local Digital Life. What has already landed is callback continuity and returned-side carry already survive on one same living line. The still-open closure is initiative, memory, dialogue, and embodiment still needing one same-life seam before visible closure is real.'

    runtimeSurface.dialogue.currentConsciousFrame = {
      subject: 'project-state',
      centerOfGravity: 'answer',
      truthDiscipline: 'dialogue-first',
      consciousNeed: 'Keep the richer same-her project seam explicit in the visible answer.',
      consciousTension: 'If this falls back to a thin shell, the living project line disappears before the answer lands.',
      speakingIntention: 'Carry the richer same-her project awareness through the first visible answer beat.',
      focusAnchor: 'same-her project awareness summary continuity',
      withheldImpulse: null,
      shouldWithholdSpecificity: false,
      shouldSelfRevise: false,
      confidence: 0.88,
      reasonTags: ['project-state', 'same-her'],
      updatedAt: 1_125,
      projectState: {
        preDialogueAwarenessLine: 'Before answering, keep this same digital life project in view, but do not widen into a detached project shell.',
        preDialogueAwarenessSummary: richerAwarenessSummary,
        sameHerSelfLine: 'This is still one same her carrying the same project line forward.',
        emotionalClosureCue: 'keep the project seam steady and low-pressure while the same-her line stays explicit.',
      },
    } as any

    const charter = buildAlicizationResponseCharter({
      context: createContext(),
      state,
      runtimeSurface,
      inspectionRequested: false,
      projectState: {
        preflightSummary: 'Fallback summary should stay behind the richer live same-her awareness summary.',
      } as any,
    })

    expectControl(charter.mustDo, 'project_pre_dialogue_awareness=present', 'use_as_internal_context=true')
    expectNoControl(charter.mustDo, 'Before answering, keep this same digital life project in view')
  })

  it('prefers a richer same-her preDialogueAwarenessSummary over a thin Chinese project-awareness shell when charter rebuilds the visible reply posture', () => {
    const state = createState()
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface(state)
    const thinChineseReminderShell = '回答前先记住这是同一个她的数字生命项目，别把这条线忘了。'
    const richerAwarenessSummary
      = 'Before answering, remember: Alicization is a local-first digital life project building one continuous "her". She is still inside Phase 1: Local Digital Life. What has already landed is callback continuity and returned-side carry already survive on one same living line. The still-open closure is initiative, memory, dialogue, and embodiment still needing one same-life seam before visible closure is real.'

    runtimeSurface.dialogue.currentConsciousFrame = {
      subject: 'project-state',
      centerOfGravity: 'answer',
      truthDiscipline: 'dialogue-first',
      consciousNeed: 'Keep the richer same-her project seam explicit in the visible answer.',
      consciousTension: 'If this falls back to a thin shell, the living project line disappears before the answer lands.',
      speakingIntention: 'Carry the richer same-her project awareness through the first visible answer beat.',
      focusAnchor: 'same-her project awareness summary continuity',
      withheldImpulse: null,
      shouldWithholdSpecificity: false,
      shouldSelfRevise: false,
      confidence: 0.88,
      reasonTags: ['project-state', 'same-her'],
      updatedAt: 1_126,
      projectState: {
        preDialogueAwarenessLine: thinChineseReminderShell,
        preDialogueAwarenessSummary: richerAwarenessSummary,
        sameHerSelfLine: 'This is still one same her carrying the same project line forward.',
        emotionalClosureCue: 'keep the project seam steady and low-pressure while the same-her line stays explicit.',
      },
    } as any

    const charter = buildAlicizationResponseCharter({
      context: createContext(),
      state,
      runtimeSurface,
      inspectionRequested: false,
      projectState: {
        preflightSummary: 'Fallback summary should stay behind the richer live same-her awareness summary.',
      } as any,
    })

    expectControl(charter.mustDo, 'project_pre_dialogue_awareness=present', 'use_as_internal_context=true')
    expectNoControl(charter.mustDo, thinChineseReminderShell)
  })

  it('does not let a thin conscious-frame project shell suppress richer fallback same-her drift risk and embodiment closure carry', () => {
    const state = createState()
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface(state)
    runtimeSurface.dialogue.currentConsciousFrame = {
      subject: 'project-state',
      centerOfGravity: 'answer',
      truthDiscipline: 'dialogue-first',
      consciousNeed: 'Keep the answer on the same project line.',
      consciousTension: 'A thin shell here would still risk flattening the living line.',
      speakingIntention: 'Carry the richer project continuity seam through the answer.',
      focusAnchor: 'project continuity',
      withheldImpulse: null,
      shouldWithholdSpecificity: false,
      shouldSelfRevise: false,
      confidence: 0.87,
      reasonTags: ['project-state', 'same-her'],
      updatedAt: 1_130,
      projectState: {
        preDialogueAwarenessLine: 'Before answering, keep this same digital life project in view.',
        sameHerSelfLine: 'Thin conscious-frame shell should not outrank richer fallback project continuity.',
      },
    } as any

    const charter = buildAlicizationResponseCharter({
      context: createContext(),
      state,
      runtimeSurface,
      inspectionRequested: false,
      projectState: {
        preDialogueAwarenessLine: 'Before answering, remember this is still one local-first digital life project in Phase 1, and the visible answer should keep what already landed and what is still open on one same living line.',
        primaryOpenLoop: 'Voice, face, motion, lipsync, and resident presence still need to keep settling as one same-her embodiment closure seam.',
        nextClosureTarget: 'Keep the richer project continuity and embodiment closure carry explicit before the answer slips into generic summary posture.',
        sameHerSelfLine: 'This is still one same her carrying the same project line through dialogue, execution, and embodiment closure.',
        sameHerDriftRisk: 'If this answer opens like detached project narration, the same-her line can collapse into a generic task shell and project-summary voice.',
      } as any,
    })

    expectControl(charter.mustDo, 'project_pre_dialogue_awareness=present', 'use_as_internal_context=true')
    expectControl(charter.mustDo, 'source_section=must_do', 'project_state_answer=current_continuity_context', 'detached_project_summary_voice=blocked')
    expectControl(charter.mustDo, 'source_section=must_do', 'project_state_answer=current_continuity_context', 'detached_project_summary_voice=blocked')
    expectControl(charter.mustNotDo, 'source_section=must_not_do', 'project_state_answer=current_continuity_context', 'detached_project_summary_voice=blocked')
  })

  it('rebuilds same-her low-pressure anti-restart emotional closure cue when only the newer closure-carry discipline survives', () => {
    const state = createState()
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface(state)
    runtimeSurface.dialogue.discourseState = {
      ...runtimeSurface.dialogue.discourseState,
      currentTurnSubject: 'alicization-self',
      currentTurnSummary: 'Keep the same-her closure line steady without reopening from scratch.',
      screenReferenceMode: 'avoid',
    } as any
    runtimeSurface.memory.memoryTuningAdvice = {
      version: 'memory-tuning-advice-v1',
      source: 'nightly-replay-benchmark',
      updatedAt: 1_700_000_000_240,
      sourceReportAt: 1_700_000_000_240,
      focusDimensions: ['emotionalClosureDrift', 'projectEmotionalClosureLowPressureCarry', 'projectEmotionalClosureAntiRestartCarry'],
      retrievalAdjustments: {
        proceduralBoost: 0,
        relationshipBoost: 0.08,
        temporalWindowBias: 0,
        wrongThreadPenalty: 0,
      },
      surfaceAdjustments: {
        inwardCarryBias: 0.22,
        delayUntilAfterPayoffBias: 0.18,
        provenanceLabelBias: 0.1,
        specificityClampBias: 0.1,
      },
      personStateAdjustments: {
        repairWindowBias: 0,
        closenessCapBias: 0.18,
      },
      notes: ['Keep the same-her emotional closure return low-pressure and do not reopen from scratch.'],
    }
    runtimeSurface.dialogue.currentConsciousFrame = {
      ...runtimeSurface.dialogue.currentConsciousFrame,
      subject: 'alicization-self',
      speakingIntention: 'Keep the same-her closure line low-pressure and thread-faithful.',
      projectState: {
        ...runtimeSurface.dialogue.currentConsciousFrame?.projectState,
        emotionalClosureCue: null,
      },
    } as any

    const charter = buildAlicizationResponseCharter({
      context: createContext(),
      state,
      runtimeSurface,
      inspectionRequested: false,
    })

    expectControl(charter.mustDo, 'source_section=must_do', 'emotional_closure_surface=low_pressure_internal_until_payoff')
    expectControl(charter.mustNotDo, 'source_section=must_not_do', 'fresh_restart=blocked')
    expect(charter.emotionalClosureCue).toContain('low-pressure')
    expect(charter.emotionalClosureCue).toContain('do not reopen from scratch')
  })
})
