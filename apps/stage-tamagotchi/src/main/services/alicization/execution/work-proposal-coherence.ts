import { AsyncLocalStorage } from 'node:async_hooks'
import { createHash } from 'node:crypto'
import { isAbsolute, normalize } from 'node:path'
import { platform } from 'node:process'

import { executionDigest } from './acceptance-compiler'
import { assertExecutionJson } from './work-plan-schema'
import { createWorkPlanToolSpec, normalizeWorkCriteria, normalizeWorkProposal } from './work-plan-tool'

const schema = createWorkPlanToolSpec(async () => null).parameters
const intentSchema = schema.pick({ goal: true, criteria: true })
interface RepairFence { intentFence?: string, proposalFence?: string }
const repairs = new AsyncLocalStorage<RepairFence>()
const fileCapabilities = new Set(['tool.filesystem_read_file', 'tool.filesystem_write_file', 'tool.filesystem_list_directory'])
const pathKey = (path: string) => platform === 'win32' ? normalize(path).toLowerCase() : normalize(path)

/** Offline contradiction detection, never evidence of execution or success. */
export function inspectWorkProposalCoherence(input: unknown) {
  assertExecutionJson(input)
  const parsed = schema.safeParse(input)
  if (!parsed.success)
    return []
  const proposal = normalizeWorkProposal(parsed.data)
  // Other channels and dynamic destinations can change the eventual artifact.
  // Only the independent verifier can decide those cases.
  if (proposal.steps.some(step => !fileCapabilities.has(step.capabilityId) || step.capabilityId === 'tool.filesystem_write_file' && step.inputBindings?.some(binding => binding.parameter === 'path')))
    return []
  const byId = new Map(proposal.steps.map(step => [step.id, step]))
  if (byId.size !== proposal.steps.length)
    return []
  const ancestors = (id: string) => {
    const visited = new Set<string>()
    const queue = [...(byId.get(id)?.dependsOn ?? [])]
    while (queue.length) {
      const parent = queue.pop()!
      if (visited.has(parent))
        continue
      visited.add(parent)
      queue.push(...(byId.get(parent)?.dependsOn ?? []))
    }
    return visited
  }
  const issues: Array<{ keyword: string, field: string }> = []
  for (const criterion of proposal.criteria) {
    const predicate = criterion.predicate
    if (!criterion.required || !['file-bytes', 'text-content', 'json-structure'].includes(predicate.kind) || !('path' in predicate) || !isAbsolute(predicate.path))
      continue
    const writers = proposal.steps.filter(step => step.capabilityId === 'tool.filesystem_write_file' && typeof step.input.path === 'string' && isAbsolute(step.input.path) && pathKey(step.input.path) === pathKey(predicate.path))
    const final = writers.find((candidate) => {
      const prior = ancestors(candidate.id)
      return !prior.has(candidate.id) && writers.every(other => other.id === candidate.id || prior.has(other.id))
    })
    if (!final || typeof final.input.content !== 'string' || final.inputBindings?.some(binding => binding.parameter === 'content'))
      continue
    const content = final.input.content
    let matches = true
    if (predicate.kind === 'file-bytes') {
      matches = createHash('sha256').update(content, 'utf8').digest('hex') === predicate.sha256
    }
    else if (predicate.kind === 'text-content') {
      matches = predicate.includes.every(text => content.includes(text))
    }
    else if (predicate.kind === 'json-structure') {
      try {
        const value: unknown = JSON.parse(content)
        matches = value !== null && typeof value === 'object' && !Array.isArray(value) && predicate.requiredKeys.every(key => Object.hasOwn(value, key))
      }
      catch { matches = false }
    }
    if (!matches)
      issues.push({ keyword: 'literalArtifactMismatch', field: `steps.${proposal.steps.indexOf(final)}.input.content` })
  }
  return issues.slice(0, 8)
}

/** A repair may change literal write content, preserving every other argument. */
export function workProposalRepairFence(input: unknown) {
  const proposal = normalizeWorkProposal(schema.parse(input))
  return executionDigest({ ...proposal, steps: proposal.steps.map(step => ({ ...step, input: { ...step.input, ...(step.capabilityId === 'tool.filesystem_write_file' && typeof step.input.content === 'string' ? { content: { repairSlot: 'literal-file-content' } } : {}) } })) })
}

export function workProposalIntentFence(input: unknown) {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    return null
  const record = input as Record<string, unknown>
  const candidate = { goal: record.goal, criteria: record.criteria }
  try {
    assertExecutionJson(candidate)
    const parsed = intentSchema.safeParse(candidate)
    return parsed.success ? executionDigest({ ...parsed.data, criteria: normalizeWorkCriteria(parsed.data.criteria) }) : null
  }
  catch { return null }
}

export function withWorkProposalRepair<T>(fence: RepairFence, task: () => Promise<T>) {
  return repairs.run(fence, task)
}

/** Reject a changed contract before even publishing its proposed tool call. */
export function assertWorkProposalRepair(capabilityId: string, input: unknown) {
  const fence = repairs.getStore()
  if (!fence?.intentFence && !fence?.proposalFence)
    return
  if (capabilityId !== 'tool.life_execute_work_plan' || fence.intentFence && workProposalIntentFence(input) !== fence.intentFence || fence.proposalFence && workProposalRepairFence(input) !== fence.proposalFence)
    throw new Error('The corrected work proposal changed its goal, criteria, targets or plan structure')
}
