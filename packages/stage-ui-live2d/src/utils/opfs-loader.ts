import type { Live2DFactoryContext, Middleware, ModelSettings } from 'pixi-live2d-display/cubism4'

interface OPFSContext extends Live2DFactoryContext {
  opfsKey?: string
  opfsUrl?: string
}

declare global {
  interface FileSystemDirectoryHandle {
    values: () => FileSystemDirectoryHandleAsyncIterator<FileSystemHandle>
  }
}

export class OPFSCache {
  static async clearAll(): Promise<void> {
    const root = await navigator.storage.getDirectory()
    for await (const entry of root.values()) {
      // Only catalogue-owned Live2D caches belong to this action.
      if (entry.kind === 'directory' && /^(?:preset-live2d-|display-model-)/.test(entry.name))
        await root.removeEntry(entry.name, { recursive: true })
    }
  }

  static async readDirectoryRecursive(dir: FileSystemDirectoryHandle, pathPrefix: string): Promise<File[]> {
    const files: File[] = []
    for await (const entry of dir.values()) {
      if (entry.kind === 'file') {
        const fileHandle = entry as FileSystemFileHandle
        const snapshot = await fileHandle.getFile()
        if (snapshot.name === '__meta.json')
          continue
        // OPFS File objects become unreadable after another renderer rewrites
        // the backing file, even with identical bytes. SDK resource URLs must
        // own immutable bytes for the model's whole lifetime. A concurrent
        // change during this copy makes get() fall back to the source archive.
        const file = new File([await snapshot.arrayBuffer()], snapshot.name, {
          type: snapshot.type,
          lastModified: snapshot.lastModified,
        })
        // live2d-display expects this
        Object.defineProperty(file, 'webkitRelativePath', {
          value: pathPrefix + file.name,
        })
        files.push(file)
      }
      else if (entry.kind === 'directory') {
        const newPrefix = `${pathPrefix + entry.name}/`
        const subFiles = await OPFSCache.readDirectoryRecursive(entry as FileSystemDirectoryHandle, newPrefix)
        files.push(...subFiles)
      }
    }
    return files
  }

  static async resolveDirectory(root: FileSystemDirectoryHandle, path: string): Promise<FileSystemDirectoryHandle> {
    let currentDir = root
    if (!path || path === '.' || path === './')
      return currentDir

    const parts = path.split('/').filter(p => p && p !== '.')
    for (const part of parts) {
      currentDir = await currentDir.getDirectoryHandle(part, { create: true })
    }
    return currentDir
  }

  static async writeFile(root: FileSystemDirectoryHandle, filePath: string, content: Blob | string): Promise<void> {
    const parts = filePath.split('/')
    const fileName = parts.pop()!
    const dirPath = parts.join('/')

    const dirHandle = await OPFSCache.resolveDirectory(root, dirPath)
    const fileHandle = await dirHandle.getFileHandle(fileName, { create: true })
    const writable = await fileHandle.createWritable()
    await writable.write(content)
    await writable.close()
  }

  static async readMeta(dirHandle: FileSystemDirectoryHandle) {
    try {
      const metaHandle = await dirHandle.getFileHandle('__meta.json', { create: false })
      const metaFile = await metaHandle.getFile()
      const metaText = await metaFile.text()
      return JSON.parse(metaText) as { sourceUrl?: string }
    }
    catch {
      return null
    }
  }

  static async get(key: string, sourceUrl: string): Promise<File[] | null> {
    try {
      const root = await navigator.storage.getDirectory()
      const dirHandle = await root.getDirectoryHandle(key, { create: false })
      const meta = await OPFSCache.readMeta(dirHandle)
      if (meta?.sourceUrl !== sourceUrl) {
        // An absent source marker also means the first cache write has not
        // published all assets yet. Use the owned archive instead of partial files.
        // eslint-disable-next-line no-console
        console.debug(`[OPFS] Cache mismatch for ${key}, source url changed`)
        return null
      }

      const files = await OPFSCache.readDirectoryRecursive(dirHandle, '')

      if (files.length > 0) {
        // eslint-disable-next-line no-console
        console.debug(`[OPFS] Cache hit for ${key}`)
        return files
      }
    }
    catch {
      // Cache Miss
    }
    return null
  }

  static async save(key: string, files: File[], sourceUrl?: string): Promise<void> {
    // eslint-disable-next-line no-console
    console.debug(`[OPFS] Saving ${files.length} files to ${key}`)

    try {
      const root = await navigator.storage.getDirectory()
      const dirHandle = await root.getDirectoryHandle(key, { create: true })

      const writePromises: Promise<void>[] = []

      for (const file of files) {
        const relativePath = file.webkitRelativePath || file.name
        writePromises.push(OPFSCache.writeFile(dirHandle, relativePath, file))
      }

      const settingsFile = files.find(f => f.name.endsWith('.model.json') || f.name.endsWith('.model3.json'))

      if (!settingsFile) {
        // reconstruct settings files from ModelSettings
        const settings: ModelSettings = (files as any).settings
        if (settings) {
          // eslint-disable-next-line no-console
          console.debug('[OPFS] Reconstructing settings file...')
          const settingsJson = JSON.stringify(settings.json)
          const settingsFileName = settings.url || 'model.model3.json'

          writePromises.push(OPFSCache.writeFile(dirHandle, settingsFileName, settingsJson))
        }
      }

      await Promise.all(writePromises)
      if (sourceUrl) {
        await OPFSCache.writeFile(dirHandle, '__meta.json', JSON.stringify({ sourceUrl }))
      }
      // eslint-disable-next-line no-console
      console.debug(`[OPFS] Saved to cache`)
    }
    catch (e) {
      console.error('[OPFS] Failed to save to cache:', e)
    }
  }

  static shouldHandleSourceUrl(sourceUrl?: string): boolean {
    if (!sourceUrl)
      return false

    if (sourceUrl.startsWith('blob:'))
      return true

    // NOTICE: Packaged Electron stage presets resolve to file:// asset URLs.
    // pixi-live2d-display's upstream XHR loader accepts file:// responses with status 0,
    // but fetch(file://...) fails in the renderer and prevents the model from mounting.
    // Skip OPFS interception here so packaged desktop builds can load preset Live2D zips.
    if (sourceUrl.startsWith('file:'))
      return false

    return sourceUrl.endsWith('.zip')
  }

  // Runs before ZipLoader to check if the file is already cached
  static checkMiddleware: Middleware<OPFSContext> = async (context, next) => {
    const source = context.source
    let key: string | undefined
    let blobUrl: string | undefined
    let archive: File | undefined

    // In Model.vue, we pass {id, url} to the loader, extract them here
    if (
      typeof source === 'object'
      && source !== null
      && 'id' in source
      && 'url' in source
    ) {
      key = source.id
      blobUrl = source.url
      if ('archive' in source && source.archive instanceof File)
        archive = source.archive
    }
    else {
      return next()
    }

    // check if url is blob or zip, pass through if not
    if (!key || !blobUrl || !OPFSCache.shouldHandleSourceUrl(blobUrl)) {
      context.source = blobUrl
      return next()
    }

    const files = await OPFSCache.get(key, blobUrl)

    if (files) {
      // cache hit
      context.source = files
      return next()
    }

    // cache miss
    // eslint-disable-next-line no-console
    console.debug(`[OPFS] Cache miss for ${key}`)
    context.opfsKey = key
    context.opfsUrl = blobUrl

    try {
      // Local archives already have a durable catalogue owner. Borrow the
      // File across cache awaits instead of fetching an ephemeral object URL.
      const blob = archive ?? await (await fetch(blobUrl)).blob()
      const fileName = `${key}.zip`
      context.source = [new File([blob], fileName)]
    }
    catch (e) {
      console.error(`[OPFS] Failed to fetch blob for ${key}`, e)
      throw e
    }

    return next()
  }

  // Runs after ZipLoader to cache the files
  static saveMiddleware: Middleware<OPFSContext> = async (context, next) => {
    if (!context.opfsKey || !Array.isArray(context.source)) {
      return next()
    }

    const files = context.source as File[]

    if (files.length === 0 || !(files[0] instanceof File)) {
      return next()
    }

    await OPFSCache.save(context.opfsKey, files, context.opfsUrl)

    return next()
  }
}
