import { expect, it } from 'vitest'

import * as v from 'valibot'

import { windowsVisualAuthoritySchema } from './windows-visual-authority'

const authority = { userSid: 'S-1-5-21-123-456-789-1001', sessionId: 1, integrityLevel: 8192, ownerWindowId: null }

it('distinguishes an explicitly unowned window from a bound popup owner', () => {
  expect(v.parse(windowsVisualAuthoritySchema, authority).ownerWindowId).toBeNull()
  expect(v.parse(windowsVisualAuthoritySchema, { ...authority, ownerWindowId: '1234' }).ownerWindowId).toBe('1234')
})

it.each([undefined, 0, 1234, '', '0', '-1', 'unowned'])('refuses an absent or invalid native parent identity %s', (ownerWindowId) => {
  expect(v.safeParse(windowsVisualAuthoritySchema, { ...authority, ownerWindowId }).success).toBe(false)
})
