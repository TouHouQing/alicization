import type { ProcedureTemplate } from './procedure-template'

import { isProcedureBrowserInteraction } from './procedure-browser-interaction'

export function procedurePageCount(template: Pick<ProcedureTemplate, 'steps'>) {
  if (template.steps.some(step => isProcedureBrowserInteraction(String(step.capabilityId))))
    return template.steps.filter(step => step.capabilityId === 'tool.browser_open_url').length
  return Math.max(template.steps.filter(step => step.capabilityId === 'tool.browser_open_url').length, template.steps.filter(step => step.capabilityId === 'tool.browser_read_page').length)
}

const record = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
function reference(value: unknown) {
  const object = record(value)
  return Object.keys(object).length === 1 && typeof object.$parameter === 'string' ? object.$parameter : null
}

/** Bind each multi-page read to its ordered navigation and independent output. */
export function procedurePageRoutes(template: Pick<ProcedureTemplate, 'parameters' | 'steps' | 'criteria'>) {
  if (procedurePageCount(template) <= 1)
    return null
  const pages = procedurePageCount(template)
  if (pages > 4 || template.steps.some(step => String(step.capabilityId).startsWith('coding_agent.')))
    throw new Error('Multi-page methods need a bounded dedicated browser evaluator')
  const steps = new Map(template.steps.map(step => [step.id, step]))
  const memo = new Map<unknown, Set<unknown>>()
  const visiting = new Set<unknown>()
  function ancestors(id: unknown): Set<unknown> {
    if (memo.has(id))
      return memo.get(id)!
    const step = steps.get(id)
    if (!step || visiting.has(id) || !Array.isArray(step.dependsOn))
      throw new Error('Multi-page browser actions need an ordered dependency graph')
    visiting.add(id)
    const result = new Set<unknown>()
    for (const parent of step.dependsOn) {
      result.add(parent)
      for (const ancestor of ancestors(parent)) result.add(ancestor)
    }
    visiting.delete(id)
    memo.set(id, result)
    return result
  }
  const browser = template.steps.filter(step => String(step.capabilityId).startsWith('tool.browser_'))
  for (const step of browser) {
    for (const other of browser) {
      if (step !== other && !ancestors(step.id).has(other.id) && !ancestors(other.id).has(step.id))
        throw new Error('Multi-page browser actions need one ordered observation chain')
    }
  }
  browser.sort((a, b) => ancestors(a.id).has(b.id) ? 1 : -1)
  if (browser.length !== pages * 2)
    throw new Error('Each multi-page navigation needs its own bounded text read')
  const routes: Array<{ urlParameter: string, pathParameter: string, hashParameter: string, openStepId: string, readStepId: string, writeStepId: string }> = []
  for (let index = 0; index < pages; index++) {
    const open = browser[index * 2]
    const read = browser[index * 2 + 1]
    if (open.capabilityId !== 'tool.browser_open_url' || read.capabilityId !== 'tool.browser_read_page')
      throw new Error('Each multi-page navigation needs its own ordered text read')
    const writers = template.steps.filter(step => step.capabilityId === 'tool.filesystem_write_file' && Array.isArray(step.inputBindings) && step.inputBindings.some((value) => {
      const binding = record(value)
      return binding.parameter === 'content' && binding.stepId === read.id && JSON.stringify(binding.path) === '["content"]'
    }))
    const writer = writers.length === 1 ? writers[0] : null
    const pathParameter = writer && reference(record(writer.input).path)
    const urlParameter = reference(record(open.input).url)
    const criteria = template.criteria.filter(item => record(item.predicate).kind === 'file-bytes' && reference(record(item.predicate).path) === pathParameter)
    const hashParameter = criteria.length === 1 && reference(record(criteria[0].predicate).sha256)
    if (!writer || !pathParameter || !urlParameter || !hashParameter || criteria[0].required !== true || criteria[0].proofScope !== 'bytes'
      || !template.parameters.some(item => item.name === urlParameter && item.kind === 'url')
      || !template.parameters.some(item => item.name === pathParameter && item.kind === 'path')
      || !template.parameters.some(item => item.name === hashParameter && item.kind === 'sha256')
      || routes.some(route => route.hashParameter === hashParameter || route.urlParameter === urlParameter || route.pathParameter === pathParameter)) {
      throw new Error('Each distinct page needs independent byte expectations, input URL and output file')
    }
    routes.push({ urlParameter, pathParameter, hashParameter, openStepId: String(open.id), readStepId: String(read.id), writeStepId: String(writer.id) })
  }
  if (template.criteria.length !== routes.length || template.steps.some(step => !routes.some(route => [route.openStepId, route.readStepId, route.writeStepId].includes(String(step.id)))))
    throw new Error('Multi-page evaluation requires independently checked page-to-file operations')
  return routes
}
