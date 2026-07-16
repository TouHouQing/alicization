import { readFileSync } from 'node:fs'

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

  it('keeps renderer prompt composition limited to SOUL and real context facts', () => {
    const source = readFileSync(new URL('../composables/alicization-prompt-composer.ts', import.meta.url), 'utf8')

    expect(source).not.toContain('projectStateContinuitySnapshot')
    expect(source).not.toContain('preDialogueAwarenessSnapshot')
    expect(source).not.toContain('preDialogueClosureSnapshot')
    expect(source).not.toContain('alicization-project-state')
    expect(source).not.toContain('alicization-pre-dialogue-awareness')
    expect(source).not.toContain('alicization-pre-dialogue-closure')
    expect(source).not.toContain('alicization-pre-dialogue-continuity')
  })
})
