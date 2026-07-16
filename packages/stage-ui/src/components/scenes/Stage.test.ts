import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

describe('stage speech metadata boundary', () => {
  it('does not read or forward legacy pre-dialogue fields into speech intents', () => {
    const source = readFileSync(new URL('./Stage.vue', import.meta.url), 'utf8')

    expect(source).not.toContain('attachPreDialogueSendIdentityToSpeechMetadata')
    expect(source).not.toContain('context.preDialogueSendIdentity')
    expect(source).not.toContain('preDialogueAwareness')
    expect(source).not.toContain('preDialogueClosure')
  })
})
