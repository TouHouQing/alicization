import { Buffer } from 'node:buffer'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'

import { afterEach, expect, it, vi } from 'vitest'

const { decideDelegatedOperation } = createRequire(import.meta.url)('../../../../../scripts/life-acceptance/delegated-work-product-checks.cjs')
const input = { command: 'node', args: ['-e', 'console.log("owned fixture")'], cwd: String.raw`C:\QA\owned`, effect: 'mutate' }

function fixture(change?: string) {
  const text = JSON.stringify(change === 'reordered' ? { cwd: input.cwd, command: input.command, effect: input.effect, args: input.args } : input, null, 2)
  const request = { cardId: 'default', requestId: 'owned-request', token: 'owned-token', serverName: 'local-interface', toolName: change === 'capability' ? 'coding_agent.codex' : 'coding_agent.cli', riskLevel: 'danger', actionCategory: 'execute', resourcePath: change === 'path' ? String.raw`C:\QA\other` : input.cwd, supportsRememberSession: false, interfacePreview: { text: change === 'content' ? `${text} ` : text, byteLength: Buffer.byteLength(text), sha256: change === 'hash' ? '0'.repeat(64) : createHash('sha256').update(text).digest('hex') } }
  const allow = { textContent: '允许', disabled: false, dataset: { permissionRequestId: request.requestId, permissionToken: change === 'token' ? 'stale-token' : request.token }, getClientRects: () => [{}], click: vi.fn() }
  const deny = { ...allow, textContent: '拒绝', click: vi.fn() }
  const element = { dataset: { permissionRequestId: request.requestId }, querySelector: () => ({ textContent: text }), querySelectorAll: () => [allow, deny] }
  vi.stubGlobal('document', { querySelector: () => ({ __vue_app__: { _instance: { props: { request, resolving: false } } } }) })
  let reads = 0
  const pages = [{ getByRole: () => ({ isVisible: async () => true, evaluate: async (operation: (element: unknown, input: unknown) => unknown, expected: unknown) => {
    if (++reads === 2 && change === 'replaced')
      request.token = 'replacement-token'
    return operation(element, expected)
  } }) }]
  return { pages, allow, deny }
}

afterEach(() => vi.unstubAllGlobals())

it.each([true, false])('uses only the exact current owned proposal and its real allow=%s button', async (allowed) => {
  const f = fixture()
  expect(await decideDelegatedOperation(f.pages, input, allowed)).toMatchObject({ requestId: 'owned-request', allowed })
  expect(allowed ? f.allow.click : f.deny.click).toHaveBeenCalledOnce()
  expect(allowed ? f.deny.click : f.allow.click).not.toHaveBeenCalled()
})

it.each(['capability', 'path', 'content', 'hash', 'token'])('never approves a changed delegated review: %s', async (change) => {
  const f = fixture(change)
  await expect(decideDelegatedOperation(f.pages, input, true)).rejects.toThrow()
  expect(f.allow.click).not.toHaveBeenCalled()
  expect(f.deny.click).not.toHaveBeenCalled()
})

it('accepts reordered object keys only when all complete values and actual preview bytes still match', async () => {
  const f = fixture('reordered')
  expect(await decideDelegatedOperation(f.pages, input, true)).toMatchObject({ allowed: true })
  expect(f.allow.click).toHaveBeenCalledOnce()
})

it('leaves a replaced confirmation untouched between inspection and the actual button action', async () => {
  const f = fixture('replaced')
  expect(await decideDelegatedOperation(f.pages, input, true)).toBeNull()
  expect(f.allow.click).not.toHaveBeenCalled()
})
