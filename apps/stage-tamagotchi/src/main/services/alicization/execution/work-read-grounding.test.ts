import type { WorkPlan, WorkStep } from '../../../../shared/execution-contracts'

import { join, resolve } from 'node:path'

import { expect, it } from 'vitest'

import { executionDigest } from './acceptance-compiler'
import { assertGroundedAdaptiveReads } from './work-read-grounding'

const originalRoot = resolve('output', 'synthetic-request-root')
const canonicalRoot = resolve('output', 'synthetic-canonical-root')
const child = 'actual-note.txt'

function step(id: string, capabilityId: string, path: string): WorkStep {
  return { id, capabilityId, input: { path }, inputHash: executionDigest({ path }), dependsOn: [], acceptanceCriterionIds: [], resourceIds: [], retryMode: 'read-only', state: 'pending', attemptId: null }
}

function fixture() {
  const inventory = step('inventory', 'tool.filesystem_list_directory', originalRoot)
  const missing = step('read-note', 'tool.filesystem_read_file', join(originalRoot, 'missing-note.txt'))
  const metadata = { path: canonicalRoot, entries: [{ name: child, path: join(canonicalRoot, child), type: 'file' }], scope: 'observed-directory-metadata-only', truncated: false }
  const output = { ok: true, structuredContent: metadata }
  const context = { plan: { steps: [inventory, missing] } as WorkPlan, verifiedStepIds: ['inventory'], observations: [{ stepId: 'inventory', effectId: 'owned-directory-effect', outputHash: executionDigest(output), output }] }
  return { context, inventory, missing, metadata }
}

it('accepts the observed canonical path and the same child under the exact original request root', () => {
  const f = fixture()
  for (const root of [originalRoot, canonicalRoot])
    expect(() => assertGroundedAdaptiveReads(f.context, [f.inventory, step('read-note', 'tool.filesystem_read_file', join(root, child))])).not.toThrow()
})

it.each(['mistyped-parent', 'different-child', 'traversal', 'case-change'])('never treats %s as a projection of an observed child', (condition) => {
  const f = fixture()
  const target = condition === 'mistyped-parent'
    ? join(`${originalRoot}-mistyped`, child)
    : condition === 'different-child'
      ? join(originalRoot, 'unobserved-note.txt')
      : condition === 'traversal'
        ? `${originalRoot}/sub/../${child}`
        : join(originalRoot, 'ACTUAL-NOTE.txt')
  expect(() => assertGroundedAdaptiveReads(f.context, [f.inventory, step('read-note', 'tool.filesystem_read_file', target)])).toThrow('not grounded')
})

it.each(['omitted', 'hash-mismatch', 'other-step', 'not-verified', 'outside-parent', 'link-entry'])('does not promote %s metadata to an observed target', (condition) => {
  const f = fixture()
  if (condition === 'omitted') {
    f.context.observations = []
  }
  else if (condition === 'hash-mismatch') {
    f.context.observations[0].outputHash = '0'.repeat(64)
  }
  else if (condition === 'other-step') {
    f.context.observations[0].stepId = 'foreign-inventory'
  }
  else if (condition === 'not-verified') {
    f.context.verifiedStepIds = []
  }
  else {
    if (condition === 'outside-parent')
      f.metadata.entries[0].path = join(`${canonicalRoot}-different-parent`, child)
    else
      f.metadata.entries[0].type = 'link'
    f.context.observations[0].outputHash = executionDigest(f.context.observations[0].output)
  }
  expect(() => assertGroundedAdaptiveReads(f.context, [f.inventory, step('read-note', 'tool.filesystem_read_file', join(originalRoot, child))])).toThrow('not grounded')
})

it('allows future bounded metadata discovery on the original accepted directory with a path binding', () => {
  const f = fixture()
  f.context.observations = []
  const discovery = step('fresh-inventory', 'tool.filesystem_list_directory', originalRoot)
  discovery.input.maxEntries = 200
  const read = step('read-note', 'tool.filesystem_read_file', '')
  read.input = {}
  read.dependsOn = ['fresh-inventory']
  read.inputBindings = [{ parameter: 'path', stepId: discovery.id, path: ['structuredContent', 'entries'], select: { field: 'name', equals: child, valueField: 'path' } }]
  expect(() => assertGroundedAdaptiveReads(f.context, [f.inventory, discovery, read])).not.toThrow()
})

it('rejects a path binding from document text instead of structured filesystem metadata', () => {
  const f = fixture()
  const read = step('read-note', 'tool.filesystem_read_file', '')
  read.input = {}
  read.dependsOn = ['inventory']
  read.inputBindings = [{ parameter: 'path', stepId: 'inventory', path: ['content', '0', 'text'] }]
  expect(() => assertGroundedAdaptiveReads(f.context, [f.inventory, read])).toThrow('grounded structured metadata')
})

it('does not treat an overridden literal input as an accepted read target', () => {
  const f = fixture()
  const unused = join(originalRoot, 'unused-placeholder.txt')
  f.missing.input.path = unused
  f.missing.dependsOn = ['inventory']
  f.missing.inputBindings = [{ parameter: 'path', stepId: 'inventory', path: ['structuredContent', 'entries'], select: { field: 'name', equals: child, valueField: 'path' } }]
  f.context.observations = []
  expect(() => assertGroundedAdaptiveReads(f.context, [f.inventory, step('read-note', 'tool.filesystem_read_file', unused)])).toThrow('not grounded')
})
