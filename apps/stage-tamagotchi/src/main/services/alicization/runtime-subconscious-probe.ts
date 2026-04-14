import { execFile } from 'node:child_process'

export function createAlicizationSubconsciousProbeRuntime(options: any) {
  const {
    platform,
    getSystemIdleTime,
    getSensorySnapshot,
    sanitizeText,
    errorMessageFrom,
    subconsciousInterruptionProbeTimeoutMs,
    foregroundProbeTimeoutStreakByPid,
  } = options as any

  async function runCommandWithTimeout(command: string, args: string[], timeoutMs: number) {
    const boundedTimeout = Math.max(300, Math.floor(timeoutMs))
    return await new Promise<string>((resolve, reject) => {
      const child = execFile(command, args, { timeout: boundedTimeout, windowsHide: true }, (error, stdout, stderr) => {
        if (error) {
          reject(error)
          return
        }
        resolve([stdout, stderr].filter(Boolean).join('\n').trim())
      })
      child.on('error', reject)
    })
  }

  function isCommandTimeoutError(error: unknown) {
    const message = errorMessageFrom(error) ?? ''
    return /timed out|timeout|SIGTERM|killed/i.test(message)
      || (typeof error === 'object' && error != null && 'killed' in error && (error as { killed?: unknown }).killed === true)
  }

  async function probeForegroundPidLiveness(pidValue: number | null | undefined) {
    const pid = Number(pidValue)
    if (!Number.isFinite(pid) || pid <= 0)
      return false
    try {
      const output = await runCommandWithTimeout('/bin/ps', ['-p', String(Math.floor(pid)), '-o', 'pid='], subconsciousInterruptionProbeTimeoutMs)
      return /\d+/.test(output)
    }
    catch {
      return false
    }
  }

  function clearForegroundProbeTimeoutStreakForPid(pidValue: number | null | undefined) {
    const pid = Number(pidValue)
    if (!Number.isFinite(pid) || pid <= 0)
      return
    foregroundProbeTimeoutStreakByPid.delete(Math.floor(pid))
  }

  function updateForegroundProbeTimeoutStreak(pidValue: number | null | undefined, timedOut: boolean) {
    const pid = Number(pidValue)
    if (!Number.isFinite(pid) || pid <= 0)
      return 0
    const normalizedPid = Math.floor(pid)
    if (!timedOut) {
      foregroundProbeTimeoutStreakByPid.delete(normalizedPid)
      return 0
    }
    const next = (foregroundProbeTimeoutStreakByPid.get(normalizedPid) ?? 0) + 1
    foregroundProbeTimeoutStreakByPid.set(normalizedPid, next)
    return next
  }

  async function sampleSubconsciousInterruptionContext() {
    const degraded: string[] = []
    let idleSeconds = Number.NaN
    const sensorySnapshot = getSensorySnapshot()
    let foregroundWindow = sensorySnapshot?.sample?.foregroundWindow
    let foregroundProbeTimedOut = false

    try {
      idleSeconds = Number(getSystemIdleTime())
    }
    catch {
      degraded.push('input-activity-unavailable')
    }

    let fullscreenLikely = false
    if (platform === 'darwin') {
      try {
        const output = await runCommandWithTimeout(
          '/usr/bin/osascript',
          [
            '-e',
            'tell application "System Events" to tell (first process whose frontmost is true) to get value of attribute "AXFullScreen" of front window',
          ],
          subconsciousInterruptionProbeTimeoutMs,
        )
        fullscreenLikely = /\btrue\b/i.test(output)
      }
      catch {
        degraded.push('fullscreen-likely-unavailable')
      }

      if (!foregroundWindow?.appName && !foregroundWindow?.processName && !foregroundWindow?.title) {
        try {
          const output = await runCommandWithTimeout(
            '/usr/bin/osascript',
            [
              '-e',
              'tell application "System Events"',
              '-e',
              'set frontApp to first application process whose frontmost is true',
              '-e',
              'set frontName to name of frontApp',
              '-e',
              'set frontTitle to ""',
              '-e',
              'set frontPid to unix id of frontApp',
              '-e',
              'try',
              '-e',
              'set frontTitle to name of front window of frontApp',
              '-e',
              'end try',
              '-e',
              'return frontName & linefeed & frontName & linefeed & frontTitle & linefeed & frontPid',
              '-e',
              'end tell',
            ],
            subconsciousInterruptionProbeTimeoutMs,
          )
          const [appName = '', processName = '', title = '', pidLine = ''] = output.split('\n')
          foregroundWindow = {
            appName: sanitizeText(appName),
            processName: sanitizeText(processName),
            title: sanitizeText(title),
            pid: Number.isFinite(Number(pidLine)) ? Math.max(1, Math.floor(Number(pidLine))) : null,
          }
        }
        catch (error) {
          foregroundProbeTimedOut = isCommandTimeoutError(error)
          degraded.push('foreground-window-unavailable')
        }
      }
    }
    else {
      degraded.push('fullscreen-likely-unavailable')
      if (!foregroundWindow?.appName && !foregroundWindow?.processName && !foregroundWindow?.title)
        degraded.push('foreground-window-unavailable')
    }

    const inputActivity = Number.isFinite(idleSeconds)
      ? idleSeconds <= 60 ? 'active' as const : 'idle' as const
      : 'unknown' as const
    if (inputActivity === 'unknown' && !degraded.includes('input-activity-unavailable'))
      degraded.push('input-activity-unavailable')

    return {
      idleSeconds: Number.isFinite(idleSeconds) ? idleSeconds : null,
      inputActivity,
      fullscreenLikely,
      foregroundWindow,
      foregroundProbeTimedOut,
      degraded,
    }
  }

  return {
    probeForegroundPidLiveness,
    updateForegroundProbeTimeoutStreak,
    clearForegroundProbeTimeoutStreakForPid,
    sampleSubconsciousInterruptionContext,
  }
}
