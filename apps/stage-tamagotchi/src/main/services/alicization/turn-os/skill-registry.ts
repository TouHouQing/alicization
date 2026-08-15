export type AlicizationSkillRisk = 'low' | 'medium' | 'high' | 'critical'

export type AlicizationSkillEvaluationStatus
  = | 'unvalidated'
    | 'sandbox-passed'
    | 'replay-passed'
    | 'approved'
    | 'failed'

export type AlicizationSkillActivationStatus
  = | 'candidate'
    | 'active'
    | 'rolled-back'
    | 'revoked'

export interface AlicizationSkillManifest {
  id: string
  version: string
  description: string
  inputSchema: Record<string, unknown>
  outputSchema: Record<string, unknown>
  dependencies: string[]
  requiredTools: string[]
  permissions: string[]
  risk: AlicizationSkillRisk
  evaluationStatus: AlicizationSkillEvaluationStatus
  activationStatus: AlicizationSkillActivationStatus
  loadInstructions: () => Promise<string>
}

export interface AlicizationSkillDiscovery {
  id: string
  version: string
  description: string
  dependencies: string[]
  requiredTools: string[]
  permissions: string[]
  risk: AlicizationSkillRisk
  evaluationStatus: AlicizationSkillEvaluationStatus
  activationStatus: AlicizationSkillActivationStatus
}

export interface AlicizationLoadedSkill extends AlicizationSkillDiscovery {
  inputSchema: Record<string, unknown>
  outputSchema: Record<string, unknown>
  instructions: string
}

export interface AlicizationSkillLoadRequest {
  id: string
  version?: string
  tools: string[]
  permissions: string[]
}

export interface AlicizationSkillRegistry {
  register: (manifest: AlicizationSkillManifest) => void
  discover: (options?: { productionOnly?: boolean }) => Promise<AlicizationSkillDiscovery[]>
  load: (request: AlicizationSkillLoadRequest) => Promise<AlicizationLoadedSkill>
  markEvaluation: (
    id: string,
    version: string,
    status: AlicizationSkillEvaluationStatus,
  ) => Promise<AlicizationSkillManifest>
  activate: (id: string, version: string) => Promise<AlicizationSkillManifest>
  rollback: (id: string, version: string) => Promise<AlicizationSkillManifest>
  revoke: (id: string, version: string) => Promise<AlicizationSkillManifest>
}

const productionEvaluationStatuses = new Set<AlicizationSkillEvaluationStatus>([
  'approved',
])

function normalizeText(value: unknown, label: string) {
  if (typeof value !== 'string' || !value.trim())
    throw new TypeError(`${label} must not be empty`)
  return value.trim()
}

function normalizeList(values: unknown, label: string) {
  if (!Array.isArray(values))
    throw new TypeError(`${label} must be an array`)
  return [...new Set(values.map((value, index) =>
    normalizeText(value, `${label}[${index}]`)))]
}

function normalizeManifest(input: AlicizationSkillManifest): AlicizationSkillManifest {
  return {
    ...input,
    id: normalizeText(input.id, 'skill id'),
    version: normalizeText(input.version, 'skill version'),
    description: normalizeText(input.description, 'skill description'),
    inputSchema: input.inputSchema ?? {},
    outputSchema: input.outputSchema ?? {},
    dependencies: normalizeList(input.dependencies, 'skill dependencies'),
    requiredTools: normalizeList(input.requiredTools, 'skill requiredTools'),
    permissions: normalizeList(input.permissions, 'skill permissions'),
    loadInstructions: input.loadInstructions,
  }
}

function cloneManifest(manifest: AlicizationSkillManifest): AlicizationSkillManifest {
  return {
    ...manifest,
    inputSchema: structuredClone(manifest.inputSchema),
    outputSchema: structuredClone(manifest.outputSchema),
    dependencies: [...manifest.dependencies],
    requiredTools: [...manifest.requiredTools],
    permissions: [...manifest.permissions],
    loadInstructions: manifest.loadInstructions,
  }
}

function discoveryFromManifest(manifest: AlicizationSkillManifest): AlicizationSkillDiscovery {
  const {
    id,
    version,
    description,
    dependencies,
    requiredTools,
    permissions,
    risk,
    evaluationStatus,
    activationStatus,
  } = manifest
  return {
    id,
    version,
    description,
    dependencies: [...dependencies],
    requiredTools: [...requiredTools],
    permissions: [...permissions],
    risk,
    evaluationStatus,
    activationStatus,
  }
}

export function createAlicizationSkillRegistry(input: {
  manifests?: AlicizationSkillManifest[]
} = {}): AlicizationSkillRegistry {
  const manifests = new Map<string, AlicizationSkillManifest>()
  const activeVersions = new Map<string, string>()

  function key(id: string, version: string) {
    return `${id}@${version}`
  }

  function getManifest(id: string, version?: string) {
    const normalizedId = normalizeText(id, 'skill id')
    const resolvedVersion = version
      ? normalizeText(version, 'skill version')
      : activeVersions.get(normalizedId)
        ?? [...manifests.values()]
          .filter(manifest => manifest.id === normalizedId)
          .at(-1)
          ?.version
    if (!resolvedVersion)
      throw new Error(`skill ${normalizedId} was not found`)
    const manifest = manifests.get(key(normalizedId, resolvedVersion))
    if (!manifest)
      throw new Error(`skill ${normalizedId}@${resolvedVersion} was not found`)
    return manifest
  }

  function register(manifestInput: AlicizationSkillManifest) {
    const manifest = normalizeManifest(manifestInput)
    if (typeof manifest.loadInstructions !== 'function')
      throw new TypeError('skill loadInstructions must be a function')
    const manifestKey = key(manifest.id, manifest.version)
    if (manifests.has(manifestKey))
      throw new Error(`skill ${manifestKey} is already registered`)
    manifests.set(manifestKey, cloneManifest(manifest))
    if (manifest.activationStatus === 'active') {
      if (!productionEvaluationStatuses.has(manifest.evaluationStatus))
        throw new Error(`active skill ${manifestKey} must have approved evaluation`)
      activeVersions.set(manifest.id, manifest.version)
    }
  }

  async function discover(options?: { productionOnly?: boolean }) {
    const productionOnly = options?.productionOnly !== false
    const candidates = productionOnly
      ? [...activeVersions.entries()]
          .map(([id, version]) => manifests.get(key(id, version)))
      : [...manifests.values()]
    return candidates
      .filter((manifest): manifest is AlicizationSkillManifest => Boolean(manifest))
      .filter(manifest =>
        !productionOnly
        || (
          manifest.activationStatus === 'active'
          && productionEvaluationStatuses.has(manifest.evaluationStatus)
        ),
      )
      .map(discoveryFromManifest)
  }

  async function load(request: AlicizationSkillLoadRequest) {
    const manifest = getManifest(request.id, request.version)
    if (manifest.activationStatus !== 'active')
      throw new Error(`skill is not active: ${manifest.id}@${manifest.version}`)
    if (!productionEvaluationStatuses.has(manifest.evaluationStatus))
      throw new Error(`skill evaluation has not passed: ${manifest.id}@${manifest.version}`)

    const tools = new Set(normalizeList(request.tools, 'skill request tools'))
    const permissions = new Set(normalizeList(request.permissions, 'skill request permissions'))
    const missingTool = manifest.requiredTools.find(tool => !tools.has(tool))
    if (missingTool)
      throw new Error(`skill is missing required tool: ${missingTool}`)
    const missingPermission = manifest.permissions.find(permission => !permissions.has(permission))
    if (missingPermission)
      throw new Error(`skill is missing required permission: ${missingPermission}`)

    const instructions = normalizeText(await manifest.loadInstructions(), 'skill instructions')
    return {
      ...discoveryFromManifest(manifest),
      inputSchema: structuredClone(manifest.inputSchema),
      outputSchema: structuredClone(manifest.outputSchema),
      instructions,
    }
  }

  async function markEvaluation(
    id: string,
    version: string,
    status: AlicizationSkillEvaluationStatus,
  ) {
    const manifest = getManifest(id, version)
    const next = { ...manifest, evaluationStatus: status }
    manifests.set(key(manifest.id, manifest.version), next)
    return cloneManifest(next)
  }

  async function activate(id: string, version: string) {
    const manifest = getManifest(id, version)
    if (!productionEvaluationStatuses.has(manifest.evaluationStatus))
      throw new Error(`skill evaluation has not passed: ${manifest.id}@${manifest.version}`)
    const previousVersion = activeVersions.get(manifest.id)
    if (previousVersion && previousVersion !== manifest.version) {
      const previous = manifests.get(key(manifest.id, previousVersion))
      if (previous)
        manifests.set(key(previous.id, previous.version), { ...previous, activationStatus: 'rolled-back' })
    }
    const next = { ...manifest, activationStatus: 'active' as const }
    manifests.set(key(next.id, next.version), next)
    activeVersions.set(next.id, next.version)
    return cloneManifest(next)
  }

  async function rollback(id: string, version: string) {
    const manifest = getManifest(id, version)
    if (!productionEvaluationStatuses.has(manifest.evaluationStatus))
      throw new Error(`skill evaluation has not passed: ${manifest.id}@${manifest.version}`)
    const currentVersion = activeVersions.get(manifest.id)
    if (currentVersion && currentVersion !== manifest.version) {
      const current = manifests.get(key(manifest.id, currentVersion))
      if (current)
        manifests.set(key(current.id, current.version), { ...current, activationStatus: 'rolled-back' })
    }
    const next = { ...manifest, activationStatus: 'active' as const }
    manifests.set(key(next.id, next.version), next)
    activeVersions.set(next.id, next.version)
    return cloneManifest(next)
  }

  async function revoke(id: string, version: string) {
    const manifest = getManifest(id, version)
    const next = { ...manifest, activationStatus: 'revoked' as const }
    manifests.set(key(next.id, next.version), next)
    if (activeVersions.get(next.id) === next.version)
      activeVersions.delete(next.id)
    return cloneManifest(next)
  }

  for (const manifest of input.manifests ?? [])
    register(manifest)

  return {
    register,
    discover,
    load,
    markEvaluation,
    activate,
    rollback,
    revoke,
  }
}
