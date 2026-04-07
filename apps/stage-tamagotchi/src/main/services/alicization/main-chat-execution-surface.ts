import type {
  AlicizationChannelCapability,
  AlicizationClawTaskIntent,
  AlicizationExecutionCapabilityChannel,
  AlicizationExecutionCapabilityInquiry,
  AlicizationExecutionChannel,
  AlicizationExecutionRoutingIntent,
  AlicizationExecutionRuntimeContext,
} from '@proj-alicization/stage-shared'
import type { ToolChoice } from '@xsai/shared-chat'

import type {
  AlicizationDispatchTaskThreadPayload,
  AlicizationSensoryCacheSnapshot,
} from '../../../shared/eventa'

import { detectAlicizationExecutionRoutingIntent } from '@proj-alicization/stage-shared'
import { tool } from '@xsai/tool'
import { z } from 'zod'

import { sanitizeBriefText } from './runtime-realtime'
import { sanitizeText } from './runtime-soul'

export interface MainGatewayExecutionToolContext {
  cardId: string
  decisionTraceId?: string | null
  sessionId?: string | null
  turnId: string
}

export interface MainGatewayExecutionTaskThreadResult {
  createdEventKinds?: string[]
  errorCode?: string
  errorMessage?: string
  ok: boolean
  output?: unknown | null
  plan: {
    state: string
  }
  stage: 'plan' | 'dispatch'
  summary: string
  thread: {
    id: string
    selectedChannel: AlicizationExecutionChannel | null
  }
}

export interface BuildExecutionCapabilitySystemBlocksOptions {
  allowTools?: boolean
  inquiry?: {
    capabilityQuestion: boolean
    mentionedChannels: AlicizationExecutionCapabilityChannel[]
  }
}

export interface BuildMainGatewayToolsOptions {
  buildExecutionRuntimeContext: (context: MainGatewayExecutionToolContext) => Promise<AlicizationExecutionRuntimeContext>
  context: MainGatewayExecutionToolContext
  executeTaskThread: (input: {
    context: MainGatewayExecutionToolContext
    dispatch: Pick<AlicizationDispatchTaskThreadPayload, 'claudeCode' | 'cli' | 'codex' | 'openclaw'>
    task: AlicizationClawTaskIntent
  }) => Promise<MainGatewayExecutionTaskThreadResult>
  executionCapabilityChannels: readonly AlicizationExecutionCapabilityChannel[]
  invokeMcpCallTool: (payload: {
    arguments?: Record<string, unknown>
    cardId?: string
    name: string
  }) => Promise<unknown>
  invokeMcpListTools: () => Promise<unknown>
  getSensorySnapshot: () => Promise<AlicizationSensoryCacheSnapshot> | AlicizationSensoryCacheSnapshot
  resolveTaskPlanningCapabilities: () => Promise<AlicizationChannelCapability[]>
  scheduleReminderTask: (
    cardId: string,
    payload: {
      message: string
      minutes: number
    },
    source: 'tool',
  ) => Promise<unknown>
}

export const mainGatewayExecutorToolNames = [
  'executor_run_cli',
  'executor_run_codex',
  'executor_run_claude_code',
  'executor_run_openclaw',
] as const

type MainGatewayExecutorToolName = typeof mainGatewayExecutorToolNames[number]

export function detectMainGatewayExecutionRoutingIntent(input: {
  userText: string
  capabilityInquiry: AlicizationExecutionCapabilityInquiry
}): AlicizationExecutionRoutingIntent | null {
  const userText = input.userText.trim()
  if (!userText)
    return null

  return detectAlicizationExecutionRoutingIntent({
    message: userText,
    capabilityInquiry: input.capabilityInquiry,
  })
}

export function buildMainGatewayExecutionRoutingToolChoice(intent: AlicizationExecutionRoutingIntent): ToolChoice {
  const requiredToolNames = [...new Set(intent.requiredToolNames
    .map(name => sanitizeText(name))
    .filter(Boolean))]

  if (requiredToolNames.length === 1) {
    return {
      type: 'function',
      function: { name: requiredToolNames[0] },
    }
  }

  return 'required'
}

function normalizeExecutorTimeoutMs(raw: number | undefined) {
  if (typeof raw !== 'number' || !Number.isFinite(raw))
    return undefined
  return raw
}

function toSensoryCaptureStateResult(snapshot: AlicizationSensoryCacheSnapshot, includeSystemSample: boolean) {
  return {
    generatedAt: Date.now(),
    running: snapshot.running,
    stale: snapshot.stale,
    ageMs: snapshot.ageMs,
    nextTickAt: snapshot.nextTickAt,
    foregroundWindow: snapshot.sample.foregroundWindow ?? null,
    capture: snapshot.capture
      ? {
          health: snapshot.capture.health,
          permission: snapshot.capture.permission,
          sourceCount: snapshot.capture.sourceCount,
          sessionPhase: snapshot.capture.sessionPhase,
          sessionReason: snapshot.capture.sessionReason,
          leaseStatus: snapshot.capture.leaseStatus,
          degradedReasons: snapshot.capture.degradedReasons,
          lastUpdatedAt: snapshot.capture.lastUpdatedAt,
          lastError: snapshot.capture.lastError,
        }
      : null,
    sample: includeSystemSample
      ? snapshot.sample
      : {
          collectedAt: snapshot.sample.collectedAt,
          time: snapshot.sample.time,
        },
  }
}

function toMainGatewayExecutorToolResult(result: MainGatewayExecutionTaskThreadResult) {
  return {
    status: result.ok ? 'completed' : result.stage === 'plan' ? 'not-routed' : 'failed',
    stage: result.stage,
    threadId: result.thread.id,
    selectedChannel: result.thread.selectedChannel,
    planState: result.plan.state,
    summary: result.summary,
    output: result.output ?? null,
    errorCode: result.errorCode,
    errorMessage: result.errorMessage,
    createdEventKinds: result.createdEventKinds ?? [],
  }
}

function defineMainGatewayExecutorToolSpec<TSchema extends z.ZodTypeAny>(spec: {
  description: string
  execute: (input: z.infer<TSchema>, context: MainGatewayExecutionToolContext) => Promise<MainGatewayExecutionTaskThreadResult>
  name: MainGatewayExecutorToolName
  parameters: TSchema
}) {
  return spec
}

export function buildExecutionRoutingEnforcementSystemBlock(intent: AlicizationExecutionRoutingIntent) {
  return [
    '[ALICIZATION_EXECUTION_ROUTING_GUARD]',
    `Detected explicit execution request for channels: ${intent.requestedChannels.join(', ')}.`,
    `Before writing any natural-language answer, you MUST call one of: ${intent.requiredToolNames.join(', ')}.`,
    'Do not pretend execution happened. If execution fails, report the tool failure honestly with its reason.',
    'Do not switch to screenshot narration when this execution guard is active.',
  ].join('\n')
}

export function buildExecutionCapabilitySystemBlocks(
  capabilities: AlicizationChannelCapability[],
  executionCapabilityChannels: readonly AlicizationExecutionCapabilityChannel[],
  options?: BuildExecutionCapabilitySystemBlocksOptions,
) {
  const capabilityMap = new Map(capabilities.map(item => [item.channel, item]))
  const inquiryChannels = Array.isArray(options?.inquiry?.mentionedChannels)
    ? options.inquiry.mentionedChannels
    : []
  const focusedChannels = inquiryChannels.filter(channel => executionCapabilityChannels.includes(channel))
  const displayChannels = focusedChannels.length > 0
    ? [
        ...focusedChannels,
        ...executionCapabilityChannels.filter(channel => !focusedChannels.includes(channel)),
      ]
    : [...executionCapabilityChannels]

  const rows = displayChannels.map((channel) => {
    const capability = capabilityMap.get(channel)
    const ready = capability?.ready !== false && capability?.available !== false && capability?.enabled !== false
    return [
      `- ${channel}: available=${capability?.available !== false ? 'true' : 'false'}`,
      `enabled=${capability?.enabled !== false ? 'true' : 'false'}`,
      `ready=${ready ? 'true' : 'false'}`,
      capability?.reason ? `reason=${capability.reason}` : '',
    ].filter(Boolean).join(', ')
  })

  const capabilityBlock = [
    '[ALICIZATION_EXECUTION_CAPABILITIES]',
    'Use this capability snapshot as the source of truth when answering whether you can execute through Alicization channels.',
    ...rows,
    focusedChannels.length > 0
      ? `Capability query focus: ${focusedChannels.join(', ')}.`
      : '',
    options?.inquiry?.capabilityQuestion
      ? 'Never collapse multi-channel capability answers into a blanket "cannot".'
      : '',
    options?.inquiry?.capabilityQuestion
      ? 'Answer each focused channel separately with yes/no and one short reason from this snapshot.'
      : '',
    options?.inquiry?.capabilityQuestion
      ? 'If any focused channel has ready=true, explicitly state that this channel is available now.'
      : '',
    options?.inquiry?.capabilityQuestion && options.allowTools
      ? 'When capability question is asked, call executor_capability_snapshot first if you need to re-check status before answering.'
      : '',
    'When user asks if you can use CLI/Codex/Claude Code/OpenClaw, answer strictly from this snapshot and never claim unavailable when ready=true.',
    'If ready=false, explain it is currently unavailable and suggest next setup/check step.',
  ].filter(Boolean).join('\n')

  const routerBlock = [
    '[ALICIZATION_EXECUTION_ROUTER]',
    'When the host asks you to execute real actions, route through executor tools instead of generic refusal.',
    '- Shell/terminal command tasks should call executor_run_cli when CLI is ready.',
    '- Codebase investigation/edit tasks should call executor_run_codex or executor_run_claude_code when the channel is ready.',
    '- Browser/software/desktop or mixed visual action tasks should call executor_run_openclaw when OpenClaw is ready.',
    '- OpenClaw dispatch automatically carries the latest Alicization sensory snapshot; call sensory_capture_state first when you need to inspect the surface before deciding the next action.',
    '- If you need to know whether live desktop capture is available or which window is foreground, call sensory_capture_state.',
    '- If requested channel is not ready, say which channel is unavailable and propose the nearest ready structured channel.',
    '- If required arguments are missing, ask one concise clarification question instead of refusing capability.',
  ].join('\n')

  return [capabilityBlock, routerBlock]
}

export async function buildMainGatewayTools(options: BuildMainGatewayToolsOptions) {
  const { context } = options

  const executorRunToolSpecs = [
    defineMainGatewayExecutorToolSpec({
      name: 'executor_run_cli',
      description: 'Plan and execute a CLI task thread through Alicization executor governance. Use this for local command execution.',
      parameters: z.object({
        command: z.string().min(1),
        args: z.array(z.string()).default([]),
        cwd: z.string().optional(),
        timeoutMs: z.coerce.number().optional(),
        goal: z.string().optional(),
        effect: z.enum(['observe', 'mutate', 'high-impact']).optional(),
        permissionMode: z.enum(['none', 'implicit', 'explicit']).optional(),
      }).strict(),
      execute: async ({ command, args, cwd, timeoutMs, goal, effect, permissionMode }, toolContext) => {
        const commandLabel = [command, ...(Array.isArray(args) ? args : [])].join(' ').trim()
        const runtimeContext = await options.buildExecutionRuntimeContext(toolContext)
        return await options.executeTaskThread({
          context: toolContext,
          task: {
            kind: 'run-command',
            goal: sanitizeText(goal) || `Run CLI command: ${sanitizeBriefText(commandLabel, 220)}`,
            origin: 'user',
            effect: effect ?? 'mutate',
            permissionMode: permissionMode ?? 'implicit',
            justification: 'grounded',
            riskBudget: 'medium',
            requestedChannel: 'cli',
            prefersPersistentSession: false,
            requiresVisualGrounding: false,
          },
          dispatch: {
            cli: {
              command,
              args,
              cwd: sanitizeText(cwd) || undefined,
              timeoutMs: normalizeExecutorTimeoutMs(timeoutMs),
              runtimeContext,
            },
          },
        })
      },
    }),
    defineMainGatewayExecutorToolSpec({
      name: 'executor_run_codex',
      description: 'Plan and execute a Codex task thread through Alicization executor governance for codebase edits or investigation.',
      parameters: z.object({
        prompt: z.string().min(1),
        kind: z.enum(['codebase-edit', 'codebase-investigation']).optional(),
        cwd: z.string().optional(),
        timeoutMs: z.coerce.number().optional(),
        model: z.string().optional(),
        profile: z.string().optional(),
        sandbox: z.enum(['read-only', 'workspace-write']).optional(),
        goal: z.string().optional(),
        effect: z.enum(['observe', 'mutate', 'high-impact']).optional(),
        permissionMode: z.enum(['none', 'implicit', 'explicit']).optional(),
      }).strict(),
      execute: async ({ prompt, kind, cwd, timeoutMs, model, profile, sandbox, goal, effect, permissionMode }, toolContext) => {
        const runtimeContext = await options.buildExecutionRuntimeContext(toolContext)
        return await options.executeTaskThread({
          context: toolContext,
          task: {
            kind: kind ?? 'codebase-edit',
            goal: sanitizeText(goal) || `Run Codex task: ${sanitizeBriefText(prompt, 220)}`,
            origin: 'user',
            effect: effect ?? 'mutate',
            permissionMode: permissionMode ?? 'implicit',
            justification: 'grounded',
            riskBudget: 'medium',
            requestedChannel: 'codex',
            prefersPersistentSession: true,
            requiresVisualGrounding: false,
          },
          dispatch: {
            codex: {
              prompt,
              cwd: sanitizeText(cwd) || undefined,
              timeoutMs: normalizeExecutorTimeoutMs(timeoutMs),
              model: sanitizeText(model) || undefined,
              profile: sanitizeText(profile) || undefined,
              sandbox,
              runtimeContext,
            },
          },
        })
      },
    }),
    defineMainGatewayExecutorToolSpec({
      name: 'executor_run_claude_code',
      description: 'Plan and execute a Claude Code task thread through Alicization executor governance for codebase edits or investigation. Edit tasks enable Claude Code tools by default unless allowTools=false is set explicitly.',
      parameters: z.object({
        prompt: z.string().min(1),
        kind: z.enum(['codebase-edit', 'codebase-investigation']).optional(),
        cwd: z.string().optional(),
        timeoutMs: z.coerce.number().optional(),
        model: z.string().optional(),
        allowTools: z.boolean().optional(),
        claudePermissionMode: z.enum(['default', 'acceptEdits', 'bypassPermissions', 'delegate', 'dontAsk', 'plan']).optional(),
        goal: z.string().optional(),
        effect: z.enum(['observe', 'mutate', 'high-impact']).optional(),
        permissionMode: z.enum(['none', 'implicit', 'explicit']).optional(),
      }).strict(),
      execute: async ({ prompt, kind, cwd, timeoutMs, model, allowTools, claudePermissionMode, goal, effect, permissionMode }, toolContext) => {
        const resolvedKind = kind ?? 'codebase-edit'
        const resolvedEffect = effect ?? (resolvedKind === 'codebase-investigation' ? 'observe' : 'mutate')
        const resolvedAllowTools = typeof allowTools === 'boolean'
          ? allowTools
          : resolvedEffect !== 'observe'
        const runtimeContext = await options.buildExecutionRuntimeContext(toolContext)
        return await options.executeTaskThread({
          context: toolContext,
          task: {
            kind: resolvedKind,
            goal: sanitizeText(goal) || `Run Claude Code task: ${sanitizeBriefText(prompt, 220)}`,
            origin: 'user',
            effect: resolvedEffect,
            permissionMode: permissionMode ?? 'implicit',
            justification: 'grounded',
            riskBudget: 'medium',
            requestedChannel: 'claude-code',
            prefersPersistentSession: true,
            requiresVisualGrounding: false,
          },
          dispatch: {
            claudeCode: {
              prompt,
              cwd: sanitizeText(cwd) || undefined,
              timeoutMs: normalizeExecutorTimeoutMs(timeoutMs),
              model: sanitizeText(model) || undefined,
              allowTools: resolvedAllowTools,
              permissionMode: claudePermissionMode,
              runtimeContext,
            },
          },
        })
      },
    }),
    defineMainGatewayExecutorToolSpec({
      name: 'executor_run_openclaw',
      description: 'Plan and execute an OpenClaw embodied task thread through Alicization executor governance for browser, software, desktop, or mixed visual actions. Alicization will attach the latest grounded sensory context automatically.',
      parameters: z.object({
        instruction: z.string().min(1),
        kind: z.enum(['run-command', 'codebase-edit', 'codebase-investigation', 'browser-automation', 'software-automation', 'desktop-automation', 'agent-delegation', 'mixed', 'unknown']).optional(),
        timeoutMs: z.coerce.number().optional(),
        senderId: z.string().optional(),
        roleName: z.string().optional(),
        sessionAffinityKey: z.string().optional(),
        goal: z.string().optional(),
        effect: z.enum(['observe', 'mutate', 'high-impact']).optional(),
        permissionMode: z.enum(['none', 'implicit', 'explicit']).optional(),
        justification: z.enum(['weak', 'grounded', 'explicit']).optional(),
        riskBudget: z.enum(['low', 'medium', 'high']).optional(),
        requiresVisualGrounding: z.boolean().optional(),
      }).strict(),
      execute: async ({ instruction, kind, timeoutMs, senderId, roleName, sessionAffinityKey, goal, effect, permissionMode, justification, riskBudget, requiresVisualGrounding }, toolContext) => {
        const resolvedKind = kind ?? 'browser-automation'
        const visualKinds = new Set(['browser-automation', 'software-automation', 'desktop-automation', 'mixed', 'unknown'])
        const runtimeContext = await options.buildExecutionRuntimeContext(toolContext)
        return await options.executeTaskThread({
          context: toolContext,
          task: {
            kind: resolvedKind,
            goal: sanitizeText(goal) || `Run OpenClaw task: ${sanitizeBriefText(instruction, 220)}`,
            origin: 'user',
            effect: effect ?? 'mutate',
            permissionMode: permissionMode ?? 'implicit',
            justification: justification ?? 'grounded',
            riskBudget: riskBudget ?? 'medium',
            requestedChannel: 'openclaw',
            prefersPersistentSession: true,
            requiresVisualGrounding: typeof requiresVisualGrounding === 'boolean'
              ? requiresVisualGrounding
              : visualKinds.has(resolvedKind),
          },
          dispatch: {
            openclaw: {
              instruction,
              timeoutMs: normalizeExecutorTimeoutMs(timeoutMs),
              senderId: sanitizeText(senderId) || undefined,
              roleName: sanitizeText(roleName) || undefined,
              sessionAffinityKey: sanitizeText(sessionAffinityKey) || undefined,
              runtimeContext,
            },
          },
        })
      },
    }),
  ] as const

  const executorRunTools = executorRunToolSpecs.map(spec => tool({
    name: spec.name,
    description: spec.description,
    parameters: spec.parameters,
    execute: async input => toMainGatewayExecutorToolResult(await spec.execute(input as never, context)),
  }))

  return await Promise.all([
    tool({
      name: 'set_reminder',
      description: '用于在系统后台设定一个真实的倒计时闹钟。注意：调用此工具后，真实的物理系统会在未来唤醒你。因此，你在本轮的 reply 中，【只允许】回复“已为你定好闹钟”等确认语句。绝对禁止在本轮回复中直接给出提醒内容！',
      parameters: z.object({
        minutes: z.coerce.number(),
        message: z.string(),
      }).strict(),
      execute: async ({ minutes, message }) => {
        return await options.scheduleReminderTask(context.cardId, {
          minutes: Number(minutes),
          message,
        }, 'tool')
      },
    }),
    tool({
      name: 'executor_capability_snapshot',
      description: 'Return Alicization execution channel capability snapshot for CLI/Codex/Claude Code/OpenClaw/OpenFang/Browser/Software/Desktop.',
      parameters: z.object({
        channels: z.array(z.enum(options.executionCapabilityChannels)).optional(),
      }).strict(),
      execute: async ({ channels }) => {
        const channelFilter = new Set((Array.isArray(channels) ? channels : [])
          .filter((channel): channel is AlicizationExecutionCapabilityChannel => options.executionCapabilityChannels.includes(channel as AlicizationExecutionCapabilityChannel)))
        const capabilities = await options.resolveTaskPlanningCapabilities()
        const normalized = capabilities
          .filter((capability) => {
            if (channelFilter.size === 0)
              return true
            return channelFilter.has(capability.channel as AlicizationExecutionCapabilityChannel)
          })
        return {
          generatedAt: Date.now(),
          channels: normalized,
        }
      },
    }),
    tool({
      name: 'sensory_capture_state',
      description: 'Return the current Alicization sensory and desktop capture state, including foreground window, capture permission, and capture health.',
      parameters: z.object({
        includeSystemSample: z.boolean().optional(),
      }).strict(),
      execute: async ({ includeSystemSample }) => {
        const snapshot = await options.getSensorySnapshot()
        return toSensoryCaptureStateResult(snapshot, includeSystemSample === true)
      },
    }),
    ...executorRunTools,
    tool({
      name: 'mcp_list_tools',
      description: 'List all tools available on the connected MCP servers.',
      parameters: z.object({}).strict(),
      execute: async () => await options.invokeMcpListTools(),
    }),
    tool({
      name: 'mcp_call_tool',
      description: 'Call a tool on MCP server by qualified tool name.',
      parameters: z.object({
        name: z.string().describe('Qualified MCP tool name, format: "<serverName>::<toolName>"'),
        parameters: z.array(z.object({
          name: z.string(),
          value: z.unknown(),
        }).strict()).default([]),
      }).strict(),
      execute: async ({ name, parameters = [] }) => {
        const argumentsObject = Object.fromEntries(parameters.map(entry => [entry.name, entry.value]))
        return await options.invokeMcpCallTool({
          cardId: context.cardId,
          name,
          arguments: argumentsObject,
        })
      },
    }),
  ])
}
