import process from 'node:process'

import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { readLocalSearch } from './local-search'

const control = vi.hoisted(() => ({ delayMs: 0, preparations: [] as Promise<unknown>[], outcomes: [] as Array<{ treeStopped: boolean, receipt?: { started: boolean } | null }> }))
vi.mock('../../alicization/execution/windows-process-job', async (original) => {
  const actual = await original<typeof import('../../alicization/execution/windows-process-job')>()
  return {
    ...actual,
    prepareWindowsProcessJob: (...args: Parameters<typeof actual.prepareWindowsProcessJob>) => {
      const pending = (async () => {
        // Only delay the fixed helper preparation. The real signed native Job,
        // child ripgrep process, authorization and stopped-tree receipt run.
        if (control.delayMs)
          await new Promise(resolve => setTimeout(resolve, control.delayMs))
        const prepared = await actual.prepareWindowsProcessJob(...args)
        return { ...prepared, start: (...input: Parameters<typeof prepared.start>) => {
          const job = prepared.start(...input)
          void job.completion.then(result => control.outcomes.push(result), () => {})
          return job
        } }
      })()
      control.preparations.push(pending)
      return pending
    },
  }
})

describe.skipIf(process.platform !== 'win32' || process.arch !== 'x64')('local search separates native startup from search execution', () => {
  let root: string
  const executable = fileURLToPath(new URL('../../../../../resources/third-party/ripgrep/win32-x64/rg.exe', import.meta.url))
  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'owned-search-startup-'))
    control.delayMs = 0
    control.preparations = []
    control.outcomes = []
    await writeFile(join(root, 'source.txt'), 'Actual bounded startup 中文🙂 needle\n', { flag: 'wx' })
  })
  afterEach(async () => {
    // The fixed cache compiler may finish after an admission is withdrawn.
    // Never remove its owned directory until that exact preparation settles.
    await Promise.allSettled(control.preparations)
    await rm(root, { recursive: true, force: true })
  })

  it('keeps the full original search budget after a cold fixed helper takes nine seconds to prepare', async () => {
    control.delayMs = 9000
    const result = await readLocalSearch({ path: root, query: '中文🙂 needle' }, { executable, processJobsRoot: join(root, 'jobs'), assertAuthorized: async () => {} })
    expect(result).toMatchObject({ truncated: false, executionStopped: true, matches: [{ name: 'source.txt', line: 1 }] })
    expect(result.nativeProcessBindingHash).toMatch(/^[a-f0-9]{64}$/u)
    expect(control.outcomes).toMatchObject([{ treeStopped: true, receipt: { started: true } }])
  }, 30000)

  it('still rechecks revoked authority at the final native dispatch after slow preparation', async () => {
    control.delayMs = 9000
    let checks = 0
    await expect(readLocalSearch({ path: root, query: 'needle' }, { executable, processJobsRoot: join(root, 'jobs'), assertAuthorized: async () => {
      if (++checks === 2)
        throw new Error('owned-admission-withdrawn')
    } })).rejects.toThrow('dispatch was refused')
    expect(checks).toBeGreaterThanOrEqual(2)
    expect(control.outcomes).toMatchObject([{ treeStopped: true, receipt: { started: false } }])
    expect(await readFile(join(root, 'source.txt'), 'utf8')).toBe('Actual bounded startup 中文🙂 needle\n')
  }, 30000)

  it('starts no compiler or search when the caller has already stopped', async () => {
    const controller = new AbortController()
    controller.abort(new Error('owned-search-stop'))
    await expect(readLocalSearch({ path: root, query: 'needle' }, { executable, processJobsRoot: join(root, 'jobs'), signal: controller.signal, assertAuthorized: async () => {} })).rejects.toThrow('owned-search-stop')
    expect(control.preparations).toEqual([])
    expect(control.outcomes).toEqual([])
  })
})
