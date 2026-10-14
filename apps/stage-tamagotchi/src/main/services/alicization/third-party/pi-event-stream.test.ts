import { describe, expect, it } from 'vitest'

import { createPiEventStream } from './pi-event-stream'

describe('adapted pi event stream lifecycle', () => {
  it('drains FIFO after ending and rejects late events', async () => {
    const stream = createPiEventStream<number>(3)
    expect(stream.push(1)).toBe(true)
    stream.push(2)
    stream.push(3)
    expect(stream.push(4)).toBe(false)
    stream.end()
    expect(stream.push(5)).toBe(false)
    const values = []
    for await (const value of stream) values.push(value)
    expect(values).toEqual([1, 2, 3])
  })

  it('wakes a waiting reader on close and closes when the consumer cancels', async () => {
    const stream = createPiEventStream<number>()
    const iterator = stream[Symbol.asyncIterator]()
    const pending = iterator.next()
    stream.end()
    await expect(pending).resolves.toEqual({ value: undefined, done: true })
    const cancelled = createPiEventStream<number>()
    cancelled.push(1)
    const reader = cancelled[Symbol.asyncIterator]()
    await reader.next()
    await reader.return(undefined)
    expect(cancelled.push(2)).toBe(false)
  })
})
