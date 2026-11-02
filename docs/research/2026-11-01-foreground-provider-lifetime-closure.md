# Foreground priority follows a live conversation lease

This Phase 1 repair strengthens dialogue/initiative preemption for EX05, EX15 and EX19. The current primary package remains v318 while this change is qualified separately.

## Verified baseline and remaining failure

The actual v318 package 20261101-30faed13 passes an additional natural background experience: one current creative choice, no second instruction to create, ordinary sixty-second background ticks, one independently verified fictional artifact and observed creative episode, and no unsolicited message across another full timer interval. The native app exits normally and credentials are removed. The UI report passes38 checks; read-only inspection leaves the database unchanged. Keep output/execution-v318-early-self-project-20261101-pass1 and its controller/source-hash reports.

An additional actual native experience forwards unchanged requests to the configured real model, holding only the creative response long enough for a new user turn. The existing ordinary timer path already preempts correctly: the background client closes46ms after the user returns, the late upstream HTTP200 is discarded, and the native debug event records background preemption. Its initial harness incorrectly expected a failure and is retained unchanged. output/execution-v318-actual-provider-priority-classification-20261101.json independently records the positive product outcome, normal exit, removed credentials and unchanged source. The expired-context bug below is a separately reproduced coordinator/runtime edge; this real timer experience does not reproduce it.

The coordinator stored the literal foreground lane in AsyncLocalStorage. A timer or detached promise retains that context after the originating conversation releases its lease. New personal activity could therefore inherit foreground priority from an ended conversation: it could bypass a new active conversation and would not enter the preemptible background slot. Source labels and audit families do not resolve this lifetime mismatch. The existing execution-planning special case covers that source only.

## Implementation

The private async context now carries a liveness predicate for the originating foreground lease. Releasing that lease immediately revokes its ability to lend priority, including from already scheduled callbacks. Calls from an expired context enter normal background arbitration, backoff and preemption. A genuinely live invitation remains foreground work. Execution planning retains its explicit background policy. No public IPC, provider schema, new queue, retry budget, permission or persistent persona state is introduced.

## Verification and limits

Six new coordinator cases cover detached personal activity, dream and grounding calls over a newer conversation, actual background cancellation after the original conversation ends, live invited creation and reusing an ended handle. Five fail on the original implementation; the live-owner case already passes. An additional integration regression uses the real coordinator and one-shot runtime with a controlled provider that ignores abort. The original coordinator fails: the pending response is not preempted. The scoped RED runner restores the exact fixed bytes afterward and records both hashes.

The repaired focused run passes77 checks across coordinator, provider runtime, invitation and execution interruption. Its first related qualification passes636 checks with one skipped, desktop types and lint. It preserves the actual parent resource lease, exact owned-note file verification and creative episode checks from v318. A later actual invited-creation test found a separate reply-review schema error documented in 2026-11-01-multiline-artifact-sharing-closure.md; both changes require a new combined qualification and current package. No controlled provider fixture certifies a live Codex/Claude service or physical human takeover.
