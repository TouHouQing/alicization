import type { ExecutionVerifierCommand, ExecutionVerifierState } from '../../../../shared/execution-verification-contracts'

import { describe, expect, it, vi } from 'vitest'
import { effectScope, nextTick, shallowRef } from 'vue'

import { useExecutionVerifiers } from './use-execution-verifiers'

const blank: ExecutionVerifierState = { registryHash: 'hash', items: [] }
describe('verification settings async ownership', () => {
  it('removes an earlier confirmation when the next imported configuration fails', async () => {
    const scope = effectScope()
    const invoke = vi.fn(async (input: ExecutionVerifierCommand): Promise<ExecutionVerifierState> => {
      if (input.action === 'preview' && input.registry === 'invalid')
        throw new Error('Invalid configuration')
      return input.action === 'preview' ? { ...blank, preview: { token: 'old-token', expiresAt: Date.now() + 1000, items: [] } } : blank
    })
    const state = scope.run(() => useExecutionVerifiers(() => 'alice', invoke))!
    await nextTick()
    await state.previewFile({ size: 2, text: async () => '{}' })
    expect(state.state.value?.preview).toBeDefined()
    await state.previewFile({ size: 7, text: async () => 'invalid' })
    expect(state.failed.value).toBe(true)
    expect(state.state.value?.preview).toBeUndefined()
    const calls = invoke.mock.calls.length
    await state.apply()
    expect(invoke.mock.calls).toHaveLength(calls)
    scope.stop()
  })
  it('ignores an old-card response and an old-card file read without sending its configuration', async () => {
    const scope = effectScope()
    const card = shallowRef('alice')
    let resolveOld!: (state: ExecutionVerifierState) => void
    let resolveFile!: (text: string) => void
    const invoke = vi.fn((input: ExecutionVerifierCommand) => input.cardId === 'alice'
      ? new Promise<ExecutionVerifierState>((resolve) => {
          resolveOld = resolve
        })
      : Promise.resolve(blank))
    const state = scope.run(() => useExecutionVerifiers(() => card.value, invoke))!
    const file = state.previewFile({ size: 10, text: () => new Promise<string>((resolve) => {
      resolveFile = resolve
    }) })
    card.value = 'bob'
    await nextTick()
    resolveOld({ ...blank, items: [{ id: 'private', reference: 'private', version: '1', scope: 'quality' }] })
    resolveFile('old private configuration')
    await file
    await nextTick()
    expect(state.state.value).toEqual(blank)
    expect(invoke.mock.calls.every(([input]) => input.action === 'list')).toBe(true)
    expect(state.pending.value).toBe(false)
    scope.stop()
  })

  it('previews and applies only the current token, and rejects oversized files before reading', async () => {
    const scope = effectScope()
    const invoke = vi.fn(async (input: ExecutionVerifierCommand): Promise<ExecutionVerifierState> => input.action === 'preview' ? { ...blank, preview: { token: 'current-token', expiresAt: Date.now() + 1000, items: [] } } : blank)
    const state = scope.run(() => useExecutionVerifiers(() => 'alice', invoke))!
    await nextTick()
    const text = vi.fn(async () => '{}')
    await state.previewFile({ size: 131_073, text })
    expect(state.failed.value).toBe(true)
    expect(state.pending.value).toBe(false)
    expect(text).not.toHaveBeenCalled()
    await state.previewFile({ size: 2, text })
    expect(state.state.value?.preview?.token).toBe('current-token')
    await state.apply()
    expect(invoke).toHaveBeenLastCalledWith({ cardId: 'alice', action: 'apply', token: 'current-token' })
    expect(state.saved.value).toBe(true)
    await state.previewFile({ size: 2, text })
    state.discardPreview()
    const calls = invoke.mock.calls.length
    await state.apply()
    expect(invoke.mock.calls).toHaveLength(calls)
    scope.stop()
  })
})
