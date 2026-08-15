import type { ErrorObject, ValidateFunction } from 'ajv'

import Ajv from 'ajv'

export type CapabilityKind = 'tool' | 'skill'
export type CapabilityScope = 'user' | 'card' | 'conversation' | 'turn'
export type CapabilityRisk = 'low' | 'medium' | 'high' | 'critical'
export type CapabilityIdempotency = 'required' | 'best-effort' | 'none'
export type CapabilityEvaluationStatus = 'unverified' | 'passed' | 'failed'
export type CapabilityActivationStatus = 'candidate' | 'active' | 'disabled' | 'revoked'

export type JsonSchema = Record<string, unknown>

export interface CapabilityManifest {
  capabilityId: string
  kind: CapabilityKind
  version: string
  description: string
  inputSchema: JsonSchema
  outputSchema: JsonSchema
  scope: CapabilityScope
  permissions: string[]
  risk: CapabilityRisk
  executionChannel: string
  timeoutMs: number
  supportsProgress: boolean
  supportsCancellation: boolean
  idempotency: CapabilityIdempotency
  evaluationStatus: CapabilityEvaluationStatus
  activationStatus: CapabilityActivationStatus
  providerToolName: string
  adapterToolName: string
}

export interface ProviderToolInvocation {
  adapterToolName: string
  capabilityId: string
  providerToolName: string
}

export interface InputValidationSuccess {
  valid: true
  errors: null
}

export interface InputValidationFailure {
  valid: false
  errors: ErrorObject[] | null
}

export type InputValidationResult = InputValidationSuccess | InputValidationFailure

export interface ToolRegistry {
  register: (manifest: CapabilityManifest) => CapabilityManifest
  replace: (manifest: CapabilityManifest) => CapabilityManifest
  allowMcpName: (name: string) => void
  get: (capabilityId: string) => CapabilityManifest | undefined
  list: () => CapabilityManifest[]
  resolveActive: (name: string) => CapabilityManifest | undefined
  resolveProviderInvocation: (
    providerToolName: string,
    input: unknown,
  ) => ProviderToolInvocation | undefined
  projectAdapterToolName: (adapterToolName: string) => string
  isKnownProviderToolName: (providerToolName: string) => boolean
  resolveAdapterToolName: (adapterToolName: string) => CapabilityManifest | undefined
  setActivationStatus: (
    capabilityId: string,
    activationStatus: CapabilityActivationStatus,
  ) => CapabilityManifest
  validateSurface: (names: readonly string[]) => CapabilityManifest[]
  normalizeLegacyToolName: (name: string) => string | undefined
  validateInput: (capabilityIdOrQualifiedName: string, input: unknown) => InputValidationResult
}

export interface DiscoveredMcpCapability {
  name: string
  description?: string
  inputSchema?: unknown
}

export interface CreateToolRegistryOptions {
  mcpAllowlist?: readonly string[]
}

const defaultMcpAllowlist = [
  'filesystem::read_file',
  'filesystem::write_file',
  'filesystem::list_directory',
  'filesystem::search_files',
] as const

const legacyToolNames: Record<string, string> = {
  executor_run_codex: 'coding_agent.codex',
  executor_run_claude_code: 'coding_agent.claude_code',
  executor_run_cli: 'coding_agent.cli',
  executor_run_local_visual: 'local_visual',
  executor_run_openclaw: 'embodied.openclaw',
  executor_run_coding_agent: 'coding_agent',
}

const codingAgentPromptInputSchema: JsonSchema = {
  type: 'object',
  properties: {
    prompt: { type: 'string', minLength: 1 },
    threadId: { type: 'string', minLength: 1 },
  },
  anyOf: [
    { required: ['prompt'] },
    { required: ['threadId'] },
  ],
  additionalProperties: true,
}

const cliInputSchema: JsonSchema = {
  type: 'object',
  properties: {
    command: { type: 'string', minLength: 1 },
    threadId: { type: 'string', minLength: 1 },
  },
  anyOf: [
    { required: ['command'] },
    { required: ['threadId'] },
  ],
  additionalProperties: true,
}

const codingAgentFacadeInputSchema: JsonSchema = {
  type: 'object',
  properties: {
    agent: { type: 'string', enum: ['codex', 'claude-code', 'cli'] },
    command: { type: 'string', minLength: 1 },
    prompt: { type: 'string', minLength: 1 },
    threadId: { type: 'string', minLength: 1 },
  },
  required: ['agent'],
  anyOf: [
    { required: ['prompt'] },
    { required: ['command'] },
    { required: ['threadId'] },
  ],
  additionalProperties: true,
}

const localVisualInputSchema: JsonSchema = {
  type: 'object',
  properties: {
    channel: {
      type: 'string',
      enum: ['browser', 'software', 'desktop'],
    },
    instruction: { type: 'string', minLength: 1 },
    threadId: { type: 'string', minLength: 1 },
  },
  required: ['channel'],
  anyOf: [
    { required: ['instruction'] },
    { required: ['threadId'] },
  ],
  additionalProperties: true,
}

const mcpReadFileInputSchema: JsonSchema = {
  type: 'object',
  properties: {
    path: { type: 'string', minLength: 1 },
  },
  required: ['path'],
  additionalProperties: false,
}

const mcpWriteFileInputSchema: JsonSchema = {
  type: 'object',
  properties: {
    path: { type: 'string', minLength: 1 },
    content: { type: 'string' },
  },
  required: ['path', 'content'],
  additionalProperties: false,
}

const mcpListDirectoryInputSchema: JsonSchema = {
  type: 'object',
  properties: {
    path: { type: 'string', minLength: 1 },
    recursive: { type: 'boolean' },
  },
  required: ['path'],
  additionalProperties: false,
}

const mcpSearchFilesInputSchema: JsonSchema = {
  type: 'object',
  properties: {
    path: { type: 'string', minLength: 1 },
    query: { type: 'string', minLength: 1 },
    recursive: { type: 'boolean' },
    maxResults: { type: 'integer', minimum: 1 },
    caseSensitive: { type: 'boolean' },
    regex: { type: 'boolean' },
    includeGlobs: {
      type: 'array',
      items: { type: 'string' },
    },
    excludeGlobs: {
      type: 'array',
      items: { type: 'string' },
    },
    pathMode: {
      type: 'string',
      enum: ['absolute', 'raw', 'relative'],
    },
  },
  required: ['path', 'query'],
  additionalProperties: false,
}

const genericBuiltInToolInputSchema: JsonSchema = {
  type: 'object',
  additionalProperties: true,
}

const filesystemEditFileInputSchema: JsonSchema = {
  type: 'object',
  properties: {
    path: { type: 'string', minLength: 1 },
    oldText: { type: 'string' },
    newText: { type: 'string' },
    replaceAll: { type: 'boolean' },
    expectedHash: { type: 'string' },
  },
  required: ['path', 'oldText', 'newText'],
  additionalProperties: false,
}

const filesystemPatchFileInputSchema: JsonSchema = {
  type: 'object',
  properties: {
    path: { type: 'string', minLength: 1 },
    changes: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        properties: {
          oldText: { type: 'string', minLength: 1 },
          newText: { type: 'string' },
          replaceAll: { type: 'boolean' },
        },
        required: ['oldText', 'newText'],
        additionalProperties: false,
      },
    },
    expectedHash: { type: 'string' },
    ignoreMissing: { type: 'boolean' },
    dryRun: { type: 'boolean' },
    maxPreviewBytes: { type: 'integer' },
  },
  required: ['path', 'changes'],
  additionalProperties: false,
}

function createBuiltInManifest(
  toolName: string,
  inputSchema: JsonSchema = genericBuiltInToolInputSchema,
  overrides: Partial<CapabilityManifest> = {},
) {
  return createManifest(`tool.${toolName}`, inputSchema, {
    description: `Built-in Alicization tool ${toolName}.`,
    executionChannel: 'local-tool',
    providerToolName: toolName,
    adapterToolName: toolName,
    ...overrides,
  })
}

function normalizeJsonSchema(raw: unknown): JsonSchema {
  if (raw && typeof raw === 'object' && !Array.isArray(raw))
    return raw as JsonSchema
  return {
    type: 'object',
    additionalProperties: true,
  }
}

function createManifest(
  capabilityId: string,
  inputSchema: JsonSchema,
  overrides: Partial<CapabilityManifest>,
): CapabilityManifest {
  return {
    capabilityId,
    kind: 'tool',
    version: '1.0.0',
    description: capabilityId,
    inputSchema,
    outputSchema: { type: 'object' },
    scope: 'turn',
    permissions: [],
    risk: 'low',
    executionChannel: capabilityId,
    timeoutMs: 30_000,
    supportsProgress: false,
    supportsCancellation: false,
    idempotency: 'none',
    evaluationStatus: 'passed',
    activationStatus: 'active',
    providerToolName: capabilityId,
    adapterToolName: capabilityId,
    ...overrides,
  }
}

function createCanonicalManifests(mcpAllowlist: ReadonlySet<string>): CapabilityManifest[] {
  const manifests = [
    createManifest('coding_agent.codex', codingAgentPromptInputSchema, {
      description: 'Coding agent execution through Codex.',
      executionChannel: 'codex',
      permissions: ['workspace.read', 'workspace.write'],
      risk: 'medium',
      timeoutMs: 120_000,
      supportsProgress: true,
      supportsCancellation: true,
      idempotency: 'required',
      providerToolName: 'codex',
      adapterToolName: 'executor_run_codex',
    }),
    createManifest('coding_agent', codingAgentFacadeInputSchema, {
      description: 'Coding agent facade for an explicitly selected execution channel.',
      executionChannel: 'coding-agent',
      permissions: ['workspace.read', 'workspace.write'],
      risk: 'medium',
      timeoutMs: 120_000,
      supportsProgress: true,
      supportsCancellation: true,
      idempotency: 'required',
      providerToolName: 'coding_agent',
      adapterToolName: 'executor_run_coding_agent',
    }),
    createManifest('coding_agent.claude_code', codingAgentPromptInputSchema, {
      description: 'Coding agent execution through Claude Code.',
      executionChannel: 'claude-code',
      permissions: ['workspace.read', 'workspace.write'],
      risk: 'medium',
      timeoutMs: 120_000,
      supportsProgress: true,
      supportsCancellation: true,
      idempotency: 'required',
      providerToolName: 'claude_code',
      adapterToolName: 'executor_run_claude_code',
    }),
    createManifest('coding_agent.cli', cliInputSchema, {
      description: 'Command execution through the local CLI channel.',
      executionChannel: 'cli',
      permissions: ['workspace.read', 'workspace.write'],
      risk: 'high',
      timeoutMs: 60_000,
      supportsProgress: true,
      supportsCancellation: true,
      idempotency: 'none',
      providerToolName: 'cli',
      adapterToolName: 'executor_run_cli',
    }),
    createManifest('local_visual', localVisualInputSchema, {
      description: 'Local visual inspection.',
      executionChannel: 'local-visual',
      permissions: ['screen.read'],
      risk: 'low',
      timeoutMs: 15_000,
      supportsCancellation: true,
      idempotency: 'best-effort',
      providerToolName: 'local_visual',
      adapterToolName: 'executor_run_local_visual',
    }),
    createManifest('embodied.openclaw', {
      type: 'object',
      properties: {
        instruction: { type: 'string', minLength: 1 },
        threadId: { type: 'string', minLength: 1 },
      },
      anyOf: [
        { required: ['instruction'] },
        { required: ['threadId'] },
      ],
      additionalProperties: true,
    }, {
      description: 'Embodied task execution through the OpenClaw channel.',
      executionChannel: 'openclaw',
      permissions: ['screen.read', 'input.write'],
      risk: 'medium',
      timeoutMs: 120_000,
      supportsProgress: true,
      supportsCancellation: true,
      idempotency: 'required',
      providerToolName: 'openclaw',
      adapterToolName: 'executor_run_openclaw',
    }),
    createBuiltInManifest('set_reminder', {
      type: 'object',
      properties: {
        minutes: { type: 'number' },
        message: { type: 'string' },
      },
      required: ['minutes', 'message'],
      additionalProperties: false,
    }, {
      description: 'Create a local reminder.',
      permissions: ['scheduler.write'],
      risk: 'low',
      idempotency: 'required',
    }),
    createBuiltInManifest('executor_capability_snapshot', {
      type: 'object',
      properties: {
        channels: {
          type: 'array',
          items: { type: 'string' },
        },
      },
      additionalProperties: false,
    }, {
      description: 'Read the available local execution channels.',
      permissions: ['system.read'],
      risk: 'low',
      idempotency: 'best-effort',
    }),
    createBuiltInManifest('sensory_capture_state', {
      type: 'object',
      properties: {
        includeSystemSample: { type: 'boolean' },
      },
      additionalProperties: false,
    }, {
      description: 'Read the local sensory capture state.',
      permissions: ['screen.read'],
      risk: 'low',
      idempotency: 'best-effort',
    }),
    ...[
      'browser_open_url',
      'browser_search_web',
      'browser_read_page',
      'browser_navigate',
      'browser_scroll',
      'browser_wait',
    ].map(toolName => createBuiltInManifest(toolName, genericBuiltInToolInputSchema, {
      description: `Use the local browser for ${toolName.replace('browser_', '').replaceAll('_', ' ')}.`,
      permissions: ['screen.read', 'network.read'],
      risk: 'low',
      idempotency: 'best-effort',
    })),
    ...[
      'browser_click_element',
      'browser_type_text',
      'desktop_click_element',
      'desktop_type_text',
      'desktop_press_keys',
      'desktop_open_application',
    ].map(toolName => createBuiltInManifest(toolName, genericBuiltInToolInputSchema, {
      description: `Use local input for ${toolName.replaceAll('_', ' ')}.`,
      permissions: ['input.write'],
      risk: 'medium',
      idempotency: 'none',
    })),
    ...[
      'desktop_inspect_scene',
      'desktop_list_interactables',
      'desktop_wait',
    ].map(toolName => createBuiltInManifest(toolName, genericBuiltInToolInputSchema, {
      description: `Inspect the local desktop through ${toolName.replaceAll('_', ' ')}.`,
      permissions: ['screen.read'],
      risk: 'low',
      idempotency: 'best-effort',
    })),
    createBuiltInManifest('filesystem_read_file', {
      type: 'object',
      properties: {
        path: { type: 'string', minLength: 1 },
        maxReturnBytes: { type: 'number' },
      },
      required: ['path'],
      additionalProperties: false,
    }, {
      description: 'Read a local file through the filesystem bridge.',
      permissions: ['workspace.read'],
      risk: 'low',
      supportsCancellation: true,
      idempotency: 'best-effort',
    }),
    createBuiltInManifest('filesystem_write_file', {
      type: 'object',
      properties: {
        path: { type: 'string', minLength: 1 },
        content: { type: 'string' },
        expectedHash: { type: 'string' },
      },
      required: ['path', 'content'],
      additionalProperties: false,
    }, {
      description: 'Write a local file through the filesystem bridge.',
      permissions: ['workspace.write'],
      risk: 'medium',
      supportsCancellation: true,
      idempotency: 'required',
    }),
    createBuiltInManifest('filesystem_edit_file', filesystemEditFileInputSchema, {
      description: 'Edit a local file through the filesystem bridge.',
      permissions: ['workspace.read', 'workspace.write'],
      risk: 'medium',
      supportsCancellation: true,
      idempotency: 'required',
    }),
    createBuiltInManifest('filesystem_patch_file', filesystemPatchFileInputSchema, {
      description: 'Apply a deterministic patch to a local file through the filesystem bridge.',
      permissions: ['workspace.read', 'workspace.write'],
      risk: 'medium',
      supportsCancellation: true,
      idempotency: 'required',
    }),
    createBuiltInManifest('filesystem_list_directory', {
      type: 'object',
      properties: {
        path: { type: 'string', minLength: 1 },
        recursive: { type: 'boolean' },
        maxReturnBytes: { type: 'number' },
        maxEntries: { type: 'number' },
      },
      required: ['path'],
      additionalProperties: false,
    }, {
      description: 'List a local directory through the filesystem bridge.',
      permissions: ['workspace.read'],
      risk: 'low',
      supportsCancellation: true,
      idempotency: 'best-effort',
    }),
    createBuiltInManifest('filesystem_search_files', {
      type: 'object',
      properties: {
        path: { type: 'string', minLength: 1 },
        query: { type: 'string', minLength: 1 },
        recursive: { type: 'boolean' },
        maxResults: { type: 'number' },
        maxReturnBytes: { type: 'number' },
        caseSensitive: { type: 'boolean' },
        regex: { type: 'boolean' },
        includeGlobs: { type: 'array', items: { type: 'string' } },
        excludeGlobs: { type: 'array', items: { type: 'string' } },
        pathMode: { type: 'string', enum: ['absolute', 'raw', 'relative'] },
      },
      required: ['path', 'query'],
      additionalProperties: false,
    }, {
      description: 'Search local files through the filesystem bridge.',
      permissions: ['workspace.read'],
      risk: 'low',
      supportsCancellation: true,
      idempotency: 'best-effort',
    }),
  ]

  if (mcpAllowlist.has('filesystem::read_file')) {
    manifests.push(createManifest('mcp.filesystem::read_file', mcpReadFileInputSchema, {
      description: 'Read a file through the allowlisted filesystem MCP capability.',
      executionChannel: 'mcp',
      permissions: ['workspace.read'],
      risk: 'low',
      timeoutMs: 15_000,
      supportsCancellation: true,
      idempotency: 'best-effort',
      providerToolName: mcpProviderToolName('filesystem::read_file'),
      adapterToolName: mcpAdapterToolName('filesystem::read_file'),
    }))
  }

  if (mcpAllowlist.has('filesystem::write_file')) {
    manifests.push(createManifest('mcp.filesystem::write_file', mcpWriteFileInputSchema, {
      description: 'Write a file through the allowlisted filesystem MCP capability.',
      executionChannel: 'mcp',
      permissions: ['workspace.write'],
      risk: 'medium',
      timeoutMs: 15_000,
      supportsCancellation: true,
      idempotency: 'none',
      providerToolName: mcpProviderToolName('filesystem::write_file'),
      adapterToolName: mcpAdapterToolName('filesystem::write_file'),
    }))
  }

  if (mcpAllowlist.has('filesystem::list_directory')) {
    manifests.push(createManifest('mcp.filesystem::list_directory', mcpListDirectoryInputSchema, {
      description: 'List a directory through the allowlisted filesystem MCP capability.',
      executionChannel: 'mcp',
      permissions: ['workspace.read'],
      risk: 'low',
      timeoutMs: 15_000,
      supportsCancellation: true,
      idempotency: 'best-effort',
      providerToolName: mcpProviderToolName('filesystem::list_directory'),
      adapterToolName: mcpAdapterToolName('filesystem::list_directory'),
    }))
  }

  if (mcpAllowlist.has('filesystem::search_files')) {
    manifests.push(createManifest('mcp.filesystem::search_files', mcpSearchFilesInputSchema, {
      description: 'Search files through the allowlisted filesystem MCP capability.',
      executionChannel: 'mcp',
      permissions: ['workspace.read'],
      risk: 'low',
      timeoutMs: 15_000,
      supportsCancellation: true,
      idempotency: 'best-effort',
      providerToolName: mcpProviderToolName('filesystem::search_files'),
      adapterToolName: mcpAdapterToolName('filesystem::search_files'),
    }))
  }

  return manifests
}

function isMcpCapabilityId(capabilityId: string) {
  return capabilityId.startsWith('mcp.') && capabilityId.slice(4).includes('::')
}

function qualifiedMcpName(capabilityId: string) {
  return isMcpCapabilityId(capabilityId) ? capabilityId.slice(4) : undefined
}

function mcpProviderToolName(name: string) {
  return `mcp_${name.replace(/[^\w-]+/gu, '_')}`
}

function mcpAdapterToolName(name: string) {
  return `mcp_adapter_${name.replace(/[^\w-]+/gu, '_')}`
}

function isEligible(manifest: CapabilityManifest) {
  return manifest.activationStatus === 'active'
    && manifest.evaluationStatus === 'passed'
}

function assertManifest(manifest: CapabilityManifest) {
  if (!manifest.capabilityId.trim())
    throw new TypeError('capabilityId must not be empty')
  if (!manifest.version.trim())
    throw new TypeError(`${manifest.capabilityId} version must not be empty`)
  if (!manifest.description.trim())
    throw new TypeError(`${manifest.capabilityId} description must not be empty`)
  if (!manifest.executionChannel.trim())
    throw new TypeError(`${manifest.capabilityId} executionChannel must not be empty`)
  if (!Number.isSafeInteger(manifest.timeoutMs) || manifest.timeoutMs <= 0)
    throw new TypeError(`${manifest.capabilityId} timeoutMs must be a positive integer`)
  if (!Array.isArray(manifest.permissions))
    throw new TypeError(`${manifest.capabilityId} permissions must be an array`)
  if (!manifest.inputSchema || typeof manifest.inputSchema !== 'object' || Array.isArray(manifest.inputSchema))
    throw new TypeError(`${manifest.capabilityId} inputSchema must be an object`)
  if (!manifest.outputSchema || typeof manifest.outputSchema !== 'object' || Array.isArray(manifest.outputSchema))
    throw new TypeError(`${manifest.capabilityId} outputSchema must be an object`)
  if (typeof manifest.providerToolName !== 'string' || !manifest.providerToolName.trim())
    throw new TypeError(`${manifest.capabilityId} providerToolName must be a non-empty string`)
  if (!/^[\w-]+$/u.test(manifest.providerToolName))
    throw new TypeError(`${manifest.capabilityId} providerToolName must match /^[A-Za-z0-9_-]+$/`)
  if (typeof manifest.adapterToolName !== 'string' || !manifest.adapterToolName.trim())
    throw new TypeError(`${manifest.capabilityId} adapterToolName must be a non-empty string`)
}

function cloneJsonCompatibleValue<T>(value: T): T {
  if (Array.isArray(value))
    return value.map(item => cloneJsonCompatibleValue(item)) as T

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        cloneJsonCompatibleValue(item),
      ]),
    ) as T
  }

  return value
}

function deepFreeze<T>(value: T): T {
  if (!value || typeof value !== 'object' || Object.isFrozen(value))
    return value

  for (const nestedValue of Object.values(value))
    deepFreeze(nestedValue)

  return Object.freeze(value)
}

function createManifestSnapshot(manifest: CapabilityManifest) {
  return deepFreeze(cloneJsonCompatibleValue(manifest))
}

export function createToolRegistry(options: CreateToolRegistryOptions = {}): ToolRegistry {
  const mcpAllowlist = new Set(options.mcpAllowlist ?? [])
  const manifests = new Map<string, CapabilityManifest>()
  const providerToolNames = new Map<string, string>()
  const adapterToolNames = new Map<string, string>()
  const validators = new Map<string, ValidateFunction>()
  const ajv = new Ajv({ allErrors: true, strict: false })

  function resolveCapabilityId(name: string) {
    if (manifests.has(name))
      return name

    const legacyName = legacyToolNames[name]
    if (legacyName && manifests.has(legacyName))
      return legacyName

    if (name.includes('::') && mcpAllowlist.has(name)) {
      const capabilityId = `mcp.${name}`
      return manifests.has(capabilityId) ? capabilityId : undefined
    }

    return undefined
  }

  function resolveProviderCapabilityId(providerToolName: string, input: unknown) {
    const normalizedName = providerToolName.trim()
    if (!normalizedName)
      return undefined

    const candidates = [...manifests.values()].filter((manifest) => {
      if (!isEligible(manifest))
        return false
      if (manifest.providerToolName !== normalizedName)
        return false
      const validator = validators.get(manifest.capabilityId)
      return Boolean(validator?.(input))
    })

    if (normalizedName === 'coding_agent') {
      const facadeManifest = manifests.get('coding_agent')
      if (
        !facadeManifest
        || !isEligible(facadeManifest)
        || !validators.get('coding_agent')?.(input)
      ) {
        return undefined
      }

      const agent = input && typeof input === 'object' && !Array.isArray(input)
        ? (input as Record<string, unknown>).agent
        : undefined
      const agentCapabilityId = agent === 'codex'
        ? 'coding_agent.codex'
        : agent === 'claude-code'
          ? 'coding_agent.claude_code'
          : agent === 'cli'
            ? 'coding_agent.cli'
            : undefined
      if (!agentCapabilityId)
        return undefined
      if (agentCapabilityId) {
        const manifest = manifests.get(agentCapabilityId)
        if (
          manifest
          && isEligible(manifest)
          && validators.get(agentCapabilityId)?.(input)
        ) {
          return agentCapabilityId
        }
        return undefined
      }
    }

    if (normalizedName === 'cli') {
      const manifest = manifests.get('coding_agent.cli')
      if (
        manifest
        && isEligible(manifest)
        && validators.get('coding_agent.cli')?.(input)
      ) {
        return 'coding_agent.cli'
      }
    }

    return candidates.length === 1
      ? candidates[0]?.capabilityId
      : undefined
  }

  return {
    allowMcpName(name) {
      const normalizedName = name.trim()
      if (!normalizedName || !normalizedName.includes('::'))
        throw new TypeError('MCP capability name must be qualified as server::tool')
      mcpAllowlist.add(normalizedName)
    },

    register(manifest) {
      assertManifest(manifest)
      if (manifests.has(manifest.capabilityId))
        throw new Error(`capability ${manifest.capabilityId} is already registered`)

      const qualifiedName = qualifiedMcpName(manifest.capabilityId)
      if (qualifiedName && !mcpAllowlist.has(qualifiedName))
        throw new Error(`MCP capability ${qualifiedName} is not in the allowlist`)

      const registeredCapabilityId = providerToolNames.get(manifest.providerToolName)
      if (registeredCapabilityId)
        throw new Error(`providerToolName "${manifest.providerToolName}" is already registered by ${registeredCapabilityId}`)

      const adapterCapabilityId = adapterToolNames.get(manifest.adapterToolName)
      if (adapterCapabilityId)
        throw new Error(`adapterToolName "${manifest.adapterToolName}" is already registered by ${adapterCapabilityId}`)

      const internalManifest = cloneJsonCompatibleValue(manifest)
      const validator = ajv.compile(internalManifest.inputSchema)
      deepFreeze(internalManifest)
      manifests.set(internalManifest.capabilityId, internalManifest)
      providerToolNames.set(internalManifest.providerToolName, internalManifest.capabilityId)
      adapterToolNames.set(internalManifest.adapterToolName, internalManifest.capabilityId)
      validators.set(internalManifest.capabilityId, validator)
      return createManifestSnapshot(internalManifest)
    },

    replace(manifest) {
      assertManifest(manifest)
      const existing = manifests.get(manifest.capabilityId)
      if (!existing)
        return this.register(manifest)

      if (existing.providerToolName !== manifest.providerToolName) {
        const owner = providerToolNames.get(manifest.providerToolName)
        if (owner && owner !== manifest.capabilityId)
          throw new Error(`providerToolName "${manifest.providerToolName}" is already registered by ${owner}`)
      }
      if (existing.adapterToolName !== manifest.adapterToolName) {
        const owner = adapterToolNames.get(manifest.adapterToolName)
        if (owner && owner !== manifest.capabilityId)
          throw new Error(`adapterToolName "${manifest.adapterToolName}" is already registered by ${owner}`)
      }

      providerToolNames.delete(existing.providerToolName)
      adapterToolNames.delete(existing.adapterToolName)
      validators.delete(existing.capabilityId)

      const internalManifest = cloneJsonCompatibleValue(manifest)
      const validator = ajv.compile(internalManifest.inputSchema)
      deepFreeze(internalManifest)
      manifests.set(internalManifest.capabilityId, internalManifest)
      providerToolNames.set(internalManifest.providerToolName, internalManifest.capabilityId)
      adapterToolNames.set(internalManifest.adapterToolName, internalManifest.capabilityId)
      validators.set(internalManifest.capabilityId, validator)
      return createManifestSnapshot(internalManifest)
    },

    get(capabilityId) {
      const manifest = manifests.get(capabilityId)
      return manifest ? createManifestSnapshot(manifest) : undefined
    },

    list() {
      return [...manifests.values()]
        .sort((left, right) => left.capabilityId.localeCompare(right.capabilityId))
        .map(createManifestSnapshot)
    },

    resolveActive(name) {
      const capabilityId = resolveCapabilityId(name)
      if (!capabilityId)
        return undefined

      const manifest = manifests.get(capabilityId)
      if (!manifest || !isEligible(manifest))
        return undefined

      const qualifiedName = qualifiedMcpName(manifest.capabilityId)
      if (qualifiedName && !mcpAllowlist.has(qualifiedName))
        return undefined

      return createManifestSnapshot(manifest)
    },

    resolveProviderInvocation(providerToolName, input) {
      const capabilityId = resolveProviderCapabilityId(providerToolName, input)
      if (!capabilityId)
        return undefined

      const manifest = manifests.get(capabilityId)
      if (!manifest || !isEligible(manifest))
        return undefined

      return {
        adapterToolName: providerToolName.trim() === 'coding_agent'
          ? 'executor_run_coding_agent'
          : manifest.adapterToolName,
        capabilityId: manifest.capabilityId,
        providerToolName: providerToolName.trim(),
      }
    },

    projectAdapterToolName(adapterToolName) {
      const normalizedName = adapterToolName.trim()
      if (!normalizedName)
        return ''
      const capabilityId = adapterToolNames.get(normalizedName)
      return capabilityId
        ? manifests.get(capabilityId)?.providerToolName ?? normalizedName
        : normalizedName
    },

    isKnownProviderToolName(providerToolName) {
      const normalizedName = providerToolName.trim()
      return Boolean(normalizedName) && [...manifests.values()].some(manifest =>
        manifest.providerToolName === normalizedName,
      )
    },

    resolveAdapterToolName(adapterToolName) {
      const normalizedName = adapterToolName.trim()
      if (!normalizedName)
        return undefined
      const manifest = [...manifests.values()].find(manifest =>
        manifest.adapterToolName === normalizedName,
      )
      return manifest ? createManifestSnapshot(manifest) : undefined
    },

    setActivationStatus(capabilityId, activationStatus) {
      const manifest = manifests.get(capabilityId)
      if (!manifest)
        throw new Error(`capability ${capabilityId} is not registered`)
      const updated = deepFreeze({
        ...manifest,
        activationStatus,
      })
      manifests.set(capabilityId, updated)
      return createManifestSnapshot(updated)
    },

    validateSurface(names) {
      return names.map((name) => {
        const manifest = this.resolveActive(name)
        if (!manifest)
          throw new Error(`capability ${name} is not eligible for the active surface`)
        return manifest
      })
    },

    normalizeLegacyToolName(name) {
      return legacyToolNames[name]
    },

    validateInput(capabilityIdOrQualifiedName, input) {
      const capabilityId = resolveCapabilityId(capabilityIdOrQualifiedName)
      if (!capabilityId)
        return { valid: false, errors: null }

      const validator = validators.get(capabilityId)
      if (!validator)
        return { valid: false, errors: null }

      const valid = validator(input)
      return valid
        ? { valid: true, errors: null }
        : { valid: false, errors: validator.errors ?? null }
    },
  }
}

export function isCodingAgentLikeMcpName(name: string) {
  const separatorIndex = name.indexOf('::')
  if (separatorIndex <= 0 || separatorIndex === name.length - 2)
    return false

  const serverName = name.slice(0, separatorIndex).trim().toLowerCase()
  const toolName = name.slice(separatorIndex + 2).trim().toLowerCase()
  return (
    ['codex', 'claude', 'claude-code', 'coding-agent', 'coding_agent', 'cli'].includes(serverName)
    || toolName === 'executor_run_coding_agent'
    || toolName === 'executor_run_codex'
    || toolName === 'executor_run_claude_code'
    || toolName === 'executor_run_cli'
    || toolName === 'coding_agent'
  )
}

export function registerDiscoveredMcpCapability(
  registry: ToolRegistry,
  descriptor: DiscoveredMcpCapability,
) {
  const name = descriptor.name.trim()
  if (!name || !name.includes('::'))
    return undefined
  if (isCodingAgentLikeMcpName(name))
    return undefined
  if (registry.resolveActive(name))
    return registry.resolveActive(name)

  registry.allowMcpName(name)
  return registry.register({
    capabilityId: `mcp.${name}`,
    kind: 'tool',
    version: '1.0.0',
    description: descriptor.description?.trim() || `MCP capability ${name}`,
    inputSchema: normalizeJsonSchema(descriptor.inputSchema),
    outputSchema: { type: 'object' },
    scope: 'turn',
    permissions: ['mcp.invoke'],
    risk: 'medium',
    executionChannel: 'mcp',
    timeoutMs: 15_000,
    supportsProgress: false,
    supportsCancellation: true,
    idempotency: 'best-effort',
    evaluationStatus: 'unverified',
    activationStatus: 'candidate',
    providerToolName: mcpProviderToolName(name),
    adapterToolName: mcpAdapterToolName(name),
  })
}

export function createCanonicalToolRegistry(
  options: CreateToolRegistryOptions = {},
): ToolRegistry {
  const mcpAllowlist = new Set(options.mcpAllowlist ?? defaultMcpAllowlist)
  const registry = createToolRegistry({ mcpAllowlist: [...mcpAllowlist] })

  for (const manifest of createCanonicalManifests(mcpAllowlist))
    registry.register(manifest)

  return registry
}
