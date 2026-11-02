import { createHash } from 'node:crypto'

export interface AuthorizedBrowserTarget {
  id: string
  url: string
  title: string
  webSocketDebuggerUrl: string
  origin: string
  fingerprint: string
}

/** Exact numeric loopback addresses avoid DNS changes and remote credentials. */
export function authorizedBrowserEndpoint(raw: string) {
  if (!/^http:\/\/(?:127\.0\.0\.1|\[::1\]):[1-9]\d{0,4}\/?$/u.test(raw))
    throw new Error('AUTHORIZED_BROWSER_LOOPBACK_ENDPOINT_REQUIRED')
  const endpoint = new URL(raw)
  if (!endpoint.port || Number(endpoint.port) > 65535)
    throw new Error('AUTHORIZED_BROWSER_LOOPBACK_ENDPOINT_REQUIRED')
  return endpoint
}

export function authorizedBrowserOrigin(raw: string) {
  const url = new URL(raw)
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.origin === 'null')
    throw new Error('AUTHORIZED_BROWSER_HTTP_ORIGIN_REQUIRED')
  return url.origin
}

export function authorizedBrowserSocket(endpoint: URL, id: string, raw: string) {
  const socket = new URL(raw)
  if (socket.protocol !== 'ws:' || socket.hostname !== endpoint.hostname || socket.port !== endpoint.port || socket.username || socket.password || socket.search || socket.hash || socket.pathname !== `/devtools/page/${id}`)
    throw new Error('AUTHORIZED_BROWSER_PAGE_SOCKET_REQUIRED')
  return socket.href
}

/** Called only by the host's explicit inspect/reconnect control, never a model. */
export async function inspectAuthorizedBrowser(raw: string, signal?: AbortSignal): Promise<AuthorizedBrowserTarget[]> {
  const endpoint = authorizedBrowserEndpoint(raw)
  const response = await fetch(new URL('/json/list', endpoint), { redirect: 'error', credentials: 'omit', signal: AbortSignal.any([AbortSignal.timeout(4000), ...(signal ? [signal] : [])]) })
  if (!response.ok || !response.body)
    throw new Error('AUTHORIZED_BROWSER_INSPECTION_UNAVAILABLE')
  const reader = response.body.getReader()
  const decoder = new TextDecoder('utf-8', { fatal: true })
  let body = ''
  let bytes = 0
  try {
    while (true) {
      const chunk = await reader.read()
      if (chunk.done)
        break
      bytes += chunk.value.byteLength
      if (bytes > 65536)
        throw new Error('AUTHORIZED_BROWSER_INSPECTION_BUDGET')
      body += decoder.decode(chunk.value, { stream: true })
    }
    body += decoder.decode()
  }
  finally { await reader.cancel().catch(() => {}) }
  const records: unknown = JSON.parse(body)
  if (!Array.isArray(records) || records.length > 64)
    throw new Error('AUTHORIZED_BROWSER_TARGET_BUDGET')
  const targets: AuthorizedBrowserTarget[] = []
  for (const record of records) {
    if (!record || typeof record !== 'object' || record.type !== 'page' || typeof record.url !== 'string' || !/^https?:/u.test(record.url))
      continue
    if (typeof record.id !== 'string' || !/^[\w-]{1,128}$/u.test(record.id) || typeof record.title !== 'string' || record.title.length > 4096 || record.url.length > 8192 || typeof record.webSocketDebuggerUrl !== 'string')
      throw new Error('AUTHORIZED_BROWSER_TARGET_INVALID')
    const url = new URL(record.url)
    const origin = authorizedBrowserOrigin(record.url)
    const socket = authorizedBrowserSocket(endpoint, record.id, record.webSocketDebuggerUrl)
    const fingerprint = createHash('sha256').update(JSON.stringify([record.id, url.href, socket])).digest('hex')
    if (targets.some(target => target.id === record.id))
      throw new Error('AUTHORIZED_BROWSER_TARGET_AMBIGUOUS')
    targets.push({ id: record.id, url: url.href, title: record.title, origin, webSocketDebuggerUrl: socket, fingerprint })
  }
  return targets
}

export function publicAuthorizedBrowserTarget(target: AuthorizedBrowserTarget) {
  const url = new URL(target.url)
  return { id: target.id, title: target.title.replace(/[\p{Cc}\p{Cf}]/gu, '').slice(0, 160), origin: target.origin, location: `${url.origin}${url.pathname}`.slice(0, 512) }
}
