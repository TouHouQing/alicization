<script setup lang="ts">
import type { LifeBackupSummary } from '../../../shared/life-backup-contracts'
import type { LifeClosureRecord } from '../../../shared/life-closure-contracts'
import type { LifeEvidenceRef, LifeObligation, LifeOutreachPolicy, LifeStateView } from '../../../shared/life-contracts'
import type { LifeInputPreview, LifeObligationCommand } from '../../../shared/life-events'
import type { LifePersonaCommand, LifePersonaEvaluation } from '../../../shared/life-persona-contracts'
import type { LifePolicyCommand, LifePolicyEvaluation } from '../../../shared/life-policy-contracts'

import { errorMessageFrom } from '@moeru/std'
import { useElectronEventaInvoke } from '@proj-alicization/electron-vueuse'
import { useAiriCardStore } from '@proj-alicization/stage-ui/stores/modules/airi-card'
import { Button, FieldCheckbox, Input } from '@proj-alicization/ui'
import { storeToRefs } from 'pinia'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { createDefaultLifeOutreachPolicy } from '../../../shared/life-contracts'
import { electronLifeArtifactRestore, electronLifeBackupCommand, electronLifeClosure, electronLifeGrowthRollback, electronLifeInputCommand, electronLifeInputPreview, electronLifeObligationCommand, electronLifeOutreachPolicy, electronLifePersonaCommand, electronLifePersonalProposalWithdraw, electronLifePolicyCommand, electronLifeProjectFeedback, electronLifeView } from '../../../shared/life-events'

const { t } = useI18n()
const { activeCardId } = storeToRefs(useAiriCardStore())
const read = useElectronEventaInvoke(electronLifeView)
const giveProjectFeedback = useElectronEventaInvoke(electronLifeProjectFeedback)
const withdrawProposal = useElectronEventaInvoke(electronLifePersonalProposalWithdraw)
const backupCommand = useElectronEventaInvoke(electronLifeBackupCommand)
const backups = ref<LifeBackupSummary[]>([])
const personaCommand = useElectronEventaInvoke(electronLifePersonaCommand)
const policyCommand = useElectronEventaInvoke(electronLifePolicyCommand)
const personaEvaluationHashes = ref<Record<string, string>>({})
const readClosure = useElectronEventaInvoke(electronLifeClosure)
const closure = ref<LifeClosureRecord | null>(null)
const closureTurnId = ref('')
const command = useElectronEventaInvoke(electronLifeObligationCommand)
const restoreArtifact = useElectronEventaInvoke(electronLifeArtifactRestore)
const rollback = useElectronEventaInvoke(electronLifeGrowthRollback)
const previewInput = useElectronEventaInvoke(electronLifeInputPreview)
const governInput = useElectronEventaInvoke(electronLifeInputCommand)
const inputPreviews = ref<Record<string, LifeInputPreview>>({})
const inputNotice = ref<string | null>(null)
const view = ref<LifeStateView | null>(null)
const personalChoices = computed(() => {
  const raw = view.value?.values['life:initiative']
  return raw ? (JSON.parse(raw).personalProposals ?? []) as Array<{ id: string, topic: string, sourceReplyHash: string, status: string, expiresAt: number }> : []
})
const heldInputs = computed(() => view.value?.ingress.filter(item => item.kind === 'user-turn' && item.status === 'held') ?? [])
const savePolicy = useElectronEventaInvoke(electronLifeOutreachPolicy)
const policy = ref<LifeOutreachPolicy>(createDefaultLifeOutreachPolicy())
const originalPolicy = ref<LifeOutreachPolicy>(createDefaultLifeOutreachPolicy())
const loading = ref(false)
const pendingId = ref<string | null>(null)
const error = ref<string | null>(null)
const dueInputs = ref<Record<string, string>>({})
const openObligations = computed(() => view.value?.obligations.filter(item => !['fulfilled', 'cancelled', 'superseded'].includes(item.status)) ?? [])
const history = computed(() => view.value?.obligations.filter(item => ['fulfilled', 'cancelled', 'superseded'].includes(item.status)).slice(0, 20) ?? [])
const sharedProjects = computed(() => view.value?.obligations.filter(item => item.kind === 'personal-project' && item.status === 'fulfilled' && !item.invalidatedBy && item.personalDevelopment?.shares.length).slice(0, 12) ?? [])
const hostRequestedQuiet = computed(() => Boolean(JSON.parse(view.value?.values['life:initiative'] ?? '{}').outreachHold))
const withdrawnDocuments = computed(() => view.value?.obligations.filter(item => item.kind === 'personal-project' && item.invalidationMode === 'forget' && item.proof.kind === 'file') ?? [])
const growthAuthority = computed(() => view.value?.owners.find(owner => owner.owner === 'growth'))
const policyEvaluations = computed(() => {
  const found: Record<string, { hash: string, evaluation: LifePolicyEvaluation }> = {}
  for (const effect of view.value?.effects ?? []) {
    if (effect.status === 'settled' && effect.receipt?.format === 'policy-paired-evaluation-v1' && effect.receipt.baseOwnerHash === growthAuthority.value?.contentHash) {
      const evaluation = effect.receipt as unknown as LifePolicyEvaluation
      if (!found[evaluation.candidateId])
        found[evaluation.candidateId] = { hash: effect.id.slice('policy-evaluation:'.length), evaluation }
    }
  }
  return found
})
const personaProposals = computed(() => view.value?.effects.filter(effect => effect.payload.format === 'persona-revision-proposal-v1' && effect.status !== 'cancelled').map(effect => ({ ...effect, evaluation: effect.receipt?.format === 'persona-paired-evaluation-v1' ? effect.receipt as unknown as LifePersonaEvaluation : null })) ?? [])
const adoptedPersona = computed(() => {
  const raw = view.value?.values['life:soul-active']
  return raw ? JSON.parse(raw) as { contentHash: string, persona?: { proposalId: string } } : null
})
const growth = computed(() => {
  const raw = growthAuthority.value && view.value?.values[growthAuthority.value.metaKey]
  return raw ? JSON.parse(raw) as { activeCandidateId: string | null, candidates: Array<{ id: string, status: 'shadow' | 'active' | 'rejected' | 'rolled-back', patch: { summary: string | null }, sourceEvidence?: LifeEvidenceRef[], validation: { activationBlockedReasons: string[] } }> } : null
})
const expression = computed(() => {
  const raw = view.value?.values['life:expression']
  return raw ? JSON.parse(raw) as { body?: { rendererState: string, canvasPresent: boolean, nativeWindowVisible?: boolean, visiblePixels: 'visible' | 'invisible' | 'unknown', modelSelected: boolean, errorCode: string | null, observedAt: number }, lastReceipt?: { state: string, playedMs: number, errorCode: string | null } } : null
})
let request = 0

async function withdrawChoice(proposal: { id: string, sourceReplyHash: string }) {
  pendingId.value = proposal.id
  error.value = null
  try {
    await withdrawProposal({ cardId: activeCardId.value, proposalId: proposal.id, expectedReplyHash: proposal.sourceReplyHash })
    await refresh()
  }
  catch (caught) { error.value = errorMessageFrom(caught) ?? String(caught) }
  finally { pendingId.value = null }
}

async function feedbackOnProject(goal: LifeObligation, feedback: 'positive' | 'dismiss') {
  const share = goal.personalDevelopment?.shares.at(-1)
  if (!share || pendingId.value)
    return
  pendingId.value = goal.id
  error.value = null
  try {
    await giveProjectFeedback({ cardId: activeCardId.value, goalId: goal.id, generation: goal.generation, turnId: share.turnId, feedback, operationId: crypto.randomUUID() })
    await refresh()
  }
  catch (cause) {
    const message = errorMessageFrom(cause) ?? String(cause)
    error.value = message.includes('Unpresented activity') ? t('settings.life.project_feedback_unpresented') : message
  }
  finally {
    pendingId.value = null
  }
}

async function refresh() {
  const token = ++request
  loading.value = true
  try {
    const next = await read({ cardId: activeCardId.value || 'default' })
    if (token === request) {
      view.value = next
      const hashes: Record<string, string> = {}
      for (const effect of next.effects) {
        if (effect.receipt?.format === 'persona-paired-evaluation-v1') {
          const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(effect.receipt)))
          hashes[effect.id] = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
        }
      }
      if (token !== request)
        return
      personaEvaluationHashes.value = hashes
      const initiative = next.values['life:initiative'] ? JSON.parse(next.values['life:initiative']) as { outreachPolicy?: LifeOutreachPolicy } : null
      originalPolicy.value = initiative?.outreachPolicy ?? createDefaultLifeOutreachPolicy()
      policy.value = { ...originalPolicy.value }
      error.value = null
    }
  }
  catch (caught) {
    if (token === request)
      error.value = caught instanceof Error ? caught.message : String(caught)
  }
  finally {
    if (token === request)
      loading.value = false
  }
}

async function manageBackup(action: 'list' | 'create' | 'restore', backup?: LifeBackupSummary) {
  pendingId.value = 'backup'
  error.value = null
  try {
    const result = await backupCommand({ cardId: activeCardId.value || 'default', action, ...(backup ? { backupId: backup.id, expectedManifestHash: backup.manifestHash } : {}) })
    backups.value = result.backups
    if (result.status === 'restarting')
      inputNotice.value = t('settings.life.backup.restarting')
  }
  catch (caught) { error.value = caught instanceof Error ? caught.message : String(caught) }
  finally { pendingId.value = null }
}

async function act(item: LifeObligation, action: LifeObligationCommand['action']) {
  pendingId.value = item.id
  error.value = null
  try {
    const dueAt = action === 'reschedule' ? new Date(dueInputs.value[item.id] ?? '').getTime() : undefined
    if (action === 'reschedule' && (!Number.isSafeInteger(dueAt) || dueAt! <= Date.now()))
      throw new Error(t('settings.life.invalid_time'))
    await command({ cardId: item.cardId, id: item.id, operationId: crypto.randomUUID(), expectedGeneration: item.generation, expectedRevision: item.revision, action, ...(dueAt != null ? { dueAt } : {}) })
    await refresh()
  }
  catch (caught) { error.value = caught instanceof Error ? caught.message : String(caught) }
  finally { pendingId.value = null }
}

watch(activeCardId, () => {
  backups.value = []
  personaEvaluationHashes.value = {}
  view.value = null
  closure.value = null
  closureTurnId.value = ''
  inputPreviews.value = {}
  inputNotice.value = null
  void refresh()
}, { immediate: true })

async function actOnPersona(proposalId: string, targetHash: string, action: LifePersonaCommand['action']) {
  if (!view.value)
    return
  pendingId.value = proposalId
  try {
    await personaCommand({ cardId: view.value.cardId, proposalId, expectedTargetHash: targetHash, operationId: crypto.randomUUID(), action, ...(personaEvaluationHashes.value[proposalId] ? { expectedEvaluationHash: personaEvaluationHashes.value[proposalId] } : {}) })
    await refresh()
    error.value = null
  }
  catch (caught) { error.value = caught instanceof Error ? caught.message : String(caught) }
  finally { pendingId.value = null }
}
async function actOnPolicy(candidateId: string, action: LifePolicyCommand['action']) {
  if (!view.value || !growthAuthority.value)
    return
  pendingId.value = candidateId
  try {
    await policyCommand({ cardId: view.value.cardId, candidateId, action, expectedOwnerHash: growthAuthority.value.contentHash, expectedEvaluationHash: policyEvaluations.value[candidateId]?.hash, operationId: crypto.randomUUID() })
    await refresh()
    error.value = null
  }
  catch (caught) { error.value = caught instanceof Error ? caught.message : String(caught) }
  finally { pendingId.value = null }
}
async function restoreDocument(item: LifeObligation) {
  if (!item.proof.contentHash)
    return
  pendingId.value = item.id
  try {
    const result = await restoreArtifact({ cardId: item.cardId, goalId: item.id, operationId: crypto.randomUUID(), expectedGeneration: item.generation, expectedHash: item.proof.contentHash })
    inputNotice.value = t(result.status === 'restored' ? 'settings.life.artifact_restored' : 'settings.life.artifact_restore_held')
    await refresh()
    error.value = null
  }
  catch (caught) { error.value = caught instanceof Error ? caught.message : String(caught) }
  finally { pendingId.value = null }
}

async function rollbackGrowth(candidateId: string) {
  if (!view.value || !growthAuthority.value)
    return
  pendingId.value = candidateId
  try {
    await rollback({ cardId: view.value.cardId, candidateId, operationId: crypto.randomUUID(), expectedHash: growthAuthority.value.contentHash })
    await refresh()
  }
  catch (caught) {
    error.value = caught instanceof Error ? caught.message : String(caught)
  }
  finally {
    pendingId.value = null
  }
}
async function inspectInput(item: LifeStateView['ingress'][number]) {
  if (!view.value)
    return
  const cardId = view.value.cardId
  pendingId.value = item.id
  try {
    const result = await previewInput({ cardId, ingressId: item.id, expectedPayloadHash: item.payloadHash })
    if (view.value?.cardId === cardId)
      inputPreviews.value[item.id] = result
    error.value = null
  }
  catch (caught) { error.value = caught instanceof Error ? caught.message : String(caught) }
  finally { pendingId.value = null }
}

async function actOnInput(item: LifeStateView['ingress'][number], action: 'copy' | 'discard' | 'resume') {
  if (!view.value)
    return
  pendingId.value = item.id
  try {
    const result = await governInput({ cardId: view.value.cardId, ingressId: item.id, expectedPayloadHash: item.payloadHash, operationId: crypto.randomUUID(), action })
    inputNotice.value = t(result.status === 'copied' ? 'settings.life.input_copied' : result.status === 'resumed' ? 'settings.life.input_resumed' : 'settings.life.input_discarded')
    error.value = null
    await refresh()
  }
  catch (caught) { error.value = caught instanceof Error ? caught.message : String(caught) }
  finally { pendingId.value = null }
}

async function inspectClosure() {
  if (!view.value || !closureTurnId.value.trim())
    return
  const cardId = view.value.cardId
  pendingId.value = 'closure'
  try {
    const result = await readClosure({ cardId, turnId: closureTurnId.value.trim() })
    if (activeCardId.value === cardId)
      closure.value = result
    error.value = null
  }
  catch (caught) { error.value = caught instanceof Error ? caught.message : String(caught) }
  finally { pendingId.value = null }
}

async function updatePolicy() {
  pendingId.value = 'outreach-policy'
  try {
    await savePolicy({ cardId: activeCardId.value || 'default', operationId: crypto.randomUUID(), policy: { ...policy.value, maximumPerDay: Number(policy.value.maximumPerDay), minimumIntervalMinutes: Number(policy.value.minimumIntervalMinutes), quietStartHour: Number(policy.value.quietStartHour), quietEndHour: Number(policy.value.quietEndHour) }, expectedPolicy: { ...originalPolicy.value } })
    await refresh()
  }
  catch (caught) {
    error.value = caught instanceof Error ? caught.message : String(caught)
  }
  finally {
    pendingId.value = null
  }
}
</script>

<template>
  <div :class="['mx-auto', 'max-w-4xl', 'space-y-6', 'pb-8']">
    <header :class="['flex', 'justify-end']">
      <Button :label="t('settings.life.refresh')" :loading="loading" size="sm" icon="i-solar:refresh-bold-duotone" @click="refresh" />
    </header>
    <p v-if="error" role="alert" class="rounded-xl bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">
      {{ error }}
    </p>
    <p v-if="inputNotice" role="status" class="text-sm text-neutral-500">
      {{ inputNotice }}
    </p>
    <nav class="flex gap-4 text-sm">
      <RouterLink to="/settings/modules/memory" class="text-primary-600">
        {{ t('settings.life.manage_memory') }}
      </RouterLink>
      <RouterLink to="/settings/alicization" class="text-primary-600">
        {{ t('settings.life.manage_personality') }}
      </RouterLink>
    </nav>
    <p v-if="view?.backupRestore" role="status" class="rounded-xl bg-amber-50 p-4 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
      {{ t('settings.life.backup.restored') }}
    </p>
    <details>
      <summary class="cursor-pointer text-lg font-medium">
        {{ t('settings.life.backup.title') }}
      </summary>
      <p class="my-3 text-sm text-neutral-500">
        {{ t('settings.life.backup.description') }}
      </p>
      <div class="flex flex-wrap gap-3">
        <Button size="sm" :label="t('settings.life.backup.create')" :disabled="loading || pendingId !== null" @click="manageBackup('create')" />
        <Button size="sm" :label="t('settings.life.backup.list')" :disabled="pendingId !== null" @click="manageBackup('list')" />
      </div>
      <div v-for="backup in backups" :key="backup.id" class="mt-3 flex items-center justify-between gap-4 border-b border-neutral-200 py-3 text-sm dark:border-neutral-800">
        <time :datetime="new Date(backup.createdAt).toISOString()">{{ new Date(backup.createdAt).toLocaleString() }}</time>
        <Button size="sm" :label="t('settings.life.backup.restore')" :disabled="pendingId !== null" @click="manageBackup('restore', backup)" />
      </div>
    </details>
    <section>
      <h2 class="mb-3 text-lg font-medium">
        {{ t('settings.life.initiative_preferences') }}
      </h2>
      <p class="mb-4 text-sm text-neutral-500">
        {{ t('settings.life.initiative_description') }}
      </p>
      <div class="grid gap-4 sm:grid-cols-2">
        <label class="text-sm">{{ t('settings.life.maximum_per_day') }}<Input v-model="policy.maximumPerDay" type="number" min="0" max="20" /></label>
        <label class="text-sm">{{ t('settings.life.minimum_interval') }}<Input v-model="policy.minimumIntervalMinutes" type="number" min="15" max="1440" /></label>
        <label class="text-sm">{{ t('settings.life.quiet_start') }}<Input v-model="policy.quietStartHour" type="number" min="0" max="23" /></label>
        <label class="text-sm">{{ t('settings.life.quiet_end') }}<Input v-model="policy.quietEndHour" type="number" min="0" max="23" /></label>
      </div>
      <div class="mt-4 flex flex-wrap items-center gap-3">
        <FieldCheckbox v-model="policy.quietEnabled" data-life-quiet-hours :label="t('settings.life.quiet_enabled')" />
        <Button size="sm" data-life-save-outreach-policy :label="t('settings.life.save_preferences')" :disabled="loading || pendingId !== null" @click="updatePolicy" />
        <span class="text-sm text-neutral-500">{{ policy.timezone }}</span>
      </div>
      <p v-if="hostRequestedQuiet" role="status" class="mt-3 text-sm text-primary-600">
        {{ t('settings.life.host_requested_quiet') }}
      </p>
    </section>
    <section v-if="heldInputs.length" aria-live="polite">
      <h2 class="mb-2 text-lg font-medium">
        {{ t('settings.life.held_inputs') }}
      </h2>
      <p class="mb-3 text-sm text-neutral-500">
        {{ t('settings.life.held_inputs_description') }}
      </p>
      <article v-for="item in heldInputs.slice(0, 10)" :key="item.id" class="border-b border-neutral-200 py-4 dark:border-neutral-800">
        <p class="text-sm">
          {{ new Date(item.occurredAt).toLocaleString() }} · {{ item.payload.turnId }}
        </p>
        <div class="mt-3 flex flex-wrap gap-2">
          <Button size="sm" :label="t('settings.life.inspect_input')" :disabled="pendingId !== null" @click="inspectInput(item)" />
          <Button v-if="inputPreviews[item.id]" size="sm" :label="t('settings.life.input_resume')" :disabled="pendingId !== null" @click="actOnInput(item, 'resume')" />
          <Button size="sm" :label="t('settings.life.copy_input')" :disabled="pendingId !== null" @click="actOnInput(item, 'copy')" />
          <Button size="sm" :label="t('settings.life.discard_input')" :disabled="pendingId !== null" @click="actOnInput(item, 'discard')" />
        </div>
        <div v-if="inputPreviews[item.id]" class="mt-3 text-sm">
          <pre v-if="inputPreviews[item.id].text !== null" class="whitespace-pre-wrap break-words rounded-lg bg-neutral-50 p-3 font-sans dark:bg-neutral-900">{{ inputPreviews[item.id].text }}</pre>
          <p v-else class="text-amber-600">
            {{ t('settings.life.input_source_unavailable') }}
          </p>
          <p v-if="inputPreviews[item.id].truncated" class="mt-2 text-neutral-500">
            {{ t('settings.life.input_preview_truncated') }}
          </p>
          <p v-if="inputPreviews[item.id].hasAttachments" class="mt-2 text-neutral-500">
            {{ t('settings.life.input_has_attachments') }}
          </p>
        </div>
      </article>
    </section>
    <section aria-live="polite">
      <h2 class="mb-3 text-lg font-medium">
        {{ t('settings.life.responsibilities') }}
      </h2>
      <p v-if="!loading && openObligations.length === 0" class="py-6 text-sm text-neutral-500">
        {{ t('settings.life.empty') }}
      </p>
      <article v-for="item in openObligations" :key="item.id" :class="['border-b', 'border-neutral-200', 'py-5', 'dark:border-neutral-800']">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h3 class="font-medium">
              {{ item.summary }}
            </h3>
            <p class="mt-2 text-sm text-neutral-500">
              {{ t(`settings.life.status.${item.status}`) }}
              <span v-if="item.dueAt"> · {{ new Date(item.dueAt).toLocaleString() }}</span>
            </p>
            <p v-if="item.status === 'verifying'" class="mt-1 text-sm text-amber-600 dark:text-amber-400">
              {{ t('settings.life.awaiting_proof') }}
            </p>
          </div>
          <Button :label="t('settings.life.cancel')" size="sm" :disabled="pendingId !== null" @click="act(item, 'cancel')" />
        </div>
        <div v-if="item.kind === 'reminder' && ['waiting', 'blocked', 'failed'].includes(item.status)" class="mt-4 flex flex-wrap items-center gap-3">
          <Input v-model="dueInputs[item.id]" type="datetime-local" :aria-label="t('settings.life.reschedule')" />
          <Button :label="t('settings.life.reschedule')" size="sm" :disabled="pendingId !== null" @click="act(item, 'reschedule')" />
        </div>
        <div v-if="item.proof.kind !== 'reminder' && ['verifying', 'blocked', 'failed'].includes(item.status)" class="mt-3">
          <Button :label="t(item.proof.kind === 'user-reported' ? 'settings.life.report_completed' : 'settings.life.verify')" size="sm" :disabled="pendingId !== null" @click="act(item, item.proof.kind === 'user-reported' ? 'report-completed' : 'verify')" />
        </div>
      </article>
    </section>
    <section v-if="withdrawnDocuments.length">
      <h2 class="mb-3 text-lg font-medium">
        {{ t('settings.life.withdrawn_documents') }}
      </h2>
      <article v-for="item in withdrawnDocuments" :key="item.id" class="mb-3 flex items-center justify-between gap-3 text-sm">
        <span>{{ item.summary }} · {{ t('settings.life.source_withdrawn') }}</span>
        <Button size="sm" :label="t('settings.life.restore_artifact')" :disabled="pendingId !== null" @click="restoreDocument(item)" />
      </article>
    </section>
    <section v-if="sharedProjects.length">
      <h2 class="mb-3 text-lg font-medium">
        {{ t('settings.life.personal_projects') }}
      </h2>
      <article v-for="item in sharedProjects" :key="item.id" :data-life-project="item.id" class="mb-4 border-b border-neutral-200 pb-4 dark:border-neutral-800">
        <p class="text-sm">
          {{ item.summary }}
        </p>
        <p v-if="item.personalDevelopment?.feedback.some(feedback => feedback.turnId === item.personalDevelopment?.shares.at(-1)?.turnId)" class="mt-2 text-sm text-neutral-500">
          {{ t('settings.life.project_feedback_received') }}
        </p>
        <div v-else class="mt-3 flex gap-2">
          <Button size="sm" :label="t('settings.life.project_feedback_positive')" :disabled="pendingId !== null" data-life-project-feedback="positive" @click="feedbackOnProject(item, 'positive')" />
          <Button size="sm" :label="t('settings.life.project_feedback_dismiss')" :disabled="pendingId !== null" data-life-project-feedback="dismiss" @click="feedbackOnProject(item, 'dismiss')" />
        </div>
      </article>
    </section>
    <details v-if="history.length">
      <summary class="cursor-pointer text-sm text-neutral-500">
        {{ t('settings.life.history') }}
      </summary>
      <p v-for="item in history" :key="item.id" class="mt-3 text-sm">
        {{ item.summary }} · {{ t(`settings.life.status.${item.status}`) }}
      </p>
    </details>
    <section v-if="growth?.candidates.length">
      <h2 class="mb-3 text-lg font-medium">
        {{ t('settings.life.growth') }}
      </h2>
      <article v-for="candidate in [...growth.candidates].reverse().slice(0, 12)" :key="candidate.id" class="border-b border-neutral-200 py-4 dark:border-neutral-800">
        <p>{{ candidate.patch.summary || t('settings.life.source_withdrawn') }}</p>
        <p class="mt-1 text-sm text-neutral-500">
          {{ t(`settings.life.growth_status.${candidate.status}`) }} · {{ t('settings.life.source_count', { count: candidate.sourceEvidence?.length ?? 0 }) }}
        </p>
        <details class="mt-2 text-sm text-neutral-500">
          <summary class="cursor-pointer">
            {{ t('settings.life.sources') }}
          </summary>
          <p v-for="source in candidate.sourceEvidence" :key="`${source.id}:${source.version}`" class="mt-1 break-all">
            {{ source.kind }} · {{ source.id }} · {{ source.version }}
          </p>
          <p v-for="reason in candidate.validation.activationBlockedReasons" :key="reason" class="mt-1">
            {{ reason }}
          </p>
          <p v-if="view?.ingress.some(item => item.source === 'growth-consumer' && item.payload.candidateId === candidate.id)" class="mt-2">
            {{ t('settings.life.growth_consumed') }}
          </p>
        </details>
        <Button v-if="candidate.status !== 'rolled-back'" class="mt-3" size="sm" :label="t('settings.life.rollback')" :disabled="pendingId !== null" @click="rollbackGrowth(candidate.id)" />
        <template v-if="candidate.status === 'shadow'">
          <Button class="ml-2 mt-3" size="sm" :label="t('settings.life.evaluate_policy')" :disabled="pendingId !== null" @click="actOnPolicy(candidate.id, 'evaluate')" />
          <details v-if="policyEvaluations[candidate.id]" class="mt-3 text-sm">
            <summary class="cursor-pointer">
              {{ t('settings.life.inspect_policy') }}
            </summary>
            <article v-for="pair in policyEvaluations[candidate.id].evaluation.pairs" :key="pair.goldId" class="mt-4 space-y-2">
              <p class="font-medium">
                {{ pair.scenario }}
              </p>
              <p class="whitespace-pre-wrap">
                {{ t('settings.life.persona_baseline') }}：{{ pair.baseline }}
              </p>
              <p class="whitespace-pre-wrap">
                {{ t('settings.life.persona_candidate') }}：{{ pair.candidate }}
              </p>
              <p class="text-neutral-500">
                {{ pair.identityPreserved && pair.truthfulnessPreserved && pair.companionshipPreserved && pair.agencyPreserved ? t('settings.life.persona_passed') : t('settings.life.persona_failed') }}
              </p>
            </article>
            <Button class="mt-3" size="sm" :label="t('settings.life.adopt_policy')" :disabled="pendingId !== null" @click="actOnPolicy(candidate.id, 'adopt')" />
          </details>
        </template>
      </article>
    </section>
    <section>
      <h2 class="mb-2 text-lg font-medium">
        {{ t('settings.life.persona_revisions') }}
      </h2>
      <p class="mb-3 text-sm text-neutral-500">
        {{ t('settings.life.persona_revision_description') }}
      </p>
      <Button v-if="adoptedPersona?.persona" size="sm" :label="t('settings.life.rollback_persona')" :disabled="pendingId !== null" @click="actOnPersona(adoptedPersona!.persona!.proposalId, adoptedPersona!.contentHash, 'rollback')" />
      <div v-for="proposal in personaProposals" :key="proposal.id" class="mt-3 border-t border-neutral-200 pt-3 dark:border-neutral-800">
        <details>
          <summary class="cursor-pointer text-sm">
            {{ t('settings.life.inspect_persona') }} · {{ String(proposal.payload.targetHash).slice(0, 12) }}
          </summary>
          <pre class="mt-3 max-h-64 overflow-auto whitespace-pre-wrap text-xs">{{ proposal.payload.targetContent }}</pre>
          <article v-for="(pair, index) in proposal.evaluation?.pairs ?? []" :key="index" class="mt-4 text-sm space-y-2">
            <p class="font-medium">
              {{ pair.scenario }}
            </p>
            <p class="whitespace-pre-wrap">
              {{ t('settings.life.persona_baseline') }}：{{ pair.baseline }}
            </p>
            <p class="whitespace-pre-wrap">
              {{ t('settings.life.persona_candidate') }}：{{ pair.candidate }}
            </p>
            <p class="text-xs text-neutral-500">
              {{ t('settings.life.persona_invariants') }}：{{ pair.identityPreserved && pair.truthfulnessPreserved && pair.companionshipPreserved && pair.agencyPreserved ? t('settings.life.persona_passed') : t('settings.life.persona_failed') }}
            </p>
          </article>
        </details>
        <div class="mt-3 flex flex-wrap gap-2">
          <Button v-if="!proposal.evaluation" size="sm" :label="t('settings.life.evaluate_persona')" :disabled="pendingId !== null" @click="actOnPersona(proposal.id, String(proposal.payload.targetHash), 'evaluate')" />
          <template v-else>
            <Button size="sm" :label="t('settings.life.approve_persona')" :disabled="pendingId !== null || !personaEvaluationHashes[proposal.id]" @click="actOnPersona(proposal.id, String(proposal.payload.targetHash), 'approve')" />
            <Button size="sm" :label="t('settings.life.reject_persona')" :disabled="pendingId !== null || !personaEvaluationHashes[proposal.id]" @click="actOnPersona(proposal.id, String(proposal.payload.targetHash), 'reject')" />
            <Button v-if="proposal.evaluation.approved && adoptedPersona?.contentHash !== proposal.payload.targetHash" size="sm" :label="t('settings.life.adopt_persona')" :disabled="pendingId !== null" @click="actOnPersona(proposal.id, String(proposal.payload.targetHash), 'adopt')" />
          </template>
        </div>
      </div>
    </section>
    <section v-if="personalChoices.some(item => item.status === 'proposed' && item.expiresAt > Date.now())">
      <h2 class="mb-3 text-lg font-medium">
        {{ t('settings.life.personal_choices') }}
      </h2>
      <p class="mb-3 text-sm text-neutral-500">
        {{ t('settings.life.personal_choices_description') }}
      </p>
      <article v-for="choice in personalChoices.filter(item => item.status === 'proposed' && item.expiresAt > Date.now())" :key="choice.id" class="flex items-center justify-between gap-4 border-b border-neutral-200 py-3 dark:border-neutral-800">
        <p class="text-sm">
          {{ choice.topic }}
        </p>
        <Button size="sm" :label="t('settings.life.withdraw_choice')" :disabled="pendingId !== null" @click="withdrawChoice(choice)" />
      </article>
    </section>
    <section v-if="expression">
      <h2 class="mb-2 text-lg font-medium">
        {{ t('settings.life.expression_health') }}
      </h2>
      <p v-if="expression.body" class="text-sm text-neutral-500">
        {{ t('settings.life.renderer_state') }} {{ expression.body.rendererState }} · {{ t('settings.life.canvas_present') }} {{ expression.body.canvasPresent }}
        · {{ t('settings.life.pixel_state') }} {{ t(`settings.life.pixel_status.${expression.body.visiblePixels}`) }}
        · {{ t('settings.life.native_visible') }} {{ expression.body.nativeWindowVisible ?? t('settings.life.pixel_status.unknown') }}
        <span v-if="expression.body.errorCode"> · {{ expression.body.errorCode }}</span>
      </p>
      <p v-if="expression.lastReceipt" class="mt-2 text-sm text-neutral-500">
        {{ t('settings.life.expression_result') }} {{ expression.lastReceipt.state }} · {{ expression.lastReceipt.playedMs }} ms
        <span v-if="expression.lastReceipt.errorCode"> · {{ expression.lastReceipt.errorCode }}</span>
      </p>
    </section>
    <section>
      <h2 class="mb-2 text-lg font-medium">
        {{ t('settings.life.closure_title') }}
      </h2>
      <p class="mb-3 text-sm text-neutral-500">
        {{ t('settings.life.closure_description') }}
      </p>
      <div class="flex gap-3">
        <Input v-model="closureTurnId" :placeholder="t('settings.life.closure_turn')" class="flex-1" />
        <Button size="sm" :label="t('settings.life.closure_lookup')" :disabled="pendingId !== null || !closureTurnId.trim()" @click="inspectClosure" />
      </div>
      <div v-if="view" class="mt-3 flex flex-wrap gap-2">
        <button v-for="item in view.ingress.filter(item => item.kind === 'user-turn').slice(0, 8)" :key="item.id" class="rounded bg-neutral-100 px-2 py-1 text-xs dark:bg-neutral-800" @click="closureTurnId = String(item.payload.turnId); inspectClosure()">
          {{ item.payload.turnId }}
        </button>
      </div>
      <div v-if="closure" class="mt-4 overflow-x-auto">
        <p class="mb-3 text-xs text-neutral-500">
          {{ t('settings.life.revision') }} {{ closure.revision }} · {{ closure.contentHash.slice(0, 12) }}
        </p>
        <table class="w-full text-left text-sm">
          <tbody>
            <tr v-for="node in closure.nodes" :key="node.id" class="border-b border-neutral-100 dark:border-neutral-800">
              <td class="py-2 pr-3 font-mono">
                {{ node.id }} · {{ t(`settings.life.nodes.${node.id}`) }}
              </td>
              <td class="py-2 pr-3">
                {{ t(`settings.life.closure_status.${node.status}`) }}
              </td>
              <td class="py-2 text-xs text-neutral-500">
                <details v-if="node.references.length || node.reasons.length">
                  <summary class="cursor-pointer">
                    {{ t('settings.life.closure_evidence', { count: node.references.length }) }}
                  </summary>
                  <p v-for="reference in node.references" :key="reference" class="mt-1 break-all">
                    {{ reference }}
                  </p>
                  <p v-for="reason in node.reasons" :key="reason" class="mt-1 break-all">
                    {{ reason }}
                  </p>
                </details>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
    <details v-if="view" class="border-t border-neutral-200 pt-4 text-sm dark:border-neutral-800">
      <summary class="cursor-pointer text-neutral-500">
        {{ t('settings.life.diagnostics') }}
      </summary>
      <p class="mt-4">
        {{ t('settings.life.revision') }} {{ view.revision }}
      </p>
      <p class="mt-2">
        {{ t('settings.life.uncertain') }} {{ view.effects.filter(item => item.status === 'uncertain').length }}
      </p>
      <p class="mt-2">
        {{ t('settings.life.input_pending') }} {{ view.ingress.filter(item => ['accepted', 'processing', 'held'].includes(item.status)).length }}
      </p>
      <ul class="mt-3 space-y-1">
        <li v-for="owner in view.owners" :key="owner.owner">
          {{ owner.owner }} · {{ owner.revision }} · {{ owner.contentHash.slice(0, 12) }}
        </li>
      </ul>
    </details>
  </div>
</template>

<route lang="yaml">
meta:
  layout: settings
  titleKey: settings.life.title
  descriptionKey: settings.life.description
  subtitleKey: settings.life.description
  settingsEntry: true
  icon: i-solar:heart-bold-duotone
  order: 9
  stageTransition:
    name: slide
</route>
