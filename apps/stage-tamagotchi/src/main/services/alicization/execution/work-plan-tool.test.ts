import type { ExecutionWorkProposal } from '../../../../shared/execution-contracts'

import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod'

import { declaredWorkProposal, matchesDeclaredWorkProposal } from './declared-work-proposal'
import { createWorkPlanToolSpec } from './work-plan-tool'

describe('work plan provider admission bounds', () => {
  const parameters = createWorkPlanToolSpec(async () => null).parameters
  const proposal = (capabilityId: string, input: Record<string, unknown>) => ({ goal: 'Only this declared operation', criteria: [{ id: 'review', required: true, proofScope: 'user-reported', predicate: { kind: 'user-review', question: '结果符合要求吗？', artifactIds: [] } }], steps: [{ id: 'operation', dependsOn: [], capabilityId, input, acceptanceCriterionIds: [] }] })

  it.each(['tool.filesystem_read_file', 'tool.browser_read_page'])('normalizes only the exact file-copy text-envelope shorthand: %s', async (capabilityId) => {
    const execute = vi.fn(async (input: ExecutionWorkProposal) => input)
    const spec = createWorkPlanToolSpec(execute)
    const base = proposal(capabilityId, { path: 'C:/Owned/source.txt' })
    const binding = { parameter: 'content', stepId: 'operation', path: ['content'] }
    const raw = { ...base, steps: [...base.steps, { id: 'save', dependsOn: ['operation'], capabilityId: 'tool.filesystem_write_file', input: { path: 'C:/Owned/result.txt' }, inputBindings: [binding], acceptanceCriterionIds: [] }] }
    const normalized = await spec.execute(spec.parameters.parse(raw)) as ExecutionWorkProposal
    expect(normalized.steps[1].inputBindings).toEqual([capabilityId === 'tool.filesystem_read_file' ? { ...binding, select: { field: 'type', equals: 'text', valueField: 'text' } } : binding])
    expect(matchesDeclaredWorkProposal(normalized, declaredWorkProposal(JSON.stringify(raw))!)).toBe(true)
  })

  it('compiles exact literal UTF-8 criteria locally without asking a model to invent a digest', async () => {
    const execute = vi.fn(async (input: ExecutionWorkProposal) => input)
    const spec = createWorkPlanToolSpec(execute)
    const source = proposal('tool.filesystem_write_file', { path: 'C:/Owned/result.txt', content: '中文🙂\r\n' })
    const raw = { ...source, criteria: [{ id: 'literal', required: true, proofScope: 'bytes', predicate: { kind: 'file-content', path: 'C:/Owned/result.txt', content: '中文🙂\r\n' } }] }
    await spec.execute(spec.parameters.parse(raw))
    const compiled = execute.mock.calls[0][0]
    expect(compiled.criteria[0].predicate).toEqual({ kind: 'file-bytes', path: 'C:/Owned/result.txt', sha256: 'cab52b6386da7c47837bcfb0db1c829b68cf2506765d3eedcb9e6a582c0a9eb7' })
    const declared = declaredWorkProposal(JSON.stringify(raw))!
    expect(matchesDeclaredWorkProposal(compiled, declared)).toBe(true)
    expect(matchesDeclaredWorkProposal({ ...raw, criteria: [{ ...raw.criteria[0], predicate: { ...raw.criteria[0].predicate, content: '中文🙂\n' } }] }, declared)).toBe(false)
    expect(() => spec.execute(spec.parameters.parse({ ...raw, criteria: [{ ...raw.criteria[0], predicate: { ...raw.criteria[0].predicate, content: '\uD800' } }] }))).toThrow('valid Unicode')
    expect(execute).toHaveBeenCalledOnce()
  })

  it('treats omitted step associations as empty without inventing success evidence or dependencies', () => {
    const source = proposal('tool.filesystem_read_file', { path: 'C:/Owned/source.txt' })
    const { acceptanceCriterionIds: _, ...step } = source.steps[0]
    const input = { ...source, steps: [step] }
    const parsed = parameters.parse(input)
    expect(parsed.steps[0].acceptanceCriterionIds).toEqual([])
    expect(parsed.criteria).toEqual(source.criteria)
    expect(declaredWorkProposal(JSON.stringify(input))?.proposal).toEqual(parsed)
    expect(parameters.safeParse({ ...input, steps: [{ ...step, acceptanceCriterionIds: null }] }).success).toBe(false)
    const { dependsOn: __, ...missingDependencies } = step
    expect(parameters.safeParse({ ...input, steps: [missingDependencies] }).success).toBe(false)
  })

  it('parses raw SDK callback parameters before passing them into the work runtime', async () => {
    const execute = vi.fn(async () => null)
    const spec = createWorkPlanToolSpec(execute)
    const source = parameters.parse(proposal('tool.filesystem_read_file', { path: 'C:/Owned/source.txt' }))
    const { acceptanceCriterionIds: _, ...step } = source.steps[0]
    const signal = new AbortController().signal
    await spec.execute({ ...source, steps: [step] }, { abortSignal: signal })
    expect(execute).toHaveBeenCalledWith({ ...source, steps: [{ ...step, acceptanceCriterionIds: [] }] }, { abortSignal: signal })
  })

  it('preserves a syntactically explicit source when its proof scope is invalid', () => {
    const source = proposal('tool.filesystem_read_file', { path: 'C:/Owned/source.txt' })
    source.criteria[0].proofScope = 'bytes'
    const declared = declaredWorkProposal(JSON.stringify(source))
    expect(declared?.proposal.criteria[0].proofScope).toBe('bytes')
    expect(parameters.safeParse(source).success).toBe(false)
    expect(matchesDeclaredWorkProposal({ ...declared!.proposal, criteria: [{ ...declared!.proposal.criteria[0], proofScope: 'user-reported' }] }, declared!)).toBe(false)
  })

  it('keeps the predicate/scope association in the actual serialized provider schema', () => {
    const schema = z.toJSONSchema(parameters) as unknown as { properties: { criteria: { items: { anyOf: Array<{ properties: { predicate: { properties: { kind: { const: string } } }, proofScope: { const: string } } }> } } } }
    const pairs = Object.fromEntries(schema.properties.criteria.items.anyOf.map(branch => [branch.properties.predicate.properties.kind.const, branch.properties.proofScope.const]))
    expect(pairs).toEqual({ 'file-content': 'bytes', 'file-bytes': 'bytes', 'file-matches-read': 'bytes', 'browser-download': 'bytes', 'text-content': 'structure', 'json-structure': 'structure', 'directory-members': 'structure', 'quality-review': 'quality', 'external-receipt': 'external-state', 'user-review': 'user-reported' })
  })

  it.each([
    ['bytes', { kind: 'file-content', path: 'C:/Owned/result.txt', content: 'literal text\n中文🙂' }],
    ['bytes', { kind: 'file-bytes', path: 'C:/Owned/result.txt', sha256: 'a'.repeat(64) }],
    ['bytes', { kind: 'browser-download', stepId: 'download', minimumBytes: 1 }],
    ['structure', { kind: 'text-content', path: 'C:/Owned/result.txt', includes: ['actual text'] }],
    ['structure', { kind: 'json-structure', path: 'C:/Owned/result.json', requiredKeys: ['title'] }],
    ['structure', { kind: 'directory-members', path: 'C:/Owned/result', names: ['note.txt'], exact: true }],
    ['quality', { kind: 'quality-review', rubricId: 'registered-rubric', artifactIds: ['result'] }],
    ['external-state', { kind: 'external-receipt', recipeId: 'registered-recipe', targetHash: 'b'.repeat(64) }],
    ['user-reported', { kind: 'user-review', question: '结果符合要求吗？', artifactIds: [] }],
  ] as const)('exposes only the matching proof scope for %s / %j to a provider', (scope, predicate) => {
    for (const selected of ['bytes', 'structure', 'quality', 'external-state', 'user-reported']) {
      const input = { ...proposal('tool.filesystem_read_file', { path: 'C:/Owned/source.txt' }), criteria: [{ id: 'result', required: true, proofScope: selected, predicate }] }
      expect(parameters.safeParse(input).success).toBe(selected === scope)
    }
  })

  it.each([
    ['tool.desktop_press_keys', { shortcut: 'Ctrl+S', repeat: 6 }],
    ['tool.desktop_press_keys', { shortcut: 'Ctrl+S', repeat: 0 }],
    ['tool.desktop_press_keys', { shortcut: 'S'.repeat(97) }],
    ['tool.desktop_open_application', { appName: 'notepad', args: Array.from({ length: 33 }, () => 'argument') }],
    ['tool.browser_scroll', { action: 'down', amount: 4001 }],
    ['tool.browser_navigate', { action: 'execute-script' }],
    ['tool.filesystem_search_files', { path: 'C:/Owned', pattern: '*.txt', maxResults: 2001 }],
    ['tool.desktop_press_keys', { shortcut: 'Ctrl+S', bypassConfirmation: true }],
    ['tool.shell', { command: 'undeclared command' }],
  ] as const)('rejects unbounded or undeclared %s requests before execution', (capability, input) => {
    expect(parameters.safeParse(proposal(capability, input)).success).toBe(false)
  })
})
