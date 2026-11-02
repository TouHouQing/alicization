import type { ProcedureTemplate } from './procedure-template'

export function isProcedureBrowserInteraction(id: string) {
  return ['tool.browser_type_text', 'tool.browser_upload_files', 'tool.browser_click_element', 'tool.browser_wait'].includes(id)
}

const object = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
function parameter(value: unknown) {
  const ref = object(value)
  if (Object.keys(ref).length !== 1 || typeof ref.$parameter !== 'string')
    throw new Error('Interactive methods require fresh explicit arguments')
  return ref.$parameter
}

/** One observed form transaction, with fresh control references at every mutation. */
export function procedureBrowserInteraction(template: Pick<ProcedureTemplate, 'parameters' | 'steps' | 'criteria'>) {
  if (!template.steps.some(step => isProcedureBrowserInteraction(String(step.capabilityId))))
    return null
  const steps = template.steps
  if (steps.length < 8 || steps.length > 16 || steps.some((step, index) => JSON.stringify(step.dependsOn) !== JSON.stringify(index ? [steps[index - 1].id] : [])))
    throw new Error('Interactive methods require one bounded ordered observation chain')
  const first = steps[0]
  if (first.capabilityId !== 'tool.browser_open_url')
    throw new Error('Interactive methods must begin with their fresh page')
  const urlParameter = parameter(object(first.input).url)
  const fields: Array<{ labelParameter: string, textParameter: string }> = []
  const uploads: Array<{ labelParameter: string, filesParameter: string }> = []
  function target(read: Record<string, unknown>, action: Record<string, unknown>) {
    if (read.capabilityId !== 'tool.browser_read_page' || object(read.input).format !== 'interactables' || JSON.stringify(action.dependsOn) !== JSON.stringify([read.id]))
      throw new Error('Every interactive action requires its immediately preceding control observation')
    const bindings = action.inputBindings
    if (!Array.isArray(bindings) || bindings.length !== 1)
      throw new Error('Interactive methods cannot retain an authored selector')
    const binding = object(bindings[0])
    const select = object(binding.select)
    if (binding.parameter !== 'selector' || binding.stepId !== read.id || JSON.stringify(binding.path) !== '["elements"]' || select.field !== 'text' || select.valueField !== 'selector')
      throw new Error('Interactive methods select one fresh observed control by its explicit label')
    return parameter(select.equals)
  }
  let index = 1
  while (steps[index + 1]?.capabilityId === 'tool.browser_type_text') {
    const read = steps[index]
    const action = steps[index + 1]
    const input = object(action.input)
    if (fields.length >= 4 || input.clearExisting !== true || input.selector !== 'from-current-observation' || Object.keys(input).some(key => !['text', 'clearExisting', 'selector'].includes(key)))
      throw new Error('Interactive methods only transfer bounded replacement fields without implicit submission')
    fields.push({ labelParameter: target(read, action), textParameter: parameter(input.text) })
    index += 2
  }
  while (steps[index + 1]?.capabilityId === 'tool.browser_upload_files') {
    const read = steps[index]
    const action = steps[index + 1]
    const input = object(action.input)
    if (fields.length + uploads.length >= 4 || input.selector !== 'from-current-observation' || Object.keys(input).some(key => !['files', 'selector'].includes(key)))
      throw new Error('Upload methods require explicit files and an immediately observed file control')
    uploads.push({ labelParameter: target(read, action), filesParameter: parameter(input.files) })
    index += 2
  }
  const read = steps[index]
  const submit = steps[index + 1]
  if (!(fields.length + uploads.length) || !read || submit?.capabilityId !== 'tool.browser_click_element' || object(submit.input).selector !== 'from-current-observation' || Object.keys(object(submit.input)).some(key => key !== 'selector'))
    throw new Error('Interactive methods need explicit replacement fields and one final observed activation')
  const submitLabelParameter = target(read, submit)
  const wait = steps[index + 2]
  const receipt = steps[index + 3]
  const save = steps[index + 4]
  if (index + 5 !== steps.length || wait?.capabilityId !== 'tool.browser_wait' || object(wait.input).state !== 'complete' || object(wait.input).timeoutMs !== 10_000 || Object.keys(object(wait.input)).some(key => !['text', 'state', 'timeoutMs'].includes(key))
    || receipt?.capabilityId !== 'tool.browser_read_page' || object(receipt.input).format !== 'text' || save?.capabilityId !== 'tool.filesystem_write_file') {
    throw new Error('Interactive methods wait for and independently save their observed result')
  }
  const waitTextParameter = parameter(object(wait.input).text)
  const outputBinding = save.inputBindings
  const binding = object(Array.isArray(outputBinding) ? outputBinding[0] : null)
  if (!Array.isArray(outputBinding) || outputBinding.length !== 1 || binding.parameter !== 'content' || binding.stepId !== receipt.id || JSON.stringify(binding.path) !== '["content"]' || binding.select)
    throw new Error('Interactive result bytes must come from the final observation')
  const pathParameter = parameter(object(save.input).path)
  const criterion = template.criteria[0]
  const predicate = object(criterion?.predicate)
  if (template.criteria.length !== 1 || !criterion?.required || criterion.proofScope !== 'bytes' || predicate.kind !== 'file-bytes' || parameter(predicate.path) !== pathParameter)
    throw new Error('Interactive methods require one independent exact-byte output check')
  const hashParameter = parameter(predicate.sha256)
  const uses = [urlParameter, ...fields.flatMap(field => [field.labelParameter, field.textParameter]), ...uploads.flatMap(upload => [upload.labelParameter, upload.filesParameter]), submitLabelParameter, waitTextParameter, pathParameter, hashParameter]
  if (new Set(uses).size !== uses.length || uses.length !== template.parameters.length)
    throw new Error('Interactive methods require distinct fresh field, label and result arguments')
  return { urlParameter, fields, uploads, submitLabelParameter, waitTextParameter, pathParameter, hashParameter }
}
