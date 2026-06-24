import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

describe('chat types', () => {
  it('keeps assistant structured project-state payloads explicitly legacy-aware for latestProgress-based continuity carry', () => {
    const source = readFileSync(new URL('./chat.ts', import.meta.url), 'utf8')

    expect(source).toContain('export interface ChatAssistantStructuredPayload')
    expect(source).toContain('latestProgress?: string | null')
  })
})
