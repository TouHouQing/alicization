import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'

describe('alicization genesis workshop store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('resets to a fresh guided workshop draft', async () => {
    const { useAlicizationGenesisWorkshopStore } = await import('./alicization-genesis-workshop')
    const store = useAlicizationGenesisWorkshopStore()

    store.draft.freeDescription = 'warm, observant, and lightly playful'
    store.draft.antiPersonaConstraints = ['no harsh teasing']
    store.draft.calibration = {
      ...store.draft.calibration,
      comfortStyle: 'quiet-presence',
    }

    expect(store.hasDraftContent).toBe(true)

    store.resetDraft()

    expect(store.draft.freeDescription).toBe('')
    expect(store.draft.antiPersonaConstraints).toEqual([])
    expect(store.hasDraftContent).toBe(false)
  })
})
