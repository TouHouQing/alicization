import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

describe('runtime main chat prelude project awareness regression', () => {
  it('normalizes pre-dialogue project awareness inside the prelude runtime so future chat-start entrypoints cannot skip the same-her project brief', () => {
    const source = readFileSync(new URL('./runtime-main-chat-prelude.ts', import.meta.url), 'utf8')

    expect(source).toContain('import { resolveAlicizationChatStartPayloadPreDialogueSendIdentity } from \'./main-chat-start-awareness\'')
    expect(source).toContain('const normalizedPayload = resolveAlicizationChatStartPayloadPreDialogueSendIdentity(payload)')
    expect(source).toContain('const latestUserText = readLatestUserMessageText(normalizedPayload.messages)')
    expect(source).toContain('let messages = resolveChatMessages(normalizedPayload, {')
    expect(source).toContain('originalMessages: normalizedPayload.messages')
    expect(source).toContain('cardId: normalizedPayload.cardId')
    expect(source).toContain(': buildMainChatContextualString(normalizedPayload)')
    expect(source).toContain(': buildMainChatExecutionCallbackContext(normalizedPayload)')
    expect(source).toContain(': buildMainChatExecutionLedgerContext(normalizedPayload)')
    expect(source).toContain('? await buildMainChatPendingAffirmationThread(normalizedPayload)')
    expect(source).toContain('const normalizedPayload = resolveAlicizationChatStartPayloadPreDialogueSendIdentity(payload)')
    expect(source).toContain('const prelude = await (preludePromise ?? prepareMainChatPrelude(normalizedPayload, mainGateway))')
    expect(source).toContain('payload: normalizedPayload')
  })
})
