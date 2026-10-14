import { readFileSync } from 'node:fs'
import { execPath, platform } from 'node:process'

// Windows cannot execute a POSIX shebang. Only test-owned Node scripts are
// translated; the real child, streams, exit, HTTP, and cancellation remain real.
export function portableFixtureInvocation(command: string, args: readonly string[] = []) {
  if (platform === 'win32') {
    try {
      if (readFileSync(command, 'utf8').startsWith('#!/usr/bin/env node'))
        return { command: execPath, args: [command, ...args] }
    }
    catch { /* Preserve the real spawn error for an absent fixture. */ }
  }
  return { command, args: [...args] }
}
