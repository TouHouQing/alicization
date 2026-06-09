import type { AlicizationChatStartPayload, AlicizationChatStartResult } from '../../../shared/eventa'

import { describe, expect, it, vi } from 'vitest'

import { handleAlicizationDirectChatStart } from './main-chat-direct-start'
import {
  resolveAlicizationChatStartPayloadPreDialogueSendIdentity,
  summarizeAlicizationPreDialogueSendIdentityForDebug,
} from './main-chat-start-awareness'

function createChatStartResult(overrides?: Partial<AlicizationChatStartResult>): AlicizationChatStartResult {
  return {
    accepted: true,
    turnId: 'turn-1',
    state: 'accepted',
    governance: null,
    embodiment: null,
    speechTimeline: null,
    ...overrides,
  }
}

function createInput(overrides?: Partial<Parameters<typeof handleAlicizationDirectChatStart>[0]>) {
  const payload: AlicizationChatStartPayload = {
    cardId: 'default',
    turnId: 'turn-1',
    providerId: 'openai',
    model: 'gpt-4o-mini',
    providerConfig: {},
    messages: [{ role: 'user', content: 'hello direct ipc' }],
    preDialogueSendIdentity: {
      status: 'partial',
      summaryLine: 'same digital life | project continuity before local fluency',
      companionHeadlineLine: 'Right now I am still holding together mainly through face and motion, so my full cross-modal same-her line is not closed yet.',
      awarenessLine: '开口前先记住这个桌面数字生命项目已经走到 same-her continuity carry，但执行闭环还没收完。',
      companionBriefingLine: '开口前先记住这个桌面数字生命项目已经走到 same-her continuity carry，但执行闭环还没收完。',
      companionNextClosureLine: '继续把桌面执行、记忆和具身收成同一条 life loop。',
      reasonPreview: [
        'same digital life | project continuity before local fluency',
        '继续把桌面执行、记忆和具身收成同一条 life loop。',
      ],
    },
  }

  return {
    ipcMainEvent: {
      sender: { id: 7 },
    } as unknown as Parameters<typeof handleAlicizationDirectChatStart>[0]['ipcMainEvent'],
    payload,
    withCardScope: vi.fn(async (_cardId, task) => await task()),
    startMainChatStream: vi.fn(async () => createChatStartResult()),
    normalizeCardId: vi.fn(() => 'default'),
    sanitizeText: vi.fn((value: unknown, fallback = '') => typeof value === 'string' ? value.trim() : fallback),
    appendRuntimeDebugLine: vi.fn(async () => {}),
    ...overrides,
  }
}

describe('main chat direct start', () => {
  it('runs direct chat start inside card scope and forwards the raw ipc event', async () => {
    const input = createInput()
    const expectedPayload = resolveAlicizationChatStartPayloadPreDialogueSendIdentity(input.payload)
    const expectedDebug = summarizeAlicizationPreDialogueSendIdentityForDebug(expectedPayload)

    const result = await handleAlicizationDirectChatStart(input)

    expect(result).toEqual(createChatStartResult())
    expect(input.withCardScope).toHaveBeenCalledWith('default', expect.any(Function), {
      label: 'chat-start:default',
      skipQueueWhenScopeAlreadyActive: true,
    })
    expect(input.startMainChatStream).toHaveBeenCalledWith(expect.objectContaining({
      cardId: 'default',
      turnId: 'turn-1',
      providerId: 'openai',
      model: 'gpt-4o-mini',
      preDialogueSendIdentity: expectedPayload.preDialogueSendIdentity,
    }), {
      raw: {
        ipcMainEvent: input.ipcMainEvent,
      },
    })
    expect(input.appendRuntimeDebugLine).toHaveBeenCalledWith('chat-start.direct-requested', expect.objectContaining({
      cardId: 'default',
      turnId: 'turn-1',
      providerId: 'openai',
      model: 'gpt-4o-mini',
      messageCount: 1,
      ...expectedDebug,
    }))
    expect(input.appendRuntimeDebugLine).toHaveBeenCalledWith('chat-start.direct-resolved', expect.objectContaining({
      cardId: 'default',
      turnId: 'turn-1',
      accepted: true,
      state: 'accepted',
    }))
  })

  it('prefers a richer carried project-awareness summary over a thin generic continuity shell before direct start forwards the payload', async () => {
    const input = createInput({
      payload: {
        ...createInput().payload,
        preDialogueSendIdentity: {
          status: 'partial',
          summaryLine: 'same digital life | project continuity before local fluency',
          companionHeadlineLine: null,
          awarenessLine: 'Before speaking, remember: this is still one living digital life project, Phase 1 is still active, some closure has already landed, and the still-open life loop must remain explicit before this turn widens outward.',
          companionBriefingLine: 'Before speaking, remember: this is still one living digital life project, Phase 1 is still active, some closure has already landed, and the still-open life loop must remain explicit before this turn widens outward.',
          companionNextClosureLine: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
          reasonPreview: [
            'same digital life | project continuity before local fluency',
          ],
        },
      },
    })

    await handleAlicizationDirectChatStart(input)

    expect(input.startMainChatStream).toHaveBeenCalledWith(expect.objectContaining({
      preDialogueSendIdentity: expect.objectContaining({
        status: 'grounded',
        summaryLine: 'same digital life | project continuity before local fluency',
        awarenessLine: 'Before speaking, remember: this is still one living digital life project, Phase 1 is still active, some closure has already landed, and the still-open life loop must remain explicit before this turn widens outward.',
        companionHeadlineLine: 'Before speaking, remember: this is still one living digital life project, Phase 1 is still active, some closure has already landed, and the still-open life loop must remain explicit before this turn widens outward.',
      }),
    }), expect.anything())

    expect(input.appendRuntimeDebugLine).toHaveBeenCalledWith('chat-start.direct-requested', expect.objectContaining({
      preDialogueAwarenessSummaryLine: 'same digital life | project continuity before local fluency',
      preDialogueAwarenessLine: 'Before speaking, remember: this is still one living digital life project, Phase 1 is still active, some closure has already landed, and the still-open life loop must remain explicit before this turn widens outward.',
    }))
  })

  it('keeps project identity, landed progress, and still-open closure explicit together before direct start forwards the payload', async () => {
    const input = createInput({
      payload: {
        ...createInput().payload,
        preDialogueSendIdentity: {
          status: 'partial',
          summaryLine: 'same digital life | project continuity before local fluency',
          companionHeadlineLine: null,
          awarenessLine: 'Before speaking, remember: this is still one living digital life project, Phase 1 is still active, some closure has already landed, and the still-open life loop must remain explicit before this turn widens outward.',
          companionBriefingLine: 'Before speaking, remember: this is still one living digital life project, Phase 1 is still active, some closure has already landed, and the still-open life loop must remain explicit before this turn widens outward.',
          companionNextClosureLine: 'Keep project identity, landed progress, and open closure explicit before the answer widens outward.',
          reasonPreview: [
            'same digital life | project continuity before local fluency',
          ],
        },
      },
    })
    const expectedPayload = resolveAlicizationChatStartPayloadPreDialogueSendIdentity(input.payload)
    const expectedDebug = summarizeAlicizationPreDialogueSendIdentityForDebug(expectedPayload)

    await handleAlicizationDirectChatStart(input)

    const forwardedPayload = vi.mocked(input.startMainChatStream).mock.calls[0]?.[0]
    const requestedDebugPayload = vi.mocked(input.appendRuntimeDebugLine).mock.calls.find(call => call[0] === 'chat-start.direct-requested')?.[1] as Record<string, unknown> | undefined

    expect(String(forwardedPayload?.preDialogueSendIdentity?.awarenessLine ?? '')).toContain('one living digital life project')
    expect(String(forwardedPayload?.preDialogueSendIdentity?.awarenessLine ?? '')).toContain('Phase 1 is still active')
    expect(String(forwardedPayload?.preDialogueSendIdentity?.awarenessLine ?? '')).toContain('some closure has already landed')
    expect(String(forwardedPayload?.preDialogueSendIdentity?.awarenessLine ?? '')).toContain('still-open life loop')
    expect(String(forwardedPayload?.preDialogueSendIdentity?.companionHeadlineLine ?? '')).toContain('one living digital life project')
    expect(forwardedPayload?.preDialogueSendIdentity?.companionNextClosureLine).toBe('Keep project identity, landed progress, and open closure explicit before the answer widens outward.')

    expect(String(requestedDebugPayload?.preDialogueAwarenessLine ?? '')).toContain('one living digital life project')
    expect(String(requestedDebugPayload?.preDialogueAwarenessLine ?? '')).toContain('Phase 1 is still active')
    expect(String(requestedDebugPayload?.preDialogueAwarenessLine ?? '')).toContain('some closure has already landed')
    expect(String(requestedDebugPayload?.preDialogueAwarenessLine ?? '')).toContain('still-open life loop')
    expect(requestedDebugPayload?.preDialogueNextClosureLine).toBe('Keep project identity, landed progress, and open closure explicit before the answer widens outward.')
    expect(requestedDebugPayload?.preDialogueReasonPreview).toEqual(expectedDebug?.preDialogueReasonPreview)
    expect(requestedDebugPayload?.preDialogueReasonCount).toBe(expectedDebug?.preDialogueReasonCount)
  })

  it('logs failures and rethrows the direct start error', async () => {
    const input = createInput({
      startMainChatStream: vi.fn(async () => {
        throw new Error('start failed')
      }),
    })

    await expect(handleAlicizationDirectChatStart(input)).rejects.toThrow('start failed')

    expect(input.appendRuntimeDebugLine).toHaveBeenCalledWith('chat-start.direct-failed', expect.objectContaining({
      cardId: 'default',
      turnId: 'turn-1',
      reason: 'start failed',
    }))
  })

  it('fills canonical project awareness before forwarding direct chat start when payload omits it', async () => {
    const payload = {
      ...createInput().payload,
      preDialogueSendIdentity: null,
    }
    const input = createInput({ payload })

    await handleAlicizationDirectChatStart(input)

    expect(input.startMainChatStream).toHaveBeenCalledWith(expect.objectContaining({
      preDialogueSendIdentity: expect.objectContaining({
        status: 'grounded',
        summaryLine: expect.stringContaining('Alicization is a local-first digital life project'),
        awarenessLine: expect.stringContaining('Before answering, remember'),
        companionBriefingLine: null,
        companionNextClosureLine: expect.stringContaining('Keep extending cross-modal same-her proof'),
      }),
    }), expect.anything())
    expect(input.appendRuntimeDebugLine).toHaveBeenCalledWith('chat-start.direct-requested', expect.objectContaining({
      preDialogueAwarenessStatus: 'grounded',
      preDialogueAwarenessSummaryLine: expect.stringContaining('Alicization is a local-first digital life project'),
    }))
  })

  it('rebuilds canonical project awareness before forwarding direct chat start when payload only carries placeholder-filled pre-dialogue identity shells', async () => {
    const payload = {
      ...createInput().payload,
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
    }
    const input = createInput({ payload: payload as any })

    await handleAlicizationDirectChatStart(input)

    expect(input.startMainChatStream).toHaveBeenCalledWith(expect.objectContaining({
      preDialogueSendIdentity: expect.objectContaining({
        status: 'grounded',
        summaryLine: expect.stringContaining('Alicization is a local-first digital life project'),
        awarenessLine: expect.stringContaining('Before answering, remember'),
        companionNextClosureLine: expect.stringContaining('Keep extending cross-modal same-her proof'),
      }),
    }), expect.anything())
    expect(input.appendRuntimeDebugLine).toHaveBeenCalledWith('chat-start.direct-requested', expect.objectContaining({
      preDialogueAwarenessStatus: 'grounded',
      preDialogueAwarenessSummaryLine: expect.stringContaining('Alicization is a local-first digital life project'),
      preDialogueAwarenessLine: expect.stringContaining('Before answering, remember'),
    }))
  })
})
