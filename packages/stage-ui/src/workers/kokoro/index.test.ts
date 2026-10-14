import type { WorkerResponse } from './types'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { KokoroWorkerManager } from './index'

class TestWorker extends EventTarget {
  static instances: TestWorker[] = []
  postMessage = vi.fn()
  terminate = vi.fn()

  constructor() {
    super()
    TestWorker.instances.push(this)
  }

  respond(data: WorkerResponse) {
    this.dispatchEvent(new MessageEvent('message', { data }))
  }
}

const voices = { af_heart: { language: 'en-us', name: 'Heart', gender: 'female' } }
async function load(manager: KokoroWorkerManager) {
  const previousRequests = TestWorker.instances[0]?.postMessage.mock.calls.length ?? 0
  const promise = manager.loadModel('q8', 'wasm')
  await vi.waitFor(() => expect(TestWorker.instances[0]?.postMessage).toHaveBeenCalledTimes(previousRequests + 1))
  TestWorker.instances[0].respond({ type: 'loaded', voices })
  await promise
  return TestWorker.instances[0]
}

describe('kokoro operation recovery', () => {
  beforeEach(() => {
    TestWorker.instances = []
    vi.useFakeTimers()
    vi.stubGlobal('Worker', TestWorker)
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('reports failed downloads immediately and allows an explicit retry', async () => {
    const manager = new KokoroWorkerManager()
    const failed = manager.loadModel('q8', 'wasm')
    const rejected = expect(failed).rejects.toThrow('Failed to fetch')
    await vi.waitFor(() => expect(TestWorker.instances[0]?.postMessage).toHaveBeenCalled())
    TestWorker.instances[0].respond({ type: 'result', status: 'error', message: 'Failed to fetch' })
    await rejected
    expect(vi.getTimerCount()).toBe(0)
    await load(manager)
    expect(manager.getVoices()).toEqual(voices)
    expect(TestWorker.instances).toHaveLength(1)
  })

  it('keeps a loaded model usable after a reported synthesis error', async () => {
    const manager = new KokoroWorkerManager()
    const worker = await load(manager)
    const failed = manager.generate('Hello', 'af_heart')
    const rejected = expect(failed).rejects.toThrow('Synthesis failed')
    await vi.waitFor(() => expect(worker.postMessage).toHaveBeenCalledTimes(2))
    worker.respond({ type: 'result', status: 'error', message: 'Synthesis failed' })
    await rejected
    const retried = manager.generate('Hello again', 'af_heart')
    await vi.waitFor(() => expect(worker.postMessage).toHaveBeenCalledTimes(3))
    const buffer = new ArrayBuffer(16)
    worker.respond({ type: 'result', status: 'success', buffer })
    expect(await retried).toBe(buffer)
    expect(vi.getTimerCount()).toBe(0)
    expect(worker.terminate).not.toHaveBeenCalled()
  })

  it('rejects an in-flight operation on a worker crash and restarts once', async () => {
    const manager = new KokoroWorkerManager()
    const failed = manager.loadModel('q8', 'wasm')
    const rejected = expect(failed).rejects.toThrow('Worker crashed')
    await vi.waitFor(() => expect(TestWorker.instances[0]?.postMessage).toHaveBeenCalled())
    TestWorker.instances[0].dispatchEvent(Object.assign(new Event('error'), { message: 'Worker crashed' }))
    await rejected
    expect(TestWorker.instances[0].terminate).toHaveBeenCalledOnce()
    await vi.advanceTimersByTimeAsync(1000)
    expect(TestWorker.instances).toHaveLength(2)
  })

  it('terminates a timed-out worker so late results cannot satisfy another load', async () => {
    const manager = new KokoroWorkerManager()
    const failed = manager.loadModel('q8', 'wasm')
    const rejected = expect(failed).rejects.toThrow('Timeout waiting for event')
    await vi.waitFor(() => expect(TestWorker.instances[0]?.postMessage).toHaveBeenCalled())
    await vi.advanceTimersByTimeAsync(120000)
    await rejected
    expect(TestWorker.instances[0].terminate).toHaveBeenCalledOnce()
    expect(TestWorker.instances).toHaveLength(1)
    TestWorker.instances[0].respond({ type: 'loaded', voices })
    expect(() => manager.getVoices()).toThrow('Model not loaded')
  })
})
