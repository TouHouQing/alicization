import {
  createBufferedSpeechAudioSource,
  createSpeechAudioChunk,
  createStreamingSpeechAudioSource,
} from '@proj-alicization/pipelines-audio'
import { describe, expect, it } from 'vitest'

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
    expect(audioContext.createdSources[0]?.startCalls).toEqual([0])
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
