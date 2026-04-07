export type PriorityLevel = 'critical' | 'high' | 'normal' | 'low'

export interface PriorityResolver {
  resolve: (priority?: PriorityLevel | number) => number
}

export type SpeechIntentMetadata = Record<string, unknown>

export interface TextToken {
  type: 'literal' | 'special' | 'flush'
  value?: string
  streamId: string
  intentId: string
  sequence: number
  createdAt: number
  metadata?: SpeechIntentMetadata | null
}

export interface TextSegment {
  streamId: string
  intentId: string
  segmentId: string
  text: string
  special: string | null
  reason: 'boost' | 'limit' | 'hard' | 'flush' | 'special'
  continuityHoldMs: number
  createdAt: number
  metadata?: SpeechIntentMetadata | null
}

export interface TtsRequest {
  streamId: string
  intentId: string
  segmentId: string
  text: string
  special: string | null
  continuityHoldMs: number
  priority: number
  createdAt: number
  metadata?: SpeechIntentMetadata | null
}

export interface SpeechAudioChunk<TAudio> {
  audio: TAudio
  createdAt?: number
  sequence?: number
}

// `SpeechAudioSource` keeps the pipeline transport-agnostic: providers can return
// a ready buffer today or a lazy chunk stream later without changing queueing APIs.
export interface BufferedSpeechAudioSource<TAudio> {
  kind: 'buffer'
  audio: TAudio
}

export interface StreamingSpeechAudioSource<TAudio> {
  kind: 'stream'
  stream: ReadableStream<SpeechAudioChunk<TAudio>>
}

export type SpeechAudioSource<TAudio>
  = | BufferedSpeechAudioSource<TAudio>
    | StreamingSpeechAudioSource<TAudio>

export function createSpeechAudioChunk<TAudio>(
  audio: TAudio,
  options?: Omit<SpeechAudioChunk<TAudio>, 'audio'>,
): SpeechAudioChunk<TAudio> {
  return {
    audio,
    createdAt: options?.createdAt,
    sequence: options?.sequence,
  }
}

export function createBufferedSpeechAudioSource<TAudio>(audio: TAudio): BufferedSpeechAudioSource<TAudio> {
  return {
    kind: 'buffer',
    audio,
  }
}

export function createStreamingSpeechAudioSource<TAudio>(
  stream: ReadableStream<SpeechAudioChunk<TAudio>>,
): StreamingSpeechAudioSource<TAudio> {
  return {
    kind: 'stream',
    stream,
  }
}

export function isBufferedSpeechAudioSource<TAudio>(
  value: SpeechAudioSource<TAudio>,
): value is BufferedSpeechAudioSource<TAudio> {
  return value.kind === 'buffer'
}

export function isStreamingSpeechAudioSource<TAudio>(
  value: SpeechAudioSource<TAudio>,
): value is StreamingSpeechAudioSource<TAudio> {
  return value.kind === 'stream'
}

export interface TtsResult<TAudio> {
  streamId: string
  intentId: string
  segmentId: string
  text: string
  special: string | null
  continuityHoldMs: number
  audio: TAudio
  createdAt: number
  metadata?: SpeechIntentMetadata | null
}

export type TtsSkipReason = 'empty-audio' | 'tts-error'

export interface TtsSkipped {
  request: TtsRequest
  reason: TtsSkipReason
  createdAt: number
}

export interface PlaybackItem<TAudio> {
  id: string
  streamId: string
  intentId: string
  segmentId: string
  ownerId?: string
  priority: number
  text: string
  special: string | null
  continuityHoldMs: number
  audio: TAudio
  createdAt: number
  metadata?: SpeechIntentMetadata | null
}

export interface PlaybackStartEvent<TAudio> {
  item: PlaybackItem<TAudio>
  startedAt: number
}

export interface PlaybackEndEvent<TAudio> {
  item: PlaybackItem<TAudio>
  endedAt: number
}

export interface PlaybackInterruptEvent<TAudio> {
  item: PlaybackItem<TAudio>
  reason: string
  interruptedAt: number
}

export interface PlaybackRejectEvent<TAudio> {
  item: PlaybackItem<TAudio>
  reason: string
}

export type IntentBehavior = 'queue' | 'interrupt' | 'replace'

export interface IntentOptions {
  intentId?: string
  streamId?: string
  priority?: PriorityLevel | number
  ownerId?: string
  behavior?: IntentBehavior
  metadata?: SpeechIntentMetadata | null
}

export interface IntentHandle {
  intentId: string
  streamId: string
  priority: number
  ownerId?: string
  writeLiteral: (text: string) => void
  writeSpecial: (special: string) => void
  writeFlush: () => void
  end: () => void
  cancel: (reason?: string) => void
  stream: ReadableStream<TextToken>
}

export interface SpeechPipelineEvents<TAudio> {
  onSegment: (segment: TextSegment) => void
  onSpecial: (segment: TextSegment) => void
  onTtsRequest: (request: TtsRequest) => void
  onTtsResult: (result: TtsResult<TAudio>) => void
  onTtsSkipped: (event: TtsSkipped) => void
  onPlaybackStart: (event: PlaybackStartEvent<TAudio>) => void
  onPlaybackEnd: (event: PlaybackEndEvent<TAudio>) => void
  onPlaybackInterrupt: (event: PlaybackInterruptEvent<TAudio>) => void
  onPlaybackReject: (event: PlaybackRejectEvent<TAudio>) => void
  onIntentStart: (intentId: string) => void
  onIntentEnd: (intentId: string) => void
  onIntentCancel: (intentId: string, reason?: string) => void
}

export interface LoggerLike {
  debug: (message: string, ...args: unknown[]) => void
  info: (message: string, ...args: unknown[]) => void
  warn: (message: string, ...args: unknown[]) => void
  error: (message: string, ...args: unknown[]) => void
}
