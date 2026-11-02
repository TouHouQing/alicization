import { Buffer } from 'node:buffer'
import { createHash } from 'node:crypto'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, expect, it, vi } from 'vitest'

const { approveSyntheticOperation } = createRequire(import.meta.url)('../../../../../scripts/life-acceptance/execution-work-product-checks.cjs')
const owned = String.raw`C:\QA\report.txt`
const marker = '合成文件🙂'

function fixture(resourcePath: string, options: { changeToken?: boolean, content?: string, marker?: string, changeHash?: boolean } = {}) {
  const expected = options.marker ?? marker
  const content = options.content ?? expected
  const request = {
    requestId: 'owned-request',
    token: 'owned-token',
    cardId: 'default',
    serverName: 'filesystem',
    toolName: 'write_file',
    actionCategory: 'write',
    resourcePath,
    argumentsSummary: { kind: 'object', keyCount: 2, keys: ['content', 'path'] },
    changePreview: { operation: 'create', text: content.slice(0, 600), byteLength: Buffer.byteLength(content), sha256: options.changeHash ? '0'.repeat(64) : createHash('sha256').update(content).digest('hex'), truncated: content.length > 600 },
  }
  const button = { textContent: '允许', disabled: false, dataset: { permissionRequestId: request.requestId, permissionToken: request.token }, getClientRects: () => [{}], click: vi.fn() }
  const element = {
    dataset: { permissionRequestId: request.requestId },
    textContent: `创建一个文件 ${resourcePath}`,
    querySelector: (selector: string) => ({ textContent: selector === '[data-file-content-binding]' ? `${request.changePreview.byteLength} bytes · SHA-256 ${request.changePreview.sha256}` : resourcePath }),
    querySelectorAll: () => [button],
  }
  vi.stubGlobal('document', { querySelector: () => ({ __vue_app__: { _instance: { props: { request, resolving: false } } } }) })
  let reads = 0
  const page = { getByRole: () => ({
    isVisible: async () => true,
    evaluate: async (operation: (element: unknown, input: unknown) => unknown, input: unknown) => {
      if (++reads === 2 && options.changeToken)
        request.token = 'replacement-token'
      return operation(element, input)
    },
  }) }
  return { pages: [page], button, request, element, targets: [{ path: owned, operation: '创建一个文件', marker: expected }] }
}

afterEach(() => vi.unstubAllGlobals())

it('defers a newly visible upload permission to its exact upload reviewer without treating it as a file write', async () => {
  const f = fixture('http://127.0.0.1:12345/owned/form/submit')
  f.request.toolName = 'browser_upload_files'
  f.request.serverName = 'local-interface'
  f.request.actionCategory = 'network'
  expect(await approveSyntheticOperation(f.pages, f.targets, undefined, { deferOperations: ['browser_upload_files'] })).toBe(false)
  expect(f.button.click).not.toHaveBeenCalled()
})

it.each(['browser_upload_files', 'browser_click_element'])('retains refusal for an unrelated permission without an explicit reviewer: %s', async (toolName) => {
  const f = fixture('http://127.0.0.1:12345/other/submit')
  f.request.toolName = toolName
  await expect(approveSyntheticOperation(f.pages, f.targets)).rejects.toThrow('unowned-target')
  expect(f.button.click).not.toHaveBeenCalled()
})

it.each(['exact', 'changed-before-image', 'extra-argument'] as const)('binds an actual replacement permission to reviewed original bytes: %s', async (boundary) => {
  const directory = await mkdtemp(join(tmpdir(), 'qa-replacement-permission-'))
  const target = join(directory, 'reviewed.txt')
  try {
    await writeFile(target, boundary === 'changed-before-image' ? 'host edit' : 'original')
    const f = fixture(target)
    f.request.argumentsSummary = { kind: 'object', keyCount: boundary === 'extra-argument' ? 4 : 3, keys: ['content', 'expectedHash', 'path', ...(boundary === 'extra-argument' ? ['unapproved'] : [])] }
    f.request.changePreview.operation = 'replace'
    f.element.textContent = `替换现有文件的内容 ${target}`
    const targets = [{ path: target, operation: '替换现有文件的内容', changeOperation: 'replace', marker, expectedHash: createHash('sha256').update('original').digest('hex') }]
    if (boundary === 'exact') {
      expect(await approveSyntheticOperation(f.pages, targets)).toBe(true)
      expect(f.button.click).toHaveBeenCalledOnce()
    }
    else {
      await expect(approveSyntheticOperation(f.pages, targets)).rejects.toThrow()
      expect(f.button.click).not.toHaveBeenCalled()
    }
  }
  finally { await rm(directory, { recursive: true, force: true }) }
})

it.each(['read_file', 'list_directory'])('permits declared bounded read options only for the exact owned operation: %s', async (toolName) => {
  const f = fixture(owned)
  f.request.toolName = toolName
  f.request.actionCategory = 'read'
  f.request.argumentsSummary = { kind: 'object', keyCount: 2, keys: ['maxReturnBytes', 'path'] }
  f.element.textContent = `读取文件或资料 ${owned}`
  const target = { path: owned, operation: '读取文件或资料', toolName, readOptions: ['maxReturnBytes'] }
  expect(await approveSyntheticOperation(f.pages, [target])).toBe(true)
  f.request.argumentsSummary.keys = ['content', 'path']
  await expect(approveSyntheticOperation(f.pages, [target])).rejects.toThrow('operation-or-content-binding-mismatch')
  expect(f.button.click).toHaveBeenCalledOnce()
})

it('approves long literal text only when the bounded preview, complete byte length and full hash all agree', async () => {
  const f = fixture(owned, { marker: `${'中文🙂'.repeat(300)}\nexact tail` })
  expect(await approveSyntheticOperation(f.pages, f.targets)).toBe(true)
  expect(f.button.click).toHaveBeenCalledOnce()
})

it.each(['tail', 'hash'])('refuses a different full content binding despite an identical bounded preview: %s', async (change) => {
  const expected = `${'same preview'.repeat(100)}A`
  const f = fixture(owned, { marker: expected, ...(change === 'tail' ? { content: `${expected.slice(0, -1)}B` } : { changeHash: true }) })
  await expect(approveSyntheticOperation(f.pages, f.targets)).rejects.toThrow('operation-or-content-binding-mismatch')
  expect(f.button.click).not.toHaveBeenCalled()
})

it('binds equivalent Windows separators while retaining exact operation, UTF-8 bytes and request identity', async () => {
  const f = fixture(String.raw`C:\\QA\\report.txt`)
  expect(await approveSyntheticOperation(f.pages, f.targets)).toBe(true)
  expect(f.button.click).toHaveBeenCalledOnce()
})

it.each([String.raw`C:\QA\other.txt`, String.raw`C:\QA\folder\..\report.txt`, String.raw`\\server\QA\report.txt`])('never grants another path or a traversal: %s', async (target) => {
  const f = fixture(target)
  await expect(approveSyntheticOperation(f.pages, f.targets)).rejects.toThrow('unowned-target')
  expect(f.button.click).not.toHaveBeenCalled()
})

it('does not let path spelling admit different bytes', async () => {
  const f = fixture(String.raw`C:\\QA\\report.txt`, { content: 'changed content' })
  await expect(approveSyntheticOperation(f.pages, f.targets)).rejects.toThrow('operation-or-content-binding-mismatch')
  expect(f.button.click).not.toHaveBeenCalled()
})

it('refuses a permission replaced between host path binding and its actual button click', async () => {
  const f = fixture(owned, { changeToken: true })
  expect(await approveSyntheticOperation(f.pages, f.targets)).toBe(false)
  expect(f.button.click).not.toHaveBeenCalled()
})
