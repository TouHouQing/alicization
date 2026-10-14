import type { PlaybackResult, SpeechIntentMetadata, UtterancePlaybackResultEvent } from '../types'

interface Utterance {
  streamId: string
  metadata: SpeechIntentMetadata | null
  segments: Map<string, { scheduled: boolean, result: PlaybackResult | null }>
  sealed: boolean
  forced: 'interrupted' | 'failed' | null
}

export function createUtterancePlaybackTracker(emit: (event: UtterancePlaybackResultEvent) => void) {
  const utterances = new Map<string, Utterance>()
  function finish(intentId: string) {
    const utterance = utterances.get(intentId)
    if (!utterance?.sealed || [...utterance.segments.values()].some(segment => !segment.result))
      return
    const results = [...utterance.segments.values()].map(segment => segment.result!)
    const status = utterance.forced ?? (results.some(result => result.status === 'interrupted') ? 'interrupted' : !results.length || results.some(result => result.status === 'failed') ? 'failed' : 'completed')
    utterances.delete(intentId)
    emit({ intentId, streamId: utterance.streamId, metadata: utterance.metadata, segmentCount: results.length, completedSegments: results.filter(result => result.status === 'completed').length, result: { status, playedMs: results.reduce((sum, result) => sum + result.playedMs, 0), errorCode: status === 'completed' ? null : results.find(result => result.errorCode)?.errorCode ?? (results.length ? status : 'empty-utterance') } })
  }
  function plan(intentId: string, streamId: string, segmentId: string, metadata: SpeechIntentMetadata | null) {
    let utterance = utterances.get(intentId)
    if (!utterance) {
      utterance = { streamId, metadata, segments: new Map(), sealed: false, forced: null }
      utterances.set(intentId, utterance)
    }
    if (utterance.sealed || utterance.segments.has(segmentId))
      throw new Error('Utterance plan is sealed or contains a duplicate segment')
    utterance.segments.set(segmentId, { scheduled: false, result: null })
  }
  function scheduled(intentId: string, segmentId: string) {
    const segment = utterances.get(intentId)?.segments.get(segmentId)
    if (segment)
      segment.scheduled = true
  }
  function observe(intentId: string, segmentId: string, result: PlaybackResult) {
    const segment = utterances.get(intentId)?.segments.get(segmentId)
    if (!segment || segment.result)
      return
    segment.result = result
    finish(intentId)
  }
  function seal(intentId: string, streamId: string, metadata: SpeechIntentMetadata | null, forced: Utterance['forced'] = null) {
    let utterance = utterances.get(intentId)
    if (!utterance) {
      utterance = { streamId, metadata, segments: new Map(), sealed: false, forced }
      utterances.set(intentId, utterance)
    }
    utterance.sealed = true
    utterance.forced = forced
    if (forced) {
      for (const segment of utterance.segments.values()) {
        if (!segment.scheduled && !segment.result)
          segment.result = { status: forced, playedMs: 0, errorCode: 'generation-stopped' }
      }
    }
    finish(intentId)
  }
  return { plan, scheduled, observe, seal }
}
