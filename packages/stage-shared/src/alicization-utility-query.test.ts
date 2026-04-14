import { describe, expect, it } from 'vitest'

import {
  detectAlicizationRealtimeQueryIntent,
  extractAlicizationLocationFromQuery,
} from './alicization-utility-query'

describe('alicization utility query parser', () => {
  it('extracts a clean Chinese city name from weather prompts with helper verbs', () => {
    expect(extractAlicizationLocationFromQuery('帮我查一下天津天气')).toBe('天津')
    expect(extractAlicizationLocationFromQuery('帮我查一下现在天津气温')).toBe('天津')
    expect(extractAlicizationLocationFromQuery('请帮我看看天津的天气情况')).toBe('天津')
    expect(extractAlicizationLocationFromQuery('今天天津天气怎么样')).toBe('天津')
  })

  it('keeps country aliases working for weather and news prompts', () => {
    expect(extractAlicizationLocationFromQuery('帮我查一下美国天气')).toBe('United States')
    expect(extractAlicizationLocationFromQuery('看看中国新闻')).toBe('China')
  })

  it('detects realtime intent categories from shared parser', () => {
    expect(detectAlicizationRealtimeQueryIntent('帮我查一下天津天气')).toEqual({
      needsRealtime: true,
      hasTimeSignal: false,
      categories: ['weather'],
    })
    expect(detectAlicizationRealtimeQueryIntent('今天美国新闻')).toEqual({
      needsRealtime: true,
      hasTimeSignal: true,
      categories: ['news'],
    })
  })
})
