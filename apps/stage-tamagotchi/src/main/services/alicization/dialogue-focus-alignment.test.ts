import { describe, expect, it } from 'vitest'

import { measureDialogueFocusAlignment } from './dialogue-focus-alignment'

describe('measureDialogueFocusAlignment', () => {
  it('does not mark answer-style complaints as scene overlap just because prior carry was in Chinese', () => {
    const result = measureDialogueFocusAlignment({
      message: '能不能说人话',
      contextPhrases: [
        '帮我看看我屏幕上现在是什么',
        'Code | Code | Entire screen',
      ],
    })

    expect(result.overlapRatio).toBeLessThan(0.18)
    expect(result.overlapTerms).toEqual([])
  })

  it('still finds concrete overlap for actual coding follow-ups', () => {
    const result = measureDialogueFocusAlignment({
      message: '这个 diff 呢',
      contextPhrases: [
        'runtime.ts diff',
        'The host is checking the runtime diff.',
      ],
    })

    expect(result.overlapRatio).toBeGreaterThan(0)
    expect(result.overlapTerms).toContain('diff')
  })
})
