const assert = require('node:assert/strict')
const { createHash } = require('node:crypto')
const fs = require('node:fs/promises')
const os = require('node:os')
const path = require('node:path')

/** One explicit build identity shared by NSIS configuration and acceptance. */
exports.installerQaIdentity = function ({ workspace, runId, appData }) {
  assert.match(runId ?? '', /^20\d{6}-[a-f0-9]{8}$/u, 'Set LIFE_QA_INSTALLER_ID to YYYYMMDD followed by eight random hexadecimal digits')
  const date = `${runId.slice(0, 4)}-${runId.slice(4, 6)}-${runId.slice(6, 8)}`
  assert.equal(new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10), date, 'Installer QA date must be a real date')
  assert.ok(path.isAbsolute(workspace), 'Installer QA requires an absolute workspace')
  const root = path.resolve(workspace)
  // A distinct uninstall key for every QA identity; none reuses production's
  // GUID or an older QA installation's registration.
  const digest = createHash('sha256').update(`alicization-isolated-installer-v1:${runId}`).digest('hex').slice(0, 32)
  const guid = `${digest.slice(0, 8)}-${digest.slice(8, 12)}-${digest.slice(12, 16)}-${digest.slice(16, 20)}-${digest.slice(20)}`
  const packageName = `alicization-life-installer-${runId}`
  const executableName = `alicization-lifeqa-${runId}`
  const productName = `AlicizationLifeQA${runId}`
  const release = path.join(root, 'apps/stage-tamagotchi/dist', `life-installer-qa-${runId}`)
  return {
    runId,
    guid,
    packageName,
    executableName,
    productName,
    appId: `com.tohoqing.alicization.qa.life${runId}`,
    release,
    installer: path.join(release, `Alicization-Life-QA-${runId}.exe`),
    unpackedExecutable: path.join(release, 'win-unpacked', `${executableName}.exe`),
    unpackedAsar: path.join(release, 'win-unpacked/resources/app.asar'),
    reportRoot: path.join(root, 'output/life-acceptance', `installer-${runId}`),
    ...(appData ? { profile: path.join(appData, packageName) } : {}),
  }
}

exports.assertInstallerProfileOwner = async function ({ workspace, runId, appData, profile, nonce, executable }) {
  const identity = exports.installerQaIdentity({ workspace, runId, appData })
  const expectedProfile = path.resolve(identity.profile)
  assert.equal(path.basename(path.resolve(profile)).toLowerCase(), identity.packageName.toLowerCase(), 'Profile must belong to this exact installer identity')
  // MSIX may virtualize this exact AppData child without virtualizing its
  // parent. Check the original namespace's ancestry, then require a supplied
  // spelling to identify that exact directory and ownership-file object.
  const lexicalBase = path.resolve(appData)
  for (let cursor = expectedProfile; ; cursor = path.dirname(cursor)) {
    const entry = await fs.lstat(cursor)
    assert.ok(entry.isDirectory() && !entry.isSymbolicLink(), 'QA profile ancestry cannot redirect through a filesystem link')
    if (cursor === lexicalBase)
      break
    assert.notEqual(cursor, path.dirname(cursor), 'QA profile escaped its configured AppData root')
  }
  const canonical = await fs.realpath(profile)
  const suppliedDirectory = await fs.lstat(profile, { bigint: true })
  const originalDirectory = await fs.stat(expectedProfile, { bigint: true })
  const resolvedDirectory = await fs.stat(canonical, { bigint: true })
  assert.ok(suppliedDirectory.isDirectory() && !suppliedDirectory.isSymbolicLink(), 'QA profile ancestry cannot redirect through a filesystem link')
  assert.ok(originalDirectory.ino !== 0n && originalDirectory.ino === suppliedDirectory.ino && originalDirectory.dev === suppliedDirectory.dev && originalDirectory.ino === resolvedDirectory.ino && originalDirectory.dev === resolvedDirectory.dev, 'Canonical profile must be the same directory object')
  const ownerPath = path.join(expectedProfile, 'life-installer-qa-owner.json')
  const marker = await fs.lstat(ownerPath, { bigint: true })
  const suppliedMarker = await fs.lstat(path.join(profile, 'life-installer-qa-owner.json'), { bigint: true })
  const canonicalMarker = await fs.lstat(path.join(canonical, 'life-installer-qa-owner.json'), { bigint: true })
  assert.ok(marker.isFile() && !marker.isSymbolicLink() && marker.nlink === 1n && suppliedMarker.isFile() && !suppliedMarker.isSymbolicLink() && suppliedMarker.nlink === 1n && canonicalMarker.isFile() && !canonicalMarker.isSymbolicLink() && marker.ino !== 0n && marker.ino === suppliedMarker.ino && marker.dev === suppliedMarker.dev && marker.ino === canonicalMarker.ino && marker.dev === canonicalMarker.dev, 'Ownership marker must be the same regular file without extra hard links')
  const owner = JSON.parse(await fs.readFile(ownerPath, 'utf8'))
  assert.equal(owner.format, 'life-installer-qa-owner-v1')
  assert.equal(owner.runId, identity.runId)
  assert.match(nonce ?? '', /^[a-f0-9-]{36}$/u)
  assert.equal(owner.nonce, nonce)
  assert.match(path.basename(owner.installRoot), /^alicization-life-installer-app-[\w-]+$/u)
  assert.equal((await fs.lstat(owner.installRoot)).isSymbolicLink(), false)
  const installRoot = await fs.realpath(owner.installRoot)
  assert.equal(path.dirname(installRoot).toLowerCase(), (await fs.realpath(os.tmpdir())).toLowerCase())
  assert.equal(path.resolve(executable), path.join(path.resolve(owner.installRoot), `${identity.executableName}.exe`))
  return { identity, owner, canonicalProfile: canonical }
}
