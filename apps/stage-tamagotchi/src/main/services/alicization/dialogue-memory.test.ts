import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

describe('dialogue memory boundary', () => {
  it('does not build durable memory from conversation transcript payloads', () => {
    const source = readFileSync(new URL('./dialogue-memory.ts', import.meta.url), 'utf8')

    expect(source).not.toContain('AlicizationConversationTurnInput')
    expect(source).not.toContain('buildDialogueTurnMemoryFragment')
    expect(source).not.toMatch(/\b(?:userText|assistantText)\b/u)
  })
})
