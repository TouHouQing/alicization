/** Desktop provider transport is installed after Electron is ready; CLI callers use Node. */
let providerTransport: typeof fetch | undefined

export const providerFetch: typeof fetch = (input, init) => (providerTransport ?? globalThis.fetch)(input, init)

export function setProviderTransport(transport?: typeof fetch) {
  providerTransport = transport
}

export function withProviderFetch<T extends object>(options: T) {
  const customFetch = (options as { fetch?: typeof fetch }).fetch
  return { ...options, fetch: customFetch ?? providerFetch }
}

export function createDesktopProviderTransport(nativeFetch: typeof fetch, originalFetch: typeof fetch): typeof fetch {
  return (input, init) => {
    const address = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    const protocol = URL.canParse(address) ? new URL(address).protocol : null
    const integrity = init?.integrity ?? (typeof input === 'object' && 'integrity' in input ? input.integrity : '')
    // Electron's HTTP stack follows system proxy configuration. Other schemes and
    // integrity-checked fetches retain Node semantics; net.fetch ignores integrity.
    return ['http:', 'https:'].includes(protocol ?? '') && !integrity
      ? nativeFetch(input, { ...init, credentials: init?.credentials ?? 'omit' })
      : originalFetch(input, init)
  }
}
