import type { AlicizationPersonaTrainingArtifact } from '@proj-alicization/stage-shared'

import { chmod, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import {
  createMlxPersonaRuntime,
  normalizeAlicizationPersonaRuntimeConfig,
} from './mlx-persona-runtime'

const runtimes: Array<ReturnType<typeof createMlxPersonaRuntime>> = []

function createArtifact(input: {
  path: string
  baseModel: string
  format?: AlicizationPersonaTrainingArtifact['format']
}): AlicizationPersonaTrainingArtifact {
  return {
    schemaVersion: 'alicization-persona-training-artifact-v1',
    artifactId: 'artifact-mlx-1',
    runId: 'run-mlx-1',
    kind: 'lora-adapter',
    path: input.path,
    sha256: 'b'.repeat(64),
    sizeBytes: 16,
    baseModel: input.baseModel,
    format: input.format ?? 'mlx-safetensors',
    producerBackend: 'mlx-lm',
    loaderTarget: 'mlx-runtime',
    compatibility: {
      status: 'compatible',
      baseModel: input.baseModel,
    },
    activation: {
      status: 'inactive',
      reason: 'test artifact',
    },
  }
}

async function createFakeMlxServer(root: string, options?: {
  chatLogPath?: string
  launchLogPath?: string
  modelIds?: string[]
}) {
  const executable = join(root, 'mlx_lm_server.mjs')
  await writeFile(executable, `#!/usr/bin/env node
import { appendFile } from 'node:fs/promises'
import { createServer } from 'node:http'

const args = process.argv.slice(2)
const port = Number(args[args.indexOf('--port') + 1])
const modelPath = args[args.indexOf('--model') + 1]
const adapterPath = args[args.indexOf('--adapter-path') + 1]
${options?.launchLogPath ? `await appendFile(${JSON.stringify(options.launchLogPath)}, JSON.stringify({ modelPath, adapterPath }) + '\\n')` : ''}
const server = createServer(async (request, response) => {
  if (request.url === '/v1/models' && request.method === 'GET') {
    response.writeHead(200, { 'Content-Type': 'application/json' })
    response.end(JSON.stringify({ data: ${JSON.stringify(options?.modelIds ?? [])}.length ? ${JSON.stringify(options?.modelIds ?? [])}.map(id => ({ id })) : [{ id: modelPath }] }))
    return
  }
  if (request.url === '/v1/chat/completions' && request.method === 'POST') {
    let body = ''
    for await (const chunk of request)
      body += String(chunk)
    ${options?.chatLogPath ? `await appendFile(${JSON.stringify(options.chatLogPath)}, body + '\\n')` : ''}
    response.writeHead(200, { 'Content-Type': 'application/json' })
    response.end(JSON.stringify({
      choices: [{ message: { role: 'assistant', content: '来自 MLX Persona 的回复' }, finish_reason: 'stop' }],
    }))
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
  await Promise.all(runtimes.splice(0).map(runtime => runtime.dispose()))
})

describe('mlx Persona runtime', () => {
  it('normalizes an explicit MLX runtime configuration', () => {
    expect(normalizeAlicizationPersonaRuntimeConfig({
      backend: 'mlx-runtime',
      executable: '/opt/mlx_lm.server',
      modelPath: '/models/mlx-base',
      host: '127.0.0.1',
      port: 18_284,
      modelAlias: 'alice-mlx',
      startupTimeoutMs: 5_000,
    })).toEqual({
      backend: 'mlx-runtime',
      executable: '/opt/mlx_lm.server',
      modelPath: '/models/mlx-base',
      host: '127.0.0.1',
      port: 18_284,
      modelAlias: 'alice-mlx',
      startupTimeoutMs: 5_000,
    })
  })

  it('starts mlx_lm.server with the adapter directory and exposes an OpenAI-compatible route', async () => {
    const root = await mkdtemp(join(tmpdir(), 'alicization-mlx-runtime-'))
    const modelPath = join(root, 'base-model')
    const adapterPath = join(root, 'adapter', 'adapters.safetensors')
    const adapterConfigPath = join(root, 'adapter', 'adapter_config.json')
    const launchLogPath = join(root, 'launch.jsonl')
    await mkdir(modelPath)
    await mkdir(join(root, 'adapter'))
    await writeFile(adapterPath, 'mlx-adapter')
    await writeFile(adapterConfigPath, JSON.stringify({ lora_layers: 8 }))
    const executable = await createFakeMlxServer(root, { launchLogPath })

    const runtime = createMlxPersonaRuntime({
      getConfig: () => ({
        backend: 'mlx-runtime',
        executable,
        modelPath,
        host: '127.0.0.1',
        port: 18_284,
        modelAlias: 'alice-mlx',
        startupTimeoutMs: 5_000,
      }),
    })
    runtimes.push(runtime)

    const artifact = createArtifact({ path: adapterPath, baseModel: modelPath })
    const receipt = await runtime.loader.load({
      cardId: 'card-a',
      artifact,
      signal: new AbortController().signal,
      operationId: 'load-mlx-1',
    })

    expect(receipt.loaderId).toBe('mlx-runtime')
    expect(runtime.getRoute()).toEqual({
      providerId: 'mlx-persona',
      model: modelPath,
      baseUrl: 'http://127.0.0.1:18284/v1/',
    })
    expect(runtime.getSnapshot().active).toBe(true)
    expect(await import('node:fs/promises').then(fs => fs.readFile(launchLogPath, 'utf8'))).toContain(
      JSON.stringify({ modelPath, adapterPath: join(root, 'adapter') }),
    )

    await runtime.loader.unload({
      cardId: 'card-a',
      artifact,
      operationId: 'unload-mlx-1',
      reason: 'test',
    })

    expect(runtime.getRoute()).toBeNull()
    expect(runtime.getSnapshot().active).toBe(false)
    await rm(root, { recursive: true, force: true })
  })

  it('selects the configured MLX model when the server reports multiple cached models', async () => {
    const root = await mkdtemp(join(tmpdir(), 'alicization-mlx-runtime-'))
    const modelPath = join(root, 'base-model')
    const adapterDir = join(root, 'adapter')
    const adapterPath = join(adapterDir, 'adapters.safetensors')
    const chatLogPath = join(root, 'chat.jsonl')
    await mkdir(modelPath)
    await mkdir(adapterDir)
    await writeFile(adapterPath, 'mlx-adapter')
    await writeFile(join(adapterDir, 'adapter_config.json'), JSON.stringify({ lora_layers: 8 }))
    const executable = await createFakeMlxServer(root, {
      chatLogPath,
      modelIds: ['/models/unrelated-cached-model', modelPath],
    })
    const runtime = createMlxPersonaRuntime({
      getConfig: () => ({
        backend: 'mlx-runtime',
        executable,
        modelPath,
        host: '127.0.0.1',
        port: 18_288,
        modelAlias: 'alice-mlx',
        startupTimeoutMs: 5_000,
      }),
    })
    runtimes.push(runtime)

    await runtime.loader.load({
      cardId: 'card-a',
      artifact: createArtifact({ path: adapterPath, baseModel: modelPath }),
      signal: new AbortController().signal,
      operationId: 'load-mlx-multiple-models',
    })

    expect(runtime.getRoute()?.model).toBe(modelPath)
    const chatRequests = (await import('node:fs/promises').then(fs => fs.readFile(chatLogPath, 'utf8')))
      .trim()
      .split('\n')
      .map(line => JSON.parse(line) as { model?: string })
    expect(chatRequests.at(-1)?.model).toBe(modelPath)
    await rm(root, { recursive: true, force: true })
  })

  it('rejects a single server model that does not match the configured MLX base model', async () => {
    const root = await mkdtemp(join(tmpdir(), 'alicization-mlx-runtime-'))
    const modelPath = join(root, 'base-model')
    const adapterDir = join(root, 'adapter')
    const adapterPath = join(adapterDir, 'adapters.safetensors')
    await mkdir(modelPath)
    await mkdir(adapterDir)
    await writeFile(adapterPath, 'mlx-adapter')
    await writeFile(join(adapterDir, 'adapter_config.json'), JSON.stringify({ lora_layers: 8 }))
    const executable = await createFakeMlxServer(root, {
      modelIds: ['/models/unrelated-cached-model'],
    })
    const runtime = createMlxPersonaRuntime({
      getConfig: () => ({
        backend: 'mlx-runtime',
        executable,
        modelPath,
        host: '127.0.0.1',
        port: 18_289,
        modelAlias: 'alice-mlx',
        startupTimeoutMs: 5_000,
      }),
      probeRequestTimeoutMs: 100,
      processTerminationTimeoutMs: 100,
    })
    runtimes.push(runtime)

    await expect(runtime.loader.load({
      cardId: 'card-a',
      artifact: createArtifact({ path: adapterPath, baseModel: modelPath }),
      signal: new AbortController().signal,
      operationId: 'load-mlx-wrong-model',
    })).rejects.toThrow('none matched configured model')
    expect(runtime.getSnapshot().active).toBe(false)
    await rm(root, { recursive: true, force: true })
  })

  it('rejects non-MLX artifacts and missing adapter metadata', async () => {
    const root = await mkdtemp(join(tmpdir(), 'alicization-mlx-runtime-'))
    const modelPath = join(root, 'base-model')
    const artifactPath = join(root, 'adapters.safetensors')
    await mkdir(modelPath)
    await writeFile(artifactPath, 'mlx-adapter')
    const executable = await createFakeMlxServer(root)
    const runtime = createMlxPersonaRuntime({
      getConfig: () => ({
        backend: 'mlx-runtime',
        executable,
        modelPath,
        host: '127.0.0.1',
        port: 18_285,
        modelAlias: 'alice-mlx',
        startupTimeoutMs: 5_000,
      }),
    })
    runtimes.push(runtime)

    await expect(runtime.loader.load({
      cardId: 'card-a',
      artifact: createArtifact({
        path: artifactPath,
        baseModel: modelPath,
        format: 'gguf',
      }),
      signal: new AbortController().signal,
      operationId: 'load-mlx-invalid-format',
    })).rejects.toThrow('MLX Persona adapter requires an MLX safetensors artifact')

    await expect(runtime.loader.load({
      cardId: 'card-a',
      artifact: createArtifact({
        path: artifactPath,
        baseModel: modelPath,
      }),
      signal: new AbortController().signal,
      operationId: 'load-mlx-missing-config',
    })).rejects.toThrow('adapter_config.json')

    await rm(root, { recursive: true, force: true })
  })

  it('reports an invalid MLX model file during a real connection test', async () => {
    const root = await mkdtemp(join(tmpdir(), 'alicization-mlx-runtime-'))
    const modelPath = join(root, 'base-model.gguf')
    const executable = await createFakeMlxServer(root)
    await writeFile(modelPath, 'not-a-directory')
    const runtime = createMlxPersonaRuntime()
    runtimes.push(runtime)

    const result = await runtime.testConnection({
      backend: 'mlx-runtime',
      executable,
      modelPath,
      host: '127.0.0.1',
      port: 18_286,
      modelAlias: 'alice-mlx',
      startupTimeoutMs: 5_000,
    })

    expect(result.ok).toBe(false)
    expect(result.error).toContain('readable model directory')
    await rm(root, { recursive: true, force: true })
  })

  it('switches adapters and recovers an interrupted server on the next runtime instance', async () => {
    const root = await mkdtemp(join(tmpdir(), 'alicization-mlx-runtime-'))
    const modelPath = join(root, 'base-model')
    const adapterOneDir = join(root, 'adapter-one')
    const adapterTwoDir = join(root, 'adapter-two')
    const processStatePath = join(root, 'persona-runtime-process.json')
    await mkdir(modelPath)
    await mkdir(adapterOneDir)
    await mkdir(adapterTwoDir)
    const adapterOnePath = join(adapterOneDir, 'adapters.safetensors')
    const adapterTwoPath = join(adapterTwoDir, 'adapters.safetensors')
    await writeFile(adapterOnePath, 'adapter-one')
    await writeFile(adapterTwoPath, 'adapter-two')
    await writeFile(join(adapterOneDir, 'adapter_config.json'), JSON.stringify({ lora_layers: 8 }))
    await writeFile(join(adapterTwoDir, 'adapter_config.json'), JSON.stringify({ lora_layers: 8 }))
    const executable = await createFakeMlxServer(root)
    const config = {
      backend: 'mlx-runtime' as const,
      executable,
      modelPath,
      host: '127.0.0.1',
      port: 18_287,
      modelAlias: 'alice-mlx',
      startupTimeoutMs: 5_000,
    }
    const artifactOne = createArtifact({ path: adapterOnePath, baseModel: modelPath })
    const artifactTwo = {
      ...createArtifact({ path: adapterTwoPath, baseModel: modelPath }),
      artifactId: 'artifact-mlx-2',
    }
    const firstRuntime = createMlxPersonaRuntime({
      getConfig: () => config,
      processStatePath,
    })
    runtimes.push(firstRuntime)
    await firstRuntime.loader.load({
      cardId: 'card-a',
      artifact: artifactOne,
      signal: new AbortController().signal,
      operationId: 'load-mlx-one',
    })
    expect(firstRuntime.getSnapshot().artifactId).toBe('artifact-mlx-1')

    await firstRuntime.loader.load({
      cardId: 'card-a',
      artifact: artifactTwo,
      signal: new AbortController().signal,
      operationId: 'load-mlx-two',
    })
    expect(firstRuntime.getSnapshot().artifactId).toBe('artifact-mlx-2')

    const restartedRuntime = createMlxPersonaRuntime({
      getConfig: () => config,
      processStatePath,
    })
    runtimes.push(restartedRuntime)
    await restartedRuntime.loader.load({
      cardId: 'card-a',
      artifact: artifactOne,
      signal: new AbortController().signal,
      operationId: 'restart-load-mlx-one',
    })
    expect(restartedRuntime.getSnapshot().artifactId).toBe('artifact-mlx-1')
    expect(restartedRuntime.getRoute()?.providerId).toBe('mlx-persona')

    await rm(root, { recursive: true, force: true })
  })
})
