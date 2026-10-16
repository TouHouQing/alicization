interface Live2DParameterSource {
  getModel: () => { parameters: { ids: readonly string[] } }
}

const parameterCatalogs = new WeakMap<Live2DParameterSource, ReadonlySet<string>>()

/** Cubism creates virtual indices for unknown IDs; only compiled rig IDs are real. */
export function supportsLive2DParameter(model: Live2DParameterSource, parameterId: string) {
  let ids = parameterCatalogs.get(model)
  if (!ids) {
    ids = new Set(model.getModel().parameters.ids)
    parameterCatalogs.set(model, ids)
  }
  return ids.has(parameterId)
}
