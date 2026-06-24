import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const guardedSeams = [
  {
    relativePath: './runtime-invoke-handlers-chat.ts',
    requiredPatterns: [
      'import {',
      'resolveAlicizationChatStartPayloadPreDialogueSendIdentity',
      'const normalizedPayload = resolveAlicizationChatStartPayloadPreDialogueSendIdentity(payload)',
      'const preDialogueAwarenessDebug = summarizeAlicizationPreDialogueSendIdentityForDebug(normalizedPayload)',
      '...normalizedPayload,',
      'return await handleDirectChatStart(ipcMainEvent, normalizedPayload)',
    ],
  },
  {
    relativePath: './main-chat-direct-start.ts',
    requiredPatterns: [
      'const payload = resolveAlicizationChatStartPayloadPreDialogueSendIdentity(input.payload)',
      'const preDialogueAwarenessDebug = summarizeAlicizationPreDialogueSendIdentityForDebug(payload)',
      '...payload,',
    ],
  },
  {
    relativePath: './main-chat-start-acceptance.ts',
    requiredPatterns: [
      'const payload = resolveAlicizationChatStartPayloadPreDialogueSendIdentity(input.payload)',
      'const preDialogueAwarenessDebug = summarizeAlicizationPreDialogueSendIdentityForDebug(payload)',
      'await input.settleRecentDialogueReplyFeedbackFromUserTurn?.(payload, feedbackNow, \'chat-start\')',
      'await input.settleRecentExecutionResultFeedbackFromUserTurn?.(payload, feedbackNow, \'chat-start\')',
      'await input.settlePendingExecutionProposalFeedbackFromUserTurn?.(payload, feedbackNow, \'chat-start\')',
      'providerId: payload.providerId,',
      'providerConfig: payload.providerConfig,',
    ],
  },
  {
    relativePath: './runtime.ts',
    requiredPatterns: [
      'const normalizedPayload = resolveAlicizationChatStartPayloadPreDialogueSendIdentity(payload)',
      'const preDialogueAwarenessDebug = summarizeAlicizationPreDialogueSendIdentityForDebug(normalizedPayload)',
      'payload: normalizedPayload,',
      'const preludePromise = prepareMainChatPrelude(normalizedPayload, mainGateway, invokeOptions)',
      'const preparationPromise = prepareMainChatExecution(normalizedPayload, mainGateway, preludePromise)',
    ],
  },
  {
    relativePath: './runtime-main-chat-prelude.ts',
    requiredPatterns: [
      'const normalizedPayload = resolveAlicizationChatStartPayloadPreDialogueSendIdentity(payload)',
      'const latestUserText = readLatestUserMessageText(normalizedPayload.messages)',
      'let messages = resolveChatMessages(normalizedPayload, {',
      'payload: normalizedPayload',
    ],
  },
  {
    relativePath: './main-chat-session-runtime.ts',
    requiredPatterns: [
      'const normalizedPayload = resolveAlicizationChatStartPayloadPreDialogueSendIdentity(input.payload)',
      'const payload = normalizedPayload',
      'normalizeProviderFacingMindTurnContract(',
      'rawPayload,',
    ],
  },
] as const

describe('chat start awareness seams regression', () => {
  it('keeps every current main-process chat-start seam normalizing pre-dialogue project awareness before downstream work', () => {
    for (const seam of guardedSeams) {
      const source = readFileSync(new URL(seam.relativePath, import.meta.url), 'utf8')
      for (const pattern of seam.requiredPatterns)
        expect(source).toContain(pattern)
    }
  })
})
