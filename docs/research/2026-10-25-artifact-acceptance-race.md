# Artifact observation race in the native product harness

Full workflow QA pass89 failed at 100 checks when the third normal-work artifact briefly contained zero bytes. The harness stopped waiting as soon as a file could be read, then compared that intermediate result with the expected marker.

After normal shutdown, the same file contained the exact expected 78 bytes and SHA-256 `f6c1d12232d5de1436fdf37bc30a9220ed8c307da3c9f7d0109b0dbb63b97446`. The read-only SQLite step record was independently verified. This establishes a harness observation race: creating the writer's owned handle did not mean its write had finished. Pass89 is retained as failed, rather than relabeled as accepted.

The wait now ends only when the exact expected content is present. The existing 45-second deadline and final hash assertion remain unchanged; wrong, missing or partial content still fails. Subsequent independent verification, host review and no-replay checks remain required. Production behavior has not changed. Actual complete workflow revalidation is pending.

## Timestamp baseline after the writer closes

Pass96 failed at68 checks when the repair test compared modification times. The repaired task was actually fulfilled: read-only SQLite inspection found one settled write effect with attempt_count1, the same effect carried into revision2, and one successful corrected read. The original timestamp sample had been taken as soon as the bytes appeared, before the UI observed the write result. Windows does not guarantee the final last-write timestamp until the writing handles close; see [Microsoft File Times](https://learn.microsoft.com/en-us/windows/win32/sysinfo/file-times). The original before-time was not retained, so this evidence does not retroactively accept pass96.

The harness now opens the actual product details and waits for the first write to show its observed result within the original repair deadline before sampling mtime. It still requires exact content and unchanged mtime after repair. Ordinary repairs additionally record their actual task/plan identity and baseline scope, then reopen the database read-only after normal exit to verify three fulfilled original tasks, one retained write effect each, the corrected read and unchanged artifacts. No production execution rule or deadline was relaxed. Full product revalidation is pending.
