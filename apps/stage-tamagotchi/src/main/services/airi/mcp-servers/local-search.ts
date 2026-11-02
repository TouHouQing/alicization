import process from 'node:process'

import { Buffer } from 'node:buffer'
import { createHash } from 'node:crypto'
import { lstat, readFile, realpath, stat } from 'node:fs/promises'
import { isAbsolute, relative, resolve, sep } from 'node:path'
import { StringDecoder } from 'node:string_decoder'

import { prepareWindowsProcessJob } from '../../alicization/execution/windows-process-job'
import { localFilesystemSearchMaximumBytes, localFilesystemSearchMaximumResults } from './local-filesystem-schema'

export const localSearchBinarySha256 = '14231169855ec5205cf5a1b6f1db358ff4aed4247c86b69ce8aae647c77f6680'
const searchTimeBudgetMs = 8000
const preparationTimeBudgetMs = 15000

/** A missing native receipt cannot become a successful stop at an outer IPC. */
export class LocalSearchSettlementError extends Error {
  constructor() {
    super('Local search did not prove its owned process tree stopped')
  }
}

export interface LocalSearchInput {
  path: string
  query: string
  recursive?: boolean
  maxResults?: number
  maxReturnBytes?: number
  caseSensitive?: boolean
  regex?: boolean
  includeGlobs?: string[]
  excludeGlobs?: string[]
  pathMode?: 'absolute' | 'raw' | 'relative'
}

interface SearchMatch {
  path: string
  displayPath: string
  name: string
  type: 'file'
  line: number
  column: number
  text: string
  lineTruncated: boolean
}

function boundedInteger(value: number | undefined, fallback: number, maximum: number, minimum = 1) {
  if (value === undefined)
    return fallback
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum)
    throw new Error('Invalid local search budget')
  return value
}

/** Fixed argv only: no shell, preprocessor, ambient ripgrep config or PCRE2. */
export function buildLocalSearchArguments(input: LocalSearchInput, root: string) {
  if (typeof input.query !== 'string' || !input.query || input.query.length > 4096 || /[\0\r\n]/u.test(input.query))
    throw new Error('Local search requires a bounded single-line query')
  const args = ['--no-config', '--json', '--line-number', '--color=never', '--hidden', '--no-follow', '--engine=default', '--threads=1', '--sort=path', '--max-filesize=2M', '--regex-size-limit=1M', '--dfa-size-limit=1M', '--max-depth', input.recursive ? '9' : '1']
  if (!input.caseSensitive)
    args.push('--ignore-case')
  if (!input.regex)
    args.push('--fixed-strings')
  for (const [values, exclude] of [[input.includeGlobs, false], [input.excludeGlobs, true]] as const) {
    if (values === undefined)
      continue
    if (!Array.isArray(values) || values.length > 32 || values.some(glob => typeof glob !== 'string' || !glob || glob.startsWith('!') || glob.length > 512 || /[\0\r\n]/u.test(glob)))
      throw new Error('Invalid local search globs')
    for (const glob of values)
      args.push('--glob', `${exclude ? '!' : ''}${glob.replaceAll('\\', '/')}`)
  }
  args.push('--glob', '!**/.git/**', '--', input.query, root)
  return args
}

export async function verifyLocalSearchBinary(executable: string) {
  if (process.platform !== 'win32' || process.arch !== 'x64')
    throw new Error('Bundled local search is unavailable on this platform')
  const canonical = await realpath(executable)
  const info = await lstat(executable)
  if (!info.isFile() || info.isSymbolicLink() || info.size !== 4218880 || createHash('sha256').update(await readFile(canonical)).digest('hex') !== localSearchBinarySha256)
    throw new Error('Bundled local search binary identity mismatch')
  return canonical
}

async function waitForPreparation<T>(pending: Promise<T>, signal: AbortSignal) {
  signal.throwIfAborted()
  return new Promise<T>((resolveValue, reject) => {
    const onAbort = () => reject(signal.reason)
    signal.addEventListener('abort', onAbort, { once: true })
    // The fixed shared helper may finish preparing its cache. An aborted
    // request never receives that handle and cannot start a search target.
    void pending.then(resolveValue, reject).finally(() => signal.removeEventListener('abort', onAbort))
  })
}

function inside(root: string, target: string) {
  const local = relative(root, target)
  return local !== '..' && !local.startsWith(`..${sep}`) && !isAbsolute(local)
}

/**
 * Pi grep's fixed argv/JSON/match-limit/cancellation mechanism is adapted to
 * the desktop's existing signed Windows Job and dispatch ownership. References
 * and upstream MIT notice live with the bundled search resources.
 */
export async function readLocalSearch(input: LocalSearchInput, runtime: {
  executable: string
  signal?: AbortSignal
  assertAuthorized: () => Promise<unknown>
  processJobsRoot?: string
}) {
  const preparationDeadline = Date.now() + preparationTimeBudgetMs
  runtime.signal?.throwIfAborted()
  const maximum = boundedInteger(input.maxResults, 100, localFilesystemSearchMaximumResults)
  const byteLimit = boundedInteger(input.maxReturnBytes, 64000, localFilesystemSearchMaximumBytes, 1000)
  const root = await realpath(input.path)
  if (!(await stat(root)).isDirectory())
    throw new Error('Local text search requires a directory root')
  const args = buildLocalSearchArguments(input, root)
  const executable = await verifyLocalSearchBinary(runtime.executable)
  runtime.signal?.throwIfAborted()
  await runtime.assertAuthorized()
  runtime.signal?.throwIfAborted()
  // Cold fixed-helper compilation is a separate, bounded startup phase. It
  // cannot consume the search's execution budget or skip final authorization.
  const preparationSignal = AbortSignal.any([...(runtime.signal ? [runtime.signal] : []), AbortSignal.timeout(Math.max(1, preparationDeadline - Date.now()))])
  const prepared = await waitForPreparation(prepareWindowsProcessJob({ command: executable, args, cwd: root, env: { SystemRoot: process.env.SystemRoot, TEMP: process.env.TEMP, TMP: process.env.TMP }, owner: `filesystem-search:${createHash('sha256').update(JSON.stringify([root, args])).digest('hex')}`, protectedRoot: runtime.processJobsRoot }), preparationSignal)
  runtime.signal?.throwIfAborted()
  const deadline = Date.now() + searchTimeBudgetMs
  const matches: SearchMatch[] = []
  let truncated = false
  let budgetReason: string | null = null
  let stderr = ''
  let rawBytes = 0
  const settlementReserveBytes = Buffer.byteLength(JSON.stringify({ executionStopped: true, nativeProcessBindingHash: '0'.repeat(64) })) + 64
  const output = () => ({ path: root, matches, truncated, budgetReason, scope: 'observed-text-search-matches-only', coverage: { ignoreRules: true, hidden: true, linksFollowed: false, maximumDepth: input.recursive ? 9 : 1, maximumFileBytes: 2097152 }, columnUnit: 'utf8-byte' })
  if (Buffer.byteLength(JSON.stringify(output())) + settlementReserveBytes > byteLimit)
    throw new Error('Local search output budget cannot hold its root metadata')
  const job = prepared.start(async () => {
    runtime.signal?.throwIfAborted()
    await runtime.assertAuthorized()
    if (await realpath(input.path) !== root)
      throw new Error('Local search root changed before dispatch')
    return true
  })
  const stop = (reason: string) => {
    truncated = true
    budgetReason ??= reason
    job.stop(reason)
  }
  const onAbort = () => job.stop('host-cancelled')
  runtime.signal?.addEventListener('abort', onAbort, { once: true })
  if (runtime.signal?.aborted)
    onAbort()
  const timer = setTimeout(() => stop('search-deadline'), Math.max(1, deadline - Date.now()))
  timer.unref?.()
  job.child.stderr?.on('data', (chunk: Buffer) => {
    stderr = (stderr + chunk.toString('utf8')).slice(0, 8192)
  })
  // A failed spawn must be observed even when no stdout iterator is created.
  let processError: Error | undefined
  job.child.once('error', (error) => {
    processError = error
  })
  let failure: unknown
  try {
    const decoder = new StringDecoder('utf8')
    let pending = ''
    if (!job.child.stdout)
      throw new Error('Local search has no owned output stream')
    for await (const chunk of job.child.stdout) {
      runtime.signal?.throwIfAborted()
      rawBytes += chunk.length
      if (rawBytes > 16 * 1024 * 1024) {
        stop('raw-output-limit')
        continue
      }
      pending += decoder.write(chunk)
      if (pending.length > 3 * 1024 * 1024) {
        pending = ''
        stop('search-line-limit')
        continue
      }
      let newline: number
      while ((newline = pending.indexOf('\n')) >= 0) {
        const line = pending.slice(0, newline)
        pending = pending.slice(newline + 1)
        if (truncated || !line)
          continue
        const event = JSON.parse(line)
        if (event.type !== 'match')
          continue
        const data = event.data
        if (typeof data?.path?.text !== 'string' || typeof data.lines?.text !== 'string' || !Number.isSafeInteger(data.line_number) || data.line_number < 1)
          throw new Error('Invalid native search match')
        const candidate = resolve(root, data.path.text)
        const canonical = await realpath(candidate)
        const info = await lstat(candidate)
        if (!inside(root, canonical) || canonical !== candidate || !info.isFile() || info.isSymbolicLink())
          throw new Error('Local search observed a changed or outside-root target')
        await runtime.assertAuthorized()
        runtime.signal?.throwIfAborted()
        const name = relative(root, canonical).replaceAll('\\', '/')
        const text = data.lines.text.replace(/[\r\n]+$/u, '')
        const start = data.submatches?.[0]?.start
        if (!Number.isSafeInteger(start) || start < 0)
          throw new Error('Invalid native search column')
        // Structured paths remain canonical evidence for later owned reads;
        // presentation preferences never change a bound filesystem target.
        const match: SearchMatch = { path: canonical, displayPath: input.pathMode === 'relative' ? name : canonical, name, type: 'file', line: data.line_number, column: start + 1, text: text.slice(0, 2000), lineTruncated: text.length > 2000 }
        matches.push(match)
        // The final stopped-tree binding is part of the same output budget.
        if (matches.length > maximum || Buffer.byteLength(JSON.stringify(output())) + settlementReserveBytes > byteLimit) {
          matches.pop()
          stop(matches.length >= maximum ? 'match-limit' : 'return-byte-limit')
        }
      }
    }
    if (!truncated && (pending + decoder.end()).trim())
      throw new Error('Local search ended with incomplete JSON output')
  }
  catch (error) {
    failure = error
    job.stop('search-reader-failed')
  }
  finally {
    clearTimeout(timer)
    runtime.signal?.removeEventListener('abort', onAbort)
  }
  const outcome = await job.completion
  if (!outcome.treeStopped || !outcome.receipt)
    throw new LocalSearchSettlementError()
  runtime.signal?.throwIfAborted()
  if (failure)
    throw failure
  if (processError)
    throw processError
  if (!outcome.receipt.started)
    throw new Error('Local search dispatch was refused')
  if (!truncated && outcome.receipt.exitCode > 1)
    throw new Error(`Local search failed: ${stderr || 'native search error'}`)
  if (await realpath(input.path) !== root)
    throw new Error('Local search root changed before settlement')
  await runtime.assertAuthorized()
  return { ...output(), executionStopped: true, nativeProcessBindingHash: outcome.receipt.bindingHash }
}
