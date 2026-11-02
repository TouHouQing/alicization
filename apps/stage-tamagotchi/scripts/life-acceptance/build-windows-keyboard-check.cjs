const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const sync = require('node:fs')
const fs = require('node:fs/promises')
const { createRequire } = require('node:module')
const path = require('node:path')
const process = require('node:process')

const workspace = process.cwd()
assert.equal(path.resolve(__dirname, '../../../..'), workspace, 'Run from the project root')
const app = path.join(workspace, 'apps/stage-tamagotchi')
const viteRequire = createRequire(require.resolve('vite', { paths: [workspace] }))
const esbuild = viteRequire('esbuild')
const payload = path.resolve('output', `keyboard-product-payload-${crypto.randomUUID().replaceAll('-', '')}`)
assert.equal(sync.existsSync(payload), false)
const sourceHashes = new Map()
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex')
async function main() {
  await fs.mkdir(payload)
  const output = path.join(payload, 'keyboard-product-check.mjs')
  const built = await esbuild.build({
    entryPoints: ['apps/stage-tamagotchi/scripts/life-acceptance/windows-keyboard-product-check.ts'],
    outfile: output,
    bundle: true,
    format: 'esm',
    platform: 'node',
    target: 'node24',
    metafile: true,
    external: ['sqlite3', 'sqlite-vec', 'sqlite-vec-windows-x64'],
    banner: { js: 'import { createRequire as __qaRequire } from \'node:module\';const require=__qaRequire(import.meta.url);' },
    plugins: [{ name: 'owned-bundled-raw', setup(build) {
      build.onResolve({ filter: /\?raw$/ }, args => ({ path: path.resolve(args.resolveDir, args.path.slice(0, -4)), namespace: 'owned-raw' }))
      build.onLoad({ filter: /.*/, namespace: 'owned-raw' }, async (args) => {
        const bytes = await fs.readFile(args.path)
        sourceHashes.set(args.path, hash(bytes))
        return { contents: bytes.toString('utf8'), loader: 'text' }
      })
    } }],
  })
  for (const input of Object.keys(built.metafile.inputs)) {
    if (!input.startsWith('owned-raw:')) {
      const source = path.resolve(input)
      sourceHashes.set(source, hash(await fs.readFile(source)))
    }
  }
  const files = []
  async function copyFile(source, destination) {
    const bytes = await fs.readFile(source)
    const output = path.join(payload, destination)
    await fs.mkdir(path.dirname(output), { recursive: true })
    await fs.writeFile(output, bytes, { flag: 'wx' })
    files.push({ path: destination.replaceAll('\\', '/'), file: path.relative(payload, output).replaceAll('\\', '/'), sha256: hash(bytes), bytes: bytes.length })
  }
  const sqlite = path.dirname(path.dirname(require.resolve('sqlite3', { paths: [app] })))
  for (const relative of ['package.json', 'lib/sqlite3.js', 'lib/sqlite3-binding.js', 'lib/trace.js', 'build/Release/node_sqlite3.node'])
    await copyFile(path.join(sqlite, relative), `node_modules/sqlite3/${relative}`)
  const sqliteRequire = createRequire(path.join(sqlite, 'lib/sqlite3.js'))
  const bindingsEntry = sqliteRequire.resolve('bindings')
  const bindingsRequire = createRequire(bindingsEntry)
  for (const name of ['bindings', 'file-uri-to-path']) {
    // Follow the actual native binding's dependency edge. SQLite does not
    // declare file-uri-to-path; a hoisted cache alias is not a stable owner.
    const entry = name === 'bindings' ? bindingsEntry : bindingsRequire.resolve(name)
    let root = path.dirname(entry)
    while (!sync.existsSync(path.join(root, 'package.json')) || JSON.parse(await fs.readFile(path.join(root, 'package.json'))).name !== name) {
      const parent = path.dirname(root)
      assert.notEqual(parent, root)
      root = parent
    }
    async function copyPublished(directory) {
      for (const item of await fs.readdir(directory, { withFileTypes: true })) {
        if (item.isDirectory() && !['node_modules', '.git', 'test', 'tests'].includes(item.name)) {
          await copyPublished(path.join(directory, item.name))
        }
        else if (item.isFile() && /\.(?:js|cjs|mjs|json)$/.test(item.name)) {
          const source = path.join(directory, item.name)
          await copyFile(source, `node_modules/${name}/${path.relative(root, source)}`)
        }
      }
    }
    await copyPublished(root)
  }
  const vec = require.resolve('sqlite-vec', { paths: [app] })
  const vecRoot = path.dirname(vec)
  for (const relative of ['package.json', 'index.cjs', 'index.mjs'])
    await copyFile(path.join(vecRoot, relative), `node_modules/sqlite-vec/${relative}`)
  const dll = createRequire(vec)('sqlite-vec').getLoadablePath()
  await copyFile(dll, 'node_modules/sqlite-vec-windows-x64/vec0.dll')
  await copyFile(path.join(path.dirname(dll), 'package.json'), 'node_modules/sqlite-vec-windows-x64/package.json')
  for (const name of ['build-windows-keyboard-check.cjs', 'windows-keyboard-fixture.cs', 'windows-keyboard-fixture-files.cs', 'windows-keyboard-host-check.ps1', 'windows-keyboard-fault-checks.ps1', 'windows-keyboard-fault-fixture.cs', 'assert-owned-windows-fixture.ps1', 'focus-owned-windows-fixture.ps1']) {
    const file = path.resolve('apps/stage-tamagotchi/scripts/life-acceptance', name)
    sourceHashes.set(file, hash(await fs.readFile(file)))
  }
  const bundleBytes = await fs.readFile(output)
  files.push({ path: 'output/keyboard-product-check.mjs', file: 'keyboard-product-check.mjs', sha256: hash(bundleBytes), bytes: bundleBytes.length })
  const manifest = { format: 'alicization-keyboard-product-bundle-v1', scope: 'Exact bundled production desktop/life/action/broker sources and their actual sqlite3 native runtime; no product test results.', files, sourceHashes: Object.fromEntries([...sourceHashes].sort(([a], [b]) => a.localeCompare(b))) }
  await fs.writeFile(path.join(payload, 'bundle-source.json'), JSON.stringify(manifest, null, 2), { flag: 'wx' })
  console.info(JSON.stringify({ files: files.length, sources: sourceHashes.size, bytes: files.reduce((total, file) => total + file.bytes, 0), payload }))
}
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
