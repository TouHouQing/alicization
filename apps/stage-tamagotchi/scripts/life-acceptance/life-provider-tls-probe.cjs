const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const os = require('node:os')
const path = require('node:path')
const process = require('node:process')

const { _electron } = require('playwright')

const { launchOptions } = require('./electron-launch.cjs')

async function main() {
  const workspace = path.resolve(__dirname, '../../../..')
  const config = JSON.parse(await fs.readFile(path.join(process.env.APPDATA, 'com.tohoqing.alicization/alicizations/llm-config.json'), 'utf8'))
  const selected = config.providerCredentials[config.activeProviderId]
  const target = new URL(selected.baseUrl).origin
  assert.ok(target.startsWith('https://'))
  const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'alicization-life-network-'))
  const application = await _electron.launch(launchOptions(profile))
  try {
    const result = await application.evaluate(async ({ app, net }, target) => {
      await app.whenReady()
      const tls = process.getBuiltinModule('node:tls')
      const probe = async (fetcher) => {
        try {
          const response = await fetcher(target, { method: 'HEAD', signal: AbortSignal.timeout(15000) })
          return { verified: true, status: response.status }
        }
        catch (error) {
          return { verified: false, code: error.cause?.code ?? error.code ?? error.name, message: error.message.slice(0, 180) }
        }
      }
      const nodeDefault = await probe(globalThis.fetch)
      const chromium = await probe((url, options) => net.fetch(url, options))
      const systemCertificates = tls.getCACertificates?.('system') ?? []
      let nodeWithSystemRoots = null
      if (typeof tls.setDefaultCACertificates === 'function') {
        tls.setDefaultCACertificates([...tls.getCACertificates('default'), ...systemCertificates])
        nodeWithSystemRoots = await probe(globalThis.fetch)
      }
      return { nodeVersion: process.versions.node, electronVersion: process.versions.electron, nodeDefault, chromium, systemCertificateCount: systemCertificates.length, canSetSystemRoots: typeof tls.setDefaultCACertificates === 'function', nodeWithSystemRoots }
    }, target)
    await fs.writeFile(path.join(workspace, 'output/life-completion-provider-tls-probe-20261010.json'), JSON.stringify({ ...result, privateDesktop: process.env.LIFE_QA_PRIVATE_DESKTOP, scope: 'Credential-free HTTPS HEAD probes to the selected provider origin; system trust read only, no verification bypass or OS/configuration changes' }, null, 2))
    console.info(JSON.stringify(result))
  }
  finally {
    await application.close()
  }
}
main().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
