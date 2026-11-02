import { expect, it, vi } from 'vitest'

import { initializeDesktopView } from './desktop-view-bootstrap'

it('restores local conversation and Live2D before a blocked life snapshot can complete', async () => {
  const life = Promise.withResolvers<void>()
  const history = Promise.withResolvers<void>()
  const model = Promise.withResolvers<void>()
  const configurationReady = vi.fn()
  let finished = false
  const startup = initializeDesktopView({
    restoreConversation: () => history.resolve(),
    restoreModels: () => model.resolve(),
    hydrateConfiguration: async () => {},
    configurationReady,
    initializeLife: () => life.promise,
  }).then(() => { finished = true })
  await Promise.all([history.promise, model.promise])
  await new Promise(resolve => setImmediate(resolve))
  expect(configurationReady).toHaveBeenCalledOnce()
  expect(finished).toBe(false)
  life.resolve()
  await startup
  expect(finished).toBe(true)
})

it('does not make the local views wait for a slow provider configuration read', async () => {
  const configuration = Promise.withResolvers<void>()
  const restored: string[] = []
  const configurationReady = vi.fn()
  const startup = initializeDesktopView({
    restoreConversation: () => { restored.push('history') },
    restoreModels: () => { restored.push('Live2D') },
    hydrateConfiguration: () => configuration.promise,
    configurationReady,
    initializeLife: async () => {},
  })
  await new Promise(resolve => setImmediate(resolve))
  expect(restored).toEqual(['history', 'Live2D'])
  expect(configurationReady).not.toHaveBeenCalled()
  configuration.resolve()
  await startup
  expect(configurationReady).toHaveBeenCalledOnce()
})

it('observes startup failures without leaving another local restore promise unhandled', async () => {
  const history = Promise.withResolvers<void>()
  const lifeFailure = new Error('Authoritative life snapshot failed')
  const restoreModels = vi.fn()
  const startup = initializeDesktopView({
    restoreConversation: () => history.promise,
    restoreModels,
    hydrateConfiguration: async () => {},
    configurationReady: () => {},
    initializeLife: async () => {
      throw lifeFailure
    },
  })
  await expect(startup).rejects.toBe(lifeFailure)
  expect(restoreModels).toHaveBeenCalledOnce()
  history.reject(new Error('Local history read also failed'))
  await new Promise(resolve => setImmediate(resolve))
})
