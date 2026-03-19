function quoteField(field: unknown): string {
  return `"${String(field).replace(/"/g, '""')}"`
}

function toCsv(rows: Array<Array<unknown>>): string {
  return rows
    .map(row => row.map(quoteField).join(','))
    .join('\n')
}

interface CsvDownloadLink {
  href: string
  download: string
  click: () => void
}

interface CsvDocumentLike {
  createElement: (tagName: 'a') => CsvDownloadLink
}

interface CsvUrlLike {
  createObjectURL: (blob: Blob) => string
  revokeObjectURL: (url: string) => void
}

export function exportCsv(rows: Array<Array<unknown>>, basename: string) {
  if (!rows.length)
    return

  const browserScope = globalThis as typeof globalThis & {
    document?: CsvDocumentLike
    URL?: CsvUrlLike
  }
  const browserDocument = browserScope.document
  const browserUrl = browserScope.URL

  if (typeof Blob === 'undefined' || !browserDocument || !browserUrl) {
    console.warn('[CSV] Export is only supported in browser environments')
    return
  }

  const csv = toCsv(rows)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = browserUrl.createObjectURL(blob)
  const link = browserDocument.createElement('a')
  link.href = url
  link.download = `${basename}-${Date.now()}.csv`
  link.click()
  browserUrl.revokeObjectURL(url)
}
