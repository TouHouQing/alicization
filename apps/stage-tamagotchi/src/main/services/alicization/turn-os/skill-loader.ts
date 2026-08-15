import type { Dirent } from 'node:fs'

import type {
  AlicizationLoadedSkill,
  AlicizationSkillActivationStatus,
  AlicizationSkillDiscovery,
  AlicizationSkillEvaluationStatus,
  AlicizationSkillLoadRequest,
  AlicizationSkillManifest,
  AlicizationSkillRegistry,
  AlicizationSkillRisk,
} from './skill-registry'
import type {
  CapabilityIdempotency,
  CapabilityManifest,
  CapabilityScope,
  ToolRegistry,
} from './tool-registry'

import { readdir as readDirectory, readFile as readTextFile } from 'node:fs/promises'
import { join } from 'node:path'

import { parse as parseYaml } from 'yaml'

const skillFileName = 'SKILL.md'
const skillRisks = new Set<AlicizationSkillRisk>(['low', 'medium', 'high', 'critical'])
const evaluationStatuses = new Set<AlicizationSkillEvaluationStatus>([
  'unvalidated',
  'sandbox-passed',
  'replay-passed',
  'approved',
  'failed',
])
const activationStatuses = new Set<AlicizationSkillActivationStatus>([
  'candidate',
  'active',
  'rolled-back',
  'revoked',
])

export interface AlicizationSkillLoaderFileSystem {
  readdir: (directory: string) => Promise<readonly Pick<Dirent, 'name' | 'isDirectory'>[]>
  readFile: (filepath: string, encoding: 'utf8') => Promise<string>
}

export interface AlicizationSkillProjectionOptions {
  scope: CapabilityScope
  executionChannel: string
  timeoutMs: number
  supportsProgress: boolean
  supportsCancellation: boolean
  idempotency: CapabilityIdempotency
  providerToolName: (skill: AlicizationSkillDiscovery) => string
  adapterToolName: (skill: AlicizationSkillDiscovery) => string
}

export type AlicizationSkillAuditAction = 'activate' | 'rollback' | 'revoke'

export interface AlicizationSkillAuditEvent {
  type: 'skill.lifecycle'
  action: AlicizationSkillAuditAction
  id: string
  version: string
  previousActivationStatus: AlicizationSkillActivationStatus
  activationStatus: AlicizationSkillActivationStatus
  evaluationStatus: AlicizationSkillEvaluationStatus
  occurredAt: number
}

export interface AlicizationSkillLoader {
  discover: (options?: { productionOnly?: boolean }) => Promise<AlicizationSkillDiscovery[]>
  load: (request: AlicizationSkillLoadRequest) => Promise<AlicizationLoadedSkill>
  markEvaluation: (
    id: string,
    version: string,
    status: AlicizationSkillEvaluationStatus,
  ) => Promise<AlicizationSkillManifest>
  projectProduction: (options?: {
    availableTools?: readonly string[]
    availablePermissions?: readonly string[]
  }) => Promise<CapabilityManifest[]>
  activate: (id: string, version: string) => Promise<AlicizationSkillManifest>
  rollback: (id: string, version: string) => Promise<AlicizationSkillManifest>
  revoke: (id: string, version: string) => Promise<AlicizationSkillManifest>
}

export interface CreateAlicizationSkillLoaderOptions {
  skillsDirectory: string
  skillRegistry: AlicizationSkillRegistry
  toolRegistry: ToolRegistry
  projection: AlicizationSkillProjectionOptions
  availableTools: readonly string[]
  availablePermissions: readonly string[]
  fileSystem?: AlicizationSkillLoaderFileSystem
  now?: () => number
  onAudit?: (event: AlicizationSkillAuditEvent) => void | Promise<void>
}

interface SkillFileEntry {
  manifest: AlicizationSkillManifest
}

const defaultFileSystem: AlicizationSkillLoaderFileSystem = {
  readdir: async directory => readDirectory(directory, { withFileTypes: true }),
  readFile: async (filepath, encoding) => readTextFile(filepath, encoding),
}

function key(id: string, version: string) {
  return `${id}@${version}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function requiredText(value: unknown, label: string) {
  if (typeof value !== 'string' || !value.trim())
    throw new TypeError(`${label} must be a non-empty string`)
  return value.trim()
}

function requiredObject(value: unknown, label: string) {
  if (!isRecord(value))
    throw new TypeError(`${label} must be an object`)
  return structuredClone(value)
}

function requiredStringList(value: unknown, label: string) {
  if (!Array.isArray(value))
    throw new TypeError(`${label} must be an array`)

  return value.map((item, index) => requiredText(item, `${label}[${index}]`))
}

function requiredEnum<T extends string>(
  value: unknown,
  values: ReadonlySet<T>,
  label: string,
): T {
  const normalized = requiredText(value, label) as T
  if (!values.has(normalized))
    throw new TypeError(`${label} has an unsupported value: ${normalized}`)
  return normalized
}

function parseFrontmatter(raw: string, filepath: string) {
  const normalized = raw.replace(/^\uFEFF/u, '')
  const match = normalized.match(/^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/u)
  if (!match)
    throw new Error(`${filepath} must start with YAML frontmatter`)

  const metadata = parseYaml(match[1]) as unknown
  if (!isRecord(metadata))
    throw new TypeError(`${filepath} frontmatter must be an object`)

  return {
    metadata,
    body: normalized.slice(match[0].length).trim(),
  }
}

function manifestFromMetadata(
  metadata: Record<string, unknown>,
  filepath: string,
  loadInstructions: () => Promise<string>,
): AlicizationSkillManifest {
  return {
    id: requiredText(metadata.id, `${filepath} id`),
    version: requiredText(metadata.version, `${filepath} version`),
    description: requiredText(metadata.description, `${filepath} description`),
    inputSchema: requiredObject(metadata.inputSchema, `${filepath} inputSchema`),
    outputSchema: requiredObject(metadata.outputSchema, `${filepath} outputSchema`),
    dependencies: requiredStringList(metadata.dependencies, `${filepath} dependencies`),
    requiredTools: requiredStringList(metadata.requiredTools, `${filepath} requiredTools`),
    permissions: requiredStringList(metadata.permissions, `${filepath} permissions`),
    risk: requiredEnum(metadata.risk, skillRisks, `${filepath} risk`),
    evaluationStatus: requiredEnum(
      metadata.evaluationStatus,
      evaluationStatuses,
      `${filepath} evaluationStatus`,
    ),
    activationStatus: requiredEnum(
      metadata.activationStatus,
      activationStatuses,
      `${filepath} activationStatus`,
    ),
    loadInstructions,
  }
}

function assertProjectionOptions(options: AlicizationSkillProjectionOptions) {
  if (!options.executionChannel.trim())
    throw new TypeError('skill projection executionChannel must not be empty')
  if (!Number.isSafeInteger(options.timeoutMs) || options.timeoutMs <= 0)
    throw new TypeError('skill projection timeoutMs must be a positive integer')
  if (typeof options.providerToolName !== 'function')
    throw new TypeError('skill projection providerToolName must be a function')
  if (typeof options.adapterToolName !== 'function')
    throw new TypeError('skill projection adapterToolName must be a function')
}

function assertRequirement(
  values: readonly string[],
  required: readonly string[],
  label: string,
) {
  const available = new Set(values.map(value => requiredText(value, `${label} value`)))
  const missing = required.find(value => !available.has(value))
  if (missing)
    throw new Error(`skill is missing required ${label}: ${missing}`)
}

function cloneManifest(manifest: CapabilityManifest) {
  return structuredClone(manifest)
}

export function createAlicizationSkillLoader(
  options: CreateAlicizationSkillLoaderOptions,
): AlicizationSkillLoader {
  assertProjectionOptions(options.projection)

  const fileSystem = options.fileSystem ?? defaultFileSystem
  const now = options.now ?? Date.now
  const entries = new Map<string, SkillFileEntry>()

  async function readEntry(filepath: string) {
    const raw = await fileSystem.readFile(filepath, 'utf8')
    const { metadata } = parseFrontmatter(raw, filepath)
    const manifest = manifestFromMetadata(metadata, filepath, async () => {
      const instructionsRaw = await fileSystem.readFile(filepath, 'utf8')
      const { body } = parseFrontmatter(instructionsRaw, filepath)
      return requiredText(body, `${filepath} instructions`)
    })
    return { manifest }
  }

  async function discover(optionsInput?: { productionOnly?: boolean }) {
    const directories = [...await fileSystem.readdir(options.skillsDirectory)]
      .filter(directory => directory.isDirectory())
      .sort((left, right) => left.name.localeCompare(right.name))

    for (const directory of directories) {
      const filepath = join(options.skillsDirectory, directory.name, skillFileName)
      const entry = await readEntry(filepath)
      const manifestKey = key(entry.manifest.id, entry.manifest.version)
      if (!entries.has(manifestKey)) {
        options.skillRegistry.register(entry.manifest)
        entries.set(manifestKey, entry)
      }
    }

    return options.skillRegistry.discover(optionsInput)
  }

  async function load(request: AlicizationSkillLoadRequest) {
    await discover({ productionOnly: false })
    return options.skillRegistry.load(request)
  }

  async function markEvaluation(
    id: string,
    version: string,
    status: AlicizationSkillEvaluationStatus,
  ) {
    await discover({ productionOnly: false })
    const manifest = await options.skillRegistry.markEvaluation(id, version, status)
    const entry = entries.get(key(manifest.id, manifest.version))
    if (entry)
      entry.manifest = { ...entry.manifest, evaluationStatus: status }
    return manifest
  }

  async function projectProduction(input: {
    availableTools?: readonly string[]
    availablePermissions?: readonly string[]
  } = {}) {
    const availableTools = input.availableTools ?? options.availableTools
    const availablePermissions = input.availablePermissions ?? options.availablePermissions
    const discoveries = await discover()
    const projected: CapabilityManifest[] = []

    for (const discovery of discoveries) {
      assertRequirement(availableTools, discovery.requiredTools, 'tool')
      assertRequirement(availablePermissions, discovery.permissions, 'permission')

      const entry = entries.get(key(discovery.id, discovery.version))
      if (!entry)
        throw new Error(`skill ${discovery.id}@${discovery.version} has no loaded metadata`)

      const manifest: CapabilityManifest = {
        capabilityId: discovery.id,
        kind: 'skill',
        version: discovery.version,
        description: discovery.description,
        inputSchema: structuredClone(entry.manifest.inputSchema),
        outputSchema: structuredClone(entry.manifest.outputSchema),
        scope: options.projection.scope,
        permissions: [...discovery.permissions],
        risk: discovery.risk,
        executionChannel: options.projection.executionChannel,
        timeoutMs: options.projection.timeoutMs,
        supportsProgress: options.projection.supportsProgress,
        supportsCancellation: options.projection.supportsCancellation,
        idempotency: options.projection.idempotency,
        evaluationStatus: 'passed',
        activationStatus: 'active',
        providerToolName: requiredText(
          options.projection.providerToolName(discovery),
          `${discovery.id} providerToolName`,
        ),
        adapterToolName: requiredText(
          options.projection.adapterToolName(discovery),
          `${discovery.id} adapterToolName`,
        ),
      }

      const existing = options.toolRegistry.get(manifest.capabilityId)
      if (existing?.version === manifest.version) {
        projected.push(existing)
        continue
      }

      projected.push(existing
        ? options.toolRegistry.replace(manifest)
        : options.toolRegistry.register(manifest))
    }

    return projected.map(cloneManifest)
  }

  async function transition(
    action: AlicizationSkillAuditAction,
    id: string,
    version: string,
  ) {
    await discover({ productionOnly: false })
    const before = (await options.skillRegistry.discover({ productionOnly: false }))
      .find(item => item.id === id && item.version === version)
    if (!before)
      throw new Error(`skill ${id}@${version} was not found`)

    const manifest = await options.skillRegistry[action](id, version)
    const projected = options.toolRegistry.get(id)
    if (projected && projected.version === version)
      options.toolRegistry.setActivationStatus(id, action === 'revoke' ? 'revoked' : 'active')

    await options.onAudit?.({
      type: 'skill.lifecycle',
      action,
      id: manifest.id,
      version: manifest.version,
      previousActivationStatus: before.activationStatus,
      activationStatus: manifest.activationStatus,
      evaluationStatus: manifest.evaluationStatus,
      occurredAt: now(),
    })

    const entry = entries.get(key(manifest.id, manifest.version))
    if (entry) {
      entry.manifest = {
        ...entry.manifest,
        activationStatus: manifest.activationStatus,
        evaluationStatus: manifest.evaluationStatus,
      }
    }

    return manifest
  }

  return {
    discover,
    load,
    markEvaluation,
    projectProduction,
    activate: (id, version) => transition('activate', id, version),
    rollback: (id, version) => transition('rollback', id, version),
    revoke: (id, version) => transition('revoke', id, version),
  }
}
