import { readFile } from 'node:fs/promises'

import { describe, expect, it, vi } from 'vitest'

import {
  loadAlicizationPackagedSqlite3Runtime,
  resolveAlicizationSqlite3RuntimeEntry,
} from './sqlite3-runtime'

vi.mock('sqlite3', () => ({
  default: {
    Database: class Database {},
  },
}))

describe('sqlite3 runtime loader', () => {
  it('prefers the unpacked Electron resource entry when it exists', () => {
    expect(resolveAlicizationSqlite3RuntimeEntry('/Applications/Alicization Local.app/Contents/Resources', () => true))
      .toBe('/Applications/Alicization Local.app/Contents/Resources/app.asar.unpacked/node_modules/sqlite3/lib/sqlite3.js')
  })

  it('falls back to the regular package entry outside packaged Electron apps', () => {
    expect(resolveAlicizationSqlite3RuntimeEntry(undefined, () => false)).toBe('sqlite3')
    expect(resolveAlicizationSqlite3RuntimeEntry('/tmp/electron-resources', () => false)).toBe('sqlite3')
  })

  it('fails with an actionable packaging error instead of falling back inside a packaged app', () => {
    expect(() => resolveAlicizationSqlite3RuntimeEntry(
      '/Applications/Alicization Local.app/Contents/Resources',
      () => false,
      { packaged: true },
    )).toThrow(/packaged runtime is missing sqlite3 native files/u)
  })

  it('requires both the unpacked JavaScript loader and native binding', () => {
    expect(() => resolveAlicizationSqlite3RuntimeEntry(
      '/Applications/Alicization Local.app/Contents/Resources',
      path => path.endsWith('/sqlite3/lib/sqlite3.js'),
      { packaged: true },
    )).toThrow(/node_sqlite3\.node/u)
  })

  it('injects the explicit unpacked native binding instead of using ASAR path inference', () => {
    const entry = '/Applications/Alicization Local.app/Contents/Resources/app.asar.unpacked/node_modules/sqlite3/lib/sqlite3.js'
    const bindingEntry = '/Applications/Alicization Local.app/Contents/Resources/app.asar.unpacked/node_modules/sqlite3/lib/sqlite3-binding.js'
    const nativeBinding = '/Applications/Alicization Local.app/Contents/Resources/app.asar.unpacked/node_modules/sqlite3/build/Release/node_sqlite3.node'
    const nativeModule = { Database: class Database {} }
    const calls: string[] = []
    const cache: Record<string, NodeModule | undefined> = {}
    const runtimeRequire = Object.assign((modulePath: string) => {
      calls.push(modulePath)
      if (modulePath === nativeBinding)
        return nativeModule
      if (modulePath === entry)
        return cache[bindingEntry]?.exports
      throw new Error(`Unexpected require: ${modulePath}`)
    }, {
      resolve: (modulePath: string) => modulePath,
      cache,
    })

    expect(loadAlicizationPackagedSqlite3Runtime(
      { entry, nativeBinding },
      runtimeRequire,
    )).toBe(nativeModule)
    expect(calls).toEqual([nativeBinding, entry])
    expect(cache[bindingEntry]?.exports).toBe(nativeModule)
  })

  it('keeps production scope fuzz on the packaged sqlite runtime loader', async () => {
    const source = await readFile(new URL('./memory-scope-fuzz-db-trial.ts', import.meta.url), 'utf8')

    expect(source).not.toMatch(/import sqlite3 from ['"]sqlite3['"]/u)
    expect(source).toMatch(/import sqlite3Runtime from ['"]\.\/sqlite3-runtime['"]/u)
  })
})
