export interface StageSpeechReceiptInput {
  cardId: string
  turnId: string
  utteranceId: string
  playbackEpoch: string
  state: 'audio-started' | 'audio-progress' | 'audio-ended' | 'audio-interrupted' | 'audio-failed'
  playedMs: number
  errorCode: string | null
  alignedTextEnd?: number | null
  alignmentSource?: 'tts' | 'viseme' | 'segment' | null
  coverage?: 'complete' | 'excerpt'
}
