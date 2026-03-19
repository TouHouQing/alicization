import { storeToRefs } from 'pinia'
import { ref } from 'vue'

import { useChatOrchestratorStore } from '../stores/chat'

export function useChatReplyAbort() {
  const chatOrchestrator = useChatOrchestratorStore()
  const { sending } = storeToRefs(chatOrchestrator)
  const aborting = ref(false)

  async function abortReply() {
    if (!sending.value || aborting.value)
      return false

    aborting.value = true

    try {
      await chatOrchestrator.abortAllPipelines('manual')
      return true
    }
    catch (error) {
      console.error('Failed to abort current reply:', error)
      return false
    }
    finally {
      aborting.value = false
    }
  }

  return {
    sending,
    aborting,
    abortReply,
  }
}
