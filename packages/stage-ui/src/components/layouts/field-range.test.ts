import { describe, expect, it } from 'vitest'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'

import FieldRange from '../../../../ui/src/components/form/field/field-range.vue'

describe('range field product controls', () => {
  it('disables the actual input and associates its visible label', async () => {
    const output = await renderToString(createSSRApp(() => h(FieldRange, { modelValue: 1, label: 'Left eye', disabled: true, as: 'div' })))
    const id = output.match(/aria-labelledby="([^"]+)"/)?.[1]
    expect(id).toBeTruthy()
    expect(output).toContain(`id="${id}"`)
    expect(output).toContain('Left eye')
    expect(output).toMatch(/<input[^>]*disabled/)
  })

  it('keeps a zero upper limit instead of silently substituting one', async () => {
    const output = await renderToString(createSSRApp(() => h(FieldRange, { modelValue: -0.5, min: -1, max: 0, step: 0.1, label: 'Offset' })))
    expect(output).toMatch(/<input[^>]*min="-10000"[^>]*max="0"/)
    expect(output).toContain('value="-5000"')
  })
})
