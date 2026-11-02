import type { AlicizationDbService } from '../db'
import type { BrowserDownloadReceipt } from './browser-downloads'

import { isAbsolute } from 'node:path'

import * as v from 'valibot'

import { executionDigest } from './acceptance-compiler'
import { browserDownloadReservationSchema, browserDownloadRuntimeId, requireBrowserDownloadReservation } from './browser-download-reservations'

const id = v.pipe(v.string(), v.minLength(1), v.maxLength(512))
export const browserDownloadReceiptSchema = v.strictObject({
  id,
  cardId: id,
  actionId: id,
  observationId: v.nullable(id),
  url: v.pipe(v.string(), v.maxLength(8192)),
  path: v.pipe(v.string(), v.maxLength(4096), v.check(isAbsolute)),
  state: v.picklist(['progressing', 'completed', 'cancelled', 'interrupted', 'unverified']),
  bytes: v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(Number.MAX_SAFE_INTEGER)),
  sha256: v.nullable(v.pipe(v.string(), v.regex(/^[a-f\d]{64}$/u))),
  at: v.pipe(v.number(), v.integer(), v.minValue(0)),
})

/** Transfer history uses the existing life writer and its ingress journal. */
export async function recordBrowserDownload(database: AlicizationDbService, raw: BrowserDownloadReceipt) {
  const receipt = v.parse(browserDownloadReceiptSchema, raw)
  if ((receipt.state === 'completed') !== (receipt.sha256 !== null))
    throw new Error('Only a completed download may carry stable-byte evidence')
  const view = await database.readLifeState()
  if (view.cardId !== receipt.cardId)
    throw new Error('Download receipt crossed its card owner')
  const id = `browser-download:${receipt.id}`
  const source = 'browser-download'
  if (receipt.state === 'progressing') {
    const reservation = await requireBrowserDownloadReservation(database, receipt)
    if (receipt.at > reservation.expiresAt)
      throw new Error('Download began after its reservation expired')
    await database.commitLifeState({ cardId: receipt.cardId, operationKey: id, changes: [], mutations: [{ type: 'ingress-accept', ingress: { id, source, sourceKey: receipt.id, kind: 'tool-result', occurredAt: receipt.at, payload: { ...receipt } } }] })
    return
  }
  const began = await database.getLifeIngress(id)
  if (!began || began.source !== source || began.payload.actionId !== receipt.actionId || began.payload.path !== receipt.path || began.payload.cardId !== receipt.cardId || began.payload.observationId !== receipt.observationId || began.payload.url !== receipt.url)
    throw new Error('Download completion lacks its exact persisted beginning')
  await requireBrowserDownloadReservation(database, receipt)
  const resultId = `browser-download-result:${receipt.id}`
  const existing = await database.getLifeIngress(resultId)
  if (existing) {
    if (executionDigest(existing.payload) !== executionDigest(receipt))
      throw new Error('Download already has a different terminal result')
    return
  }
  await database.commitLifeState({ cardId: receipt.cardId, operationKey: resultId, changes: [], mutations: [
    { type: 'ingress-accept', ingress: { id: resultId, source: 'browser-download-result', sourceKey: receipt.id, kind: 'tool-result', occurredAt: receipt.at, payload: { ...receipt } } },
    { type: 'ingress-settle', id: resultId, status: 'settled' },
    { type: 'ingress-settle', id, status: 'settled' },
    { type: 'ingress-settle', id: `browser-download-reservation:${receipt.id}`, status: 'settled' },
  ] })
}

export async function readBrowserDownloads(database: AlicizationDbService) {
  const view = await database.readLifeState()
  const receipts: BrowserDownloadReceipt[] = []
  // Ongoing transfers are retained by readLifeState independently of the
  // recent-history limit. A restarted process reports them as unverified.
  for (const entry of view.ingress.filter(item => item.source === 'browser-download' || item.source === 'browser-download-result').slice(0, 128)) {
    if (receipts.some(item => item.id === entry.sourceKey))
      continue
    const terminal = entry.source === 'browser-download-result' ? entry : await database.getLifeIngress(`browser-download-result:${entry.sourceKey}`)
    const parsed = v.safeParse(browserDownloadReceiptSchema, (terminal ?? entry).payload)
    if (!parsed.success)
      continue
    const receipt = parsed.output
    if (receipt.cardId !== view.cardId || receipt.id !== entry.sourceKey)
      continue
    let bound = false
    try {
      await requireBrowserDownloadReservation(database, receipt)
      bound = true
    }
    catch { /* Historical records without the exact current ownership stay unknown. */ }
    receipts.push({ ...receipt, ...(!terminal || !bound ? { state: 'unverified' as const, sha256: null } : {}) })
  }
  return receipts
}

/** A previous process cannot certify what its native download did before exit. */
export async function recoverBrowserDownloads(database: AlicizationDbService, currentRuntimeId = browserDownloadRuntimeId) {
  const view = await database.readLifeState()
  const recovered: string[] = []
  for (const entry of view.ingress.filter(item => item.source === 'browser-download-reservation' && ['accepted', 'processing'].includes(item.status))) {
    const parsed = v.safeParse(browserDownloadReservationSchema, entry.payload)
    if (!parsed.success || parsed.output.cardId !== view.cardId || parsed.output.runtimeId === currentRuntimeId)
      continue
    const reservation = parsed.output
    const began = await database.getLifeIngress(`browser-download:${reservation.id}`)
    const receipt = v.safeParse(browserDownloadReceiptSchema, began?.payload)
    let bound = false
    if (receipt.success && began?.source === 'browser-download') {
      try {
        await requireBrowserDownloadReservation(database, receipt.output)
        bound = true
      }
      catch { /* A corrupted binding cannot become terminal file evidence. */ }
    }
    if (receipt.success && bound) {
      await recordBrowserDownload(database, { ...receipt.output, state: 'unverified', sha256: null, at: Date.now() })
    }
    else {
      const resultId = `browser-download-reservation-result:${reservation.id}`
      // No durable begin is not proof of no file effect: the old process may
      // have exited between the native event and the begin journal commit.
      await database.commitLifeState({ cardId: view.cardId, operationKey: resultId, changes: [], mutations: [
        { type: 'ingress-accept', ingress: { id: resultId, source: 'browser-download-reservation-result', sourceKey: reservation.id, kind: 'tool-result', occurredAt: Date.now(), payload: { ...reservation, state: 'unverified', reason: began ? 'previous-runtime-beginning-is-corrupt-or-crosses-its-owner' : 'previous-runtime-ended-without-terminal-evidence', scope: 'intent-only-native-start-and-artifact-unknown', ...(began ? { originalBeginHash: executionDigest(began.payload) } : {}) } } },
        { type: 'ingress-settle', id: resultId, status: 'settled' },
        { type: 'ingress-settle', id: entry.id, status: 'settled' },
        ...(began?.source === 'browser-download' ? [{ type: 'ingress-settle' as const, id: began.id, status: 'settled' as const }] : []),
      ] })
    }
    recovered.push(reservation.id)
  }
  return recovered
}

export interface BrowserDownloadAdmission {
  id: string
  actionId: string
  observationId: string | null
  requestedUrl: string
  directory: string
  state: 'prepared' | 'not-started' | 'cancelled' | 'unverified'
  scope: 'download-intent-only-no-file-evidence'
}

export async function readBrowserDownloadAdmissions(database: AlicizationDbService) {
  const view = await database.readLifeState()
  const admissions: BrowserDownloadAdmission[] = []
  for (const entry of view.ingress.filter(item => item.source === 'browser-download-reservation' || item.source === 'browser-download-reservation-result').slice(0, 128)) {
    if (admissions.some(item => item.id === entry.sourceKey))
      continue
    const initial = entry.source === 'browser-download-reservation' ? entry : await database.getLifeIngress(`browser-download-reservation:${entry.sourceKey}`)
    const parsed = v.safeParse(browserDownloadReservationSchema, initial?.payload)
    if (!parsed.success || parsed.output.cardId !== view.cardId)
      continue
    const result = entry.source === 'browser-download-reservation-result' ? entry : await database.getLifeIngress(`browser-download-reservation-result:${entry.sourceKey}`)
    const started = await database.getLifeIngress(`browser-download:${entry.sourceKey}`)
    if (started && !result)
      continue
    const reservation = parsed.output
    const state = !result ? 'prepared' : result.payload.state === 'not-started' || result.payload.state === 'cancelled' ? result.payload.state : 'unverified'
    admissions.push({ id: reservation.id, actionId: reservation.actionId, observationId: reservation.observationId, requestedUrl: reservation.requestedUrl, directory: reservation.directory, state, scope: 'download-intent-only-no-file-evidence' })
  }
  return admissions
}
