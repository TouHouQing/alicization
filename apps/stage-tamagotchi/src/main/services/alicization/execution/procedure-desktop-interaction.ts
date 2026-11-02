import type { ProcedureTemplate } from './procedure-template'

const object = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
function parameter(value: unknown) {
  const ref = object(value)
  if (Object.keys(ref).length !== 1 || typeof ref.$parameter !== 'string')
    throw new Error('Desktop methods require fresh explicit arguments')
  return ref.$parameter
}

export function isProcedureDesktopOperation(id: string) {
  return ['tool.desktop_list_interactables', 'tool.desktop_type_text', 'tool.desktop_click_element'].includes(id)
}

/** A semantic editor transaction; no remembered HWND, coordinates or key injection. */
export function procedureDesktopInteraction(template: Pick<ProcedureTemplate, 'parameters' | 'steps' | 'criteria'>) {
  if (!template.steps.some(step => isProcedureDesktopOperation(String(step.capabilityId))))
    return null
  const steps = template.steps
  if (steps.length !== 4 || steps.some((step, index) => JSON.stringify(step.dependsOn) !== JSON.stringify(index ? [steps[index - 1].id] : [])))
    throw new Error('Desktop methods require two fresh ordered observation/action pairs')
  const windowParameter = parameter(object(steps[0].input).windowTitle)
  function control(index: number, operation: string, field: string, role: string) {
    const read = steps[index]
    const action = steps[index + 1]
    const observed = object(read.input)
    const input = object(action.input)
    if (read.capabilityId !== 'tool.desktop_list_interactables' || parameter(observed.windowTitle) !== windowParameter || observed.maxItems !== 40 || Object.keys(observed).some(key => !['windowTitle', 'maxItems'].includes(key))
      || action.capabilityId !== operation || parameter(input.windowTitle) !== windowParameter || input[field] !== (field === 'role' ? 'input' : 'from-current-observation') || input.role !== role || input.exactText !== true) {
      throw new Error('Desktop actions require a current exact window and unambiguous control')
    }
    const bindings = action.inputBindings
    const binding = object(Array.isArray(bindings) ? bindings[0] : null)
    const select = object(binding.select)
    const selectorField = field === 'role' ? 'role' : 'name'
    if (!Array.isArray(bindings) || bindings.length !== 1 || binding.parameter !== field || binding.stepId !== read.id || JSON.stringify(binding.path) !== '["elements"]' || select.field !== selectorField || select.valueField !== selectorField)
      throw new Error('Desktop methods select their action label from the immediately observed controls')
    if (field === 'role') {
      if (select.equals !== 'input')
        throw new Error('Desktop editor methods require one unique freshly observed input role')
      return null
    }
    return parameter(select.equals)
  }
  control(0, 'tool.desktop_type_text', 'role', 'input')
  const saveLabelParameter = control(2, 'tool.desktop_click_element', 'text', 'button')!
  const typed = object(steps[1].input)
  const saved = object(steps[3].input)
  if (typed.clearExisting !== true || Object.keys(typed).some(key => !['windowTitle', 'text', 'role', 'exactText', 'clearExisting'].includes(key))
    || Object.keys(saved).some(key => !['windowTitle', 'text', 'role', 'exactText'].includes(key))) {
    throw new Error('Desktop methods only replace explicit text and invoke one observed save action')
  }
  const textParameter = parameter(typed.text)
  const criterion = template.criteria[0]
  const predicate = object(criterion?.predicate)
  if (template.criteria.length !== 1 || !criterion?.required || criterion.proofScope !== 'bytes' || predicate.kind !== 'file-bytes')
    throw new Error('Desktop methods require one independent exact saved-file check')
  const pathParameter = parameter(predicate.path)
  const expected = object(predicate.sha256)
  if (Object.keys(expected).length !== 1 || expected.$sha256 !== textParameter)
    throw new Error('Desktop editor methods require independently verified exact UTF-8 input bytes')
  const uses = [windowParameter, textParameter, saveLabelParameter, pathParameter]
  if (new Set(uses).size !== uses.length || template.parameters.length !== uses.length || uses.some(name => !template.parameters.some(item => item.name === name)))
    throw new Error('Desktop methods require distinct fresh window, control, content and file arguments')
  return { windowParameter, textParameter, saveLabelParameter, pathParameter }
}
