import type { LifeIngress } from '../../../../shared/life-contracts'
import type { AlicizationDbService } from '../db'
import type { BrowserDownloadReservation } from './browser-download-reservations'

import { basename, resolve } from 'node:path'
import { platform } from 'node:process'

import * as v from 'valibot'

import { executionDigest } from './acceptance-compiler'
import { browserDownloadReceiptSchema } from './browser-download-repository'
import { browserDownloadReservationSchema, browserDownloadRuntimeId, requireBrowserDownloadReservation } from './browser-download-reservations'
import { executionDirectoryTreeResources } from './resource-broker'

export interface BrowserDownloadQuarantine { effectId: string, resources: string[], resourceOnly: true }

export function downloadResourceReleaseMatches(release: LifeIngress | null, reservation: LifeIngress) {
  if (!release)
    return false
  const proof = release.payload
  if (release.source !== 'browser-download-resource-release' || release.status !== 'settled' || release.sourceKey !== reservation.sourceKey || proof.reservationId !== reservation.sourceKey || proof.reservationHash !== reservation.payloadHash || proof.confirmedStopped !== true || proof.independent !== false || proof.stopEvidence !== 'host-attestation' || proof.scope !== 'resource-only-no-transfer-or-goal-success')
    throw new Error('Download resource recovery found an invalid host release')
  return true
}

async function nativeStopIsDurable(database: AlicizationDbService, reservation: BrowserDownloadReservation) {
  const began = await database.getLifeIngress(`browser-download:${reservation.id}`)
  const terminal = await database.getLifeIngress(`browser-download-result:${reservation.id}`)
  if (terminal) {
    const parsed = v.safeParse(browserDownloadReceiptSchema, terminal.payload)
    if (!parsed.success || terminal.source !== 'browser-download-result' || terminal.status !== 'settled' || terminal.sourceKey !== reservation.id)
      throw new Error('Download resource recovery found an invalid terminal record')
    const receipt = parsed.output
    if (receipt.id !== reservation.id || receipt.cardId !== reservation.cardId)
      throw new Error('Download resource recovery crossed its terminal owner')
    await requireBrowserDownloadReservation(database, receipt)
    if (!began || began.source !== 'browser-download' || began.payload.path !== receipt.path || began.payload.actionId !== receipt.actionId || began.payload.observationId !== receipt.observationId || began.payload.cardId !== receipt.cardId || began.payload.url !== receipt.url)
      throw new Error('Download resource recovery lost the exact native beginning')
    if ((receipt.state === 'completed') !== (receipt.sha256 !== null))
      throw new Error('Download resource recovery found inconsistent terminal proof')
    // Bytes may have changed since completion. This fact proves only that the
    // native writer stopped; it does not prove the current artifact or goal.
    return ['completed', 'cancelled', 'interrupted'].includes(receipt.state)
  }
  const released = await database.getLifeIngress(`browser-download-reservation-result:${reservation.id}`)
  if (!released || released.payload.state === 'unverified')
    return false
  const { state, closedAt, ...initial } = released.payload
  if (began || released.source !== 'browser-download-reservation-result' || released.status !== 'settled' || released.sourceKey !== reservation.id || !['not-started', 'cancelled'].includes(String(state)) || typeof closedAt !== 'number' || closedAt < reservation.at || executionDigest(initial) !== executionDigest(reservation))
    throw new Error('Download resource recovery found an invalid unused reservation release')
  return true
}

/** Read every immutable reservation, including unknown owners outside UI history. */
export async function readBrowserDownloadQuarantines(database: AlicizationDbService, currentRuntimeId: string = browserDownloadRuntimeId) {
  let cardId: string | undefined
  const result: BrowserDownloadQuarantine[] = []
  let cursor: string | undefined
  let scanned = 0
  do {
    const page = await database.readLifeIngressPage({ source: 'browser-download-reservation', afterId: cursor })
    if (cardId && page.cardId !== cardId)
      throw new Error('Download resource pagination crossed its card')
    cardId = page.cardId
    scanned += page.entries.length
    if (scanned > 100_000)
      throw new Error('Download resource recovery exceeded its historical scan budget')
    for (const entry of page.entries) {
      const reservation = v.parse(browserDownloadReservationSchema, entry.payload)
      if (entry.sourceKey !== reservation.id || entry.id !== `browser-download-reservation:${reservation.id}` || reservation.cardId !== cardId || reservation.directory !== resolve(reservation.directory) || basename(reservation.directory) !== reservation.id)
        throw new Error('Download resource recovery crossed its reservation owner')
      const release = await database.getLifeIngress(`browser-download-resource-release:${reservation.id}`)
      if (downloadResourceReleaseMatches(release, entry) || reservation.runtimeId === currentRuntimeId || await nativeStopIsDurable(database, reservation))
        continue
      if (result.length >= 4096)
        throw new Error('Download resource recovery exceeded its unresolved-owner budget')
      const original = `file-tree:${platform === 'win32' ? reservation.directory.toLowerCase() : reservation.directory}`
      const current = await executionDirectoryTreeResources(reservation.directory)
      result.push({ effectId: `browser-download:${reservation.id}`, resources: [...new Set([original, ...current])].sort(), resourceOnly: true })
    }
    cursor = page.next ?? undefined
  } while (cursor)
  return result
}
