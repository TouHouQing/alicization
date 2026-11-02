import type { WorkPlan } from '../../../../shared/execution-contracts'

import { createHash } from 'node:crypto'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { createCanonicalToolRegistry } from '../turn-os/tool-registry'
import { compileProcedureTemplate, instantiateProcedureTemplate } from './procedure-template'
import { procedureEvaluatorVersion, procedureRequiredPermissions } from './procedure-transfer-operations'

function source(capabilityId: string) {
  const cwd = join(tmpdir(), 'private-source-workspace')
  const target = join(cwd, 'private-result.txt')
  const input = capabilityId === 'coding_agent.cli'
    ? { command: 'private-source-program', args: ['--source-private', 'private source script'], cwd, effect: 'mutate' }
    : { prompt: 'private source instructions and customer details', cwd, effect: 'mutate' }
  const plan: WorkPlan = { id: 'private-plan', cardId: 'alice', rootThreadId: 'private-root', rootObligationId: 'task:private-root', obligationGeneration: 1, revision: 1, acceptanceHash: 'unused-by-template', sourceEvidenceRefs: ['private-input'], steps: [{ id: 'child', capabilityId, input, dependsOn: [], acceptanceCriterionIds: ['file'], inputHash: 'source-proof', resourceIds: [], retryMode: 'reconcile-first', state: 'pending', attemptId: null }] }
  const criteria = [{ id: 'file', required: true, proofScope: 'bytes' as const, predicate: { kind: 'file-bytes' as const, path: target, sha256: createHash('sha256').update('private result bytes').digest('hex') } }]
  return { plan, criteria, cwd, target }
}

describe('delegated procedure structure preserves approval and fresh request authority', () => {
  it('keeps a fresh bounded argument vector when the successful CLI source omitted optional args', () => {
    const registry = createCanonicalToolRegistry()
    const original = source('coding_agent.cli')
    delete (original.plan.steps[0].input as Record<string, unknown>).args
    const template = compileProcedureTemplate(original.plan, original.criteria, registry)
    expect(template.parameters.filter(item => item.role === 'program-arguments')).toHaveLength(1)
    const arguments_ = Object.fromEntries(template.parameters.map(item => [item.name, item.role === 'workspace' ? join(tmpdir(), 'owned-argumentless-replay') : item.role === 'program' ? 'node' : item.role === 'program-arguments' ? ['--version'] : item.role === 'file' ? join(tmpdir(), 'owned-argumentless-replay', 'result.txt') : 'a'.repeat(64)]))
    expect(instantiateProcedureTemplate(template, arguments_, registry, 'Fresh explicit program').steps[0].input).toMatchObject({ command: 'node', args: ['--version'], effect: 'mutate' })
    const args = template.parameters.find(item => item.role === 'program-arguments')!
    expect(() => instantiateProcedureTemplate(template, { ...arguments_, [args.name]: Array.from({ length: 33 }, () => 'x') }, registry, 'Over budget')).toThrow('input domain')
  })
  it.each(['coding_agent.codex', 'coding_agent.claude_code', 'coding_agent.cli'])('transfers %s without storing source commands, prompts or workspace paths', (capabilityId) => {
    const registry = createCanonicalToolRegistry()
    const original = source(capabilityId)
    const template = compileProcedureTemplate(original.plan, original.criteria, registry)
    for (const privateValue of [original.cwd, original.target, 'private-source-program', 'private source script', 'private source instructions', 'private-input'])
      expect(JSON.stringify(template)).not.toContain(privateValue)
    expect(procedureEvaluatorVersion(template)).toBe('computer-procedure-replay-v2')
    expect(procedureRequiredPermissions(template, registry)).toEqual(['workspace.read', 'workspace.write'])
    const freshCwd = join(tmpdir(), 'fresh-owned-workspace')
    const target = join(freshCwd, 'fresh-output.txt')
    const arguments_ = Object.fromEntries(template.parameters.map(parameter => [parameter.name, parameter.role === 'workspace'
      ? freshCwd
      : parameter.role === 'instructions'
        ? 'Fresh current instructions, not an original private example'
        : parameter.role === 'program'
          ? 'node'
          : parameter.role === 'program-arguments'
            ? ['-e', 'console.log("fresh current script")']
            : parameter.role === 'file' ? target : 'a'.repeat(64)]))
    const proposal = instantiateProcedureTemplate(template, arguments_, registry, 'Fresh accepted delegated goal')
    expect(proposal.steps[0].input).toMatchObject({ cwd: freshCwd, effect: 'mutate' })
    expect(proposal.steps[0].capabilityId).toBe(capabilityId)
    expect(proposal.criteria[0].predicate).toEqual({ kind: 'file-bytes', path: target, sha256: 'a'.repeat(64) })
    expect(() => instantiateProcedureTemplate(template, { ...arguments_, effect: 'observe' }, registry, 'counterexample')).toThrow('parameter set')
    const workspace = template.parameters.find(parameter => parameter.role === 'workspace')!
    expect(() => instantiateProcedureTemplate(template, { ...arguments_, [workspace.name]: 'relative-workspace' }, registry, 'counterexample')).toThrow('input domain')
  })

  it('does not learn optional permission overrides or observation-driven program instructions', () => {
    const registry = createCanonicalToolRegistry()
    const original = source('coding_agent.codex')
    original.plan.steps[0].input.permissionMode = 'bypassPermissions'
    expect(() => compileProcedureTemplate(original.plan, original.criteria, registry)).toThrow()
    delete original.plan.steps[0].input.permissionMode
    original.plan.steps[0].inputBindings = [{ parameter: 'prompt', stepId: 'untrusted-page', path: ['content'] }]
    expect(() => compileProcedureTemplate(original.plan, original.criteria, registry)).toThrow()
  })
})
