import type {
  BufferedSpeechAudioSource,
  SpeechAudioSource,
  StreamingSpeechAudioSource,
} from '@proj-alicization/pipelines-audio'

import {
  isBufferedSpeechAudioSource,
  isStreamingSpeechAudioSource,
} from '@proj-alicization/pipelines-audio'

export type BrowserSpeechAudioSource = SpeechAudioSource<AudioBuffer>

export interface PlayBrowserSpeechAudioOptions {
  audio: BrowserSpeechAudioSource
  audioContext: AudioContext
  signal: AbortSignal
  analyserNode?: AudioNode | null
  destinationNode?: AudioNode | null
  observerNodes?: Array<AudioNode | null | undefined>
  onAudioNodeBound?: (node: AudioNode) => void
}

function disconnectAudioNode(node: AudioNode, target?: AudioNode | null) {
  try {
    if (target) {
      node.disconnect(target)
      return
    }

    node.disconnect()
  }
  catch {}
}

function connectAudioNode(node: AudioNode, target?: AudioNode | null | undefined) {
  if (!target)
    return

  node.connect(target)
}

// A stable bridge node keeps analysers and lip-sync consumers attached while
// the underlying playback switches between one-shot buffers and streamed chunks.
function createSpeechOutputNode(options: PlayBrowserSpeechAudioOptions) {
  const outputNode = options.audioContext.createGain()
  connectAudioNode(outputNode, options.destinationNode ?? options.audioContext.destination)
  connectAudioNode(outputNode, options.analyserNode)
  for (const observerNode of options.observerNodes ?? [])
    connectAudioNode(outputNode, observerNode)
  options.onAudioNodeBound?.(outputNode)
  return outputNode
}

function stopBufferSource(source: AudioBufferSourceNode) {
  source.onended = null

  try {
    source.stop()
  }
  catch {}

  disconnectAudioNode(source)
}

async function playBufferedSpeechAudio(
  options: Omit<PlayBrowserSpeechAudioOptions, 'audio'> & { audio: BufferedSpeechAudioSource<AudioBuffer> },
  outputNode: GainNode,
) {
  const source = options.audioContext.createBufferSource()
  source.buffer = options.audio.audio
  source.connect(outputNode)

  return new Promise<void>((resolve) => {
    let settled = false

    const resolveOnce = () => {
      if (settled)
        return

      settled = true
      disconnectAudioNode(outputNode)
      resolve()
    }

    const stopPlayback = () => {
      options.signal.removeEventListener('abort', stopPlayback)
      stopBufferSource(source)
      resolveOnce()
    }

    if (options.signal.aborted) {
      stopPlayback()
      return
    }

    options.signal.addEventListener('abort', stopPlayback, { once: true })
    source.onended = () => {
      stopPlayback()
    }

    try {
      source.start(0)
    }
    catch {
      stopPlayback()
    }
  })
}

async function playStreamingSpeechAudio(
  options: Omit<PlayBrowserSpeechAudioOptions, 'audio'> & { audio: StreamingSpeechAudioSource<AudioBuffer> },
  outputNode: GainNode,
) {
  const reader = options.audio.stream.getReader()
  const activeSources = new Set<AudioBufferSourceNode>()
  let nextChunkStartAt = options.audioContext.currentTime
  let settled = false
  let readerReleased = false
  let readingDone = false

  const releaseReader = () => {
    if (readerReleased)
      return

    try {
      reader.releaseLock()
      readerReleased = true
    }
    catch {}
  }

  return new Promise<void>((resolve) => {
    const resolveOnce = () => {
      disconnectAudioNode(outputNode)
      resolve()
    }

    const stopAllSources = () => {
      for (const source of activeSources) {
        stopBufferSource(source)
      }
      activeSources.clear()
    }

    const finalizePlayback = async (optionsInput?: { cancelReader?: boolean, stopSources?: boolean }) => {
      if (settled)
        return

      settled = true
      options.signal.removeEventListener('abort', abortPlayback)
      if (optionsInput?.stopSources !== false)
        stopAllSources()
      if (optionsInput?.cancelReader !== false)
        await reader.cancel().catch(() => {})
      releaseReader()
      resolveOnce()
    }

    const maybeResolveCompletedPlayback = () => {
      if (!readingDone || activeSources.size > 0)
        return

      void finalizePlayback({
        cancelReader: false,
        stopSources: false,
      })
    }

    const abortPlayback = () => {
      void finalizePlayback()
    }

    if (options.signal.aborted) {
      abortPlayback()
      return
    }

    options.signal.addEventListener('abort', abortPlayback, { once: true })

    void (async () => {
      try {
        while (!options.signal.aborted) {
          const { value, done } = await reader.read()
          if (done)
            break

          const chunkAudio = value?.audio
          if (!chunkAudio)
            continue

          const source = options.audioContext.createBufferSource()
          source.buffer = chunkAudio
          source.connect(outputNode)

          const startAt = Math.max(options.audioContext.currentTime, nextChunkStartAt)
          nextChunkStartAt = startAt + chunkAudio.duration
          activeSources.add(source)

          source.onended = () => {
            activeSources.delete(source)
            disconnectAudioNode(source)
            maybeResolveCompletedPlayback()
          }

          try {
            source.start(startAt)
          }
          catch {
            activeSources.delete(source)
            disconnectAudioNode(source)
          }
        }
      }
      catch {
        void finalizePlayback()
        return
      }
      finally {
        readingDone = true
        maybeResolveCompletedPlayback()
      }
    })()
  })
}

export async function playBrowserSpeechAudio(options: PlayBrowserSpeechAudioOptions) {
  const outputNode = createSpeechOutputNode(options)

  if (isBufferedSpeechAudioSource(options.audio))
    return playBufferedSpeechAudio({ ...options, audio: options.audio }, outputNode)

  if (isStreamingSpeechAudioSource(options.audio))
    return playStreamingSpeechAudio({ ...options, audio: options.audio }, outputNode)

  disconnectAudioNode(outputNode)
}
