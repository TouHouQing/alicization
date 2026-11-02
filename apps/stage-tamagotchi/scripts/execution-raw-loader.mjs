import { readFile } from 'node:fs/promises'

// Only the fixed desktop supervision sources are supported by this CLI loader.
// All other modules retain Node/tsx's normal resolution and error handling.
const sources = new Set([
  '../src/main/services/alicization/execution/windows-process-job-program.ps1?raw',
  '../src/main/services/alicization/execution/windows-process-job.cs?raw',
].map(path => new URL(path, import.meta.url).href))

export async function load(url, context, nextLoad) {
  if (!sources.has(url))
    return nextLoad(url, context)

  const source = await readFile(new URL(url), 'utf8')
  return {
    format: 'module',
    shortCircuit: true,
    source: `export default ${JSON.stringify(source)};`,
  }
}
