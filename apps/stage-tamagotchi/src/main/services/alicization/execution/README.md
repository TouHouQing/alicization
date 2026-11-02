# Accepted execution work

The desktop life loop owns this implementation. Work plans extend an existing
`LifeObligation`; they do not own a second goal, persona, memory or completion
flag. All plan and acceptance records use the existing life SQLite writer.

## Ownership and dispatch

- `acceptance-compiler.ts` freezes bounded criteria and their proof scope.
- `acceptance-repository.ts` preserves the accepted contract and its history.
- `work-plan-repository.ts` enforces plan CAS, root generation, attempts,
  dependency evidence and the sixteen-action work window inside transactions.
- `work-plan-scheduler.ts` advances only observed steps and yields explicitly.
- `work-plan-execution-runtime.ts` composes those records with existing governed
  browser, desktop and filesystem ports. It stops new work on suspension and
  waits a bounded interval during shutdown.
- `action-dispatch-gate.ts` rechecks the exact prepared input, live source,
  current card/responsibility, cancellation and resource lease immediately before
  a production tool starts. Its permission is single-use. The adapter still owns
  target freshness and any consequential-action approval.
- `uncertain-resource-fence.ts` checks durable unknown effects across requests
  and restarts, including canonical file aliases. Reads can establish facts;
  an ambiguous mutation cannot authorize its own retry.

## Progress, revisions and proofs

`work-input-bindings.ts` resolves parameters from successful, committed dependency
receipts. The same resolution is checked by the database writer. Opaque browser
references must come from the actual observed page; ambiguous matches stop work.

`normalizeWorkSteps` lowers explicit receipt bindings to data dependencies and
the filesystem MCP envelopes before graph validation. It never invents a value;
missing nodes, cycles, ambiguous selections and incompatible final inputs stop
before dispatch. `work-read-binding-failure.ts` records a failed binding for an
unstarted filesystem read using only its actual committed dependency receipts.
The same bounded read-repair loop can revise it. Writes and verified steps stay
exact. Compiler rejections provide bounded feedback within the existing durable
three-attempt budget; provider deferrals do not spend an attempt.

Admission validation errors carry private action-bound no-dispatch provenance
through both ordinary dialogue and event-loop failure normalization. The first
possible admission write closes that boundary. Serialized external error fields
cannot manufacture it, and uncertain effects still require reconciliation.

`file-read-match-verifier.ts` compares a target with a complete authorized read
snapshot named by `file-matches-read`. It verifies the accepted plan, source
step, actual effect, work-window owner, input hash and explicit host requirement
lineage. The read text must reproduce its recorded byte count and digest. An
independent target read checks both bytes and file identity; reading the target
itself or its hard link cannot certify an independent copy. Source files are
not reopened. Exact-copy criteria also survive anonymous method extraction and
different-input replay.

`executionGoalVerificationInputs` supplies the same receipt readers to automatic
completion and explicit host rechecks. The trusted artifact control accepts
exact-copy results; manual review and host-corrected targets retain their
original work identity. `refreshOutcome` projects that current goal through the
existing execution observer without repeating an action or creating a second
body state.

Life schema 7 records these completion semantics. Migration takes the existing
schema backup before changing metadata. Older runtimes must preserve and refuse
a newer database rather than resume a plan they cannot verify. The independent
file verifier also rechecks the target name after reading its open handle, so
a replaced path cannot receive the displaced file's successful byte verdict.

Runtime shutdown closes provider admission, cancels every actual one-shot owner,
clears availability timers and retains leases until their owners release them.
Late provider output cannot become a route or success observation. Draining
memory tasks share one fixed deadline even when a task registers another owner.

`work-plan-revision.ts` retains verified steps when future work is repaired. An
already observed step cannot silently change or disappear. Unresolved operations
must be reconciled before a new plan revision. The settings page can revise an
unfinished step's existing text or path through `work-step-revision.ts`, then
resume the same root responsibility.

`work-adaptation-context.ts` and `work-adaptation-runtime.ts` can repair future
reads after a settled read-only failure. They send the original request, frozen
criteria, current operation interfaces and bounded actual read receipts to the
registered execution-planning job. The model receives no execution authority.
The writer retains every verified step and every original mutation declaration,
rejects changed interfaces or host/source edits, and commits the new plan and
audit together. Unrelated life-clock commits may be rebased without another
model request. Three durable attempts per responsibility generation prevent a
retry loop; crashed planning owners expire without authorizing a stale response.
Host denial, unknown effects, explicit literal plans and custom resource scopes
remain held for host control. Suspension and shutdown abort the model wait.

The provider must claim its durable repair attempt after acquiring the normal
gateway lease and before model dispatch. Foreground work, a busy background lane
or backoff consumes no attempt. An unclaimed response or a late claim is refused;
cancellation waits for a pending admission commit before settling its marker.

Automatic repair is recorded at initial admission as `readRepairPolicy`. It is
immutable across revisions. Existing plans without this policy retain manual
continuation: their historical pause intent cannot be reconstructed safely.
New host pauses remain held in the same ingress ledger, outside its recent-event
tail, until an explicit Continue settles them. Stopping targets the stable task
identity across revisions; it can never change criteria or step inputs. A failed
stop commit keeps an in-memory dispatch fence until explicit host continuation.

The provider schema couples every acceptance predicate to its exact proof scope,
using the compiler's mapping. Syntactic source recognition is separate: even an
invalid explicit user plan is retained as a binding, never silently corrected.
Omitted `acceptanceCriterionIds` means no step-level evidence association; it
does not remove root criteria. Dependencies remain explicitly required.

Known literal UTF-8 content may use provider `file-content` criteria. The local
parameter compiler converts these to the existing `file-bytes` predicate before
admission. Empty text and line endings remain exact, invalid Unicode is refused,
and the original effect/request stays bound through the same canonicalization.
No new stored predicate or verifier authority is introduced. An unknown digest
must never be invented by a model.

Receipt-bound top-level inputs may be omitted from the fixed declaration.
Planning validates all fixed fields and the declared binding names/dependencies;
runtime resolution reads only verified committed receipts and performs complete
operation validation before preparing an effect or requesting permission. A
wrong observed type cannot reach the adapter. Planning attention derives from
the same committed processing marker and drains on completion, pause or cancel.

For the specific `filesystem_read_file` → `filesystem_write_file.content`
binding, `path: ['content']` is a file-text shorthand. Admission compiles it to
selection of exactly one MCP block with `type: 'text'`, returning its `text`.
Explicit selections and other tools retain literal path semantics. Multiple or
missing text blocks stop resolution; the runtime never joins or stringifies
arbitrary arrays. Source matching and effect acknowledgment use this same
canonical form, retaining the complete original request and tool arguments.

The provider coordinator notifies accepted work when the last foreground and
background owner releases, or a failure backoff expires. A deferred repair
therefore resumes from committed state without a new host action or spent model
attempt. The runtime unsubscribes on shutdown; the notification owns no input
lease and never emits conversation or initiative by itself.

An observed step is not a fulfilled goal. Completion checks all required frozen
criteria against actual files, JSON/text structure, directory membership,
settings or displayed state. Subjective approval is recorded separately and is
bound to exact delivered artifact versions. That approval does not establish an
independently learned successful procedure.

The presence observer reads committed progress. Heartbeats extend visibility
without retriggering a gesture, speech or lip sync. Final UI/body feedback follows
the actual goal verification and survives a subsequent settings reload.

`work-acknowledgment.ts` projects an existing plan and its actual review,
blocked-step and unknown-effect conditions into dialogue grounding. A bounded
acknowledgment does not certify an action or completion, create another promise,
resume blocked work, or write another file. Mixed action/completion clauses keep
their existing evidence requirements.

`runtime-health.ts` coalesces bounded probes and never promotes a late result
after timeout. The Windows UIA probe loads the actual worker without inspecting
a user window; browser health probes its own blank/loaded WebContents and CDP.
Readiness is shared by the model and capability UI, rather than inferred from
the existence of a handler. Native selection uses exact observed WinForms
options, native application notification and readback; it rejects changed or
ambiguous options. This is semantic input, not physical keyboard control.

## Verification and current limits

Run scoped tests with `pnpm exec vitest run --maxWorkers=2 --testTimeout=30000
apps/stage-tamagotchi/src/main/services/alicization/execution/`. Real product
checks use the private desktop runner and Live2D. They never switch the host
input desktop.

The managed browser now uses isolated-world CDP observations and document/backend
node identity, actual Chromium input, ancestor-frame occlusion checks and owned
input cleanup. `browser-downloads.ts` verifies downloaded file bytes and records
transfer history through the life writer. `browser-upload.ts` freezes exact
approved file snapshots; `tool.browser_upload_files` is available to accepted
work plans. File selection explicitly does not prove service receipt.

The full EX00–EX23 acceptance remains open. The native Windows keyboard driver,
complete transfer/GUID/popup/browser-grant workflows, five production
reconciliation readers, automatic compensation capture, non-file skill
evaluation/activation, full retention policy and all eight three-run product
groups are not complete. Standalone broker, permit or compensation helper tests
do not establish those production capabilities. Consult the work-item JSON and
experience report before treating a build as a release.

## Recovery and skill lifecycle

`effect-recovery-runtime.ts` persists independent recovery observations before
releasing an effect's resource quarantine. Work checkpoints consume those
observations without repeating the original write. `interface-effect-recovery.ts`
can verify an unsubmitted full replacement on the exact originally observed
control. Its proof covers the present field, not external storage or authorship.
Cancelled responsibilities retain their cancellation after effect reconciliation.
Recovered state is excluded from successful procedure learning.

`host-recovery.ts` scans each existing card database through read-only handles
before host execution is enabled. Unknown effects reconstruct resource
quarantines in the one host broker, including canonical file/hard-link aliases.
The boot guard remains on any scan, hash or resource-resolution failure. The
scan does not switch identity, migrate inactive databases, replay work or accept
old fencing tokens. Reconciliation binds both card and effect identity. A
stopped work plan classifies its interrupted dispatch when that card becomes
current, then uses the same independent effect reader. Overlapping unresolved
effects remain blocked; this does not establish physical-input takeover.

`skill-lifecycle-repository.ts` persists bounded registry decisions through the
same life writer. The current card restores its latest decision independently of
the ordinary recent-event tail. Instruction loading is source-hash-bound and
rechecks revocation after asynchronous reads.

The file procedure pipeline uses `procedure-candidate-repository.ts`, virtual
`procedure-skill-files.ts` sources, `procedure-evaluator.ts` and
`learned-procedure-runtime.ts`. Actual independently fulfilled work can produce
a private-data-free parameterized candidate; two changed-input native-file
replays and counterexamples precede explicit registry activation. Fresh current
requests reuse the method through ordinary governed work. Source withdrawal,
policy/interface change and same-version source mutation invalidate use; source
binding and plan admission share one writer transaction. GUI, CLI and delegated
code evaluators remain separate open work.

## Explicit access to an existing browser page

The desktop life settings own the authorization control plane. The model cannot
provide a CDP endpoint, grant itself another tab/origin, copy a browser profile,
or silently fall back to the managed browser after revocation. The host inspects
an explicit loopback endpoint, selects one exact page and grants bounded origins.
The page socket never connects to the browser-wide debugger. Observation filters
ungranted child origins before creating an isolated world or reading content.

`life-authorized-browser-runtime.ts` owns the grant and session lifetime;
`authorized-browser-endpoint.ts` bounds discovery; `authorized-browser-transport.ts`
owns pending protocol commands and injected key/button release. Revocation
invalidates ordinary commands before awaiting cleanup, stops only matching
browser work, and leaves the original browser tab open. Failed release remains
unknown until independently resolved or explicitly attested closed by the host.
An attestation is not independent proof of task success.

`BrowserWorkBinding` pins every newly admitted browser plan to an ephemeral grant
or managed-runtime instance. A reopened database cannot resume browser work on an
unrelated session. The host's **reobserve and continue** command creates an audited
CAS revision of the same responsibility, refreshes future opaque selector bindings
and carries forward verified effects. It refuses unresolved effects, terminal or
withdrawn roots and unbound literal selectors. Existing legacy unbound plans and
effects remain held; they are never assigned to a new browser implicitly.

The ordinary interface risk policy still governs every external edit and click.
Approvals bind the actual text or visible form preview, UTF-8 bytes, hash and
observed target. Raw hidden form fields and private form comparison material do
not enter public page observations or previews. File selection and visible form
state do not certify external service receipt. Browser-wide popup/download
ownership and physical host-input takeover remain separate open acceptance work.

Method listing shares the current card's scope without waiting for a background
provider. Explicit evaluation/activation/revocation uses the existing foreground
user-control coordinator. Cancellation bypasses that queue so it can stop an
evaluation that currently holds the scope.

The work runtime distinguishes writer closure from result delivery. Browser
takeover and the next accepted work window wait for actual adapter, interrupt and
observer closure. A queued notification may continue waiting for its card scope;
it cannot hold the execution scheduler. The public `run` promise still includes
notification completion, while `isWriting` describes only active execution.
Committed result events survive restart independently of notifications.

Before any admitted action or public text, a locally validated invalid tool
proposal may be corrected once using the unchanged offered schema and user goal.
Unknown tools, remote error strings, cancellation, repeated invalid arguments and
post-action failures do not enter this path. Only a validated assistant call is
carried into the conversation for pairing with its actual tool result.

## Host revision of acceptance requirements

`criteria-revision-repository.ts` owns the explicit host control for changing an
unfinished task's criteria. The same writer transaction checks the plan, goal and
contract fences, refuses active or unknown effects, journals the host feedback,
increments the goal generation and contract/plan revisions, and invalidates the
old verification. Source dependencies still reach the new generation.

Observed operations keep their exact inputs and effects; criterion associations
may change only through this compound host mutation. The task remains paused.
Continuing executes only unfinished steps and independently checks the current
artifacts against the new contract. An old user approval cannot approve that
contract. This does not implement general automatic cross-domain replanning.

## Authority after asynchronous approval

`action-dispatch-context.ts` carries a main-owned check through the direct chat
and durable work adapters. Consuming admission once does not freeze permission
forever: MCP, file mutation, trusted browser input/navigation and Windows control
dispatch recheck the current source, exact effect, cancellation and resource
lease after waits. The context closes when the adapter returns, including for
callbacks created during that call. Native Windows workers also receive an
expiry and check it immediately before UIA/native mutations. Compound native
selection checks expiry again before changing selection or notifying its parent.

File writes keep their verified native handle while checking ongoing authority;
a new file's own inode does not invalidate its original path fence. Browser key
and mouse releases are allowed after revocation only when the corresponding
press was actually dispatched. Host controls outside an agent dispatch still
use their own existing adapter risk policy. This is not the full physical input,
delegated executor or external transfer acceptance matrix.

## Contradictory literal proposals

`work-proposal-coherence.ts` can reject a file-only proposal whose causally final
literal writer contradicts required bytes, text or JSON keys. It performs no I/O
and supplies no execution proof. Dynamic destinations/content, unordered writers
and other channels remain subject to independent verification.

The provider may correct one locally rejected proposal before admission or public
text. A literal correction preserves all arguments except write content; a shape
correction preserves any valid original goal and acceptance criteria. Main-owned
repair hashes are checked before publishing a proposed tool call and before
carrying it into conversation history. Weaker criteria cannot make an incorrect
artifact acceptable. This does not implement general adaptive replanning.

## Durable native browser transfers

The browser records a version 2 download reservation before activating a link.
Its owner is the current card, main-process runtime, source effect, native action,
observation, exact private URL hash and private transfer directory. Full signed
URLs stay out of history. An opaque, single-use handle can bind only the actual
matching DownloadItem. Same filenames use separate directories; completion needs
stable file readback and a persisted beginning before it supplies a SHA-256.

Native stop is separate from journal drain, allowing shutdown to close its native
writer before awaiting card-scoped persistence. Approval cancellation, deadlines,
oversized downloads, duplicate handles and failed admission cannot become a
completed transfer. Windows upload snapshots use namespaced paths at the CDP
boundary so long profile paths select the exact approved bytes.

On database opening, only reservations from previous process instances recover.
A missing terminal result becomes unverified. Missing or corrupt native-begin
records become intent-only unknown admissions; they never prove that no file was
written. Recovery preserves partial files and original journal records, and does
not navigate, retry, upload, infer hashes or finish a user goal. Current native
owners survive same-process database reopening. Older histories lacking the
current exact reservation binding remain unverified; they are not upgraded into
new proof. Page reads expose admissions separately from verified transfers.

`browser-download` acceptance binds the exact managed-browser click step before
execution. Its receipt retains the immutable reservation ID. Verification joins
that effect, its reservation and native beginning/terminal records, then reads
the current file independently. Bytes and optional expected hash prove the
downloaded artifact only. They do not certify external service receipt or quality.

Native completion wakes verification without replaying input or holding other
accepted work behind an unrelated writer. Pause/cancellation and responsibility
revisions remain authoritative. User review may refer to the downloaded artifact;
opening it resolves and verifies the bytes again. Historical journal pagination
does not lose the direct immutable reference.

Each native reservation acquires an independent filesystem subtree lease before
the durable intent is admitted. It outlives the parent click. A 120-second native
duration budget requests cancellation; expiry never proves that the writer has
stopped. Release requires native stop and terminal persistence. Failed terminal
persistence quarantines the exact subtree. Retired browser managers keep known
native writers until they actually stop and their journals drain.

Only the coordinator for a plan whose individual steps acquire their own resources
can share this scope with unrelated work. Opaque executors and bootstrap recovery
retain their global fence. Ancestor paths, descendants and resolved directory
aliases conflict; similarly named sibling directories do not.

Startup restores download ownership through the same host recovery guard as
other execution. A bounded, hash-checked ingress cursor reads reservations beyond
the presentation history. Its explicit limits are 64 records/1 MiB per page,
100,000 historical reservations and 4,096 unresolved owners per card. Overflow or
corruption retains the bootstrap guard. This is a fail-closed recovery budget,
not a complete retention policy.

The host recovery UI lists unknown native owners with pagination. Its expiring,
one-use confirmation binds the actual surface, reservation, resource lease,
related goal and current native evidence. An overlapping live writer or a known
native writer prevents takeover. A queued unrelated executor does not deadlock
this decision. The life writer records the release and original goal evidence
before the broker frees its quarantine. Host attestation may end that goal; it
cannot create a successful transfer, upgrade partial bytes or replay input.

Popup ownership, hard-link aliases outside the owned subtree and the complete
transfer fault/retention matrix remain open acceptance work.

Skill lifecycle persistence can retry bounded global-writer contention only
while its exact lifecycle head remains unchanged. A competing skill decision,
storage failure or changed card is never retried as an unrelated event. After a
failed host command the method UI refreshes read-only state rather than replaying
the mutation or retaining an old active display after durable revocation.

## Waiting for actual host approval

`action-approval-presence.ts` observes the live permission promise using the
private action authority. It owns transient wait state only. The task observer
receives immediate changes, shows waiting instead of acting, and keeps the same
emotional baseline. The body settles quietly without replaying phase gestures.
Manual host controls do not create life tasks or another personality owner.

Permission requests register before their prompt is emitted. Renderer failure,
refusal, cancellation and timeout release the wait. A failed or hanging audit
write cannot extend a permission deadline. Presentation subscribers cannot grant
permission or prevent executor settlement. This is not evidence of completed
physical input or full Live2D/voice acceptance.

## File version recovery and lifecycle

The desktop captures original bytes through the actual filesystem dispatch port,
encrypts them with Electron safeStorage, and records immutable before/after
metadata in the same life writer. Host restoration is a separate capability;
models cannot supply bytes or choose a restore path. Expiring one-use window
confirmation binds the version, actual file identity, bytes and related goals.
Native restoration requires exclusive NTFS handles and durable process identity
before receiving input. Unknown outcomes remain governed LifeEffects.

Version cleanup uses a separate host confirmation and evidence-forget boundary
before exact ciphertext deletion. It does not change the business file or prove
the original task successful. Old identity backups cannot revive forgotten data.
Backup v2 transports referenced ciphertext without decrypting it; Windows DPAPI
remains tied to the machine/account. Legacy v1 is accepted only without file
ciphertext references.

Startup/daily orphan maintenance scans full bounded journal pages, excludes live
references and pending captures, and processes up to 16 objects older than 24
hours. Prepared and observed audits bracket stable identity/hash deletion. A
late audit failure can resume by observing absence; it cannot repeat a business
write. Maintenance drains before database shutdown. These bounds are not full
long-term retention or complete EX14 acceptance.

## Work admission and explicit request parameters

`work-plan-admission.ts` maps only the exact current successful plan-tool admission to its accepted responsibility. Its parameter and contract hashes prove admission scope; they do not certify a file operation or root completion. Review-local aliases keep those identities distinct from unrelated effects.

`declared-work-proposal.ts` reads a bounded, valid, unique complete JSON proposal in the current user request. Provider validation and production responsibility admission both preserve its goal, criteria, paths, contents and step declarations. A mismatch can use the existing single pre-dispatch repair; no rejected candidate is published as an action or dispatched. This constraint does not authorize execution, infer intent from ordinary prose, or replace adapter permissions.

## Browser procedure transfer

The transferable operation vocabulary includes one HTTP page navigation and one
bounded text observation, coupled to ordinary file steps and independent file
criteria. URLs are fresh parameters; the source browser identity, cookies,
private page content and element selectors are not captured. Browser observations
can supply file content, but cannot select a future navigation or file target.
Multiple pages and interactive/native operations require further
dedicated evaluators and are refused by this compiler.

`procedure-browser-replay.ts` supplies a disposable Electron session, a private
loopback page and an unfocusable window outside every display. Replay uses the
production browser adapter, work scheduler and native file verifier. Two fresh
inputs, changed/missing page counterexamples, interface changes, invalid arguments
and cancellation must pass `browser-procedure-replay-v1`; file-only proof cannot
activate a browser method. Skill permissions come from unchanged operation
manifests. Activation, use and source withdrawal retain the existing life journal,
registry and atomic source binding. The new browser replay integration must pass
its real Electron acceptance before it is included in a release.

## Delegated procedure transfer

One explicit Codex, Claude Code or CLI mutation can form a method with file
criteria. Workspace, instructions, program and arguments are fresh parameters;
private examples and permission overrides cannot become skill defaults. Current
manifest permissions and the highest operation risk remain in the skill. Every
use still requires the ordinary parent-bound execution authorization.

`procedure-delegated-replay.ts` reuses the production child orchestrator and
executor in an owned Windows fixture. The child must produce its own final
bytes; the evaluator never seeds accepted output. Eight checks include fresh
inputs, refusal before dispatch, zero exit without an artifact, and cancellation
after the expected bytes appear but before the child receipt. The latter stays
unknown and cannot fulfill the responsibility. Child processes must settle
before fixture cleanup. Real CLI and configured Codex replay/activation/three
fresh uses/withdrawal pass in the focused suite; Claude needs its actual backend
and remains unverified here. The new main-process source still requires the
combined regression and packaged UI acceptance.

## Host requirement changes with unfinished work

The requirements editor can stage changes to several future steps and their
acceptance criteria in one command. `explicit-work-step-edits.ts` limits changes
to existing unbound text, paths and program arguments. The same life transaction
updates the contract, plan revision and obligation generation; already verified
steps remain exact, and unresolved effects block revision. Failed edits leave
all three unchanged. Source withdrawal follows the host change into learned
methods and their later responsibilities.

Three real SQLite/native-file cases cross the 16-step window, stop after 17 of
24 writes, change classification for only the remaining seven, reopen the
database and finish without repeating an original write. The first also learns,
evaluates and uses the revised method on 24 fresh inputs, then withdraws its
host-change source. Component tests retain multiple draft edits across unrelated
snapshots and submit one combined payload. Packaged UI acceptance is still due.

## Failed method use and a repaired version

After actual independent verification rejects a learned use, the existing life
writer records its precise method, plan and verification identities and a repair
candidate reference. It removes action authority for that method version through
the existing evidence graph. The original successful experience and partial
files remain history. Pause, refusal and uncertain effects are not failed-method
proof. Discovery and argument preparation reconcile a pending negative outcome
before allowing further method use; stale activation cannot grant authority.

The repair notice survives restart. A new candidate requires a fresh independently
verified task and its dedicated replay; an old passing replay cannot reactivate
the failed version. Three native-file and three actual Electron DOM cycles cover
downgrade and replacement. Each Electron cycle includes three uses before the
changed page and three uses of the newly evaluated replacement. This remains
module evidence until the updated package passes its product UI checks.

## Windows process ownership

The desktop main runtime owns `userData/alicizations/execution-native` and passes
that root through the task dispatcher and adapter registry. It never comes from
a model or renderer command. The fixed Job supervisor is prepared from bundled
source under a private directory with a verified executable hash. Windows 10+
creation attributes associate the suspended target with its Job during creation;
the explicit create/assign crash window has a real native regression.

Ready/go/stop/final receipts bind the parent, supervisor, target, nonce and input
digest. The control key stays in private stdin and memory. Immediately before
go, the original action and work delegation must still be current. The supervisor
retains the original parent handle, disallows breakaway and drains ordinary
descendants on cancellation, parent exit or root completion. Native fixture
inspection retains an original handle and checks image, nonce and birth before
reaping a regression orphan; it never stops a process by an unverified PID.

CLI streaming, Codex protocol settlement and Claude buffering use this same
Windows boundary. An absent/corrupt final receipt forbids success. A stopped
writer still leaves earlier unverified effects uncertain in the same life
ledger, so cancellation cannot teach successful methods or fulfill a root goal.
Job ownership does not contain independent WMI, service or remote handoffs;
those need their own receipts and reconciliation. POSIX groups retain their
existing transport. See `docs/research/2026-10-30-windows-process-ownership.md`
for qualified results and the required new package acceptance.

Failed procedure evaluations keep a bounded status/known-error-code diagnostic
after their owned fixture is disposed. Commands, private paths/content and raw
provider output are excluded. This explains a failed replay without relaxing
its independent criteria or enabling the rejected version.

### Main filesystem facade authority

The life effect stores original tool parameters. Only private main scopes can lower read defaults or derive edit/patch writes. The gate computes those writes from immutable approved instructions and a bounded read snapshot; native expectedHash checks the real opened file. Read authority cannot become write authority. Nested scopes share parent lifetime and cancellation. All three mutation capabilities use the same encrypted version repository, restoration control and pending-capture cleanup protection. Immediate explicit read-only lookups prefer direct tools when their actual backend is registered; ordinary planner and native dispatch policies remain authoritative.

### Work admission and execution resources

Only the exact plan and evaluated-method entry points use card-scoped life-work-admission resources. They commit governed plans; each actual step still acquires its file, browser or physical input resource. This lets a current request be accepted while another execution owner finishes, without releasing uncertain native actions or certifying completion. Uncertain admission retains its own fence. Mixed scopes and unknown lookalike operations retain the normal execution fence. Conflict diagnostics record owner and resource families without file paths.

### Foreground work and native initiative

The existing gateway coordinator owns foreground admission. New user dialogue and execution controls cancel only proactive owners; queued initiative rechecks foreground admission before adapter entry. An interrupted read-only native initiative yields its host lease only after its exact local dispatch refusal or authenticated native process-tree stop is persisted. Serialized provider flags, stale attempts, foreign owners and mutating tasks cannot satisfy this acknowledgement. Unknown stops remain quarantined. Internal world-model identifiers are not executable goals.

## Paired method version evaluation

The current method and candidate replay the same two synthetic logical inputs in separate owned fixtures. SQLite goal verification and effect results supply completion, operation and retry counts. Browser/delegated authorization ports count confirmation requests; elapsed time is recorded without treating host scheduling noise as an improvement. Paired input hashes, native evidence hashes and the exact baseline version remain in the existing immutable evaluation journal. A missing, incomparable or regressing comparison cannot approve a new version. Established versions require their latest established baseline. Explicit comparison can compare another method with the same parameter/acceptance domain. Prior evaluations remain historical records; this additive journal shape does not retroactively certify an older version with unmeasured performance. Actual model cost and notification quality remain separate acceptance scopes.

The settings component shows both measured versions and clears selection on card changes. Real native-file/SQLite cycles cover failure, restart, replacement and rejecting a redundant read despite successful completion. Actual packaged browser/UI comparison remains required.

Comparison domains include the current versioned operation interfaces, parameter roles and acceptance kinds. A compatible changed template cannot evade comparison by obtaining a new content-derived skill ID. The latest established method in that domain is required automatically and rechecked at commit. Changed interfaces belong to a new evaluation domain and cannot inherit the previous interface's replay approval.

## Fresh proposal after stale admission

A consumed life-owner conflict before action dispatch remains a rejected, no-effect observation. After the existing context refresh, the next provider request must propose a fresh action through that still-offered capability. The model does not receive authority to replay an old effect or skip current owners, source checks, permissions or independent verification. Once a fresh action is proposed, ordinary dialogue/tool choice resumes. Missing capability, an ignored required action or the existing bounded conflict limit fails closed.

## Upload method transfer

Upload-method transfer now has its own `browser-upload-replay-v1` evaluator.
The compiler accepts a bounded observed form transaction, replacing source file
paths with one to four fresh absolute file arguments per observed upload control.
It retains no source URL, control reference, filename, file bytes or credentials.
Replay uses the existing governed native CDP adapter and upload snapshot approval.
The owned loopback receiver parses actual multipart bytes, checks each filename,
byte count and SHA-256, refuses extra fields/files and duplicate submissions, and
only then exposes a receipt for independent exact-byte verification. Selecting
files never satisfies that criterion. Each upload case closes its exact window
before retiring retained snapshots; it does not reuse the user's browser.
Eleven required cases include two different inputs, changed upload bytes,
incorrect receipt, missing/ambiguous controls, refusal, interface change,
invalid arguments and cancellation. General arbitrary browser and native GUI
method transfer remain separate work. Current native and product acceptance is
recorded in the v313 evidence, rather than implied by this implementation.



## Single-window visual fallback

`windows-visual-runtime.ts` owns the ephemeral image lifecycle and composes the existing ActionPermit, resource broker and foreground owner. `desktop_locate_window` requires a fresh semantic window identity, original request capture policy and separate capture/transmission reviews. The actual gateway destination/account is checked before every provider attempt. At most two private images survive for at most 60 seconds. Tools receive metadata and bounded locations, never PNG bytes.

`desktop_pointer_action` consumes that exact work-ingress observation before host review. The native actor/guardian revalidate the pinned process, input desktop, same image/geometry/DPI and event delivery. A physical takeover stops input without reacquiring focus or replaying coordinates. The main-owned journal binds actual locate evidence, original parameters and one CAS intent; recovery only inspects original processes and authenticated durable receipts. A genuine preflight refusal proves no input, while delivery still requires independent task verification.

The approval UI and execution gaze use the same image-pixel targets and original capture timestamp. No execution heartbeat starts speech or lip motion. See the native visual fallback supplement in docs/plans for actual native tests and unaccepted hardware/product gates.

Visual source authority comes from the current accepted work DAG and its verified semantic receipt, not the last observed window title. The source guard rechecks the actual life database, active slice, goal generation and dispatched effect. Native authority explicitly binds nullable `GW_OWNER` through capture and every input surface check. Proven no-input refusals support explicit host Continue with fresh semantic/image evidence and renewed review; unknown effects, revoked authority and host denial do not authorize replay. The foreground broker is acquired lazily after runtime composition so dormant startup and shutdown do not read uninitialized execution resources.

An authorized visual request may wait up to five seconds for the existing model owner to release its slot. Availability events wake it; foreground ownership, failure backoff and shutdown remain authoritative. Waiting uses the original request budget and rechecks image authority and destination before actual transmission. An unavailable result remains a known no-input blocker with explicit window recheck, fresh image review and preserved completed work.
