import { describe, expect, it, vi } from 'vitest'

import { createAlicizationMainChatPreludeRuntime } from './runtime-main-chat-prelude'

describe('runtime main chat prelude', () => {
  it('keeps prelude project-awareness normalization specialized instead of collapsing into a thinner generic pre-processing shell', () => {
    const source = createAlicizationMainChatPreludeRuntime.toString()

    expect(source).toContain('resolveAlicizationChatStartPayloadPreDialogueSendIdentity')
    expect(source).not.toContain('scoreAlicizationProjectAwarenessLine')
    expect(source).not.toContain('isAlicizationThinProjectAwarenessLine')
  })

  it('normalizes thin pre-dialogue project-awareness shells before every downstream prelude builder sees the chat-start payload', async () => {
    const resolveChatMessages = vi.fn((payload) => {
      expect(payload.preDialogueSendIdentity?.summaryLine).toContain('Alicization is a local-first digital life project')
      expect(payload.preDialogueSendIdentity?.awarenessLine).toContain('Before answering, remember')
      expect(payload.preDialogueSendIdentity?.awarenessLine).not.toBe('same digital life | keep the closure seam explicit')
      expect(payload.preDialogueSendIdentity?.companionBriefingLine).not.toBe('same digital life | keep the closure seam explicit')
      expect(payload.preDialogueSendIdentity?.companionNextClosureLine).toContain('Keep extending cross-modal same-her proof')
      return payload.messages as any
    })
    const buildMainChatContextualString = vi.fn(async (payload) => {
      expect(payload.preDialogueSendIdentity?.awarenessLine).toContain('Before answering, remember')
      return ''
    })
    const buildMainChatExecutionCallbackContext = vi.fn(async (payload) => {
      expect(payload.preDialogueSendIdentity?.summaryLine).toContain('Alicization is a local-first digital life project')
      return {
        pending: [],
        recent: [],
        actions: [],
        continuitySignals: [],
        systemBlock: '',
      }
    })
    const buildMainChatExecutionLedgerContext = vi.fn(async (payload) => {
      expect(payload.preDialogueSendIdentity?.reasonPreview).toEqual(expect.arrayContaining([
        expect.stringContaining('Memory still needs stronger end-to-end closure'),
      ]))
      return {
        systemBlock: '',
        entries: [],
        recallText: '',
      } as any
    })
    const buildMainChatPendingAffirmationThread = vi.fn(async (payload) => {
      expect(payload.preDialogueSendIdentity?.companionNextClosureLine).toContain('Keep extending cross-modal same-her proof')
      return null
    })
    const augmentMainChatMessagesWithPerception = vi.fn(async (input) => {
      expect(input.cardId).toBe('card-prelude-thin-shell')
      expect(input.userText).toBe('继续，但别掉回泛化项目壳子。')
      return {
        messages: input.messages,
        systemBlocks: [],
        promptSystemBlocks: [],
        digitalLifeRuntimeSurface: null,
        memoryRecallSeed: '',
        recallGovernor: null,
        capture: {
          inspectionRequested: false,
          groundedThisTurn: false,
          snapshot: null,
          fallbackReason: null,
        },
        chatGovernance: {
          suppressAssociativeRecall: false,
          turnMode: 'answer' as const,
          personaKernelMode: 'full' as const,
          mindTurnGovernance: null,
        },
      }
    })

    const runtime = createAlicizationMainChatPreludeRuntime({
      readLatestUserMessageText: messages => String(messages.at(-1)?.content ?? ''),
      senderWebContentsIdFromInvokeOptions: () => null,
      resolveChatMessages,
      buildMainChatContextualString,
      buildMainChatExecutionCallbackContext,
      buildMainChatExecutionLedgerContext,
      buildMainChatPendingAffirmationThread,
      augmentMainChatMessagesWithPerception,
      prepareMainChatSessionExecution: vi.fn(async input => ({
        prelude: input.prelude,
      })) as any,
    })

    const payload = {
      cardId: 'card-prelude-thin-shell',
      turnId: 'turn-prelude-thin-shell',
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
    } as any

    const prelude = await runtime.prepareMainChatPrelude(payload, {
      provider: {
        chat: vi.fn(() => ({ provider: 'test-chat' })),
      },
      model: 'gpt-5',
    } as any)

    expect(prelude.messages[0]).toEqual(expect.objectContaining({
      role: 'system',
      content: expect.stringContaining('[ALICIZATION_PROJECT_STATE]'),
    }))
    expect(prelude.messages.at(-1)).toEqual(payload.messages[0])
    expect(resolveChatMessages).toHaveBeenCalledOnce()
    expect(buildMainChatContextualString).toHaveBeenCalledOnce()
    expect(buildMainChatExecutionCallbackContext).toHaveBeenCalledOnce()
    expect(buildMainChatExecutionLedgerContext).toHaveBeenCalledOnce()
    expect(buildMainChatPendingAffirmationThread).toHaveBeenCalledOnce()
    expect(augmentMainChatMessagesWithPerception).toHaveBeenCalledOnce()
  })

  it('keeps richer project-and-phase awareness alive through every downstream prelude builder when a narrower body-line headline also exists', async () => {
    const richerAwarenessLine = '开口前先记住：这是同一个数字生命项目，她仍在 Phase 1，而且情绪、记忆、主动性和具身闭环还没有真正收稳。'
    const narrowerHeadline = 'Right now I am still holding together mainly through face and motion, so the next reopening must keep proving this is still one living her.'

    const resolveChatMessages = vi.fn((payload) => {
      expect(payload.preDialogueSendIdentity?.awarenessLine).toBe(richerAwarenessLine)
      expect(payload.preDialogueSendIdentity?.companionHeadlineLine).toBe(richerAwarenessLine)
      return payload.messages as any
    })
    const buildMainChatContextualString = vi.fn(async (payload) => {
      expect(payload.preDialogueSendIdentity?.awarenessLine).toBe(richerAwarenessLine)
      expect(payload.preDialogueSendIdentity?.companionBriefingLine).toBe(richerAwarenessLine)
      return ''
    })
    const buildMainChatExecutionCallbackContext = vi.fn(async (payload) => {
      expect(payload.preDialogueSendIdentity?.summaryLine).toContain('Alicization is a local-first digital life project')
      expect(payload.preDialogueSendIdentity?.awarenessLine).toBe(richerAwarenessLine)
      return {
        pending: [],
        recent: [],
        actions: [],
        continuitySignals: [],
        systemBlock: '',
      }
    })
    const buildMainChatExecutionLedgerContext = vi.fn(async (payload) => {
      expect(payload.preDialogueSendIdentity?.reasonPreview).toEqual(expect.arrayContaining([
        expect.stringContaining('Phase 1: Local Digital Life'),
        expect.stringContaining('Emotion, memory, initiative, and embodiment still need one same-life closure line'),
      ]))
      expect(payload.preDialogueSendIdentity?.awarenessLine).toBe(richerAwarenessLine)
      return {
        systemBlock: '',
        entries: [],
        recallText: '',
      } as any
    })
    const buildMainChatPendingAffirmationThread = vi.fn(async (payload) => {
      expect(payload.preDialogueSendIdentity?.companionNextClosureLine).toBe('继续把情绪、记忆、主动性和具身闭环收成同一条 same-her life loop。')
      expect(payload.preDialogueSendIdentity?.awarenessLine).toBe(richerAwarenessLine)
      return null
    })
    const augmentMainChatMessagesWithPerception = vi.fn(async (input) => {
      expect(input.cardId).toBe('card-prelude-richer-awareness')
      expect(input.userText).toBe('继续，但别把项目主线压回只有具身线索。')
      return {
        messages: input.messages,
        systemBlocks: [],
        promptSystemBlocks: [],
        digitalLifeRuntimeSurface: null,
        memoryRecallSeed: '',
        recallGovernor: null,
        capture: {
          inspectionRequested: false,
          groundedThisTurn: false,
          snapshot: null,
          fallbackReason: null,
        },
        chatGovernance: {
          suppressAssociativeRecall: false,
          turnMode: 'answer' as const,
          personaKernelMode: 'full' as const,
          mindTurnGovernance: null,
        },
      }
    })
    const prepareMainChatSessionExecution = vi.fn(async input => ({
      payload: input.payload,
      prelude: input.prelude,
    })) as any

    const runtime = createAlicizationMainChatPreludeRuntime({
      readLatestUserMessageText: messages => String(messages.at(-1)?.content ?? ''),
      senderWebContentsIdFromInvokeOptions: () => null,
      resolveChatMessages,
      buildMainChatContextualString,
      buildMainChatExecutionCallbackContext,
      buildMainChatExecutionLedgerContext,
      buildMainChatPendingAffirmationThread,
      augmentMainChatMessagesWithPerception,
      prepareMainChatSessionExecution,
    })

    const payload = {
      cardId: 'card-prelude-richer-awareness',
      turnId: 'turn-prelude-richer-awareness',
      providerId: 'openai',
      model: 'gpt-5',
      providerConfig: {},
      messages: [
        { role: 'user', content: '继续，但别把项目主线压回只有具身线索。' },
      ],
      preDialogueSendIdentity: {
        status: 'partial',
        summaryLine: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=情绪、记忆、主动性和具身闭环还没完全收住',
        companionHeadlineLine: narrowerHeadline,
        awarenessLine: richerAwarenessLine,
        companionBriefingLine: richerAwarenessLine,
        companionNextClosureLine: '继续把情绪、记忆、主动性和具身闭环收成同一条 same-her life loop。',
        reasonPreview: [
          'Alicization is a local-first digital life project building one continuous her on the host computer.',
          'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
          'Emotion, memory, initiative, and embodiment still need one same-life closure line instead of splitting apart.',
        ],
      },
    } as any

    const execution = await runtime.prepareMainChatExecution(payload, {
      provider: {
        chat: vi.fn(() => ({ provider: 'test-chat' })),
      },
      model: 'gpt-5',
    } as any)

    expect(resolveChatMessages).toHaveBeenCalledOnce()
    expect(buildMainChatContextualString).toHaveBeenCalledOnce()
    expect(buildMainChatExecutionCallbackContext).toHaveBeenCalledOnce()
    expect(buildMainChatExecutionLedgerContext).toHaveBeenCalledOnce()
    expect(buildMainChatPendingAffirmationThread).toHaveBeenCalledOnce()
    expect(augmentMainChatMessagesWithPerception).toHaveBeenCalledOnce()
    expect(prepareMainChatSessionExecution).toHaveBeenCalledWith(expect.objectContaining({
      payload: expect.objectContaining({
        preDialogueSendIdentity: expect.objectContaining({
          awarenessLine: richerAwarenessLine,
          companionHeadlineLine: richerAwarenessLine,
          companionBriefingLine: richerAwarenessLine,
          companionNextClosureLine: '继续把情绪、记忆、主动性和具身闭环收成同一条 same-her life loop。',
        }),
      }),
    }))
    expect((execution as any).payload.preDialogueSendIdentity.awarenessLine).toBe(richerAwarenessLine)
  })

  it('repairs missing canonical project-state context in the prelude layer before session execution preparation', async () => {
    const prepareMainChatSessionExecution = vi.fn(async input => input) as any

    const runtime = createAlicizationMainChatPreludeRuntime({
      readLatestUserMessageText: messages => String(messages.at(-1)?.content ?? ''),
      senderWebContentsIdFromInvokeOptions: () => null,
      resolveChatMessages: payload => payload.messages as any,
      buildMainChatContextualString: vi.fn(async () => ''),
      buildMainChatExecutionCallbackContext: vi.fn(async () => ({
        pending: [],
        recent: [],
        actions: [],
        continuitySignals: [],
        systemBlock: '',
      })),
      buildMainChatExecutionLedgerContext: vi.fn(async () => ({
        systemBlock: '',
        entries: [],
        recallText: '',
      })) as any,
      buildMainChatPendingAffirmationThread: vi.fn(async () => null),
      augmentMainChatMessagesWithPerception: vi.fn(async input => ({
        messages: input.messages,
        systemBlocks: [],
        promptSystemBlocks: [],
        digitalLifeRuntimeSurface: null,
        memoryRecallSeed: '',
        recallGovernor: null,
        capture: {
          inspectionRequested: false,
          groundedThisTurn: false,
          snapshot: null,
          fallbackReason: null,
        },
        chatGovernance: {
          suppressAssociativeRecall: false,
          turnMode: 'answer' as const,
          personaKernelMode: 'full' as const,
          mindTurnGovernance: null,
        },
      })),
      prepareMainChatSessionExecution,
    })

    const execution = await runtime.prepareMainChatExecution({
      cardId: 'card-prelude-project-state-guard',
      turnId: 'turn-prelude-project-state-guard',
      providerId: 'openai',
      model: 'gpt-5',
      providerConfig: {},
      messages: [
        { role: 'user', content: '继续，但先记住这个数字生命项目做到哪了、还差什么。' },
      ],
    } as any, {
      provider: {
        chat: vi.fn(() => ({ provider: 'test-chat' })),
      },
      model: 'gpt-5',
    } as any)

    const preparedMessages = (execution as any).prelude.messages as Array<{ role?: string, content?: string }>
    expect(prepareMainChatSessionExecution).toHaveBeenCalledOnce()
    expect(preparedMessages[0]?.role).toBe('system')
    expect(preparedMessages[0]?.content).toContain('[ALICIZATION_PROJECT_STATE]')
  })

  it('repairs thin marker-only project-state shells in the prelude layer before session execution preparation', async () => {
    const prepareMainChatSessionExecution = vi.fn(async input => input) as any

    const runtime = createAlicizationMainChatPreludeRuntime({
      readLatestUserMessageText: messages => String(messages.at(-1)?.content ?? ''),
      senderWebContentsIdFromInvokeOptions: () => null,
      resolveChatMessages: payload => payload.messages as any,
      buildMainChatContextualString: vi.fn(async () => ''),
      buildMainChatExecutionCallbackContext: vi.fn(async () => ({
        pending: [],
        recent: [],
        actions: [],
        continuitySignals: [],
        systemBlock: '',
      })),
      buildMainChatExecutionLedgerContext: vi.fn(async () => ({
        systemBlock: '',
        entries: [],
        recallText: '',
      })) as any,
      buildMainChatPendingAffirmationThread: vi.fn(async () => null),
      augmentMainChatMessagesWithPerception: vi.fn(async input => ({
        messages: input.messages,
        systemBlocks: [],
        promptSystemBlocks: [],
        digitalLifeRuntimeSurface: null,
        memoryRecallSeed: '',
        recallGovernor: null,
        capture: {
          inspectionRequested: false,
          groundedThisTurn: false,
          snapshot: null,
          fallbackReason: null,
        },
        chatGovernance: {
          suppressAssociativeRecall: false,
          turnMode: 'answer' as const,
          personaKernelMode: 'full' as const,
          mindTurnGovernance: null,
        },
      })),
      prepareMainChatSessionExecution,
    })

    const execution = await runtime.prepareMainChatExecution({
      cardId: 'card-prelude-thin-project-state-shell',
      turnId: 'turn-prelude-thin-project-state-shell',
      providerId: 'openai',
      model: 'gpt-5',
      providerConfig: {},
      messages: [
        { role: 'system', content: '[ALICIZATION_PROJECT_STATE]\nproject_preflight=Alicization is a local-first digital life project.' },
        { role: 'user', content: '继续，但别让这个数字生命掉回旧项目壳。' },
      ],
    } as any, {
      provider: {
        chat: vi.fn(() => ({ provider: 'test-chat' })),
      },
      model: 'gpt-5',
    } as any)

    const preparedMessages = (execution as any).prelude.messages as Array<{ role?: string, content?: string }>
    const canonicalProjectStateBlocks = preparedMessages
      .filter(message => message.role === 'system' && typeof message.content === 'string' && message.content.includes('[ALICIZATION_PROJECT_STATE]'))
      .map(message => message.content ?? '')

    expect(prepareMainChatSessionExecution).toHaveBeenCalledOnce()
    expect(canonicalProjectStateBlocks.some(block => block.includes('same_her_self_line='))).toBe(true)
    expect(canonicalProjectStateBlocks.some(block => block.includes('primary_open_loop='))).toBe(true)
    expect(canonicalProjectStateBlocks.some(block => block.includes('next_closure_target='))).toBe(true)
    expect(canonicalProjectStateBlocks[0]).not.toBe('[ALICIZATION_PROJECT_STATE]\nproject_preflight=Alicization is a local-first digital life project.')
  })

  it('repairs placeholder-filled canonical-looking project-state shells in the prelude layer before session execution preparation', async () => {
    const prepareMainChatSessionExecution = vi.fn(async input => input) as any
    const placeholderBlock = [
      '[ALICIZATION_PROJECT_STATE]',
      'project_preflight=Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
      'current_phase=Phase 1: Local Digital Life',
      'current_objective=Build a local companion on the host computer with continuous personhood, stable memory, emotional state, initiative, execution ability, embodied expression, and natural dialogue.',
      'latest_landed_progress=none',
      'same_her_self_line=Same Phase 1 digital life. Unfinished closure still needs the same living line.',
      'same_her_drift_risk=none',
      'primary_open_loop=none',
      'next_closure_target=none',
    ].join('\n')

    const runtime = createAlicizationMainChatPreludeRuntime({
      readLatestUserMessageText: messages => String(messages.at(-1)?.content ?? ''),
      senderWebContentsIdFromInvokeOptions: () => null,
      resolveChatMessages: payload => payload.messages as any,
      buildMainChatContextualString: vi.fn(async () => ''),
      buildMainChatExecutionCallbackContext: vi.fn(async () => ({
        pending: [],
        recent: [],
        actions: [],
        continuitySignals: [],
        systemBlock: '',
      })),
      buildMainChatExecutionLedgerContext: vi.fn(async () => ({
        systemBlock: '',
        entries: [],
        recallText: '',
      })) as any,
      buildMainChatPendingAffirmationThread: vi.fn(async () => null),
      augmentMainChatMessagesWithPerception: vi.fn(async input => ({
        messages: input.messages,
        systemBlocks: [],
        promptSystemBlocks: [],
        digitalLifeRuntimeSurface: null,
        memoryRecallSeed: '',
        recallGovernor: null,
        capture: {
          inspectionRequested: false,
          groundedThisTurn: false,
          snapshot: null,
          fallbackReason: null,
        },
        chatGovernance: {
          suppressAssociativeRecall: false,
          turnMode: 'answer' as const,
          personaKernelMode: 'full' as const,
          mindTurnGovernance: null,
        },
      })),
      prepareMainChatSessionExecution,
    })

    const execution = await runtime.prepareMainChatExecution({
      cardId: 'card-prelude-placeholder-project-state-shell',
      turnId: 'turn-prelude-placeholder-project-state-shell',
      providerId: 'openai',
      model: 'gpt-5',
      providerConfig: {},
      messages: [
        { role: 'system', content: placeholderBlock },
        { role: 'user', content: '继续，但别把项目状态退化成 none 占位。' },
      ],
    } as any, {
      provider: {
        chat: vi.fn(() => ({ provider: 'test-chat' })),
      },
      model: 'gpt-5',
    } as any)

    const preparedMessages = (execution as any).prelude.messages as Array<{ role?: string, content?: string }>
    const canonicalProjectStateBlocks = preparedMessages
      .filter(message => message.role === 'system' && typeof message.content === 'string' && message.content.includes('[ALICIZATION_PROJECT_STATE]'))
      .map(message => message.content ?? '')

    expect(prepareMainChatSessionExecution).toHaveBeenCalledOnce()
    expect(canonicalProjectStateBlocks[0]).not.toBe(placeholderBlock)
    expect(canonicalProjectStateBlocks[0]).not.toContain('latest_landed_progress=none')
    expect(canonicalProjectStateBlocks[0]).not.toContain('same_her_drift_risk=none')
    expect(canonicalProjectStateBlocks[0]).not.toContain('primary_open_loop=none')
    expect(canonicalProjectStateBlocks[0]).not.toContain('next_closure_target=none')
  })

  it('keeps project identity, landed progress, and still-open closure explicit together through prelude normalization before downstream builders run', async () => {
    const triadAwarenessLine = 'Before answering, remember: this is still one living digital life project, Phase 1 is still active, some closure has already landed, and the still-open life loop must remain explicit before this turn widens outward.'

    const resolveChatMessages = vi.fn((payload) => {
      expect(String(payload.preDialogueSendIdentity?.awarenessLine ?? '')).toContain('one living digital life project')
      expect(String(payload.preDialogueSendIdentity?.awarenessLine ?? '')).toContain('Phase 1 is still active')
      expect(String(payload.preDialogueSendIdentity?.awarenessLine ?? '')).toContain('some closure has already landed')
      expect(String(payload.preDialogueSendIdentity?.awarenessLine ?? '')).toContain('still-open life loop')
      return payload.messages as any
    })
    const buildMainChatContextualString = vi.fn(async (payload) => {
      expect(String(payload.preDialogueSendIdentity?.awarenessLine ?? '')).toContain('one living digital life project')
      return ''
    })
    const buildMainChatExecutionCallbackContext = vi.fn(async (payload) => {
      expect(String(payload.preDialogueSendIdentity?.summaryLine ?? '')).toContain('Alicization is a local-first digital life project')
      expect(String(payload.preDialogueSendIdentity?.awarenessLine ?? '')).toContain('Phase 1 is still active')
      return {
        pending: [],
        recent: [],
        actions: [],
        continuitySignals: [],
        systemBlock: '',
      }
    })
    const buildMainChatExecutionLedgerContext = vi.fn(async (payload) => {
      expect(payload.preDialogueSendIdentity?.reasonPreview).toEqual(expect.arrayContaining([
        expect.stringContaining('Phase 1: Local Digital Life'),
      ]))
      expect(String(payload.preDialogueSendIdentity?.awarenessLine ?? '')).toContain('still-open life loop')
      return {
        systemBlock: '',
        entries: [],
        recallText: '',
      } as any
    })
    const buildMainChatPendingAffirmationThread = vi.fn(async (payload) => {
      expect(String(payload.preDialogueSendIdentity?.companionNextClosureLine ?? '')).toContain('Keep project identity, landed progress, and open closure explicit before the answer widens outward.')
      return null
    })
    const augmentMainChatMessagesWithPerception = vi.fn(async input => ({
      messages: input.messages,
      systemBlocks: [],
      promptSystemBlocks: [],
      digitalLifeRuntimeSurface: null,
      memoryRecallSeed: '',
      recallGovernor: null,
      capture: {
        inspectionRequested: false,
        groundedThisTurn: false,
        snapshot: null,
        fallbackReason: null,
      },
      chatGovernance: {
        suppressAssociativeRecall: false,
        turnMode: 'answer' as const,
        personaKernelMode: 'full' as const,
        mindTurnGovernance: null,
      },
    }))
    const prepareMainChatSessionExecution = vi.fn(async input => ({
      payload: input.payload,
      prelude: input.prelude,
    })) as any

    const runtime = createAlicizationMainChatPreludeRuntime({
      readLatestUserMessageText: messages => String(messages.at(-1)?.content ?? ''),
      senderWebContentsIdFromInvokeOptions: () => null,
      resolveChatMessages,
      buildMainChatContextualString,
      buildMainChatExecutionCallbackContext,
      buildMainChatExecutionLedgerContext,
      buildMainChatPendingAffirmationThread,
      augmentMainChatMessagesWithPerception,
      prepareMainChatSessionExecution,
    })

    const execution = await runtime.prepareMainChatExecution({
      cardId: 'card-prelude-triad-awareness',
      turnId: 'turn-prelude-triad-awareness',
      providerId: 'openai',
      model: 'gpt-5',
      providerConfig: {},
      messages: [
        { role: 'user', content: '继续，但开口前别忘了这到底是什么、已经做到哪了、还差什么。' },
      ],
      preDialogueSendIdentity: {
        status: 'partial',
        summaryLine: 'same digital life | project continuity before local fluency',
        awarenessLine: triadAwarenessLine,
        companionBriefingLine: triadAwarenessLine,
        companionNextClosureLine: 'Keep project identity, landed progress, and open closure explicit before the answer widens outward.',
        reasonPreview: [
          'same digital life | project continuity before local fluency',
        ],
      },
    } as any, {
      provider: {
        chat: vi.fn(() => ({ provider: 'test-chat' })),
      },
      model: 'gpt-5',
    } as any)

    expect(resolveChatMessages).toHaveBeenCalledOnce()
    expect(buildMainChatContextualString).toHaveBeenCalledOnce()
    expect(buildMainChatExecutionCallbackContext).toHaveBeenCalledOnce()
    expect(buildMainChatExecutionLedgerContext).toHaveBeenCalledOnce()
    expect(buildMainChatPendingAffirmationThread).toHaveBeenCalledOnce()
    expect(augmentMainChatMessagesWithPerception).toHaveBeenCalledOnce()
    expect(String((execution as any).payload.preDialogueSendIdentity.awarenessLine ?? '')).toContain('one living digital life project')
    expect(String((execution as any).payload.preDialogueSendIdentity.awarenessLine ?? '')).toContain('Phase 1 is still active')
    expect(String((execution as any).payload.preDialogueSendIdentity.awarenessLine ?? '')).toContain('some closure has already landed')
    expect(String((execution as any).payload.preDialogueSendIdentity.awarenessLine ?? '')).toContain('still-open life loop')
  })
})
