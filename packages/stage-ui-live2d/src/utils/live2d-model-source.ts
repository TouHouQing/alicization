export interface Live2DArchiveSource {
  id: string
  file: File
}

/** The selected catalogue owns the archive; a model borrows it for decoding. */
export function createLive2DModelSource(id: string | undefined, url: string, archive?: Live2DArchiveSource) {
  return { id, url, ...(archive && archive.id === id ? { archive: archive.file } : {}) }
}
