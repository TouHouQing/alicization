import { describe, expect, it } from 'vitest'

import { createCanonicalToolRegistry } from '../turn-os/tool-registry'
import { validPlannedWorkInput } from './work-input-validation'

describe('planned receipt fields against actual operation schemas', () => {
  const binding = { parameter: 'selector', stepId: 'observe', path: ['elements'] }
  const step = { capabilityId: 'tool.browser_type_text', input: { selector: '@observed', text: 'fixed text' }, dependsOn: ['observe'], inputBindings: [binding] }
  function registry(inputSchema: Record<string, unknown>) {
    const registry = createCanonicalToolRegistry()
    registry.replace({ ...registry.resolveActive(step.capabilityId)!, version: '1.99.0', inputSchema })
    return registry
  }

  it('keeps an existing parameter valid in a generic object schema without inventing undeclared fields', () => {
    const tools = registry({ type: 'object', additionalProperties: true })
    expect(validPlannedWorkInput(tools, step)).toBe(true)
    expect(validPlannedWorkInput(tools, { ...step, input: { text: 'fixed text' } })).toBe(false)
    expect(validPlannedWorkInput(tools, { ...step, dependsOn: [] })).toBe(false)
  })

  it('requires all fixed input and applies additional-property constraints', () => {
    const tools = registry({ type: 'object', additionalProperties: { type: 'string' } })
    expect(validPlannedWorkInput(tools, step)).toBe(true)
    expect(validPlannedWorkInput(tools, { ...step, input: { ...step.input, text: 7 } })).toBe(false)
  })

  it('allows omission only for declared bound fields in a strict schema and preserves its remaining constraints', () => {
    const tools = registry({ type: 'object', properties: { selector: { type: 'string' }, text: { type: 'string', minLength: 1 } }, required: ['selector', 'text'], additionalProperties: false })
    expect(validPlannedWorkInput(tools, { ...step, input: { text: 'fixed text' } })).toBe(true)
    expect(validPlannedWorkInput(tools, { ...step, input: {} })).toBe(false)
    expect(validPlannedWorkInput(tools, { ...step, input: { text: '' } })).toBe(false)
    expect(validPlannedWorkInput(tools, { ...step, input: { ...step.input, hidden: 'x' }, inputBindings: [{ ...binding, parameter: 'hidden' }] })).toBe(false)
    expect(validPlannedWorkInput(tools, { ...step, inputBindings: [binding, binding] })).toBe(false)
    expect(validPlannedWorkInput(tools, { ...step, inputBindings: [{ ...binding, parameter: '__proto__' }] })).toBe(false)
    expect(tools.validateInput(step.capabilityId, { selector: ['wrong observed type'], text: 'fixed text' }).valid).toBe(false)
  })
})
