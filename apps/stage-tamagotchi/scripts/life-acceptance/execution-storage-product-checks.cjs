const assert = require('node:assert/strict')
const { Buffer } = require('node:buffer')
const { randomUUID } = require('node:crypto')
const { createServer } = require('node:http')

const { sampleLive2D } = require('./live2d-product-checks.cjs')

exports.runExecutionStorageProductChecks = async function ({ app, settings, stage, report, capture, check }) {
  const nonce = randomUUID()
  const payload = Buffer.alloc(512 * 1024, nonce)
  let requests = 0
  const server = createServer((request, response) => {
    requests++
    if (request.url !== `/cache-${nonce}`) {
      response.writeHead(404).end()
      return
    }
    response.writeHead(200, { 'Content-Type': 'application/octet-stream', 'Cache-Control': 'public, max-age=3600', 'Content-Length': payload.length })
    response.end(payload)
  })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const port = server.address().port
  assert.ok(port >= 1024 && ![6000, 6665, 6666, 6667, 6668, 6669, 6697, 10080].includes(port), 'Fixture needs a Chromium-safe port')
  const url = `http://127.0.0.1:${port}/cache-${nonce}`
  const readNative = () => app.evaluate(async ({ session }) => ({ bytes: await session.defaultSession.getCacheSize(), cookies: (await session.defaultSession.cookies.get({ name: 'alicization-owned-cache-check' })).map(cookie => cookie.value) }))
  report.storageExperiences = []
  try {
    await app.evaluate(async ({ session }, { url, nonce }) => {
      await session.defaultSession.cookies.set({ url, name: 'alicization-owned-cache-check', value: nonce })
    }, { url, nonce })
    await settings.goto(`${settings.url().split('#')[0]}#/settings/life`)
    const region = settings.locator('[data-execution-storage]')
    await region.getByRole('heading', { name: '本地存储', exact: true }).waitFor()
    await settings.evaluate(nonce => localStorage.setItem('alicization-owned-cache-check', nonce), nonce)
    for (let round = 1; round <= 3; round++) {
      await app.evaluate(async ({ session }, url) => {
        const response = await session.defaultSession.fetch(url)
        if (!response.ok || (await response.arrayBuffer()).byteLength !== 512 * 1024)
          throw new Error('Actual fixture cache seed failed')
      }, url)
      let before = await readNative()
      const seededBy = Date.now() + 5000
      while (before.bytes < payload.length && Date.now() < seededBy) {
        await new Promise(resolve => setTimeout(resolve, 100))
        before = await readNative()
      }
      assert.ok(before.bytes >= payload.length, 'Actual default-session HTTP cache contains the fixture bytes')
      const previousCleanedAt = await region.getAttribute('data-storage-cleaned-at')
      await region.getByRole('button', { name: '清理临时缓存', exact: true }).click()
      await region.locator('[data-storage-released]').waitFor({ timeout: 10000 })
      await region.evaluate(async (node, previous) => {
        const until = Date.now() + 10000
        while (node.getAttribute('data-storage-cleaned-at') === previous) {
          if (Date.now() > until)
            throw new Error('A fresh native cleanup result was not published')
          await new Promise(resolve => setTimeout(resolve, 50))
        }
      }, previousCleanedAt)
      await region.getByRole('button', { name: '刷新存储状态', exact: true }).click()
      const until = Date.now() + 10000
      let after
      while (Date.now() < until) {
        after = await readNative()
        if (after.bytes < before.bytes / 2 && await region.getByRole('button', { name: '清理临时缓存', exact: true }).isEnabled())
          break
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      assert.ok(after)
      check('Actual cache cleanup preserves the synthetic browser cookie', after.cookies.includes(nonce))
      check('Actual cache cleanup preserves application local storage', await settings.evaluate(nonce => localStorage.getItem('alicization-owned-cache-check') === nonce, nonce))
      check('Native cache readback independently confirms fixture cache was removed', after.bytes < before.bytes / 2)
      const body = await sampleLive2D(stage)
      check('Cache maintenance retains the actual Live2D model', body.models.length === 1 && body.models[0].parameterSampling === 'final-draw')
      await region.scrollIntoViewIfNeeded()
      await capture(settings, `storage-cleanup-${round}`)
      report.storageExperiences.push({ round, beforeBytes: before.bytes, afterBytes: after.bytes, cookiePreserved: true, localStoragePreserved: true, source: 'actual-ui-eventa-native-default-session-cache' })
    }
    check('Cache seeding used the owned HTTP fixture', requests > 0)
  }
  finally {
    await settings.evaluate(() => localStorage.removeItem('alicization-owned-cache-check')).catch(() => {})
    await app.evaluate(async ({ session }, url) => session.defaultSession.cookies.remove(url, 'alicization-owned-cache-check'), url).catch(() => {})
    await new Promise(resolve => server.close(resolve))
  }
}
