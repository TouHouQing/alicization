import type { BrowserWorkBinding } from '../../../../shared/execution-contracts'
import type { LifeEffect } from '../../../../shared/life-contracts'
import type { AlicizationDbService } from '../db'
import type { EffectReconciliation } from './effect-reconciler'

import { executionDigest } from './acceptance-compiler'

type Snapshot = Record<string, unknown> & { elements: Record<string, unknown>[] }

function snapshot(value: unknown): Snapshot | null {
  if (!value || typeof value !== 'object')
    return null
  const result = value as Record<string, unknown>
  return result.status === 'completed' && Array.isArray(result.elements) && result.elements.length <= 256 && result.elements.every(item => item && typeof item === 'object') ? result as Snapshot : null
}

/** Reconcile only an exact replacement value on the same observed control. */
export function createInterfaceEffectRecovery(options: {
  database: () => Pick<AlicizationDbService, 'readLifeTurnExecutionEffects'>
  observeBrowser: () => Promise<unknown>
  isBrowserBindingCurrent?: (binding: BrowserWorkBinding | undefined) => boolean
  observeDesktop: (target: { windowId: string, processId: number, processStartTicks: string, windowClass: string, desktop: string, title: string }) => Promise<unknown>
}) {
  return async (effect: LifeEffect): Promise<EffectReconciliation> => {
    const unknown = (reason: string): EffectReconciliation => ({ verdict: 'unknown', independent: true, effectId: effect.id, evidence: { reason } })
    const capability = effect.payload.capabilityId
    const browser = capability === 'tool.browser_type_text'
    if (!browser && capability !== 'tool.desktop_type_text')
      return unknown('operation-needs-its-own-independent-receipt-recipe')
    const binding = effect.payload.browserBinding as BrowserWorkBinding | undefined
    if (browser && !options.isBrowserBindingCurrent?.(binding))
      return unknown('browser-surface-binding-is-not-current')
    const input = effect.payload.parameters as Record<string, unknown> | undefined
    if (!effect.turnId || input?.clearExisting !== true || input.submit === true || typeof input.text !== 'string' || input.text.length > 16_000)
      return unknown('only-a-bounded-unsubmitted-replacement-can-be-reconciled-by-field-value')
    const prior = await options.database().readLifeTurnExecutionEffects(effect.turnId)
    const candidates: Array<{ effect: LifeEffect, page: Snapshot, element: Record<string, unknown> }> = []
    for (const source of prior) {
      if (source.status !== 'settled' || source.receipt?.outcome !== 'success' || source.payload.capabilityId !== (browser ? 'tool.browser_read_page' : 'tool.desktop_list_interactables'))
        continue
      const page = snapshot(source.receipt.output)
      if (!page || browser && (executionDigest(source.payload.browserBinding ?? null) !== executionDigest(binding ?? null) || page.browser !== (binding?.kind === 'authorized-page' ? 'authorized-page' : 'alicization-managed') || binding?.kind === 'authorized-page' && page.grantId !== binding.id || typeof page.url !== 'string'))
        continue
      const matches = page.elements.filter((element) => {
        if (browser)
          return typeof input.selector === 'string' && (element.selector === input.selector || element.elementRef === input.selector)
        if (element.role !== 'input' || typeof element.name !== 'string' || input.windowTitle && input.windowTitle !== page.title)
          return false
        return !input.targetText || (input.exactText ? element.name === input.targetText : element.name.includes(String(input.targetText)))
      })
      const selected = !browser && typeof input.ordinal === 'number' ? matches[input.ordinal - 1] : matches.length === 1 ? matches[0] : null
      if (selected && selected.password !== true && selected.readOnly !== true)
        candidates.push({ effect: source, page, element: selected })
    }
    // Titles and labels are insufficient to reconstruct identity after restart.
    if (candidates.length !== 1)
      return unknown('prepared-control-observation-is-absent-or-ambiguous')
    const source = candidates[0]
    let actual: Snapshot | null
    let identity: Record<string, unknown>
    if (browser) {
      if (typeof source.element.id !== 'string')
        return unknown('browser-control-identity-is-absent')
      actual = snapshot(await options.observeBrowser())
      if (!actual || actual.browser !== source.page.browser || actual.url !== source.page.url || !options.isBrowserBindingCurrent?.(binding) || binding?.kind === 'authorized-page' && actual.grantId !== binding.id)
        return unknown('browser-document-changed')
      identity = { browser: actual.browser, url: actual.url, target: source.element.id, browserBinding: binding }
    }
    else {
      const page = source.page
      if (typeof page.windowId !== 'string' || typeof page.processId !== 'number' || !['processStartTicks', 'windowClass', 'desktop', 'title'].every(key => typeof page[key] === 'string') || typeof source.element.runtimeId !== 'string')
        return unknown('native-control-or-window-identity-is-absent')
      const target = { windowId: page.windowId, processId: page.processId, processStartTicks: String(page.processStartTicks), windowClass: String(page.windowClass), desktop: String(page.desktop), title: String(page.title) }
      actual = snapshot(await options.observeDesktop(target))
      if (!actual || Object.entries(target).some(([key, value]) => actual![key] !== value))
        return unknown('native-window-identity-changed')
      identity = { ...target, target: source.element.runtimeId }
    }
    const key = browser ? 'id' : 'runtimeId'
    const fields = actual.elements.filter(item => item[key] === source.element[key])
    if (fields.length !== 1 || fields[0].password === true || fields[0].value !== input.text)
      return unknown('current-control-value-does-not-prove-the-requested-replacement')
    return {
      effectId: effect.id,
      verdict: 'applied',
      independent: true,
      evidence: { ...identity, sourceObservationEffectId: source.effect.id, observedValueHash: executionDigest(input.text), scope: 'current-displayed-field-only' },
      output: { ok: true, status: 'completed', operation: browser ? 'browser_type_text' : 'desktop_type_text', ...identity, recovered: true, proofScope: 'current-displayed-field-only', serverReceiptVerified: false },
    }
  }
}
