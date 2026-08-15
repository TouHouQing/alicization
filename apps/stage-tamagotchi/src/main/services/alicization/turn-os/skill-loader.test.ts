import type {
  AlicizationSkillAuditEvent,
  AlicizationSkillLoader,
  AlicizationSkillLoaderFileSystem,
  AlicizationSkillProjectionOptions,
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
