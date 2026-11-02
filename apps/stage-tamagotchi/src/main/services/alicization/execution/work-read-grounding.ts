import type { WorkStep } from '../../../../shared/execution-contracts'
import type { WorkAdaptationContext } from './work-adaptation-context'

import { platform } from 'node:process'

import { executionDigest } from './acceptance-compiler'

const fileReads = new Set(['tool.filesystem_read_file', 'tool.filesystem_list_directory', 'tool.filesystem_search_files'])
const directoryReads = new Set(['tool.filesystem_list_directory', 'tool.filesystem_search_files'])

function object(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
}

function pathKey(value: unknown): string | null {
  if (typeof value !== 'string' || !value || value.includes('\0'))
    return null
  const segments = value.split(platform === 'win32' ? /[\\/]/u : /\//u)
  if (segments.some(segment => segment === '.' || segment === '..'))
    return null
  // Retain case and spelling. This establishes observed data provenance, not
  // filesystem alias equivalence or permission to follow another target.
  return platform === 'win32' ? value.replaceAll('\\', '/') : value
}

function metadataBinding(binding: NonNullable<WorkStep['inputBindings']>[number], source: WorkStep | undefined) {
  if (!source || !fileReads.has(source.capabilityId))
    return false
  const keys = binding.path
  if (!binding.select && keys.length === 2 && keys[0] === 'structuredContent' && keys[1] === 'path')
    return true
  if (!directoryReads.has(source.capabilityId) || keys[0] !== 'structuredContent' || keys[1] !== (source.capabilityId === 'tool.filesystem_list_directory' ? 'entries' : 'matches'))
    return false
  if (binding.select)
    return keys.length === 2 && binding.select.valueField === 'path' && ['name', 'path', 'type'].includes(binding.select.field)
  return keys.length === 4 && /^(?:0|[1-9]\d{0,2})$/u.test(keys[2]) && Number(keys[2]) < 256 && keys[3] === 'path'
}

/**
 * Ground automatic future reads before publishing a revision. Risk policy,
 * resource ownership and the final dispatch checks remain separate gates.
 */
export function assertGroundedAdaptiveReads(context: Pick<WorkAdaptationContext, 'plan' | 'verifiedStepIds' | 'observations'>, steps: WorkStep[]) {
  const known = new Set<string>()
  for (const original of context.plan.steps) {
    if (original.inputBindings?.some(binding => binding.parameter === 'path'))
      continue
    const key = fileReads.has(original.capabilityId) && pathKey(original.input.path)
    if (key)
      known.add(key)
  }
  for (const observation of context.observations) {
    const original = context.plan.steps.find(step => step.id === observation.stepId)
    if (!original || !context.verifiedStepIds.includes(original.id) || !fileReads.has(original.capabilityId) || observation.outputHash !== executionDigest(observation.output))
      continue
    const metadata = object(object(observation.output)?.structuredContent)
    const root = metadata && pathKey(metadata.path)
    if (!root)
      continue
    if (original.capabilityId === 'tool.filesystem_read_file') {
      if (metadata?.readVerified === true)
        known.add(root)
      continue
    }
    const collection = metadata?.[original.capabilityId === 'tool.filesystem_list_directory' ? 'entries' : 'matches']
    if (!Array.isArray(collection) || collection.length > 256)
      continue
    known.add(root)
    const prefix = root.endsWith('/') ? root : `${root}/`
    const declaredRoot = !original.inputBindings?.some(binding => binding.parameter === 'path') && pathKey(original.input.path)
    for (const entry of collection) {
      const item = object(entry)
      const key = pathKey(item?.path)
      if (key && key.startsWith(prefix) && (item?.type === 'file' || item?.type === 'directory')) {
        known.add(key)
        // Directory discovery returns its canonical root. Also retain the same
        // observed child under that exact request's original root spelling
        // (for example a Windows AppData alias); never infer another parent.
        if (declaredRoot)
          known.add(`${declaredRoot.endsWith('/') ? declaredRoot : `${declaredRoot}/`}${key.slice(prefix.length)}`)
      }
    }
  }
  for (const step of steps) {
    if (!fileReads.has(step.capabilityId))
      continue
    if (context.verifiedStepIds.includes(step.id))
      continue
    const binding = step.inputBindings?.find(binding => binding.parameter === 'path')
    if (binding) {
      if (!metadataBinding(binding, steps.find(source => source.id === binding.stepId)))
        throw new Error('Adaptive filesystem path binding must use grounded structured metadata, not document text')
    }
    else {
      const key = pathKey(step.input.path)
      if (!key || !known.has(key))
        throw new Error('Adaptive filesystem path is not grounded in the accepted read targets or current owned metadata; use an exact observed path or structured metadata binding')
    }
  }
}
