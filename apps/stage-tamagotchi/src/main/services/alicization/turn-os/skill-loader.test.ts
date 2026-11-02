import type {
  AlicizationSkillAuditEvent,
  AlicizationSkillLoader,
  AlicizationSkillLoaderFileSystem,
  AlicizationSkillProjectionOptions,
  CreateAlicizationSkillLoaderOptions,
  SkillLifecycleSnapshot,
} from './skill-loader'
import type { ToolRegistry } from './tool-registry'

import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { createAlicizationSkillLoader } from './skill-loader'
import { createAlicizationSkillRegistry } from './skill-registry'
import { createToolRegistry } from './tool-registry'

const sandboxDirectories: string[] = []

const projectionOptions: AlicizationSkillProjectionOptions = {
  scope: 'turn',
  executionChannel: 'skill',
  timeoutMs: 15_000,
  supportsProgress: false,
  supportsCancellation: true,
  idempotency: 'best-effort',
  providerToolName: skill => `skill_${skill.id.replaceAll('.', '_')}`,
  adapterToolName: skill => `skill_adapter_${skill.id.replaceAll('.', '_')}`,
}

function createFileSystem(readFileOverride?: AlicizationSkillLoaderFileSystem['readFile']): AlicizationSkillLoaderFileSystem {
  return {
    readdir: async directory => readdir(directory, { withFileTypes: true }),
    readFile: readFileOverride ?? (async filepath => readFile(filepath, 'utf8')),
  }
}

async function createSkillsDirectory(files: Record<string, string>) {
  const directory = await mkdtemp(join(tmpdir(), 'alicization-skills-test-'))
  sandboxDirectories.push(directory)

  await Promise.all(Object.entries(files).map(async ([name, content]) => {
    const skillDirectory = join(directory, name)
    await mkdir(skillDirectory, { recursive: true })
    await writeFile(join(skillDirectory, 'SKILL.md'), content, 'utf8')
  }))

  return directory
}

function skillFile(frontmatter: string, instructions = 'Use this skill.') {
  return `---\n${frontmatter.trim()}\n---\n\n${instructions}\n`
}

function createLoader(
  skillsDirectory: string,
  overrides: Partial<{
    toolRegistry: ToolRegistry
    onAudit: (event: AlicizationSkillAuditEvent) => void | Promise<void>
    fileSystem: AlicizationSkillLoaderFileSystem
    readLifecycle: CreateAlicizationSkillLoaderOptions['readLifecycle']
    persistLifecycle: CreateAlicizationSkillLoaderOptions['persistLifecycle']
  }> = {},
): AlicizationSkillLoader {
  return createAlicizationSkillLoader({
    skillsDirectory,
    skillRegistry: createAlicizationSkillRegistry(),
    toolRegistry: overrides.toolRegistry ?? createToolRegistry(),
    projection: projectionOptions,
    availableTools: ['tool.memory.workbench'],
    availablePermissions: ['memory.read'],
    fileSystem: overrides.fileSystem ?? createFileSystem(),
    onAudit: overrides.onAudit,
    readLifecycle: overrides.readLifecycle,
    persistLifecycle: overrides.persistLifecycle,
  })
}

const validFrontmatter = `
id: skill.memory-review
version: 1.0.0
description: Review a memory candidate.
inputSchema:
  type: object
  properties:
    candidateId:
      type: string
outputSchema:
  type: object
dependencies:
  - memory-core
requiredTools:
  - tool.memory.workbench
permissions:
  - memory.read
risk: low
evaluationStatus: approved
activationStatus: active
`

afterEach(async () => {
  await Promise.all(sandboxDirectories.splice(0).map(directory =>
    rm(directory, { recursive: true, force: true })))
})

describe('alicization skill loader', () => {
  it('persists disappearance of an active source without disabling another skill or reviving restored bytes', async () => {
    const source = skillFile(validFrontmatter)
    const directory = await createSkillsDirectory({ 'memory-review': source, 'other-skill': skillFile(validFrontmatter.replace('skill.memory-review', 'skill.other')) })
    const tools = createToolRegistry()
    const audits: AlicizationSkillAuditEvent[] = []
    let saved: SkillLifecycleSnapshot | null = null
    let writes = 0
    const persistence = {
      readLifecycle: async () => saved,
      persistLifecycle: async (snapshot: SkillLifecycleSnapshot) => { saved = structuredClone(snapshot); writes++ },
    }
    const loader = createLoader(directory, { toolRegistry: tools, ...persistence, onAudit: (event) => { audits.push(event) } })
    expect(await loader.projectProduction()).toHaveLength(2)
    await rm(join(directory, 'memory-review'), { recursive: true })
    expect(await loader.projectProduction()).toMatchObject([{ capabilityId: 'skill.other', activationStatus: 'active' }])
    expect(tools.get('skill.memory-review')?.activationStatus).toBe('disabled')
    expect(audits).toContainEqual(expect.objectContaining({ action: 'invalidate-source', id: 'skill.memory-review', reason: 'source-missing' }))
    expect(writes).toBe(1)
    await loader.discover()
    expect(writes).toBe(1)
    await mkdir(join(directory, 'memory-review'))
    await writeFile(join(directory, 'memory-review/SKILL.md'), source)
    const restarted = createLoader(directory, persistence)
    expect(await restarted.projectProduction()).toMatchObject([{ capabilityId: 'skill.other' }])
    await expect(restarted.activate('skill.memory-review', '1.0.0')).rejects.toThrow('evaluation')
  })

  it('invalidates a source lost between discovery and instruction loading', async () => {
    const directory = await createSkillsDirectory({ 'memory-review': skillFile(validFrontmatter) })
    let armed = false
    let reads = 0
    const tools = createToolRegistry()
    const audits: AlicizationSkillAuditEvent[] = []
    const loader = createLoader(directory, { toolRegistry: tools, onAudit: (event) => { audits.push(event) }, fileSystem: createFileSystem(async (filepath) => {
      if (armed && ++reads === 2)
        throw new Error('Source reader was revoked')
      return readFile(filepath, 'utf8')
    }) })
    await loader.projectProduction()
    armed = true
    await expect(loader.load({ id: 'skill.memory-review', tools: ['tool.memory.workbench'], permissions: ['memory.read'] })).rejects.toThrow('revoked')
    expect(tools.get('skill.memory-review')?.activationStatus).toBe('disabled')
    expect(audits).toContainEqual(expect.objectContaining({ action: 'invalidate-source', reason: 'source-read-failed' }))
    expect(await loader.discover()).toEqual([])
  })

  it('removes a failed evaluation from the executable projection and requires explicit reactivation after repair', async () => {
    const directory = await createSkillsDirectory({ 'memory-review': skillFile(validFrontmatter) })
    const tools = createToolRegistry()
    const loader = createLoader(directory, { toolRegistry: tools })
    await loader.projectProduction()
    await loader.markEvaluation('skill.memory-review', '1.0.0', 'failed')
    expect(tools.resolveActive('skill.memory-review')).toBeUndefined()
    expect(await loader.projectProduction()).toEqual([])
    await loader.markEvaluation('skill.memory-review', '1.0.0', 'approved')
    expect(await loader.projectProduction()).toEqual([])
    await loader.activate('skill.memory-review', '1.0.0')
    await loader.projectProduction()
    expect(tools.resolveActive('skill.memory-review')?.version).toBe('1.0.0')
  })

  it('invalidates an approved projection if the same skill version changes its instructions', async () => {
    const directory = await createSkillsDirectory({ 'memory-review': skillFile(validFrontmatter, 'original reviewed instructions') })
    const tools = createToolRegistry()
    const loader = createLoader(directory, { toolRegistry: tools })
    await loader.projectProduction()
    await writeFile(join(directory, 'memory-review', 'SKILL.md'), skillFile(validFrontmatter, 'changed instructions without evaluation'))
    await expect(loader.load({ id: 'skill.memory-review', tools: ['tool.memory.workbench'], permissions: ['memory.read'] })).rejects.toThrow('source changed')
    expect(tools.resolveActive('skill.memory-review')).toBeUndefined()
  })

  it('discovers YAML metadata without exposing or loading instructions', async () => {
    let readCount = 0
    const skillsDirectory = await createSkillsDirectory({
      'memory-review': skillFile(validFrontmatter, 'private instructions'),
    })
    const loader = createLoader(skillsDirectory, {
      fileSystem: createFileSystem(async (filepath, encoding) => {
        readCount += 1
        return readFile(filepath, encoding)
      }),
    })

    const discovered = await loader.discover({ productionOnly: false })

    expect(discovered).toEqual([expect.objectContaining({
      id: 'skill.memory-review',
      version: '1.0.0',
      description: 'Review a memory candidate.',
      dependencies: ['memory-core'],
      requiredTools: ['tool.memory.workbench'],
      permissions: ['memory.read'],
      risk: 'low',
      evaluationStatus: 'approved',
      activationStatus: 'active',
    })])
    expect(discovered[0]).not.toHaveProperty('instructions')
    expect(readCount).toBe(1)
  })

  it('reads the Markdown body only during explicit load', async () => {
    const skillsDirectory = await createSkillsDirectory({
      'memory-review': skillFile(validFrontmatter, 'private instructions'),
    })
    const loader = createLoader(skillsDirectory)

    await loader.discover()
    const loaded = await loader.load({
      id: 'skill.memory-review',
      tools: ['tool.memory.workbench'],
      permissions: ['memory.read'],
    })

    expect(loaded.instructions).toBe('private instructions')
    expect(loaded.inputSchema).toMatchObject({
      type: 'object',
      properties: {
        candidateId: { type: 'string' },
      },
    })
  })

  it('rejects a skill when any required metadata field is missing', async () => {
    const skillsDirectory = await createSkillsDirectory({
      incomplete: skillFile(`
id: skill.incomplete
version: 1.0.0
description: Missing output schema.
inputSchema: {}
dependencies: []
requiredTools: []
permissions: []
risk: low
evaluationStatus: unvalidated
activationStatus: candidate
`),
    })
    const loader = createLoader(skillsDirectory)

    await expect(loader.discover({ productionOnly: false }))
      .rejects
      .toThrow('outputSchema')
  })

  it('rejects a YAML object field with the wrong shape', async () => {
    const skillsDirectory = await createSkillsDirectory({
      invalid: skillFile(validFrontmatter
        .replace(
          'inputSchema:\n  type: object\n  properties:\n    candidateId:\n      type: string\noutputSchema:',
          'inputSchema: []\noutputSchema:',
        )),
    })
    const loader = createLoader(skillsDirectory)

    await expect(loader.discover({ productionOnly: false }))
      .rejects
      .toThrow('inputSchema must be an object')
  })

  it('does not project an unapproved candidate to the production ToolRegistry', async () => {
    const skillsDirectory = await createSkillsDirectory({
      candidate: skillFile(validFrontmatter
        .replace('evaluationStatus: approved', 'evaluationStatus: unvalidated')
        .replace('activationStatus: active', 'activationStatus: candidate')),
    })
    const toolRegistry = createToolRegistry()
    const loader = createLoader(skillsDirectory, { toolRegistry })

    await loader.discover({ productionOnly: false })

    await expect(loader.projectProduction()).resolves.toEqual([])
    expect(toolRegistry.get('skill.memory-review')).toBeUndefined()
  })

  it('validates required tools and permissions before production projection', async () => {
    const skillsDirectory = await createSkillsDirectory({
      'memory-review': skillFile(validFrontmatter),
    })
    const loader = createLoader(skillsDirectory)

    await loader.discover()

    await expect(loader.projectProduction({
      availableTools: [],
      availablePermissions: ['memory.read'],
    })).rejects.toThrow('required tool')
    await expect(loader.projectProduction({
      availableTools: ['tool.memory.workbench'],
      availablePermissions: [],
    })).rejects.toThrow('required permission')
  })

  it('projects approved active skills with explicit capability semantics', async () => {
    const skillsDirectory = await createSkillsDirectory({
      'memory-review': skillFile(validFrontmatter),
    })
    const toolRegistry = createToolRegistry()
    const loader = createLoader(skillsDirectory, { toolRegistry })

    const projected = await loader.projectProduction()

    expect(projected).toEqual([expect.objectContaining({
      capabilityId: 'skill.memory-review',
      kind: 'skill',
      version: '1.0.0',
      description: 'Review a memory candidate.',
      inputSchema: {
        type: 'object',
        properties: {
          candidateId: { type: 'string' },
        },
      },
      outputSchema: { type: 'object' },
      permissions: ['memory.read'],
      risk: 'low',
      evaluationStatus: 'passed',
      activationStatus: 'active',
      providerToolName: 'skill_skill_memory-review',
      adapterToolName: 'skill_adapter_skill_memory-review',
    })])
    expect(toolRegistry.get('skill.memory-review')).toMatchObject({
      capabilityId: 'skill.memory-review',
      kind: 'skill',
      evaluationStatus: 'passed',
      activationStatus: 'active',
    })
  })

  it('replaces the production projection when a newer skill version is activated', async () => {
    const skillsDirectory = await createSkillsDirectory({
      'memory-review-v1': skillFile(validFrontmatter.replace('activationStatus: active', 'activationStatus: candidate')),
      'memory-review-v2': skillFile(validFrontmatter
        .replace('version: 1.0.0', 'version: 2.0.0')
        .replace('activationStatus: active', 'activationStatus: candidate')),
    })
    const toolRegistry = createToolRegistry()
    const loader = createLoader(skillsDirectory, { toolRegistry })

    await loader.discover({ productionOnly: false })
    await loader.activate('skill.memory-review', '1.0.0')
    await loader.projectProduction()
    expect(toolRegistry.get('skill.memory-review')).toMatchObject({ version: '1.0.0' })

    await loader.activate('skill.memory-review', '2.0.0')
    await loader.projectProduction()

    expect(toolRegistry.get('skill.memory-review')).toMatchObject({
      version: '2.0.0',
      activationStatus: 'active',
    })
  })

  it('emits audit events for activation, rollback, and revoke', async () => {
    const skillsDirectory = await createSkillsDirectory({
      'memory-review-v1': skillFile(validFrontmatter.replace('activationStatus: active', 'activationStatus: candidate')),
      'memory-review-v2': skillFile(validFrontmatter
        .replace('version: 1.0.0', 'version: 2.0.0')
        .replace('activationStatus: active', 'activationStatus: candidate')),
    })
    const events: AlicizationSkillAuditEvent[] = []
    const loader = createLoader(skillsDirectory, {
      onAudit: (event) => {
        events.push(event)
      },
    })

    await loader.discover({ productionOnly: false })
    await loader.activate('skill.memory-review', '1.0.0')
    await loader.rollback('skill.memory-review', '2.0.0')
    await loader.revoke('skill.memory-review', '2.0.0')

    expect(events.map(event => [event.action, event.id, event.version])).toEqual([
      ['activate', 'skill.memory-review', '1.0.0'],
      ['rollback', 'skill.memory-review', '2.0.0'],
      ['revoke', 'skill.memory-review', '2.0.0'],
    ])
    expect(events).toEqual(expect.arrayContaining([
      expect.objectContaining({
        action: 'activate',
        previousActivationStatus: 'candidate',
        activationStatus: 'active',
      }),
      expect.objectContaining({
        action: 'rollback',
        activationStatus: 'active',
      }),
      expect.objectContaining({
        action: 'revoke',
        previousActivationStatus: 'active',
        activationStatus: 'revoked',
      }),
    ]))
  })
})
