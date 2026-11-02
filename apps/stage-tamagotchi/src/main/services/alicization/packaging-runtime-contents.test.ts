import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import configuration, { assertBundledJavaScriptRuntime } from '../../../../electron-builder.config'

const appRoot = resolve(import.meta.dirname, '../../../..')
const local = createRequire(join(appRoot, 'package.json'))
const builder = createRequire(local.resolve('electron-builder'))
const internal = createRequire(builder.resolve('app-builder-lib'))
const { getNodeModuleFileMatcher } = internal('./fileMatcher') as {
  getNodeModuleFileMatcher: (...args: unknown[]) => { createFilter: () => (file: string, stat: unknown) => boolean }
}

describe('actual electron-builder production module filtering', () => {
  it('rejects an external preload bridge before producing an unusable package', async () => {
    const root = await mkdtemp(join(tmpdir(), 'life-runtime-package-audit-'))
    try {
      await mkdir(join(root, 'main'))
      await mkdir(join(root, 'preload'))
      await writeFile(join(root, 'main/index.js'), 'import "electron"; import "node:fs"; import "electron-click-drag-plugin";')
      await writeFile(join(root, 'preload/index.mjs'), 'import "@electron-toolkit/preload";')
      await expect(assertBundledJavaScriptRuntime(root)).rejects.toThrow('Unbundled runtime dependency in preload/index.mjs: @electron-toolkit/preload')
      await writeFile(join(root, 'preload/index.mjs'), 'import "electron"; export const bridge = {};')
      await expect(assertBundledJavaScriptRuntime(root)).resolves.toBeUndefined()
    }
    finally { await rm(root, { recursive: true, force: true }) }
  })

  it('retains native loaders and removes duplicate bundled UI/assets and unused native platforms', () => {
    const matcher = getNodeModuleFileMatcher(appRoot, join(appRoot, 'dist', 'test'), (value: string) => value, {}, { config: configuration, debugLogger: { isEnabled: false } })
    const accepts = matcher.createFilter()
    const include = (name: string, file: string) => {
      const root = join(appRoot, 'node_modules', name)
      const full = join(root, file)
      return accepts(full, { isDirectory: () => false, moduleName: name, moduleRootPath: root, moduleFullFilePath: full })
    }
    for (const [name, file] of [
      ['sqlite3', 'lib/sqlite3.js'],
      ['sqlite3', 'lib/sqlite3-binding.js'],
      ['sqlite3', 'build/Release/node_sqlite3.node'],
      ['bindings', 'bindings.js'],
      ['file-uri-to-path', 'index.js'],
      ['electron-click-drag-plugin', 'index.js'],
      ['electron-click-drag-plugin', 'build/Release/win32-x64/drag.node'],
      ['node-gyp-build', 'index.js'],
      ['bufferutil', 'prebuilds/win32-x64/bufferutil.node'],
      ['vue', 'LICENSE'],
      ['onnxruntime-web', 'LICENSE'],
      ['@duckdb/duckdb-wasm', 'LICENSE'],
      ['@proj-alicization/stage-ui', 'NOTICE.txt'],
    ]) expect(include(name, file), `${name}/${file}`).toBe(true)
    for (const [name, file] of [
      ['@proj-alicization/stage-ui', 'src/assets/live2d/models/hiyori_pro_zh.zip'],
      ['@proj-alicization/font-xiaolai', 'dist/files/XiaolaiSC-Regular.ttf'],
      ['onnxruntime-node', 'bin/napi-v3/darwin/x64/libonnxruntime.dylib'],
      ['onnxruntime-web', 'dist/ort-wasm-simd-threaded.wasm'],
      ['@duckdb/duckdb-wasm', 'dist/duckdb-mvp.wasm'],
      ['vue', 'dist/vue.runtime.esm-bundler.js'],
    ]) expect(include(name, file), `${name}/${file}`).toBe(false)
  })
})
