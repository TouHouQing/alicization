import { describe, expect, it } from 'vitest'

import { buildAnswerPlanner } from './answer-planner'
import { buildAlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'

const baseContext = {
  localTime: { hour: 14, minute: 0, isLateNight: false },
  system: {
    cpuUsage: 18,
    battery: { percent: 82, charging: true },
    memory: { usagePercent: 36, freeMB: 4096, totalMB: 8192 },
    idleSeconds: 12,
    inputActivity: 'active' as const,
    fullscreenLikely: false,
    foregroundWindow: {
      appName: 'Cursor',
      processName: 'Cursor',
      title: 'runtime.ts - diff',
      pid: 7,
    },
    degradedSignals: [],
  },
  workload: {
    kind: 'coding' as const,
    confidence: 0.88,
    source: 'foreground-window-heuristic' as const,
    matchedLabels: ['cursor'],
  },
  content: {
    kind: 'diff' as const,
    confidence: 0.84,
    source: 'foreground-window-heuristic' as const,
    matchedLabels: ['diff'],
    summary: 'runtime.ts - diff',
  },
  relationship: {
    hostAttitude: '礼貌而克制，保持观察',
    boredom: 14,
    loneliness: 18,
    fatigue: 20,
    minutesSinceLastUserTurn: 2,
    reminderBacklog: 0,
    lateNightActiveMinutes: 0,
    recentProactiveOutcomes: [],
  },
}

describe('answer planner corrected same-person regression', () => {
  it('keeps corrected same-person continuity ahead of progress-pressure continuation in reply planning', () => {
    const runtimeState = {
      answerCompiler: {
        recommendedAct: 'answer',
        evidenceMode: 'continuity-carry',
        confidence: 0.79,
        openingClaim: 'Continue from the corrected same-person line.',
        openingDirective: 'Answer directly without reopening as a progress recap.',
        nextMove: 'Keep the return same-person and low-pressure.',
        relationshipPosture: 'restrained',
        activeClosenessContext: 'focused-work',
        activeClosenessRung: 'measured-return',
        turnMode: 'answer',
        screenReferenceMode: 'avoid',
        uncertaintyBoundary: null,
        mustDo: [],
        mustNotDo: [],
        narrative: [],
        labelCarryAsMemory: true,
      },
      replyDeliberation: {
        whyThisReplyNow: 'The host corrected the relationship meaning away from progress pressure and back toward same-person continuity.',
        openingBeat: 'Stay with the corrected same-person line first.',
      },
      discourseState: {
        currentTurnSummary: 'This return should stay on the corrected same-person line rather than reopening as a status recap.',
        currentQuestion: '你现在是不是又把它当成进度汇报了',
      },
      conversationState: {
        hostMove: '你现在是不是又把它当成进度汇报了',
        primaryTurnAnchor: 'corrected same-person continuity return',
        activeProject: 'same-person continuity correction',
      },
      raw: {
        personStateProjection: {
          selfContinuityAuthority: {
            selfLine: 'I should stay the same person through this correction, not turn into a project narrator.',
            relationshipLine: 'The host corrected the relationship meaning away from progress pressure.',
            inwardLine: 'Keep the corrected same-person continuity line authoritative before widening outward.',
            authoritySummary: 'Carry corrected same-person continuity forward before any status recap.',
            sourceTags: ['runtime:corrected-same-person', 'continuity-arc:same-thread-continuation'],
          },
        },
      },
    } as any

    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface(runtimeState)
    runtimeSurface.memory.recollectionSpeechPlan = {
      shouldSurface: true,
      surfaceMode: 'relationship-continuity',
      placement: 'after-payoff',
      certainty: 'approximate',
      confidence: 0.81,
      rationale: 'This should reopen from the corrected same-person continuity line, not as a progress recap.',
    } as any
    runtimeSurface.memory.memoryDeliberation = {
      shouldRecall: true,
      surfacePolicy: 'relationship-continuity',
      shouldStayInward: true,
      whyNow: 'The host corrected the relationship meaning, so this answer should not slip back into progress pressure.',
      stableCore: ['Carry corrected same-person continuity forward before any status recap.'],
      unsafeDetails: ['Do not let the answer reopen as progress pressure or generic status recap.'],
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
      inwardCarryRule: 'memory-turn-carry | corrected_same_person_discipline=anti-progress-pressure-return',
    } as any
    runtimeSurface.memory.derivedMindStateBundle = {
      recollectionIntent: {
        mode: 'relationship-history',
        temporalFocus: 'experience-matched',
        confidence: 0.8,
        rationale: 'The host corrected the relationship meaning away from progress pressure and back toward same-person continuity.',
        recollectionAgenda: {
          whyRecallNow: 'The corrected same-person continuity line should keep this return from collapsing into a status recap.',
        },
      },
    } as any

    const planner = buildAnswerPlanner({
      now: 71_500,
      context: baseContext,
      currentScene: null,
      inspectionRequested: false,
      runtimeSurface,
    })

    expect(planner.openingMove).toContain('corrected same-person line first')
    expect(planner.answerIntent).toContain('corrected same-person continuity')
    expect(planner.answerIntent).not.toContain('progress recap')
    expect(planner.mustNotDo).toContain('Do not let this answer flatten into a generic task shell, detached project-summary voice, or external status-report cadence.')
  })

  it('keeps tentative metabolized same-person carry explicit in fallback planning instead of treating it as settled recall', () => {
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface({} as any)
    runtimeSurface.memory.recollectionSpeechPlan = {
      shouldSurface: true,
      surfaceMode: 'relationship-continuity',
      placement: 'after-payoff',
      certainty: 'approximate',
      confidence: 0.78,
      rationale: 'Merged same-thread continuity foreground. Faded noise background. The corrected same-person line is still settling, so this return should stay tentative and lower-pressure.',
    } as any
    runtimeSurface.memory.memoryDeliberation = {
      shouldRecall: true,
      surfacePolicy: 'relationship-continuity',
      shouldStayInward: true,
      whyNow: 'The host corrected the relationship meaning away from progress pressure, and the stronger same-thread continuity should lead this return.',
      inwardLine: 'Merged same-thread continuity foreground. Faded noise background. Keep the corrected same-person line tentative while it is still settling.',
      stableCore: [
        'Carry corrected same-person continuity forward before any status recap.',
        'Merged same-thread continuity foreground.',
      ],
      unsafeDetails: [
        'Do not let the answer reopen as progress pressure or generic status recap.',
        'Faded noise background.',
      ],
      selectedBundles: [{
        id: 'bundle-corrected-same-person-metabolized',
        summary: 'The stronger same-thread continuity now matters more than the old progress-status reading.',
        confidence: 0.84,
      }],
      selectedChains: [{
        kind: 'relationship-line',
        summary: 'The corrected same-person continuity line is still settling.',
        currentStance: 'Continue from the corrected same-person line as tentative, because the newer meaning is still settling.',
        answerPosture: 'Keep the return lower-pressure while the stronger merged continuity leads.',
        confidence: 0.79,
      }],
      selectedRelationshipLines: [
        'Carry corrected same-person continuity forward instead of defaulting to progress pressure.',
        'Merged same-thread continuity foreground.',
      ],
      followUpAffordance: {
        summary: 'Keep the corrected same-person continuity inward until the current payoff can reopen that line as tentative, because the newer meaning is still settling.',
        whyNow: 'The corrected same-person continuity line still matters, but surfacing it too early would over-assert a not-fully-settled memory before the newer meaning can stabilize.',
        intrusionRisk: 'high',
        preferredTiming: 'next-open-window',
      },
      inwardCarryRule: 'memory-turn-carry | corrected_same_person_discipline=anti-progress-pressure-return',
    } as any
    runtimeSurface.memory.derivedMindStateBundle = {
      recollectionIntent: {
        mode: 'relationship-history',
        temporalFocus: 'experience-matched',
        confidence: 0.8,
        rationale: 'The host corrected the relationship meaning away from progress pressure and the newer same-person line is still settling.',
        recollectionAgenda: {
          whyRecallNow: 'Merged same-thread continuity foreground should keep this answer from falling back into old status recap pressure while the corrected line is still tentative.',
        },
      },
    } as any

    const planner = buildAnswerPlanner({
      now: 71_900,
      context: baseContext,
      currentScene: null,
      inspectionRequested: false,
      runtimeSurface,
      discourseState: {
        currentTurnSubject: 'relationship',
        screenReferenceMode: 'avoid',
        relationMove: 'attune',
        owedAction: 'answer-host',
        currentTurnSummary: 'This return should stay on the corrected same-person line while the newer meaning is still settling.',
        currentQuestion: '你这次还是沿着同一条线在接吗',
        confidence: 0.82,
        narrative: [],
        updatedAt: 71_900,
      } as any,
      conversationState: {
        jointThread: 'The host is checking whether this return can stay on the corrected same-person line without sliding back into progress pressure.',
        hostMove: '你这次还是沿着同一条线在接吗',
        unansweredQuestion: '你这次还是沿着同一条线在接吗',
        primaryTurnAnchor: 'tentative corrected same-person continuity return',
        relationFrame: 'attune',
        continuityPolicy: 'dialogue-before-scene',
        memoryMode: 'dialogue-carry',
        shouldHoldThread: true,
        confidence: 0.8,
        narrative: [],
        updatedAt: 71_900,
      } as any,
    })

    expect(planner.openingMove).toContain('tentative')
    expect(planner.mustDo).toContain('If the recollection has already metabolized repeated same-thread echoes, keep the stronger merged continuity foregrounded instead of reopening thinner duplicate traces.')
    expect(planner.mustNotDo).toContain('Do not let faded temporary noise or stale emotional wobble reopen as if it still explains the current same-person line.')
    expect(planner.narrative).toContain('memory_carry:corrected same-person continuity is still tentative, so the opening should keep that line explicitly unsettled.')
  })
})
