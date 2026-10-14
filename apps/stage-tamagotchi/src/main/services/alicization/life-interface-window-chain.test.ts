import type { LifeEffect } from '../../../shared/life-contracts'

import { describe, expect, it } from 'vitest'

import { matchLifeInterfaceInput, matchLifeObservedInterfaceInput } from './life-interface-window-chain'

const event = (id: string, operation: string, at: number, result: Record<string, unknown>, parameters = {}): LifeEffect => ({ id, operationKey: id, kind: 'execute', turnId: 'qa', actionId: id, generation: 1, status: 'settled', leaseUntil: null, payload: { parameters }, receipt: { observedAt: at, output: { channel: 'desktop', operation, windowId: '10', processId: 22, desktop: 'owned-qa', ...result } } })

describe('observed modal action chain', () => {
  it('binds an already-filled input observed before saving, without inventing a new typing action', () => {
    const field = { runtimeId: 'input', role: 'input', value: 'already filled', password: false, enabled: true, readOnly: false }
    const input = event('observe-input', 'desktop_list_interactables', 1, { elements: [field] })
    const saved = event('save', 'desktop_click_element', 2, { target: 'save-control' })
    const observed = event('observe-modal', 'desktop_list_interactables', 3, { windowId: '11', ownerWindowId: '10', elements: [{ runtimeId: 'confirm-control' }] })
    const confirmed = event('confirm', 'desktop_click_element', 4, { windowId: '11', ownerWindowId: '10', target: 'confirm-control' })
    const prior = [input, saved, observed]
    expect(matchLifeObservedInterfaceInput(prior, confirmed)).toMatchObject({ inputObservation: input, expectedText: 'already filled', inputId: 'input', ownerClick: saved, observedModal: observed })
    expect(matchLifeObservedInterfaceInput([input, observed], confirmed)).toBeNull()
    expect(matchLifeObservedInterfaceInput([input, saved], confirmed)).toBeNull()
    expect(matchLifeObservedInterfaceInput(prior, event('foreign', 'desktop_click_element', 4, { windowId: '11', ownerWindowId: '10', processId: 99, target: 'confirm-control' }))).toBeNull()
    for (const fields of [[{ ...field, password: true }], [{ ...field, readOnly: true }], [{ ...field, enabled: false }], [field, { ...field, runtimeId: 'second' }]])
      expect(matchLifeObservedInterfaceInput([event('ambiguous', 'desktop_list_interactables', 1, { elements: fields }), saved, observed], confirmed)).toBeNull()
    expect(matchLifeObservedInterfaceInput([event('after-click', 'desktop_list_interactables', 5, { elements: [field] }), saved, observed], confirmed)).toBeNull()
  })

  it('joins an owned observed popup and rejects unrelated, stale or unobserved confirmation', () => {
    const typed = event('typed', 'desktop_type_text', 1, {}, { clearExisting: true, text: 'expected bytes' })
    const saved = event('save', 'desktop_click_element', 2, { target: 'save-control' })
    const observed = event('observe-modal', 'desktop_list_interactables', 3, { windowId: '11', ownerWindowId: '10', elements: [{ runtimeId: 'confirm-control' }] })
    const confirmed = event('confirm', 'desktop_click_element', 4, { windowId: '11', ownerWindowId: '10', target: 'confirm-control' })
    expect(matchLifeInterfaceInput([typed, saved, observed], confirmed)).toMatchObject({ typed, ownerClick: saved, observedModal: observed })
    expect(matchLifeInterfaceInput([typed, observed], confirmed)).toBeNull()
    expect(matchLifeInterfaceInput([typed, saved], confirmed)).toBeNull()
    expect(matchLifeInterfaceInput([typed, saved, observed], event('foreign', 'desktop_click_element', 4, { windowId: '11', ownerWindowId: '10', processId: 99, target: 'confirm-control' }))).toBeNull()
    expect(matchLifeInterfaceInput([typed, saved, observed], event('other-control', 'desktop_click_element', 4, { windowId: '11', ownerWindowId: '10', target: 'delete-control' }))).toBeNull()
    expect(matchLifeInterfaceInput([typed, event('late-save', 'desktop_click_element', 5, { target: 'save-control' }), observed], confirmed)).toBeNull()
  })
})
