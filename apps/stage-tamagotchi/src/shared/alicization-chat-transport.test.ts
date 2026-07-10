import type { AlicizationChatStartPayload } from './eventa'

import { containsAlicizationFixedTemplateResidue } from '@proj-alicization/stage-shared'
import { describe, expect, it } from 'vitest'

import { sanitizeAlicizationChatStartPayloadForTransport, summarizeAlicizationChatStartPayloadForTransport } from './alicization-chat-transport'

function expectNoFixedTemplateResidue(value: unknown) {
  const serialized = JSON.stringify(value ?? '')
  expect(containsAlicizationFixedTemplateResidue(serialized), serialized).toBe(false)
}

describe('alicization-chat-transport', () => {
  it('sanitizes reactive-like and non-plain chat payloads into structured-clone-safe JSON', () => {
    const providerConfig = new Proxy({
      apiKey: 'secret',
      baseUrl: 'https://api.example.test/v1',
      headers: new Proxy({
        Authorization: 'Bearer secret',
      }, {}),
      extras: new Map<string, unknown>([
        ['temperature', 0.2],
        ['metadata', new Date('2026-03-14T12:00:00.000Z')],
      ]),
      transform: () => 'skip me',
      rawBytes: new Uint8Array([1, 2, 3]),
    }, {})

    const contentPart = new Proxy({
      type: 'text',
      text: 'hello',
      ignored: undefined,
    }, {})

    const rawPreDialogueSendIdentity = {
      status: 'partial',
      summaryLine: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=desktop execution closure still open',
      awarenessLine: '先记住这个数字生命项目在做什么、做到哪里、还差什么闭环。',
      companionBriefingLine: '先记住这是一个本地优先数字生命项目，目前还在 Phase 1。',
      companionNextClosureLine: 'Keep closing desktop execution continuity across memory, initiative, and embodiment.',
      reasonPreview: new Set([
        'Alicization is a local-first digital life project building one continuous her on the host computer.',
        'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
        'desktop execution closure still open',
      ]),
    }

    const payload: AlicizationChatStartPayload = {
      cardId: 'default',
      turnId: 'turn-1',
      providerId: 'groq',
      model: 'grok-4.1-fast',
      providerConfig,
      messages: [
        {
          role: 'system',
          content: [contentPart],
        },
      ],
      supportsTools: true,
      waitForTools: false,
      preDialogueSendIdentity: new Proxy(rawPreDialogueSendIdentity as unknown as NonNullable<AlicizationChatStartPayload['preDialogueSendIdentity']>, {}),
    }

    const result = sanitizeAlicizationChatStartPayloadForTransport(payload)

    expect(result.report.changed).toBe(true)
    expect(result.report.droppedCount).toBeGreaterThan(0)
    expect(result.report.coercedCount).toBeGreaterThan(0)
    expect(result.value.providerConfig).toEqual({
      apiKey: 'secret',
      baseUrl: 'https://api.example.test/v1',
      headers: {
        Authorization: 'Bearer secret',
      },
      extras: {
        temperature: 0.2,
        metadata: '2026-03-14T12:00:00.000Z',
      },
      rawBytes: [1, 2, 3],
    })
    expect(result.value.messages[0]).toEqual({
      role: 'system',
      content: [
        {
          type: 'text',
          text: 'hello',
        },
      ],
    })
    expect(result.value.preDialogueSendIdentity).toEqual({
      status: 'partial',
      summaryLine: null,
      awarenessLine: '先记住这个数字生命项目在做什么、做到哪里、还差什么闭环。',
      companionBriefingLine: null,
      companionNextClosureLine: 'Keep closing desktop execution continuity across memory, initiative, and embodiment.',
      reasonPreview: [
        'desktop execution closure still open',
      ],
    })
    expectNoFixedTemplateResidue(result.value.preDialogueSendIdentity)
    expect(() => structuredClone(result.value)).not.toThrow()
  })

  it('drops body-face-motion fixed send identity while preserving remaining-open transport evidence', () => {
    const payload: AlicizationChatStartPayload = {
      cardId: 'default',
      turnId: 'turn-body-face-motion-transport-1',
      providerId: 'groq',
      model: 'grok-4.1-fast',
      providerConfig: {},
      messages: [
        {
          role: 'user',
          content: '继续把 body face motion lipsync voice 的具身闭环收住',
        },
      ],
      preDialogueSendIdentity: {
        status: 'partial',
        summaryLine: 'Alicization is still in Phase 1 local digital life closure before this turn opens outward.',
        companionHeadlineLine: 'Right now I am still holding together mainly through body, face, and motion, so this one living her still needs lipsync and voice to rejoin before full cross-modal closure settles.',
        awarenessLine: 'Right now I am still holding together mainly through body, face, and motion, so this one living her still needs lipsync and voice to rejoin before full cross-modal closure settles.',
        companionBriefingLine: 'Before speaking, remember this is one digital life project, what has landed, and which life loop is still open.',
        companionNextClosureLine: 'Let lipsync and voice rejoin the already-reformed body, face, and motion line.',
        reasonPreview: new Set([
          'same-segment face+motion+body recovery@segment-transport-body-face-motion-1',
          'remaining-open=lipsync+voice',
        ]),
      } as any,
    }

    const result = sanitizeAlicizationChatStartPayloadForTransport(payload)

    expect(result.value.preDialogueSendIdentity).toEqual({
      status: 'partial',
      summaryLine: null,
      companionHeadlineLine: null,
      awarenessLine: null,
      companionBriefingLine: null,
      companionNextClosureLine: null,
      reasonPreview: [
        'same-segment face+motion+body recovery@segment-transport-body-face-motion-1',
        'remaining-open=lipsync+voice',
      ],
    })
    expectNoFixedTemplateResidue(result.value.preDialogueSendIdentity)
  })

  it('drops fixed project-state carry while preserving landed/open transport evidence', () => {
    const payload: AlicizationChatStartPayload = {
      cardId: 'default',
      turnId: 'turn-project-state-transport-1',
      providerId: 'groq',
      model: 'grok-4.1-fast',
      providerConfig: {},
      messages: [
        {
          role: 'user',
          content: '继续沿着这条数字生命项目主线往前收住',
        },
      ],
      preDialogueSendIdentity: {
        status: 'partial',
        summaryLine: 'Alicization is still in Phase 1 local digital life closure before this turn opens outward.',
        awarenessLine: 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open.',
        companionBriefingLine: 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open.',
        companionNextClosureLine: 'Keep memory, initiative, execution, and embodiment on one same-her line.',
        projectState: new Proxy({
          identity: 'Alicization is a local-first digital life project building one continuous her on the host computer rather than a better chat wrapper.',
          currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
          latestLandedProgress: 'Project-state continuity already survives into renderer-to-main transport before the next turn opens outward.',
          primaryOpenLoop: 'Renderer-to-main transport still needs to keep project identity, landed progress, and unresolved life-loop carry explicit when pre-dialogue send identity crosses the boundary.',
          nextClosureTarget: 'Keep renderer-to-main transport on one same-her project-awareness line before the next answer widens outward.',
          sameHerSelfLine: 'Keep one continuous her explicit from self-understanding into the next host-visible reply.',
        }, {}),
        reasonPreview: [
          'Project-state continuity already survives into renderer-to-main transport before the next turn opens outward.',
          'Renderer-to-main transport still needs to keep project identity, landed progress, and unresolved life-loop carry explicit when pre-dialogue send identity crosses the boundary.',
        ],
      } as any,
    }

    const result = sanitizeAlicizationChatStartPayloadForTransport(payload)

    expect(result.value.preDialogueSendIdentity).toEqual(expect.objectContaining({
      status: 'partial',
      summaryLine: null,
      awarenessLine: null,
      companionBriefingLine: null,
      companionNextClosureLine: null,
      projectState: {
        identity: null,
        currentPhase: null,
        latestLandedProgress: 'Project-state continuity already survives into renderer-to-main transport before the next turn opens outward.',
        primaryOpenLoop: 'Renderer-to-main transport still needs to keep project identity, landed progress, and unresolved life-loop carry explicit when pre-dialogue send identity crosses the boundary.',
        nextClosureTarget: null,
        sameHerSelfLine: null,
      },
      reasonPreview: [
        'Project-state continuity already survives into renderer-to-main transport before the next turn opens outward.',
        'Renderer-to-main transport still needs to keep project identity, landed progress, and unresolved life-loop carry explicit when pre-dialogue send identity crosses the boundary.',
      ],
    }))
    expectNoFixedTemplateResidue(result.value.preDialogueSendIdentity)
  })

  it('summarizes chat payload shape without leaking provider values', () => {
    const payload: AlicizationChatStartPayload = {
      cardId: 'default',
      turnId: 'turn-2',
      providerId: 'groq',
      model: 'grok-4.1-fast',
      providerConfig: {
        apiKey: 'secret',
        baseUrl: 'https://api.example.test/v1',
      },
      messages: [
        { role: 'user', content: 'hello' },
        { role: 'assistant', content: [{ type: 'text', text: 'world' }] },
      ],
      preDialogueSendIdentity: {
        status: 'grounded',
        summaryLine: 'Renderer transport is carrying a structured pre-dialogue summary without provider secrets.',
        reasonPreview: [
          'Renderer transport summary includes pre-dialogue identity metadata.',
          'Provider configuration values stay out of the summary payload.',
          'No fresh closure target recorded for this transport summary.',
        ],
      },
    }

    expect(summarizeAlicizationChatStartPayloadForTransport(payload)).toEqual({
      providerConfigKeys: ['apiKey', 'baseUrl'],
      hasPreDialogueSendIdentity: true,
      hasPreDialogueProjectState: false,
      preDialogueSendIdentityStatus: 'grounded',
      hasPreDialogueSummaryLine: true,
      hasPreDialogueAwarenessLine: false,
      hasPreDialogueNextClosureLine: false,
      hasPreDialogueCompanionHeadlineLine: false,
      hasPreDialogueCompanionBriefingLine: false,
      hasPreDialogueEmotionalClosureCue: false,
      hasPreDialogueReasonPreview: true,
      hasPreDialogueProjectIdentity: false,
      hasPreDialogueProjectPhase: false,
      hasPreDialogueLatestLandedProgress: false,
      hasPreDialoguePrimaryOpenLoop: false,
      hasPreDialogueNextClosureTarget: false,
      hasPreDialogueContinuitySummary: false,
      hasPreDialogueContinuityAnchor: false,
      hasPreDialogueContinuityDriftRisk: false,
      hasPreDialogueContinuityHoldDetail: false,
      hasPreDialogueProactiveContinuityGap: false,
      messageSchema: [
        {
          role: 'user',
          contentKind: 'string',
          hasToolCallId: false,
          hasToolName: false,
        },
        {
          role: 'assistant',
          contentKind: 'array',
          hasToolCallId: false,
          hasToolName: false,
        },
      ],
    })
  })

  it('summarizes whether transport payload still carries structured project-state awareness without leaking its contents', () => {
    const payload: AlicizationChatStartPayload = {
      cardId: 'default',
      turnId: 'turn-transport-project-state-summary',
      providerId: 'groq',
      model: 'grok-4.1-fast',
      providerConfig: {
        apiKey: 'secret',
      },
      messages: [
        { role: 'user', content: '继续沿着这条数字生命项目主线推进' },
      ],
      preDialogueSendIdentity: {
        status: 'partial',
        summaryLine: 'Renderer transport is carrying structured pre-dialogue continuity for this turn.',
        companionHeadlineLine: 'Renderer transport is preserving project continuity without adding a visible speaking script.',
        companionBriefingLine: 'Use the structured memory and project state already provided by the runtime.',
        awarenessLine: 'Structured pre-dialogue continuity is available for this transport handoff.',
        emotionalClosureCue: 'Keep the reply grounded in current state without scripted continuity phrasing.',
        projectState: {
          identity: 'Local digital life runtime identity is provided as structured project state.',
          currentPhase: 'Local desktop life loop is the current proving ground.',
          latestLandedProgress: 'Project-state continuity already survives into renderer-to-main transport before the next turn opens outward.',
          primaryOpenLoop: 'Renderer-to-main transport still needs to keep project identity, landed progress, and unresolved life-loop carry explicit when pre-dialogue send identity crosses the boundary.',
          nextClosureTarget: 'Keep renderer-to-main transport grounded in structured memory and project state.',
          continuitySummary: 'structured continuity available | landed=Project-state continuity already survives into renderer-to-main transport before the next turn opens outward. | open=Renderer-to-main transport still needs to keep project identity, landed progress, and unresolved life-loop carry explicit when pre-dialogue send identity crosses the boundary.',
          sameHerSelfLine: 'continuity anchor: project state and memory should remain available to the next visible reply.',
          sameHerDriftRisk: 'If renderer-to-main transport reopens this turn like a detached project status shell, treat that as continuity drift rather than preserved closure.',
          sameHerHoldDetail: 'continuity hold: keep this transport handoff lower-pressure before it widens outward.',
          proactiveSameHerGap: 'Need stronger long-run proof that visible proactive hold, subconscious carry, and next-session feedback carry stay unified after longer noisy desktop runs.',
        },
        reasonPreview: [
          'Project-state continuity already survives into renderer-to-main transport before the next turn opens outward.',
        ],
      } as any,
    }

    expect(summarizeAlicizationChatStartPayloadForTransport(payload)).toEqual({
      providerConfigKeys: ['apiKey'],
      hasPreDialogueSendIdentity: true,
      hasPreDialogueProjectState: true,
      preDialogueSendIdentityStatus: 'partial',
      hasPreDialogueSummaryLine: true,
      hasPreDialogueAwarenessLine: true,
      hasPreDialogueNextClosureLine: false,
      hasPreDialogueCompanionHeadlineLine: true,
      hasPreDialogueCompanionBriefingLine: true,
      hasPreDialogueEmotionalClosureCue: true,
      hasPreDialogueReasonPreview: true,
      hasPreDialogueProjectIdentity: true,
      hasPreDialogueProjectPhase: true,
      hasPreDialogueLatestLandedProgress: true,
      hasPreDialoguePrimaryOpenLoop: true,
      hasPreDialogueNextClosureTarget: true,
      hasPreDialogueContinuitySummary: true,
      hasPreDialogueContinuityAnchor: true,
      hasPreDialogueContinuityDriftRisk: true,
      hasPreDialogueContinuityHoldDetail: true,
      hasPreDialogueProactiveContinuityGap: true,
      messageSchema: [
        {
          role: 'user',
          contentKind: 'string',
          hasToolCallId: false,
          hasToolName: false,
        },
      ],
    })
  })

  it('treats legacy latestProgress as landed progress when transport payload summaries inspect older pre-dialogue project-state carry', () => {
    const payload: AlicizationChatStartPayload = {
      cardId: 'default',
      turnId: 'turn-transport-legacy-progress-summary',
      providerId: 'groq',
      model: 'grok-4.1-fast',
      providerConfig: {},
      messages: [
        { role: 'user', content: '继续沿着这条同一个数字生命项目主线推进' },
      ],
      preDialogueSendIdentity: {
        status: 'partial',
        summaryLine: 'Renderer transport is carrying structured pre-dialogue continuity for this turn.',
        projectState: {
          identity: 'Local digital life runtime identity is provided as structured project state.',
          currentPhase: 'Local desktop life loop is the current proving ground.',
          latestLandedProgress: null,
          latestProgress: 'Legacy renderer-to-main transport progress still survives in older pre-dialogue project-state carry.',
          primaryOpenLoop: 'Renderer-to-main transport still needs to keep project identity, landed progress, and unresolved life-loop carry explicit when pre-dialogue send identity crosses the boundary.',
          nextClosureTarget: 'Keep renderer-to-main transport grounded in structured memory and project state.',
        },
        reasonPreview: [
          'Legacy renderer-to-main transport progress still survives in older pre-dialogue project-state carry.',
        ],
      } as any,
    }

    expect(summarizeAlicizationChatStartPayloadForTransport(payload)).toEqual(expect.objectContaining({
      hasPreDialogueSendIdentity: true,
      hasPreDialogueProjectState: true,
      hasPreDialogueLatestLandedProgress: true,
      hasPreDialoguePrimaryOpenLoop: true,
      hasPreDialogueNextClosureTarget: true,
    }))
  })
})
