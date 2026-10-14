import process from 'node:process'

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'

import { generateText } from '@xsai/generate-text'

import { lifePersonaJudgeResponseFormat } from '../life-persona-development-runtime'

// Explicit optional acceptance: credentials stay in memory, prompts contain
// isolated synthetic QA identities only, and no user persona is adopted.
export async function configuredLifeGeneration() {
  const config = JSON.parse(await readFile(join(process.env.APPDATA!, 'com.tohoqing.alicization', 'alicizations', 'llm-config.json'), 'utf8'))
  if (!config.activeProviderId || !config.activeModelId)
    throw new Error('Configured life trial requires an active model route')
  const credentials = config.providerCredentials?.[config.activeProviderId] ?? {}
  const rawBase = credentials.baseUrl ?? credentials.baseURL
  if (typeof rawBase !== 'string')
    throw new Error('Configured life trial requires an explicit provider endpoint')
  const baseURL = rawBase.endsWith('/') ? rawBase : `${rawBase}/`
  let calls = 0
  return {
    generate: async (input: { system: string, user?: string, judge: boolean, signal?: AbortSignal }) => {
      const timeout = AbortSignal.timeout(60000)
      const signal = input.signal ? AbortSignal.any([input.signal, timeout]) : timeout
      try {
        const result = await generateText({ baseURL, model: config.activeModelId, apiKey: credentials.apiKey, headers: credentials.headers, abortSignal: signal, maxTokens: 2048, messages: [{ role: 'system', content: input.system }, { role: 'user', content: input.user ?? '你好' }], ...(input.judge ? { responseFormat: lifePersonaJudgeResponseFormat } : {}) })
        calls++
        if (!result.text?.trim())
          throw new Error('empty')
        return result.text
      }
      catch {
        // Avoid serializing provider request objects or credentials on failure.
        throw new Error(`Configured life generation ${calls + 1} failed or returned no text`)
      }
    },
    save: async (name: string, result: unknown) => {
      const output = resolve('../../output/life-acceptance')
      await mkdir(output, { recursive: true })
      await writeFile(join(output, `${name}.json`), JSON.stringify({ scope: 'Actual configured-model generations over synthetic QA fixtures; no human quality endorsement or adopted user persona', calls, result }, null, 2))
    },
    calls: () => calls,
  }
}
