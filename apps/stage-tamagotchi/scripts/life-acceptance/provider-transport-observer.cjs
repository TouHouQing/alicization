// Observe actual main-process requests without recording credentials or bodies.
exports.observeProviderTransport = async (application, baseUrl) => {
  const endpoint = new URL('chat/completions', `${baseUrl.replace(/\/+$/u, '')}/`).href
  await application.evaluate(({ net }, expectedEndpoint) => {
    const original = net.fetch
    const state = { events: [], original, wrapper: null }
    state.wrapper = async function (input, init) {
      const address = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
      const url = new URL(address)
      const event = url.pathname.endsWith('/chat/completions')
        ? { endpointMatchesConfiguration: url.href === expectedEndpoint, startedAt: Date.now(), status: null, elapsedMs: null, error: null }
        : null
      if (event && state.events.length < 32)
        state.events.push(event)
      try {
        const response = await original.call(net, input, init)
        if (event) {
          event.status = response.status
          event.elapsedMs = Date.now() - event.startedAt
        }
        return response
      }
      catch (error) {
        if (event) {
          event.error = { name: error.name, code: error.code ?? null, message: error.message.replace(/https?:\/\/\S+/gu, '[provider-url]') }
          event.elapsedMs = Date.now() - event.startedAt
        }
        throw error
      }
    }
    net.fetch = state.wrapper
    globalThis.productQaProviderTransport = state
  }, endpoint)
}

exports.releaseProviderTransportObservation = async (application) => {
  return application.evaluate(({ net }) => {
    const state = globalThis.productQaProviderTransport
    if (!state)
      return null
    if (net.fetch === state.wrapper)
      net.fetch = state.original
    delete globalThis.productQaProviderTransport
    return { scope: 'Actual main-process HTTP metadata only; no request substitution, headers or bodies.', events: state.events }
  })
}
