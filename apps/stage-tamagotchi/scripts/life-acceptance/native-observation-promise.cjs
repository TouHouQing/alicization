const assert = require('node:assert/strict')
const { randomUUID } = require('node:crypto')

// Read synchronous state through the inspector. Electron's inspector can lose
// an awaitPromise handle during native capture even with a rooted promise.
// The capture is invoked exactly once; polling never repeats the native action.
exports.withPinnedInspectorResult = async function (evaluate, expression) {
  const key = `__alicizationOwnedObservation_${randomUUID().replaceAll('-', '')}`
  const property = JSON.stringify(key)
  const pinned = `(() => {
    const state = { status: 'pending', promise: null, value: null, error: null };
    Object.defineProperty(globalThis, ${property}, { value: state, configurable: true });
    state.promise = Promise.resolve().then(() => (${expression})).then(
      value => { state.value = value; state.status = 'fulfilled'; },
      error => { state.error = { message: String(error?.message ?? error) }; state.status = 'rejected'; }
    );
    return true;
  })()`
  try {
    assert.equal(await evaluate(pinned), true)
    const deadline = Date.now() + 8000
    while (Date.now() < deadline) {
      const state = await evaluate(`(() => { const state = globalThis[${property}]; return state && { status: state.status, value: state.value, error: state.error }; })()`)
      assert.ok(state, 'Owned observation lost its pending state')
      if (state.status === 'fulfilled')
        return state.value
      if (state.status === 'rejected')
        throw new Error(state.error.message)
      await new Promise(resolve => setTimeout(resolve, 25))
    }
    throw new Error('Owned native observation exceeded 8000ms')
  }
  finally {
    const removed = await evaluate(`delete globalThis[${property}] && !Object.hasOwn(globalThis, ${property})`)
    assert.equal(removed, true, 'Owned observation must release its completed promise root')
  }
}
