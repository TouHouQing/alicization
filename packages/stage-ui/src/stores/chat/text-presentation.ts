import type { StageTextPresentation } from '@proj-alicization/stage-shared'

import { pinyin } from 'pinyin-pro'

const graphemes = new Intl.Segmenter(undefined, { granularity: 'grapheme' })
const syllableMs = 230

/** Delivery timestamp belongs to this UI cursor, not the timeless phoneme plan. */
export interface PresentedChatTextUnit extends StageTextPresentation {
  presentedAt: number
}

export function planChatTextPresentation(text: string): StageTextPresentation[] {
  // Resolve whole Han runs so 重庆/银行/重新 keep their contextual readings.
  const readings = new Map<number, string>()
  for (const match of text.matchAll(/\p{Script=Han}+/gu)) {
    const syllables = pinyin(match[0], { toneType: 'none', type: 'array' })
    let offset = match.index
    for (const [index, char] of [...match[0]].entries()) {
      readings.set(offset, syllables[index] ?? '')
      offset += char.length
    }
  }
  const segments = [...graphemes.segment(text)]
  return segments.map(({ segment: grapheme, index: offset }, index) => {
    const phoneme = readings.get(offset) ?? (/^\d$/.test(grapheme) ? ['ling', 'yi', 'er', 'san', 'si', 'wu', 'liu', 'qi', 'ba', 'jiu'][Number(grapheme)] : undefined)
    const script = phoneme ? 'pinyin' : /^[a-z]$/i.test(grapheme) ? 'latin' : 'silent'
    const endsPhrase = index === segments.length - 1 || /^[，。！？,.!?;；:：\n]/.test(segments[index + 1]?.segment ?? '')
    return {
      grapheme,
      phoneme: phoneme ?? grapheme.toLowerCase(),
      script,
      offset,
      // One shared clock for the visible text and body: about four Mandarin
      // syllables/second, with phrase-final lengthening and real breath gaps.
      durationMs: script === 'pinyin' ? (endsPhrase ? 290 : syllableMs) : script === 'latin' ? 85 : /[。！？.!?\n]/.test(grapheme) ? 440 : /[，,;；:：、]/.test(grapheme) ? 260 : 45,
      endsPhrase,
    }
  })
}

function waitForPresentation(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    let timer: ReturnType<typeof setTimeout>
    const finish = () => {
      clearTimeout(timer)
      signal.removeEventListener('abort', finish)
      resolve()
    }
    timer = setTimeout(finish, ms)
    signal.addEventListener('abort', finish, { once: true })
    if (signal.aborted)
      finish()
  })
}

/** Receiving never waits for mouth pacing; one cursor consumes the admitted body. */
export function createChatTextPresenter(options: {
  signal: AbortSignal
  isCurrent: () => boolean
  present: (unit: StageTextPresentation, visibleText: string) => Promise<number>
  wait?: (ms: number, signal: AbortSignal) => Promise<void>
}) {
  const controller = new AbortController()
  const signal = AbortSignal.any([options.signal, controller.signal])
  let received = ''
  let visible = ''
  let ended = false
  let failure: unknown
  let wake: (() => void) | undefined
  let work: Promise<boolean> | undefined
  let nextSequence = 0
  let sealedSequence: number | undefined
  const packets = new Map<number, { offset: number, text: string }>()
  const notify = () => {
    wake?.()
    wake = undefined
  }
  signal.addEventListener('abort', notify, { once: true })
  const current = () => !signal.aborted && options.isCurrent()
  const run = async () => {
    try {
      while (current()) {
        if (visible.length < received.length) {
          // A bounded context window preserves readings such as 银行 without
          // reparsing the complete reply on every displayed character.
          let start = Math.max(0, visible.length - 32)
          if (start && /[\uDC00-\uDFFF]/u.test(received[start]!))
            start--
          const contextual = planChatTextPresentation(received.slice(start, visible.length + 64)).find(unit => unit.offset === visible.length - start)
          // A later ZWJ/combining mark may extend an already visible grapheme.
          // Append that silent continuation without losing UTF-16 cursor order.
          const unit = contextual ?? planChatTextPresentation(received.slice(visible.length, visible.length + 64))[0]!
          unit.offset += contextual ? start : visible.length
          if (!ended && unit.offset + unit.grapheme.length === received.length) {
            unit.endsPhrase = false
            if (unit.script === 'pinyin')
              unit.durationMs = syllableMs
          }
          visible += unit.grapheme
          const committedAt = await options.present(unit, visible)
          if (!Number.isFinite(committedAt))
            throw new TypeError('Text presentation needs its UI commit timestamp')
          await (options.wait ?? waitForPresentation)(Math.max(0, unit.durationMs - Math.max(0, Date.now() - committedAt)), signal)
        }
        else if (ended) {
          return true
        }
        else {
          await new Promise<void>((resolve) => {
            wake = resolve
            if (!current() || ended || visible.length < received.length)
              notify()
          })
        }
      }
      return false
    }
    catch (error) {
      failure = error
      controller.abort()
      return false
    }
    finally {
      signal.removeEventListener('abort', notify)
    }
  }
  const start = () => {
    work ??= run()
  }
  return {
    get receivedText() { return received },
    get visibleText() { return visible },
    append(text: string, packet?: { offset: number, sequence: number }) {
      if (failure)
        throw failure
      if (!current() || ended)
        return false
      if (packet) {
        const previous = packets.get(packet.sequence)
        if (previous && previous.offset === packet.offset && previous.text === text)
          return false
        if (sealedSequence !== undefined)
          throw new Error('Public reply stream is already complete')
        if (packet.offset !== received.length || packet.sequence !== nextSequence)
          throw new Error('Out-of-order public reply stream')
        packets.set(packet.sequence, { offset: packet.offset, text })
        nextSequence++
      }
      if (!text || received.length + text.length > 12_000)
        throw new Error('Invalid public reply stream size')
      received += text
      start()
      notify()
      return true
    },
    async finish(text: string) {
      if (!text.startsWith(received) || (sealedSequence !== undefined && text !== received))
        throw new Error('Final reply cannot replace already received text')
      if (text.length > received.length)
        this.append(text.slice(received.length))
      ended = true
      start()
      notify()
      const completed = await work!
      if (failure)
        throw failure
      return completed
    },
    seal(text: string, packet: { offset: number, sequence: number }) {
      if (packet.offset !== received.length || text !== received || (packet.sequence !== nextSequence && packet.sequence !== sealedSequence))
        throw new Error('Invalid public reply completion')
      sealedSequence = packet.sequence
    },
    async cancel() {
      controller.abort()
      notify()
      await work
    },
  }
}

/** Complete-body adapter over the same clock, for explicit non-streaming callers. */
export async function presentChatText(options: {
  text: string
  signal: AbortSignal
  isCurrent: () => boolean
  present: (unit: StageTextPresentation, visibleText: string) => Promise<number>
  wait?: (ms: number, signal: AbortSignal) => Promise<void>
}) {
  if (!options.text)
    return !options.signal.aborted && options.isCurrent()
  const presenter = createChatTextPresenter(options)
  presenter.append(options.text)
  return presenter.finish(options.text)
}
