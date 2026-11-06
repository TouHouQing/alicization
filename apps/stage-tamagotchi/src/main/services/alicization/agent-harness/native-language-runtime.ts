import type { ChildProcess } from 'node:child_process'

import { Buffer } from 'node:buffer'
import { spawn } from 'node:child_process'
import { createHash, randomUUID } from 'node:crypto'
import { readFile, realpath, stat } from 'node:fs/promises'
import { extname, isAbsolute, join, relative } from 'node:path'
import { env, execPath, kill, pid, platform } from 'node:process'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { markOwnedReadStopped } from '../execution/owned-read-stop'
import { isVerifiedWindowsProcessJobStop, prepareWindowsProcessJob, settleWindowsProcessJob, stopWindowsProcessJob } from '../execution/windows-process-job'
import { requiresPrivateReadConfirmation } from '../executor-adapters/private-read-policy'
import { createLspMessageDecoder, encodeLspMessage } from '../third-party/deepseek-lsp-framing'
import { agentRuntimeAsset } from './agent-runtime-assets'

export interface LanguageQuery {
  workspaceRoot: string
  filePath: string
  operation: 'definition' | 'references' | 'hover' | 'symbols' | 'diagnostics'
  line?: number
  character?: number
}

const methods = { definition: 'textDocument/definition', references: 'textDocument/references', hover: 'textDocument/hover', symbols: 'textDocument/documentSymbol' } as const
function within(root: string, path: string) {
  const part = relative(root, path)
  return part !== '..' && !part.startsWith('../') && !part.startsWith('..\\') && !isAbsolute(part)
}

/** Read-only LSP over a pinned server; requests cannot launch arbitrary commands. */
export async function queryNativeLanguage(input: LanguageQuery, options: {
  signal: AbortSignal
  authorize: () => Promise<void>
  processJobsRoot?: string
  executable?: string
  runtimeDirectory?: string
  onDiagnostic?: (event: string, detail: string) => void
}) {
  options.signal.throwIfAborted()
  await options.authorize()
  const root = await realpath(input.workspaceRoot)
  const path = await realpath(input.filePath)
  if (requiresPrivateReadConfirmation('cat', [root, path], root))
    throw new Error('Language service cannot inspect a private directory; use the confirmed file-reading capability')
  const extension = extname(path).toLowerCase()
  if (!within(root, path) || !(await stat(root)).isDirectory() || !/^\.(?:[cm]?[jt]s|[jt]sx)$/u.test(extension))
    throw new Error('Language queries require a TypeScript or JavaScript file inside the declared workspace')
  if ((await stat(path)).size > 2 * 1024 * 1024)
    throw new Error('Language document exceeds its byte budget')
  const text = await readFile(path, 'utf8')
  const uri = pathToFileURL(path).href
  const matchesDocument = (value: unknown) => {
    if (typeof value !== 'string' || !value.startsWith('file:'))
      return false
    try {
      const candidate = fileURLToPath(value)
      return platform === 'win32' ? candidate.toLowerCase() === path.toLowerCase() : candidate === path
    }
    catch { return false }
  }
  const position = { line: input.line ?? 0, character: input.character ?? 0 }
  const lines = text.split(/\r?\n/u)
  if (!Number.isSafeInteger(position.line) || position.line < 0 || position.line >= lines.length || !Number.isSafeInteger(position.character) || position.character < 0 || position.character > lines[position.line]!.length)
    throw new Error('Language position is outside the current UTF-16 document')
  const controller = new AbortController()
  const signal = AbortSignal.any([options.signal, controller.signal])
  const environment = Object.fromEntries(Object.entries(env).filter(([key, value]) => value && /^(?:PATH|SYSTEMROOT|WINDIR|COMSPEC|TEMP|TMP|USERPROFILE|HOME)$/iu.test(key)))
  Object.assign(environment, { ELECTRON_RUN_AS_NODE: '1', TS_DISABLE_SEND_STATS: '1' })
  const asset = (name: 'lsp/lib/cli.mjs' | 'typescript/lib/tsserver.js') => options.runtimeDirectory ? join(options.runtimeDirectory, name) : agentRuntimeAsset(name)
  const args = [asset('lsp/lib/cli.mjs'), '--stdio', '--log-level', '1']
  const owner = `language-service:${randomUUID()}`
  const executable = options.executable ?? execPath
  const prepared = platform === 'win32' ? await prepareWindowsProcessJob({ command: executable, args, cwd: root, env: environment, owner, protectedRoot: options.processJobsRoot }) : null
  await options.authorize()
  signal.throwIfAborted()
  const job = prepared?.start(async () => {
    try {
      await options.authorize()
      return !signal.aborted
    }
    catch { return false }
  })
  const child: ChildProcess = job?.child ?? spawn(executable, args, { cwd: root, env: environment, windowsHide: true, shell: false, detached: true, stdio: ['pipe', 'pipe', 'pipe'] })
  const decode = createLspMessageDecoder()
  let sequence = 0
  let closed = false
  let stderrBytes = 0
  let stderrTail = ''
  let diagnostics: unknown[] | null = null
  let diagnosticRevision = 0
  let failure: unknown = null
  const waiting = new Map<number, { resolve: (value: unknown) => void, reject: (error: unknown) => void }>()
  const exit = new Promise<void>((resolve) => {
    child.once('close', () => {
      closed = true
      rejectAll(new Error(`Language server closed${stderrTail ? `: ${stderrTail.slice(-2000)}` : ''}`))
      resolve()
    })
  })
  function rejectAll(error: unknown) {
    failure ??= error
    for (const pending of waiting.values())
      pending.reject(error)
    waiting.clear()
  }
  function stop() {
    if (job) {
      stopWindowsProcessJob(child)
    }
    else if (child.pid) {
      try {
        kill(-child.pid, 'SIGKILL')
      }
      catch { child.kill('SIGKILL') }
    }
  }
  function send(value: unknown) {
    if (closed || failure)
      throw failure ?? new Error('Language server is closed')
    child.stdin!.write(encodeLspMessage(value))
  }
  const abort = () => {
    rejectAll(signal.reason)
    stop()
  }
  const timer = setTimeout(() => controller.abort(new Error('Language query deadline exceeded')), 20000)
  signal.addEventListener('abort', abort, { once: true })
  child.once('error', error => rejectAll(error))
  child.once('spawn', () => options.onDiagnostic?.('spawn', String(child.pid)))
  child.stdin!.on('error', error => rejectAll(error))
  child.stderr!.on('data', (data: Buffer) => {
    stderrTail = (stderrTail + data.toString()).slice(-8192)
    options.onDiagnostic?.('stderr', data.toString().slice(0, 1024))
    stderrBytes += data.length
    if (stderrBytes > 1024 * 1024) {
      rejectAll(new Error('Language server diagnostic output exceeded its byte budget'))
      stop()
    }
  })
  child.stdout!.on('data', (data: Buffer) => {
    try {
      for (const raw of decode(data)) {
        if (!raw || typeof raw !== 'object' || Array.isArray(raw))
          throw new Error('Invalid LSP envelope')
        const message = raw as Record<string, any>
        options.onDiagnostic?.('message', JSON.stringify({ id: message.id, method: message.method, error: message.error, hasResult: 'result' in message }))
        if (typeof message.id === 'number' && !message.method) {
          const pending = waiting.get(message.id)
          waiting.delete(message.id)
          if (message.error)
            pending?.reject(new Error(`Language service request failed: ${JSON.stringify(message.error)}`))
          else
            pending?.resolve(message.result)
        }
        else if (message.method && message.id !== undefined) {
          // Never apply workspace edits or execute requests supplied by a server.
          send({ jsonrpc: '2.0', id: message.id, ...(message.method === 'workspace/configuration' ? { result: (message.params?.items ?? []).map(() => null) } : message.method === 'client/registerCapability' ? { result: null } : { error: { code: -32601, message: 'Host operation unavailable' } }) })
        }
        else if (message.method === 'textDocument/publishDiagnostics' && matchesDocument(message.params?.uri) && Array.isArray(message.params.diagnostics)) {
          diagnostics = message.params.diagnostics
          diagnosticRevision++
        }
      }
    }
    catch (error) {
      rejectAll(error)
      stop()
    }
  })
  function request(method: string, params: unknown): Promise<any> {
    signal.throwIfAborted()
    return new Promise((resolve, reject) => {
      const id = ++sequence
      waiting.set(id, { resolve, reject })
      try {
        send({ jsonrpc: '2.0', id, method, params })
      }
      catch (error) {
        waiting.delete(id)
        reject(error)
      }
    })
  }
  let result: unknown
  let stopped = false
  let queryFailure: unknown
  let queryFailed = false
  try {
    await request('initialize', { processId: pid, rootUri: pathToFileURL(root).href, capabilities: { workspace: { configuration: true, applyEdit: false }, textDocument: { synchronization: { didSave: false }, publishDiagnostics: { versionSupport: true } }, general: { positionEncodings: ['utf-16'] } }, initializationOptions: { disableAutomaticTypingAcquisition: true, plugins: [], tsserver: { path: asset('typescript/lib/tsserver.js') } } })
    send({ jsonrpc: '2.0', method: 'initialized', params: {} })
    send({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: { textDocument: { uri, languageId: extension === '.tsx' ? 'typescriptreact' : extension === '.jsx' ? 'javascriptreact' : ['.ts', '.mts', '.cts'].includes(extension) ? 'typescript' : 'javascript', version: 1, text } } })
    if (input.operation === 'diagnostics') {
      // Published diagnostics are a versioned snapshot, not a claim that every
      // file in the project has been analyzed. Wait for real publication.
      await request('textDocument/hover', { textDocument: { uri }, position })
      let quietUntil = Date.now() + 500
      let revision = diagnosticRevision
      for (;;) {
        signal.throwIfAborted()
        if (failure)
          throw failure
        if (diagnostics !== null && Date.now() >= quietUntil)
          break
        await new Promise(resolve => setTimeout(resolve, 20))
        if (revision !== diagnosticRevision) {
          revision = diagnosticRevision
          quietUntil = Date.now() + 500
        }
      }
      result = { diagnostics, coverage: 'published-document-snapshot', documentVersion: 1 }
    }
    else {
      result = await request(methods[input.operation], { textDocument: { uri }, ...(input.operation === 'symbols' ? {} : { position }), ...(input.operation === 'references' ? { context: { includeDeclaration: true } } : {}) })
    }
    // Filter locations from dependency libraries or imports outside the scope.
    function constrain(value: any): any {
      if (Array.isArray(value))
        return value.map(constrain).filter(item => item !== undefined)
      if (!value || typeof value !== 'object')
        return value
      for (const key of ['uri', 'targetUri']) {
        if (typeof value[key] === 'string' && (!value[key].startsWith('file:') || !within(root, fileURLToPath(value[key]))))
          return undefined
      }
      return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, constrain(item)]))
    }
    result = constrain(result) ?? null
    if (Buffer.byteLength(JSON.stringify(result)) > 128 * 1024)
      throw new Error('Language result exceeded its byte budget')
    await options.authorize()
  }
  catch (error) {
    queryFailed = true
    queryFailure = error
  }
  finally {
    clearTimeout(timer)
    signal.removeEventListener('abort', abort)
    stop()
    if (job) {
      const outcome = await settleWindowsProcessJob(child)
      stopped = isVerifiedWindowsProcessJobStop(outcome, owner)
    }
    else {
      let deadline: ReturnType<typeof setTimeout> | undefined
      await Promise.race([exit, new Promise((resolve) => {
        deadline = setTimeout(resolve, 5000)
      })])
      clearTimeout(deadline)
      if (closed && child.pid) {
        const until = Date.now() + 1000
        while (Date.now() < until) {
          try {
            kill(-child.pid, 0)
          }
          catch (error) {
            if (error && typeof error === 'object' && 'code' in error && error.code === 'ESRCH')
              stopped = true
            break
          }
          await new Promise(resolve => setTimeout(resolve, 10))
        }
      }
    }
    rejectAll(new Error('Language query settled'))
  }
  if (!stopped)
    throw new Error('Language server process tree has not been confirmed stopped')
  if (queryFailed)
    throw markOwnedReadStopped(queryFailure)
  return markOwnedReadStopped({ ok: true, finalStatus: 'completed', type: 'life-language-query', operation: input.operation, filePath: path, workspaceRoot: root, sourceHash: createHash('sha256').update(text).digest('hex'), positionEncoding: 'utf-16', result, nativeProcessTreeStopped: stopped })
}
