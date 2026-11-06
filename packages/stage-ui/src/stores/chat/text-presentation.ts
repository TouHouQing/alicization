import type { StageTextPresentation } from '@proj-alicization/stage-shared'

import { pinyin } from 'pinyin-pro'

const graphemes = new Intl.Segmenter(undefined, { granularity: 'grapheme' })
const syllableMs = 230

/** Delivery timestamp belongs to this UI cursor, not the timeless phoneme plan. */
export interface PresentedChatTextUnit extends StageTextPresentation {
  presentedAt: number
}

export interface PresentedChatTextChunk {
  text: string
  offset: number
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
      // Independent articulation tempo: about four Mandarin syllables/second,
      // with phrase-final lengthening and real breath gaps.
      durationMs: script === 'pinyin' ? (endsPhrase ? 290 : syllableMs) : script === 'latin' ? 85 : /[。！？.!?\n]/.test(grapheme) ? 440 : /[，,;；:：、]/.test(grapheme) ? 260 : 45,
      endsPhrase,
    }
  })
}

export function waitForPresentation(ms: number, signal: AbortSignal): Promise<void> {
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

/** Reading consumes admitted network chunks; articulation owns a separate clock. */
export function createChatTextPresenter(options: {
  signal: AbortSignal
  isCurrent: () => boolean
  present: (chunk: Omit<PresentedChatTextChunk, 'presentedAt'>, visibleText: string) => Promise<number>
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
          const offset = visible.length
          const text = received.slice(offset)
          visible += text
          const committedAt = await options.present({ text, offset }, visible)
          if (!Number.isFinite(committedAt))
            throw new TypeError('Text presentation needs its UI commit timestamp')
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

/** Complete-body adapter for explicit non-streaming callers. */
export async function presentChatText(options: {
  text: string
  signal: AbortSignal
  isCurrent: () => boolean
  present: (chunk: Omit<PresentedChatTextChunk, 'presentedAt'>, visibleText: string) => Promise<number>
}) {
  if (!options.text)
    return !options.signal.aborted && options.isCurrent()
  const presenter = createChatTextPresenter(options)
  presenter.append(options.text)
  return presenter.finish(options.text)
}
