const assert = require('node:assert/strict')
const { createHash, randomUUID } = require('node:crypto')
const fs = require('node:fs/promises')
const { createRequire } = require('node:module')
const os = require('node:os')
const path = require('node:path')
const process = require('node:process')

const { _electron } = require('playwright')

const { closePrivateRuntime, launchOptions, packageIdentity, registerPrivateRuntime } = require('./electron-launch.cjs')

const workspace = path.resolve(__dirname, '../../../..')
const hash = bytes => createHash('sha256').update(bytes).digest('hex')

async function main() {
  assert.equal(process.cwd(), workspace)
  assert.equal(process.env.LIFE_QA_HOST_VIEWPORT, '1')
  assert.equal(process.env.LIFE_PRODUCT_RENDERER, 'live2d')
  const runId = randomUUID().replaceAll('-', '')
  const root = path.join(workspace, 'output', `managed-popup-native-${runId}`)
  await fs.mkdir(root)
  await fs.writeFile(path.join(root, 'owner.json'), JSON.stringify({ format: 'alicization-owned-popup-native-v1', workspace, runId }), { flag: 'wx' })
  const sourceHashes = new Map()
  const esbuild = createRequire(require.resolve('vite'))('esbuild')
  const bundle = path.join(root, 'check.cjs')
  const built = await esbuild.build({
    absWorkingDir: workspace,
    entryPoints: ['apps/stage-tamagotchi/scripts/life-acceptance/managed-popup-native-check.ts'],
    outfile: bundle,
    bundle: true,
    format: 'cjs',
    platform: 'node',
    target: 'node24',
    metafile: true,
    external: ['electron'],
    plugins: [{ name: 'owned-raw', setup(build) {
      // esbuild parses these filters with Go regexp, which has no JS u flag.
      build.onResolve({ filter: /\?raw$/ }, args => ({ path: path.resolve(args.resolveDir, args.path.slice(0, -4)), namespace: 'owned-raw' }))
      build.onLoad({ filter: /.*/, namespace: 'owned-raw' }, async (args) => {
        const bytes = await fs.readFile(args.path)
        sourceHashes.set(args.path, hash(bytes))
        return { contents: bytes.toString('utf8'), loader: 'text' }
      })
    } }],
  })
  for (const key of Object.keys(built.metafile.inputs)) {
    if (!key.startsWith('owned-raw:')) {
      const file = path.resolve(workspace, key)
      sourceHashes.set(file, hash(await fs.readFile(file)))
    }
  }
  await fs.writeFile(path.join(root, 'source-inputs.json'), JSON.stringify({ sourceHashes: Object.fromEntries(sourceHashes), bundleSha256: hash(await fs.readFile(bundle)) }, null, 2), { flag: 'wx' })
  const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'alicization-life-popup-native-'))
  const report = { format: 'owned-popup-integration-controller-v1', root, profile, scope: 'Direct actual browser adapter integration in the authenticated background app; bounded synthetic host approval. Separate from model/UI and root-goal acceptance.', passed: false, sourceFiles: sourceHashes.size }
  let application
  let identity
  try {
    const options = launchOptions(profile)
    delete options.env.NODE_OPTIONS
    application = await _electron.launch(options)
    identity = await registerPrivateRuntime(application)
    report.package = await packageIdentity()
    let timer
    try {
      report.native = await Promise.race([
        application.evaluate(async (_electron, input) => {
          const { createRequire } = process.getBuiltinModule('node:module')
          return createRequire(input.bundle)(input.bundle).runManagedPopupNativeChecks(input)
        }, { bundle, root, workspace }),
        new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Owned popup integration exceeded 150s')), 150000) }),
      ])
    }
    finally { clearTimeout(timer) }
    assert.equal(report.native.passed, true)
    assert.equal(report.native.windowsClosed, true)
    report.passed = true
  }
  catch (error) { report.failure = error.message }
  finally {
    if (application)
      report.shutdown = await closePrivateRuntime(application, identity, { viaUi: false }).catch(error => ({ completed: false, failure: error.message }))
    if (!report.shutdown?.completed || report.shutdown.exitCode !== 0)
      report.passed = false
    report.changedSources = []
    for (const [file, digest] of sourceHashes) {
      if (hash(await fs.readFile(file)) !== digest)
        report.changedSources.push(file)
    }
    if (report.changedSources.length)
      report.passed = false
    await fs.writeFile(path.join(root, 'controller.json'), JSON.stringify(report, null, 2), { flag: 'wx' })
    console.info(JSON.stringify({ root, passed: report.passed, checks: report.native?.checks.length, rounds: report.native?.rounds.length, failure: report.failure }))
    if (!report.passed)
      process.exitCode = 1
  }
}

main().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
