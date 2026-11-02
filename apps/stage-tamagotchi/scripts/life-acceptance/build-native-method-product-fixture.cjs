const assert = require('node:assert/strict')
const { createHash, randomUUID } = require('node:crypto')
const sync = require('node:fs')
const fs = require('node:fs/promises')
const { createRequire } = require('node:module')
const path = require('node:path')
const process = require('node:process')

const workspace = process.cwd()
assert.equal(path.resolve(__dirname, '../../../..'), workspace)
const esbuild = createRequire(require.resolve('vite', { paths: [workspace] }))('esbuild')
const hash = bytes => createHash('sha256').update(bytes).digest('hex')
const sources = new Map()

async function main() {
  const payload = path.resolve('output', `native-method-product-payload-${randomUUID().replaceAll('-', '')}`)
  assert.equal(sync.existsSync(payload), false)
  await fs.mkdir(payload)
  const output = path.join(payload, 'native-method-product-fixture.mjs')
  const built = await esbuild.build({ entryPoints: ['apps/stage-tamagotchi/scripts/life-acceptance/native-method-product-fixture.ts'], outfile: output, bundle: true, format: 'esm', platform: 'node', target: 'node24', metafile: true, banner: { js: 'import { createRequire as __qaRequire } from \'node:module\';const require=__qaRequire(import.meta.url);' }, plugins: [{ name: 'owned-fixed-raw', setup(build) {
    build.onResolve({ filter: /\?raw$/ }, args => ({ path: path.resolve(args.resolveDir, args.path.slice(0, -4)), namespace: 'owned-raw' }))
    build.onLoad({ filter: /.*/, namespace: 'owned-raw' }, async (args) => {
      const bytes = await fs.readFile(args.path)
      sources.set(args.path, hash(bytes))
      return { contents: bytes.toString('utf8'), loader: 'text' }
    })
  } }] })
  for (const input of Object.keys(built.metafile.inputs)) {
    if (!input.startsWith('owned-raw:')) {
      const file = path.resolve(input)
      sources.set(file, hash(await fs.readFile(file)))
    }
  }
  const manifest = { format: 'alicization-native-method-product-bundle-v1', workspace, bundleSha256: hash(await fs.readFile(output)), sources: [...sources].map(([file, sha256]) => ({ path: path.relative(workspace, file), sha256 })), testResults: false }
  await fs.writeFile(path.join(payload, 'bundle-source.json'), JSON.stringify(manifest, null, 2), { flag: 'wx' })
  console.info(JSON.stringify({ payload, sources: sources.size, bundleSha256: manifest.bundleSha256 }))
}
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
