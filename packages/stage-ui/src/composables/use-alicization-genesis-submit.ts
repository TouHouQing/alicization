import type { AlicizationGenesisInput, AlicizationInitializeGenesisResult } from '../stores/alicization-bridge'

import { errorMessageFrom } from '@moeru/std'
import { shallowRef } from 'vue'

export function useAlicizationGenesisSubmit(options: {
  buildPayload: () => AlicizationGenesisInput
  initialize: (payload: AlicizationGenesisInput) => Promise<AlicizationInitializeGenesisResult | undefined>
  onCreated: () => void | Promise<void>
  failureMessage: (reason: string) => string
  conflictMessage: () => string
  unavailableMessage: () => string
}) {
  const submitting = shallowRef(false)
  const error = shallowRef('')

  async function submit() {
    if (submitting.value)
      return

    submitting.value = true
    error.value = ''
    try {
      const result = await options.initialize(options.buildPayload())
      if (!result) {
        error.value = options.unavailableMessage()
        return
      }
      if (result.conflict) {
        error.value = options.conflictMessage()
        return
      }
      if (result.soul.needsGenesis) {
        error.value = options.failureMessage('Initialization was not saved.')
        return
      }
      await options.onCreated()
    }
    catch (cause) {
      error.value = options.failureMessage(errorMessageFrom(cause) ?? String(cause))
    }
    finally {
      submitting.value = false
    }
  }

  return { submitting, error, submit }
}
