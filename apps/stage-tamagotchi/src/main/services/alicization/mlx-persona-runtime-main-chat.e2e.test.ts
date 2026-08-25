import type { AlicizationPersonaTrainingArtifact } from '@proj-alicization/stage-shared'

import { chmod, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { runAlicizationMainChatProviderStep } from './main-chat-stream-runner'
import { createMlxPersonaRuntime } from './mlx-persona-runtime'
import { createAlicizationMainGatewayConfigRuntime } from './runtime-main-gateway-config'
import { createCanonicalToolRegistry } from './turn-os/tool-registry'

const roots: string[] = []
const runtimes: Array<ReturnType<typeof createMlxPersonaRuntime>> = []

async function createFakeMlxServer(root: string) {
  const executable = join(root, 'mlx_lm_server.mjs')
  await writeFile(executable, `#!/usr/bin/env node
import { createServer } from 'node:http'

const args = process.argv.slice(2)
const port = Number(args[args.indexOf('--port') + 1])
const server = createServer(async (request, response) => {
  if (request.url === '/v1/models') {
    response.writeHead(200, { 'Content-Type': 'application/json' })
    response.end(JSON.stringify({ data: [{ id: 'alice-mlx' }] }))
    return
  }
  if (request.url !== '/v1/chat/completions') {
    response.writeHead(404)
    response.end()
    return
  }
  let body = ''
  for await (const chunk of request)
    body += String(chunk)
  const parsed = JSON.parse(body)
  if (!parsed.stream) {
    response.writeHead(200, { 'Content-Type': 'application/json' })
    response.end(JSON.stringify({
      choices: [{ message: { role: 'assistant', content: '探针通过' }, finish_reason: 'stop' }],
    }))
    return
  }
  response.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    connection: 'keep-alive',
  })
  response.write(\`data: \${JSON.stringify({ choices: [{ delta: { content: 'MLX Persona' } }] })}\\n\\n\`)
  response.write(\`data: \${JSON.stringify({ choices: [{ delta: { content: ' 主聊天回复' } }] })}\\n\\n\`)
  response.write(\`data: \${JSON.stringify({ choices: [{ delta: {}, finish_reason: 'stop' }] })}\\n\\n\`)
  response.write('data: [DONE]\\n\\n')
  response.end()
})

server.listen(port, '127.0.0.1')
process.on('SIGTERM', () => server.close(() => process.exit(0)))
`)
  await chmod(executable, 0o755)
  return executable
}

afterEach(async () => {
  await Promise.all(runtimes.splice(0).map(runtime => runtime.dispose()))
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })))
})

describe('mlx Persona main-chat E2E', () => {
  it('routes the real provider stream through an activated MLX adapter', async () => {
    const root = await mkdtemp(join(tmpdir(), 'alicization-mlx-main-chat-'))
    roots.push(root)
    const modelPath = join(root, 'base-model')
    const adapterDir = join(root, 'adapter')
    const artifactPath = join(adapterDir, 'adapters.safetensors')
    await mkdir(modelPath)
    await mkdir(adapterDir)
    await writeFile(artifactPath, 'adapter')
    await writeFile(join(adapterDir, 'adapter_config.json'), JSON.stringify({ lora_layers: 8 }))
    const executable = await createFakeMlxServer(root)
    const runtime = createMlxPersonaRuntime({
      getConfig: () => ({
        backend: 'mlx-runtime',
        executable,
        modelPath,
        host: '127.0.0.1',
        port: 18_293,
        modelAlias: 'alice-mlx',
        startupTimeoutMs: 5_000,
      }),
    })
    runtimes.push(runtime)

    const artifact: AlicizationPersonaTrainingArtifact = {
      schemaVersion: 'alicization-persona-training-artifact-v1',
      artifactId: 'artifact-mlx-main-chat-e2e',
      runId: 'run-mlx-main-chat-e2e',
      kind: 'lora-adapter',
      path: artifactPath,
      sha256: 'c'.repeat(64),
      sizeBytes: 7,
      baseModel: modelPath,
      format: 'mlx-safetensors',
      producerBackend: 'mlx-lm',
      loaderTarget: 'mlx-runtime',
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
      cardId: 'card-mlx',
      artifact,
      signal: new AbortController().signal,
      operationId: 'mlx-main-chat-load',
    })
    expect(receipt.loaderId).toBe('mlx-runtime')

    const configRuntime = createAlicizationMainGatewayConfigRuntime({
      sanitizeText: (raw: unknown, fallback = '') => typeof raw === 'string' ? raw.trim() : fallback,
      getActiveProviderId: () => 'cloud-provider',
      getActiveModelId: () => 'cloud-model',
      getProviderCredentials: () => ({}),
      getPersonaRuntimeRoute: () => runtime.getRoute(),
    })
    const config = configRuntime.resolveMainGatewayConfig({ cardId: 'card-mlx' })
    expect(config?.providerId).toBe('mlx-persona')

    const result = await runAlicizationMainChatProviderStep({
      payload: {
        cardId: 'card-mlx',
        turnId: 'turn-mlx-main-chat',
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
      text: 'MLX Persona 主聊天回复',
    })
  }, 10_000)
})
