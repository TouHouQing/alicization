import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { DisplayModelFormat, useDisplayModelsStore } from './display-models'

const mocks = vi.hoisted(() => ({
  entries: new Map<string, unknown>(),
  preview: vi.fn(),
  persist: vi.fn(),
}))

vi.mock('localforage', () => ({
  default: {
    iterate: async (visit: (value: unknown, key: string) => void) => { for (const [key, value] of mocks.entries) visit(value, key) },
    getItem: async (key: string) => mocks.entries.get(key) ?? null,
    setItem: (...args: unknown[]) => mocks.persist(...args),
    removeItem: async (key: string) => { mocks.entries.delete(key) },
  },
}))
vi.mock('@proj-alicization/stage-ui-live2d/utils/live2d-zip-loader', () => ({}))
vi.mock('@proj-alicization/stage-ui-live2d/utils/live2d-opfs-registration', () => ({}))
vi.mock('@proj-alicization/stage-ui-live2d/utils/live2d-preview', () => ({ loadLive2DModelPreview: mocks.preview }))

describe('model import and durable catalogue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mocks.entries.clear()
    mocks.preview.mockReset().mockResolvedValue('data:image/png;base64,cHJldmlldw==')
    mocks.persist.mockReset().mockImplementation(async (key: string, value: unknown) => {
      mocks.entries.set(key, value)
      return value
    })
  })
  afterEach(() => vi.useRealTimers())

  it('rejects invalid Live2D models without changing the catalogue or writing a record', async () => {
    const store = useDisplayModelsStore()
    await store.loadDisplayModelsFromIndexedDB()
    const before = store.displayModels.map(model => model.id)
    mocks.preview.mockRejectedValueOnce(new Error('Invalid zip'))
    await expect(store.addDisplayModel(DisplayModelFormat.Live2dZip, new File(['bad'], 'bad.zip'))).rejects.toThrow('Invalid zip')
    expect(store.displayModels.map(model => model.id)).toEqual(before)
    expect(mocks.persist).not.toHaveBeenCalled()
  })

  it('reports storage failure instead of showing an unsaved model', async () => {
    const store = useDisplayModelsStore()
    mocks.persist.mockRejectedValueOnce(new Error('Quota exceeded'))
    await expect(store.addDisplayModel(DisplayModelFormat.Live2dZip, new File(['model'], 'character.zip'))).rejects.toThrow('Quota exceeded')
    expect(store.displayModels).toHaveLength(0)
    expect(mocks.entries.size).toBe(0)
  })

  it('keeps an import pending until its durable write completes', async () => {
    const store = useDisplayModelsStore()
    let complete!: (value: unknown) => void
    mocks.persist.mockImplementationOnce(() => new Promise((resolve) => {
      complete = resolve
    }))
    const importing = store.addDisplayModel(DisplayModelFormat.Live2dZip, new File(['model'], 'character.zip'))
    await vi.waitFor(() => expect(mocks.persist).toHaveBeenCalled())
    expect(store.displayModels).toHaveLength(0)
    complete({})
    await importing
    expect(store.displayModels).toHaveLength(1)
  })

  it('rolls back only the unpublished import if its storage transaction commits after timeout', async () => {
    vi.useFakeTimers()
    mocks.entries.set('unrelated-record', { keep: true })
    let commit!: () => void
    mocks.persist.mockImplementationOnce((key: string, value: unknown) => new Promise((resolve) => {
      commit = () => {
        mocks.entries.set(key, value)
        resolve(value)
      }
    }))
    const store = useDisplayModelsStore()
    const importing = store.addDisplayModel(DisplayModelFormat.Live2dZip, new File(['model'], 'slow.zip'))
    const failure = expect(importing).rejects.toThrow(/timeout|timed out/i)
    await vi.advanceTimersByTimeAsync(4100)
    await failure
    expect(store.displayModels).toHaveLength(0)
    commit()
    await vi.advanceTimersByTimeAsync(0)
    expect([...mocks.entries.keys()]).toEqual(['unrelated-record'])
    await store.loadDisplayModelsFromIndexedDB()
    expect(store.displayModels.every(model => model.type === 'url')).toBe(true)
  })

  it('retains a renamed imported model through catalogue reload and removes only that model', async () => {
    const store = useDisplayModelsStore()
    await store.addDisplayModel(DisplayModelFormat.Live2dZip, new File(['model'], 'original.zip'))
    const id = store.displayModels[0].id
    await store.renameDisplayModel(id, 'My character')
    await store.loadDisplayModelsFromIndexedDB()
    expect(store.displayModels.find(model => model.id === id)?.name).toBe('My character')
    await store.removeDisplayModel(id)
    await store.loadDisplayModelsFromIndexedDB()
    expect(store.displayModels.find(model => model.id === id)).toBeUndefined()
    expect(store.displayModels.some(model => model.id === 'preset-live2d-1')).toBe(true)
  })

  it('rejects an import when a valid preview cannot be obtained', async () => {
    const store = useDisplayModelsStore()
    mocks.preview.mockResolvedValueOnce(undefined)
    await expect(store.addDisplayModel(DisplayModelFormat.Live2dZip, new File(['model'], 'character.zip'))).rejects.toThrow('preview')
    expect(mocks.entries.size).toBe(0)
  })
})
