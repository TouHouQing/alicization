import { describe, expect, it } from 'vitest'

import { chunkEmitter, chunkTtsInput, TTS_SPECIAL_TOKEN } from './tts-chunker'

async function collectChunks(input: string) {
  const chunks = []

  for await (const chunk of chunkTtsInput(input)) {
    chunks.push(chunk)
  }

  return chunks
}

describe('tts chunker', () => {
  it('holds undersized opening clauses until the first stable sentence boundary', async () => {
    const chunks = await collectChunks(`Hey, let's begin the calibration now.`)

    expect(chunks).toEqual([
      {
        text: `Hey, let's begin the calibration now.`,
        words: 6,
        continuityHoldMs: 124,
        reason: 'hard',
      },
    ])
  })

  it('still yields an early opening chunk once the opener is substantial enough', async () => {
    const chunks = await collectChunks('Today we begin, and then we continue tomorrow.')

    expect(chunks).toEqual([
      {
        text: 'Today we begin,',
        words: 3,
        continuityHoldMs: 216,
        reason: 'boost',
      },
      {
        text: 'and then we continue tomorrow.',
        words: 5,
        continuityHoldMs: 124,
        reason: 'hard',
      },
    ])
  })

  it('preserves a held opening chunk when a special marker arrives next', async () => {
    const events: Array<{ chunk: string, special: string | null, continuityHoldMs: number, reason: string }> = []
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(`Hi.${TTS_SPECIAL_TOKEN}`))
        controller.close()
      },
    })

    await chunkEmitter(stream.getReader(), ['pause'], undefined, (chunk) => {
      events.push(chunk)
    })

    expect(events).toEqual([
      {
        chunk: 'Hi.',
        special: 'pause',
        continuityHoldMs: 156,
        reason: 'special',
      },
    ])
  })
})
