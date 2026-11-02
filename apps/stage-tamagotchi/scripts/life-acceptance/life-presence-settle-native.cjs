const assert = require('node:assert/strict')
const { createHash } = require('node:crypto')
const fs = require('node:fs/promises')
const os = require('node:os')
const path = require('node:path')
const process = require('node:process')

const { _electron } = require('playwright')

const { launchOptions, registerPrivateRuntime, closePrivateRuntime, packageIdentity } = require('./electron-launch.cjs')
const { observeLive2DExpression, readLive2DExpression } = require('./live2d-expression-observer.cjs')
const { sampleLive2D } = require('./live2d-product-checks.cjs')

const wait = ms => new Promise(resolve => setTimeout(resolve, ms))
const hash = bytes => createHash('sha256').update(bytes).digest('hex')
const workspace = path.resolve(__dirname, '../../../..')
function ownedOutput(raw) {
  assert.equal(typeof raw, 'string')
  const file = path.resolve(raw)
  assert.ok(file.startsWith(path.join(workspace, 'output') + path.sep))
  return file
}
const root = ownedOutput(process.env.LIFE_PRESENCE_ROOT)
const originals = []
const { execFileSync } = require('node:child_process')

async function unchangedSource() {
  const file = ownedOutput(process.env.LIFE_PRESENCE_SOURCE_SNAPSHOT)
  const snapshot = JSON.parse(await fs.readFile(file, 'utf8'))
  const git = args => execFileSync('git', args, { cwd: workspace, windowsHide: true, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }).trimEnd()
  assert.equal(git(['rev-parse', 'HEAD']), snapshot.head)
  const paths = [...new Set(git(['ls-files', '-z', '--cached', '--others', '--exclude-standard']).split('\0').filter(Boolean))].sort()
  assert.deepEqual(paths, snapshot.files.map(file => file.path))
  for (const entry of snapshot.files) {
    const target = path.join(workspace, entry.path)
    const metadata = await fs.lstat(target).catch((error) => {
      if (error.code === 'ENOENT')
        return null
      throw error
    })
    if (Object.hasOwn(entry, 'gitlink')) {
      assert.equal(metadata?.isDirectory(), true)
      assert.equal(git(['ls-files', '--stage', '--', entry.path]), entry.gitlink)
    }
    else if (entry.sha256 === null) {
      assert.equal(metadata, null)
    }
    else {
      assert.ok(metadata)
      assert.equal(hash(metadata.isSymbolicLink() ? `symlink:${await fs.readlink(target)}` : await fs.readFile(target)), entry.sha256, entry.path)
    }
  }
  return { file, fingerprint: snapshot.fingerprint, entries: snapshot.files.length }
}
async function main() {
  const sourceSnapshot = await unchangedSource()
  const baseline = JSON.parse(await fs.readFile(ownedOutput(process.env.LIFE_PRESENCE_BASE_REPORT), 'utf8'))
  assert.equal(baseline.passed, true)
  assert.equal(baseline.shutdown.completed, true)
  assert.equal(baseline.shutdown.exitCode, 0)
  assert.equal(baseline.credentialsRemoved, true)
  assert.equal(path.dirname(await fs.realpath(baseline.profile)).toLowerCase(), (await fs.realpath(os.tmpdir())).toLowerCase())
  await fs.mkdir(root)
  async function originalTree(dir) {
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      assert.equal(entry.isSymbolicLink(), false)
      const file = path.join(dir, entry.name)
      if (entry.isDirectory())
        await originalTree(file)
      else originals.push({ path: path.relative(baseline.profile, file), sha256: hash(await fs.readFile(file)) })
    }
  }
  await originalTree(baseline.profile)
  const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'alicization-life-presence-settle-'))
  for (const entry of await fs.readdir(baseline.profile))
    await fs.cp(path.join(baseline.profile, entry), path.join(profile, entry), { recursive: true, force: false, errorOnExist: true })
  const report = { format: 'actual-live2d-presence-settlement-v1', scope: 'Exact packaged Live2D body, actual public presence dispatcher and observed Cubism draws. Synthetic nonverbal events and voice configuration; no model dialogue or synthesized audio is claimed.', passed: false, profile, sourceProfile: baseline.profile, sourceSnapshot, ...await packageIdentity(), rounds: [] }
  let app, runtime
  try {
    app = await _electron.launch(launchOptions(profile))
    runtime = await registerPrivateRuntime(app)
    report.nativeRuntime = runtime
    let stage
    for (let attempt = 0; attempt < 150; attempt++) {
      stage = app.windows().find(page => page.url().endsWith('#/'))
      if (stage && (await sampleLive2D(stage).catch(() => ({ models: [] }))).models.some(model => model.probes.some(p => p.pixel[3] > 64)))
        break
      await wait(200)
    }
    assert.ok(stage)
    report.initial = await sampleLive2D(stage)
    assert.equal(report.initial.models.length, 1)
    report.observer = await observeLive2DExpression(stage)
    for (const voiceEnabled of [true, false]) {
      for (const round of [1, 2, 3]) {
        const input = await stage.evaluate(async ({ voiceEnabled, round }) => {
          const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia
          const speech = pinia._s.get('speech')
          speech.activeSpeechProvider = voiceEnabled ? 'openai-compatible-audio-speech' : 'speech-noop'
          const observedAt = Date.now()
          const issuedAfter = performance.now()
          const payload = { watchMode: 'mnemonic-passive', embodiedPresence: 'attentive', scenario: 'coding', stance: 'accompany', confidence: 1, reasonTags: ['owned-execution-settlement-check'], expiresAt: observedAt + 6000, activity: { id: `owned-pulse-${voiceEnabled}-${round}`, attemptId: `owned-attempt-${voiceEnabled}-${round}`, kind: 'execution', phase: 'working', phaseStartedAt: observedAt, observedAt, sequence: round } }
          const observation = window.__live2dExpressionObservation
          observation.phase = `voice-${voiceEnabled}-round-${round}`
          await pinia._s.get('alicization-presence-dispatcher').dispatchPresencePulse(payload)
          return { observedAt, issuedAfter, payload, activeSpeechProvider: speech.activeSpeechProvider, phase: observation.phase }
        }, { voiceEnabled, round })
        await wait(5500)
        const frames = (await readLive2DExpression(stage)).filter(frame => frame.phase === input.phase)
        const issued = frames.filter(frame => frame.actionReason === 'presence-pulse' && frame.actionIssuedAt >= input.issuedAfter - 1)
        const last = frames.at(-1)
        const item = { voiceEnabled, round, input, frames, issuedFrames: issued.length, final: last }
        report.rounds.push(item)
        await fs.writeFile(path.join(root, 'report.json'), JSON.stringify(report, null, 2))
        assert.ok(issued.length > 0, 'The actual body must receive this pulse before testing its retirement')
        assert.equal(input.activeSpeechProvider === 'speech-noop', !voiceEnabled)
        assert.equal(last.performancePhase, 'idle')
        assert.equal(last.actionCue, null)
        assert.equal(last.speech.active, false)
        assert.equal(last.actualAudio, null)
        assert.equal(last.nativeMotionPriority, 0)
        assert.ok(last.values.ParamMouthOpenY < 0.08)
        assert.equal(last.actionRevision, issued[0].actionRevision, 'A finite pulse must not rearm itself')
        await stage.screenshot({ path: path.join(root, `${input.phase}.png`) })
      }
    }
    report.passed = true
  }
  catch (error) {
    report.failure = error.message
    process.exitCode = 1
  }
  finally {
    try {
      if (app)
        report.shutdown = await closePrivateRuntime(app, runtime, { viaUi: true })
      report.passed &&= report.shutdown?.completed === true && report.shutdown.exitCode === 0
      for (const entry of originals) assert.equal(hash(await fs.readFile(path.join(baseline.profile, entry.path))), entry.sha256)
      report.originalProfileBytesUnchanged = true
      await unchangedSource()
      report.sourceUnchanged = true
    }
    catch (error) {
      report.passed = false
      report.verificationFailure = error.message
    }
    if (!report.passed)
      process.exitCode = 1
    await fs.writeFile(path.join(root, 'report.json'), JSON.stringify(report, null, 2))
    console.info(JSON.stringify({ passed: report.passed, report: path.join(root, 'report.json'), rounds: report.rounds.length, shutdown: report.shutdown?.exitCode, failure: report.failure ?? report.verificationFailure }))
  }
}
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
