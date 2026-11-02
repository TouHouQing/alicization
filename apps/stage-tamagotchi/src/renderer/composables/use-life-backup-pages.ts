import type { Ref } from 'vue'

import type { LifeBackupCommand, LifeBackupIssue, LifeBackupResult, LifeBackupSummary } from '../../shared/life-backup-contracts'

import { errorMessageFrom } from '@moeru/std'
import { computed, onScopeDispose, ref, watch } from 'vue'

export function useLifeBackupPages(options: {
  cardId: Ref<string | undefined>
  invoke: (command: LifeBackupCommand) => Promise<LifeBackupResult>
  busy: (busy: boolean) => void
  error: (message: string | null) => void
  restarting: () => void
  deferred: () => void
}) {
  const backups = ref<LifeBackupSummary[]>([])
  const issues = ref<LifeBackupIssue[]>([])
  const total = ref(0)
  const issuesTotal = ref(0)
  const page = ref(0)
  const cursors = ref<Array<string | undefined>>([undefined])
  const nextCursor = ref<string | null>(null)
  let revision = 0
  let disposed = false
  watch(options.cardId, () => {
    revision++
    backups.value = []
    issues.value = []
    total.value = 0
    issuesTotal.value = 0
    page.value = 0
    cursors.value = [undefined]
    nextCursor.value = null
    options.busy(false)
  }, { flush: 'sync' })
  onScopeDispose(() => {
    disposed = true
    revision++
  })

  async function command(action: LifeBackupCommand['action'], backup?: LifeBackupSummary, targetPage = 0, refresh = false) {
    if (disposed)
      return
    const token = ++revision
    const cardId = options.cardId.value || 'default'
    const current = () => !disposed && token === revision && (options.cardId.value || 'default') === cardId
    options.busy(true)
    options.error(null)
    try {
      const result = await options.invoke({ cardId, action, ...(backup ? { backupId: backup.id, expectedManifestHash: backup.manifestHash } : {}), ...(action === 'list' || action === 'restore' ? { cursor: refresh ? undefined : cursors.value[targetPage], refresh } : {}) })
      if (!current() || result.cardId !== cardId)
        return
      if (result.status === 'restarting') {
        options.restarting()
        return
      }
      if (result.status === 'deferred') {
        options.deferred()
        return
      }
      if (!result.page) {
        if (result.status === 'cancelled')
          return
        throw new Error('Backup response is missing pagination metadata')
      }
      if (refresh || action === 'create') {
        cursors.value = [undefined]
        targetPage = 0
      }
      backups.value = result.backups
      issues.value = result.issues
      total.value = result.page.total
      issuesTotal.value = result.page.issuesTotal
      page.value = targetPage
      nextCursor.value = result.page.nextCursor
      cursors.value[targetPage + 1] = result.page.nextCursor ?? undefined
      cursors.value.splice(targetPage + 2)
    }
    catch (error) {
      if (current())
        options.error(errorMessageFrom(error) ?? String(error))
    }
    finally {
      if (current())
        options.busy(false)
    }
  }
  return {
    backups,
    issues,
    total,
    issuesTotal,
    page,
    hasPrevious: computed(() => page.value > 0),
    hasNext: computed(() => nextCursor.value !== null),
    refresh: () => command('list', undefined, 0, true),
    create: () => command('create'),
    restore: (backup: LifeBackupSummary) => command('restore', backup, page.value),
    previous: () => page.value > 0 ? command('list', undefined, page.value - 1) : Promise.resolve(),
    next: () => nextCursor.value !== null ? command('list', undefined, page.value + 1) : Promise.resolve(),
  }
}
