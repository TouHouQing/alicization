import type { ExecutionCriterion, ExecutionWorkProposal, WorkPlan } from '../../../../shared/execution-contracts'
import type { ToolRegistry } from '../turn-os/tool-registry'

import { createHash } from 'node:crypto'
import { isAbsolute } from 'node:path'

import { executionDigest } from './acceptance-compiler'
import { isProcedureBrowserInteraction, procedureBrowserInteraction } from './procedure-browser-interaction'
import { isProcedureDesktopOperation, procedureDesktopInteraction } from './procedure-desktop-interaction'
import { procedurePageRoutes } from './procedure-page-routes'
import { describeProcedureParameters, procedureParameterDescription } from './procedure-parameters'
import { isProcedurePageUrl, transferableProcedureOperation } from './procedure-transfer-operations'
import { validPlannedWorkInput } from './work-input-validation'
import { assertExecutionJson } from './work-plan-schema'
import { createWorkPlanToolSpec, normalizeWorkProposal } from './work-plan-tool'

export interface ProcedureParameter {
  name: string
  kind: 'path' | 'directory' | 'url' | 'text' | 'instruction' | 'program' | 'argument-list' | 'text-list' | 'file-list' | 'sha256' | 'entry-name'
  role: 'file' | 'workspace' | 'instructions' | 'program' | 'program-arguments' | 'page-url' | 'content' | 'attachments' | 'expected-text' | 'json-keys' | 'directory-entries' | 'expected-hash' | 'selected-entry' | 'control-label' | 'window-title'
}
export interface ProcedureTemplate {
  version: 1
  parameters: ProcedureParameter[]
  tools: Array<{ id: string, version: string, interfaceHash: string }>
  steps: Array<Record<string, unknown>>
  criteria: Array<Record<string, unknown>>
}
interface ParameterRef { $parameter: string }
const observationFields = new Set(['text', 'content', 'path', 'entries', 'name', 'type', 'data', 'output', 'structuredContent'])
const proposalSchema = createWorkPlanToolSpec(async () => null).parameters
const hashText = (text: string) => createHash('sha256').update(text).digest('hex')

export function procedureToolInterface(registry: ToolRegistry, id: string) {
  // Same-version policy changes must invalidate an old passing evaluation too.
  return transferableProcedureOperation(registry, id)
}

/** Compile structure only. Original text, file paths and filenames become arguments. */
export function compileProcedureTemplate(plan: WorkPlan, criteria: ExecutionCriterion[], registry: ToolRegistry): ProcedureTemplate {
  if (!plan.steps.length || plan.steps.length > 64 || !criteria.length || criteria.length > 32)
    throw new Error('The procedure is outside its transferable step budget')
  if (plan.steps.filter(step => step.capabilityId.startsWith('coding_agent.')).length > 1)
    throw new Error('Multiple delegated steps require their own transfer evaluator')
  const interactive = plan.steps.some(step => isProcedureBrowserInteraction(step.capabilityId))
  const multiPage = plan.steps.filter(step => step.capabilityId === 'tool.browser_open_url').length > 1 || (!interactive && plan.steps.filter(step => step.capabilityId === 'tool.browser_read_page').length > 1)
  const parameters: ProcedureParameter[] = []
  const references = new Map<string, ParameterRef>()
  function parameter(value: unknown, kind: ProcedureParameter['kind'], role: ProcedureParameter['role'], semanticScope?: string): ParameterRef {
    const key = `${kind}:${executionDigest(value)}:${semanticScope ?? ''}`
    let reference = references.get(key)
    if (!reference) {
      if (parameters.length >= 64)
        throw new Error('The procedure needs too many independent arguments')
      const name = `input${parameters.length + 1}`
      parameters.push({ name, kind, role })
      reference = { $parameter: name }
      references.set(key, reference)
    }
    return reference
  }
  const stepIds = new Map(plan.steps.map((step, index) => [step.id, `step${index + 1}`]))
  const criterionIds = new Map(criteria.map((criterion, index) => [criterion.id, `result${index + 1}`]))
  const written = new Map<string, { text: string, parameter: ParameterRef }>()
  const tools = [...new Set(plan.steps.map(step => step.capabilityId))].sort().map(id => procedureToolInterface(registry, id))
  const steps = plan.steps.map((step) => {
    if (!validPlannedWorkInput(registry, step))
      throw new Error('The observed procedure input no longer matches its operation')
    const input: Record<string, unknown> = {}
    const delegated = step.capabilityId.startsWith('coding_agent.')
    if (delegated && (step.input.effect !== 'mutate' || step.inputBindings?.length || JSON.stringify(step.input).length > 12000))
      throw new Error('Delegated methods require fresh explicit mutation instructions and the complete approval budget')
    const bound = new Set(step.inputBindings?.map(binding => binding.parameter))
    for (const [key, value] of Object.entries(step.input)) {
      // Dispatch replaces these values from receipts. Ignored examples must
      // neither leak into the skill nor become unrelated future arguments.
      if (bound.has(key))
        continue
      if (delegated) {
        if (key === 'cwd' && typeof value === 'string' && isAbsolute(value))
          input.cwd = parameter(value, 'directory', 'workspace')
        else if (key === 'prompt' && step.capabilityId !== 'coding_agent.cli' && typeof value === 'string' && value.length > 0 && value.length <= 8000)
          input.prompt = parameter(value, 'instruction', 'instructions')
        else if (key === 'command' && step.capabilityId === 'coding_agent.cli' && typeof value === 'string' && value.length > 0 && value.length <= 8000)
          input.command = parameter(value, 'program', 'program')
        else if (key === 'args' && step.capabilityId === 'coding_agent.cli' && Array.isArray(value) && value.length <= 32 && value.every(item => typeof item === 'string' && item.length <= 2048))
          input.args = parameter(value, 'argument-list', 'program-arguments')
        else if (key === 'effect' && value === 'mutate')
          input.effect = value
        else
          throw new Error('Delegated procedure input requires its own transfer policy')
      }
      else if (step.capabilityId === 'tool.browser_open_url') {
        if (key !== 'url' || !isProcedurePageUrl(value))
          throw new Error('Browser procedure navigation requires a fresh HTTP page URL')
        input.url = parameter(value, 'url', 'page-url', multiPage ? stepIds.get(step.id) : undefined)
      }
      else if (step.capabilityId === 'tool.browser_read_page') {
        if ((key === 'format' && (value === 'text' || (interactive && value === 'interactables'))) || (key === 'maxChars' && Number.isInteger(value) && Number(value) >= 200 && Number(value) <= 24_000))
          input[key] = value
        else
          throw new Error('Browser procedures only transfer bounded text observations')
      }
      else if (step.capabilityId === 'tool.browser_type_text') {
        if (key === 'text' && typeof value === 'string' && value.length > 0 && value.length <= 16_000)
          input.text = parameter(value, 'text', 'content', stepIds.get(step.id))
        else if (key === 'clearExisting' && value === true)
          input.clearExisting = true
        else
          throw new Error('Interactive methods only transfer explicit replacement text')
      }
      else if (step.capabilityId === 'tool.browser_upload_files') {
        if (key !== 'files' || !Array.isArray(value) || value.length < 1 || value.length > 4 || new Set(value).size !== value.length || value.some(path => typeof path !== 'string' || !isAbsolute(path)))
          throw new Error('Upload methods require one to four distinct explicit absolute file arguments')
        input.files = parameter(value, 'file-list', 'attachments', stepIds.get(step.id))
      }
      else if (step.capabilityId === 'tool.browser_wait') {
        if (key === 'text' && typeof value === 'string' && value.length > 0 && value.length <= 4096)
          input.text = parameter(value, 'text', 'expected-text', stepIds.get(step.id))
        else if ((key === 'state' && value === 'complete') || (key === 'timeoutMs' && value === 10_000))
          input[key] = value
        else
          throw new Error('Interactive methods require a bounded explicit result wait')
      }
      else if (isProcedureDesktopOperation(step.capabilityId)) {
        if (key === 'windowTitle' && typeof value === 'string' && value.length > 0 && value.length <= 180)
          input.windowTitle = parameter(value, 'text', 'window-title')
        else if (step.capabilityId === 'tool.desktop_type_text' && key === 'text' && typeof value === 'string' && value.length > 0 && value.length <= 16_000)
          input.text = parameter(value, 'text', 'content', stepIds.get(step.id))
        else if ((key === 'maxItems' && value === 40) || (key === 'role' && ['input', 'button'].includes(String(value))) || (['exactText', 'clearExisting'].includes(key) && value === true))
          input[key] = value
        else
          throw new Error('Desktop methods require explicit semantic controls and replacement text')
      }
      else if (key === 'path' && typeof value === 'string' && isAbsolute(value)) {
        input[key] = parameter(value, 'path', 'file')
      }
      else if (key === 'content' && typeof value === 'string') {
        input[key] = parameter(value, 'text', 'content')
      }
      else if (['recursive', 'maxEntries', 'maxReturnBytes'].includes(key) && ['number', 'boolean'].includes(typeof value)) {
        input[key] = value
      }
      else {
        throw new Error('The procedure contains an input that requires a dedicated transfer policy')
      }
    }
    // Optional source arguments still need a fresh explicit vector at replay;
    // the evaluator replaces the program and must not inherit its private text.
    if (step.capabilityId === 'coding_agent.cli' && !Object.hasOwn(input, 'args'))
      input.args = parameter([], 'argument-list', 'program-arguments')
    const bindings = step.inputBindings?.map((binding) => {
      if (isProcedureDesktopOperation(step.capabilityId)) {
        const source = plan.steps.find(step => step.id === binding.stepId)
        const field = step.capabilityId === 'tool.desktop_type_text' ? 'role' : step.capabilityId === 'tool.desktop_click_element' ? 'text' : null
        const selectorField = field === 'role' ? 'role' : 'name'
        if (!field || binding.parameter !== field || source?.capabilityId !== 'tool.desktop_list_interactables' || JSON.stringify(binding.path) !== '["elements"]' || binding.select?.field !== selectorField || binding.select.valueField !== selectorField || typeof binding.select.equals !== 'string' || !binding.select.equals || (field === 'role' && binding.select.equals !== 'input'))
          throw new Error('Desktop methods need an exact currently observed control label')
        input[field] = field === 'role' ? 'input' : 'from-current-observation'
        return { ...binding, stepId: stepIds.get(binding.stepId)!, select: { ...binding.select, equals: field === 'role' ? 'input' : parameter(binding.select.equals, 'text', 'control-label', `label:${stepIds.get(step.id)}`) } }
      }
      if (interactive && binding.parameter === 'selector') {
        const source = plan.steps.find(step => step.id === binding.stepId)
        if (!['tool.browser_type_text', 'tool.browser_upload_files', 'tool.browser_click_element'].includes(step.capabilityId) || source?.capabilityId !== 'tool.browser_read_page' || source.input.format !== 'interactables' || JSON.stringify(binding.path) !== '["elements"]' || binding.select?.field !== 'text' || binding.select.valueField !== 'selector' || typeof binding.select.equals !== 'string' || !binding.select.equals)
          throw new Error('Interactive methods need one explicit current observed control label')
        input.selector = 'from-current-observation'
        return { ...binding, stepId: stepIds.get(binding.stepId)!, select: { ...binding.select, equals: parameter(binding.select.equals, 'text', 'control-label', `label:${stepIds.get(step.id)}`) } }
      }
      if (!['path', 'content'].includes(binding.parameter) || !stepIds.has(binding.stepId) || binding.path.some(field => !observationFields.has(field) && !/^\d+$/u.test(field)))
        throw new Error('The procedure contains a nontransferable observation binding')
      if (binding.select && (!observationFields.has(binding.select.field) || !observationFields.has(binding.select.valueField)))
        throw new Error('The procedure selects a private or unsupported observation field')
      const selector = binding.select
      const source = plan.steps.find(step => step.id === binding.stepId)
      if (source?.capabilityId.startsWith('tool.browser_') && (binding.parameter !== 'content' || binding.path.length !== 1 || binding.path[0] !== 'content' || selector))
        throw new Error('Browser text may supply file content, never a future action target')
      const textBlock = source?.capabilityId === 'tool.filesystem_read_file' && binding.parameter === 'content' && binding.path.length === 1 && binding.path[0] === 'content'
        && selector?.field === 'type' && selector.equals === 'text' && selector.valueField === 'text'
      // MCP text-block type is a fixed protocol tag, not a selectable filename.
      return { ...binding, stepId: stepIds.get(binding.stepId)!, ...(selector ? { select: { ...selector, equals: textBlock ? selector.equals : parameter(selector.equals, 'entry-name', 'selected-entry') } } : {}) }
    })
    if (step.capabilityId === 'tool.filesystem_write_file' && typeof step.input.path === 'string' && typeof step.input.content === 'string' && !bound.has('path') && !bound.has('content'))
      written.set(step.input.path, { text: step.input.content, parameter: input.content as ParameterRef })
    return { id: stepIds.get(step.id)!, dependsOn: step.dependsOn.map(id => stepIds.get(id)!), capabilityId: step.capabilityId, input, acceptanceCriterionIds: step.acceptanceCriterionIds.map(id => criterionIds.get(id)!), ...(bindings?.length ? { inputBindings: bindings } : {}) }
  })
  const nativeWriter = plan.steps.find(step => step.capabilityId === 'tool.desktop_type_text')
  const nativeCriterion = criteria.length === 1 ? criteria[0].predicate : null
  const nativeText = (steps.find(step => step.capabilityId === 'tool.desktop_type_text')?.input as Record<string, unknown> | undefined)?.text
  if (nativeWriter && typeof nativeWriter.input.text === 'string' && nativeCriterion?.kind === 'file-bytes' && nativeText)
    written.set(nativeCriterion.path, { text: nativeWriter.input.text, parameter: nativeText as ParameterRef })
  const compiledCriteria = criteria.map((criterion) => {
    const predicate = criterion.predicate
    if (!['file-bytes', 'file-matches-read', 'text-content', 'json-structure', 'directory-members'].includes(predicate.kind) || !('path' in predicate))
      throw new Error('This success predicate needs a dedicated procedure evaluator')
    const result: Record<string, unknown> = { kind: predicate.kind, path: parameter(predicate.path, 'path', 'file') }
    if (predicate.kind === 'file-bytes') {
      const writer = written.get(predicate.path)
      result.sha256 = writer && hashText(writer.text) === predicate.sha256
        ? { $sha256: writer.parameter.$parameter }
        : parameter(predicate.sha256, 'sha256', 'expected-hash', multiPage ? criterionIds.get(criterion.id) : undefined)
    }
    else if (predicate.kind === 'file-matches-read') {
      const source = plan.steps.find(step => step.id === predicate.stepId)
      if (source?.capabilityId !== 'tool.filesystem_read_file')
        throw new Error('A transferable copy needs its accepted read source')
      result.stepId = stepIds.get(predicate.stepId)!
    }
    else if (predicate.kind === 'text-content') {
      const writer = written.get(predicate.path)
      result.includes = predicate.includes.map(text => writer?.text === text ? writer.parameter : parameter(text, 'text', 'expected-text'))
    }
    else if (predicate.kind === 'json-structure') {
      result.requiredKeys = parameter(predicate.requiredKeys, 'text-list', 'json-keys')
    }
    else if (predicate.kind === 'directory-members') {
      result.names = parameter(predicate.names, 'text-list', 'directory-entries')
      result.exact = predicate.exact
    }
    return { id: criterionIds.get(criterion.id)!, required: criterion.required, proofScope: criterion.proofScope, predicate: result }
  })
  const template: ProcedureTemplate = { version: 1, parameters, tools, steps, criteria: compiledCriteria }
  procedureBrowserInteraction(template)
  procedureDesktopInteraction(template)
  procedurePageRoutes(template)
  assertExecutionJson(template)
  if (JSON.stringify(template).length > 32_000)
    throw new Error('The procedure exceeds its stored template budget')
  return template
}

export function procedureInputSchema(template: ProcedureTemplate): Record<string, unknown> {
  const desktop = procedureDesktopInteraction(template)
  const nativeBounds = new Map(desktop ? [[desktop.windowParameter, 180], [desktop.textParameter, 16_000], [desktop.saveLabelParameter, 511]] : [])
  return {
    type: 'object',
    additionalProperties: false,
    required: template.parameters.map(parameter => parameter.name),
    properties: Object.fromEntries(describeProcedureParameters(template).map(parameter => [parameter.name, { description: procedureParameterDescription(parameter), ...(['text-list', 'argument-list', 'file-list'].includes(parameter.kind)
      ? { type: 'array', ...(parameter.kind === 'file-list' ? { minItems: 1, uniqueItems: true } : {}), maxItems: parameter.kind === 'file-list' ? 4 : parameter.kind === 'argument-list' ? 32 : 512, items: { type: 'string', minLength: parameter.kind === 'argument-list' ? 0 : 1, maxLength: parameter.kind === 'argument-list' ? 2048 : 4096 } }
      : { type: 'string', ...(parameter.kind === 'text' && !nativeBounds.has(parameter.name) ? {} : { minLength: 1 }), maxLength: nativeBounds.get(parameter.name) ?? parameterTextBudget(parameter.kind), ...(parameter.kind === 'sha256' ? { pattern: '^[a-f0-9]{64}$' } : {}) }) }])),
  }
}

/** Arguments never alter capabilities, dependencies, required predicates or versions. */
export function instantiateProcedureTemplate(template: ProcedureTemplate, arguments_: Record<string, unknown>, registry: ToolRegistry, goal: string): ExecutionWorkProposal {
  const interaction = procedureBrowserInteraction(template)
  const desktop = procedureDesktopInteraction(template)
  assertExecutionJson(arguments_)
  if (Object.keys(arguments_).length !== template.parameters.length || template.parameters.some(parameter => !Object.hasOwn(arguments_, parameter.name)))
    throw new Error('Procedure arguments do not match the evaluated parameter set')
  for (const parameter of template.parameters) {
    const value = arguments_[parameter.name]
    if (parameter.kind === 'file-list') {
      if (!Array.isArray(value) || value.length < 1 || value.length > 4 || new Set(value).size !== value.length || value.some(item => typeof item !== 'string' || item.length > 4096 || !isAbsolute(item)))
        throw new Error('Procedure uploads require one to four distinct absolute files')
    }
    else if (parameter.kind === 'argument-list') {
      if (!Array.isArray(value) || value.length > 32 || value.some(item => typeof item !== 'string' || item.length > 2048))
        throw new Error('Procedure program arguments are outside their bounded input domain')
    }
    else if (parameter.kind === 'text-list') {
      if (!Array.isArray(value) || value.length > 512 || value.some(item => typeof item !== 'string' || !item || item.length > 4096))
        throw new Error('Procedure list arguments are invalid')
    }
    else if (typeof value !== 'string' || value.length > parameterTextBudget(parameter.kind) || (parameter.kind !== 'text' && !value) || (['path', 'directory'].includes(parameter.kind) && !isAbsolute(value)) || (parameter.kind === 'url' && !isProcedurePageUrl(value)) || (parameter.kind === 'sha256' && !/^[a-f\d]{64}$/u.test(value)) || (parameter.kind === 'entry-name' && /[/\\]/u.test(value))) {
      throw new Error('Procedure argument is outside its declared input domain')
    }
    if (parameter.role === 'directory-entries' && (value as string[]).some(name => /[/\\]/u.test(name) || ['.', '..'].includes(name)))
      throw new Error('Directory names must remain inside their accepted folder')
  }
  for (const tool of template.tools) {
    if (executionDigest(tool) !== executionDigest(procedureToolInterface(registry, tool.id)))
      throw new Error('Procedure operation interface changed; reevaluation is required')
  }
  if (interaction) {
    const boundedText = (name: string, maximum: number) => typeof arguments_[name] === 'string' && (arguments_[name] as string).length > 0 && (arguments_[name] as string).length <= maximum
    if (interaction.fields.some(field => !boundedText(field.textParameter, 16_000) || !boundedText(field.labelParameter, 4096)) || interaction.uploads.some(upload => !boundedText(upload.labelParameter, 4096)) || !boundedText(interaction.submitLabelParameter, 4096) || !boundedText(interaction.waitTextParameter, 4096))
      throw new Error('Interactive arguments exceed their actual field or control-label budget')
  }
  if (desktop) {
    for (const [name, maximum] of [[desktop.windowParameter, 180], [desktop.textParameter, 16_000], [desktop.saveLabelParameter, 511]] as const) {
      if (typeof arguments_[name] !== 'string' || !(arguments_[name] as string).length || (arguments_[name] as string).length > maximum)
        throw new Error('Desktop arguments exceed their observed window, label or text budget')
    }
  }
  function expand(value: unknown): unknown {
    if (Array.isArray(value))
      return value.map(expand)
    if (value && typeof value === 'object') {
      const object = value as Record<string, unknown>
      if (Object.keys(object).length === 1 && typeof object.$parameter === 'string') {
        if (!Object.hasOwn(arguments_, object.$parameter))
          throw new Error('Procedure refers to an undeclared argument')
        return structuredClone(arguments_[object.$parameter])
      }
      if (Object.keys(object).length === 1 && typeof object.$sha256 === 'string') {
        const text = arguments_[object.$sha256]
        if (typeof text !== 'string')
          throw new Error('Procedure content hashing requires its declared text argument')
        return hashText(text)
      }
      return Object.fromEntries(Object.entries(object).map(([key, child]) => [key, expand(child)]))
    }
    return value
  }
  const proposal = normalizeWorkProposal(proposalSchema.parse({ goal, steps: expand(template.steps), criteria: expand(template.criteria) }))
  for (const step of proposal.steps) {
    if (step.capabilityId.startsWith('coding_agent.') && JSON.stringify(step.input).length > 12000)
      throw new Error('Expanded delegated instructions exceed the complete approval budget')
    if (!validPlannedWorkInput(registry, step))
      throw new Error(`Expanded procedure no longer matches its operation contract (${step.id}: ${step.capabilityId})`)
  }
  return proposal
}

function parameterTextBudget(kind: ProcedureParameter['kind']) {
  return kind === 'text' ? 64_000 : ['instruction', 'program'].includes(kind) ? 8000 : 4096
}
