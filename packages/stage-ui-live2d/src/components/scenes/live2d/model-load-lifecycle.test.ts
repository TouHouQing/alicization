import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const modelSource = readFileSync(new URL('./Model.vue', import.meta.url), 'utf8')

describe('live2D model load lifecycle', () => {
  it('retries the initial model load when the Pixi app becomes available after the model source', () => {
    expect(modelSource).toContain('watch([modelSrcRef, pixiApp], async () => await loadModel(), { immediate: true })')
  })
})
