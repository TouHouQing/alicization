// SPDX-License-Identifier: MIT
// Adapted from pi packages/ai/src/utils/event-stream.ts at b2b5c42f6138b73ec4b2f49ec0ca468800f88586.
// Copyright (c) 2025 Mario Zechner. Full notice: ./pi-license.txt.
// Changes: functional API, one consumer, bounded queue, explicit close/drain.

function fifo<T>() {
  const incoming: T[] = []
  const outgoing: T[] = []
  return {
    get length() { return incoming.length + outgoing.length },
    enqueue(value: T) { incoming.push(value) },
    dequeue(): T | undefined {
      if (!outgoing.length) {
        while (incoming.length)
          outgoing.push(incoming.pop()!)
      }
      return outgoing.pop()
    },
  }
}

export function createPiEventStream<T>(capacity = 64) {
  if (!Number.isSafeInteger(capacity) || capacity < 1)
    throw new TypeError('Event stream capacity must be a positive integer')
  const queue = fifo<T>()
  let waiting: ((result: IteratorResult<T>) => void) | null = null
  let closed = false
  let consumed = false
  const end = () => {
    closed = true
    waiting?.({ value: undefined, done: true })
    waiting = null
  }
  return {
    push(event: T) {
      if (closed || queue.length >= capacity)
        return false
      if (waiting) {
        const consumer = waiting
        waiting = null
        consumer({ value: event, done: false })
      }
      else {
        queue.enqueue(event)
      }
      return true
    },
    end,
    async* [Symbol.asyncIterator](): AsyncGenerator<T> {
      if (consumed)
        throw new Error('Event stream admits one consumer')
      consumed = true
      try {
        while (true) {
          if (queue.length) {
            yield queue.dequeue()!
          }
          else if (closed) {
            return
          }
          else {
            const item = await new Promise<IteratorResult<T>>((resolve) => {
              waiting = resolve
            })
            if (item.done)
              return
            yield item.value
          }
        }
      }
      finally {
        end()
      }
    },
  }
}
