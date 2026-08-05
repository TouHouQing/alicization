import { describe, expect, it } from 'vitest'

import {
  deriveOrganicMemoryBudgetClass,
} from './runtime-turn-composition'

describe('runtime turn composition helpers', () => {
  it('derives deep recall budgets only for long-horizon temporal focus', () => {
    expect(deriveOrganicMemoryBudgetClass(null)).toBe('realtime-reply')
    expect(deriveOrganicMemoryBudgetClass({
      recollectionIntent: {
        temporalFocus: 'cross-session',
      },
    } as any)).toBe('deep-recall-reply')
    expect(deriveOrganicMemoryBudgetClass({
      recollectionIntent: {
        temporalFocus: 'experience-matched',
      },
    } as any)).toBe('deep-recall-reply')
  })
})
