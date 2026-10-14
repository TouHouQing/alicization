import type { PlaybackResult, SpeechAudioSource } from '@proj-alicization/pipelines-audio'

import { isBufferedSpeechAudioSource, isStreamingSpeechAudioSource } from '@proj-alicization/pipelines-audio'

export type BrowserSpeechAudioSource = SpeechAudioSource<AudioBuffer>

export interface PlayBrowserSpeechAudioOptions {
  audio: BrowserSpeechAudioSource
  audioContext: AudioContext
  signal: AbortSignal
  analyserNode?: AudioNode | null
  destinationNode?: AudioNode | null
  observerNodes?: Array<AudioNode | null | undefined>
  onAudioNodeBound?: (node: AudioNode) => void
  onAudioStarted?: () => void
  onAudioProgress?: (playedMs: number) => void
}

function disconnect(node: AudioNode) {
  try {
    node.disconnect()
  }
  catch {}
}

// Browser autoplay can leave resume() pending until a user gesture. Cancellation
// must still release the utterance and a missing device must have a terminal result.
function resumeAudioContext(audioContext: AudioContext, signal: AbortSignal) {
  return new Promise<'resumed' | 'aborted' | 'timeout' | 'failed'>((resolve) => {
    let settled = false
    let timer: ReturnType<typeof setTimeout> | undefined
    function abort() {
      finish('aborted')
    }
    function finish(outcome: 'resumed' | 'aborted' | 'timeout' | 'failed') {
      if (settled)
        return
      settled = true
      clearTimeout(timer)
      signal.removeEventListener('abort', abort)
      resolve(outcome)
    }
    timer = setTimeout(() => finish('timeout'), 5000)
    signal.addEventListener('abort', abort, { once: true })
    if (signal.aborted) {
      abort()
      return
    }
    try {
      void audioContext.resume().then(() => finish('resumed'), () => finish('failed'))
    }
    catch {
      finish('failed')
    }
  })
}

export async function playBrowserSpeechAudio(options: PlayBrowserSpeechAudioOptions): Promise<PlaybackResult> {
  const { audioContext, signal, audio } = options
  const result = (status: PlaybackResult['status'], playedMs = 0, errorCode: string | null = null): PlaybackResult => ({ status, playedMs: Math.max(0, Math.round(playedMs)), errorCode })
  if (signal.aborted)
    return result('interrupted', 0, 'aborted')
  try {
    if (audioContext.state === 'suspended') {
      const outcome = await resumeAudioContext(audioContext, signal)
      if (outcome === 'aborted')
        return result('interrupted', 0, 'aborted')
      if (outcome !== 'resumed')
        return result('failed', 0, outcome === 'timeout' ? 'audio-context-resume-timeout' : 'audio-context-resume-failed')
    }
    if (audioContext.state !== 'running')
      return result('failed', 0, 'audio-context-unavailable')
  }
  catch { return result('failed', 0, 'audio-context-resume-failed') }
  if (signal.aborted)
    return result('interrupted', 0, 'aborted')

  // A stable output node serves both the speaker and lip-sync observers.
  let output: GainNode | undefined
  try {
    output = audioContext.createGain()
    output.connect(options.destinationNode ?? audioContext.destination)
    for (const node of [options.analyserNode, ...options.observerNodes ?? []]) {
      if (node)
        output.connect(node)
    }
    options.onAudioNodeBound?.(output)
  }
  catch {
    if (output)
      disconnect(output)
    return result('failed', 0, 'audio-output-bind-failed')
  }

  return new Promise<PlaybackResult>((resolve) => {
    const sources = new Map<AudioBufferSourceNode, { start: number, duration: number }>()
    let reader: ReadableStreamDefaultReader<{ audio: AudioBuffer }> | undefined
    let settled = false
    let readDone = false
    let completedSeconds = 0
    let scheduledSeconds = 0
    let nextStart = audioContext.currentTime
    let started = false
    let progressTimer: ReturnType<typeof setInterval> | undefined

    const playedMs = () => (completedSeconds + [...sources.values()].reduce((sum, entry) => sum + Math.max(0, Math.min(entry.duration, audioContext.currentTime - entry.start)), 0)) * 1000
    const finish = (status: PlaybackResult['status'], errorCode: string | null = null) => {
      if (settled)
        return
      const actualMs = status === 'completed' ? scheduledSeconds * 1000 : playedMs()
      settled = true
      signal.removeEventListener('abort', abort)
      clearInterval(progressTimer)
      for (const source of sources.keys()) {
        source.onended = null
        try {
          source.stop()
        }
        catch {}
        disconnect(source)
      }
      sources.clear()
      disconnect(output!)
      if (reader) {
        // Remote stream cancellation must not block the local terminal receipt.
        void reader.cancel().catch(() => {}).finally(() => {
          try {
            reader?.releaseLock()
          }
          catch {}
        })
      }
      resolve(result(status, actualMs, errorCode))
    }
    function abort() {
      finish('interrupted', 'aborted')
    }
    const maybeComplete = () => {
      if (readDone && sources.size === 0)
        finish(scheduledSeconds > 0 ? 'completed' : 'failed', scheduledSeconds > 0 ? null : 'empty-audio')
    }
    const schedule = (buffer: AudioBuffer) => {
      if (!Number.isFinite(buffer.duration) || buffer.duration <= 0)
        throw new Error('invalid-audio-buffer')
      const source = audioContext.createBufferSource()
      source.buffer = buffer
      source.connect(output!)
      const start = Math.max(audioContext.currentTime, nextStart)
      sources.set(source, { start, duration: buffer.duration })
      source.onended = () => {
        if (settled)
          return
        sources.delete(source)
        completedSeconds += buffer.duration
        disconnect(source)
        maybeComplete()
      }
      source.start(start)
      scheduledSeconds += buffer.duration
      nextStart = start + buffer.duration
      if (!started) {
        started = true
        options.onAudioStarted?.()
        if (options.onAudioProgress)
          progressTimer = setInterval(() => options.onAudioProgress?.(playedMs()), 250)
      }
    }
    signal.addEventListener('abort', abort, { once: true })
    if (signal.aborted) {
      abort()
      return
    }
    if (isBufferedSpeechAudioSource(audio)) {
      try {
        schedule(audio.audio)
        readDone = true
      }
      catch { finish('failed', 'audio-source-start-failed') }
      return
    }
    if (!isStreamingSpeechAudioSource(audio)) {
      finish('failed', 'invalid-audio-source')
      return
    }
    try {
      reader = audio.stream.getReader()
    }
    catch {
      finish('failed', 'audio-stream-locked')
      return
    }
    void (async () => {
      try {
        while (true) {
          if (settled)
            return
          const chunk = await reader!.read()
          if (settled)
            return
          if (chunk.done)
            break
          try {
            schedule(chunk.value.audio)
          }
          catch {
            finish('failed', 'audio-source-start-failed')
            return
          }
        }
        readDone = true
        maybeComplete()
      }
      catch { finish('failed', 'audio-stream-read-failed') }
    })()
  })
}
