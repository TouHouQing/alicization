import { mkdirSync, writeFileSync } from 'node:fs'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

import { describe, expect, it, vi } from 'vitest'

import { agentRuntimeAssets } from '../../../../../build/agent-runtime-assets'
import { isOwnedReadStopped } from '../execution/owned-read-stop'
import { queryNativeLanguage } from './native-language-runtime'

describe('native LSP transport and actual language server', () => {
  it.each(['sample.tsx', 'sample.jsx'])('parses %s as the actual JSX language without plain-TS syntax failures', async (name) => {
    const root = await mkdtemp(join(tmpdir(), 'alicization-native-jsx-'))
    try {
      const filePath = join(root, name)
      await writeFile(filePath, 'export const element = <div data-id="ok" />;\n')
      await writeFile(join(root, 'tsconfig.json'), JSON.stringify({ compilerOptions: { jsx: 'preserve', allowJs: true, checkJs: true, noEmit: true }, files: [name] }))
      const result = await queryNativeLanguage({ workspaceRoot: root, filePath, operation: 'diagnostics' }, { signal: new AbortController().signal, authorize: async () => {}, processJobsRoot: join(root, 'owned-processes') })
      expect(result.nativeProcessTreeStopped).toBe(true)
      const diagnostics = (result.result as { diagnostics: Array<{ code: number }> }).diagnostics
      expect(diagnostics.filter(item => [1005, 1109, 1161].includes(item.code))).toEqual([])
    }
    finally { await rm(root, { recursive: true, force: true }) }
  }, 30000)

  it('gets definitions, references, hover, symbols and diagnostics from the shipped server, then proves native stop', async () => {
    const root = await mkdtemp(join(tmpdir(), 'alicization-native-lsp-'))
    const filePath = join(root, 'sample.ts')
    const text = 'export const greeting: string = 42;\nexport function render() { return greeting.toUpperCase() }\n'
    const authorize = vi.fn(async () => {})
    try {
      await writeFile(filePath, text)
      await writeFile(join(root, 'tsconfig.json'), JSON.stringify({ compilerOptions: { strict: true, noEmit: true }, files: ['sample.ts'] }))
      const results = new Map<string, any>()
      for (const operation of ['definition', 'references', 'hover', 'symbols', 'diagnostics'] as const) {
        const result = await queryNativeLanguage({ workspaceRoot: root, filePath, operation, line: 1, character: text.split('\n')[1]!.indexOf('greeting') + 2 }, { signal: new AbortController().signal, authorize, processJobsRoot: join(root, 'owned-processes') })
        expect(result.nativeProcessTreeStopped).toBe(true)
        expect(result.positionEncoding).toBe('utf-16')
        results.set(operation, result.result)
      }
      expect(results.get('definition')).toEqual(expect.arrayContaining([expect.objectContaining({ range: expect.objectContaining({ start: { line: 0, character: 13 } }) })]))
      expect(results.get('references').length).toBeGreaterThanOrEqual(2)
      expect(JSON.stringify(results.get('hover'))).toContain('greeting')
      expect(JSON.stringify(results.get('symbols'))).toContain('render')
      expect(results.get('diagnostics').diagnostics).toEqual(expect.arrayContaining([expect.objectContaining({ code: 2322 })]))
      expect(await readFile(filePath, 'utf8')).toBe(text)
      expect(authorize.mock.calls.length).toBeGreaterThanOrEqual(15)
    }
    finally { await rm(root, { recursive: true, force: true }) }
  }, 120000)

  it('refuses cancelled or unauthorized work before starting a server', async () => {
    const signal = AbortSignal.abort(new Error('cancelled'))
    const authorize = vi.fn(async () => {
      throw new Error('revoked')
    })
    const input = { workspaceRoot: 'unused', filePath: 'unused', operation: 'hover' as const }
    await expect(queryNativeLanguage(input, { signal, authorize })).rejects.toThrow('cancelled')
    expect(authorize).not.toHaveBeenCalled()
    await expect(queryNativeLanguage(input, { signal: new AbortController().signal, authorize })).rejects.toThrow('revoked')
  })

  it('cancels an actual native server and returns only after its owned process tree stops', async () => {
    const root = await mkdtemp(join(tmpdir(), 'alicization-native-lsp-cancel-'))
    const filePath = join(root, 'sample.ts')
    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout> | undefined
    try {
      await writeFile(filePath, 'export const sample: string = 42;')
      timer = setTimeout(() => controller.abort(new Error('owned LSP cancellation deadline')), 10000)
      const failure = await queryNativeLanguage({ workspaceRoot: root, filePath, operation: 'diagnostics' }, { signal: controller.signal, authorize: async () => {}, processJobsRoot: join(root, 'owned-processes'), onDiagnostic: (event, detail) => {
        if (event === 'message' && JSON.parse(detail).id === 1)
          controller.abort(new Error('owned LSP cancellation after initialization'))
      } }).catch(error => error)
      expect(failure).toBeInstanceOf(Error)
      expect(failure.message).toContain('cancellation')
      expect(isOwnedReadStopped(failure)).toBe(true)
    }
    finally {
      clearTimeout(timer)
      await rm(root, { recursive: true, force: true })
    }
  }, 30000)

  it('runs the actual Electron executable as the native language-server host without opening a window', async () => {
    const root = await mkdtemp(join(tmpdir(), 'alicization-electron-lsp-'))
    const filePath = join(root, 'sample.ts')
    try {
      await writeFile(filePath, 'export const sample: string = 42;')
      const executable = createRequire(import.meta.url)('electron') as string
      agentRuntimeAssets().generateBundle.call({ emitFile: (asset) => {
        const target = join(root, asset.fileName)
        mkdirSync(dirname(target), { recursive: true })
        writeFileSync(target, asset.source)
      } })
      const runtimeDirectory = join(root, 'agent-runtime')
      const result = await queryNativeLanguage({ workspaceRoot: root, filePath, operation: 'diagnostics' }, { executable, runtimeDirectory, signal: new AbortController().signal, authorize: async () => {}, processJobsRoot: join(root, 'owned-processes') })
      expect(result.nativeProcessTreeStopped).toBe(true)
      expect(JSON.stringify(result.result)).toContain('2322')
      // Exercise Electron's archive boundary as well as development files.
      const requireBuilder = createRequire(createRequire(import.meta.url).resolve('electron-builder'))
      const requireBuilderLib = createRequire(requireBuilder.resolve('app-builder-lib'))
      const { createPackage } = requireBuilderLib('@electron/asar') as { createPackage: (source: string, target: string) => Promise<void> }
      const archive = join(root, 'language-runtime.asar')
      await createPackage(runtimeDirectory, archive)
      const archived = await queryNativeLanguage({ workspaceRoot: root, filePath, operation: 'diagnostics' }, { executable, runtimeDirectory: archive, signal: new AbortController().signal, authorize: async () => {}, processJobsRoot: join(root, 'owned-processes') })
      expect(archived.nativeProcessTreeStopped).toBe(true)
      expect(JSON.stringify(archived.result)).toContain('2322')
    }
    finally { await rm(root, { recursive: true, force: true }) }
  }, 30000)
})
