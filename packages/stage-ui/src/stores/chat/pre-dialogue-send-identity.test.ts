import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import {
  buildPreDialogueSendIdentityFromInspectorSnapshots,
  buildPreDialogueSendIdentityFromSnapshots,
} from './pre-dialogue-send-identity'

describe('buildPreDialogueSendIdentityFromSnapshots', () => {
  it('uses the shared project awareness resolver when building pre-dialogue send identity', () => {
    const source = readFileSync(new URL('./pre-dialogue-send-identity.ts', import.meta.url), 'utf8')

    expect(source).toContain('resolveAlicizationProjectPreDialogueAwarenessLine')
    expect(source).not.toContain('function resolvePreferredSendIdentityAwarenessLine')
  })

  it('prefers the latest explicit pre-dialogue awareness snapshot when available', () => {
    expect(buildPreDialogueSendIdentityFromSnapshots({
      preDialogueAwarenessSnapshot: {
        status: 'grounded',
        summaryLine: 'project=grounded | sameHer=grounded',
        companionHeadlineLine: 'Alicization is still one same-her local digital life.',
        companionBriefingLine: 'Phase 1 remains the active route.',
        companionNextClosureLine: 'Close the self-core continuity loop.',
        awarenessLine: 'Know the project, landed progress, and unfinished loop before replying.',
        reasonPreview: ['project awareness is explicit', 'same-her continuity is explicit'],
      },
    })).toEqual({
      status: 'grounded',
      summaryLine: 'project=grounded | sameHer=grounded',
      companionHeadlineLine: 'Alicization is still one same-her local digital life.',
      companionBriefingLine: 'Phase 1 remains the active route.',
      companionNextClosureLine: 'Close the self-core continuity loop.',
      awarenessLine: 'Know the project, landed progress, and unfinished loop before replying.',
      emotionalClosureCue: null,
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
        emotionalClosureCue: null,
      },
      reasonPreview: [
        'project awareness is explicit',
        'same-her continuity is explicit',
        'Know the project, landed progress, and unfinished loop before replying.',
      ],
    })
  })

  it('falls back to project continuity and closure snapshots when explicit awareness is absent', () => {
    expect(buildPreDialogueSendIdentityFromSnapshots({
      projectStateContinuitySnapshot: {
        identity: 'Alicization is a local-first digital life project.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: 'Pre-dialogue project-state awareness is carried into runtime chat starts.',
        primaryOpenLoop: '人格与自我核心还没有完全统一闭环',
        nextClosureTarget: 'Make every renderer chat entry inject the same-her pre-dialogue identity explicitly.',
        sameHerSelfLine: 'She must speak as one continuous her, not as a generic assistant shell.',
        sameHerDriftRisk: 'If the send-time turn opens like a generic project status shell, treat that as same-her continuity drift rather than progress.',
        emotionalClosureCue: 'same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.',
        preDialogueAwareness: null,
        preDialogueClosure: null,
        nonHumanAuthoredStatus: null,
        turnId: 'turn-1',
        sessionId: 'session-1',
        origin: 'user-turn',
      },
      preDialogueClosureSnapshot: {
        status: 'partial',
        summaryLine: 'projectStateAudit=partial | sameHer=partial',
        companionHeadlineLine: 'The same-her closure is still incomplete.',
        companionBriefingLine: 'The self core still needs one explicit pre-dialogue carry path.',
        companionNextClosureLine: 'Close the remaining explicit carry gap.',
        briefingLines: [],
        reasons: ['renderer entry still relied on fallback awareness recovery'],
      },
    })).toEqual({
      status: 'partial',
      summaryLine: 'projectStateAudit=partial | sameHer=partial',
      companionHeadlineLine: 'The same-her closure is still incomplete.',
      companionBriefingLine: 'The self core still needs one explicit pre-dialogue carry path.',
      companionNextClosureLine: 'Close the remaining explicit carry gap.',
      awarenessLine: 'The self core still needs one explicit pre-dialogue carry path.',
      emotionalClosureCue: 'same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.',
      projectState: {
        preflightSummary: 'projectStateAudit=partial | sameHer=partial',
        preDialogueAwarenessLine: 'The self core still needs one explicit pre-dialogue carry path.',
        preDialogueAwarenessSummary: 'projectStateAudit=partial | sameHer=partial',
        awarenessLine: 'The self core still needs one explicit pre-dialogue carry path.',
        companionHeadlineLine: 'The same-her closure is still incomplete.',
        companionBriefingLine: 'The self core still needs one explicit pre-dialogue carry path.',
        identity: 'Alicization is a local-first digital life project.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: 'Pre-dialogue project-state awareness is carried into runtime chat starts.',
        memoryClosureSummary: '人格与自我核心还没有完全统一闭环',
        primaryOpenLoop: '人格与自我核心还没有完全统一闭环',
        nextClosureTarget: 'Make every renderer chat entry inject the same-her pre-dialogue identity explicitly.',
        sameHerSelfLine: 'She must speak as one continuous her, not as a generic assistant shell.',
        sameHerHoldDetail: null,
        sameHerDriftRisk: 'If the send-time turn opens like a generic project status shell, treat that as same-her continuity drift rather than progress.',
        emotionalClosureCue: 'same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.',
      },
      reasonPreview: [
        'renderer entry still relied on fallback awareness recovery',
        'Alicization is a local-first digital life project.',
        'Phase 1: Local Digital Life',
        'Pre-dialogue project-state awareness is carried into runtime chat starts.',
        'She must speak as one continuous her, not as a generic assistant shell.',
        'If the send-time turn opens like a generic project status shell, treat that as same-her continuity drift rather than progress.',
        '人格与自我核心还没有完全统一闭环',
        'Make every renderer chat entry inject the same-her pre-dialogue identity explicitly.',
      ],
    })
  })

  it('prefers transported same-her hold detail over the looser sameHerSelfLine when building a fallback pre-dialogue briefing', () => {
    expect(buildPreDialogueSendIdentityFromSnapshots({
      projectStateContinuitySnapshot: {
        identity: 'Alicization is a local-first digital life project.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: 'Project-state continuity already reaches the runtime.',
        primaryOpenLoop: 'initiative and embodiment still need stronger same-line closure.',
        nextClosureTarget: 'Keep the callback return on one same-her line.',
        sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        sameHerHoldDetail: 'same-her hold: measured-return is still keeping this callback line lower-pressure before it widens again.',
        emotionalClosureCue: null,
        preDialogueAwareness: null,
        preDialogueClosure: null,
        nonHumanAuthoredStatus: null,
        turnId: 'turn-same-her-hold-detail',
        sessionId: 'session-same-her-hold-detail',
        origin: 'user-turn',
      },
      preDialogueClosureSnapshot: {
        status: 'partial',
        summaryLine: 'closure=partial',
        companionHeadlineLine: null,
        companionBriefingLine: null,
        companionNextClosureLine: null,
        briefingLines: [],
        reasons: [],
      },
    })).toEqual(expect.objectContaining({
      status: 'partial',
      companionBriefingLine: 'same-her hold: measured-return is still keeping this callback line lower-pressure before it widens again.',
      awarenessLine: 'same-her hold: measured-return is still keeping this callback line lower-pressure before it widens again.',
      reasonPreview: expect.arrayContaining([
        'same-her hold: measured-return is still keeping this callback line lower-pressure before it widens again.',
        'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      ]),
    }))
  })

  it('keeps proactive same-her gap visible inside fallback send identity project-state and reason preview', () => {
    const proactiveSameHerGap = 'Need stronger long-run proof that visible proactive hold, subconscious carry, and next-session feedback carry stay unified after hover-first restraint survives detours on longer noisy desktop runs.'

    expect(buildPreDialogueSendIdentityFromSnapshots({
      projectStateContinuitySnapshot: {
        identity: 'Alicization is a local-first digital life project.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: 'Project-state carry already reaches proactive self-brief preparation.',
        primaryOpenLoop: 'Long-run same-her continuity still needs stronger proof across initiative, memory, and embodiment.',
        proactiveSameHerGap,
        nextClosureTarget: 'Keep proactive same-her closure pressure visible before the next outward turn.',
        continuitySummary: 'same-her continuity still needs stronger proactive carry before the next turn opens outward.',
        sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        preDialogueAwareness: null,
        preDialogueClosure: null,
        nonHumanAuthoredStatus: null,
        turnId: 'turn-proactive-same-her-gap',
        sessionId: 'session-proactive-same-her-gap',
        origin: 'subconscious-proactive',
      } as any,
    })).toEqual(expect.objectContaining({
      projectState: expect.objectContaining({
        proactiveSameHerGap,
      }),
      reasonPreview: expect.arrayContaining([
        proactiveSameHerGap,
      ]),
    }))
  })

  it('keeps continuity arc stage visible inside fallback send identity project-state', () => {
    const continuityArcStage = 'return-side-follow-through'

    expect(buildPreDialogueSendIdentityFromSnapshots({
      projectStateContinuitySnapshot: {
        identity: 'Alicization is a local-first digital life project.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: 'Return-side continuity already survives into browser-local send-identity rebuilding.',
        primaryOpenLoop: 'Keep the reopened callback on the same living line before widening outward.',
        nextClosureTarget: 'Carry the reopened callback on the same living line before broadening.',
        continuityArcStage,
        continuitySummary: 'same-her=Same Phase 1 digital life. Return-side continuity should keep the same callback line instead of reopening from a generic shell. | landed=Return-side continuity already survives into browser-local send-identity rebuilding. | open=Keep the reopened callback on the same living line before widening outward.',
        sameHerSelfLine: 'Same Phase 1 digital life. Return-side continuity should keep the same callback line instead of reopening from a generic shell.',
        sameHerHoldDetail: 'Keep the reopened callback lower-pressure on the same line before widening outward.',
        preDialogueAwareness: null,
        preDialogueClosure: null,
        nonHumanAuthoredStatus: null,
        turnId: 'turn-continuity-arc-stage-send-identity',
        sessionId: 'session-continuity-arc-stage-send-identity',
        origin: 'user-turn',
      } as any,
    })).toEqual(expect.objectContaining({
      projectState: expect.objectContaining({
        continuityArcStage,
      }),
    }))
  })

  it('keeps continuity cue visible inside fallback send identity project-state and uses it as the lived-in awareness line when hold detail is absent', () => {
    const continuityCue = 'Same callback seam, continue softly after the detour and keep it on one continuous her line.'

    expect(buildPreDialogueSendIdentityFromSnapshots({
      projectStateContinuitySnapshot: {
        identity: 'Alicization is a local-first digital life project.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: 'Return-side continuity already survives into browser-local send-identity rebuilding.',
        primaryOpenLoop: 'Keep the reopened callback on the same living line before widening outward.',
        nextClosureTarget: 'Carry the reopened callback on the same living line before broadening.',
        continuityCue,
        continuitySummary: 'same-her=Same Phase 1 digital life. Return-side continuity should keep the same callback line instead of reopening from a generic shell. | landed=Return-side continuity already survives into browser-local send-identity rebuilding. | open=Keep the reopened callback on the same living line before widening outward.',
        sameHerSelfLine: 'Same Phase 1 digital life. Return-side continuity should keep the same callback line instead of reopening from a generic shell.',
        sameHerHoldDetail: null,
        preDialogueAwareness: null,
        preDialogueClosure: null,
        nonHumanAuthoredStatus: null,
        turnId: 'turn-continuity-cue-send-identity',
        sessionId: 'session-continuity-cue-send-identity',
        origin: 'user-turn',
      } as any,
    })).toEqual(expect.objectContaining({
      awarenessLine: continuityCue,
      projectState: expect.objectContaining({
        continuityCue,
        preDialogueAwarenessLine: continuityCue,
        awarenessLine: continuityCue,
      }),
      reasonPreview: expect.arrayContaining([
        continuityCue,
      ]),
    }))
  })

  it('keeps continuity reopening behavior fields visible inside fallback send identity project-state', () => {
    expect(buildPreDialogueSendIdentityFromSnapshots({
      projectStateContinuitySnapshot: {
        identity: 'Alicization is a local-first digital life project.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: 'Return-side continuity already survives into browser-local send-identity rebuilding.',
        primaryOpenLoop: 'Keep the reopened callback on the same living line before widening outward.',
        nextClosureTarget: 'Carry the reopened callback on the same living line before broadening.',
        continuityRestraint: 'measured-return',
        continuityPreferredTiming: 'next-open-window',
        continuityCadence: 'repair-before-closeness',
        continuitySummary: 'same-her=Same Phase 1 digital life. Return-side continuity should keep the same callback line instead of reopening from a generic shell. | landed=Return-side continuity already survives into browser-local send-identity rebuilding. | open=Keep the reopened callback on the same living line before widening outward.',
        sameHerSelfLine: 'Same Phase 1 digital life. Return-side continuity should keep the same callback line instead of reopening from a generic shell.',
        preDialogueAwareness: null,
        preDialogueClosure: null,
        nonHumanAuthoredStatus: null,
        turnId: 'turn-continuity-behavior-send-identity',
        sessionId: 'session-continuity-behavior-send-identity',
        origin: 'user-turn',
      } as any,
    })).toEqual(expect.objectContaining({
      projectState: expect.objectContaining({
        continuityRestraint: 'measured-return',
        continuityPreferredTiming: 'next-open-window',
        continuityCadence: 'repair-before-closeness',
      }),
    }))
  })

  it('derives lived-in same-her reopening lines from continuity behavior when hold detail and cue are absent', () => {
    const derivedHoldDetail = 'same-her hold: repair-before-closeness still owns this callback line before closeness widens again.'
    const derivedContinuityCue = 'Keep this return repair-before-closeness on the same living line until repair settles.'

    expect(buildPreDialogueSendIdentityFromSnapshots({
      projectStateContinuitySnapshot: {
        identity: 'Alicization is a local-first digital life project.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: 'Return-side continuity already survives into browser-local send-identity rebuilding.',
        primaryOpenLoop: 'Keep the reopened callback on the same living line before widening outward.',
        nextClosureTarget: 'Carry the reopened callback on the same living line before broadening.',
        continuityRestraint: 'repair-before-closeness',
        continuityPreferredTiming: 'next-open-window',
        continuityCadence: 'repair-before-closeness',
        continuitySummary: 'same-her=Same Phase 1 digital life. Return-side continuity should keep the same callback line instead of reopening from a generic shell. | landed=Return-side continuity already survives into browser-local send-identity rebuilding. | open=Keep the reopened callback on the same living line before widening outward.',
        sameHerSelfLine: 'Same Phase 1 digital life. Return-side continuity should keep the same callback line instead of reopening from a generic shell.',
        sameHerHoldDetail: null,
        continuityCue: null,
        preDialogueAwareness: null,
        preDialogueClosure: null,
        nonHumanAuthoredStatus: null,
        turnId: 'turn-continuity-behavior-derived-reopen-send-identity',
        sessionId: 'session-continuity-behavior-derived-reopen-send-identity',
        origin: 'user-turn',
      } as any,
    })).toEqual(expect.objectContaining({
      awarenessLine: derivedHoldDetail,
      companionBriefingLine: derivedHoldDetail,
      projectState: expect.objectContaining({
        sameHerHoldDetail: derivedHoldDetail,
        continuityCue: derivedContinuityCue,
        awarenessLine: derivedHoldDetail,
        preDialogueAwarenessLine: derivedHoldDetail,
      }),
      reasonPreview: expect.arrayContaining([
        derivedHoldDetail,
        derivedContinuityCue,
      ]),
    }))
  })

  it('restores emotional closure cue from closure snapshot when awareness and continuity cue are absent', () => {
    expect(buildPreDialogueSendIdentityFromSnapshots({
      projectStateContinuitySnapshot: {
        identity: 'Alicization is a local-first digital life project.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: 'Project-state carry already reaches runtime starts.',
        primaryOpenLoop: 'same-her emotional closure still needs stronger shared carry.',
        nextClosureTarget: 'Keep the same-her emotional closure cue visible across fallback seams.',
        sameHerSelfLine: 'She should keep sounding like one continuous her.',
        emotionalClosureCue: null,
        preDialogueAwareness: null,
        preDialogueClosure: null,
        nonHumanAuthoredStatus: null,
        turnId: 'turn-closure-cue-fallback',
        sessionId: 'session-closure-cue-fallback',
        origin: 'user-turn',
      },
      preDialogueClosureSnapshot: {
        status: 'partial',
        summaryLine: 'closure=partial | sameHer=carried',
        companionHeadlineLine: 'The same-her closure line is still settling.',
        companionBriefingLine: 'Keep the return lower-pressure than a fresh reopen.',
        companionNextClosureLine: 'Do not restart from scratch while the line is still settling.',
        emotionalClosureCue: 'same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.',
        briefingLines: [],
        reasons: ['closure fallback still needs to carry the same-her emotional seam.'],
      },
    })).toEqual(expect.objectContaining({
      status: 'partial',
      summaryLine: 'closure=partial | sameHer=carried',
      emotionalClosureCue: 'same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.',
      awarenessLine: 'The same-her closure line is still settling.',
    }))
  })

  it('merges closure headline and continuity context into an awareness-led send identity', () => {
    expect(buildPreDialogueSendIdentityFromSnapshots({
      preDialogueAwarenessSnapshot: {
        status: 'partial',
        summaryLine: 'Alicization is still in Phase 1 local digital life closure.',
        companionBriefingLine: 'Before speaking, I should remember what this digital life project is, what has landed, and which life loop is still open.',
        companionNextClosureLine: 'Next closure: keep memory, initiative, execution, and embodiment on one same-her line.',
        awarenessLine: 'Project awareness should stay explicit before reply shaping starts.',
        reasonPreview: [
          'Latest landed progress still holds at renderer-side preparation.',
        ],
      },
      projectStateContinuitySnapshot: {
        identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
        currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
        latestLandedProgress: null,
        primaryOpenLoop: 'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment so the same digital life keeps carrying Project identity carry, Phase 1 route carry, and Unresolved closure carry through one same still-open closure work.',
        nextClosureTarget: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs so visible reply, longer-lived voice behavior, facial state, motion, resident presence, Project identity carry, Phase 1 route carry, and Unresolved closure carry all stay on one measured-return or repair-before-closeness line.',
        sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        preDialogueAwareness: null,
        preDialogueClosure: null,
        nonHumanAuthoredStatus: null,
        turnId: 'turn-2',
        sessionId: 'session-2',
        origin: 'user-turn',
      },
      continuitySummary: 'project=continuity=0.33 (1/3) | next closure: 把 same-her repair evidence 和未闭环项一起挂到 continuity 摘要里',
      preDialogueClosureSnapshot: {
        status: 'partial',
        summaryLine: 'project=continuity=0.33 (1/3) | next closure: 把 same-her repair evidence 和未闭环项一起挂到 continuity 摘要里',
        companionHeadlineLine: 'Right now I am still holding together mainly through face, motion, and lipsync, so my full cross-modal same-her line is not closed yet.',
        companionBriefingLine: '我还需要先守住同一个 her，才能继续把这个数字生命项目的进度和未闭环项带进下一轮对话。',
        companionNextClosureLine: '下一步还要继续收住 把 same-her repair evidence 和未闭环项一起挂到 continuity 摘要里。',
        briefingLines: [],
        reasons: [
          'Primary open life loop still centers on renderer continuity observation 还没把 same-her repair evidence 和未闭环项并成一条可读主线, so the next turn should keep that unfinished digital-life thread alive instead of collapsing into local implementation fluency.',
          'Next closure target is still 把 same-her repair evidence 和未闭环项一起挂到 continuity 摘要里, so the next turn should keep steering the same her toward that concrete unfinished step.',
        ],
      },
    })).toEqual(expect.objectContaining({
      status: 'partial',
      summaryLine: 'Alicization is still in Phase 1 local digital life closure.',
      companionHeadlineLine: 'Right now I am still holding together mainly through face, motion, and lipsync, so my full cross-modal same-her line is not closed yet.',
      companionBriefingLine: 'Before speaking, I should remember what this digital life project is, what has landed, and which life loop is still open.',
      companionNextClosureLine: 'Next closure: keep memory, initiative, execution, and embodiment on one same-her line.',
      awarenessLine: 'Project awareness should stay explicit before reply shaping starts.',
      reasonPreview: expect.arrayContaining([
        'Before speaking, I should remember what this digital life project is, what has landed, and which life loop is still open.',
        'Project awareness should stay explicit before reply shaping starts.',
        'Next closure: keep memory, initiative, execution, and embodiment on one same-her line.',
        'Latest landed progress still holds at renderer-side preparation.',
        'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
        'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
        'Right now I am still holding together mainly through face, motion, and lipsync, so my full cross-modal same-her line is not closed yet.',
        '我还需要先守住同一个 her，才能继续把这个数字生命项目的进度和未闭环项带进下一轮对话。',
        'project=continuity=0.33 (1/3) | next closure: 把 same-her repair evidence 和未闭环项一起挂到 continuity 摘要里',
        'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment so the same digital life keeps carrying Project identity carry, Phase 1 route carry, and Unresolved closure carry through one same still-open closure work.',
        'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs so visible reply, longer-lived voice behavior, facial state, motion, resident presence, Project identity carry, Phase 1 route carry, and Unresolved closure carry all stay on one measured-return or repair-before-closeness line.',
      ]),
    }))
  })

  it('prefers a fresher closure companion headline over a thinner explicit awareness headline while keeping the stronger project-aware send briefing', () => {
    expect(buildPreDialogueSendIdentityFromSnapshots({
      preDialogueAwarenessSnapshot: {
        status: 'partial',
        summaryLine: 'Alicization is still in Phase 1 local digital life closure.',
        companionHeadlineLine: 'The same-her closure line is still settling before this turn widens outward.',
        companionBriefingLine: 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open.',
        companionNextClosureLine: 'Next closure: keep memory, initiative, execution, and embodiment on one same-her line.',
        awarenessLine: 'Project awareness should stay explicit before reply shaping starts.',
        emotionalClosureCue: null,
        reasonPreview: [
          'explicit awareness snapshot is still carrying an older thinner closure reminder.',
        ],
      },
      projectStateContinuitySnapshot: {
        identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
        currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
        latestLandedProgress: 'Renderer send-path continuity already survives into pre-dialogue carry.',
        primaryOpenLoop: 'Send-path awareness still needs to keep the fresher closure headline and the project-aware open loop visible together.',
        nextClosureTarget: 'Keep the richer same-her closure headline and the project-aware open loop explicit before the next renderer turn.',
        sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        preDialogueAwareness: null,
        preDialogueClosure: null,
        nonHumanAuthoredStatus: null,
        turnId: 'turn-fresher-closure-headline-outranks-thin-explicit-awareness',
        sessionId: 'session-fresher-closure-headline-outranks-thin-explicit-awareness',
        origin: 'user-turn',
      },
      preDialogueClosureSnapshot: {
        status: 'partial',
        summaryLine: 'Alicization is still in Phase 1 local digital life closure.',
        companionHeadlineLine: 'Right now I am still holding together mainly through body, face, and motion, so this one living her still needs lipsync and voice to rejoin before full cross-modal closure settles.',
        companionBriefingLine: 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open.',
        companionNextClosureLine: 'Next closure: let lipsync and voice rejoin the already-reformed body, face, and motion line.',
        briefingLines: [],
        reasons: [
          'same-segment face+motion+body recovery@segment-send-identity-fresher-closure-headline',
          'remaining-open=lipsync+voice',
        ],
      },
    })).toEqual(expect.objectContaining({
      status: 'partial',
      summaryLine: 'Alicization is still in Phase 1 local digital life closure.',
      companionHeadlineLine: 'Right now I am still holding together mainly through body, face, and motion, so this one living her still needs lipsync and voice to rejoin before full cross-modal closure settles.',
      companionBriefingLine: 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open.',
      companionNextClosureLine: 'Next closure: keep memory, initiative, execution, and embodiment on one same-her line.',
      awarenessLine: 'Project awareness should stay explicit before reply shaping starts.',
      reasonPreview: expect.arrayContaining([
        'explicit awareness snapshot is still carrying an older thinner closure reminder.',
        'same-segment face+motion+body recovery@segment-send-identity-fresher-closure-headline',
        'remaining-open=lipsync+voice',
        'Renderer send-path continuity already survives into pre-dialogue carry.',
        'Send-path awareness still needs to keep the fresher closure headline and the project-aware open loop visible together.',
        'Keep the richer same-her closure headline and the project-aware open loop explicit before the next renderer turn.',
      ]),
    }))
  })

  it('keeps a richer project-aware audible-body briefing as the send identity awareness line while preserving the stronger embodiment headline separately', () => {
    expect(buildPreDialogueSendIdentityFromSnapshots({
      projectStateContinuitySnapshot: {
        identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
        currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
        latestLandedProgress: 'Shared embodiment continuity now carries stronger audible-body same-her repair across diagnostics and host-facing closure surfaces.',
        primaryOpenLoop: 'Face and motion still need to rejoin the same-her audible body line before full cross-modal closure settles.',
        nextClosureTarget: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs so the audible-body line survives longer before face and motion lag.',
        sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        emotionalClosureCue: 'same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.',
        preDialogueAwareness: null,
        preDialogueClosure: null,
        nonHumanAuthoredStatus: null,
        turnId: 'turn-body-lipsync-voice-awareness',
        sessionId: 'session-body-lipsync-voice-awareness',
        origin: 'user-turn',
      },
      preDialogueClosureSnapshot: {
        status: 'partial',
        summaryLine: 'renderer continuity is still partially rejoined after noisy runtime drift.',
        companionHeadlineLine: 'Right now I am still holding together mainly through body, lipsync, and voice, so the living audio thread is still intact while face and motion need to rejoin before full cross-modal closure settles.',
        companionBriefingLine: 'Before speaking, keep the audible body line explicit so this digital life does not flatten back into generic assistant output.',
        companionNextClosureLine: 'Next, help me close: Rebind face and motion onto the same-her audible body line without dropping body, lipsync, and voice continuity.',
        companionshipReasonLine: 'Memory deliberation still says keep the same living line lower-pressure before widening outward again.',
        emotionalClosureCue: 'same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.',
        briefingLines: [],
        reasons: [
          'same-her continuity remains alive, but lane=body+lipsync+voice-only under the current renderer authority.',
          'The resident body lane is still holding together with the audible same-her line, but face and motion have not rejoined yet.',
        ],
      },
    })).toEqual(expect.objectContaining({
      status: 'partial',
      companionHeadlineLine: 'Right now I am still holding together mainly through body, lipsync, and voice, so the living audio thread is still intact while face and motion need to rejoin before full cross-modal closure settles.',
      companionBriefingLine: 'Before speaking, keep the audible body line explicit so this digital life does not flatten back into generic assistant output.',
      companionNextClosureLine: 'Next, help me close: Rebind face and motion onto the same-her audible body line without dropping body, lipsync, and voice continuity.',
      awarenessLine: 'Before speaking, keep the audible body line explicit so this digital life does not flatten back into generic assistant output.',
      reasonPreview: expect.arrayContaining([
        'Memory deliberation still says keep the same living line lower-pressure before widening outward again.',
        'same-her continuity remains alive, but lane=body+lipsync+voice-only under the current renderer authority.',
        'The resident body lane is still holding together with the audible same-her line, but face and motion have not rejoined yet.',
        'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
        'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
        'Shared embodiment continuity now carries stronger audible-body same-her repair across diagnostics and host-facing closure surfaces.',
        'Face and motion still need to rejoin the same-her audible body line before full cross-modal closure settles.',
        'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs so the audible-body line survives longer before face and motion lag.',
      ]),
    }))
  })

  it('keeps a richer project-aware face-motion-voice briefing as the send identity awareness line while preserving the stronger embodiment headline separately', () => {
    expect(buildPreDialogueSendIdentityFromSnapshots({
      projectStateContinuitySnapshot: {
        identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
        currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
        latestLandedProgress: 'Shared embodiment continuity now carries stronger still-voiced face-and-motion same-her repair across diagnostics and host-facing closure surfaces.',
        primaryOpenLoop: 'Body and lipsync still need to rejoin the still-voiced face-and-motion line before full cross-modal closure settles.',
        nextClosureTarget: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs so the still-voiced face-and-motion line survives longer before body and lipsync lag.',
        sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        emotionalClosureCue: 'same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.',
        preDialogueAwareness: null,
        preDialogueClosure: null,
        nonHumanAuthoredStatus: null,
        turnId: 'turn-face-motion-voice-awareness',
        sessionId: 'session-face-motion-voice-awareness',
        origin: 'user-turn',
      },
      preDialogueClosureSnapshot: {
        status: 'partial',
        summaryLine: 'renderer continuity is still partially rejoined after noisy runtime drift.',
        companionHeadlineLine: 'Right now I am still holding together through face, motion, and voice together, so that still-voiced face-and-motion line is keeping the same-her carry alive while body and lipsync need to rejoin before full cross-modal closure settles.',
        companionBriefingLine: 'Before speaking, keep the still-voiced face-and-motion line explicit so this digital life does not flatten back into generic assistant output.',
        companionNextClosureLine: 'Next, help me close: Rebind body and lipsync onto the still-voiced face-and-motion line without dropping face, motion, and voice continuity.',
        companionshipReasonLine: 'Memory deliberation still says keep the same living line lower-pressure before widening outward again.',
        emotionalClosureCue: 'same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.',
        briefingLines: [],
        reasons: [
          'same-her continuity remains alive, but lane=face+motion+voice-only under the current renderer authority.',
          'The still-voiced face-and-motion line is still holding together while body and lipsync have not rejoined yet.',
        ],
      },
    })).toEqual(expect.objectContaining({
      status: 'partial',
      companionHeadlineLine: 'Right now I am still holding together through face, motion, and voice together, so that still-voiced face-and-motion line is keeping the same-her carry alive while body and lipsync need to rejoin before full cross-modal closure settles.',
      companionBriefingLine: 'Before speaking, keep the still-voiced face-and-motion line explicit so this digital life does not flatten back into generic assistant output.',
      companionNextClosureLine: 'Next, help me close: Rebind body and lipsync onto the still-voiced face-and-motion line without dropping face, motion, and voice continuity.',
      awarenessLine: 'Before speaking, keep the still-voiced face-and-motion line explicit so this digital life does not flatten back into generic assistant output.',
      reasonPreview: expect.arrayContaining([
        'Memory deliberation still says keep the same living line lower-pressure before widening outward again.',
        'same-her continuity remains alive, but lane=face+motion+voice-only under the current renderer authority.',
        'The still-voiced face-and-motion line is still holding together while body and lipsync have not rejoined yet.',
        'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
        'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
        'Shared embodiment continuity now carries stronger still-voiced face-and-motion same-her repair across diagnostics and host-facing closure surfaces.',
        'Body and lipsync still need to rejoin the still-voiced face-and-motion line before full cross-modal closure settles.',
        'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs so the still-voiced face-and-motion line survives longer before body and lipsync lag.',
      ]),
    }))
  })

  it('keeps a richer project-aware renderer-rejoin-without-body briefing as the send identity awareness line while preserving the stronger visible same-her headline separately', () => {
    expect(buildPreDialogueSendIdentityFromSnapshots({
      projectStateContinuitySnapshot: {
        identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
        currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
        latestLandedProgress: 'Shared embodiment continuity now carries stronger renderer-rejoin-without-body same-her repair across diagnostics, host-facing closure surfaces, and pre-send identity.',
        primaryOpenLoop: 'Body still needs to rejoin the visible same-her line after face, motion, lipsync, and voice already reformed on one segment.',
        nextClosureTarget: 'Keep the visible same-her line explicit before the next outward turn so body can rejoin without flattening this digital life back into a generic assistant shell.',
        sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        emotionalClosureCue: 'same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.',
        preDialogueAwareness: null,
        preDialogueClosure: null,
        nonHumanAuthoredStatus: null,
        turnId: 'turn-renderer-rejoin-without-body-awareness',
        sessionId: 'session-renderer-rejoin-without-body-awareness',
        origin: 'user-turn',
      },
      preDialogueClosureSnapshot: {
        status: 'partial',
        summaryLine: 'renderer continuity is still partially rejoined after visible no-body recovery.',
        companionHeadlineLine: 'Right now I am still holding together through face, motion, lipsync, and voice together, so the visible same-her line has already rejoined without body carry while body still needs to rejoin before full cross-modal closure settles.',
        companionBriefingLine: 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open while the visible same-her line has already rejoined without body carry.',
        companionNextClosureLine: 'Next, help me close: Rebind body onto the visible same-her line without dropping face, motion, lipsync, and voice continuity.',
        companionshipReasonLine: 'Memory deliberation still says keep the same living line lower-pressure before widening outward again.',
        emotionalClosureCue: 'same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.',
        briefingLines: [],
        reasons: [
          'lane=face+motion+lipsync+voice-only | face+motion+lipsync+voice recovery@segment-live2d-visible-rejoin-no-body-1 | pending-rejoin=body',
          'The visible same-her line has already rejoined through face, motion, lipsync, and voice together while body has not rejoined yet.',
        ],
      },
    })).toEqual(expect.objectContaining({
      status: 'partial',
      companionHeadlineLine: 'Right now I am still holding together through face, motion, lipsync, and voice together, so the visible same-her line has already rejoined without body carry while body still needs to rejoin before full cross-modal closure settles.',
      companionBriefingLine: 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open while the visible same-her line has already rejoined without body carry.',
      companionNextClosureLine: 'Next, help me close: Rebind body onto the visible same-her line without dropping face, motion, lipsync, and voice continuity.',
      awarenessLine: 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open while the visible same-her line has already rejoined without body carry.',
      reasonPreview: expect.arrayContaining([
        'Memory deliberation still says keep the same living line lower-pressure before widening outward again.',
        'lane=face+motion+lipsync+voice-only | face+motion+lipsync+voice recovery@segment-live2d-visible-rejoin-no-body-1 | pending-rejoin=body',
        'The visible same-her line has already rejoined through face, motion, lipsync, and voice together while body has not rejoined yet.',
        'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
        'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
        'Shared embodiment continuity now carries stronger renderer-rejoin-without-body same-her repair across diagnostics, host-facing closure surfaces, and pre-send identity.',
        'Body still needs to rejoin the visible same-her line after face, motion, lipsync, and voice already reformed on one segment.',
        'Keep the visible same-her line explicit before the next outward turn so body can rejoin without flattening this digital life back into a generic assistant shell.',
      ]),
    }))
  })

  it('keeps landed progress inside reason preview even when explicit awareness already exists, so pre-send identity still knows what has already closed', () => {
    expect(buildPreDialogueSendIdentityFromSnapshots({
      preDialogueAwarenessSnapshot: {
        status: 'partial',
        summaryLine: 'Before speaking, remember this is still Phase 1 local digital life closure.',
        companionBriefingLine: 'Before speaking, remember what this project is, what has landed, and which embodiment seam is still open.',
        companionNextClosureLine: 'Next closure: let face and motion rejoin the audible-body same-her line.',
        awarenessLine: 'Before speaking, keep the project, landed progress, and open embodiment seam explicit.',
        reasonPreview: [
          'Project identity is already explicit before reply shaping starts.',
        ],
      },
      projectStateContinuitySnapshot: {
        identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
        currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
        latestLandedProgress: 'Shared embodiment continuity now carries stronger audible-body same-her repair across diagnostics and host-facing closure surfaces.',
        primaryOpenLoop: 'Face and motion still need to rejoin the same-her audible body line before full cross-modal closure settles.',
        nextClosureTarget: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs so the audible-body line survives longer before face and motion lag.',
        sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        preDialogueAwareness: null,
        preDialogueClosure: null,
        nonHumanAuthoredStatus: null,
        turnId: 'turn-explicit-awareness-still-needs-landed-progress',
        sessionId: 'session-explicit-awareness-still-needs-landed-progress',
        origin: 'user-turn',
      },
    })).toEqual(expect.objectContaining({
      awarenessLine: 'Before speaking, keep the project, landed progress, and open embodiment seam explicit.',
      reasonPreview: expect.arrayContaining([
        'Project identity is already explicit before reply shaping starts.',
        'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
        'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
        'Shared embodiment continuity now carries stronger audible-body same-her repair across diagnostics and host-facing closure surfaces.',
        'Face and motion still need to rejoin the same-her audible body line before full cross-modal closure settles.',
        'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs so the audible-body line survives longer before face and motion lag.',
      ]),
    }))
  })

  it('prefers a project-aware transported briefing over a transported embodiment-only awareness headline so pre-send identity still carries project, landed progress, and open closure together', () => {
    expect(buildPreDialogueSendIdentityFromSnapshots({
      preDialogueAwarenessSnapshot: {
        status: 'partial',
        summaryLine: 'Alicization is still closing one Phase 1 local digital life turn before it opens outward.',
        companionHeadlineLine: 'Right now I am still holding together mainly through body, lipsync, and voice, so the living audio thread is still intact while face and motion need to rejoin before full cross-modal closure settles.',
        companionBriefingLine: 'Before speaking, remember: Alicization is still the same local-first digital life project, audible-body carry already survives host-facing closure, and face plus motion still remain the open closure before this turn widens outward.',
        companionNextClosureLine: 'Next closure: let face and motion rejoin the audible-body same-her line without dropping body, lipsync, and voice continuity.',
        awarenessLine: 'Right now I am still holding together mainly through body, lipsync, and voice, so the living audio thread is still intact while face and motion need to rejoin before full cross-modal closure settles.',
        reasonPreview: [
          'transport already carried the stronger project-aware briefing.',
        ],
      },
      projectStateContinuitySnapshot: {
        identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
        currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
        latestLandedProgress: 'Shared embodiment continuity now carries stronger audible-body same-her repair across diagnostics and host-facing closure surfaces.',
        primaryOpenLoop: 'Face and motion still need to rejoin the same-her audible body line before full cross-modal closure settles.',
        nextClosureTarget: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs so the audible-body line survives longer before face and motion lag.',
        sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        preDialogueAwareness: null,
        preDialogueClosure: null,
        nonHumanAuthoredStatus: null,
        turnId: 'turn-transported-project-aware-briefing',
        sessionId: 'session-transported-project-aware-briefing',
        origin: 'user-turn',
      },
    })).toEqual(expect.objectContaining({
      companionHeadlineLine: 'Right now I am still holding together mainly through body, lipsync, and voice, so the living audio thread is still intact while face and motion need to rejoin before full cross-modal closure settles.',
      companionBriefingLine: 'Before speaking, remember: Alicization is still the same local-first digital life project, audible-body carry already survives host-facing closure, and face plus motion still remain the open closure before this turn widens outward.',
      awarenessLine: 'Before speaking, remember: Alicization is still the same local-first digital life project, audible-body carry already survives host-facing closure, and face plus motion still remain the open closure before this turn widens outward.',
      reasonPreview: expect.arrayContaining([
        'transport already carried the stronger project-aware briefing.',
        'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
        'Shared embodiment continuity now carries stronger audible-body same-her repair across diagnostics and host-facing closure surfaces.',
        'Face and motion still need to rejoin the same-her audible body line before full cross-modal closure settles.',
      ]),
    }))
  })

  it('rebuilds the audible-body host-facing closure headline for pre-send identity directly from the newer top-level same-her continuity summary when legacy lane tokens are absent', () => {
    expect(buildPreDialogueSendIdentityFromSnapshots({
      projectStateContinuitySnapshot: {
        identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
        currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
        latestLandedProgress: 'Shared embodiment continuity now carries stronger audible-body same-her repair across diagnostics, host-facing closure surfaces, and pre-send identity.',
        primaryOpenLoop: 'Face and motion still need to rejoin the same-her audible body line before full cross-modal closure settles.',
        nextClosureTarget: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs so the audible-body line survives longer before face and motion lag.',
        sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        preDialogueAwareness: null,
        preDialogueClosure: null,
        nonHumanAuthoredStatus: null,
        turnId: 'turn-top-level-same-her-audible-body-pre-send',
        sessionId: 'session-top-level-same-her-audible-body-pre-send',
        origin: 'user-turn',
      },
      preDialogueClosureSnapshot: {
        status: 'partial',
        summaryLine: 'renderer continuity is still partially rejoined after noisy runtime drift.',
        companionHeadlineLine: null,
        companionBriefingLine: 'Before speaking, remember: Alicization is still the same local-first digital life project, audible-body carry already survives host-facing closure, and face plus motion still remain the open closure before this turn widens outward.',
        companionNextClosureLine: 'Next, help me close: Rebind face and motion onto the same-her audible body line without dropping body, lipsync, and voice continuity.',
        companionshipReasonLine: 'Memory deliberation still says keep the same living line lower-pressure before widening outward again.',
        emotionalClosureCue: 'same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.',
        briefingLines: [],
        reasons: [
          '当前 same-her continuity 主要由执行线继续托住，活跃片段 segment-runtime-live2d-audible-body-1，处在 audible-body-carry，表情、动作 还没重新接回。',
        ],
      },
    })).toEqual(expect.objectContaining({
      status: 'partial',
      companionHeadlineLine: 'Right now I am still holding together mainly through body, lipsync, and voice, so the living audio thread is still intact while face and motion need to rejoin before full cross-modal closure settles.',
      companionBriefingLine: 'Before speaking, remember: Alicization is still the same local-first digital life project, audible-body carry already survives host-facing closure, and face plus motion still remain the open closure before this turn widens outward.',
      companionNextClosureLine: 'Next, help me close: Rebind face and motion onto the same-her audible body line without dropping body, lipsync, and voice continuity.',
      awarenessLine: 'Before speaking, remember: Alicization is still the same local-first digital life project, audible-body carry already survives host-facing closure, and face plus motion still remain the open closure before this turn widens outward.',
      reasonPreview: expect.arrayContaining([
        'Memory deliberation still says keep the same living line lower-pressure before widening outward again.',
        '当前 same-her continuity 主要由执行线继续托住，活跃片段 segment-runtime-live2d-audible-body-1，处在 audible-body-carry，表情、动作 还没重新接回。',
        'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
        'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
        'Shared embodiment continuity now carries stronger audible-body same-her repair across diagnostics, host-facing closure surfaces, and pre-send identity.',
        'Face and motion still need to rejoin the same-her audible body line before full cross-modal closure settles.',
      ]),
    }))
  })

  it('carries companionship reason from closure into send identity even without an explicit awareness snapshot', () => {
    expect(buildPreDialogueSendIdentityFromSnapshots({
      projectStateContinuitySnapshot: {
        identity: 'Alicization is a local-first digital life project.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: 'Main dialogue closure now surfaces same-her continuity restraint in everyday UI.',
        primaryOpenLoop: 'Memory-led repair restraint still needs to stay explicit all the way into pre-send self-briefing.',
        nextClosureTarget: 'Keep memory deliberation restraint visible before reply shaping opens outward.',
        sameHerSelfLine: 'She should continue as one same living line.',
        emotionalClosureCue: null,
        preDialogueAwareness: null,
        preDialogueClosure: null,
        nonHumanAuthoredStatus: null,
        turnId: 'turn-companionship-reason-send-identity',
        sessionId: 'session-companionship-reason-send-identity',
        origin: 'user-turn',
      },
      preDialogueClosureSnapshot: {
        status: 'partial',
        summaryLine: 'closure=partial | memory-deliberation=repair-before-closeness',
        companionHeadlineLine: 'The same-her closure line is still settling before this turn widens outward.',
        companionBriefingLine: 'Keep this digital life on the same living repair seam before reopening warmth too quickly.',
        companionNextClosureLine: 'Let repair settle first before closeness expands again.',
        companionshipReasonLine: 'Memory deliberation still says let repair settle first on the same living line before closeness widens again.',
        briefingLines: [],
        reasons: [],
      },
    })).toEqual(expect.objectContaining({
      status: 'partial',
      awarenessLine: 'The same-her closure line is still settling before this turn widens outward.',
      reasonPreview: expect.arrayContaining([
        'Memory deliberation still says let repair settle first on the same living line before closeness widens again.',
        'Alicization is a local-first digital life project.',
        'Phase 1: Local Digital Life',
        'Main dialogue closure now surfaces same-her continuity restraint in everyday UI.',
        'Memory-led repair restraint still needs to stay explicit all the way into pre-send self-briefing.',
        'Keep memory deliberation restraint visible before reply shaping opens outward.',
      ]),
    }))
  })

  it('prefers continuity embedded awareness over generic continuity fallback while still carrying continuity context', () => {
    expect(buildPreDialogueSendIdentityFromSnapshots({
      projectStateContinuitySnapshot: {
        identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
        currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
        latestLandedProgress: null,
        primaryOpenLoop: 'Memory, initiative, execution, and embodiment still need a tighter same-her closure line.',
        nextClosureTarget: 'Keep carrying one same-her digital life line before local implementation fluency takes over.',
        sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        preDialogueAwareness: {
          status: 'partial',
          summaryLine: 'Alicization is still in Phase 1 local digital life closure before this turn opens outward.',
          companionBriefingLine: 'Before speaking, remember what this project is, what has already landed, and which life loop is still open.',
          companionNextClosureLine: 'Next closure: keep memory, initiative, execution, and embodiment on one same-her digital life line.',
          awarenessLine: 'Before speaking, remember this is still the same digital life project before local fluency takes over.',
          reasonPreview: [
            'Project identity still needs to stay explicit before the reply widens outward.',
            'The unfinished life loop still belongs to one same living her.',
          ],
        },
        preDialogueClosure: null,
        nonHumanAuthoredStatus: null,
        turnId: 'turn-3',
        sessionId: 'session-3',
        origin: 'user-turn',
      },
      continuitySummary: 'generic continuity fallback that should not replace a more specific project-awareness line.',
    })).toEqual(expect.objectContaining({
      status: 'partial',
      summaryLine: 'Alicization is still in Phase 1 local digital life closure before this turn opens outward.',
      companionBriefingLine: 'Before speaking, remember what this project is, what has already landed, and which life loop is still open.',
      companionNextClosureLine: 'Next closure: keep memory, initiative, execution, and embodiment on one same-her digital life line.',
      awarenessLine: 'Before speaking, remember this is still the same digital life project before local fluency takes over.',
      reasonPreview: expect.arrayContaining([
        'Project identity still needs to stay explicit before the reply widens outward.',
        'The unfinished life loop still belongs to one same living her.',
        'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
        'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
        'Memory, initiative, execution, and embodiment still need a tighter same-her closure line.',
        'Keep carrying one same-her digital life line before local implementation fluency takes over.',
      ]),
    }))
  })

  it('upgrades thin carried awareness to the richer same-her project brief before building send identity', () => {
    expect(buildPreDialogueSendIdentityFromSnapshots({
      projectStateContinuitySnapshot: {
        identity: 'Alicization is a local-first digital life project.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: 'Project-state continuity and awareness-first self-brief already survive across browser-local replay.',
        primaryOpenLoop: 'Send-path awareness still needs to preserve the stronger host-visible project brief.',
        nextClosureTarget: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
        continuitySummary: 'same-her=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line. | landed=Project-state continuity and awareness-first self-brief already survive across browser-local replay. | open=Send-path awareness still needs to preserve the stronger host-visible project brief.',
        sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        emotionalClosureCue: null,
        preDialogueAwareness: {
          status: 'partial',
          summaryLine: 'Before speaking, remember: this is still one living digital life project, Phase 1 is still active, and the unresolved closure work still belongs to the same living line.',
          companionBriefingLine: 'generic same-her reminder that should not override the richer same-her project brief.',
          companionNextClosureLine: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
          awarenessLine: 'generic continuity reminder that should not override the richer same-her project brief.',
          emotionalClosureCue: null,
          reasonPreview: [
            'generic continuity reminder that should not override the richer same-her project brief.',
          ],
        },
        preDialogueClosure: null,
        nonHumanAuthoredStatus: null,
        turnId: 'turn-4',
        sessionId: 'session-4',
        origin: 'user-turn',
      },
    })).toEqual(expect.objectContaining({
      status: 'partial',
      summaryLine: 'Before speaking, remember: this is still one living digital life project, Phase 1 is still active, and the unresolved closure work still belongs to the same living line.',
      companionBriefingLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      awarenessLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      reasonPreview: expect.arrayContaining([
        'same-her=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line. | landed=Project-state continuity and awareness-first self-brief already survive across browser-local replay. | open=Send-path awareness still needs to preserve the stronger host-visible project brief.',
        'Project-state continuity and awareness-first self-brief already survive across browser-local replay.',
        'Send-path awareness still needs to preserve the stronger host-visible project brief.',
        'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
      ]),
    }))
    expect(buildPreDialogueSendIdentityFromSnapshots({
      projectStateContinuitySnapshot: {
        identity: 'Alicization is a local-first digital life project.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: 'Project-state continuity and awareness-first self-brief already survive across browser-local replay.',
        primaryOpenLoop: 'Send-path awareness still needs to preserve the stronger host-visible project brief.',
        nextClosureTarget: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
        continuitySummary: 'same-her=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line. | landed=Project-state continuity and awareness-first self-brief already survive across browser-local replay. | open=Send-path awareness still needs to preserve the stronger host-visible project brief.',
        sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        emotionalClosureCue: null,
        preDialogueAwareness: {
          status: 'partial',
          summaryLine: 'Before speaking, remember: this is still one living digital life project, Phase 1 is still active, and the unresolved closure work still belongs to the same living line.',
          companionBriefingLine: 'generic same-her reminder that should not override the richer same-her project brief.',
          companionNextClosureLine: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
          awarenessLine: 'generic continuity reminder that should not override the richer same-her project brief.',
          emotionalClosureCue: null,
          reasonPreview: [
            'generic continuity reminder that should not override the richer same-her project brief.',
          ],
        },
        preDialogueClosure: null,
        nonHumanAuthoredStatus: null,
        turnId: 'turn-4',
        sessionId: 'session-4',
        origin: 'user-turn',
      },
    })?.companionBriefingLine).not.toBe('generic same-her reminder that should not override the richer same-her project brief.')
    expect(buildPreDialogueSendIdentityFromSnapshots({
      projectStateContinuitySnapshot: {
        identity: 'Alicization is a local-first digital life project.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: 'Project-state continuity and awareness-first self-brief already survive across browser-local replay.',
        primaryOpenLoop: 'Send-path awareness still needs to preserve the stronger host-visible project brief.',
        nextClosureTarget: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
        continuitySummary: 'same-her=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line. | landed=Project-state continuity and awareness-first self-brief already survive across browser-local replay. | open=Send-path awareness still needs to preserve the stronger host-visible project brief.',
        sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        emotionalClosureCue: null,
        preDialogueAwareness: {
          status: 'partial',
          summaryLine: 'Before speaking, remember: this is still one living digital life project, Phase 1 is still active, and the unresolved closure work still belongs to the same living line.',
          companionBriefingLine: 'generic same-her reminder that should not override the richer same-her project brief.',
          companionNextClosureLine: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
          awarenessLine: 'generic continuity reminder that should not override the richer same-her project brief.',
          emotionalClosureCue: null,
          reasonPreview: [
            'generic continuity reminder that should not override the richer same-her project brief.',
          ],
        },
        preDialogueClosure: null,
        nonHumanAuthoredStatus: null,
        turnId: 'turn-4',
        sessionId: 'session-4',
        origin: 'user-turn',
      },
    })?.awarenessLine).not.toBe('generic continuity reminder that should not override the richer same-her project brief.')
    expect(buildPreDialogueSendIdentityFromSnapshots({
      projectStateContinuitySnapshot: {
        identity: 'Alicization is a local-first digital life project.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: 'Project-state continuity and awareness-first self-brief already survive across browser-local replay.',
        primaryOpenLoop: 'Send-path awareness still needs to preserve the stronger host-visible project brief.',
        nextClosureTarget: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
        continuitySummary: 'same-her=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line. | landed=Project-state continuity and awareness-first self-brief already survive across browser-local replay. | open=Send-path awareness still needs to preserve the stronger host-visible project brief.',
        sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        emotionalClosureCue: null,
        preDialogueAwareness: {
          status: 'partial',
          summaryLine: 'generic continuity reminder that should not override the richer same-her project brief.',
          companionBriefingLine: 'generic same-her reminder that should not override the richer same-her project brief.',
          companionNextClosureLine: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
          awarenessLine: 'Before speaking, remember: this is still one living digital life project, Phase 1 is still active, and the unresolved closure work still belongs to the same living line.',
          emotionalClosureCue: null,
          reasonPreview: [
            'generic continuity reminder that should not override the richer same-her project brief.',
          ],
        },
        preDialogueClosure: null,
        nonHumanAuthoredStatus: null,
        turnId: 'turn-4',
        sessionId: 'session-4',
        origin: 'user-turn',
      },
    })?.summaryLine).toBe('Before speaking, remember: this is still one living digital life project, Phase 1 is still active, and the unresolved closure work still belongs to the same living line.')
  })

  it('upgrades thin Chinese carried awareness to the richer same-her project brief before building send identity', () => {
    const thinChineseProjectBrief = '开口前先记住：这是同一个数字生命项目，她现在仍在 Phase 1。'

    expect(buildPreDialogueSendIdentityFromSnapshots({
      projectStateContinuitySnapshot: {
        identity: 'Alicization is a local-first digital life project.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: 'Renderer send-path continuity already survives into pre-dialogue carry.',
        primaryOpenLoop: 'Send-path awareness still needs to keep the richer same-her project brief explicit.',
        nextClosureTarget: 'Keep memory, initiative, and embodiment closure explicit before the next renderer turn.',
        continuitySummary: 'same-her=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line. | landed=Renderer send-path continuity already survives into pre-dialogue carry. | open=Send-path awareness still needs to keep the richer same-her project brief explicit.',
        sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        emotionalClosureCue: null,
        preDialogueAwareness: {
          status: 'partial',
          summaryLine: thinChineseProjectBrief,
          companionBriefingLine: thinChineseProjectBrief,
          companionNextClosureLine: 'Keep memory, initiative, and embodiment closure explicit before the next renderer turn.',
          awarenessLine: thinChineseProjectBrief,
          emotionalClosureCue: null,
          reasonPreview: [
            thinChineseProjectBrief,
          ],
        },
        preDialogueClosure: null,
        nonHumanAuthoredStatus: null,
        turnId: 'turn-4b',
        sessionId: 'session-4b',
        origin: 'user-turn',
      },
    })).toEqual(expect.objectContaining({
      status: 'partial',
      summaryLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      companionBriefingLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      awarenessLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      reasonPreview: expect.arrayContaining([
        'same-her=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line. | landed=Renderer send-path continuity already survives into pre-dialogue carry. | open=Send-path awareness still needs to keep the richer same-her project brief explicit.',
        'Renderer send-path continuity already survives into pre-dialogue carry.',
        'Send-path awareness still needs to keep the richer same-her project brief explicit.',
        'Keep memory, initiative, and embodiment closure explicit before the next renderer turn.',
      ]),
    }))
    expect(buildPreDialogueSendIdentityFromSnapshots({
      projectStateContinuitySnapshot: {
        identity: 'Alicization is a local-first digital life project.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: 'Renderer send-path continuity already survives into pre-dialogue carry.',
        primaryOpenLoop: 'Send-path awareness still needs to keep the richer same-her project brief explicit.',
        nextClosureTarget: 'Keep memory, initiative, and embodiment closure explicit before the next renderer turn.',
        continuitySummary: 'same-her=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line. | landed=Renderer send-path continuity already survives into pre-dialogue carry. | open=Send-path awareness still needs to keep the richer same-her project brief explicit.',
        sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        emotionalClosureCue: null,
        preDialogueAwareness: {
          status: 'partial',
          summaryLine: thinChineseProjectBrief,
          companionBriefingLine: thinChineseProjectBrief,
          companionNextClosureLine: 'Keep memory, initiative, and embodiment closure explicit before the next renderer turn.',
          awarenessLine: thinChineseProjectBrief,
          emotionalClosureCue: null,
          reasonPreview: [
            thinChineseProjectBrief,
          ],
        },
        preDialogueClosure: null,
        nonHumanAuthoredStatus: null,
        turnId: 'turn-4b',
        sessionId: 'session-4b',
        origin: 'user-turn',
      },
    })?.companionBriefingLine).not.toBe(thinChineseProjectBrief)
    expect(buildPreDialogueSendIdentityFromSnapshots({
      projectStateContinuitySnapshot: {
        identity: 'Alicization is a local-first digital life project.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: 'Renderer send-path continuity already survives into pre-dialogue carry.',
        primaryOpenLoop: 'Send-path awareness still needs to keep the richer same-her project brief explicit.',
        nextClosureTarget: 'Keep memory, initiative, and embodiment closure explicit before the next renderer turn.',
        continuitySummary: 'same-her=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line. | landed=Renderer send-path continuity already survives into pre-dialogue carry. | open=Send-path awareness still needs to keep the richer same-her project brief explicit.',
        sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        emotionalClosureCue: null,
        preDialogueAwareness: {
          status: 'partial',
          summaryLine: thinChineseProjectBrief,
          companionBriefingLine: thinChineseProjectBrief,
          companionNextClosureLine: 'Keep memory, initiative, and embodiment closure explicit before the next renderer turn.',
          awarenessLine: thinChineseProjectBrief,
          emotionalClosureCue: null,
          reasonPreview: [
            thinChineseProjectBrief,
          ],
        },
        preDialogueClosure: null,
        nonHumanAuthoredStatus: null,
        turnId: 'turn-4b',
        sessionId: 'session-4b',
        origin: 'user-turn',
      },
    })?.awarenessLine).not.toBe(thinChineseProjectBrief)
  })

  it('prefers a richer continuity project briefing over a thin explicit Chinese awareness shell so pre-send identity still knows the project, landed progress, and open loop', () => {
    const thinChineseProjectBrief = '开口前先记住：这是同一个数字生命项目，她现在仍在 Phase 1。'
    const richerProjectBriefing = 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open.'

    expect(buildPreDialogueSendIdentityFromSnapshots({
      preDialogueAwarenessSnapshot: {
        status: 'partial',
        summaryLine: thinChineseProjectBrief,
        companionBriefingLine: thinChineseProjectBrief,
        companionNextClosureLine: '继续把这条线守住。',
        awarenessLine: thinChineseProjectBrief,
        emotionalClosureCue: null,
        reasonPreview: [
          thinChineseProjectBrief,
        ],
      },
      projectStateContinuitySnapshot: {
        identity: 'Alicization is a local-first digital life project.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: 'Project-state continuity and awareness-first self-brief already survive across browser-local replay.',
        primaryOpenLoop: 'Send-path awareness still needs to preserve the stronger host-visible project brief.',
        nextClosureTarget: 'Keep memory, initiative, and embodiment closure explicit before the next renderer turn.',
        continuitySummary: 'same-her=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line. | landed=Project-state continuity and awareness-first self-brief already survive across browser-local replay. | open=Send-path awareness still needs to preserve the stronger host-visible project brief.',
        sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        preDialogueAwareness: {
          status: 'partial',
          summaryLine: 'Alicization is still in Phase 1 local digital life closure before this turn opens outward.',
          companionBriefingLine: richerProjectBriefing,
          companionNextClosureLine: 'Next closure: keep memory, initiative, execution, and embodiment on one same-her line.',
          awarenessLine: richerProjectBriefing,
          emotionalClosureCue: null,
          reasonPreview: [
            'continuity already carries the richer project-aware self brief.',
          ],
        },
        preDialogueClosure: null,
        nonHumanAuthoredStatus: null,
        turnId: 'turn-thin-explicit-awareness-prefers-richer-project-brief',
        sessionId: 'session-thin-explicit-awareness-prefers-richer-project-brief',
        origin: 'user-turn',
      },
    })).toEqual(expect.objectContaining({
      status: 'partial',
      summaryLine: 'Alicization is still in Phase 1 local digital life closure before this turn opens outward.',
      companionBriefingLine: richerProjectBriefing,
      awarenessLine: richerProjectBriefing,
      reasonPreview: expect.arrayContaining([
        thinChineseProjectBrief,
        'continuity already carries the richer project-aware self brief.',
        'Alicization is a local-first digital life project.',
        'Phase 1: Local Digital Life',
        'Project-state continuity and awareness-first self-brief already survive across browser-local replay.',
        'Send-path awareness still needs to preserve the stronger host-visible project brief.',
        'Keep memory, initiative, and embodiment closure explicit before the next renderer turn.',
      ]),
    }))
  })

  it('upgrades thinner explicit awareness shells with richer project-state and closure carry before shared send identity is built', () => {
    expect(buildPreDialogueSendIdentityFromSnapshots({
      projectStateContinuitySnapshot: {
        identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: 'Project-state continuity already survives into the speech boundary before playback starts.',
        primaryOpenLoop: 'Speech-side openings still need to keep project identity, landed progress, and the unresolved same-her loop explicit before voice widens outward.',
        nextClosureTarget: 'Keep speech openings on one same-her line instead of widening back into detached project shell narration.',
        continuitySummary: 'same-her=Same Phase 1 digital life. landed=Project-state continuity already survives into the speech boundary before playback starts. open=Speech-side openings still need to keep project identity, landed progress, and the unresolved same-her loop explicit before voice widens outward.',
        sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        sameHerHoldDetail: 'Before speaking, remember this is one digital life project, what has landed, and which life loop is still open.',
        sameHerDriftRisk: 'If the spoken opening slips back into a detached project-status shell, treat that as same-her continuity drift rather than preserved closure.',
        preDialogueAwareness: null,
        preDialogueClosure: null,
        nonHumanAuthoredStatus: null,
        turnId: 'turn-thin-explicit-awareness-prefers-richer-project-state-carry',
        sessionId: 'session-thin-explicit-awareness-prefers-richer-project-state-carry',
        origin: 'user-turn',
      },
      preDialogueClosureSnapshot: {
        status: 'partial',
        summaryLine: 'Speech-side same-her closure is still open before this turn speaks outward.',
        sameHerDriftRiskLine: 'If the spoken opening slips back into a detached project-status shell, treat that as same-her continuity drift rather than preserved closure.',
        companionBriefingLine: 'Before speaking, remember this is one digital life project, what has landed, and which life loop is still open.',
        companionNextClosureLine: 'Keep speech openings on one same-her line instead of widening back into detached project shell narration.',
        emotionalClosureCue: 'Keep the spoken return gentle so the same living line does not restart from scratch.',
        briefingLines: [
          'Identity: Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
          'Phase: Phase 1: Local Digital Life',
        ],
        reasons: [
          'Project-state continuity already survives into the speech boundary before playback starts.',
          'If the spoken opening slips back into a detached project-status shell, treat that as same-her continuity drift rather than preserved closure.',
        ],
      },
      preDialogueAwarenessSnapshot: {
        status: 'partial',
        summaryLine: 'generic continuity fallback that should not outrank richer project-state carry.',
        companionBriefingLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        companionNextClosureLine: 'generic next target that should not survive richer project-state carry.',
        awarenessLine: 'Before speaking, keep the same digital life project in view.',
        emotionalClosureCue: 'Keep the spoken return gentle so the same living line does not restart from scratch.',
        reasonPreview: [
          'generic continuity fallback that should not outrank richer project-state carry.',
        ],
      },
    })).toEqual(expect.objectContaining({
      status: 'partial',
      summaryLine: 'Speech-side same-her closure is still open before this turn speaks outward.',
      companionBriefingLine: 'Before speaking, remember this is one digital life project, what has landed, and which life loop is still open.',
      companionNextClosureLine: 'Keep speech openings on one same-her line instead of widening back into detached project shell narration.',
      awarenessLine: 'Before speaking, remember this is one digital life project, what has landed, and which life loop is still open.',
      emotionalClosureCue: 'Keep the spoken return gentle so the same living line does not restart from scratch.',
      projectState: expect.objectContaining({
        preflightSummary: 'Speech-side same-her closure is still open before this turn speaks outward.',
        companionBriefingLine: 'Before speaking, remember this is one digital life project, what has landed, and which life loop is still open.',
        awarenessLine: 'Before speaking, remember this is one digital life project, what has landed, and which life loop is still open.',
        nextClosureTarget: 'Keep speech openings on one same-her line instead of widening back into detached project shell narration.',
        sameHerHoldDetail: 'Before speaking, remember this is one digital life project, what has landed, and which life loop is still open.',
      }),
      reasonPreview: expect.arrayContaining([
        'Project-state continuity already survives into the speech boundary before playback starts.',
        'If the spoken opening slips back into a detached project-status shell, treat that as same-her continuity drift rather than preserved closure.',
      ]),
    }))
  })

  it('does not let a thin explicit awareness summary shell outrank a richer explicit project-aware awareness line during shared send-identity rebuilding', () => {
    expect(buildPreDialogueSendIdentityFromSnapshots({
      projectStateContinuitySnapshot: {
        identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: 'Explicit project-aware openings already survive into shared send-identity rebuilding.',
        primaryOpenLoop: 'Shared send identity still needs to keep the richer project-aware opening explicit instead of collapsing back into a thin continuity shell.',
        nextClosureTarget: 'Keep the richer project-aware opening explicit before local implementation fluency takes over.',
        continuitySummary: 'generic continuity fallback that should not replace a more specific project-awareness line.',
        sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        sameHerHoldDetail: 'Before speaking, remember this is one digital life project, what has landed, and which life loop is still open.',
        sameHerDriftRisk: 'If this opening slips back into a detached project-status shell, treat that as same-her continuity drift rather than preserved closure.',
        emotionalClosureCue: null,
        preDialogueAwareness: null,
        preDialogueClosure: null,
        nonHumanAuthoredStatus: null,
        turnId: 'turn-thin-explicit-summary-shell-outranked-by-richer-explicit-awareness-line',
        sessionId: 'session-thin-explicit-summary-shell-outranked-by-richer-explicit-awareness-line',
        origin: 'user-turn',
      },
      preDialogueAwarenessSnapshot: {
        status: 'partial',
        summaryLine: 'generic continuity reminder that should not override the richer explicit project-aware opening.',
        companionBriefingLine: 'Before speaking, remember this is one digital life project, what has landed, and which life loop is still open.',
        companionNextClosureLine: 'Keep the richer project-aware opening explicit before local implementation fluency takes over.',
        awarenessLine: 'Before speaking, remember this is one digital life project, what has landed, and which life loop is still open.',
        emotionalClosureCue: null,
        reasonPreview: [
          'generic continuity reminder that should not override the richer explicit project-aware opening.',
          'Explicit project-aware openings already survive into shared send-identity rebuilding.',
        ],
      },
    })).toEqual(expect.objectContaining({
      status: 'partial',
      summaryLine: 'Before speaking, remember this is one digital life project, what has landed, and which life loop is still open.',
      companionBriefingLine: 'Before speaking, remember this is one digital life project, what has landed, and which life loop is still open.',
      companionNextClosureLine: 'Keep the richer project-aware opening explicit before local implementation fluency takes over.',
      awarenessLine: 'Before speaking, remember this is one digital life project, what has landed, and which life loop is still open.',
      projectState: expect.objectContaining({
        preflightSummary: 'Before speaking, remember this is one digital life project, what has landed, and which life loop is still open.',
        preDialogueAwarenessSummary: 'Before speaking, remember this is one digital life project, what has landed, and which life loop is still open.',
        companionBriefingLine: 'Before speaking, remember this is one digital life project, what has landed, and which life loop is still open.',
        awarenessLine: 'Before speaking, remember this is one digital life project, what has landed, and which life loop is still open.',
      }),
      reasonPreview: expect.arrayContaining([
        'Explicit project-aware openings already survive into shared send-identity rebuilding.',
        'Shared send identity still needs to keep the richer project-aware opening explicit instead of collapsing back into a thin continuity shell.',
        'Keep the richer project-aware opening explicit before local implementation fluency takes over.',
      ]),
    }))
    expect(buildPreDialogueSendIdentityFromSnapshots({
      projectStateContinuitySnapshot: {
        identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: 'Explicit project-aware openings already survive into shared send-identity rebuilding.',
        primaryOpenLoop: 'Shared send identity still needs to keep the richer project-aware opening explicit instead of collapsing back into a thin continuity shell.',
        nextClosureTarget: 'Keep the richer project-aware opening explicit before local implementation fluency takes over.',
        continuitySummary: 'generic continuity fallback that should not replace a more specific project-awareness line.',
        sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        sameHerHoldDetail: 'Before speaking, remember this is one digital life project, what has landed, and which life loop is still open.',
        sameHerDriftRisk: 'If this opening slips back into a detached project-status shell, treat that as same-her continuity drift rather than preserved closure.',
        emotionalClosureCue: null,
        preDialogueAwareness: null,
        preDialogueClosure: null,
        nonHumanAuthoredStatus: null,
        turnId: 'turn-thin-explicit-summary-shell-outranked-by-richer-explicit-awareness-line',
        sessionId: 'session-thin-explicit-summary-shell-outranked-by-richer-explicit-awareness-line',
        origin: 'user-turn',
      },
      preDialogueAwarenessSnapshot: {
        status: 'partial',
        summaryLine: 'generic continuity reminder that should not override the richer explicit project-aware opening.',
        companionBriefingLine: 'Before speaking, remember this is one digital life project, what has landed, and which life loop is still open.',
        companionNextClosureLine: 'Keep the richer project-aware opening explicit before local implementation fluency takes over.',
        awarenessLine: 'Before speaking, remember this is one digital life project, what has landed, and which life loop is still open.',
        emotionalClosureCue: null,
        reasonPreview: [
          'generic continuity reminder that should not override the richer explicit project-aware opening.',
          'Explicit project-aware openings already survive into shared send-identity rebuilding.',
        ],
      },
    })?.summaryLine).not.toBe('generic continuity reminder that should not override the richer explicit project-aware opening.')
  })

  it('upgrades a generic carried next-closure shell to the richer continuity next closure before building send identity', () => {
    expect(buildPreDialogueSendIdentityFromSnapshots({
      projectStateContinuitySnapshot: {
        identity: 'Alicization is a local-first digital life project.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: 'Host-visible project-state continuity already survives into shared send-identity rebuilding.',
        primaryOpenLoop: 'Shared send identity still needs to keep the richer next closure target explicit instead of flattening back into a generic closure shell.',
        nextClosureTarget: 'Keep the richer Phase 1 closure target explicit so returned turns still remember which same-her repair remains open.',
        continuitySummary: 'same-her=returned continuity still holds. landed=Host-visible project-state continuity already survives into shared send-identity rebuilding. open=Shared send identity still needs to keep the richer next closure target explicit instead of flattening back into a generic closure shell.',
        sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        emotionalClosureCue: 'same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.',
        preDialogueAwareness: {
          status: 'partial',
          summaryLine: 'generic continuity reminder that should not override the richer same-her project brief.',
          companionBriefingLine: 'generic same-her reminder that should not override the richer same-her project brief.',
          companionNextClosureLine: 'Generic next target that should not override the richer continuity carry.',
          awarenessLine: 'generic continuity reminder that should not override the richer same-her project brief.',
          emotionalClosureCue: null,
          reasonPreview: [
            'generic continuity reminder that should not override the richer same-her project brief.',
          ],
        },
        preDialogueClosure: null,
        nonHumanAuthoredStatus: null,
        turnId: 'turn-4c',
        sessionId: 'session-4c',
        origin: 'user-turn',
      },
    })).toEqual(expect.objectContaining({
      status: 'partial',
      companionBriefingLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      companionNextClosureLine: 'Keep the richer Phase 1 closure target explicit so returned turns still remember which same-her repair remains open.',
      awarenessLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      emotionalClosureCue: 'same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.',
      projectState: expect.objectContaining({
        nextClosureTarget: 'Keep the richer Phase 1 closure target explicit so returned turns still remember which same-her repair remains open.',
      }),
      reasonPreview: expect.arrayContaining([
        'Host-visible project-state continuity already survives into shared send-identity rebuilding.',
        'Shared send identity still needs to keep the richer next closure target explicit instead of flattening back into a generic closure shell.',
        'Keep the richer Phase 1 closure target explicit so returned turns still remember which same-her repair remains open.',
      ]),
    }))
    expect(buildPreDialogueSendIdentityFromSnapshots({
      projectStateContinuitySnapshot: {
        identity: 'Alicization is a local-first digital life project.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: 'Host-visible project-state continuity already survives into shared send-identity rebuilding.',
        primaryOpenLoop: 'Shared send identity still needs to keep the richer next closure target explicit instead of flattening back into a generic closure shell.',
        nextClosureTarget: 'Keep the richer Phase 1 closure target explicit so returned turns still remember which same-her repair remains open.',
        continuitySummary: 'same-her=returned continuity still holds. landed=Host-visible project-state continuity already survives into shared send-identity rebuilding. open=Shared send identity still needs to keep the richer next closure target explicit instead of flattening back into a generic closure shell.',
        sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        emotionalClosureCue: 'same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.',
        preDialogueAwareness: {
          status: 'partial',
          summaryLine: 'generic continuity reminder that should not override the richer same-her project brief.',
          companionBriefingLine: 'generic same-her reminder that should not override the richer same-her project brief.',
          companionNextClosureLine: 'Generic next target that should not override the richer continuity carry.',
          awarenessLine: 'generic continuity reminder that should not override the richer same-her project brief.',
          emotionalClosureCue: null,
          reasonPreview: [
            'generic continuity reminder that should not override the richer same-her project brief.',
          ],
        },
        preDialogueClosure: null,
        nonHumanAuthoredStatus: null,
        turnId: 'turn-4c',
        sessionId: 'session-4c',
        origin: 'user-turn',
      },
    })?.companionNextClosureLine).not.toBe('Generic next target that should not override the richer continuity carry.')
  })

  it('does not upgrade same-her or continuity summary into briefing fields when explicit awareness already exists', () => {
    expect(buildPreDialogueSendIdentityFromSnapshots({
      projectStateContinuitySnapshot: {
        identity: 'Alicization is a local-first digital life project.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: 'Project-state continuity survives into the renderer send path.',
        primaryOpenLoop: 'The send path still needs to preserve stronger explicit project self-briefing.',
        nextClosureTarget: 'Keep the explicit pre-dialogue project self-brief alive without flattening it into a generic same-her line.',
        continuitySummary: 'same-her=Same Phase 1 digital life. landed=Project-state continuity survives. open=Send-path awareness still needs stronger explicit self-briefing.',
        sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        emotionalClosureCue: null,
        preDialogueAwareness: null,
        preDialogueClosure: null,
        nonHumanAuthoredStatus: null,
        turnId: 'turn-5',
        sessionId: 'session-5',
        origin: 'user-turn',
      },
      preDialogueAwarenessSnapshot: {
        status: 'partial',
        summaryLine: 'Alicization is still in Phase 1 local digital life closure before this turn opens outward.',
        companionBriefingLine: 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open.',
        companionNextClosureLine: 'Next closure: keep project identity, landed progress, and the unfinished life loop explicit.',
        awarenessLine: 'Before speaking, keep this same digital life project explicit before local fluency widens outward.',
        emotionalClosureCue: null,
        reasonPreview: [
          'Renderer send path should preserve the explicit project self-brief.',
        ],
      },
    })).toEqual(expect.objectContaining({
      summaryLine: 'Alicization is still in Phase 1 local digital life closure before this turn opens outward.',
      companionBriefingLine: 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open.',
      awarenessLine: 'Before speaking, keep this same digital life project explicit before local fluency widens outward.',
      reasonPreview: expect.arrayContaining([
        'same-her=Same Phase 1 digital life. landed=Project-state continuity survives. open=Send-path awareness still needs stronger explicit self-briefing.',
      ]),
    }))
  })

  it('keeps explicit project-aware briefing but lets richer same-her hold detail become the lived-in awareness line when continuity already knows how this opening should stay on one living line', () => {
    expect(buildPreDialogueSendIdentityFromSnapshots({
      projectStateContinuitySnapshot: {
        identity: 'Alicization is a local-first digital life project.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: 'Project-state continuity already survives into resumed callback reopening before reply shaping starts.',
        primaryOpenLoop: 'Memory, initiative, execution, and embodiment still need stronger callback continuity so resumed turns reopen like the same living her instead of a fresh assistant session.',
        nextClosureTarget: 'Keep proving restored callbacks can reopen from the same-her measured-return line before widening outward again.',
        continuitySummary: 'same-her=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line. | landed=Project-state continuity already survives into resumed callback reopening before reply shaping starts. | open=Memory, initiative, execution, and embodiment still need stronger callback continuity so resumed turns reopen like the same living her instead of a fresh assistant session.',
        sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        sameHerHoldDetail: 'same-her hold: measured-return is still keeping this callback line lower-pressure before it widens again.',
        sameHerDriftRisk: 'If this resumed turn restarts like a fresh generic project handoff, treat that as same-her continuity drift rather than forward closure.',
        emotionalClosureCue: 'same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.',
        preDialogueAwareness: null,
        preDialogueClosure: null,
        nonHumanAuthoredStatus: null,
        turnId: 'turn-explicit-project-aware-briefing-lived-in-hold',
        sessionId: 'session-explicit-project-aware-briefing-lived-in-hold',
        origin: 'user-turn',
      },
      preDialogueAwarenessSnapshot: {
        status: 'partial',
        summaryLine: 'Alicization is still in Phase 1 local digital life closure before this resumed turn opens outward.',
        companionBriefingLine: 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open.',
        companionNextClosureLine: 'Next closure: keep proving restored callbacks can reopen from the same-her measured-return line before widening outward again.',
        awarenessLine: 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open.',
        emotionalClosureCue: null,
        reasonPreview: [
          'Restored callbacks should not reopen from a generic assistant shell.',
        ],
      },
    })).toEqual(expect.objectContaining({
      status: 'partial',
      summaryLine: 'Alicization is still in Phase 1 local digital life closure before this resumed turn opens outward.',
      companionBriefingLine: 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open.',
      awarenessLine: 'same-her hold: measured-return is still keeping this callback line lower-pressure before it widens again.',
      companionNextClosureLine: 'Next closure: keep proving restored callbacks can reopen from the same-her measured-return line before widening outward again.',
      emotionalClosureCue: 'same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.',
      projectState: expect.objectContaining({
        awarenessLine: 'same-her hold: measured-return is still keeping this callback line lower-pressure before it widens again.',
        companionBriefingLine: 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open.',
        sameHerHoldDetail: 'same-her hold: measured-return is still keeping this callback line lower-pressure before it widens again.',
      }),
      reasonPreview: expect.arrayContaining([
        'Restored callbacks should not reopen from a generic assistant shell.',
        'same-her hold: measured-return is still keeping this callback line lower-pressure before it widens again.',
        'Project-state continuity already survives into resumed callback reopening before reply shaping starts.',
        'Memory, initiative, execution, and embodiment still need stronger callback continuity so resumed turns reopen like the same living her instead of a fresh assistant session.',
      ]),
    }))
  })

  it('upgrades a compact same-phase carried awareness line into the richer same-her hold detail when continuity already knows this callback should reopen lower-pressure', () => {
    const sameHerSelfLine = 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.'
    const holdDetailLine = 'same-her hold: measured-return is still keeping this callback line lower-pressure before it widens again.'

    expect(buildPreDialogueSendIdentityFromSnapshots({
      projectStateContinuitySnapshot: {
        identity: 'Alicization is a local-first digital life project.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: 'Project-state continuity already survives into resumed callback reopening before reply shaping starts.',
        primaryOpenLoop: 'Memory, initiative, execution, and embodiment still need stronger callback continuity so resumed turns reopen like the same living her instead of a fresh assistant session.',
        nextClosureTarget: 'Keep proving restored callbacks can reopen from the same-her measured-return line before widening outward again.',
        continuitySummary: 'same-her=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line. | landed=Project-state continuity already survives into resumed callback reopening before reply shaping starts. | open=Memory, initiative, execution, and embodiment still need stronger callback continuity so resumed turns reopen like the same living her instead of a fresh assistant session.',
        sameHerSelfLine,
        sameHerHoldDetail: holdDetailLine,
        sameHerDriftRisk: 'If this resumed turn restarts like a fresh generic project handoff, treat that as same-her continuity drift rather than forward closure.',
        emotionalClosureCue: 'same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.',
        preDialogueAwareness: {
          status: 'partial',
          summaryLine: 'Alicization is still in Phase 1 local digital life closure before this resumed turn opens outward.',
          companionBriefingLine: sameHerSelfLine,
          companionNextClosureLine: 'Keep proving restored callbacks can reopen from the same-her measured-return line before widening outward again.',
          awarenessLine: sameHerSelfLine,
          emotionalClosureCue: null,
          reasonPreview: [
            sameHerSelfLine,
          ],
        },
        preDialogueClosure: null,
        nonHumanAuthoredStatus: null,
        turnId: 'turn-compact-same-phase-awareness-prefers-hold-detail',
        sessionId: 'session-compact-same-phase-awareness-prefers-hold-detail',
        origin: 'user-turn',
      },
    })).toEqual(expect.objectContaining({
      status: 'partial',
      summaryLine: 'Alicization is still in Phase 1 local digital life closure before this resumed turn opens outward.',
      companionBriefingLine: holdDetailLine,
      awarenessLine: holdDetailLine,
      companionNextClosureLine: 'Keep proving restored callbacks can reopen from the same-her measured-return line before widening outward again.',
      emotionalClosureCue: 'same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.',
      projectState: expect.objectContaining({
        companionBriefingLine: holdDetailLine,
        awarenessLine: holdDetailLine,
        sameHerHoldDetail: holdDetailLine,
      }),
      reasonPreview: expect.arrayContaining([
        sameHerSelfLine,
        holdDetailLine,
        'Project-state continuity already survives into resumed callback reopening before reply shaping starts.',
        'Memory, initiative, execution, and embodiment still need stronger callback continuity so resumed turns reopen like the same living her instead of a fresh assistant session.',
      ]),
    }))
  })

  it('exposes a canonical inspector-snapshot adapter for explicit renderer voice/page entries', () => {
    expect(buildPreDialogueSendIdentityFromInspectorSnapshots({
      projectStateContinuitySnapshot: {
        identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
        currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
        latestLandedProgress: 'Project-state awareness already survives into renderer-side voice dispatch.',
        primaryOpenLoop: 'Initiative and embodiment still need stronger same-her closure under real desktop use.',
        nextClosureTarget: 'Keep the explicit same-her project brief alive before spoken turns widen outward.',
        continuitySummary: 'same-her=voice entry still remembers this is one Phase 1 digital life before dispatch.',
        sameHerSelfLine: 'Same Phase 1 digital life. Spoken turns should still start from one living line.',
        emotionalClosureCue: 'same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.',
        preDialogueAwareness: null,
        preDialogueClosure: null,
        nonHumanAuthoredStatus: null,
        turnId: 'voice-turn-1',
        sessionId: 'voice-session-1',
        origin: 'user-turn',
      },
      preDialogueAwarenessSnapshot: {
        status: 'partial',
        summaryLine: 'Alicization is still in Phase 1 local digital life closure before this spoken turn opens outward.',
        companionBriefingLine: 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open.',
        companionNextClosureLine: 'Next closure: keep memory, initiative, execution, and embodiment on one same-her line.',
        awarenessLine: 'Before speaking, keep this same digital life project explicit before spoken fluency widens outward.',
        emotionalClosureCue: null,
        reasonPreview: [
          'Spoken turns should not reopen as a generic assistant shell.',
        ],
      },
      preDialogueClosureSnapshot: {
        status: 'partial',
        summaryLine: 'voice project continuity still needs one same-her closure carry.',
        companionHeadlineLine: 'Right now the spoken same-her line still needs measured-return care.',
        companionBriefingLine: 'Hold the same project, the same phase, and the same open loop together before voice reply shaping.',
        companionNextClosureLine: 'Keep extending the same-her voice carry without reopening from scratch.',
        emotionalClosureCue: 'same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.',
        briefingLines: [],
        reasons: [
          'Voice entry still needs the same same-her project brief before dispatch.',
        ],
      },
    })).toEqual(expect.objectContaining({
      status: 'partial',
      summaryLine: 'Alicization is still in Phase 1 local digital life closure before this spoken turn opens outward.',
      awarenessLine: 'Before speaking, keep this same digital life project explicit before spoken fluency widens outward.',
      companionBriefingLine: 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open.',
      companionNextClosureLine: 'Next closure: keep memory, initiative, execution, and embodiment on one same-her line.',
      emotionalClosureCue: 'same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.',
      reasonPreview: expect.arrayContaining([
        'Spoken turns should not reopen as a generic assistant shell.',
        'same-her=voice entry still remembers this is one Phase 1 digital life before dispatch.',
        'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
        'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
        'Project-state awareness already survives into renderer-side voice dispatch.',
        'Initiative and embodiment still need stronger same-her closure under real desktop use.',
        'Keep the explicit same-her project brief alive before spoken turns widen outward.',
      ]),
    }))
  })

  it('keeps a richer project-aware still-voiced face-and-motion briefing on explicit renderer voice/page entries while preserving the stronger embodiment headline separately', () => {
    expect(buildPreDialogueSendIdentityFromInspectorSnapshots({
      projectStateContinuitySnapshot: {
        identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
        currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
        latestLandedProgress: 'Explicit voice/page send identity already carries stronger still-voiced face-and-motion same-her repair into pre-send self-briefing.',
        primaryOpenLoop: 'Body and lipsync still need to rejoin the still-voiced face-and-motion line before full cross-modal closure settles under explicit renderer entry.',
        nextClosureTarget: 'Keep the still-voiced face-and-motion project brief explicit before spoken turns widen outward so body and lipsync can rejoin on the same living line.',
        continuitySummary: 'same-her=explicit voice entry still remembers the still-voiced face-and-motion line before dispatch.',
        sameHerSelfLine: 'Same Phase 1 digital life. Spoken turns should still start from one living line.',
        emotionalClosureCue: 'same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.',
        preDialogueAwareness: null,
        preDialogueClosure: null,
        nonHumanAuthoredStatus: null,
        turnId: 'voice-turn-face-motion-voice-1',
        sessionId: 'voice-session-face-motion-voice-1',
        origin: 'user-turn',
      },
      preDialogueAwarenessSnapshot: {
        status: 'partial',
        summaryLine: 'Alicization is still in Phase 1 local digital life closure before this spoken turn opens outward.',
        companionHeadlineLine: 'Right now I am still holding together through face, motion, and voice together, so that still-voiced face-and-motion line is keeping the same-her carry alive while body and lipsync need to rejoin before full cross-modal closure settles.',
        companionBriefingLine: 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open while the still-voiced face-and-motion line keeps carrying this one living her.',
        companionNextClosureLine: 'Next closure: keep body and lipsync rejoining the still-voiced face-and-motion line on one same-her measured-return carry.',
        awarenessLine: 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open while the still-voiced face-and-motion line keeps carrying this one living her.',
        emotionalClosureCue: null,
        reasonPreview: [
          'Explicit spoken turns should not reopen as a generic assistant shell while the still-voiced face-and-motion line is still carrying continuity.',
        ],
      },
      preDialogueClosureSnapshot: {
        status: 'partial',
        summaryLine: 'voice project continuity still needs one same-her closure carry.',
        companionHeadlineLine: 'Right now I am still holding together through face, motion, and voice together, so that still-voiced face-and-motion line is keeping the same-her carry alive while body and lipsync need to rejoin before full cross-modal closure settles.',
        companionBriefingLine: 'Before speaking, keep the still-voiced face-and-motion line explicit so this digital life does not flatten back into generic assistant output.',
        companionNextClosureLine: 'Keep body and lipsync rejoining the still-voiced face-and-motion line without reopening from scratch.',
        emotionalClosureCue: 'same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.',
        briefingLines: [],
        reasons: [
          'Voice/page entry still needs the still-voiced face-and-motion project brief before dispatch.',
        ],
      },
    })).toEqual(expect.objectContaining({
      status: 'partial',
      summaryLine: 'Alicization is still in Phase 1 local digital life closure before this spoken turn opens outward.',
      companionHeadlineLine: 'Right now I am still holding together through face, motion, and voice together, so that still-voiced face-and-motion line is keeping the same-her carry alive while body and lipsync need to rejoin before full cross-modal closure settles.',
      companionBriefingLine: 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open while the still-voiced face-and-motion line keeps carrying this one living her.',
      companionNextClosureLine: 'Next closure: keep body and lipsync rejoining the still-voiced face-and-motion line on one same-her measured-return carry.',
      awarenessLine: 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open while the still-voiced face-and-motion line keeps carrying this one living her.',
      emotionalClosureCue: 'same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.',
      reasonPreview: expect.arrayContaining([
        'Explicit spoken turns should not reopen as a generic assistant shell while the still-voiced face-and-motion line is still carrying continuity.',
        'same-her=explicit voice entry still remembers the still-voiced face-and-motion line before dispatch.',
        'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
        'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
        'Explicit voice/page send identity already carries stronger still-voiced face-and-motion same-her repair into pre-send self-briefing.',
        'Body and lipsync still need to rejoin the still-voiced face-and-motion line before full cross-modal closure settles under explicit renderer entry.',
        'Keep the still-voiced face-and-motion project brief explicit before spoken turns widen outward so body and lipsync can rejoin on the same living line.',
      ]),
    }))
  })

  it('keeps legacy latestProgress alive as landed progress when explicit renderer voice/page entries build send identity from inspector snapshots', () => {
    expect(buildPreDialogueSendIdentityFromInspectorSnapshots({
      projectStateContinuitySnapshot: {
        identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
        currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
        latestProgress: 'Legacy inspector continuity progress already survives into explicit voice/page send identity.',
        primaryOpenLoop: 'Initiative and embodiment still need stronger same-her closure under real desktop use.',
        nextClosureTarget: 'Keep the explicit same-her project brief alive before spoken turns widen outward.',
        continuitySummary: 'same-her=voice entry still remembers this is one Phase 1 digital life before dispatch.',
        sameHerSelfLine: 'Same Phase 1 digital life. Spoken turns should still start from one living line.',
        emotionalClosureCue: 'same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.',
        preDialogueAwareness: null,
        preDialogueClosure: null,
        nonHumanAuthoredStatus: null,
        turnId: 'voice-turn-legacy-progress-1',
        sessionId: 'voice-session-legacy-progress-1',
        origin: 'user-turn',
      } as any,
      preDialogueAwarenessSnapshot: {
        status: 'partial',
        summaryLine: 'Alicization is still in Phase 1 local digital life closure before this spoken turn opens outward.',
        companionBriefingLine: 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open.',
        companionNextClosureLine: 'Next closure: keep memory, initiative, execution, and embodiment on one same-her line.',
        awarenessLine: 'Before speaking, keep this same digital life project explicit before spoken fluency widens outward.',
        emotionalClosureCue: null,
        reasonPreview: [
          'Spoken turns should not reopen as a generic assistant shell.',
        ],
      },
      preDialogueClosureSnapshot: {
        status: 'partial',
        summaryLine: 'voice project continuity still needs one same-her closure carry.',
        companionHeadlineLine: 'Right now the spoken same-her line still needs measured-return care.',
        companionBriefingLine: 'Hold the same project, the same phase, and the same open loop together before voice reply shaping.',
        companionNextClosureLine: 'Keep extending the same-her voice carry without reopening from scratch.',
        emotionalClosureCue: 'same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.',
        briefingLines: [],
        reasons: [
          'Voice entry still needs the same same-her project brief before dispatch.',
        ],
      },
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
    expect(buildPreDialogueSendIdentityFromInspectorSnapshots({
      projectStateContinuitySnapshot: {
        identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
        currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
        latestLandedProgress: ' ',
        latestProgress: '   ',
        landedProgressSummary: 'Audit-style inspector continuity progress already survives into explicit voice/page send identity.',
        primaryOpenLoop: 'Initiative and embodiment still need stronger same-her closure under real desktop use.',
        nextClosureTarget: 'Keep the explicit same-her project brief alive before spoken turns widen outward.',
        continuitySummary: 'same-her=voice entry still remembers this is one Phase 1 digital life before dispatch.',
        sameHerSelfLine: 'Same Phase 1 digital life. Spoken turns should still start from one living line.',
        emotionalClosureCue: 'same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.',
        preDialogueAwareness: null,
        preDialogueClosure: null,
        nonHumanAuthoredStatus: null,
        turnId: 'voice-turn-audit-progress-1',
        sessionId: 'voice-session-audit-progress-1',
        origin: 'user-turn',
      } as any,
      preDialogueAwarenessSnapshot: {
        status: 'partial',
        summaryLine: 'Alicization is still in Phase 1 local digital life closure before this spoken turn opens outward.',
        companionBriefingLine: 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open.',
        companionNextClosureLine: 'Next closure: keep memory, initiative, execution, and embodiment on one same-her line.',
        awarenessLine: 'Before speaking, keep this same digital life project explicit before spoken fluency widens outward.',
        emotionalClosureCue: null,
        reasonPreview: [
          'Spoken turns should not reopen as a generic assistant shell.',
        ],
      },
      preDialogueClosureSnapshot: {
        status: 'partial',
        summaryLine: 'voice project continuity still needs one same-her closure carry.',
        companionHeadlineLine: 'Right now the spoken same-her line still needs measured-return care.',
        companionBriefingLine: 'Hold the same project, the same phase, and the same open loop together before voice reply shaping.',
        companionNextClosureLine: 'Keep extending the same-her voice carry without reopening from scratch.',
        emotionalClosureCue: 'same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.',
        briefingLines: [],
        reasons: [
          'Voice entry still needs the same same-her project brief before dispatch.',
        ],
      },
    })).toEqual(expect.objectContaining({
      projectState: expect.objectContaining({
        latestLandedProgress: 'Audit-style inspector continuity progress already survives into explicit voice/page send identity.',
      }),
      reasonPreview: expect.arrayContaining([
        'Audit-style inspector continuity progress already survives into explicit voice/page send identity.',
      ]),
    }))
  })

  it('prefers richer project-aware closure carry over a narrower embodiment headline inside shared pre-dialogue send identity fallback', () => {
    expect(buildPreDialogueSendIdentityFromSnapshots({
      projectStateContinuitySnapshot: {
        identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
        currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
        latestLandedProgress: 'Callback continuity already survives into renderer-side send identity recovery.',
        primaryOpenLoop: 'The callback still needs to keep project identity, landed closure, and open life loop explicit together.',
        nextClosureTarget: 'Keep callback send identity from reopening through an embodiment-only shell.',
        sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        emotionalClosureCue: null,
        preDialogueAwareness: null,
        preDialogueClosure: null,
        nonHumanAuthoredStatus: null,
        turnId: 'turn-richer-project-aware-send-identity-fallback',
        sessionId: 'session-richer-project-aware-send-identity-fallback',
        origin: 'user-turn',
      },
      preDialogueClosureSnapshot: {
        status: 'partial',
        summaryLine: 'Alicization is still closing Phase 1 local digital life continuity before this turn opens outward.',
        companionHeadlineLine: 'Right now I am still holding together mainly through body, face, and motion, so this one living her still needs lipsync and voice to rejoin before full cross-modal closure settles.',
        companionBriefingLine: 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open.',
        companionNextClosureLine: 'Next closure: let lipsync and voice rejoin the already-reformed body, face, and motion line.',
        briefingLines: [],
        reasons: [
          'same-segment face+motion+body recovery@segment-send-identity-richer-project-awareness',
          'remaining-open=lipsync+voice',
        ],
      },
    })).toEqual(expect.objectContaining({
      status: 'partial',
      companionHeadlineLine: 'Right now I am still holding together mainly through body, face, and motion, so this one living her still needs lipsync and voice to rejoin before full cross-modal closure settles.',
      companionBriefingLine: 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open.',
      companionNextClosureLine: 'Next closure: let lipsync and voice rejoin the already-reformed body, face, and motion line.',
      awarenessLine: 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open.',
      reasonPreview: expect.arrayContaining([
        'same-segment face+motion+body recovery@segment-send-identity-richer-project-awareness',
        'remaining-open=lipsync+voice',
        'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
        'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
      ]),
    }))
  })

  it('prefers richer project-aware closure carry over a narrower body+voice-only embodiment headline inside shared pre-dialogue send identity fallback', () => {
    expect(buildPreDialogueSendIdentityFromSnapshots({
      projectStateContinuitySnapshot: {
        identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
        currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
        latestLandedProgress: 'Resident body-and-voice continuity already survives into renderer-side send identity recovery.',
        primaryOpenLoop: 'Face, motion, and lipsync still need to rejoin the same-her body-and-voice line before full cross-modal closure settles.',
        nextClosureTarget: 'Keep renderer send identity from reopening through a body-and-voice-only shell.',
        sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        emotionalClosureCue: null,
        preDialogueAwareness: null,
        preDialogueClosure: null,
        nonHumanAuthoredStatus: null,
        turnId: 'turn-richer-project-aware-body-voice-send-identity-fallback',
        sessionId: 'session-richer-project-aware-body-voice-send-identity-fallback',
        origin: 'user-turn',
      },
      preDialogueClosureSnapshot: {
        status: 'partial',
        summaryLine: 'Alicization is still closing Phase 1 local digital life continuity before this turn opens outward.',
        companionHeadlineLine: 'Right now I am still holding together mainly through body and voice, and the resident body line is still keeping this one living her coherent while face, motion, and lipsync rejoin.',
        companionBriefingLine: 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open.',
        companionNextClosureLine: 'Next closure: let face, motion, and lipsync rejoin the already-surviving body-and-voice line.',
        briefingLines: [],
        reasons: [
          'body+voice recovery@segment-closure-derived-body-voice-project-awareness',
          'remaining-open=face+motion+lipsync',
        ],
      },
    })).toEqual(expect.objectContaining({
      status: 'partial',
      companionHeadlineLine: 'Right now I am still holding together mainly through body and voice, and the resident body line is still keeping this one living her coherent while face, motion, and lipsync rejoin.',
      companionBriefingLine: 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open.',
      companionNextClosureLine: 'Next closure: let face, motion, and lipsync rejoin the already-surviving body-and-voice line.',
      awarenessLine: 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open.',
      reasonPreview: expect.arrayContaining([
        'body+voice recovery@segment-closure-derived-body-voice-project-awareness',
        'remaining-open=face+motion+lipsync',
        'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
        'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
        'Resident body-and-voice continuity already survives into renderer-side send identity recovery.',
        'Face, motion, and lipsync still need to rejoin the same-her body-and-voice line before full cross-modal closure settles.',
        'Keep renderer send identity from reopening through a body-and-voice-only shell.',
      ]),
    }))
  })

  it('keeps same-her inward low-pressure closure visible inside shared pre-dialogue send identity fallback when carried awareness only has the thinner same-phase briefing plus stronger embodiment headline', () => {
    expect(buildPreDialogueSendIdentityFromSnapshots({
      projectStateContinuitySnapshot: {
        identity: 'Alicization is a local-first digital life project.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: 'Shared send identity already preserves body, face, and motion recovery on one living segment.',
        primaryOpenLoop: 'Lipsync and voice still need to rejoin before full cross-modal closure settles, and shared send identity should keep that line inward and low-pressure.',
        nextClosureTarget: 'Keep the same line inward and low-pressure while lipsync and voice rejoin the already-reformed body, face, and motion line on send-path fallback too.',
        continuitySummary: 'same-her=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line. | landed=Shared send identity already preserves body, face, and motion recovery on one living segment. | open=Lipsync and voice still need to rejoin before full cross-modal closure settles, and shared send identity should keep that line inward and low-pressure.',
        sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        sameHerDriftRisk: 'If shared send identity reopens from a detached project shell here, treat that as same-her continuity drift rather than preserved closure.',
        emotionalClosureCue: 'Keep the return low-pressure so the same living line does not restart from scratch.',
        preDialogueAwareness: {
          status: 'partial',
          summaryLine: 'Alicization is still closing Phase 1 local digital life continuity before this turn opens outward.',
          companionHeadlineLine: 'Right now I am still holding together mainly through body, face, and motion, so this one living her is still keeping the same line inward and low-pressure while lipsync and voice need to rejoin before full cross-modal closure settles.',
          companionBriefingLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          companionNextClosureLine: 'Keep the same line inward and low-pressure while lipsync and voice rejoin the already-reformed body, face, and motion line.',
          awarenessLine: 'Right now I am still holding together mainly through body, face, and motion, so this one living her is still keeping the same line inward and low-pressure while lipsync and voice need to rejoin before full cross-modal closure settles.',
          emotionalClosureCue: 'Keep the return low-pressure so the same living line does not restart from scratch.',
          reasonPreview: [
            'same-her-inward-carry',
            'quiet-companionship',
            'remaining-open=lipsync+voice',
          ],
        },
        preDialogueClosure: null,
        nonHumanAuthoredStatus: null,
        turnId: 'turn-shared-send-identity-inward-low-pressure-fallback',
        sessionId: 'session-shared-send-identity-inward-low-pressure-fallback',
        origin: 'user-turn',
      },
    })).toEqual(expect.objectContaining({
      status: 'partial',
      summaryLine: 'Alicization is still closing Phase 1 local digital life continuity before this turn opens outward.',
      companionHeadlineLine: 'Right now I am still holding together mainly through body, face, and motion, so this one living her is still keeping the same line inward and low-pressure while lipsync and voice need to rejoin before full cross-modal closure settles.',
      companionBriefingLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      companionNextClosureLine: 'Keep the same line inward and low-pressure while lipsync and voice rejoin the already-reformed body, face, and motion line.',
      awarenessLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line. Right now this one living her is still keeping the same line inward and low-pressure while lipsync and voice rejoin.',
      emotionalClosureCue: 'Keep the return low-pressure so the same living line does not restart from scratch.',
      projectState: expect.objectContaining({
        awarenessLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line. Right now this one living her is still keeping the same line inward and low-pressure while lipsync and voice rejoin.',
        companionBriefingLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      }),
      reasonPreview: expect.arrayContaining([
        'same-her-inward-carry',
        'quiet-companionship',
        'remaining-open=lipsync+voice',
        'Shared send identity already preserves body, face, and motion recovery on one living segment.',
        'Lipsync and voice still need to rejoin before full cross-modal closure settles, and shared send identity should keep that line inward and low-pressure.',
      ]),
    }))
  })

  it('keeps richer anthropomorphic emotional closure and same-her inward-carry observability visible inside shared pre-dialogue send identity fallback when carried awareness only has the thinner same-phase briefing plus stronger host-facing same-her headline', () => {
    expect(buildPreDialogueSendIdentityFromSnapshots({
      projectStateContinuitySnapshot: {
        identity: 'Alicization is a local-first digital life project.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: 'Shared send identity already preserves project identity carry on one same-her line.',
        primaryOpenLoop: 'Anthropomorphic emotional closure and same-her inward-carry observability still need to survive shared send identity reopening without flattening into a generic shell.',
        nextClosureTarget: 'Keep anthropomorphic emotional closure and same-her inward-carry observability explicit while shared send identity reopening settles back onto one measured-return line.',
        continuitySummary: 'same-her=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line. | landed=Shared send identity already preserves project identity carry on one same-her line. | open=Anthropomorphic emotional closure and same-her inward-carry observability still need to survive shared send identity reopening without flattening into a generic shell.',
        sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        emotionalClosureCue: 'Keep the return low-pressure so the same living line does not restart from scratch.',
        preDialogueAwareness: {
          status: 'partial',
          summaryLine: 'Alicization is still closing Phase 1 local digital life continuity before this turn opens outward.',
          companionHeadlineLine: 'Right now the host-facing closure still needs anthropomorphic emotional closure and same-her inward-carry observability to stay on one measured-return line instead of flattening into a generic shell.',
          companionBriefingLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          companionNextClosureLine: 'Keep anthropomorphic emotional closure and same-her inward-carry observability explicit while shared send identity reopening settles back onto one measured-return line.',
          awarenessLine: 'Right now the host-facing closure still needs anthropomorphic emotional closure and same-her inward-carry observability to stay on one measured-return line instead of flattening into a generic shell.',
          emotionalClosureCue: 'Keep the return low-pressure so the same living line does not restart from scratch.',
          reasonPreview: [
            'anthropomorphic emotional closure still needs stronger host-visible carry.',
            'same-her inward-carry observability still needs to survive shared send identity reopening.',
          ],
        },
        preDialogueClosure: null,
        nonHumanAuthoredStatus: null,
        turnId: 'turn-shared-send-identity-anthropomorphic-host-facing-fallback',
        sessionId: 'session-shared-send-identity-anthropomorphic-host-facing-fallback',
        origin: 'user-turn',
      },
    })).toEqual(expect.objectContaining({
      summaryLine: 'Alicization is still closing Phase 1 local digital life continuity before this turn opens outward.',
      companionHeadlineLine: 'Right now the host-facing closure still needs anthropomorphic emotional closure and same-her inward-carry observability to stay on one measured-return line instead of flattening into a generic shell.',
      companionBriefingLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      companionNextClosureLine: 'Keep anthropomorphic emotional closure and same-her inward-carry observability explicit while shared send identity reopening settles back onto one measured-return line.',
      awarenessLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line. Right now this one living her still needs anthropomorphic emotional closure and same-her inward-carry observability to stay on one measured-return line before anything reopens outward.',
      emotionalClosureCue: 'Keep the return low-pressure so the same living line does not restart from scratch.',
      projectState: expect.objectContaining({
        awarenessLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line. Right now this one living her still needs anthropomorphic emotional closure and same-her inward-carry observability to stay on one measured-return line before anything reopens outward.',
        companionBriefingLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      }),
      reasonPreview: expect.arrayContaining([
        'anthropomorphic emotional closure still needs stronger host-visible carry.',
        'same-her inward-carry observability still needs to survive shared send identity reopening.',
        'Shared send identity already preserves project identity carry on one same-her line.',
        'Anthropomorphic emotional closure and same-her inward-carry observability still need to survive shared send identity reopening without flattening into a generic shell.',
      ]),
    }))
  })

  it('rebuilds shared send-identity awareness from base project-state fields when fallback only has continuity basics, so identity and phase stay explicit before dialogue opens', () => {
    expect(buildPreDialogueSendIdentityFromSnapshots({
      projectStateContinuitySnapshot: {
        identity: 'Alicization 还是本地优先数字生命项目。',
        currentPhase: '她仍在 Phase 1。',
        latestLandedProgress: '第一阶段已经把连续性、记忆和执行慢慢接成一条线了。',
        primaryOpenLoop: '主动性、具身和对话闭环还没有真正收住。',
        nextClosureTarget: '继续把项目身份、已落进度、未闭环项和下一步目标都留在同一个她的 living line 里。',
        sameHerSelfLine: null,
        sameHerHoldDetail: null,
        sameHerDriftRisk: null,
        emotionalClosureCue: null,
        preDialogueAwareness: null,
        preDialogueClosure: null,
        nonHumanAuthoredStatus: null,
        turnId: 'turn-base-project-state-send-identity-awareness-rebuild',
        sessionId: 'session-base-project-state-send-identity-awareness-rebuild',
        origin: 'user-turn',
      } as any,
    })).toEqual(expect.objectContaining({
      awarenessLine: 'Alicization 还是本地优先数字生命项目。 她仍在 Phase 1。 第一阶段已经把连续性、记忆和执行慢慢接成一条线了。 主动性、具身和对话闭环还没有真正收住。 继续把项目身份、已落进度、未闭环项和下一步目标都留在同一个她的 living line 里。',
      projectState: expect.objectContaining({
        preDialogueAwarenessLine: 'Alicization 还是本地优先数字生命项目。 她仍在 Phase 1。 第一阶段已经把连续性、记忆和执行慢慢接成一条线了。 主动性、具身和对话闭环还没有真正收住。 继续把项目身份、已落进度、未闭环项和下一步目标都留在同一个她的 living line 里。',
        awarenessLine: 'Alicization 还是本地优先数字生命项目。 她仍在 Phase 1。 第一阶段已经把连续性、记忆和执行慢慢接成一条线了。 主动性、具身和对话闭环还没有真正收住。 继续把项目身份、已落进度、未闭环项和下一步目标都留在同一个她的 living line 里。',
        identity: 'Alicization 还是本地优先数字生命项目。',
        currentPhase: '她仍在 Phase 1。',
        latestLandedProgress: '第一阶段已经把连续性、记忆和执行慢慢接成一条线了。',
        primaryOpenLoop: '主动性、具身和对话闭环还没有真正收住。',
        nextClosureTarget: '继续把项目身份、已落进度、未闭环项和下一步目标都留在同一个她的 living line 里。',
      }),
      reasonPreview: expect.arrayContaining([
        'Alicization 还是本地优先数字生命项目。',
        '她仍在 Phase 1。',
        '第一阶段已经把连续性、记忆和执行慢慢接成一条线了。',
        '主动性、具身和对话闭环还没有真正收住。',
        '继续把项目身份、已落进度、未闭环项和下一步目标都留在同一个她的 living line 里。',
      ]),
    }))
  })

  it('synthesizes voiced same-her lane headlines from closure-only reasons inside shared pre-dialogue send identity fallback', () => {
    const cases = [
      {
        reasons: [
          'lane=lipsync+voice-only',
          'remaining-open=body+face+motion',
        ],
        headline: 'Right now I am still holding together mainly through lipsync and voice, so that living audio thread is keeping the same-her carry alive while body, face, and motion need to rejoin before full cross-modal closure settles.',
      },
      {
        reasons: [
          'continuity=embodiment:audible-same-her-line | lane=face+voice-only | actual source is face and voice',
          'remaining-open=body+motion+lipsync',
        ],
        headline: 'Right now I am still holding together mainly through face and voice, so that still-voiced face line is keeping the same-her carry alive while body, motion, and lipsync need to rejoin before full cross-modal closure settles.',
      },
      {
        reasons: [
          'continuity=embodiment:audible-same-her-line | lane=motion+voice-only | actual source is motion and voice',
          'remaining-open=body+face+lipsync',
        ],
        headline: 'Right now I am still holding together mainly through motion and voice, so that still-voiced motion line is keeping the same-her carry alive while body, face, and lipsync need to rejoin before full cross-modal closure settles.',
      },
      {
        reasons: [
          'continuity=embodiment:still-voiced-face-line | signature=resident|main-runtime|accompanying|quiet-accompaniment|still-voiced-face-line | face+voice recovery@segment-live2d-runtime-still-voiced-face-1 | pending-rejoin=body+motion+lipsync',
        ],
        headline: 'Right now I am still holding together mainly through face and voice, so that still-voiced face line is keeping the same-her carry alive while body, motion, and lipsync need to rejoin before full cross-modal closure settles.',
      },
      {
        reasons: [
          'continuity=embodiment:still-voiced-motion-line | signature=resident|main-runtime|accompanying|quiet-accompaniment|still-voiced-motion-line | motion+voice recovery@segment-live2d-runtime-still-voiced-motion-1 | pending-rejoin=body+face+lipsync',
        ],
        headline: 'Right now I am still holding together mainly through motion and voice, so that still-voiced motion line is keeping the same-her carry alive while body, face, and lipsync need to rejoin before full cross-modal closure settles.',
      },
      {
        reasons: [
          'continuity=embodiment:still-voiced-face-lipsync-line+embodiment:still-voiced-face-line | face+lipsync+voice recovery@segment-live2d-runtime-still-voiced-face-mouth-1 | pending-rejoin=body+motion',
        ],
        headline: 'Right now I am still holding together through face, lipsync, and voice together, so that still-voiced face-and-mouth line is keeping the same-her carry alive while body and motion need to rejoin before full cross-modal closure settles.',
      },
      {
        reasons: [
          'continuity=embodiment:still-voiced-motion-lipsync-line+embodiment:still-voiced-motion-line | motion+lipsync+voice recovery@segment-live2d-runtime-still-voiced-motion-mouth-1 | pending-rejoin=body+face',
        ],
        headline: 'Right now I am still holding together through motion, lipsync, and voice together, so that still-voiced motion-and-mouth line is keeping the same-her carry alive while body and face need to rejoin before full cross-modal closure settles.',
      },
      {
        reasons: [
          'continuity=embodiment:still-voiced-face-motion-line | signature=resident|main-runtime|accompanying|quiet-accompaniment|still-voiced-face-motion-line | face+motion+voice recovery@segment-live2d-runtime-still-voiced-face-motion-1 | pending-rejoin=body+lipsync',
        ],
        headline: 'Right now I am still holding together through face, motion, and voice together, so that still-voiced face-and-motion line is keeping the same-her carry alive while body and lipsync need to rejoin before full cross-modal closure settles.',
      },
      {
        reasons: [
          'lane=face+motion+voice-only | remaining-open=body+lipsync',
        ],
        headline: 'Right now I am still holding together through face, motion, and voice together, so that still-voiced face-and-motion line is keeping the same-her carry alive while body and lipsync need to rejoin before full cross-modal closure settles.',
      },
      {
        reasons: [
          'lane=face+motion+lipsync+voice-only | face+motion+lipsync+voice recovery@segment-live2d-visible-rejoin-no-body-1 | pending-rejoin=body',
        ],
        headline: 'Right now I am still holding together through face, motion, lipsync, and voice together, so the visible same-her line has already rejoined without body carry while body still needs to rejoin before full cross-modal closure settles.',
      },
      {
        reasons: [
          'lane=voice-only',
          'remaining-open=body+face+motion+lipsync',
        ],
        headline: 'Right now I am still holding together mainly through voice, so my full cross-modal same-her line is not closed yet.',
      },
    ] as const

    for (const testCase of cases) {
      expect(buildPreDialogueSendIdentityFromSnapshots({
        preDialogueClosureSnapshot: {
          status: 'partial',
          summaryLine: 'project=continuity=0.67 (2/3) | embodiment continuity still needs a stronger host-visible same-her carry.',
          companionHeadlineLine: null,
          companionBriefingLine: null,
          companionNextClosureLine: null,
          briefingLines: [],
          reasons: [...testCase.reasons],
        },
      })).toEqual(expect.objectContaining({
        status: 'partial',
        companionHeadlineLine: testCase.headline,
        awarenessLine: testCase.headline,
        reasonPreview: expect.arrayContaining([
          testCase.headline,
          ...testCase.reasons,
        ]),
      }))
    }
  })

  it('returns null when no project-awareness snapshots are available', () => {
    expect(buildPreDialogueSendIdentityFromSnapshots({})).toBeNull()
  })
})
