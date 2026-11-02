import type { WorkStep } from '../../../../shared/execution-contracts'

import { expect, it } from 'vitest'

import { resolveWorkInput, workInputHash } from './work-input-bindings'

function fixture(role: string | null = 'menu-item') {
  const step: WorkStep = { id: 'invoke', capabilityId: 'tool.desktop_click_element', input: { windowTitle: 'Current exact owned WPF window', text: '@current-control', ...(role ? { role } : {}), exactText: true }, dependsOn: ['observe'], inputBindings: [{ parameter: 'text', stepId: 'observe', path: ['elements'], select: { field: 'name', equals: 'Owned file options', valueField: 'name' } }], acceptanceCriterionIds: [], resourceIds: [], retryMode: 'reconcile-first', state: 'pending', attemptId: null, inputHash: '' }
  step.inputHash = workInputHash(step)
  const observed = { ok: true, channel: 'desktop', operation: 'desktop_list_interactables', elements: [{ role: role ?? 'menu-item', name: 'Owned file options', runtimeId: 'current-menu-item' }, { role: 'text', name: 'Owned file options', runtimeId: 'current-caption' }] }
  return { step, observed }
}

it.each(['menu-item', 'button'])('uses the accepted native %s role when its actual WPF caption has the same name', async (role) => {
  const { step, observed } = fixture(role)
  const before = JSON.stringify({ step, observed })
  const result = await resolveWorkInput(step, async () => observed)
  expect(result).toEqual({ ...step.input, text: 'Owned file options' })
  expect(result.role).toBe(role)
  expect(JSON.stringify({ step, observed })).toBe(before)
  expect(workInputHash(step)).toBe(step.inputHash)
})

it.each(['same-role-duplicate', 'role-absent', 'wrong-role-only', 'inherited-role', 'browser-receipt', 'other-operation'])('refuses a missing or ambiguous current native role: %s', async (fault) => {
  const { step, observed } = fixture(fault === 'role-absent' ? null : 'menu-item')
  if (fault === 'same-role-duplicate')
    observed.elements.push({ ...observed.elements[0], runtimeId: 'second-menu-item' })
  if (fault === 'wrong-role-only')
    observed.elements.shift()
  if (fault === 'inherited-role')
    observed.elements[0] = Object.assign(Object.create({ role: 'menu-item' }), { name: 'Owned file options', runtimeId: 'inherited-role' })
  if (fault === 'browser-receipt')
    observed.channel = 'browser'
  if (fault === 'other-operation')
    observed.operation = 'desktop_type_text'
  await expect(resolveWorkInput(step, async () => observed)).rejects.toThrow(/absent|ambiguous/u)
})
