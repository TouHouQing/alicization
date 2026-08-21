import type { AlicizationPersonaTrainingArtifact } from '@proj-alicization/stage-shared'

import { access, chmod, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { setupAlicizationDb } from './db'
import { createLlamaCppPersonaRuntime } from './llama-cpp-persona-runtime'
import { runAlicizationMainChatProviderStep } from './main-chat-stream-runner'
import { createAlicizationMainGatewayConfigRuntime } from './runtime-main-gateway-config'
import { createCanonicalToolRegistry } from './turn-os/tool-registry'

const roots: string[] = []
const runtimes: Array<ReturnType<typeof createLlamaCppPersonaRuntime>> = []
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
    sha256: 'a'.repeat(64),
    sizeBytes: 16,
    baseModel: input.baseModel,
    compatibility: {
      status: 'compatible',
      baseModel: input.baseModel,
      reason: null,
    },
    activation: {
      status: 'unsupported',
      reason: 'The database loader will activate this artifact.',
    },
  }
}

async function createFakeLlamaServerExecutable(root: string) {
  const executable = join(root, 'llama-server')
  await writeFile(executable, `#!/usr/bin/env node
import { createServer } from 'node:http'

const args = process.argv.slice(2)
const port = Number(args[args.indexOf('--port') + 1])
const loraIndex = args.indexOf('--lora')
const adapterPath = loraIndex >= 0 ? args[loraIndex + 1] : ''
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
    response.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      connection: 'keep-alive',
    })
    response.write(\`data: \${JSON.stringify({ choices: [{ delta: { content: 'DB 激活后的本地 Persona 回复' } }] })}\\n\\n\`)
    response.write(\`data: \${JSON.stringify({ choices: [{ delta: {}, finish_reason: 'stop' }] })}\\n\\n\`)
    response.write('data: [DONE]\\n\\n')
    response.end()
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

async function stageActivatablePersonaDataset(
  db: Awaited<ReturnType<typeof setupAlicizationDb>>,
  cardId: string,
) {
  const summary = '只从清洗后的长期反思中学习，并在重启后恢复仍然有效的人格增量。'
  await db.enqueueWorkingMemoryLongTermQueueItems({
    cardId,
    sessionId: 'session-persona-runtime-db-e2e',
    items: [{
      id: 'queue-persona-runtime-db-e2e',
      source: 'working-memory-owner',
      memoryEvidence: {
        version: 'working-memory-long-term-evidence-v1',
        source: 'explicit-structured-memory-evidence',
        kind: 'relationship',
        summary,
        reason: 'Persona runtime database E2E fixture.',
        evidenceSnippets: [summary],
        salience: 0.9,
        sensitivity: 'personal',
        confidence: 0.9,
      },
      kind: 'relationship',
      summary,
      reason: 'Persona runtime database E2E fixture.',
      sourceTurnIds: ['turn-persona-runtime-db-e2e:user'],
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

  const reflection = (await db.listMemoryReflections({
    cardId,
    limit: 20,
  })).find(item => item.summary === summary)
  if (!reflection)
    throw new Error('persona runtime E2E fixture did not create a long-term reflection')

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
  const dataset = await db.stagePersonaTrainingDataset({
    cardId,
    consent,
  })
  const snapshot = await db.getPersonaTrainingDataset({ cardId })
  const example = snapshot.examples.find(item => item.datasetId === dataset.id)
  if (!example)
    throw new Error('persona runtime E2E fixture did not create a persona dataset example')
  await db.setPersonaTrainingDatasetExamplePolicy({
    cardId,
    exampleId: example.id,
    allowTraining: true,
    consent,
  })
  await db.activatePersonaTrainingDataset({
    cardId,
    datasetId: dataset.id,
  })
  return dataset
}

async function runPersonaChat(input: {
  cardId: string
  runtime: ReturnType<typeof createLlamaCppPersonaRuntime>
}) {
  const configRuntime = createAlicizationMainGatewayConfigRuntime({
    sanitizeText: (raw: unknown, fallback = '') => typeof raw === 'string' ? raw.trim() : fallback,
    getActiveProviderId: () => 'cloud-provider',
    getActiveModelId: () => 'cloud-model',
    getProviderCredentials: () => ({}),
    getPersonaRuntimeRoute: () => input.runtime.getRoute(),
  })
  const config = configRuntime.resolveMainGatewayConfig({ cardId: input.cardId })
  if (!config)
    throw new Error('Persona route is unavailable after database activation')

  return await runAlicizationMainChatProviderStep({
    payload: {
      cardId: input.cardId,
      turnId: `turn:${input.cardId}`,
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

describe('persona runtime database main-chat E2E', () => {
  it('restores an activated DB Persona artifact into the local main-chat route after restart', async () => {
    const root = await mkdtemp(join(tmpdir(), 'alicization-persona-runtime-db-e2e-'))
    roots.push(root)
    const cardId = 'card-persona-runtime-db-e2e'
    const modelPath = join(root, 'base.gguf')
    const artifactPath = join(root, 'persona.gguf')
    const processStatePath = join(root, 'persona-runtime-process.json')
    await writeFile(modelPath, 'base-model')
    await writeFile(artifactPath, 'persona-adapter')
    const executable = await createFakeLlamaServerExecutable(root)
    const config = {
      executable,
      modelPath,
      host: '127.0.0.1',
      port: 18_292,
      modelAlias: 'alice-persona',
      startupTimeoutMs: 5_000,
    }
    const lifecycle = {
      validateArtifact: async (artifact: AlicizationPersonaTrainingArtifact) => {
        await access(artifact.path)
      },
      discardArtifact: async () => {},
    }

    const firstRuntime = createLlamaCppPersonaRuntime({
      getConfig: () => config,
      processStatePath,
    })
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
    const closeFirstDb = () => firstDb.close()
    databaseClosers.push(closeFirstDb)
    const dataset = await stageActivatablePersonaDataset(firstDb, cardId)
    const trained = await firstDb.runPersonaTraining({
      cardId,
      datasetId: dataset.id,
    })
    expect(trained).toMatchObject({
      status: 'succeeded',
      increment: {
        artifact: {
          activation: {
            status: 'active',
            loaderId: 'llama.cpp',
          },
        },
      },
    })
    await expect(runPersonaChat({
      cardId,
      runtime: firstRuntime,
    })).resolves.toMatchObject({
      kind: 'reply',
      text: 'DB 激活后的本地 Persona 回复',
    })

    const firstDbCloserIndex = databaseClosers.indexOf(closeFirstDb)
    if (firstDbCloserIndex >= 0)
      databaseClosers.splice(firstDbCloserIndex, 1)
    await firstDb.close()

    const restartedRuntime = createLlamaCppPersonaRuntime({
      getConfig: () => config,
      processStatePath,
    })
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
    await expect(runPersonaChat({
      cardId,
      runtime: restartedRuntime,
    })).resolves.toMatchObject({
      kind: 'reply',
      text: 'DB 激活后的本地 Persona 回复',
    })
  })
})
