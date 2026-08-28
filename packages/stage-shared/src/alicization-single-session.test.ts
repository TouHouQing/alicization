import { describe, expect, it } from 'vitest'

import { alicizationPrimaryConversationSessionId } from './alicization-single-session'

describe('alicization primary conversation session', () => {
  it('derives one stable session id for the same card', () => {
    expect(alicizationPrimaryConversationSessionId('default'))
      .toBe('session:primary:default')
    expect(alicizationPrimaryConversationSessionId('default'))
      .toBe(alicizationPrimaryConversationSessionId('default'))
  })

  it('normalizes empty card ids and keeps transformed card ids collision-safe', () => {
    expect(alicizationPrimaryConversationSessionId(''))
      .toBe('session:primary:default')

    const spaced = alicizationPrimaryConversationSessionId('card with spaces')
    const hyphenated = alicizationPrimaryConversationSessionId('card-with-spaces')
    expect(spaced).not.toBe(hyphenated)
    expect(spaced).toMatch(/^session:primary:card-with-spaces-[a-z0-9]+$/u)
    expect(alicizationPrimaryConversationSessionId('card with spaces')).toBe(spaced)
  })
})
