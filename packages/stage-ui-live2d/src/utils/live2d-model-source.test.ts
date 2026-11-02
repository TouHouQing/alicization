import { expect, it } from 'vitest'

import { createLive2DModelSource } from './live2d-model-source'

it('borrows only the archive belonging to the same selected catalogue model', () => {
  const file = new File(['owned bytes'], 'character.ZIP')
  expect(createLive2DModelSource('current', 'blob:current', { id: 'current', file }).archive).toBe(file)
  expect(createLive2DModelSource('current', 'blob:current', { id: 'previous', file })).not.toHaveProperty('archive')
  expect(createLive2DModelSource('preset', 'file:///model.zip')).toEqual({ id: 'preset', url: 'file:///model.zip' })
  expect(createLive2DModelSource(undefined, 'file:///model.zip')).toEqual({ id: undefined, url: 'file:///model.zip' })
})
