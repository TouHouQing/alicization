import type { SpeechTextTiming } from '@proj-alicization/pipelines-audio'
import type { StageTextArticulationFrame } from '@proj-alicization/stage-shared'

import { planChatTextPresentation, waitForPresentation } from '../../stores/chat/text-presentation'

export type { SpeechTextTiming } from '@proj-alicization/pipelines-audio'

export interface SpokenReplySpan {
  text: string
  start: number
  end: number
  /** UTF-16 boundaries in the admitted source, including Markdown omissions. */
  sourceOffsets?: number[]
}

export interface ConversationDeliveryIdentity {
  cardId: string
  sessionId: string
  turnId: string
  epoch: string
}

export interface ConversationDeliveryState extends ConversationDeliveryIdentity {
  revision: number
  phase: 'waiting' | 'speaking' | 'silent' | 'completed' | 'interrupted' | 'failed'
  mode: 'voice' | 'silent'
  currentText: string
  start: number | null
  end: number | null
  spokenEnd: number | null
  playedMs: number
  partial: boolean
  alignment: 'tts' | 'estimated' | 'segment' | null
}

export const canonicalDeliveryTurn = (turnId: string) => turnId.replace(/:gw\d+$/u, '')
export const deliveryKey = (identity: Pick<ConversationDeliveryIdentity, 'cardId' | 'sessionId' | 'turnId'>) => JSON.stringify([identity.cardId, identity.sessionId, canonicalDeliveryTurn(identity.turnId)])

export function isConversationDeliveryState(value: ConversationDeliveryState): boolean {
  return Boolean(value && [value.cardId, value.sessionId, value.turnId, value.epoch].every(item => typeof item === 'string' && item.length > 0 && item.length <= 512)
    && Number.isSafeInteger(value.revision) && value.revision >= 0
    && typeof value.currentText === 'string' && value.currentText.length <= 12000
    && ['waiting', 'speaking', 'silent', 'completed', 'interrupted', 'failed'].includes(value.phase)
    && ['voice', 'silent'].includes(value.mode) && typeof value.partial === 'boolean'
    && [null, 'tts', 'estimated', 'segment'].includes(value.alignment)
    && [value.start, value.end, value.spokenEnd].every(item => item === null || (Number.isSafeInteger(item) && item >= 0 && item <= 12000))
    && (value.start === null || value.end === null || value.end >= value.start)
    && Number.isFinite(value.playedMs) && value.playedMs >= 0 && value.playedMs <= 86400000)
}

/** An on-disk active projection is not proof that its old host still plays. */
export function restoreConversationDeliveryState(value: ConversationDeliveryState | undefined) {
  if (!value || !isConversationDeliveryState(value))
    return undefined
  return ['waiting', 'speaking', 'silent'].includes(value.phase)
    ? { ...value, phase: 'interrupted' as const, currentText: '' }
    : value
}

/** Select actual source excerpts; never generate an independent spoken answer. */
export function createSpokenReplyPlanner(options: { full?: boolean, maximumCharacters?: number, eager?: boolean } = {}) {
  let source = ''
  let cursor = 0
  let fence: string | null = null
  let selectedCharacters = 0
  let omitted = false
  let skippingUrl = false
  const spans: SpokenReplySpan[] = []
  const maximum = options.maximumCharacters ?? (options.full ? 12000 : 160)
  function drain(final: boolean) {
    const added: SpokenReplySpan[] = []
    while (cursor < source.length) {
      const remaining = source.slice(cursor)
      if (skippingUrl) {
        const boundary = remaining.search(/[\s。！？；，]/u)
        if (boundary < 0) {
          cursor = source.length
          break
        }
        cursor += boundary
        skippingUrl = false
        continue
      }
      const fenceMatch = /^\s*(```|~~~)/u.exec(remaining)
      if (fence || fenceMatch) {
        const newline = remaining.indexOf('\n', fenceMatch?.[0].length ?? 0)
        if (newline < 0 && !final)
          break
        if (fenceMatch) {
          fence = fence === fenceMatch[1] ? null : fenceMatch[1]!
        }
        else if (!options.full) {
          omitted = true
        }
        const end = newline < 0 ? source.length : cursor + newline + 1
        if (fenceMatch || !options.full) {
          omitted ||= !options.full
          cursor = end
          continue
        }
      }
      // A possible split Markdown fence must be held until its delimiter is known.
      if (!final && /^\s*[`~]{1,2}$/u.test(remaining))
        break
      const linkedUrl = /\[[^\]\n]+\]\(https?:\/\/[^)\n]*\)?/iu.exec(remaining)
      if (linkedUrl && !linkedUrl[0].endsWith(')') && !final)
        break
      let length = -1
      for (let index = 0; index < remaining.length; index++) {
        const char = remaining[index]!
        if (linkedUrl && index >= linkedUrl.index && index < linkedUrl.index + linkedUrl[0].length)
          continue
        const decimal = char === '.' && /\d/u.test(remaining[index - 1] ?? '') && (/\d/u.test(remaining[index + 1] ?? '') || (!final && index === remaining.length - 1))
        if (/[。！？!?，,;；\n.]/u.test(char) && !decimal) {
          length = index + 1
          break
        }
      }
      if (length < 0 && !final && !options.eager && remaining.length < 120)
        break
      if (length < 0)
        length = final || options.eager ? remaining.length : 120
      const url = /https?:\/\//iu.exec(remaining)
      if (!options.full && url && url.index < length && (!linkedUrl || url.index < linkedUrl.index || url.index >= linkedUrl.index + linkedUrl[0].length)) {
        omitted = true
        // Hold the entire URL across stream boundaries; never read its tail.
        if (url.index === 0) {
          cursor += url[0].length
          skippingUrl = true
          continue
        }
        length = url.index
      }
      if (!final && length === remaining.length && /\bhttps?:?\/?$/iu.test(remaining))
        break
      if (/[\uD800-\uDBFF]/u.test(remaining[length - 1] ?? ''))
        length = final ? length : length - 1
      if (length === 0)
        break
      const start = cursor
      cursor += length
      const raw = source.slice(start, cursor)
      const text = fence && options.full
        ? raw.trim()
        : raw
            .replace(/^\s*(?:#{1,6}\s+|[-*+]\s+|\d+\.\s+)/u, '')
            .replace(/\[([^\]]+)\]\([^\n)]+\)/gu, '$1')
            .replace(/(\*\*|__)(.*?)\1/gu, '$2')
            .replace(/(?<!\w)(\*|_)([^*_]+)\1(?!\w)/gu, '$2')
            .replace(/`/gu, '')
            .trim()
      if (!text)
        continue
      if ((!options.full && /https?:\/\//iu.test(text)) || selectedCharacters + text.length > maximum) {
        omitted = true
        continue
      }
      let rawOffset = 0
      const sourceOffsets: number[] = []
      for (let index = 0; index < text.length; index++) {
        rawOffset = raw.indexOf(text[index]!, rawOffset)
        sourceOffsets.push(start + rawOffset++)
      }
      sourceOffsets.push(start + rawOffset)
      const span = { text, start: sourceOffsets[0]!, end: sourceOffsets.at(-1)!, sourceOffsets }
      selectedCharacters += text.length
      spans.push(span)
      added.push(span)
    }
    return added
  }
  return {
    append(text: string) {
      source += text
      return drain(false)
    },
    finish: () => drain(true),
    get source() { return source },
    get spans() { return spans },
    get partial() { return omitted },
  }
}

/** Timing is supplied by the audio adapter, never by model-authored metadata. */
export function validateSpeechTextTimings(text: string, durationMs: number, timings: SpeechTextTiming[] | undefined) {
  if (!timings?.length || timings.length > 12000)
    return null
  let end = 0
  let endMs = 0
  for (const timing of timings) {
    if (![timing.start, timing.end].every(Number.isSafeInteger) || ![timing.startMs, timing.endMs].every(Number.isFinite)
      || timing.start < end || timing.end <= timing.start || timing.end > text.length
      || timing.startMs < endMs || timing.endMs <= timing.startMs || timing.endMs > durationMs + 50) {
      return null
    }
    end = timing.end
    endMs = timing.endMs
  }
  return timings
}

/** Estimated syllables follow the real audio playhead; they are not exact TTS alignment. */
export function createSpokenAudioCursor(text: string, durationMs: number, suppliedTimings?: SpeechTextTiming[]) {
  const units = planChatTextPresentation(text)
  const exact = validateSpeechTextTimings(text, durationMs, suppliedTimings)
  const weight = units.reduce((sum, unit) => sum + unit.durationMs, 0)
  let elapsed = 0
  const estimated = units.map((unit) => {
    const startMs = elapsed
    elapsed += weight ? unit.durationMs / weight * durationMs : 0
    return { start: unit.offset, end: unit.offset + unit.grapheme.length, startMs, endMs: elapsed }
  })
  const timings = exact ?? estimated
  return {
    alignment: exact ? 'tts' as const : 'estimated' as const,
    at(playedMs: number, turnId: string): { frame: StageTextArticulationFrame | null, end: number } {
      const time = Math.max(0, Math.min(durationMs, playedMs))
      const timing = timings.find(item => item.startMs <= time && item.endMs > time)
      const end = timings.filter(item => item.endMs <= time).at(-1)?.end ?? 0
      if (!timing)
        return { frame: null, end }
      const wordUnits = units.filter(unit => unit.offset >= timing.start && unit.offset < timing.end)
      const wordWeight = wordUnits.reduce((sum, unit) => sum + unit.durationMs, 0)
      let unitStart = timing.startMs
      let unitEnd = unitStart
      const unit = wordUnits.find((unit) => {
        unitStart = unitEnd
        unitEnd += (timing.endMs - timing.startMs) * unit.durationMs / wordWeight
        return time < unitEnd
      })
      if (!unit)
        return { frame: null, end }
      return { end, frame: { ...unit, turnId, startedAt: Date.now(), durationMs: unitEnd - unitStart, audioElapsedMs: time - unitStart, clock: 'audio' } }
    },
  }
}

/** Silent articulation can finish after reading; a newer owner always cancels it. */
export function createSilentReplyPlayer(options: {
  frame: (frame: StageTextArticulationFrame | null) => void
  present: (span: SpokenReplySpan, offset: number) => void
  complete: () => void
  rate?: () => number
}) {
  let controller = new AbortController()
  let turnId = ''
  let queue: Array<{ span: SpokenReplySpan, units: ReturnType<typeof planChatTextPresentation> }> = []
  let pronunciationContext = ''
  let ended = false
  let running: Promise<void> | null = null
  function start() {
    const signal = controller.signal
    running ??= (async () => {
      while (queue.length && !signal.aborted) {
        const { span, units } = queue.shift()!
        for (const unit of units) {
          if (signal.aborted)
            return
          const durationMs = unit.durationMs / Math.max(0.5, Math.min(2, options.rate?.() ?? 1))
          options.frame({ ...unit, offset: span.sourceOffsets?.[unit.offset] ?? span.start + unit.offset, durationMs, turnId, startedAt: Date.now() })
          options.present(span, unit.offset + unit.grapheme.length)
          await waitForPresentation(durationMs, signal)
        }
      }
    })().finally(() => {
      if (signal !== controller.signal)
        return
      running = null
      if (signal.aborted)
        return
      options.frame(null)
      if (ended)
        options.complete()
      else if (queue.length)
        start()
    })
  }
  function cancel() {
    controller.abort()
    queue = []
    running = null
    options.frame(null)
  }
  return {
    begin(id: string) {
      cancel()
      controller = new AbortController()
      turnId = id
      ended = false
      pronunciationContext = ''
    },
    append(spans: SpokenReplySpan[]) {
      for (const span of spans) {
        const prefix = pronunciationContext
        const units = planChatTextPresentation(prefix + span.text)
          .filter(unit => unit.offset >= prefix.length)
          .map(unit => ({ ...unit, offset: unit.offset - prefix.length }))
        queue.push({ span, units })
        pronunciationContext = (prefix + span.text).slice(-32)
      }
      if (spans.length)
        start()
    },
    finish() {
      ended = true
      if (!running)
        options.complete()
    },
    cancel,
  }
}
