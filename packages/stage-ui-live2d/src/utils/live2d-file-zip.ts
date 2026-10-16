import type { Live2DFactoryContext, Middleware } from 'pixi-live2d-display/cubism4'

export function createLive2DFileZipMiddleware(read: (url: string, target: Live2DFactoryContext['live2dModel']) => Promise<ArrayBuffer>): Middleware<Live2DFactoryContext> {
  return async (context, next) => {
    const source = context.source
    if (typeof source !== 'string' || !source.startsWith('file:') || !/\.zip$/i.test(source))
      return next()

    // Electron on Windows can fail repeated file:// XHR blob responses while
    // the same archive consistently reads as an ArrayBuffer. Keep the SDK's
    // request target/cancellation, then give ZIP decoding an in-memory File.
    const bytes = await read(source, context.live2dModel)
    if (!bytes.byteLength)
      throw new Error('Empty bundled Live2D archive')
    context.source = [new File([bytes], 'model.zip', { type: 'application/zip' })]
    return next()
  }
}
