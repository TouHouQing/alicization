const assert = require('node:assert/strict')
const { randomUUID } = require('node:crypto')

// An awaitPromise inspector request does not own the evaluated promise's
// lifetime. Keep one local root until its by-value response is acknowledged.
exports.withPinnedInspectorResult = async function (evaluate, expression) {
  const key = `__alicizationOwnedObservation_${randomUUID().replaceAll('-', '')}`
  const property = JSON.stringify(key)
  const pinned = `(() => { const value = (${expression}); Object.defineProperty(globalThis, ${property}, { value, configurable: true }); return value; })()`
  try {
    return await evaluate(pinned)
  }
  finally {
    const removed = await evaluate(`delete globalThis[${property}] && !Object.hasOwn(globalThis, ${property})`)
    assert.equal(removed, true, 'Owned observation must release its completed promise root')
  }
}
