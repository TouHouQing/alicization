import { describe, expect, it } from 'vitest'

import { createQueue } from './queue'

describe('createQueue', () => {
  it('drains work enqueued between drain completion and task cleanup', async () => {
    const handled: number[] = []
    const queue = createQueue<number>({
      handlers: [
        async ({ data }) => {
          handled.push(data)
        },
      ],
    })
    let appended = false
    queue.on('drain', () => {
      if (appended)
        return

      appended = true
      void Promise.resolve().then(() => queue.enqueue(2))
    })

    queue.enqueue(1)
    await queue.waitForIdle()
    await queue.waitForIdle()

    expect(handled).toEqual([1, 2])
    expect(queue.length()).toBe(0)
  })

  it('isolates synchronous lifecycle listener failures from queue consumption', async () => {
    const handled: number[] = []
    const queue = createQueue<number>({
      handlers: [
        async ({ data }) => {
          handled.push(data)
        },
      ],
    })

    for (const eventName of ['enqueue', 'dequeue', 'process', 'result', 'drain'] as const) {
      queue.on(eventName, (() => {
        throw new Error(`${eventName} listener failed`)
      }) as never)
    }

    expect(() => {
      queue.enqueue(1)
      queue.enqueue(2)
    }).not.toThrow()
    await expect(queue.waitForIdle()).resolves.toBeUndefined()
    expect(handled).toEqual([1, 2])
  })

  it('preserves handler failure semantics when an error listener throws', async () => {
    const handled: number[] = []
    const handlerFailure = new Error('handler failed')
    const queue = createQueue<number>({
      handlers: [
        async () => {
          throw handlerFailure
        },
        async ({ data }) => {
          handled.push(data)
        },
      ],
    })
    queue.on('error', () => {
      throw new Error('error listener failed')
    })

    queue.enqueue(1)

    await expect(queue.waitForIdle()).rejects.toBe(handlerFailure)
    expect(handled).toEqual([1])
    await expect(queue.waitForIdle()).resolves.toBeUndefined()
  })
})
