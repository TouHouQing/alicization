import { createQueue } from '@proj-alicization/stream-kit'
import { describe, expect, it } from 'vitest'

describe('stream-kit queue lifecycle', () => {
  it('waits until queued handlers finish processing', async () => {
    let releaseHandler: (() => void) | undefined
    const queue = createQueue<number>({
      handlers: [
        async () => {
          await new Promise<void>((resolve) => {
            releaseHandler = resolve
          })
        },
      ],
    })

    queue.enqueue(1)
    let idle = false
    const idlePromise = queue.waitForIdle().then(() => {
      idle = true
    })

    await Promise.resolve()
    expect(idle).toBe(false)
    releaseHandler?.()
    await idlePromise
    expect(idle).toBe(true)
  })

  it('resolves immediately when no work is pending', async () => {
    const queue = createQueue<number>({ handlers: [] })

    await expect(queue.waitForIdle()).resolves.toBeUndefined()
  })

  it('reports handler failures when the queue reaches idle', async () => {
    const queue = createQueue<number>({
      handlers: [
        async () => {
          throw new Error('projection failed')
        },
      ],
    })

    queue.enqueue(1)

    await expect(queue.waitForIdle()).rejects.toThrow('projection failed')
  })

  it('continues draining after an empty-handler batch completes', async () => {
    const queue = createQueue<number>({ handlers: [] })
    const dequeued: number[] = []
    queue.on('dequeue', payload => dequeued.push(payload))

    queue.enqueue(1)
    await queue.waitForIdle()
    queue.enqueue(2)
    await queue.waitForIdle()

    expect(dequeued).toEqual([1, 2])
  })

  it('drains work enqueued by a drain listener before reporting idle', async () => {
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
      queue.enqueue(2)
    })

    queue.enqueue(1)
    await queue.waitForIdle()

    expect(handled).toEqual([1, 2])
  })
})
