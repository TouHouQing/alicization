# Source UI clock for streamed text and Live2D lips

The original V305 experience retained a 191 ms first-mouth delay and a 435 ms draw gap. Its unchanged-build observation replay passed 101 first-glyph, expression, gesture and cancellation checks, but source-to-body delivery still reached 975 ms across 383 observed glyph pairs. That replay did not prove synchronization of every glyph under renderer stalls.

The cursor previously measured a glyph's dwell before its UI update, and the stage started a fresh mouth clock when a queued cross-window packet arrived. Slow rendering could therefore shorten the visible dwell and replay an obsolete phoneme as if it had just been displayed.

The source cursor now waits for Vue's DOM commit, stamps `presentedAt`, publishes that timestamp through the existing guarded stream, and measures the remaining dwell from the same commit. The timeless phoneme plan remains unchanged. This timestamp belongs to UI delivery and stays in the stage UI layer.

The stage retains the source timestamp as mouth `startedAt`. It discards expired queued mouth units, retains caption text, and preserves existing turn, cancellation, speech-mode and gesture ownership. TTS continues to use its acoustic clock; text delivery does not create audio energy.

The slow-render case failed before the change and passes afterward. Worktree cross-subsystem coverage passes 139 tests; full shared UI and Live2D coverage passes 1581 tests across 150 files with 3 original skips. UI types and scoped lint pass. Primary-only cases still require primary replay and must not be replaced by worktree test counts.

The product scenario retains all previous assertions and adds source-clock provenance for every observed mouth delivery. It also stalls only the owned offscreen stage for 700 ms after a real first glyph, queues real BroadcastChannel events and requires expired mouth inputs to remain null. No phoneme, emotion or motion is injected. Normal text pacing thresholds and the 150 ms first-glyph limit remain unchanged.

V308 also includes the V307 actual-array MCP catalogue fix and V306 bounded, hash-verified native content search. Packaging must bind all compiled ASAR entries and all seven fixed ripgrep resources outside ASAR, including license notices. Source checks, installed product identity and actual product outcomes remain separate evidence.

This does not establish consciousness or long-term lived continuity, nor does it close outstanding external native providers, human takeover or the remaining EX01–EX23 product matrix. Full acceptance stays false until the required implementation and actual acceptance evidence are complete.
