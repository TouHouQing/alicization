import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'renderer-send-identity-materialization',
    file: '../../../../../../packages/stage-ui/src/stores/chat/text-composer-store.test.ts',
    snippets: [
      'await expect(store.sendCurrentMessage()).resolves.toBe(true)',
      'expectNoPreDialogueTemplateResidue(identity)',
      'expect(serializedIdentity).not.toMatch',
    ],
  },
  {
    entry: 'renderer-send-drops-stronger-fixed-headline',
    file: '../../../../../../packages/stage-ui/src/stores/chat/text-composer-store.test.ts',
    snippets: [
      'companionHeadlineLine: fixedTemplateReplacementLine',
      'emotionalClosureCue: fixedTemplateReplacementLine',
      'expectNoPreDialogueTemplateResidue(identity)',
    ],
  },
  {
    entry: 'transport-sanitization-preserves-project-triad',
    file: '../../../shared/alicization-chat-transport.test.ts',
    snippets: [
      'sanitizes reactive-like and non-plain chat payloads into structured-clone-safe JSON',
      'expectNoFixedTemplateResidue(result.value.preDialogueSendIdentity)',
      'expect(() => structuredClone(result.value)).not.toThrow()',
    ],
  },
  {
    entry: 'transport-summary-preserves-project-state-closure-signals',
    file: '../../../shared/alicization-chat-transport.test.ts',
    snippets: [
      'summarizes whether transport payload still carries structured project-state awareness without leaking its contents',
      'hasPreDialogueSummaryLine: true',
      'hasPreDialogueAwarenessLine: true',
      'hasPreDialogueNextClosureLine: false',
      'hasPreDialogueCompanionHeadlineLine: true',
      'hasPreDialogueCompanionBriefingLine: true',
      'hasPreDialogueEmotionalClosureCue: true',
      'hasPreDialogueReasonPreview: true',
      'hasPreDialogueProjectIdentity: true',
      'hasPreDialogueProjectPhase: true',
      'hasPreDialogueLatestLandedProgress: true',
      'hasPreDialoguePrimaryOpenLoop: true',
      'hasPreDialogueNextClosureTarget: true',
      'hasPreDialogueContinuitySummary: true',
      'hasPreDialogueContinuityAnchor: true',
      'hasPreDialogueContinuityDriftRisk: true',
      'hasPreDialogueContinuityHoldDetail: true',
    ],
  },
  {
    entry: 'transport-sanitization-drops-body-led-fixed-carry',
    file: '../../../shared/alicization-chat-transport.test.ts',
    snippets: [
      'drops body-face-motion fixed send identity while preserving remaining-open transport evidence',
      'companionHeadlineLine: null',
      '\'remaining-open=lipsync+voice\'',
    ],
  },
  {
    entry: 'context-bridge-server-event-forwarding',
    file: '../../../../../../packages/stage-ui/src/stores/mods/api/context-bridge.test.ts',
    snippets: [
      'forwards pre-dialogue project awareness through outgoing tool-call, chat message, and complete server events',
      'expect(messageEvent?.data?.[\'gen-ai:chat\']?.preDialogueSendIdentity).toEqual(context.preDialogueSendIdentity)',
      'expect(completeEvent?.data?.[\'gen-ai:chat\']?.preDialogueSendIdentity).toEqual(context.preDialogueSendIdentity)',
    ],
  },
  {
    entry: 'context-bridge-remote-observer-forwarding',
    file: '../../../../../../packages/stage-ui/src/stores/mods/api/context-bridge.test.ts',
    snippets: [
      'broadcasts tool-call and assistant-message stream events with pre-dialogue project awareness for remote observers',
      'expect(toolCallBroadcast?.context?.preDialogueSendIdentity).toEqual(context.preDialogueSendIdentity)',
      'expect(assistantMessageBroadcast?.context?.preDialogueSendIdentity).toEqual(context.preDialogueSendIdentity)',
    ],
  },
  {
    entry: 'browser-server-stream-proxy-preserves-awareness-carry',
    file: '../../../../../../apps/server/src/routes/__test__/chats.test.ts',
    snippets: [
      'expect(response.status).toBe(200)',
      'expect(chatService.streamChat).toHaveBeenCalledTimes(1)',
      'expect(capturedPayload).not.toBeNull()',
      'const capturedPreDialogueSendIdentity = (capturedPayload as any)?.preDialogueSendIdentity',
      'expect(capturedPreDialogueSendIdentity).toEqual(expect.objectContaining({',
      'emotionalKernel: expect.objectContaining({',
    ],
  },
] as const

describe('pre-dialogue transport project awareness audit', () => {
  it('keeps one explicit route-level proof that outbound pre-dialogue transport preserves continuity awareness across renderer send, transport sanitization, and bridge forwarding', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'renderer-send-identity-materialization' }),
      expect.objectContaining({ entry: 'renderer-send-drops-stronger-fixed-headline' }),
      expect.objectContaining({ entry: 'transport-sanitization-preserves-project-triad' }),
      expect.objectContaining({ entry: 'transport-summary-preserves-project-state-closure-signals' }),
      expect.objectContaining({ entry: 'transport-sanitization-drops-body-led-fixed-carry' }),
      expect.objectContaining({ entry: 'context-bridge-server-event-forwarding' }),
      expect.objectContaining({ entry: 'context-bridge-remote-observer-forwarding' }),
      expect.objectContaining({ entry: 'browser-server-stream-proxy-preserves-awareness-carry' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the outbound pre-dialogue transport claim to current behavior tests instead of only transport registry classification', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes this boundary explicit: current outbound transport routes now have dedicated continuity proof, while future new dialogue entrypoints still remain open', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const transportSource = readFileSync(new URL('../../../shared/alicization-chat-transport.test.ts', import.meta.url), 'utf8')
    const composerSource = readFileSync(new URL('../../../../../../packages/stage-ui/src/stores/chat/text-composer-store.test.ts', import.meta.url), 'utf8')
    const bridgeSource = readFileSync(new URL('../../../../../../packages/stage-ui/src/stores/mods/api/context-bridge.test.ts', import.meta.url), 'utf8')
    const chatEntrySource = readFileSync(new URL('../../../../../../packages/stage-ui/src/stores/chat-entry-awareness-audit.test.ts', import.meta.url), 'utf8')
    const directBridgeSource = readFileSync(new URL('../../../../../../packages/stage-ui/src/stores/direct-bridge-project-awareness-audit.test.ts', import.meta.url), 'utf8')

    expect(matrixSource).toContain('Future new dialogue entrypoints | Not proven')
    expect(matrixSource).toContain('Long-run proof is still incomplete')
    expect(matrixSource).toContain('pre-dialogue-transport-project-awareness-audit.test.ts')
    expect(transportSource).toContain(
      'drops body-face-motion fixed send identity while preserving remaining-open transport evidence',
    )
    expect(composerSource).toContain(
      'expectNoPreDialogueTemplateResidue(identity)',
    )
    expect(bridgeSource).toContain(
      'broadcasts tool-call and assistant-message stream events with pre-dialogue project awareness for remote observers',
    )
    expect(chatEntrySource).toContain(
      'requires the desktop renderer transport handoff to stay explicitly classified so structured-clone sanitization cannot drop pre-dialogue awareness outside chat-entry governance',
    )
    expect(chatEntrySource).toContain('hasPreDialogueProjectIdentity')
    expect(chatEntrySource).toContain('hasPreDialogueLatestLandedProgress')
    expect(directBridgeSource).toContain('hasPreDialogueSummaryLine: true')
    expect(directBridgeSource).toContain('hasPreDialogueNextClosureTarget: true')
    expect(directBridgeSource).toContain('hasPreDialogueContinuitySummary: true')
    expect(directBridgeSource).toContain('hasPreDialogueContinuityDriftRisk: true')
    expect(directBridgeSource).toContain('hasPreDialogueCompanionHeadlineLine: true')
    expect(directBridgeSource).toContain('hasPreDialogueEmotionalClosureCue: true')
  })

  it('makes the desktop renderer structured-clone handoff explicit as both transport sanitization and chat-entry governance instead of a transport-only audit seam', () => {
    const transportRegistrySource = readFileSync(new URL('./pre-dialogue-transport-audit.test.ts', import.meta.url), 'utf8')
    const chatEntrySource = readFileSync(new URL('../../../../../../packages/stage-ui/src/stores/chat-entry-awareness-audit.test.ts', import.meta.url), 'utf8')

    expect(transportRegistrySource).toContain(
      'requires transport-sanitization boundaries to preserve pre-dialogue send identity while sanitizing renderer payloads',
    )
    expect(chatEntrySource).toContain(
      'requires the desktop renderer transport handoff to stay explicitly classified so structured-clone sanitization cannot drop pre-dialogue awareness outside chat-entry governance',
    )
  })
})
