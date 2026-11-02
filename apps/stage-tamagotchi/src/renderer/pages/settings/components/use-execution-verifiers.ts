import type { ExecutionVerifierCommand, ExecutionVerifierState } from '../../../../shared/execution-verification-contracts'

import { onScopeDispose, shallowRef, watch } from 'vue'

export function useExecutionVerifiers(cardId: () => string, invoke: (input: ExecutionVerifierCommand) => Promise<ExecutionVerifierState>) {
  const state = shallowRef<ExecutionVerifierState | null>(null)
  const pending = shallowRef(false)
  const failed = shallowRef(false)
  const saved = shallowRef(false)
  let sequence = 0
  async function act(input: ExecutionVerifierCommand) {
    const current = ++sequence
    pending.value = true
    failed.value = false
    saved.value = false
    try {
      const result = await invoke(input)
      if (sequence === current && cardId() === input.cardId) {
        state.value = result
        saved.value = input.action === 'apply'
      }
    }
    catch {
      if (sequence === current && cardId() === input.cardId)
        failed.value = true
    }
    finally {
      if (sequence === current)
        pending.value = false
    }
  }
  async function previewFile(file: Pick<File, 'size' | 'text'>) {
    discardPreview()
    const owner = cardId()
    const current = ++sequence
    pending.value = true
    failed.value = false
    saved.value = false
    try {
      if (file.size > 131_072)
        throw new Error('Verification configuration exceeds its import budget')
      const registry = await file.text()
      if (current === sequence && cardId() === owner)
        await act({ cardId: owner, action: 'preview', registry })
    }
    catch {
      if (current === sequence && cardId() === owner)
        failed.value = true
    }
    finally {
      if (current === sequence)
        pending.value = false
    }
  }
  function discardPreview() {
    if (state.value)
      state.value = { registryHash: state.value.registryHash, items: state.value.items }
  }
  watch(cardId, () => {
    state.value = null
    void act({ cardId: cardId(), action: 'list' })
  }, { immediate: true })
  onScopeDispose(() => {
    sequence++
  })
  return { state, pending, failed, saved, previewFile, discardPreview, apply: () => state.value?.preview ? act({ cardId: cardId(), action: 'apply', token: state.value.preview.token }) : Promise.resolve() }
}
