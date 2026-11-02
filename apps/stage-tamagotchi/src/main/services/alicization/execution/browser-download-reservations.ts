import type { AlicizationDbService } from '../db'

import { createHash, randomUUID } from 'node:crypto'
import { realpath } from 'node:fs/promises'
import { dirname, isAbsolute, resolve } from 'node:path'

import * as v from 'valibot'

import { executionDigest } from './acceptance-compiler'

const id = v.pipe(v.string(), v.minLength(1), v.maxLength(512))
const instant = v.pipe(v.number(), v.integer(), v.minValue(0))
export const browserDownloadRuntimeId = randomUUID()
export const browserDownloadReservationSchema = v.strictObject({
  version: v.literal(2),
  runtimeId: id,
  id: v.pipe(v.string(), v.regex(/^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/u)),
  cardId: id,
  actionId: id,
  observationId: v.nullable(id),
  directory: v.pipe(v.string(), v.maxLength(4096), v.check(isAbsolute)),
  requestedUrl: v.pipe(v.string(), v.maxLength(8192)),
  requestHash: v.pipe(v.string(), v.regex(/^[a-f\d]{64}$/u)),
  origin: v.variant('kind', [
    v.strictObject({ kind: v.literal('life-effect'), effectId: id, turnId: id }),
    v.strictObject({ kind: v.literal('host-interface') }),
  ]),
  at: instant,
  expiresAt: instant,
})

export type BrowserDownloadReservation = v.InferOutput<typeof browserDownloadReservationSchema>
export type BrowserDownloadReservationEnd = 'not-started' | 'cancelled'
export interface BrowserDownloadHandle { readonly id: string }

export function downloadRequestIdentity(value: string) {
  const url = new URL(value)
  if (!['http:', 'https:'].includes(url.protocol))
    throw new Error('BROWSER_DOWNLOAD_URL_NOT_SUPPORTED')
  url.hash = ''
  return { hash: createHash('sha256').update(url.href).digest('hex'), publicUrl: `${url.origin}${url.pathname}`.slice(0, 8192) }
}

/** The immutable reservation exists before any native input may start a file. */
export async function recordBrowserDownloadReservation(database: AlicizationDbService, raw: BrowserDownloadReservation, options: { root: string, allowHostInterface?: boolean }, end?: BrowserDownloadReservationEnd) {
  const reservation = v.parse(browserDownloadReservationSchema, raw)
  const view = await database.readLifeState()
  if (view.cardId !== reservation.cardId || reservation.expiresAt <= reservation.at || reservation.expiresAt > reservation.at + 15000)
    throw new Error('Download reservation crossed its owner or time budget')
  if (reservation.directory !== resolve(await realpath(resolve(options.root, createHash('sha256').update(reservation.cardId).digest('hex'))), reservation.id))
    throw new Error('Download reservation left its owned directory')
  const sourceId = `browser-download-reservation:${reservation.id}`
  if (!end) {
    if (reservation.origin.kind === 'life-effect') {
      const effect = await database.getLifeEffect(reservation.origin.effectId)
      if (effect?.status !== 'dispatched' || effect.turnId !== reservation.origin.turnId || !String(effect.payload.capabilityId).startsWith('tool.browser_'))
        throw new Error('Download reservation has no current browser effect')
    }
    else if (!options.allowHostInterface) {
      throw new Error('Host interface downloads require an explicitly owned host port')
    }
    await database.commitLifeState({ cardId: reservation.cardId, operationKey: sourceId, changes: [], mutations: [{ type: 'ingress-accept', ingress: { id: sourceId, kind: 'tool-result', source: 'browser-download-reservation', sourceKey: reservation.id, occurredAt: reservation.at, payload: { ...reservation } } }] })
    return
  }
  const initial = await database.getLifeIngress(sourceId)
  if (!initial || executionDigest(initial.payload) !== executionDigest(reservation) || await database.getLifeIngress(`browser-download:${reservation.id}`))
    throw new Error('Only the exact unused download reservation can be released')
  const resultId = `browser-download-reservation-result:${reservation.id}`
  const existing = await database.getLifeIngress(resultId)
  if (existing) {
    if (existing.payload.state !== end)
      throw new Error('Download reservation already has a different terminal result')
    return
  }
  const at = Date.now()
  await database.commitLifeState({ cardId: reservation.cardId, operationKey: resultId, changes: [], mutations: [
    { type: 'ingress-accept', ingress: { id: resultId, kind: 'tool-result', source: 'browser-download-reservation-result', sourceKey: reservation.id, occurredAt: at, payload: { ...reservation, state: end, closedAt: at } } },
    { type: 'ingress-settle', id: resultId, status: 'settled' },
    { type: 'ingress-settle', id: sourceId, status: 'settled' },
  ] })
}

export async function requireBrowserDownloadReservation(database: AlicizationDbService, receipt: { id: string, cardId: string, actionId: string, observationId: string | null, path: string, at: number }) {
  const entry = await database.getLifeIngress(`browser-download-reservation:${receipt.id}`)
  const parsed = v.safeParse(browserDownloadReservationSchema, entry?.payload)
  if (!entry || entry.source !== 'browser-download-reservation' || !parsed.success)
    throw new Error('Download has no persisted pre-dispatch reservation')
  const reservation = parsed.output
  if (reservation.cardId !== receipt.cardId || reservation.actionId !== receipt.actionId || reservation.observationId !== receipt.observationId || dirname(resolve(receipt.path)) !== reservation.directory || resolve(receipt.path) !== receipt.path || receipt.at < reservation.at)
    throw new Error('Download crossed its exact reservation binding')
  if (await database.getLifeIngress(`browser-download-reservation-result:${receipt.id}`))
    throw new Error('The unused reservation was already released')
  return reservation
}
