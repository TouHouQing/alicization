const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const os = require('node:os')
const path = require('node:path')
const process = require('node:process')

async function main() {
  const workspace = path.resolve(__dirname, '../../../..')
  const reportPath = path.resolve(process.argv[2] || '')
  const reportsRoot = await fs.realpath(path.join(workspace, 'output/life-closure-20261006'))
  const reportRealPath = await fs.realpath(reportPath)
  assert.ok(reportRealPath.startsWith(`${reportsRoot}${path.sep}`))
  assert.equal(path.basename(reportRealPath), 'experience.json')
  const report = JSON.parse(await fs.readFile(reportRealPath, 'utf8'))
  assert.equal(report.syntheticIdentity, true)
  const profile = await fs.realpath(report.profile)
  const temporaryRoot = await fs.realpath(os.tmpdir())
  assert.equal(path.dirname(profile).toLowerCase(), temporaryRoot.toLowerCase())
  assert.match(path.basename(profile), /^alicization-life-real-experience-[a-z0-9]+$/iu)
  assert.match(await fs.readFile(path.join(profile, 'alicizations/cards/default/SOUL.md'), 'utf8'), /QA/u)
  const configPath = await fs.realpath(path.join(profile, 'alicizations/llm-config.json'))
  assert.ok(configPath.startsWith(`${profile}${path.sep}`))
  const config = JSON.parse(await fs.readFile(configPath, 'utf8'))
  config.providerCredentials = {}
  await fs.writeFile(configPath, JSON.stringify(config))
  const storage = path.join(profile, 'Local Storage')
  try {
    const storageRealPath = await fs.realpath(storage)
    assert.equal(path.dirname(storageRealPath).toLowerCase(), profile.toLowerCase())
    assert.equal(path.basename(storageRealPath), 'Local Storage')
    await fs.rm(storageRealPath, { recursive: true, force: true })
  }
  catch (error) {
    if (error.code !== 'ENOENT')
      throw error
  }
  report.completed = false
  report.stoppedReason = 'Cancelled after the intended new build failed typecheck; the loaded runtime was the prior compiled development build.'
  await fs.writeFile(reportRealPath, JSON.stringify(report, null, 2))
  const evidence = { profile, credentialEntries: Object.keys(JSON.parse(await fs.readFile(configPath, 'utf8')).providerCredentials).length, localStorageRemaining: await fs.access(storage).then(() => true, () => false), stopped: true }
  assert.equal(evidence.credentialEntries, 0)
  assert.equal(evidence.localStorageRemaining, false)
  await fs.writeFile(path.join(workspace, 'output/life-closure-aborted-qa-cleanup.json'), JSON.stringify(evidence, null, 2))
  console.info(JSON.stringify(evidence))
}

main().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
