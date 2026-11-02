const assert = require('node:assert/strict')

/** Old Windows shell-launcher receipts cannot qualify an Electron release. */
exports.assertAuthenticatedNativeQuit = function (shutdown) {
  assert.equal(shutdown?.completed, true, 'Native shutdown must complete')
  assert.equal(shutdown.exitCode, 0, 'Actual native child must exit normally')
  assert.ok(!shutdown.exitSignal && !shutdown.failure && !shutdown.forcedCleanup && !shutdown.forcedQaCleanup && !shutdown.unexpectedExitBeforeQuit)
  assert.equal(shutdown.fileFlushObserved, true)
  assert.equal(shutdown.windowTeardownObserved, true)
  assert.ok(Number.isFinite(shutdown.elapsedMs) && shutdown.elapsedMs >= 0 && shutdown.elapsedMs <= 60000)
  const proof = shutdown.nativeProcessObservation
  assert.equal(proof?.source, 'authenticated-direct-child-close', 'Actual direct-child exit ownership is required')
  const pids = [proof.pid, proof.parentPid, proof.playwrightLauncherPid]
  assert.ok(pids.every(pid => Number.isSafeInteger(pid) && pid > 0) && new Set(pids).size === 3, 'Native child, owner and shell launcher must have distinct identities')
  assert.ok(Number.isFinite(proof.startedAt) && Number.isFinite(shutdown.nativeExitObservedAt) && shutdown.nativeExitObservedAt >= proof.startedAt)
  return proof
}

/** Native exit is independent of the renderer acknowledging a closing click. */
exports.observeNativeQuit = function (exited, requested) {
  // UI acknowledgement cannot certify exit or hold an already exited process.
  const requestFailure = new Promise((_, reject) => {
    requested.catch(reject)
  })
  return Promise.race([exited, requestFailure])
}
