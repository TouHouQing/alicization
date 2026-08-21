import type { IncomingMessage, ServerResponse } from 'node:http'
import type { AddressInfo } from 'node:net'

import type { AlicizationPersonaTrainingArtifact } from '@proj-alicization/stage-shared'

import { chmod, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { generateText } from '@xsai/generate-text'
import { streamText } from '@xsai/stream-text'
import { afterEach, describe, expect, it } from 'vitest'

import { createLlamaCppPersonaRuntime } from './llama-cpp-persona-runtime'
import { runAlicizationMainChatProviderStep } from './main-chat-stream-runner'
import { createAlicizationMainGatewayConfigRuntime } from './runtime-main-gateway-config'
import { createCanonicalToolRegistry } from './turn-os/tool-registry'

const servers: ReturnType<typeof createServer>[] = []
const runtimes: Array<ReturnType<typeof createLlamaCppPersonaRuntime>> = []

function writeJson(response: ServerResponse, payload: unknown) {
  response.writeHead(200, { 'Content-Type': 'application/json' })
  response.end(JSON.stringify(payload))
}

async function readRequestBody(request: IncomingMessage) {
  let body = ''
  for await (const chunk of request)
    body += String(chunk)
  return body
}

async function startFakePersonaServer() {
  const requests: Array<{ url: string, body: string }> = []
  const server = createServer(async (request, response) => {
    const body = await readRequestBody(request)
    requests.push({
      url: request.url ?? '',
      body,
    })
    if (request.url !== '/v1/chat/completions') {
      response.writeHead(404)
      response.end()
      return
    }

    const parsed = JSON.parse(body) as { stream?: boolean }
    if (parsed.stream) {
      response.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'connection': 'keep-alive',
      })
      response.write(`data: ${JSON.stringify({ choices: [{ delta: { content: '本地' } }] })}\n\n`)
      response.write(`data: ${JSON.stringify({ choices: [{ delta: { content: ' Persona 回复' } }] })}\n\n`)
      response.write(`data: ${JSON.stringify({
        choices: [{ delta: {}, finish_reason: 'stop' }],
      })}\n\n`)
      response.write('data: [DONE]\n\n')
      response.end()
      return
    }

    writeJson(response, {
      choices: [{
        message: {
          role: 'assistant',
          content: '本地 Persona 回复',
        },
        finish_reason: 'stop',
      }],
    })
  })
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => resolve())
  })
  servers.push(server)
  const address = server.address() as AddressInfo
  return {
    requests,
    baseUrl: `http://127.0.0.1:${address.port}/v1/`,
  }
}

async function createFakeLlamaServerExecutable(root: string) {
  const executable = join(root, 'llama-server')
  await writeFile(executable, `#!/usr/bin/env node
import { createServer } from 'node:http'

const args = process.argv.slice(2)
const port = Number(args[args.indexOf('--port') + 1])
const adapterPath = args[args.indexOf('--lora') + 1]
const server = createServer((request, response) => {
  if (request.url === '/health') {
    response.writeHead(200, { 'Content-Type': 'application/json' })
    response.end(JSON.stringify({ status: 'ok' }))
    return
  }
  if (request.url === '/lora-adapters' && request.method === 'GET') {
    response.writeHead(200, { 'Content-Type': 'application/json' })
    response.end(JSON.stringify([{ id: 11, path: adapterPath, scale: 0 }]))
    return
  }
  if (request.url === '/lora-adapters' && request.method === 'POST') {
    let body = ''
    request.on('data', chunk => body += String(chunk))
    request.on('end', () => {
      const adapters = JSON.parse(body)
      if (adapters[0]?.id !== 11) {
        response.writeHead(400, { 'Content-Type': 'application/json' })
        response.end(JSON.stringify({ error: 'wrong adapter id' }))
        return
      }
      response.writeHead(200, { 'Content-Type': 'application/json' })
      response.end(JSON.stringify([{ id: 11, path: adapterPath, scale: 1 }]))
    })
    return
  }
  if (request.url === '/v1/chat/completions') {
    let body = ''
    request.on('data', chunk => body += String(chunk))
    request.on('end', () => {
      const parsed = JSON.parse(body)
      if (parsed.stream) {
        response.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'connection': 'keep-alive',
        })
        response.write(\`data: \${JSON.stringify({ choices: [{ delta: { content: '真实本地 Persona' } }] })}\\n\\n\`)
        response.write(\`data: \${JSON.stringify({ choices: [{ delta: {}, finish_reason: 'stop' }] })}\\n\\n\`)
        response.write('data: [DONE]\\n\\n')
        response.end()
        return
      }
      response.writeHead(200, { 'Content-Type': 'application/json' })
      response.end(JSON.stringify({
        choices: [{ message: { role: 'assistant', content: '真实本地 Persona' }, finish_reason: 'stop' }],
      }))
    })
    return
  }
  response.writeHead(404)
  response.end()
})

server.listen(port, '127.0.0.1')
process.on('SIGTERM', () => server.close(() => process.exit(0)))
`)
  await chmod(executable, 0o755)
  return executable
}

afterEach(async () => {
  await Promise.all(servers.splice(0).map(server => new Promise<void>(resolve => server.close(() => resolve()))))
  await Promise.all(runtimes.splice(0).map(runtime => runtime.dispose()))
})

describe('persona runtime main chat route', () => {
  it('sends one-shot ordinary dialogue to the active local Persona server', async () => {
    const fake = await startFakePersonaServer()
    const configRuntime = createAlicizationMainGatewayConfigRuntime({
      sanitizeText: (raw: unknown, fallback = '') => typeof raw === 'string' ? raw.trim() : fallback,
      getActiveProviderId: () => 'cloud-provider',
      getActiveModelId: () => 'cloud-model',
      getProviderCredentials: () => ({}),
      getPersonaRuntimeRoute: () => ({
        providerId: 'llama.cpp-persona',
        model: 'alice-persona',
        baseUrl: fake.baseUrl,
      }),
    })
    const config = configRuntime.resolveMainGatewayConfig({ cardId: 'card-a' })
    expect(config).not.toBeNull()

    const result = await generateText({
      ...config!.provider.chat(config!.model),
      messages: [{ role: 'user', content: '你好' }],
    })

    expect(result.text).toBe('本地 Persona 回复')
    expect(fake.requests).toHaveLength(1)
    expect(fake.requests[0]).toMatchObject({
      url: '/v1/chat/completions',
    })
    expect(JSON.parse(fake.requests[0]!.body)).toMatchObject({
      model: 'alice-persona',
    })
  })

  it('streams text from the same local Persona route without falling back to cloud', async () => {
    const fake = await startFakePersonaServer()
    const configRuntime = createAlicizationMainGatewayConfigRuntime({
      sanitizeText: (raw: unknown, fallback = '') => typeof raw === 'string' ? raw.trim() : fallback,
      getActiveProviderId: () => 'cloud-provider',
      getActiveModelId: () => 'cloud-model',
      getProviderCredentials: () => ({}),
      getPersonaRuntimeRoute: () => ({
        providerId: 'llama.cpp-persona',
        model: 'alice-persona',
        baseUrl: fake.baseUrl,
      }),
    })
    const config = configRuntime.resolveMainGatewayConfig({ cardId: 'card-a' })
    expect(config).not.toBeNull()

    const result = streamText({
      ...config!.provider.chat(config!.model),
      messages: [{ role: 'user', content: '讲两句' }],
    })
    const reader = result.textStream.getReader()
    let text = ''
    while (true) {
      const next = await reader.read()
      if (next.done)
        break
      text += next.value
    }

    expect(text).toBe('本地 Persona 回复')
    expect(fake.requests).toHaveLength(1)
    expect(JSON.parse(fake.requests[0]!.body)).toMatchObject({
      model: 'alice-persona',
      stream: true,
    })
  })

  it('routes the complete main-chat provider step through the local Persona stream', async () => {
    const fake = await startFakePersonaServer()
    const configRuntime = createAlicizationMainGatewayConfigRuntime({
      sanitizeText: (raw: unknown, fallback = '') => typeof raw === 'string' ? raw.trim() : fallback,
      getActiveProviderId: () => 'cloud-provider',
      getActiveModelId: () => 'cloud-model',
      getProviderCredentials: () => ({}),
      getPersonaRuntimeRoute: () => ({
        providerId: 'llama.cpp-persona',
        model: 'alice-persona',
        baseUrl: fake.baseUrl,
      }),
    })
    const config = configRuntime.resolveMainGatewayConfig({ cardId: 'card-a' })
    expect(config).not.toBeNull()

    const result = await runAlicizationMainChatProviderStep({
      payload: {
        cardId: 'card-a',
        turnId: 'turn-persona-main-chat',
        providerId: config!.providerId,
        model: config!.model,
        providerConfig: {},
        messages: [{ role: 'user', content: '你好' }],
      },
      prepared: {
        chatConfig: config!.provider.chat(config!.model),
        messages: [{ role: 'user', content: '你好' }],
        tools: [],
        toolChoice: undefined,
        toolRegistry: createCanonicalToolRegistry(),
      } as any,
      messages: [{ role: 'user', content: '你好' }],
      controller: new AbortController(),
      firstEventTimeoutMs: 1_000,
      providerContinuationTimeoutMs: 1_000,
      providerReaderCancelTimeoutMs: 50,
      isRunActive: () => true,
      nonProgressEventTypes: new Set<string>(),
      emitToolCall: () => {},
    })

    expect(result).toMatchObject({
      kind: 'reply',
      finishReason: 'stop',
      fullText: '本地 Persona 回复',
      text: '本地 Persona 回复',
    })
    expect(fake.requests).toHaveLength(1)
    expect(fake.requests[0]).toMatchObject({
      url: '/v1/chat/completions',
    })
    expect(JSON.parse(fake.requests[0]!.body)).toMatchObject({
      model: 'alice-persona',
      stream: true,
    })
  })

  it('routes main chat through a Persona adapter after the real llama loader activates it', async () => {
    const root = await mkdtemp(join(tmpdir(), 'alicization-persona-main-chat-'))
    const modelPath = join(root, 'base.gguf')
    const artifactPath = join(root, 'persona.gguf')
    await writeFile(modelPath, 'base-model')
    await writeFile(artifactPath, 'persona-adapter')
    const executable = await createFakeLlamaServerExecutable(root)
    const runtime = createLlamaCppPersonaRuntime({
      getConfig: () => ({
        executable,
        modelPath,
        host: '127.0.0.1',
        port: 18_290,
        modelAlias: 'alice-persona',
        startupTimeoutMs: 5_000,
      }),
    })
    runtimes.push(runtime)
    const artifact: AlicizationPersonaTrainingArtifact = {
      schemaVersion: 'alicization-persona-training-artifact-v1',
      artifactId: 'artifact-main-chat-e2e',
      runId: 'run-main-chat-e2e',
      kind: 'lora-adapter',
      path: artifactPath,
      sha256: 'b'.repeat(64),
      sizeBytes: 16,
      baseModel: modelPath,
      compatibility: {
        status: 'compatible',
        baseModel: modelPath,
      },
      activation: {
        status: 'inactive',
        reason: 'e2e',
      },
    }

    const receipt = await runtime.loader.load({
      cardId: 'card-a',
      artifact,
      signal: new AbortController().signal,
      operationId: 'main-chat-e2e-load',
    })
    const route = runtime.getRoute()
    expect(receipt.loaderId).toBe('llama.cpp')
    expect(route).not.toBeNull()

    const configRuntime = createAlicizationMainGatewayConfigRuntime({
      sanitizeText: (raw: unknown, fallback = '') => typeof raw === 'string' ? raw.trim() : fallback,
      getActiveProviderId: () => 'cloud-provider',
      getActiveModelId: () => 'cloud-model',
      getProviderCredentials: () => ({}),
      getPersonaRuntimeRoute: () => route,
    })
    const config = configRuntime.resolveMainGatewayConfig({ cardId: 'card-a' })
    expect(config?.providerId).toBe('llama.cpp-persona')

    const result = await runAlicizationMainChatProviderStep({
      payload: {
        cardId: 'card-a',
        turnId: 'turn-main-chat-after-load',
        providerId: config!.providerId,
        model: config!.model,
        providerConfig: {},
        messages: [{ role: 'user', content: '你好' }],
      },
      prepared: {
        chatConfig: config!.provider.chat(config!.model),
        messages: [{ role: 'user', content: '你好' }],
        tools: [],
        toolChoice: undefined,
        toolRegistry: createCanonicalToolRegistry(),
      } as any,
      messages: [{ role: 'user', content: '你好' }],
      controller: new AbortController(),
      firstEventTimeoutMs: 1_000,
      providerContinuationTimeoutMs: 1_000,
      providerReaderCancelTimeoutMs: 50,
      isRunActive: () => true,
      nonProgressEventTypes: new Set<string>(),
      emitToolCall: () => {},
    })

    expect(result).toMatchObject({
      kind: 'reply',
      finishReason: 'stop',
      text: '真实本地 Persona',
    })
    await rm(root, { recursive: true, force: true })
  })
})
