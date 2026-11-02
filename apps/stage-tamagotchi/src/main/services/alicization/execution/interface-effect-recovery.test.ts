import type { LifeEffect } from '../../../../shared/life-contracts'

import { describe, expect, it, vi } from 'vitest'

import { createInterfaceEffectRecovery } from './interface-effect-recovery'

function effect(capabilityId: string, parameters: Record<string, unknown>, output?: Record<string, unknown>): LifeEffect {
  return { id: capabilityId, operationKey: capabilityId, kind: 'execute', turnId: 'same-request', actionId: capabilityId, generation: 0, status: output ? 'settled' : 'uncertain', payload: { capabilityId, parameters, ...(capabilityId.startsWith('tool.browser_') ? { browserBinding: { kind: 'managed', id: 'unit-browser' } } : {}) }, receipt: output ? { outcome: 'success', output } : null, leaseUntil: null }
}

describe('prepared interface identity during effect recovery', () => {
  it('reads a new browser observation and limits proof to the exact unsubmitted field', async () => {
    const page = { status: 'completed', browser: 'alicization-managed', url: 'https://example.invalid/form', elements: [{ id: 'owner-document-node', selector: 'element:opaque', value: 'before' }] }
    const sources = [effect('tool.browser_read_page', {}, page)]
    const observeBrowser = vi.fn(async () => ({ ...page, elements: [{ ...page.elements[0], selector: 'element:new-reference', value: '你好 🌿' }] }))
    const reader = createInterfaceEffectRecovery({ isBrowserBindingCurrent: binding => binding?.kind === 'managed' && binding.id === 'unit-browser', database: () => ({ readLifeTurnExecutionEffects: async () => sources }), observeBrowser, observeDesktop: async () => { throw new Error('wrong channel') } })
    const pending = effect('tool.browser_type_text', { selector: 'element:opaque', text: '你好 🌿', clearExisting: true })
    expect(await reader(pending)).toMatchObject({ effectId: pending.id, verdict: 'applied', independent: true, evidence: { sourceObservationEffectId: sources[0].id, scope: 'current-displayed-field-only' }, output: { serverReceiptVerified: false } })
    expect(observeBrowser).toHaveBeenCalledOnce()
    expect((await reader({ ...pending, payload: { ...pending.payload, browserBinding: { kind: 'managed', id: 'another-boot' } } })).verdict).toBe('unknown')
    expect(observeBrowser).toHaveBeenCalledOnce()
    for (const parameters of [{ submit: true }, { clearExisting: false }, { selector: 'unobserved' }])
      expect((await reader({ ...pending, payload: { ...pending.payload, parameters: { ...pending.payload.parameters as Record<string, unknown>, ...parameters } } })).verdict).toBe('unknown')
    expect(observeBrowser).toHaveBeenCalledOnce()
    observeBrowser.mockResolvedValueOnce({ ...page, elements: [{ ...page.elements[0], id: 'new-node-same-label-and-value', value: '你好 🌿' }] })
    expect((await reader(pending)).verdict).toBe('unknown')
    observeBrowser.mockResolvedValueOnce({ ...page, elements: [{ ...page.elements[0], value: 'host edited this' }] })
    expect((await reader(pending)).verdict).toBe('unknown')
  })

  it('rejects recycled native windows even when a matching field value is visible', async () => {
    const page = { status: 'completed', windowId: '123', processId: 42, processStartTicks: '100', windowClass: 'EditWindow', desktop: 'qa-private', title: 'Notes', elements: [{ runtimeId: '42.1', role: 'input', name: 'Note', value: 'before' }] }
    const sources = [effect('tool.desktop_list_interactables', {}, page)]
    const observeDesktop = vi.fn(async () => ({ ...page, elements: [{ ...page.elements[0], value: 'new value' }] }))
    const reader = createInterfaceEffectRecovery({ database: () => ({ readLifeTurnExecutionEffects: async () => sources }), observeBrowser: async () => { throw new Error('wrong channel') }, observeDesktop })
    const pending = effect('tool.desktop_type_text', { targetText: 'Note', exactText: true, clearExisting: true, text: 'new value' })
    expect((await reader(pending)).verdict).toBe('applied')
    expect(observeDesktop).toHaveBeenCalledWith(expect.objectContaining({ processStartTicks: '100', desktop: 'qa-private' }))
    observeDesktop.mockResolvedValueOnce({ ...page, processStartTicks: '101', elements: [{ ...page.elements[0], value: 'new value' }] })
    expect((await reader(pending)).verdict).toBe('unknown')
    sources.push(effect('tool.desktop_list_interactables', {}, page))
    expect((await reader(pending)).verdict).toBe('unknown')
    expect(observeDesktop).toHaveBeenCalledTimes(2)
  })
})
