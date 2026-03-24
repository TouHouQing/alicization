import { describe, expect, it } from 'vitest'

import {
  filterOrganicMemoryEntries,
  isPersonaResidueMemoryText,
  normalizeOrganicMemoryText,
} from './organic-memory-hygiene'

describe('organic memory hygiene', () => {
  it('drops performative residue instead of keeping it as active thought continuity', () => {
    expect(isPersonaResidueMemoryText('下次要更软更黏地先撒娇，再用湿湿的鼻音抱抱他，主人最好了……♡')).toBe(true)
    expect(normalizeOrganicMemoryText('下次要更软更黏地先撒娇，再用湿湿的鼻音抱抱他，主人最好了……♡', 120)).toBe('')
  })

  it('keeps unresolved task threads that still carry real continuity', () => {
    expect(isPersonaResidueMemoryText('之前那次 VSCode diff 误读还没彻底修好，下次重看时先校准当前窗口和 change review 线程。')).toBe(false)
    expect(normalizeOrganicMemoryText('之前那次 VSCode diff 误读还没彻底修好，下次重看时先校准当前窗口和 change review 线程。', 120))
      .toContain('VSCode diff')
  })

  it('filters whole entry collections before they leak back into prompts', () => {
    expect(filterOrganicMemoryEntries([
      { text: '继续跟着当前报错线程，把类型缩窄的问题先落地。' },
      { text: '以后要更软更没出息地先撒娇哄他……♡' },
    ])).toEqual([
      { text: '继续跟着当前报错线程，把类型缩窄的问题先落地。' },
    ])
  })
})
