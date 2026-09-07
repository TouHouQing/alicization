import type { IncomingHttpHeaders, IncomingMessage, ServerResponse } from 'node:http'
import type { AddressInfo } from 'node:net'

import { createServer } from 'node:http'

export interface ProviderHttpFaultRequest {
  attempt: number
  body: string
  headers: IncomingHttpHeaders
  method: string
  receivedAt: number
  url: string
}

export interface ProviderHttpFaultResponse {
  body?: string
  headers?: Record<string, string>
  status: number
}

export interface ProviderHttpFaultServer {
  baseUrl: string
  close: () => Promise<void>
  requests: ProviderHttpFaultRequest[]
}

async function readRequestBody(request: IncomingMessage) {
  let body = ''
  for await (const chunk of request)
    body += String(chunk)
  return body
}

function writeResponse(
  response: ServerResponse,
  faultResponse: ProviderHttpFaultResponse,
) {
  response.writeHead(faultResponse.status, faultResponse.headers)
  response.end(faultResponse.body ?? '')
}

export function encodeOpenAICompatibleSse(chunks: unknown[]) {
  return [
    ...chunks.map(chunk => `data: ${JSON.stringify(chunk)}\n\n`),
    'data: [DONE]\n\n',
  ].join('')
}

export async function startProviderHttpFaultServer(input: {
  respond: (
    request: ProviderHttpFaultRequest,
  ) => ProviderHttpFaultResponse | Promise<ProviderHttpFaultResponse>
}): Promise<ProviderHttpFaultServer> {
  const requests: ProviderHttpFaultRequest[] = []
  const server = createServer(async (request, response) => {
    try {
      const recordedRequest: ProviderHttpFaultRequest = {
        attempt: requests.length + 1,
        body: await readRequestBody(request),
        headers: request.headers,
        method: request.method ?? '',
        receivedAt: Date.now(),
        url: request.url ?? '',
      }
      requests.push(recordedRequest)
      writeResponse(response, await input.respond(recordedRequest))
    }
    catch (error) {
      response.writeHead(500, { 'Content-Type': 'application/json' })
      response.end(JSON.stringify({
        error: {
          message: error instanceof Error ? error.message : String(error),
          type: 'fault_server_error',
        },
      }))
    }
  })

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  const address = server.address() as AddressInfo

  return {
    baseUrl: `http://127.0.0.1:${address.port}/v1/`,
    requests,
    close: async () => {
      await new Promise<void>((resolve) => {
        server.close(() => resolve())
        server.closeAllConnections?.()
      })
    },
  }
}
