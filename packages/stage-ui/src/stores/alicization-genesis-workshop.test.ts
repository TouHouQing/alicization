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
    store.identity = { alicizationName: 'Alice', hostName: 'Host' }
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
    expect(store.identity).toEqual({ alicizationName: '小艾', hostName: '' })
    expect(store.hasValidIdentity).toBe(false)
  })

  it('requires both names instead of submitting an empty host name', async () => {
    const { useAlicizationGenesisWorkshopStore } = await import('./alicization-genesis-workshop')
    const store = useAlicizationGenesisWorkshopStore()
    expect(() => store.buildGenesisPayload()).toThrow('required')
    store.identity.hostName = '   '
    expect(store.hasValidIdentity).toBe(false)
    store.identity = { alicizationName: '', hostName: 'Host' }
    expect(() => store.buildGenesisPayload()).toThrow('required')
  })

  it('sends the chosen identity and independent copies of the workshop and personality', async () => {
    const { useAlicizationGenesisWorkshopStore } = await import('./alicization-genesis-workshop')
    const store = useAlicizationGenesisWorkshopStore()
    store.identity = { alicizationName: ' Alice ', hostName: ' Host ' }
    store.draft.freeDescription = 'gentle and curious'
    store.draft.previewCorrections = ['no lecturing']
    store.draft.calibration!.comfortStyle = 'quiet-presence'
    const payload = store.buildGenesisPayload()
    expect(payload).toMatchObject({
      ownerName: 'Host',
      hostName: 'Host',
      alicizationName: 'Alice',
      personaWorkshop: {
        freeDescription: 'gentle and curious',
        previewCorrections: ['no lecturing'],
        calibration: { comfortStyle: 'quiet-presence' },
      },
    })
    payload.personaWorkshop!.previewCorrections!.push('another correction')
    payload.personality.identityKernel!.valueBias!.push('a new value')
    expect(store.draft.previewCorrections).toEqual(['no lecturing'])
    expect(store.buildGenesisPayload().personality.identityKernel!.valueBias).not.toContain('a new value')
  })
})
