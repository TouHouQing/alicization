import type { ExecutionPredicate, TaskAcceptance } from '../../../../shared/execution-contracts'
import type { LifeGoalVerification, LifeStateView } from '../../../../shared/life-contracts'
import type { AlicizationDbService } from '../db'

import { Buffer } from 'node:buffer'
import { createHash, randomUUID } from 'node:crypto'
import { open, realpath } from 'node:fs/promises'

import * as v from 'valibot'

import { browserDownloadReceiptSchema } from './browser-download-repository'
import { requireBrowserDownloadReservation } from './browser-download-reservations'

export type DownloadGoalPredicate = Extract<ExecutionPredicate, { kind: 'browser-download' }>

/** Observe only the artifact belonging to this accepted activation. Never retry it. */
export async function verifyExecutionDownload(input: { database: AlicizationDbService, view: LifeStateView, contract: TaskAcceptance, predicate: DownloadGoalPredicate }): Promise<LifeGoalVerification> {
  const base = { id: randomUUID(), kind: 'composite' as const, verifiedAt: Date.now(), independent: true }
  const unknown = (reason: string): LifeGoalVerification => ({ ...base, verdict: 'unknown', evidence: { reason, scope: 'downloaded-bytes-only' } })
  const { database, view, contract, predicate } = input
  const goal = view.obligations.find(item => item.id === contract.rootObligationId)
  const plan = view.execution?.plans.find(item => item.rootObligationId === goal?.id && item.acceptanceHash === contract.contractHash)
  const step = plan?.steps.find(item => item.id === predicate.stepId)
  const result = plan && view.execution?.results.find(item => item.planId === plan.id && item.planRevision === plan.revision && item.stepId === step?.id && item.inputHash === step.inputHash && item.state === 'verified')
  if (view.cardId !== contract.cardId || goal?.invalidatedBy || goal?.generation !== contract.obligationGeneration || !plan || plan.browserBinding?.kind !== 'managed' || plan.obligationGeneration !== contract.obligationGeneration || step?.capabilityId !== 'tool.browser_click_element' || !result?.effectId)
    return unknown('download-activation-not-current-and-verified')
  const effect = await database.getLifeEffect(result.effectId)
  const output = effect?.receipt?.output as Record<string, unknown> | undefined
  if (effect?.status !== 'settled' || effect.receipt?.outcome !== 'success' || effect.actionId !== step.id || effect.payload.capabilityId !== step.capabilityId || !output || typeof output.downloadReservationId !== 'string' || typeof output.browserActionId !== 'string')
    return unknown('download-activation-lacks-its-immutable-reservation-reference')
  const transferId = output.downloadReservationId
  const terminal = await database.getLifeIngress(`browser-download-result:${transferId}`)
  if (!terminal)
    return unknown('awaiting-native-download-terminal-evidence')
  const parsed = v.safeParse(browserDownloadReceiptSchema, terminal.payload)
  if (!parsed.success || terminal.source !== 'browser-download-result' || terminal.status !== 'settled')
    return unknown('download-terminal-evidence-invalid')
  const receipt = parsed.output
  if (receipt.id !== transferId || receipt.cardId !== contract.cardId || receipt.actionId !== output.browserActionId)
    return unknown('download-terminal-crossed-its-activation')
  if (receipt.state !== 'completed' || !receipt.sha256)
    return unknown('native-download-did-not-certify-completed-bytes')
  try {
    const reservation = await requireBrowserDownloadReservation(database, receipt)
    const began = await database.getLifeIngress(`browser-download:${transferId}`)
    const initial = v.safeParse(browserDownloadReceiptSchema, began?.payload)
    if (reservation.origin.kind !== 'life-effect' || reservation.origin.effectId !== effect.id || reservation.origin.turnId !== effect.turnId || !initial.success || began?.source !== 'browser-download' || initial.output.id !== receipt.id || initial.output.actionId !== receipt.actionId || initial.output.path !== receipt.path || initial.output.observationId !== receipt.observationId || initial.output.url !== receipt.url || initial.output.cardId !== receipt.cardId)
      return unknown('download-origin-or-native-beginning-not-bound')
    const canonical = await realpath(receipt.path)
    if (canonical !== receipt.path)
      return unknown('download-artifact-target-changed')
    const file = await open(canonical, 'r')
    try {
      const before = await file.stat()
      if (!before.isFile() || before.size > 67_108_864)
        return unknown('download-artifact-outside-verification-budget')
      const hash = createHash('sha256')
      const buffer = Buffer.alloc(65_536)
      let position = 0
      while (position < before.size) {
        const { bytesRead } = await file.read(buffer, 0, Math.min(buffer.length, before.size - position), position)
        if (!bytesRead)
          return unknown('download-artifact-changed-during-read')
        hash.update(buffer.subarray(0, bytesRead))
        position += bytesRead
      }
      const after = await file.stat()
      if (before.dev !== after.dev || before.ino !== after.ino || before.size !== after.size || before.mtimeMs !== after.mtimeMs || before.ctimeMs !== after.ctimeMs || await realpath(receipt.path) !== canonical)
        return unknown('download-artifact-changed-during-read')
      const actualHash = hash.digest('hex')
      const matches = receipt.bytes === before.size && receipt.sha256 === actualHash && before.size >= predicate.minimumBytes && (!predicate.sha256 || predicate.sha256 === actualHash)
      return { ...base, verdict: matches ? 'satisfied' : 'not-satisfied', evidence: { transferId, effectId: effect.id, planId: plan.id, planRevision: plan.revision, stepId: step.id, path: canonical, bytes: before.size, actualHash, receiptHash: receipt.sha256, scope: 'downloaded-bytes-only' } }
    }
    finally { await file.close() }
  }
  catch (error) {
    const missing = !!error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT'
    return { ...base, verdict: missing ? 'not-satisfied' : 'unknown', evidence: { transferId, reason: missing ? 'download-artifact-missing' : 'download-artifact-or-binding-unreadable', scope: 'downloaded-bytes-only' } }
  }
}
