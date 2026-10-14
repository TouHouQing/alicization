const assert = require('node:assert/strict')
const { execFile } = require('node:child_process')
const { createHash, randomUUID } = require('node:crypto')
const fs = require('node:fs/promises')
const os = require('node:os')
const path = require('node:path')
const process = require('node:process')
const { promisify } = require('node:util')

const runFile = promisify(execFile)
const installer = path.resolve('apps/stage-tamagotchi/dist/life-installer-qa-20261005/Alicization-Life-QA-20261005.exe')
const profile = path.join(process.env.APPDATA, 'alicization-life-installer-20261005')

async function exists(file) {
  return fs.access(file).then(() => true, () => false)
}
async function waitFor(predicate) {
  for (let attempt = 0; attempt < 120; attempt++) {
    if (await predicate())
      return
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  throw new Error('Owned installer transition timed out')
}
async function hash(file) {
  return createHash('sha256').update(await fs.readFile(file)).digest('hex')
}
async function findIdentityFiles(directory, depth = 0) {
  const found = []
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name)
    if (entry.isDirectory() && depth < 5)
      found.push(...await findIdentityFiles(file, depth + 1))
    if (entry.isFile() && ['SOUL.md', 'alicization.db', 'life-installer-qa-owner.json'].includes(entry.name))
      found.push(file)
  }
  return found
}
async function main() {
  assert.equal(await exists(profile), false, 'Never reuse an existing application-data identity')
  // The blockmap is written after NSIS finalizes the executable. A parallel
  // package job must finish before acceptance can launch its installer.
  await waitFor(async () => await exists(installer) && await exists(`${installer}.blockmap`))
  const installRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'alicization-life-installer-app-'))
  assert.equal(path.dirname(installRoot).toLowerCase(), path.resolve(os.tmpdir()).toLowerCase())
  const executable = path.join(installRoot, 'alicization-lifeqa-20261005.exe')
  await runFile(installer, ['/S', '/currentuser', `/D=${installRoot}`], { windowsHide: true, timeout: 180000 })
  await waitFor(() => exists(executable))
  const unpackedAsar = path.resolve('apps/stage-tamagotchi/dist/life-installer-qa-20261005/win-unpacked/resources/app.asar')
  assert.equal(await hash(path.join(installRoot, 'resources/app.asar')), await hash(unpackedAsar), 'Installation contains the exact packaged runtime')
  const nonce = randomUUID()
  await fs.mkdir(profile, { recursive: true })
  await fs.writeFile(path.join(profile, 'life-installer-qa-owner.json'), JSON.stringify({ nonce, installRoot }))
  const persona = await runFile(process.execPath, [path.join(__dirname, 'life-current-persona-smoke.cjs')], { cwd: path.resolve('.'), windowsHide: true, timeout: 150000, env: { ...process.env, LIFE_QA_EXE: executable, LIFE_QA_PROFILE: profile, LIFE_QA_PROFILE_NONCE: nonce } })
  await fs.writeFile('output/life-acceptance/installed-persona.log', persona.stdout + persona.stderr)
  const identity = await findIdentityFiles(profile)
  assert.ok(identity.some(file => path.basename(file) === 'SOUL.md'), 'Installed application really saved its own persona')
  assert.ok(identity.some(file => path.basename(file) === 'alicization.db'), 'Installed native SQLite runtime really committed its own life state')
  const before = new Map(await Promise.all(identity.map(async file => [file, await hash(file)])))
  const uninstallerName = (await fs.readdir(installRoot)).find(file => /uninstall.*\.exe$/iu.test(file))
  assert.ok(uninstallerName, 'Owned NSIS uninstaller exists')
  await runFile(path.join(installRoot, uninstallerName), ['/S', '/currentuser'], { windowsHide: true, timeout: 180000 })
  await waitFor(async () => !await exists(executable))
  for (const [file, digest] of before)
    assert.equal(await hash(file), digest, 'Uninstall preserves the actual saved identity bytes')
  const result = { scope: 'Isolated NSIS identity and install path, same compiled runtime and uninstall data policy; silent installation rather than manual installer UI', installRoot, profile, installer, installedRuntimeExact: true, installedPersonaAndSqlite: true, uninstallRemovedExecutable: true, savedIdentityFiles: identity.length, identityBytesPreserved: true }
  await fs.writeFile('output/life-acceptance/installer.json', JSON.stringify(result, null, 2))
  console.info(JSON.stringify(result))
}
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
