const fs = require('node:fs/promises')
const { createRequire } = require('node:module')
const path = require('node:path')
const process = require('node:process')
const { pathToFileURL } = require('node:url')

const workspace = path.resolve(__dirname, '../../../..')
const fromVite = createRequire(require.resolve('vite/package.json', { paths: [workspace] }))
const desktop = process.argv[2] === '--desktop'
const fileRecovery = process.argv[2] === '--file-recovery'
const frames = process.argv[2] === '--frames'
if (frames && !process.env.LIFE_PROBE_BUNDLE)
  throw new Error('Frame acceptance requires an explicit fresh LIFE_PROBE_BUNDLE path')
const output = process.env.LIFE_PROBE_BUNDLE ? path.resolve(process.env.LIFE_PROBE_BUNDLE) : path.join(workspace, desktop ? 'output/desktop-execution-probe-20261020.cjs' : 'output/browser-execution-probe-20261020.cjs')
if (!output.startsWith(`${path.join(workspace, 'output')}${path.sep}`) || !output.endsWith('.cjs'))
  throw new Error('Probe bundles must remain under the workspace output directory')

void fromVite('esbuild').build({
  entryPoints: [path.join(__dirname, frames ? 'browser-frame-input-probe.ts' : fileRecovery ? 'file-recovery-execution-probe.ts' : desktop ? 'desktop-execution-probe.ts' : 'browser-execution-probe.ts')],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  define: { 'import.meta.url': JSON.stringify(pathToFileURL(path.join(workspace, 'apps/stage-tamagotchi/package.json')).href) },
  external: ['electron'],
  outfile: output,
  plugins: [{
    name: 'raw-source',
    setup(build) {
      build.onResolve({ filter: /\?raw$/ }, args => ({ path: path.resolve(args.resolveDir, args.path.slice(0, -4)), namespace: 'raw-source' }))
      build.onLoad({ filter: /.*/, namespace: 'raw-source' }, async args => ({ contents: await fs.readFile(args.path, 'utf8'), loader: 'text' }))
    },
  }],
}).then(() => console.info(output), (error) => {
  console.error(error)
  process.exitCode = 1
})
