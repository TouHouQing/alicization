import type { StageTextArticulationFrame } from '@proj-alicization/stage-shared'

import type { ConversationDeliveryIdentity, ConversationDeliveryState, SpeechTextTiming } from './conversation-delivery'

import { canonicalDeliveryTurn, createSilentReplyPlayer, createSpokenAudioCursor, createSpokenReplyPlanner } from './conversation-delivery'

interface AudioObservation {
  epoch: string
  segmentId: string
  text: string
  status: 'started' | 'progress' | 'completed' | 'interrupted' | 'failed'
  playedMs: number
  durationMs: number | null
  activeAudio: boolean
  timings?: SpeechTextTiming[]
}

/** Owns presentation only; content authority and computer actions stay upstream. */
export function createConversationOutputController(options: {
  state: (state: ConversationDeliveryState) => void
  frame: (frame: StageTextArticulationFrame | null) => void
  caption: (text: string) => void
  writeSpeech: (text: string) => void
  endSpeech: () => void
  cancelSpeech: (epoch: string) => void
  perform: (turnId: string) => void
  finishPerformance: (turnId: string) => void
  silentMouth: () => boolean
  rate: () => number
}) {
  let state: ConversationDeliveryState | null = null
  let planner = createSpokenReplyPlanner()
  let ended = false
  let completedCaption = ''
  let segment: { id: string, cursor: ReturnType<typeof createSpokenAudioCursor> | null, start: number | null, end: number | null, text: string } | null = null
  let searchOffset = 0
  let narration = ''
  let narrationOffsets: number[] = []
  const finishedSegments = new Set<string>()
  const playedSegments = new Map<string, number>()
  const terminal = () => !state || ['completed', 'interrupted', 'failed'].includes(state.phase)
  function commit(patch: Partial<ConversationDeliveryState> = {}) {
    if (!state)
      return
    state = { ...state, ...patch, revision: state.revision + 1, partial: planner.partial }
    options.state({ ...state })
  }
  function complete(phase: 'completed' | 'interrupted' | 'failed') {
    if (terminal())
      return
    options.frame(null)
    options.finishPerformance(state!.turnId)
    commit({ phase, currentText: '' })
  }
  const silent = createSilentReplyPlayer({
    frame: options.frame,
    rate: options.rate,
    present: (span, offset) => {
      if (!state || terminal())
        return
      options.perform(state.turnId)
      options.caption(planner.spans.filter(item => item.end <= span.start).map(item => item.text).join('') + span.text.slice(0, offset))
      commit({ phase: 'silent', currentText: span.text.slice(0, offset), start: span.start, end: Math.min(span.end, span.start + offset), alignment: null })
    },
    complete: () => complete('completed'),
  })
  function feed(spans: ReturnType<typeof planner.append>) {
    if (!state || terminal())
      return
    if (state.mode === 'silent') {
      if (options.silentMouth())
        silent.append(spans)
      else
        options.caption(planner.source)
    }
    else {
      for (const span of spans) {
        for (let index = 0; index < span.text.length; index++) {
          if (/\s/u.test(span.text[index]!))
            continue
          narration += span.text[index]
          narrationOffsets.push(span.sourceOffsets?.[index] ?? span.start + index)
        }
        options.writeSpeech(`${span.text}\n`)
      }
    }
    commit()
  }
  function cancel() {
    if (!state)
      return
    silent.cancel()
    if (!terminal()) {
      options.cancelSpeech(state.epoch)
      complete('interrupted')
    }
  }
  return {
    get current() { return state },
    get source() { return planner.source },
    begin(identity: ConversationDeliveryIdentity, mode: 'voice' | 'silent', full = false) {
      cancel()
      planner = createSpokenReplyPlanner({ full, eager: mode === 'silent' })
      ended = false
      completedCaption = ''
      searchOffset = 0
      narration = ''
      narrationOffsets = []
      finishedSegments.clear()
      playedSegments.clear()
      segment = null
      state = { cardId: identity.cardId, sessionId: identity.sessionId, epoch: identity.epoch, turnId: canonicalDeliveryTurn(identity.turnId), revision: 0, phase: 'waiting', mode, currentText: '', start: null, end: null, spokenEnd: null, playedMs: 0, partial: false, alignment: null }
      silent.begin(state.turnId)
      options.state({ ...state })
      options.caption('')
    },
    append(text: string, offset: number) {
      if (!state || ended || terminal())
        return
      if (offset !== planner.source.length)
        throw new Error('Reading and speech source cursors diverged')
      feed(planner.append(text))
    },
    finish() {
      if (!state || ended || terminal())
        return
      feed(planner.finish())
      ended = true
      if (state.mode === 'voice') {
        options.endSpeech()
        if (!planner.spans.length)
          complete('completed')
      }
      else if (options.silentMouth()) {
        silent.finish()
      }
      else {
        complete('completed')
      }
    },
    audio(event: AudioObservation) {
      if (!state || terminal() || state.mode !== 'voice' || event.epoch !== state.epoch)
        return null
      if (finishedSegments.has(event.segmentId) || !Number.isFinite(event.playedMs) || event.playedMs < 0)
        return null
      if (segment?.id !== event.segmentId) {
        // Match only text actually admitted to the TTS stream, in order. The
        // chunker may join clauses and trim whitespace, but cannot invent words.
        const normalized = event.text.replace(/\s/gu, '')
        const matches = normalized.length > 0 && narration.slice(searchOffset, searchOffset + normalized.length) === normalized
        if (!matches) {
          complete('failed')
          options.cancelSpeech(state.epoch)
          return null
        }
        const start = matches ? narrationOffsets[searchOffset]! : null
        const end = matches ? narrationOffsets[searchOffset + normalized.length - 1]! + 1 : null
        segment = { id: event.segmentId, text: event.text, start, end, cursor: event.durationMs && event.durationMs > 0 ? createSpokenAudioCursor(event.text, event.durationMs, event.timings) : null }
      }
      if (segment.text !== event.text)
        return null
      playedSegments.set(event.segmentId, Math.max(playedSegments.get(event.segmentId) ?? 0, event.playedMs))
      let end = segment.start
      if (event.activeAudio && (event.status === 'started' || event.status === 'progress')) {
        const position = segment.cursor?.at(event.playedMs, state.turnId)
        const frame = position?.frame
        const sourceOffset = frame ? narrationOffsets[searchOffset + event.text.slice(0, frame.offset).replace(/\s/gu, '').length] : undefined
        options.frame(frame && sourceOffset !== undefined ? { ...frame, offset: sourceOffset } : null)
        const visibleEnd = position?.frame ? position.frame.offset + position.frame.grapheme.length : position?.end ?? 0
        options.caption(completedCaption + event.text.slice(0, visibleEnd))
        // The current display may be estimated; durable delivery only advances
        // at a complete phrase (or trusted adapter boundary).
        end = segment.start === null ? null : segment.end
        options.perform(state.turnId)
      }
      else {
        options.frame(null)
      }
      if (event.status === 'completed') {
        completedCaption += event.text
        options.caption(completedCaption)
        if (segment.end !== null)
          searchOffset += event.text.replace(/\s/gu, '').length
        end = segment.end
        finishedSegments.add(event.segmentId)
      }
      const spokenEnd = event.status === 'completed' && segment.end !== null ? segment.end : state.spokenEnd
      commit({ phase: event.status === 'interrupted' ? 'interrupted' : event.status === 'failed' ? 'failed' : 'speaking', currentText: event.text, start: segment.start, end, spokenEnd, playedMs: [...playedSegments.values()].reduce((sum, value) => sum + value, 0), alignment: event.status === 'completed' ? 'segment' : segment.cursor?.alignment ?? null })
      if (event.status === 'interrupted' || event.status === 'failed') {
        options.finishPerformance(state.turnId)
        options.cancelSpeech(state.epoch)
      }
      return { alignedTextEnd: spokenEnd, alignmentSource: spokenEnd === null ? null : 'segment' as const, coverage: planner.partial ? 'excerpt' as const : 'complete' as const }
    },
    finishVoice(epoch: string, status: 'completed' | 'interrupted' | 'failed') {
      if (state?.epoch === epoch)
        complete(status)
    },
    cancel,
  }
}
