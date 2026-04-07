import { defineStore } from 'pinia'

import { createSpeechPipelineRuntime } from '../services/speech/pipeline-runtime'

export const useSpeechRuntimeStore = defineStore('speech-runtime', () => {
  const runtime = createSpeechPipelineRuntime()

  function openIntent(options?: Parameters<typeof runtime.openIntent>[0]) {
    return runtime.openIntent(options)
  }

  function cancelOwner(ownerId: string, reason?: string) {
    runtime.cancelOwner(ownerId, reason)
  }

  async function registerHost(pipeline: Parameters<typeof runtime.registerHost>[0]) {
    await runtime.registerHost(pipeline)
  }

  function isHost() {
    return runtime.isHost()
  }

  async function dispose() {
    await runtime.dispose()
  }

  return {
    openIntent,
    cancelOwner,
    registerHost,
    isHost,
    dispose,
  }
})
