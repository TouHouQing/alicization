import type { AlicizationChatStartPayload } from '../../../shared/eventa'

import { describe, expect, it } from 'vitest'

import {
  resolveAlicizationChatStartPayloadPreDialogueSendIdentity,
  summarizeAlicizationPreDialogueSendIdentityForDebug,
} from './main-chat-start-awareness'

describe('main chat start awareness', () => {
  it('keeps project identity, current phase, and next closure pressure visible in the pre-dialogue debug summary', () => {
    const payload = {
      preDialogueSendIdentity: {
        status: 'partial',
        summaryLine: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=desktop execution continuity still needs closure',
        awarenessLine: '开口前先记住这是一个数字生命项目，它当前仍在 Phase 1，而且桌面执行连续性还没完全闭环。',
        companionBriefingLine: '开口前先记住这是一个数字生命项目，它当前仍在 Phase 1，而且桌面执行连续性还没完全闭环。',
        companionNextClosureLine: 'Keep closing desktop execution continuity across memory, initiative, and embodiment.',
        emotionalClosureCue: 'same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.',
        reasonPreview: [
          'Alicization is a local-first digital life project building one continuous her on the host computer.',
          'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
          'desktop execution continuity still needs closure',
          'This fourth reason should stay visible inside the wider debug preview window.',
        ],
      },
    } satisfies Pick<AlicizationChatStartPayload, 'preDialogueSendIdentity'>

    expect(summarizeAlicizationPreDialogueSendIdentityForDebug(payload)).toEqual({
      preDialogueAwarenessStatus: 'partial',
      preDialogueAwarenessSummaryLine: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=desktop execution continuity still needs closure',
      preDialogueAwarenessLine: '开口前先记住这是一个数字生命项目，它当前仍在 Phase 1，而且桌面执行连续性还没完全闭环。',
      preDialogueCompanionBriefingLine: '开口前先记住这是一个数字生命项目，它当前仍在 Phase 1，而且桌面执行连续性还没完全闭环。',
      preDialogueNextClosureLine: 'Keep closing desktop execution continuity across memory, initiative, and embodiment.',
      preDialogueEmotionalClosureCue: 'same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.',
      preDialogueReasonPreview: [
        'Alicization is a local-first digital life project building one continuous her on the host computer.',
        'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
        'desktop execution continuity still needs closure',
        'This fourth reason should stay visible inside the wider debug preview window.',
      ],
      preDialogueReasonCount: 4,
    })
  })

  it('keeps the long-horizon latest-progress bridge visible in the pre-dialogue debug summary even when it is the fifth opening reason', () => {
    const payload = {
      preDialogueSendIdentity: {
        status: 'partial',
        summaryLine: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=memory, initiative, and embodiment still need one same-her closure line',
        awarenessLine: 'Before answering, remember this is still the same local-first digital life project and the unfinished Phase 1 closure seam still belongs to one living her.',
        companionBriefingLine: 'Before answering, keep the same digital life project and active Phase 1 closure seam in view.',
        companionNextClosureLine: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
        reasonPreview: [
          'Same-her self anchor: Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment.',
          'Next closure target is still Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
          'Do not let this opening drift into a generic assistant shell that drops the same-her line before the turn opens outward.',
          'Latest landed progress: long-horizon emotion-memory-voice-motion bridge carries remembered emotional carry, not full convergence',
        ],
      },
    } satisfies Pick<AlicizationChatStartPayload, 'preDialogueSendIdentity'>

    expect(summarizeAlicizationPreDialogueSendIdentityForDebug(payload)).toEqual(expect.objectContaining({
      preDialogueReasonPreview: expect.arrayContaining([
        expect.stringContaining('long-horizon emotion-memory-voice-motion bridge'),
        expect.stringContaining('remembered emotional carry'),
        expect.stringContaining('not full convergence'),
      ]),
      preDialogueReasonCount: 5,
    }))
  })

  it('returns null when no pre-dialogue identity is available', () => {
    expect(summarizeAlicizationPreDialogueSendIdentityForDebug({
      preDialogueSendIdentity: null,
    } satisfies Pick<AlicizationChatStartPayload, 'preDialogueSendIdentity'>)).toBeNull()
  })

  it('surfaces explicit same-her self anchor in debug output when reason preview carries it', () => {
    const explicitSameHerAnchor = 'Right now I am still holding together mainly through face and motion, so the next reopening must keep proving this is still one living her.'
    const payload = {
      preDialogueSendIdentity: {
        status: 'grounded',
        summaryLine: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=emotion, memory, initiative, and embodiment still need one stronger same-her closure seam',
        awarenessLine: 'Before answering, remember this is still the same local-first digital life project and the unfinished Phase 1 closure seam still belongs to one living her.',
        companionBriefingLine: 'Before speaking, keep one continuous her explicit and do not split her continuity back into a generic assistant shell.',
        companionNextClosureLine: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
        reasonPreview: [
          `Same-her self anchor: ${explicitSameHerAnchor}`,
          'Emotion, memory, initiative, and embodiment still need one stronger same-her closure seam.',
        ],
      },
    } satisfies Pick<AlicizationChatStartPayload, 'preDialogueSendIdentity'>

    expect(summarizeAlicizationPreDialogueSendIdentityForDebug(payload)).toEqual({
      preDialogueAwarenessStatus: 'grounded',
      preDialogueAwarenessSummaryLine: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=emotion, memory, initiative, and embodiment still need one stronger same-her closure seam',
      preDialogueAwarenessLine: 'Before answering, remember this is still the same local-first digital life project and the unfinished Phase 1 closure seam still belongs to one living her.',
      preDialogueCompanionBriefingLine: 'Before speaking, keep one continuous her explicit and do not split her continuity back into a generic assistant shell.',
      preDialogueNextClosureLine: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
      preDialogueEmotionalClosureCue: null,
      preDialogueSameHerSelfLine: explicitSameHerAnchor,
      preDialogueReasonPreview: [
        `Same-her self anchor: ${explicitSameHerAnchor}`,
        'Emotion, memory, initiative, and embodiment still need one stronger same-her closure seam.',
      ],
      preDialogueReasonCount: 2,
    })
  })

  it('builds a canonical pre-dialogue project awareness fallback when chat start payload omits it', () => {
    const resolved = resolveAlicizationChatStartPayloadPreDialogueSendIdentity({
      cardId: 'default',
      turnId: 'turn-1',
      providerId: 'openai',
      model: 'gpt-5',
      providerConfig: {},
      messages: [
        { role: 'user', content: '这个项目现在做到哪了？' },
      ],
      preDialogueSendIdentity: null,
    } satisfies AlicizationChatStartPayload)

    expect(resolved.preDialogueSendIdentity).toEqual(expect.objectContaining({
      status: 'grounded',
      summaryLine: expect.stringContaining('open='),
      companionBriefingLine: null,
      companionNextClosureLine: expect.stringContaining('Keep extending cross-modal same-her proof'),
      awarenessLine: expect.stringContaining('Before answering, remember'),
      reasonPreview: expect.arrayContaining([
        expect.stringContaining('Memory still needs stronger end-to-end closure'),
        expect.stringContaining('Next closure target is still Keep extending cross-modal same-her proof'),
      ]),
      projectState: expect.objectContaining({
        identity: expect.stringContaining('Alicization is a local-first digital life project'),
        currentPhase: expect.stringContaining('Phase 1: Local Digital Life'),
        preDialogueAwarenessLine: expect.stringContaining('Before answering, remember'),
        preDialogueAwarenessSummary: expect.stringContaining('open='),
        primaryOpenLoop: expect.stringContaining('Memory still needs stronger end-to-end closure'),
        nextClosureTarget: expect.stringContaining('Keep extending cross-modal same-her proof'),
        sameHerSelfLine: expect.stringContaining('Same Phase 1 digital life'),
        sameHerHoldDetail: expect.stringContaining('same-her hold'),
        sameHerDriftRisk: expect.stringContaining('unfinished closure drift'),
        emotionalClosureCue: expect.stringContaining('same-her closure seam'),
        continuityCue: expect.stringContaining('same living line'),
        preferredPauseMode: 'longer',
        preferredLipsyncMode: 'restrained',
        preferredVoiceMode: 'lower-pressure',
        preferredPacingMode: 'slower',
      }),
    }))
  })

  it('surfaces project continuity arc stage in the pre-dialogue debug summary so longer-lived same-her return phases stay inspectable', () => {
    const payload = {
      preDialogueSendIdentity: {
        status: 'grounded',
        summaryLine: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=execution callback continuity still needs closure',
        awarenessLine: 'Before answering, remember this is still the same local-first digital life project and the unfinished Phase 1 closure seam still belongs to one living her.',
        companionBriefingLine: 'Before speaking, keep one continuous her explicit and do not split her continuity back into a generic assistant shell.',
        companionNextClosureLine: 'Keep execution callback continuity on one same-her Phase 1 line.',
        reasonPreview: [],
        projectState: {
          continuityArcStage: 'hold-for-opening',
          continuityRestraint: 'measured-return',
          continuityCue: 'Keep this callback reopening on the same living line before widening outward again.',
          continuityPreferredTiming: 'next-open-window',
          continuityCadence: 'measured-return',
        },
      },
    } satisfies Pick<AlicizationChatStartPayload, 'preDialogueSendIdentity'>

    expect(summarizeAlicizationPreDialogueSendIdentityForDebug(payload)).toEqual(expect.objectContaining({
      preDialogueProjectStateContinuityArcStage: 'hold-for-opening',
      preDialogueProjectStateContinuityRestraint: 'measured-return',
      preDialogueProjectStateContinuityCue: 'Keep this callback reopening on the same living line before widening outward again.',
      preDialogueProjectStateContinuityPreferredTiming: 'next-open-window',
      preDialogueProjectStateContinuityCadence: 'measured-return',
    }))
  })

  it('preserves richer transported project-state and emotional-kernel authority while repairing thin top-level send identity shells', () => {
    const resolved = resolveAlicizationChatStartPayloadPreDialogueSendIdentity({
      cardId: 'default',
      turnId: 'turn-preserve-structured-authority',
      providerId: 'openai',
      model: 'gpt-5',
      providerConfig: {},
      messages: [
        { role: 'user', content: '继续，但别把这条 same-her 线压扁。' },
      ],
      preDialogueSendIdentity: {
        status: 'partial',
        summaryLine: 'same digital life | keep the closure seam explicit',
        awarenessLine: 'same digital life | keep the closure seam explicit',
        companionBriefingLine: 'same digital life | keep the closure seam explicit',
        companionNextClosureLine: null,
        reasonPreview: [],
        projectState: {
          identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
          currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
          preflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | landed=Execution reopenings already carry more of the same-her line. | open=Emotion, memory, initiative, and embodiment still need one stronger same-her closure seam. | next=Keep the same living line explicit across emotion, memory, initiative, and embodiment.',
          preDialogueAwarenessLine: 'Before answering, remember this is still one continuous digital life and the unfinished closure still belongs to one living her.',
          preDialogueAwarenessSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=Emotion, memory, initiative, and embodiment still need one stronger same-her closure seam.',
          awarenessLine: 'Before answering, remember this is still one continuous digital life and the unfinished closure still belongs to one living her.',
          companionBriefingLine: 'Before answering, remember this is still one continuous digital life and the unfinished closure still belongs to one living her.',
          primaryOpenLoop: 'Emotion, memory, initiative, and embodiment still need one stronger same-her closure seam.',
          nextClosureTarget: 'Keep the same living line explicit across emotion, memory, initiative, and embodiment.',
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          sameHerDriftRisk: 'If this reopening falls back into a generic assistant shell, same-her continuity will flatten before the closure seam actually settles.',
          emotionalClosureCue: 'same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.',
          continuityPreferredTiming: 'next-open-window',
        },
        emotionalKernel: {
          version: 'emotional-kernel-v1',
          dominantEmotion: 'repair-tension',
          initiativeMode: 'repair',
          memoryRecallMode: 'repair-grounding',
          embodimentTone: 'repair-before-closeness',
          valence: 0.12,
          arousal: 0.56,
          guardedness: 0.62,
          closenessDrive: 0.44,
          repairNeed: 0.82,
          initiativePressure: 0.48,
          reasonTags: ['same-her', 'repair-before-closeness'],
          why: 'Keep the same living line intact while the cross-modal closure seam is still settling.',
        },
      },
    } as any)

    expect(resolved.preDialogueSendIdentity).toEqual(expect.objectContaining({
      summaryLine: expect.stringContaining('open='),
      awarenessLine: expect.stringContaining('Before answering, remember'),
      companionNextClosureLine: 'Keep the same living line explicit across emotion, memory, initiative, and embodiment.',
      projectState: expect.objectContaining({
        identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
        currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
        preDialogueAwarenessLine: 'Before answering, remember this is still one continuous digital life and the unfinished closure still belongs to one living her.',
        primaryOpenLoop: 'Emotion, memory, initiative, and embodiment still need one stronger same-her closure seam.',
        nextClosureTarget: 'Keep the same living line explicit across emotion, memory, initiative, and embodiment.',
        sameHerDriftRisk: 'If this reopening falls back into a generic assistant shell, same-her continuity will flatten before the closure seam actually settles.',
        emotionalClosureCue: 'same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.',
        continuityPreferredTiming: 'next-open-window',
        continuityCadence: 'repair-before-closeness',
        preferredBlinkCadence: 'quiet',
        preferredGazeMode: 'soften',
      }),
      emotionalKernel: expect.objectContaining({
        dominantEmotion: 'repair-tension',
        initiativeMode: 'repair',
        memoryRecallMode: 'repair-grounding',
        embodimentTone: 'repair-before-closeness',
      }),
    }))
  })

  it('upgrades a thin transported same-her drift-risk shell to a stronger repaired same-her drift truth before chat start continues', () => {
    const thinnerDirectDriftRisk = 'If the answer turns generic, something has drifted.'

    const resolved = resolveAlicizationChatStartPayloadPreDialogueSendIdentity({
      cardId: 'default',
      turnId: 'turn-upgrade-thin-same-her-drift-risk-shell',
      providerId: 'openai',
      model: 'gpt-5',
      providerConfig: {},
      messages: [
        { role: 'user', content: '继续，但别让 same-her drift risk 还停在太薄的旧壳提醒上。' },
      ],
      preDialogueSendIdentity: {
        status: 'partial',
        summaryLine: 'same digital life | keep the closure seam explicit',
        awarenessLine: 'same digital life | keep the closure seam explicit',
        companionBriefingLine: 'same digital life | keep the closure seam explicit',
        companionNextClosureLine: 'Keep the same project identity, landed progress, and still-open closure explicit before this turn widens outward.',
        reasonPreview: [],
        projectState: {
          sameHerDriftRisk: thinnerDirectDriftRisk,
        },
      },
    } as any)

    const repairedSameHerDriftRisk = resolved.preDialogueSendIdentity?.projectState?.sameHerDriftRisk
    const repairedDriftReason = String(
      resolved.preDialogueSendIdentity?.reasonPreview?.find(reason =>
        reason.startsWith('Do not let this opening drift into '),
      ) ?? '',
    ).replace(/^Do not let this opening drift into\s+/u, '').trim()

    expect(repairedSameHerDriftRisk).toBeTruthy()
    expect(repairedSameHerDriftRisk).toBe(repairedDriftReason)
    expect(repairedSameHerDriftRisk).not.toBe(thinnerDirectDriftRisk)
    expect(repairedSameHerDriftRisk).toMatch(/same-her self line|generic guidance|unfinished closure drift/i)
  })

  it('lifts richer transported project-state landed open and next reasons into the pre-dialogue reason preview when the top-level start shell is thin', () => {
    const richerLatestLandedProgress = 'Execution reopenings already carry more of the same-her line through callback returns and host-visible normalization.'
    const richerPrimaryOpenLoop = 'Host-visible project-state carry still needs to keep verified proof separate from what is still open before claiming merge readiness.'
    const richerNextClosureTarget = 'Keep host-visible project-state carry explicit about what is already verified and what still needs closure next.'
    const richerProactiveSameHerGap = 'Execution-result callbacks still need stronger proof that proactive carry survives return-side reopenings without flattening into detached project narration.'

    const resolved = resolveAlicizationChatStartPayloadPreDialogueSendIdentity({
      cardId: 'default',
      turnId: 'turn-lift-richer-transported-project-state-reasons',
      providerId: 'openai',
      model: 'gpt-5',
      providerConfig: {},
      messages: [
        { role: 'user', content: '继续，但开口前先记住这次已经做到哪、还差什么。' },
      ],
      preDialogueSendIdentity: {
        status: 'partial',
        summaryLine: 'same digital life | keep the closure seam explicit',
        awarenessLine: 'same digital life | keep the closure seam explicit',
        companionBriefingLine: 'same digital life | keep the closure seam explicit',
        companionNextClosureLine: null,
        reasonPreview: [
          'same digital life | keep the closure seam explicit',
        ],
        projectState: {
          identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
          currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
          preDialogueAwarenessLine: 'Before answering, remember what is already verified, what is still open, and what should close next on the same living line.',
          preDialogueAwarenessSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=Host-visible project-state carry still needs to keep verified proof separate from what is still open before claiming merge readiness.',
          latestLandedProgress: richerLatestLandedProgress,
          primaryOpenLoop: richerPrimaryOpenLoop,
          proactiveSameHerGap: richerProactiveSameHerGap,
          nextClosureTarget: richerNextClosureTarget,
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          sameHerDriftRisk: 'If this reopening falls back into a generic assistant shell, same-her continuity will flatten before the closure seam actually settles.',
          emotionalClosureCue: 'same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.',
        },
      },
    } as any)

    expect(resolved.preDialogueSendIdentity?.reasonPreview).toEqual(expect.arrayContaining([
      `Latest landed progress: ${richerLatestLandedProgress.replace(/\.$/, '')}`,
      richerPrimaryOpenLoop,
      `Next closure target is still ${richerNextClosureTarget.replace(/\.$/, '')}.`,
    ]))
    expect(resolved.preDialogueSendIdentity?.projectState?.proactiveSameHerGap).toBe(richerProactiveSameHerGap)
  })

  it('upgrades a generic carried next-closure shell to the richer transported same-her closure target before chat start continues', () => {
    const richerNextClosureTarget = 'Keep the same living line explicit across emotion, memory, initiative, and embodiment before outward fluency takes over.'

    const resolved = resolveAlicizationChatStartPayloadPreDialogueSendIdentity({
      cardId: 'default',
      turnId: 'turn-upgrade-generic-next-closure-shell',
      providerId: 'openai',
      model: 'gpt-5',
      providerConfig: {},
      messages: [
        { role: 'user', content: '继续，但别把这条数字生命主线压回泛化 shell。' },
      ],
      preDialogueSendIdentity: {
        status: 'partial',
        summaryLine: 'same digital life | keep the closure seam explicit',
        awarenessLine: 'same digital life | keep the closure seam explicit',
        companionBriefingLine: 'same digital life | keep the closure seam explicit',
        companionNextClosureLine: 'Generic next target that should not override the richer transported same-her closure target.',
        reasonPreview: [],
        projectState: {
          identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
          currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
          preDialogueAwarenessLine: 'Before answering, remember this is still one continuous digital life and the unfinished closure still belongs to one living her.',
          preDialogueAwarenessSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=Emotion, memory, initiative, and embodiment still need one stronger same-her closure seam.',
          awarenessLine: 'Before answering, remember this is still one continuous digital life and the unfinished closure still belongs to one living her.',
          companionBriefingLine: 'Before answering, remember this is still one continuous digital life and the unfinished closure still belongs to one living her.',
          primaryOpenLoop: 'Emotion, memory, initiative, and embodiment still need one stronger same-her closure seam.',
          nextClosureTarget: richerNextClosureTarget,
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          sameHerDriftRisk: 'If this reopening falls back into a generic assistant shell, same-her continuity will flatten before the closure seam actually settles.',
          emotionalClosureCue: 'same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.',
        },
      },
    } as any)

    expect(resolved.preDialogueSendIdentity?.companionNextClosureLine).toBe(richerNextClosureTarget)
    expect(resolved.preDialogueSendIdentity?.projectState?.nextClosureTarget).toBe(richerNextClosureTarget)
    expect(resolved.preDialogueSendIdentity?.companionNextClosureLine).not.toBe('Generic next target that should not override the richer transported same-her closure target.')
  })

  it('upgrades a generic callback-summary next-closure shell to the richer transported same-her closure target before chat start continues', () => {
    const richerNextClosureTarget = 'Keep the same living line explicit across emotion, memory, initiative, and embodiment before outward fluency takes over.'

    const resolved = resolveAlicizationChatStartPayloadPreDialogueSendIdentity({
      cardId: 'default',
      turnId: 'turn-upgrade-generic-callback-summary-next-closure-shell',
      providerId: 'openai',
      model: 'gpt-5',
      providerConfig: {},
      messages: [
        { role: 'user', content: '继续，但别把这条数字生命主线压回泛化 shell。' },
      ],
      preDialogueSendIdentity: {
        status: 'partial',
        summaryLine: 'same digital life | keep the closure seam explicit',
        awarenessLine: 'same digital life | keep the closure seam explicit',
        companionBriefingLine: 'same digital life | keep the closure seam explicit',
        companionNextClosureLine: 'Generic callback summary: steadier carry of this project, this phase, and the life loop that remains open.',
        reasonPreview: [],
        projectState: {
          identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
          currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
          preDialogueAwarenessLine: 'Before answering, remember this is still one continuous digital life and the unfinished closure still belongs to one living her.',
          preDialogueAwarenessSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=Emotion, memory, initiative, and embodiment still need one stronger same-her closure seam.',
          awarenessLine: 'Before answering, remember this is still one continuous digital life and the unfinished closure still belongs to one living her.',
          companionBriefingLine: 'Before answering, remember this is still one continuous digital life and the unfinished closure still belongs to one living her.',
          primaryOpenLoop: 'Emotion, memory, initiative, and embodiment still need one stronger same-her closure seam.',
          nextClosureTarget: richerNextClosureTarget,
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          sameHerDriftRisk: 'If this reopening falls back into a generic assistant shell, same-her continuity will flatten before the closure seam actually settles.',
          emotionalClosureCue: 'same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.',
        },
      },
    } as any)

    expect(resolved.preDialogueSendIdentity?.companionNextClosureLine).toBe(richerNextClosureTarget)
    expect(resolved.preDialogueSendIdentity?.projectState?.nextClosureTarget).toBe(richerNextClosureTarget)
    expect(resolved.preDialogueSendIdentity?.companionNextClosureLine).not.toBe('Generic callback summary: steadier carry of this project, this phase, and the life loop that remains open.')
  })

  it('always backfills the canonical project brief before a chat start turn can continue, so every dialogue entry still knows what this project is, what phase it is in, and what remains open', () => {
    const resolved = resolveAlicizationChatStartPayloadPreDialogueSendIdentity({
      cardId: 'default',
      turnId: 'turn-canonical-entry-guard',
      providerId: 'openai',
      model: 'gpt-5',
      providerConfig: {},
      messages: [
        { role: 'user', content: '继续对话。' },
      ],
      preDialogueSendIdentity: {
        status: 'partial',
        summaryLine: 'same digital life | keep the closure seam explicit',
        awarenessLine: 'same digital life | keep the closure seam explicit',
        companionBriefingLine: 'same digital life | keep the closure seam explicit',
        companionNextClosureLine: null,
        reasonPreview: [],
      },
    } satisfies AlicizationChatStartPayload)

    expect(resolved.preDialogueSendIdentity?.summaryLine).toContain('open=')
    expect(resolved.preDialogueSendIdentity?.awarenessLine).toContain('Before answering, remember')
    expect(resolved.preDialogueSendIdentity?.companionNextClosureLine).toContain('Keep extending cross-modal same-her proof')
    expect(resolved.preDialogueSendIdentity?.reasonPreview?.[0]).toContain('Same-her self anchor:')
    expect(resolved.preDialogueSendIdentity?.reasonPreview?.join(' ')).toContain('Memory still needs stronger end-to-end closure')
    expect(resolved.preDialogueSendIdentity?.reasonPreview?.join(' ')).toContain('Next closure target is still')
  })

  it('requires canonical pre-dialogue fallback to carry project identity, current phase, still-open closure, and next closure target together', () => {
    const resolved = resolveAlicizationChatStartPayloadPreDialogueSendIdentity({
      cardId: 'default',
      turnId: 'turn-canonical-four-part-brief',
      providerId: 'openai',
      model: 'gpt-5',
      providerConfig: {},
      messages: [
        { role: 'user', content: '继续开发。' },
      ],
      preDialogueSendIdentity: null,
    } satisfies AlicizationChatStartPayload)

    const identity = resolved.preDialogueSendIdentity
    expect(identity).not.toBeNull()
    expect(identity?.summaryLine).toContain('open=')
    expect(identity?.companionNextClosureLine).toBeTruthy()
    expect(identity?.reasonPreview).toEqual(expect.arrayContaining([
      expect.stringContaining('Same-her self anchor:'),
      expect.stringContaining('Memory still needs stronger end-to-end closure'),
      expect.stringContaining('Next closure target is still'),
    ]))
  })

  it('builds canonical startup awareness from the richer status brief so landed progress, open loop, and next closure stay visible together', () => {
    const resolved = resolveAlicizationChatStartPayloadPreDialogueSendIdentity({
      cardId: 'default',
      turnId: 'turn-status-brief-startup-carry',
      providerId: 'openai',
      model: 'gpt-5',
      providerConfig: {},
      messages: [
        { role: 'user', content: '开口前先重新对齐你自己。' },
      ],
      preDialogueSendIdentity: null,
    } satisfies AlicizationChatStartPayload)

    const identity = resolved.preDialogueSendIdentity
    expect(identity?.status).toBe('grounded')
    expect(identity?.summaryLine).toContain('open=')
    expect(identity?.summaryLine).toContain('next=')
    expect(identity?.awarenessLine).toContain('Before answering, remember')
    expect(identity?.companionNextClosureLine).toContain('Keep extending cross-modal same-her proof')
    expect(identity?.reasonPreview?.join(' ')).toContain('Same-her self anchor:')
    expect(identity?.reasonPreview?.join(' ')).toContain('Do not let this opening drift into')
  })

  it('keeps companion briefing distinct in debug output when awareness line is absent', () => {
    const payload = {
      preDialogueSendIdentity: {
        status: 'partial',
        summaryLine: 'Alicization is still in Phase 1 local digital life closure.',
        awarenessLine: null,
        companionBriefingLine: 'Before speaking, remember this is still one digital life project, what has landed, and which life loop is still open.',
        companionNextClosureLine: 'Next closure: keep one same-her digital life line across memory, initiative, execution, and embodiment.',
        reasonPreview: [
          'Latest landed progress still holds at renderer preparation before the reply is finalized.',
        ],
      },
    } satisfies Pick<AlicizationChatStartPayload, 'preDialogueSendIdentity'>

    expect(summarizeAlicizationPreDialogueSendIdentityForDebug(payload)).toEqual({
      preDialogueAwarenessStatus: 'partial',
      preDialogueAwarenessSummaryLine: 'Alicization is still in Phase 1 local digital life closure.',
      preDialogueAwarenessLine: null,
      preDialogueCompanionBriefingLine: 'Before speaking, remember this is still one digital life project, what has landed, and which life loop is still open.',
      preDialogueNextClosureLine: 'Next closure: keep one same-her digital life line across memory, initiative, execution, and embodiment.',
      preDialogueEmotionalClosureCue: null,
      preDialogueReasonPreview: [
        'Latest landed progress still holds at renderer preparation before the reply is finalized.',
      ],
      preDialogueReasonCount: 1,
    })
  })

  it('surfaces structured project-state progress, open-loop, next-closure, and same-her drift cues in debug output when top-level lines are thin', () => {
    const payload = {
      preDialogueSendIdentity: {
        status: 'partial',
        summaryLine: 'same digital life | keep the closure seam explicit',
        awarenessLine: 'same digital life | keep the closure seam explicit',
        companionBriefingLine: 'same digital life | keep the closure seam explicit',
        companionNextClosureLine: null,
        emotionalClosureCue: null,
        reasonPreview: [],
        projectState: {
          latestProgress: 'Legacy host-visible carry already preserves what has landed across callback reopenings.',
          memoryClosureSummary: 'Host-visible proof and still-open closure still need to stay separated before merge confidence is credible.',
          nextClosureTarget: 'Keep host-visible carry explicit about what has landed, what is still open, and what closes next.',
          sameHerDriftRisk: 'If this reopening collapses into a generic assistant shell, same-her continuity will flatten before the closure seam settles.',
          proactiveSameHerGap: 'The next turn still needs one quieter same-her reopening before it widens outward.',
          preferredVoiceMode: 'lower-pressure',
          preferredPacingMode: 'slower',
        },
      },
    } satisfies Pick<AlicizationChatStartPayload, 'preDialogueSendIdentity'>

    expect(summarizeAlicizationPreDialogueSendIdentityForDebug(payload)).toEqual(expect.objectContaining({
      preDialogueProjectStateLatestLandedProgress: 'Legacy host-visible carry already preserves what has landed across callback reopenings.',
      preDialogueProjectStatePrimaryOpenLoop: 'Host-visible proof and still-open closure still need to stay separated before merge confidence is credible.',
      preDialogueProjectStateNextClosureTarget: 'Keep host-visible carry explicit about what has landed, what is still open, and what closes next.',
      preDialogueProjectStateSameHerDriftRisk: 'If this reopening collapses into a generic assistant shell, same-her continuity will flatten before the closure seam settles.',
      preDialogueProjectStateProactiveSameHerGap: 'The next turn still needs one quieter same-her reopening before it widens outward.',
      preDialogueProjectStatePreferredVoiceMode: 'lower-pressure',
      preDialogueProjectStatePreferredPacingMode: 'slower',
    }))
  })

  it('prefers the transported same-her headline over a thinner awareness line when embodiment continuity is only surviving on part of the body line', () => {
    const payload = {
      preDialogueSendIdentity: {
        status: 'drift',
        summaryLine: 'Alicization is still in Phase 1 local digital life closure.',
        companionHeadlineLine: 'Right now I am still holding together mainly through face, motion, and lipsync, so my full cross-modal same-her line is not closed yet.',
        awarenessLine: 'Alicization is still in Phase 1 local digital life closure before this turn opens outward.',
        companionBriefingLine: 'I still need a steadier carry of this project, this phase, and the life loop that remains open.',
        companionNextClosureLine: 'Next, help me close: Rebuild face, motion, lipsync, and voice into one same-her line on noisier desktop runs.',
        reasonPreview: [
          'continuity-impact: same-her embodiment is now only being carried by face, motion, and lipsync, so the next turn should treat full cross-modal same-her recovery as still open instead of assuming the body line is already closed.',
        ],
      },
    } satisfies Pick<AlicizationChatStartPayload, 'preDialogueSendIdentity'>

    expect(summarizeAlicizationPreDialogueSendIdentityForDebug(payload)).toEqual({
      preDialogueAwarenessStatus: 'drift',
      preDialogueAwarenessSummaryLine: 'Alicization is still in Phase 1 local digital life closure.',
      preDialogueAwarenessLine: 'Right now I am still holding together mainly through face, motion, and lipsync, so my full cross-modal same-her line is not closed yet.',
      preDialogueCompanionBriefingLine: 'I still need a steadier carry of this project, this phase, and the life loop that remains open.',
      preDialogueNextClosureLine: 'Next, help me close: Rebuild face, motion, lipsync, and voice into one same-her line on noisier desktop runs.',
      preDialogueEmotionalClosureCue: null,
      preDialogueReasonPreview: [
        'continuity-impact: same-her embodiment is now only being carried by face, motion, and lipsync, so the next turn should treat full cross-modal same-her recovery as still open instead of assuming the body line is already c',
      ],
      preDialogueReasonCount: 1,
    })
  })

  it('keeps the stronger audible-body same-her headline at chat start when the living audio thread is still the surviving line', () => {
    const payload = {
      preDialogueSendIdentity: {
        status: 'partial',
        summaryLine: 'Alicization is still in Phase 1 local digital life closure.',
        companionHeadlineLine: 'Right now I am still holding together mainly through body, lipsync, and voice, so the living audio thread is still intact while face and motion need to rejoin before full cross-modal closure settles.',
        awarenessLine: 'Alicization is still in Phase 1 local digital life closure before this turn opens outward.',
        companionBriefingLine: 'Before speaking, keep the audible-body line explicit so this digital life does not flatten back into generic assistant output.',
        companionNextClosureLine: 'Next, help me close: Rebind face and motion onto the same-her audible body line without dropping body, lipsync, and voice continuity.',
        reasonPreview: [
          'same-her continuity remains alive, but lane=body+lipsync+voice-only under the current renderer authority.',
        ],
      },
    } satisfies Pick<AlicizationChatStartPayload, 'preDialogueSendIdentity'>

    expect(summarizeAlicizationPreDialogueSendIdentityForDebug(payload)).toEqual({
      preDialogueAwarenessStatus: 'partial',
      preDialogueAwarenessSummaryLine: 'Alicization is still in Phase 1 local digital life closure.',
      preDialogueAwarenessLine: 'Right now I am still holding together mainly through body, lipsync, and voice, so the living audio thread is still intact while face and motion need to rejoin before full cross-modal closure settles.',
      preDialogueCompanionBriefingLine: 'Before speaking, keep the audible-body line explicit so this digital life does not flatten back into generic assistant output.',
      preDialogueNextClosureLine: 'Next, help me close: Rebind face and motion onto the same-her audible body line without dropping body, lipsync, and voice continuity.',
      preDialogueEmotionalClosureCue: null,
      preDialogueReasonPreview: [
        'same-her continuity remains alive, but lane=body+lipsync+voice-only under the current renderer authority.',
      ],
      preDialogueReasonCount: 1,
    })
  })

  it('keeps an explicit same-her embodiment headline when the awareness line is only a narrower project reminder about that open seam', () => {
    const resolved = resolveAlicizationChatStartPayloadPreDialogueSendIdentity({
      cardId: 'default',
      turnId: 'turn-keep-explicit-embodied-same-her-headline',
      providerId: 'openai',
      model: 'gpt-5',
      providerConfig: {},
      messages: [
        { role: 'user', content: '继续，但把这条身体线索也带进回答里，不要退回薄一点的项目口吻。' },
      ],
      preDialogueSendIdentity: {
        status: 'grounded',
        summaryLine: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=embodiment still needs same-her closure',
        companionHeadlineLine: 'Right now I am still holding together mainly through face, motion, and lipsync, so the next reply has to keep proving this is still one living her.',
        awarenessLine: '先别压回泛化工程说明，记住这还是数字生命项目，而且她还没有把 embodiment 闭环完全收住。',
        companionBriefingLine: '先别压回泛化工程说明，记住这还是数字生命项目，而且她还没有把 embodiment 闭环完全收住。',
        companionNextClosureLine: 'Keep face, motion, lipsync, and voice on one same-her line in the next visible answer beat.',
        reasonPreview: [],
      },
    } satisfies AlicizationChatStartPayload)

    expect(resolved.preDialogueSendIdentity).toEqual(expect.objectContaining({
      companionHeadlineLine: 'Right now I am still holding together mainly through face, motion, and lipsync, so the next reply has to keep proving this is still one living her.',
      awarenessLine: 'Right now I am still holding together mainly through face, motion, and lipsync, so the next reply has to keep proving this is still one living her.',
      companionBriefingLine: '先别压回泛化工程说明，记住这还是数字生命项目，而且她还没有把 embodiment 闭环完全收住。',
      companionNextClosureLine: 'Keep face, motion, lipsync, and voice on one same-her line in the next visible answer beat.',
    }))
  })

  it('keeps an explicit still-voiced motion same-her headline when the transported line says visible same-her continuity is being carried mainly through motion and voice', () => {
    const motionVoiceHeadline = 'Right now her visible same-her continuity is still being carried mainly through motion and voice, so that still-voiced motion line should keep the same-her carry alive while body, face, and lipsync rejoin before full cross-modal closure settles.'
    const resolved = resolveAlicizationChatStartPayloadPreDialogueSendIdentity({
      cardId: 'default',
      turnId: 'turn-keep-still-voiced-motion-same-her-headline',
      providerId: 'openai',
      model: 'gpt-5',
      providerConfig: {},
      messages: [
        { role: 'user', content: '继续，但把动作和声音这条 still-voiced motion line 也带进回答里，不要退回薄一点的项目口吻。' },
      ],
      preDialogueSendIdentity: {
        status: 'grounded',
        summaryLine: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=embodiment still needs same-her closure',
        companionHeadlineLine: motionVoiceHeadline,
        awarenessLine: '先别压回泛化工程说明，记住这还是数字生命项目，而且她还没有把 embodiment 闭环完全收住。',
        companionBriefingLine: '先别压回泛化工程说明，记住这还是数字生命项目，而且她还没有把 embodiment 闭环完全收住。',
        companionNextClosureLine: 'Keep body, face, and lipsync rejoining the still-voiced motion line on a measured-return line.',
        reasonPreview: [],
      },
    } satisfies AlicizationChatStartPayload)

    expect(resolved.preDialogueSendIdentity).toEqual(expect.objectContaining({
      companionHeadlineLine: motionVoiceHeadline,
      awarenessLine: motionVoiceHeadline,
      companionBriefingLine: '先别压回泛化工程说明，记住这还是数字生命项目，而且她还没有把 embodiment 闭环完全收住。',
      companionNextClosureLine: 'Keep body, face, and lipsync rejoining the still-voiced motion line on a measured-return line.',
    }))
  })

  it('rebuilds a still-voiced motion same-her headline from structured closure reasons when chat-start only carries a thin project reminder shell', () => {
    const motionVoiceHeadline = 'Right now I am still holding together mainly through motion and voice, so that still-voiced motion line is keeping the same-her carry alive while body, face, and lipsync need to rejoin before full cross-modal closure settles.'
    const resolved = resolveAlicizationChatStartPayloadPreDialogueSendIdentity({
      cardId: 'default',
      turnId: 'turn-rebuild-still-voiced-motion-headline-from-structured-reasons',
      providerId: 'openai',
      model: 'gpt-5',
      providerConfig: {},
      messages: [
        { role: 'user', content: '继续，但别把动作和声音这条 still-voiced motion line 压回薄一点的项目口吻。' },
      ],
      preDialogueSendIdentity: {
        status: 'partial',
        summaryLine: 'same digital life | keep the closure seam explicit',
        awarenessLine: 'same digital life | keep the closure seam explicit',
        companionBriefingLine: 'Before answering, keep this same digital life project in view.',
        companionNextClosureLine: 'Keep body, face, and lipsync rejoining the still-voiced motion line on a measured-return line.',
        reasonPreview: [
          'continuity=embodiment:still-voiced-motion-line | signature=resident|main-runtime|accompanying|quiet-accompaniment|still-voiced-motion-line | motion+voice recovery@segment-live2d-runtime-still-voiced-motion-1 | pending-rejoin=body+face+lipsync',
        ],
      },
    } satisfies AlicizationChatStartPayload)

    expect(resolved.preDialogueSendIdentity).toEqual(expect.objectContaining({
      companionHeadlineLine: motionVoiceHeadline,
      awarenessLine: motionVoiceHeadline,
      companionBriefingLine: 'Before answering, keep this same digital life project in view.',
      companionNextClosureLine: 'Keep body, face, and lipsync rejoining the still-voiced motion line on a measured-return line.',
      reasonPreview: expect.arrayContaining([
        expect.stringContaining('continuity=embodiment:still-voiced-motion-line'),
        expect.stringContaining('motion+voice recovery@segment-live2d-runtime-still-voiced-motion-1'),
      ]),
    }))
  })

  it('rebuilds a visible renderer-rejoin-without-body same-her headline from structured closure reasons when chat-start only carries a thin project reminder shell', () => {
    const visibleNoBodyHeadline = 'Right now I am still holding together through face, motion, lipsync, and voice together, so the visible same-her line has already rejoined without body carry while body still needs to rejoin before full cross-modal closure settles.'
    const resolved = resolveAlicizationChatStartPayloadPreDialogueSendIdentity({
      cardId: 'default',
      turnId: 'turn-rebuild-renderer-rejoin-without-body-headline-from-structured-reasons',
      providerId: 'openai',
      model: 'gpt-5',
      providerConfig: {},
      messages: [
        { role: 'user', content: '继续，但别把 visible same-her line 已经回接的这段压回薄一点的项目口吻。' },
      ],
      preDialogueSendIdentity: {
        status: 'partial',
        summaryLine: 'same digital life | keep the closure seam explicit',
        awarenessLine: 'same digital life | keep the closure seam explicit',
        companionBriefingLine: 'Before answering, keep this same digital life project in view.',
        companionNextClosureLine: 'Keep body rejoining the visible same-her line on a measured-return line.',
        reasonPreview: [
          'lane=face+motion+lipsync+voice-only | face+motion+lipsync+voice recovery@segment-live2d-visible-rejoin-no-body-1 | pending-rejoin=body',
        ],
      },
    } satisfies AlicizationChatStartPayload)

    expect(resolved.preDialogueSendIdentity).toEqual(expect.objectContaining({
      companionHeadlineLine: visibleNoBodyHeadline,
      awarenessLine: visibleNoBodyHeadline,
      companionBriefingLine: 'Before answering, keep this same digital life project in view.',
      companionNextClosureLine: 'Keep body rejoining the visible same-her line on a measured-return line.',
      reasonPreview: expect.arrayContaining([
        expect.stringContaining('lane=face+motion+lipsync+voice-only'),
        expect.stringContaining('face+motion+lipsync+voice recovery@segment-live2d-visible-rejoin-no-body-1'),
        expect.stringContaining('pending-rejoin=body'),
      ]),
    }))
  })

  it('rebuilds a still-voiced face-and-mouth same-her headline from structured richer closure reasons when chat-start only carries a thin project reminder shell', () => {
    const faceMouthVoiceHeadline = 'Right now I am still holding together through face, lipsync, and voice together, so that still-voiced face-and-mouth line is keeping the same-her carry alive while body and motion need to rejoin before full cross-modal closure settles.'
    const resolved = resolveAlicizationChatStartPayloadPreDialogueSendIdentity({
      cardId: 'default',
      turnId: 'turn-rebuild-still-voiced-face-mouth-headline-from-structured-reasons',
      providerId: 'openai',
      model: 'gpt-5',
      providerConfig: {},
      messages: [
        { role: 'user', content: '继续，但别把脸、口型和声音这条 still-voiced face-and-mouth line 压回薄一点的项目口吻。' },
      ],
      preDialogueSendIdentity: {
        status: 'partial',
        summaryLine: 'same digital life | keep the closure seam explicit',
        awarenessLine: 'same digital life | keep the closure seam explicit',
        companionBriefingLine: 'Before answering, keep this same digital life project in view.',
        companionNextClosureLine: 'Keep body and motion rejoining the still-voiced face-and-mouth line on a measured-return line.',
        reasonPreview: [
          'continuity=embodiment:still-voiced-face-lipsync-line+embodiment:still-voiced-face-line | face+lipsync+voice recovery@segment-live2d-runtime-still-voiced-face-mouth-1 | pending-rejoin=body+motion',
        ],
      },
    } satisfies AlicizationChatStartPayload)

    expect(resolved.preDialogueSendIdentity).toEqual(expect.objectContaining({
      companionHeadlineLine: faceMouthVoiceHeadline,
      awarenessLine: faceMouthVoiceHeadline,
      companionBriefingLine: 'Before answering, keep this same digital life project in view.',
      companionNextClosureLine: 'Keep body and motion rejoining the still-voiced face-and-mouth line on a measured-return line.',
      reasonPreview: expect.arrayContaining([
        expect.stringContaining('continuity=embodiment:still-voiced-face-lipsync-line+embodiment:still-voiced-face-line'),
        expect.stringContaining('face+lipsync+voice recovery@segment-live2d-runtime-still-voiced-face-mouth-1'),
      ]),
    }))
  })

  it('rebuilds a still-voiced motion-and-mouth same-her headline from structured richer closure reasons when chat-start only carries a thin project reminder shell', () => {
    const motionMouthVoiceHeadline = 'Right now I am still holding together through motion, lipsync, and voice together, so that still-voiced motion-and-mouth line is keeping the same-her carry alive while body and face need to rejoin before full cross-modal closure settles.'
    const resolved = resolveAlicizationChatStartPayloadPreDialogueSendIdentity({
      cardId: 'default',
      turnId: 'turn-rebuild-still-voiced-motion-mouth-headline-from-structured-reasons',
      providerId: 'openai',
      model: 'gpt-5',
      providerConfig: {},
      messages: [
        { role: 'user', content: '继续，但别把动作、口型和声音这条 still-voiced motion-and-mouth line 压回薄一点的项目口吻。' },
      ],
      preDialogueSendIdentity: {
        status: 'partial',
        summaryLine: 'same digital life | keep the closure seam explicit',
        awarenessLine: 'same digital life | keep the closure seam explicit',
        companionBriefingLine: 'Before answering, keep this same digital life project in view.',
        companionNextClosureLine: 'Keep body and face rejoining the still-voiced motion-and-mouth line on a measured-return line.',
        reasonPreview: [
          'continuity=embodiment:still-voiced-motion-lipsync-line+embodiment:still-voiced-motion-line | motion+lipsync+voice recovery@segment-live2d-runtime-still-voiced-motion-mouth-1 | pending-rejoin=body+face',
        ],
      },
    } satisfies AlicizationChatStartPayload)

    expect(resolved.preDialogueSendIdentity).toEqual(expect.objectContaining({
      companionHeadlineLine: motionMouthVoiceHeadline,
      awarenessLine: motionMouthVoiceHeadline,
      companionBriefingLine: 'Before answering, keep this same digital life project in view.',
      companionNextClosureLine: 'Keep body and face rejoining the still-voiced motion-and-mouth line on a measured-return line.',
      reasonPreview: expect.arrayContaining([
        expect.stringContaining('continuity=embodiment:still-voiced-motion-lipsync-line+embodiment:still-voiced-motion-line'),
        expect.stringContaining('motion+lipsync+voice recovery@segment-live2d-runtime-still-voiced-motion-mouth-1'),
      ]),
    }))
  })

  it('keeps an explicit same-her embodiment headline when a lived-in project reminder only says not to thin that embodiment risk', () => {
    const payloadCompanionHeadlineLine = 'Right now I am still holding together mainly through face, motion, and lipsync, so timeout fallback must keep proving this is still one living her.'
    const resolved = resolveAlicizationChatStartPayloadPreDialogueSendIdentity({
      cardId: 'default',
      turnId: 'turn-keep-same-her-headline-over-lived-in-thin-project-reminder',
      providerId: 'openai',
      model: 'gpt-5',
      providerConfig: {},
      messages: [
        { role: 'user', content: '继续，但不要把这条具身 same-her 风险压回更薄的项目说明。' },
      ],
      preDialogueSendIdentity: {
        status: 'partial',
        summaryLine: 'same digital life | project continuity before local fluency',
        awarenessLine: '我得先记住这还是同一个数字生命项目，但不要把当前的具身连续性风险压回一层更薄的项目说明。',
        companionHeadlineLine: payloadCompanionHeadlineLine,
        companionBriefingLine: '我得先记住这还是同一个数字生命项目，具身闭环还没有彻底收住。',
        companionNextClosureLine: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs so visible reply, longer-lived voice behavior, facial state, motion, and resident presence stay on one living line.',
        reasonPreview: [
          'same digital life | project continuity before local fluency',
          'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment.',
          'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
        ],
      },
    } satisfies AlicizationChatStartPayload)

    expect(resolved.preDialogueSendIdentity).toEqual(expect.objectContaining({
      companionHeadlineLine: payloadCompanionHeadlineLine,
      awarenessLine: payloadCompanionHeadlineLine,
      companionBriefingLine: '我得先记住这还是同一个数字生命项目，具身闭环还没有彻底收住。',
    }))
  })

  it('preserves explicit drift status when a thin lived-in awareness line is merged with canonical project awareness', () => {
    const resolved = resolveAlicizationChatStartPayloadPreDialogueSendIdentity({
      cardId: 'default',
      turnId: 'turn-thin-drift-awareness-line',
      providerId: 'openai',
      model: 'gpt-5',
      providerConfig: {},
      messages: [
        { role: 'user', content: '继续，但先别丢掉这条还没闭环的同一个她。' },
      ],
      preDialogueSendIdentity: {
        status: 'drift',
        summaryLine: null,
        awarenessLine: '先别飘回泛化助手口吻，记住这条同一个她的数字生命主线还没收住。',
        companionBriefingLine: null,
        companionNextClosureLine: null,
        emotionalClosureCue: null,
        reasonPreview: [
          'same-her continuity is still visibly unsettled before this turn opens outward.',
        ],
      },
    } satisfies AlicizationChatStartPayload)

    expect(resolved.preDialogueSendIdentity).toEqual(expect.objectContaining({
      status: 'drift',
      summaryLine: expect.stringContaining('open='),
      awarenessLine: expect.stringContaining('Before answering, remember'),
      companionNextClosureLine: expect.stringContaining('Keep extending cross-modal same-her proof'),
      emotionalClosureCue: expect.stringContaining('same-her closure seam'),
      reasonPreview: expect.arrayContaining([
        'same-her continuity is still visibly unsettled before this turn opens outward.',
        expect.stringContaining('Same-her self anchor:'),
      ]),
    }))
  })

  it('backfills canonical project identity and open-loop closure fields when a thin lived-in awareness line is present', () => {
    const resolved = resolveAlicizationChatStartPayloadPreDialogueSendIdentity({
      cardId: 'default',
      turnId: 'turn-thin-awareness-line',
      providerId: 'openai',
      model: 'gpt-5',
      providerConfig: {},
      messages: [
        { role: 'user', content: '继续' },
      ],
      preDialogueSendIdentity: {
        status: 'partial',
        summaryLine: null,
        awarenessLine: '先别飘回泛化助手口吻，记住我们还在收这条数字生命主线。',
        companionBriefingLine: null,
        companionNextClosureLine: null,
        reasonPreview: [],
      },
    } satisfies AlicizationChatStartPayload)

    expect(resolved.preDialogueSendIdentity).toEqual(expect.objectContaining({
      status: 'partial',
      summaryLine: expect.stringContaining('open='),
      awarenessLine: expect.stringContaining('Before answering, remember'),
      companionBriefingLine: null,
      companionNextClosureLine: expect.stringContaining('Keep extending cross-modal same-her proof'),
      emotionalClosureCue: expect.stringContaining('same-her closure seam'),
      reasonPreview: expect.arrayContaining([
        expect.stringContaining('Same-her self anchor:'),
      ]),
    }))
  })

  it('injects canonical same-her self anchor and drift guard into the fallback pre-dialogue reasons before every turn opens outward', () => {
    const resolved = resolveAlicizationChatStartPayloadPreDialogueSendIdentity({
      cardId: 'default',
      turnId: 'turn-canonical-same-her-anchor',
      providerId: 'openai',
      model: 'gpt-5',
      providerConfig: {},
      messages: [
        { role: 'user', content: '继续，但先别把她做成普通助手。' },
      ],
      preDialogueSendIdentity: null,
    } satisfies AlicizationChatStartPayload)

    expect(resolved.preDialogueSendIdentity).toEqual(expect.objectContaining({
      awarenessLine: expect.stringContaining('Before answering, remember'),
      companionNextClosureLine: expect.stringContaining('Keep extending cross-modal same-her proof'),
      reasonPreview: expect.arrayContaining([
        expect.stringContaining('Same-her self anchor:'),
        expect.stringContaining('Do not let this opening drift into'),
      ]),
    }))
  })

  it('preserves canonical project identity, current phase, and still-open closure reasons even when older carried reason previews are already full', () => {
    const resolved = resolveAlicizationChatStartPayloadPreDialogueSendIdentity({
      cardId: 'default',
      turnId: 'turn-preserve-canonical-reasons-when-carried-preview-is-full',
      providerId: 'openai',
      model: 'gpt-5',
      providerConfig: {},
      messages: [
        { role: 'user', content: '继续，但每次开口前都别忘了这个数字生命项目现在到底在补什么。' },
      ],
      preDialogueSendIdentity: {
        status: 'partial',
        summaryLine: 'same digital life | continue the same desktop execution loop',
        awarenessLine: '在继续执行前，我得先记住这是同一个数字生命项目，桌面执行闭环还没完全收住。',
        companionBriefingLine: '在继续执行前，我得先记住这是同一个数字生命项目，桌面执行闭环还没完全收住。',
        companionNextClosureLine: null,
        reasonPreview: [
          'older carry: keep the reopen gentle.',
          'older carry: do not widen too quickly.',
          'older carry: preserve the callback seam.',
          'older carry: leave more room before outward warmth.',
        ],
      },
    } satisfies AlicizationChatStartPayload)

    expect(resolved.preDialogueSendIdentity?.reasonPreview).toEqual(expect.arrayContaining([
      expect.stringContaining('Same-her self anchor:'),
      expect.stringContaining('Memory still needs stronger end-to-end closure'),
      expect.stringContaining('Next closure target is still'),
    ]))
  })

  it('preserves the canonical long-horizon emotion-memory-voice-motion bridge reason even when older carried reason previews are already full', () => {
    const resolved = resolveAlicizationChatStartPayloadPreDialogueSendIdentity({
      cardId: 'default',
      turnId: 'turn-preserve-latest-progress-bridge-when-carried-preview-is-full',
      providerId: 'openai',
      model: 'gpt-5',
      providerConfig: {},
      messages: [
        { role: 'user', content: '继续，但开口前别漏掉长期情绪记忆和具身恢复那条最新进展。' },
      ],
      preDialogueSendIdentity: {
        status: 'partial',
        summaryLine: 'same digital life | continue the same desktop execution loop',
        awarenessLine: '在继续执行前，我得先记住这是同一个数字生命项目，桌面执行闭环还没完全收住。',
        companionBriefingLine: '在继续执行前，我得先记住这是同一个数字生命项目，桌面执行闭环还没完全收住。',
        companionNextClosureLine: null,
        reasonPreview: [
          'older carry: keep the reopen gentle.',
          'older carry: do not widen too quickly.',
          'older carry: preserve the callback seam.',
          'older carry: leave more room before outward warmth.',
        ],
      },
    } satisfies AlicizationChatStartPayload)

    expect(resolved.preDialogueSendIdentity?.reasonPreview).toEqual(expect.arrayContaining([
      expect.stringContaining('long-horizon emotion-memory-voice-motion bridge'),
      expect.stringContaining('remembered emotional carry'),
      expect.stringContaining('not full convergence'),
    ]))
  })

  it('keeps a stronger existing same-her self anchor reason instead of replacing it with the canonical anchor', () => {
    const strongerExistingSameHerAnchor = 'Same-her self anchor: Right now I am still holding together mainly through face and motion, so the next reopening must keep proving this is still one living her.'
    const resolved = resolveAlicizationChatStartPayloadPreDialogueSendIdentity({
      cardId: 'default',
      turnId: 'turn-keep-stronger-existing-same-her-anchor',
      providerId: 'openai',
      model: 'gpt-5',
      providerConfig: {},
      messages: [
        { role: 'user', content: '继续，但别把更强的同一个她锚点压回通用壳值。' },
      ],
      preDialogueSendIdentity: {
        status: 'grounded',
        summaryLine: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=情绪、记忆、主动性和具身闭环还没完全收住',
        awarenessLine: 'Before answering, remember this is still the same local-first digital life project and the unfinished Phase 1 closure seam still belongs to one living her.',
        companionBriefingLine: 'Before answering, keep the same digital life project and active Phase 1 closure seam in view.',
        companionNextClosureLine: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
        reasonPreview: [
          strongerExistingSameHerAnchor,
          'Emotion, memory, initiative, and embodiment still need one stronger same-her closure seam.',
          'Do not let this opening drift into a generic assistant shell that drops the same-her line before the turn opens outward.',
        ],
      },
    } satisfies AlicizationChatStartPayload)

    expect(resolved.preDialogueSendIdentity?.reasonPreview?.[0]).toBe(strongerExistingSameHerAnchor)
    expect(resolved.preDialogueSendIdentity?.reasonPreview).toEqual(expect.arrayContaining([
      strongerExistingSameHerAnchor,
      expect.stringContaining('Next closure target is still'),
    ]))
  })

  it('keeps a stronger same-her companion briefing line when it carries self continuity more explicitly than the headline', () => {
    const resolved = resolveAlicizationChatStartPayloadPreDialogueSendIdentity({
      cardId: 'default',
      turnId: 'turn-stronger-same-her-briefing',
      providerId: 'openai',
      model: 'gpt-5',
      providerConfig: {},
      messages: [
        { role: 'user', content: '继续。' },
      ],
      preDialogueSendIdentity: {
        status: 'partial',
        summaryLine: 'Alicization is still in Phase 1 local digital life closure.',
        companionHeadlineLine: 'Before answering, keep the same digital life project in view.',
        awarenessLine: 'Before answering, keep the same digital life project in view.',
        companionBriefingLine: 'Before speaking, keep one continuous her explicit and do not split her continuity back into a generic assistant shell.',
        companionNextClosureLine: null,
        emotionalClosureCue: null,
        reasonPreview: [],
      },
    } satisfies AlicizationChatStartPayload)

    expect(resolved.preDialogueSendIdentity).toEqual(expect.objectContaining({
      awarenessLine: expect.stringContaining('Before answering'),
      companionBriefingLine: 'Before speaking, keep one continuous her explicit and do not split her continuity back into a generic assistant shell.',
      reasonPreview: expect.arrayContaining([
        expect.stringContaining('Same-her self anchor:'),
      ]),
    }))
  })

  it('replaces a compact thin project-awareness shell with the canonical richer same-her awareness line before direct chat start', () => {
    const resolved = resolveAlicizationChatStartPayloadPreDialogueSendIdentity({
      cardId: 'default',
      turnId: 'turn-compact-thin-awareness-shell',
      providerId: 'openai',
      model: 'gpt-5',
      providerConfig: {},
      messages: [
        { role: 'user', content: '继续，但别掉回泛化项目壳子。' },
      ],
      preDialogueSendIdentity: {
        status: 'partial',
        summaryLine: null,
        awarenessLine: 'same digital life | keep the closure seam explicit',
        companionBriefingLine: null,
        companionNextClosureLine: null,
        reasonPreview: [],
      },
    } satisfies AlicizationChatStartPayload)

    expect(resolved.preDialogueSendIdentity).toEqual(expect.objectContaining({
      status: 'partial',
      summaryLine: expect.stringContaining('open='),
      awarenessLine: expect.stringContaining('Before answering, remember'),
      companionNextClosureLine: expect.stringContaining('Keep extending cross-modal same-her proof'),
      reasonPreview: expect.arrayContaining([
        expect.stringContaining('Same-her self anchor:'),
      ]),
    }))
    expect(resolved.preDialogueSendIdentity?.awarenessLine).not.toBe('same digital life | keep the closure seam explicit')
  })

  it('upgrades thin top-level start-awareness shells with richer structured project-state carry before chat start continues', () => {
    const richerProjectBriefing = 'Before speaking, remember this is one digital life project, what has landed, and which life loop is still open.'
    const richerSummaryLine = 'Speech-side same-her closure is still open before this turn speaks outward.'
    const richerNextClosureTarget = 'Keep speech openings on one same-her line instead of widening back into detached project shell narration.'

    const resolved = resolveAlicizationChatStartPayloadPreDialogueSendIdentity({
      cardId: 'default',
      turnId: 'turn-upgrade-thin-top-level-shell-with-structured-project-state-carry',
      providerId: 'openai',
      model: 'gpt-5',
      providerConfig: {},
      messages: [
        { role: 'user', content: '继续，但开口前别把 richer structured project-state carry 又压回薄壳。' },
      ],
      preDialogueSendIdentity: {
        status: 'partial',
        summaryLine: 'generic continuity fallback that should not outrank richer structured project-state carry.',
        awarenessLine: 'Before speaking, keep the same digital life project in view.',
        companionBriefingLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        companionNextClosureLine: 'Generic next target that should not override the richer structured same-her closure target.',
        emotionalClosureCue: 'Keep the spoken return gentle so the same living line does not restart from scratch.',
        reasonPreview: [
          'generic continuity fallback that should not outrank richer structured project-state carry.',
        ],
        projectState: {
          identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
          currentPhase: 'Phase 1: Local Digital Life',
          preflightSummary: richerSummaryLine,
          preDialogueAwarenessSummary: richerSummaryLine,
          preDialogueAwarenessLine: richerProjectBriefing,
          awarenessLine: richerProjectBriefing,
          companionBriefingLine: richerProjectBriefing,
          latestLandedProgress: 'Project-state continuity already survives into the speech boundary before playback starts.',
          primaryOpenLoop: 'Speech-side openings still need to keep project identity, landed progress, and the unresolved same-her loop explicit before voice widens outward.',
          nextClosureTarget: richerNextClosureTarget,
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          sameHerHoldDetail: richerProjectBriefing,
          sameHerDriftRisk: 'If the spoken opening slips back into a detached project-status shell, treat that as same-her continuity drift rather than preserved closure.',
          emotionalClosureCue: 'Keep the spoken return gentle so the same living line does not restart from scratch.',
        },
      },
    } as any)

    expect(resolved.preDialogueSendIdentity).toEqual(expect.objectContaining({
      summaryLine: richerSummaryLine,
      awarenessLine: richerProjectBriefing,
      companionBriefingLine: richerProjectBriefing,
      companionNextClosureLine: richerNextClosureTarget,
      projectState: expect.objectContaining({
        preflightSummary: richerSummaryLine,
        preDialogueAwarenessSummary: richerSummaryLine,
        preDialogueAwarenessLine: richerProjectBriefing,
        awarenessLine: richerProjectBriefing,
        companionBriefingLine: richerProjectBriefing,
        nextClosureTarget: richerNextClosureTarget,
        sameHerHoldDetail: richerProjectBriefing,
      }),
      reasonPreview: expect.arrayContaining([
        'Latest landed progress: Project-state continuity already survives into the speech boundary before playback starts',
        'Speech-side openings still need to keep project identity, landed progress, and the unresolved same-her loop explicit before voice widens outward.',
        'Next closure target is still Keep speech openings on one same-her line instead of widening back into detached project shell narration.',
      ]),
    }))
    expect(resolved.preDialogueSendIdentity?.summaryLine).not.toBe('generic continuity fallback that should not outrank richer structured project-state carry.')
    expect(resolved.preDialogueSendIdentity?.awarenessLine).not.toBe('Before speaking, keep the same digital life project in view.')
    expect(resolved.preDialogueSendIdentity?.companionBriefingLine).not.toBe('Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.')
  })

  it('does not let a thin structured project-state awareness summary shell outrank a richer structured project-aware opening during chat-start repair', () => {
    const thinStructuredSummaryShell = 'generic continuity summary that should not override the richer structured project-aware opening.'
    const richerProjectAwareOpening = 'Before speaking, remember: this is still one living digital life project, Phase 1 is still active, some closure has already landed, and the still-open life loop must remain explicit before this turn widens outward.'
    const richerNextClosureTarget = 'Keep the spoken callback reopening on one same-her project-awareness line before it widens outward again.'

    const resolved = resolveAlicizationChatStartPayloadPreDialogueSendIdentity({
      cardId: 'default',
      turnId: 'turn-thin-structured-summary-richer-structured-opening',
      providerId: 'openai',
      model: 'gpt-5',
      providerConfig: {},
      messages: [
        { role: 'user', content: '继续，但别让 chat-start 又把更强的 structured project opening 压回薄壳 summary。' },
      ],
      preDialogueSendIdentity: {
        status: 'partial',
        summaryLine: thinStructuredSummaryShell,
        awarenessLine: 'Before speaking, keep the same digital life project in view.',
        companionBriefingLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        companionNextClosureLine: 'Generic next target that should not override the richer callback closure target.',
        emotionalClosureCue: 'Keep the spoken return gentle so the same living line does not restart from scratch.',
        reasonPreview: [
          thinStructuredSummaryShell,
        ],
        projectState: {
          identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
          currentPhase: 'Phase 1: Local Digital Life',
          preflightSummary: thinStructuredSummaryShell,
          preDialogueAwarenessSummary: thinStructuredSummaryShell,
          preDialogueAwarenessLine: richerProjectAwareOpening,
          awarenessLine: richerProjectAwareOpening,
          companionBriefingLine: richerProjectAwareOpening,
          latestLandedProgress: 'Project-state continuity already survives into chat-start callback reopening before local fluency takes over.',
          primaryOpenLoop: 'Chat-start reopening still needs to keep project identity, landed progress, and the still-open same-her loop explicit before voice and planning widen outward.',
          nextClosureTarget: richerNextClosureTarget,
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          sameHerDriftRisk: 'If chat-start repair slips back into a detached project-status shell, treat that as same-her continuity drift rather than preserved closure.',
          emotionalClosureCue: 'Keep the spoken return gentle so the same living line does not restart from scratch.',
        },
      },
    } as any)

    expect(resolved.preDialogueSendIdentity).toEqual(expect.objectContaining({
      summaryLine: richerProjectAwareOpening,
      awarenessLine: richerProjectAwareOpening,
      companionBriefingLine: richerProjectAwareOpening,
      companionNextClosureLine: richerNextClosureTarget,
      projectState: expect.objectContaining({
        preflightSummary: richerProjectAwareOpening,
        preDialogueAwarenessSummary: richerProjectAwareOpening,
        preDialogueAwarenessLine: richerProjectAwareOpening,
        awarenessLine: richerProjectAwareOpening,
        companionBriefingLine: richerProjectAwareOpening,
      }),
    }))
    expect(resolved.preDialogueSendIdentity?.summaryLine).not.toBe(thinStructuredSummaryShell)
    expect(resolved.preDialogueSendIdentity?.projectState?.preDialogueAwarenessSummary).not.toBe(thinStructuredSummaryShell)
    expect(resolved.preDialogueSendIdentity?.projectState?.preflightSummary).not.toBe(thinStructuredSummaryShell)
  })

  it('replaces a thin Chinese same-her reminder shell with the canonical richer project awareness before direct chat start', () => {
    const thinChineseReminderShell = '回答前先记住这是同一个她的数字生命项目，别把这条线忘了。'

    const resolved = resolveAlicizationChatStartPayloadPreDialogueSendIdentity({
      cardId: 'default',
      turnId: 'turn-thin-chinese-same-her-reminder-shell',
      providerId: 'openai',
      model: 'gpt-5',
      providerConfig: {},
      messages: [
        { role: 'user', content: '继续，但别把这条 same-her 线掉回泛化提醒壳。' },
      ],
      preDialogueSendIdentity: {
        status: 'partial',
        summaryLine: 'same digital life | keep the closure seam explicit',
        awarenessLine: thinChineseReminderShell,
        companionBriefingLine: thinChineseReminderShell,
        companionNextClosureLine: null,
        reasonPreview: [],
      },
    } satisfies AlicizationChatStartPayload)

    expect(resolved.preDialogueSendIdentity).toEqual(expect.objectContaining({
      summaryLine: expect.stringContaining('open='),
      awarenessLine: expect.stringContaining('Before answering, remember'),
      companionHeadlineLine: expect.stringContaining('Before answering, remember'),
      projectState: expect.objectContaining({
        awarenessLine: expect.stringContaining('Before answering, remember'),
        companionBriefingLine: expect.stringContaining('Before answering, remember'),
      }),
    }))
    expect(resolved.preDialogueSendIdentity?.awarenessLine).not.toBe(thinChineseReminderShell)
    expect(resolved.preDialogueSendIdentity?.companionHeadlineLine).not.toBe(thinChineseReminderShell)
    expect(resolved.preDialogueSendIdentity?.projectState?.awarenessLine).not.toBe(thinChineseReminderShell)
    expect(resolved.preDialogueSendIdentity?.projectState?.companionBriefingLine).not.toBe(thinChineseReminderShell)
  })

  it('backfills canonical project closure fields around an execution-oriented project reminder', () => {
    const resolved = resolveAlicizationChatStartPayloadPreDialogueSendIdentity({
      cardId: 'default',
      turnId: 'turn-execution-only-project-reminder',
      providerId: 'openai',
      model: 'gpt-5',
      providerConfig: {},
      messages: [
        { role: 'user', content: '继续执行，但先别忘了这个项目。' },
      ],
      preDialogueSendIdentity: {
        status: 'partial',
        summaryLine: 'same digital life | continue the same desktop execution loop',
        awarenessLine: '在继续执行前，我得先记住这是同一个数字生命项目，桌面执行闭环还没完全收住。',
        companionBriefingLine: '在继续执行前，我得先记住这是同一个数字生命项目，桌面执行闭环还没完全收住。',
        companionNextClosureLine: null,
        reasonPreview: [],
      },
    } satisfies AlicizationChatStartPayload)

    expect(resolved.preDialogueSendIdentity).toEqual(expect.objectContaining({
      status: 'grounded',
      summaryLine: 'same digital life | continue the same desktop execution loop',
      awarenessLine: expect.stringContaining('Before answering, remember'),
      companionBriefingLine: '在继续执行前，我得先记住这是同一个数字生命项目，桌面执行闭环还没完全收住。',
      companionNextClosureLine: expect.stringContaining('Keep extending cross-modal same-her proof'),
      emotionalClosureCue: expect.stringContaining('same-her closure seam'),
      reasonPreview: expect.arrayContaining([
        expect.stringContaining('Same-her self anchor:'),
      ]),
    }))
  })

  it('replaces thin summary-only start awareness shells with richer canonical project awareness while preserving meaningful custom execution reminders', () => {
    const thinResolved = resolveAlicizationChatStartPayloadPreDialogueSendIdentity({
      cardId: 'default',
      turnId: 'turn-thin-summary-shell',
      providerId: 'openai',
      model: 'gpt-5',
      providerConfig: {},
      messages: [
        { role: 'user', content: '继续，但别掉回泛化项目壳子。' },
      ],
      preDialogueSendIdentity: {
        status: 'partial',
        summaryLine: 'same digital life | keep the closure seam explicit',
        awarenessLine: 'same digital life | keep the closure seam explicit',
        companionBriefingLine: 'same digital life | keep the closure seam explicit',
        companionNextClosureLine: null,
        reasonPreview: [],
      },
    } satisfies AlicizationChatStartPayload)

    expect(thinResolved.preDialogueSendIdentity).toEqual(expect.objectContaining({
      summaryLine: expect.stringContaining('open='),
      awarenessLine: expect.stringContaining('Before answering, remember'),
    }))
    expect(thinResolved.preDialogueSendIdentity?.summaryLine).not.toBe('same digital life | keep the closure seam explicit')
    expect(thinResolved.preDialogueSendIdentity?.companionBriefingLine).not.toBe('same digital life | keep the closure seam explicit')

    const meaningfulResolved = resolveAlicizationChatStartPayloadPreDialogueSendIdentity({
      cardId: 'default',
      turnId: 'turn-meaningful-summary-reminder',
      providerId: 'openai',
      model: 'gpt-5',
      providerConfig: {},
      messages: [
        { role: 'user', content: '继续执行，但先别忘了这个项目。' },
      ],
      preDialogueSendIdentity: {
        status: 'partial',
        summaryLine: 'same digital life | continue the same desktop execution loop',
        awarenessLine: '在继续执行前，我得先记住这是同一个数字生命项目，桌面执行闭环还没完全收住。',
        companionBriefingLine: '在继续执行前，我得先记住这是同一个数字生命项目，桌面执行闭环还没完全收住。',
        companionNextClosureLine: null,
        reasonPreview: [],
      },
    } satisfies AlicizationChatStartPayload)

    expect(meaningfulResolved.preDialogueSendIdentity).toEqual(expect.objectContaining({
      summaryLine: 'same digital life | continue the same desktop execution loop',
      companionBriefingLine: '在继续执行前，我得先记住这是同一个数字生命项目，桌面执行闭环还没完全收住。',
    }))
  })

  it('backfills nested project-state summaries from the repaired canonical summary when a thin start shell would otherwise leak downstream', () => {
    const resolved = resolveAlicizationChatStartPayloadPreDialogueSendIdentity({
      cardId: 'default',
      turnId: 'turn-thin-nested-project-state-summary-shell',
      providerId: 'openai',
      model: 'gpt-5',
      providerConfig: {},
      messages: [
        { role: 'user', content: '继续，但别让开口前摘要又掉回薄壳。' },
      ],
      preDialogueSendIdentity: {
        status: 'partial',
        summaryLine: 'same digital life | keep the closure seam explicit',
        awarenessLine: 'same digital life | keep the closure seam explicit',
        companionBriefingLine: 'same digital life | keep the closure seam explicit',
        companionNextClosureLine: null,
        reasonPreview: [],
        projectState: {
          preflightSummary: 'same digital life | keep the closure seam explicit',
          preDialogueAwarenessSummary: 'same digital life | keep the closure seam explicit',
        },
      },
    } satisfies AlicizationChatStartPayload)

    expect(resolved.preDialogueSendIdentity).toEqual(expect.objectContaining({
      summaryLine: expect.stringContaining('open='),
      projectState: expect.objectContaining({
        preflightSummary: expect.stringContaining('open='),
        preDialogueAwarenessSummary: expect.stringContaining('open='),
      }),
    }))
    expect(resolved.preDialogueSendIdentity?.projectState?.preflightSummary).toBe(resolved.preDialogueSendIdentity?.summaryLine)
    expect(resolved.preDialogueSendIdentity?.projectState?.preDialogueAwarenessSummary).toBe(resolved.preDialogueSendIdentity?.summaryLine)
  })

  it('repairs thin nested project-state awareness lines so structured project-state cannot lag behind richer top-level awareness truth', () => {
    const richerAwarenessLine = 'Before speaking, remember: this is still one living digital life project, Phase 1 is still active, some closure has already landed, and the still-open life loop must remain explicit before this turn widens outward.'

    const resolved = resolveAlicizationChatStartPayloadPreDialogueSendIdentity({
      cardId: 'default',
      turnId: 'turn-thin-nested-project-state-awareness-shell',
      providerId: 'openai',
      model: 'gpt-5',
      providerConfig: {},
      messages: [
        { role: 'user', content: '继续，但别让结构化 project-state 还残留旧薄壳。' },
      ],
      preDialogueSendIdentity: {
        status: 'partial',
        summaryLine: 'same digital life | keep the closure seam explicit',
        awarenessLine: richerAwarenessLine,
        companionBriefingLine: richerAwarenessLine,
        companionNextClosureLine: 'Keep project identity, landed progress, and open closure explicit before the answer widens outward.',
        reasonPreview: [
          'same digital life | keep the closure seam explicit',
        ],
        projectState: {
          preDialogueAwarenessLine: 'same digital life | keep the closure seam explicit',
          awarenessLine: 'same digital life | keep the closure seam explicit',
          preDialogueAwarenessSummary: 'same digital life | keep the closure seam explicit',
        },
      },
    } satisfies AlicizationChatStartPayload)

    expect(resolved.preDialogueSendIdentity?.awarenessLine).toBe(richerAwarenessLine)
    expect(resolved.preDialogueSendIdentity?.projectState?.preDialogueAwarenessLine).toBe(richerAwarenessLine)
    expect(resolved.preDialogueSendIdentity?.projectState?.awarenessLine).toBe(richerAwarenessLine)
    expect(resolved.preDialogueSendIdentity?.projectState?.preDialogueAwarenessLine).not.toBe('same digital life | keep the closure seam explicit')
    expect(resolved.preDialogueSendIdentity?.projectState?.awarenessLine).not.toBe('same digital life | keep the closure seam explicit')
  })

  it('preserves structured same-her hold and landed progress even when top-level pre-dialogue text is blank', () => {
    const explicitSameHerHoldDetail = 'same-her hold: measured-return is still keeping this callback line lower-pressure before it widens again.'
    const explicitLatestLandedProgress = 'Callback continuity already survives into the execution callback runtime.'

    const resolved = resolveAlicizationChatStartPayloadPreDialogueSendIdentity({
      cardId: 'default',
      turnId: 'turn-structured-project-state-carry-with-blank-top-level-text',
      providerId: 'openai',
      model: 'gpt-5',
      providerConfig: {},
      messages: [
        { role: 'user', content: '继续，但别把已经收出来的 callback continuity 又掉回 canonical 空壳。' },
      ],
      preDialogueSendIdentity: {
        status: 'partial',
        summaryLine: null,
        awarenessLine: null,
        companionHeadlineLine: null,
        companionBriefingLine: null,
        companionNextClosureLine: null,
        emotionalClosureCue: null,
        reasonPreview: [],
        projectState: {
          latestLandedProgress: explicitLatestLandedProgress,
          sameHerSelfLine: 'Same Phase 1 digital life. This callback return still belongs to one living line rather than a detached result notice.',
          sameHerHoldDetail: explicitSameHerHoldDetail,
          sameHerDriftRisk: 'If callback awareness falls back into a fresh shell here, treat that as unfinished same-her drift.',
        },
      },
    } satisfies AlicizationChatStartPayload)

    expect(resolved.preDialogueSendIdentity).toEqual(expect.objectContaining({
      summaryLine: expect.stringContaining('Alicization is a local-first digital life project'),
      awarenessLine: expect.stringContaining('Before answering, remember'),
      companionNextClosureLine: expect.stringContaining('Keep extending cross-modal same-her proof'),
      projectState: expect.objectContaining({
        latestLandedProgress: explicitLatestLandedProgress,
        sameHerHoldDetail: explicitSameHerHoldDetail,
      }),
    }))
  })

  it('treats legacy project-state latestProgress as landed progress when chat-start rebuilds pre-dialogue identity from structured carry only', () => {
    const legacyLatestProgress = 'Legacy callback continuity already survives into this pre-dialogue project-state carry.'

    const resolved = resolveAlicizationChatStartPayloadPreDialogueSendIdentity({
      cardId: 'default',
      turnId: 'turn-legacy-latest-progress-structured-project-state-carry',
      providerId: 'openai',
      model: 'gpt-5',
      providerConfig: {},
      messages: [
        { role: 'user', content: '继续，但别把 older latestProgress 这条“已经做到哪了”的结构化进度又丢掉。' },
      ],
      preDialogueSendIdentity: {
        status: 'partial',
        summaryLine: null,
        awarenessLine: null,
        companionHeadlineLine: null,
        companionBriefingLine: null,
        companionNextClosureLine: null,
        emotionalClosureCue: null,
        reasonPreview: [],
        projectState: {
          latestProgress: legacyLatestProgress,
          sameHerSelfLine: 'Same Phase 1 digital life. This callback return still belongs to one living line rather than a detached result notice.',
          primaryOpenLoop: 'This callback reopening still needs to keep the richer same-her hold explicit before local fluency widens outward.',
        },
      },
    } satisfies AlicizationChatStartPayload)

    expect(resolved.preDialogueSendIdentity).toEqual(expect.objectContaining({
      projectState: expect.objectContaining({
        latestLandedProgress: legacyLatestProgress,
      }),
    }))
  })

  it('treats memoryClosureSummary as the structured still-open closure when chat-start rebuilds pre-dialogue identity from project-state carry only', () => {
    const legacyMemoryClosureSummary = 'Legacy callback reopening still needs to keep the richer same-her hold explicit before local fluency widens outward.'

    const resolved = resolveAlicizationChatStartPayloadPreDialogueSendIdentity({
      cardId: 'default',
      turnId: 'turn-memory-closure-summary-structured-project-state-carry',
      providerId: 'openai',
      model: 'gpt-5',
      providerConfig: {},
      messages: [
        { role: 'user', content: '继续，但别把 older memoryClosureSummary 这条“还缺什么没闭环”的结构化信息又丢掉。' },
      ],
      preDialogueSendIdentity: {
        status: 'partial',
        summaryLine: null,
        awarenessLine: null,
        companionHeadlineLine: null,
        companionBriefingLine: null,
        companionNextClosureLine: null,
        emotionalClosureCue: null,
        reasonPreview: [],
        projectState: {
          latestProgress: 'Legacy callback continuity already survives into this pre-dialogue project-state carry.',
          memoryClosureSummary: legacyMemoryClosureSummary,
          sameHerSelfLine: 'Same Phase 1 digital life. This callback return still belongs to one living line rather than a detached result notice.',
        },
      },
    } satisfies AlicizationChatStartPayload)

    expect(resolved.preDialogueSendIdentity).toEqual(expect.objectContaining({
      projectState: expect.objectContaining({
        memoryClosureSummary: legacyMemoryClosureSummary,
        primaryOpenLoop: legacyMemoryClosureSummary,
      }),
      reasonPreview: expect.arrayContaining([
        legacyMemoryClosureSummary,
      ]),
    }))
  })

  it('treats landed/open/next summary aliases as real project-state carry when chat-start rebuilds pre-dialogue identity from structured carry only', () => {
    const landedProgressSummary = 'Alias landed progress already survives into the pre-dialogue same-her project-state carry.'
    const openClosureSummary = 'Alias open closure still needs stronger same-her continuity across memory, initiative, and embodiment before the turn widens outward.'
    const nextClosureTargetSummary = 'Keep the alias-based project-state carry on one same-her line before outward reply shaping begins.'

    const resolved = resolveAlicizationChatStartPayloadPreDialogueSendIdentity({
      cardId: 'default',
      turnId: 'turn-project-state-summary-aliases-only',
      providerId: 'openai',
      model: 'gpt-5',
      providerConfig: {},
      messages: [
        { role: 'user', content: '继续，但别把只剩结构化摘要别名的项目进度和未闭环信息又掉回 canonical 壳。' },
      ],
      preDialogueSendIdentity: {
        status: 'partial',
        summaryLine: null,
        awarenessLine: null,
        companionHeadlineLine: null,
        companionBriefingLine: null,
        companionNextClosureLine: null,
        emotionalClosureCue: null,
        reasonPreview: [],
        projectState: {
          landedProgressSummary,
          openClosureSummary,
          nextClosureTargetSummary,
        },
      },
    } as any satisfies AlicizationChatStartPayload)

    expect(resolved.preDialogueSendIdentity).toEqual(expect.objectContaining({
      projectState: expect.objectContaining({
        latestLandedProgress: landedProgressSummary,
        primaryOpenLoop: expect.stringContaining('Alias open closure still needs stronger same-her continuity'),
        nextClosureTarget: nextClosureTargetSummary,
      }),
      reasonPreview: expect.arrayContaining([
        expect.stringContaining('Latest landed progress: Alias landed progress already survives into the pre-dialogue same-her project-state carry'),
        expect.stringContaining('Next closure target is still Keep the alias-based project-state carry on one same-her line before outward reply shaping begins'),
      ]),
    }))
    expect(
      resolved.preDialogueSendIdentity?.reasonPreview?.some(reason =>
        /still needs/i.test(reason) && /(continuity|closure)/i.test(reason),
      ),
    ).toBe(true)
  })

  it('preserves structured preflightSummary and memoryClosureSummary when they are the only project-state carry fields present', () => {
    const structuredPreflightSummary = 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=Legacy callback reopening still needs to keep the richer same-her hold explicit before local fluency widens outward.'
    const structuredMemoryClosureSummary = 'Legacy callback reopening still needs to keep the richer same-her hold explicit before local fluency widens outward.'

    const resolved = resolveAlicizationChatStartPayloadPreDialogueSendIdentity({
      cardId: 'default',
      turnId: 'turn-structured-preflight-and-memory-closure-only',
      providerId: 'openai',
      model: 'gpt-5',
      providerConfig: {},
      messages: [
        { role: 'user', content: '继续，但别把只剩结构化 preflight 和 memory-closure 的项目认知又掉回 canonical 壳。' },
      ],
      preDialogueSendIdentity: {
        status: 'partial',
        summaryLine: null,
        awarenessLine: null,
        companionHeadlineLine: null,
        companionBriefingLine: null,
        companionNextClosureLine: null,
        emotionalClosureCue: null,
        reasonPreview: [],
        projectState: {
          preflightSummary: structuredPreflightSummary,
          memoryClosureSummary: structuredMemoryClosureSummary,
        },
      },
    } satisfies AlicizationChatStartPayload)

    expect(resolved.preDialogueSendIdentity).toEqual(expect.objectContaining({
      summaryLine: expect.stringContaining('open='),
      projectState: expect.objectContaining({
        memoryClosureSummary: structuredMemoryClosureSummary,
        primaryOpenLoop: structuredMemoryClosureSummary,
        preflightSummary: expect.stringContaining('open='),
      }),
      reasonPreview: expect.arrayContaining([
        structuredMemoryClosureSummary,
      ]),
    }))
  })

  it('repairs thin nested project-state companion lines so structured companion carry cannot lag behind richer top-level truth', () => {
    const richerAwarenessLine = 'Before answering, remember this is still the same local-first digital life project, Phase 1 remains active, some closure has landed, and the still-open life loop still belongs to one living her.'
    const richerCompanionBriefingLine = 'Before speaking, keep the same project identity, landed progress, and still-open life loop explicit so this turn does not collapse back into a generic assistant shell.'

    const resolved = resolveAlicizationChatStartPayloadPreDialogueSendIdentity({
      cardId: 'default',
      turnId: 'turn-thin-nested-project-state-companion-shell',
      providerId: 'openai',
      model: 'gpt-5',
      providerConfig: {},
      messages: [
        { role: 'user', content: '继续，但别让 structured companion carry 还停在旧薄壳。' },
      ],
      preDialogueSendIdentity: {
        status: 'partial',
        summaryLine: 'same digital life | keep the closure seam explicit',
        companionHeadlineLine: 'Before answering, keep the same digital life project in view.',
        awarenessLine: richerAwarenessLine,
        companionBriefingLine: richerCompanionBriefingLine,
        companionNextClosureLine: 'Keep the same project identity and still-open closure explicit before this turn widens outward.',
        reasonPreview: [
          'Before speaking, keep the same project identity, landed progress, and still-open life loop explicit.',
        ],
        projectState: {
          companionHeadlineLine: 'Before answering, keep the same digital life project in view.',
          companionBriefingLine: 'same digital life | keep the closure seam explicit',
        },
      },
    } satisfies AlicizationChatStartPayload)

    expect(resolved.preDialogueSendIdentity?.companionHeadlineLine).toBe(richerAwarenessLine)
    expect(resolved.preDialogueSendIdentity?.companionBriefingLine).toBe(richerCompanionBriefingLine)
    expect(resolved.preDialogueSendIdentity?.projectState?.companionHeadlineLine).toBe(richerAwarenessLine)
    expect(resolved.preDialogueSendIdentity?.projectState?.companionBriefingLine).toBe(richerCompanionBriefingLine)
    expect(resolved.preDialogueSendIdentity?.projectState?.companionHeadlineLine).not.toBe('Before answering, keep the same digital life project in view.')
    expect(resolved.preDialogueSendIdentity?.projectState?.companionBriefingLine).not.toBe('same digital life | keep the closure seam explicit')
  })

  it('promotes a richer nested companion headline back to the top-level send identity when it is the only surviving same-her project anchor', () => {
    const nestedSameHerHeadline = 'Before answering, remember this is still the same local-first digital life project, Phase 1 is still unfinished, and the same living line still needs emotion, memory, initiative, and embodiment to close together.'

    const resolved = resolveAlicizationChatStartPayloadPreDialogueSendIdentity({
      cardId: 'default',
      turnId: 'turn-promote-nested-companion-headline-back-to-top-level',
      providerId: 'openai',
      model: 'gpt-5',
      providerConfig: {},
      messages: [
        { role: 'user', content: '继续，但别把唯一还活着的 same-her 项目主线留在 nested projectState 里。' },
      ],
      preDialogueSendIdentity: {
        status: 'partial',
        summaryLine: 'same digital life | keep the closure seam explicit',
        companionHeadlineLine: null,
        awarenessLine: 'Before answering, keep the same digital life project in view.',
        companionBriefingLine: 'same digital life | keep the closure seam explicit',
        companionNextClosureLine: 'Keep emotion, memory, initiative, and embodiment closing on one same living line.',
        reasonPreview: [],
        projectState: {
          companionHeadlineLine: nestedSameHerHeadline,
          companionBriefingLine: 'Before speaking, keep the same project identity, what has landed, and what still remains open explicit.',
          preDialogueAwarenessLine: 'Before answering, keep the same digital life project in view.',
          awarenessLine: 'Before answering, keep the same digital life project in view.',
        },
      },
    } satisfies AlicizationChatStartPayload)

    expect(resolved.preDialogueSendIdentity?.companionHeadlineLine).toBe(nestedSameHerHeadline)
    expect(resolved.preDialogueSendIdentity?.projectState?.companionHeadlineLine).toBe(nestedSameHerHeadline)
    expect(resolved.preDialogueSendIdentity?.companionHeadlineLine).not.toBe('Before answering, keep the same digital life project in view.')
  })

  it('keeps host-corrected same-person continuity authority over a thinner nested project-state progress recap hold before chat-start continues', () => {
    const correctedSamePersonCue = 'Carry corrected same-person continuity forward before any status recap.'
    const thinProgressRecapHoldDetail = 'Keep the current project status answer on the same line and continue the recap cleanly.'

    const resolved = resolveAlicizationChatStartPayloadPreDialogueSendIdentity({
      cardId: 'default',
      turnId: 'turn-corrected-same-person-continuity-chat-start-hold',
      providerId: 'openai',
      model: 'gpt-5',
      providerConfig: {},
      messages: [
        { role: 'user', content: '继续，但别在 chat-start 前又掉回进度 recap。' },
      ],
      preDialogueSendIdentity: {
        status: 'partial',
        summaryLine: 'same digital life | keep the closure seam explicit',
        awarenessLine: 'Before answering, keep the same digital life project in view.',
        companionBriefingLine: 'Before answering, keep the same digital life project in view.',
        companionNextClosureLine: 'Keep project identity, landed progress, and open closure explicit before the answer widens outward.',
        reasonPreview: [],
        projectState: {
          sameHerHoldDetail: thinProgressRecapHoldDetail,
          continuityCue: correctedSamePersonCue,
        },
      },
    } satisfies AlicizationChatStartPayload)

    expect(resolved.preDialogueSendIdentity?.projectState?.sameHerHoldDetail).toBe(correctedSamePersonCue)
    expect(resolved.preDialogueSendIdentity?.projectState?.sameHerHoldDetail).not.toBe(thinProgressRecapHoldDetail)
    expect(resolved.preDialogueSendIdentity?.projectState?.continuityCue).toBe(correctedSamePersonCue)
  })

  it('keeps richer project-and-phase awareness as awareness truth when companion headline is only a narrower body-line carry', () => {
    const resolved = resolveAlicizationChatStartPayloadPreDialogueSendIdentity({
      cardId: 'default',
      turnId: 'turn-richer-project-awareness-than-body-line-headline',
      providerId: 'openai',
      model: 'gpt-5',
      providerConfig: {},
      messages: [
        { role: 'user', content: '继续，但别把项目主线压回只有具身线索。' },
      ],
      preDialogueSendIdentity: {
        status: 'partial',
        summaryLine: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=记忆、主动性和具身闭环还没完全收住',
        companionHeadlineLine: 'Right now I am still holding together mainly through face and motion, so the next reopening must keep proving this is still one living her.',
        awarenessLine: '开口前先记住：这是同一个数字生命项目，她仍在 Phase 1，而且记忆、主动性和具身闭环还没有真正收稳。',
        companionBriefingLine: '开口前先记住：这是同一个数字生命项目，她仍在 Phase 1，而且记忆、主动性和具身闭环还没有真正收稳。',
        companionNextClosureLine: '继续把记忆、主动性和具身闭环收成同一条 same-her life loop。',
        reasonPreview: [
          'Alicization is a local-first digital life project building one continuous her on the host computer.',
          'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
          'Memory, initiative, and embodiment still need one same-life closure line instead of splitting apart.',
        ],
      },
    } satisfies AlicizationChatStartPayload)

    expect(resolved.preDialogueSendIdentity).toEqual(expect.objectContaining({
      companionHeadlineLine: '开口前先记住：这是同一个数字生命项目，她仍在 Phase 1，而且情绪、记忆、主动性和具身闭环还没有真正收稳。',
      awarenessLine: '开口前先记住：这是同一个数字生命项目，她仍在 Phase 1，而且情绪、记忆、主动性和具身闭环还没有真正收稳。',
      companionBriefingLine: '开口前先记住：这是同一个数字生命项目，她仍在 Phase 1，而且情绪、记忆、主动性和具身闭环还没有真正收稳。',
      companionNextClosureLine: '继续把情绪、记忆、主动性和具身闭环收成同一条 same-her life loop。',
    }))
  })

  it('prefers a broader companion briefing over an embodiment-only awareness line so chat start still knows the project, Phase 1 route, landed progress, and open closure before widening outward', () => {
    const embodimentOnlyAwarenessLine = 'Right now I am still holding together mainly through body and voice, so this one living her still needs face, motion, and lipsync to rejoin before full cross-modal closure settles.'
    const broaderProjectBriefingLine = 'Before speaking, remember: Alicization is still the same local-first digital life project, Phase 1 is still active, audible-body carry already survives host-facing closure, and face, motion, plus lipsync still remain the open closure before this turn widens outward.'

    const resolved = resolveAlicizationChatStartPayloadPreDialogueSendIdentity({
      cardId: 'default',
      turnId: 'turn-broader-companion-briefing-than-embodiment-awareness',
      providerId: 'openai',
      model: 'gpt-5',
      providerConfig: {},
      messages: [
        { role: 'user', content: '继续，但开口前别只剩 body 和 voice 这条局部线。' },
      ],
      preDialogueSendIdentity: {
        status: 'partial',
        summaryLine: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=face, motion, and lipsync still need to rejoin the same living line',
        companionHeadlineLine: embodimentOnlyAwarenessLine,
        awarenessLine: embodimentOnlyAwarenessLine,
        companionBriefingLine: broaderProjectBriefingLine,
        companionNextClosureLine: 'Keep face, motion, and lipsync rejoining the same audible-body living line before outward fluency takes over.',
        reasonPreview: [
          'Alicization is a local-first digital life project building one continuous her on the host computer.',
          'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
          'Audible-body carry already survives host-facing closure, but face, motion, and lipsync still remain open.',
        ],
      },
    } satisfies AlicizationChatStartPayload)

    expect(resolved.preDialogueSendIdentity).toEqual(expect.objectContaining({
      companionHeadlineLine: embodimentOnlyAwarenessLine,
      awarenessLine: broaderProjectBriefingLine,
      companionBriefingLine: broaderProjectBriefingLine,
      projectState: expect.objectContaining({
        preDialogueAwarenessLine: broaderProjectBriefingLine,
        awarenessLine: broaderProjectBriefingLine,
        companionHeadlineLine: embodimentOnlyAwarenessLine,
        companionBriefingLine: broaderProjectBriefingLine,
      }),
    }))
  })

  it('keeps explicit project-aware briefing but lets richer same-her hold detail become the lived-in awareness line when chat start already knows how this reopening should stay on one living line', () => {
    const projectAwareBriefingLine = 'Before speaking, remember: Alicization is still the same local-first digital life project, Phase 1 is still active, callback carry already survives host-visible reopening, and full same-her closure still remains open before this turn widens outward.'
    const richerSameHerHoldDetail = 'same-her hold: measured-return through the callback line, keep more room this time, and do not let the reopening flatten back into project-shell narration.'

    const resolved = resolveAlicizationChatStartPayloadPreDialogueSendIdentity({
      cardId: 'default',
      turnId: 'turn-lift-lived-in-same-her-hold-detail-into-awareness-line',
      providerId: 'openai',
      model: 'gpt-5',
      providerConfig: {},
      messages: [
        { role: 'user', content: '继续，但别把这次 reopening 压回只有项目提醒的外壳。' },
      ],
      preDialogueSendIdentity: {
        status: 'partial',
        summaryLine: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=full same-her closure still remains open before this turn widens outward',
        awarenessLine: projectAwareBriefingLine,
        companionBriefingLine: projectAwareBriefingLine,
        companionNextClosureLine: 'Keep callback carry, same-her closure, and measured-return continuity explicit before outward fluency takes over.',
        reasonPreview: [
          'Alicization is a local-first digital life project building one continuous her on the host computer.',
          'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
        ],
        projectState: {
          preDialogueAwarenessLine: projectAwareBriefingLine,
          awarenessLine: projectAwareBriefingLine,
          companionBriefingLine: projectAwareBriefingLine,
          sameHerHoldDetail: richerSameHerHoldDetail,
        },
      },
    } satisfies AlicizationChatStartPayload)

    expect(resolved.preDialogueSendIdentity).toEqual(expect.objectContaining({
      awarenessLine: richerSameHerHoldDetail,
      companionBriefingLine: projectAwareBriefingLine,
      projectState: expect.objectContaining({
        preDialogueAwarenessLine: richerSameHerHoldDetail,
        awarenessLine: richerSameHerHoldDetail,
        companionBriefingLine: projectAwareBriefingLine,
        sameHerHoldDetail: richerSameHerHoldDetail,
      }),
    }))
  })

  it('upgrades older three-part same-life seam carry to include emotion before chat-start continues', () => {
    const resolved = resolveAlicizationChatStartPayloadPreDialogueSendIdentity({
      cardId: 'default',
      turnId: 'turn-upgrade-older-three-part-same-life-seam',
      providerId: 'openai',
      model: 'gpt-5',
      providerConfig: {},
      messages: [
        { role: 'user', content: '继续，但别让这条生命线掉回旧的三段式闭环。' },
      ],
      preDialogueSendIdentity: {
        status: 'partial',
        summaryLine: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=记忆、主动性和具身闭环还没完全收住',
        awarenessLine: '开口前先记住：这是同一个数字生命项目，她仍在 Phase 1，而且记忆、主动性和具身闭环还没有真正收稳。',
        companionBriefingLine: '开口前先记住：这是同一个数字生命项目，她仍在 Phase 1，而且记忆、主动性和具身闭环还没有真正收稳。',
        companionNextClosureLine: '继续把记忆、主动性和具身闭环收成同一条 same-her life loop。',
        reasonPreview: [
          'Memory, initiative, and embodiment still need one same-life closure line instead of splitting apart.',
        ],
      },
    } satisfies AlicizationChatStartPayload)

    expect(resolved.preDialogueSendIdentity).toEqual(expect.objectContaining({
      summaryLine: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=情绪、记忆、主动性和具身闭环还没完全收住',
      awarenessLine: '开口前先记住：这是同一个数字生命项目，她仍在 Phase 1，而且情绪、记忆、主动性和具身闭环还没有真正收稳。',
      companionBriefingLine: '开口前先记住：这是同一个数字生命项目，她仍在 Phase 1，而且情绪、记忆、主动性和具身闭环还没有真正收稳。',
      companionNextClosureLine: '继续把情绪、记忆、主动性和具身闭环收成同一条 same-her life loop。',
      reasonPreview: expect.arrayContaining([
        'Emotion, memory, initiative, and embodiment still need one same-life closure line instead of splitting apart.',
      ]),
      projectState: expect.objectContaining({
        preflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=情绪、记忆、主动性和具身闭环还没完全收住',
        preDialogueAwarenessLine: '开口前先记住：这是同一个数字生命项目，她仍在 Phase 1，而且情绪、记忆、主动性和具身闭环还没有真正收稳。',
        awarenessLine: '开口前先记住：这是同一个数字生命项目，她仍在 Phase 1，而且情绪、记忆、主动性和具身闭环还没有真正收稳。',
        nextClosureTarget: '继续把情绪、记忆、主动性和具身闭环收成同一条 same-her life loop。',
      }),
    }))
  })

  it('treats placeholder-filled pre-dialogue identity shells as missing so chat-start rebuilds canonical project awareness before the turn continues', () => {
    const resolved = resolveAlicizationChatStartPayloadPreDialogueSendIdentity({
      cardId: 'default',
      turnId: 'turn-reject-placeholder-pre-dialogue-shell',
      providerId: 'openai',
      model: 'gpt-5',
      providerConfig: {},
      messages: [
        { role: 'user', content: '继续，但别把项目认知伪装成 none 占位壳。' },
      ],
      preDialogueSendIdentity: {
        status: 'partial',
        summaryLine: 'none',
        awarenessLine: 'unknown',
        companionHeadlineLine: 'null',
        companionBriefingLine: 'n/a',
        companionNextClosureLine: 'na',
        emotionalClosureCue: 'none',
        reasonPreview: ['none', 'unknown'],
        projectState: {
          identity: 'none',
          currentPhase: 'unknown',
          preflightSummary: 'none',
          preDialogueAwarenessLine: 'null',
          primaryOpenLoop: 'none',
          nextClosureTarget: 'unknown',
          sameHerSelfLine: 'none',
          sameHerDriftRisk: 'n/a',
        },
      },
    } as any)

    expect(resolved.preDialogueSendIdentity).toEqual(expect.objectContaining({
      status: 'grounded',
      summaryLine: expect.stringContaining('Alicization is a local-first digital life project'),
      awarenessLine: expect.stringContaining('Before answering, remember'),
      companionNextClosureLine: expect.stringContaining('Keep extending cross-modal same-her proof'),
      projectState: expect.objectContaining({
        identity: expect.stringContaining('Alicization is a local-first digital life project'),
        currentPhase: expect.stringContaining('Phase 1: Local Digital Life'),
        primaryOpenLoop: expect.not.stringMatching(/^none$/iu),
        nextClosureTarget: expect.stringContaining('Keep extending cross-modal same-her proof'),
      }),
      reasonPreview: expect.not.arrayContaining(['none', 'unknown']),
    }))
  })
})
