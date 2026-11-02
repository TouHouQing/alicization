import type { ExecutionPredicate, TaskAcceptance } from '../../../../shared/execution-contracts'
import type { LifeGoalVerification, LifeObligation } from '../../../../shared/life-contracts'
import type { LifeInterfaceObservation } from '../life-interface-action-closure'

import { createHash, randomUUID } from 'node:crypto'
import { open, opendir, realpath, stat } from 'node:fs/promises'

import { compileTaskAcceptance, executionDigest } from './acceptance-compiler'
import { verifyRegisteredExecutionCriterion } from './verification-recipes'

async function readStableText(path: string) {
  const file = await open(path, 'r')
  try {
    const before = await file.stat()
    if (!before.isFile() || before.size > 4 * 1024 * 1024)
      throw new Error('ARTIFACT_OUTSIDE_VERIFICATION_BUDGET')
    const bytes = await file.readFile()
    const after = await file.stat()
    if (before.ino !== after.ino || before.size !== after.size || before.mtimeMs !== after.mtimeMs || before.ctimeMs !== after.ctimeMs || bytes.length !== before.size)
      throw new Error('ARTIFACT_CHANGED_DURING_VERIFICATION')
    return { text: new TextDecoder('utf-8', { fatal: true }).decode(bytes), sha256: createHash('sha256').update(bytes).digest('hex') }
  }
  finally { await file.close() }
}

export async function verifyTaskAcceptance(input: {
  acceptance: TaskAcceptance
  obligation: LifeObligation
  readSetting: (key: string) => Promise<string | undefined>
  verifyFile: (proof: { path: string, contentHash: string }) => Promise<LifeGoalVerification>
  observeInterface?: (proof: LifeObligation['proof']) => Promise<LifeInterfaceObservation | null>
  now?: () => number
  readReview?: (criterionId: string) => Promise<{ receiptId: string, satisfied: boolean, artifactFingerprint: string, source: string } | null>
  readDownload?: (predicate: Extract<ExecutionPredicate, { kind: 'browser-download' }>) => Promise<LifeGoalVerification>
  readFileMatch?: (predicate: Extract<ExecutionPredicate, { kind: 'file-matches-read' }>) => Promise<LifeGoalVerification>
}): Promise<LifeGoalVerification> {
  const { contractHash, ...body } = input.acceptance
  const compiled = compileTaskAcceptance(body)
  const base = { id: randomUUID(), kind: 'composite' as const, verifiedAt: (input.now ?? Date.now)(), independent: true }
  const goal = input.obligation
  if (compiled.contractHash !== contractHash || goal.cardId !== body.cardId || goal.id !== body.rootObligationId || goal.generation !== body.obligationGeneration || goal.invalidatedBy || ['fulfilled', 'cancelled', 'superseded'].includes(goal.status))
    return { ...base, verdict: 'stale', evidence: { reason: 'acceptance-fence-changed', contractHash } }
  const results: Array<{ id: string, required: boolean, scope: string, verdict: LifeGoalVerification['verdict'], independent: boolean, evidence: Record<string, unknown> }> = []
  for (const item of compiled.criteria) {
    const predicate = item.predicate
    let verdict: LifeGoalVerification['verdict'] = 'unknown'
    let independent = true
    let evidence: Record<string, unknown> = {}
    try {
      if (predicate.kind === 'file-bytes') {
        const result = await input.verifyFile({ path: predicate.path, contentHash: predicate.sha256 })
        verdict = result.verdict
        evidence = result.evidence
      }
      else if (predicate.kind === 'file-matches-read') {
        const result = await input.readFileMatch?.(predicate)
        verdict = result?.verdict ?? 'unknown'
        independent = result?.independent ?? true
        evidence = result?.evidence ?? { reason: 'bound-file-read-verifier-unavailable', scope: 'observed-source-bytes' }
      }
      else if (predicate.kind === 'browser-download') {
        const result = await input.readDownload?.(predicate)
        verdict = result?.verdict ?? 'unknown'
        independent = result?.independent ?? true
        evidence = result?.evidence ?? { reason: 'bound-download-reader-unavailable', scope: 'downloaded-bytes-only' }
      }
      else if (predicate.kind === 'json-structure' || predicate.kind === 'text-content') {
        const actual = await readStableText(predicate.path)
        if (predicate.kind === 'json-structure') {
          const parsed: unknown = JSON.parse(actual.text)
          verdict = parsed && typeof parsed === 'object' && !Array.isArray(parsed) && predicate.requiredKeys.every(key => Object.hasOwn(parsed, key)) ? 'satisfied' : 'not-satisfied'
        }
        else { verdict = predicate.includes.every(text => actual.text.includes(text)) ? 'satisfied' : 'not-satisfied' }
        evidence = { path: predicate.path, actualHash: actual.sha256, scope: 'structure-only' }
      }
      else if (predicate.kind === 'directory-members') {
        const path = await realpath(predicate.path)
        const before = await stat(path)
        if (!before.isDirectory())
          throw new Error('ACCEPTED_DIRECTORY_UNAVAILABLE')
        const directory = await opendir(path)
        const names: string[] = []
        for await (const item of directory) {
          if (names.length >= 4096)
            throw new Error('DIRECTORY_VERIFICATION_BUDGET')
          names.push(item.name)
        }
        const after = await stat(path)
        if (await realpath(predicate.path) !== path || before.ino !== after.ino || before.mtimeMs !== after.mtimeMs || before.ctimeMs !== after.ctimeMs)
          throw new Error('ACCEPTED_DIRECTORY_CHANGED')
        const members = new Set(names)
        verdict = predicate.names.every(name => members.has(name)) && (!predicate.exact || members.size === new Set(predicate.names).size) ? 'satisfied' : 'not-satisfied'
        evidence = { path, memberCount: names.length, actualHash: executionDigest(names.sort()), scope: 'directory-names-only' }
      }
      else if (predicate.kind === 'setting') {
        verdict = await input.readSetting(predicate.key) === predicate.expected ? 'satisfied' : 'not-satisfied'
        evidence = { key: predicate.key, scope: 'setting-value' }
      }
      else if (predicate.kind === 'interface-state') {
        const actual = await input.observeInterface?.({ ...predicate, kind: 'interface-state' })
        if (actual)
          verdict = actual.channel === predicate.channel && actual.targetId === predicate.targetId && actual.contentHash === predicate.contentHash && actual.predicateMatched === true ? 'satisfied' : 'not-satisfied'
        evidence = { scope: 'displayed-interface-only', observationAvailable: Boolean(actual) }
      }
      else if (predicate.kind === 'user-review') {
        independent = false
        const receipt = await input.readReview?.(item.id)
        if (receipt) {
          verdict = receipt.satisfied ? 'satisfied' : 'not-satisfied'
          evidence = receipt
        }
        else { evidence = { reason: 'awaiting-current-artifact-user-review', scope: 'user-reported' } }
      }
      else if (predicate.kind === 'quality-review' || predicate.kind === 'external-receipt') {
        const checked = await verifyRegisteredExecutionCriterion({ contract: compiled, readSetting: input.readSetting, readDownload: input.readDownload, now: input.now }, item)
        verdict = checked.verdict
        independent = checked.independent
        evidence = checked.evidence
      }
      else {
        evidence = { reason: 'awaiting-bound-review-or-external-receipt', scope: item.proofScope }
      }
    }
    catch (error) {
      const missing = !!error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT'
      verdict = missing || error instanceof SyntaxError ? 'not-satisfied' : 'unknown'
      evidence = { reason: missing ? 'artifact-missing' : 'artifact-unreadable-or-invalid' }
    }
    results.push({ id: item.id, required: item.required, scope: item.proofScope, verdict, independent, evidence })
  }
  const required = results.filter(item => item.required)
  const verdict = required.some(item => item.verdict === 'not-satisfied') ? 'not-satisfied' : required.every(item => item.verdict === 'satisfied') ? 'satisfied' : 'unknown'
  return { ...base, verdict, independent: required.every(item => item.independent), evidence: { contractHash, revision: body.revision, criteria: results } }
}
