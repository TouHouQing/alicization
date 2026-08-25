import { spawn } from 'node:child_process'
import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { performance } from 'node:perf_hooks'

import { describe, expect, it } from 'vitest'

import {
  createPersonaRuntimeLifecycle,
  waitForPersonaRuntimePidExit,
} from './persona-runtime-common'

const testBackend = {
  backend: 'llama.cpp' as const,
  loaderId: 'test-runtime',
  providerId: 'llama.cpp-persona' as const,
  executableLabel: 'test-runtime',
  artifactCheck: async () => {},
  buildArgs: () => [],
  buildConnectionArgs: () => [],
  processMatchesState: () => true,
  probeHealth: async () => 'test-model',
  probeChatCompletion: async () => {},
}

describe('persona runtime process helpers', () => {
  it('returns when a recovered process exits instead of sleeping for the full timeout', async () => {
    const child = spawn(process.execPath, ['-e', 'setTimeout(() => process.exit(0), 50)'], {
      stdio: 'ignore',
    })

    const startedAt = performance.now()
    await waitForPersonaRuntimePidExit(child.pid!, 1_000)
    const elapsedMs = performance.now() - startedAt

    expect(elapsedMs).toBeLessThan(500)
  })

  it('returns structured connection failures when normalization fails', async () => {
    const runtime = createPersonaRuntimeLifecycle({ backend: testBackend })

    await expect(runtime.testConnection({
      executable: '',
      modelPath: '/models/base.gguf',
    } as never)).resolves.toEqual({
      ok: false,
      executable: '',
      baseUrl: null,
      error: 'persona runtime executable is required',
    })
  })

  it('serializes load and unload in lifecycle order', async () => {
    const root = await mkdtemp(join(tmpdir(), 'alicization-persona-runtime-'))
    const modelPath = join(root, 'base.gguf')
    const artifactPath = join(root, 'persona.gguf')
    await writeFile(modelPath, 'base-model')
    await writeFile(artifactPath, 'persona-adapter')

    const runtime = createPersonaRuntimeLifecycle({
      backend: {
        ...testBackend,
        buildArgs: () => ['-e', 'setInterval(() => {}, 1000)'],
        buildConnectionArgs: () => ['-e', 'setInterval(() => {}, 1000)'],
      },
      getConfig: () => ({
        executable: process.execPath,
        modelPath,
        host: '127.0.0.1',
        port: 18_310,
        modelAlias: 'test-model',
        startupTimeoutMs: 1_000,
      }),
      processTerminationTimeoutMs: 50,
    })

    const artifact = {
      schemaVersion: 'alicization-persona-training-artifact-v1' as const,
      artifactId: 'artifact-test',
      runId: 'run-test',
      kind: 'lora-adapter' as const,
      path: artifactPath,
      sha256: 'a'.repeat(64),
      sizeBytes: 16,
      baseModel: modelPath,
      compatibility: {
        status: 'compatible' as const,
        baseModel: modelPath,
      },
      activation: {
        status: 'inactive' as const,
        reason: 'test',
      },
    }
    const loadPromise = runtime.loader.load({
      cardId: 'card-a',
      artifact,
      signal: new AbortController().signal,
      operationId: 'load-operation',
    })
    const unloadPromise = runtime.loader.unload({
      cardId: 'card-a',
      artifact,
      operationId: 'unload-operation',
      reason: 'test',
    })

    await loadPromise
    await unloadPromise

    expect(runtime.getSnapshot().active).toBe(false)
    await runtime.dispose()
  })

  it('does not let an older unload receipt stop a reloaded runtime', async () => {
    const root = await mkdtemp(join(tmpdir(), 'alicization-persona-runtime-'))
    const modelPath = join(root, 'base.gguf')
    const artifactPath = join(root, 'persona.gguf')
    await writeFile(modelPath, 'base-model')
    await writeFile(artifactPath, 'persona-adapter')

    const initialConfig = {
      executable: process.execPath,
      modelPath,
      host: '127.0.0.1' as const,
      port: 18_311,
      modelAlias: 'test-model',
      startupTimeoutMs: 1_000,
    }
    const runtime = createPersonaRuntimeLifecycle({
      backend: {
        ...testBackend,
        buildArgs: () => ['-e', 'setInterval(() => {}, 1000)'],
      },
      getConfig: () => initialConfig,
      processTerminationTimeoutMs: 50,
    })

    const artifact = {
      schemaVersion: 'alicization-persona-training-artifact-v1' as const,
      artifactId: 'artifact-receipt-test',
      runId: 'run-receipt-test',
      kind: 'lora-adapter' as const,
      path: artifactPath,
      sha256: 'b'.repeat(64),
      sizeBytes: 16,
      baseModel: modelPath,
      compatibility: {
        status: 'compatible' as const,
        baseModel: modelPath,
      },
      activation: {
        status: 'inactive' as const,
        reason: 'test',
      },
    }

    const oldReceipt = await runtime.loader.load({
      cardId: 'card-a',
      artifact,
      signal: new AbortController().signal,
      operationId: 'load-receipt-old',
    })
    await runtime.setConfig({
      ...initialConfig,
      port: 18_312,
    })
    await runtime.loader.unload({
      cardId: 'card-a',
      artifact,
      operationId: 'unload-receipt-old',
      reason: 'stale cleanup',
      receipt: {
        loaderId: oldReceipt.loaderId,
        receiptId: oldReceipt.receiptId,
        activatedAt: oldReceipt.activatedAt,
        reason: oldReceipt.reason ?? null,
      },
    })

    expect(runtime.getSnapshot().active).toBe(true)
    expect(runtime.getSnapshot().artifactId).toBe(artifact.artifactId)
    await runtime.dispose()
  })
})
