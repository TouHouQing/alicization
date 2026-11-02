import type { WorkPlan, WorkStep } from '../../../../shared/execution-contracts'
import type { ProcedureBrowserReplayFactory } from './procedure-browser-replay-types'
import type { ProcedureCandidate } from './procedure-candidate-repository'

import { createHash } from 'node:crypto'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { expect, it } from 'vitest'

import { createCanonicalToolRegistry } from '../turn-os/tool-registry'
import { executionDigest } from './acceptance-compiler'
import { evaluateProcedureCandidate } from './procedure-evaluator'
import { compileProcedureTemplate } from './procedure-template'

const digest = (text: string) => createHash('sha256').update(text).digest('hex')
function candidateFixture(count: number) {
  const registry = createCanonicalToolRegistry()
  const steps: WorkStep[] = []
  const criteria = []
  for (let index = 0; index < count; index++) {
    const path = join(tmpdir(), `private-page-result-${index}.txt`)
    const base = { acceptanceCriterionIds: [], resourceIds: [], retryMode: 'reconcile-first' as const, state: 'pending' as const, attemptId: null, inputHash: 'source-proof' }
    steps.push({ ...base, id: `open-${index}`, capabilityId: 'tool.browser_open_url', input: { url: `https://example.test/private-${index}` }, dependsOn: index ? [`save-${index - 1}`] : [] })
    steps.push({ ...base, id: `read-${index}`, capabilityId: 'tool.browser_read_page', input: { format: 'text', maxChars: 12000 }, dependsOn: [`open-${index}`] })
    steps.push({ ...base, id: `save-${index}`, capabilityId: 'tool.filesystem_write_file', input: { path }, inputBindings: [{ parameter: 'content', stepId: `read-${index}`, path: ['content'] }], dependsOn: [`read-${index}`], acceptanceCriterionIds: [`bytes-${index}`] })
    criteria.push({ id: `bytes-${index}`, required: true, proofScope: 'bytes' as const, predicate: { kind: 'file-bytes' as const, path, sha256: digest(`Private source page ${index}`) } })
  }
  const plan: WorkPlan = { id: 'source-plan', cardId: 'alice', rootThreadId: 'source-thread', rootObligationId: 'source-goal', obligationGeneration: 1, revision: 1, acceptanceHash: 'source-contract', sourceEvidenceRefs: ['source-input'], browserBinding: { kind: 'managed', id: 'private-source' }, steps }
  const template = compileProcedureTemplate(plan, criteria, registry)
  const hash = executionDigest(template)
  // This test isolates evaluation. Source admission and real DOM ownership are
  // independently covered by repository/native product checks.
  const candidate: ProcedureCandidate = { id: 'owned-multi-page', version: hash, templateHash: hash, template, source: { threadId: plan.rootThreadId, goalId: plan.rootObligationId, generation: 1, attemptId: 'source-attempt', verificationId: 'source-verification', planId: plan.id, planRevision: 1, acceptanceHash: 'a'.repeat(64), inputIds: ['source-input'], inputHashes: ['b'.repeat(64)] } }
  return { candidate, registry }
}

function browserPort(swapPositive: boolean) {
  const seeded: Array<{ caseId: string, pages: Array<{ id: string, text: string, missing?: boolean }> }> = []
  let disposed = 0
  const factory: ProcedureBrowserReplayFactory = async () => {
    let current = ''
    const contents = new Map<string, string>()
    const binding = { kind: 'managed' as const, id: 'owned-evaluation-browser' }
    return {
      binding,
      isCurrent: owner => owner?.kind === binding.kind && owner.id === binding.id,
      prepare: async () => { throw new Error('Multi-page evaluation must provide separately owned pages') },
      preparePages: async (input) => {
        seeded.push(structuredClone(input))
        contents.clear()
        const urls = Object.fromEntries(input.pages.map(page => [page.id, `http://127.0.0.1/owned/${input.caseId}/${page.id}`]))
        for (const [index, page] of input.pages.entries()) {
          const text = swapPositive && input.caseId.startsWith('different-input-') ? input.pages[(index + 1) % input.pages.length].text : page.text
          contents.set(urls[page.id], page.missing ? 'Owned page was not found' : text)
        }
        return { urls }
      },
      tools: {
        'tool.browser_open_url': async (input) => {
          if (typeof input.url !== 'string' || !contents.has(input.url))
            throw new Error('The synthetic browser port refused an unowned URL')
          current = input.url
          return { status: 'completed', ok: true, url: current }
        },
        'tool.browser_read_page': async () => ({ status: 'completed', content: contents.get(current) }),
      },
      dispose: async () => { disposed++ },
    }
  }
  return { factory, seeded, disposed: () => disposed }
}

it.each([2, 4])('independently verifies %s distinct pages and every page-specific failure using the real SQLite/file scheduler', async (count) => {
  const { candidate, registry } = candidateFixture(count)
  const browser = browserPort(false)
  const result = await evaluateProcedureCandidate('owned-candidate', candidate, registry, new AbortController().signal, browser.factory)
  expect(result.status, JSON.stringify(result.cases)).toBe('passed')
  expect(result.evaluatorVersion).toBe('browser-procedure-replay-v2')
  expect(result.cases).toHaveLength(6 + 2 * count)
  expect(result.cases.every(item => item.passed)).toBe(true)
  expect(browser.seeded.filter(item => item.caseId.startsWith('different-input-'))).toHaveLength(2)
  for (const fixture of browser.seeded.filter(item => item.caseId.startsWith('different-input-')))
    expect(new Set(fixture.pages.map(page => page.text)).size).toBe(count)
  expect(browser.disposed()).toBe(1)
}, 60000)

it('fails the first positive replay when the browser supplies another page’s content', async () => {
  const { candidate, registry } = candidateFixture(2)
  const browser = browserPort(true)
  const result = await evaluateProcedureCandidate('owned-candidate', candidate, registry, new AbortController().signal, browser.factory)
  expect(result.status).toBe('failed')
  expect(result.cases.find(item => item.name === 'different-input-1')?.passed).toBe(false)
  expect(browser.disposed()).toBe(1)
}, 60000)
