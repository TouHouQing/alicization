import assert from 'node:assert/strict'
import process from 'node:process'

import { createHash, randomUUID } from 'node:crypto'
import { mkdir, readFile, realpath, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'

import { setupAlicizationDb } from '../../src/main/services/alicization/db'
import { recoverBrowserDownloads } from '../../src/main/services/alicization/execution/browser-download-repository'
import { recordBrowserDownloadReservation } from '../../src/main/services/alicization/execution/browser-download-reservations'
import { readBrowserDownloadQuarantines } from '../../src/main/services/alicization/execution/browser-download-resource-recovery'

const profile = resolve(process.argv[2] ?? '')
const root = resolve(process.argv[3] ?? '')
if (!basename(profile).startsWith('alicization-life-product-regression-') || await realpath(dirname(profile)) !== await realpath(tmpdir()) || (!root.startsWith(`${resolve('output')}\\`) && !root.startsWith(`${resolve('output')}/`)))
  throw new Error('Native recovery fixtures require their owned Temp profile and output directory')
const verifying = process.argv[4] === '--verify'
const database = await setupAlicizationDb(profile, { cardId: 'default', readOnly: verifying })
const artifacts: Array<{ reservationId: string, effectId: string, directory: string, path: string, content: string }> = []
try {
  if (verifying) {
    const fixture = JSON.parse(await readFile(join(root, 'download-recovery-fixture.json'), 'utf8')) as { profile: string, artifacts: typeof artifacts }
    assert.equal(fixture.profile, profile)
    const unresolved = await readBrowserDownloadQuarantines(database, 'synthetic-next-runtime')
    for (const artifact of fixture.artifacts) {
      assert.ok(!unresolved.some(item => item.effectId === artifact.effectId))
      assert.equal((await database.getLifeIngress(`browser-download-reservation-result:${artifact.reservationId}`))?.payload.state, 'unverified')
      assert.deepEqual((await database.getLifeIngress(`browser-download-resource-release:${artifact.reservationId}`))?.payload.confirmedStopped, true)
      assert.equal((await database.getLifeIngress(`browser-download-resource-release:${artifact.reservationId}`))?.payload.independent, false)
      assert.equal(await readFile(artifact.path, 'utf8'), artifact.content)
      artifacts.push(artifact)
    }
  }
  else {
    const downloadRoot = join(profile, 'alicizations', 'browser-downloads')
    const cardRoot = join(downloadRoot, createHash('sha256').update('default').digest('hex'))
    await mkdir(cardRoot, { recursive: true })
    const canonical = await realpath(cardRoot)
    for (let round = 1; round <= 3; round++) {
      const id = randomUUID()
      const directory = join(canonical, id)
      const at = Date.now()
      await recordBrowserDownloadReservation(database, { version: 2, runtimeId: 'synthetic-previous-native-runtime', id, cardId: 'default', actionId: `synthetic-native-${round}`, observationId: null, directory, requestedUrl: 'https://example.invalid/synthetic-owned-download', requestHash: createHash('sha256').update(`fixture-${id}`).digest('hex'), origin: { kind: 'host-interface' }, at, expiresAt: at + 15000 }, { root: downloadRoot, allowHostInterface: true })
      await mkdir(directory)
      const path = join(directory, 'partial.txt')
      const content = `Synthetic pre-existing native partial bytes ${round}`
      await writeFile(path, content, { flag: 'wx' })
      artifacts.push({ reservationId: id, effectId: `browser-download:${id}`, directory, path, content })
    }
    await recoverBrowserDownloads(database, randomUUID())
    assert.equal((await readBrowserDownloadQuarantines(database, 'synthetic-new-native-runtime')).length, 3)
  }
}
finally { await database.close() }
const result = { format: verifying ? 'synthetic-download-recovery-inspection-v1' : 'synthetic-download-recovery-fixture-v1', profile, writerClosed: true, nativeExecutionClaimed: false, independentSuccessClaimed: false, ...(verifying ? { passed: true } : {}), artifacts }
await writeFile(join(root, verifying ? 'download-recovery-after-shutdown.json' : 'download-recovery-fixture.json'), JSON.stringify(result, null, 2))
console.info(JSON.stringify({ owners: artifacts.length, writerClosed: true, verifying }))
