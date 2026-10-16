import type { Live2DFactoryContext, Middleware } from 'pixi-live2d-display/cubism4'

let resourceOwner = 0

// NOTICE: The pinned SDK gives every ZIP the same zip://0 settings key.
// FileLoader indexes resource URLs by that key and revokes them on destruction.
// Give each model instance its own key before FileLoader uploads its resources,
// so closing a preview cannot revoke the desktop character's pending assets.
export const live2dResourceOwnershipMiddleware: Middleware<Live2DFactoryContext> = (context, next) => {
  if (Array.isArray(context.source)) {
    const settings = (context.source as File[] & { settings?: { _objectURL?: string } }).settings
    if (settings?._objectURL)
      settings._objectURL = `alicization-live2d://${++resourceOwner}/model`
  }
  return next()
}
