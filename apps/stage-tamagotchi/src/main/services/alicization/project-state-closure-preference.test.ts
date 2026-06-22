import { describe, expect, it } from 'vitest'

import { preferProjectStateSpecificClosureSummary } from './project-state-closure-preference'

describe('project-state closure preference', () => {
  it('prefers richer persisted closure summaries when the canonical value is only the broad fallback', () => {
    const canonicalFallback = 'Memory still needs stronger end-to-end closure so recall, initiative, dialogue, and embodiment keep closing as one same-her life loop.'
    const persisted = 'Dialogue, initiative, memory, and embodiment still need one tighter same-her closure seam across return-side turns.'

    expect(preferProjectStateSpecificClosureSummary({
      canonical: canonicalFallback,
      persisted,
      canonicalFallback,
    })).toBe(persisted)
  })

  it('keeps the canonical summary when it is already more specific than the broad fallback', () => {
    const canonicalFallback = 'Keep extending cross-modal same-her proof until body expression, dialogue, and initiative stop handing off like separate systems.'
    const canonical = 'Keep the next closure target on one measured-return living line across reminder, proactive, and same-thread returns.'
    const persisted = 'Keep a stronger same-thread return spine.'

    expect(preferProjectStateSpecificClosureSummary({
      canonical,
      persisted,
      canonicalFallback,
    })).toBe(canonical)
  })
})
