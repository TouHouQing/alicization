const assert = require('node:assert/strict')
const { Buffer } = require('node:buffer')
const { spawn } = require('node:child_process')
const { createHmac, randomBytes, timingSafeEqual } = require('node:crypto')
const { EventEmitter } = require('node:events')
const fs = require('node:fs')
const path = require('node:path')
const process = require('node:process')

const owners = new Map()
const ownerKey = profile => fs.realpathSync(profile).toLowerCase()
const keyName = 'ALICIZATION_QA_LAUNCH_KEY'
const nonceName = 'ALICIZATION_QA_LAUNCH_NONCE'
const executableName = 'ALICIZATION_QA_NATIVE_EXECUTABLE'
const profileName = 'ALICIZATION_QA_LAUNCH_PROFILE'
const directoryName = 'ALICIZATION_QA_LAUNCH_DIRECTORY'
const controllerName = 'ALICIZATION_QA_LAUNCH_CONTROLLER_PID'
const sign = (key, payload) => ({ payload, mac: createHmac('sha256', key).update(JSON.stringify(payload)).digest('hex') })

function readReceipt(owner, kind) {
  const file = path.join(owner.directory, `qa-native-${kind}.json`)
  if (!fs.existsSync(file))
    return null
  const body = fs.readFileSync(file)
  assert.ok(body.length <= 4096, 'QA native receipt exceeds its budget')
  const record = JSON.parse(body.toString('utf8'))
  assert.match(record.mac ?? '', /^[a-f\d]{64}$/u)
  const expected = sign(owner.key, record.payload).mac
  assert.ok(timingSafeEqual(Buffer.from(record.mac, 'hex'), Buffer.from(expected, 'hex')), 'QA native receipt signature mismatch')
  assert.equal(record.payload.version, 1)
  assert.equal(record.payload.kind, kind)
  assert.equal(record.payload.nonce, owner.nonce)
  assert.ok(Number.isSafeInteger(record.payload.pid) && record.payload.pid > 0)
  return record.payload
}

/** Playwright launches through cmd.exe on Windows. Keep a console owner alive. */
exports.prepareWindowsQaLaunch = function (profile, executable) {
  const canonicalProfile = fs.realpathSync(profile)
  assert.match(path.basename(canonicalProfile), /^alicization-(?:stage-smoke|life-[\w-]+)-/u)
  for (const value of [process.execPath, __filename]) assert.ok(!/["%\r\n]/u.test(value), 'QA launcher path cannot be represented safely in cmd')
  const key = randomBytes(32)
  const nonce = randomBytes(16).toString('hex')
  const directory = path.join(canonicalProfile, `qa-native-launch-${nonce}`)
  fs.mkdirSync(directory)
  const command = path.join(directory, 'alicization-qa-launcher.cmd')
  fs.writeFileSync(command, `@echo off\r\n"${process.execPath}" "${__filename}" %*\r\n@exit /b %errorlevel%\r\n`, { flag: 'wx' })
  owners.set(ownerKey(canonicalProfile), { profile: canonicalProfile, directory, executable: path.resolve(executable), key, nonce })
  return { executablePath: command, env: { [keyName]: key.toString('hex'), [nonceName]: nonce, [executableName]: path.resolve(executable), [profileName]: canonicalProfile, [directoryName]: directory, [controllerName]: String(process.pid) } }
}

/** Actual-child receipts, rather than the lifetime of Playwright's cmd launcher. */
exports.bindWindowsNativeRuntime = function (identity, launcher) {
  const owner = owners.get(ownerKey(identity.profile))
  assert.ok(owner, 'QA native launcher has no current owner')
  const started = readReceipt(owner, 'started')
  assert.equal(started?.pid, identity.pid, 'QA actual child PID differs from Electron identity')
  assert.equal(path.resolve(started.executable).toLowerCase(), path.resolve(identity.executable).toLowerCase())
  assert.equal(path.resolve(started.executable).toLowerCase(), owner.executable.toLowerCase())
  if (identity.parentPid !== undefined)
    assert.equal(started.launcherPid, identity.parentPid)
  let ended = null
  let failure = null
  const native = Object.assign(new EventEmitter(), { pid: started.pid, spawnfile: started.executable, stdout: launcher.stdout, stderr: launcher.stderr })
  let timer
  const probe = () => {
    if (ended || failure)
      return
    try {
      const receipt = readReceipt(owner, 'exited')
      if (!receipt)
        return
      assert.equal(receipt.pid, started.pid)
      assert.equal(receipt.launcherPid, started.launcherPid)
      assert.ok(receipt.exitCode === null || Number.isSafeInteger(receipt.exitCode))
      assert.ok(receipt.signal === null || /^SIG[A-Z]+$/u.test(receipt.signal))
      ended = receipt
      clearInterval(timer)
      launcher.removeListener('exit', probe)
      native.emit('exit', receipt.exitCode, receipt.signal)
    }
    catch { failure = 'Actual child receipt could not be authenticated' }
  }
  Object.defineProperties(native, {
    exitCode: { get: () => {
      probe()
      return ended?.exitCode ?? null
    } },
    signalCode: { get: () => {
      probe()
      return ended?.signal ?? null
    } },
  })
  native.kill = (signal) => {
    assert.equal(signal, 'SIGKILL')
    probe()
    if (ended || failure)
      return false
    const control = path.join(owner.directory, 'qa-native-control.json')
    if (!fs.existsSync(control))
      writeReceipt(owner.directory, owner.key, { version: 1, kind: 'control', nonce: owner.nonce, operation: 'force-stop', pid: started.pid })
    return true
  }
  launcher.on('exit', probe)
  timer = setInterval(probe, 100)
  timer.unref?.()
  probe()
  return { process: native, proof: { source: 'authenticated-direct-child-close', pid: started.pid, parentPid: started.launcherPid, playwrightLauncherPid: launcher.pid, startedAt: started.startedAt }, failure: () => failure, dispose: () => {
    clearInterval(timer)
    launcher.removeListener('exit', probe)
  } }
}

function writeReceipt(profile, key, payload) {
  const target = path.join(profile, `qa-native-${payload.kind}.json`)
  const temporary = `${target}.${randomBytes(8).toString('hex')}.tmp`
  fs.writeFileSync(temporary, JSON.stringify(sign(key, payload)), { flag: 'wx' })
  fs.linkSync(temporary, target)
  fs.unlinkSync(temporary)
}

function runLauncher() {
  const key = Buffer.from(process.env[keyName] ?? '', 'hex')
  const nonce = process.env[nonceName]
  const profile = fs.realpathSync(process.env[profileName] ?? '')
  const directory = fs.realpathSync(process.env[directoryName] ?? '')
  const executable = process.env[executableName]
  const controllerPid = Number(process.env[controllerName])
  assert.equal(key.length, 32)
  assert.match(nonce ?? '', /^[a-f\d]{32}$/u)
  assert.match(path.basename(profile), /^alicization-(?:stage-smoke|life-[\w-]+)-/u)
  assert.equal(path.dirname(directory), profile)
  assert.equal(path.basename(directory), `qa-native-launch-${nonce}`)
  assert.ok(Number.isSafeInteger(controllerPid) && controllerPid > 0 && controllerPid !== process.pid)
  const env = { ...process.env }
  for (const name of [keyName, nonceName, executableName, profileName, directoryName, controllerName]) delete env[name]
  const child = spawn(executable, process.argv.slice(2), { env, shell: false, windowsHide: true, stdio: ['ignore', 'inherit', 'inherit'] })
  const stop = () => {
    if (child.exitCode === null && child.signalCode === null)
      child.kill('SIGKILL')
  }
  // Playwright deliberately ignores stdin. Control must survive that launch chain.
  const controlTimer = setInterval(() => {
    try {
      process.kill(controllerPid, 0)
    }
    catch {
      stop()
      return
    }
    try {
      const control = readReceipt({ directory, key, nonce }, 'control')
      if (control?.operation === 'force-stop' && control.pid === child.pid)
        stop()
    }
    catch { /* Unauthenticated files cannot control the child. */ }
  }, 100)
  child.once('spawn', () => {
    try {
      writeReceipt(directory, key, { version: 1, kind: 'started', nonce, launcherPid: process.pid, pid: child.pid, executable, startedAt: Date.now() })
    }
    catch { stop() }
  })
  child.once('error', () => {
    process.exitCode = 1
  })
  child.once('close', (code, signal) => {
    clearInterval(controlTimer)
    try {
      if (child.pid)
        writeReceipt(directory, key, { version: 1, kind: 'exited', nonce, launcherPid: process.pid, pid: child.pid, exitCode: code, signal, observedAt: Date.now() })
      process.exitCode = code ?? 1
    }
    catch { process.exitCode = 1 }
  })
  process.once('SIGINT', stop)
  process.once('SIGTERM', stop)
}

if (require.main === module) {
  try {
    runLauncher()
  }
  catch {
    process.stderr.write('Owned QA native launcher failed\n')
    process.exitCode = 1
  }
}
