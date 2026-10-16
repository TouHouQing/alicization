export function disposeLive2DModel(model: { internalModel?: unknown, autoUpdate: boolean, destroy: () => void, emit: (event: string) => unknown }) {
  if (model.internalModel) {
    model.destroy()
    return
  }
  // SDK destroy() requires an internal model. Early ZIP failures still need
  // the destroy event to cancel requests registered against the container.
  model.autoUpdate = false
  model.emit('destroy')
}

export async function loadCurrentLive2DInstance<T>(options: {
  create: () => T
  setup: (model: T) => Promise<unknown>
  isCurrent: () => boolean
  dispose: (model: T) => void
}) {
  const model = options.create()
  try {
    await options.setup(model)
  }
  catch (error) {
    options.dispose(model)
    if (!options.isCurrent())
      return undefined
    throw error
  }
  if (!options.isCurrent()) {
    options.dispose(model)
    return undefined
  }
  return model
}
