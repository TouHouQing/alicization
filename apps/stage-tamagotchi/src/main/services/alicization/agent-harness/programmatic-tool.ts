import { tool } from '@xsai/tool'
import { z } from 'zod'

import { markOwnedReadStopped } from '../execution/owned-read-stop'
import { governedReadScope } from './governed-read-scope'
import { runIsolatedProgram } from './isolated-program'

export const programmaticToolName = 'life_programmatic_read'
export const programmaticCapabilityId = `tool.${programmaticToolName}`
export const programmaticInputSchema = { type: 'object', properties: { code: { type: 'string', minLength: 1, maxLength: 16000 } }, required: ['code'], additionalProperties: false }

export function createProgrammaticReadTool() {
  return tool({
    name: programmaticToolName,
    description: 'Run bounded JavaScript to combine and reduce local file reads in one model step. Use await call("filesystem_read_file", {path: ...}) or the available filesystem list/search tool names, and return a JSON value. Promise.all is allowed. Maximum 16 calls; no imports, filesystem, network or process globals. Every read still has current risk admission, durable receipts and cancellation. Mutations, delegation and recursive programs are unavailable here; propose those as ordinary actions.',
    parameters: z.object({ code: z.string().min(1).max(16000) }).strict(),
    execute: async ({ code }) => {
      const scope = governedReadScope()
      const output = await runIsolatedProgram({ code, signal: scope.signal, callTool: scope.callTool })
      return markOwnedReadStopped({ ok: true, finalStatus: 'completed', operation: 'programmatic_read', type: 'life-programmatic-read', ...output, effectRefs: [...scope.effectRefs] })
    },
  })
}
