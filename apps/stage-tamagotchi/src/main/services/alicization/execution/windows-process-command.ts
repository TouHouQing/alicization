import type { WindowsProcessJobOutcome } from './windows-process-job'

import { Buffer } from 'node:buffer'

import { prepareWindowsProcessJob } from './windows-process-job'

/** Buffered native-command port; process closure and tree proof own settlement. */
export async function runWindowsProcessCommand(input: {
  command: string
  args: string[]
  cwd: string
  env: NodeJS.ProcessEnv
  owner: string
  protectedRoot?: string
  prefix: string
  timeoutMs: number
  maxBytes: number
  signal?: AbortSignal
  authorize: () => Promise<boolean>
  now: () => number
  startedAt: number
}) {
  const empty = { ok: false, stdout: '', stderr: '', exitCode: null, signal: null, durationMs: Math.max(0, input.now() - input.startedAt), aborted: input.signal?.aborted === true, timedOut: false }
  let prepared: Awaited<ReturnType<typeof prepareWindowsProcessJob>>
  try { prepared = await prepareWindowsProcessJob(input) }
  catch { return { ...empty, durationMs: Math.max(0, input.now() - input.startedAt), aborted: input.signal?.aborted === true, dispatchRefused: true as const, errorCode: `${input.prefix}_${input.signal?.aborted ? 'ABORTED' : 'PROCESS_PREPARATION_FAILED'}`, errorMessage: 'The owned process supervisor could not be prepared; no target process ran.' } }
  if (input.signal?.aborted || !await input.authorize())
    return { ...empty, durationMs: Math.max(0, input.now() - input.startedAt), aborted: input.signal?.aborted === true, dispatchRefused: true as const, errorCode: `${input.prefix}_${input.signal?.aborted ? 'ABORTED' : 'DISPATCH_REVOKED'}`, errorMessage: 'Current authority refused dispatch before target instructions ran.' }
  if (input.now() - input.startedAt >= input.timeoutMs)
    return { ...empty, durationMs: Math.max(0, input.now() - input.startedAt), timedOut: true, dispatchRefused: true as const, errorCode: `${input.prefix}_TIMEOUT`, errorMessage: 'The execution deadline elapsed during preparation; no target instructions ran.' }
  const job = prepared.start(input.authorize)
  const stdout: Buffer[] = []
  const stderr: Buffer[] = []
  let stdoutBytes = 0
  let stderrBytes = 0
  let aborted = false
  let timedOut = false
  let overflow = false
  const abort = () => { aborted = true; job.stop('request-cancelled') }
  const timeout = setTimeout(() => { timedOut = true; job.stop('execution-timeout') }, Math.max(1, input.timeoutMs - (input.now() - input.startedAt)))
  timeout.unref?.()
  input.signal?.addEventListener('abort', abort, { once: true })
  if (input.signal?.aborted)
    abort()
  function capture(chunks: Buffer[], bytes: number, chunk: Buffer | string) {
    const value = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    if (value.length > input.maxBytes - bytes) {
      overflow = true
      const remaining = Math.max(0, input.maxBytes - bytes)
      if (remaining)
        chunks.push(value.subarray(0, remaining))
      job.stop('output-budget')
      return input.maxBytes
    }
    chunks.push(value)
    return bytes + value.length
  }
  job.child.stdout?.on('data', chunk => stdoutBytes = capture(stdout, stdoutBytes, chunk))
  job.child.stderr?.on('data', chunk => stderrBytes = capture(stderr, stderrBytes, chunk))
  job.child.on('error', () => { /* The close event and native receipt own failure. */ })
  job.child.stdin?.end()
  let processTree: WindowsProcessJobOutcome
  try { processTree = await job.completion }
  finally {
    clearTimeout(timeout)
    input.signal?.removeEventListener('abort', abort)
  }
  const proof = processTree.receipt
  const unverified = !processTree.treeStopped || !proof || proof.errorCode !== null
  const dispatchRefused = processTree.dispatchRefused ? true as const : undefined
  const ok = !aborted && !timedOut && !overflow && !unverified && !dispatchRefused && proof?.reason === 'completed' && proof.exitCode === 0
  const errorCode = ok ? undefined : `${input.prefix}_${aborted ? 'ABORTED' : timedOut ? 'TIMEOUT' : dispatchRefused ? 'DISPATCH_REVOKED' : unverified ? 'PROCESS_TREE_UNVERIFIED' : overflow ? 'OUTPUT_LIMIT' : 'EXECUTE_FAILED'}`
  return { ok, stdout: Buffer.concat(stdout).toString('utf8'), stderr: Buffer.concat(stderr).toString('utf8'), exitCode: proof?.exitCode ?? null, signal: null, durationMs: Math.max(0, input.now() - input.startedAt), aborted, timedOut, dispatchRefused, processTree, errorCode, errorMessage: ok ? undefined : 'The owned native command did not complete successfully; inspect its bounded execution receipt.' }
}
