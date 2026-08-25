import type {
  AlicizationPersonaRuntimeConfig,
  AlicizationPersonaTrainingArtifact,
} from '@proj-alicization/stage-shared'

import type {
  PersonaRuntimeBackendDefinition,
  PersonaRuntimeProcessState,
  personaRuntimeRouteForConfig,
} from './persona-runtime-common'
import type { PersonaTrainingArtifactLoaderReceipt } from './persona-training-pipeline-gate'

import { access, stat } from 'node:fs/promises'
import { basename, dirname } from 'node:path'

import { errorMessageFrom } from '@moeru/std'

import {
  createPersonaRuntimeLifecycle,
  fetchPersonaRuntimeWithTimeout,
  normalizePersonaRuntimeConfig,

  personaRuntimeBaseModelMatches,
  personaRuntimeConnectionProbeMaxTokens,
  PersonaRuntimeTerminalProbeError,

  readPersonaRuntimeResponseText,
} from './persona-runtime-common'

const mlxProviderId = 'mlx-persona' as const
const mlxLoaderId = 'mlx-runtime'

function assertMlxConfig(config: AlicizationPersonaRuntimeConfig) {
  if ((config.backend ?? 'llama.cpp') !== 'mlx-runtime')
    throw new Error(`MLX Persona runtime requires backend "mlx-runtime"; received "${config.backend ?? 'llama.cpp'}"`)
}

async function assertMlxArtifactCompatible(
  artifact: AlicizationPersonaTrainingArtifact,
  config: AlicizationPersonaRuntimeConfig,
) {
  assertMlxConfig(config)
  if (artifact.format !== 'mlx-safetensors' || artifact.loaderTarget !== 'mlx-runtime') {
    throw new Error(
      `MLX Persona adapter requires an MLX safetensors artifact; received "${basename(artifact.path)}"`,
    )
  }
  if (!personaRuntimeBaseModelMatches(artifact, config)) {
    throw new Error(
      `Persona adapter base model "${artifact.baseModel}" does not match MLX model "${config.modelPath}"`,
    )
  }
  const modelStat = await stat(config.modelPath)
  if (!modelStat.isDirectory())
    throw new Error('MLX Persona model path must be a readable model directory')
  const artifactStat = await stat(artifact.path)
  if (!artifactStat.isFile())
    throw new Error('Persona adapter artifact is not a regular file')
  const adapterConfigPath = `${dirname(artifact.path)}/adapter_config.json`
  await access(adapterConfigPath).catch(() => {
    throw new Error(`MLX Persona adapter directory is missing adapter_config.json: ${adapterConfigPath}`)
  })
}

async function assertMlxConnectionConfig(config: AlicizationPersonaRuntimeConfig) {
  const modelStat = await stat(config.modelPath)
  if (!modelStat.isDirectory())
    throw new Error('MLX Persona base model path must be a readable model directory')
}

async function probeMlxHealth(
  route: ReturnType<typeof personaRuntimeRouteForConfig>,
  signal: AbortSignal,
  timeoutMs: number,
  selection?: {
    modelAlias: string
    modelPath: string
  },
): Promise<string> {
  const response = await fetchPersonaRuntimeWithTimeout(
    new URL('models', route.baseUrl),
    { signal },
    signal,
    timeoutMs,
    'mlx_lm.server model list',
  )
  const body = await readPersonaRuntimeResponseText(
    response,
    signal,
    timeoutMs,
    'mlx_lm.server model list request',
  )
  if (!response.ok)
    throw new Error(`mlx_lm.server model list returned HTTP ${response.status}: ${body.slice(0, 2_000)}`)
  let payload: unknown
  try {
    payload = JSON.parse(body)
  }
  catch {
    throw new Error('mlx_lm.server model list returned invalid JSON')
  }
  if (!payload || typeof payload !== 'object' || !Array.isArray((payload as { data?: unknown }).data)) {
    throw new Error('mlx_lm.server model list returned no models')
  }
  const modelIds: string[] = []
  for (const item of (payload as { data: unknown[] }).data) {
    if (!item || typeof item !== 'object')
      continue
    const id = (item as { id?: unknown }).id
    if (typeof id === 'string' && id.trim())
      modelIds.push(id.trim())
  }
  if (!modelIds.length)
    throw new Error('mlx_lm.server model list returned no models')

  const modelPath = selection?.modelPath.trim()
  const modelAlias = selection?.modelAlias.trim()
  const exactMatch = modelIds.find(modelId => modelId === modelPath || modelId === modelAlias)
  if (exactMatch)
    return exactMatch

  const modelPathBaseName = modelPath?.split('/').filter(Boolean).at(-1)
  const baseNameMatch = modelPathBaseName
    ? modelIds.find(modelId => modelId.split('/').filter(Boolean).at(-1) === modelPathBaseName)
    : undefined
  if (baseNameMatch)
    return baseNameMatch

  throw new PersonaRuntimeTerminalProbeError(
    `mlx_lm.server reported models but none matched configured model "${modelPath || modelAlias || route.model}"`,
  )
}

async function probeMlxChatCompletion(
  route: ReturnType<typeof personaRuntimeRouteForConfig>,
  model: string,
  signal: AbortSignal,
  timeoutMs: number,
) {
  const response = await fetchPersonaRuntimeWithTimeout(
    new URL('chat/completions', route.baseUrl),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: 'ping' }],
        max_tokens: personaRuntimeConnectionProbeMaxTokens,
        stream: false,
        temperature: 0,
      }),
    },
    signal,
    timeoutMs,
    'mlx_lm.server chat probe',
  )
  const body = await readPersonaRuntimeResponseText(
    response,
    signal,
    timeoutMs,
    'mlx_lm.server chat probe request',
  )
  if (!response.ok)
    throw new Error(`mlx_lm.server chat probe returned HTTP ${response.status}: ${body.slice(0, 2_000)}`)
  let payload: unknown
  try {
    payload = JSON.parse(body)
  }
  catch {
    throw new Error('mlx_lm.server chat probe returned invalid JSON')
  }
  const content = payload
    && typeof payload === 'object'
    && Array.isArray((payload as { choices?: unknown }).choices)
    ? (payload as {
        choices: Array<{
          message?: { content?: unknown }
        }>
      }).choices[0]?.message?.content
    : null
  if (typeof content !== 'string' || !content.trim())
    throw new Error('mlx_lm.server chat probe returned no assistant content')
}

const mlxBackend: PersonaRuntimeBackendDefinition = {
  backend: 'mlx-runtime',
  loaderId: mlxLoaderId,
  providerId: mlxProviderId,
  executableLabel: 'mlx_lm.server',
  artifactCheck: assertMlxArtifactCompatible,
  connectionCheck: assertMlxConnectionConfig,
  buildArgs: (config, artifact) => [
    '--model',
    config.modelPath,
    '--adapter-path',
    dirname(artifact.path),
    '--host',
    config.host,
    '--port',
    String(config.port),
  ],
  buildConnectionArgs: config => [
    '--model',
    config.modelPath,
    '--host',
    config.host,
    '--port',
    String(config.port),
  ],
  processMatchesState: (command: string, state: PersonaRuntimeProcessState) => command.includes('--model')
    && command.includes(state.modelPath)
    && command.includes('--adapter-path')
    && command.includes(dirname(state.artifactPath)),
  probeHealth: probeMlxHealth,
  probeChatCompletion: probeMlxChatCompletion,
}

export function normalizeMlxPersonaRuntimeConfig(raw: unknown): AlicizationPersonaRuntimeConfig {
  const config = normalizePersonaRuntimeConfig({
    ...(raw && typeof raw === 'object' ? raw : {}),
    backend: 'mlx-runtime',
  })
  assertMlxConfig(config)
  return config
}

export const normalizeAlicizationPersonaRuntimeConfig = normalizeMlxPersonaRuntimeConfig

export function createMlxPersonaRuntime(input?: {
  getConfig?: () => AlicizationPersonaRuntimeConfig | null
  now?: () => number
  probeRequestTimeoutMs?: number
  processTerminationTimeoutMs?: number
  processStatePath?: string
}) {
  const lifecycle = createPersonaRuntimeLifecycle({
    ...input,
    backend: mlxBackend,
    getConfig: () => {
      const config = input?.getConfig?.() ?? null
      return config ? normalizeMlxPersonaRuntimeConfig(config) : null
    },
  })

  return {
    ...lifecycle,
    loader: {
      load: async (loadInput: Parameters<typeof lifecycle.loader.load>[0]): Promise<PersonaTrainingArtifactLoaderReceipt> => {
        try {
          return await lifecycle.loader.load(loadInput)
        }
        catch (error) {
          throw new Error(errorMessageFrom(error) ?? String(error))
        }
      },
      unload: lifecycle.loader.unload,
    },
  }
}
