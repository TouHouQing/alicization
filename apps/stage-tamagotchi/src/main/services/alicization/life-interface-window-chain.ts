import type { LifeEffect } from '../../../shared/life-contracts'

function output(effect: LifeEffect) {
  return effect.receipt?.output as Record<string, unknown> | undefined
}

function matchWindowChain(prior: LifeEffect[], source: LifeEffect, click: LifeEffect) {
  const input = output(source)!
  const clicked = output(click)!
  const before = Number(source.receipt?.observedAt)
  const after = Number(click.receipt?.observedAt)
  if (!Number.isFinite(before) || !Number.isFinite(after) || before > after
    || input.channel !== 'desktop' || clicked.channel !== 'desktop'
    || !Number.isSafeInteger(input.processId) || Number(input.processId) <= 0
    || typeof input.windowId !== 'string' || !input.windowId
    || typeof input.desktop !== 'string' || !input.desktop
    || input.processId !== clicked.processId || input.desktop !== clicked.desktop) {
    return null
  }
  if (input.windowId === clicked.windowId)
    return { ownerClick: null, observedModal: null }
  if (clicked.ownerWindowId !== input.windowId)
    return null
  const ownerClick = prior.find((effect) => {
    const result = output(effect)
    return result?.operation === 'desktop_click_element' && result.windowId === input.windowId && result.processId === clicked.processId && result.desktop === clicked.desktop && Number(effect.receipt?.observedAt) >= before && Number(effect.receipt?.observedAt) < after
  })
  if (!ownerClick)
    return null
  const observedModal = prior.find((effect) => {
    const result = output(effect)
    return result?.operation === 'desktop_list_interactables' && result.windowId === clicked.windowId && result.ownerWindowId === input.windowId && result.processId === clicked.processId && result.desktop === clicked.desktop && Array.isArray(result.elements) && result.elements.some((element: Record<string, unknown>) => element.runtimeId === clicked.target) && Number(effect.receipt?.observedAt) > Number(ownerClick.receipt?.observedAt) && Number(effect.receipt?.observedAt) <= after
  })
  return observedModal ? { ownerClick, observedModal } : null
}

/** A modal belongs to the input window only through a native owner and a fresh observation. */
export function matchLifeInterfaceInput(prior: LifeEffect[], click: LifeEffect) {
  const clicked = output(click)
  if (!clicked)
    return null
  const candidates = prior.filter(effect => ['desktop_type_text', 'browser_type_text'].includes(String(output(effect)?.operation)) && Number(effect.receipt?.observedAt) <= Number(click.receipt?.observedAt) && (effect.payload.parameters as Record<string, unknown> | undefined)?.clearExisting === true && typeof (effect.payload.parameters as Record<string, unknown> | undefined)?.text === 'string')
  for (const typed of candidates) {
    const input = output(typed)!
    if (clicked.channel === 'browser') {
      try {
        if (input.channel === 'browser' && new URL(String(input.url)).origin === new URL(String(clicked.url)).origin)
          return { typed, ownerClick: null, observedModal: null }
      }
      catch { continue }
    }
    const chain = matchWindowChain(prior, typed, click)
    if (chain)
      return { typed, ...chain }
  }
  return null
}

/** An already-filled, unambiguous input can be saved without retyping it. */
export function matchLifeObservedInterfaceInput(prior: LifeEffect[], click: LifeEffect) {
  for (const observation of prior) {
    const result = output(observation)
    if (result?.operation !== 'desktop_list_interactables' || !Array.isArray(result.elements))
      continue
    const fields = result.elements.filter((field: Record<string, unknown>) => field.role === 'input' && field.password === false && field.enabled === true && field.readOnly === false && typeof field.value === 'string' && field.value.length <= 16000 && typeof field.runtimeId === 'string')
    if (fields.length !== 1)
      continue
    const chain = matchWindowChain(prior, observation, click)
    if (chain)
      return { inputObservation: observation, inputId: fields[0].runtimeId as string, expectedText: fields[0].value as string, ...chain }
  }
  return null
}
