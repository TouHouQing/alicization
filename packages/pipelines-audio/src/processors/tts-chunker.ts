import type { ReaderLike } from 'clustr'

import type { SpeechIntentMetadata, TextSegment, TextToken } from '../types'

import { readGraphemeClusters } from 'clustr'

import { createPushStream } from '../stream'

export const TTS_FLUSH_INSTRUCTION = '\u200B'
export const TTS_SPECIAL_TOKEN = '\u2063'

const keptPunctuations = new Set('?？!！')
const hardPunctuations = new Set('.。?？!！…⋯～~\n\t\r')
const softPunctuations = new Set(',，、–—:：;；《》「」')

export interface TtsInputChunk {
  text: string
  words: number
  continuityHoldMs: number
  reason: 'boost' | 'limit' | 'hard' | 'flush' | 'special'
}

export interface TtsInputChunkOptions {
  boost?: number
  minimumWords?: number
  maximumWords?: number
  bootstrapMinimumWords?: number
  bootstrapMinimumCharacters?: number
}

export interface TtsChunkItem {
  chunk: string
  special: string | null
  continuityHoldMs: number
  reason: 'boost' | 'limit' | 'hard' | 'flush' | 'special'
}

function countWordLikeSegments(segmenter: Intl.Segmenter, text: string) {
  return [...segmenter.segment(text)].filter(part => part.isWordLike).length
}

function countTrimmedCharacters(text: string) {
  return Array.from(text.trim()).length
}

function clampRange(value: number, min: number, max: number) {
  if (!Number.isFinite(value))
    return min

  return Math.min(max, Math.max(min, value))
}

// Hold undersized opening clauses a little longer so the first TTS request
// carries enough linguistic context for smoother bootstrap and lip-sync cadence.
function shouldHoldBootstrapChunk(input: {
  yieldCount: number
  reason: TtsInputChunk['reason']
  text: string
  words: number
  bootstrapMinimumWords: number
  bootstrapMinimumCharacters: number
}) {
  if (input.yieldCount > 0)
    return false

  if (input.reason === 'flush' || input.reason === 'limit' || input.reason === 'special')
    return false

  if (!input.text.trim())
    return false

  return input.words < input.bootstrapMinimumWords
    && countTrimmedCharacters(input.text) < input.bootstrapMinimumCharacters
}

// Carry a small cross-segment tail so tiny TTS chunks do not collapse the mouth
// and expression state between adjacent audio pieces.
function resolveChunkContinuityHoldMs(input: {
  reason: TtsInputChunk['reason']
  text: string
}) {
  const trimmedText = input.text.trim()
  if (!trimmedText)
    return 0

  const characterCount = countTrimmedCharacters(trimmedText)
  const endsWithSoftPause = /[，,、:：;；]$/.test(trimmedText)
  const endsWithHardPause = /[。.!！？?…]$/.test(trimmedText)

  let holdMs = 110
  if (input.reason === 'boost')
    holdMs += 70
  else if (input.reason === 'limit')
    holdMs += 46
  else if (input.reason === 'flush')
    holdMs += 36
  else if (input.reason === 'hard')
    holdMs += 18

  if (endsWithSoftPause)
    holdMs += 36
  else if (endsWithHardPause)
    holdMs += 14

  if (characterCount <= 8)
    holdMs += 32
  else if (characterCount >= 28)
    holdMs -= 18

  return Math.round(clampRange(holdMs, 80, 260))
}

export async function* chunkTtsInput(
  input: string | ReaderLike,
  options?: TtsInputChunkOptions,
): AsyncGenerator<TtsInputChunk, void, unknown> {
  const {
    boost = 2,
    minimumWords = 4,
    maximumWords = 12,
    bootstrapMinimumWords = 2,
    bootstrapMinimumCharacters = 8,
  } = options ?? {}

  const iterator = readGraphemeClusters(
    typeof input === 'string'
      ? new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode(input))
            controller.close()
          },
        }).getReader()
      : input,
  )

  const segmenter = new Intl.Segmenter(undefined, { granularity: 'word' }) // I love Intl.Segmenter

  let yieldCount = 0
  let buffer = ''
  let chunk = ''
  let chunkWordsCount = 0

  let previousValue: string | undefined
  let current = await iterator.next()

  while (!current.done) {
    let value = current.value

    if (value.length > 1) {
      previousValue = value
      current = await iterator.next()
      continue
    }

    const flush = value === TTS_FLUSH_INSTRUCTION
    const special = value === TTS_SPECIAL_TOKEN
    const hard = hardPunctuations.has(value)
    const soft = softPunctuations.has(value)
    const kept = keptPunctuations.has(value)
    let next: IteratorResult<string, any> | undefined
    let afterNext: IteratorResult<string, any> | undefined

    if (flush || special || hard || soft) {
      switch (value) {
        case '.':
        case ',': {
          if (previousValue !== undefined && /\d/.test(previousValue)) {
            next = await iterator.next()
            if (!next.done && next.value && /\d/.test(next.value)) {
              buffer += value
              current = next
              next = undefined
              continue
            }
          }
          else if (value === '.') {
            next = await iterator.next()
            if (!next.done && next.value && next.value === '.') {
              afterNext = await iterator.next()
              if (!afterNext.done && afterNext.value && afterNext.value === '.') {
                value = '…'
                next = undefined
                afterNext = undefined
              }
            }
          }
        }
      }

      if (buffer.length === 0 && chunk.length === 0) {
        if (special) {
          yield {
            text: '',
            words: 0,
            continuityHoldMs: 0,
            reason: 'special',
          }
          yieldCount++
          chunkWordsCount = 0
        }

        previousValue = value
        current = await iterator.next()
        continue
      }

      const words = countWordLikeSegments(segmenter, buffer)

      if (chunkWordsCount > minimumWords && chunkWordsCount + words > maximumWords) {
        const text = kept ? chunk.trim() + value : chunk.trim()
        yield {
          text,
          words: chunkWordsCount,
          continuityHoldMs: resolveChunkContinuityHoldMs({ reason: 'limit', text }),
          reason: 'limit',
        }
        yieldCount++
        chunk = ''
        chunkWordsCount = 0
      }

      chunk += buffer + value
      chunkWordsCount += words
      buffer = ''

      if (special) {
        const text = chunk.slice(0, -1).trim()
        yield {
          text,
          words: chunkWordsCount,
          continuityHoldMs: resolveChunkContinuityHoldMs({ reason: 'special', text }),
          reason: 'special',
        }
        yieldCount++
        chunk = ''
        chunkWordsCount = 0
      }
      else if (flush || hard || chunkWordsCount > maximumWords || yieldCount < boost) {
        const text = chunk.trim()
        const reason = flush ? 'flush' : hard ? 'hard' : chunkWordsCount > maximumWords ? 'limit' : 'boost'

        if (shouldHoldBootstrapChunk({
          yieldCount,
          reason,
          text,
          words: chunkWordsCount,
          bootstrapMinimumWords,
          bootstrapMinimumCharacters,
        })) {
          previousValue = value
          if (next !== undefined) {
            if (afterNext !== undefined) {
              current = afterNext
              next = undefined
              afterNext = undefined
            }
            else {
              current = next
              next = undefined
            }
          }
          else {
            current = await iterator.next()
          }
          continue
        }

        yield {
          text,
          words: chunkWordsCount,
          continuityHoldMs: resolveChunkContinuityHoldMs({ reason, text }),
          reason,
        }
        yieldCount++
        chunk = ''
        chunkWordsCount = 0
      }

      previousValue = value
      if (next !== undefined) {
        if (afterNext !== undefined) {
          current = afterNext
          next = undefined
          afterNext = undefined
        }
        else {
          current = next
          next = undefined
        }
      }
      else {
        current = await iterator.next()
      }
      continue
    }

    buffer += value
    previousValue = value
    next = await iterator.next()
    current = next
  }

  if (chunk.length > 0 || buffer.length > 0) {
    const text = (chunk + buffer).trim()
    yield {
      text,
      words: chunkWordsCount + countWordLikeSegments(segmenter, buffer),
      continuityHoldMs: resolveChunkContinuityHoldMs({ reason: 'flush', text }),
      reason: 'flush',
    }
  }
}

export async function chunkEmitter(
  reader: ReaderLike,
  pendingSpecials: string[],
  options: TtsInputChunkOptions | undefined,
  handler: (ttsSegment: TtsChunkItem) => Promise<void> | void,
) {
  const sanitizeChunk = (text: string) =>
    text
      .replaceAll(TTS_SPECIAL_TOKEN, '')
      .replaceAll(TTS_FLUSH_INSTRUCTION, '')
      .trim()

  try {
    for await (const chunk of chunkTtsInput(reader, options)) {
      // TODO: remove later

      if (chunk.reason === 'special') {
        const specialToken = pendingSpecials.shift()
        // console.debug("special yield:", specialToken)
        await handler({
          chunk: sanitizeChunk(chunk.text),
          special: specialToken ?? null,
          continuityHoldMs: chunk.continuityHoldMs,
          reason: chunk.reason,
        })
      }
      else {
        await handler({
          chunk: sanitizeChunk(chunk.text),
          special: null,
          continuityHoldMs: chunk.continuityHoldMs,
          reason: chunk.reason,
        })
      }
    }
  }
  catch (e) {
    console.error('Error chunking stream to TTS queue:', e)
  }
}

export function createTtsSegmentStream(
  tokens: ReadableStream<TextToken>,
  meta: {
    streamId: string
    intentId: string
    metadata?: SpeechIntentMetadata | null
  },
  options?: TtsInputChunkOptions,
) {
  const { stream, write, close, error } = createPushStream<TextSegment>()
  const pendingSpecials: string[] = []
  const encoder = new TextEncoder()

  const { stream: byteStream, write: writeBytes, close: closeBytes, error: errorBytes } = createPushStream<Uint8Array>()

  void (async () => {
    const reader = tokens.getReader()
    try {
      while (true) {
        const { value, done } = await reader.read()
        if (done)
          break
        if (!value)
          continue

        if (value.type === 'literal') {
          if (value.value)
            writeBytes(encoder.encode(value.value))
        }
        else if (value.type === 'special') {
          pendingSpecials.push(value.value ?? '')
          writeBytes(encoder.encode(TTS_SPECIAL_TOKEN))
        }
        else if (value.type === 'flush') {
          writeBytes(encoder.encode(TTS_FLUSH_INSTRUCTION))
        }
      }
      closeBytes()
    }
    catch (err) {
      errorBytes(err)
    }
    finally {
      reader.releaseLock()
    }
  })()

  void (async () => {
    try {
      const reader = byteStream.getReader()
      await chunkEmitter(reader, pendingSpecials, options, async (chunk) => {
        write({
          streamId: meta.streamId,
          intentId: meta.intentId,
          segmentId: `${meta.streamId}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
          text: chunk.chunk,
          special: chunk.special,
          reason: chunk.reason,
          continuityHoldMs: chunk.continuityHoldMs,
          createdAt: Date.now(),
          ...(meta.metadata != null ? { metadata: meta.metadata } : {}),
        })
      })
      close()
    }
    catch (err) {
      error(err)
    }
  })()

  return stream
}
