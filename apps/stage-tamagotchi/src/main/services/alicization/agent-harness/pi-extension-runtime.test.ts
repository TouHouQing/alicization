import { createHash } from 'node:crypto'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { setupAlicizationDb } from '../db'
import { createCanonicalToolRegistry } from '../turn-os/tool-registry'
import { withGovernedReadScope } from './governed-read-scope'
import { createPiExtensionRuntime } from './pi-extension-runtime'

const source = `\uFEFF// A bundled module may retain its byte-order mark and leading declarations.
const label = 'Add';
export default function(pi) {
  pi.registerTool({name:'add', label, description:'Add numbers using the enabled extension', parameters:{type:'object',properties:{a:{type:'number'},b:{type:'number'}},required:['a','b'],additionalProperties:false},
    async execute(id, input, signal, onUpdate, context) {
      const before = context.sessionManager.getEntries().filter(entry => entry.customType === 'used').length;
      pi.appendEntry('used', {sum:input.a + input.b});
      return {content:[{type:'text',text:String(input.a+input.b)}],structuredContent:{sum:input.a+input.b},details:{before}};
    }
  });
  pi.on('tool_call', async event => event.input.a === 13 ? {block:true,reason:'unlucky test input'} : undefined);
  pi.on('tool_result', async event => ({content:[{type:'text',text:'sum='+event.content[0].text}]}));
}`

// Adapted directly from Pi's permission-gate.ts at
// 642e30b68930a644050794011555a04ed9027eb4 (MIT): removed TS-only syntax.
const permissionGate = `export default function(pi) {
  const dangerousPatterns = [/\\brm\\s+(-rf?|--recursive)/i, /\\bsudo\\b/i, /\\b(chmod|chown)\\b.*777/i];
  pi.on('tool_call', async (event, ctx) => {
    if (event.toolName !== 'bash') return undefined;
    if (dangerousPatterns.some(pattern => pattern.test(event.input.command)) && !ctx.hasUI)
      return {block:true,reason:'Dangerous command blocked (no UI for confirmation)'};
    return undefined;
  });
}`

describe('pi extensions in the real isolated heap and life journal', () => {
  it('keeps extension and tool namespace boundaries distinct in provider routing', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'alicization-pi-namespaces-'))
    const database = await setupAlicizationDb(directory, { cardId: 'alice' })
    try {
      const inputs = [{ id: 'a', name: 'b_x' }, { id: 'a-b', name: 'x' }]
      const configurations = []
      for (const input of inputs) {
        const source = `export default function(pi) { pi.registerTool({name:${JSON.stringify(input.name)},description:'An owned namespace routing check',parameters:{type:'object',properties:{},additionalProperties:false},async execute(){return {content:[{type:'text',text:${JSON.stringify(input.id)}}]};}}); }`
        const file = `${input.id}.js`
        await writeFile(join(directory, file), source)
        configurations.push({ id: input.id, file, sha256: createHash('sha256').update(source).digest('hex'), enabled: true, readTools: [] })
      }
      await writeFile(join(directory, 'extensions.json'), JSON.stringify(configurations))
      const registry = createCanonicalToolRegistry()
      const runtime = createPiExtensionRuntime({ directory, cardId: 'alice', database, registry })
      await runtime.refresh()
      expect(runtime.diagnostics()).toEqual([])
      const tools = runtime.tools()
      expect(tools.map(tool => tool.function.name)).toEqual(['ext_a_b_x', 'ext_a-b_x'])
      for (const [index, tool] of tools.entries()) {
        const input = inputs[index]!
        expect(registry.resolveProviderInvocation(tool.function.name, {})?.capabilityId).toBe(`extension.${input.id}.${input.name}`)
        const callId = `namespace-${index}`
        const result = await withGovernedReadScope({ owner: { cardId: 'alice', turnId: 'namespace', actionId: callId, conversationId: 'session' }, signal: new AbortController().signal, effectRefs: [], callTool: async () => {
          throw new Error('No read granted')
        } }, () => tool.execute({}, { toolCallId: callId, messages: [] })) as any
        expect(result.result.content[0].text).toBe(input.id)
      }
    }
    finally {
      await database.close()
      await rm(directory, { recursive: true, force: true })
    }
  })

  it('exposes stable distinct provider names while preserving full long canonical identities', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'alicization-pi-long-names-'))
    const database = await setupAlicizationDb(directory, { cardId: 'alice' })
    try {
      const id = 'x'.repeat(32)
      const names = ['a'.repeat(48), `${'a'.repeat(47)}b`]
      const source = `export default function(pi) { for (const name of ${JSON.stringify(names)}) pi.registerTool({name,description:'Owned long-name tool',parameters:{type:'object',properties:{},additionalProperties:false},async execute(){return {content:[{type:'text',text:name}]};}}); }`
      await writeFile(join(directory, 'long.js'), source)
      await writeFile(join(directory, 'extensions.json'), JSON.stringify([{ id, file: 'long.js', sha256: createHash('sha256').update(source).digest('hex'), enabled: true, readTools: [] }]))
      const registry = createCanonicalToolRegistry()
      const runtime = createPiExtensionRuntime({ directory, cardId: 'alice', database, registry })
      await runtime.refresh()
      expect(runtime.diagnostics()).toEqual([])
      const tools = runtime.tools()
      expect(tools).toHaveLength(2)
      expect(new Set(tools.map(tool => tool.function.name)).size).toBe(2)
      for (const [index, tool] of tools.entries()) {
        expect(tool.function.name).toHaveLength(64)
        expect(registry.resolveProviderInvocation(tool.function.name, {})?.capabilityId).toBe(`extension.${id}.${names[index]}`)
        const result = await withGovernedReadScope({ owner: { cardId: 'alice', turnId: 'long', actionId: `long-${index}`, conversationId: 'session' }, signal: new AbortController().signal, effectRefs: [], callTool: async () => {
          throw new Error('No read granted')
        } }, () => tool.execute({}, { toolCallId: `long-${index}`, messages: [] })) as any
        expect(result.result.content[0].text).toBe(names[index])
      }
    }
    finally {
      await database.close()
      await rm(directory, { recursive: true, force: true })
    }
  })

  it('composes registered tools and hooks, restores journal entries, blocks dangerous commands and keeps revocation effective', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'alicization-pi-extensions-'))
    let database = await setupAlicizationDb(directory, { cardId: 'alice' })
    const configurations = [
      { id: 'calculator', file: 'calculator.js', sha256: createHash('sha256').update(source).digest('hex'), enabled: true, readTools: [] },
      { id: 'permission', file: 'permission.js', sha256: createHash('sha256').update(permissionGate).digest('hex'), enabled: true, readTools: [] },
    ]
    try {
      await writeFile(join(directory, 'calculator.js'), source)
      await writeFile(join(directory, 'permission.js'), permissionGate)
      await writeFile(join(directory, 'extensions.json'), JSON.stringify(configurations))
      const registry = createCanonicalToolRegistry()
      let runtime = createPiExtensionRuntime({ directory, cardId: 'alice', database, registry })
      await runtime.refresh()
      expect(runtime.diagnostics()).toEqual([])
      expect(runtime.tools()).toHaveLength(1)
      let sequence = 0
      const execute = (tool = runtime.tools()[0]!, a = 2, callId = `call-${++sequence}`) => withGovernedReadScope({ owner: { cardId: 'alice', turnId: 'test', actionId: callId, conversationId: 'session' }, signal: new AbortController().signal, effectRefs: [], callTool: async () => {
        throw new Error('No IO granted')
      } }, () => tool.execute({ a, b: 3 }, { toolCallId: callId, messages: [] })) as Promise<any>
      const first = await execute()
      expect(first.result.content).toEqual([{ type: 'text', text: 'sum=5' }])
      expect(first.result.structuredContent).toBeUndefined()
      expect(first.result.details.before).toBe(0)
      expect((await execute(undefined, 13)).errorCode).toBe('EXTENSION_BLOCKED')
      await database.close()
      database = await setupAlicizationDb(directory, { cardId: 'alice' })
      runtime = createPiExtensionRuntime({ directory, cardId: 'alice', database, registry })
      await runtime.refresh()
      expect(await execute(undefined, 2, 'call-1')).toEqual(first)
      await expect(execute(undefined, 3, 'call-1')).rejects.toThrow('checkpoint identity')
      expect((await execute()).result.details.before).toBe(1)
      expect(await runtime.beforeToolCall({ toolName: 'cli', toolCallId: 'unsafe', input: { command: 'rm -rf ./cache' } }, new AbortController().signal)).toMatchObject({ extensionId: 'permission' })
      expect(await runtime.beforeToolCall({ toolName: 'cli', toolCallId: 'safe', input: { command: 'node --version' } }, new AbortController().signal)).toBeNull()
      const captured = runtime.tools()[0]!
      configurations[0]!.enabled = false
      await writeFile(join(directory, 'extensions.json'), JSON.stringify(configurations))
      await expect(execute(captured)).rejects.toThrow('revoked')
      await runtime.refresh()
      expect(runtime.tools()).toEqual([])
      expect(registry.resolveActive('extension.calculator.add')).toBeUndefined()
      configurations[0]!.enabled = true
      await writeFile(join(directory, 'extensions.json'), JSON.stringify(configurations))
      await writeFile(join(directory, 'calculator.js'), `${source}\n// changed without acknowledgement`)
      await runtime.refresh()
      expect(runtime.tools()).toEqual([])
      expect(runtime.diagnostics()).toEqual(expect.arrayContaining([expect.objectContaining({ id: 'calculator' })]))
    }
    finally {
      await database.close()
      await rm(directory, { recursive: true, force: true })
    }
  })

  it('supports declared governed reads without exposing Node or undeclared tools', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'alicization-pi-read-'))
    const database = await setupAlicizationDb(directory, { cardId: 'alice' })
    const extension = `export default function(pi) { pi.registerTool({name:'inspect',description:'Inspect one declared file',parameters:{type:'object',properties:{path:{type:'string'}},required:['path'],additionalProperties:false},async execute(id,input,signal,update,ctx){ return {content:[{type:'text',text:await ctx.tools.call('filesystem_read_file',input)}]}; }}); }`
    try {
      await writeFile(join(directory, 'inspect.js'), extension)
      await writeFile(join(directory, 'input.txt'), '真实文件内容')
      await writeFile(join(directory, 'extensions.json'), JSON.stringify([{ id: 'reader', file: 'inspect.js', sha256: createHash('sha256').update(extension).digest('hex'), enabled: true, readTools: ['filesystem_read_file'] }]))
      const runtime = createPiExtensionRuntime({ directory, database, cardId: 'alice', registry: createCanonicalToolRegistry() })
      await runtime.refresh()
      const reads: string[] = []
      const result = await withGovernedReadScope({ owner: { cardId: 'alice', turnId: 'read', actionId: 'read-1', conversationId: 'session' }, signal: new AbortController().signal, effectRefs: reads, callTool: async (name, input: any) => {
        expect(name).toBe('filesystem_read_file')
        reads.push('owned-read')
        return readFile(input.path, 'utf8')
      } }, () => runtime.tools()[0]!.execute({ path: join(directory, 'input.txt') }, { toolCallId: 'read-1', messages: [] })) as any
      expect(result.result.content[0].text).toBe('真实文件内容')
      expect(result.readEffectRefs).toEqual(['owned-read'])
      await expect(runtime.tools()[0]!.execute({ path: 'anything' }, { toolCallId: 'unowned', messages: [] })).rejects.toThrow('owning life turn')
    }
    finally {
      await database.close()
      await rm(directory, { recursive: true, force: true })
    }
  })
})
