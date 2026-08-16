import type { PersonaTrainingExecutorInput } from './persona-training-pipeline-gate'

import { createHash } from 'node:crypto'
import { chmod, mkdir, mkdtemp, readFile, realpath, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  createPersonaTrainingProcessExecutor,
  normalizePersonaTrainingProcessConfig,
  testPersonaTrainingProcessConnection,
} from './persona-training-process-executor'

const sandboxes: string[] = []

async function createSandbox() {
  const root = await mkdtemp(join(tmpdir(), 'alicization-persona-executor-'))
  sandboxes.push(root)
  return root
}

async function createExecutable(root: string, body: string) {
  const path = join(root, 'fake-persona-trainer')
  await writeFile(path, `#!/usr/bin/env node\n${body}`, 'utf8')
  await chmod(path, 0o755)
  return path
}

function createManifest() {
  return {
    datasetId: 'dataset-1',
    cardId: 'card-a',
    version: 1,
    schemaVersion: 'persona-training-dataset-v1',
    exportedAt: 100,
    consentSnapshot: {
      granted: true,
      policyVersion: 'persona-training-consent-v1',
      scope: 'persona-dataset',
      capturedAt: 100,
    },
    exampleCount: 1,
    examples: [{
      id: 'example-1',
      sourceId: 'reflection-1',
      sourceKind: 'cleaned-long-term-reflection' as const,
      schemaVersion: 'persona-training-example-v1',
      contentHash: 'content-hash-1',
      provenance: {
        kind: 'working-memory-cleaning' as const,
        cleaningTransactionId: 'cleaning-1',
        cleanedAt: 99,
      },
      behaviorLesson: '失败时透明说明。',
      positiveExample: '我会直接说明失败原因。',
      negativeExample: null,
    }],
    manifestHash: 'manifest-hash-1',
  }
}

function createInput(overrides: Partial<PersonaTrainingExecutorInput> = {}): PersonaTrainingExecutorInput {
  return {
    runId: 'run-1',
    cardId: 'card-a',
    datasetId: 'dataset-1',
    manifest: createManifest(),
    basePersonaRevision: 'persona-core-v1',
    configSnapshot: null,
    signal: new AbortController().signal,
    assertCurrent: async () => {},
    ...overrides,
  }
}

afterEach(async () => {
  vi.unstubAllEnvs()
  await Promise.all(sandboxes.splice(0).map(path => rm(path, { recursive: true, force: true })))
})

describe('persona training process executor', () => {
  it('writes the fixed input protocol, reports progress, and atomically accepts a verified artifact', async () => {
    const root = await createSandbox()
    const executable = await createExecutable(root, `
const fs = require('node:fs')
const crypto = require('node:crypto')
const path = require('node:path')
const args = Object.fromEntries(process.argv.slice(2).reduce((pairs, value, index, values) => {
  if (value.startsWith('--'))
    pairs.push([value, values[index + 1]])
  return pairs
}, []))
const manifest = JSON.parse(fs.readFileSync(args['--manifest'], 'utf8'))
const dataset = fs.readFileSync(args['--dataset'], 'utf8').trim().split('\\n').map(JSON.parse)
if (manifest.datasetId !== 'dataset-1' || dataset[0].sourceId !== 'reflection-1')
  process.exit(41)
fs.mkdirSync(args['--output-dir'], { recursive: true })
const artifactPath = path.join(args['--output-dir'], 'adapter.bin')
fs.writeFileSync(artifactPath, 'verified-adapter')
const sha256 = crypto.createHash('sha256').update(fs.readFileSync(artifactPath)).digest('hex')
fs.writeFileSync(args['--artifact-manifest'], JSON.stringify({
  schemaVersion: 'alicization-persona-training-artifact-v1',
  artifactId: 'artifact-1',
  runId: manifest.runId,
  kind: 'lora-adapter',
  path: 'adapter.bin',
  sha256,
  baseModel: args['--base-model']
}))
process.stdout.write(JSON.stringify({ type: 'ready' }) + '\\n')
process.stdout.write(JSON.stringify({ type: 'progress', progress: 0.5, message: 'halfway' }) + '\\n')
process.stdout.write(JSON.stringify({ type: 'artifact' }) + '\\n')
`)
    const onProgress = vi.fn()
    const executor = createPersonaTrainingProcessExecutor({
      cardRootDir: join(root, 'card-a'),
      onProgress,
    })

    const result = await executor.execute(createInput(), {
      executable,
      fixedArguments: [],
      baseModel: 'base-model-v1',
      timeoutMs: 5_000,
    })

    expect(onProgress).toHaveBeenCalledWith(expect.objectContaining({
      progress: 0.5,
      message: 'halfway',
    }))
    expect(result.artifact).toMatchObject({
      schemaVersion: 'alicization-persona-training-artifact-v1',
      artifactId: 'artifact-1',
      kind: 'lora-adapter',
      sha256: createHash('sha256').update('verified-adapter').digest('hex'),
      baseModel: 'base-model-v1',
      compatibility: {
        status: 'compatible',
      },
      activation: {
        status: 'unsupported',
      },
    })
    const artifact = result.artifact as { path: string }
    await expect(readFile(artifact.path, 'utf8')).resolves.toBe('verified-adapter')
    expect(artifact.path).toContain(join('persona-training', 'artifacts', 'artifact-1'))
  })

  it('terminates the child process when the caller cancels', async () => {
    const root = await createSandbox()
    const executable = await createExecutable(root, `
process.stdout.write(JSON.stringify({ type: 'ready' }) + '\\n')
setInterval(() => {}, 1000)
`)
    const controller = new AbortController()
    const executor = createPersonaTrainingProcessExecutor({
      cardRootDir: join(root, 'card-a'),
      terminationGraceMs: 20,
    })

    const running = executor.execute(createInput({ signal: controller.signal }), {
      executable,
      fixedArguments: [],
      baseModel: 'base-model-v1',
      timeoutMs: 5_000,
    })
    await vi.waitFor(() => expect(executor.activeProcessCount()).toBe(1))
    controller.abort('source-revoked')

    await expect(running).rejects.toThrow('source-revoked')
    await vi.waitFor(() => expect(executor.activeProcessCount()).toBe(0))
  })

  it('terminates and transparently reports a timed out trainer', async () => {
    const root = await createSandbox()
    const executable = await createExecutable(root, `
process.stdout.write(JSON.stringify({ type: 'ready' }) + '\\n')
setInterval(() => {}, 1000)
`)
    const executor = createPersonaTrainingProcessExecutor({
      cardRootDir: join(root, 'card-a'),
      terminationGraceMs: 20,
    })

    await expect(executor.execute(createInput(), {
      executable,
      fixedArguments: [],
      baseModel: 'base-model-v1',
      timeoutMs: 30,
    })).rejects.toThrow('timed out')
  })

  it('includes bounded stderr when the trainer exits non-zero', async () => {
    const root = await createSandbox()
    const executable = await createExecutable(root, `
process.stderr.write('trainer dependency missing')
process.exit(17)
`)
    const executor = createPersonaTrainingProcessExecutor({
      cardRootDir: join(root, 'card-a'),
    })

    await expect(executor.execute(createInput(), {
      executable,
      fixedArguments: [],
      baseModel: 'base-model-v1',
      timeoutMs: 5_000,
    })).rejects.toThrow('trainer dependency missing')
  })

  it('rejects artifact hash mismatches', async () => {
    const root = await createSandbox()
    const executable = await createExecutable(root, `
const fs = require('node:fs')
const path = require('node:path')
const args = Object.fromEntries(process.argv.slice(2).reduce((pairs, value, index, values) => {
  if (value.startsWith('--'))
    pairs.push([value, values[index + 1]])
  return pairs
}, []))
fs.mkdirSync(args['--output-dir'], { recursive: true })
fs.writeFileSync(path.join(args['--output-dir'], 'adapter.bin'), 'tampered-adapter')
const manifest = JSON.parse(fs.readFileSync(args['--manifest'], 'utf8'))
fs.writeFileSync(args['--artifact-manifest'], JSON.stringify({
  schemaVersion: 'alicization-persona-training-artifact-v1',
  artifactId: 'artifact-invalid',
  runId: manifest.runId,
  kind: 'lora-adapter',
  path: process.env.INVALID_ARTIFACT_PATH || 'adapter.bin',
  sha256: 'not-the-real-hash',
  baseModel: args['--base-model']
}))
process.stdout.write(JSON.stringify({ type: 'ready' }) + '\\n')
process.stdout.write(JSON.stringify({ type: 'artifact' }) + '\\n')
`)
    const executor = createPersonaTrainingProcessExecutor({
      cardRootDir: join(root, 'card-a'),
    })

    await expect(executor.execute(createInput(), {
      executable,
      fixedArguments: [],
      baseModel: 'base-model-v1',
      timeoutMs: 5_000,
    })).rejects.toThrow('hash')
  })

  it.each([
    ['path traversal', 'traversal', 'path'],
    ['absolute paths', 'absolute', 'path'],
    ['symbolic links', 'symlink', 'symbolic'],
    ['missing files', 'missing', 'missing'],
  ])('rejects artifact %s', async (_, invalidCase, expectedError) => {
    const root = await createSandbox()
    const executable = await createExecutable(root, `
const fs = require('node:fs')
const crypto = require('node:crypto')
const path = require('node:path')
const args = Object.fromEntries(process.argv.slice(2).reduce((pairs, value, index, values) => {
  if (value.startsWith('--'))
    pairs.push([value, values[index + 1]])
  return pairs
}, []))
const invalidCase = ${JSON.stringify(invalidCase)}
const manifest = JSON.parse(fs.readFileSync(args['--manifest'], 'utf8'))
fs.mkdirSync(args['--output-dir'], { recursive: true })
const outsidePath = path.join(path.dirname(args['--output-dir']), 'outside.bin')
let artifactPath = path.join(args['--output-dir'], 'adapter.bin')
let manifestPath = 'adapter.bin'
if (invalidCase === 'traversal') {
  fs.writeFileSync(outsidePath, 'outside')
  artifactPath = outsidePath
  manifestPath = '../outside.bin'
}
else if (invalidCase === 'absolute') {
  fs.writeFileSync(outsidePath, 'outside')
  artifactPath = outsidePath
  manifestPath = outsidePath
}
else if (invalidCase === 'symlink') {
  const targetPath = path.join(args['--output-dir'], 'target.bin')
  fs.writeFileSync(targetPath, 'target')
  fs.symlinkSync(targetPath, artifactPath)
}
else if (invalidCase !== 'missing') {
  fs.writeFileSync(artifactPath, 'adapter')
}
const sha256 = invalidCase === 'missing'
  ? crypto.createHash('sha256').update('missing').digest('hex')
  : crypto.createHash('sha256').update(fs.readFileSync(artifactPath)).digest('hex')
fs.writeFileSync(args['--artifact-manifest'], JSON.stringify({
  schemaVersion: 'alicization-persona-training-artifact-v1',
  artifactId: 'artifact-${invalidCase}',
  runId: manifest.runId,
  kind: 'lora-adapter',
  path: manifestPath,
  sha256,
  baseModel: args['--base-model']
}))
process.stdout.write(JSON.stringify({ type: 'ready' }) + '\\n')
process.stdout.write(JSON.stringify({ type: 'artifact' }) + '\\n')
`)
    const executor = createPersonaTrainingProcessExecutor({
      cardRootDir: join(root, 'card-a'),
    })

    await expect(executor.execute(createInput(), {
      executable,
      fixedArguments: [],
      baseModel: 'base-model-v1',
      timeoutMs: 5_000,
    })).rejects.toThrow(expectedError)
  })

  it('rejects malformed stdout protocol instead of treating it as progress', async () => {
    const root = await createSandbox()
    const executable = await createExecutable(root, `
process.stdout.write('not-json\\n')
setInterval(() => {}, 1000)
`)
    const executor = createPersonaTrainingProcessExecutor({
      cardRootDir: join(root, 'card-a'),
      terminationGraceMs: 20,
    })

    await expect(executor.execute(createInput(), {
      executable,
      fixedArguments: [],
      baseModel: 'base-model-v1',
      timeoutMs: 5_000,
    })).rejects.toThrow('malformed JSONL')
  })

  it('rejects a symlinked training root before writing card-scoped inputs', async () => {
    const root = await createSandbox()
    const cardRoot = join(root, 'card-a')
    const outsideRoot = join(root, 'outside')
    await mkdir(cardRoot, { recursive: true })
    await mkdir(outsideRoot, { recursive: true })
    await symlink(outsideRoot, join(cardRoot, 'persona-training'))
    const executable = await createExecutable(root, 'process.exit(0)')
    const executor = createPersonaTrainingProcessExecutor({
      cardRootDir: cardRoot,
    })

    await expect(executor.execute(createInput(), {
      executable,
      fixedArguments: [],
      baseModel: 'base-model-v1',
      timeoutMs: 5_000,
    })).rejects.toThrow('symbolic link')
    await expect(readFile(join(outsideRoot, 'runs', 'run-1', 'dataset.jsonl'), 'utf8')).rejects.toThrow()
  })

  it('rejects fixed arguments that override reserved protocol parameters', () => {
    expect(() => normalizePersonaTrainingProcessConfig({
      executable: '/usr/bin/env',
      fixedArguments: ['node', 'wrapper.js', '--output-dir', '/tmp/outside'],
      baseModel: 'base-model-v1',
      timeoutMs: 5_000,
    })).toThrow('reserved protocol argument')
  })

  it('tests the wrapper protocol without inheriting provider credentials', async () => {
    const root = await createSandbox()
    const executable = await createExecutable(root, `
if (process.env.OPENAI_API_KEY || process.env.SILICONFLOW_API_KEY)
  process.exit(29)
if (!process.argv.includes('--probe'))
  process.exit(31)
process.stdout.write(JSON.stringify({ type: 'ready' }) + '\\n')
`)
    vi.stubEnv('OPENAI_API_KEY', 'must-not-leak')
    vi.stubEnv('SILICONFLOW_API_KEY', 'must-not-leak')

    const result = await testPersonaTrainingProcessConnection({
      executable,
      fixedArguments: [],
      baseModel: 'base-model-v1',
      timeoutMs: 5_000,
    })

    expect(result).toMatchObject({
      ok: true,
      executable: await realpath(executable),
    })
  })
})
