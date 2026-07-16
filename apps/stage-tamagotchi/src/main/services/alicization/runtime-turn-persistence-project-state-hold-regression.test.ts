import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

describe('runtime-turn-persistence project-state hold regression', () => {
  it('threads sameHerHoldDetail through guarded turn persistence instead of dropping finer identity-continuity', () => {
    const source = readFileSync(new URL('./runtime.ts', import.meta.url), 'utf8')
    const persistenceStart = source.indexOf('const projectStatePersistence = {')
    const persistenceEnd = source.indexOf('\n  const {', persistenceStart)
    const persistenceBlock = persistenceStart >= 0 && persistenceEnd > persistenceStart
      ? source.slice(persistenceStart, persistenceEnd)
      : ''
    const normalizeStart = source.indexOf('function normalizePersistedProjectStateForConversationTurn(input: {')
    const normalizeEnd = source.indexOf('\n\nexport async function setupAlicizationRuntime', normalizeStart)
    const normalizeBlock = normalizeStart >= 0 && normalizeEnd > normalizeStart
      ? source.slice(normalizeStart, normalizeEnd)
      : ''

    expect(persistenceBlock).toContain('sameHerHoldDetail: projectStateBrief.sameHerHoldDetail ?? null')
    expect(normalizeBlock).toContain('sameHerHoldDetail?: string | null')
    expect(normalizeBlock).toContain('const explicitCurrentSameHerHoldDetail = sanitizeText(currentProjectState?.sameHerHoldDetail, \'\')?.slice(0, 420) || null')
    expect(normalizeBlock).toContain('sameHerHoldDetail: explicitCurrentSameHerHoldDetail,')
    expect(normalizeBlock).toContain('sameHerHoldDetail: input.projectStatePersistence.sameHerHoldDetail,')
    expect(normalizeBlock).toContain('const preferredSameHerHoldDetail = preferRicherProjectStateAuditText({')
    expect(normalizeBlock).toContain('sameHerHoldDetail: preferredSameHerHoldDetail,')
  })
})
