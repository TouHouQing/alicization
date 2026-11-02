import type { WorkStep } from '../../../../shared/execution-contracts'

import { executionDigest } from './acceptance-compiler'
import { assertExecutionJson } from './work-plan-schema'

export function workInputHash(step: Pick<WorkStep, 'input' | 'inputBindings' | 'nativeWindowSourceStepId'>) {
  const input = step.inputBindings?.length ? { input: step.input, bindings: step.inputBindings } : step.input
  return executionDigest(step.nativeWindowSourceStepId ? { input, nativeWindowSourceStepId: step.nativeWindowSourceStepId } : input)
}

function property(value: unknown, key: string): unknown {
  if (['__proto__', 'constructor', 'prototype'].includes(key) || !value || typeof value !== 'object' || !Object.hasOwn(value, key))
    throw new Error('The observed work input path is absent or reserved')
  return (value as Record<string, unknown>)[key]
}

/** Resolve fixed bindings from committed receipts, never from model-authored replacement output. */
export async function resolveWorkInput(step: WorkStep, source: (stepId: string) => Promise<unknown>) {
  const input = { ...step.input }
  const used = new Set<string>()
  for (const binding of step.inputBindings ?? []) {
    if (!step.dependsOn.includes(binding.stepId) || used.has(binding.parameter) || ['__proto__', 'constructor', 'prototype'].includes(binding.parameter))
      throw new Error('Work input binding is not a unique accepted dependency')
    used.add(binding.parameter)
    const observation = await source(binding.stepId)
    let value = observation
    for (const key of binding.path) value = property(value, key)
    if (binding.select) {
      if (!Array.isArray(value) || value.length > 256)
        throw new Error('Work input selection requires a bounded observed collection')
      const { field, equals, valueField } = binding.select
      // WPF exposes an actionable control and its caption as separate peers.
      // The accepted action's role is part of its target, so require that same
      // role from the committed native observation before counting matches.
      const nativeRole = ['tool.desktop_click_element', 'tool.desktop_type_text'].includes(step.capabilityId)
        && binding.path.length === 1 && binding.path[0] === 'elements'
        && observation && typeof observation === 'object'
        && Object.hasOwn(observation, 'channel') && property(observation, 'channel') === 'desktop'
        && Object.hasOwn(observation, 'operation') && property(observation, 'operation') === 'desktop_list_interactables'
        && typeof step.input.role === 'string' && step.input.role.length > 0
        ? step.input.role
        : null
      const matches = value.filter(item => item && typeof item === 'object' && Object.hasOwn(item, field) && property(item, field) === equals
        && (nativeRole === null || (Object.hasOwn(item, 'role') && property(item, 'role') === nativeRole)))
      if (matches.length !== 1)
        throw new Error('Observed work input selection is absent or ambiguous')
      value = property(matches[0], valueField)
    }
    assertExecutionJson(value)
    input[binding.parameter] = value
  }
  return input
}
