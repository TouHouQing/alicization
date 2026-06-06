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
        emotionalClosureCue: expect.stringContaining('same-her closure seam'),
      }),
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
})
