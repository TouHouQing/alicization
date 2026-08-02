import { describe, expect, it } from 'vitest'

import { preferStrongerContinuityClosureAuthority } from './continuity-closure-authority'

describe('continuity closure authority', () => {
  it.each([
    [
      'Keep the host-corrected task evidence authoritative before any progress-style continuation or status recap.',
      'Continue with the current task.',
    ],
    [
      'dialogue-runtime hold: returned-side visible reply must stay on the current evidence line before any task summary widens',
      'The provider returned a complete reply.',
    ],
    [
      'Keep repair-first evidence on the current memory line until repair settles.',
      'The execution result is ready.',
    ],
  ])('does not rank natural-language continuity prose: %s', (current, candidate) => {
    expect(preferStrongerContinuityClosureAuthority(current, candidate)).toBeNull()
    expect(preferStrongerContinuityClosureAuthority(candidate, current)).toBeNull()
  })

  it('does not choose between different non-empty text values without typed authority metadata', () => {
    expect(preferStrongerContinuityClosureAuthority(
      'A detailed continuity narrative with many assertions.',
      'A short note.',
    )).toBeNull()
  })
})
