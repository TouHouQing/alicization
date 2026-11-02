import type { ValidateFunction } from 'ajv'

import type { WorkStep } from '../../../../shared/execution-contracts'
import type { ToolRegistry } from '../turn-os/tool-registry'

import Ajv from 'ajv'

import { executionDigest } from './acceptance-compiler'

const ajv = new Ajv({ strict: false, allErrors: true, useDefaults: false, coerceTypes: false, removeAdditional: false })
const validators = new Map<string, ValidateFunction>()
const reserved = new Set(['__proto__', 'prototype', 'constructor'])

/** Validate fixed inputs now; receipt-bound fields receive full checks at dispatch. */
export function validPlannedWorkInput(registry: ToolRegistry, step: Pick<WorkStep, 'capabilityId' | 'input' | 'inputBindings' | 'dependsOn'>): boolean {
  if (!step.inputBindings?.length)
    return registry.validateInput(step.capabilityId, step.input).valid
  const manifest = registry.resolveActive(step.capabilityId)
  if (!manifest || manifest.inputSchema.type !== 'object')
    return false
  const schema = structuredClone(manifest.inputSchema)
  const properties = schema.properties === undefined ? {} : schema.properties
  if (!properties || typeof properties !== 'object' || Array.isArray(properties))
    return false
  const bound = new Set<string>()
  for (const binding of step.inputBindings) {
    if (reserved.has(binding.parameter) || bound.has(binding.parameter) || !step.dependsOn.includes(binding.stepId)
      || (!Object.hasOwn(properties, binding.parameter) && (schema.additionalProperties === false || !Object.hasOwn(step.input, binding.parameter)))) {
      return false
    }
    bound.add(binding.parameter)
  }
  if (Array.isArray(schema.required))
    schema.required = schema.required.filter(key => typeof key !== 'string' || !bound.has(key))
  const input = Object.fromEntries(Object.entries(step.input).filter(([key]) => !bound.has(key)))
  const key = executionDigest({ capabilityId: manifest.capabilityId, version: manifest.version, schema })
  let validate = validators.get(key)
  if (!validate) {
    if (validators.size >= 128)
      validators.delete(validators.keys().next().value!)
    validate = ajv.compile(schema)
    validators.set(key, validate)
  }
  return Boolean(validate(input))
}
