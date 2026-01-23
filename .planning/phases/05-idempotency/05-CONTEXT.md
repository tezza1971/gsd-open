# Phase 5: Idempotency - Context

**Gathered:** 2026-01-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Installer skips re-transpilation when GSD source hasn't changed. This optimization makes repeated runs fast by tracking what was last imported and intelligently comparing against current state. Independent freshness checks for GSD files and docs cache, with clear user communication about what was skipped or refreshed.

</domain>

<decisions>
## Implementation Decisions

### Change detection approach
- Trigger: Any file timestamp change in `~/.claude/get-shit-done/skills/` triggers full re-transpilation
- Scan: Check mtime of every `.md` file in skills/ directory (most accurate detection)
- Storage: Store list of all skill files + their timestamps in `~/.gsdo/last-imported-gsd`
- Deletions: If a file was deleted from skills/, trigger re-transpilation (update OpenCode to reflect removal)

### Skip messaging
- Format: Detailed status report showing files checked, cache status, and last import details
- Tip: Always show force re-run tip ("Run with --force to re-transpile")
- Exit code: Return 0 (success) when skipping - it's successful behavior, no error
- Style: Use same branded formatting/ASCII art style as install success screen for consistency

### Force re-run behavior
- Methods: Support both `--force` flag AND manual deletion of `~/.gsdo/last-imported-gsd`
- Messaging: Show "Forcing re-transpilation (skipping freshness check)" when --force used
- Scope: `--force` invalidates everything - re-fetch docs cache AND re-transpile (complete refresh)
- Timestamp: Update `last-imported-gsd` normally after force re-run completes (next run can skip if unchanged)

### Partial staleness handling
- Independence: If docs cache stale but GSD unchanged, re-download docs only (skip transpilation)
- Messaging: Only mention cache refresh if cache actually changed (avoid noise when already fresh)
- Cache failure: Show warning if cache refresh fails during skip, but continue (non-critical during skip)
- State tracking: Track both GSD timestamp AND cache timestamp in `last-imported-gsd` (single state file)

### Claude's Discretion
- File format for last-imported-gsd (JSON vs plain text vs other)
- Exact wording of skip messages and status reports
- ASCII art design for skip screen
- Warning message format for cache failures

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches for file comparison and state tracking.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 05-idempotency*
*Context gathered: 2026-01-23*
