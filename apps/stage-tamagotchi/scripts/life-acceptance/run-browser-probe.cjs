// Build with build-browser-probe.cjs, then run this entry with the private
// desktop runner and an explicit Node runtime. The child inherits its parent's
// private desktop and Job; this entry never switches the input desktop.
const { spawn } = require('node:child_process')
const path = require('node:path')
const process = require('node:process')

if (!process.env.LIFE_QA_PRIVATE_DESKTOP?.startsWith('AlicizationQA_'))
  throw new Error('A private desktop is required')
const workspace = path.resolve(__dirname, '../../../..')
const bundle = process.env.LIFE_PROBE_BUNDLE ? path.resolve(process.env.LIFE_PROBE_BUNDLE) : path.join(workspace, 'output/browser-execution-probe-20261020.cjs')
if (!bundle.startsWith(`${path.join(workspace, 'output')}${path.sep}`) || !bundle.endsWith('.cjs'))
  throw new Error('Probe bundles must remain under the workspace output directory')
const child = spawn(require('electron'), [bundle], { windowsHide: true, stdio: 'inherit', env: process.env })

child.once('error', (error) => {
  console.error(error)
  process.exitCode = 1
})
child.once('exit', (code) => {
  process.exitCode = code ?? 1
})
