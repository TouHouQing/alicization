import { FileLoader, Live2DFactory, Live2DLoader, ZipLoader } from 'pixi-live2d-display/cubism4'

import { createLive2DFileZipMiddleware } from './live2d-file-zip'
import { live2dResourceOwnershipMiddleware } from './live2d-resource-ownership'
import { live2dEncodeFilenamesMiddleware } from './live2d-uri-encode-filenames'
import { OPFSCache } from './opfs-loader'

const zipLoaderIndex = Live2DFactory.live2DModelMiddlewares.indexOf(ZipLoader.factory)
const fileZipMiddleware = createLive2DFileZipMiddleware((url, target) => Live2DLoader.load({ url, target, type: 'arraybuffer' }))

if (!Live2DFactory.live2DModelMiddlewares.includes(OPFSCache.checkMiddleware)) {
  if (zipLoaderIndex !== -1) {
    // Insert Check before ZipLoader, and Save after ZipLoader.
    Live2DFactory.live2DModelMiddlewares.splice(zipLoaderIndex, 0, OPFSCache.checkMiddleware)
    Live2DFactory.live2DModelMiddlewares.splice(zipLoaderIndex + 2, 0, OPFSCache.saveMiddleware)
  }
  else {
    console.warn('[OPFS] ZipLoader not found in middlewares, caching disabled')
  }
}

if (!Live2DFactory.live2DModelMiddlewares.includes(live2dResourceOwnershipMiddleware)) {
  const fileLoaderIndex = Live2DFactory.live2DModelMiddlewares.indexOf(FileLoader.factory)
  if (fileLoaderIndex >= 0)
    Live2DFactory.live2DModelMiddlewares.splice(fileLoaderIndex, 0, live2dResourceOwnershipMiddleware)
}

const fileZipLoaderIndex = Live2DFactory.live2DModelMiddlewares.indexOf(ZipLoader.factory)
if (fileZipLoaderIndex >= 0 && !Live2DFactory.live2DModelMiddlewares.includes(fileZipMiddleware))
  Live2DFactory.live2DModelMiddlewares.splice(fileZipLoaderIndex, 0, fileZipMiddleware)

// A middleware to URI-encode possible filenames in settings to handle filenames with UTF-8 characters.
if (!Live2DFactory.live2DModelMiddlewares.includes(live2dEncodeFilenamesMiddleware)) {
  // Insert before FileLoader
  const insertBefore = Live2DFactory.live2DModelMiddlewares.indexOf(FileLoader.factory)
  if (insertBefore >= 0) {
    Live2DFactory.live2DModelMiddlewares.splice(insertBefore, 0, live2dEncodeFilenamesMiddleware)
  }
}
