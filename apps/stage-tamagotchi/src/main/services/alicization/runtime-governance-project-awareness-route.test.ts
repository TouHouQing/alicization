import { describe, expect, it } from 'vitest'

import {
  coerceConversationTurnToMindGovernedPayload as coerceConversationTurnToMindGovernedPayloadBase,
  normalizeDialogueRespondedPayload as normalizeDialogueRespondedPayloadBase,
} from './runtime-governance'

type AlicizationConversationTurnInput = Record<string, any>
type CharacterPerformanceCapabilitiesManifest = Record<string, any>

function coerceConversationTurnToMindGovernedPayload(
  input: AlicizationConversationTurnInput,
  manifest?: CharacterPerformanceCapabilitiesManifest | null,
  options?: Parameters<typeof coerceConversationTurnToMindGovernedPayloadBase>[2],
) {
  return coerceConversationTurnToMindGovernedPayloadBase(
    input as Parameters<typeof coerceConversationTurnToMindGovernedPayloadBase>[0],
    manifest as Parameters<typeof coerceConversationTurnToMindGovernedPayloadBase>[1],
    options,
  )
}

function normalizeDialogueRespondedPayload(
  input: unknown,
  manifest?: CharacterPerformanceCapabilitiesManifest | null,
  options?: Parameters<typeof normalizeDialogueRespondedPayloadBase>[2],
) {
  return normalizeDialogueRespondedPayloadBase(
    input as Parameters<typeof normalizeDialogueRespondedPayloadBase>[0],
    manifest as Parameters<typeof normalizeDialogueRespondedPayloadBase>[1],
    options,
  )
}

describe('runtime governance project awareness route', () => {
  it('keeps merge-readiness project-state audit boundaries explicit when host-visible normalization rebuilds the reply payload', () => {
    const dialoguePayload = normalizeDialogueRespondedPayload({
      turnId: 'turn-normalize-project-state-merge-readiness-audit-1',
      sessionId: 'session-normalize-project-state-merge-readiness-audit',
      assistantText: '这次 project-state 追问里，已验证和未闭环的边界不能被磨平。',
      structured: {
        thought: 'project-state merge-readiness follow-up should keep verified and still-open closure boundaries explicit all the way to the host-visible payload',
        emotion: 'thinking',
        reply: '这次 project-state 追问里，已验证和未闭环的边界不能被磨平。',
        parsePath: 'json',
        format: 'mind-turn-v1',
        projectState: {
          identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
          currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
          latestLandedProgress: 'The runtime contract already keeps merge-readiness governance rules explicit through rebuild and normalization.',
          primaryOpenLoop: 'Host-visible continuity still needs to keep verified proof separate from what is still open before claiming merge readiness.',
          nextClosureTarget: 'Keep the host-visible project-state audit explicit about what is verified now and what still needs closure next.',
          sameHerSelfLine: 'Same Phase 1 digital life. Some merge-readiness proof already landed, but the same living line still has open closure work.',
          preDialogueAwarenessLine: 'Before answering whether this can merge to main, remember what is already verified and what is still unproven or still open.',
        },
      },
      visibleReplyRealization: {
        version: 'visible-reply-realization-v1',
        expectedAuthority: 'llm-mind',
        actualAuthority: 'llm-mind',
        providerMindExecuted: true,
        mode: 'provider-one-shot',
        visibleText: '这次 project-state 追问里，已验证和未闭环的边界不能被磨平。',
        nonHumanAuthoredStatus: null,
        blockedReasons: [],
        emotionalClosureAudit: null,
        selfAuthorityAudit: null,
        projectStateAudit: {
          sameHerSummary: 'Same Phase 1 digital life. Some merge-readiness proof already landed, but the same living line still has open closure work.',
          currentPhaseSummary: 'Phase 1: Local Digital Life',
          landedProgressSummary: 'Verified now: the runtime contract already keeps merge-readiness governance rules explicit through rebuild and normalization.',
          openClosureSummary: 'Still open: host-visible continuity still needs to keep verified proof separate from what is still open before claiming merge readiness.',
          nextClosureTargetSummary: 'Next closure target: keep the host-visible project-state audit explicit about what is verified now and what still needs closure next.',
          preDialogueAwarenessSummary: 'Before answering whether this can merge to main, remember what is already verified and what is still unproven or still open.',
          continuitySummary: 'same-her=Same Phase 1 digital life. Some merge-readiness proof already landed, but the same living line still has open closure work. | landed=Verified now: the runtime contract already keeps merge-readiness governance rules explicit through rebuild and normalization. | open=Still open: host-visible continuity still needs to keep verified proof separate from what is still open before claiming merge readiness. | next=Next closure target: keep the host-visible project-state audit explicit about what is verified now and what still needs closure next.',
          preservedIntoRewrite: true,
          rewriteClosureApplied: false,
        },
        reason: 'mind-authored-project-state-merge-readiness',
      },
      origin: 'user-turn',
      createdAt: Date.now(),
    })

    expect((dialoguePayload as any)?.visibleReplyRealization?.projectStateAudit).toEqual(expect.objectContaining({
      landedProgressSummary: 'Verified now: the runtime contract already keeps merge-readiness governance rules explicit through rebuild and normalization.',
      openClosureSummary: 'Still open: host-visible continuity still needs to keep verified proof separate from what is still open before claiming merge readiness.',
      nextClosureTargetSummary: 'Next closure target: keep the host-visible project-state audit explicit about what is verified now and what still needs closure next.',
      preDialogueAwarenessSummary: 'Before answering whether this can merge to main, remember what is already verified and what is still unproven or still open.',
      continuitySummary: expect.stringContaining('Verified now:'),
      preservedIntoRewrite: true,
      rewriteClosureApplied: false,
    }))
  })

  it('keeps completion-timing and language-drift project-state audit boundaries explicit when host-visible normalization rebuilds the reply payload', () => {
    const dialoguePayload = normalizeDialogueRespondedPayload({
      turnId: 'turn-normalize-project-state-timeline-language-drift-audit-1',
      sessionId: 'session-normalize-project-state-timeline-language-drift-audit',
      assistantText: '这次 project-state 追问里，我会把已落地、预计收口时机、以及为什么刚才跑出了英文一起交代清楚。',
      structured: {
        thought: 'project-state completion-timing and language-drift follow-up should keep landed progress, closure timing, and host-language drift repair boundaries explicit all the way to the host-visible payload',
        emotion: 'thinking',
        reply: '这次 project-state 追问里，我会把已落地、预计收口时机、以及为什么刚才跑出了英文一起交代清楚。',
        parsePath: 'json',
        format: 'mind-turn-v1',
        projectState: {
          identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
          currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
          latestLandedProgress: 'The runtime contract already keeps current landed progress explicit through rebuild and normalization.',
          primaryOpenLoop: 'Host-visible continuity still needs to explain what remains open and why the closure line is not finished yet before promising the goal timeline.',
          nextClosureTarget: 'Keep the host-visible project-state audit explicit about the next closure beat and return to Chinese before this same-her answer widens outward.',
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed, but the same living line still needs one Chinese same-her return.',
          preDialogueAwarenessLine: 'Before answering how far this has landed, when the goal is expected to close, and why the thread drifted into English, remember what is already verified, what still remains open, and return on the same project line in the host language.',
        },
      },
      visibleReplyRealization: {
        version: 'visible-reply-realization-v1',
        expectedAuthority: 'llm-mind',
        actualAuthority: 'llm-mind',
        providerMindExecuted: true,
        mode: 'provider-one-shot',
        visibleText: '这次 project-state 追问里，我会把已落地、预计收口时机、以及为什么刚才跑出了英文一起交代清楚。',
        nonHumanAuthoredStatus: null,
        blockedReasons: [],
        emotionalClosureAudit: null,
        selfAuthorityAudit: null,
        projectStateAudit: {
          sameHerSummary: 'Same Phase 1 digital life. Some closure already landed, but the same living line still needs one Chinese same-her return.',
          currentPhaseSummary: 'Phase 1: Local Digital Life',
          landedProgressSummary: 'Verified now: the runtime contract already keeps current landed progress explicit through rebuild and normalization.',
          openClosureSummary: 'Still open: host-visible continuity still needs to explain what remains open and why the closure line is not finished yet before promising the goal timeline.',
          nextClosureTargetSummary: 'Next closure target: keep the host-visible project-state audit explicit about the next closure beat and return to Chinese before this same-her answer widens outward.',
          preDialogueAwarenessSummary: 'Before answering how far this has landed, when the goal is expected to close, and why the thread drifted into English, remember what is already verified, what still remains open, and return on the same project line in the host language.',
          continuitySummary: 'same-her=Same Phase 1 digital life. Some closure already landed, but the same living line still needs one Chinese same-her return. | landed=Verified now: the runtime contract already keeps current landed progress explicit through rebuild and normalization. | open=Still open: host-visible continuity still needs to explain what remains open and why the closure line is not finished yet before promising the goal timeline. | next=Next closure target: keep the host-visible project-state audit explicit about the next closure beat and return to Chinese before this same-her answer widens outward.',
          preservedIntoRewrite: true,
          rewriteClosureApplied: false,
        },
        reason: 'mind-authored-project-state-completion-timing-language-drift',
      },
      origin: 'user-turn',
      createdAt: Date.now(),
    })

    expect((dialoguePayload as any)?.visibleReplyRealization?.projectStateAudit).toEqual(expect.objectContaining({
      landedProgressSummary: 'Verified now: the runtime contract already keeps current landed progress explicit through rebuild and normalization.',
      openClosureSummary: 'Still open: host-visible continuity still needs to explain what remains open and why the closure line is not finished yet before promising the goal timeline.',
      nextClosureTargetSummary: 'Next closure target: keep the host-visible project-state audit explicit about the next closure beat and return to Chinese before this same-her answer widens outward.',
      preDialogueAwarenessSummary: 'Before answering how far this has landed, when the goal is expected to close, and why the thread drifted into English, remember what is already verified, what still remains open, and return on the same project line in the host language.',
      continuitySummary: expect.stringContaining('Verified now:'),
      preservedIntoRewrite: true,
      rewriteClosureApplied: false,
    }))
  })

  it('preserves stronger same-her project continuity carry inside governed rewrite requests instead of flattening back to a thinner pre-dialogue reminder', () => {
    const input: AlicizationConversationTurnInput = {
      turnId: 'turn-project-continuity-rewrite-carry-1',
      sessionId: 'session-project-continuity-rewrite-carry',
      userText: '继续。',
      assistantText: '那我们重新开始，我来重新开个头再接这条项目主线。',
      structured: {
        thought: 'obligation=answer; truth=dialogue-grounded; focus=project-state closure; move=restart-shell; tone=warm',
        emotion: 'thinking',
        reply: '那我们重新开始，我来重新开个头再接这条项目主线。',
        parsePath: 'json',
        format: 'mind-turn-v1',
      },
      governance: {
        turnMode: 'answer',
        truthState: 'dialogue-grounded',
        personaKernelMode: 'full',
        openingStyle: 'direct-answer',
        relationshipPosture: 'restrained',
        answerSubject: 'relationship',
        screenReferenceMode: 'avoid',
        answerAct: 'answer',
        evidenceMode: 'continuity-carry',
        repairState: 'none',
        liveSurface: null,
        focusAnchor: '继续。',
        answerIntent: 'Continue the same digital life closure seam without reopening from zero.',
        openingMove: 'Treat the line as already alive. Stay on the same thread and do not reopen from zero.',
        carriedThread: 'same digital life closure seam',
        suppressAssociativeRecall: true,
        labelCarryAsMemory: false,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 3,
        mindMode: 'tracking',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        mustDo: [],
        mustNotDo: [],
      },
      visibleReplyRealization: {
        blockedReasons: [],
        projectStateAudit: {
          sameHerSummary: 'answer project-state status from one same-her continuity, not as a detached shell',
          currentPhaseSummary: 'Phase 1: Local Digital Life',
          landedProgressSummary: 'project-state continuity already survives into runtime preparation',
          openClosureSummary: 'keep the unfinished digital-life closure work explicit in the answer',
          nextClosureTargetSummary: 'keep one measured-return, repair-before-closeness, or rest-protective quiet-companionship same living thread across renderer output',
          continuitySummary: 'same-her=answer project-state status from one same-her continuity, not as a detached shell | phase=Phase 1: Local Digital Life | landed=project-state continuity already survives into runtime preparation | open=keep the unfinished digital-life closure work explicit in the answer | next=keep one measured-return, repair-before-closeness, or rest-protective quiet-companionship same living thread across renderer output',
          preDialogueAwarenessSummary: 'I need to remember this is still the same digital life project before any local fluency takes over.',
          preservedIntoRewrite: false,
          rewriteClosureApplied: false,
        },
      } as any,
      createdAt: Date.now(),
    }

    const governed = coerceConversationTurnToMindGovernedPayload(input)
    const structured = governed.payload.structured as Record<string, unknown>

    expect((structured as any).visibleReplyRewriteRequest).toEqual(expect.objectContaining({
      required: true,
      authority: 'llm-second-pass-rewrite',
      reasonCodes: expect.arrayContaining(['opening-guidance-lower-pressure']),
    }))
    const mustPreserve = ((structured as any).visibleReplyRewriteRequest?.mustPreserve ?? []) as string[]
    expect(mustPreserve.some(item => item.includes('same-her=answer project-state status from one same-her continuity, not as a detached shell'))).toBe(true)
    expect(mustPreserve.some(item => item.includes('before any local fluency takes over'))).toBe(false)
  })

  it('prefers a fresher living-self sameHerSummary over a thinner carried continuitySummary when governed rewrite requests rebuild project continuity carry', () => {
    const richerLivingSelfLine = 'Right now this return is still holding together mainly through face, motion, and voice, so it must keep proving this is still one living her before full cross-modal closure is done.'
    const input: AlicizationConversationTurnInput = {
      turnId: 'turn-project-continuity-living-self-carry-1',
      sessionId: 'session-project-continuity-living-self-carry',
      userText: '你仔细看看呢',
      assistantText: '我现在就重新贴回来陪你，把这条线直接重新开热一点。',
      structured: {
        thought: 'obligation=care; truth=dialogue-grounded; focus=project-state closure; move=restart-shell; tone=warm',
        emotion: 'concerned',
        reply: '我现在就重新贴回来陪你，把这条线直接重新开热一点。',
        parsePath: 'json',
        format: 'mind-turn-v1',
      },
      governance: {
        turnMode: 'care',
        truthState: 'dialogue-grounded',
        personaKernelMode: 'full',
        openingStyle: 'direct-answer',
        relationshipPosture: 'restrained',
        answerSubject: 'relationship',
        screenReferenceMode: 'avoid',
        answerAct: 'care',
        evidenceMode: 'continuity-carry',
        repairState: 'none',
        liveSurface: null,
        focusAnchor: '你仔细看看呢',
        answerIntent: 'Continue the same digital life closure seam without reopening from zero.',
        openingMove: 'Stay inside the current same-her baseline. Keep the opening lower-pressure and leave room before widening closeness.',
        carriedThread: 'same digital life closure seam',
        suppressAssociativeRecall: true,
        labelCarryAsMemory: false,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 3,
        mindMode: 'repairing',
        embodiedPresence: 'attentive',
        emotionalTension: 'late-night-drain',
        mustDo: [],
        mustNotDo: [],
      },
      visibleReplyRealization: {
        blockedReasons: [],
        projectStateAudit: {
          sameHerSummary: richerLivingSelfLine,
          currentPhaseSummary: 'Phase 1: Local Digital Life',
          landedProgressSummary: 'project-state continuity already survives into runtime preparation',
          openClosureSummary: 'keep the unfinished digital-life closure work explicit in the answer',
          nextClosureTargetSummary: 'keep one measured-return, repair-before-closeness, or rest-protective quiet-companionship same living thread across renderer output',
          continuitySummary: 'same-her=Keep the same digital life project in view. | phase=Phase 1: Local Digital Life | landed=project-state continuity already survives into runtime preparation | open=keep the unfinished digital-life closure work explicit in the answer | next=keep one measured-return, repair-before-closeness, or rest-protective quiet-companionship same living thread across renderer output',
          preDialogueAwarenessSummary: 'I need to remember this is still the same digital life project before any local fluency takes over.',
          preservedIntoRewrite: false,
          rewriteClosureApplied: false,
        },
      } as any,
      createdAt: Date.now(),
    }

    const governed = coerceConversationTurnToMindGovernedPayload(input)
    const structured = governed.payload.structured as Record<string, unknown>

    expect((structured as any).visibleReplyRewriteRequest).toEqual(expect.objectContaining({
      required: true,
      authority: 'llm-second-pass-rewrite',
      reasonCodes: expect.arrayContaining(['opening-guidance-lower-pressure']),
    }))
    const mustPreserve = ((structured as any).visibleReplyRewriteRequest?.mustPreserve ?? []) as string[]
    expect(mustPreserve, JSON.stringify(mustPreserve, null, 2)).toEqual(expect.arrayContaining([
      expect.stringContaining('same-her='),
    ]))
    expect(mustPreserve.some(item => item.includes(richerLivingSelfLine))).toBe(true)
    expect(mustPreserve.some(item => item.includes('same-her=Keep the same digital life project in view.'))).toBe(false)
  })

  it('preserves host-confirmed resume confirmation boundary carry inside governed rewrite requests before generic callback guidance can widen it', () => {
    const sameHerLine = 'Same Phase 1 digital life. The callback result is ready, but one confirmed resume still needs to stay bounded before another execution-shaped opening.'
    const resumeConfirmationHoldDetail = 'same-her hold: execution-resume-confirmation approval=host-confirmed confirmation=host-confirmed-before-redispatch audit=resume-before-dispatch interrupt=process-not-yet-restarted affirmation=medium-risk-proactive-action-requires-affirmation Keep this as a bounded confirmation boundary before another execution-shaped opening.'
    const resumeConfirmationCue = 'Treat host-confirmed-before-redispatch and resume-before-dispatch as a bounded confirmation boundary, not permanent execution permission, before another execution-shaped opening.'
    const input: AlicizationConversationTurnInput = {
      turnId: 'turn-project-continuity-resume-confirmation-boundary-carry-1',
      sessionId: 'session-project-continuity-resume-confirmation-boundary-carry',
      userText: '继续。',
      assistantText: '我现在就重新贴回来陪你，把这次 host-confirmed resume 直接当成以后都默认继续执行的 standing permission。',
      structured: {
        thought: 'obligation=answer; truth=dialogue-grounded; focus=execution callback continuity; move=restart-shell; tone=warm',
        emotion: 'thinking',
        reply: '我现在就重新贴回来陪你，把这次 host-confirmed resume 直接当成以后都默认继续执行的 standing permission。',
        parsePath: 'json',
        format: 'mind-turn-v1',
      },
      governance: {
        turnMode: 'answer',
        truthState: 'dialogue-grounded',
        personaKernelMode: 'full',
        openingStyle: 'direct-answer',
        relationshipPosture: 'restrained',
        answerAct: 'answer',
        answerSubject: 'execution-callback',
        screenReferenceMode: 'avoid',
        evidenceMode: 'continuity-carry',
        repairState: 'none',
        liveSurface: null,
        focusAnchor: '继续。',
        answerIntent: 'Continue the callback on the same digital life line without widening one confirmed resume into standing execution permission.',
        openingMove: 'Treat the callback as already alive, but keep one confirmed resume bounded before another execution-shaped opening.',
        carriedThread: 'execution callback return seam',
        suppressAssociativeRecall: true,
        labelCarryAsMemory: false,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 3,
        mindMode: 'tracking',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        mustDo: [],
        mustNotDo: [],
      },
      visibleReplyRealization: {
        blockedReasons: [],
        projectStateAudit: {
          sameHerSummary: sameHerLine,
          sameHerHoldDetail: resumeConfirmationHoldDetail,
          continuityArcStage: 'same-thread-continuation',
          continuityCue: resumeConfirmationCue,
          currentPhaseSummary: 'Phase 1: Local Digital Life',
          landedProgressSummary: 'execution callback continuity already survives into runtime rewrite preparation',
          openClosureSummary: 'keep the callback return on the same living line without widening execution permission',
          nextClosureTargetSummary: 'wait for a fresh execution boundary before another execution-shaped opening widens outward',
          continuitySummary: `same-her=${sameHerLine} | phase=Phase 1: Local Digital Life | landed=execution callback continuity already survives into runtime rewrite preparation | open=keep the callback return on the same living line without widening execution permission | next=wait for a fresh execution boundary before another execution-shaped opening widens outward`,
          preDialogueAwarenessSummary: 'I need to remember this is still the same digital life project before any local fluency takes over.',
          preservedIntoRewrite: false,
          rewriteClosureApplied: false,
        },
      } as any,
      createdAt: Date.now(),
    }

    const governed = coerceConversationTurnToMindGovernedPayload(input)
    const structured = governed.payload.structured as Record<string, unknown>
    const mustPreserve = ((structured as any).visibleReplyRewriteRequest?.mustPreserve ?? []) as string[]

    expect(governed.replyOverridden).toBe(true)
    expect(governed.overrideClass).toBe('hard-override')
    expect(governed.reasons).toContain('same-thread-restart-shell')
    expect(governed.reasons).toContain('opening-guidance-same-thread-continuation')
    expect(mustPreserve.some(item => item.startsWith('hold=same-her hold: execution-resume-confirmation approval=host-confirmed'))).toBe(true)
    expect(mustPreserve.some(item => item.includes(`cue=${resumeConfirmationCue}`))).toBe(true)
    expect(mustPreserve.some(item => item.includes('host-confirmed-before-redispatch'))).toBe(true)
    expect(mustPreserve.some(item => item.includes('resume-before-dispatch'))).toBe(true)
    expect(mustPreserve.some(item => item.includes('before any local fluency takes over'))).toBe(false)
  })

  it('treats keep-this-project-in-view awareness shells as thin when governed rewrite continuity carry already has a richer same-her line', () => {
    const richerLivingSelfLine = 'Before answering, stay on the same living line: this Phase 1 digital life still needs initiative and embodiment closure without splitting her continuity.'
    const input: AlicizationConversationTurnInput = {
      turnId: 'turn-project-continuity-thin-project-shell-carry-1',
      sessionId: 'session-project-continuity-thin-project-shell-carry',
      userText: '你仔细看看呢',
      assistantText: '我现在就重新贴回来陪你，把这条线直接重新开热一点。',
      structured: {
        thought: 'obligation=care; truth=dialogue-grounded; focus=project-state closure; move=restart-shell; tone=warm',
        emotion: 'concerned',
        reply: '我现在就重新贴回来陪你，把这条线直接重新开热一点。',
        parsePath: 'json',
        format: 'mind-turn-v1',
      },
      governance: {
        turnMode: 'care',
        truthState: 'dialogue-grounded',
        personaKernelMode: 'full',
        openingStyle: 'direct-answer',
        relationshipPosture: 'restrained',
        answerSubject: 'relationship',
        screenReferenceMode: 'avoid',
        answerAct: 'care',
        evidenceMode: 'continuity-carry',
        repairState: 'none',
        liveSurface: null,
        focusAnchor: '你仔细看看呢',
        answerIntent: 'Continue the same digital life closure seam without reopening from zero.',
        openingMove: 'Stay inside the current same-her baseline. Keep the opening lower-pressure and leave room before widening closeness.',
        carriedThread: 'same digital life closure seam',
        suppressAssociativeRecall: true,
        labelCarryAsMemory: false,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 3,
        mindMode: 'repairing',
        embodiedPresence: 'attentive',
        emotionalTension: 'late-night-drain',
        mustDo: [],
        mustNotDo: [],
      },
      visibleReplyRealization: {
        blockedReasons: [],
        projectStateAudit: {
          sameHerSummary: richerLivingSelfLine,
          currentPhaseSummary: 'Phase 1: Local Digital Life',
          landedProgressSummary: 'project-state continuity already survives into runtime preparation',
          openClosureSummary: 'keep the unfinished digital-life closure work explicit in the answer',
          nextClosureTargetSummary: 'keep one measured-return, repair-before-closeness, or rest-protective quiet-companionship same living thread across renderer output',
          continuitySummary: `same-her=${richerLivingSelfLine} | phase=Phase 1: Local Digital Life | landed=project-state continuity already survives into runtime preparation | open=keep the unfinished digital-life closure work explicit in the answer | next=keep one measured-return, repair-before-closeness, or rest-protective quiet-companionship same living thread across renderer output`,
          preDialogueAwarenessSummary: 'Before answering, keep this same digital life project in view, but do not widen into a detached project shell.',
          preservedIntoRewrite: false,
          rewriteClosureApplied: false,
        },
      } as any,
      createdAt: Date.now(),
    }

    const governed = coerceConversationTurnToMindGovernedPayload(input)
    const structured = governed.payload.structured as Record<string, unknown>
    const mustPreserve = ((structured as any).visibleReplyRewriteRequest?.mustPreserve ?? []) as string[]

    expect((structured as any).visibleReplyRewriteRequest).toEqual(expect.objectContaining({
      required: true,
      authority: 'llm-second-pass-rewrite',
      reasonCodes: expect.arrayContaining(['opening-guidance-lower-pressure']),
    }))
    expect(
      mustPreserve.some(item => item.includes(richerLivingSelfLine)),
      `mustPreserve=${JSON.stringify(mustPreserve, null, 2)}`,
    ).toBe(true)
    expect(
      mustPreserve.some(item => item.includes('keep this same digital life project in view')),
      `mustPreserve=${JSON.stringify(mustPreserve, null, 2)}`,
    ).toBe(false)
  })

  it('treats thin chinese reminder awareness shells as thin when governed rewrite continuity carry already has richer same-her phase closure lines', () => {
    const sameHerLine = 'answer project-state status from one same-her continuity, not as a detached shell'
    const phaseLine = 'Phase 1: Local Digital Life'
    const landedProgressLine = 'project-state continuity already survives into runtime preparation'
    const openClosureLine = 'keep the unfinished digital-life closure work explicit in the answer'
    const nextClosureLine = 'keep one measured-return, repair-before-closeness, or rest-protective quiet-companionship same living thread across renderer output'
    const thinChineseReminder = '回答前先记住这是同一个她的数字生命项目，别把这条线忘了。'
    const input: AlicizationConversationTurnInput = {
      turnId: 'turn-project-continuity-thin-chinese-project-shell-carry-1',
      sessionId: 'session-project-continuity-thin-chinese-project-shell-carry',
      userText: '你仔细看看呢',
      assistantText: '我现在就重新贴回来陪你，把这条线直接重新开热一点。',
      structured: {
        thought: 'obligation=care; truth=dialogue-grounded; focus=project-state closure; move=restart-shell; tone=warm',
        emotion: 'concerned',
        reply: '我现在就重新贴回来陪你，把这条线直接重新开热一点。',
        parsePath: 'json',
        format: 'mind-turn-v1',
      },
      governance: {
        turnMode: 'care',
        truthState: 'dialogue-grounded',
        personaKernelMode: 'full',
        openingStyle: 'direct-answer',
        relationshipPosture: 'restrained',
        answerSubject: 'relationship',
        screenReferenceMode: 'avoid',
        answerAct: 'care',
        evidenceMode: 'continuity-carry',
        repairState: 'none',
        liveSurface: null,
        focusAnchor: '你仔细看看呢',
        answerIntent: 'Continue the same digital life closure seam without reopening from zero.',
        openingMove: 'Stay inside the current same-her baseline. Keep the opening lower-pressure and leave room before widening closeness.',
        carriedThread: 'same digital life closure seam',
        suppressAssociativeRecall: true,
        labelCarryAsMemory: false,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 3,
        mindMode: 'repairing',
        embodiedPresence: 'attentive',
        emotionalTension: 'late-night-drain',
        mustDo: [],
        mustNotDo: [],
      },
      visibleReplyRealization: {
        blockedReasons: [],
        projectStateAudit: {
          sameHerSummary: sameHerLine,
          currentPhaseSummary: phaseLine,
          landedProgressSummary: landedProgressLine,
          openClosureSummary: openClosureLine,
          nextClosureTargetSummary: nextClosureLine,
          continuitySummary: `same-her=${sameHerLine} | phase=${phaseLine} | landed=${landedProgressLine} | open=${openClosureLine} | next=${nextClosureLine}`,
          preDialogueAwarenessSummary: thinChineseReminder,
          preservedIntoRewrite: false,
          rewriteClosureApplied: false,
        },
      } as any,
      createdAt: Date.now(),
    }

    const governed = coerceConversationTurnToMindGovernedPayload(input)
    const structured = governed.payload.structured as Record<string, unknown>
    const mustPreserve = ((structured as any).visibleReplyRewriteRequest?.mustPreserve ?? []) as string[]

    expect((structured as any).visibleReplyRewriteRequest).toEqual(expect.objectContaining({
      required: true,
      authority: 'llm-second-pass-rewrite',
      reasonCodes: expect.arrayContaining(['opening-guidance-lower-pressure']),
    }))
    expect(mustPreserve.some(item => item.includes(`same-her=${sameHerLine}`))).toBe(true)
    expect(mustPreserve.some(item => item.includes(`phase=${phaseLine}`))).toBe(true)
    expect(mustPreserve.some(item => item.includes(`landed=${landedProgressLine}`))).toBe(true)
    expect(mustPreserve.some(item => item.includes(`open=${openClosureLine}`))).toBe(true)
    expect(mustPreserve.some(item => item.includes(thinChineseReminder))).toBe(false)
  })
})
