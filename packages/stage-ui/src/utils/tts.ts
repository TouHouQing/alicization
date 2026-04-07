import type {
  TtsInputChunk as PipelineTtsInputChunk,
  TtsInputChunkOptions as PipelineTtsInputChunkOptions,
} from '@proj-alicization/pipelines-audio'
import type { ReaderLike } from 'clustr'

import {
  chunkTtsInput,
  chunkEmitter as emitPipelineChunks,
  TTS_FLUSH_INSTRUCTION,
  TTS_SPECIAL_TOKEN,
} from '@proj-alicization/pipelines-audio'

export { TTS_FLUSH_INSTRUCTION, TTS_SPECIAL_TOKEN }

export type TTSInputChunk = PipelineTtsInputChunk
export type TTSInputChunkOptions = PipelineTtsInputChunkOptions

export interface TTSChunkItem {
  chunk: string
  special: string | null
  continuityHoldMs: number
}

export async function* chunkTTSInput(
  input: string | ReaderLike,
  options?: TTSInputChunkOptions,
): AsyncGenerator<TTSInputChunk, void, unknown> {
  yield* chunkTtsInput(input, options)
}

export async function chunkEmitter(
  reader: ReaderLike,
  pendingSpecials: string[],
  handler: (ttsSegment: TTSChunkItem) => Promise<void> | void,
) {
  await emitPipelineChunks(reader, pendingSpecials, undefined, async chunk => handler({
    chunk: chunk.chunk,
    special: chunk.special,
    continuityHoldMs: chunk.continuityHoldMs,
  }))
}
