import type { ProcedureTemplate } from './procedure-template'

interface StepUse { kind: 'step', stepId: string, operation: string, field: string }
interface CriterionUse { kind: 'criterion', criterionId: string, predicate: string, field: string, pathParameter: string | null, transform: 'value' | 'sha256' }

/** Describe normalized parameter roles without restoring private source examples. */
export function describeProcedureParameters(template: ProcedureTemplate) {
  const uses = new Map(template.parameters.map(parameter => [parameter.name, [] as Array<StepUse | CriterionUse>]))
  for (const step of template.steps) {
    if (Array.isArray(step.inputBindings)) {
      for (const raw of step.inputBindings) {
        const binding = raw as { parameter?: string, select?: { equals?: { $parameter?: string } } }
        const ref = binding.select?.equals?.$parameter
        if (ref)
          uses.get(ref)?.push({ kind: 'step', stepId: String(step.id), operation: String(step.capabilityId), field: `inputBindings.${binding.parameter}.select.equals` })
      }
    }
    for (const [field, value] of Object.entries(step.input as Record<string, unknown>)) {
      const ref = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
      if (ref && Object.keys(ref).length === 1 && typeof ref.$parameter === 'string')
        uses.get(ref.$parameter)?.push({ kind: 'step', stepId: String(step.id), operation: String(step.capabilityId), field })
    }
  }
  for (const criterion of template.criteria) {
    const predicate = criterion.predicate as Record<string, unknown>
    const pathRef = predicate.path && typeof predicate.path === 'object' ? predicate.path as Record<string, unknown> : null
    const pathParameter = pathRef && typeof pathRef.$parameter === 'string' ? pathRef.$parameter : null
    function walk(value: unknown, field: string) {
      if (Array.isArray(value)) {
        value.forEach((entry, index) => walk(entry, `${field}[${index}]`))
        return
      }
      if (!value || typeof value !== 'object')
        return
      const object = value as Record<string, unknown>
      const parameter = typeof object.$parameter === 'string' ? object.$parameter : typeof object.$sha256 === 'string' ? object.$sha256 : null
      if (parameter && Object.keys(object).length === 1) {
        uses.get(parameter)?.push({ kind: 'criterion', criterionId: String(criterion.id), predicate: String(predicate.kind), field, pathParameter, transform: Object.hasOwn(object, '$sha256') ? 'sha256' : 'value' })
        return
      }
      for (const [key, entry] of Object.entries(object)) walk(entry, field ? `${field}.${key}` : key)
    }
    for (const [field, value] of Object.entries(predicate)) walk(value, field)
  }
  return template.parameters.map(parameter => ({ ...parameter, uses: uses.get(parameter.name)! }))
}

export function procedureParameterDescription(parameter: ReturnType<typeof describeProcedureParameters>[number]) {
  const links = parameter.uses.map(use => use.kind === 'step'
    ? `${use.stepId}: ${use.operation}.${use.field}`
    : `${use.criterionId}: ${use.predicate}.${use.field} for file argument ${use.pathParameter ?? '(none)'}${use.transform === 'sha256' ? ' (SHA256 of this value)' : ''}`)
  const description = `${parameter.role} (${parameter.kind}). ${links.join('; ')}`
  return description.length <= 1024 ? description : `${description.slice(0, 900)}; inspect life_list_learned_procedures for all uses.`
}
