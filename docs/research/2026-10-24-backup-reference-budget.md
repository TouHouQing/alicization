# Backup reference budget and lifetime lookup

This EX20 continuation is implemented in the isolated `execution-transfer` worktree. It is not yet merged or accepted as complete lifecycle governance.

A real SQLite snapshot regression containing one encrypted original and 4100 creation-only version records reproduced an incorrect backup rejection. The reader counted metadata rows against its 4096 ciphertext-reference limit. The revised SQL excludes only the exact JSON `existed: false` / `blob: null` case before applying that limit. Missing, malformed or contradictory references still enter schema validation and fail; no ciphertext is silently omitted. The database snapshot continues to preserve creation-only metadata.

Three independent corruption regressions caught an overly broad initial filter that selected only object-shaped blob fields. That candidate was rejected. The final predicate handles SQL NULL explicitly so a missing field cannot disappear. Existing missing/tampered ciphertext, identity restore, withdrawal and orphan-audit tests remain enabled.

Two additive indexes address lifetime query growth: source-owned ingress pagination uses `(card_id, source, ingress_id)`, while exact withdrawal lookup includes card, mode, source kind, ID and version. The installed production `sqlite3` planner initially used only the kind expression. Matching explicit TEXT affinity for ID/version in both the index and the backup query enables all three source expressions as lookup keys. A regression removes the index, reopens the actual existing database through normal initialization, then checks the production query plan with the production SQLite driver. No revision or outcome is changed by the indexes.

Reference count (4096), ciphertext bytes (64 MiB), journal payload validation, ciphertext hashes, card identity and withdrawal boundaries remain enforced. The new indexes do not implement whole-database retention, forensic directory cleanup, backup count/expiry, or cross-machine DPAPI migration. Those remain open work.

Evidence is in `output/execution-backup-reference-budget-*`, `execution-backup-reference-shape-red-*` and `execution-backup-reference-index-*`. Initial budget, corruption and incomplete-index failures are retained alongside later results. A passing targeted query-plan test alone is not full EX20 or EX00–EX23 acceptance.

Subsequently, the four reviewed files were selectively merged into the primary checkout after original/candidate SHA-256 checks. The worktree lifecycle/migration set passed 25 tests and node types; primary combined backup, withdrawal, dialogue-budget and phase-language regression passed 98 tests. Exact originals, patch and application receipts are in output/execution-backup-reference-budget-reviewed-merge-20261024. Final whole-workspace/product/release acceptance remains open.
