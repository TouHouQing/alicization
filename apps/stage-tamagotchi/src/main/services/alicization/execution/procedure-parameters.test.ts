import type { ProcedureTemplate } from './procedure-template'

import { expect, it } from 'vitest'

import { describeProcedureParameters } from './procedure-parameters'

it('distinguishes a content value from its derived hash and nested acceptance use without copying example text', () => {
  const template: ProcedureTemplate = { version: 1, parameters: [{ name: 'target', kind: 'path', role: 'file' }, { name: 'text', kind: 'text', role: 'content' }], tools: [], steps: [{ id: 'step1', capabilityId: 'tool.filesystem_write_file', input: { path: { $parameter: 'target' }, content: { $parameter: 'text' } } }], criteria: [
    { id: 'result1', predicate: { kind: 'file-bytes', path: { $parameter: 'target' }, sha256: { $sha256: 'text' } } },
    { id: 'result2', predicate: { kind: 'text-content', path: { $parameter: 'target' }, includes: [{ $parameter: 'text' }, 'Private literal must not enter parameter metadata'] } },
  ] }
  const metadata = describeProcedureParameters(template)
  expect(metadata[1].uses).toEqual([
    { kind: 'step', stepId: 'step1', operation: 'tool.filesystem_write_file', field: 'content' },
    { kind: 'criterion', criterionId: 'result1', predicate: 'file-bytes', field: 'sha256', pathParameter: 'target', transform: 'sha256' },
    { kind: 'criterion', criterionId: 'result2', predicate: 'text-content', field: 'includes[0]', pathParameter: 'target', transform: 'value' },
  ])
  expect(JSON.stringify(metadata)).not.toContain('Private literal')
})
