import type { createContext } from '@moeru/eventa/adapters/electron/main'

import type {
  AlicizationAuditLogInput,
  AlicizationSafetyPermissionDecision,
  AlicizationSafetyPermissionRequest,
  AlicizationToolActionCategory,
  AlicizationToolRiskLevel,
  ElectronMcpCallToolPayload,
  ElectronMcpCallToolResult,
  ElectronMcpCapabilitiesSnapshot,
  ElectronMcpStdioApplyResult,
  ElectronMcpStdioConfigFile,
  ElectronMcpStdioRuntimeStatus,
  ElectronMcpStdioServerConfig,
  ElectronMcpStdioServerRuntimeStatus,
  ElectronMcpToolDescriptor,
} from '../../../../shared/eventa'

import { randomUUID } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { isAbsolute, join, normalize, relative, resolve } from 'node:path'
import { env, platform } from 'node:process'

import { useLogg } from '@guiiai/logg'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js'
import { defineInvokeHandler } from '@moeru/eventa'
import { app, shell } from 'electron'
import { z } from 'zod'

import {
  alicizationSafetyPermissionRequested,
  electronAlicizationSafetyResolvePermission,
  electronMcpApplyAndRestart,
  electronMcpCallTool,
  electronMcpGetCapabilitiesSnapshot,
  electronMcpGetRuntimeStatus,
  electronMcpListTools,
  electronMcpOpenConfigFile,
} from '../../../../shared/eventa'
import { onAppBeforeQuit } from '../../../libs/bootkit/lifecycle'
import {
  appendAlicizationRuntimeAuditLog,
  getAlicizationCardKillSwitchSnapshot,
  isAlicizationCardKillSwitchSuspended,
  isAlicizationKillSwitchSuspended,
  onAlicizationKillSwitchChanged,
} from '../../alicization/state'

interface McpServerSession {
  client: Client
  transport: StdioClientTransport
  config: ElectronMcpStdioServerConfig
}

export interface McpStdioManager {
  ensureConfigFile: () => Promise<{ path: string }>
  openConfigFile: () => Promise<{ path: string }>
  applyAndRestart: () => Promise<ElectronMcpStdioApplyResult>
  listTools: () => Promise<ElectronMcpToolDescriptor[]>
  callTool: (payload: ElectronMcpCallToolPayload) => Promise<ElectronMcpCallToolResult>
  stopAll: () => Promise<void>
  getRuntimeStatus: () => ElectronMcpStdioRuntimeStatus
  getCapabilitiesSnapshot: () => Promise<ElectronMcpCapabilitiesSnapshot>
}

const mcpServerConfigSchema = z.object({
  command: z.string().min(1),
  args: z.array(z.string()).optional(),
  env: z.record(z.string(), z.string()).optional(),
  cwd: z.string().optional(),
  enabled: z.boolean().optional(),
}).strict()

const mcpConfigSchema = z.object({
  mcpServers: z.record(z.string(), mcpServerConfigSchema),
}).strict()

const defaultMcpConfig: ElectronMcpStdioConfigFile = {
  mcpServers: {},
}
const toolNameSeparator = '::'
const mcpRequestTimeoutMsec = 10_000
const mcpRequestMaxTotalTimeoutMsec = 15_000
const permissionRequestTimeoutMsec = 60_000
const mcpWorkspaceDirectoryName = 'Alicization_Workspace'
const defaultAlicizationCardId = 'default'
let sharedMcpListToolsInvoker: (() => Promise<ElectronMcpToolDescriptor[]>) | undefined
let sharedMcpCallToolInvoker: ((payload: ElectronMcpCallToolPayload) => Promise<ElectronMcpCallToolResult>) | undefined

export async function invokeAlicizationMcpListToolsFromMain() {
  if (!sharedMcpListToolsInvoker)
    return []
  return await sharedMcpListToolsInvoker()
}

export async function invokeAlicizationMcpCallToolFromMain(payload: ElectronMcpCallToolPayload) {
  if (!sharedMcpCallToolInvoker) {
    return createToolErrorResult(
      'MCP_CALL_UNAVAILABLE',
      'MCP runtime is not ready yet; tool execution is unavailable.',
    )
  }
  return await sharedMcpCallToolInvoker(payload)
}

interface ToolPermissionEvaluation {
  decision: 'allow' | 'deny' | 'prompt'
  riskLevel: AlicizationToolRiskLevel
  actionCategory: AlicizationToolActionCategory
  reason: string
  resourcePath?: string
  allowBy?: 'workspace' | 'session-whitelist'
}

interface PendingPermissionRequest {
  request: AlicizationSafetyPermissionRequest
  resolve: (decision: AlicizationSafetyPermissionDecision) => void
  timeout: ReturnType<typeof setTimeout>
  resourcePath?: string
  argumentsSummary?: ReturnType<typeof summarizeToolArguments>
}

function normalizeCardId(raw: unknown) {
  if (typeof raw !== 'string')
    return defaultAlicizationCardId
  const trimmed = raw.trim()
  return trimmed || defaultAlicizationCardId
}

function normalizeFsPath(value: string, basePath?: string) {
  if (!value.trim())
    return ''

  const expanded = value.startsWith('~')
    ? join(homedir(), value.slice(1))
    : value

  if (isAbsolute(expanded)) {
    return resolve(normalize(expanded))
  }

  if (basePath) {
    return resolve(basePath, normalize(expanded))
  }

  return resolve(normalize(expanded))
}

function isPathWithin(basePath: string, targetPath: string) {
  const rel = relative(basePath, targetPath)
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel))
}

function maskPath(value?: string) {
  if (!value)
    return undefined

  const normalized = normalizeFsPath(value)
  const segments = normalized.split(/[\\/]/).filter(Boolean)
  if (segments.length <= 2)
    return normalized
  return `${segments.slice(0, 2).join('/')}/.../${segments.at(-1)}`
}

function summarizeToolArguments(input: unknown) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return {
      kind: Array.isArray(input) ? 'array' : typeof input,
    }
  }

  const entries = Object.entries(input as Record<string, unknown>)
  return {
    kind: 'object',
    keyCount: entries.length,
    keys: entries.slice(0, 8).map(([key]) => key),
  }
}

function looksLikePathString(value: string) {
  return value.includes('/') || value.includes('\\') || value.startsWith('~') || /^[a-z]:[\\/]/i.test(value) || value.startsWith('.')
}

function collectPathCandidates(input: unknown, keyHint = '', depth = 0): string[] {
  if (depth > 5)
    return []

  if (typeof input === 'string') {
    if (/path|file|dir|cwd|root|target|source|output|input/i.test(keyHint) || looksLikePathString(input))
      return [input]
    return []
  }

  if (Array.isArray(input)) {
    return input.flatMap(item => collectPathCandidates(item, keyHint, depth + 1))
  }

  if (input && typeof input === 'object') {
    return Object.entries(input as Record<string, unknown>).flatMap(([key, value]) =>
      collectPathCandidates(value, key, depth + 1),
    )
  }

  return []
}

function hasRelativeTraversalSegment(value: string) {
  const normalized = value.replace(/\\/g, '/')
  return /(?:^|\/)\.\.(?:\/|$)/.test(normalized)
}

function inferActionCategory(toolName: string): AlicizationToolActionCategory {
  if (/write|append|update|set_|put_|create|mkdir|touch|copy|move|rename/i.test(toolName))
    return 'write'
  if (/delete|remove|unlink|rmdir|truncate|purge/i.test(toolName))
    return 'delete'
  if (/exec|shell|command|terminal|run|spawn/i.test(toolName))
    return 'execute'
  if (/http|request|fetch|curl|post|upload|send|mail|email|webhook/i.test(toolName))
    return 'network'
  if (/read|cat|list|ls|dir|open|stat|search|find|glob/i.test(toolName))
    return 'read'
  return 'unknown'
}

function stringifyError(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  return String(error)
}

function createToolErrorResult(errorCode: string, errorMessage: string, durationMs = 0): ElectronMcpCallToolResult {
  const llmVisibleContent = JSON.stringify({
    status: 'error',
    code: errorCode,
    message: errorMessage,
  })

  return {
    isError: true,
    ok: false,
    errorCode,
    errorMessage,
    durationMs,
    content: [
      {
        type: 'text',
        text: llmVisibleContent,
      },
    ],
  }
}

function createPermissionDeniedResult(reason?: string) {
  if (reason === 'kill-switch-suspended') {
    return createToolErrorResult('ALICIZATION_TOOL_ABORTED', 'Tool execution was aborted because kill switch is suspended.')
  }
  if (reason === 'timeout') {
    return createToolErrorResult('ALICIZATION_TOOL_DENIED', 'Permission request timed out. Operation was not executed.')
  }
  if (reason === 'user-denied') {
    return createToolErrorResult(
      'ALICIZATION_TOOL_DENIED_BY_HOST',
      'The Host (User) explicitly INTERCEPTED and DENIED your permission to execute this tool. They do not trust you with this file.',
    )
  }

  return createToolErrorResult('ALICIZATION_TOOL_DENIED_SYSTEM', 'Tool operation was denied by safety policy.')
}

function uniqueNormalizedPaths(paths: string[], basePath?: string) {
  return [...new Set(paths.map(item => normalizeFsPath(item, basePath)).filter(Boolean))]
}

export function isFallbackEligibleMcpError(error: unknown) {
  if (error instanceof McpError) {
    return error.code === ErrorCode.MethodNotFound || error.code === ErrorCode.InvalidParams
  }

  if (!error || typeof error !== 'object')
    return false

  const payload = error as { code?: unknown, message?: unknown, name?: unknown }
  const code = typeof payload.code === 'number' ? payload.code : Number.NaN
  if (code === ErrorCode.RequestTimeout || code === ErrorCode.ConnectionClosed || code === ErrorCode.InternalError) {
    return false
  }

  if (code === ErrorCode.MethodNotFound || code === ErrorCode.InvalidParams) {
    return true
  }

  const message = stringifyError(error)
  if (!message)
    return false

  if (/\b(?:timeout|timed out|connection closed|network|unauthorized|forbidden|authentication|econn|enotfound)\b/i.test(message)) {
    return false
  }

  return (
    /\btool\b[\s\S]{1,120}\bnot\s+found\b/i.test(message)
    || /\bmethod\s+not\s+found\b/i.test(message)
    || /\binvalid\s+(?:params?|arguments?)\b/i.test(message)
    || /\binput\s+validation\s+error\b/i.test(message)
  )
}

function getConfigPath() {
  return join(app.getPath('userData'), 'mcp.json')
}

function parseQualifiedToolName(name: string) {
  const separatorIndex = name.indexOf(toolNameSeparator)
  if (separatorIndex <= 0 || separatorIndex === name.length - toolNameSeparator.length) {
    throw new Error(`invalid qualified tool name: ${name}`)
  }

  return {
    serverName: name.slice(0, separatorIndex),
    toolName: name.slice(separatorIndex + toolNameSeparator.length),
  }
}

function extractToolErrorMessage(content: Array<Record<string, unknown>> | undefined) {
  if (!Array.isArray(content))
    return undefined

  for (const item of content) {
    if (!item || typeof item !== 'object')
      continue
    if ('text' in item && typeof item.text === 'string' && item.text.trim()) {
      return item.text.trim()
    }
  }

  return undefined
}

function createSpawnEnv(overrides?: Record<string, string>): Record<string, string> {
  const baseEnv = Object.fromEntries(
    Object.entries(env).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
  )
  if (!overrides)
    return baseEnv
  return {
    ...baseEnv,
    ...overrides,
  }
}

function resolveFallbackToolName(toolName: string) {
  if (!toolName.trim())
    return undefined

  const normalizedToUnderscore = toolName.replace(/-/g, '_')
  if (normalizedToUnderscore !== toolName)
    return normalizedToUnderscore

  const normalizedToHyphen = toolName.replace(/_/g, '-')
  if (normalizedToHyphen !== toolName)
    return normalizedToHyphen

  return undefined
}

async function closeSession(session: McpServerSession) {
  try {
    await session.client.close()
  }
  catch {
    await session.transport.close()
  }
}

export function createMcpStdioManager(): McpStdioManager {
  const log = useLogg('main/mcp-stdio').useGlobalConfig()
  const sessions = new Map<string, McpServerSession>()
  const runtimeStatuses = new Map<string, ElectronMcpStdioServerRuntimeStatus>()
  let updatedAt = Date.now()

  const setRuntimeStatus = (status: ElectronMcpStdioServerRuntimeStatus) => {
    runtimeStatuses.set(status.name, status)
    updatedAt = Date.now()
  }

  const ensureConfigFile = async () => {
    const path = getConfigPath()
    await mkdir(app.getPath('userData'), { recursive: true })

    try {
      await readFile(path, 'utf-8')
    }
    catch {
      await writeFile(path, `${JSON.stringify(defaultMcpConfig, null, 2)}\n`)
    }

    return { path }
  }

  const openConfigFile = async () => {
    const { path } = await ensureConfigFile()
    const openResult = await shell.openPath(path)
    if (openResult) {
      throw new Error(openResult)
    }
    return { path }
  }

  const readConfigFile = async (path: string): Promise<ElectronMcpStdioConfigFile> => {
    const raw = await readFile(path, 'utf-8')
    const parsed = JSON.parse(raw) as unknown
    const validated = mcpConfigSchema.safeParse(parsed)
    if (!validated.success) {
      throw new Error(validated.error.issues.map(issue => issue.message).join('; '))
    }
    return validated.data
  }

  const stopAll = async () => {
    const entries = [...sessions.entries()]
    for (const [name, session] of entries) {
      await closeSession(session)
      setRuntimeStatus({
        name,
        state: 'stopped',
        command: session.config.command,
        args: session.config.args ?? [],
        pid: null,
      })
      sessions.delete(name)
    }
  }

  const startServer = async (name: string, config: ElectronMcpStdioServerConfig) => {
    const transport = new StdioClientTransport({
      command: config.command,
      args: config.args ?? [],
      env: createSpawnEnv(config.env),
      cwd: config.cwd,
      stderr: 'pipe',
    })
    const client = new Client({
      name: `proj-alicization:stage-tamagotchi:mcp:${name}`,
      version: app.getVersion(),
    })

    try {
      await client.connect(transport)
      transport.stderr?.on('data', (data) => {
        const text = data.toString('utf-8').trim()
        if (text) {
          log.withFields({ serverName: name }).warn(text)
        }
      })
      sessions.set(name, { client, transport, config })
      setRuntimeStatus({
        name,
        state: 'running',
        command: config.command,
        args: config.args ?? [],
        pid: transport.pid,
      })
    }
    catch (error) {
      await transport.close().catch(() => {})
      throw error
    }
  }

  const applyAndRestart = async (): Promise<ElectronMcpStdioApplyResult> => {
    const { path } = await ensureConfigFile()
    const config = await readConfigFile(path)

    await stopAll()
    runtimeStatuses.clear()

    const result: ElectronMcpStdioApplyResult = {
      path,
      started: [],
      failed: [],
      skipped: [],
    }

    for (const [name, server] of Object.entries(config.mcpServers)) {
      if (server.enabled === false) {
        result.skipped.push({ name, reason: 'disabled' })
        setRuntimeStatus({
          name,
          state: 'stopped',
          command: server.command,
          args: server.args ?? [],
          pid: null,
        })
        continue
      }

      try {
        await startServer(name, server)
        result.started.push({ name })
      }
      catch (error) {
        const message = stringifyError(error)
        result.failed.push({ name, error: message })
        setRuntimeStatus({
          name,
          state: 'error',
          command: server.command,
          args: server.args ?? [],
          pid: null,
          lastError: message,
        })
      }
    }

    updatedAt = Date.now()

    return result
  }

  const listTools = async (): Promise<ElectronMcpToolDescriptor[]> => {
    const entries = [...sessions.entries()].sort(([left], [right]) => left.localeCompare(right))
    const listResult = await Promise.all(entries.map(async ([serverName, session]) => {
      try {
        const response = await session.client.listTools(undefined, {
          timeout: mcpRequestTimeoutMsec,
          maxTotalTimeout: mcpRequestMaxTotalTimeoutMsec,
        })
        return response.tools.map<ElectronMcpToolDescriptor>(item => ({
          serverName,
          name: `${serverName}${toolNameSeparator}${item.name}`,
          toolName: item.name,
          description: item.description,
          inputSchema: item.inputSchema,
        }))
      }
      catch (error) {
        log.withFields({ serverName }).withError(error).warn('failed to list tools from mcp server')
        return []
      }
    }))

    return listResult.flat()
  }

  const callTool = async (payload: ElectronMcpCallToolPayload): Promise<ElectronMcpCallToolResult> => {
    if (isAlicizationKillSwitchSuspended()) {
      throw new Error('Alicization kill switch is suspended; MCP tool execution is disabled.')
    }

    const executeCall = async (session: McpServerSession, toolName: string): Promise<ElectronMcpCallToolResult> => {
      const startedAt = Date.now()
      const result = await session.client.callTool({
        name: toolName,
        arguments: payload.arguments ?? {},
      }, undefined, {
        timeout: mcpRequestTimeoutMsec,
        maxTotalTimeout: mcpRequestMaxTotalTimeoutMsec,
      })

      const normalized: ElectronMcpCallToolResult = {}
      if ('content' in result && Array.isArray(result.content)) {
        normalized.content = result.content as Array<Record<string, unknown>>
      }
      if (
        'structuredContent' in result
        && result.structuredContent != null
        && typeof result.structuredContent === 'object'
        && !Array.isArray(result.structuredContent)
      ) {
        normalized.structuredContent = result.structuredContent as Record<string, unknown>
      }
      if ('isError' in result && typeof result.isError === 'boolean') {
        normalized.isError = result.isError
      }
      if ('toolResult' in result) {
        normalized.toolResult = result.toolResult
      }
      normalized.ok = normalized.isError !== true
      normalized.errorCode = normalized.isError ? 'MCP_TOOL_ERROR' : undefined
      normalized.errorMessage = normalized.isError ? extractToolErrorMessage(normalized.content) : undefined
      normalized.durationMs = Date.now() - startedAt

      return normalized
    }

    const { serverName, toolName } = parseQualifiedToolName(payload.name)
    const session = sessions.get(serverName)
    if (!session) {
      throw new Error(`mcp server is not running: ${serverName}`)
    }

    try {
      return await executeCall(session, toolName)
    }
    catch (error) {
      if (!isFallbackEligibleMcpError(error)) {
        throw error
      }

      const fallbackToolName = resolveFallbackToolName(toolName)
      if (!fallbackToolName || fallbackToolName === toolName) {
        log.withFields({
          serverName,
          requestedToolName: toolName,
          fallbackEligible: true,
          fallbackAttempted: false,
        }).warn('mcp tool call failed and no eligible fallback tool name could be resolved')
        throw error
      }

      log.withFields({
        serverName,
        requestedToolName: toolName,
        fallbackToolName,
      }).warn('retrying mcp tool call with normalized tool name')

      try {
        const fallbackResult = await executeCall(session, fallbackToolName)
        log.withFields({
          serverName,
          requestedToolName: toolName,
          fallbackToolName,
        }).warn('mcp tool fallback call succeeded')
        return fallbackResult
      }
      catch (fallbackError) {
        log.withFields({
          serverName,
          requestedToolName: toolName,
          fallbackToolName,
        }).withError(fallbackError).warn('mcp tool fallback call failed')
        throw fallbackError
      }
    }
  }

  const getRuntimeStatus = (): ElectronMcpStdioRuntimeStatus => {
    return {
      path: getConfigPath(),
      servers: [...runtimeStatuses.values()].sort((left, right) => left.name.localeCompare(right.name)),
      updatedAt,
    }
  }

  const getCapabilitiesSnapshot = async (): Promise<ElectronMcpCapabilitiesSnapshot> => {
    const tools = await listTools()
    const servers = [...runtimeStatuses.values()].sort((left, right) => left.name.localeCompare(right.name))
    return {
      path: getConfigPath(),
      updatedAt: Date.now(),
      servers,
      tools,
      healthyServers: servers.filter(server => server.state === 'running').length,
    }
  }

  return {
    ensureConfigFile,
    openConfigFile,
    applyAndRestart,
    listTools,
    callTool,
    stopAll,
    getRuntimeStatus,
    getCapabilitiesSnapshot,
  }
}

export async function setupMcpStdioManager() {
  const log = useLogg('main/mcp-stdio').useGlobalConfig()
  const manager = createMcpStdioManager()

  const removeKillSwitchMcpLifecycleListener = onAlicizationKillSwitchChanged((snapshot) => {
    if (snapshot.state === 'SUSPENDED') {
      void manager.stopAll()
        .then(() => appendAlicizationRuntimeAuditLog({
          level: 'notice',
          category: 'alicization.tool.aborted.kill-switch',
          action: 'kill-switch-stop-all',
          message: 'Stopped all MCP sessions after kill switch suspension.',
          payload: {
            reason: snapshot.reason,
          },
        }))
        .catch(error => log.withError(error).warn('failed to stop mcp sessions after kill switch suspension'))
      return
    }

    void manager.applyAndRestart()
      .then(() => appendAlicizationRuntimeAuditLog({
        level: 'notice',
        category: 'alicization.tool.aborted.kill-switch',
        action: 'kill-switch-resume-restart',
        message: 'Re-applied MCP stdio config after kill switch resumed.',
      }))
      .catch(error => log.withError(error).warn('failed to restart mcp sessions after kill switch resumed'))
  })

  onAppBeforeQuit(async () => {
    removeKillSwitchMcpLifecycleListener()
    await manager.stopAll()
  })

  await manager.ensureConfigFile()
  if (isAlicizationKillSwitchSuspended()) {
    await manager.stopAll().catch(error => log.withError(error).warn('failed to stop mcp sessions while kill switch is suspended during startup'))
    return manager
  }

  try {
    await manager.applyAndRestart()
  }
  catch (error) {
    log.withError(error).warn('failed to apply mcp stdio config during startup')
  }

  return manager
}

export function createMcpServersService(params: { context: ReturnType<typeof createContext>['context'], manager: McpStdioManager }) {
  const log = useLogg('main/mcp-safety').useGlobalConfig()
  const pendingPermissionRequests = new Map<string, PendingPermissionRequest>()
  const sessionReadWhitelistByCard = new Map<string, Set<string>>()
  const userDataAbsolutePath = normalizeFsPath(app.getPath('userData'))
  const alicizationsRootPath = normalizeFsPath(join(app.getPath('userData'), 'alicizations'))
  const workspaceRootPath = normalizeFsPath(join(app.getPath('documents'), mcpWorkspaceDirectoryName))
  const absolutePathBlacklist = new Set<string>([
    alicizationsRootPath,
    normalizeFsPath(join(homedir(), '.ssh')),
    normalizeFsPath(join(homedir(), '.aws')),
    platform === 'win32' ? normalizeFsPath('C:\\Windows\\System32') : normalizeFsPath('/etc/shadow'),
  ])
  const ensureWorkspaceReady = mkdir(workspaceRootPath, { recursive: true }).catch((error) => {
    log.withError(error).warn('failed to prepare Alicization workspace directory')
  })

  function isPathDeniedByBlacklist(targetPath: string) {
    if (isPathWithin(userDataAbsolutePath, targetPath))
      return true

    for (const deniedPath of absolutePathBlacklist) {
      if (targetPath === deniedPath || isPathWithin(deniedPath, targetPath))
        return true
    }
    return false
  }

  function getSessionWhitelist(cardId: string) {
    const normalizedCardId = normalizeCardId(cardId)
    const known = sessionReadWhitelistByCard.get(normalizedCardId)
    if (known)
      return known

    const next = new Set<string>()
    sessionReadWhitelistByCard.set(normalizedCardId, next)
    return next
  }

  function isPathAllowedBySessionWhitelist(cardId: string, targetPath: string) {
    for (const allowedPath of getSessionWhitelist(cardId)) {
      if (targetPath === allowedPath || isPathWithin(allowedPath, targetPath))
        return true
    }
    return false
  }

  async function appendSafetyAudit(input: AlicizationAuditLogInput) {
    await appendAlicizationRuntimeAuditLog(input)
  }

  function evaluateToolPermission(payload: ElectronMcpCallToolPayload, cardId: string): ToolPermissionEvaluation {
    const parsed = parseQualifiedToolName(payload.name)
    const actionCategory = inferActionCategory(parsed.toolName)
    const rawPathCandidates = collectPathCandidates(payload.arguments ?? {})
    const pathCandidates = uniqueNormalizedPaths(rawPathCandidates, workspaceRootPath)
    const resourcePath = pathCandidates[0]

    const traversalEscapePath = rawPathCandidates
      .map(rawPath => ({
        rawPath,
        absolutePath: normalizeFsPath(rawPath, workspaceRootPath),
      }))
      .find(item =>
        hasRelativeTraversalSegment(item.rawPath)
        && !isPathWithin(workspaceRootPath, item.absolutePath),
      )

    if (traversalEscapePath) {
      return {
        decision: 'deny',
        riskLevel: 'danger',
        actionCategory,
        reason: 'Access denied by relative traversal escape policy.',
        resourcePath: traversalEscapePath.absolutePath,
      }
    }

    const blacklistedPath = pathCandidates.find(item => isPathDeniedByBlacklist(item))
    if (blacklistedPath) {
      return {
        decision: 'deny',
        riskLevel: 'danger',
        actionCategory,
        reason: 'Access denied by absolute path blacklist policy.',
        resourcePath: blacklistedPath,
      }
    }

    if (actionCategory === 'read') {
      if (pathCandidates.length > 0 && pathCandidates.every(item => isPathWithin(workspaceRootPath, item))) {
        return {
          decision: 'allow',
          riskLevel: 'safe',
          actionCategory,
          reason: 'Read path is inside Alicization workspace sandbox.',
          resourcePath,
          allowBy: 'workspace',
        }
      }

      if (pathCandidates.length > 0 && pathCandidates.every(item => isPathAllowedBySessionWhitelist(cardId, item) || isPathWithin(workspaceRootPath, item))) {
        return {
          decision: 'allow',
          riskLevel: 'safe',
          actionCategory,
          reason: 'Read path is allowed by in-memory session whitelist.',
          resourcePath,
          allowBy: 'session-whitelist',
        }
      }

      return {
        decision: 'prompt',
        riskLevel: 'sensitive',
        actionCategory,
        reason: resourcePath
          ? 'Read path is outside sandbox and requires one-time confirmation.'
          : 'Read operation has no explicit path and requires one-time confirmation.',
        resourcePath,
      }
    }

    if (actionCategory === 'write' || actionCategory === 'delete' || actionCategory === 'execute' || actionCategory === 'network') {
      return {
        decision: 'prompt',
        riskLevel: 'danger',
        actionCategory,
        reason: 'Dangerous tool action requires one-time human confirmation.',
        resourcePath,
      }
    }

    return {
      decision: 'prompt',
      riskLevel: 'sensitive',
      actionCategory,
      reason: 'Tool action cannot be confidently classified and requires one-time confirmation.',
      resourcePath,
    }
  }

  async function waitForPermissionDecision(
    request: AlicizationSafetyPermissionRequest,
    options?: {
      resourcePath?: string
      argumentsSummary?: ReturnType<typeof summarizeToolArguments>
    },
  ) {
    const resourcePath = options?.resourcePath
    const argumentsSummary = options?.argumentsSummary
    return await new Promise<AlicizationSafetyPermissionDecision>((resolve) => {
      const timeout = setTimeout(async () => {
        pendingPermissionRequests.delete(request.token)
        await appendSafetyAudit({
          level: 'warning',
          category: 'alicization.safety.permission',
          action: 'alicization.safety.permission.timeout',
          message: 'Tool permission request timed out.',
          payload: {
            cardId: request.cardId,
            requestId: request.requestId,
            riskLevel: request.riskLevel,
            toolName: request.toolName,
            path: maskPath(resourcePath),
            argumentsSummary,
          },
        })
        resolve({
          token: request.token,
          requestId: request.requestId,
          allow: false,
          reason: 'timeout',
        })
      }, request.timeoutMs)

      pendingPermissionRequests.set(request.token, {
        request,
        resolve,
        timeout,
        resourcePath,
        argumentsSummary,
      })
    })
  }

  function resolvePendingPermission(decision: AlicizationSafetyPermissionDecision, reason?: string): { accepted: boolean, reason?: string } {
    const pending = pendingPermissionRequests.get(decision.token)
    if (!pending)
      return { accepted: false, reason: reason ?? 'not-found' }

    clearTimeout(pending.timeout)
    pendingPermissionRequests.delete(decision.token)
    pending.resolve(decision)
    return { accepted: true }
  }

  async function denyAllPendingPermissionsOnKillSwitch() {
    if (pendingPermissionRequests.size <= 0)
      return

    for (const [token, pending] of pendingPermissionRequests.entries()) {
      clearTimeout(pending.timeout)
      pendingPermissionRequests.delete(token)
      await appendSafetyAudit({
        level: 'notice',
        category: 'alicization.safety.permission',
        action: 'alicization.safety.permission.denied',
        message: 'Tool permission request was denied because kill switch is suspended.',
        payload: {
          cardId: pending.request.cardId,
          requestId: pending.request.requestId,
          riskLevel: pending.request.riskLevel,
          toolName: pending.request.toolName,
          reason: 'kill-switch-suspended',
          path: maskPath(pending.resourcePath),
          argumentsSummary: pending.argumentsSummary,
        },
      })
      pending.resolve({
        cardId: pending.request.cardId,
        token,
        requestId: pending.request.requestId,
        allow: false,
        reason: 'kill-switch-suspended',
      })
    }
  }

  async function runToolCallWithKillSwitchGuard(payload: ElectronMcpCallToolPayload, cardId: string) {
    if (isAlicizationKillSwitchSuspended() || isAlicizationCardKillSwitchSuspended(cardId)) {
      return createToolErrorResult('ALICIZATION_TOOL_ABORTED', 'Alicization kill switch is suspended; tool execution was aborted.')
    }

    return await new Promise<ElectronMcpCallToolResult>((resolve) => {
      const detach = onAlicizationKillSwitchChanged((snapshot) => {
        if (snapshot.state !== 'SUSPENDED')
          return
        detach()
        resolve(createToolErrorResult('ALICIZATION_TOOL_ABORTED', 'Alicization kill switch is suspended; tool execution was aborted.'))
      })

      params.manager.callTool(payload)
        .then((result) => {
          detach()
          resolve(result)
        })
        .catch((error) => {
          detach()
          resolve(createToolErrorResult('MCP_CALL_FAILED', stringifyError(error)))
        })
    })
  }

  const removeKillSwitchListener = onAlicizationKillSwitchChanged((snapshot) => {
    if (snapshot.state !== 'SUSPENDED')
      return
    void denyAllPendingPermissionsOnKillSwitch()
  })
  onAppBeforeQuit(() => {
    removeKillSwitchListener()
    for (const pending of pendingPermissionRequests.values()) {
      clearTimeout(pending.timeout)
    }
    pendingPermissionRequests.clear()
    sessionReadWhitelistByCard.clear()
    sharedMcpListToolsInvoker = undefined
    sharedMcpCallToolInvoker = undefined
  })

  defineInvokeHandler(params.context, electronMcpOpenConfigFile, async () => {
    return params.manager.openConfigFile()
  })

  defineInvokeHandler(params.context, electronMcpApplyAndRestart, async () => {
    return params.manager.applyAndRestart()
  })

  defineInvokeHandler(params.context, electronMcpGetRuntimeStatus, async () => {
    return params.manager.getRuntimeStatus()
  })

  defineInvokeHandler(params.context, electronMcpListTools, async () => {
    return params.manager.listTools()
  })

  defineInvokeHandler(params.context, electronAlicizationSafetyResolvePermission, async (payload) => {
    if (typeof payload?.token !== 'string' || !payload.token.trim())
      return { accepted: false, reason: 'invalid-token' }

    const pending = pendingPermissionRequests.get(payload.token)
    if (!pending)
      return { accepted: false, reason: 'not-found' }

    if (typeof payload.requestId !== 'string' || payload.requestId.trim() !== pending.request.requestId) {
      return { accepted: false, reason: 'context-mismatch' }
    }
    if (payload.cardId && normalizeCardId(payload.cardId) !== pending.request.cardId) {
      return { accepted: false, reason: 'context-mismatch' }
    }

    const normalizedDecision: AlicizationSafetyPermissionDecision = {
      ...payload,
      reason: payload.reason ?? (payload.allow ? 'user-approved' : 'user-denied'),
    }

    const result = resolvePendingPermission(normalizedDecision, 'resolved')
    if (!result.accepted)
      return result

    if (payload.allow && payload.rememberSession && pending.request.actionCategory === 'read' && pending.resourcePath) {
      getSessionWhitelist(pending.request.cardId).add(pending.resourcePath)
      await appendSafetyAudit({
        level: 'notice',
        category: 'alicization.tool.allowed.session-whitelist',
        action: 'added',
        message: 'Added read path into session whitelist after user approval.',
        payload: {
          cardId: pending.request.cardId,
          requestId: pending.request.requestId,
          path: maskPath(pending.resourcePath),
          toolName: pending.request.toolName,
        },
      })
    }

    await appendSafetyAudit({
      level: payload.allow ? 'notice' : 'warning',
      category: 'alicization.safety.permission',
      action: payload.allow ? 'alicization.safety.permission.approved' : 'alicization.safety.permission.denied',
      message: payload.allow ? 'Tool permission approved by user.' : 'Tool permission denied by user.',
      payload: {
        cardId: pending.request.cardId,
        requestId: pending.request.requestId,
        riskLevel: pending.request.riskLevel,
        toolName: pending.request.toolName,
        reason: normalizedDecision.reason,
        path: maskPath(pending.resourcePath),
        argumentsSummary: pending.argumentsSummary,
      },
    })
    return { accepted: true }
  })

  const executeGuardedCallTool = async (payload: ElectronMcpCallToolPayload) => {
    await ensureWorkspaceReady
    const cardId = normalizeCardId(payload.cardId)

    if (isAlicizationKillSwitchSuspended() || getAlicizationCardKillSwitchSnapshot(cardId).state === 'SUSPENDED') {
      return createToolErrorResult('ALICIZATION_TOOL_ABORTED', 'Alicization kill switch is suspended; MCP tool execution is disabled.')
    }

    let parsedName: { serverName: string, toolName: string }
    try {
      parsedName = parseQualifiedToolName(payload.name)
    }
    catch (error) {
      return createToolErrorResult('INVALID_TOOL_NAME', stringifyError(error))
    }

    const permission = evaluateToolPermission(payload, cardId)
    const argumentsSummary = summarizeToolArguments(payload.arguments)
    if (permission.decision === 'deny') {
      await appendSafetyAudit({
        level: 'critical',
        category: 'alicization.tool.blocked.blacklist',
        action: 'deny',
        message: 'Blocked MCP tool execution due to deny policy in safety read funnel.',
        payload: {
          cardId,
          toolName: parsedName.toolName,
          serverName: parsedName.serverName,
          actionCategory: permission.actionCategory,
          reason: permission.reason,
          path: maskPath(permission.resourcePath),
          argumentsSummary,
        },
      })
      return createToolErrorResult('ALICIZATION_TOOL_DENIED_SYSTEM', 'Access denied. Internal system state cannot be accessed via generic I/O tools.')
    }

    if (permission.allowBy === 'workspace') {
      await appendSafetyAudit({
        level: 'notice',
        category: 'alicization.tool.allowed.workspace',
        action: 'allow',
        message: 'Allowed MCP tool read operation inside sandbox workspace.',
        payload: {
          cardId,
          toolName: parsedName.toolName,
          serverName: parsedName.serverName,
          path: maskPath(permission.resourcePath),
        },
      })
    }
    else if (permission.allowBy === 'session-whitelist') {
      await appendSafetyAudit({
        level: 'notice',
        category: 'alicization.tool.allowed.session-whitelist',
        action: 'allow',
        message: 'Allowed MCP tool read operation by session whitelist.',
        payload: {
          cardId,
          toolName: parsedName.toolName,
          serverName: parsedName.serverName,
          path: maskPath(permission.resourcePath),
        },
      })
    }

    if (permission.decision === 'prompt') {
      const request: AlicizationSafetyPermissionRequest = {
        cardId,
        requestId: randomUUID(),
        token: randomUUID(),
        riskLevel: permission.riskLevel,
        actionCategory: permission.actionCategory,
        serverName: parsedName.serverName,
        toolName: parsedName.toolName,
        reason: permission.reason,
        resourceLabel: maskPath(permission.resourcePath),
        argumentsSummary,
        timeoutMs: permissionRequestTimeoutMsec,
        createdAt: Date.now(),
        supportsRememberSession: permission.actionCategory === 'read',
      }

      await appendSafetyAudit({
        level: 'notice',
        category: 'alicization.safety.permission',
        action: 'alicization.safety.permission.requested',
        message: 'Requested human permission before executing risky MCP tool.',
        payload: {
          cardId,
          requestId: request.requestId,
          riskLevel: request.riskLevel,
          actionCategory: request.actionCategory,
          toolName: request.toolName,
          serverName: request.serverName,
          path: request.resourceLabel,
          argumentsSummary,
        },
      })

      params.context.emit(alicizationSafetyPermissionRequested, request)
      const decision = await waitForPermissionDecision(request, {
        resourcePath: permission.resourcePath,
        argumentsSummary,
      })
      if (!decision.allow) {
        return createPermissionDeniedResult(decision.reason)
      }
    }

    const result = await runToolCallWithKillSwitchGuard(payload, cardId)
    if (result.isError) {
      await appendSafetyAudit({
        level: result.errorCode === 'ALICIZATION_TOOL_ABORTED' ? 'notice' : 'warning',
        category: result.errorCode === 'ALICIZATION_TOOL_ABORTED' ? 'alicization.tool.aborted.kill-switch' : 'alicization.tool.execution',
        action: result.errorCode === 'ALICIZATION_TOOL_ABORTED' ? 'aborted' : 'failed',
        message: result.errorCode === 'ALICIZATION_TOOL_ABORTED'
          ? 'MCP tool execution aborted due to kill switch state.'
          : 'MCP tool execution failed.',
        payload: {
          cardId,
          toolName: parsedName.toolName,
          serverName: parsedName.serverName,
          errorCode: result.errorCode,
        },
      })
    }
    return result
  }

  sharedMcpListToolsInvoker = async () => await params.manager.listTools()
  sharedMcpCallToolInvoker = async payload => await executeGuardedCallTool(payload)

  defineInvokeHandler(params.context, electronMcpCallTool, async payload => await executeGuardedCallTool(payload))

  defineInvokeHandler(params.context, electronMcpGetCapabilitiesSnapshot, async () => {
    return params.manager.getCapabilitiesSnapshot()
  })
}
