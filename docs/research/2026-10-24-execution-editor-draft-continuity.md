# Execution editor draft continuity

Actual Live2D combined product pass72 failed at a filesystem permission targeting the earlier unavailable source. Read-only inspection of the actual SQLite plan journal showed revision 2 still contained that original path. The permission matched the stored plan; this was not evidence of a stale permission queue or permission escalation.

Both execution editors watched a getter returning an array of scope values. Replacing a reactive plan or acceptance object during an unrelated life-view refresh created a fresh array, causing Vue to rerun draft initialization even when every scope value was identical. A host edit could disappear between input and Save. The criteria editor could also discard an added requirement.

The editors now watch separate card, plan, revision and contract/generation values. An equivalent refreshed snapshot preserves the current draft. A genuinely different card, plan, revision or contract reloads its own authoritative input. Step availability is watched separately so a newly verified or running step leaves the editable selection. Repeated submission while a step save is pending does not issue another revision request. Backend CAS and risk policies remain authoritative.

The regression mounts the real compiled Vue client templates and setup with only primitive fields and IPC replaced. The original components failed both same-scope refresh cases, while the genuine revision-change case already passed. GREEN coverage verifies retained submitted paths and required text, added requirements, changed contracts/revisions, different cards, newly verified steps and a pending save. Existing actual Eventa clone-boundary and SQLite plan/criteria revision tests remain part of the composition.

The product controller now fills the actual editor, clicks the real life-view Refresh button, waits for refresh completion, verifies the entered values, and only then saves. It checks both a corrected step path and the added hash requirement. This turns the observed timing race into an explicit product regression; no permission target is skipped or broadened.

At this document's creation the isolated composition and Vue typechecks passed, but the primary merge and actual refreshed Live2D product replay remain pending. This is a focused EX19 fix, not completion of all execution or native takeover acceptance.
