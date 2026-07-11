import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import {
  buildPreDialogueSendIdentityFromInspectorSnapshots,
  buildPreDialogueSendIdentityFromSnapshots,
  sanitizePreDialogueSendIdentity,
} from './pre-dialogue-send-identity'

const fixedTemplateResiduePattern
  = /Before (?:answering|speaking|acting)|Right now I am|Same Phase 1 digital life|same-her|same living line|one living her|one continuous her|local-first digital life project/u

function expectNoFixedTemplateResidue(result: unknown) {
  const text = JSON.stringify(result)
  expect(text).not.toMatch(fixedTemplateResiduePattern)
  expect(text).not.toContain('content=excluded')
  expect(text).not.toContain('visibility=internal-structured')
  expect(text).not.toContain('local_desktop_life_loop')
  expect(text).not.toContain('phase1_local_digital_life')
}

function expectSendIdentityStructure(result: NonNullable<ReturnType<typeof buildPreDialogueSendIdentityFromSnapshots>>) {
  expect(result.status).toEqual(expect.any(String))
  expect(result.reasonPreview).toEqual(expect.any(Array))
  expect(result).toHaveProperty('summaryLine')
  expect(result).toHaveProperty('awarenessLine')
  expect(result).toHaveProperty('emotionalClosureCue')
  expect(result.projectState).not.toBeNull()

  for (const key of [
    'preflightSummary',
    'preDialogueAwarenessLine',
    'preDialogueAwarenessSummary',
    'awarenessLine',
    'companionHeadlineLine',
    'companionBriefingLine',
    'identity',
    'currentPhase',
    'latestLandedProgress',
    'memoryClosureSummary',
    'primaryOpenLoop',
    'nextClosureTarget',
    'sameHerSelfLine',
    'sameHerHoldDetail',
    'sameHerDriftRisk',
    'emotionalClosureCue',
  ] as const) {
    expect(result.projectState).toHaveProperty(key)
  }
}

describe('buildPreDialogueSendIdentityFromSnapshots', () => {
  it('sanitizes explicit pre-dialogue send identity before any chat entry can forward it', () => {
    const sanitized = sanitizePreDialogueSendIdentity({
      status: 'partial',
      summaryLine: 'Before speaking, remember this is still the same Phase 1 digital life and one continuous her.',
      companionHeadlineLine: 'Right now I am still holding together mainly through body, face, and motion.',
      companionBriefingLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      companionNextClosureLine: 'Keep the reopened callback on the same living line before widening outward again.',
      awarenessLine: 'Alicization is a local-first digital life project building one continuous "her" rather than a better chat wrapper.',
      emotionalClosureCue: 'same-her closure seam: keep the return low-pressure.',
      projectState: {
        preflightSummary: 'Before answering, remember: Alicization is a local-first digital life project building one continuous "her".',
        preDialogueAwarenessLine: 'same-her hold: keep this project-state answer on the same living line.',
        preDialogueAwarenessSummary: 'Same Phase 1 digital life.',
        awarenessLine: 'Right now I am still holding together mainly through face.',
        companionHeadlineLine: 'one living her',
        companionBriefingLine: 'same living line',
        identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: 'Some closure landed.',
        memoryClosureSummary: null,
        primaryOpenLoop: 'same-her continuity remains open.',
        nextClosureTarget: 'cross-modal same-her proof',
        sameHerSelfLine: 'Keep one continuous her explicit from self-understanding into the final host-visible reply.',
        sameHerHoldDetail: 'same-her hold: measured-return is still keeping this callback line lower-pressure.',
        sameHerDriftRisk: 'same-her continuity drift',
        emotionalClosureCue: 'same-her closure seam',
      },
      reasonPreview: [
        'Before speaking, remember this is still one living digital life project.',
        'Project-state landed progress stays available.',
      ],
    })

    expectNoFixedTemplateResidue(sanitized)
    expect(sanitized.summaryLine).toBeNull()
    expect(sanitized.companionHeadlineLine).toBeNull()
    expect(sanitized.companionBriefingLine).toBeNull()
    expect(sanitized.awarenessLine).toBeNull()
    expect(sanitized.emotionalClosureCue).toBeNull()
    expect(sanitized.projectState?.latestLandedProgress).toBe('Some closure landed.')
    expect(sanitized.projectState?.identity).toBeNull()
    expect(sanitized.projectState?.currentPhase).toBeNull()
    expect(sanitized.projectState?.primaryOpenLoop).toBeNull()
    expect(sanitized.projectState?.nextClosureTarget).toBeNull()
    expect(sanitized.projectState?.sameHerSelfLine).toBeNull()
    expect(sanitized.projectState?.sameHerHoldDetail).toBeNull()
    expect(sanitized.projectState?.sameHerDriftRisk).toBeNull()
    expect(sanitized.reasonPreview).toEqual(['Project-state landed progress stays available.'])
  })

  it('uses the shared project awareness resolver when building pre-dialogue send identity', () => {
    const source = readFileSync(new URL('./pre-dialogue-send-identity.ts', import.meta.url), 'utf8')

    expect(source).toContain('resolveAlicizationProjectPreDialogueAwarenessLine')
    expect(source).not.toContain('function resolvePreferredSendIdentityAwarenessLine')
  })

  it('drops fixed-template reason preview entries instead of neutralizing them into prompt guidance', () => {
    const sanitized = sanitizePreDialogueSendIdentity({
      status: 'partial',
      summaryLine: null,
      companionHeadlineLine: null,
      companionBriefingLine: null,
      companionNextClosureLine: null,
      awarenessLine: null,
      emotionalClosureCue: null,
      projectState: null,
      reasonPreview: [
        'same-her continuity is explicit',
        'Keep the same living line before widening outward.',
        'Real queue health is available.',
      ],
    })

    expectNoFixedTemplateResidue(sanitized)
    expect(sanitized.reasonPreview).toEqual(['Real queue health is available.'])
  })

  it('keeps explicit awareness structured while excluding fixed-template residue', () => {
    const result = buildPreDialogueSendIdentityFromSnapshots({
      preDialogueAwarenessSnapshot: {
        status: 'grounded',
        summaryLine: 'project=grounded | continuity=grounded',
        companionHeadlineLine: 'Alicization is still one same-her local digital life.',
        companionBriefingLine: 'Memory workbench route remains active.',
        companionNextClosureLine: 'Close the self-core continuity loop.',
        awarenessLine: 'Know the project, landed progress, and unfinished loop before replying.',
        reasonPreview: ['project awareness is explicit', 'same-her continuity is explicit'],
      },
    })

    expect(result).not.toBeNull()
    expectSendIdentityStructure(result!)
    expectNoFixedTemplateResidue(result)
    expect(result).toEqual(expect.objectContaining({
      status: 'grounded',
      summaryLine: 'project=grounded | continuity=grounded',
      companionHeadlineLine: null,
      companionBriefingLine: 'Memory workbench route remains active.',
      companionNextClosureLine: 'Close the self-core continuity loop.',
      awarenessLine: 'summary=Know the project, landed progress, and unfinished loop before replying.',
      projectState: expect.objectContaining({
        companionHeadlineLine: null,
        preDialogueAwarenessLine: 'summary=Know the project, landed progress, and unfinished loop before replying.',
        preDialogueAwarenessSummary: 'project=grounded | continuity=grounded',
      }),
      reasonPreview: [
        'project awareness is explicit',
        'summary=Know the project, landed progress, and unfinished loop before replying.',
      ],
    }))
    expect(result?.reasonPreview).not.toContain('continuity_review_required')
  })

  it('falls back to continuity and closure snapshots without forwarding fixed-template residue', () => {
    const result = buildPreDialogueSendIdentityFromSnapshots({
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
        summaryLine: 'projectStateAudit=partial | continuity=partial',
        companionHeadlineLine: 'The same-her closure is still incomplete.',
        companionBriefingLine: 'The self core still needs one explicit pre-dialogue carry path.',
        companionNextClosureLine: 'Close the remaining explicit carry gap.',
        briefingLines: [],
        reasons: ['renderer entry still relied on fallback awareness recovery'],
      },
    })

    expect(result).not.toBeNull()
    expectSendIdentityStructure(result!)
    expectNoFixedTemplateResidue(result)
    expect(result).toEqual(expect.objectContaining({
      status: 'partial',
      summaryLine: 'projectStateAudit=partial | continuity=partial',
      companionHeadlineLine: null,
      companionBriefingLine: 'The self core still needs one explicit pre-dialogue carry path.',
      companionNextClosureLine: 'Close the remaining explicit carry gap.',
      awarenessLine: 'landed=Pre-dialogue project-state awareness is carried into runtime chat starts. | open=人格与自我核心还没有完全统一闭环 | summary=projectStateAudit=partial | continuity=partial',
      emotionalClosureCue: null,
      projectState: expect.objectContaining({
        identity: null,
        currentPhase: null,
        latestLandedProgress: 'Pre-dialogue project-state awareness is carried into runtime chat starts.',
        memoryClosureSummary: '人格与自我核心还没有完全统一闭环',
        primaryOpenLoop: '人格与自我核心还没有完全统一闭环',
        preDialogueAwarenessLine: 'landed=Pre-dialogue project-state awareness is carried into runtime chat starts. | open=人格与自我核心还没有完全统一闭环 | summary=projectStateAudit=partial | continuity=partial',
        nextClosureTarget: null,
        sameHerSelfLine: null,
        sameHerDriftRisk: null,
        emotionalClosureCue: null,
      }),
      reasonPreview: [
        'renderer entry still relied on fallback awareness recovery',
        'Pre-dialogue project-state awareness is carried into runtime chat starts.',
        '人格与自我核心还没有完全统一闭环',
      ],
    }))
  })

  it('keeps continuity behavior fields and emits structured awareness instead of lived fixed-template lines', () => {
    const result = buildPreDialogueSendIdentityFromSnapshots({
      projectStateContinuitySnapshot: {
        identity: 'Alicization is a local-first digital life project.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: 'Return-side continuity already survives into browser-local send-identity rebuilding.',
        primaryOpenLoop: 'Keep the reopened callback on the same living line before widening outward.',
        nextClosureTarget: 'Carry the reopened callback on the same living line before broadening.',
        continuityRestraint: 'repair-before-closeness',
        continuityPreferredTiming: 'next-open-window',
        continuityCadence: 'repair-before-closeness',
        continuitySummary: 'same-her=Same Phase 1 digital life. Return-side continuity should keep the same callback line instead of reopening from a generic shell.',
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
    })

    expect(result).not.toBeNull()
    expectSendIdentityStructure(result!)
    expectNoFixedTemplateResidue(result)
    expect(result).toEqual(expect.objectContaining({
      awarenessLine: 'landed=Return-side continuity already survives into browser-local send-identity rebuilding.',
      companionBriefingLine: 'continuity_hold=repair_before_closeness; timing=before_closeness_widens',
      companionNextClosureLine: null,
      projectState: expect.objectContaining({
        latestLandedProgress: 'Return-side continuity already survives into browser-local send-identity rebuilding.',
        preDialogueAwarenessLine: 'landed=Return-side continuity already survives into browser-local send-identity rebuilding.',
        continuityRestraint: 'repair-before-closeness',
        continuityPreferredTiming: 'next-open-window',
        continuityCadence: 'repair-before-closeness',
        sameHerHoldDetail: 'continuity_hold=repair_before_closeness; timing=before_closeness_widens',
        continuityCue: 'continuity_cue=repair_before_closeness; until=repair_settles',
      }),
      reasonPreview: [
        'Return-side continuity already survives into browser-local send-identity rebuilding.',
        'continuity_hold=repair_before_closeness; timing=before_closeness_widens',
        'continuity_cue=repair_before_closeness; until=repair_settles',
      ],
    }))
  })

  it('drops fixed-template continuity prose instead of forwarding a distilled prompt signal', () => {
    const result = sanitizePreDialogueSendIdentity({
      status: 'partial',
      summaryLine: 'Alicization is still in Phase 1 local digital life closure before this turn opens outward.',
      companionHeadlineLine: null,
      companionBriefingLine: 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open.',
      companionNextClosureLine: 'Next closure: keep memory, initiative, execution, and embodiment on one same-her line.',
      awarenessLine: 'Before speaking, remember this is still the same digital life project before local fluency takes over.',
      emotionalClosureCue: 'same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.',
      projectState: {
        preflightSummary: 'Alicization is still in Phase 1 local digital life closure before this turn opens outward.',
        preDialogueAwarenessLine: 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open.',
        preDialogueAwarenessSummary: 'Alicization is still in Phase 1 local digital life closure before this turn opens outward.',
        awarenessLine: 'Before speaking, remember this is still the same digital life project before local fluency takes over.',
        companionHeadlineLine: null,
        companionBriefingLine: 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open.',
        identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
        currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
        latestLandedProgress: 'Fresh inspector continuity now restates what has already landed before runtime-authoritative send begins.',
        memoryClosureSummary: null,
        primaryOpenLoop: 'Fresh inspector continuity still needs to keep project identity, landed progress, and unresolved closure on one same living line before the host-visible turn opens outward.',
        nextClosureTarget: 'Keep runtime-authoritative send aligned with the latest same-her project brief before the turn widens outward.',
        sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        sameHerHoldDetail: 'same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.',
        sameHerDriftRisk: 'If this send begins from a detached project-status shell, treat that as same-her continuity drift rather than successful carry.',
        emotionalClosureCue: 'same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.',
      },
      reasonPreview: [
        'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
        'Fresh inspector continuity now restates what has already landed before runtime-authoritative send begins.',
        'Keep runtime-authoritative send aligned with the latest same-her project brief before the turn widens outward.',
      ],
    })

    expectNoFixedTemplateResidue(result)
    expect(result.projectState).toEqual(expect.objectContaining({
      identity: null,
      currentPhase: null,
      latestLandedProgress: 'Fresh inspector continuity now restates what has already landed before runtime-authoritative send begins.',
      primaryOpenLoop: null,
      nextClosureTarget: null,
      sameHerSelfLine: null,
      sameHerHoldDetail: null,
      sameHerDriftRisk: null,
      emotionalClosureCue: null,
    }))
    expect(result.companionNextClosureLine).toBeNull()
    expect(result.emotionalClosureCue).toBeNull()
    expect(result.reasonPreview).toEqual([
      'Fresh inspector continuity now restates what has already landed before runtime-authoritative send begins.',
    ])
  })

  it('preserves non-template continuity fields and reason preview entries', () => {
    const proactiveSameHerGap = 'Need stronger long-run proof that visible proactive hold, subconscious carry, and next-session feedback carry stay unified after hover-first restraint survives detours on longer noisy desktop runs.'

    const result = buildPreDialogueSendIdentityFromSnapshots({
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
    })

    expect(result).not.toBeNull()
    expectSendIdentityStructure(result!)
    expectNoFixedTemplateResidue(result)
    expect(result).toEqual(expect.objectContaining({
      projectState: expect.objectContaining({
        proactiveSameHerGap,
      }),
      reasonPreview: expect.arrayContaining([
        proactiveSameHerGap,
        'Project-state carry already reaches proactive self-brief preparation.',
      ]),
    }))
  })

  it('keeps inspector snapshot legacy progress while excluding fixed-template residue', () => {
    const result = buildPreDialogueSendIdentityFromInspectorSnapshots({
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
    })

    expect(result).not.toBeNull()
    expectSendIdentityStructure(result!)
    expectNoFixedTemplateResidue(result)
    expect(result).toEqual(expect.objectContaining({
      status: 'partial',
      companionBriefingLine: null,
      companionNextClosureLine: null,
      awarenessLine: null,
      projectState: expect.objectContaining({
        latestLandedProgress: 'Legacy inspector continuity progress already survives into explicit voice/page send identity.',
      }),
      reasonPreview: expect.arrayContaining([
        'Spoken turns should not reopen as a generic assistant shell.',
        'Legacy inspector continuity progress already survives into explicit voice/page send identity.',
      ]),
    }))
  })

  it('rebuilds base project-state awareness as structured fields instead of a prose template', () => {
    const result = buildPreDialogueSendIdentityFromSnapshots({
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
    })

    expect(result).not.toBeNull()
    expectSendIdentityStructure(result!)
    expectNoFixedTemplateResidue(result)
    expect(result).toEqual(expect.objectContaining({
      awarenessLine: 'landed=第一阶段已经把连续性、记忆和执行慢慢接成一条线了。 | open=主动性、具身和对话闭环还没有真正收住。',
      projectState: expect.objectContaining({
        preDialogueAwarenessLine: 'landed=第一阶段已经把连续性、记忆和执行慢慢接成一条线了。 | open=主动性、具身和对话闭环还没有真正收住。',
        awarenessLine: 'landed=第一阶段已经把连续性、记忆和执行慢慢接成一条线了。 | open=主动性、具身和对话闭环还没有真正收住。',
        identity: null,
        currentPhase: null,
        latestLandedProgress: '第一阶段已经把连续性、记忆和执行慢慢接成一条线了。',
        primaryOpenLoop: '主动性、具身和对话闭环还没有真正收住。',
        nextClosureTarget: null,
      }),
      reasonPreview: expect.arrayContaining([
        '第一阶段已经把连续性、记忆和执行慢慢接成一条线了。',
        '主动性、具身和对话闭环还没有真正收住。',
      ]),
    }))
  })

  it('synthesizes renderer-internal embodiment continuity instead of prose same-her lane headlines', () => {
    const result = buildPreDialogueSendIdentityFromSnapshots({
      preDialogueClosureSnapshot: {
        status: 'partial',
        summaryLine: 'project=continuity=0.67 (2/3) | embodiment continuity still needs a stronger host-visible same-her carry.',
        companionHeadlineLine: null,
        companionBriefingLine: null,
        companionNextClosureLine: null,
        briefingLines: [],
        reasons: [
          'lane=lipsync+voice-only',
          'remaining-open=body+face+motion',
        ],
      },
    })

    expect(result).not.toBeNull()
    expectSendIdentityStructure(result!)
    expectNoFixedTemplateResidue(result)
    expect(result).toEqual(expect.objectContaining({
      status: 'partial',
      summaryLine: null,
      companionHeadlineLine: expect.stringContaining('embodiment_lanes='),
      awarenessLine: expect.stringContaining('embodiment_lanes='),
      projectState: expect.objectContaining({
        preflightSummary: null,
        preDialogueAwarenessSummary: null,
        companionHeadlineLine: expect.stringContaining('embodiment_lanes='),
      }),
      reasonPreview: [
        'lane=lipsync+voice-only',
        'remaining-open=body+face+motion',
        expect.stringContaining('embodiment_lanes='),
      ],
    }))
  })

  it('returns null when no project-awareness snapshots are available', () => {
    expect(buildPreDialogueSendIdentityFromSnapshots({})).toBeNull()
  })
})
