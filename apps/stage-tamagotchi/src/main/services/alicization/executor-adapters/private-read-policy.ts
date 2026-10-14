import { existsSync, realpathSync } from 'node:fs'
import { basename, resolve } from 'node:path'

const contentReaders = new Set(['cat', 'head', 'tail', 'grep', 'rg', 'wc', 'type'])
const privateSegments = /(?:^|\/)(?:\.ssh|\.aws|\.azure|\.gnupg|\.kube)(?:\/|$)/iu
const privateNames = /^(?:\.env(?:\..*)?|\.npmrc|\.netrc|auth\.json|credentials(?:\.json)?|id_(?:rsa|ed25519|ecdsa)(?:\.pub)?|login data|cookies(?:\.sqlite)?|key4\.db|logins\.json)$/iu

function privatePath(path: string) {
  const normalized = path.replaceAll('\\', '/')
  return privateSegments.test(normalized) || privateNames.test(basename(normalized))
    || /(?:^|\/)proc\/(?:self|\d+)\/(?:environ|mem)(?:\/|$)/iu.test(normalized)
    || /(?:^|\/)alicizations\/(?:cards|life-backups)(?:\/|$)/iu.test(normalized)
    || /(?:^|\/)\.withdrawn(?:\/|$)/iu.test(normalized)
    || /(?:^|\/)alicizations\/(?:llm-config\.json|runtime-debug\.log)$/iu.test(normalized)
}

export function requiresPrivateReadConfirmation(command: string, args: string[], cwd: string) {
  if (['env', 'printenv', 'set'].includes(command))
    return true
  if (!contentReaders.has(command))
    return false
  // Resolve both the requested spelling and existing symlink target. Missing
  // paths remain classified by their spelling rather than becoming ordinary.
  const candidates = [cwd, ...args.filter(arg => !arg.startsWith('-')).map(arg => resolve(cwd, arg))]
  if (candidates.some(path => privatePath(path) || (existsSync(path) && privatePath(realpathSync(path)))))
    return true
  // Recursive scans that deliberately include hidden/ignored files can sweep
  // credentials without naming a sensitive file in argv.
  return command === 'rg' && args.some(arg => /^(?:--hidden|--no-ignore(?:-.*)?|-.*uuu.*)$/u.test(arg))
    || command === 'grep' && args.some(arg => /^(?:--recursive|-[^\n\rRr\u2028\u2029]*[Rr].*)$/u.test(arg))
}
