import type { CapabilityManifest } from './tool-registry'

import { describe, expect, it } from 'vitest'

import {

  createCanonicalToolRegistry,
  registerDiscoveredMcpCapability,
} from './tool-registry'

const manifestFields: Array<keyof CapabilityManifest> = [
  'capabilityId',
  'kind',
  'version',
  'description',
  'inputSchema',
  'outputSchema',
  'scope',
  'permissions',
  'risk',
  'executionChannel',
  'timeoutMs',
  'supportsProgress',
  'supportsCancellation',
  'idempotency',
  'evaluationStatus',
  'activationStatus',
  'providerToolName',
  'adapterToolName',
]

describe('canonical ToolRegistry', () => {
  it('registers the canonical capability representatives with complete manifests', () => {
    const registry = createCanonicalToolRegistry()
    const manifests = registry.list()

    expect(manifests.map(manifest => manifest.capabilityId)).toEqual([
      'coding_agent',
      'coding_agent.claude_code',
      'coding_agent.cli',
      'coding_agent.codex',
      'embodied.openclaw',
      'local_visual',
      'mcp.filesystem::list_directory',
      'mcp.filesystem::read_file',
      'mcp.filesystem::search_files',
      'mcp.filesystem::write_file',
      'tool.browser_click_element',
      'tool.browser_navigate',
      'tool.browser_open_url',
      'tool.browser_read_page',
      'tool.browser_scroll',
      'tool.browser_search_web',
      'tool.browser_type_text',
      'tool.browser_wait',
      'tool.desktop_click_element',
      'tool.desktop_inspect_scene',
      'tool.desktop_list_interactables',
      'tool.desktop_open_application',
      'tool.desktop_press_keys',
      'tool.desktop_type_text',
      'tool.desktop_wait',
      'tool.executor_capability_snapshot',
      'tool.filesystem_edit_file',
      'tool.filesystem_list_directory',
      'tool.filesystem_patch_file',
      'tool.filesystem_read_file',
      'tool.filesystem_search_files',
      'tool.filesystem_write_file',
      'tool.sensory_capture_state',
      'tool.set_reminder',
    ])

    for (const manifest of manifests)
      expect(Object.keys(manifest)).toEqual(expect.arrayContaining(manifestFields))
  })

  it('pre-registers filesystem wrapper capabilities with explicit identity, permissions, and risk', () => {
    const registry = createCanonicalToolRegistry()

    expect(registry.get('tool.filesystem_read_file')).toMatchObject({
      capabilityId: 'tool.filesystem_read_file',
      providerToolName: 'filesystem_read_file',
      adapterToolName: 'filesystem_read_file',
      executionChannel: 'local-tool',
      permissions: ['workspace.read'],
      risk: 'low',
      activationStatus: 'active',
      evaluationStatus: 'passed',
    })
    expect(registry.get('tool.filesystem_write_file')).toMatchObject({
      capabilityId: 'tool.filesystem_write_file',
      providerToolName: 'filesystem_write_file',
      adapterToolName: 'filesystem_write_file',
      executionChannel: 'local-tool',
      permissions: ['workspace.write'],
      risk: 'medium',
      activationStatus: 'active',
      evaluationStatus: 'passed',
    })
    expect(registry.get('tool.filesystem_read_file')?.permissions).not.toEqual([])
    expect(registry.get('tool.filesystem_write_file')?.permissions).not.toEqual([])
  })

  it('pre-registers the built-in non-executor surface capabilities', () => {
    const registry = createCanonicalToolRegistry()

    for (const capabilityId of [
      'tool.set_reminder',
      'tool.executor_capability_snapshot',
      'tool.sensory_capture_state',
      'tool.browser_open_url',
      'tool.desktop_inspect_scene',
    ]) {
      expect(registry.get(capabilityId)).toMatchObject({
        capabilityId,
        activationStatus: 'active',
        evaluationStatus: 'passed',
      })
    }
  })

  it('supports register and get while rejecting duplicate capability ids', () => {
    const registry = createCanonicalToolRegistry({ mcpAllowlist: [] })
    const manifest: CapabilityManifest = {
      capabilityId: 'test.echo',
      kind: 'tool',
      version: '1.0.0',
      description: 'Echo a structured value.',
      inputSchema: {
        type: 'object',
        properties: { value: { type: 'string' } },
        required: ['value'],
        additionalProperties: false,
      },
      outputSchema: { type: 'object' },
      scope: 'turn',
      permissions: ['workspace.read'],
      risk: 'low',
      executionChannel: 'test',
      timeoutMs: 1_000,
      supportsProgress: false,
      supportsCancellation: true,
      idempotency: 'best-effort',
      evaluationStatus: 'passed',
      activationStatus: 'active',
      providerToolName: 'test_echo',
      adapterToolName: 'test_echo_adapter',
    }

    expect(registry.register(manifest)).toEqual(manifest)
    expect(registry.get('test.echo')).toEqual(manifest)
    expect(() => registry.register(manifest)).toThrow(/already registered/u)
  })

  it('isolates registered manifests and every returned snapshot from external mutation', () => {
    const registry = createCanonicalToolRegistry({ mcpAllowlist: [] })
    const manifest: CapabilityManifest = {
      capabilityId: 'test.immutable',
      kind: 'tool',
      version: '1.0.0',
      description: 'Immutable registry boundary.',
      inputSchema: {
        type: 'object',
        properties: {
          value: { type: 'string' },
        },
        required: ['value'],
        additionalProperties: false,
      },
      outputSchema: {
        type: 'object',
        properties: {
          echoed: { type: 'string' },
        },
      },
      scope: 'turn',
      permissions: ['workspace.read'],
      risk: 'low',
      executionChannel: 'test',
      timeoutMs: 1_000,
      supportsProgress: false,
      supportsCancellation: true,
      idempotency: 'best-effort',
      evaluationStatus: 'passed',
      activationStatus: 'active',
      providerToolName: 'test_immutable',
      adapterToolName: 'test_immutable_adapter',
    }

    const registered = registry.register(manifest)
    manifest.permissions.push('workspace.write')
    ;(manifest.inputSchema.properties as Record<string, unknown>).injected = {
      type: 'boolean',
    }
    expect(() => {
      registered.permissions.push('screen.read')
    }).toThrow()

    const snapshots = [
      registry.get('test.immutable')!,
      registry.list().find(value => value.capabilityId === 'test.immutable')!,
      registry.resolveActive('test.immutable')!,
      registry.resolveAdapterToolName('test_immutable_adapter')!,
      registry.setActivationStatus('test.immutable', 'disabled'),
    ]
    for (const snapshot of snapshots) {
      expect(Object.isFrozen(snapshot)).toBe(true)
      expect(Object.isFrozen(snapshot.permissions)).toBe(true)
      expect(Object.isFrozen(snapshot.inputSchema)).toBe(true)
      expect(() => {
        snapshot.permissions.push('screen.read')
      }).toThrow()
      expect(() => {
        ;(snapshot.inputSchema.properties as Record<string, unknown>).injected = {
          type: 'number',
        }
      }).toThrow()
    }

    expect(registry.get('test.immutable')).toMatchObject({
      permissions: ['workspace.read'],
      activationStatus: 'disabled',
    })
    expect(registry.validateInput('test.immutable', {
      value: 'kept',
      injected: true,
    })).toMatchObject({
      valid: false,
    })
  })

  it('rejects manifests with missing or blank provider and adapter names', () => {
    const registry = createCanonicalToolRegistry({ mcpAllowlist: [] })
    const baseManifest = registry.get('coding_agent.codex')!

    expect(() => registry.register({
      ...baseManifest,
      capabilityId: 'test.missing-provider',
      providerToolName: undefined,
    } as unknown as CapabilityManifest)).toThrow(/providerToolName must be a non-empty string/u)

    expect(() => registry.register({
      ...baseManifest,
      capabilityId: 'test.blank-provider',
      providerToolName: '   ',
    })).toThrow(/providerToolName must be a non-empty string/u)

    expect(() => registry.register({
      ...baseManifest,
      capabilityId: 'test.missing-adapter',
      adapterToolName: undefined,
    } as unknown as CapabilityManifest)).toThrow(/adapterToolName must be a non-empty string/u)

    expect(() => registry.register({
      ...baseManifest,
      capabilityId: 'test.blank-adapter',
      adapterToolName: '   ',
    })).toThrow(/adapterToolName must be a non-empty string/u)
  })

  it('rejects Provider aliases outside the Provider-safe character set', () => {
    const registry = createCanonicalToolRegistry({ mcpAllowlist: [] })
    const baseManifest = registry.get('coding_agent.codex')!

    for (const providerToolName of ['codex.tools', 'filesystem::read_file', 'codex tool']) {
      expect(() => registry.register({
        ...baseManifest,
        capabilityId: `test.invalid-alias-${providerToolName.replaceAll(/[^A-Za-z0-9]/gu, '-')}`,
        providerToolName,
      })).toThrow(/providerToolName must match/u)
    }
  })

  it('rejects duplicate Provider aliases across capabilities', () => {
    const registry = createCanonicalToolRegistry({ mcpAllowlist: [] })
    const codexManifest = registry.get('coding_agent.codex')!

    expect(() => registry.register({
      ...codexManifest,
      capabilityId: 'test.duplicate-codex-alias',
    })).toThrow(/providerToolName "codex" is already registered/u)
  })

  it('rejects duplicate internal adapter identities across capabilities', () => {
    const registry = createCanonicalToolRegistry({ mcpAllowlist: [] })
    const codexManifest = registry.get('coding_agent.codex')!

    expect(() => registry.register({
      ...codexManifest,
      capabilityId: 'test.duplicate-codex-adapter',
      providerToolName: 'duplicate_codex_adapter',
    })).toThrow(/adapterToolName "executor_run_codex" is already registered/u)
  })

  it('keeps inactive, unevaluated, failed, and revoked capabilities out of a surface', () => {
    const registry = createCanonicalToolRegistry({ mcpAllowlist: [] })
    const statuses: Array<CapabilityManifest['activationStatus']> = [
      'candidate',
      'disabled',
      'revoked',
    ]

    for (const activationStatus of statuses) {
      registry.register({
        ...registry.get('coding_agent.codex')!,
        capabilityId: `test.${activationStatus}`,
        providerToolName: `test_${activationStatus}`,
        adapterToolName: `test_${activationStatus}_adapter`,
        activationStatus,
      })
    }

    registry.register({
      ...registry.get('coding_agent.codex')!,
      capabilityId: 'test.failed',
      providerToolName: 'test_failed',
      adapterToolName: 'test_failed_adapter',
      evaluationStatus: 'failed',
    })

    expect(() => registry.validateSurface([
      'coding_agent.codex',
      'test.candidate',
    ])).toThrow(/not eligible/u)
    expect(registry.validateSurface(['coding_agent.codex'])).toEqual([
      registry.get('coding_agent.codex'),
    ])
  })

  it('normalizes only explicit legacy executor names', () => {
    const registry = createCanonicalToolRegistry()

    expect(registry.normalizeLegacyToolName('executor_run_codex')).toBe('coding_agent.codex')
    expect(registry.normalizeLegacyToolName('executor_run_claude_code')).toBe('coding_agent.claude_code')
    expect(registry.normalizeLegacyToolName('executor_run_cli')).toBe('coding_agent.cli')
    expect(registry.normalizeLegacyToolName('executor_run_local_visual')).toBe('local_visual')
    expect(registry.normalizeLegacyToolName('executor_run_openclaw')).toBe('embodied.openclaw')
    expect(registry.normalizeLegacyToolName('executor_run_coding_agent')).toBe('coding_agent')
    expect(registry.normalizeLegacyToolName('mcp_call_tool')).toBeUndefined()
  })

  it('projects internal adapter names to Provider-safe aliases for cross-layer output', () => {
    const registry = createCanonicalToolRegistry()

    expect(registry.projectAdapterToolName('executor_run_codex')).toBe('codex')
    expect(registry.projectAdapterToolName('executor_run_cli')).toBe('cli')
    expect(registry.projectAdapterToolName('executor_run_coding_agent')).toBe('coding_agent')
    expect(registry.projectAdapterToolName('browser_read_page')).toBe('browser_read_page')
  })

  it('resolves Provider-safe aliases into canonical capabilities and internal adapters', () => {
    const registry = createCanonicalToolRegistry()

    expect(registry.resolveProviderInvocation('coding_agent', {
      agent: 'codex',
      prompt: 'inspect the repository',
    })).toEqual({
      adapterToolName: 'executor_run_coding_agent',
      capabilityId: 'coding_agent.codex',
      providerToolName: 'coding_agent',
    })
    expect(registry.resolveProviderInvocation('codex', {
      prompt: 'inspect the repository',
    })).toEqual({
      adapterToolName: 'executor_run_codex',
      capabilityId: 'coding_agent.codex',
      providerToolName: 'codex',
    })
    expect(registry.resolveProviderInvocation('cli', {
      command: 'git status',
    })).toEqual({
      adapterToolName: 'executor_run_cli',
      capabilityId: 'coding_agent.cli',
      providerToolName: 'cli',
    })
    expect(registry.resolveProviderInvocation('local_visual', {
      channel: 'desktop',
      instruction: 'inspect the current screen',
    })).toEqual({
      adapterToolName: 'executor_run_local_visual',
      capabilityId: 'local_visual',
      providerToolName: 'local_visual',
    })
    expect(registry.resolveProviderInvocation('executor_run_codex', {
      prompt: 'legacy provider name',
    })).toBeUndefined()
  })

  it('rejects an unknown agent on the coding-agent facade before Provider resolution', () => {
    const registry = createCanonicalToolRegistry()

    expect(registry.resolveProviderInvocation('coding_agent', {
      agent: 'unknown',
      prompt: 'x',
    })).toBeUndefined()
    expect(registry.validateInput('coding_agent', {
      agent: 'unknown',
      prompt: 'x',
    })).toMatchObject({
      valid: false,
    })
  })

  it('refuses a Provider alias after its canonical capability is disabled', () => {
    const registry = createCanonicalToolRegistry()

    registry.setActivationStatus('coding_agent.codex', 'disabled')

    expect(registry.resolveProviderInvocation('coding_agent', {
      agent: 'codex',
      prompt: 'inspect the repository',
    })).toBeUndefined()
    expect(registry.resolveProviderInvocation('codex', {
      prompt: 'inspect the repository',
    })).toBeUndefined()
  })

  it('distinguishes coding-agent prompt and thread payloads from cli command payloads', () => {
    const registry = createCanonicalToolRegistry()

    expect(registry.validateInput('coding_agent.codex', { prompt: 'inspect the diff' })).toMatchObject({
      valid: true,
    })
    expect(registry.validateInput('coding_agent.claude_code', { threadId: 'thread-1' })).toMatchObject({
      valid: true,
    })
    expect(registry.validateInput('coding_agent.codex', { command: 'git status' })).toMatchObject({
      valid: false,
    })
    expect(registry.validateInput('coding_agent.claude_code', {})).toMatchObject({
      valid: false,
    })

    expect(registry.validateInput('coding_agent.cli', { command: 'git status' })).toMatchObject({
      valid: true,
    })
    expect(registry.validateInput('coding_agent.cli', { threadId: 'thread-1' })).toMatchObject({
      valid: true,
    })
    expect(registry.validateInput('coding_agent.cli', { prompt: 'run a command' })).toMatchObject({
      valid: false,
    })
  })

  it('requires a valid channel for local visual instructions and resumptions', () => {
    const registry = createCanonicalToolRegistry()

    expect(registry.validateInput('local_visual', {
      instruction: 'inspect the current screen',
    })).toMatchObject({
      valid: false,
    })
    expect(registry.validateInput('local_visual', {
      channel: 'browser',
      instruction: 'inspect the current page',
    })).toMatchObject({
      valid: true,
    })
    expect(registry.validateInput('local_visual', {
      channel: 'desktop',
      threadId: 'thread-1',
    })).toMatchObject({
      valid: true,
    })
    expect(registry.validateInput('local_visual', {
      channel: 'terminal',
      instruction: 'inspect the current screen',
    })).toMatchObject({
      valid: false,
    })
  })

  it('resolves only active passed capabilities and allowlisted MCP qualified names', () => {
    const registry = createCanonicalToolRegistry()

    expect(registry.resolveActive('coding_agent.codex')?.capabilityId).toBe('coding_agent.codex')
    expect(registry.resolveActive('executor_run_codex')?.capabilityId).toBe('coding_agent.codex')
    expect(registry.resolveActive('filesystem::read_file')?.capabilityId).toBe('mcp.filesystem::read_file')
    expect(registry.resolveActive('filesystem::write_file')?.capabilityId).toBe('mcp.filesystem::write_file')
    expect(registry.resolveActive('filesystem::list_directory')?.capabilityId).toBe('mcp.filesystem::list_directory')
    expect(registry.resolveActive('filesystem::search_files')?.capabilityId).toBe('mcp.filesystem::search_files')
    expect(registry.resolveActive('mcp.filesystem::read_file')?.capabilityId).toBe('mcp.filesystem::read_file')
    expect(registry.resolveActive('unknown-server::read_file')).toBeUndefined()
    expect(registry.resolveActive('codex::read_file')).toBeUndefined()
    expect(registry.resolveActive('mcp_call_tool')).toBeUndefined()
  })

  it('validates canonical filesystem MCP inputs without accepting guessed aliases', () => {
    const registry = createCanonicalToolRegistry()

    expect(registry.validateInput('filesystem::read_file', {
      path: 'notes/today.md',
    })).toMatchObject({ valid: true })
    expect(registry.validateInput('filesystem::read_file', {
      filePath: 'notes/today.md',
    })).toMatchObject({ valid: false })

    expect(registry.validateInput('filesystem::write_file', {
      path: 'notes/today.md',
      content: 'hello',
    })).toMatchObject({ valid: true })
    expect(registry.validateInput('filesystem::write_file', {
      path: 'notes/today.md',
    })).toMatchObject({ valid: false })

    expect(registry.validateInput('filesystem::list_directory', {
      path: 'notes',
      recursive: true,
    })).toMatchObject({ valid: true })
    expect(registry.validateInput('filesystem::list_directory', {
      directory: 'notes',
    })).toMatchObject({ valid: false })

    expect(registry.validateInput('filesystem::search_files', {
      path: 'notes',
      query: 'memory',
      recursive: true,
      maxResults: 20,
      caseSensitive: false,
      regex: false,
      includeGlobs: ['**/*.md'],
      excludeGlobs: ['archive/**'],
      pathMode: 'relative',
    })).toMatchObject({ valid: true })
    expect(registry.validateInput('filesystem::search_files', {
      path: 'notes',
      pattern: 'memory',
    })).toMatchObject({ valid: false })
    expect(registry.resolveActive('filesystem::read-file')).toBeUndefined()
    expect(registry.resolveActive('filesystem::grep')).toBeUndefined()
  })

  it('rejects registration of an MCP capability outside the qualified-name allowlist', () => {
    const registry = createCanonicalToolRegistry()

    expect(() => registry.register({
      ...registry.get('mcp.filesystem::read_file')!,
      capabilityId: 'mcp.untrusted::write_file',
    })).toThrow(/allowlist/u)
  })

  it('allows the runtime to add a discovered MCP qualified name before registration', () => {
    const registry = createCanonicalToolRegistry({ mcpAllowlist: [] })
    const manifest = {
      ...registry.get('coding_agent.codex')!,
      capabilityId: 'mcp.filesystem::write_file',
      executionChannel: 'mcp',
      inputSchema: {
        type: 'object',
        properties: {
          path: { type: 'string', minLength: 1 },
          content: { type: 'string' },
        },
        required: ['path', 'content'],
        additionalProperties: false,
      },
      providerToolName: 'mcp_filesystem_write_file',
      adapterToolName: 'mcp_adapter_filesystem_write_file',
    }

    registry.allowMcpName('filesystem::write_file')
    expect(registry.register(manifest).capabilityId).toBe('mcp.filesystem::write_file')
    expect(registry.resolveActive('filesystem::write_file')?.capabilityId).toBe('mcp.filesystem::write_file')
  })

  it('assigns every MCP capability a stable unique internal adapter identity', () => {
    const registry = createCanonicalToolRegistry()
    const readFile = registry.get('mcp.filesystem::read_file')!
    const discovered = registerDiscoveredMcpCapability(registry, {
      name: 'filesystem::write_file',
      inputSchema: {
        type: 'object',
        properties: {
          path: { type: 'string' },
          content: { type: 'string' },
        },
        required: ['path', 'content'],
        additionalProperties: false,
      },
    })!

    expect(readFile).toMatchObject({
      providerToolName: 'mcp_filesystem_read_file',
      adapterToolName: 'mcp_adapter_filesystem_read_file',
    })
    expect(discovered).toMatchObject({
      providerToolName: 'mcp_filesystem_write_file',
      adapterToolName: 'mcp_adapter_filesystem_write_file',
    })
    expect(readFile.adapterToolName).not.toBe(discovered.adapterToolName)
    expect(registry.resolveAdapterToolName(readFile.adapterToolName)?.capabilityId)
      .toBe('mcp.filesystem::read_file')
    expect(registry.resolveAdapterToolName(discovered.adapterToolName)?.capabilityId)
      .toBe('mcp.filesystem::write_file')
    expect(registry.resolveAdapterToolName('mcp_call_tool')).toBeUndefined()
  })

  it('keeps dynamically discovered MCP capabilities unverified and inactive', () => {
    const registry = createCanonicalToolRegistry({ mcpAllowlist: [] })

    const manifest = registerDiscoveredMcpCapability(registry, {
      name: 'custom::mystery_operation',
      description: 'Discovered but not approved.',
      inputSchema: {
        type: 'object',
        properties: { value: { type: 'string' } },
        required: ['value'],
        additionalProperties: false,
      },
    })

    expect(manifest).toMatchObject({
      capabilityId: 'mcp.custom::mystery_operation',
      evaluationStatus: 'unverified',
      activationStatus: 'candidate',
    })
    expect(registry.resolveActive('custom::mystery_operation')).toBeUndefined()
  })
})
