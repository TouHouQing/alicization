import type {
  IntentHandle,
  IntentOptions,
  SpeechIntentMetadata,
} from '@proj-alicization/pipelines-audio'

interface StageChatIntentBridgeOptions {
  openIntent: (options?: IntentOptions) => IntentHandle
}

function normalizeSpeechMetadataRecord(
  metadata: SpeechIntentMetadata | null | undefined,
): SpeechIntentMetadata | null {
  return metadata && typeof metadata === 'object' && !Array.isArray(metadata)
    ? metadata
    : null
}

export function attachEmbodimentScriptToSpeechMetadata(
  metadata: SpeechIntentMetadata | null | undefined,
  embodimentScript: unknown,
): SpeechIntentMetadata | null {
  if (!embodimentScript || typeof embodimentScript !== 'object' || Array.isArray(embodimentScript))
    return normalizeSpeechMetadataRecord(metadata)

  return {
    ...normalizeSpeechMetadataRecord(metadata),
    embodimentScript,
  }
}

export function createStageChatIntentBridge(options: StageChatIntentBridgeOptions) {
  let preparedOptions: IntentOptions | null = null
  let currentHandle: IntentHandle | null = null
  let currentMetadata: SpeechIntentMetadata | null = null
  let tokenEmissionStarted = false

  function syncHandle(handle: IntentHandle | null) {
    currentHandle = handle
    return handle
  }

  function reopenPreparedIntent(reason: string) {
    if (!preparedOptions || tokenEmissionStarted)
      return currentHandle

    currentHandle?.cancel(reason)
    return syncHandle(options.openIntent({
      ...preparedOptions,
      metadata: currentMetadata,
    }))
  }

  function prepare(intentOptions: IntentOptions) {
    preparedOptions = {
      ...intentOptions,
      metadata: normalizeSpeechMetadataRecord(intentOptions.metadata),
    }
    currentMetadata = preparedOptions.metadata ?? null
    tokenEmissionStarted = false
    return syncHandle(options.openIntent(preparedOptions))
  }

  function attachEmbodimentScript(script: unknown) {
    const upgradedMetadata = attachEmbodimentScriptToSpeechMetadata(currentMetadata, script)
    const metadataChanged = JSON.stringify(upgradedMetadata) !== JSON.stringify(currentMetadata)
    currentMetadata = upgradedMetadata

    if (!metadataChanged || !currentHandle || tokenEmissionStarted)
      return currentHandle

    return reopenPreparedIntent('metadata-upgrade')
  }

  function markTokenEmissionStarted() {
    tokenEmissionStarted = true
  }

  function writeLiteral(text: string) {
    markTokenEmissionStarted()
    currentHandle?.writeLiteral(text)
  }

  function writeSpecial(special: string) {
    markTokenEmissionStarted()
    currentHandle?.writeSpecial(special)
  }

  function writeFlush() {
    markTokenEmissionStarted()
    currentHandle?.writeFlush()
  }

  function end() {
    currentHandle?.end()
    currentHandle = null
    preparedOptions = null
    currentMetadata = null
    tokenEmissionStarted = false
  }

  function cancel(reason?: string) {
    currentHandle?.cancel(reason)
    currentHandle = null
    preparedOptions = null
    currentMetadata = null
    tokenEmissionStarted = false
  }

  return {
    get current() {
      return currentHandle
    },
    prepare,
    attachEmbodimentScript,
    writeLiteral,
    writeSpecial,
    writeFlush,
    end,
    cancel,
  }
}
