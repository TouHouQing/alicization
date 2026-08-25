import type sqlite3 from 'sqlite3'

import process from 'node:process'

import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

interface Sqlite3RuntimeResolutionOptions {
  packaged?: boolean
}

function sqlite3RuntimePaths(resourcesPath: string) {
  const root = join(resourcesPath, 'app.asar.unpacked', 'node_modules', 'sqlite3')
  return {
    entry: join(root, 'lib', 'sqlite3.js'),
    nativeBinding: join(root, 'build', 'Release', 'node_sqlite3.node'),
  }
}

interface Sqlite3RuntimeRequire {
  (modulePath: string): unknown
  resolve: (modulePath: string) => string
  cache: NodeJS.Dict<NodeModule | undefined>
}

/**
 * Load sqlite3 without allowing bindings.js to infer a path through an ASAR
 * virtual module filename. Electron can expose the same package through both
 * app.asar and app.asar.unpacked; the explicit cache entry makes the native
 * binding location authoritative.
 */
export function loadAlicizationPackagedSqlite3Runtime(
  paths: ReturnType<typeof sqlite3RuntimePaths>,
  runtimeRequire: Sqlite3RuntimeRequire,
) {
  const bindingEntry = join(dirname(paths.entry), 'sqlite3-binding.js')
  const bindingModuleId = runtimeRequire.resolve(bindingEntry)
  const previousBindingModule = runtimeRequire.cache[bindingModuleId]

  runtimeRequire.cache[bindingModuleId] = {
    id: bindingModuleId,
    filename: bindingModuleId,
    loaded: true,
    parent: null,
    children: [],
    paths: [],
    exports: runtimeRequire(paths.nativeBinding),
  } as unknown as NodeModule

  try {
    return runtimeRequire(paths.entry) as typeof sqlite3
  }
  catch (error) {
    if (previousBindingModule)
      runtimeRequire.cache[bindingModuleId] = previousBindingModule
    else
      delete runtimeRequire.cache[bindingModuleId]
    throw error
  }
}

export function resolveAlicizationSqlite3RuntimeEntry(
  resourcesPath: string | undefined,
  fileExists: (path: string) => boolean = existsSync,
  options: Sqlite3RuntimeResolutionOptions = {},
) {
  if (!resourcesPath)
    return 'sqlite3'

  const paths = sqlite3RuntimePaths(resourcesPath)
  const missing = [paths.entry, paths.nativeBinding].filter(path => !fileExists(path))

  if (missing.length === 0)
    return paths.entry

  if (options.packaged) {
    throw new Error([
      'Alicization packaged runtime is missing sqlite3 native files.',
      ...missing.map(path => `Missing: ${path}`),
      'Rebuild the macOS app so sqlite3 is rebuilt for Electron and unpacked outside app.asar.',
    ].join('\n'))
  }

  return 'sqlite3'
}

const require = createRequire(import.meta.url)
const packaged = Boolean(process.resourcesPath)
  && (process as NodeJS.Process & { defaultApp?: boolean }).defaultApp !== true
const sqlite3RuntimeEntry = resolveAlicizationSqlite3RuntimeEntry(
  process.resourcesPath,
  existsSync,
  { packaged },
)

function loadAlicizationSqlite3Runtime() {
  if (sqlite3RuntimeEntry !== 'sqlite3') {
    // NOTICE: electron-builder leaves native packages addressable in app.asar.unpacked,
    // but sqlite3's bindings package derives its native path from the JavaScript caller.
    // That inference is not reliable across Electron's ASAR virtual filesystem, so
    // inject the explicit unpacked native binding before loading the JS wrapper.
    try {
      return loadAlicizationPackagedSqlite3Runtime(
        sqlite3RuntimePaths(process.resourcesPath!),
        require,
      )
    }
    catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      throw new Error([
        `Unable to load packaged sqlite3 runtime from ${sqlite3RuntimeEntry}.`,
        reason,
        'The app must contain sqlite3/lib/sqlite3.js and sqlite3/build/Release/node_sqlite3.node under app.asar.unpacked.',
      ].join('\n'))
    }
  }

  const module = require('sqlite3') as typeof sqlite3 & {
    default?: typeof sqlite3
  }
  return (module.default ?? module) as typeof sqlite3
}

const sqlite3Runtime = loadAlicizationSqlite3Runtime()

export default sqlite3Runtime
