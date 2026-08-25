import type { AlicizationPersonaTrainingArtifact } from '@proj-alicization/stage-shared'

import { access, chmod, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { setupAlicizationDb } from './db'
import { runAlicizationMainChatProviderStep } from './main-chat-stream-runner'
import { createMlxPersonaRuntime } from './mlx-persona-runtime'
import { createAlicizationMainGatewayConfigRuntime } from './runtime-main-gateway-config'
import { createCanonicalToolRegistry } from './turn-os/tool-registry'

const roots: string[] = []
const runtimes: Array<ReturnType<typeof createMlxPersonaRuntime>> = []
const databaseClosers: Array<() => Promise<void>> = []

function createArtifact(input: {
  path: string
  runId: string
  baseModel: string
}): AlicizationPersonaTrainingArtifact {
  return {
    schemaVersion: 'alicization-persona-training-artifact-v1',
    artifactId: `artifact:${input.runId}`,
    runId: input.runId,
    kind: 'lora-adapter',
    path: input.path,
    sha256: 'd'.repeat(64),
    sizeBytes: 7,
    baseModel: input.baseModel,
    format: 'mlx-safetensors',
    producerBackend: 'mlx-lm',
    loaderTarget: 'mlx-runtime',
    compatibility: {
      status: 'compatible',
      baseModel: input.baseModel,
    },
    activation: {
      status: 'unsupported',
      reason: 'The database loader will activate this artifact.',
    },
  }
}

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
  if (!JSON.parse(body).stream) {
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
  response.write(\`data: \${JSON.stringify({ choices: [{ delta: { content: 'MLX 数据库恢复后的回复' } }] })}\\n\\n\`)
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

async function stageDataset(db: Awaited<ReturnType<typeof setupAlicizationDb>>, cardId: string) {
  const summary = 'MLX 人格增量必须从清洗后的长期反思进入，并在重启后保持可回滚。'
  await db.enqueueWorkingMemoryLongTermQueueItems({
    cardId,
    sessionId: 'session-mlx-db-e2e',
    items: [{
      id: 'queue-mlx-db-e2e',
      source: 'working-memory-owner',
      memoryEvidence: {
        version: 'working-memory-long-term-evidence-v1',
        source: 'explicit-structured-memory-evidence',
        kind: 'relationship',
        summary,
        reason: 'MLX DB E2E fixture.',
        evidenceSnippets: [summary],
        salience: 0.9,
        sensitivity: 'personal',
        confidence: 0.9,
      },
      kind: 'relationship',
      summary,
      reason: 'MLX DB E2E fixture.',
      sourceTurnIds: ['turn-mlx-db-e2e:user'],
      evidenceSnippets: [summary],
      salience: 0.9,
      confidence: 0.9,
      sensitivity: 'personal',
      allowTraining: false,
      status: 'pending-cleaning',
      rejectionReasons: [],
      contaminationFlags: [],
      createdAt: 100,
    }],
  })
  await db.drainWorkingMemoryLongTermQueue()
  const reflection = (await db.listMemoryReflections({ cardId, limit: 20 }))
    .find(item => item.summary === summary)
  if (!reflection)
    throw new Error('MLX DB E2E fixture did not create a reflection')
  await db.upsertMemoryReflections([{
    ...reflection,
    status: 'confirmed',
    confirmedAt: reflection.updatedAt + 1,
    updatedAt: reflection.updatedAt + 1,
  }])
  const consent = {
    granted: true,
    policyVersion: 'persona-training-consent-v1',
    scope: 'persona-dataset',
  } as const
  const dataset = await db.stagePersonaTrainingDataset({ cardId, consent })
  const snapshot = await db.getPersonaTrainingDataset({ cardId })
  const example = snapshot.examples.find(item => item.datasetId === dataset.id)
  if (!example)
    throw new Error('MLX DB E2E fixture did not create a dataset example')
  await db.setPersonaTrainingDatasetExamplePolicy({
    cardId,
    exampleId: example.id,
    allowTraining: true,
    consent,
  })
  return await db.activatePersonaTrainingDataset({ cardId, datasetId: dataset.id })
}

async function runPersonaChat(cardId: string, runtime: ReturnType<typeof createMlxPersonaRuntime>) {
  const configRuntime = createAlicizationMainGatewayConfigRuntime({
    sanitizeText: (raw: unknown, fallback = '') => typeof raw === 'string' ? raw.trim() : fallback,
    getActiveProviderId: () => 'cloud-provider',
    getActiveModelId: () => 'cloud-model',
    getProviderCredentials: () => ({}),
    getPersonaRuntimeRoute: () => runtime.getRoute(),
  })
  const config = configRuntime.resolveMainGatewayConfig({ cardId })
  if (!config)
    throw new Error('MLX Persona route is unavailable')
  return await runAlicizationMainChatProviderStep({
    payload: {
      cardId,
      turnId: `turn:${cardId}`,
      providerId: config.providerId,
      model: config.model,
      providerConfig: {},
      messages: [{ role: 'user', content: '你好' }],
    },
    prepared: {
      chatConfig: config.provider.chat(config.model),
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
}

afterEach(async () => {
  await Promise.all(databaseClosers.splice(0).map(close => close()))
  await Promise.all(runtimes.splice(0).map(runtime => runtime.dispose()))
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })))
})

describe('mlx Persona database main-chat E2E', () => {
  it('restores an activated MLX artifact from the DB into the main chat route after restart', async () => {
    const root = await mkdtemp(join(tmpdir(), 'alicization-mlx-db-e2e-'))
    roots.push(root)
    const cardId = 'card-mlx-db-e2e'
    const modelPath = join(root, 'base-model')
    const adapterDir = join(root, 'adapter')
    const artifactPath = join(adapterDir, 'adapters.safetensors')
    const processStatePath = join(root, 'persona-runtime-process.json')
    await mkdir(modelPath)
    await mkdir(adapterDir)
    await writeFile(artifactPath, 'adapter')
    await writeFile(join(adapterDir, 'adapter_config.json'), JSON.stringify({ lora_layers: 8 }))
    const executable = await createFakeMlxServer(root)
    const config = {
      backend: 'mlx-runtime' as const,
      executable,
      modelPath,
      host: '127.0.0.1',
      port: 18_294,
      modelAlias: 'alice-mlx',
      startupTimeoutMs: 5_000,
    }
    const lifecycle = {
      validateArtifact: async (artifact: AlicizationPersonaTrainingArtifact) => await access(artifact.path),
      discardArtifact: async () => {},
    }
    const firstRuntime = createMlxPersonaRuntime({ getConfig: () => config, processStatePath })
    runtimes.push(firstRuntime)
    const firstDb = await setupAlicizationDb(root, {
      cardId,
      personaTrainingExecutor: async input => ({
        artifact: createArtifact({
          path: artifactPath,
          runId: input.runId,
          baseModel: modelPath,
        }),
      }),
      personaTrainingArtifactLifecycle: lifecycle,
      personaTrainingArtifactLoader: firstRuntime.loader,
    })
    databaseClosers.push(() => firstDb.close())
    const dataset = await stageDataset(firstDb, cardId)
    const trained = await firstDb.runPersonaTraining({ cardId, datasetId: dataset!.id })
    expect(trained).toMatchObject({
      status: 'succeeded',
      increment: { artifact: { activation: { status: 'active', loaderId: 'mlx-runtime' } } },
    })
    await expect(runPersonaChat(cardId, firstRuntime)).resolves.toMatchObject({
      kind: 'reply',
      text: 'MLX 数据库恢复后的回复',
    })

    await firstDb.close()
    databaseClosers.pop()
    const restartedRuntime = createMlxPersonaRuntime({ getConfig: () => config, processStatePath })
    runtimes.push(restartedRuntime)
    const restartedDb = await setupAlicizationDb(root, {
      cardId,
      personaTrainingArtifactLifecycle: lifecycle,
      personaTrainingArtifactLoader: restartedRuntime.loader,
    })
    databaseClosers.push(() => restartedDb.close())
    expect(restartedRuntime.getSnapshot()).toMatchObject({
      active: true,
      artifactId: `artifact:${trained.runId}`,
    })
    await expect(runPersonaChat(cardId, restartedRuntime)).resolves.toMatchObject({
      kind: 'reply',
      text: 'MLX 数据库恢复后的回复',
    })
  }, 15_000)
})
