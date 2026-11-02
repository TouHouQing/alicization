const { spawn } = require('node:child_process')
const process = require('node:process')

if (!process.env.LIFE_QA_PRIVATE_DESKTOP?.startsWith('AlicizationQA_'))
  throw new Error('A private desktop is required')
const child = spawn(process.execPath, ['-e', 'setTimeout(() => {}, 30000)'], { windowsHide: true, stdio: 'ignore' })
child.once('spawn', () => console.info(JSON.stringify({ purpose: 'owned-timeout-fixture', pid: process.pid, childPid: child.pid, desktop: process.env.LIFE_QA_PRIVATE_DESKTOP })))
setTimeout(() => {}, 30000)
