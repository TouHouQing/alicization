import { describe, expect, it } from 'vitest'
import { createSSRApp, h, ref } from 'vue'
import { renderToString } from 'vue/server-renderer'

import Section from './section.vue'

describe('controlled section expansion', () => {
  it.each([true, false])('preserves the parent state when mounted: %s', async (initial) => {
    const expanded = ref(initial)
    const app = createSSRApp({
      render: () => h(Section, {
        'title': 'Provider catalogue',
        'icon': '',
        'expand': expanded.value,
        'onUpdate:expand': (value: boolean) => { expanded.value = value },
      }, { default: () => h('p', 'Provider links') }),
    })
    const html = await renderToString(app)
    expect(expanded.value).toBe(initial)
    expect(html.includes('Provider links')).toBe(initial)
  })
})
