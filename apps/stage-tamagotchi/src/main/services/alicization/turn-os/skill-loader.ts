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

import { createHash } from 'node:crypto'
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

export type AlicizationSkillAuditAction = 'activate' | 'rollback' | 'revoke' | 'invalidate-source'

export interface AlicizationSkillAuditEvent {
  type: 'skill.lifecycle'
  action: AlicizationSkillAuditAction
  id: string
  version: string
  previousActivationStatus: AlicizationSkillActivationStatus
  activationStatus: AlicizationSkillActivationStatus
  evaluationStatus: AlicizationSkillEvaluationStatus
  occurredAt: number
  reason?: 'source-missing' | 'source-changed' | 'source-read-failed'
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
  maxVersions?: number
  skillsDirectory: string
  skillRegistry: AlicizationSkillRegistry
  toolRegistry: ToolRegistry
  projection: AlicizationSkillProjectionOptions
  availableTools: readonly string[]
  availablePermissions: readonly string[]
  fileSystem?: AlicizationSkillLoaderFileSystem
  now?: () => number
  onAudit?: (event: AlicizationSkillAuditEvent) => void | Promise<void>
  readLifecycle?: () => Promise<SkillLifecycleSnapshot | null>
  persistLifecycle?: (state: SkillLifecycleSnapshot) => Promise<void>
}

export interface SkillLifecycleSnapshot {
  version: 1
  items: Array<{ id: string, version: string, sourceHash: string, evaluationStatus: AlicizationSkillEvaluationStatus, activationStatus: AlicizationSkillActivationStatus }>
}

interface SkillFileEntry {
  manifest: AlicizationSkillManifest
  sourceHash: string
  filepath: string
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
  const maxVersions = options.maxVersions ?? 128
  if (!Number.isSafeInteger(maxVersions) || maxVersions < 1 || maxVersions > 4096)
    throw new RangeError('Skill version budget must be between 1 and 4096')

  const fileSystem = options.fileSystem ?? defaultFileSystem
  const now = options.now ?? Date.now
  const entries = new Map<string, SkillFileEntry>()
  let restoration: Promise<SkillLifecycleSnapshot | null> | undefined
  let lifecycleTail: Promise<unknown> = Promise.resolve()
  function serialize<T>(task: () => Promise<T>) {
    const result = lifecycleTail.then(task)
    lifecycleTail = result.catch(() => {})
    return result
  }
  async function persistLifecycle() {
    if (!options.persistLifecycle)
      return
    const discoveries = await options.skillRegistry.discover({ productionOnly: false })
    const present = new Set(discoveries.map(item => key(item.id, item.version)))
    const saved = restoration ? await restoration : null
    const items = [...(saved?.items ?? []).filter(item => !present.has(key(item.id, item.version))), ...discoveries.map(({ id, version, evaluationStatus, activationStatus }) => ({ id, version, evaluationStatus, activationStatus, sourceHash: entries.get(key(id, version))!.sourceHash }))]
    try { await options.persistLifecycle({ version: 1, items }) }
    catch (error) {
      // Failed persistence must never leave a newly activated executable behind.
      for (const item of discoveries.filter(item => item.activationStatus === 'active')) {
        await options.skillRegistry.markEvaluation(item.id, item.version, 'failed')
        const projected = options.toolRegistry.get(item.id)
        if (projected?.version === item.version)
          options.toolRegistry.setActivationStatus(item.id, 'disabled')
      }
      throw error
    }
  }

  async function readEntry(filepath: string) {
    const raw = await fileSystem.readFile(filepath, 'utf8')
    if (raw.length > 262_144)
      throw new Error('Skill source exceeds its instruction budget')
    const sourceHash = createHash('sha256').update(raw).digest('hex')
    const { metadata } = parseFrontmatter(raw, filepath)
    const manifest = manifestFromMetadata(metadata, filepath, async () => {
      let instructionsRaw: string
      try { instructionsRaw = await fileSystem.readFile(filepath, 'utf8') }
      catch (error) {
        await serialize(() => invalidateSource(manifest.id, manifest.version, 'source-read-failed'))
        throw error
      }
      if (createHash('sha256').update(instructionsRaw).digest('hex') !== sourceHash) {
        await serialize(() => invalidateSource(manifest.id, manifest.version, 'source-changed'))
        throw new Error(`skill source changed without a new evaluated version: ${filepath}`)
      }
      const { body } = parseFrontmatter(instructionsRaw, filepath)
      return requiredText(body, `${filepath} instructions`)
    })
    return { manifest, sourceHash, filepath }
  }

  async function invalidateSource(id: string, version: string, reason: NonNullable<AlicizationSkillAuditEvent['reason']>) {
    const before = (await options.skillRegistry.discover({ productionOnly: false })).find(item => item.id === id && item.version === version)
    if (!before || before.evaluationStatus === 'failed')
      return
    const manifest = await options.skillRegistry.markEvaluation(id, version, 'failed')
    const projected = options.toolRegistry.get(id)
    if (projected?.version === version)
      options.toolRegistry.setActivationStatus(id, 'disabled')
    await persistLifecycle()
    await options.onAudit?.({ type: 'skill.lifecycle', action: 'invalidate-source', id, version, reason, previousActivationStatus: before.activationStatus, activationStatus: manifest.activationStatus, evaluationStatus: manifest.evaluationStatus, occurredAt: now() })
  }

  async function discover(optionsInput?: { productionOnly?: boolean }) {
    restoration ??= options.readLifecycle?.() ?? Promise.resolve(null)
    const saved = await restoration
    const directories = [...await fileSystem.readdir(options.skillsDirectory)]
      .filter(directory => directory.isDirectory())
      .sort((left, right) => left.name.localeCompare(right.name))
    if (directories.length > maxVersions)
      throw new Error('Skill discovery exceeds its version budget')

    const present = new Set<string>()
    let discoveryError: unknown
    for (const directory of directories) {
      const filepath = join(options.skillsDirectory, directory.name, skillFileName)
      let entry: SkillFileEntry
      try { entry = await readEntry(filepath) }
      catch (error) {
        for (const previous of entries.values()) {
          if (previous.filepath === filepath)
            await invalidateSource(previous.manifest.id, previous.manifest.version, 'source-read-failed')
        }
        if (!error || typeof error !== 'object' || !('code' in error) || error.code !== 'ENOENT')
          discoveryError ??= error
        continue
      }
      const manifestKey = key(entry.manifest.id, entry.manifest.version)
      present.add(manifestKey)
      if (!entries.has(manifestKey)) {
        const previous = saved?.items.find(item => key(item.id, item.version) === manifestKey)
        const knownId = saved?.items.some(item => item.id === entry.manifest.id)
        if (previous && previous.sourceHash !== entry.sourceHash) {
          if (previous.evaluationStatus !== 'failed' || previous.activationStatus === 'active') {
            const previousActivationStatus = previous.activationStatus
            previous.evaluationStatus = 'failed'
            if (previous.activationStatus === 'active')
              previous.activationStatus = 'candidate'
            await persistLifecycle()
            await options.onAudit?.({ type: 'skill.lifecycle', action: 'invalidate-source', id: previous.id, version: previous.version, reason: 'source-changed', previousActivationStatus, activationStatus: previous.activationStatus, evaluationStatus: previous.evaluationStatus, occurredAt: now() })
          }
          throw new Error(`skill source changed without a new evaluated version: ${filepath}`)
        }
        const state = previous?.sourceHash === entry.sourceHash ? { evaluationStatus: previous.evaluationStatus, activationStatus: previous.activationStatus } : previous || knownId ? { evaluationStatus: 'unvalidated' as const, activationStatus: 'candidate' as const } : {}
        entry.manifest = { ...entry.manifest, ...state }
        options.skillRegistry.register(entry.manifest)
        entries.set(manifestKey, entry)
      }
      else if (entries.get(manifestKey)!.sourceHash !== entry.sourceHash) {
        await invalidateSource(entry.manifest.id, entry.manifest.version, 'source-changed')
        throw new Error(`skill source changed without a new evaluated version: ${filepath}`)
      }
    }

    // Removal includes managed procedures whose source evidence was withdrawn.
    // Keep the failed historical version, but never its executable projection.
    for (const [entryKey, entry] of entries) {
      if (!present.has(entryKey))
        await invalidateSource(entry.manifest.id, entry.manifest.version, 'source-missing')
    }
    const missingAtBoot = (saved?.items ?? []).filter(item => !present.has(key(item.id, item.version)) && !entries.has(key(item.id, item.version)) && item.evaluationStatus !== 'failed')
    const missingAudits: AlicizationSkillAuditEvent[] = []
    for (const item of missingAtBoot) {
      const previousActivationStatus = item.activationStatus
      item.evaluationStatus = 'failed'
      if (item.activationStatus === 'active')
        item.activationStatus = 'candidate'
      missingAudits.push({ type: 'skill.lifecycle', action: 'invalidate-source', id: item.id, version: item.version, reason: 'source-missing', previousActivationStatus, activationStatus: item.activationStatus, evaluationStatus: item.evaluationStatus, occurredAt: now() })
    }
    if (missingAtBoot.length) {
      // Persist absence even when this fresh registry has never loaded the file.
      // Restoring it later must not resurrect an old activation checkpoint.
      await persistLifecycle()
      for (const event of missingAudits)
        await options.onAudit?.(event)
    }
    if (discoveryError)
      throw discoveryError
    return options.skillRegistry.discover(optionsInput)
  }

  async function load(request: AlicizationSkillLoadRequest) {
    await lifecycleTail
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
    const projected = options.toolRegistry.get(id)
    if (projected?.version === version && status !== 'approved')
      options.toolRegistry.setActivationStatus(id, 'disabled')
    const entry = entries.get(key(manifest.id, manifest.version))
    if (entry)
      entry.manifest = { ...entry.manifest, evaluationStatus: status }
    await persistLifecycle()
    return manifest
  }

  async function projectProduction(input: {
    availableTools?: readonly string[]
    availablePermissions?: readonly string[]
  } = {}) {
    await lifecycleTail
    const availableTools = input.availableTools ?? options.availableTools
    const availablePermissions = input.availablePermissions ?? options.availablePermissions
    const discoveries = await discover()
    for (const projected of options.toolRegistry.list().filter(item => item.kind === 'skill')) {
      if (!discoveries.some(item => item.id === projected.capabilityId && item.version === projected.version))
        options.toolRegistry.setActivationStatus(projected.capabilityId, 'disabled')
    }

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
      if (existing?.version === manifest.version && existing.activationStatus === 'active') {
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
    action: 'activate' | 'rollback' | 'revoke',
    id: string,
    version: string,
  ) {
    await discover({ productionOnly: false })
    const before = (await options.skillRegistry.discover({ productionOnly: false }))
      .find(item => item.id === id && item.version === version)
    if (!before)
      throw new Error(`skill ${id}@${version} was not found`)

    const manifest = await options.skillRegistry[action](id, version)
    await persistLifecycle()
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
    discover: options => lifecycleTail.then(() => discover(options)),
    load,
    markEvaluation: (id, version, status) => serialize(() => markEvaluation(id, version, status)),
    projectProduction,
    activate: (id, version) => serialize(() => transition('activate', id, version)),
    rollback: (id, version) => serialize(() => transition('rollback', id, version)),
    revoke: (id, version) => serialize(() => transition('revoke', id, version)),
  }
}
