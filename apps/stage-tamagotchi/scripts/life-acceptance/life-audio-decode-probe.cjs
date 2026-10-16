/* eslint-disable style/max-statements-per-line */
const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const { createServer } = require('node:net')
const os = require('node:os')
const path = require('node:path')
const process = require('node:process')

const { _electron } = require('playwright')

const { launchOptions, registerPrivateRuntime, closePrivateRuntime, packageIdentity } = require('./electron-launch.cjs')
const { startSpeechQa } = require('./life-current-speech-qa.cjs')

const wait = ms => new Promise(resolve => setTimeout(resolve, ms))

async function main() {
  const root = path.resolve(process.env.LIFE_AUDIO_PROBE_ROOT)
  assert.ok(root.startsWith(path.resolve('output') + path.sep))
  await fs.mkdir(root, { recursive: true })
  const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'alicization-life-product-regression-audio-'))
  const voice = await startSpeechQa(profile, { maxRequests: 2 })
  const options = launchOptions(profile)
  options.env.PORT = String(await new Promise((resolve) => { const server = createServer(); server.listen(0, '127.0.0.1', () => { const port = server.address().port; server.close(() => resolve(port)) }) }))
  options.args.push('--host-resolver-rules=MAP localhost ~NOTFOUND', '--autoplay-policy=no-user-gesture-required')
  if (process.env.LIFE_QA_AUDIO_SERVICE_UNSANDBOXED === '1')
    options.args.push('--disable-features=AudioServiceSandbox')
  const app = await _electron.launch(options)
  const report = { format: 'life-audio-decode-diagnostic-v1', profile, ...await packageIdentity(), syntheticIdentity: true, passed: false, privateAudioSandboxDiagnostic: process.env.LIFE_QA_AUDIO_SERVICE_UNSANDBOXED === '1' }
  report.nativeRuntime = await registerPrivateRuntime(app)
  try {
    let stage
    for (let attempt = 0; attempt < 100; attempt++) {
      stage = app.windows().find(page => page.url().endsWith('#/')); if (stage)
        break; await wait(200)
    }
    assert.ok(stage)
    report.audio = await stage.evaluate(async (url) => {
      const response = await fetch(`${url}audio/speech`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model: 'qa-sapi', voice: 'qa-sapi', input: '你好，这是一次本地语音解码检查。' }) })
      const bytes = await response.arrayBuffer(); const context = new AudioContext()
      await context.resume()
      const started = performance.now()
      const result = await Promise.race([context.decodeAudioData(bytes.slice(0)).then(audio => ({ decoded: true, duration: audio.duration, sampleRate: audio.sampleRate }), error => ({ decoded: false, error: error.message })), new Promise(resolve => setTimeout(() => resolve({ decoded: false, error: 'decode timeout after 10 seconds' }), 10000))])
      const before = context.currentTime; await new Promise(resolve => setTimeout(resolve, 500))
      return { ...result, status: response.status, bytes: bytes.byteLength, magic: String.fromCharCode(...new Uint8Array(bytes.slice(0, 4))), elapsedMs: performance.now() - started, contextState: context.state, clockAdvanced: context.currentTime - before }
    }, voice.url)
    report.passed = report.audio.decoded === true
  }
  catch (error) { report.failure = error.message; throw error }
  finally {
    report.voice = voice.summary()
    await fs.writeFile(path.join(root, 'report.json'), JSON.stringify(report, null, 2))
    report.shutdown = await closePrivateRuntime(app, report.nativeRuntime)
    await voice.close()
    report.passed &&= report.shutdown.completed && report.shutdown.exitCode === 0
    await fs.writeFile(path.join(root, 'report.json'), JSON.stringify(report, null, 2))
  }
  console.info(JSON.stringify(report.audio))
}
main().catch((error) => { console.error(error.message); process.exitCode = 1 })
