import { existsSync, readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

describe('chat core memory authority', () => {
  it('does not build, upgrade, or consume renderer pre-dialogue identity', () => {
    const source = readFileSync(new URL('./chat.ts', import.meta.url), 'utf8')
    const performSendStart = source.indexOf('async function performSend(')
    const performSendEnd = source.indexOf('async function ingest(', performSendStart)
    const performSendSource = source.slice(performSendStart, performSendEnd)

    expect(source).not.toContain('from \'./chat/pre-dialogue-send-identity\'')
    expect(source).not.toContain('from \'./chat/pre-dialogue-project-state-intent\'')
    expect(source).not.toContain('function buildPreDialogueSendIdentityFromSnapshots(')
    expect(source).not.toContain('function resolvePreDialogueSendIdentityForTurn(')
    expect(source).not.toContain('function needsPreDialogueSendIdentityUpgrade(')
    expect(source).not.toContain('function upgradeExplicitPreDialogueSendIdentity(')
    expect(source).not.toContain('function deriveFallbackProjectStateContinuitySnapshotFromSessionMessages(')
    expect(performSendSource).not.toContain('options.preDialogueSendIdentity')
    expect(performSendSource).not.toContain('streamingMessageContext.preDialogueSendIdentity')
    expect(performSendSource).not.toContain('event.preDialogueAwareness')
    expect(performSendSource).not.toContain('turnPreDialogueAwareness')
    expect(source).not.toContain('normalizeStructuredPreDialogueAwarenessPayload(')
    expect(source).not.toContain('preDialogueClosure: input.preDialogueClosure')
    expect(source).not.toContain('preDialogueAwareness: normalizedInputPreDialogueAwareness')
  })

  it('does not retain a renderer-side prompt composer', () => {
    const composerUrl = new URL('../composables/alicization-prompt-composer.ts', import.meta.url)
    const chatSource = readFileSync(new URL('./chat.ts', import.meta.url), 'utf8')

    expect(existsSync(composerUrl)).toBe(false)
    expect(chatSource).not.toContain('composeAlicizationPromptMessages')
    expect(chatSource).not.toContain('personality-directives.injected')
  })
})
