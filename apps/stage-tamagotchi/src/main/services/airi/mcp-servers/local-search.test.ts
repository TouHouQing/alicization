import type { WorkPlan, WorkStep } from '../../../../shared/execution-contracts'

import { Buffer } from 'node:buffer'
import { copyFile, mkdir, mkdtemp, open, readFile, realpath, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { executionDigest } from '../../alicization/execution/acceptance-compiler'
import { assertGroundedAdaptiveReads } from '../../alicization/execution/work-read-grounding'
import { createCanonicalToolRegistry } from '../../alicization/turn-os/tool-registry'
import { callLocalFilesystem, localFilesystemTools } from './local-filesystem'
import { localFilesystemInputSchemas } from './local-filesystem-schema'
import { buildLocalSearchArguments, readLocalSearch, verifyLocalSearchBinary } from './local-search'

describe.skipIf(process.platform !== 'win32' || process.arch !== 'x64')('verified bundled local content search', () => {
  let root: string
  let workspace: string
  let jobs: string
  const executable = fileURLToPath(new URL('../../../../../resources/third-party/ripgrep/win32-x64/rg.exe', import.meta.url))
  beforeAll(async () => {
    root = await realpath(await mkdtemp(join(tmpdir(), 'alicization-owned-native-search-')))
    workspace = join(root, 'workspace')
    jobs = join(root, 'jobs')
    await mkdir(workspace)
    await mkdir(jobs)
    await mkdir(join(workspace, 'notes'))
    await mkdir(join(root, 'outside'))
    await writeFile(join(root, 'owner.json'), JSON.stringify({ format: 'alicization-owned-search-fixture-v1', root }))
    await writeFile(join(workspace, 'notes', '报告.txt'), 'first line\nNEEDLE 中文🙂\nneedle 中文🙂\n')
    await writeFile(join(workspace, '.hidden.txt'), 'needle 中文🙂\n')
    await writeFile(join(workspace, 'literal.txt'), 'literal.*content\n')
    await writeFile(join(root, 'outside', 'private.txt'), 'private-outside-needle\n')
    await symlink(join(root, 'outside'), join(workspace, 'outside-link'), 'junction')
    // The desired hit must not depend on a preliminary 256-entry inventory.
    for (let index = 0; index < 300; index++)
      await writeFile(join(workspace, `filler-${index.toString().padStart(3, '0')}.txt`), 'unrelated filler')
    await writeFile(join(workspace, 'z-last.txt'), 'late-file-observed-needle')
  }, 60000)
  afterAll(async () => {
    if (root)
      await rm(root, { recursive: true, force: true })
  })
  const runtime = (assertAuthorized = vi.fn(async () => {}), signal?: AbortSignal) => ({ executable, processJobsRoot: jobs, assertAuthorized, signal })

  it('searches actual Unicode contents and hidden files without traversing a junction', async () => {
    const result = await readLocalSearch({ path: workspace, query: 'needle 中文🙂', recursive: true, pathMode: 'relative' }, runtime())
    expect(result.executionStopped).toBe(true)
    expect(result.nativeProcessBindingHash).toMatch(/^[a-f0-9]{64}$/u)
    expect(result.truncated).toBe(false)
    expect(result.matches).toHaveLength(3)
    expect(result.matches.some(match => match.name === 'notes/报告.txt' && match.line === 2)).toBe(true)
    expect(result.matches.every(match => match.path.startsWith(`${workspace}\\`) && match.displayPath === match.name)).toBe(true)
    const outside = await readLocalSearch({ path: workspace, query: 'private-outside-needle', recursive: true }, runtime())
    expect(outside.matches).toHaveLength(0)
    const late = await readLocalSearch({ path: workspace, query: 'late-file-observed-needle', recursive: true }, runtime())
    expect(late.matches.map(match => match.name)).toEqual(['z-last.txt'])
  }, 30000)

  it('separates literal/regex/case/glob behavior and refuses invalid native regex', async () => {
    expect((await readLocalSearch({ path: workspace, query: 'literal.*content' }, runtime())).matches.map(match => match.name)).toEqual(['literal.txt'])
    const result = await readLocalSearch({ path: workspace, query: 'needle\\s+中文', regex: true, recursive: true, caseSensitive: true, includeGlobs: ['notes/*.txt'] }, runtime())
    expect(result.matches).toMatchObject([{ name: 'notes/报告.txt', line: 3 }])
    expect((await readLocalSearch({ path: workspace, query: 'needle', recursive: true, excludeGlobs: ['notes/**', '.hidden.txt'] }, runtime())).matches.map(match => match.name)).toEqual(['z-last.txt'])
    await expect(readLocalSearch({ path: workspace, query: '(', regex: true }, runtime())).rejects.toThrow('Local search failed')
  }, 30000)

  it('preserves explicit match/byte truncation and has one schema from planning through dispatch', async () => {
    const limited = await readLocalSearch({ path: workspace, query: 'needle', recursive: true, maxResults: 1 }, runtime())
    expect(limited).toMatchObject({ matches: [expect.any(Object)], truncated: true, budgetReason: 'match-limit', executionStopped: true })
    await writeFile(join(workspace, 'long.txt'), `needle${'中文'.repeat(1500)}`)
    const bytes = await readLocalSearch({ path: workspace, query: 'needle', includeGlobs: ['long.txt'], maxReturnBytes: 1000 }, runtime())
    expect(bytes).toMatchObject({ matches: [], truncated: true, budgetReason: 'return-byte-limit', executionStopped: true })
    expect(Buffer.byteLength(JSON.stringify(bytes))).toBeLessThanOrEqual(1000)
    const registry = createCanonicalToolRegistry()
    const descriptor = localFilesystemTools.find(tool => tool.toolName === 'search_files')!
    expect(descriptor.inputSchema).toEqual(localFilesystemInputSchemas.search_files)
    for (const id of ['tool.filesystem_search_files', 'mcp.filesystem::search_files']) {
      expect(registry.resolveActive(id)?.inputSchema).toEqual(descriptor.inputSchema)
      expect(registry.validateInput(id, { path: workspace, query: 'needle', maxResults: 257 }).valid).toBe(false)
      expect(registry.validateInput(id, { path: workspace, query: 'needle', maxReturnBytes: 1000 }).valid).toBe(true)
    }
    const called = await callLocalFilesystem({ toolName: 'search_files', arguments: { path: workspace, query: 'literal.*content' }, workspace, approvedTarget: workspace, searchRuntime: { executable, processJobsRoot: jobs } })
    expect(called.ok).toBe(true)
    expect(called.structuredContent).toMatchObject({ matches: [{ name: 'literal.txt' }], scope: 'observed-text-search-matches-only' })
  }, 30000)

  it('settles the owned native tree before surfacing cancellation and refuses revoked admission', async () => {
    const controller = new AbortController()
    let checks = 0
    const authorized = vi.fn(async () => {
      if (++checks === 3)
        controller.abort(new Error('host-stop-search'))
    })
    // The abort reason is rethrown only after a signed stopped-tree outcome.
    await expect(readLocalSearch({ path: workspace, query: 'needle', recursive: true }, runtime(authorized, controller.signal))).rejects.toThrow('host-stop-search')
    expect(checks).toBeGreaterThanOrEqual(3)
    let admissions = 0
    await expect(readLocalSearch({ path: workspace, query: 'needle' }, runtime(vi.fn(async () => {
      if (++admissions === 2)
        throw new Error('authority-revoked')
    })))).rejects.toThrow('dispatch was refused')
    expect(await readFile(join(root, 'outside', 'private.txt'), 'utf8')).toBe('private-outside-needle\n')
  }, 30000)

  it('isolates configuration and keeps attacker-shaped patterns after the argv boundary', () => {
    const args = buildLocalSearchArguments({ path: workspace, query: '--pre=untrusted-command', includeGlobs: ['*.txt'] }, workspace)
    expect(args[0]).toBe('--no-config')
    expect(args.slice(-3)).toEqual(['--', '--pre=untrusted-command', workspace])
    expect(() => buildLocalSearchArguments({ path: workspace, query: 'line\nsecond' }, workspace)).toThrow('single-line')
    expect(() => buildLocalSearchArguments({ path: workspace, query: 'query', includeGlobs: ['a\0b'] }, workspace)).toThrow('globs')
    expect(() => buildLocalSearchArguments({ path: workspace, query: 'query', excludeGlobs: ['!*.txt'] }, workspace)).toThrow('globs')
  })

  it('grounds a later read in actual canonical search observations and independently reads the full matching file', async () => {
    const args = { path: workspace, query: 'late-file-observed-needle', recursive: true, pathMode: 'relative' }
    const output = await callLocalFilesystem({ toolName: 'search_files', arguments: args, workspace, searchRuntime: { executable, processJobsRoot: jobs } })
    const step = (id: string, capabilityId: string, input: Record<string, unknown>): WorkStep => ({ id, capabilityId, input, inputHash: executionDigest(input), dependsOn: [], acceptanceCriterionIds: [], resourceIds: [], retryMode: 'read-only', state: 'pending', attemptId: null })
    const discovery = step('search', 'tool.filesystem_search_files', args)
    const context = { plan: { steps: [discovery] } as WorkPlan, verifiedStepIds: ['search'], observations: [{ stepId: 'search', effectId: 'owned-search-effect', outputHash: executionDigest(output), output }] }
    const target = join(workspace, 'z-last.txt')
    expect(() => assertGroundedAdaptiveReads(context, [discovery, step('read', 'tool.filesystem_read_file', { path: target })])).not.toThrow()
    expect(() => assertGroundedAdaptiveReads(context, [discovery, step('unobserved', 'tool.filesystem_read_file', { path: join(workspace, 'literal.txt') })])).toThrow('not grounded')
    const readback = await callLocalFilesystem({ toolName: 'read_file', arguments: { path: target }, workspace })
    expect(readback.structuredContent).toMatchObject({ readVerified: true, path: target })
    expect(readback.content?.[0].text).toBe('late-file-observed-needle')
  }, 30000)

  it('uses the bounded Rust regex engine and ignores an ambient config that would alter execution', async () => {
    const config = join(root, 'ambient-ripgrep-config')
    await writeFile(config, '--glob\n!**\n')
    const previous = process.env.RIPGREP_CONFIG_PATH
    process.env.RIPGREP_CONFIG_PATH = config
    try {
      const result = await readLocalSearch({ path: workspace, query: 'literal.*content' }, runtime())
      expect(result.matches.map(match => match.name)).toEqual(['literal.txt'])
      await writeFile(join(workspace, 'adversarial.txt'), `${'a'.repeat(100000)}!`)
      const regex = await readLocalSearch({ path: workspace, query: '(a+)+$', regex: true, includeGlobs: ['adversarial.txt'] }, runtime())
      expect(regex).toMatchObject({ matches: [], truncated: false, executionStopped: true })
    }
    finally {
      if (previous === undefined)
        delete process.env.RIPGREP_CONFIG_PATH
      else process.env.RIPGREP_CONFIG_PATH = previous
    }
  }, 30000)

  it('refuses an altered same-size executable before starting any search process', async () => {
    const altered = join(root, 'altered-rg.exe')
    await copyFile(executable, altered)
    const handle = await open(altered, 'r+')
    try {
      const byte = Buffer.alloc(1)
      await handle.read(byte, 0, 1, 4096)
      byte[0] ^= 1
      await handle.write(byte, 0, 1, 4096)
    }
    finally { await handle.close() }
    await expect(verifyLocalSearchBinary(altered)).rejects.toThrow('identity mismatch')
  })
})
