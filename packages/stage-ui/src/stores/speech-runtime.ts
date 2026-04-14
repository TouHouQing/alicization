import { defineStore } from 'pinia'

import type { SpeechPipelineRuntime } from '../services/speech/pipeline-runtime'

import { createSpeechPipelineRuntime } from '../services/speech/pipeline-runtime'

export const useSpeechRuntimeStore = defineStore('speech-runtime', () => {
  let runtime: SpeechPipelineRuntime | null = null

  function getRuntime() {
    runtime ??= createSpeechPipelineRuntime()
    return runtime
  }

  function openIntent(options?: Parameters<SpeechPipelineRuntime['openIntent']>[0]) {
    return getRuntime().openIntent(options)
  }

  function cancelOwner(ownerId: string, reason?: string) {
    getRuntime().cancelOwner(ownerId, reason)
  }

  async function registerHost(pipeline: Parameters<SpeechPipelineRuntime['registerHost']>[0]) {
    await getRuntime().registerHost(pipeline)
  }

  function isHost() {
    return getRuntime().isHost()
  }

  async function dispose() {
    if (!runtime)
      return

    await runtime.dispose()
    runtime = null
  }

  return {
    openIntent,
    cancelOwner,
    registerHost,
    isHost,
    dispose,
  }
})
