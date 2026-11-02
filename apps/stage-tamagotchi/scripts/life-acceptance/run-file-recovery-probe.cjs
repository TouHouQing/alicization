const assert = require('node:assert/strict')
const { spawn } = require('node:child_process')
const path = require('node:path')
const process = require('node:process')

async function main() {
  assert.match(process.env.LIFE_QA_PRIVATE_DESKTOP || '', /^AlicizationQA_[a-f\d]{32}$/u)
  const workspace = path.resolve(__dirname, '../../../..')
  const bundle = path.resolve(process.env.LIFE_PROBE_BUNDLE || '')
  const root = path.resolve(process.env.LIFE_FILE_RECOVERY_PROBE_ROOT || '')
  assert(bundle.startsWith(path.join(workspace, 'output') + path.sep) && bundle.endsWith('.cjs'))
  assert(root.startsWith(path.join(workspace, 'output') + path.sep))
  for (const phase of ['capture', 'reopen']) {
    await new Promise((resolve, reject) => {
      const child = spawn(require('electron'), [bundle], { windowsHide: true, stdio: 'inherit', env: { ...process.env, LIFE_FILE_RECOVERY_PHASE: phase } })
      child.once('error', reject)
      child.once('exit', (code) => {
        if (code === 0)
          resolve()
        else reject(new Error(`File recovery ${phase} exited ${code}`))
      })
    })
  }
}
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
