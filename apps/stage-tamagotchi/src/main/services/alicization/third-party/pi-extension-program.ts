// Adapted from Pi ExtensionRunner.emitToolCall / emitToolResult (MIT),
// earendil-works/pi 642e30b68930a644050794011555a04ed9027eb4,
// packages/coding-agent/src/core/extensions/runner.ts.
// Host integration, isolation, JSON schemas and bounded journals are Alicization's.
// License: resources/licenses/pi-file-tools-license.txt.
import { parse } from 'acorn'

/** Executed only inside the isolated heap, never eval'd by Node. */
export function piExtensionProgram(source: string) {
  const program = parse(source, { ecmaVersion: 'latest', sourceType: 'module' })
  const declarations = program.body.filter(node => node.type === 'ExportDefaultDeclaration')
  if (declarations.length !== 1 || program.body.some(node => node.type === 'ImportDeclaration' || (node.type.startsWith('Export') && node.type !== 'ExportDefaultDeclaration')))
    throw new Error('Extension must be a bundled JavaScript module with exactly one default export')
  const exported = declarations[0] as typeof declarations[number] & { declaration: { start: number, end: number } }
  const module = `${source.slice(0, exported.start)}\nconst extension = ${source.slice(exported.declaration.start, exported.declaration.end)};\n${source.slice(exported.end)}`
  return `
    const registered = new Map(), handlers = new Map(), entries = [];
    const supported = new Set(['tool_call', 'tool_result']);
    const pi = Object.freeze({
      registerTool(definition) {
        if (!definition || typeof definition.execute !== 'function' || typeof definition.name !== 'string' || !/^[a-z][a-z0-9_]{0,47}$/.test(definition.name) || registered.has(definition.name) || registered.size >= 16) throw new Error('Invalid or duplicate extension tool');
        registered.set(definition.name, definition);
      },
      on(name, handler) {
        if (!supported.has(name) || typeof handler !== 'function') throw new Error('Unsupported extension event: ' + name);
        if (!handlers.has(name)) handlers.set(name, []);
        if (handlers.get(name).length >= 16) throw new Error('Extension hook budget exceeded');
        handlers.get(name).push(handler);
      },
      appendEntry(customType, data) {
        if (input.mode !== 'execute' || typeof customType !== 'string' || !customType || customType.length > 64 || entries.length >= 16) throw new Error('Extension journal is available only to an owned tool execution within its entry budget');
        entries.push({customType, data});
      }
    });
    const context = Object.freeze({hasUI: false, cwd: input.cwd || '',
      sessionManager: Object.freeze({getEntries: () => JSON.parse(JSON.stringify(input.entries || [])), getSessionId: () => input.sessionId || ''}),
      tools: Object.freeze({call: (name, args) => call(name, args)})
    });
    ${module}
    if (typeof extension !== 'function') throw new Error('Extension must export a default function');
    await extension(pi);
    if (input.mode === 'discover') return {tools: [...registered.values()].map(tool => ({name: tool.name, label: tool.label || tool.name, description: tool.description || '', parameters: tool.parameters})), events: [...handlers.keys()]};
    async function emit(name, event) {
      let last;
      for (const handler of handlers.get(name) || []) {
        const result = await handler(event, context);
        if (result !== undefined) last = result;
        if (result && result.block) return result;
      }
      return last;
    }
    if (input.mode === 'event') {
      const result = await emit(input.event.type, input.event);
      return {result: result === undefined ? null : result, entries};
    }
    const tool = registered.get(input.name);
    if (!tool) throw new Error('Extension tool is unavailable');
    const blocked = await emit('tool_call', {type: 'tool_call', toolName: input.name, toolCallId: input.callId, input: input.arguments});
    if (blocked && blocked.block) return {blocked: true, reason: blocked.reason || 'Blocked by extension', entries};
    const value = await tool.execute(input.callId, input.arguments, Object.freeze({aborted: false}), () => {}, context);
    const current = {type: 'tool_result', toolName: input.name, toolCallId: input.callId, input: input.arguments, ...value};
    for (const handler of handlers.get('tool_result') || []) {
      const patch = await handler(current, context);
      if (!patch) continue;
      if (patch.content !== undefined) {
        current.content = patch.content;
        if (patch.structuredContent === undefined) delete current.structuredContent;
      }
      for (const key of ['details', 'structuredContent', 'isError']) if (patch[key] !== undefined) current[key] = patch[key];
      if (patch.usage !== undefined) throw new Error('Extension usage must come from host accounting');
    }
    return {result: current, entries};
  `
}
