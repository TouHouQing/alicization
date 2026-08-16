import type { PersonaTrainingExecutorInput } from './persona-training-pipeline-gate'

import { createHash } from 'node:crypto'
import { chmod, mkdir, mkdtemp, readFile, realpath, rename, rm, stat, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

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

function createExample(index: number, overrides: Record<string, unknown> = {}) {
  return {
    ...createManifest().examples[0],
    id: `example-${index}`,
    sourceId: `reflection-${index}`,
    contentHash: `content-hash-${index}`,
    ...overrides,
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
    expect(artifact.path).toContain(join('persona-training', 'artifacts', 'artifact-1', 'output'))
    const artifactStat = await stat(artifact.path)
    expect(artifactStat.isFile()).toBe(true)
  })

  it('returns the published artifact when run-directory cleanup fails after publication', async () => {
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
const artifactPath = path.join(args['--output-dir'], 'adapter.bin')
fs.writeFileSync(artifactPath, 'published-before-run-cleanup-failure')
const sha256 = crypto.createHash('sha256').update(fs.readFileSync(artifactPath)).digest('hex')
fs.writeFileSync(args['--artifact-manifest'], JSON.stringify({
  schemaVersion: 'alicization-persona-training-artifact-v1',
  artifactId: 'artifact-run-cleanup-failure',
  runId: manifest.runId,
  kind: 'lora-adapter',
  path: 'adapter.bin',
  sha256,
  baseModel: args['--base-model']
}))
process.stdout.write(JSON.stringify({ type: 'ready' }) + '\\n')
process.stdout.write(JSON.stringify({ type: 'artifact' }) + '\\n')
`)
    const cardRootDir = join(root, 'card-a')
    const runDir = join(cardRootDir, 'persona-training', 'runs', 'run-1')
    const executor = createPersonaTrainingProcessExecutor({
      cardRootDir,
    })
    const input = createInput({
      onProgress: async ({ stage }) => {
        if (stage !== 'finalizing')
          return
        const replacementPath = join(root, 'replacement-run-dir')
        await rename(runDir, replacementPath)
        await mkdir(runDir)
      },
    })

    let failure: any
    try {
      await executor.execute(input, {
        executable,
        baseModel: 'base-model-v1',
        timeoutMs: 5_000,
      })
    }
    catch (error) {
      failure = error
    }

    expect(failure).toMatchObject({
      artifact: expect.objectContaining({
        artifactId: 'artifact-run-cleanup-failure',
      }),
    })
    expect(failure.message).toContain('persona training run directory inode changed before cleanup')
    await expect(readFile(
      join(cardRootDir, 'persona-training', 'artifacts', 'artifact-run-cleanup-failure', 'output', 'adapter.bin'),
      'utf8',
    )).resolves.toBe('published-before-run-cleanup-failure')
  })

  it('rejects a same-hash artifact whose inode was replaced after publication', async () => {
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
const artifactPath = path.join(args['--output-dir'], 'adapter.bin')
fs.writeFileSync(artifactPath, 'same-hash-adapter')
const sha256 = crypto.createHash('sha256').update(fs.readFileSync(artifactPath)).digest('hex')
fs.writeFileSync(args['--artifact-manifest'], JSON.stringify({
  schemaVersion: 'alicization-persona-training-artifact-v1',
  artifactId: 'artifact-inode-replaced',
  runId: manifest.runId,
  kind: 'lora-adapter',
  path: 'adapter.bin',
  sha256,
  baseModel: args['--base-model']
}))
process.stdout.write(JSON.stringify({ type: 'ready' }) + '\\n')
process.stdout.write(JSON.stringify({ type: 'artifact' }) + '\\n')
`)
    const executor = createPersonaTrainingProcessExecutor({
      cardRootDir: join(root, 'card-a'),
    })
    const result = await executor.execute(createInput(), {
      executable,
      baseModel: 'base-model-v1',
      timeoutMs: 5_000,
    })
    const replacementPath = join(root, 'replacement.bin')
    await writeFile(replacementPath, 'same-hash-adapter', 'utf8')
    await rename(replacementPath, result.artifact.path)

    await expect((executor as any).validateArtifact(result.artifact)).rejects.toThrow('inode')
  })

  it('revalidates available artifacts before retaining them during reconciliation', async () => {
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
const artifactPath = path.join(args['--output-dir'], 'adapter.bin')
fs.writeFileSync(artifactPath, 'reconcile-adapter')
const sha256 = crypto.createHash('sha256').update(fs.readFileSync(artifactPath)).digest('hex')
fs.writeFileSync(args['--artifact-manifest'], JSON.stringify({
  schemaVersion: 'alicization-persona-training-artifact-v1',
  artifactId: 'artifact-reconcile-validate',
  runId: manifest.runId,
  kind: 'lora-adapter',
  path: 'adapter.bin',
  sha256,
  baseModel: args['--base-model']
}))
process.stdout.write(JSON.stringify({ type: 'ready' }) + '\\n')
process.stdout.write(JSON.stringify({ type: 'artifact' }) + '\\n')
`)
    const executor = createPersonaTrainingProcessExecutor({
      cardRootDir: join(root, 'card-a'),
    })
    const result = await executor.execute(createInput(), {
      executable,
      baseModel: 'base-model-v1',
      timeoutMs: 5_000,
    })
    await writeFile(result.artifact.path, 'tampered-after-db-validation', 'utf8')

    await expect(executor.reconcileArtifacts({
      availableArtifacts: [result.artifact],
      onOrphanCleanupFailure: async () => {},
    })).rejects.toThrow('artifact')
  })

  it('reports a safely parsed orphan artifact when its cleanup fails', async () => {
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
const artifactPath = path.join(args['--output-dir'], 'adapter.bin')
fs.writeFileSync(artifactPath, 'orphan-recovery-artifact')
const sha256 = crypto.createHash('sha256').update(fs.readFileSync(artifactPath)).digest('hex')
fs.writeFileSync(args['--artifact-manifest'], JSON.stringify({
  schemaVersion: 'alicization-persona-training-artifact-v1',
  artifactId: 'artifact-orphan-recovery',
  runId: manifest.runId,
  kind: 'lora-adapter',
  path: 'adapter.bin',
  sha256,
  baseModel: args['--base-model']
}))
process.stdout.write(JSON.stringify({ type: 'ready' }) + '\\n')
process.stdout.write(JSON.stringify({ type: 'artifact' }) + '\\n')
`)
    const executor = createPersonaTrainingProcessExecutor({
      cardRootDir: join(root, 'card-a'),
    })
    const result = await executor.execute(createInput(), {
      executable,
      baseModel: 'base-model-v1',
      timeoutMs: 5_000,
    })
    const onOrphanCleanupFailure = vi.fn(async () => {})
    const artifactRoot = dirname(dirname(dirname(result.artifact.path)))

    await chmod(artifactRoot, 0o500)
    try {
      await expect(executor.reconcileArtifacts({
        availableArtifacts: [],
        onOrphanCleanupFailure,
      } as any)).rejects.toThrow()
    }
    finally {
      await chmod(artifactRoot, 0o700)
    }
    expect(onOrphanCleanupFailure).toHaveBeenCalledWith(expect.objectContaining({
      artifact: expect.objectContaining({
        artifactId: 'artifact-orphan-recovery',
        runId: 'run-1',
        baseModel: 'base-model-v1',
      }),
      error: expect.any(Error),
    }))
    const orphanFailure = (onOrphanCleanupFailure.mock.calls as any[])[0][0] as { artifact: { path: string } }
    expect(orphanFailure.artifact.path).toContain(
      join('artifacts', 'artifact-orphan-recovery', 'output', 'adapter.bin'),
    )
    await expect(readFile(result.artifact.path, 'utf8')).resolves.toBe('orphan-recovery-artifact')
  })

  it('fails closed without recovery metadata for a malformed orphan receipt', async () => {
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
const artifactPath = path.join(args['--output-dir'], 'adapter.bin')
fs.writeFileSync(artifactPath, 'malformed-orphan-receipt')
const sha256 = crypto.createHash('sha256').update(fs.readFileSync(artifactPath)).digest('hex')
fs.writeFileSync(args['--artifact-manifest'], JSON.stringify({
  schemaVersion: 'alicization-persona-training-artifact-v1',
  artifactId: 'artifact-malformed-orphan',
  runId: manifest.runId,
  kind: 'lora-adapter',
  path: 'adapter.bin',
  sha256,
  baseModel: args['--base-model']
}))
process.stdout.write(JSON.stringify({ type: 'ready' }) + '\\n')
process.stdout.write(JSON.stringify({ type: 'artifact' }) + '\\n')
`)
    const executor = createPersonaTrainingProcessExecutor({
      cardRootDir: join(root, 'card-a'),
    })
    const result = await executor.execute(createInput(), {
      executable,
      baseModel: 'base-model-v1',
      timeoutMs: 5_000,
    })
    const receiptPath = join(dirname(dirname(result.artifact.path)), '.alicization-publication.json')
    await writeFile(receiptPath, '{not-json', 'utf8')
    const onOrphanCleanupFailure = vi.fn(async () => {})

    await expect(executor.reconcileArtifacts({
      availableArtifacts: [],
      onOrphanCleanupFailure,
    } as any)).rejects.toThrow('receipt')
    expect(onOrphanCleanupFailure).not.toHaveBeenCalled()
    await expect(readFile(result.artifact.path, 'utf8')).resolves.toBe('malformed-orphan-receipt')
  })

  it('discards the owned publication directory through the artifact lifecycle', async () => {
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
const artifactPath = path.join(args['--output-dir'], 'adapter.bin')
fs.writeFileSync(artifactPath, 'discarded-adapter')
const sha256 = crypto.createHash('sha256').update(fs.readFileSync(artifactPath)).digest('hex')
fs.writeFileSync(args['--artifact-manifest'], JSON.stringify({
  schemaVersion: 'alicization-persona-training-artifact-v1',
  artifactId: 'artifact-discarded',
  runId: manifest.runId,
  kind: 'lora-adapter',
  path: 'adapter.bin',
  sha256,
  baseModel: args['--base-model']
}))
process.stdout.write(JSON.stringify({ type: 'ready' }) + '\\n')
process.stdout.write(JSON.stringify({ type: 'artifact' }) + '\\n')
`)
    const executor = createPersonaTrainingProcessExecutor({
      cardRootDir: join(root, 'card-a'),
    })
    const result = await executor.execute(createInput(), {
      executable,
      baseModel: 'base-model-v1',
      timeoutMs: 5_000,
    })

    await (executor as any).discardArtifact(result.artifact)

    await expect(readFile(result.artifact.path, 'utf8')).rejects.toThrow()
  })

  it.each([
    ['missing', async (receiptPath: string) => await rm(receiptPath, { force: true })],
    ['malformed', async (receiptPath: string) => await writeFile(receiptPath, '{not-json', 'utf8')],
    ['owner-mismatched', async (receiptPath: string) => {
      const receipt = JSON.parse(await readFile(receiptPath, 'utf8')) as Record<string, unknown>
      await writeFile(receiptPath, JSON.stringify({ ...receipt, runId: 'run-other' }), 'utf8')
    }],
  ])('fails closed when discarding an artifact with a %s publication receipt', async (_, mutateReceipt) => {
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
const artifactPath = path.join(args['--output-dir'], 'adapter.bin')
fs.writeFileSync(artifactPath, 'fail-closed-adapter')
const sha256 = crypto.createHash('sha256').update(fs.readFileSync(artifactPath)).digest('hex')
fs.writeFileSync(args['--artifact-manifest'], JSON.stringify({
  schemaVersion: 'alicization-persona-training-artifact-v1',
  artifactId: 'artifact-fail-closed',
  runId: manifest.runId,
  kind: 'lora-adapter',
  path: 'adapter.bin',
  sha256,
  baseModel: args['--base-model']
}))
process.stdout.write(JSON.stringify({ type: 'ready' }) + '\\n')
process.stdout.write(JSON.stringify({ type: 'artifact' }) + '\\n')
`)
    const executor = createPersonaTrainingProcessExecutor({
      cardRootDir: join(root, 'card-a'),
    })
    const result = await executor.execute(createInput(), {
      executable,
      baseModel: 'base-model-v1',
      timeoutMs: 5_000,
    })
    const receiptPath = join(dirname(dirname(result.artifact.path)), '.alicization-publication.json')
    await mutateReceipt(receiptPath)

    await expect(executor.discardArtifact(result.artifact)).rejects.toThrow('receipt')
    await expect(readFile(result.artifact.path, 'utf8')).resolves.toBe('fail-closed-adapter')
  })

  it.each([
    ['executor observer', 'observer progress failed', true],
    ['run persistence', 'run progress failed', false],
  ])('turns %s rejection into a handled transparent run failure', async (_, failureMessage, rejectObserver) => {
    const root = await createSandbox()
    const executable = await createExecutable(root, `
process.stdout.write(JSON.stringify({ type: 'ready' }) + '\\n')
process.stdout.write(JSON.stringify({ type: 'progress', progress: 0.25 }) + '\\n')
setInterval(() => {}, 1000)
`)
    const executor = createPersonaTrainingProcessExecutor({
      cardRootDir: join(root, 'card-a'),
      terminationGraceMs: 20,
      onProgress: rejectObserver
        ? async () => {
          throw new Error(failureMessage)
        }
        : undefined,
    })
    const input = createInput({
      onProgress: rejectObserver
        ? undefined
        : async () => {
          throw new Error(failureMessage)
        },
    })

    await expect(executor.execute(input, {
      executable,
      baseModel: 'base-model-v1',
      timeoutMs: 5_000,
    })).rejects.toThrow(failureMessage)
    await vi.waitFor(() => expect(executor.activeProcessCount()).toBe(0))
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
      baseModel: 'base-model-v1',
      timeoutMs: 5_000,
    })).rejects.toThrow('symbolic link')
    await expect(readFile(join(outsideRoot, 'runs', 'run-1', 'dataset.jsonl'), 'utf8')).rejects.toThrow()
  })

  it.each([
    ['cards root', (root: string, outsideRoot: string) => {
      const cardsRoot = join(root, 'cards')
      return {
        cardsRoot,
        cardRoot: join(cardsRoot, 'card-a'),
        prepare: async () => {
          await symlink(outsideRoot, cardsRoot)
        },
      }
    }],
    ['intermediate card ancestor', (root: string, outsideRoot: string) => {
      const cardsRoot = join(root, 'cards')
      return {
        cardsRoot,
        cardRoot: join(cardsRoot, 'linked-parent', 'card-a'),
        prepare: async () => {
          await mkdir(cardsRoot, { recursive: true })
          await symlink(outsideRoot, join(cardsRoot, 'linked-parent'))
        },
      }
    }],
  ])('rejects a symlinked %s before creating a run directory', async (_, buildPaths) => {
    const root = await createSandbox()
    const outsideRoot = join(root, 'outside')
    await mkdir(outsideRoot, { recursive: true })
    const paths = buildPaths(root, outsideRoot)
    await paths.prepare()
    const executable = await createExecutable(root, 'process.exit(0)')
    const executor = createPersonaTrainingProcessExecutor({
      cardsRootDir: paths.cardsRoot,
      cardRootDir: paths.cardRoot,
    })

    await expect(executor.execute(createInput(), {
      executable,
      baseModel: 'base-model-v1',
      timeoutMs: 5_000,
    })).rejects.toThrow('symbolic link')
    await expect(readFile(join(outsideRoot, 'card-a', 'persona-training', 'runs', 'run-1', 'dataset.jsonl'), 'utf8')).rejects.toThrow()
  })

  it('drops legacy fixedArguments instead of preserving executable argument injection', () => {
    const normalized = normalizePersonaTrainingProcessConfig({
      executable: '/usr/bin/env',
      fixedArguments: ['node', 'wrapper.js', '--output-dir', '/tmp/outside'],
      baseModel: 'base-model-v1',
      timeoutMs: 5_000,
    })

    expect(normalized).toEqual({
      executable: '/usr/bin/env',
      baseModel: 'base-model-v1',
      timeoutMs: 5_000,
    })
    expect(normalized).not.toHaveProperty('fixedArguments')
  })

  it.each([
    ['example count', Array.from({ length: 1_025 }, (_, index) => createExample(index))],
    ['single JSONL line UTF-8 bytes', [createExample(1, { positiveExample: '你'.repeat(22_000) })]],
    ['total JSONL bytes', Array.from({ length: 1_024 }, (_, index) => createExample(index, { positiveExample: 'x'.repeat(9_000) }))],
  ])('rejects dataset %s limits before spawning the trainer', async (label, examples) => {
    const root = await createSandbox()
    const markerPath = join(root, 'trainer-started')
    const executable = await createExecutable(root, `
require('node:fs').writeFileSync(${JSON.stringify(markerPath)}, 'started')
process.exit(0)
`)
    const executor = createPersonaTrainingProcessExecutor({
      cardRootDir: join(root, 'card-a'),
    })
    const manifest = {
      ...createManifest(),
      exampleCount: examples.length,
      examples,
    }

    await expect(executor.execute(createInput({ manifest }), {
      executable,
      baseModel: 'base-model-v1',
      timeoutMs: 5_000,
    })).rejects.toThrow(label)
    await expect(readFile(markerPath, 'utf8')).rejects.toThrow()
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
      baseModel: 'base-model-v1',
      timeoutMs: 5_000,
    })

    expect(result).toMatchObject({
      ok: true,
      executable: await realpath(executable),
    })
  })
})
