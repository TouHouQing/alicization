import type { AlicizationInitializeGenesisResult } from '../stores/alicization-bridge'

import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useAlicizationGenesisWorkshopStore } from '../stores/alicization-genesis-workshop'
import { useAlicizationGenesisSubmit } from './use-alicization-genesis-submit'

function setup() {
  const workshop = useAlicizationGenesisWorkshopStore()
  workshop.identity = { alicizationName: 'Alice', hostName: 'Host' }
  const payload = workshop.buildGenesisPayload()
  const result: AlicizationInitializeGenesisResult = {
    conflict: false,
    soul: {
      soulPath: 'SOUL.md',
      content: 'saved persona',
      revision: 1,
      hash: 'saved',
      needsGenesis: false,
      watching: true,
      frontmatter: {
        schemaVersion: 1,
        initialized: true,
        custom_directives: '',
        host_attitude: '',
        core_incarnation: '',
        profile: { ...payload, genderCustom: payload.genderCustom ?? '' },
        personality: payload.personality,
        boundaries: { killSwitch: false, mcpGuard: true },
      },
    },
  }
  const initialize = vi.fn<(_payload: typeof payload) => Promise<AlicizationInitializeGenesisResult | undefined>>().mockResolvedValue(result)
  const onCreated = vi.fn()
  const submission = useAlicizationGenesisSubmit({
    buildPayload: () => workshop.buildGenesisPayload(),
    initialize,
    onCreated,
    failureMessage: reason => `Save failed: ${reason}`,
    conflictMessage: () => 'Persona changed; not overwritten',
    unavailableMessage: () => 'Desktop unavailable',
  })
  return { workshop, initialize, onCreated, result, ...submission }
}

describe('persona setup submission', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('shows pending state, submits chosen names once, and advances only after persistence succeeds', async () => {
    const submission = setup()
    let resolve!: (result: AlicizationInitializeGenesisResult) => void
    submission.initialize.mockReturnValueOnce(new Promise((done) => {
      resolve = done
    }))
    const pending = submission.submit()
    expect(submission.submitting.value).toBe(true)
    await submission.submit()
    expect(submission.initialize).toHaveBeenCalledTimes(1)
    expect(submission.initialize).toHaveBeenCalledWith(expect.objectContaining({ hostName: 'Host', alicizationName: 'Alice' }))
    expect(submission.onCreated).not.toHaveBeenCalled()
    resolve(submission.result)
    await pending
    expect(submission.onCreated).toHaveBeenCalledTimes(1)
    expect(submission.submitting.value).toBe(false)
    expect(submission.error.value).toBe('')
  })

  it('shows rejected IPC errors and allows retry without losing the draft', async () => {
    const submission = setup()
    submission.workshop.draft.previewCorrections = ['no lecturing']
    submission.initialize.mockRejectedValueOnce(new Error('Disk unavailable'))
    await submission.submit()
    expect(submission.error.value).toContain('Disk unavailable')
    expect(submission.submitting.value).toBe(false)
    expect(submission.onCreated).not.toHaveBeenCalled()
    expect(submission.workshop.draft.previewCorrections).toEqual(['no lecturing'])
    await submission.submit()
    expect(submission.error.value).toBe('')
    expect(submission.onCreated).toHaveBeenCalledTimes(1)
  })

  it('keeps a conflicting existing persona and stays on the review step', async () => {
    const submission = setup()
    submission.initialize.mockResolvedValueOnce({ ...submission.result, conflict: true })
    await submission.submit()
    expect(submission.error.value).toBe('Persona changed; not overwritten')
    expect(submission.onCreated).not.toHaveBeenCalled()
    expect(submission.initialize.mock.calls[0][0]).not.toHaveProperty('allowOverwrite')
  })

  it('reports an unavailable runtime or an unsaved persona instead of silently doing nothing', async () => {
    const submission = setup()
    submission.initialize.mockResolvedValueOnce(undefined)
    await submission.submit()
    expect(submission.error.value).toBe('Desktop unavailable')
    submission.initialize.mockResolvedValueOnce({ ...submission.result, soul: { ...submission.result.soul, needsGenesis: true } })
    await submission.submit()
    expect(submission.error.value).toContain('not saved')
    expect(submission.onCreated).not.toHaveBeenCalled()
  })
})
