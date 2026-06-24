import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

describe('chat core pre-dialogue identity authority', () => {
  it('delegates chat-core pre-dialogue identity construction to the shared helper', () => {
    const source = readFileSync(new URL('./chat.ts', import.meta.url), 'utf8')
    const builderStart = source.indexOf('function buildPreDialogueSendIdentityFromSnapshots(')
    const resolverStart = source.indexOf('function resolvePreDialogueSendIdentityForTurn(')
    const builderSource = source.slice(builderStart, resolverStart)

    expect(source.includes('from \'./chat/pre-dialogue-send-identity\'')).toBe(true)
    expect(builderSource.includes('buildSharedPreDialogueSendIdentityFromSnapshots(')).toBe(true)
    expect(builderSource.includes('const lines = [')).toBe(false)
    expect(builderSource.includes('const awarenessSummaryLine =')).toBe(false)
  })

  it('anchors the shared helper to current thin-shell repair proof so explicit send-entry authority does not stop at delegation', () => {
    const sharedBuilderTestSource = readFileSync(new URL('./chat/pre-dialogue-send-identity.test.ts', import.meta.url), 'utf8')
    const textComposerSource = readFileSync(new URL('./chat/text-composer-store.test.ts', import.meta.url), 'utf8')

    expect(sharedBuilderTestSource).toContain(
      'upgrades thin carried awareness to the richer same-her project brief before building send identity',
    )
    expect(sharedBuilderTestSource).toContain(
      'generic continuity reminder that should not override the richer same-her project brief.',
    )
    expect(sharedBuilderTestSource).toContain(
      'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
    )
    expect(textComposerSource).toContain(
      'prefers project-state continuity embedded pre-dialogue awareness over generic continuity fallback when the standalone awareness snapshot is missing',
    )
  })
})
