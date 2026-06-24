import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

describe('runtime chat start awareness regression', () => {
  it('normalizes pre-dialogue project awareness at the core runtime chat-start seam before downstream preparation begins', () => {
    const source = readFileSync(new URL('./runtime.ts', import.meta.url), 'utf8')

    expect(source).toContain('import {')
    expect(source).toContain('} from \'./main-chat-start-awareness\'')
    expect(source).toContain('resolveAlicizationChatStartPayloadPreDialogueSendIdentity')
    expect(source).toContain('const normalizedPayload = resolveAlicizationChatStartPayloadPreDialogueSendIdentity(payload)')
    expect(source).toContain('const preDialogueAwarenessDebug = summarizeAlicizationPreDialogueSendIdentityForDebug(normalizedPayload)')
    expect(source).toContain('cardId: normalizedPayload.cardId')
    expect(source).toContain('turnId: normalizedPayload.turnId')
    expect(source).toContain('providerId: sanitizeText(normalizedPayload.providerId)')
    expect(source).toContain('model: sanitizeText(normalizedPayload.model)')
    expect(source).toContain('payload: normalizedPayload')
    expect(source).toContain('const preludePromise = prepareMainChatPrelude(normalizedPayload, mainGateway, invokeOptions)')
    expect(source).toContain('const preparationPromise = prepareMainChatExecution(normalizedPayload, mainGateway, preludePromise)')
    expect(source).toContain('recordPreparedMindTrace: async ({ payload, prepared, preDialogueAwarenessDebug }) => {')
    expect(source).toContain('rememberPreparedMindTrace({ payload, prepared, preDialogueAwarenessDebug })')
  })
})
