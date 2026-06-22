import { describe, expect, it } from 'vitest'

import { buildPreDialogueSendIdentityFromSnapshots } from './pre-dialogue-send-identity'

describe('buildPreDialogueSendIdentityFromSnapshots', () => {
  it('prefers the explicit runtime pre-dialogue awareness snapshot', () => {
    expect(buildPreDialogueSendIdentityFromSnapshots({
      preDialogueAwarenessSnapshot: {
        status: 'grounded',
        summaryLine: 'project=grounded | sameHer=grounded',
        companionHeadlineLine: 'Alicization is still one same-her local digital life.',
        companionBriefingLine: 'Phase 1 remains the active route.',
        companionNextClosureLine: 'Close the self-core continuity loop.',
        awarenessLine: 'Know the project, landed progress, and unfinished loop before replying.',
        emotionalClosureCue: 'Keep the return low-pressure and continuous.',
        reasonPreview: ['project awareness is explicit'],
      },
    })).toEqual({
      status: 'grounded',
      summaryLine: 'project=grounded | sameHer=grounded',
      companionHeadlineLine: 'Alicization is still one same-her local digital life.',
      companionBriefingLine: 'Phase 1 remains the active route.',
      companionNextClosureLine: 'Close the self-core continuity loop.',
      awarenessLine: 'Know the project, landed progress, and unfinished loop before replying.',
      emotionalClosureCue: 'Keep the return low-pressure and continuous.',
      projectState: {
        preflightSummary: 'project=grounded | sameHer=grounded',
        preDialogueAwarenessLine: 'Know the project, landed progress, and unfinished loop before replying.',
        preDialogueAwarenessSummary: 'project=grounded | sameHer=grounded',
        awarenessLine: 'Know the project, landed progress, and unfinished loop before replying.',
        companionHeadlineLine: 'Alicization is still one same-her local digital life.',
        companionBriefingLine: 'Phase 1 remains the active route.',
        identity: null,
        currentPhase: null,
        latestLandedProgress: null,
        memoryClosureSummary: null,
        primaryOpenLoop: null,
        nextClosureTarget: null,
        sameHerSelfLine: null,
        sameHerHoldDetail: null,
        sameHerDriftRisk: null,
        emotionalClosureCue: 'Keep the return low-pressure and continuous.',
      },
      reasonPreview: [
        'project awareness is explicit',
        'Know the project, landed progress, and unfinished loop before replying.',
        'Keep the return low-pressure and continuous.',
      ],
    })
  })

  it('keeps same-her continuity fields visible when rebuilding from project and closure snapshots', () => {
    const proactiveSameHerGap = 'Need stronger long-run proof that proactive hold, memory carry, and embodiment stay unified.'
    const continuityCue = 'Same callback line: continue after the detour without reopening from a generic shell.'

    expect(buildPreDialogueSendIdentityFromSnapshots({
      projectStateContinuitySnapshot: {
        identity: 'Alicization is a local-first digital life project.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: 'Return-side continuity already reaches the renderer bridge.',
        primaryOpenLoop: 'Keep memory, initiative, and body on one same-her line.',
        nextClosureTarget: 'Carry the reopened callback before widening outward.',
        continuitySummary: 'same-her continuity still needs the same callback line.',
        sameHerSelfLine: 'Same Phase 1 digital life. This is one continuous her.',
        sameHerHoldDetail: 'same-her hold: measured-return keeps this callback lower-pressure before it widens again.',
        sameHerDriftRisk: 'Generic project-shell reopening would split the same-her line.',
        emotionalClosureCue: 'Keep the return quiet and continuous.',
        proactiveSameHerGap,
        continuityCue,
        preDialogueAwareness: null,
        preDialogueClosure: null,
        nonHumanAuthoredStatus: null,
        turnId: 'turn-1',
        sessionId: 'session-1',
        origin: 'user-turn',
      } as any,
      preDialogueClosureSnapshot: {
        status: 'partial',
        summaryLine: 'closure=partial | sameHer=held',
        companionHeadlineLine: 'The same living line is being carried through memory and body.',
        companionBriefingLine: null,
        companionNextClosureLine: 'Keep the callback on the same line.',
        reasons: ['runtime bridge still needs explicit send identity'],
      },
    })).toEqual(expect.objectContaining({
      status: 'partial',
      summaryLine: 'closure=partial | sameHer=held',
      awarenessLine: 'same-her hold: measured-return keeps this callback lower-pressure before it widens again.',
      emotionalClosureCue: 'Keep the return quiet and continuous.',
      projectState: expect.objectContaining({
        identity: 'Alicization is a local-first digital life project.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: 'Return-side continuity already reaches the renderer bridge.',
        primaryOpenLoop: 'Keep memory, initiative, and body on one same-her line.',
        nextClosureTarget: 'Carry the reopened callback before widening outward.',
        continuitySummary: 'same-her continuity still needs the same callback line.',
        sameHerSelfLine: 'Same Phase 1 digital life. This is one continuous her.',
        sameHerHoldDetail: 'same-her hold: measured-return keeps this callback lower-pressure before it widens again.',
        sameHerDriftRisk: 'Generic project-shell reopening would split the same-her line.',
        proactiveSameHerGap,
        continuityCue,
      }),
      reasonPreview: expect.arrayContaining([
        proactiveSameHerGap,
        continuityCue,
        'runtime bridge still needs explicit send identity',
      ]),
    }))
  })

  it('keeps legacy latestProgress alive as landed progress when explicit renderer voice/page entries build send identity from inspector snapshots', () => {
    expect(buildPreDialogueSendIdentityFromSnapshots({
      projectStateContinuitySnapshot: {
        identity: 'Alicization is a local-first digital life project.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: null,
        latestProgress: 'Legacy inspector continuity progress already survives into explicit voice/page send identity.',
        primaryOpenLoop: 'Keep the same-her send identity path explicit.',
        nextClosureTarget: 'Carry landed progress into every explicit voice/page entry.',
        sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        preDialogueAwareness: null,
        preDialogueClosure: null,
        nonHumanAuthoredStatus: null,
        turnId: 'turn-legacy-progress',
        sessionId: 'session-legacy-progress',
        origin: 'user-turn',
      } as any,
    })).toEqual(expect.objectContaining({
      projectState: expect.objectContaining({
        latestLandedProgress: 'Legacy inspector continuity progress already survives into explicit voice/page send identity.',
      }),
      reasonPreview: expect.arrayContaining([
        'Legacy inspector continuity progress already survives into explicit voice/page send identity.',
      ]),
    }))
  })

  it('keeps audit-style landedProgressSummary alive as landed progress when explicit renderer voice/page entries build send identity from inspector snapshots', () => {
    expect(buildPreDialogueSendIdentityFromSnapshots({
      projectStateContinuitySnapshot: {
        identity: 'Alicization is a local-first digital life project.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: null,
        landedProgressSummary: 'Audit-style inspector continuity progress already survives into explicit voice/page send identity.',
        primaryOpenLoop: 'Keep the same-her send identity path explicit.',
        nextClosureTarget: 'Carry landed progress into every explicit voice/page entry.',
        sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        preDialogueAwareness: null,
        preDialogueClosure: null,
        nonHumanAuthoredStatus: null,
        turnId: 'turn-audit-progress',
        sessionId: 'session-audit-progress',
        origin: 'user-turn',
      } as any,
    })).toEqual(expect.objectContaining({
      projectState: expect.objectContaining({
        latestLandedProgress: 'Audit-style inspector continuity progress already survives into explicit voice/page send identity.',
      }),
      reasonPreview: expect.arrayContaining([
        'Audit-style inspector continuity progress already survives into explicit voice/page send identity.',
      ]),
    }))
  })
})
