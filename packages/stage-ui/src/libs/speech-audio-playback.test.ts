import {
  createBufferedSpeechAudioSource,
  createSpeechAudioChunk,
  createStreamingSpeechAudioSource,
} from '@proj-alicization/pipelines-audio'
import { describe, expect, it, vi } from 'vitest'

import { playBrowserSpeechAudio } from './speech-audio-playback'

class FakeAudioNode {
  connections: unknown[] = []

  connect(target: unknown) {
    this.connections.push(target)
    return target
  }

  disconnect(target?: unknown) {
    if (!target) {
      this.connections = []
      return
    }

    this.connections = this.connections.filter(connection => connection !== target)
  }
}

class FakeGainNode extends FakeAudioNode {}

class FakeBufferSourceNode extends FakeAudioNode {
  buffer?: AudioBuffer
  onended: (() => void) | null = null
  startCalls: number[] = []
  stopped = false

  start(when = 0) {
    this.startCalls.push(when)
    queueMicrotask(() => {
      if (!this.stopped)
        this.onended?.()
    })
  }

  stop() {
    this.stopped = true
    this.onended?.()
  }
}

class FakeAudioContext {
  state = 'running'
  currentTime = 4
  destination = new FakeAudioNode() as unknown as AudioDestinationNode
  createdSources: FakeBufferSourceNode[] = []
  createdGains: FakeGainNode[] = []

  createBufferSource() {
    const source = new FakeBufferSourceNode()
    this.createdSources.push(source)
    return source as unknown as AudioBufferSourceNode
  }

  createGain() {
    const gain = new FakeGainNode()
    this.createdGains.push(gain)
    return gain as unknown as GainNode
  }
}

describe('playBrowserSpeechAudio', () => {
  it('settles cancellation while browser autoplay keeps resume pending', async () => {
    const audioContext = new FakeAudioContext()
    audioContext.state = 'suspended'
    const context = Object.assign(audioContext, { resume: () => new Promise<void>(() => {}) })
    const controller = new AbortController()
    const pending = playBrowserSpeechAudio({ audio: createBufferedSpeechAudioSource({ duration: 1 } as AudioBuffer), audioContext: context as unknown as AudioContext, signal: controller.signal })
    controller.abort()
    expect(await pending).toEqual({ status: 'interrupted', playedMs: 0, errorCode: 'aborted' })
    expect(context.createdSources).toHaveLength(0)
  })

  it('reports a resume deadline without inventing audible playback', async () => {
    vi.useFakeTimers()
    try {
      const audioContext = new FakeAudioContext()
      audioContext.state = 'suspended'
      const context = Object.assign(audioContext, { resume: () => new Promise<void>(() => {}) })
      const pending = playBrowserSpeechAudio({ audio: createBufferedSpeechAudioSource({ duration: 1 } as AudioBuffer), audioContext: context as unknown as AudioContext, signal: new AbortController().signal })
      await vi.advanceTimersByTimeAsync(5000)
      expect(await pending).toEqual({ status: 'failed', playedMs: 0, errorCode: 'audio-context-resume-timeout' })
    }
    finally {
      vi.useRealTimers()
    }
  })

  it('reports start failure and does not create a success receipt', async () => {
    const audioContext = new FakeAudioContext()
    const create = audioContext.createBufferSource.bind(audioContext)
    audioContext.createBufferSource = () => {
      const node = create()
      node.start = () => {
        throw new Error('device failed')
      }
      return node
    }
    const started = vi.fn()
    const outcome = await playBrowserSpeechAudio({ audio: createBufferedSpeechAudioSource({ duration: 1 } as AudioBuffer), audioContext: audioContext as unknown as AudioContext, signal: new AbortController().signal, onAudioStarted: started })
    expect(outcome).toEqual({ status: 'failed', playedMs: 0, errorCode: 'audio-source-start-failed' })
    expect(started).not.toHaveBeenCalled()
  })

  it('preserves partial playback when a stream fails after an audible chunk', async () => {
    const audioContext = new FakeAudioContext()
    let reads = 0
    const audio = createStreamingSpeechAudioSource<AudioBuffer>(new ReadableStream({
      pull(controller) {
        if (reads++ === 0)
          controller.enqueue(createSpeechAudioChunk({ duration: 0.4 } as AudioBuffer, { sequence: 0 }))
        else
          controller.error(new Error('network disconnected'))
      },
    }, { highWaterMark: 0 }))
    const outcome = await playBrowserSpeechAudio({ audio, audioContext: audioContext as unknown as AudioContext, signal: new AbortController().signal })
    expect(outcome).toEqual({ status: 'failed', playedMs: 400, errorCode: 'audio-stream-read-failed' })
  })

  it('distinguishes empty, unavailable and cancelled audio', async () => {
    const audioContext = new FakeAudioContext()
    const signal = new AbortController()
    const empty = createStreamingSpeechAudioSource<AudioBuffer>(new ReadableStream({
      start(controller) {
        controller.close()
      },
    }))
    expect((await playBrowserSpeechAudio({ audio: empty, audioContext: audioContext as unknown as AudioContext, signal: signal.signal })).errorCode).toBe('empty-audio')
    audioContext.state = 'closed'
    expect((await playBrowserSpeechAudio({ audio: empty, audioContext: audioContext as unknown as AudioContext, signal: signal.signal })).status).toBe('failed')
    signal.abort()
    expect((await playBrowserSpeechAudio({ audio: empty, audioContext: audioContext as unknown as AudioContext, signal: signal.signal })).status).toBe('interrupted')
  })
  it('binds a stable output node for buffered playback', async () => {
    const audioContext = new FakeAudioContext()
    const analyserNode = new FakeAudioNode() as unknown as AudioNode
    const observerNode = new FakeAudioNode() as unknown as AudioNode
    const controller = new AbortController()
    const boundNodes: AudioNode[] = []

    await playBrowserSpeechAudio({
      audio: createBufferedSpeechAudioSource({ duration: 0.6 } as AudioBuffer),
      audioContext: audioContext as unknown as AudioContext,
      signal: controller.signal,
      analyserNode,
      observerNodes: [observerNode],
      onAudioNodeBound(node) {
        boundNodes.push(node)
      },
    })

    expect(boundNodes).toHaveLength(1)
    expect(audioContext.createdSources).toHaveLength(1)
    expect(audioContext.createdSources[0]?.startCalls).toEqual([4])
    expect(audioContext.createdGains).toHaveLength(1)
  })

  it('schedules streamed audio chunks against one bound output node', async () => {
    const audioContext = new FakeAudioContext()
    const controller = new AbortController()
    const boundNodes: AudioNode[] = []
    const audio = createStreamingSpeechAudioSource<AudioBuffer>(new ReadableStream({
      start(streamController) {
        streamController.enqueue(createSpeechAudioChunk({ duration: 0.4 } as AudioBuffer, { sequence: 0 }))
        streamController.enqueue(createSpeechAudioChunk({ duration: 0.6 } as AudioBuffer, { sequence: 1 }))
        streamController.close()
      },
    }))

    await playBrowserSpeechAudio({
      audio,
      audioContext: audioContext as unknown as AudioContext,
      signal: controller.signal,
      onAudioNodeBound(node) {
        boundNodes.push(node)
      },
    })

    expect(boundNodes).toHaveLength(1)
    expect(audioContext.createdSources).toHaveLength(2)
    expect(audioContext.createdSources.map(source => source.startCalls[0])).toEqual([4, 4.4])
  })
})
