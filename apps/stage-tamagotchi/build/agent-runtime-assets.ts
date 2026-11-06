import { readdirSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

/** Ship pinned runtime bytes, independent of pnpm's development symlink tree. */
export function agentRuntimeAssets() {
  const require = createRequire(import.meta.url)
  const quickjs = createRequire(require.resolve('quickjs-emscripten'))
  const typescriptRoot = dirname(require.resolve('typescript/package.json'))
  const languageRoot = dirname(dirname(require.resolve('typescript-language-server/lib/cli.mjs')))
  return {
    name: 'alicization-agent-runtime-assets',
    generateBundle(this: { emitFile: (asset: { type: 'asset', fileName: string, source: Uint8Array }) => unknown }) {
      const emit = (fileName: string, path: string) => this.emitFile({ type: 'asset', fileName: `agent-runtime/${fileName}`, source: readFileSync(path) })
      emit('quickjs.wasm', quickjs.resolve('@jitl/quickjs-wasmfile-release-sync/wasm'))
      emit('quickjs.LICENSE', join(dirname(dirname(quickjs.resolve('@jitl/quickjs-wasmfile-release-sync/wasm'))), 'LICENSE'))
      emit('lsp/lib/cli.mjs', require.resolve('typescript-language-server/lib/cli.mjs'))
      emit('lsp/package.json', join(languageRoot, 'package.json'))
      emit('lsp/LICENSE', join(languageRoot, 'LICENSE'))
      emit('typescript/package.json', join(typescriptRoot, 'package.json'))
      emit('typescript/LICENSE.txt', join(typescriptRoot, 'LICENSE.txt'))
      emit('typescript/ThirdPartyNoticeText.txt', join(typescriptRoot, 'ThirdPartyNoticeText.txt'))
      for (const file of readdirSync(join(typescriptRoot, 'lib'))) {
        if (/\.(?:js|json|d\.ts)$/u.test(file))
          emit(`typescript/lib/${file}`, join(typescriptRoot, 'lib', file))
      }
    },
  }
}
