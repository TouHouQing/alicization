import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'

const require = createRequire(import.meta.url)

export function agentRuntimeAsset(name: 'quickjs.wasm' | 'lsp/lib/cli.mjs' | 'typescript/lib/tsserver.js') {
  const bundled = join(import.meta.dirname, 'agent-runtime', name)
  if (existsSync(bundled))
    return bundled
  if (name === 'quickjs.wasm')
    return createRequire(require.resolve('quickjs-emscripten')).resolve('@jitl/quickjs-wasmfile-release-sync/wasm')
  return require.resolve(name === 'lsp/lib/cli.mjs' ? 'typescript-language-server/lib/cli.mjs' : 'typescript/lib/tsserver.js')
}
