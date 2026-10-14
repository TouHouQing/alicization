import { describe, expect, it } from 'vitest'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'

import Select from '../../../../ui/src/components/form/select/select.vue'

describe('select control state', () => {
  it('forwards disabled state to its input and trigger', async () => {
    const output = await renderToString(createSSRApp(() => h(Select, { modelValue: 'a', disabled: true, options: [{ label: 'Option A', value: 'a' }] })))
    expect(output).toMatch(/<input[^>]*disabled/)
    expect(output).toMatch(/<button[^>]*disabled/)
  })

  it('renders the selected label and placeholder from the provided choices', async () => {
    const output = await renderToString(createSSRApp(() => h(Select, { modelValue: 'a', placeholder: 'Choose a model', options: [{ label: 'Option A', value: 'a' }] })))
    expect(output).toContain('value="Option A"')
    expect(output).toContain('placeholder="Choose a model"')
  })
})
