import type { AlicizationPersonaTrainingArtifact } from '@proj-alicization/stage-shared'

import { chmod, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  createLlamaCppPersonaRuntime,
  normalizeAlicizationPersonaRuntimeConfig,
} from './llama-cpp-persona-runtime'

const { llamaServerSpawnCalls } = vi.hoisted(() => ({
  llamaServerSpawnCalls: [] as Array<{
    command: string
    args: string[]
  }>,
}))

vi.mock('node:child_process', async () => {
  const actual = await vi.importActual<typeof import('node:child_process')>('node:child_process')
  return {
    ...actual,
    spawn: vi.fn((command: string, args: readonly string[] = [], options?: object) => {
      if (command.endsWith('/llama-server')) {
        llamaServerSpawnCalls.push({
          command,
          args: [...args],
        })
      }
      return actual.spawn(command, args, options as Parameters<typeof actual.spawn>[2])
    }),
  }
})

const runtimes: Array<ReturnType<typeof createLlamaCppPersonaRuntime>> = []

function createArtifact(input: {
  path: string
  baseModel: string
}): AlicizationPersonaTrainingArtifact {
  return {
    schemaVersion: 'alicization-persona-training-artifact-v1',
    artifactId: 'artifact-llama-1',
    runId: 'run-llama-1',
    kind: 'lora-adapter',
    path: input.path,
    sha256: 'a'.repeat(64),
    sizeBytes: 16,
    baseModel: input.baseModel,
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

async function createFakeLlamaServer(root: string, launchLogPath?: string) {
  const executable = join(root, 'llama-server')
  await writeFile(executable, `#!/usr/bin/env node
import { createServer } from 'node:http'
import { appendFile } from 'node:fs/promises'

const args = process.argv.slice(2)
const port = Number(args[args.indexOf('--port') + 1])
const loraIndex = args.indexOf('--lora')
const adapterPath = loraIndex >= 0 ? args[loraIndex + 1] : ''
${launchLogPath ? `await appendFile(${JSON.stringify(launchLogPath)}, 'launch\\n')` : ''}
const server = createServer((request, response) => {
  if (request.url === '/health') {
    response.writeHead(200, { 'Content-Type': 'application/json' })
    response.end(JSON.stringify({ status: 'ok' }))
    return
  }
  if (request.url === '/lora-adapters' && request.method === 'GET') {
    response.writeHead(200, { 'Content-Type': 'application/json' })
    response.end(JSON.stringify([{ id: 7, path: adapterPath, scale: 0 }]))
    return
  }
  if (request.url === '/lora-adapters' && request.method === 'POST') {
    let body = ''
    request.on('data', chunk => body += String(chunk))
    request.on('end', () => {
      const adapters = JSON.parse(body)
      if (adapters[0]?.id !== 7) {
        response.writeHead(400, { 'Content-Type': 'application/json' })
        response.end(JSON.stringify({ error: 'wrong adapter id' }))
        return
      }
      response.writeHead(200, { 'Content-Type': 'application/json' })
      response.end(JSON.stringify([{ id: 7, path: adapterPath, scale: 1 }]))
    })
    return
  }
  if (request.url === '/v1/chat/completions') {
    response.writeHead(200, { 'Content-Type': 'application/json' })
    response.end(JSON.stringify({
      choices: [{ message: { role: 'assistant', content: '来自 Persona adapter 的回复' }, finish_reason: 'stop' }],
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

async function createRejectingLlamaServer(root: string) {
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
    response.end(JSON.stringify([{ id: 7, path: adapterPath, scale: 0 }]))
    return
  }
  if (request.url === '/lora-adapters' && request.method === 'POST') {
    response.writeHead(400, { 'Content-Type': 'application/json' })
    response.end(JSON.stringify({ code: 20015, message: 'invalid adapter' }))
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

async function createSelfExitingLlamaServer(root: string) {
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
    response.end(JSON.stringify([{ id: 7, path: adapterPath, scale: 0 }]))
    return
  }
  if (request.url === '/lora-adapters' && request.method === 'POST') {
    response.writeHead(200, { 'Content-Type': 'application/json' })
    response.end(JSON.stringify([{ id: 7, path: adapterPath, scale: 1 }]))
    setTimeout(() => process.exit(23), 100)
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

async function createHangingHealthLlamaServer(root: string) {
  const executable = join(root, 'llama-server')
  await writeFile(executable, `#!/usr/bin/env node
import { createServer } from 'node:http'

const args = process.argv.slice(2)
const port = Number(args[args.indexOf('--port') + 1])
const server = createServer((request, response) => {
  if (request.url === '/health')
    return
  response.writeHead(404)
  response.end()
})

server.listen(port, '127.0.0.1')
process.on('SIGTERM', () => server.close(() => process.exit(0)))
`)
  await chmod(executable, 0o755)
  return executable
}

async function createHangingChatLlamaServer(root: string) {
  const executable = join(root, 'llama-server')
  await writeFile(executable, `#!/usr/bin/env node
import { createServer } from 'node:http'

const args = process.argv.slice(2)
const port = Number(args[args.indexOf('--port') + 1])
const server = createServer((request, response) => {
  if (request.url === '/health') {
    response.writeHead(200, { 'Content-Type': 'application/json' })
    response.end(JSON.stringify({ status: 'ok' }))
    return
  }
  if (request.url === '/v1/chat/completions')
    response.writeHead(200, { 'Content-Type': 'application/json' })
    return
  response.writeHead(404)
  response.end()
})

server.listen(port, '127.0.0.1')
process.on('SIGTERM', () => server.close(() => process.exit(0)))
`)
  await chmod(executable, 0o755)
  return executable
}

async function createHangingAdapterLlamaServer(root: string) {
  const executable = join(root, 'llama-server')
  await writeFile(executable, `#!/usr/bin/env node
import { createServer } from 'node:http'

const args = process.argv.slice(2)
const port = Number(args[args.indexOf('--port') + 1])
const server = createServer((request, response) => {
  if (request.url === '/health') {
    response.writeHead(200, { 'Content-Type': 'application/json' })
    response.end(JSON.stringify({ status: 'ok' }))
    return
  }
  if (request.url === '/lora-adapters')
    response.writeHead(200, { 'Content-Type': 'application/json' })
    return
  response.writeHead(404)
  response.end()
})

server.listen(port, '127.0.0.1')
process.on('SIGTERM', () => server.close(() => process.exit(0)))
`)
  await chmod(executable, 0o755)
  return executable
}

async function createSigtermIgnoringLlamaServer(root: string) {
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
    response.end(JSON.stringify([{ id: 7, path: adapterPath, scale: 0 }]))
    return
  }
  if (request.url === '/lora-adapters' && request.method === 'POST') {
    response.writeHead(200, { 'Content-Type': 'application/json' })
    response.end(JSON.stringify([{ id: 7, path: adapterPath, scale: 1 }]))
    return
  }
  if (request.url === '/v1/chat/completions') {
    response.writeHead(200, { 'Content-Type': 'application/json' })
    response.end(JSON.stringify({
      choices: [{ message: { role: 'assistant', content: '仍在运行' } }],
    }))
    return
  }
  response.writeHead(404)
  response.end()
})

server.listen(port, '127.0.0.1')
process.on('SIGTERM', () => {})
`)
  await chmod(executable, 0o755)
  return executable
}

afterEach(async () => {
  await Promise.all(runtimes.splice(0).map(runtime => runtime.dispose()))
  llamaServerSpawnCalls.splice(0)
})

describe('llama.cpp Persona runtime', () => {
  it('normalizes a local llama-server configuration', () => {
    expect(normalizeAlicizationPersonaRuntimeConfig({
      executable: '/opt/llama-server',
      modelPath: '/models/base.gguf',
      host: '127.0.0.1',
      port: 18_181,
      modelAlias: 'alice',
      startupTimeoutMs: 5_000,
    })).toEqual({
      executable: '/opt/llama-server',
      modelPath: '/models/base.gguf',
      host: '127.0.0.1',
      port: 18_181,
      modelAlias: 'alice',
      startupTimeoutMs: 5_000,
    })
  })

  it('starts llama-server, applies the adapter, exposes a local chat route, and unloads it', async () => {
    const root = await mkdtemp(join(tmpdir(), 'alicization-llama-runtime-'))
    const modelPath = join(root, 'base.gguf')
    const artifactPath = join(root, 'persona.gguf')
    await writeFile(modelPath, 'base-model')
    await writeFile(artifactPath, 'persona-adapter')
    const executable = await createFakeLlamaServer(root)
    const runtime = createLlamaCppPersonaRuntime({
      getConfig: () => ({
        executable,
        modelPath,
        host: '127.0.0.1',
        port: 18_283,
        modelAlias: 'alice-persona',
        startupTimeoutMs: 5_000,
      }),
    })
    runtimes.push(runtime)

    const artifact = createArtifact({ path: artifactPath, baseModel: modelPath })
    const receipt = await runtime.loader.load({
      cardId: 'card-a',
      artifact,
      signal: new AbortController().signal,
      operationId: 'load-operation-1',
    })

    expect(receipt.loaderId).toBe('llama.cpp')
    expect(runtime.getRoute()).toEqual({
      providerId: 'llama.cpp-persona',
      model: 'alice-persona',
      baseUrl: 'http://127.0.0.1:18283/v1/',
    })
    expect(runtime.getSnapshot().active).toBe(true)

    await runtime.loader.unload({
      cardId: 'card-a',
      artifact,
      operationId: 'unload-operation-1',
      reason: 'test',
    })

    expect(runtime.getRoute()).toBeNull()
    expect(runtime.getSnapshot().active).toBe(false)
    await rm(root, { recursive: true, force: true })
  })

  it('reuses the active local Persona server when testing the same runtime configuration', async () => {
    llamaServerSpawnCalls.length = 0
    const root = await mkdtemp(join(tmpdir(), 'alicization-llama-runtime-'))
    const modelPath = join(root, 'base.gguf')
    const artifactPath = join(root, 'persona.gguf')
    await writeFile(modelPath, 'base-model')
    await writeFile(artifactPath, 'persona-adapter')
    const launchLogPath = join(root, 'launches.log')
    const executable = await createFakeLlamaServer(root, launchLogPath)
    const config = {
      executable,
      modelPath,
      host: '127.0.0.1',
      port: 18_296,
      modelAlias: 'alice-persona',
      startupTimeoutMs: 2_000,
    }
    const runtime = createLlamaCppPersonaRuntime({
      getConfig: () => config,
    })
    runtimes.push(runtime)
    const artifact = createArtifact({ path: artifactPath, baseModel: modelPath })
    await runtime.loader.load({
      cardId: 'card-a',
      artifact,
      signal: new AbortController().signal,
      operationId: 'load-operation-test-active-runtime',
    })

    await expect(runtime.testConnection(config)).resolves.toEqual({
      ok: true,
      executable,
      baseUrl: 'http://127.0.0.1:18296/v1/',
      error: null,
    })
    expect(llamaServerSpawnCalls).toHaveLength(1)
    expect(llamaServerSpawnCalls[0]?.args).toContain('--lora')
    expect((await readFile(launchLogPath, 'utf8')).trim().split('\n')).toHaveLength(1)
    expect(runtime.getSnapshot()).toMatchObject({
      active: true,
      artifactId: artifact.artifactId,
    })
    await rm(root, { recursive: true, force: true })
  })

  it('times out a health request that never returns and cleans up the probe process', async () => {
    const root = await mkdtemp(join(tmpdir(), 'alicization-llama-runtime-'))
    const modelPath = join(root, 'base.gguf')
    await writeFile(modelPath, 'base-model')
    const executable = await createHangingHealthLlamaServer(root)
    const runtime = createLlamaCppPersonaRuntime({
      processTerminationTimeoutMs: 100,
    })
    runtimes.push(runtime)

    const result = await runtime.testConnection({
      executable,
      modelPath,
      host: '127.0.0.1',
      port: 18_297,
      modelAlias: 'alice-persona',
      startupTimeoutMs: 1_000,
    })

    expect(result.ok).toBe(false)
    expect(result.error).toContain('health request timed out')
    expect(llamaServerSpawnCalls).toHaveLength(1)
    await rm(root, { recursive: true, force: true })
  })

  it('preserves a startup health request timeout instead of masking it as a generic startup failure', async () => {
    const root = await mkdtemp(join(tmpdir(), 'alicization-llama-runtime-'))
    const modelPath = join(root, 'base.gguf')
    const artifactPath = join(root, 'persona.gguf')
    await writeFile(modelPath, 'base-model')
    await writeFile(artifactPath, 'persona-adapter')
    const executable = await createHangingHealthLlamaServer(root)
    const runtime = createLlamaCppPersonaRuntime({
      getConfig: () => ({
        executable,
        modelPath,
        host: '127.0.0.1',
        port: 18_301,
        modelAlias: 'alice-persona',
        startupTimeoutMs: 500,
      }),
      probeRequestTimeoutMs: 100,
      processTerminationTimeoutMs: 100,
    })
    runtimes.push(runtime)

    await expect(runtime.loader.load({
      cardId: 'card-a',
      artifact: createArtifact({ path: artifactPath, baseModel: modelPath }),
      signal: new AbortController().signal,
      operationId: 'load-operation-hanging-health',
    })).rejects.toThrow('health request timed out')
    expect(runtime.getSnapshot().error).toContain('health request timed out')
    await rm(root, { recursive: true, force: true })
  })

  it('times out a chat probe that never returns and cleans up the probe process', async () => {
    const root = await mkdtemp(join(tmpdir(), 'alicization-llama-runtime-'))
    const modelPath = join(root, 'base.gguf')
    await writeFile(modelPath, 'base-model')
    const executable = await createHangingChatLlamaServer(root)
    const runtime = createLlamaCppPersonaRuntime({
      processTerminationTimeoutMs: 100,
    })
    runtimes.push(runtime)

    const result = await runtime.testConnection({
      executable,
      modelPath,
      host: '127.0.0.1',
      port: 18_298,
      modelAlias: 'alice-persona',
      startupTimeoutMs: 1_000,
    })

    expect(result.ok).toBe(false)
    expect(result.error).toContain('chat probe request timed out')
    expect(llamaServerSpawnCalls).toHaveLength(1)
    await rm(root, { recursive: true, force: true })
  })

  it('times out a hanging LoRA adapter request instead of leaving Persona activation pending', async () => {
    const root = await mkdtemp(join(tmpdir(), 'alicization-llama-runtime-'))
    const modelPath = join(root, 'base.gguf')
    const artifactPath = join(root, 'persona.gguf')
    await writeFile(modelPath, 'base-model')
    await writeFile(artifactPath, 'persona-adapter')
    const executable = await createHangingAdapterLlamaServer(root)
    const runtime = createLlamaCppPersonaRuntime({
      getConfig: () => ({
        executable,
        modelPath,
        host: '127.0.0.1',
        port: 18_302,
        modelAlias: 'alice-persona',
        startupTimeoutMs: 1_000,
      }),
      probeRequestTimeoutMs: 100,
      processTerminationTimeoutMs: 100,
    })
    runtimes.push(runtime)

    await expect(runtime.loader.load({
      cardId: 'card-a',
      artifact: createArtifact({ path: artifactPath, baseModel: modelPath }),
      signal: new AbortController().signal,
      operationId: 'load-operation-hanging-adapter',
    })).rejects.toThrow('adapter list request timed out')
    expect(runtime.getSnapshot().error).toContain('adapter list request timed out')
    await rm(root, { recursive: true, force: true })
  })

  it('fails closed for non-GGUF artifacts and mismatched base models', async () => {
    const root = await mkdtemp(join(tmpdir(), 'alicization-llama-runtime-'))
    const modelPath = join(root, 'base.gguf')
    const artifactPath = join(root, 'persona.safetensors')
    await writeFile(modelPath, 'base-model')
    await writeFile(artifactPath, 'persona-adapter')
    const executable = await createFakeLlamaServer(root)
    const runtime = createLlamaCppPersonaRuntime({
      getConfig: () => ({
        executable,
        modelPath,
        host: '127.0.0.1',
        port: 18_284,
        modelAlias: 'alice-persona',
        startupTimeoutMs: 5_000,
      }),
    })
    runtimes.push(runtime)

    await expect(runtime.loader.load({
      cardId: 'card-a',
      artifact: createArtifact({ path: artifactPath, baseModel: '/models/other.gguf' }),
      signal: new AbortController().signal,
      operationId: 'load-operation-unsupported',
    })).rejects.toThrow('requires a GGUF')
    expect(runtime.getRoute()).toBeNull()
  })

  it('exposes the real llama adapter activation error instead of masking it as a timeout', async () => {
    const root = await mkdtemp(join(tmpdir(), 'alicization-llama-runtime-'))
    const modelPath = join(root, 'base.gguf')
    const artifactPath = join(root, 'persona.gguf')
    const executable = join(root, 'llama-server')
    await writeFile(modelPath, 'base-model')
    await writeFile(artifactPath, 'persona-adapter')
    await writeFile(executable, '#!/no/such/llama-server\n')
    await chmod(executable, 0o755)
    const runtime = createLlamaCppPersonaRuntime({
      getConfig: () => ({
        executable,
        modelPath,
        host: '127.0.0.1',
        port: 18_285,
        modelAlias: 'alice-persona',
        startupTimeoutMs: 1_000,
      }),
    })
    runtimes.push(runtime)

    await expect(runtime.loader.load({
      cardId: 'card-a',
      artifact: createArtifact({ path: artifactPath, baseModel: modelPath }),
      signal: new AbortController().signal,
      operationId: 'load-operation-spawn-error',
    })).rejects.toThrow('llama-server failed to start')
    expect(runtime.getSnapshot().error).toContain('llama-server failed to start')
    expect(runtime.getRoute()).toBeNull()
    await rm(root, { recursive: true, force: true })
  })

  it('preserves an HTTP adapter activation failure instead of retrying it into a startup timeout', async () => {
    const root = await mkdtemp(join(tmpdir(), 'alicization-llama-runtime-'))
    const modelPath = join(root, 'base.gguf')
    const artifactPath = join(root, 'persona.gguf')
    await writeFile(modelPath, 'base-model')
    await writeFile(artifactPath, 'persona-adapter')
    const executable = await createRejectingLlamaServer(root)
    const runtime = createLlamaCppPersonaRuntime({
      getConfig: () => ({
        executable,
        modelPath,
        host: '127.0.0.1',
        port: 18_288,
        modelAlias: 'alice-persona',
        startupTimeoutMs: 2_000,
      }),
    })
    runtimes.push(runtime)

    await expect(runtime.loader.load({
      cardId: 'card-a',
      artifact: createArtifact({ path: artifactPath, baseModel: modelPath }),
      signal: new AbortController().signal,
      operationId: 'load-operation-adapter-http-error',
    })).rejects.toThrow('HTTP 400')
    expect(runtime.getSnapshot().error).toContain('HTTP 400')
    expect(runtime.getSnapshot().error).not.toContain('did not become healthy')
    expect(runtime.getRoute()).toBeNull()
    await rm(root, { recursive: true, force: true })
  })

  it('invalidates the route when llama-server exits after activation', async () => {
    const root = await mkdtemp(join(tmpdir(), 'alicization-llama-runtime-'))
    const modelPath = join(root, 'base.gguf')
    const artifactPath = join(root, 'persona.gguf')
    await writeFile(modelPath, 'base-model')
    await writeFile(artifactPath, 'persona-adapter')
    const executable = await createSelfExitingLlamaServer(root)
    const runtime = createLlamaCppPersonaRuntime({
      getConfig: () => ({
        executable,
        modelPath,
        host: '127.0.0.1',
        port: 18_289,
        modelAlias: 'alice-persona',
        startupTimeoutMs: 2_000,
      }),
    })
    runtimes.push(runtime)

    const artifact = createArtifact({ path: artifactPath, baseModel: modelPath })
    await runtime.loader.load({
      cardId: 'card-a',
      artifact,
      signal: new AbortController().signal,
      operationId: 'load-operation-self-exit',
    })
    expect(runtime.getSnapshot().active).toBe(true)

    await new Promise(resolve => setTimeout(resolve, 350))

    expect(runtime.getSnapshot().active).toBe(false)
    expect(runtime.getRoute()).toBeNull()
    expect(runtime.getSnapshot().error).toContain('exited')
    await rm(root, { recursive: true, force: true })
  })

  it('recovers an identity-matched orphaned detached llama-server before reusing its port', async () => {
    const root = await mkdtemp(join(tmpdir(), 'alicization-llama-runtime-'))
    const modelPath = join(root, 'base.gguf')
    const artifactPath = join(root, 'persona.gguf')
    const processStatePath = join(root, 'persona-runtime-process.json')
    await writeFile(modelPath, 'base-model')
    await writeFile(artifactPath, 'persona-adapter')
    const executable = await createFakeLlamaServer(root)
    const config = {
      executable,
      modelPath,
      host: '127.0.0.1',
      port: 18_291,
      modelAlias: 'alice-persona',
      startupTimeoutMs: 2_000,
    }
    const artifact = createArtifact({ path: artifactPath, baseModel: modelPath })
    const runtimeA = createLlamaCppPersonaRuntime({
      getConfig: () => config,
      processStatePath,
    })
    runtimes.push(runtimeA)

    await runtimeA.loader.load({
      cardId: 'card-a',
      artifact,
      signal: new AbortController().signal,
      operationId: 'load-operation-orphan-a',
    })
    const orphanState = JSON.parse(await readFile(processStatePath, 'utf8')) as {
      pid: number
      executable: string
      modelPath: string
      port: number
      artifactId: string
    }
    expect(orphanState).toMatchObject({
      executable,
      modelPath,
      port: config.port,
      artifactId: artifact.artifactId,
    })
    expect(orphanState.pid).toBeGreaterThan(0)

    const runtimeB = createLlamaCppPersonaRuntime({
      getConfig: () => config,
      processStatePath,
    })
    runtimes.push(runtimeB)
    await runtimeB.loader.load({
      cardId: 'card-a',
      artifact,
      signal: new AbortController().signal,
      operationId: 'load-operation-orphan-b',
    })

    expect(runtimeB.getSnapshot().active).toBe(true)
    await runtimeA.dispose()
    expect(runtimeB.getSnapshot().active).toBe(true)
    await rm(root, { recursive: true, force: true })
  })

  it('does not kill a live process when persisted orphan identity does not match', async () => {
    const root = await mkdtemp(join(tmpdir(), 'alicization-llama-runtime-'))
    const modelPath = join(root, 'base.gguf')
    const artifactPath = join(root, 'persona.gguf')
    const processStatePath = join(root, 'persona-runtime-process.json')
    await writeFile(modelPath, 'base-model')
    await writeFile(artifactPath, 'persona-adapter')
    const executable = await createFakeLlamaServer(root)
    const artifact = createArtifact({ path: artifactPath, baseModel: modelPath })
    const runtimeA = createLlamaCppPersonaRuntime({
      getConfig: () => ({
        executable,
        modelPath,
        host: '127.0.0.1',
        port: 18_292,
        modelAlias: 'alice-persona',
        startupTimeoutMs: 2_000,
      }),
      processStatePath,
    })
    runtimes.push(runtimeA)
    await runtimeA.loader.load({
      cardId: 'card-a',
      artifact,
      signal: new AbortController().signal,
      operationId: 'load-operation-mismatch-a',
    })

    const state = JSON.parse(await readFile(processStatePath, 'utf8')) as Record<string, unknown>
    await writeFile(processStatePath, JSON.stringify({
      ...state,
      executable: join(root, 'a-different-llama-server'),
    }))

    const runtimeB = createLlamaCppPersonaRuntime({
      getConfig: () => ({
        executable,
        modelPath,
        host: '127.0.0.1',
        port: 18_293,
        modelAlias: 'alice-persona',
        startupTimeoutMs: 2_000,
      }),
      processStatePath,
    })
    runtimes.push(runtimeB)
    await runtimeB.loader.load({
      cardId: 'card-a',
      artifact,
      signal: new AbortController().signal,
      operationId: 'load-operation-mismatch-b',
    })

    await expect(fetch('http://127.0.0.1:18292/health')).resolves.toMatchObject({
      ok: true,
      status: 200,
    })
    await runtimeA.dispose()
    expect(runtimeB.getSnapshot().active).toBe(true)
    await rm(root, { recursive: true, force: true })
  })

  it('does not let an older runtime clear a newer process state for the same PID', async () => {
    const root = await mkdtemp(join(tmpdir(), 'alicization-llama-runtime-'))
    const modelPath = join(root, 'base.gguf')
    const artifactPath = join(root, 'persona.gguf')
    const processStatePath = join(root, 'persona-runtime-process.json')
    await writeFile(modelPath, 'base-model')
    await writeFile(artifactPath, 'persona-adapter')
    const executable = await createFakeLlamaServer(root)
    const config = {
      executable,
      modelPath,
      host: '127.0.0.1' as const,
      port: 18_299,
      modelAlias: 'alice-persona',
      startupTimeoutMs: 2_000,
    }
    const artifact = createArtifact({ path: artifactPath, baseModel: modelPath })
    const runtime = createLlamaCppPersonaRuntime({
      getConfig: () => config,
      processStatePath,
    })
    runtimes.push(runtime)

    await runtime.loader.load({
      cardId: 'card-a',
      artifact,
      signal: new AbortController().signal,
      operationId: 'load-operation-instance-state',
    })
    const state = JSON.parse(await readFile(processStatePath, 'utf8')) as Record<string, unknown>
    await writeFile(processStatePath, JSON.stringify({
      ...state,
      instanceId: 'new-runtime-instance',
    }))

    await runtime.dispose()

    expect(JSON.parse(await readFile(processStatePath, 'utf8'))).toMatchObject({
      instanceId: 'new-runtime-instance',
    })
    await rm(processStatePath, { force: true })
    await rm(root, { recursive: true, force: true })
  })

  it('uses SIGKILL to recover a detached server that ignores SIGTERM', async () => {
    const root = await mkdtemp(join(tmpdir(), 'alicization-llama-runtime-'))
    const modelPath = join(root, 'base.gguf')
    const artifactPath = join(root, 'persona.gguf')
    const processStatePath = join(root, 'persona-runtime-process.json')
    await writeFile(modelPath, 'base-model')
    await writeFile(artifactPath, 'persona-adapter')
    const executable = await createSigtermIgnoringLlamaServer(root)
    const config = {
      executable,
      modelPath,
      host: '127.0.0.1' as const,
      port: 18_300,
      modelAlias: 'alice-persona',
      startupTimeoutMs: 2_000,
    }
    const artifact = createArtifact({ path: artifactPath, baseModel: modelPath })
    const runtimeA = createLlamaCppPersonaRuntime({
      getConfig: () => config,
      processStatePath,
      processTerminationTimeoutMs: 100,
    })
    runtimes.push(runtimeA)
    await runtimeA.loader.load({
      cardId: 'card-a',
      artifact,
      signal: new AbortController().signal,
      operationId: 'load-operation-sigkill-a',
    })
    const firstState = JSON.parse(await readFile(processStatePath, 'utf8')) as { pid: number }

    const runtimeB = createLlamaCppPersonaRuntime({
      getConfig: () => config,
      processStatePath,
      processTerminationTimeoutMs: 100,
    })
    runtimes.push(runtimeB)
    await runtimeB.loader.load({
      cardId: 'card-a',
      artifact,
      signal: new AbortController().signal,
      operationId: 'load-operation-sigkill-b',
    })
    const secondState = JSON.parse(await readFile(processStatePath, 'utf8')) as { pid: number }

    expect(secondState.pid).not.toBe(firstState.pid)
    expect(runtimeB.getSnapshot().active).toBe(true)
    await runtimeA.dispose()
    expect(runtimeB.getSnapshot().active).toBe(true)
    await rm(root, { recursive: true, force: true })
  })

  it('tests model loading and one real chat completion instead of only checking --version', async () => {
    const root = await mkdtemp(join(tmpdir(), 'alicization-llama-runtime-'))
    const modelPath = join(root, 'base.gguf')
    await writeFile(modelPath, 'base-model')
    const executable = await createFakeLlamaServer(root)
    const runtime = createLlamaCppPersonaRuntime()
    runtimes.push(runtime)

    await expect(runtime.testConnection({
      executable,
      modelPath,
      host: '127.0.0.1',
      port: 18_290,
      modelAlias: 'alice-persona',
      startupTimeoutMs: 2_000,
    })).resolves.toEqual({
      ok: true,
      executable,
      baseUrl: 'http://127.0.0.1:18290/v1/',
      error: null,
    })
    await rm(root, { recursive: true, force: true })
  })

  it('reloads the active adapter when the runtime configuration changes', async () => {
    const root = await mkdtemp(join(tmpdir(), 'alicization-llama-runtime-'))
    const modelPath = join(root, 'base.gguf')
    const artifactPath = join(root, 'persona.gguf')
    await writeFile(modelPath, 'base-model')
    await writeFile(artifactPath, 'persona-adapter')
    const executable = await createFakeLlamaServer(root)
    const runtime = createLlamaCppPersonaRuntime({
      getConfig: () => ({
        executable,
        modelPath,
        host: '127.0.0.1',
        port: 18_286,
        modelAlias: 'alice-persona',
        startupTimeoutMs: 5_000,
      }),
    })
    runtimes.push(runtime)
    const artifact = createArtifact({ path: artifactPath, baseModel: modelPath })

    await runtime.loader.load({
      cardId: 'card-a',
      artifact,
      signal: new AbortController().signal,
      operationId: 'load-operation-before-config-change',
    })
    const snapshot = await runtime.setConfig({
      executable,
      modelPath,
      host: '127.0.0.1',
      port: 18_287,
      modelAlias: 'alice-persona-reloaded',
      startupTimeoutMs: 5_000,
    })

    expect(snapshot.active).toBe(true)
    expect(snapshot.artifactId).toBe(artifact.artifactId)
    expect(snapshot.routeBaseUrl).toBe('http://127.0.0.1:18287/v1/')
    await rm(root, { recursive: true, force: true })
  })
})
